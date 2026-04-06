<?php

/**
 * ReferralRewardController -- Applicazione referral a ordini e guadagni Partner Pro.
 *
 * Estratto da ReferralController: gestisce apply (applicazione codice a ordine) e earnings (statistiche guadagni).
 * Queste funzioni riguardano la parte economica del sistema referral.
 */

namespace App\Http\Controllers;

use App\Events\ReferralApplied;
use App\Models\Order;
use App\Models\ReferralUsage;
use App\Models\User;
use App\Models\WalletMovement;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReferralRewardController extends Controller
{
    /**
     * Applica il codice referral a un ordine specifico.
     * Registra l'utilizzo del codice, calcola lo sconto e accredita la commissione al Partner Pro.
     */
    public function apply(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:8'],
            'order_id' => ['required', 'integer'],
            'order_amount' => ['nullable', 'numeric', 'min:0.01'],
        ]);

        $buyer = auth()->user();

        $proUser = User::where('referral_code', strtoupper($data['code']))
            ->where('role', 'Partner Pro')
            ->first();

        if (! $proUser) {
            return response()->json(['message' => 'Codice referral non valido.'], 404);
        }

        if ($proUser->id === $buyer->id) {
            return response()->json(['message' => 'Non puoi usare il tuo stesso codice.'], 422);
        }

        $order = Order::query()
            ->whereKey((int) $data['order_id'])
            ->where('user_id', $buyer->id)
            ->first();

        if (! $order) {
            return response()->json(['message' => 'Ordine non trovato.'], 404);
        }

        if (! $this->isReferralEligibleOrder($order)) {
            return response()->json(['message' => 'Ordine non ancora pagato.'], 422);
        }

        try {
            $result = DB::transaction(function () use ($buyer, $proUser, $order) {
                $lockedOrder = Order::query()
                    ->whereKey($order->id)
                    ->where('user_id', $buyer->id)
                    ->lockForUpdate()
                    ->first();

                if (! $lockedOrder) {
                    return response()->json(['message' => 'Ordine non trovato.'], 404);
                }

                if (! $this->isReferralEligibleOrder($lockedOrder)) {
                    return response()->json(['message' => 'Ordine non ancora pagato.'], 422);
                }

                $existingUsage = ReferralUsage::query()
                    ->where('order_id', $lockedOrder->id)
                    ->first();

                if ($existingUsage) {
                    return response()->json(['message' => 'Questo ordine ha già un referral applicato.'], 409);
                }

                $orderAmount = round(((int) $lockedOrder->subtotal->amount()) / 100, 2);
                $discountAmount = round($orderAmount * 0.05, 2);
                $commissionAmount = round($orderAmount * 0.05, 2);
                $code = strtoupper($proUser->referral_code);

                $usage = ReferralUsage::create([
                    'buyer_id' => $buyer->id,
                    'pro_user_id' => $proUser->id,
                    'referral_code' => $code,
                    'order_id' => $lockedOrder->id,
                    'order_amount' => $orderAmount,
                    'discount_amount' => $discountAmount,
                    'commission_amount' => $commissionAmount,
                    'status' => 'confirmed',
                ]);

                WalletMovement::create([
                    'user_id' => $proUser->id,
                    'type' => 'credit',
                    'amount' => $commissionAmount,
                    'currency' => 'EUR',
                    'status' => 'confirmed',
                    'idempotency_key' => 'commission_referral_order_' . $lockedOrder->id,
                    'description' => 'Commissione referral da ' . $buyer->name . ' (ordine #' . $lockedOrder->id . ')',
                    'source' => 'commission',
                    'reference' => 'referral_order_' . $lockedOrder->id,
                ]);

                return [
                    'success' => true,
                    'discount_amount' => $discountAmount,
                    'usage' => $usage,
                ];
            });

            if ($result instanceof JsonResponse) {
                return $result;
            }

            event(new ReferralApplied($result['usage']->id));

            return response()->json($result);
        } catch (QueryException $e) {
            if ($this->isReferralUniqueConstraintViolation($e)) {
                return response()->json(['message' => 'Questo ordine ha già un referral applicato.'], 409);
            }

            throw $e;
        }
    }

    /**
     * Mostra i guadagni del Partner Pro: lista di tutti gli utilizzi del suo codice referral.
     */
    public function earnings(): JsonResponse
    {
        $user = auth()->user();

        if (! $user->isPro()) {
            return response()->json(['message' => 'Solo account Pro.'], 403);
        }

        $usages = $user->referralUsagesAsPro()
            ->with('buyer:id,name,email')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $usages,
            'total_earnings' => round($usages->where('status', 'confirmed')->sum('commission_amount'), 2),
            'total_usages' => $usages->count(),
            'commission_balance' => $user->commissionBalance(),
        ]);
    }

    private function isReferralEligibleOrder(Order $order): bool
    {
        return in_array($order->rawStatus(), [
            Order::COMPLETED,
            Order::PROCESSING,
            Order::IN_TRANSIT,
            Order::DELIVERED,
            Order::IN_GIACENZA,
            'payed',
        ], true);
    }

    private function isReferralUniqueConstraintViolation(QueryException $e): bool
    {
        $message = $e->getMessage();

        return str_contains($message, 'referral_usages_order_id_unique')
            || str_contains($message, 'wallet_movements_idempotency_key_unique')
            || str_contains($message, 'Duplicate entry')
            || str_contains($message, 'UNIQUE constraint failed');
    }
}
