<?php
/**
 * FILE: StripeController.php
 * SCOPO: Gestisce tutti i pagamenti Stripe, la creazione ordini dal carrello e le carte salvate.
 *
 * DOVE SI USA: Checkout, gestione carte, conferma pagamento, pannello ordini
 *
 * DATI IN INGRESSO:
 *   - createOrder(): {subtotal?, package_ids?: [1,2,3]}
 *   - createPaymentIntent(): {order_id: 42}
 *   - orderPaid(): {order_id: 42, ext_id: "pi_xxx", is_existing_order?: false}
 *   - markOrderCompleted(): {order_id, payment_type: "wallet"|"bonifico", ext_id?, is_existing_order?}
 *   - createPayment(): {order_id, currency, payment_method_id, customer_id}
 *   - Carte: {payment_method: "pm_xxx"} o {payment_method_id: "pm_xxx"}
 *
 * DATI IN USCITA:
 *   - createOrder(): {order_id} o {order_id, order_ids, merged_count} se piu' ordini
 *   - createPaymentIntent(): {client_secret: "pi_xxx_secret_yyy", payment_intent_id}
 *   - orderPaid(): {success: true}
 *   - listPaymentMethods(): {data: [{id, brand, last4, exp_month, exp_year, default}], default}
 *
 * VINCOLI:
 *   - Stripe richiede importi in centesimi e minimo 50 centesimi (0,50 EUR)
 *   - Le chiavi Stripe vengono prima dal DB (Setting), poi dal .env come fallback
 *   - Il carrello viene svuotato SOLO dopo pagamento riuscito (non per ordini esistenti)
 *   - L'evento OrderPaid attiva la catena: MarkOrderProcessing -> GenerateBrtLabel
 *   - I pacchi con stessi indirizzi E stesso servizio vengono raggruppati in un solo ordine
 *
 * ERRORI TIPICI:
 *   - 403: utente non proprietario dell'ordine
 *   - 422: importo troppo basso (<50 centesimi), importo non corrispondente
 *   - 503: Stripe non configurato (chiavi mancanti)
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere un metodo di pagamento: aggiungere un case in markOrderCompleted()
 *   - Per cambiare la logica di raggruppamento ordini: modificare groupPackagesByAddress()
 *   - Per cambiare l'importo minimo: modificare il check "$amount < 50" in createPaymentIntent()
 *
 * COLLEGAMENTI:
 *   - StripeWebhookController.php — gestione notifiche asincrone da Stripe
 *   - WalletController.php — pagamenti alternativi con portafoglio
 *   - SettingsController.php — configurazione chiavi Stripe
 *   - app/Events/OrderPaid.php — evento lanciato dopo pagamento riuscito
 *   - app/Listeners/GenerateBrtLabel.php — genera etichetta BRT dopo OrderPaid
 */

namespace App\Http\Controllers;

use Stripe\Stripe;
use App\Models\User;
use Stripe\Customer;
use App\Models\Order;
use App\Models\Coupon;
use App\Models\Package;
use App\Models\Setting;
use Stripe\SetupIntent;
use Stripe\StripeClient;
use Stripe\PaymentIntent;
use Stripe\PaymentMethod;
use App\Models\Transaction;
use App\Events\OrderPaid;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class StripeController extends Controller
{
    /**
     * Recupera la chiave segreta di Stripe.
     * Prima cerca nel database (impostazioni admin), poi nel file .env come riserva.
     */
    private function getStripeSecret(): ?string
    {
        return Setting::get('stripe_secret', config('services.stripe.secret'));
    }

    /**
     * Segna un ordine come completato per pagamenti NON Stripe (portafoglio o bonifico).
     * Quando l'utente paga con il portafoglio, il pagamento e' immediato.
     * Quando paga con bonifico, l'ordine resta in "attesa" finche' l'admin non lo conferma.
     */
    public function markOrderCompleted(Request $request) {
        $request->validate([
            'order_id' => 'required|integer',
            'payment_type' => 'required|string|in:wallet,bonifico',
            'ext_id' => 'nullable|string',
            'is_existing_order' => 'nullable|boolean',
        ]);

        $order = Order::findOrFail($request->order_id);

        // Controllo di sicurezza: solo il proprietario dell'ordine puo' confermarlo
        if ($order->user_id !== auth()->id()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        // Se paga con bonifico, l'ordine resta in attesa; se paga con portafoglio, e' completato subito
        $order->status = $request->payment_type === 'bonifico' ? Order::PENDING : Order::COMPLETED;
        // Salviamo il metodo di pagamento per eventuali rimborsi futuri
        $order->payment_method = $request->payment_type;
        $order->save();

        // Registriamo la transazione nel database
        $transaction = Transaction::create([
            'order_id' => $order->id,
            'ext_id' => $request->ext_id ?? ($request->payment_type . '_' . now()->timestamp),
            'type' => $request->payment_type,
            'status' => $request->payment_type === 'bonifico' ? 'pending' : 'succeeded',
            'total' => $order->subtotal->amount(),
        ]);

        // Attiviamo l'evento "Ordine Pagato" per avviare la creazione della spedizione BRT
        // (ma solo per pagamenti effettivi, non per bonifici che sono ancora in attesa)
        if ($request->payment_type !== 'bonifico') {
            event(new OrderPaid($order, $transaction));
        }

        // Svuotiamo il carrello dopo il pagamento
        // (ma non se l'utente sta pagando un ordine esistente dalla lista ordini)
        if ($request->payment_type !== 'bonifico' && !$request->boolean('is_existing_order')) {
            DB::table('cart_user')
                ->where('user_id', auth()->id())
                ->delete();
        }

        return response()->json(['success' => true]);
    }

    /**
     * createOrder — Crea ordini a partire dai pacchi nel carrello, raggruppando per indirizzo.
     *
     * PERCHE': I pacchi con stessi indirizzi e stesso servizio devono diventare un unico ordine
     *   (= una sola spedizione BRT multi-collo). Pacchi con indirizzi diversi o servizi diversi
     *   generano ordini separati.
     * COME LEGGERLO: 1) Carica pacchi (da ID specifici o dal carrello)  2) Raggruppa per indirizzo+servizio
     *   3) Per ogni gruppo: calcola subtotale, rileva contrassegno e PUDO  4) Crea ordine + pivot
     * COME MODIFICARLO: Per cambiare i criteri di raggruppamento, modificare groupPackagesByAddress().
     *   Per aggiungere un campo all'ordine, aggiungerlo in Order::create().
     * COSA EVITARE: Non calcolare il subtotale dal frontend — usare sempre sum(single_price) lato server.
     */
    public function createOrder(Request $request) {
        $request->validate([
            'subtotal' => 'nullable|numeric',
            'package_ids' => 'nullable|array',
            'package_ids.*' => 'integer',
        ]);

        $userId = auth()->id();

        // Se sono stati specificati degli ID pacchi, creiamo l'ordine solo per quelli
        // (usato quando l'utente clicca "Paga ora" su una singola spedizione)
        if ($request->has('package_ids') && !empty($request->package_ids)) {
            $packages = Package::with(['originAddress', 'destinationAddress', 'service'])
                ->where('user_id', $userId)
                ->whereIn('id', $request->package_ids)
                ->get();
        } else {
            // Altrimenti prendiamo tutti i pacchi dal carrello
            $cartPackageIds = DB::table('cart_user')
                ->where('user_id', $userId)
                ->pluck('package_id');

            $packages = Package::with(['originAddress', 'destinationAddress', 'service'])
                ->whereIn('id', $cartPackageIds)
                ->get();
        }

        if ($packages->isEmpty()) {
            return response()->json(['error' => 'Nessun pacco trovato.'], 422);
        }

        // Raggruppa i pacchi per coppia di indirizzi identici E stesso servizio
        // I pacchi con stessa origine, destinazione e servizio diventano UN solo ordine (multi-collo BRT)
        // Pacchi con stessi indirizzi ma servizi diversi diventano ordini separati
        $groups = $this->groupPackagesByAddress($packages);

        $orders = DB::transaction(function () use ($groups, $userId) {
            $orders = [];

            foreach ($groups as $group) {
                $groupPackages = $group['packages'];

                // Calcoliamo il subtotale lato server sommando i prezzi di tutti i pacchi del gruppo
                $subtotal = $groupPackages->sum(function ($pkg) {
                    return (int) $pkg->single_price;
                });

                // Controlliamo se tra i pacchi del gruppo c'e' il servizio Contrassegno
                $isCod = false;
                $codAmount = null;
                foreach ($groupPackages as $pkg) {
                    $serviceType = $pkg->service->service_type ?? '';
                    if (str_contains($serviceType, 'Contrassegno')) {
                        $isCod = true;
                        $serviceData = $pkg->service->service_data ?? [];
                        $importo = $serviceData['Contrassegno']['importo'] ?? null;
                        if ($importo) {
                            $codAmount = (float) str_replace(',', '.', $importo);
                        }
                        break;
                    }
                }

                // PUDO: controlliamo se uno dei pacchi del gruppo ha un punto PUDO nel service_data
                // Se presente, salviamo l'ID del punto nell'ordine per la spedizione BRT
                $pudoId = null;
                foreach ($groupPackages as $pkg) {
                    $sd = $pkg->service->service_data ?? [];
                    if (!empty($sd['pudo']['pudo_id']) && ($sd['delivery_mode'] ?? '') === 'pudo') {
                        $pudoId = $sd['pudo']['pudo_id'];
                        break;
                    }
                }

                // Creiamo l'ordine per questo gruppo di indirizzi
                $order = Order::create([
                    'user_id' => $userId,
                    'subtotal' => $subtotal,
                    'status' => Order::PENDING,
                    'is_cod' => $isCod,
                    'cod_amount' => $codAmount,
                    'brt_pudo_id' => $pudoId,
                ]);

                // Colleghiamo i pacchi all'ordine
                foreach ($groupPackages as $package) {
                    Order::attachPackage($order->id, $package->id, $package->quantity ?? 1);
                }

                $orders[] = $order;
            }

            return $orders;
        });

        // Se c'e' un solo ordine (caso piu' comune), restituisci come prima
        if (count($orders) === 1) {
            return response()->json([
                'order_id' => $orders[0]->id,
            ]);
        }

        // Se ci sono piu' ordini (indirizzi diversi), restituisci tutti gli ID
        return response()->json([
            'order_id' => $orders[0]->id,
            'order_ids' => array_map(fn($o) => $o->id, $orders),
            'merged_count' => count($orders),
        ]);
    }

    /**
     * Raggruppa i pacchi per coppia di indirizzi identici E stesso servizio.
     * Due pacchi vengono uniti solo se condividono: stessi indirizzi (partenza + destinazione) E stesso service_type.
     * Pacchi con stessi indirizzi ma servizi diversi generano ordini separati (etichette BRT diverse).
     *
     * @param \Illuminate\Support\Collection $packages  Pacchi con originAddress, destinationAddress e service caricati
     * @return array  Array di gruppi, ogni gruppo ha 'key' (hash) e 'packages' (Collection)
     */
    private function groupPackagesByAddress($packages): array
    {
        $groups = [];

        foreach ($packages as $package) {
            $serviceType = $package->service->service_type ?? 'Nessuno';
            $key = $this->buildAddressKey($package->originAddress, $package->destinationAddress, $serviceType);

            if (!isset($groups[$key])) {
                $groups[$key] = [
                    'key' => $key,
                    'packages' => collect(),
                ];
            }

            $groups[$key]['packages']->push($package);
        }

        return array_values($groups);
    }

    /**
     * Costruisce una chiave univoca per una coppia di indirizzi (partenza + destinazione) e servizio.
     * Normalizza i campi in minuscolo e rimuove gli spazi per confronto case-insensitive.
     * Include il service_type nella chiave: pacchi con servizi diversi non vengono mai uniti.
     */
    private function buildAddressKey($origin, $destination, string $serviceType = 'Nessuno'): string
    {
        $normalize = function ($value) {
            return mb_strtolower(trim($value ?? ''), 'UTF-8');
        };

        $originParts = $origin ? implode('|', [
            $normalize($origin->name),
            $normalize($origin->address),
            $normalize($origin->address_number),
            $normalize($origin->city),
            $normalize($origin->postal_code),
            $normalize($origin->province),
        ]) : 'no-origin';

        $destParts = $destination ? implode('|', [
            $normalize($destination->name),
            $normalize($destination->address),
            $normalize($destination->address_number),
            $normalize($destination->city),
            $normalize($destination->postal_code),
            $normalize($destination->province),
        ]) : 'no-dest';

        $servicePart = $normalize($serviceType);

        return md5($originParts . '::' . $destParts . '::' . $servicePart);
    }

    // Crea e conferma un pagamento Stripe usando una carta gia' salvata
    // Usato per pagamenti "off-session" (senza interazione dell'utente)
    public function createPayment(Request $request) {
        $request->validate([
            'order_id' => 'required|integer',
            'currency' => 'required|string',
            'payment_method_id' => 'required|string',
            'customer_id' => 'required|string',
        ]);

        $order = Order::findOrFail($request->order_id);

        if ($order->user_id !== auth()->id()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        $stripe = new StripeClient($this->getStripeSecret());

        // Creiamo il pagamento su Stripe con conferma immediata
        $paymentIntent = $stripe->paymentIntents->create([
            'amount' => $order->subtotal->amount(), // Importo in centesimi
            'currency' => $request->currency,
            'customer' => $request->customer_id,
            'payment_method' => $request->payment_method_id,
            'confirm' => true,           // Conferma subito il pagamento
            'off_session' => true,       // Non richiede interazione dell'utente
            'metadata' => ['order_id' => $order->id],
        ]);

        // Salviamo i dati di pagamento per eventuali rimborsi futuri
        $order->payment_method = 'stripe';
        $order->stripe_payment_intent_id = $paymentIntent->id;
        $order->save();

        return response()->json([
            'payment_intent_id' => $paymentIntent->id,
            'status' => $paymentIntent->status,
        ]);
    }

    // Crea un "PaymentIntent" (intenzione di pagamento) per il checkout con carta
    // Questo e' il primo passo del pagamento con Stripe: prepara tutto, poi il frontend completa
    public function createPaymentIntent(Request $request) {
        $request->validate([
            'order_id' => 'required|integer',
        ]);

        $order = Order::findOrFail($request->order_id);
        $user = $request->user();

        if ($order->user_id !== $user->id) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        $secret = $this->getStripeSecret();
        if (!$secret) {
            return response()->json(['error' => 'Stripe non configurato.'], 503);
        }

        $stripe = new StripeClient($secret);
        // Assicuriamoci che l'utente abbia un profilo cliente su Stripe
        $customerId = $this->createOrGetCustomer($user);

        $amount = (int) $order->subtotal->amount();
        // Stripe richiede un importo minimo di 50 centesimi (0,50 euro)
        if ($amount < 50) {
            return response()->json(['error' => 'Importo troppo basso per il pagamento.'], 422);
        }

        try {
            // Creiamo il PaymentIntent su Stripe
            // Il frontend usera' il "client_secret" per completare il pagamento
            $paymentIntent = $stripe->paymentIntents->create([
                'amount' => $amount,
                'currency' => 'eur',
                'customer' => $customerId,
                'metadata' => ['order_id' => $order->id],
                'automatic_payment_methods' => ['enabled' => true],
            ]);

            return response()->json([
                'client_secret' => $paymentIntent->client_secret, // Il frontend usa questo per completare il pagamento
                'payment_intent_id' => $paymentIntent->id,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('PaymentIntent creation error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Errore durante la creazione del pagamento. Riprova.'], 500);
        }
    }

    /**
     * orderPaid — Conferma un pagamento Stripe e aggiorna lo stato dell'ordine.
     *
     * PERCHE': Dopo che l'utente completa il pagamento nel frontend, questa funzione verifica
     *   con Stripe che il pagamento sia reale, aggiorna l'ordine e lancia l'evento OrderPaid.
     * COME LEGGERLO: 1) Recupera PaymentIntent da Stripe  2) Verifica proprieta' e importo
     *   3) Aggiorna stato ordine  4) Crea transazione  5) Lancia evento OrderPaid  6) Svuota carrello
     * COME MODIFICARLO: Per aggiungere verifiche, inserirle prima dell'aggiornamento stato.
     * COSA EVITARE: Non rimuovere la verifica importo — senza, un utente potrebbe pagare meno del dovuto.
     */
    public function orderPaid(Request $request) {
        $stripe = new StripeClient($this->getStripeSecret());

        // Recuperiamo da Stripe i dettagli del pagamento per verificare che sia reale
        $intent = $stripe->paymentIntents->retrieve($request->ext_id);

        $order = Order::findOrFail($request->order_id);

        if ($order->user_id !== auth()->id()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        // Verifica di sicurezza: controlliamo che il pagamento corrisponda a questo ordine
        if (isset($intent->metadata['order_id']) && (int) $intent->metadata['order_id'] !== $order->id) {
            return response()->json(['error' => 'Payment intent non corrisponde all\'ordine.'], 422);
        }

        // Verifica di sicurezza: controlliamo che l'importo pagato corrisponda al totale dell'ordine
        if ((int) $intent->amount !== (int) $order->subtotal->amount()) {
            return response()->json(['error' => 'Importo non corrisponde.'], 422);
        }

        // Determiniamo il tipo di pagamento usato (carta, bonifico, ecc.)
        $type = $intent->payment_method
            ? $stripe->paymentMethods->retrieve($intent->payment_method)->type
            : $intent->payment_method_types[0] ?? 'unknown';

        // Aggiorniamo lo stato dell'ordine in base all'esito del pagamento
        $order->status = $intent->status === 'succeeded'
            ? Order::COMPLETED
            : Order::PAYMENT_FAILED;

        // Salviamo il metodo di pagamento e l'ID PaymentIntent per eventuali rimborsi futuri
        $order->payment_method = 'stripe';
        $order->stripe_payment_intent_id = $intent->id;

        $order->save();

        // Registriamo la transazione nel database
        $transaction = Transaction::create([
            'order_id' => $request->order_id,
            'ext_id' => $intent->id,
            'type' => $type,
            'status' => $intent->status,
            'total' => $intent->amount,
        ]);

        // Se il pagamento non e' riuscito, restituiamo un errore
        if ($intent->status !== 'succeeded') {
            return response()->json(['success' => false], 402);
        }

        // Attiviamo l'evento "Ordine Pagato" (per generare l'etichetta BRT, inviare email, ecc.)
        event(new OrderPaid($order, $transaction));

        // Svuotiamo il carrello (ma non se sta pagando un ordine esistente dalla lista)
        if (!$request->boolean('is_existing_order')) {
            DB::table('cart_user')
                ->where('user_id', auth()->id())
                ->delete();
        }

        return response()->json(['success' => true]);
    }


    // Crea un profilo cliente su Stripe per l'utente, o restituisce quello esistente
    // Stripe richiede un "Customer" per associare carte di pagamento e pagamenti
    public function createOrGetCustomer(User $user) {
        $stripe = new StripeClient($this->getStripeSecret());

        // Se l'utente non ha ancora un profilo cliente su Stripe, lo creiamo
        if (!$user->customer_id) {
            $customer = $stripe->customers->create([
                'email' => $user->email,
                'name'  => $user->name . ' ' . $user->surname,
            ]);

            $user->customer_id = $customer->id;
            $user->save();
        }

        return $user->customer_id;
    }


    // Crea un "SetupIntent" per salvare una nuova carta di credito
    // Il SetupIntent permette di salvare la carta senza fare un pagamento
    // (la carta viene salvata per essere usata in futuro)
    public function createSetupIntent(Request $request) {
        $secret = $this->getStripeSecret();

        if (!$secret) {
            return response()->json(['error' => 'Stripe non configurato. Vai nelle impostazioni per inserire le chiavi API.'], 503);
        }

        try {
            $stripe = new StripeClient($secret);

            $customerId = $this->createOrGetCustomer($request->user());

            // Creiamo il SetupIntent per la registrazione della carta
            $intent = $stripe->setupIntents->create([
                'customer' => $customerId,
                'payment_method_types' => ['card'], // Accettiamo solo carte
            ]);

            return response()->json([
                'client_secret' => $intent->client_secret // Il frontend usa questo per mostrare il modulo carta
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('SetupIntent creation error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Errore durante la configurazione del metodo di pagamento. Riprova.'], 500);
        }
    }


    // Mostra la lista di tutte le carte di credito salvate dall'utente
    // Per ogni carta mostra: marca (Visa, Mastercard), ultime 4 cifre, scadenza, se e' quella predefinita
    public function listPaymentMethods(Request $request) {
        $user = $request->user();
        $secret = $this->getStripeSecret();

        // Se l'utente non ha un profilo Stripe o Stripe non e' configurato, restituiamo una lista vuota
        if (!$user->customer_id || !$secret) {
            return response()->json(['data' => [], 'default' => null]);
        }

        $stripe = new StripeClient($secret);

        // Recuperiamo tutte le carte salvate dall'utente su Stripe
        $pmList = $stripe->paymentMethods->all([
            'customer' => $user->customer_id,
            'type' => 'card',
        ]);

        // Recuperiamo quale carta e' impostata come predefinita
        $customer = $stripe->customers->retrieve($user->customer_id);
        $defaultPm = $customer->invoice_settings->default_payment_method ?? null;

        // Formattiamo i dati delle carte per il frontend
        $cards = array_map(function ($pm) use ($defaultPm) {
            return [
                'id' => $pm->id,
                'holder_name' => $pm->billing_details->name,
                'brand' => $pm->card->brand,             // Es. "visa", "mastercard"
                'last4' => $pm->card->last4,             // Ultime 4 cifre (es. "4242")
                'exp_month' => $pm->card->exp_month,     // Mese di scadenza
                'exp_year' => $pm->card->exp_year,       // Anno di scadenza
                'default' => $pm->id === $defaultPm,     // Se e' la carta predefinita
            ];
        }, $pmList->data);

        // Mettiamo la carta predefinita in cima alla lista
        usort($cards, fn($a, $b) => $b['default'] <=> $a['default']);

        return response()->json([
            'data' => $cards,
            'default' => $defaultPm,
        ]);
    }


    // Imposta una carta come metodo di pagamento predefinito
    // Prima collega la carta al cliente Stripe, poi la imposta come predefinita
    public function setDefaultPaymentMethod(Request $request) {
        $request->validate([
            'payment_method' => 'required|string'
        ]);

        $user = $request->user();

        if (!$user->customer_id) {
            return response()->json(['error' => 'No Stripe customer'], 400);
        }

        $stripe = new StripeClient($this->getStripeSecret());

        $paymentMethodId = $request->payment_method;

        try {
            // Colleghiamo la carta al cliente Stripe (se non e' gia' collegata)
            $stripe->paymentMethods->attach($paymentMethodId, [
                'customer' => $user->customer_id
            ]);

            // Impostiamo la carta come predefinita
            $stripe->customers->update($user->customer_id, [
                'invoice_settings' => [
                    'default_payment_method' => $paymentMethodId
                ]
            ]);

            return response()->json([
                'success' => true,
                'default' => $paymentMethodId
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }


    // Cambia la carta predefinita (per carte gia' collegate al cliente)
    public function changeDefaultPaymentMethod(Request $request) {
        $request->validate([
            'payment_method_id' => 'required|string'
        ]);

        $user = $request->user();

        if (!$user->customer_id) {
            return response()->json(['error' => 'No Stripe customer'], 400);
        }

        $stripe = new StripeClient($this->getStripeSecret());

        try {
            // Aggiorniamo la carta predefinita del cliente su Stripe
            $customer = $stripe->customers->update($user->customer_id, [
                'invoice_settings' => [
                    'default_payment_method' => $request->payment_method_id,
                ],
            ]);

            return response()->json([
                'success' => true,
                'default' => $customer->invoice_settings->default_payment_method
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    // Elimina una carta di credito salvata dall'account dell'utente
    // SICUREZZA: verifica che la carta appartenga al cliente Stripe dell'utente loggato
    public function deleteCard(Request $request) {

        $request->validate(['payment_method_id' => 'required|string']);

        $user = $request->user();

        if (!$user->customer_id) {
            return response()->json(['error' => 'Nessun profilo Stripe associato.'], 400);
        }

        $stripe = new StripeClient($this->getStripeSecret());

        try {
            // Verifichiamo che la carta appartenga effettivamente a questo utente
            // per evitare che un utente elimini la carta di un altro
            $pm = $stripe->paymentMethods->retrieve($request->payment_method_id);
            if ($pm->customer !== $user->customer_id) {
                return response()->json(['error' => 'Non autorizzato.'], 403);
            }

            // "Detach" scollega la carta dal cliente Stripe (la carta viene rimossa)
            $stripe->paymentMethods->detach($request->payment_method_id);

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    // Recupera i dettagli della carta predefinita dell'utente
    // Usato dal frontend per mostrare quale carta verra' usata per il pagamento
    public function getDefaultPaymentMethod(Request $request) {
        $user = $request->user();
        $secret = $this->getStripeSecret();

        if (!$user->customer_id || !$secret) {
            return response()->json(['card' => null]);
        }

        $stripe = new StripeClient($secret);

        // Recuperiamo il cliente Stripe per sapere quale carta e' predefinita
        $customer = $stripe->customers->retrieve($user->customer_id);
        $defaultPm = $customer->invoice_settings->default_payment_method ?? null;

        if (!$defaultPm) {
            return response()->json(['card' => null]);
        }

        // Recuperiamo i dettagli della carta predefinita
        $pm = $stripe->paymentMethods->retrieve($defaultPm);

        $card = [
            'id' => $pm->id,
            'holder_name' => $pm->billing_details->name,
            'brand' => $pm->card->brand,
            'last4' => $pm->card->last4,
            'exp_month' => $pm->card->exp_month,
            'exp_year' => $pm->card->exp_year,
            'default' => true,
        ];

        return response()->json(['card' => $card]);
    }


}
