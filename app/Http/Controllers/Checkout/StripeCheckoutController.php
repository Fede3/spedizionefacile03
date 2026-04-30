<?php

// CRITICAL: vedi CLAUDE.md "Eccezioni documentate" — non splittare senza E2E gating Stripe.
// File 756 LOC: idempotency-key Stripe + PaymentIntent + 3DS confirm. Toccare solo
// con DB snapshot pre/post + carta test 4242 4242 4242 4242 09/30 123 + rollback se diff.

namespace App\Http\Controllers\Checkout;

use App\Events\OrderPaid;
use App\Http\Controllers\Controller;
use App\Http\Requests\CreateOrderRequest;
use App\Http\Requests\CreatePaymentIntentRequest;
use App\Http\Requests\CreateStripePaymentRequest;
use App\Http\Requests\OrderPaidRequest;
use App\Http\Requests\PayWithExternalProviderRequest;
use App\Mail\OrderAwaitingBankTransferMail;
use App\Models\Order;
use App\Models\Package;
use App\Models\Setting;
use App\Models\Transaction;
use App\Services\CartService;
use App\Services\CheckoutSubmissionContextService;
use App\Services\OrderCreationService;
use App\Services\StripePaymentService;
use App\Services\WalletOrderLinkService;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * StripeCheckoutController
 *
 * Boundary principale del checkout:
 * - crea o recupera l'ordine pagabile;
 * - prepara i flussi Stripe/bonifico;
 * - finalizza gli ordini gia' verificati.
 *
 * Nota importante:
 * il pagamento wallet non si chiude qui da solo e non si chiude in WalletController da solo.
 * Il flusso reale e':
 * 1. POST /api/wallet/pay -> crea il debit verificato
 * 2. POST /api/stripe/mark-order-completed -> completa l'ordine usando quel movimento
 */
class StripeCheckoutController extends Controller
{
    use StripeCheckoutHelpers;

    public function __construct(
        private readonly StripePaymentService $stripe,
        private readonly OrderCreationService $orderCreation,
        private readonly CheckoutSubmissionContextService $submissionContext,
        private readonly CartService $cartService,
        private readonly WalletOrderLinkService $walletOrderLink,
    ) {}

    /* ===================================================================
     *  PUBLIC ENDPOINTS
     * =================================================================*/

    public function markOrderCompleted(PayWithExternalProviderRequest $request)
    {
        // Questo endpoint e' il secondo step canonico per bonifico e wallet.
        // Per wallet richiede un movimento gia' verificato, non addebita denaro da solo.
        // Idempotenza: lo stesso ext_id deve riconciliare sempre lo stesso ordine
        // e la stessa transazione. Se il primo tentativo ha gia' scritto ordine +
        // transazione ma si e' fermato prima di dispatchare OrderPaid, un retry
        // deve far ripartire i side-effect post-pagamento una sola volta.
        $order = Order::findOrFail($request->order_id);
        if ($unauthorized = $this->ensureOrderOwnership($order)) {
            return $unauthorized;
        }

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

            if ($paymentType === 'wallet' && ! $this->walletOrderLink->resolveVerifiedWalletMovement($lockedOrder, $externalId)) {
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
                $shouldDispatchExistingPaidOrder = $this->shouldDispatchExistingPaidOrder(
                    $lockedOrder,
                    $paymentType
                );

                if ($paymentType !== 'bonifico' && $lockedOrder->isAwaitingPayment()) {
                    $lockedOrder->status = Order::COMPLETED;
                }

                $lockedOrder->payment_method = $paymentType;
                $lockedOrder->save();
                if ($paymentType === 'bonifico') {
                    $existingTransaction->total = $lockedOrder->payableTotalCents();
                    $existingTransaction->save();
                }
                $transaction = $existingTransaction;
                $dispatchOrderPaid = $shouldDispatchExistingPaidOrder;

                return;
            }

            if (! $lockedOrder->isAwaitingPayment()) {
                $errorResponse = response()->json(['error' => 'Ordine non più pagabile.'], 422);

                return;
            }

            // F05 — Bonifico: ordine resta in stato dedicato "awaiting_bank_transfer"
            // fino a conferma manuale da parte dell'admin (vedi AdminBankTransferController).
            $lockedOrder->status = $paymentType === 'bonifico'
                ? Order::AWAITING_BANK_TRANSFER
                : Order::COMPLETED;
            $lockedOrder->payment_method = $paymentType;
            $lockedOrder->save();

            $transaction = Transaction::updateOrCreate([
                'order_id' => $lockedOrder->id,
                'ext_id' => $externalId,
            ], [
                'type' => $paymentType,
                'status' => $paymentType === 'bonifico' ? 'pending' : 'succeeded',
                'provider_status' => $paymentType === 'bonifico' ? 'pending' : 'succeeded',
                'total' => $lockedOrder->payableTotalCents(),
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

        // F05 — per bonifico: svuota carrello immediatamente e invia email istruzioni
        // anche se il pagamento non è ancora "effettivo". L'ordine è bloccato in
        // awaiting_bank_transfer e non può essere ri-pagato con altri metodi.
        if ($transaction && $paymentType === 'bonifico') {
            $freshOrder = $order->fresh();
            $this->clearCartPackagesForOrder($freshOrder);

            try {
                if ($freshOrder->user?->email) {
                    Mail::to($freshOrder->user->email)->queue(new OrderAwaitingBankTransferMail($freshOrder));
                }

                $adminEmail = trim((string) Setting::get('admin_notification_email', ''))
                    ?: (string) config('mail.from.address');
                if ($adminEmail) {
                    $amount = number_format($freshOrder->payableTotalCents() / 100, 2, ',', '.');
                    Mail::raw(
                        "Nuovo ordine #{$freshOrder->id} in attesa di bonifico.\n"
                        ."Importo: {$amount} EUR\n"
                        .'Cliente: '.($freshOrder->user?->email ?: '—')."\n"
                        ."Causale attesa: Ordine #{$freshOrder->id}\n"
                        .'Gestisci: '.rtrim((string) config('app.frontend_url'), '/').'/account/amministrazione/ordini?filter=awaiting_bank_transfer',
                        function ($message) use ($adminEmail, $freshOrder) {
                            $message->to($adminEmail)
                                ->subject('[Admin] Bonifico in attesa - Ordine #'.$freshOrder->id);
                        }
                    );
                }
            } catch (\Throwable $e) {
                Log::warning('Bank transfer mails failed', [
                    'order_id' => $freshOrder->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json(['success' => true]);
    }

    private function shouldDispatchExistingPaidOrder(Order $order, string $paymentType): bool
    {
        if ($paymentType === 'bonifico') {
            return false;
        }

        if ($order->isAwaitingPayment()) {
            return true;
        }

        // If a succeeded wallet/card transaction already exists but the order is
        // still stuck in the controller-level "completed" state, the first
        // completion attempt most likely committed the order + transaction and
        // failed before dispatching OrderPaid. Retrying must restart the
        // downstream post-payment flow exactly once.
        return $order->rawStatus() === Order::COMPLETED;
    }

    public function createOrder(CreateOrderRequest $request)
    {
        $userId = auth()->id();

        return DB::transaction(function () use ($request, $userId) {
            DB::table('users')->where('id', $userId)->lockForUpdate()->first();

            $submissionContext = $this->submissionContextFromRequest($request, includeDiscountContext: true);

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

            $this->cartService->normalizePackagePricing($packages);
            $packages = Package::with(['originAddress', 'destinationAddress', 'service'])
                ->whereIn('id', $packages->pluck('id'))
                ->get();

            if ($request->boolean('single_order_only') && $this->orderCreation->countPackageGroups($packages) > 1) {
                return response()->json([
                    'error' => 'Questo checkout contiene più spedizioni separate. Completa un pagamento per volta.',
                ], 422);
            }

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

    public function createPayment(CreateStripePaymentRequest $request)
    {
        $order = Order::findOrFail($request->order_id);
        $user = $request->user();
        if ($unauthorized = $this->ensureOrderOwnership($order, $user?->id)) {
            return $unauthorized;
        }
        if ($contextError = $this->syncSubmissionContextOnOrder($order, $this->submissionContextFromRequest($request))) {
            return $contextError;
        }
        if ($notPayable = $this->ensureOrderPayable($order)) {
            return $notPayable;
        }
        if (! $this->stripe->isConfigured()) {
            return response()->json(['error' => 'Stripe non configurato.'], 503);
        }
        if (! $user?->customer_id) {
            return response()->json(['error' => 'No Stripe customer'], 400);
        }
        if (! $this->stripe->paymentMethodBelongsToUser($user, $request->payment_method_id)) {
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

    public function createPaymentIntent(CreatePaymentIntentRequest $request)
    {
        $order = Order::findOrFail($request->order_id);
        $user = $request->user();
        if ($unauthorized = $this->ensureOrderOwnership($order, $user?->id)) {
            return $unauthorized;
        }
        if ($contextError = $this->syncSubmissionContextOnOrder($order, $this->submissionContextFromRequest($request))) {
            return $contextError;
        }
        if ($notPayable = $this->ensureOrderPayable($order)) {
            return $notPayable;
        }
        if (! $this->stripe->isConfigured()) {
            return response()->json(['error' => 'Stripe non configurato.'], 503);
        }

        $amount = $order->payableTotalCents();
        if ($amount < 50) {
            return response()->json(['error' => 'Importo troppo basso per il pagamento.'], 422);
        }

        try {
            return response()->json($this->stripe->createPaymentIntent(
                $order,
                $user,
                $this->resolveStripeIdempotencyKey($order, $request),
            ));
        } catch (DecryptException $e) {
            // customer_id corrotto nel DB (APP_KEY ruotata): reset e riprova una volta.
            if ($user && $user->customer_id !== null) {
                Log::warning('customer_id decrypt failed during PaymentIntent, resetting', ['user_id' => $user->id]);
                $user->forceFill(['customer_id' => null])->saveQuietly();
                try {
                    return response()->json($this->stripe->createPaymentIntent(
                        $order,
                        $user->refresh(),
                        $this->resolveStripeIdempotencyKey($order, $request),
                    ));
                } catch (\Throwable $retryError) {
                    Log::error('PaymentIntent retry after decrypt reset failed', ['error' => $retryError->getMessage()]);
                }
            }

            return response()->json(['error' => 'Errore durante la creazione del pagamento. Riprova.'], 500);
        } catch (\Exception $e) {
            Log::error('PaymentIntent creation error', ['error' => $e->getMessage()]);

            return response()->json(['error' => 'Errore durante la creazione del pagamento. Riprova.'], 500);
        }
    }

    public function orderPaid(OrderPaidRequest $request)
    {
        $order = Order::findOrFail($request->order_id);
        if ($unauthorized = $this->ensureOrderOwnership($order)) {
            return $unauthorized;
        }

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

    /* ===================================================================
     *  PRIVATE HELPERS
     * =================================================================*/

    // 13 helper privati spostati nel trait StripeCheckoutHelpers (use sopra):
    // submissionContextFromRequest, syncSubmissionContextOnOrder,
    // normalizeDiscountContextValue, snapshotWithoutDiscountContext,
    // resolveStripeIdempotencyKey, formatOrderResponse, ensureOrderOwnership,
    // ensureOrderPayable, extractIdempotencyKey, syncStripePaymentState,
    // clearCartPackagesForOrder, loadCheckoutCandidatePackages,
    // findAlreadyOrderedPackageIds.
}
