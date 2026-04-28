<?php

namespace App\Services\Stripe;

use App\Models\Order;
use App\Models\User;

/**
 * Helper privati per StripePaymentService: idempotency keys + metadata.
 *
 * Estratti dalla classe principale per ridurla sotto soglia 400 LOC.
 * Tutti i metodi sono "puri" (no Stripe SDK call): trasformazioni di
 * stringhe per idempotency-key + array metadata builder.
 *
 * @internal Trait usato solo da StripePaymentService.
 */
trait IdempotencyAndMetadataHelpers
{
    private function formatOrderScopedIdempotencyKey(Order $order, string $seed): string
    {
        $normalizedSeed = preg_replace('/[^A-Za-z0-9._-]+/', '-', trim($seed)) ?: 'attempt';

        return substr('order_'.$order->id.'_'.$normalizedSeed, 0, 255);
    }

    private function stripeRequestOptions(Order $order, ?string $idempotencyKey): array
    {
        if (filled($idempotencyKey)) {
            return ['idempotency_key' => $this->formatOrderScopedIdempotencyKey($order, $idempotencyKey)];
        }

        $submissionId = trim((string) $order->client_submission_id);
        if ($submissionId !== '') {
            return ['idempotency_key' => $this->formatOrderScopedIdempotencyKey($order, $submissionId)];
        }

        return ['idempotency_key' => $this->formatOrderScopedIdempotencyKey($order, 'fallback')];
    }

    public function resolveWalletTopUpIdempotencyKey(User $user, int $amountCents, string $paymentMethodId, ?string $idempotencyKey = null): string
    {
        $seed = trim((string) $idempotencyKey);

        if ($seed === '') {
            $normalizedPaymentMethod = preg_replace('/[^A-Za-z0-9._-]+/', '-', trim($paymentMethodId)) ?: 'payment-method';
            $seed = implode('_', [
                'amount'.$amountCents,
                'payment_method_'.$normalizedPaymentMethod,
            ]);
        }

        return $this->formatWalletScopedIdempotencyKey($user, $seed);
    }

    private function walletTopUpRequestOptions(User $user, int $amountCents, string $paymentMethodId, ?string $idempotencyKey): array
    {
        return [
            'idempotency_key' => $this->resolveWalletTopUpIdempotencyKey($user, $amountCents, $paymentMethodId, $idempotencyKey),
        ];
    }

    private function formatWalletScopedIdempotencyKey(User $user, string $seed): string
    {
        $normalizedSeed = preg_replace('/[^A-Za-z0-9._-]+/', '-', trim($seed)) ?: 'attempt';

        return substr('wallet_'.$user->id.'_'.$normalizedSeed, 0, 255);
    }

    private function orderMetadata(Order $order): array
    {
        $metadata = [
            'order_id' => (string) $order->id,
            'gross_subtotal_cents' => (string) $order->grossSubtotalCents(),
            'discount_amount_cents' => (string) $order->discountAmountCents(),
            'payable_total_cents' => (string) $order->payableTotalCents(),
        ];

        foreach (['client_submission_id', 'pricing_signature', 'pricing_snapshot_version'] as $field) {
            $value = $order->getAttribute($field);

            if (filled($value)) {
                $metadata[$field] = (string) $value;
            }
        }

        $snapshot = $order->getAttribute('pricing_snapshot');
        if (is_array($snapshot) && $snapshot !== []) {
            $encodedSnapshot = json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            if ($encodedSnapshot !== false && strlen($encodedSnapshot) <= 500) {
                $metadata['quote_snapshot'] = $encodedSnapshot;
            }
        }

        return $metadata;
    }

    private function decodeSnapshotMetadata(mixed $value): ?array
    {
        if (is_array($value)) {
            return $value;
        }

        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : null;
    }
}
