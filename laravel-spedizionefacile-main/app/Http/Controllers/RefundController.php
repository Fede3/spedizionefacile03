<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Transaction;
use App\Services\BrtService;
use App\Services\RefundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RefundController extends Controller
{
    const CANCELLATION_FEE_CENTS = RefundService::CANCELLATION_FEE_CENTS;

    public function __construct(
        private readonly RefundService $refundService,
    ) {}

    public function checkRefundEligibility(Order $order): JsonResponse
    {
        if ($order->user_id !== auth()->id() && !auth()->user()->isAdmin()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }
        return response()->json($this->refundService->calculateEligibility($order));
    }

    public function requestCancellation(Request $request, Order $order): JsonResponse
    {
        if ($order->user_id !== auth()->id()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        $request->validate(['reason' => 'nullable|string|max:500']);
        $eligibility = $this->refundService->calculateEligibility($order);

        if (!$eligibility['eligible']) {
            return response()->json(['error' => $eligibility['reason']], 422);
        }

        try {
            $result = DB::transaction(function () use ($order, $request, $eligibility) {
                $brtCancelled = $this->cancelBrtShipment($order);

                $refundAmountCents = $eligibility['refund_amount_cents'];
                $commissionCents = $eligibility['commission_cents'];
                $refundMethod = 'wallet';

                if ($refundAmountCents > 0) {
                    $refundMethod = $this->processRefund($order, $refundAmountCents);

                    Transaction::create([
                        'order_id' => $order->id,
                        'ext_id' => 'refund_' . $order->id . '_' . now()->timestamp,
                        'type' => 'refund_' . $refundMethod,
                        'status' => 'succeeded',
                        'total' => -$refundAmountCents,
                    ]);
                }

                $order->status = $refundAmountCents > 0 ? Order::REFUNDED : Order::CANCELLED;
                $order->refund_status = $refundAmountCents > 0 ? 'completed' : 'none';
                $order->refund_amount = $refundAmountCents;
                $order->refund_method = $refundMethod;
                $order->refund_reason = $request->reason ?? 'Annullamento richiesto dall\'utente';
                $order->refunded_at = $refundAmountCents > 0 ? now() : null;
                $order->cancellation_fee = $commissionCents;
                $order->save();

                Log::info('Order cancelled and refunded', [
                    'order_id' => $order->id, 'refund_amount_cents' => $refundAmountCents,
                    'commission_cents' => $commissionCents, 'refund_method' => $refundMethod,
                    'brt_cancelled' => $brtCancelled,
                ]);

                return [
                    'refund_amount_cents' => $refundAmountCents, 'commission_cents' => $commissionCents,
                    'refund_method' => $refundMethod, 'brt_cancelled' => $brtCancelled,
                ];
            });

            $refundEur = number_format($result['refund_amount_cents'] / 100, 2, ',', '.');
            $commissionEur = number_format($result['commission_cents'] / 100, 2, ',', '.');

            return response()->json([
                'success' => true,
                'message' => $result['refund_amount_cents'] > 0
                    ? "Ordine annullato. Rimborso di {$refundEur} EUR processato (commissione: {$commissionEur} EUR)."
                    : 'Ordine annullato con successo.',
                'refund_amount' => $refundEur, 'commission' => $commissionEur,
                'refund_method' => $result['refund_method'], 'brt_cancelled' => $result['brt_cancelled'],
            ]);
        } catch (\Exception $e) {
            Log::error('Order cancellation failed', ['order_id' => $order->id, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Errore durante l\'annullamento dell\'ordine. Riprova o contatta l\'assistenza.'], 500);
        }
    }

    private function cancelBrtShipment(Order $order): bool
    {
        if (!$order->brt_numeric_sender_reference) return false;

        try {
            $brtService = new BrtService;
            $brtResult = $brtService->deleteShipment((int) $order->brt_numeric_sender_reference);
            $success = $brtResult['success'] ?? false;

            if (!$success) {
                Log::warning('BRT deleteShipment failed during cancellation', [
                    'order_id' => $order->id, 'brt_reference' => $order->brt_numeric_sender_reference,
                    'brt_error' => $brtResult['error'] ?? 'Errore sconosciuto',
                ]);
            }
            return $success;
        } catch (\Exception $e) {
            Log::error('BRT deleteShipment exception during cancellation', ['order_id' => $order->id, 'error' => $e->getMessage()]);
            return false;
        }
    }

    private function processRefund(Order $order, int $refundAmountCents): string
    {
        if ($order->payment_method === 'stripe' && $order->stripe_payment_intent_id) {
            $this->refundService->processStripeRefund($order, $refundAmountCents);
            return 'stripe';
        }

        $this->refundService->processWalletRefund($order, $refundAmountCents);
        return 'wallet';
    }
}
