<?php
/**
 * FILE: StripeConfigService.php
 * SCOPO: Centralizza il recupero delle chiavi Stripe (secret e public) da DB o .env.
 *
 * PERCHE': La logica getStripeSecret() era duplicata in StripeController, RefundController
 *   e WalletController con varianti leggermente diverse (alcuni controllano stripe_secret_key,
 *   altri no). Questo servizio unifica la logica con la versione piu' completa.
 *
 * CHIAMATO DA:
 *   - StripeController.php — pagamenti, carte, ordini
 *   - RefundController.php — rimborsi Stripe
 *   - WalletController.php — ricarica portafoglio via Stripe
 *   - SettingsController.php — configurazione chiavi (usa getPublicKey)
 *
 * VINCOLI:
 *   - Le chiavi vengono cercate prima nel DB (Setting), poi nel .env come fallback
 *   - Il DB ha due nomi legacy: stripe_secret e stripe_secret_key (entrambi validi)
 *   - La chiave pubblica ha due nomi legacy: stripe_key e stripe_public_key
 */

namespace App\Services;

use App\Models\Setting;

class StripeConfigService
{
    /**
     * Recupera la chiave segreta di Stripe.
     * Ordine di priorita': DB (stripe_secret) → DB (stripe_secret_key) → .env
     */
    public function getSecret(): ?string
    {
        return Setting::get('stripe_secret')
            ?: Setting::get('stripe_secret_key')
            ?: config('services.stripe.secret');
    }

    /**
     * Recupera la chiave pubblica di Stripe.
     * Ordine di priorita': DB (stripe_key) → DB (stripe_public_key) → .env
     */
    public function getPublicKey(): ?string
    {
        $key = trim((string) (Setting::get('stripe_key')
            ?: Setting::get('stripe_public_key')
            ?: config('services.stripe.key')));

        return $key ?: null;
    }

    /**
     * Verifica se Stripe e' configurato correttamente (entrambe le chiavi presenti).
     */
    public function isConfigured(): bool
    {
        $key = $this->getPublicKey();
        $secret = $this->getSecret();

        if (empty($key) || empty($secret)) {
            return false;
        }

        return !str_contains($key, 'placeholder') && !str_contains($secret, 'placeholder');
    }
}
