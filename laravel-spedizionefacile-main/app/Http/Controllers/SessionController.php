<?php
/**
 * FILE: SessionController.php
 * SCOPO: Gestisce i dati temporanei della sessione di preventivo rapido (anche per utenti non registrati).
 *
 * DOVE SI USA: Homepage (PreventivoRapido.vue), pagina preventivo (preventivo.vue)
 *
 * DATI IN INGRESSO:
 *   - show(): nessuno (legge dalla sessione corrente)
 *   - firstStep(): {shipment_details: {origin_city, origin_postal_code, destination_city,
 *     destination_postal_code}, packages: [{package_type, quantity, weight, first_size, second_size,
 *     third_size, weight_price?, volume_price?, single_price?}]}
 *
 * DATI IN USCITA:
 *   - {data: {shipment_details, packages, services, total_price, step}}
 *   - Esempio: {data: {shipment_details: {origin_city: "Roma", ...}, packages: [{single_price: 8.90, ...}],
 *     total_price: 8.90, step: 2}}
 *
 * VINCOLI:
 *   - Il calcolo prezzi DEVE usare la regola MAX(fascia_peso, fascia_volume) + supplemento CAP90
 *   - Se si cambiano le fasce nel DB (tabella price_bands), il fallback hardcoded resta come riserva
 *   - I prezzi nella sessione sono in EURO (non centesimi) — la conversione avviene in CartController
 *
 * ERRORI TIPICI:
 *   - 422: dati di validazione mancanti (citta', CAP, almeno un pacco con dimensioni)
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per cambiare le fasce di prezzo: modificare la tabella price_bands dal pannello admin
 *   - Per cambiare il supplemento CAP90 (+2.50): cercare "capSupplement" in firstStep()
 *   - Per aggiungere un nuovo campo al preventivo: aggiungerlo sia in validate() che in session()->put()
 *
 * COLLEGAMENTI:
 *   - GuestCartController.php — carrello di sessione per ospiti (step successivo)
 *   - CartController.php — carrello database per utenti autenticati
 *   - components/Homepage/PreventivoRapido.vue — form preventivo homepage
 *   - components/Preventivo.vue — componente preventivo completo
 */

namespace App\Http\Controllers;

use App\Models\PriceBand;
use Illuminate\Http\Request;
class SessionController extends Controller
{
    /**
     * Cerca il prezzo per un valore (peso o volume) nelle fasce del DB.
     * Se non ci sono fasce nel DB, usa il fallback hardcoded.
     * Restituisce il prezzo in euro (float).
     */
    public static function findBandPrice(string $type, float $value): float
    {
        // Prova a caricare dal DB
        $band = PriceBand::where('type', $type)
            ->where('min_value', '<', $value)
            ->where('max_value', '>=', $value)
            ->first();

        if ($band) {
            return ($band->discount_price ?? $band->base_price) / 100;
        }

        // Se il valore supera tutte le fasce, prendi l'ultima
        $lastBand = PriceBand::where('type', $type)->orderByDesc('max_value')->first();
        if ($lastBand) {
            return ($lastBand->discount_price ?? $lastBand->base_price) / 100;
        }

        // Fallback hardcoded se il DB e' vuoto
        return self::fallbackPrice($type, $value);
    }

    /**
     * Fallback hardcoded per quando la tabella price_bands e' vuota.
     */
    public static function fallbackPrice(string $type, float $value): float
    {
        if ($type === 'weight') {
            if ($value <= 2) return 8.90;
            if ($value <= 5) return 11.90;
            if ($value <= 10) return 14.90;
            if ($value <= 25) return 19.90;
            if ($value <= 50) return 29.90;
            if ($value <= 75) return 39.90;
            return 49.90;
        }
        // volume
        if ($value <= 0.010) return 8.90;
        if ($value <= 0.020) return 11.90;
        if ($value <= 0.040) return 14.90;
        if ($value <= 0.100) return 19.90;
        if ($value <= 0.200) return 29.90;
        if ($value <= 0.300) return 39.90;
        return 49.90;
    }

    // Restituisce tutti i dati della sessione corrente del preventivo
    // Usato dal frontend per recuperare i dati quando l'utente torna sulla pagina
    public function show()
    {
        return response()->json([
            'data' => [
                'shipment_details' => session()->get('shipment_details', []),  // Dettagli spedizione (citta', CAP)
                'packages' => session()->get('packages', []),                  // Lista dei pacchi
                'services' => session()->get('services', null),                // Servizi aggiuntivi scelti
                'total_price' => session()->get('total_price', 0),             // Prezzo totale calcolato
                'step' => session()->get('step', 1),                           // Passo attuale del preventivo (1, 2, ecc.)
            ],
        ]);
    }

    /**
     * firstStep — Calcola il preventivo per il primo passo (citta', pacchi, prezzi).
     *
     * PERCHE': Il frontend invia le dimensioni dei pacchi e gli indirizzi; il backend calcola
     *   i prezzi autoritativamente usando le fasce dal DB (con fallback hardcoded).
     * COME LEGGERLO: 1) Validazione dati  2) Calcolo supplemento CAP90  3) Per ogni pacco: fascia peso,
     *   fascia volume, MAX dei due + supplemento, moltiplica per quantita'  4) Salva in sessione
     * COME MODIFICARLO: Per aggiungere un supplemento, inserirlo nel blocco $capSupplement.
     *   Per cambiare la logica dei prezzi, modificare findBandPrice() o fallbackPrice().
     * COSA EVITARE: Non rimuovere il fallback hardcoded (fallbackPrice) — serve quando il DB e' vuoto.
     *   Non cambiare "session()->put('step', 2)" senza aggiornare anche il frontend.
     */
    public function firstStep(Request $request)
    {
        // Controlliamo che tutti i dati necessari siano stati inviati e siano validi
        $validated = $request->validate([
            'shipment_details.origin_city' => ['required', 'string'],
            'shipment_details.origin_postal_code' => ['required', 'string'],
            'shipment_details.destination_city' => ['required', 'string'],
            'shipment_details.destination_postal_code' => ['required', 'string'],
            'shipment_details.date' => ['nullable', 'string'],
            'packages' => ['required', 'array', 'min:1'],           // Almeno un pacco obbligatorio
            'packages.*.package_type' => ['required', 'string'],     // Tipo di pacco (es. scatola, busta)
            'packages.*.quantity' => ['required', 'integer', 'min:1'],
            'packages.*.weight' => ['required'],
            'packages.*.first_size' => ['required'],                 // Lunghezza
            'packages.*.second_size' => ['required'],                // Larghezza
            'packages.*.third_size' => ['required'],                 // Altezza
            'packages.*.single_price' => ['nullable', 'numeric', 'min:0'],
            'packages.*.weight_price' => ['nullable', 'numeric', 'min:0'],
            'packages.*.volume_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $shipmentDetails = $validated['shipment_details'];

        // Per ogni pacco, calcoliamo il prezzo in base al peso e al volume
        // Il prezzo finale e' il MAGGIORE tra prezzo per peso e prezzo per volume
        // Supplemento CAP che inizia con "90": +2.50€ per ritiro e/o destinazione
        $capSupplement = 0;
        $originCap = $shipmentDetails['origin_postal_code'] ?? '';
        $destCap = $shipmentDetails['destination_postal_code'] ?? '';
        if (str_starts_with($originCap, '90')) $capSupplement += 2.50;
        if (str_starts_with($destCap, '90')) $capSupplement += 2.50;

        $packages = collect($validated['packages'])->map(function (array $package) use ($capSupplement) {
            $weightPrice = $package['weight_price'] ?? null;
            $volumePrice = $package['volume_price'] ?? null;

            // Prezzo per peso: cerca nella tabella price_bands (con fallback hardcoded)
            if ($weightPrice === null) {
                $weight = (float) preg_replace('/[^0-9.]/', '', $package['weight']);
                $weightPrice = self::findBandPrice('weight', $weight);
                $package['weight_price'] = $weightPrice;
            }

            // Prezzo per volume: cerca nella tabella price_bands (con fallback hardcoded)
            if ($volumePrice === null) {
                $s1 = (float) preg_replace('/[^0-9.]/', '', $package['first_size']);
                $s2 = (float) preg_replace('/[^0-9.]/', '', $package['second_size']);
                $s3 = (float) preg_replace('/[^0-9.]/', '', $package['third_size']);
                $vol = ($s1 / 100) * ($s2 / 100) * ($s3 / 100);
                $volumePrice = self::findBandPrice('volume', $vol);
                $package['volume_price'] = $volumePrice;
            }

            // Il prezzo base e' il piu' alto tra prezzo per peso e prezzo per volume
            // + supplemento CAP 90 se applicabile
            // Poi moltiplichiamo per la quantita' di pacchi
            $basePrice = max((float) $weightPrice, (float) $volumePrice) + $capSupplement;
            $quantity = (int) ($package['quantity'] ?? 1);
            $package['single_price'] = round($basePrice * $quantity, 2);

            return $package;
        })->values()->all();

        // Calcoliamo il prezzo totale sommando i prezzi di tutti i pacchi
        $totalPrice = collect($packages)->sum(function (array $package) {
            return $package['single_price'];
        });

        // Salviamo tutti i dati nella sessione per poterli recuperare dopo
        session()->put('shipment_details', $shipmentDetails);
        session()->put('packages', $packages);
        session()->put('total_price', round($totalPrice, 2));
        session()->put('step', 2); // Passiamo al passo 2 del preventivo

        // Restituiamo tutti i dati aggiornati al frontend
        return response()->json([
            'data' => [
                'shipment_details' => session()->get('shipment_details'),
                'packages' => session()->get('packages'),
                'services' => session()->get('services', null),
                'total_price' => session()->get('total_price'),
                'step' => session()->get('step'),
            ],
        ]);
    }
}
