<?php

namespace App\Providers;

use App\Models\BillingAddress;
use App\Models\Coupon;
use App\Models\InvoiceArchive;
use App\Models\Order;
use App\Models\ProRequest;
use App\Models\Service;
use App\Models\User;
use App\Models\UserAddress;
use App\Models\WalletMovement;
use App\Models\WithdrawalRequest;
use App\Policies\BillingAddressPolicy;
use App\Policies\CouponPolicy;
use App\Policies\InvoiceArchivePolicy;
use App\Policies\OrderPolicy;
use App\Policies\ProRequestPolicy;
use App\Policies\ServicePolicy;
use App\Policies\UserAddressPolicy;
use App\Policies\UserPolicy;
use App\Policies\WalletMovementPolicy;
use App\Policies\WithdrawalRequestPolicy;
use App\Services\CartService;
// -- ARCHIVIATO 2026-04-20 -- use App\Services\Sdi\FattureInCloudProvider;
// -- ARCHIVIATO 2026-04-20 -- use App\Services\Sdi\NullSdiProvider;
// -- ARCHIVIATO 2026-04-20 -- use App\Services\Sdi\SdiProviderInterface;
// -- ARCHIVIATO 2026-04-24-v2 -- use App\Services\Sms\NullSmsProvider;
// -- ARCHIVIATO 2026-04-24-v2 -- use App\Services\Sms\SmsProviderInterface;
// -- ARCHIVIATO 2026-04-24-v2 -- use App\Services\Sms\TwilioSmsProvider;
use App\Services\StripeConfigService;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\ServiceProvider;
use Stripe\StripeClient;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // CartService singleton — shared cart logic (pricing, dedup, merge).
        $this->app->singleton(CartService::class);

        // SVC-02: StripeClient singleton — avoids creating a new SDK instance
        // on every API call.  The secret key is resolved once via
        // StripeConfigService (DB -> .env fallback).
        $this->app->singleton(StripeClient::class, function ($app) {
            $secret = $app->make(StripeConfigService::class)->getSecret();

            // Evitiamo crash di bootstrap quando Stripe non e' configurato:
            // i servizi applicativi controllano gia' `isConfigured()` prima di usare
            // davvero l'API, quindi qui ci basta un client valido per non rompere
            // endpoint non-Stripe come saldo wallet o lettura carte.
            return new StripeClient($secret ?: 'sk_test_spedizionefacile_disabled');
        });

        // -- ARCHIVIATO 2026-04-24-v2 -- Provider SMS pluggable (default NullSmsProvider).
        // -- ARCHIVIATO 2026-04-24-v2 -- Modulo archiviato in _archive/cleanup-2026-04-24-v2/sms-backend-service/
        // -- ARCHIVIATO 2026-04-24-v2 -- $this->app->singleton(SmsProviderInterface::class, function () {
        // -- ARCHIVIATO 2026-04-24-v2 --     $driver = config('services.sms.driver', 'null');
        // -- ARCHIVIATO 2026-04-24-v2 --     return match ($driver) {
        // -- ARCHIVIATO 2026-04-24-v2 --         'twilio' => new TwilioSmsProvider(
        // -- ARCHIVIATO 2026-04-24-v2 --             accountSid: config('services.sms.twilio.sid'),
        // -- ARCHIVIATO 2026-04-24-v2 --             authToken: config('services.sms.twilio.token'),
        // -- ARCHIVIATO 2026-04-24-v2 --             from: config('services.sms.twilio.from'),
        // -- ARCHIVIATO 2026-04-24-v2 --         ),
        // -- ARCHIVIATO 2026-04-24-v2 --         default => new NullSmsProvider(),
        // -- ARCHIVIATO 2026-04-24-v2 --     };
        // -- ARCHIVIATO 2026-04-24-v2 -- });

        // -- ARCHIVIATO 2026-04-20 -- Provider SDI pluggable (fatturazione elettronica).
        // -- ARCHIVIATO 2026-04-20 -- Modulo archiviato in _archive/2026-04-20-features-rimosse/sdi-fatturazione/
        // -- ARCHIVIATO 2026-04-20 -- $this->app->singleton(SdiProviderInterface::class, function () {
        // -- ARCHIVIATO 2026-04-20 --     $driver = config('services.sdi.provider', 'null');
        // -- ARCHIVIATO 2026-04-20 --     return match ($driver) {
        // -- ARCHIVIATO 2026-04-20 --         'fatture-in-cloud', 'fic' => new FattureInCloudProvider(
        // -- ARCHIVIATO 2026-04-20 --             apiToken: config('services.sdi.fic.api_token'),
        // -- ARCHIVIATO 2026-04-20 --             companyId: config('services.sdi.fic.company_id'),
        // -- ARCHIVIATO 2026-04-20 --         ),
        // -- ARCHIVIATO 2026-04-20 --         default => new NullSdiProvider(),
        // -- ARCHIVIATO 2026-04-20 --     };
        // -- ARCHIVIATO 2026-04-20 -- });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // SEC-01: registrazione esplicita delle Policies (best practice Laravel 11).
        // Evita di affidarsi al solo auto-discovery di AuthServiceProvider e garantisce
        // che Gate::authorize/authorizeResource risolvano correttamente i modelli.
        Gate::policy(Order::class, OrderPolicy::class);
        Gate::policy(UserAddress::class, UserAddressPolicy::class);
        Gate::policy(BillingAddress::class, BillingAddressPolicy::class);
        Gate::policy(WalletMovement::class, WalletMovementPolicy::class);
        Gate::policy(WithdrawalRequest::class, WithdrawalRequestPolicy::class);
        Gate::policy(Coupon::class, CouponPolicy::class);
        Gate::policy(Service::class, ServicePolicy::class);
        Gate::policy(ProRequest::class, ProRequestPolicy::class);
        Gate::policy(InvoiceArchive::class, InvoiceArchivePolicy::class);
        Gate::policy(User::class, UserPolicy::class);

        // SENTRY-OBS-03: invio a Sentry dei job falliti.
        // I job (es. email di conferma ordine, sync BRT) girano in background:
        // senza questo hook, un errore in coda passerebbe SILENZIOSO e
        // scomparirebbe nei log. Con Sentry: alert immediato al team.
        // Guard class_exists: se Sentry non e' installato localmente, zero errori.
        if (class_exists(\Sentry\Laravel\Integration::class)) {
            Queue::failing(function (JobFailed $event): void {
                if (app()->bound('sentry')) {
                    \Sentry\Laravel\Integration::captureUnhandledException($event->exception);
                }
            });
        }
    }
}
