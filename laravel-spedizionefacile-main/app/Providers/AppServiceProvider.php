<?php

namespace App\Providers;

use App\Models\Order;
use App\Models\UserAddress;
use App\Policies\OrderPolicy;
use App\Policies\UserAddressPolicy;
use App\Services\CartService;
// -- ARCHIVIATO 2026-04-20 -- use App\Services\Sdi\FattureInCloudProvider;
// -- ARCHIVIATO 2026-04-20 -- use App\Services\Sdi\NullSdiProvider;
// -- ARCHIVIATO 2026-04-20 -- use App\Services\Sdi\SdiProviderInterface;
use App\Services\Sms\NullSmsProvider;
use App\Services\Sms\SmsProviderInterface;
use App\Services\Sms\TwilioSmsProvider;
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

        // Provider SMS pluggable. Default: NullSmsProvider (no-op + log).
        // Per abilitare Twilio impostare SMS_DRIVER=twilio in .env.
        $this->app->singleton(SmsProviderInterface::class, function () {
            $driver = config('services.sms.driver', 'null');

            return match ($driver) {
                'twilio' => new TwilioSmsProvider(
                    accountSid: config('services.sms.twilio.sid'),
                    authToken: config('services.sms.twilio.token'),
                    from: config('services.sms.twilio.from'),
                ),
                default => new NullSmsProvider(),
            };
        });

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
