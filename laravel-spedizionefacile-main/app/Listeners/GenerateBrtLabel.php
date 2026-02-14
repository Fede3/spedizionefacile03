<?php
/**
 * FILE: GenerateBrtLabel.php
 * SCOPO: Listener che genera automaticamente l'etichetta BRT dopo il pagamento di un ordine.
 *
 * COSA ENTRA:
 *   - OrderPaid event con order (l'ordine appena pagato)
 *
 * COSA ESCE:
 *   - Nessun ritorno (void), ma aggiorna l'ordine nel database
 *
 * CHIAMATO DA:
 *   - EventServiceProvider — registrato come listener di OrderPaid
 *   - Scatenato da StripeController.php quando il pagamento va a buon fine
 *
 * EFFETTI COLLATERALI:
 *   - Rete: chiama BrtService::createShipment (API BRT) con retry fino a 3 tentativi
 *   - Database: aggiorna ordine con brt_parcel_id, brt_tracking_url, brt_label_base64, status=in_transit
 *   - Database: salva brt_error se la generazione fallisce (per mostrare errore nel frontend)
 *   - Email: invia ShipmentLabelMail con etichetta PDF all'utente
 *   - Log: registra successo/fallimento della generazione
 *
 * ERRORI TIPICI:
 *   - BRT non configurato: salta silenziosamente (log info)
 *   - Ordine ha gia' etichetta: salta (evita duplicati)
 *   - Fallimento dopo 3 tentativi: salva errore in brt_error, non blocca il flusso
 *
 * DOCUMENTI CORRELATI:
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
