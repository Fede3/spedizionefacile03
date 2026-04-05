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
 *   Esempio: order.brt_parcel_id, order.brt_tracking_url, order.brt_label_base64, order.status=label_generated
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
 *   - app/Services/ShipmentExecutionService.php — completa pickup/borderò/documenti
 *   - app/Listeners/MarkOrderProcessing.php — altro listener OrderPaid (cambia stato a processing)
 */

namespace App\Listeners;

use App\Events\OrderPaid;
use App\Models\Order;
use App\Services\BrtService;
use App\Services\ShipmentExecutionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;

/**
 * Implementa ShouldQueue: il listener gira in background quando il queue driver
 * non e' "sync". Con queue=sync (sviluppo/default) rimane sincrono ma il retry
 * viene gestito da Laravel tramite $backoff invece di sleep() bloccante.
 *
 * IN PRODUZIONE: impostare QUEUE_CONNECTION=database (o redis) nel .env
 * per far ritornare immediatamente la risposta HTTP all'utente dopo il pagamento.
 */
class GenerateBrtLabel implements ShouldQueue
{
    /**
     * Numero massimo di tentativi che Laravel eseguira' in caso di eccezione.
     * PERF-02: sostituisce il retry loop interno con sleep().
     */
    public int $tries = 3;

    /**
     * Secondi di attesa tra un tentativo e l'altro (backoff esponenziale).
     * Equivalente ai vecchi sleep(1) e sleep(2) ma non blocca il worker.
     *
     * @var array<int>
     */
    public array $backoff = [1, 2];

    public function __construct()
    {
        //
    }

    /**
     * handle — Genera etichetta BRT e aggiorna l'ordine.
     *
     * PERF-02: il retry non avviene piu' con un loop interno e sleep() bloccante.
     * In caso di eccezione Laravel ri-accoda il job con i delay definiti in $backoff.
     * Con QUEUE_CONNECTION=database/redis la risposta HTTP al cliente e' immediata.
     *
     * COME LEGGERLO:
     *   1. Controlli iniziali: BRT configurato? Etichetta gia' presente?
     *   2. Preparazione opzioni (contrassegno, PUDO)
     *   3. Chiamata singola a BrtService.createShipment — eccezioni triggerano retry
     *   4. Successo: salva dati BRT nell'ordine, avvia post-label flow
     *   5. Fallimento definitivo: salva errore in brt_error (hook failed())
     *
     * COSA EVITARE:
     *   - Non rimuovere il refresh() prima dell'update: evita conflitti con MarkOrderProcessing
     */
    public function handle(OrderPaid $event): void
    {
        $order = $event->order;

        // Se BRT non e' configurato (manca il client_id), salta la generazione
        // Questo succede ad esempio in ambiente di sviluppo locale
        if (! config('services.brt.client_id')) {
            $order->documents_status = 'skipped';
            $order->execution_error = trim(($order->execution_error ? $order->execution_error.' | ' : '').'BRT non configurato: etichetta e documenti non generati.');
            $order->save();

            Log::info('BRT not configured, skipping label generation for order #'.$order->id);

            return;
        }

        // Se l'ordine ha gia' un'etichetta BRT, non ne serve un'altra
        if ($order->brt_parcel_id) {
            return;
        }

        // Prepara le opzioni aggiuntive per la spedizione
        $options = [];
        // Se l'ordine e' in contrassegno (il destinatario paga alla consegna)
        if ($order->is_cod && $order->cod_amount) {
            $options['is_cod'] = true;
            $options['cod_amount'] = $order->cod_amount;
            $options['cod_payment_type'] = $order->cod_payment_type ?? 'BM';
        }
        // Se l'utente ha scelto un punto di ritiro/consegna (PUDO)
        if ($order->brt_pudo_id) {
            $options['pudo_id'] = $order->brt_pudo_id;
        }

        // Chiamata singola a BRT: in caso di eccezione Laravel ri-accoda il job
        // con il delay definito in $backoff, senza bloccare il worker con sleep().
        $result = app(BrtService::class)->createShipment($order, $options);

        if (! ($result['success'] ?? false)) {
            // Genera un'eccezione per far scattare il retry di Laravel
            throw new \RuntimeException(
                'BRT label generation failed for order #'.$order->id.': '.($result['error'] ?? 'Errore sconosciuto')
            );
        }

        // Ricarica l'ordine dal database per avere lo stato piu' aggiornato
        // (MarkOrderProcessing potrebbe averlo gia' modificato)
        $order->refresh();

        // Salva tutti i dati BRT nell'ordine e aggiorna lo stato
        $allLabels = $result['all_labels'] ?? [];

        $order->fill([
            'brt_parcel_id' => $result['parcel_id'],
            'brt_numeric_sender_reference' => $result['numeric_sender_reference'],
            'brt_tracking_url' => $result['tracking_url'],
            'brt_all_labels' => ! empty($allLabels) ? $allLabels : null,
            'brt_tracking_number' => $result['tracking_number'] ?? null,
            'brt_parcel_number_to' => $result['parcel_number_to'] ?? null,
            'brt_departure_depot' => $result['departure_depot'] ?? null,
            'brt_arrival_terminal' => $result['arrival_terminal'] ?? null,
            'brt_arrival_depot' => $result['arrival_depot'] ?? null,
            'brt_delivery_zone' => $result['delivery_zone'] ?? null,
            'brt_series_number' => $result['series_number'] ?? null,
            'brt_service_type' => $result['service_type'] ?? null,
            'brt_raw_response' => $result['raw_response'] ?? null,
            'status' => Order::LABEL_GENERATED,
            'brt_error' => null, // Pulisci eventuali errori precedenti
        ]);

        $order->brt_label_base64 = $result['label_base64'] ?? null;
        $order->save();

        try {
            app(ShipmentExecutionService::class)->runAutomaticPostLabelFlow($order->fresh());
        } catch (\Exception $e) {
            $order->refresh();
            $order->documents_status = 'failed';
            $order->execution_error = trim(($order->execution_error ? $order->execution_error.' | ' : '').'Post-elaborazione documenti fallita: '.$e->getMessage());
            $order->save();

            Log::error('Failed to complete shipment documents flow after label generation', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
        }

        Log::info('BRT label generated automatically for order #'.$order->id, [
            'parcel_id' => $result['parcel_id'],
            'tracking_number' => $result['tracking_number'] ?? null,
            'tracking_url' => $result['tracking_url'] ?? null,
            'departure_depot' => $result['departure_depot'] ?? null,
            'arrival_depot' => $result['arrival_depot'] ?? null,
            'service_type' => $result['service_type'] ?? null,
        ]);

        // L'invio email al cliente viene gestito da runAutomaticPostLabelFlow()
        // che invia ShipmentDocumentsMail (email unica con etichetta + bordero).
    }

    /**
     * Gestisce il fallimento definitivo dopo tutti i tentativi.
     * Salva l'errore nell'ordine cosi' il frontend puo' mostrarlo all'utente.
     */
    public function failed(OrderPaid $event, \Throwable $exception): void
    {
        $order = $event->order;
        $order->brt_error = $exception->getMessage();
        $order->save();

        Log::error('BRT auto label generation failed after '.$this->tries.' attempts for order #'.$order->id, [
            'error' => $exception->getMessage(),
        ]);
    }
}
