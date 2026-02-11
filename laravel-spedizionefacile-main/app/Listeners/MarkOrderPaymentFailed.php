<?php

namespace App\Listeners;

use App\Models\Order;
use App\Events\OrderPaymentFailed;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;

class MarkOrderPaymentFailed
{
    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     */
    public function handle(OrderPaymentFailed $event): void
    {
        $event->order->update([
            'status' => Order::PAYMENT_FAILED
        ]);
    }
}
