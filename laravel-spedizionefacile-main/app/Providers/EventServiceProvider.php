<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    /* public function register(): void
    {
        //
    } */

    /**
     * Bootstrap services.
     */
    /* public function boot(): void
    {
        //
    } */

    protected $listen = [
        \App\Events\OrderPaid::class => [
            \App\Listeners\MarkOrderProcessing::class,
            \App\Listeners\GenerateBrtLabel::class,
            \App\Listeners\SendOrderConfirmation::class,
        ],

        \App\Events\OrderCreated::class => [
            \App\Listeners\CartEmpty::class,
        ],

        \App\Events\ShipmentStatusChanged::class => [
            \App\Listeners\SendShipmentStatusEmail::class,
        ],

        \App\Events\OrderPaymentFailed::class => [
            \App\Listeners\MarkOrderPaymentFailed::class,
        ],
    ];
}
