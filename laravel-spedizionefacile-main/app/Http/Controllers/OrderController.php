<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Order;
use App\Models\Package;
use App\Models\PackageAddress;
use App\Models\Service;
use App\Events\OrderPaid;
use App\Events\OrderCreated;
use Illuminate\Http\Request;
use App\Utils\CustomResponse;
use App\Events\OrderPaymentFailed;
use App\Http\Middleware\CheckAdmin;
use App\Http\Requests\OrderRequest;
use App\Http\Requests\PackageStoreRequest;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Lang;
use App\Http\Resources\OrderResource;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;


class OrderController extends Controller
{
    public function index(Request $request) {

        Gate::authorize('viewAny', Order::class);

        $user = $request->user();

        // Auto-cleanup: remove orders with zero packages (orphaned orders)
        if ($user->isAdmin()) {
            $this->cleanupAllEmptyOrders();
        } else {
            $this->cleanupEmptyOrders($user);
        }

        if ($user->isAdmin()) {
            $orders = Order::with([
                'user',
                'packages.originAddress',
                'packages.destinationAddress',
                'packages.service',
                'transactions',
            ])->get();
        } else {
            $orders = Order::with([
                'packages.originAddress',
                'packages.destinationAddress',
                'packages.service',
                'transactions',
            ])->where('user_id', $user->id)->orderByDesc('created_at')->get();
        }

        return OrderResource::collection($orders);


        /* event(new OrderCreated($order));

        event(new OrderPaid($order, $result->transaction));

        event(new OrderPaymentFailed($order)); */
    }

    public function show(Order $order) {

        Gate::authorize('view', $order);

        $order->load([
            'packages.originAddress',
            'packages.destinationAddress',
            'packages.service',
            'transactions',
        ]);

        return new OrderResource($order);
    }

    /**
     * Create a direct order from riepilogo data (without touching the cart).
     * Saves packages + addresses + services + order in one transaction.
     */
    public function createDirectOrder(PackageStoreRequest $request) {
        $data = $request->validated();
        $userId = auth()->id();

        $result = DB::transaction(function () use ($data, $userId) {
            // Create addresses
            $origin = PackageAddress::create($data['origin_address']);
            $destination = PackageAddress::create($data['destination_address']);

            // Create service
            $servicesData = $data['services'];
            $servicesData['service_type'] = !empty($servicesData['service_type']) ? $servicesData['service_type'] : 'Nessuno';
            $servicesData['date'] = $servicesData['date'] ?? '';
            $servicesData['time'] = $servicesData['time'] ?? '';
            $service = Service::create($servicesData);

            $subtotalCents = 0;
            $packages = [];

            foreach ($data['packages'] as $packageData) {
                // Recalculate price server-side to prevent manipulation
                $weight = (float) preg_replace('/[^0-9.]/', '', $packageData['weight']);
                $s1 = (float) preg_replace('/[^0-9.]/', '', $packageData['first_size']);
                $s2 = (float) preg_replace('/[^0-9.]/', '', $packageData['second_size']);
                $s3 = (float) preg_replace('/[^0-9.]/', '', $packageData['third_size']);

                if ($weight > 0 && $weight < 2) $weightPrice = 9;
                elseif ($weight >= 2 && $weight < 5) $weightPrice = 12;
                elseif ($weight >= 5 && $weight < 10) $weightPrice = 18;
                else $weightPrice = 20;

                $vol = ($s1 / 100) * ($s2 / 100) * ($s3 / 100);
                if ($vol > 0 && $vol < 0.008) $volumePrice = 9;
                elseif ($vol >= 0.008 && $vol < 0.02) $volumePrice = 12;
                elseif ($vol >= 0.02 && $vol < 0.04) $volumePrice = 18;
                else $volumePrice = 20;

                $basePrice = max($weightPrice, $volumePrice);
                $quantity = (int) ($packageData['quantity'] ?? 1);
                $singlePriceEur = round($basePrice * $quantity, 2);
                $singlePriceCents = (int) round($singlePriceEur * 100);
                $subtotalCents += $singlePriceCents;

                $packages[] = Package::create([
                    'package_type' => $packageData['package_type'],
                    'quantity' => $quantity,
                    'weight' => $packageData['weight'],
                    'first_size' => $packageData['first_size'],
                    'second_size' => $packageData['second_size'],
                    'third_size' => $packageData['third_size'],
                    'weight_price' => $weightPrice,
                    'volume_price' => $volumePrice,
                    'single_price' => $singlePriceCents,
                    'origin_address_id' => $origin->id,
                    'destination_address_id' => $destination->id,
                    'service_id' => $service->id,
                    'user_id' => $userId,
                ]);
            }

            // Create the order
            $order = Order::create([
                'user_id' => $userId,
                'subtotal' => $subtotalCents,
                'status' => Order::PENDING,
            ]);

            // Link packages to order
            foreach ($packages as $package) {
                DB::table('package_order')->insert([
                    'order_id' => $order->id,
                    'package_id' => $package->id,
                    'quantity' => $package->quantity ?? 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $order;
        });

        return response()->json([
            'order_id' => $result->id,
            'order_number' => 'SF-' . str_pad($result->id, 6, '0', STR_PAD_LEFT),
        ]);
    }

    /**
     * Cancel a pending/failed order.
     */
    public function cancel(Request $request, Order $order) {
        if ($order->user_id !== auth()->id()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        $status = $order->getRawOriginal('status') ?? $order->getAttributes()['status'] ?? $order->status;
        // Allow cancellation only for pending or payment_failed orders
        if (!in_array($status, [Order::PENDING, Order::PAYMENT_FAILED, 'pending', 'payment_failed'])) {
            return response()->json(['error' => 'Solo gli ordini in attesa o con pagamento fallito possono essere annullati.'], 422);
        }

        $order->status = 'cancelled';
        $order->save();

        return response()->json(['success' => true, 'message' => 'Ordine annullato.']);
    }

    /**
     * Remove orders that have zero packages (orphaned) for a specific user.
     */
    private function cleanupEmptyOrders(User $user) {
        $this->deleteEmptyOrders(
            Order::where('user_id', $user->id)
                ->whereIn('status', [Order::PENDING, Order::PAYMENT_FAILED])
                ->get()
        );
    }

    /**
     * Remove orders with zero packages across ALL accounts (admin).
     */
    private function cleanupAllEmptyOrders() {
        $this->deleteEmptyOrders(
            Order::whereIn('status', [Order::PENDING, Order::PAYMENT_FAILED])->get()
        );
    }

    private function deleteEmptyOrders($orders) {
        foreach ($orders as $order) {
            $packageIds = DB::table('package_order')
                ->where('order_id', $order->id)
                ->pluck('package_id');

            if ($packageIds->isEmpty()) {
                $order->delete();
                continue;
            }

            $validPackages = Package::whereIn('id', $packageIds)
                ->where(function ($q) {
                    $q->whereNotNull('package_type')
                      ->where('package_type', '!=', '')
                      ->where(function ($q2) {
                          $q2->where('weight', '>', 0)
                             ->orWhere('first_size', '>', 0);
                      });
                })
                ->count();

            if ($validPackages === 0) {
                DB::table('package_order')->where('order_id', $order->id)->delete();
                $order->delete();
            }
        }
    }
}
