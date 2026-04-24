<?php

/**
 * DTO: SdiTransmissionResult
 *
 * Risultato di una trasmissione SDI restituito da un provider.
 * Mantiene lo stato conforme a quello su orders.sdi_status.
 */

namespace App\Services\Sdi;

class SdiTransmissionResult
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_SENT = 'sent';
    public const STATUS_ACCEPTED = 'accepted';
    public const STATUS_REJECTED = 'rejected';

    public function __construct(
        public readonly string $status,
        public readonly ?string $transmissionId = null,
        public readonly ?string $message = null,
        public readonly ?string $providerName = null,
    ) {}

    public static function pending(?string $message = null): self
    {
        return new self(self::STATUS_PENDING, null, $message);
    }

    public static function sent(string $transmissionId, ?string $providerName = null, ?string $message = null): self
    {
        return new self(self::STATUS_SENT, $transmissionId, $message, $providerName);
    }

    public static function accepted(string $transmissionId, ?string $providerName = null, ?string $message = null): self
    {
        return new self(self::STATUS_ACCEPTED, $transmissionId, $message, $providerName);
    }

    public static function rejected(?string $transmissionId, string $message, ?string $providerName = null): self
    {
        return new self(self::STATUS_REJECTED, $transmissionId, $message, $providerName);
    }

    public function toArray(): array
    {
        return [
            'status' => $this->status,
            'transmission_id' => $this->transmissionId,
            'message' => $this->message,
            'provider' => $this->providerName,
        ];
    }
}
