<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Order;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Emesso quando viene avviata la cancellazione di un ordine, prima di chiamare
 * il corriere esterno. refund_state = 'requested'.
 */
class OrderRefundRequested
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Order $order,
        public readonly ?string $reason = null,
    ) {}
}
