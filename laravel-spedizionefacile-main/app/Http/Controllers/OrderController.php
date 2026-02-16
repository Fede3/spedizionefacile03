<?php
/**
 * FILE: OrderController.php
 * SCOPO: Gestisce il ciclo di vita degli ordini di spedizione (CRUD, creazione diretta, annullamento).
 *
 * DOVE SI USA: Pagina spedizioni utente, pagina riepilogo, checkout, pannello admin
 *
 * DATI IN INGRESSO:
 *   - index(): nessuno (filtra per utente autenticato o mostra tutti se admin)
 *   - show(): Order via route model binding
 *   - createDirectOrder(): PackageStoreRequest {packages: [...], origin_address, destination_address, services}
 *   - cancel(): Order + {reason?}
 *   - addPackage(): Order + {package_type, quantity, weight, first_size, second_size, third_size}
 *
 * DATI IN USCITA:
 *   - index(): OrderResource[] con packages, indirizzi, servizi, transazioni
 *   - show(): OrderResource singolo
 *   - createDirectOrder(): {order_id: 42, order_number: "SF-000042"}
 *   - cancel(): delega a RefundController.requestCancellation()
 *   - addPackage(): {success, message, order: OrderResource}
 *
 * VINCOLI:
 *   - I prezzi nel DB sono in CENTESIMI. createDirectOrder() converte: round(euro * 100)
 *   - createDirectOrder() RICALCOLA i prezzi lato server (non si fida del frontend)
 *   - La pulizia ordini vuoti avviene SOLO per ordini pending/payment_failed
 *   - La tabella pivot package_order collega ordini a pacchi (relazione many-to-many)
 *
 * ERRORI TIPICI:
 *   - 403: utente non autorizzato (non proprietario dell'ordine)
 *   - 422: ordine non annullabile (stato non pending/payment_failed)
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per cambiare le fasce prezzo di createDirectOrder(): modificare i blocchi if/elseif
 *   - Per aggiungere uno stato ordine: aggiungere la costante in Order.php e gestire qui
 *   - Per cambiare la logica di annullamento: modificare RefundController (cancel() delega a quello)
 *
 * COLLEGAMENTI:
 *   - StripeController.php — creazione ordini dal carrello e gestione pagamenti
 *   - RefundController.php — logica completa di annullamento e rimborso
 *   - BrtController.php — generazione etichette BRT per ordini pagati
 *   - pages/account/spedizioni/ — interfaccia frontend lista ordini
 */

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Order;
use App\Models\Package;
use App\Models\PackageAddress;
use App\Models\Service;
use Illuminate\Http\Request;
use App\Http\Requests\PackageStoreRequest;
use App\Http\Resources\OrderResource;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    use Traits\NormalizesServiceData;
    // Mostra la lista degli ordini
    // Se l'utente e' un amministratore, vede gli ordini di TUTTI gli utenti
    // Se e' un utente normale, vede solo i PROPRI ordini
    public function index(Request $request) {

        // Controllo dei permessi: verifica che l'utente possa vedere gli ordini
        Gate::authorize('viewAny', Order::class);

        $user = $request->user();

        // Pulizia automatica: rimuoviamo gli ordini vuoti (senza pacchi) dell'utente
        // che possono essere rimasti per errore (es. pagamento non completato)
        $this->cleanupEmptyOrders($user);

        // Specifichiamo quali dati collegati caricare insieme agli ordini
        // per evitare di fare troppe richieste al database
        $eagerLoad = [
            'packages.originAddress',       // Indirizzo di partenza di ogni pacco
            'packages.destinationAddress',   // Indirizzo di destinazione di ogni pacco
            'packages.service',              // Servizi aggiuntivi di ogni pacco
            'transactions',                  // Transazioni di pagamento dell'ordine
        ];

        if ($user->isAdmin()) {
            // L'admin vede anche i dati dell'utente che ha fatto l'ordine
            $eagerLoad[] = 'user';
            $orders = Order::with($eagerLoad)
                ->orderByDesc('created_at')
                ->get();
        } else {
            // L'utente normale vede solo i propri ordini
            $orders = Order::with($eagerLoad)
                ->where('user_id', $user->id)
                ->orderByDesc('created_at')
                ->get();
        }

        return OrderResource::collection($orders);
    }

    // Mostra i dettagli di un singolo ordine
    public function show(Order $order) {

        // Controllo dei permessi: verifica che l'utente possa vedere questo ordine
        Gate::authorize('view', $order);

        // Carichiamo tutti i dati collegati all'ordine
        $order->load([
            'packages.originAddress',
            'packages.destinationAddress',
            'packages.service',
            'transactions',
        ]);

        return new OrderResource($order);
    }

    /**
     * createDirectOrder — Crea un ordine direttamente dalla pagina di riepilogo (senza carrello).
     *
     * PERCHE': Permette di creare un ordine in un solo passaggio, saltando il carrello.
     *   I prezzi vengono RICALCOLATI lato server per evitare manipolazioni dal frontend.
     * COME LEGGERLO: 1) Crea indirizzi  2) Crea servizi  3) Per ogni pacco: ricalcola prezzo
     *   (peso, volume, MAX dei due)  4) Controlla contrassegno e PUDO  5) Crea ordine + pivot
     * COME MODIFICARLO: Per aggiungere un servizio, inserirlo nel blocco $servicesData.
     *   Per cambiare le fasce prezzo, modificare i blocchi if/elseif per peso e volume.
     * COSA EVITARE: Non rimuovere il ricalcolo prezzi lato server — e' una misura di sicurezza.
     *   Non fidarsi MAI dei prezzi inviati dal frontend in questo metodo.
     */
    public function createDirectOrder(PackageStoreRequest $request) {
        $data = $request->validated();
        $userId = auth()->id();

        $result = DB::transaction(function () use ($data, $userId) {
            // Creiamo gli indirizzi di partenza e destinazione
            $origin = PackageAddress::create($data['origin_address']);
            $destination = PackageAddress::create($data['destination_address']);

            // Creiamo i servizi aggiuntivi
            $servicesData = $this->normalizeServiceData($data['services']);
            $service = Service::create($servicesData);

            $subtotalCents = 0;
            $packages = [];

            foreach ($data['packages'] as $packageData) {
                // RICALCOLO PREZZI LATO SERVER
                // Non ci fidiamo dei prezzi inviati dal frontend (potrebbero essere manipolati)
                // Ricalcoliamo tutto in base a peso e volume

                // Estraiamo il peso numerico dalla stringa (es. "5 kg" -> 5)
                $weight = (float) preg_replace('/[^0-9.]/', '', $packageData['weight']);
                $s1 = (float) preg_replace('/[^0-9.]/', '', $packageData['first_size']);
                $s2 = (float) preg_replace('/[^0-9.]/', '', $packageData['second_size']);
                $s3 = (float) preg_replace('/[^0-9.]/', '', $packageData['third_size']);

                // Prezzi calcolati dalle fasce DB (con fallback hardcoded)
                $weightPrice = SessionController::findBandPrice('weight', $weight);
                $vol = ($s1 / 100) * ($s2 / 100) * ($s3 / 100);
                $volumePrice = SessionController::findBandPrice('volume', $vol);

                // Il prezzo e' il MAGGIORE tra prezzo per peso e prezzo per volume
                $basePrice = max($weightPrice, $volumePrice);
                $quantity = (int) ($packageData['quantity'] ?? 1);
                $singlePriceEur = round($basePrice * $quantity, 2);
                $singlePriceCents = (int) round($singlePriceEur * 100);
                $subtotalCents += $singlePriceCents;

                $packages[] = Package::create([
                    'package_type' => $packageData['package_type'],
                    'quantity' => $quantity,
                    'weight' => $packageData['weight'],
                    'first_size' => $packageData['first_size'],
                    'second_size' => $packageData['second_size'],
                    'third_size' => $packageData['third_size'],
                    'weight_price' => $weightPrice,
                    'volume_price' => $volumePrice,
                    'single_price' => $singlePriceCents,
                    'content_description' => $data['content_description'] ?? null,
                    'origin_address_id' => $origin->id,
                    'destination_address_id' => $destination->id,
                    'service_id' => $service->id,
                    'user_id' => $userId,
                ]);
            }

            // Controlliamo se e' stato selezionato il servizio Contrassegno
            $isCod = false;
            $codAmount = null;
            $serviceType = $servicesData['service_type'] ?? '';
            if (str_contains($serviceType, 'Contrassegno')) {
                $serviceData = $data['services']['serviceData'] ?? [];
                $contrassegnoData = $serviceData['Contrassegno'] ?? [];
                $importo = $contrassegnoData['importo'] ?? null;
                if ($importo) {
                    $isCod = true;
                    // L'importo arriva come stringa (es. "50.00" o "50,00")
                    $codAmount = (float) str_replace(',', '.', $importo);
                }
            }

            // PUDO: se l'utente ha scelto ritiro in un punto BRT, salviamo l'ID del punto
            // nell'ordine (campo brt_pudo_id) per passarlo a BRT quando creeremo la spedizione
            $pudoId = null;
            if (!empty($data['pudo']['pudo_id']) && ($data['delivery_mode'] ?? 'home') === 'pudo') {
                $pudoId = $data['pudo']['pudo_id'];
            }

            // Creiamo l'ordine con il subtotale calcolato
            $order = Order::create([
                'user_id' => $userId,
                'subtotal' => $subtotalCents,
                'status' => Order::PENDING, // In attesa di pagamento
                'is_cod' => $isCod,
                'cod_amount' => $codAmount,
                'brt_pudo_id' => $pudoId,
            ]);

            // Colleghiamo i pacchi all'ordine tramite la tabella di relazione
            foreach ($packages as $package) {
                Order::attachPackage($order->id, $package->id, $package->quantity ?? 1);
            }

            return $order;
        });

        return response()->json([
            'order_id' => $result->id,
            'order_number' => 'SF-' . str_pad($result->id, 6, '0', STR_PAD_LEFT), // Es. "SF-000042"
        ]);
    }

    /**
     * Annulla un ordine con eventuale rimborso.
     * Delega al RefundController che gestisce la logica completa di rimborso.
     *
     * Ordini non pagati (pending/payment_failed): annullamento semplice
     * Ordini pagati (completed/processing/in_transit): rimborso con commissione di 2 EUR
     */
    public function cancel(Request $request, Order $order) {
        $refundController = new \App\Http\Controllers\RefundController();
        return $refundController->requestCancellation($request, $order);
    }

    /**
     * addPackage — Aggiunge un collo a un ordine in attesa di pagamento.
     *
     * PERCHE': L'utente puo' aggiungere pacchi a un ordine non ancora pagato.
     *   Il prezzo viene ricalcolato lato server e il subtotale dell'ordine aggiornato.
     * COME LEGGERLO: 1) Verifica proprieta' e stato  2) Valida dati  3) Calcola prezzo (peso, volume)
     *   4) Riusa indirizzi e servizi dal primo pacco  5) Crea pacco + pivot  6) Ricalcola subtotale
     * COME MODIFICARLO: Per aggiungere campi al collo, aggiungerli in validate() e in Package::create().
     * COSA EVITARE: Non permettere aggiunte a ordini gia' pagati (il controllo status e' essenziale).
     */
    public function addPackage(Request $request, Order $order) {
        if ($order->user_id !== auth()->id()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        if (!in_array($order->status, [Order::PENDING, Order::PAYMENT_FAILED])) {
            return response()->json(['error' => 'Si possono aggiungere colli solo agli ordini in attesa di pagamento.'], 422);
        }

        $request->validate([
            'package_type' => 'required|string|max:50',
            'quantity' => 'required|integer|min:1|max:999',
            'weight' => 'required|numeric|min:0.1|max:9999',
            'first_size' => 'required|numeric|min:1|max:9999',
            'second_size' => 'required|numeric|min:1|max:9999',
            'third_size' => 'required|numeric|min:1|max:9999',
            'content_description' => 'nullable|string|max:255',
        ]);

        $result = DB::transaction(function () use ($request, $order) {
            $weight = (float) $request->weight;
            $s1 = (float) $request->first_size;
            $s2 = (float) $request->second_size;
            $s3 = (float) $request->third_size;

            // Prezzi calcolati dalle fasce DB (con fallback hardcoded)
            $weightPrice = SessionController::findBandPrice('weight', $weight);
            $vol = ($s1 / 100) * ($s2 / 100) * ($s3 / 100);
            $volumePrice = SessionController::findBandPrice('volume', $vol);

            $basePrice = max($weightPrice, $volumePrice);
            $quantity = (int) $request->quantity;
            $singlePriceEur = round($basePrice * $quantity, 2);
            $singlePriceCents = (int) round($singlePriceEur * 100);

            // Reuse origin/destination from existing packages
            $existingPackage = $order->packages()->first();
            $originId = $existingPackage?->origin_address_id;
            $destinationId = $existingPackage?->destination_address_id;
            $serviceId = $existingPackage?->service_id;

            $package = Package::create([
                'package_type' => $request->package_type,
                'quantity' => $quantity,
                'weight' => $request->weight,
                'first_size' => $request->first_size,
                'second_size' => $request->second_size,
                'third_size' => $request->third_size,
                'weight_price' => $weightPrice,
                'volume_price' => $volumePrice,
                'single_price' => $singlePriceCents,
                'content_description' => $request->content_description,
                'origin_address_id' => $originId,
                'destination_address_id' => $destinationId,
                'service_id' => $serviceId,
                'user_id' => auth()->id(),
            ]);

            Order::attachPackage($order->id, $package->id, $quantity);

            // Recalculate subtotal
            $newSubtotal = DB::table('package_order')
                ->join('packages', 'package_order.package_id', '=', 'packages.id')
                ->where('package_order.order_id', $order->id)
                ->sum('packages.single_price');

            $order->subtotal = (int) $newSubtotal;
            $order->save();

            return $package;
        });

        $order->load(['packages.originAddress', 'packages.destinationAddress', 'packages.service']);

        return response()->json([
            'success' => true,
            'message' => 'Collo aggiunto con successo.',
            'order' => new OrderResource($order),
        ]);
    }

    /**
     * Pulizia interna: rimuove gli ordini senza pacchi (orfani) di un utente specifico.
     * Questo puo' succedere quando un utente inizia a creare un ordine ma non lo completa.
     */
    private function cleanupEmptyOrders(User $user) {
        $this->deleteEmptyOrders(
            Order::where('user_id', $user->id)
                ->whereIn('status', [Order::PENDING, Order::PAYMENT_FAILED])
        );
    }

    /**
     * Logica di pulizia: trova ed elimina gli ordini che non hanno pacchi validi collegati.
     * Un pacco e' valido se ha un tipo e almeno il peso o le dimensioni.
     */
    private function deleteEmptyOrders($query) {
        // Troviamo gli ordini che hanno almeno un pacco valido
        $ordersWithValidPackages = DB::table('package_order')
            ->join('packages', 'package_order.package_id', '=', 'packages.id')
            ->where(function ($q) {
                $q->whereNotNull('packages.package_type')
                  ->where('packages.package_type', '!=', '')
                  ->where(function ($q2) {
                      $q2->where('packages.weight', '>', 0)
                         ->orWhere('packages.first_size', '>', 0);
                  });
            })
            ->pluck('package_order.order_id')
            ->unique();

        // Gli ordini vuoti sono quelli che NON hanno pacchi validi
        $emptyOrderIds = (clone $query)
            ->whereNotIn('id', $ordersWithValidPackages)
            ->pluck('id');

        // Eliminiamo gli ordini vuoti e i loro collegamenti ai pacchi
        if ($emptyOrderIds->isNotEmpty()) {
            DB::table('package_order')->whereIn('order_id', $emptyOrderIds)->delete();
            Order::whereIn('id', $emptyOrderIds)->delete();
        }
    }
}
