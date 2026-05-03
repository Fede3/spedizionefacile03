<?php

namespace App\Services\Brt;

use App\Models\Order;
use App\Services\OrderBrtFulfillmentService;
use Illuminate\Support\Facades\Log;

/**
 * Orchestration logic per il controller BRT (admin/manuale).
 *
 * NB: NON tocca BrtClient ne' la logica di idempotency BRT (Sessioni precedenti).
 * Si limita a coordinare ShipmentService + OrderBrtFulfillmentService per il flusso UI.
 */
class BrtUiService
{
    /**
     * Campi BRT canonici da resettare quando una spedizione viene eliminata.
     *
     * @var list<string>
     */
    private const BRT_FIELDS = [
        'brt_parcel_id',
        'brt_numeric_sender_reference',
        'brt_tracking_url',
        'brt_label_base64',
        'brt_tracking_number',
        'brt_parcel_number_to',
        'brt_departure_depot',
        'brt_arrival_terminal',
        'brt_arrival_depot',
        'brt_delivery_zone',
        'brt_series_number',
        'brt_service_type',
        'brt_all_labels',
        'brt_raw_response',
        'brt_error',
    ];

    public function __construct(
        private readonly ShipmentService $shipment,
        private readonly OrderBrtFulfillmentService $fulfillment,
    ) {}

    /**
     * Crea la spedizione manuale con retry x3 + finalizza i documenti.
     *
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    public function createManualShipment(Order $order, array $options): array
    {
        $result = null;
        for ($attempt = 1; $attempt <= 3; $attempt++) {
            try {
                $result = $this->shipment->createShipment($order, $options);
                if ($result['success']) {
                    break;
                }
            } catch (\Throwable $e) {
                Log::warning("BRT manual createShipment attempt {$attempt}/3 failed", [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                ]);
                $result = ['success' => false, 'error' => $e->getMessage()];
            }
        }

        if (! ($result['success'] ?? false)) {
            return ['success' => false, 'error' => $result['error'] ?? 'Errore BRT sconosciuto.'];
        }

        $order = $this->fulfillment->finalizeSuccessfulShipment(
            $order,
            $result,
            [
                'brt_pudo_id' => $options['pudo_id'] ?? null,
                'is_cod' => $options['is_cod'] ?? false,
                'cod_amount' => $options['cod_amount'] ?? null,
            ],
            'Post-elaborazione documenti fallita dopo creazione spedizione manuale',
            'Failed to complete shipment documents flow after manual shipment creation'
        );

        return [
            'success' => true,
            'parcel_id' => $result['parcel_id'] ?? null,
            'tracking_number' => $result['tracking_number'] ?? null,
            'tracking_url' => $result['tracking_url'] ?? null,
            'order_status' => Order::LABEL_GENERATED,
        ];
    }

    /**
     * Resetta tutti i campi BRT dell'ordine (post deleteShipment).
     */
    public function resetBrtData(Order $order): void
    {
        foreach (self::BRT_FIELDS as $field) {
            $order->{$field} = null;
        }
        $order->status = Order::COMPLETED;
        $order->save();
    }
}
