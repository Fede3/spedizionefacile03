<?php

namespace App\Services;

use App\Events\ShipmentStatusChanged;
use App\Models\Order;
use App\Services\Brt\TrackingService;

class OrderBrtTrackingLifecycleService
{
    public function __construct(
        private readonly TrackingService $tracking,
        private readonly OrderBrtTrackingLookupService $lookup,
    ) {}

    /**
     * Owns the status transition from external BRT tracking data to Order.
     */
    public function syncOrderFromCarrier(Order $order, bool $dryRun = false): array
    {
        $trackingResult = $this->tracking->getTrackingStatus($order);

        if ($trackingResult['error'] ?? null) {
            return [
                'success' => false,
                'outcome' => 'carrier_error',
                'order' => $order,
                'old_status' => $order->rawStatus(),
                'new_status' => null,
                'brt_event' => $trackingResult['brt_event'] ?? null,
                'description' => $trackingResult['description'] ?? null,
                'error' => $trackingResult['error'],
            ];
        }

        return $this->applyTrackingStatus($order, $trackingResult['status'] ?? null, [
            'dry_run' => $dryRun,
            'brt_event' => $trackingResult['brt_event'] ?? null,
            'description' => $trackingResult['description'] ?? null,
        ]);
    }

    public function applyWebhookStatusUpdate(string $reference, string $statusCode, ?string $description = null): array
    {
        $order = $this->findOrderByTrackingReference($reference);
        if (! $order) {
            return [
                'success' => false,
                'outcome' => 'order_not_found',
                'order' => null,
                'old_status' => null,
                'new_status' => null,
                'brt_event' => strtoupper(trim($statusCode)),
                'description' => $description,
                'error' => 'Ordine non trovato per il riferimento tracking fornito.',
            ];
        }

        $mappedStatus = $this->tracking->mapCarrierStatus($statusCode, (string) ($description ?? ''));

        return $this->applyTrackingStatus($order, $mappedStatus, [
            'brt_event' => strtoupper(trim($statusCode)),
            'description' => $description,
        ]);
    }

    public function applyTrackingStatus(Order $order, ?string $newStatus, array $context = []): array
    {
        $oldStatus = $order->rawStatus();
        $brtEvent = $context['brt_event'] ?? null;
        $description = $context['description'] ?? null;

        if (! $newStatus) {
            return [
                'success' => true,
                'outcome' => 'unmapped',
                'order' => $order,
                'old_status' => $oldStatus,
                'new_status' => null,
                'brt_event' => $brtEvent,
                'description' => $description,
                'error' => null,
            ];
        }

        if ($newStatus === $oldStatus) {
            return [
                'success' => true,
                'outcome' => 'unchanged',
                'order' => $order,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'brt_event' => $brtEvent,
                'description' => $description,
                'error' => null,
            ];
        }

        if ($this->isFinalStatus($oldStatus) && ! $this->isFinalStatus($newStatus)) {
            return [
                'success' => true,
                'outcome' => 'blocked_final_state',
                'order' => $order,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'brt_event' => $brtEvent,
                'description' => $description,
                'error' => null,
            ];
        }

        if ($context['dry_run'] ?? false) {
            return [
                'success' => true,
                'outcome' => 'updated',
                'order' => $order,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'brt_event' => $brtEvent,
                'description' => $description,
                'error' => null,
                'dry_run' => true,
            ];
        }

        $order->status = $newStatus;
        $order->brt_last_tracking_check = now();
        $order->save();

        $updatedOrder = $order->fresh();
        ShipmentStatusChanged::dispatch($updatedOrder, $oldStatus, $newStatus);

        return [
            'success' => true,
            'outcome' => 'updated',
            'order' => $updatedOrder,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'brt_event' => $brtEvent,
            'description' => $description,
            'error' => null,
        ];
    }

    public function findOrderByTrackingReference(string $reference): ?Order
    {
        return $this->lookup->findOrderByTrackingReference($reference);
    }

    public function isFinalStatus(?string $status): bool
    {
        return in_array($status, [
            Order::DELIVERED,
            Order::RETURNED,
            Order::REFUSED,
            Order::CANCELLED,
            Order::REFUNDED,
        ], true);
    }
}
