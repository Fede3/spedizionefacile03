<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Package;
use Illuminate\Support\Facades\DB;

class OrderCreationService
{
    public function createOrdersFromPackages($packages, int $userId, ?array $billingData = null): array
    {
        $groups = $this->groupPackagesByAddress($packages);

        return DB::transaction(function () use ($groups, $userId, $billingData) {
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
                    'destination_address' => (($serviceData['delivery_mode'] ?? 'home') === 'pudo' && !empty($serviceData['pudo']))
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
                    if (!empty($sd['pudo']['pudo_id']) && ($sd['delivery_mode'] ?? '') === 'pudo') {
                        $pudoId = $sd['pudo']['pudo_id'];
                        break;
                    }
                }

                $order = Order::create([
                    'user_id' => $userId, 'subtotal' => $subtotal, 'status' => Order::PENDING,
                    'is_cod' => $isCod, 'cod_amount' => $codAmount > 0 ? $codAmount : null,
                    'brt_pudo_id' => $pudoId, 'billing_data' => $billingData,
                ]);

                foreach ($groupPackages as $package) {
                    Order::attachPackage($order->id, $package->id, $package->quantity ?? 1);
                }

                $orders[] = $order;
            }

            return $orders;
        });
    }

    private function groupPackagesByAddress($packages): array
    {
        $servicePricing = app(ShipmentServicePricingService::class);
        $groups = [];
        $normalize = fn ($v) => mb_strtolower(trim($v ?? ''), 'UTF-8');

        foreach ($packages as $package) {
            $serviceType = $package->service->service_type ?? 'Nessuno';
            $serviceData = $package->service->service_data ?? [];
            $serviceSignature = $servicePricing->buildSelectionSignature($serviceType, $serviceData, (bool) ($serviceData['sms_email_notification'] ?? false));

            $origin = $package->originAddress;
            $destination = $package->destinationAddress;

            $originParts = $origin ? implode('|', [$normalize($origin->name), $normalize($origin->address), $normalize($origin->address_number), $normalize($origin->city), $normalize($origin->postal_code), $normalize($origin->province)]) : 'no-origin';
            $destParts = $destination ? implode('|', [$normalize($destination->name), $normalize($destination->address), $normalize($destination->address_number), $normalize($destination->city), $normalize($destination->postal_code), $normalize($destination->province)]) : 'no-dest';

            $key = md5($originParts . '::' . $destParts . '::' . $normalize($serviceType) . '::' . $serviceSignature);

            if (!isset($groups[$key])) {
                $groups[$key] = ['key' => $key, 'packages' => collect()];
            }
            $groups[$key]['packages']->push($package);
        }

        return array_values($groups);
    }
}
