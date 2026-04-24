<?php

/**
 * SERVICE: SmsService
 *
 * Wrapper applicativo che incapsula:
 *   - Normalizzazione del numero in E.164 (default prefix +39 IT).
 *   - Rate limiting per destinatario (3 SMS/min, 30 SMS/giorno).
 *   - Dispatch via queue (SendSmsJob) per non bloccare richieste utente.
 *
 * USO:
 *   app(SmsService::class)->queue('+393331234567', 'Il tuo pacco e\' partito.');
 *
 * Per invio sincrono di test (admin, OTP):
 *   app(SmsService::class)->sendNow('+393331234567', 'Codice: 123456');
 */

namespace App\Services;

use App\Jobs\SendSmsJob;
use App\Services\Sms\SmsProviderInterface;
use App\Services\Sms\SmsSendResult;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class SmsService
{
    /**
     * Limite per destinatario: max 3 SMS al minuto.
     * Protegge da retry infiniti su numeri sbagliati e da abuso.
     */
    public const PER_RECIPIENT_RATE_PER_MIN = 3;

    /**
     * Limite per destinatario al giorno: max 30 SMS / 24h.
     * Coperture transazionali realistiche (pickup, transit, delivery, eccezione)
     * rientrano abbondantemente. Marketing dedicato deve passare da altro flusso.
     */
    public const PER_RECIPIENT_RATE_PER_DAY = 30;

    public function __construct(
        private readonly SmsProviderInterface $provider,
    ) {}

    /**
     * Invia SMS via queue (consigliato per eventi spedizione).
     */
    public function queue(string $to, string $message): void
    {
        $normalized = $this->normalize($to);
        if ($normalized === null) {
            return;
        }
        SendSmsJob::dispatch($normalized, $message);
    }

    /**
     * Invio sincrono — uso interno (job, OTP, admin test).
     * Applica rate limit per destinatario.
     */
    public function sendNow(string $to, string $message): SmsSendResult
    {
        $normalized = $this->normalize($to);
        if ($normalized === null) {
            return SmsSendResult::skipped(
                'Numero non valido: impossibile normalizzare in E.164.',
                $this->provider->name(),
            );
        }

        // Rate limit minuto.
        $minuteKey = 'sms:min:' . sha1($normalized);
        if (RateLimiter::tooManyAttempts($minuteKey, self::PER_RECIPIENT_RATE_PER_MIN)) {
            return SmsSendResult::skipped(
                'Rate limit per destinatario superato (al minuto).',
                $this->provider->name(),
            );
        }
        RateLimiter::hit($minuteKey, 60);

        // Rate limit giornaliero.
        $dayKey = 'sms:day:' . sha1($normalized);
        if (RateLimiter::tooManyAttempts($dayKey, self::PER_RECIPIENT_RATE_PER_DAY)) {
            return SmsSendResult::skipped(
                'Rate limit per destinatario superato (giornaliero).',
                $this->provider->name(),
            );
        }
        RateLimiter::hit($dayKey, 86400);

        return $this->provider->send($normalized, $this->truncate($message));
    }

    /**
     * Normalizza un numero in formato E.164.
     * Regole:
     *   - rimuove spazi, trattini, parentesi
     *   - se inizia per "00" lo converte in "+"
     *   - se inizia con cifra (no +) e ha lunghezza tipica IT (9-10 cifre): aggiunge +39
     *   - se gia' + ma lunghezza < 8 -> non valido
     *
     * Restituisce null se il numero non e' utilizzabile.
     */
    public function normalize(string $raw): ?string
    {
        $defaultCountry = (string) config('services.sms.default_country_code', '+39');
        $cleaned = preg_replace('/[\s\-().]/', '', trim($raw)) ?? '';
        if ($cleaned === '') {
            return null;
        }
        if (Str::startsWith($cleaned, '00')) {
            $cleaned = '+' . substr($cleaned, 2);
        }
        if (!Str::startsWith($cleaned, '+')) {
            // Interpretato come numero locale italiano.
            // Toglie eventuale prefisso 0 iniziale (vecchio formato fissi),
            // poi applica il prefisso paese di default.
            $cleaned = ltrim($cleaned, '0');
            $cleaned = $defaultCountry . $cleaned;
        }
        // Validazione finale: + seguito da 8-15 cifre (E.164 max).
        if (!preg_match('/^\+\d{8,15}$/', $cleaned)) {
            return null;
        }
        return $cleaned;
    }

    /**
     * Tronca a 160 char per restare in singola SMS GSM-7.
     * Messaggi piu' lunghi vengono spezzati ma costano di piu':
     * meglio limitarli lato sorgente.
     */
    public function truncate(string $message): string
    {
        $message = trim($message);
        if (mb_strlen($message) <= 160) {
            return $message;
        }
        return mb_substr($message, 0, 157) . '...';
    }

    public function providerName(): string
    {
        return $this->provider->name();
    }
}
