<?php
/**
 * FILE: GenerateBrtLabel.php
 * SCOPO: Listener che genera automaticamente l'etichetta BRT dopo il pagamento di un ordine.
 *
 * DOVE SI USA:
 *   - EventServiceProvider — registrato come listener di OrderPaid
 *   - Scatenato da StripeController.php quando il pagamento va a buon fine
 *
 * DATI IN INGRESSO:
 *   - OrderPaid event con order (l'ordine appena pagato)
 *   Esempio: event(new OrderPaid($order)) → GenerateBrtLabel.handle() viene chiamato
 *
 * DATI IN USCITA:
 *   - Nessun ritorno (void), ma aggiorna l'ordine nel database con dati BRT
 *   Esempio: order.brt_parcel_id, order.brt_tracking_url, order.brt_label_base64, order.status=in_transit
 *
 * VINCOLI:
 *   - Richiede BRT configurato (config services.brt.client_id non vuoto)
 *   - L'ordine deve avere pacchi con indirizzi completi
 *   - Massimo 3 tentativi con retry incrementale (1s, 2s)
 *   - Non deve bloccare il flusso: se BRT fallisce, salva l'errore e continua
 *
 * ERRORI TIPICI:
 *   - BRT non configurato: salta silenziosamente (log info, nessun errore)
 *   - Ordine ha gia' etichetta: salta (evita duplicati)
 *   - Fallimento dopo 3 tentativi: salva errore in brt_error per mostrarlo nel frontend
 *   - Email fallita: non blocca, l'errore viene solo loggato
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per cambiare numero tentativi: modificare MAX_RETRIES
 *   - Per aggiungere opzioni BRT: modificare il blocco $options prima del ciclo for
 *   - Per cambiare il comportamento post-successo: modificare il blocco if result.success
 *
 * COLLEGAMENTI:
 *   - app/Services/BrtService.php — servizio che comunica con API BRT
 *   - app/Events/OrderPaid.php — evento che scatena questo listener
 *   - app/Mail/ShipmentLabelMail.php — email con etichetta PDF allegata
 *   - app/Listeners/MarkOrderProcessing.php — altro listener OrderPaid (cambia stato a processing)
 */

namespace App\Listeners;

use App\Events\OrderPaid;
use App\Models\Order;
use App\Services\BrtService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\ShipmentLabelMail;

class GenerateBrtLabel
{
    // Numero massimo di tentativi per la generazione dell'etichetta
    private const MAX_RETRIES = 3;

    public function __construct()
    {
        //
    }

    /**
     * handle — Genera etichetta BRT con retry e aggiorna l'ordine.
     *
     * PERCHE': Dopo il pagamento, l'etichetta BRT deve essere generata automaticamente
     *   per permettere la spedizione. Il retry gestisce errori temporanei della rete.
     *
     * COME LEGGERLO:
     *   1. Controlli iniziali: BRT configurato? Etichetta gia' presente?
     *   2. Preparazione opzioni (contrassegno, PUDO)
     *   3. Ciclo retry: chiama BrtService.createShipment fino a MAX_RETRIES
     *   4. Successo: salva dati BRT nell'ordine, invia email con etichetta
     *   5. Fallimento: salva errore in brt_error per il frontend
     *
     * COME MODIFICARLO:
     *   - Per aggiungere opzioni: modificare il blocco $options
     *   - Per cambiare cosa succede dopo il successo: modificare il blocco if result.success
     *
     * COSA EVITARE:
     *   - Non lanciare eccezioni: il listener non deve bloccare il flusso di pagamento
     *   - Non rimuovere il refresh() prima dell'update: evita conflitti con MarkOrderProcessing
     */
    public function handle(OrderPaid $event): void
    {
        $order = $event->order;

        // Se BRT non e' configurato (manca il client_id), salta la generazione
        // Questo succede ad esempio in ambiente di sviluppo locale
        if (!config('services.brt.client_id')) {
            Log::info('BRT not configured, skipping label generation for order #' . $order->id);
            return;
        }

        // Se l'ordine ha gia' un'etichetta BRT, non ne serve un'altra
        if ($order->brt_parcel_id) {
            return;
        }

        // Crea un'istanza del servizio BRT
        $brt = app(BrtService::class);

        // Prepara le opzioni aggiuntive per la spedizione
        $options = [];
        // Se l'ordine e' in contrassegno (il destinatario paga alla consegna)
        if ($order->is_cod && $order->cod_amount) {
            $options['is_cod'] = true;
            $options['cod_amount'] = $order->cod_amount;
        }
        // Se l'utente ha scelto un punto di ritiro/consegna (PUDO)
        if ($order->brt_pudo_id) {
            $options['pudo_id'] = $order->brt_pudo_id;
        }

        // Tentiamo la generazione dell'etichetta con retry
        $result = null;
        $lastError = null;

        for ($attempt = 1; $attempt <= self::MAX_RETRIES; $attempt++) {
            try {
                $result = $brt->createShipment($order, $options);

                if ($result['success']) {
                    break; // Successo, usciamo dal ciclo
                }

                $lastError = $result['error'] ?? 'Errore sconosciuto';
                Log::warning("BRT label generation attempt {$attempt}/" . self::MAX_RETRIES . " failed for order #{$order->id}", [
                    'error' => $lastError,
                ]);
            } catch (\Exception $e) {
                $lastError = $e->getMessage();
                Log::warning("BRT label generation attempt {$attempt}/" . self::MAX_RETRIES . " exception for order #{$order->id}", [
                    'error' => $lastError,
                ]);
                $result = ['success' => false, 'error' => $lastError];
            }

            // Aspetta prima di riprovare (1s, 2s)
            if ($attempt < self::MAX_RETRIES) {
                sleep($attempt);
            }
        }

        if ($result && $result['success']) {
            // Ricarica l'ordine dal database per avere lo stato piu' aggiornato
            // (MarkOrderProcessing potrebbe averlo gia' modificato)
            $order->refresh();

            // Salva tutti i dati BRT nell'ordine e aggiorna lo stato
            // Include i dati di tracking, routing e la risposta completa
            $order->update([
                'brt_parcel_id' => $result['parcel_id'],
                'brt_numeric_sender_reference' => $result['numeric_sender_reference'],
                'brt_tracking_url' => $result['tracking_url'],
                'brt_label_base64' => $result['label_base64'],
                'brt_tracking_number' => $result['tracking_number'] ?? null,
                'brt_parcel_number_to' => $result['parcel_number_to'] ?? null,
                'brt_departure_depot' => $result['departure_depot'] ?? null,
                'brt_arrival_terminal' => $result['arrival_terminal'] ?? null,
                'brt_arrival_depot' => $result['arrival_depot'] ?? null,
                'brt_delivery_zone' => $result['delivery_zone'] ?? null,
                'brt_series_number' => $result['series_number'] ?? null,
                'brt_service_type' => $result['service_type'] ?? null,
                'brt_raw_response' => $result['raw_response'] ?? null,
                'status' => Order::IN_TRANSIT,
                'brt_error' => null, // Pulisci eventuali errori precedenti
            ]);

            // Invia l'email con l'etichetta di spedizione all'utente
            try {
                $order->loadMissing('user');
                if ($order->user && $order->user->email) {
                    Mail::to($order->user->email)->send(new ShipmentLabelMail($order));
                }
            } catch (\Exception $e) {
                // Se l'invio email fallisce, registra l'errore ma non blocca tutto
                Log::error('Failed to send BRT label email after payment', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                ]);
            }

            Log::info('BRT label generated automatically for order #' . $order->id, [
                'parcel_id' => $result['parcel_id'],
                'tracking_number' => $result['tracking_number'] ?? null,
                'tracking_url' => $result['tracking_url'] ?? null,
                'departure_depot' => $result['departure_depot'] ?? null,
                'arrival_depot' => $result['arrival_depot'] ?? null,
                'service_type' => $result['service_type'] ?? null,
            ]);
        } else {
            // Se la generazione dell'etichetta fallisce dopo tutti i tentativi,
            // salviamo l'errore nell'ordine cosi' il frontend puo' mostrarlo all'utente
            // invece di rimanere bloccato su "Etichetta in generazione..."
            $order->brt_error = $lastError;
            $order->save();

            Log::error('BRT auto label generation failed after ' . self::MAX_RETRIES . ' attempts for order #' . $order->id, [
                'error' => $lastError,
            ]);
        }
    }
}
