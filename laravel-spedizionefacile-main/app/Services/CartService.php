<?php

namespace App\Services;

use App\Cart\MyMoney;
use App\Models\Service;
use App\Models\Package;

class CartService
{
    // --- Price helpers ---

    public static function euroToCents(float|int|null $euro): int
    {
        return (int) round(($euro ?? 0) * 100);
    }

    public static function unitPrice(int $totalPriceCents, int $quantity): int
    {
        return $quantity > 0 ? (int) round($totalPriceCents / $quantity) : $totalPriceCents;
    }

    public static function mergeQuantity(int $existingPriceCents, int $existingQty, int $addedQty, ?int $newUnitPriceCents = null): array
    {
        $unitPrice = $newUnitPriceCents ?? self::unitPrice($existingPriceCents, $existingQty);
        $totalQty = $existingQty + $addedQty;
        return ['quantity' => $totalQty, 'single_price' => $unitPrice * $totalQty];
    }

    // --- Duplicate detection ---

    public static function normalize(?string $value): string
    {
        return mb_strtolower(trim($value ?? ''), 'UTF-8');
    }

    public static function samePackageDimensions(array $a, array $b): bool
    {
        return ($a['package_type'] ?? '') === ($b['package_type'] ?? '')
            && (string) ($a['weight'] ?? '') === (string) ($b['weight'] ?? '')
            && (string) ($a['first_size'] ?? '') === (string) ($b['first_size'] ?? '')
            && (string) ($a['second_size'] ?? '') === (string) ($b['second_size'] ?? '')
            && (string) ($a['third_size'] ?? '') === (string) ($b['third_size'] ?? '');
    }

    public static function sameAddress(array $a, array $b): bool
    {
        return ($a['city'] ?? '') === ($b['city'] ?? '')
            && ($a['postal_code'] ?? '') === ($b['postal_code'] ?? '')
            && ($a['name'] ?? '') === ($b['name'] ?? '')
            && ($a['address'] ?? '') === ($b['address'] ?? '');
    }

    public static function isDuplicate(
        array $packageData, array $originAddress, array $destAddress, string $serviceSignature,
        array $existingPkg, array $existingOrigin, array $existingDest, string $existingServiceSig
    ): bool {
        return self::samePackageDimensions($packageData, $existingPkg)
            && self::sameAddress($originAddress, $existingOrigin)
            && self::sameAddress($destAddress, $existingDest)
            && $serviceSignature === $existingServiceSig;
    }

    // --- Merge key ---

    public static function buildMergeKey(Package $pkg): string
    {
        $o = $pkg->originAddress;
        $d = $pkg->destinationAddress;
        $s = $pkg->service;

        return implode('|', [
            self::normalize($pkg->package_type),
            (string) $pkg->weight, (string) $pkg->first_size, (string) $pkg->second_size, (string) $pkg->third_size,
            $o ? self::normalize($o->name) . '|' . self::normalize($o->address) . '|' . self::normalize($o->city) . '|' . self::normalize($o->postal_code) : 'no-origin',
            $d ? self::normalize($d->name) . '|' . self::normalize($d->address) . '|' . self::normalize($d->city) . '|' . self::normalize($d->postal_code) : 'no-dest',
            $s ? self::normalize($s->service_type) : 'nessuno',
            $s ? self::buildServiceSignatureFromService($s) : 'no-service-data',
        ]);
    }

    // --- Address grouping ---

    public static function buildAddressGroups($packages): array
    {
        if ($packages->isEmpty()) return [];
        $groups = [];

        foreach ($packages as $package) {
            $origin = $package->originAddress;
            $destination = $package->destinationAddress;
            $serviceType = $package->service->service_type ?? 'Nessuno';

            $originParts = $origin ? implode('|', [
                self::normalize($origin->name), self::normalize($origin->address), self::normalize($origin->address_number),
                self::normalize($origin->city), self::normalize($origin->postal_code), self::normalize($origin->province),
            ]) : 'no-origin';

            $destParts = $destination ? implode('|', [
                self::normalize($destination->name), self::normalize($destination->address), self::normalize($destination->address_number),
                self::normalize($destination->city), self::normalize($destination->postal_code), self::normalize($destination->province),
            ]) : 'no-dest';

            $key = md5($originParts . '::' . $destParts . '::' . self::normalize($serviceType));

            if (!isset($groups[$key])) {
                $groups[$key] = [
                    'package_ids' => [], 'count' => 0,
                    'origin_summary' => $origin ? trim(($origin->name ?? '') . ' - ' . ($origin->city ?? '')) : '',
                    'destination_summary' => $destination ? trim(($destination->name ?? '') . ' - ' . ($destination->city ?? '')) : '',
                    'service_type' => $serviceType,
                ];
            }
            $groups[$key]['package_ids'][] = $package->id;
            $groups[$key]['count']++;
        }

        return array_values($groups);
    }

    // --- Subtotal calculation (delegates surcharge to CartSurchargeCalculator) ---

    public static function subtotalFromModels($packages): MyMoney
    {
        $subtotal = $packages->sum(fn ($p) => (int) $p->single_price);
        $subtotal += CartSurchargeCalculator::fromModels($packages);
        return new MyMoney($subtotal);
    }

    public static function subtotalFromArray(array $packages): MyMoney
    {
        $subtotal = 0;
        foreach ($packages as $package) {
            $subtotal += (int) ($package['single_price'] ?? 0);
        }
        $subtotal += CartSurchargeCalculator::fromArray($packages);
        return new MyMoney($subtotal);
    }

    // --- Service signatures ---

    public static function buildServiceSignatureFromService(Service $service): string
    {
        return app(ShipmentServicePricingService::class)->buildSelectionSignature(
            $service->service_type ?? 'Nessuno', $service->service_data ?? [],
            (bool) (($service->service_data ?? [])['sms_email_notification'] ?? false),
        );
    }

    public static function buildServiceSignatureFromArray(string $serviceType, array $serviceData = []): string
    {
        return app(ShipmentServicePricingService::class)->buildSelectionSignature(
            $serviceType, $serviceData, (bool) ($serviceData['sms_email_notification'] ?? false),
        );
    }

    public static function buildServiceSignatureFromGuest(array $services = []): string
    {
        $serviceData = $services['serviceData'] ?? $services['service_data'] ?? [];
        return app(ShipmentServicePricingService::class)->buildSelectionSignature(
            $services['service_type'] ?? 'Nessuno',
            is_array($serviceData) ? $serviceData : [],
            (bool) ($services['sms_email_notification'] ?? (is_array($serviceData) ? ($serviceData['sms_email_notification'] ?? false) : false)),
        );
    }

    // --- Backward compat: surcharge calculation delegates ---

    public static function calculateGroupedSurchargeFromModels($packages): int
    {
        return CartSurchargeCalculator::fromModels($packages);
    }

    public static function calculateGroupedSurchargeFromArray(array $packages): int
    {
        return CartSurchargeCalculator::fromArray($packages);
    }

    // --- Service normalization ---

    public static function normalizeServiceData(array $servicesData): array
    {
        $servicesData['service_type'] = !empty($servicesData['service_type']) ? $servicesData['service_type'] : 'Nessuno';
        $servicesData['date'] = $servicesData['date'] ?? '';
        $servicesData['time'] = $servicesData['time'] ?? '';

        if (isset($servicesData['serviceData']) && is_array($servicesData['serviceData'])) {
            $servicesData['service_data'] = $servicesData['serviceData'];
            unset($servicesData['serviceData']);
        }
        if (! isset($servicesData['service_data']) || ! is_array($servicesData['service_data'])) {
            $servicesData['service_data'] = [];
        }
        if (array_key_exists('sms_email_notification', $servicesData)) {
            $servicesData['service_data']['sms_email_notification'] = (bool) $servicesData['sms_email_notification'];
        }
        return $servicesData;
    }

    // --- PUDO helpers ---

    public static function applyPudoData(array $servicesData, array $requestData): array
    {
        if (!empty($requestData['pudo']) && ($requestData['delivery_mode'] ?? 'home') === 'pudo') {
            $serviceData = $servicesData['service_data'] ?? [];
            $serviceData['pudo'] = $requestData['pudo'];
            $serviceData['delivery_mode'] = 'pudo';
            $servicesData['service_data'] = $serviceData;
        } elseif (($requestData['delivery_mode'] ?? null) === 'home') {
            $serviceData = $servicesData['service_data'] ?? [];
            unset($serviceData['pudo'], $serviceData['delivery_mode']);
            $servicesData['service_data'] = $serviceData;
        }
        return $servicesData;
    }

    // --- Merge operations ---

    public static function mergeIdenticalPackages($packages, int $userId): int
    {
        if ($packages->count() < 2) return 0;

        $groups = [];
        foreach ($packages as $pkg) {
            $groups[self::buildMergeKey($pkg)][] = $pkg;
        }

        $merged = 0;
        foreach ($groups as $groupPackages) {
            if (count($groupPackages) < 2) continue;

            $master = $groupPackages[0];
            $masterQty = (int) $master->quantity;
            $masterUnitPrice = self::unitPrice((int) $master->single_price, $masterQty);

            for ($i = 1; $i < count($groupPackages); $i++) {
                $dup = $groupPackages[$i];
                $masterQty += (int) $dup->quantity;
                \Illuminate\Support\Facades\DB::table('cart_user')->where('user_id', $userId)->where('package_id', $dup->id)->delete();
                $dup->delete();
                $merged++;
            }

            $master->update(['quantity' => $masterQty, 'single_price' => $masterUnitPrice * $masterQty]);
        }

        return $merged;
    }
}
