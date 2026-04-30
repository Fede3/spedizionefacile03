<?php

namespace App\Listeners;

use App\Events\OrderPaymentFailed;
use App\Models\Order;

class MarkOrderPaymentFailed
{
    public function __construct()
    {
        //
    }

    /**
     * Gestisce l'evento: aggiorna lo stato dell'ordine a "payment_failed".
     * L'ordine viene preso direttamente dall'evento ricevuto.
     */
    public function handle(OrderPaymentFailed $event): void
    {
        $event->order->update([
            'status' => Order::PAYMENT_FAILED,
        ]);
    }
}
