<?php

namespace App\Services\Concerns;

use App\Models\Service;
use App\Services\CartSurchargeCalculator;
use App\Services\ShipmentServicePricingService;

/**
 * Trait helper di CartService — Service signatures + surcharge delegates.
 *
 * Costruisce signature deterministica per i servizi extra (assicurazione,
 * contrassegno, sms_email_notification) usata per duplicate detection.
 * Le funzioni surcharge sono delega esplicita a CartSurchargeCalculator.
 */
trait CartServiceSignatures
{
    public function buildServiceSignatureFromService(Service $service): string
    {
        return app(ShipmentServicePricingService::class)->buildSelectionSignature(
            $service->service_type ?? 'Nessuno', $service->service_data ?? [],
            (bool) (($service->service_data ?? [])['sms_email_notification'] ?? false),
        );
    }

    public function buildServiceSignatureFromArray(string $serviceType, array $serviceData = []): string
    {
        return app(ShipmentServicePricingService::class)->buildSelectionSignature(
            $serviceType, $serviceData, (bool) ($serviceData['sms_email_notification'] ?? false),
        );
    }

    public function buildServiceSignatureFromGuest(array $services = []): string
    {
        $serviceData = $services['serviceData'] ?? $services['service_data'] ?? [];
        return app(ShipmentServicePricingService::class)->buildSelectionSignature(
            $services['service_type'] ?? 'Nessuno',
            is_array($serviceData) ? $serviceData : [],
            (bool) ($services['sms_email_notification'] ?? (is_array($serviceData) ? ($serviceData['sms_email_notification'] ?? false) : false)),
        );
    }

    public function calculateGroupedSurchargeFromModels($packages): int
    {
        return CartSurchargeCalculator::fromModels($packages);
    }

    public function calculateGroupedSurchargeFromArray(array $packages): int
    {
        return CartSurchargeCalculator::fromArray($packages);
    }
}
