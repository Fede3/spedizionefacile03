<?php

/**
 * FILE: StripeController.php
 * SCOPO: Layer HTTP sottile per pagamenti Stripe, creazione ordini e gestione carte.
 *   La logica di business e' delegata a StripePaymentService.
 *
 * DOVE SI USA: Checkout, gestione carte, conferma pagamento, pannello ordini
 *
 * COLLEGAMENTI:
 *   - app/Services/StripePaymentService.php -- logica pagamenti Stripe
 *   - app/Services/StripeConfigService.php -- configurazione chiavi
 *   - app/Events/OrderPaid.php -- evento lanciato dopo pagamento riuscito
 */

namespace App\Http\Controllers;

use App\Events\OrderPaid;
use App\Models\Order;
use App\Models\Package;
use App\Models\Transaction;
use App\Services\ShipmentServicePricingService;
use App\Services\StripePaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StripeController extends Controller
{
    public function __construct(
        private readonly StripePaymentService $stripe,
    ) {}

    // ── Order ownership check ────────────────────────────────────

    private function ensureOrderOwnership(Order $order, ?int $userId = null)
    {
        $ownerId = $userId ?? auth()->id();

        if ((int) $order->user_id === (int) $ownerId) {
            return null;
        }

        return response()->json(['error' => 'Non autorizzato.'], 403);
    }

    // ── Non-Stripe payments (wallet, bonifico) ───────────────────

    public function markOrderCompleted(Request $request)
    {
        $request->validate([
            'order_id' => 'required|integer',
            'payment_type' => 'required|string|in:wallet,bonifico',
            'ext_id' => 'nullable|string',
            'is_existing_order' => 'nullable|boolean',
        ]);

        $order = Order::findOrFail($request->order_id);

        if ($unauthorized = $this->ensureOrderOwnership($order)) {
            return $unauthorized;
        }

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

        if ($request->payment_type !== 'bonifico' && ! $request->boolean('is_existing_order')) {
            DB::table('cart_user')->where('user_id', auth()->id())->delete();
        }

        return response()->json(['success' => true]);
    }

    // ── Order creation from cart ─────────────────────────────────

    public function createOrder(Request $request)
    {
        $request->validate([
            'subtotal' => 'nullable|numeric',
            'package_ids' => 'nullable|array',
            'package_ids.*' => 'integer',
            'billing_data' => 'nullable|array',
        ]);

        $userId = auth()->id();

        if ($request->has('package_ids') && ! empty($request->package_ids)) {
            $packages = Package::with(['originAddress', 'destinationAddress', 'service'])
                ->where('user_id', $userId)
                ->whereIn('id', $request->package_ids)
                ->get();
        } else {
            $cartPackageIds = DB::table('cart_user')
                ->where('user_id', $userId)
                ->pluck('package_id');

            $packages = Package::with(['originAddress', 'destinationAddress', 'service'])
                ->whereIn('id', $cartPackageIds)
                ->get();
        }

        if ($packages->isEmpty()) {
            return response()->json(['error' => 'Nessun pacco trovato.'], 422);
        }

        $groups = $this->groupPackagesByAddress($packages);
        $billingData = $request->input('billing_data');

        $orders = DB::transaction(function () use ($groups, $userId, $billingData) {
            $servicePricing = app(ShipmentServicePricingService::class);
            $orders = [];

            foreach ($groups as $group) {
                $groupPackages = $group['packages'];
                $groupService = $groupPackages->first()?->service;
                $serviceType = $groupService->service_type ?? '';
                $serviceData = $groupService->service_data ?? [];
                $smsEmailNotification = (bool) ($serviceData['sms_email_notification'] ?? false);

                $subtotal = $groupPackages->sum(fn ($pkg) => (int) $pkg->single_price);
                $subtotal += $servicePricing->calculateSurchargeCents($serviceType, $serviceData, $smsEmailNotification, [
                    'packages' => $groupPackages->all(),
                    'origin_address' => $groupPackages->first()?->originAddress?->toArray() ?? [],
                    'destination_address' => (($serviceData['delivery_mode'] ?? 'home') === 'pudo' && ! empty($serviceData['pudo']))
                        ? $serviceData['pudo']
                        : ($groupPackages->first()?->destinationAddress?->toArray() ?? []),
                    'delivery_mode' => $serviceData['delivery_mode'] ?? 'home',
                    'selected_pudo' => $serviceData['pudo'] ?? null,
                    'requires_manual_quote' => (bool) ($serviceData['requires_manual_quote'] ?? false),
                ]);

                $isCod = in_array('contrassegno', $servicePricing->normalizeSelectedServices($serviceType), true);
                $codAmount = $isCod ? $servicePricing->extractContrassegnoAmount($serviceData) : null;

                $pudoId = null;
                foreach ($groupPackages as $pkg) {
                    $sd = $pkg->service->service_data ?? [];
                    if (! empty($sd['pudo']['pudo_id']) && ($sd['delivery_mode'] ?? '') === 'pudo') {
                        $pudoId = $sd['pudo']['pudo_id'];
                        break;
                    }
                }

                $order = Order::create([
                    'user_id' => $userId,
                    'subtotal' => $subtotal,
                    'status' => Order::PENDING,
                    'is_cod' => $isCod,
                    'cod_amount' => $codAmount > 0 ? $codAmount : null,
                    'brt_pudo_id' => $pudoId,
                    'billing_data' => $billingData,
                ]);

                foreach ($groupPackages as $package) {
                    Order::attachPackage($order->id, $package->id, $package->quantity ?? 1);
                }

                $orders[] = $order;
            }

            return $orders;
        });

        if (count($orders) === 1) {
            return response()->json(['order_id' => $orders[0]->id]);
        }

        return response()->json([
            'order_id' => $orders[0]->id,
            'order_ids' => array_map(fn ($o) => $o->id, $orders),
            'merged_count' => count($orders),
        ]);
    }

    private function groupPackagesByAddress($packages): array
    {
        $servicePricing = app(ShipmentServicePricingService::class);
        $groups = [];

        foreach ($packages as $package) {
            $serviceType = $package->service->service_type ?? 'Nessuno';
            $serviceData = $package->service->service_data ?? [];
            $smsEmailNotification = (bool) ($serviceData['sms_email_notification'] ?? false);
            $serviceSignature = $servicePricing->buildSelectionSignature($serviceType, $serviceData, $smsEmailNotification);
            $key = $this->buildAddressKey($package->originAddress, $package->destinationAddress, $serviceType, $serviceSignature);

            if (! isset($groups[$key])) {
                $groups[$key] = ['key' => $key, 'packages' => collect()];
            }

            $groups[$key]['packages']->push($package);
        }

        return array_values($groups);
    }

    private function buildAddressKey($origin, $destination, string $serviceType = 'Nessuno', ?string $serviceSignature = null): string
    {
        $normalize = fn ($value) => mb_strtolower(trim($value ?? ''), 'UTF-8');

        $originParts = $origin ? implode('|', [
            $normalize($origin->name), $normalize($origin->address), $normalize($origin->address_number),
            $normalize($origin->city), $normalize($origin->postal_code), $normalize($origin->province),
        ]) : 'no-origin';

        $destParts = $destination ? implode('|', [
            $normalize($destination->name), $normalize($destination->address), $normalize($destination->address_number),
            $normalize($destination->city), $normalize($destination->postal_code), $normalize($destination->province),
        ]) : 'no-dest';

        return md5($originParts . '::' . $destParts . '::' . $normalize($serviceType) . '::' . ($serviceSignature ?? ''));
    }

    // ── Stripe payment operations (delegated) ────────────────────

    public function createPayment(Request $request)
    {
        $request->validate([
            'order_id' => 'required|integer',
            'currency' => 'required|string',
            'payment_method_id' => 'required|string',
            'customer_id' => 'required|string',
        ]);

        $order = Order::findOrFail($request->order_id);

        if ($unauthorized = $this->ensureOrderOwnership($order)) {
            return $unauthorized;
        }

        $result = $this->stripe->createOffSessionPayment(
            $order,
            $request->currency,
            $request->payment_method_id,
            $request->customer_id,
        );

        return response()->json($result);
    }

    public function createPaymentIntent(Request $request)
    {
        $request->validate(['order_id' => 'required|integer']);

        $order = Order::findOrFail($request->order_id);
        $user = $request->user();

        if ($unauthorized = $this->ensureOrderOwnership($order, $user?->id)) {
            return $unauthorized;
        }

        if (! $this->stripe->isConfigured()) {
            return response()->json(['error' => 'Stripe non configurato.'], 503);
        }

        $amount = (int) $order->subtotal->amount();
        if ($amount < 50) {
            return response()->json(['error' => 'Importo troppo basso per il pagamento.'], 422);
        }

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

        if ($unauthorized = $this->ensureOrderOwnership($order)) {
            return $unauthorized;
        }

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
            'order_id' => $request->order_id,
            'ext_id' => $intent->id,
            'type' => $result['payment_type'],
            'status' => $intent->status,
            'total' => $intent->amount,
        ]);

        if ($intent->status !== 'succeeded') {
            return response()->json(['success' => false], 402);
        }

        event(new OrderPaid($order, $transaction));

        if (! $request->boolean('is_existing_order')) {
            DB::table('cart_user')->where('user_id', auth()->id())->delete();
        }

        return response()->json(['success' => true]);
    }

    // ── Customer ─────────────────────────────────────────────────

    public function createOrGetCustomer($user)
    {
        return $this->stripe->createOrGetCustomer($user);
    }

    // ── Card management (delegated) ──────────────────────────────

    public function createSetupIntent(Request $request)
    {
        if (! $this->stripe->isConfigured()) {
            return response()->json(['error' => 'Stripe non configurato. Vai nelle impostazioni per inserire le chiavi API.'], 503);
        }

        try {
            return response()->json($this->stripe->createSetupIntent($request->user()));
        } catch (\Exception $e) {
            Log::error('SetupIntent creation error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Errore durante la configurazione del metodo di pagamento. Riprova.'], 500);
        }
    }

    public function listPaymentMethods(Request $request)
    {
        $user = $request->user();

        if (! $user->customer_id || ! $this->stripe->isConfigured()) {
            return response()->json(['data' => [], 'default' => null]);
        }

        return response()->json($this->stripe->listPaymentMethods($user));
    }

    public function setDefaultPaymentMethod(Request $request)
    {
        $request->validate(['payment_method' => 'required|string']);
        $user = $request->user();

        if (! $user->customer_id) {
            return response()->json(['error' => 'No Stripe customer'], 400);
        }

        try {
            return response()->json($this->stripe->setDefaultPaymentMethod($user, $request->payment_method));
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function changeDefaultPaymentMethod(Request $request)
    {
        $request->validate(['payment_method_id' => 'required|string']);
        $user = $request->user();

        if (! $user->customer_id) {
            return response()->json(['error' => 'No Stripe customer'], 400);
        }

        try {
            return response()->json($this->stripe->changeDefaultPaymentMethod($user, $request->payment_method_id));
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function deleteCard(Request $request)
    {
        $request->validate(['payment_method_id' => 'required|string']);
        $user = $request->user();

        if (! $user->customer_id) {
            return response()->json(['error' => 'Nessun profilo Stripe associato.'], 400);
        }

        try {
            $this->stripe->deleteCard($user, $request->payment_method_id);
            return response()->json(['success' => true]);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 403);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function getDefaultPaymentMethod(Request $request)
    {
        $user = $request->user();

        if (! $user->customer_id || ! $this->stripe->isConfigured()) {
            return response()->json(['card' => null]);
        }

        return response()->json(['card' => $this->stripe->getDefaultPaymentMethod($user)]);
    }
}
