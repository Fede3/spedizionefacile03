<?php
/**
 * FILE: Brt/TrackingService.php
 * SCOPO: Genera URL di tracking BRT e gestisce lo stato tracking.
 *
 * DOVE SI USA:
 *   - BrtController.php — per generare URL di tracking
 *   - SyncBrtTracking.php — per sincronizzazione automatica stato ordini
 */

namespace App\Services\Brt;

use App\Models\Order;
use Illuminate\Support\Facades\Log;

class TrackingService
{
    public function __construct(
        private readonly BrtConfig $config,
    ) {}

    /**
     * Genera l'URL per seguire il tracking di un pacco BRT.
     * Usa il sistema VAS di BRT che accetta il numero di collo come riferimento.
     *
     * @param string $parcelNumber Il numero di collo BRT (parcelNumberFrom) o parcelId
     */
    public function getTrackingUrl(string $parcelNumber): string
    {
        if (empty($parcelNumber)) {
            return '';
        }
        return 'https://vas.brt.it/vas/sped_det_show.hsm?refnr=' . urlencode($parcelNumber) . '&tiession=';
    }

    /**
     * Interroga BRT per ottenere lo stato tracking di un ordine.
     * Usato dal comando SyncBrtTracking per aggiornamenti automatici.
     *
     * @param Order $order L'ordine con brt_numeric_sender_reference o brt_parcel_id
     * @return array {status: ?string, brt_event: ?string, description: ?string, error: ?string}
     */
    public function getTrackingStatus(Order $order): array
    {
        $reference = $order->brt_tracking_number ?: $order->brt_parcel_id;

        if (empty($reference)) {
            return ['status' => null, 'brt_event' => null, 'description' => null, 'error' => 'Nessun riferimento BRT'];
        }

        try {
            $response = $this->config->shipmentClient()
                ->get($this->config->apiUrl . '/tracking', [
                    'account' => $this->config->accountPayload(),
                    'parcelNumber' => $reference,
                ]);

            if (!$response->successful()) {
                return ['status' => null, 'brt_event' => null, 'description' => null, 'error' => 'HTTP ' . $response->status()];
            }

            $body = $response->json();
            $events = $body['events'] ?? [];

            if (empty($events)) {
                return ['status' => null, 'brt_event' => null, 'description' => 'Nessun evento tracking', 'error' => null];
            }

            $lastEvent = $events[0];
            $eventCode = $lastEvent['eventCode'] ?? '';
            $eventDesc = $lastEvent['eventDescription'] ?? '';

            $statusMap = [
                'DELIVERED' => Order::DELIVERED,
                'CONSEGNATO' => Order::DELIVERED,
                'IN_TRANSIT' => Order::IN_TRANSIT,
                'IN TRANSITO' => Order::IN_TRANSIT,
                'GIACENZA' => 'in_giacenza',
                'STORAGE' => 'in_giacenza',
            ];

            $newStatus = null;
            foreach ($statusMap as $keyword => $status) {
                if (stripos($eventCode, $keyword) !== false || stripos($eventDesc, $keyword) !== false) {
                    $newStatus = $status;
                    break;
                }
            }

            return [
                'status' => $newStatus,
                'brt_event' => $eventCode,
                'description' => $eventDesc,
                'error' => null,
            ];
        } catch (\Exception $e) {
            Log::error('BRT getTrackingStatus exception', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
            return ['status' => null, 'brt_event' => null, 'description' => null, 'error' => $e->getMessage()];
        }
    }
}
