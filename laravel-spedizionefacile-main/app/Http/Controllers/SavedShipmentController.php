<?php
/**
 * FILE: SavedShipmentController.php
 * SCOPO: Gestisce le spedizioni configurate (template riutilizzabili) salvate dall'utente.
 *
 * COSA ENTRA:
 *   - PackageStoreRequest con packages, origin_address, destination_address, services per store
 *   - Request con campi parziali per update (indirizzi, dimensioni, servizi)
 *   - Request con package_ids (array di ID) per addToCart
 *   - ID pacco nella URL per update/destroy
 *
 * COSA ESCE:
 *   - PackageResource collection con meta (empty, count) per index
 *   - PackageResource collection per store
 *   - PackageResource singolo per update
 *   - JSON con message per destroy
 *   - JSON con message, moved (conteggio copie) per addToCart
 *
 * CHIAMATO DA:
 *   - routes/api.php — GET/POST /api/saved-shipments, PUT/DELETE /api/saved-shipments/{id}
 *   - routes/api.php — POST /api/saved-shipments/add-to-cart
 *   - nuxt: pages/account/spedizioni-configurate.vue
 *
 * EFFETTI COLLATERALI:
 *   - Database: CRUD su tabella pivot saved_shipments (user_id, package_id)
 *   - Database: crea/aggiorna/elimina package, package_addresses, services
 *   - Database (addToCart): crea COPIE di pacchi/indirizzi/servizi e li inserisce in cart_user
 *   - Database (index): pulizia automatica pacchi orfani e pacchi senza dati validi
 *
 * ERRORI TIPICI:
 *   - 422: spedizione duplicata (stessi indirizzi, stesse dimensioni)
 *   - 404: pacco non trovato o non appartenente all'utente
 *
 * DOCUMENTI CORRELATI:
 *   - app/Models/Package.php — modello pacco con relazioni indirizzi e servizi
 *   - CartController.php — carrello autenticato dove le copie vengono inserite
 *   - app/Http/Requests/PackageStoreRequest.php — regole di validazione pacchi
 */

namespace App\Http\Controllers;

use App\Cart\MyMoney;
use App\Models\PackageAddress;
use App\Models\Package;
use App\Models\Service;
use Illuminate\Support\Facades\DB;
use App\Http\Resources\PackageResource;
use App\Http\Requests\PackageStoreRequest;
use Illuminate\Http\Request;
class SavedShipmentController extends Controller
{
    // Mostra la lista di tutte le spedizioni salvate dall'utente
    // Prima di mostrare la lista, pulisce eventuali dati orfani o non validi
    public function index(Request $request)
    {
        $user = auth()->user();

        // Pulizia automatica: rimuove le spedizioni salvate il cui pacco non esiste piu' nel database
        $this->cleanupOrphanedShipments($user->id);

        // Recuperiamo gli ID dei pacchi salvati dall'utente
        $savedIds = DB::table('saved_shipments')
            ->where('user_id', $user->id)
            ->pluck('package_id');

        // Carichiamo i pacchi con tutti i dati collegati (indirizzi e servizi)
        $packages = Package::with(['originAddress', 'destinationAddress', 'service'])
            ->whereIn('id', $savedIds)
            ->get();

        // Pulizia automatica: rimuove pacchi che non hanno dati validi
        // (es. pacchi senza tipo o senza dimensioni, che possono essere rimasti per errore)
        $invalidPackages = $packages->filter(function ($pkg) {
            return empty($pkg->package_type)
                || (empty($pkg->weight) && empty($pkg->first_size));
        });

        if ($invalidPackages->isNotEmpty()) {
            foreach ($invalidPackages as $pkg) {
                DB::table('saved_shipments')
                    ->where('user_id', $user->id)
                    ->where('package_id', $pkg->id)
                    ->delete();
                $pkg->delete();
            }
            // Ricarichiamo i pacchi validi dopo la pulizia
            $savedIds = DB::table('saved_shipments')
                ->where('user_id', $user->id)
                ->pluck('package_id');

            $packages = Package::with(['originAddress', 'destinationAddress', 'service'])
                ->whereIn('id', $savedIds)
                ->get();
        }

        return PackageResource::collection($packages)
            ->additional([
                'meta' => [
                    'empty' => $packages->isEmpty(),
                    'count' => $packages->count(),
                ]
            ]);
    }

    // Salva una nuova spedizione configurata
    // Crea gli indirizzi, i servizi e i pacchi nel database, poi li collega all'utente
    public function store(PackageStoreRequest $request)
    {
        $data = $request->validated();
        $userId = auth()->id();

        // Controlliamo che non esista gia' una spedizione identica salvata
        // (stessi indirizzi, stesse dimensioni, stessa quantita')
        $savedIds = DB::table('saved_shipments')
            ->where('user_id', $userId)
            ->pluck('package_id');

        $existingSaved = Package::with(['originAddress', 'destinationAddress', 'service'])
            ->whereIn('id', $savedIds)
            ->get();

        // Confrontiamo ogni nuovo pacco con quelli gia' salvati
        foreach ($data['packages'] as $packageData) {
            $isDuplicate = $existingSaved->contains(function ($existing) use ($packageData, $data) {
                return $existing->package_type === $packageData['package_type']
                    && (string) $existing->weight === (string) $packageData['weight']
                    && (string) $existing->first_size === (string) $packageData['first_size']
                    && (string) $existing->second_size === (string) $packageData['second_size']
                    && (string) $existing->third_size === (string) $packageData['third_size']
                    && (int) $existing->quantity === (int) $packageData['quantity']
                    && $existing->originAddress
                    && $existing->originAddress->city === ($data['origin_address']['city'] ?? '')
                    && $existing->originAddress->postal_code === ($data['origin_address']['postal_code'] ?? '')
                    && $existing->originAddress->name === ($data['origin_address']['name'] ?? '')
                    && $existing->originAddress->address === ($data['origin_address']['address'] ?? '')
                    && $existing->destinationAddress
                    && $existing->destinationAddress->city === ($data['destination_address']['city'] ?? '')
                    && $existing->destinationAddress->postal_code === ($data['destination_address']['postal_code'] ?? '')
                    && $existing->destinationAddress->name === ($data['destination_address']['name'] ?? '')
                    && $existing->destinationAddress->address === ($data['destination_address']['address'] ?? '');
            });

            // Se e' un duplicato, avvisiamo l'utente
            if ($isDuplicate) {
                return response()->json([
                    'message' => 'Spedizione già configurata. Modifica almeno un dato per salvarla come nuova configurazione.',
                ], 422);
            }
        }

        // Creiamo tutti i record nel database dentro una "transazione"
        // (se qualcosa va storto, viene annullato tutto per evitare dati incompleti)
        $outPackages = DB::transaction(function () use ($data, $userId) {
            // Creiamo l'indirizzo di partenza e quello di destinazione
            $origin = PackageAddress::create($data['origin_address']);
            $destination = PackageAddress::create($data['destination_address']);

            // Creiamo i servizi aggiuntivi, assicurandoci che i campi obbligatori non siano vuoti
            $servicesData = $data['services'];
            $servicesData['service_type'] = !empty($servicesData['service_type']) ? $servicesData['service_type'] : 'Nessuno';
            $servicesData['date'] = $servicesData['date'] ?? '';
            $servicesData['time'] = $servicesData['time'] ?? '';

            $services = Service::create($servicesData);

            $packages = [];

            // Creiamo ogni pacco e lo colleghiamo agli indirizzi e ai servizi
            foreach ($data['packages'] as $packageData) {
                $packages[] = Package::create([
                    'package_type' => $packageData['package_type'],
                    'quantity' => $packageData['quantity'],
                    'weight' => $packageData['weight'],
                    'first_size' => $packageData['first_size'],
                    'second_size' => $packageData['second_size'],
                    'third_size' => $packageData['third_size'],
                    'weight_price' => $packageData['weight_price'] ?? null,
                    'volume_price' => $packageData['volume_price'] ?? null,
                    'single_price' => (int) round(($packageData['single_price'] ?? 0) * 100), // Da euro a centesimi
                    'origin_address_id' => $origin->id,
                    'destination_address_id' => $destination->id,
                    'service_id' => $services->id,
                    'user_id' => $userId,
                ]);
            }

            return $packages;
        });

        // Colleghiamo ogni pacco alla tabella delle spedizioni salvate
        foreach ($outPackages as $package) {
            DB::table('saved_shipments')->insert([
                'user_id' => $userId,
                'package_id' => $package->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return PackageResource::collection($outPackages);
    }

    // Modifica una spedizione salvata (aggiorna indirizzi, dimensioni, servizi)
    public function update(Request $request, $id)
    {
        $userId = auth()->id();

        // Cerchiamo il pacco assicurandoci che appartenga all'utente
        $package = Package::where('id', $id)->where('user_id', $userId)->firstOrFail();

        // Controlliamo i dati inviati
        $data = $request->validate([
            'origin_address' => 'sometimes|array',
            'origin_address.name' => 'nullable|string',
            'origin_address.address' => 'nullable|string',
            'origin_address.address_number' => 'nullable|string',
            'origin_address.city' => 'nullable|string',
            'origin_address.postal_code' => 'nullable|string',
            'origin_address.province' => 'nullable|string',
            'origin_address.telephone_number' => 'nullable|string',
            'origin_address.email' => 'nullable|string',
            'origin_address.country' => 'nullable|string',
            'origin_address.additional_information' => 'nullable|string',
            'origin_address.intercom_code' => 'nullable|string',
            'destination_address' => 'sometimes|array',
            'destination_address.name' => 'nullable|string',
            'destination_address.address' => 'nullable|string',
            'destination_address.address_number' => 'nullable|string',
            'destination_address.city' => 'nullable|string',
            'destination_address.postal_code' => 'nullable|string',
            'destination_address.province' => 'nullable|string',
            'destination_address.telephone_number' => 'nullable|string',
            'destination_address.email' => 'nullable|string',
            'destination_address.country' => 'nullable|string',
            'destination_address.additional_information' => 'nullable|string',
            'destination_address.intercom_code' => 'nullable|string',
            'package_type' => 'nullable|string',
            'quantity' => 'nullable|integer',
            'weight' => 'nullable|string',
            'first_size' => 'nullable|string',
            'second_size' => 'nullable|string',
            'third_size' => 'nullable|string',
            'single_price' => 'nullable|numeric',
            'weight_price' => 'nullable|numeric',
            'volume_price' => 'nullable|numeric',
            'services' => 'sometimes|array',
            'services.service_type' => 'nullable|string',
            'services.date' => 'nullable|string',
            'services.time' => 'nullable|string',
        ]);

        // Aggiorniamo tutto dentro una transazione per sicurezza
        DB::transaction(function () use ($package, $data) {
            // Aggiorniamo l'indirizzo di partenza se e' stato modificato
            if (isset($data['origin_address']) && $package->originAddress) {
                $package->originAddress->update($data['origin_address']);
            }
            // Aggiorniamo l'indirizzo di destinazione se e' stato modificato
            if (isset($data['destination_address']) && $package->destinationAddress) {
                $package->destinationAddress->update($data['destination_address']);
            }

            // Aggiorniamo i servizi se sono stati modificati
            if (isset($data['services']) && $package->service) {
                $serviceData = $data['services'];
                $serviceData['service_type'] = !empty($serviceData['service_type']) ? $serviceData['service_type'] : 'Nessuno';
                $package->service->update($serviceData);
            }

            // Aggiorniamo i campi del pacco (tipo, quantita', dimensioni)
            $packageFields = array_intersect_key($data, array_flip([
                'package_type', 'quantity', 'weight', 'first_size', 'second_size', 'third_size',
            ]));

            // Se il prezzo e' stato modificato, lo convertiamo da euro a centesimi
            if (isset($data['single_price'])) {
                $packageFields['single_price'] = (int) round($data['single_price'] * 100);
            }
            if (isset($data['weight_price'])) {
                $packageFields['weight_price'] = $data['weight_price'];
            }
            if (isset($data['volume_price'])) {
                $packageFields['volume_price'] = $data['volume_price'];
            }

            if (!empty($packageFields)) {
                $package->update($packageFields);
            }
        });

        // Ricarichiamo i dati aggiornati e li restituiamo al frontend
        $package->load(['originAddress', 'destinationAddress', 'service']);
        return new PackageResource($package);
    }

    // Elimina una spedizione salvata
    // Rimuove anche il pacco dal carrello se era presente
    public function destroy($id)
    {
        $userId = auth()->id();

        // Rimuoviamo il collegamento dalla tabella spedizioni salvate
        DB::table('saved_shipments')
            ->where('user_id', $userId)
            ->where('package_id', $id)
            ->delete();

        // Rimuoviamo anche dal carrello se era presente
        DB::table('cart_user')
            ->where('user_id', $userId)
            ->where('package_id', $id)
            ->delete();

        // Eliminiamo il pacco dal database
        Package::where('id', $id)->where('user_id', $userId)->delete();

        return response()->json(['message' => 'Spedizione rimossa']);
    }

    /**
     * Copia le spedizioni salvate selezionate nel carrello per il pagamento.
     * L'originale resta nelle spedizioni configurate come template riutilizzabile.
     * L'utente seleziona una o piu' spedizioni salvate e ne aggiunge copie al carrello.
     */
    public function addToCart(Request $request)
    {
        $request->validate([
            'package_ids' => 'required|array|min:1',
            'package_ids.*' => 'integer',
        ]);

        $userId = auth()->id();
        $packageIds = $request->package_ids;

        // Verifichiamo che i pacchi selezionati appartengano alle spedizioni salvate dell'utente
        $validIds = DB::table('saved_shipments')
            ->where('user_id', $userId)
            ->whereIn('package_id', $packageIds)
            ->pluck('package_id')
            ->toArray();

        // Per ogni spedizione salvata selezionata, creiamo una COPIA nel carrello.
        // L'originale resta nelle spedizioni configurate (funziona come un template riutilizzabile).
        $copiedCount = 0;
        foreach ($validIds as $packageId) {
            $original = Package::with(['originAddress', 'destinationAddress', 'service'])->find($packageId);
            if (!$original) continue;

            // Creiamo copie degli indirizzi e dei servizi
            $newOrigin = $original->originAddress
                ? PackageAddress::create($original->originAddress->replicate()->toArray())
                : null;
            $newDestination = $original->destinationAddress
                ? PackageAddress::create($original->destinationAddress->replicate()->toArray())
                : null;
            $newService = $original->service
                ? Service::create($original->service->replicate()->toArray())
                : null;

            // Creiamo una copia del pacco con i nuovi ID collegati
            $newPackage = Package::create([
                'package_type' => $original->package_type,
                'quantity' => $original->quantity,
                'weight' => $original->weight,
                'first_size' => $original->first_size,
                'second_size' => $original->second_size,
                'third_size' => $original->third_size,
                'weight_price' => $original->weight_price,
                'volume_price' => $original->volume_price,
                'single_price' => $original->single_price,
                'origin_address_id' => $newOrigin ? $newOrigin->id : null,
                'destination_address_id' => $newDestination ? $newDestination->id : null,
                'service_id' => $newService ? $newService->id : null,
                'user_id' => $userId,
            ]);

            // Aggiungiamo la copia al carrello
            DB::table('cart_user')->insert([
                'user_id' => $userId,
                'package_id' => $newPackage->id,
            ]);

            $copiedCount++;
        }

        return response()->json([
            'message' => 'Spedizioni aggiunte al carrello',
            'moved' => $copiedCount,
        ]);
    }

    /**
     * Pulizia interna: rimuove le spedizioni salvate il cui pacco non esiste piu' nel database.
     * Questo puo' succedere se un pacco viene eliminato direttamente senza passare da destroy().
     */
    private function cleanupOrphanedShipments(int $userId): void
    {
        $savedIds = DB::table('saved_shipments')
            ->where('user_id', $userId)
            ->pluck('package_id');

        if ($savedIds->isEmpty()) {
            return;
        }

        // Controlliamo quali pacchi esistono ancora nel database
        $existingIds = Package::whereIn('id', $savedIds)->pluck('id');
        // I pacchi "orfani" sono quelli che sono nella tabella saved_shipments ma non nel database pacchi
        $orphanedIds = $savedIds->diff($existingIds);

        if ($orphanedIds->isNotEmpty()) {
            DB::table('saved_shipments')
                ->where('user_id', $userId)
                ->whereIn('package_id', $orphanedIds)
                ->delete();
        }
    }
}
