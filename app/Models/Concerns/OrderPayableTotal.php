<?php

namespace App\Models\Concerns;

use App\Cart\MyMoney;

/**
 * Trait helper di Order — Calcolo totale pagabile con sconti applicati.
 *
 * payableTotalCents() e' AUTORITA' di fatturazione: derivato da
 * grossSubtotalCents - discountAmountCents oppure dal final_total_raw
 * persistito nello snapshot (per consistency con preventivo accettato).
 *
 * CRITICAL: vedi CLAUDE.md — modificare solo con E2E gating Stripe.
 */
trait OrderPayableTotal
{
    /**
     * Contesto sconto persistito nello snapshot prezzi dell'ordine.
     */
    public function discountContext(): ?array
    {
        $snapshot = $this->getAttribute('pricing_snapshot');

        if (! is_array($snapshot)) {
            return null;
        }

        $discountContext = $snapshot['discount_context'] ?? null;

        return is_array($discountContext) ? $discountContext : null;
    }

    public function grossSubtotalCents(): int
    {
        return (int) ($this->getRawOriginal('subtotal') ?? $this->getAttributes()['subtotal'] ?? 0);
    }

    public function discountAmountCents(): int
    {
        $discountAmount = $this->discountContext()['discount_amount'] ?? null;

        if (! is_numeric($discountAmount)) {
            return 0;
        }

        return max(0, (int) round(((float) $discountAmount) * 100));
    }

    public function payableTotalCents(): int
    {
        $grossSubtotal = $this->grossSubtotalCents();
        $discountAmount = $this->discountAmountCents();
        $candidate = $this->discountContext()['final_total_raw'] ?? null;

        if (! is_numeric($candidate)) {
            return max(0, $grossSubtotal - $discountAmount);
        }

        $candidateCents = max(0, (int) round(((float) $candidate) * 100));

        if ($candidateCents === 0 && $discountAmount > 0 && $discountAmount < $grossSubtotal) {
            return $grossSubtotal - $discountAmount;
        }

        if ($candidateCents === 0 && $discountAmount === 0) {
            return $grossSubtotal;
        }

        if ($candidateCents > $grossSubtotal) {
            return $grossSubtotal;
        }

        return $candidateCents;
    }

    public function payableTotal(): MyMoney
    {
        return new MyMoney($this->payableTotalCents());
    }
}
