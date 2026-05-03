<?php

namespace App\Services\Wallet;

use App\Models\Order;
use App\Models\User;
use App\Models\WalletMovement;
use App\Services\WalletOrderLinkService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Query/list helpers per WalletController.
 *
 * Possiede:
 * - lettura saldo + saldo commissioni Pro
 * - paginazione movimenti utente
 * - validazione preliminare pagamento ordine via wallet
 * - persistenza idempotente movimento credit dopo top-up Stripe
 *
 * Non possiede:
 * - chiamate Stripe (restano nel controller)
 * - creazione/riuso del debit ordine (in WalletOrderPaymentService)
 */
class WalletQueryService
{
    public function __construct(
        private readonly WalletOrderLinkService $walletOrderLink,
    ) {}

    /**
     * Dati saldo per la response /api/wallet/balance.
     *
     * @return array{balance: float, commission_balance: float|null, currency: string}
     */
    public function balanceData(User $user): array
    {
        return [
            'balance' => $user->walletBalance(),
            'commission_balance' => $user->isPro() ? $user->commissionBalance() : null,
            'currency' => 'EUR',
        ];
    }

    /**
     * Paginatore movimenti dell'utente, dal più recente.
     */
    public function movementsPaginator(int $userId, int $perPage = 30): LengthAwarePaginator
    {
        return WalletMovement::query()
            ->where('user_id', $userId)
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    /**
     * Validazione preliminare pagamento ordine via wallet.
     * Ritorna `['order' => Order]` se ok, altrimenti `['error' => string, 'status' => int]`.
     *
     * @return array{order?: Order, error?: string, status?: int}
     */
    public function validateOrderForPayment(User $user, string $reference, float $requestedAmount): array
    {
        $orderReference = $this->walletOrderLink->normalizeOrderReference($reference);
        $orderId = $orderReference
            ? $this->walletOrderLink->extractOrderId($orderReference)
            : null;

        if (! $orderId) {
            return ['error' => 'Riferimento ordine non valido.', 'status' => 422];
        }

        $order = Order::find($orderId);
        if (! $order) {
            return ['error' => 'Ordine non trovato.', 'status' => 404];
        }

        if ((int) $order->user_id !== (int) $user->id) {
            return ['error' => 'Non autorizzato: questo ordine non appartiene al tuo account.', 'status' => 403];
        }

        $orderAmountEur = round($order->payableTotalCents() / 100, 2);
        $rounded = round($requestedAmount, 2);
        if (abs($orderAmountEur - $rounded) > 0.01) {
            Log::warning('Wallet pay amount mismatch', [
                'user_id' => $user->id,
                'order_id' => $order->id,
                'order_amount_eur' => $orderAmountEur,
                'requested_amount' => $rounded,
                'gross_subtotal_cents' => $order->grossSubtotalCents(),
                'payable_total_cents' => $order->payableTotalCents(),
            ]);

            return ['error' => "L'importo non corrisponde al totale dell'ordine.", 'status' => 422];
        }

        if (! $order->isAwaitingPayment()) {
            return ['error' => 'Questo ordine non è in attesa di pagamento.', 'status' => 422];
        }

        return ['order' => $order];
    }

    /**
     * Persistenza idempotente del movimento credit post top-up Stripe.
     * NON tocca Stripe: la chiamata API è già avvenuta nel controller.
     *
     * @param  array{amount: float|string}  $data
     * @param  array{payment_intent_id: string, status?: string}  $paymentIntent
     * @return array{movement: WalletMovement, created: bool, new_balance: float}
     */
    public function persistTopUpMovement(User $user, array $data, array $paymentIntent, string $idempotencyKey): array
    {
        return DB::transaction(function () use ($user, $data, $paymentIntent, $idempotencyKey) {
            $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            $existingMovement = WalletMovement::query()
                ->where('user_id', $lockedUser->id)
                ->where('idempotency_key', $idempotencyKey)
                ->lockForUpdate()
                ->first();

            if ($existingMovement) {
                return [
                    'movement' => $existingMovement,
                    'created' => false,
                    'new_balance' => $lockedUser->walletBalance(),
                ];
            }

            $movement = WalletMovement::create([
                'user_id' => $lockedUser->id,
                'type' => 'credit',
                'amount' => $data['amount'],
                'currency' => 'EUR',
                'status' => 'confirmed',
                'idempotency_key' => $idempotencyKey,
                'description' => 'Ricarica portafoglio via carta',
                'source' => 'stripe',
                'reference' => $paymentIntent['payment_intent_id'],
            ]);

            return [
                'movement' => $movement,
                'created' => true,
                'new_balance' => $lockedUser->walletBalance(),
            ];
        });
    }

    /**
     * Recupera movimento già esistente per idempotency key (used in QueryException recovery).
     */
    public function findExistingMovement(int $userId, string $idempotencyKey): ?WalletMovement
    {
        return WalletMovement::query()
            ->where('user_id', $userId)
            ->where('idempotency_key', $idempotencyKey)
            ->first();
    }
}
