<?php

namespace App\Http\Controllers;

use App\Events\OrderPaid;
use App\Models\Order;
use App\Models\Package;
use App\Models\Transaction;
use App\Models\WalletMovement;
use App\Services\CartService;
use App\Services\CheckoutSubmissionContextService;
use App\Services\OrderCreationService;
use App\Services\StripePaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StripeController extends Controller
{
    public function __construct(
        private readonly StripePaymentService $stripe,
        private readonly OrderCreationService $orderCreation,
        private readonly CheckoutSubmissionContextService $submissionContext,
    ) {}

    private function submissionContextFromRequest(Request $request): array
    {
        return $this->submissionContext->fromRequestArray($request->only(['client_submission_id']));
    }

    private function syncSubmissionContextOnOrder(Order $order, array $context): ?\Illuminate\Http\JsonResponse
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
            $incomingSnapshot = $context['pricing_snapshot'];
            $currentSnapshot = $order->getAttribute('pricing_snapshot');

            if ($currentSnapshot !== null && $currentSnapshot !== $incomingSnapshot) {
                return response()->json(['error' => 'Contesto preventivo non coerente con l\'ordine.'], 422);
            }

            if ($currentSnapshot === null) {
                $updates['pricing_snapshot'] = $incomingSnapshot;
            }
        }

        if (! empty($updates)) {
            $order->forceFill($updates)->save();
        }

        return null;
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
        if ((int) $order->user_id === (int) $ownerId) return null;
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

    private function resolveVerifiedWalletMovement(Order $order, string $externalId): ?WalletMovement
    {
        if (! preg_match('/^wallet-(\d+)$/', $externalId, $matches)) {
            return null;
        }

        $movementId = (int) ($matches[1] ?? 0);
        if ($movementId <= 0) {
            return null;
        }

        $expectedAmount = number_format(((int) $order->subtotal->amount()) / 100, 2, '.', '');

        return WalletMovement::query()
            ->whereKey($movementId)
            ->where('user_id', $order->user_id)
            ->where('type', 'debit')
            ->where('status', 'confirmed')
            ->where('source', 'wallet')
            ->where('reference', 'order-'.$order->id)
            ->where('amount', $expectedAmount)
            ->first();
    }

    public function markOrderCompleted(Request $request)
    {
        $request->validate([
            'order_id' => 'required|integer', 'payment_type' => 'required|string|in:wallet,bonifico',
            'ext_id' => 'nullable|string', 'is_existing_order' => 'nullable|boolean',
            'idempotency_key' => 'nullable|string|max:255',
        ]);

        $order = Order::findOrFail($request->order_id);
        if ($unauthorized = $this->ensureOrderOwnership($order)) return $unauthorized;

        $paymentType = $request->payment_type;
        $externalId = filled($request->ext_id)
            ? (string) $request->ext_id
            : (filled($this->extractIdempotencyKey($request))
                ? $this->extractIdempotencyKey($request)
                : "{$paymentType}_order_{$order->id}");

        $dispatchOrderPaid = false;
        $transaction = null;
        $errorResponse = null;

        DB::transaction(function () use ($order, $paymentType, $externalId, $request, &$dispatchOrderPaid, &$transaction, &$errorResponse) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);

            if ($contextError = $this->syncSubmissionContextOnOrder($lockedOrder, $this->submissionContextFromRequest($request))) {
                $errorResponse = $contextError;

                return;
            }

            if ($paymentType === 'wallet' && ! $this->resolveVerifiedWalletMovement($lockedOrder, $externalId)) {
                $errorResponse = response()->json(['error' => 'Pagamento wallet non verificato per questo ordine.'], 422);

                return;
            }

            $existingTransaction = $paymentType === 'bonifico'
                ? $lockedOrder->transactions()
                    ->where('type', 'bonifico')
                    ->where('status', 'pending')
                    ->latest('id')
                    ->first()
                : $lockedOrder->transactions()
                    ->where('ext_id', $externalId)
                    ->first();

            if ($existingTransaction && (
                ($paymentType === 'bonifico' && $existingTransaction->status === 'pending')
                || ($paymentType !== 'bonifico' && $existingTransaction->status === 'succeeded')
            )) {
                if ($paymentType !== 'bonifico' && $lockedOrder->isAwaitingPayment()) {
                    $lockedOrder->status = Order::COMPLETED;
                }

                $lockedOrder->payment_method = $paymentType;
                $lockedOrder->save();
                $transaction = $existingTransaction;

                return;
            }

            if (! $lockedOrder->isAwaitingPayment()) {
                $errorResponse = response()->json(['error' => 'Ordine non più pagabile.'], 422);

                return;
            }

            $lockedOrder->status = $paymentType === 'bonifico' ? Order::PENDING : Order::COMPLETED;
            $lockedOrder->payment_method = $paymentType;
            $lockedOrder->save();

            $transaction = Transaction::updateOrCreate([
                'order_id' => $lockedOrder->id,
                'ext_id' => $externalId,
            ], [
                'type' => $paymentType,
                'status' => $paymentType === 'bonifico' ? 'pending' : 'succeeded',
                'provider_status' => $paymentType === 'bonifico' ? 'pending' : 'succeeded',
                'total' => $lockedOrder->subtotal->amount(),
            ]);

            $dispatchOrderPaid = $paymentType !== 'bonifico';
        });

        if ($errorResponse) {
            return $errorResponse;
        }

        if ($transaction && $paymentType !== 'bonifico') {
            $freshOrder = $order->fresh();

            if ($dispatchOrderPaid) {
                event(new OrderPaid($freshOrder, $transaction));
                $freshOrder = $freshOrder->fresh();
            }

            $this->clearCartPackagesForOrder($freshOrder);
        }

        return response()->json(['success' => true]);
    }

    public function createOrder(Request $request)
    {
        $request->validate([
            'subtotal' => 'nullable|numeric', 'package_ids' => 'nullable|array',
            'package_ids.*' => 'integer', 'billing_data' => 'nullable|array',
            'client_submission_id' => 'nullable|string|max:255',
        ]);

        $userId = auth()->id();
        return DB::transaction(function () use ($request, $userId) {
            DB::table('users')->where('id', $userId)->lockForUpdate()->first();

            $submissionContext = $this->submissionContextFromRequest($request);

            $requestedPackageIds = $request->has('package_ids') && ! empty($request->package_ids)
                ? (array) $request->package_ids
                : [];
            $candidateSelection = $this->loadCheckoutCandidatePackages($userId, $requestedPackageIds);
            $requestedIds = $candidateSelection['requested_ids'];
            $cartPackageIds = $candidateSelection['cart_package_ids'];
            $packages = $candidateSelection['packages'];

            if ($requestedIds->isNotEmpty() && $cartPackageIds->count() !== $requestedIds->count()) {
                return response()->json(['error' => 'Alcuni pacchi selezionati non sono più nel carrello.'], 422);
            }

            if ($packages->count() !== $cartPackageIds->count()) {
                return response()->json(['error' => 'Alcuni pacchi non sono più disponibili per il checkout.'], 422);
            }

            if ($packages->isEmpty()) {
                return response()->json(['error' => 'Nessun pacco trovato.'], 422);
            }

            CartService::normalizePackagePricing($packages);
            $packages = Package::with(['originAddress', 'destinationAddress', 'service'])
                ->whereIn('id', $packages->pluck('id'))
                ->get();

            $submissionContext = $this->submissionContext->enrich(
                $submissionContext,
                $this->submissionContext->snapshotFromPackages($packages, $request->input('billing_data')),
                [
                    'user_id' => $userId,
                    'package_ids' => $packages->pluck('id')->values()->all(),
                    'billing_data' => $request->input('billing_data'),
                ],
            );

            $existingOrders = Order::query()
                ->where('user_id', $userId)
                ->where(function ($query) use ($submissionContext) {
                    $submissionId = trim((string) ($submissionContext['client_submission_id'] ?? ''));

                    $query->where('client_submission_id', $submissionId);

                    if ($submissionId !== '') {
                        $query->orWhere('client_submission_id', 'like', $submissionId.'|%');
                    }
                })
                ->orderBy('id')
                ->get();

            if ($existingOrders->isNotEmpty()) {
                foreach ($existingOrders as $existingOrder) {
                    if ($error = $this->syncSubmissionContextOnOrder($existingOrder, $submissionContext)) {
                        return $error;
                    }
                }

                return response()->json($this->formatOrderResponse($existingOrders));
            }

            $alreadyOrderedPackageIds = $this->findAlreadyOrderedPackageIds($packages);
            if ($alreadyOrderedPackageIds->isNotEmpty()) {
                return response()->json(['error' => 'Alcuni pacchi non sono più disponibili per il checkout.'], 422);
            }

            $orders = $this->orderCreation->createOrdersFromPackages(
                $packages,
                $userId,
                $request->input('billing_data'),
                $submissionContext,
            );

            foreach ($orders as $order) {
                if ($error = $this->syncSubmissionContextOnOrder($order, $submissionContext)) {
                    return $error;
                }
            }

            return response()->json($this->formatOrderResponse($orders));
        });
    }

    public function createPayment(Request $request)
    {
        $request->validate([
            'order_id' => 'required|integer', 'currency' => 'required|string',
            'payment_method_id' => 'required|string',
            'idempotency_key' => 'nullable|string|max:255',
            'client_submission_id' => 'nullable|string|max:255',
        ]);
        $order = Order::findOrFail($request->order_id);
        $user = $request->user();
        if ($unauthorized = $this->ensureOrderOwnership($order, $user?->id)) return $unauthorized;
        if ($contextError = $this->syncSubmissionContextOnOrder($order, $this->submissionContextFromRequest($request))) return $contextError;
        if ($notPayable = $this->ensureOrderPayable($order)) return $notPayable;
        if (!$this->stripe->isConfigured()) return response()->json(['error' => 'Stripe non configurato.'], 503);
        if (!$user?->customer_id) return response()->json(['error' => 'No Stripe customer'], 400);
        if (!$this->stripe->paymentMethodBelongsToUser($user, $request->payment_method_id)) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        return response()->json($this->stripe->createOffSessionPayment(
            $order,
            $user,
            $request->currency,
            $request->payment_method_id,
            $this->resolveStripeIdempotencyKey($order, $request),
        ));
    }

    public function createPaymentIntent(Request $request)
    {
        $request->validate([
            'order_id' => 'required|integer',
            'idempotency_key' => 'nullable|string|max:255',
            'client_submission_id' => 'nullable|string|max:255',
        ]);
        $order = Order::findOrFail($request->order_id);
        $user = $request->user();
        if ($unauthorized = $this->ensureOrderOwnership($order, $user?->id)) return $unauthorized;
        if ($contextError = $this->syncSubmissionContextOnOrder($order, $this->submissionContextFromRequest($request))) return $contextError;
        if ($notPayable = $this->ensureOrderPayable($order)) return $notPayable;
        if (!$this->stripe->isConfigured()) return response()->json(['error' => 'Stripe non configurato.'], 503);

        $amount = (int) $order->subtotal->amount();
        if ($amount < 50) return response()->json(['error' => 'Importo troppo basso per il pagamento.'], 422);

        try {
            return response()->json($this->stripe->createPaymentIntent(
                $order,
                $user,
                $this->resolveStripeIdempotencyKey($order, $request),
            ));
        } catch (\Exception $e) {
            Log::error('PaymentIntent creation error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Errore durante la creazione del pagamento. Riprova.'], 500);
        }
    }

    public function orderPaid(Request $request)
    {
        $request->validate([
            'order_id' => 'required|integer',
            'ext_id' => 'required|string',
            'is_existing_order' => 'nullable|boolean',
            'client_submission_id' => 'nullable|string|max:255',
        ]);

        $order = Order::findOrFail($request->order_id);
        if ($unauthorized = $this->ensureOrderOwnership($order)) return $unauthorized;

        try {
            $result = $this->stripe->retrieveAndVerifyPayment($request->ext_id, $order);
        } catch (\RuntimeException $e) {
            Log::warning('Stripe retrieveAndVerifyPayment failed', ['order_id' => $order->id, 'error' => $e->getMessage()]);
            return response()->json(['error' => 'Verifica del pagamento non riuscita. Riprova o contatta il supporto.'], 422);
        }

        $intent = $result['intent'];
        $transaction = null;
        $dispatchOrderPaid = false;
        $response = ['success' => true];
        $statusCode = 200;

        DB::transaction(function () use ($order, $intent, $result, $request, &$transaction, &$dispatchOrderPaid, &$response, &$statusCode) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);

            if ($contextError = $this->syncSubmissionContextOnOrder($lockedOrder, $this->submissionContextFromRequest($request))) {
                $response = $contextError->getData(true);
                $statusCode = $contextError->getStatusCode();

                return;
            }

            if ($lockedOrder->hasSuccessfulTransactionForExternalId($intent->id)) {
                $this->syncStripePaymentState($lockedOrder, $intent->id);
                $transaction = $lockedOrder->transactions()
                    ->where('ext_id', $intent->id)
                    ->where('status', 'succeeded')
                    ->latest('id')
                    ->first();

                return;
            }

            if (! $lockedOrder->isAwaitingPayment()) {
                $response = ['error' => 'Ordine non più pagabile.'];
                $statusCode = 422;

                return;
            }

            $lockedOrder->status = $intent->status === 'succeeded' ? Order::COMPLETED : Order::PAYMENT_FAILED;
            $lockedOrder->payment_method = 'stripe';
            $lockedOrder->stripe_payment_intent_id = $intent->id;
            $lockedOrder->save();

            $existingTransaction = $lockedOrder->transactions()
                ->where('ext_id', $intent->id)
                ->first();
            $wasAlreadySucceeded = $existingTransaction?->status === 'succeeded';

            $transaction = Transaction::updateOrCreate([
                'ext_id' => $intent->id,
            ], [
                'order_id' => $lockedOrder->id,
                'type' => $result['payment_type'],
                'status' => $intent->status,
                'provider_status' => $intent->status,
                'total' => $intent->amount,
            ]);

            if ($intent->status !== 'succeeded') {
                $response = ['success' => false];
                $statusCode = 402;

                return;
            }

            $dispatchOrderPaid = ! $wasAlreadySucceeded;
        });

        if ($statusCode !== 200) {
            return response()->json($response, $statusCode);
        }

        if ($dispatchOrderPaid && $transaction) {
            event(new OrderPaid($order->fresh(), $transaction));
        }

        $this->clearCartPackagesForOrder($order->fresh());

        return response()->json(['success' => true]);
    }

    public function createOrGetCustomer($user)
    {
        return $this->stripe->createOrGetCustomer($user);
    }

    public function createSetupIntent(Request $request)
    {
        if (!$this->stripe->isConfigured()) return response()->json(['error' => 'Stripe non configurato.'], 503);
        try {
            return response()->json($this->stripe->createSetupIntent($request->user()));
        } catch (\Exception $e) {
            Log::error('SetupIntent creation error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Errore durante la configurazione del metodo di pagamento.'], 500);
        }
    }

    public function listPaymentMethods(Request $request)
    {
        $user = $request->user();
        if (!$user->customer_id || !$this->stripe->isConfigured()) return response()->json(['data' => [], 'default' => null]);
        return response()->json($this->stripe->listPaymentMethods($user));
    }

    public function setDefaultPaymentMethod(Request $request)
    {
        $request->validate(['payment_method' => 'required|string']);
        $user = $request->user();
        if (!$user->customer_id) return response()->json(['error' => 'No Stripe customer'], 400);
        try { return response()->json($this->stripe->setDefaultPaymentMethod($user, $request->payment_method)); }
        catch (\Exception $e) {
            Log::warning('setDefaultPaymentMethod failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            return response()->json(['error' => 'Impostazione metodo di pagamento non riuscita.'], 400);
        }
    }

    public function changeDefaultPaymentMethod(Request $request)
    {
        $request->validate(['payment_method_id' => 'required|string']);
        $user = $request->user();
        if (!$user->customer_id) return response()->json(['error' => 'No Stripe customer'], 400);
        try { return response()->json($this->stripe->changeDefaultPaymentMethod($user, $request->payment_method_id)); }
        catch (\Exception $e) {
            Log::warning('changeDefaultPaymentMethod failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            return response()->json(['error' => 'Modifica metodo di pagamento non riuscita.'], 400);
        }
    }

    public function deleteCard(Request $request)
    {
        $request->validate(['payment_method_id' => 'required|string']);
        $user = $request->user();
        if (!$user->customer_id) return response()->json(['error' => 'Nessun profilo Stripe associato.'], 400);
        try {
            $this->stripe->deleteCard($user, $request->payment_method_id);
            return response()->json(['success' => true]);
        } catch (\RuntimeException $e) {
            Log::warning('deleteCard ownership/permission error', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            return response()->json(['error' => 'Non autorizzato a eliminare questa carta.'], 403);
        } catch (\Exception $e) {
            Log::warning('deleteCard failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            return response()->json(['error' => 'Eliminazione carta non riuscita.'], 400);
        }
    }

    public function getDefaultPaymentMethod(Request $request)
    {
        $user = $request->user();
        if (!$user->customer_id || !$this->stripe->isConfigured()) return response()->json(['card' => null]);
        return response()->json(['card' => $this->stripe->getDefaultPaymentMethod($user)]);
    }
}
