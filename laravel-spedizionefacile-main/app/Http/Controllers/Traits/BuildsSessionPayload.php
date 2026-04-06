<?php

namespace App\Http\Controllers\Traits;

trait BuildsSessionPayload
{
    private function buildSessionPayload(): array
    {
        return [
            'shipment_details' => session()->get('shipment_details', []),
            'packages' => session()->get('packages', []),
            'services' => session()->get('services', null),
            'total_price' => session()->get('total_price', 0),
            'step' => session()->get('step', 1),
            'content_description' => session()->get('content_description', ''),
            'pickup_date' => session()->get('pickup_date', ''),
            'sms_email_notification' => session()->get('sms_email_notification', false),
            'service_data' => session()->get('service_data', []),
            'origin_address' => session()->get('origin_address'),
            'destination_address' => session()->get('destination_address'),
            'delivery_mode' => session()->get('delivery_mode', 'home'),
            'selected_pudo' => session()->get('selected_pudo'),
            'flow_state' => $this->buildFlowState(),
        ];
    }

    private function buildFlowState(): array
    {
        $shipmentDetails = session()->get('shipment_details', []);
        $packages = session()->get('packages', []);
        $contentDescription = trim((string) session()->get('content_description', ''));
        $pickupDate = trim((string) session()->get('pickup_date', ''));
        $originAddress = session()->get('origin_address');
        $destinationAddress = session()->get('destination_address');

        $quoteReady = $this->hasQuoteState($shipmentDetails, $packages);
        $servicesReady = $quoteReady && $contentDescription !== '' && $pickupDate !== '';
        $addressesReady = $servicesReady
            && $this->hasAddressState($originAddress)
            && $this->hasAddressState($destinationAddress);
        $summaryReady = $addressesReady;

        $lastValidRoute = '/preventivo';
        if ($summaryReady) {
            $lastValidRoute = '/riepilogo';
        } elseif ($servicesReady) {
            $lastValidRoute = '/la-tua-spedizione/2?step=ritiro';
        } elseif ($quoteReady) {
            $lastValidRoute = '/la-tua-spedizione/2';
        }

        return [
            'quote_ready' => $quoteReady,
            'services_ready' => $servicesReady,
            'addresses_ready' => $addressesReady,
            'summary_ready' => $summaryReady,
            'last_valid_route' => $lastValidRoute,
        ];
    }

    private function hasQuoteState(array $shipmentDetails, array $packages): bool
    {
        return ! empty($packages)
            && filled($shipmentDetails['origin_city'] ?? null)
            && filled($shipmentDetails['destination_city'] ?? null);
    }

    private function hasAddressState(mixed $address): bool
    {
        if (! is_array($address)) {
            return false;
        }

        return filled($address['name'] ?? null)
            && filled($address['address'] ?? null)
            && filled($address['city'] ?? null)
            && filled($address['postal_code'] ?? null);
    }
}
