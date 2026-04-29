<?php

namespace App\Models\Concerns;

/**
 * Trait helper di Order — Stato ordine + scope query predefiniti.
 *
 * Estratti per ridurre LOC del modello Order preservando 100% l'API public.
 * I metodi assumono che la classe abbia le costanti PENDING/PROCESSING/etc.
 */
trait OrderStatusHelpers
{
    /**
     * Traduce lo stato dell'ordine dall'inglese all'italiano.
     */
    public function getStatus(string $status): string
    {
        $data = [
            'pending' => 'In attesa',
            'processing' => 'In lavorazione',
            'completed' => 'Completato',
            'payment_failed' => 'Fallito',
            'paid' => 'Pagato',
            'cancelled' => 'Annullato',
            'refunded' => 'Rimborsato',
            'label_generated' => 'Etichetta generata',
            'in_transit' => 'In transito',
            'out_for_delivery' => 'In consegna',
            'delivered' => 'Consegnato',
            'in_giacenza' => 'In giacenza',
            'returned' => 'Reso',
            'refused' => 'Rifiutato',
            'awaiting_bank_transfer' => 'In attesa di bonifico',
        ];

        return $data[$status] ?? $status;
    }

    public function rawStatus(): string
    {
        return (string) $this->getRawOriginal('status');
    }

    public function isAwaitingPayment(): bool
    {
        return in_array($this->rawStatus(), [
            self::PENDING,
            self::PAYMENT_FAILED,
        ], true);
    }

    public function isPostPaymentState(): bool
    {
        return in_array($this->rawStatus(), [
            self::PROCESSING,
            self::COMPLETED,
            self::LABEL_GENERATED,
            self::IN_TRANSIT,
            self::OUT_FOR_DELIVERY,
            self::DELIVERED,
            self::IN_GIACENZA,
            self::RETURNED,
            self::REFUSED,
            self::REFUNDED,
        ], true);
    }

    /* ===== SCOPES — Query predefinite per stati comuni ===== */

    public function scopePending($query)
    {
        return $query->where('status', self::PENDING);
    }

    public function scopeProcessing($query)
    {
        return $query->where('status', self::PROCESSING);
    }

    public function scopeInTransit($query)
    {
        return $query->where('status', self::IN_TRANSIT);
    }

    public function scopeDelivered($query)
    {
        return $query->where('status', self::DELIVERED);
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', self::CANCELLED);
    }

    public function scopeRefunded($query)
    {
        return $query->where('status', self::REFUNDED);
    }

    public function scopeAwaitingPayment($query)
    {
        return $query->whereIn('status', [self::PENDING, self::PAYMENT_FAILED]);
    }

    public function scopeActive($query)
    {
        return $query->whereIn('status', [
            self::PROCESSING, self::LABEL_GENERATED, self::IN_TRANSIT,
            self::OUT_FOR_DELIVERY, self::IN_GIACENZA,
        ]);
    }
}
