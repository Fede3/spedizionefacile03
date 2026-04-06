<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Package;
use App\Models\PackageAddress;
use App\Models\Service;
use Illuminate\Support\Facades\DB;

/**
 * DirectOrderService - Business logic for creating orders directly (bypassing the cart).
 *
 * Extracted from OrderController::createDirectOrder() and OrderController::addPackage().
 * Keeps pricing recalculation server-side (security measure: never trust frontend prices).
 */
class DirectOrderService
{
    public function __construct(
        private readonly PriceEngineService $priceEngine,
        private readonly ShipmentServicePricingService $servicePricing,
        private readonly CheckoutSubmissionContextService $submissionContext,
    ) {}

    /**
     * Price each package in the payload using server-side price engine.
     *
     * @return array{priced_packages: array, subtotal_cents: int, cap_supplement_cents: int}
     */
    public function pricePackages(array $packagesData, ?string $originCap, ?string $destCap): array
    {
        $capSupplementCents = $this->priceEngine->calculateCapSupplementCents($originCap, $destCap);
        $pricedPackages = [];
        $subtotalCents = 0;

        foreach ($packagesData as $packageData) {
            $weight = (float) preg_replace('/[^0-9.]/', '', $packageData['weight']);
            $s1 = (float) preg_replace('/[^0-9.]/', '', $packageData['first_size']);
            $s2 = (float) preg_replace('/[^0-9.]/', '', $packageData['second_size']);
            $s3 = (float) preg_replace('/[^0-9.]/', '', $packageData['third_size']);
            $weightPriceCents = $weight > 0 ? $this->priceEngine->calculateBandPriceCents('weight', $weight) : 0;
            $volumePriceCents = ($s1 > 0 && $s2 > 0 && $s3 > 0) ? $this->priceEngine->calculateBandPriceCents('volume', ($s1 / 100) * ($s2 / 100) * ($s3 / 100)) : 0;
            $basePriceCents = max($weightPriceCents, $volumePriceCents) + $capSupplementCents;
            $quantity = (int) ($packageData['quantity'] ?? 1);
            $singlePriceCents = $basePriceCents * $quantity;
            $subtotalCents += $singlePriceCents;

            $pricedPackages[] = [
                'package_type' => $packageData['package_type'],
                'quantity' => $quantity,
                'weight' => $packageData['weight'],
                'first_size' => $packageData['first_size'],
                'second_size' => $packageData['second_size'],
                'third_size' => $packageData['third_size'],
                'weight_price' => round($weightPriceCents / 100, 2),
                'volume_price' => round($volumePriceCents / 100, 2),
                'single_price' => $singlePriceCents,
                'single_price_cents' => $singlePriceCents,
            ];
        }

        return [
            'priced_packages' => $pricedPackages,
            'subtotal_cents' => $subtotalCents,
            'cap_supplement_cents' => $capSupplementCents,
        ];
    }

    /**
     * Calculate service surcharge cents for the given payload.
     */
    public function calculateServiceSurcharge(
        array $servicesData,
        array $serviceData,
        array $pricedPackages,
        array $data,
    ): int {
        $serviceType = $servicesData['service_type'] ?? '';

        return $this->servicePricing->calculateSurchargeCents(
            $serviceType,
            $serviceData,
            (bool) ($serviceData['sms_email_notification'] ?? false),
            [
                'packages' => $pricedPackages,
                'origin_address' => $data['origin_address'] ?? [],
                'destination_address' => (($data['delivery_mode'] ?? ($serviceData['delivery_mode'] ?? 'home')) === 'pudo' && ! empty($data['pudo']))
                    ? $data['pudo']
                    : ($data['destination_address'] ?? []),
                'delivery_mode' => $data['delivery_mode'] ?? ($serviceData['delivery_mode'] ?? 'home'),
                'selected_pudo' => $data['selected_pudo'] ?? $data['pudo'] ?? ($serviceData['pudo'] ?? null),
                'requires_manual_quote' => (bool) ($data['requires_manual_quote'] ?? $serviceData['requires_manual_quote'] ?? false),
            ],
        );
    }

    /**
     * Resolve COD (contrassegno) details from services data.
     *
     * @return array{is_cod: bool, cod_amount: float|null}
     */
    public function resolveCodDetails(array $servicesData, array $serviceData): array
    {
        $serviceType = $servicesData['service_type'] ?? '';
        $isCod = in_array('contrassegno', $this->servicePricing->normalizeSelectedServices($serviceType), true);
        $codAmount = $isCod ? $this->servicePricing->extractContrassegnoAmount($serviceData) : null;

        return ['is_cod' => $isCod, 'cod_amount' => $codAmount];
    }

    /**
     * Persist the direct order: addresses, service, packages, order, pivots.
     *
     * @return array{order_id: int, order_number: string}
     */
    public function persistDirectOrder(
        array $data,
        int $userId,
        array $pricedPackages,
        array $servicesData,
        bool $isCod,
        ?float $codAmount,
        ?string $pudoId,
        int $orderSubtotalCents,
        array $submissionContext,
    ): array {
        $origin = PackageAddress::create($data['origin_address']);
        $destination = PackageAddress::create($data['destination_address']);
        $service = Service::create($servicesData);
        $packages = [];

        foreach ($pricedPackages as $packageData) {
            $packages[] = Package::create([
                'package_type' => $packageData['package_type'],
                'quantity' => $packageData['quantity'],
                'weight' => $packageData['weight'],
                'first_size' => $packageData['first_size'],
                'second_size' => $packageData['second_size'],
                'third_size' => $packageData['third_size'],
                'weight_price' => $packageData['weight_price'],
                'volume_price' => $packageData['volume_price'],
                'single_price' => $packageData['single_price'],
                'content_description' => $data['content_description'] ?? null,
                'origin_address_id' => $origin->id,
                'destination_address_id' => $destination->id,
                'service_id' => $service->id,
                'user_id' => $userId,
            ]);
        }

        $order = Order::create([
            'user_id' => $userId,
            'subtotal' => $orderSubtotalCents,
            'status' => Order::PENDING,
            'is_cod' => $isCod,
            'cod_amount' => $codAmount > 0 ? $codAmount : null,
            'brt_pudo_id' => $pudoId,
            'client_submission_id' => $submissionContext['client_submission_id'],
            'pricing_signature' => $submissionContext['pricing_signature'],
            'pricing_snapshot_version' => $submissionContext['pricing_snapshot_version'],
            'pricing_snapshot' => $submissionContext['pricing_snapshot'],
        ]);

        foreach ($packages as $package) {
            Order::attachPackage($order->id, $package->id, $package->quantity ?? 1);
        }

        return [
            'order_id' => $order->id,
            'order_number' => 'SF-' . str_pad((string) $order->id, 6, '0', STR_PAD_LEFT),
        ];
    }

    /**
     * Price a single package for addPackage flow using the existing order's addresses.
     *
     * @return array{weight_price: float, volume_price: float, single_price_cents: int}
     */
    public function priceSinglePackage(float $weight, float $s1, float $s2, float $s3, int $quantity, ?string $originCap, ?string $destCap): array
    {
        $weightPriceCents = $weight > 0 ? $this->priceEngine->calculateBandPriceCents('weight', $weight) : 0;
        $vol = ($s1 / 100) * ($s2 / 100) * ($s3 / 100);
        $volumePriceCents = $vol > 0 ? $this->priceEngine->calculateBandPriceCents('volume', $vol) : 0;

        $capSupplementCents = $this->priceEngine->calculateCapSupplementCents($originCap, $destCap);
        $basePriceCents = max($weightPriceCents, $volumePriceCents) + $capSupplementCents;
        $singlePriceCents = $basePriceCents * $quantity;

        return [
            'weight_price' => round($weightPriceCents / 100, 2),
            'volume_price' => round($volumePriceCents / 100, 2),
            'single_price_cents' => $singlePriceCents,
        ];
    }

    /**
     * Recalculate service surcharge for an existing order (used by addPackage).
     */
    public function recalculateOrderServiceSurcharge(Order $order, $serviceModel): int
    {
        if (! $serviceModel) {
            return 0;
        }

        $existingPackage = $order->packages->first();

        return $this->servicePricing->calculateSurchargeCents(
            $serviceModel->service_type ?? '',
            $serviceModel->service_data ?? [],
            (bool) (($serviceModel->service_data ?? [])['sms_email_notification'] ?? false),
            [
                'packages' => $order->packages()->get()->all(),
                'origin_address' => $existingPackage?->originAddress?->toArray() ?? [],
                'destination_address' => (($serviceModel->service_data['delivery_mode'] ?? 'home') === 'pudo' && ! empty($serviceModel->service_data['pudo']))
                    ? $serviceModel->service_data['pudo']
                    : ($existingPackage?->destinationAddress?->toArray() ?? []),
                'delivery_mode' => $serviceModel->service_data['delivery_mode'] ?? 'home',
                'selected_pudo' => $serviceModel->service_data['pudo'] ?? null,
                'requires_manual_quote' => (bool) ($serviceModel->service_data['requires_manual_quote'] ?? false),
            ],
        );
    }
}
