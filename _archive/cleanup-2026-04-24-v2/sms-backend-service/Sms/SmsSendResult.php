<?php

/**
 * DTO: SmsSendResult
 *
 * Esito dell'invio SMS restituito da un SmsProviderInterface.
 *
 * STATI:
 *   - sent:   provider ha accettato il messaggio (eventuale id remoto in $providerMessageId)
 *   - skipped: invio saltato (provider null, opt-out, rate-limit, numero non valido)
 *   - failed: errore irrecuperabile (credenziali mancanti, API down, blacklist)
 */

namespace App\Services\Sms;

class SmsSendResult
{
    public const STATUS_SENT = 'sent';
    public const STATUS_SKIPPED = 'skipped';
    public const STATUS_FAILED = 'failed';

    public function __construct(
        public readonly string $status,
        public readonly ?string $providerMessageId = null,
        public readonly ?string $message = null,
        public readonly ?string $providerName = null,
    ) {}

    public static function sent(string $providerMessageId, ?string $providerName = null, ?string $message = null): self
    {
        return new self(self::STATUS_SENT, $providerMessageId, $message, $providerName);
    }

    public static function skipped(string $message, ?string $providerName = null): self
    {
        return new self(self::STATUS_SKIPPED, null, $message, $providerName);
    }

    public static function failed(string $message, ?string $providerName = null): self
    {
        return new self(self::STATUS_FAILED, null, $message, $providerName);
    }

    public function isSuccessful(): bool
    {
        return $this->status === self::STATUS_SENT;
    }

    public function toArray(): array
    {
        return [
            'status' => $this->status,
            'provider_message_id' => $this->providerMessageId,
            'message' => $this->message,
            'provider' => $this->providerName,
        ];
    }
}
