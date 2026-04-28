<?php

namespace App\Services;

use App\Models\Order;

class OrderBrtTrackingLookupService
{
    /**
     * Shared lookup by carrier-facing tracking references.
     */
    public function findOrderByTrackingReference(string $reference): ?Order
    {
        $normalized = trim($reference);
        if ($normalized === '') {
            return null;
        }

        return Order::where('brt_parcel_id', $normalized)->first()
            ?? Order::where('brt_tracking_number', $normalized)->first()
            ?? Order::where('brt_numeric_sender_reference', $normalized)->first();
    }

    /**
     * Public tracking can also accept local order references like SF-123.
     */
    public function findPublicTrackingOrder(string $code): ?Order
    {
        $order = $this->findOrderByTrackingReference($code);
        if ($order) {
            return $order;
        }

        $cleanCode = preg_replace('/^(SF-|#|sf-)/i', '', trim($code));
        if (is_numeric($cleanCode)) {
            return Order::where('id', (int) $cleanCode)
                ->whereNotNull('brt_parcel_id')
                ->first();
        }

        return null;
    }
}
