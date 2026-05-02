<?php

namespace App\Http\Controllers\Traits;

use App\Models\Order;
use App\Services\CheckoutSubmissionContextService;
use Illuminate\Http\JsonResponse;

/**
 * Helper condivisi tra OrderDetailController e OrderActionsController per
 * gestire idratazione/rotazione del submission context dell'ordine.
 */
trait HandlesOrderSubmissionContext
{
    abstract protected function submissionContextService(): CheckoutSubmissionContextService;

    protected function hydrateMissingOrderSubmissionContext(Order $order, array $incomingContext = []): void
    {
        $needsHydration = blank($order->client_submission_id)
            || blank($order->pricing_signature)
            || blank($order->pricing_snapshot)
            || blank($order->pricing_snapshot_version);

        if (! $needsHydration) {
            return;
        }

        $packages = $order->packages()->with(['originAddress', 'destinationAddress', 'service'])->get();
        if ($packages->isEmpty()) {
            return;
        }

        $contextSeed = [];
        $preferredSubmissionId = trim((string) ($order->client_submission_id ?: ($incomingContext['client_submission_id'] ?? '')));
        if ($preferredSubmissionId !== '') {
            $contextSeed['client_submission_id'] = $preferredSubmissionId;
        }
        if (array_key_exists('discount_context', $incomingContext)) {
            $contextSeed['discount_context'] = $incomingContext['discount_context'];
        }

        $context = $this->submissionContextService()->enrich(
            $contextSeed,
            $this->submissionContextService()->snapshotFromPackages($packages),
            [
                'user_id' => (int) $order->user_id,
                'order_id' => (int) $order->id,
                'flow' => 'existing-order',
            ],
        );

        $updates = [];
        foreach (['client_submission_id', 'pricing_signature', 'pricing_snapshot_version', 'pricing_snapshot'] as $field) {
            if (blank($order->getAttribute($field))) {
                $updates[$field] = $context[$field];
            }
        }

        if ($updates !== []) {
            $order->forceFill($updates)->save();
        }
    }

    protected function rotatePendingOrderSubmissionContext(Order $order): void
    {
        $packages = $order->packages()->with(['originAddress', 'destinationAddress', 'service'])->get();
        if ($packages->isEmpty()) {
            return;
        }

        $context = $this->submissionContextService()->enrich(
            [],
            $this->submissionContextService()->snapshotFromPackages($packages),
            [
                'user_id' => (int) $order->user_id,
                'order_id' => (int) $order->id,
                'flow' => 'pending-order-refresh',
                'previous_submission_id' => (string) ($order->client_submission_id ?? ''),
            ],
        );

        $order->forceFill([
            'client_submission_id' => $context['client_submission_id'],
            'pricing_signature' => $context['pricing_signature'],
            'pricing_snapshot_version' => $context['pricing_snapshot_version'],
            'pricing_snapshot' => $context['pricing_snapshot'],
        ])->save();
    }

    protected function syncDiscountContextOnOrder(Order $order, array $context): ?JsonResponse
    {
        $incomingDiscountContext = $this->normalizeDiscountContextValue($context['discount_context'] ?? null);

        if ($incomingDiscountContext === null) {
            return null;
        }

        $currentSnapshot = $order->getAttribute('pricing_snapshot');
        $resolvedSnapshot = is_array($currentSnapshot) ? $currentSnapshot : [];
        $currentDiscountContext = $this->normalizeDiscountContextValue($resolvedSnapshot['discount_context'] ?? null);

        if ($currentDiscountContext !== null && $currentDiscountContext !== $incomingDiscountContext) {
            return response()->json(['error' => 'Contesto preventivo non coerente con l\'ordine.'], 422);
        }

        if ($currentDiscountContext === null) {
            $resolvedSnapshot['discount_context'] = $incomingDiscountContext;
            $order->forceFill([
                'pricing_snapshot' => $resolvedSnapshot,
            ])->save();
        }

        return null;
    }

    protected function normalizeDiscountContextValue(mixed $value): ?array
    {
        $normalized = $this->submissionContextService()->fromRequestArray([
            'discount_context' => $value,
        ]);

        return is_array($normalized['discount_context'] ?? null)
            ? $normalized['discount_context']
            : null;
    }
}
