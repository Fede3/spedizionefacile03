<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Order;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Emesso quando il BRT cancel fallisce: Stripe NON viene chiamato (situazione
 * sicura, nessuna compensazione necessaria). refund_state = 'failed'.
 */
class OrderRefundFailed
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Order $order,
        public readonly string $stage,
        public readonly string $errorMessage,
    ) {}
}
