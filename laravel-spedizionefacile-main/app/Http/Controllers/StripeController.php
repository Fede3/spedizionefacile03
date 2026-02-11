<?php

namespace App\Http\Controllers;

use Stripe\Stripe;
use App\Models\User;
use Stripe\Customer;
use App\Models\Order;
use App\Models\Coupon;
use App\Models\Package;
use Stripe\SetupIntent;
use Stripe\StripeClient;
use Stripe\PaymentIntent;
use Stripe\PaymentMethod;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StripeController extends Controller
{
    public function createOrder(Request $request) {
        $request->validate([
            'subtotal' => 'required|numeric',
        ]);

        $order = Order::create([
            'user_id' => auth()->id(),
            'subtotal' => $request->subtotal,
            'status' => Order::PENDING,
        ]);

        $packages = Package::where('user_id', auth()->id())->get();

        foreach ($packages as $package) {
            DB::table('package_order')->insert([
                'order_id' => $order->id,
                'package_id' => $package->id,
                'quantity' => $package->quantity ?? 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json([
            'order_id' => $order->id
        ]);
    }

    public function createPayment(Request $request) {
        $request->validate([
            'order_id' => 'required|integer',
            'currency' => 'required|string',
            'payment_method_id' => 'required|string',
            'customer_id' => 'required|string',
        ]);

        $order = Order::findOrFail($request->order_id);

        $stripe = new StripeClient(config('services.stripe.secret'));

        $paymentIntent = $stripe->paymentIntents->create([
            'amount' => $order->subtotal->amount(), // centesimi
            'currency' => $request->currency,
            'customer' => $request->customer_id,
            'payment_method' => $request->payment_method_id,
            'confirm' => true,   // conferma subito perché è off-session
            'off_session' => true,
            'metadata' => ['order_id' => $order->id],
        ]);

        return response()->json([
            'payment_intent_id' => $paymentIntent->id,
            'status' => $paymentIntent->status,
        ]);
    }

    public function orderPaid(Request $request) {
        $stripe = new StripeClient(config('services.stripe.secret'));

        $intent = $stripe->paymentIntents->retrieve($request->ext_id);

        $order = Order::findOrFail($request->order_id);

        $type = $intent->payment_method
            ? $stripe->paymentMethods->retrieve($intent->payment_method)->type
            : $intent->payment_method_types[0] ?? 'unknown';

        $order->status = $intent->status === 'succeeded'
            ? Order::COMPLETED
            : Order::PAYMENT_FAILED;

        $order->save();

        Transaction::create([
            'order_id' => $request->order_id,
            'ext_id' => $intent->id,
            'type' => $type,
            'status' => $intent->status,
            'total' => $intent->amount,
        ]);

        if ($intent->status !== 'succeeded') {
            return response()->json(['success' => false], 402);
        }

        DB::table('cart_user')
            ->where('user_id', auth()->id())
            ->delete();

        return response()->json(['success' => true]);
    }


    public function createOrGetCustomer(User $user) {
        $stripe = new StripeClient(config('services.stripe.secret'));

        // Se l'utente non ha un customer Stripe, crealo
        if (!$user->customer_id) {
            $customer = $stripe->customers->create([
                'email' => $user->email,
                'name'  => $user->name . ' ' . $user->surname,
            ]);

            $user->customer_id = $customer->id;
            $user->save();
        }

        return $user->customer_id;
    }


    public function createSetupIntent(Request $request) {
        if (!config('services.stripe.secret')) {
            return response()->json(['error' => 'Stripe non configurato'], 503);
        }

        $stripe = new StripeClient(config('services.stripe.secret'));

        $customerId = $this->createOrGetCustomer($request->user());

        $intent = $stripe->setupIntents->create([
            'customer' => $customerId,
            'payment_method_types' => [
                'card', 
                'sepa_debit',
                'paypal'],
        ]);

        return response()->json([
            'client_secret' => $intent->client_secret
        ]);
    }


    public function listPaymentMethods(Request $request) {
        $user = $request->user();

        if (!$user->customer_id || !config('services.stripe.secret')) {
            return response()->json(['data' => [], 'default' => null]);
        }

        $stripe = new StripeClient(config('services.stripe.secret'));

        // recupera tutti i metodi di pagamento (solo card)
        $pmList = $stripe->paymentMethods->all([
            'customer' => $user->customer_id,
            'type' => 'card',
        ]);

        // recupera il default payment method del customer
        $customer = $stripe->customers->retrieve($user->customer_id);
        $defaultPm = $customer->invoice_settings->default_payment_method ?? null;

        // formatta i dati per il frontend
        $cards = array_map(function ($pm) use ($defaultPm) {
            return [
                'id' => $pm->id,
                'holder_name' => $pm->billing_details->name,
                'brand' => $pm->card->brand,
                'last4' => $pm->card->last4,
                'exp_month' => $pm->card->exp_month,
                'exp_year' => $pm->card->exp_year,
                'default' => $pm->id === $defaultPm,
            ];
        }, $pmList->data);

        // Filtro per default = true
        usort($cards, fn($a, $b) => $b['default'] <=> $a['default']);

        return response()->json([
            'data' => $cards,
            'default' => $defaultPm,
        ]);
    }


    public function setDefaultPaymentMethod(Request $request) {
        $request->validate([
            'payment_method' => 'required|string'
        ]);

        $user = $request->user();

        if (!$user->customer_id) {
            return response()->json(['error' => 'No Stripe customer'], 400);
        }

        $stripe = new StripeClient(config('services.stripe.secret'));

        $paymentMethodId = $request->payment_method;

        try {
            // ✅ Collega la carta al customer (solo se non è già collegata)
            $stripe->paymentMethods->attach($paymentMethodId, [
                'customer' => $user->customer_id
            ]);

            // ✅ Imposta la carta come predefinita
            $stripe->customers->update($user->customer_id, [
                'invoice_settings' => [
                    'default_payment_method' => $paymentMethodId
                ]
            ]);

            return response()->json([
                'success' => true,
                'default' => $paymentMethodId
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }


    public function changeDefaultPaymentMethod(Request $request) {
        $request->validate([
            'payment_method_id' => 'required|string'
        ]);

        $user = $request->user();

        if (!$user->customer_id) {
            return response()->json(['error' => 'No Stripe customer'], 400);
        }

        // ✅ Inizializza StripeClient
        $stripe = new StripeClient(config('services.stripe.secret'));

        try {
            // ✅ Aggiorna il customer impostando il metodo di pagamento predefinito
            $customer = $stripe->customers->update($user->customer_id, [
                'invoice_settings' => [
                    'default_payment_method' => $request->payment_method_id,
                ],
            ]);

            return response()->json([
                'success' => true,
                'default' => $customer->invoice_settings->default_payment_method
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function deleteCard(Request $request) {

        $request->validate(['payment_method_id' => 'required|string']);

        $stripe = new StripeClient(config('services.stripe.secret'));

        try {
            $stripe->paymentMethods->detach($request->payment_method_id);

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function getDefaultPaymentMethod(Request $request) {
        $user = $request->user();

        if (!$user->customer_id || !config('services.stripe.secret')) {
            return response()->json(['card' => null]);
        }

        $stripe = new StripeClient(config('services.stripe.secret'));

        // recupera customer (per il default)
        $customer = $stripe->customers->retrieve($user->customer_id);
        $defaultPm = $customer->invoice_settings->default_payment_method ?? null;

        if (!$defaultPm) {
            return response()->json(['card' => null]);
        }

        // recupera il metodo di pagamento predefinito
        $pm = $stripe->paymentMethods->retrieve($defaultPm);

        $card = [
            'id' => $pm->id,
            'holder_name' => $pm->billing_details->name,
            'brand' => $pm->card->brand,
            'last4' => $pm->card->last4,
            'exp_month' => $pm->card->exp_month,
            'exp_year' => $pm->card->exp_year,
            'default' => true,
        ];

        return response()->json(['card' => $card]);
    }


}
