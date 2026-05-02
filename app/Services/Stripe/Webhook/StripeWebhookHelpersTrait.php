<?php

namespace App\Services\Stripe\Webhook;

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Helper condivisi tra gli handler Stripe webhook.
 * Estratti da StripeWebhookHelpers (controller-side) per essere disponibili
 * ai handler service-side senza duplicazione logica.
 */
trait StripeWebhookHelpersTrait
{
    protected function decodeSnapshotMetadata(mixed $value): ?array
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

    protected function clearCartForOrder(Order $order): void
    {
        $packageIds = $order->packages()->pluck('packages.id')->filter()->values();

        if ($packageIds->isEmpty()) {
            return;
        }

        DB::table('cart_user')
            ->where('user_id', $order->user_id)
            ->whereIn('package_id', $packageIds->all())
            ->delete();
    }

    protected function syncSubmissionContextFromIntent(Order $order, object $intent): bool
    {
        $metadata = is_object($intent->metadata ?? null)
            ? (array) $intent->metadata
            : (array) ($intent->metadata ?? []);

        $updates = [];

        foreach (['client_submission_id', 'pricing_signature'] as $field) {
            $incoming = $metadata[$field] ?? null;
            $current = $order->getAttribute($field);

            if (! filled($incoming)) {
                continue;
            }

            if (filled($current) && (string) $current !== (string) $incoming) {
                Log::warning('Ignoring Stripe webhook with mismatched submission metadata', [
                    'order_id' => $order->id,
                    'field' => $field,
                    'order_value' => $current,
                    'intent_value' => $incoming,
                ]);

                return false;
            }

            if (! filled($current)) {
                $updates[$field] = (string) $incoming;
            }
        }

        $incomingVersion = $metadata['pricing_snapshot_version'] ?? null;
        $currentVersion = $order->getAttribute('pricing_snapshot_version');
        if (filled($incomingVersion)) {
            if (filled($currentVersion) && (int) $currentVersion !== (int) $incomingVersion) {
                Log::warning('Ignoring Stripe webhook with mismatched snapshot version', [
                    'order_id' => $order->id,
                    'order_value' => $currentVersion,
                    'intent_value' => $incomingVersion,
                ]);

                return false;
            }

            if (! filled($currentVersion)) {
                $updates['pricing_snapshot_version'] = (int) $incomingVersion;
            }
        }

        $incomingSnapshot = $this->decodeSnapshotMetadata($metadata['quote_snapshot'] ?? null);
        $currentSnapshot = $order->getAttribute('pricing_snapshot');
        if (is_array($incomingSnapshot) && ! empty($incomingSnapshot)) {
            if (filled($currentSnapshot) && $currentSnapshot !== $incomingSnapshot) {
                Log::warning('Ignoring Stripe webhook with mismatched pricing snapshot', [
                    'order_id' => $order->id,
                ]);

                return false;
            }

            if (empty($currentSnapshot)) {
                $updates['pricing_snapshot'] = $incomingSnapshot;
            }
        }

        if (! empty($updates)) {
            $order->forceFill($updates)->save();
        }

        return true;
    }

    protected function findUserByStripeAccountId(?string $stripeAccountId): ?User
    {
        if (! $stripeAccountId) {
            return null;
        }

        $found = null;

        User::query()
            ->where('role', 'Partner Pro')
            ->whereNotNull('stripe_account_id')
            ->chunkById(200, function ($users) use ($stripeAccountId, &$found) {
                foreach ($users as $u) {
                    if ($u->stripe_account_id === $stripeAccountId) {
                        $found = $u;

                        return false;
                    }
                }
            });

        return $found;
    }
}
