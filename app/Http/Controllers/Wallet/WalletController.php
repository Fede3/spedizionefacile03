<?php

namespace App\Http\Controllers\Wallet;

use App\Http\Controllers\Controller;
use App\Http\Requests\WalletPayRequest;
use App\Http\Requests\WalletTopUpRequest;
use App\Services\StripePaymentService;
use App\Services\Wallet\WalletQueryService;
use App\Services\WalletOrderPaymentService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\CardException;

class WalletController extends Controller
{
    public function __construct(
        private readonly StripePaymentService $stripePaymentService,
        private readonly WalletOrderPaymentService $walletOrderPayment,
        private readonly WalletQueryService $walletQuery,
    ) {}

    /*
     * Boundary note:
     * - questo controller possiede saldo, movimenti, top-up e debit wallet;
     * - NON completa da solo un ordine pagato con wallet;
     * - l'ordine viene finalizzato dal secondo step
     *   `POST /api/stripe/mark-order-completed` in StripeCheckoutController.
     * - il contratto canonico `order-{id}` / `wallet-{id}` vive in WalletOrderLinkService.
     *
     * Per capire il flusso reale: docs/FEATURE_BOUNDARIES.md -> Wallet / Payment.
     */

    // Mostra il saldo attuale del portafoglio dell'utente
    // Per i Partner Pro mostra anche il saldo delle commissioni
    public function balance(): JsonResponse
    {
        return response()->json(
            $this->walletQuery->balanceData(auth()->user()),
            200,
            [],
            JSON_PRESERVE_ZERO_FRACTION
        );
    }

    // Lista paginata di tutti i movimenti del portafoglio dell'utente
    // (ricariche, pagamenti, commissioni, prelievi, ecc.) dal più recente.
    public function movements(): JsonResponse
    {
        return response()->json($this->walletQuery->movementsPaginator((int) auth()->id()));
    }

    // Ricarica il portafoglio usando una carta di credito salvata
    // Crea un pagamento su Stripe e, se va a buon fine, aggiunge i soldi al portafoglio
    public function topUp(WalletTopUpRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();
        $amountCents = (int) round($data['amount'] * 100);
        $idempotencyKey = $this->stripePaymentService->resolveWalletTopUpIdempotencyKey(
            $user,
            $amountCents,
            (string) $data['payment_method_id'],
            $data['idempotency_key'] ?? null
        );

        if (! $this->stripePaymentService->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'Stripe non configurato. Vai nelle impostazioni per inserire le chiavi API.',
            ], 503);
        }

        try {
            $paymentIntent = $this->stripePaymentService->createWalletTopUpPayment(
                $user,
                $amountCents,
                (string) $data['payment_method_id'],
                $idempotencyKey
            );

            if (($paymentIntent['status'] ?? null) === 'succeeded') {
                $result = $this->walletQuery->persistTopUpMovement($user, $data, $paymentIntent, $idempotencyKey);

                return response()->json([
                    'success' => true,
                    'data' => $result['movement'],
                    'new_balance' => $result['new_balance'],
                ], $result['created'] ? 201 : 200);
            }

            return response()->json([
                'success' => false,
                'message' => 'Pagamento non riuscito. Stato: '.($paymentIntent['status'] ?? 'unknown'),
            ], 402);
        } catch (QueryException $e) {
            $existingMovement = $this->walletQuery->findExistingMovement($user->id, $idempotencyKey);

            if ($existingMovement) {
                return response()->json([
                    'success' => true,
                    'data' => $existingMovement,
                    'new_balance' => $user->walletBalance(),
                ], 200);
            }

            Log::error('Wallet top-up persistence error', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Errore durante il salvataggio della ricarica. Riprova.',
            ], 500);
        } catch (CardException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Pagamento rifiutato: '.$e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            Log::error('Wallet top-up error', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Errore durante il pagamento. Riprova.',
            ], 500);
        }
    }

    // Paga una spedizione usando il saldo del portafoglio.
    // Questo endpoint crea SOLO il movimento debit verificato.
    // La completion dell'ordine vive nel secondo step
    // StripeCheckoutController::markOrderCompleted().
    public function payWithWallet(WalletPayRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        $validation = $this->walletQuery->validateOrderForPayment($user, (string) $data['reference'], (float) $data['amount']);
        if (isset($validation['error'])) {
            return response()->json(['message' => $validation['error']], $validation['status']);
        }

        $order = $validation['order'];
        $orderAmountEur = round($order->payableTotalCents() / 100, 2);

        $result = $this->walletOrderPayment->createOrReuseOrderDebit(
            $user,
            $order,
            $orderAmountEur,
            $data['description'] ?? 'Pagamento spedizione'
        );

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], 422);
        }

        return response()->json([
            'success' => true,
            'data' => $result['movement'],
            'new_balance' => $result['new_balance'],
        ], ($result['created'] ?? false) ? 201 : 200);
    }
}
