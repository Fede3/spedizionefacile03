<?php

namespace App\Providers;

use App\Events\OrderCreated;
use App\Events\OrderPaid;
use App\Events\OrderPaymentFailed;
use App\Events\ReferralApplied;
use App\Events\ShipmentStatusChanged;
use App\Listeners\CartEmpty;
use App\Listeners\DispatchReferralNotifications;
use App\Listeners\GenerateBrtLabel;
use App\Listeners\LogAuthenticationEvents;
use App\Listeners\MarkOrderPaymentFailed;
use App\Listeners\MarkOrderProcessing;
use App\Listeners\RegisterPaidOrderDiscountAccounting;
use App\Listeners\SendOrderConfirmation;
use App\Listeners\SendShipmentStatusEmail;
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
        OrderPaid::class => [
            MarkOrderProcessing::class,
            RegisterPaidOrderDiscountAccounting::class,
            GenerateBrtLabel::class,
            SendOrderConfirmation::class,
        ],

        OrderCreated::class => [
            CartEmpty::class,
        ],

        ShipmentStatusChanged::class => [
            SendShipmentStatusEmail::class,
        ],

        OrderPaymentFailed::class => [
            MarkOrderPaymentFailed::class,
        ],

        ReferralApplied::class => [
            DispatchReferralNotifications::class,
        ],
    ];

    /**
     * F14 — Subscriber che registra gli handler per gli eventi auth in
     * un solo posto. Vedi LogAuthenticationEvents::subscribe().
     */
    protected $subscribe = [
        LogAuthenticationEvents::class,
    ];

    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}
