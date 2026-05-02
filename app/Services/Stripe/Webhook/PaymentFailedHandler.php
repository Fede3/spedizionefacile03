<?php

namespace App\Services\Stripe\Webhook;

use App\Models\Order;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Handler webhook payment_intent.payment_failed.
 *
 * STRIPE-CRITICAL: la logica di idempotency e' INVARIATA rispetto al controller.
 * Modifica solo la struttura del file, non il flusso transazionale.
 */
class PaymentFailedHandler
{
    use StripeWebhookHelpersTrait;

    public function handle(object $event): bool
    {
        $intent = $event->data->object;
        $orderId = (int) ($intent->metadata->order_id ?? 0);

        if ($orderId <= 0) {
            return true;
        }

        $order = Order::where('id', $orderId)->first();
        if (! $order) {
            return false;
        }

        $existingFailedTransaction = $order->transactions()
            ->where('ext_id', $intent->id)
            ->where('status', 'failed')
            ->exists();

        if ($existingFailedTransaction && $order->rawStatus() === Order::PAYMENT_FAILED) {
            Log::info('Stripe paymentFailed: already recorded for this intent', [
                'order_id' => $order->id,
                'payment_intent_id' => $intent->id,
            ]);

            return true;
        }

        $failureMessage = $intent->last_payment_error->message
            ?? $intent->charges->data[0]->failure_message
            ?? 'Payment failed';

        $failureCode = $intent->last_payment_error->code
            ?? $intent->charges->data[0]->failure_code
            ?? null;

        $handled = false;

        DB::transaction(function () use ($order, $intent, $failureCode, $failureMessage, &$handled) {
            $lockedOrder = Order::query()->lockForUpdate()->find($order->id);

            if (! $lockedOrder) {
                return;
            }

            if ($lockedOrder->isAwaitingPayment() || $lockedOrder->stripe_payment_intent_id === $intent->id) {
                $lockedOrder->status = Order::PAYMENT_FAILED;
                $lockedOrder->payment_method = 'stripe';
                $lockedOrder->stripe_payment_intent_id = $intent->id;
                $lockedOrder->save();
            } else {
                Log::warning('Ignoring Stripe failed intent for non-payable order', [
                    'order_id' => $lockedOrder->id,
                    'payment_intent_id' => $intent->id,
                    'current_payment_intent_id' => $lockedOrder->stripe_payment_intent_id,
                    'status' => $lockedOrder->rawStatus(),
                ]);
            }

            Transaction::updateOrCreate([
                'ext_id' => $intent->id,
            ], [
                'order_id' => $lockedOrder->id,
                'status' => 'failed',
                'total' => $intent->amount,
                'type' => $intent->payment_method_types[0] ?? 'unknown',
                'provider_status' => $intent->status,
                'failure_code' => $failureCode,
                'failure_message' => $failureMessage,
            ]);

            $handled = true;
        });

        return $handled;
    }
}
