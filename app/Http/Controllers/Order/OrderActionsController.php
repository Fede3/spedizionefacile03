<?php

/**
 * OrderActionsController -- Azioni mutative su ordini: cancellazione, aggiunta collo,
 * creazione diretta (senza carrello). Tutte le azioni ricalcolano i prezzi server-side
 * via PriceEngineService per evitare manipolazioni dal frontend.
 */

namespace App\Http\Controllers\Order;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Traits\HandlesOrderSubmissionContext;
use App\Http\Controllers\Traits\NormalizesServiceData;
use App\Http\Requests\AddOrderPackageRequest;
use App\Http\Requests\CancelOrderRequest;
use App\Http\Requests\PackageStoreRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Package;
use App\Services\CartService;
use App\Services\CheckoutSubmissionContextService;
use App\Services\DirectOrderService;
use App\Services\RefundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;

class OrderActionsController extends Controller
{
    use HandlesOrderSubmissionContext;
    use NormalizesServiceData;

    public function __construct(
        private readonly CheckoutSubmissionContextService $submissionContext,
        private readonly DirectOrderService $directOrder,
        private readonly CartService $cartService,
    ) {
    }

    protected function submissionContextService(): CheckoutSubmissionContextService
    {
        return $this->submissionContext;
    }

    /**
     * Crea un ordine direttamente dalla pagina di riepilogo (senza carrello).
     * I prezzi vengono RICALCOLATI lato server per evitare manipolazioni dal frontend.
     */
    public function createDirectOrder(PackageStoreRequest $request)
    {
        $data = $request->validated();
        $userId = auth()->id();
        $servicesData = $this->normalizeServiceData($data['services'] ?? []);
        $servicesData = $this->cartService->applyPudoData($servicesData, $data);
        $serviceData = $servicesData['service_data'] ?? [];

        $pricing = $this->directOrder->pricePackages(
            $data['packages'],
            $data['origin_address']['postal_code'] ?? null,
            $data['destination_address']['postal_code'] ?? null,
        );
        $pricedPackages = $pricing['priced_packages'];
        $subtotalCents = $pricing['subtotal_cents'];

        $cod = $this->directOrder->resolveCodDetails($servicesData, $serviceData);
        $insurance = $this->directOrder->resolveInsuranceDetails($servicesData, $serviceData);
        $serviceSurchargeCents = $this->directOrder->calculateServiceSurcharge(
            $servicesData, $serviceData, $pricedPackages, $data,
        );
        $orderSubtotalCents = $subtotalCents + $serviceSurchargeCents;

        $pudoId = null;
        if (! empty($data['pudo']['pudo_id']) && ($data['delivery_mode'] ?? 'home') === 'pudo') {
            $pudoId = $data['pudo']['pudo_id'];
        }

        return DB::transaction(function () use (
            $data, $userId, $pricedPackages, $servicesData, $cod, $insurance,
            $pudoId, $orderSubtotalCents, $request,
        ) {
            DB::table('users')->where('id', $userId)->lockForUpdate()->first();

            $submissionContext = $this->submissionContext->enrich(
                $this->submissionContext->fromRequestArray($request->validated()),
                $this->submissionContext->snapshotFromDirectOrderPayload([
                    ...$data,
                    'packages' => $pricedPackages,
                    'services' => $servicesData,
                ], $orderSubtotalCents),
                [
                    'user_id' => $userId,
                    'flow' => 'direct-order',
                    'billing_data' => $data['billing_data'] ?? null,
                ],
            );

            $existingOrder = Order::query()
                ->where('user_id', $userId)
                ->where('client_submission_id', $submissionContext['client_submission_id'])
                ->first();

            if ($existingOrder) {
                return $this->respondToExistingOrder($existingOrder, $submissionContext);
            }

            $result = $this->directOrder->persistDirectOrder(
                $data, $userId, $pricedPackages, $servicesData,
                $cod['is_cod'], $cod['cod_amount'], $pudoId,
                $orderSubtotalCents, $submissionContext,
                $cod['cod_payment_type'] ?? null,
                $cod['cod_incasso_type'] ?? null,
                $insurance['insurance_amount_cents'] ?? null,
            );

            return response()->json($result);
        });
    }

    /**
     * Annulla un ordine con eventuale rimborso.
     */
    public function cancel(CancelOrderRequest $request, Order $order)
    {
        Gate::authorize('cancel', $order);

        $refundService = app(RefundService::class);
        $preCheck = $refundService->calculateEligibility($order);
        if (! $preCheck['eligible']) {
            return response()->json(['error' => $preCheck['reason']], 422);
        }

        try {
            $result = $refundService->processCancellation($order, $request->reason);

            $refundEur = number_format($result['refund_amount_cents'] / 100, 2, ',', '.');
            $commissionEur = number_format($result['commission_cents'] / 100, 2, ',', '.');

            return response()->json([
                'success' => true,
                'message' => $result['refund_amount_cents'] > 0
                    ? "Ordine annullato. Rimborso di {$refundEur} EUR processato (commissione: {$commissionEur} EUR)."
                    : 'Ordine annullato con successo.',
                'refund_amount' => $refundEur,
                'commission' => $commissionEur,
                'refund_method' => $result['refund_method'],
                'brt_cancelled' => $result['brt_cancelled'],
            ]);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            Log::error('Order cancellation failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Errore durante l\'annullamento dell\'ordine. Riprova o contatta l\'assistenza.',
            ], 500);
        }
    }

    /**
     * Aggiunge un collo a un ordine in attesa di pagamento.
     * Il prezzo viene ricalcolato lato server e il subtotale dell'ordine aggiornato.
     */
    public function addPackage(AddOrderPackageRequest $request, Order $order)
    {
        Gate::authorize('addPackage', $order);

        if (! in_array($order->status, [Order::PENDING, Order::PAYMENT_FAILED])) {
            return response()->json(['error' => 'Si possono aggiungere colli solo agli ordini in attesa di pagamento.'], 422);
        }

        DB::transaction(function () use ($request, $order) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
            $weight = (float) $request->weight;
            $s1 = (float) $request->first_size;
            $s2 = (float) $request->second_size;
            $s3 = (float) $request->third_size;
            $quantity = (int) $request->quantity;

            $lockedOrder->loadMissing(['packages.originAddress', 'packages.destinationAddress']);
            /** @var Package|null $existingPackage */
            $existingPackage = $lockedOrder->packages->first();
            $originCap = $existingPackage?->originAddress?->postal_code ?? null;
            $destinationCap = $existingPackage?->destinationAddress?->postal_code ?? null;

            $priced = $this->directOrder->priceSinglePackage(
                $weight, $s1, $s2, $s3, $quantity, $originCap, $destinationCap,
            );

            $package = Package::create([
                'package_type' => $request->package_type,
                'quantity' => $quantity,
                'weight' => $request->weight,
                'first_size' => $request->first_size,
                'second_size' => $request->second_size,
                'third_size' => $request->third_size,
                'weight_price' => $priced['weight_price'],
                'volume_price' => $priced['volume_price'],
                'single_price' => $priced['single_price_cents'],
                'content_description' => $request->content_description,
                'origin_address_id' => $existingPackage?->origin_address_id,
                'destination_address_id' => $existingPackage?->destination_address_id,
                'service_id' => $existingPackage?->service_id,
                'user_id' => auth()->id(),
            ]);

            Order::attachPackage($lockedOrder->id, $package->id, $quantity);

            $newSubtotal = DB::table('package_order')
                ->join('packages', 'package_order.package_id', '=', 'packages.id')
                ->where('package_order.order_id', $lockedOrder->id)
                ->sum('packages.single_price');

            $serviceSurchargeCents = $this->directOrder->recalculateOrderServiceSurcharge(
                $lockedOrder, $existingPackage?->service,
            );

            $lockedOrder->subtotal = (int) $newSubtotal + $serviceSurchargeCents;
            $lockedOrder->save();
            $this->rotatePendingOrderSubmissionContext($lockedOrder);

            return $package;
        });

        $order = $order->fresh();
        $order->load(['packages.originAddress', 'packages.destinationAddress', 'packages.service']);

        return response()->json([
            'success' => true,
            'message' => 'Collo aggiunto con successo.',
            'order' => new OrderResource($order),
        ]);
    }

    private function respondToExistingOrder(Order $existingOrder, array $submissionContext): JsonResponse
    {
        $this->hydrateMissingOrderSubmissionContext($existingOrder, [
            'client_submission_id' => $submissionContext['client_submission_id'],
            'discount_context' => $submissionContext['discount_context'] ?? null,
        ]);
        $existingOrder->refresh();

        if ($discountContextError = $this->syncDiscountContextOnOrder($existingOrder, $submissionContext)) {
            return $discountContextError;
        }

        if (
            filled($existingOrder->pricing_signature)
            && $existingOrder->pricing_signature !== $submissionContext['pricing_signature']
        ) {
            return response()->json(['error' => 'Contesto preventivo non coerente con l\'ordine.'], 422);
        }

        return response()->json([
            'order_id' => $existingOrder->id,
            'order_number' => 'SF-'.str_pad((string) $existingOrder->id, 6, '0', STR_PAD_LEFT),
            'amount_cents' => $existingOrder->payableTotalCents(),
            'client_submission_id' => (string) $existingOrder->client_submission_id,
        ]);
    }
}
