<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Order;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Emesso quando BRT e' stato cancellato MA Stripe/wallet refund e' fallito.
 * Richiede intervento manuale (compensazione). refund_state =
 * 'compensation_needed'.
 */
class OrderRefundCompensationNeeded
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Order $order,
        public readonly int $intendedRefundCents,
        public readonly string $errorMessage,
    ) {}
}
