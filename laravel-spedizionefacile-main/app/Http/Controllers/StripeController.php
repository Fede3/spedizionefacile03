<?php

namespace App\Http\Controllers;

use App\Events\OrderPaid;
use App\Models\Order;
use App\Models\Package;
use App\Models\Transaction;
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
    ) {}

    private function ensureOrderOwnership(Order $order, ?int $userId = null)
    {
        $ownerId = $userId ?? auth()->id();
        if ((int) $order->user_id === (int) $ownerId) return null;
        return response()->json(['error' => 'Non autorizzato.'], 403);
    }

    public function markOrderCompleted(Request $request)
    {
        $request->validate([
            'order_id' => 'required|integer', 'payment_type' => 'required|string|in:wallet,bonifico',
            'ext_id' => 'nullable|string', 'is_existing_order' => 'nullable|boolean',
        ]);

        $order = Order::findOrFail($request->order_id);
        if ($unauthorized = $this->ensureOrderOwnership($order)) return $unauthorized;

        $order->status = $request->payment_type === 'bonifico' ? Order::PENDING : Order::COMPLETED;
        $order->payment_method = $request->payment_type;
        $order->save();

        $transaction = Transaction::create([
            'order_id' => $order->id,
            'ext_id' => $request->ext_id ?? ($request->payment_type . '_' . now()->timestamp),
            'type' => $request->payment_type,
            'status' => $request->payment_type === 'bonifico' ? 'pending' : 'succeeded',
            'total' => $order->subtotal->amount(),
        ]);

        if ($request->payment_type !== 'bonifico') {
            event(new OrderPaid($order, $transaction));
        }
        if ($request->payment_type !== 'bonifico' && !$request->boolean('is_existing_order')) {
            DB::table('cart_user')->where('user_id', auth()->id())->delete();
        }

        return response()->json(['success' => true]);
    }

    public function createOrder(Request $request)
    {
        $request->validate([
            'subtotal' => 'nullable|numeric', 'package_ids' => 'nullable|array',
            'package_ids.*' => 'integer', 'billing_data' => 'nullable|array',
        ]);

        $userId = auth()->id();

        if ($request->has('package_ids') && !empty($request->package_ids)) {
            $packages = Package::with(['originAddress', 'destinationAddress', 'service'])
                ->where('user_id', $userId)->whereIn('id', $request->package_ids)->get();
        } else {
            $cartPackageIds = DB::table('cart_user')->where('user_id', $userId)->pluck('package_id');
            $packages = Package::with(['originAddress', 'destinationAddress', 'service'])->whereIn('id', $cartPackageIds)->get();
        }

        if ($packages->isEmpty()) return response()->json(['error' => 'Nessun pacco trovato.'], 422);

        $orders = $this->orderCreation->createOrdersFromPackages($packages, $userId, $request->input('billing_data'));

        if (count($orders) === 1) return response()->json(['order_id' => $orders[0]->id]);

        return response()->json([
            'order_id' => $orders[0]->id,
            'order_ids' => array_map(fn ($o) => $o->id, $orders),
            'merged_count' => count($orders),
        ]);
    }

    public function createPayment(Request $request)
    {
        $request->validate([
            'order_id' => 'required|integer', 'currency' => 'required|string',
            'payment_method_id' => 'required|string', 'customer_id' => 'required|string',
        ]);
        $order = Order::findOrFail($request->order_id);
        if ($unauthorized = $this->ensureOrderOwnership($order)) return $unauthorized;

        return response()->json($this->stripe->createOffSessionPayment($order, $request->currency, $request->payment_method_id, $request->customer_id));
    }

    public function createPaymentIntent(Request $request)
    {
        $request->validate(['order_id' => 'required|integer']);
        $order = Order::findOrFail($request->order_id);
        $user = $request->user();
        if ($unauthorized = $this->ensureOrderOwnership($order, $user?->id)) return $unauthorized;
        if (!$this->stripe->isConfigured()) return response()->json(['error' => 'Stripe non configurato.'], 503);

        $amount = (int) $order->subtotal->amount();
        if ($amount < 50) return response()->json(['error' => 'Importo troppo basso per il pagamento.'], 422);

        try {
            return response()->json($this->stripe->createPaymentIntent($order, $user));
        } catch (\Exception $e) {
            Log::error('PaymentIntent creation error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Errore durante la creazione del pagamento. Riprova.'], 500);
        }
    }

    public function orderPaid(Request $request)
    {
        $order = Order::findOrFail($request->order_id);
        if ($unauthorized = $this->ensureOrderOwnership($order)) return $unauthorized;

        try {
            $result = $this->stripe->retrieveAndVerifyPayment($request->ext_id, $order);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        $intent = $result['intent'];
        $order->status = $intent->status === 'succeeded' ? Order::COMPLETED : Order::PAYMENT_FAILED;
        $order->payment_method = 'stripe';
        $order->stripe_payment_intent_id = $intent->id;
        $order->save();

        $transaction = Transaction::create([
            'order_id' => $request->order_id, 'ext_id' => $intent->id,
            'type' => $result['payment_type'], 'status' => $intent->status, 'total' => $intent->amount,
        ]);

        if ($intent->status !== 'succeeded') return response()->json(['success' => false], 402);

        event(new OrderPaid($order, $transaction));
        if (!$request->boolean('is_existing_order')) {
            DB::table('cart_user')->where('user_id', auth()->id())->delete();
        }

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
        catch (\Exception $e) { return response()->json(['error' => $e->getMessage()], 400); }
    }

    public function changeDefaultPaymentMethod(Request $request)
    {
        $request->validate(['payment_method_id' => 'required|string']);
        $user = $request->user();
        if (!$user->customer_id) return response()->json(['error' => 'No Stripe customer'], 400);
        try { return response()->json($this->stripe->changeDefaultPaymentMethod($user, $request->payment_method_id)); }
        catch (\Exception $e) { return response()->json(['error' => $e->getMessage()], 400); }
    }

    public function deleteCard(Request $request)
    {
        $request->validate(['payment_method_id' => 'required|string']);
        $user = $request->user();
        if (!$user->customer_id) return response()->json(['error' => 'Nessun profilo Stripe associato.'], 400);
        try {
            $this->stripe->deleteCard($user, $request->payment_method_id);
            return response()->json(['success' => true]);
        } catch (\RuntimeException $e) { return response()->json(['error' => $e->getMessage()], 403); }
        catch (\Exception $e) { return response()->json(['error' => $e->getMessage()], 400); }
    }

    public function getDefaultPaymentMethod(Request $request)
    {
        $user = $request->user();
        if (!$user->customer_id || !$this->stripe->isConfigured()) return response()->json(['card' => null]);
        return response()->json(['card' => $this->stripe->getDefaultPaymentMethod($user)]);
    }
}
