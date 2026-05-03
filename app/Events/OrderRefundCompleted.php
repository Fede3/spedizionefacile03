<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Order;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Emesso quando l'intero flusso BRT cancel + Stripe/wallet refund e' andato a
 * buon fine. refund_state = 'refunded'.
 */
class OrderRefundCompleted
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Order $order,
        public readonly int $refundAmountCents,
        public readonly string $refundMethod,
    ) {}
}
