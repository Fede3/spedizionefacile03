<?php

namespace App\Services\Checkout;

use App\Models\Coupon;
use App\Services\ReferralAccountingService;

/**
 * Risoluzione del discount_context (coupon o referral) sul submission.
 * Estratto da CheckoutSubmissionContextService per separare la logica
 * di sconto dalle altre responsabilita' (snapshot, fingerprint, idempotency).
 */
class CheckoutDiscountContextResolver
{
    use SnapshotCompactingHelpers;

    public function normalize(mixed $value): ?array
    {
        if (! is_array($value)) {
            return null;
        }

        $type = mb_strtolower(trim((string) ($value['type'] ?? '')), 'UTF-8');
        $code = mb_strtoupper(trim((string) ($value['code'] ?? '')), 'UTF-8');

        if ($type === '' || $code === '') {
            return null;
        }

        $discountContext = [
            'type' => $type,
            'code' => $code,
            'discount_percent' => $this->normalizeDecimalAmount($value['discount_percent'] ?? null),
            'discount_amount' => $this->normalizeDecimalAmount($value['discount_amount'] ?? null),
            'subtotal_raw' => $this->normalizeDecimalAmount($value['subtotal_raw'] ?? null),
            'final_total_raw' => $this->normalizeDecimalAmount($value['final_total_raw'] ?? null),
        ];

        $proName = trim((string) ($value['pro_name'] ?? ''));
        if ($proName !== '') {
            $discountContext['pro_name'] = $proName;
        }

        return $this->sortRecursive($discountContext);
    }

    /**
     * Calcola il discount_context canonical (ricavato da DB Coupon/Pro user) per evitare
     * manipolazione client-side: la percentuale ufficiale viene SEMPRE riletta dal sistema.
     */
    public function canonicalForSnapshot(?array $discountContext, array $snapshot, array $seed = []): ?array
    {
        if ($discountContext === null) {
            return null;
        }

        $subtotalCents = (int) ($snapshot['total_cents'] ?? 0);
        if ($subtotalCents <= 0) {
            return null;
        }

        $subtotalRaw = round($subtotalCents / 100, 2);
        $type = (string) ($discountContext['type'] ?? '');
        $code = (string) ($discountContext['code'] ?? '');

        if ($type === 'coupon') {
            $coupon = Coupon::query()->usable()->where('code', $code)->first();
            if (! $coupon) {
                return null;
            }

            [$valid] = $coupon->validateForUser(isset($seed['user_id']) ? (int) $seed['user_id'] : null);
            if (! $valid) {
                return null;
            }

            return $this->buildCanonical(
                type: 'coupon',
                code: $coupon->code,
                percentage: (float) $coupon->percentage,
                subtotalRaw: $subtotalRaw,
            );
        }

        if ($type === 'referral') {
            $referralAccounting = app(ReferralAccountingService::class);
            $proUser = $referralAccounting->resolveReferralPartner($code);

            if (! $proUser || (isset($seed['user_id']) && (int) $seed['user_id'] === (int) $proUser->id)) {
                return null;
            }

            $breakdown = $referralAccounting->buildReferralBreakdown($subtotalRaw);

            return $this->sortRecursive(array_merge(
                $this->buildCanonical(
                    type: 'referral',
                    code: $code,
                    percentage: (float) $breakdown['percentage'],
                    subtotalRaw: $subtotalRaw,
                ),
                ['pro_name' => (string) $proUser->name],
            ));
        }

        return null;
    }

    public function attachToSnapshot(array $snapshot, ?array $discountContext): array
    {
        if ($discountContext === null) {
            return $snapshot;
        }

        $snapshot['discount_context'] = $discountContext;

        return $this->sortRecursive($snapshot);
    }

    private function buildCanonical(string $type, string $code, float $percentage, float $subtotalRaw): array
    {
        $discountAmount = round($subtotalRaw * ($percentage / 100), 2);
        $finalTotal = max(0, round($subtotalRaw - $discountAmount, 2));

        return $this->sortRecursive([
            'type' => $type,
            'code' => mb_strtoupper(trim($code), 'UTF-8'),
            'discount_percent' => round($percentage, 2),
            'discount_amount' => $discountAmount,
            'subtotal_raw' => $subtotalRaw,
            'final_total_raw' => $finalTotal,
        ]);
    }
}
