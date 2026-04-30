<?php

namespace App\Http\Controllers\Checkout;

use App\Models\Order;
use App\Models\Package;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Helper privati per StripeCheckoutController.
 *
 * Estratti dalla classe principale per ridurla. Tutti i metodi sono PURI
 * rispetto a Stripe SDK (nessuna chiamata HTTP a Stripe): gestiscono solo
 * idempotency-key string formatting, ownership/payable check, DB cart cleanup,
 * package lookup, submission context sync.
 *
 * Lo stato condiviso atteso (proprieta' della classe host):
 *   - $this->submissionContext  CheckoutSubmissionContextService
 *
 * @internal Trait usato solo da StripeCheckoutController.
 */
trait StripeCheckoutHelpers
{
    private function submissionContextFromRequest(Request $request, bool $includeDiscountContext = false): array
    {
        $fields = ['client_submission_id'];
        if ($includeDiscountContext) {
            $fields[] = 'discount_context';
        }

        return $this->submissionContext->fromRequestArray($request->only($fields));
    }

    private function syncSubmissionContextOnOrder(Order $order, array $context): ?JsonResponse
    {
        if (
            blank($order->client_submission_id)
            || blank($order->pricing_signature)
            || blank($order->pricing_snapshot)
            || blank($order->pricing_snapshot_version)
        ) {
            $packages = $order->packages()->with(['originAddress', 'destinationAddress', 'service'])->get();

            if ($packages->isNotEmpty()) {
                $seedContext = [];
                $preferredSubmissionId = trim((string) ($order->client_submission_id ?: ($context['client_submission_id'] ?? '')));
                if ($preferredSubmissionId !== '') {
                    $seedContext['client_submission_id'] = $preferredSubmissionId;
                }
                if (array_key_exists('discount_context', $context)) {
                    $seedContext['discount_context'] = $context['discount_context'];
                }

                $hydratedContext = $this->submissionContext->enrich(
                    $seedContext,
                    $this->submissionContext->snapshotFromPackages($packages),
                    [
                        'user_id' => (int) $order->user_id,
                        'order_id' => (int) $order->id,
                        'flow' => 'stripe-existing-order',
                    ],
                );

                $updates = [];
                foreach (['client_submission_id', 'pricing_signature', 'pricing_snapshot_version', 'pricing_snapshot'] as $field) {
                    if (blank($order->getAttribute($field))) {
                        $updates[$field] = $hydratedContext[$field];
                    }
                }

                if ($updates !== []) {
                    $order->forceFill($updates)->save();
                }
            }
        }

        $updates = [];

        foreach (['client_submission_id', 'pricing_signature'] as $field) {
            if (! array_key_exists($field, $context)) {
                continue;
            }

            $incoming = (string) $context[$field];
            $current = (string) ($order->getAttribute($field) ?? '');

            if (
                $field === 'client_submission_id'
                && $current !== ''
                && $current !== $incoming
                && ! str_starts_with($current, $incoming.'|')
            ) {
                return response()->json(['error' => 'Contesto preventivo non coerente con l\'ordine.'], 422);
            }

            if ($field !== 'client_submission_id' && $current !== '' && $current !== $incoming) {
                return response()->json(['error' => 'Contesto preventivo non coerente con l\'ordine.'], 422);
            }

            if ($current === '') {
                $updates[$field] = $incoming;
            }
        }

        if (array_key_exists('pricing_snapshot_version', $context)) {
            $incomingVersion = (int) $context['pricing_snapshot_version'];
            $currentVersion = $order->getAttribute('pricing_snapshot_version');

            if ($currentVersion !== null && (int) $currentVersion !== $incomingVersion) {
                return response()->json(['error' => 'Contesto preventivo non coerente con l\'ordine.'], 422);
            }

            if ($currentVersion === null) {
                $updates['pricing_snapshot_version'] = $incomingVersion;
            }
        } elseif ($order->getAttribute('pricing_snapshot_version') === null) {
            $updates['pricing_snapshot_version'] = 1;
        }

        if (array_key_exists('pricing_snapshot', $context)) {
            $incomingSnapshot = $this->snapshotWithoutDiscountContext($context['pricing_snapshot'] ?? null);
            $currentSnapshot = $this->snapshotWithoutDiscountContext($order->getAttribute('pricing_snapshot'));

            if ($currentSnapshot !== null && $incomingSnapshot !== null && $currentSnapshot !== $incomingSnapshot) {
                return response()->json(['error' => 'Contesto preventivo non coerente con l\'ordine.'], 422);
            }

            if ($order->getAttribute('pricing_snapshot') === null) {
                $updates['pricing_snapshot'] = $context['pricing_snapshot'];
            }
        }

        if (array_key_exists('discount_context', $context)) {
            $incomingDiscountContext = $this->normalizeDiscountContextValue($context['discount_context'] ?? null);
            $resolvedSnapshot = array_key_exists('pricing_snapshot', $updates)
                ? $updates['pricing_snapshot']
                : $order->getAttribute('pricing_snapshot');
            $currentSnapshot = is_array($resolvedSnapshot) ? $resolvedSnapshot : [];
            $currentDiscountContext = $this->normalizeDiscountContextValue($currentSnapshot['discount_context'] ?? null);

            if ($incomingDiscountContext !== null && $currentDiscountContext !== null && $currentDiscountContext !== $incomingDiscountContext) {
                return response()->json(['error' => 'Contesto preventivo non coerente con l\'ordine.'], 422);
            }

            if ($incomingDiscountContext !== null && $currentDiscountContext === null) {
                $currentSnapshot['discount_context'] = $incomingDiscountContext;
                $updates['pricing_snapshot'] = $currentSnapshot;
            }
        }

        if (! empty($updates)) {
            $order->forceFill($updates)->save();
        }

        return null;
    }

    private function normalizeDiscountContextValue(mixed $value): ?array
    {
        $normalized = $this->submissionContext->fromRequestArray([
            'discount_context' => $value,
        ]);

        return is_array($normalized['discount_context'] ?? null)
            ? $normalized['discount_context']
            : null;
    }

    private function snapshotWithoutDiscountContext(mixed $snapshot): ?array
    {
        if (! is_array($snapshot)) {
            return null;
        }

        unset($snapshot['discount_context']);

        return $snapshot;
    }

    private function resolveStripeIdempotencyKey(Order $order, Request $request): ?string
    {
        $requestKey = $this->extractIdempotencyKey($request);
        $action = str_contains($request->path(), 'payment-intent') ? 'intent' : 'charge';

        if (filled($requestKey)) {
            return 'order_'.$order->id.'_'.$action.'_'.substr(sha1($requestKey), 0, 24);
        }

        $requestSubmissionId = trim((string) $request->input('client_submission_id', ''));
        if ($requestSubmissionId !== '') {
            return 'order_'.$order->id.'_'.$action.'_'.substr(sha1($requestSubmissionId), 0, 24);
        }

        $submissionId = trim((string) $order->client_submission_id);
        if ($submissionId !== '') {
            return 'order_'.$order->id.'_'.$action.'_'.substr(sha1($submissionId), 0, 24);
        }

        return 'order_'.$order->id.'_'.$action;
    }

    private function formatOrderResponse(array|object $orders): array
    {
        $orderIds = collect($orders)->pluck('id')->all();

        return [
            'order_id' => $orderIds[0] ?? null,
            'order_ids' => $orderIds,
            'merged_count' => count($orderIds),
        ];
    }

    private function ensureOrderOwnership(Order $order, ?int $userId = null)
    {
        $ownerId = $userId ?? auth()->id();
        if ((int) $order->user_id === (int) $ownerId) {
            return null;
        }

        return response()->json(['error' => 'Non autorizzato.'], 403);
    }

    private function ensureOrderPayable(Order $order)
    {
        if ($order->isAwaitingPayment()) {
            return null;
        }

        return response()->json(['error' => 'Ordine non più pagabile.'], 422);
    }

    private function extractIdempotencyKey(Request $request): ?string
    {
        $key = trim((string) ($request->header('X-Idempotency-Key', $request->input('idempotency_key', ''))));

        return $key !== '' ? $key : null;
    }

    private function syncStripePaymentState(Order $order, string $paymentIntentId): void
    {
        if ($order->isAwaitingPayment()) {
            $order->status = Order::COMPLETED;
        }

        $order->payment_method = 'stripe';
        $order->stripe_payment_intent_id = $paymentIntentId;
        $order->save();
    }

    private function clearCartPackagesForOrder(Order $order): void
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

    private function loadCheckoutCandidatePackages(int $userId, array $requestedPackageIds = []): array
    {
        $requestedIds = collect($requestedPackageIds)
            ->map(fn ($id) => (int) $id)
            ->filter(fn (int $id) => $id > 0)
            ->unique()
            ->values();

        $cartPackageIdsQuery = DB::table('cart_user')
            ->where('user_id', $userId);

        if ($requestedIds->isNotEmpty()) {
            $cartPackageIdsQuery->whereIn('package_id', $requestedIds->all());
        }

        $cartPackageIds = $cartPackageIdsQuery
            ->pluck('package_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $packages = Package::with(['originAddress', 'destinationAddress', 'service'])
            ->where('user_id', $userId)
            ->whereIn('id', $cartPackageIds->all())
            ->get();

        return [
            'requested_ids' => $requestedIds,
            'cart_package_ids' => $cartPackageIds,
            'packages' => $packages,
        ];
    }

    private function findAlreadyOrderedPackageIds($packages)
    {
        $packageIds = collect($packages)->pluck('id')->filter()->values();

        if ($packageIds->isEmpty()) {
            return collect();
        }

        return DB::table('package_order')
            ->whereIn('package_id', $packageIds->all())
            ->pluck('package_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();
    }
}
