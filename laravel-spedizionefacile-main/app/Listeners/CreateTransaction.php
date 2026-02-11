<?php

namespace App\Listeners;

use App\Events\OrderPaid;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use App\Services\Braintree\TransactionStoreService;

class CreateTransaction
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
    public function handle(OrderPaid $event): void
    {
        $transactionStoreService = new TransactionStoreService();

        $transactionStoreService->storeTransaction($event->order, $event->transaction);
    }
}
