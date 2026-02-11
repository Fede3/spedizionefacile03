<?php

namespace App\Http\Controllers;

use Stripe\Webhook;

use App\Models\User;
use App\Models\Order;
use App\Models\Transaction;
use Illuminate\Http\Request;
use UnexpectedValueException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;


class StripeWebhookController extends Controller
{
    public function handle(Request $request) {
        /* \Log::info('Stripe webhook HIT', [
            'headers' => $request->headers->all(),
            'body' => $request->getContent(),
        ]);

        return response()->json(['ok' => true]); */

        $event = $this->verifySignature($request);

        match ($event->type) {
            'payment_intent.succeeded' => $this->paymentSucceeded($event),
            'payment_intent.payment_failed' => $this->paymentFailed($event),

            'account.updated' => $this->accountUpdated($event),
            'account.application.deauthorized' => $this->accountDisconnected($event),

            default => null,
        };

        return response()->json(['received' => true]);
    }

    protected function verifySignature(Request $request) {
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');
        $secret = config('services.stripe.webhook_secret');

        try {
            return Webhook::constructEvent(
                $payload,
                $sigHeader,
                $secret
            );
        } catch (UnexpectedValueException $e) {
            abort(Response::HTTP_BAD_REQUEST, 'Invalid payload');
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            abort(Response::HTTP_BAD_REQUEST, 'Invalid signature');
        }
    }


    protected function paymentSucceeded($event) {
        $intent = $event->data->object;

        $orderId = $intent->metadata->order_id;

        $order = Order::where('id', $orderId)->first();

        if (!$order) {
            return;
        }

        $order->status = Order::COMPLETED;
        $order->save();

        Transaction::updateOrCreate([
            'ext_id' => $intent->id,
        ], [
            'order_id' => $order->id,
            'status'   => 'succeeded',
            'total'    => $intent->amount,
            'type'     => $intent->payment_method_types[0] ?? 'unknown',
            'provider_status' => $intent->status,
        ]);

        DB::table('cart_user')
            ->where('user_id', $order->user_id)
            ->delete();
    }

    protected function paymentFailed($event) {
        $intent = $event->data->object;

        $orderId = $intent->metadata->order_id;

        $order = Order::where('id', $orderId)->first();

        if (!$order) {
            return;
        }

        $order->status = Order::PAYMENT_FAILED;
        $order->save();

        $failureMessage = $intent->last_payment_error?->message
                  ?? $intent->charges->data[0]->failure_message
                  ?? 'Payment failed';

        $failureCode = $intent->last_payment_error?->code
                  ?? $intent->charges->data[0]->failure_code
                  ?? null;

        Transaction::updateOrCreate([
            'ext_id' => $intent->id,
        ], [
            'order_id' => $order->id,
            'status'   => 'failed',
            'total'    => $intent->amount,
            'type'     => $intent->payment_method_types[0] ?? 'unknown',
            'provider_status' => $intent->status,
            'failure_code'    => $failureCode,
            'failure_message' => $failureMessage
        ]);
    }

    protected function accountUpdated($event) {
        $intent = $event->data->object;

        $stripeAccountId = $intent->id;

        $user = User::where('stripe_account_id', $stripeAccountId)->first();

        if (!$user) {
            return;
        }

        $user->stripe_charges_enabled = $intent->charges_enabled;
        $user->stripe_payouts_enabled = $intent->payouts_enabled;
        $user->stripe_capabilities = json_encode($intent->capabilities);
        $user->stripe_requirements = json_encode($intent->requirements);
        $user->stripe_details_submitted = $intent->details_submitted;

        $user->save();
    }

    protected function accountDisconnected($event)
    {
        $account = $event->data->object;
        $stripeAccountId = $account->id ?? null;

        if (!$stripeAccountId) {
            return;
        }

        $user = User::where('stripe_account_id', $stripeAccountId)->first();

        if (!$user) {
            return;
        }

        $user->stripe_account_id = null;
        $user->stripe_charges_enabled = false;
        $user->stripe_payouts_enabled = false;
        $user->stripe_details_submitted = false;
        $user->stripe_capabilities = null;
        $user->stripe_requirements = null;
        $user->save();

        Log::info('Stripe account disconnected', ['user_id' => $user->id, 'account_id' => $stripeAccountId]);
    }
}
