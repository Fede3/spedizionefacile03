<?php

namespace App\Http\Controllers;

use Stripe\Stripe;
use App\Models\User;
use Stripe\Customer;
use App\Models\Order;
use App\Models\Coupon;
use App\Models\Package;
use App\Models\Setting;
use Stripe\SetupIntent;
use Stripe\StripeClient;
use Stripe\PaymentIntent;
use Stripe\PaymentMethod;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StripeController extends Controller
{
    /**
     * Legge la secret key da settings (DB) con fallback su config (.env)
     */
    private function getStripeSecret(): ?string
    {
        return Setting::get('stripe_secret', config('services.stripe.secret'));
    }

    /**
     * Mark an order as completed (for wallet/bonifico payments that bypass Stripe).
     */
    public function markOrderCompleted(Request $request) {
        $request->validate([
            'order_id' => 'required|integer',
            'payment_type' => 'required|string|in:wallet,bonifico',
            'ext_id' => 'nullable|string',
            'is_existing_order' => 'nullable|boolean',
        ]);

        $order = Order::findOrFail($request->order_id);

        if ($order->user_id !== auth()->id()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        $order->status = $request->payment_type === 'bonifico' ? Order::PENDING : Order::COMPLETED;
        $order->save();

        Transaction::create([
            'order_id' => $order->id,
            'ext_id' => $request->ext_id ?? ($request->payment_type . '_' . now()->timestamp),
            'type' => $request->payment_type,
            'status' => $request->payment_type === 'bonifico' ? 'pending' : 'succeeded',
            'total' => $order->subtotal->amount(),
        ]);

        // Only clear cart when paying from cart flow, not when paying an existing order
        if ($request->payment_type !== 'bonifico' && !$request->boolean('is_existing_order')) {
            DB::table('cart_user')
                ->where('user_id', auth()->id())
                ->delete();
        }

        return response()->json(['success' => true]);
    }

    public function createOrder(Request $request) {
        $request->validate([
            'subtotal' => 'nullable|numeric',
            'package_ids' => 'nullable|array',
            'package_ids.*' => 'integer',
        ]);

        $userId = auth()->id();

        // If specific package_ids provided, create order for those only (single shipment "Paga ora")
        if ($request->has('package_ids') && !empty($request->package_ids)) {
            $packages = Package::where('user_id', $userId)
                ->whereIn('id', $request->package_ids)
                ->get();
        } else {
            // Default: get packages from cart
            $cartPackageIds = DB::table('cart_user')
                ->where('user_id', $userId)
                ->pluck('package_id');

            $packages = Package::whereIn('id', $cartPackageIds)->get();
        }

        // Calculate subtotal server-side from package prices (never trust client)
        $subtotal = $packages->sum(function ($pkg) {
            return (int) $pkg->single_price;
        });

        $order = Order::create([
            'user_id' => $userId,
            'subtotal' => $subtotal,
            'status' => Order::PENDING,
        ]);

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

        if ($order->user_id !== auth()->id()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        $stripe = new StripeClient($this->getStripeSecret());

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

    public function createPaymentIntent(Request $request) {
        $request->validate([
            'order_id' => 'required|integer',
        ]);

        $order = Order::findOrFail($request->order_id);
        $user = $request->user();

        if ($order->user_id !== $user->id) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        $secret = $this->getStripeSecret();
        if (!$secret) {
            return response()->json(['error' => 'Stripe non configurato.'], 503);
        }

        $stripe = new StripeClient($secret);
        $customerId = $this->createOrGetCustomer($user);

        $amount = (int) $order->subtotal->amount();
        if ($amount < 50) {
            return response()->json(['error' => 'Importo troppo basso per il pagamento.'], 422);
        }

        try {
            $paymentIntent = $stripe->paymentIntents->create([
                'amount' => $amount,
                'currency' => 'eur',
                'customer' => $customerId,
                'metadata' => ['order_id' => $order->id],
                'automatic_payment_methods' => ['enabled' => true],
            ]);

            return response()->json([
                'client_secret' => $paymentIntent->client_secret,
                'payment_intent_id' => $paymentIntent->id,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function orderPaid(Request $request) {
        $stripe = new StripeClient($this->getStripeSecret());

        $intent = $stripe->paymentIntents->retrieve($request->ext_id);

        $order = Order::findOrFail($request->order_id);

        if ($order->user_id !== auth()->id()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        // Verify the payment intent matches this order
        if (isset($intent->metadata['order_id']) && (int) $intent->metadata['order_id'] !== $order->id) {
            return response()->json(['error' => 'Payment intent non corrisponde all\'ordine.'], 422);
        }

        // Verify amount matches
        if ((int) $intent->amount !== (int) $order->subtotal->amount()) {
            return response()->json(['error' => 'Importo non corrisponde.'], 422);
        }

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

        // Only clear cart when paying from cart flow, not when paying an existing order
        if (!$request->boolean('is_existing_order')) {
            DB::table('cart_user')
                ->where('user_id', auth()->id())
                ->delete();
        }

        return response()->json(['success' => true]);
    }


    public function createOrGetCustomer(User $user) {
        $stripe = new StripeClient($this->getStripeSecret());

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
        $secret = $this->getStripeSecret();

        if (!$secret) {
            return response()->json(['error' => 'Stripe non configurato. Vai nelle impostazioni per inserire le chiavi API.'], 503);
        }

        try {
            $stripe = new StripeClient($secret);

            $customerId = $this->createOrGetCustomer($request->user());

            $intent = $stripe->setupIntents->create([
                'customer' => $customerId,
                'payment_method_types' => ['card'],
            ]);

            return response()->json([
                'client_secret' => $intent->client_secret
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }


    public function listPaymentMethods(Request $request) {
        $user = $request->user();
        $secret = $this->getStripeSecret();

        if (!$user->customer_id || !$secret) {
            return response()->json(['data' => [], 'default' => null]);
        }

        $stripe = new StripeClient($secret);

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

        $stripe = new StripeClient($this->getStripeSecret());

        $paymentMethodId = $request->payment_method;

        try {
            // Collega la carta al customer (solo se non è già collegata)
            $stripe->paymentMethods->attach($paymentMethodId, [
                'customer' => $user->customer_id
            ]);

            // Imposta la carta come predefinita
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

        $stripe = new StripeClient($this->getStripeSecret());

        try {
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

        $stripe = new StripeClient($this->getStripeSecret());

        try {
            $stripe->paymentMethods->detach($request->payment_method_id);

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function getDefaultPaymentMethod(Request $request) {
        $user = $request->user();
        $secret = $this->getStripeSecret();

        if (!$user->customer_id || !$secret) {
            return response()->json(['card' => null]);
        }

        $stripe = new StripeClient($secret);

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
