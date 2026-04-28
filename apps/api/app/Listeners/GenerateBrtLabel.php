<?php

/**
 * FILE: GenerateBrtLabel.php
 * SCOPO: Listener che genera automaticamente l'etichetta BRT dopo il pagamento di un ordine.
 *
 * DOVE SI USA:
 *   - EventServiceProvider: registrato come listener di OrderPaid
 *   - Scatenato da StripeController.php quando il pagamento va a buon fine
 *
 * DATI IN INGRESSO:
 *   - OrderPaid event con order (l'ordine appena pagato)
 *   Esempio: event(new OrderPaid($order)) -> GenerateBrtLabel.handle() viene chiamato
 *
 * DATI IN USCITA:
 *   - Nessun ritorno (void), ma aggiorna l'ordine nel database con dati BRT
 *   Esempio: order.brt_parcel_id, order.brt_tracking_url, order.brt_label_base64, order.status=label_generated
 *
 * VINCOLI:
 *   - Richiede BRT configurato (config services.brt.client_id non vuoto)
 *   - L'ordine deve avere pacchi con indirizzi completi
 *   - Massimo 3 tentativi con retry incrementale (60s, 120s)
 *   - Non deve bloccare il flusso: se BRT fallisce, salva l'errore e continua
 *
 * ERRORI TIPICI:
 *   - BRT non configurato: salta silenziosamente (log info, nessun errore)
 *   - Ordine ha gia' etichetta: salta (evita duplicati)
 *   - Fallimento dopo 3 tentativi: salva errore in brt_error per mostrarlo nel frontend
 *   - Email fallita: non blocca, l'errore viene solo loggato
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per cambiare numero tentativi: modificare $tries / $backoff
 *   - Per aggiungere opzioni BRT: modificare OrderBrtFulfillmentService::buildAutomaticShipmentOptions()
 *   - Per cambiare il comportamento post-successo: modificare OrderBrtFulfillmentService
 *
 * COLLEGAMENTI:
 *   - app/Services/BrtService.php - servizio che comunica con API BRT
 *   - app/Services/OrderBrtFulfillmentService.php - boundary canonico order-centric del fulfillment BRT
 *   - app/Events/OrderPaid.php - evento che scatena questo listener
 *   - app/Services/ShipmentExecutionService.php - completa pickup/bordero/documenti dopo la label
 *   - app/Listeners/MarkOrderProcessing.php - altro listener OrderPaid (cambia stato a processing)
 */

namespace App\Listeners;

use App\Events\OrderPaid;
use App\Services\BrtService;
use App\Services\OrderBrtFulfillmentService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateBrtLabel implements ShouldQueue
{
    use InteractsWithQueue, SerializesModels;

    /**
     * Numero massimo di tentativi che Laravel eseguira' in caso di eccezione.
     * PERF-02: sostituisce il retry loop interno con sleep().
     */
    public int $tries = 3;

    /**
     * Secondi di attesa tra un tentativo e l'altro (backoff esponenziale).
     *
     * @var array<int>
     */
    public array $backoff = [60, 120];

    public function handle(OrderPaid $event): void
    {
        $order = $event->order;
        $fulfillment = app(OrderBrtFulfillmentService::class);

        if (! config('services.brt.client_id')) {
            $fulfillment->markSkippedBecauseBrtNotConfigured($order);

            Log::info('BRT not configured, skipping label generation for order #'.$order->id);

            return;
        }

        if ($order->brt_parcel_id) {
            return;
        }

        $options = $fulfillment->buildAutomaticShipmentOptions($order);
        $result = app(BrtService::class)->createShipment($order, $options);

        if (! ($result['success'] ?? false)) {
            throw new \RuntimeException(
                'BRT label generation failed for order #'.$order->id.': '.($result['error'] ?? 'Errore sconosciuto')
            );
        }

        $order = $fulfillment->finalizeSuccessfulShipment($order, $result);

        Log::info('BRT label generated automatically for order #'.$order->id, [
            'parcel_id' => $result['parcel_id'] ?? null,
            'tracking_number' => $result['tracking_number'] ?? null,
            'tracking_url' => $result['tracking_url'] ?? null,
            'departure_depot' => $result['departure_depot'] ?? null,
            'arrival_depot' => $result['arrival_depot'] ?? null,
            'service_type' => $result['service_type'] ?? null,
        ]);
    }

    /**
     * Gestisce il fallimento definitivo dopo tutti i tentativi.
     * Salva l'errore nell'ordine cosi' il frontend puo' mostrarlo all'utente.
     */
    public function failed(OrderPaid $event, \Throwable $exception): void
    {
        $order = $event->order;
        $message = $exception->getMessage();

        app(OrderBrtFulfillmentService::class)->markGenerationFailed($order, $message);

        Log::error('BRT auto label generation failed after '.$this->tries.' attempts for order #'.$order->id, [
            'error' => $message,
        ]);
    }
}
