<?php

namespace App\Http\Controllers;

use App\Services\EuropePriceEngineService;
use App\Services\PriceEngineService;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;

class SessionController extends Controller
{
    public function __construct(
        private readonly PriceEngineService $priceEngine,
        private readonly EuropePriceEngineService $europePriceEngine,
    ) {
    }

    public static function findBandPrice(string $type, float $value): float
    {
        return app(PriceEngineService::class)->calculateBandPrice($type, $value);
    }

    public static function calculateCapSupplement(?string $originCap, ?string $destinationCap): float
    {
        return app(PriceEngineService::class)->calculateCapSupplement($originCap, $destinationCap);
    }

    public static function calculateCapSupplementCents(?string $originCap, ?string $destinationCap): int
    {
        return app(PriceEngineService::class)->calculateCapSupplementCents($originCap, $destinationCap);
    }

    public function show()
    {
        return response()->json([
            'data' => $this->buildSessionPayload(),
        ]);
    }

    public function firstStep(Request $request)
    {
        $validated = $request->validate([
            'shipment_details.origin_city' => ['required', 'string'],
            'shipment_details.origin_postal_code' => ['nullable', 'string'],
            'shipment_details.origin_country_code' => ['nullable', 'string', 'size:2'],
            'shipment_details.origin_country' => ['nullable', 'string'],
            'shipment_details.destination_city' => ['required', 'string'],
            'shipment_details.destination_postal_code' => ['nullable', 'string'],
            'shipment_details.destination_country_code' => ['nullable', 'string', 'size:2'],
            'shipment_details.destination_country' => ['nullable', 'string'],
            'shipment_details.date' => ['nullable', 'string'],
            'packages' => ['required', 'array', 'min:1'],
            'packages.*.package_type' => ['required', 'string'],
            'packages.*.quantity' => ['required', 'integer', 'min:1'],
            'packages.*.weight' => ['required'],
            'packages.*.first_size' => ['required'],
            'packages.*.second_size' => ['required'],
            'packages.*.third_size' => ['required'],
        ]);

        $shipmentDetails = $validated['shipment_details'];
        $shipmentDetails['origin_country_code'] = strtoupper(trim((string) ($shipmentDetails['origin_country_code'] ?? 'IT')));
        $shipmentDetails['destination_country_code'] = strtoupper(trim((string) ($shipmentDetails['destination_country_code'] ?? 'IT')));
        $shipmentDetails['origin_country'] = trim((string) ($shipmentDetails['origin_country'] ?? 'Italia'));
        $shipmentDetails['destination_country'] = trim((string) ($shipmentDetails['destination_country'] ?? 'Italia'));

        $isOriginItaly = $shipmentDetails['origin_country_code'] === 'IT';
        $isEuropeShipment = $this->europePriceEngine->isEuropeDestination($shipmentDetails['destination_country_code']);

        if ($isOriginItaly && blank($shipmentDetails['origin_postal_code'] ?? null)) {
            throw ValidationException::withMessages([
                'shipment_details.origin_postal_code' => ['Il CAP di partenza è obbligatorio per le spedizioni con origine nazionale.'],
            ]);
        }

        if (! $isEuropeShipment && blank($shipmentDetails['destination_postal_code'] ?? null)) {
            throw ValidationException::withMessages([
                'shipment_details.destination_postal_code' => ['Il CAP di destinazione è obbligatorio per le spedizioni nazionali.'],
            ]);
        }

        if ($isEuropeShipment) {
            if (count($validated['packages']) !== 1) {
                throw ValidationException::withMessages([
                    'packages' => ["Le spedizioni verso l'Europa sono disponibili solo in modalità monocollo."],
                ]);
            }

            $firstPackage = $validated['packages'][0];
            $quantity = (int) ($firstPackage['quantity'] ?? 1);
            if ($quantity !== 1) {
                throw ValidationException::withMessages([
                    'packages.0.quantity' => ["Per le spedizioni verso l'Europa la quantita deve essere 1."],
                ]);
            }
        }

        $originCap = $shipmentDetails['origin_postal_code'] ?? null;
        $destCap = $shipmentDetails['destination_postal_code'] ?? null;
        $capSupplementCents = self::calculateCapSupplementCents($originCap, $destCap);

        $packages = collect($validated['packages'])->map(function (array $package) use ($capSupplementCents, $shipmentDetails, $isEuropeShipment) {
            $weight = (float) preg_replace('/[^0-9.]/', '', (string) ($package['weight'] ?? '0'));
            $s1 = (float) preg_replace('/[^0-9.]/', '', (string) ($package['first_size'] ?? '0'));
            $s2 = (float) preg_replace('/[^0-9.]/', '', (string) ($package['second_size'] ?? '0'));
            $s3 = (float) preg_replace('/[^0-9.]/', '', (string) ($package['third_size'] ?? '0'));
            $vol = ($s1 / 100) * ($s2 / 100) * ($s3 / 100);
            $quantity = (int) ($package['quantity'] ?? 1);

            if ($isEuropeShipment) {
                $quote = $this->europePriceEngine->calculateQuote(
                    $shipmentDetails['destination_country_code'] ?? null,
                    $weight,
                    $vol,
                );

                if (($quote['status'] ?? null) === 'requires_quote') {
                    throw ValidationException::withMessages([
                        'packages' => [$quote['message'] ?? 'Per questa spedizione europea serve un preventivo manuale.'],
                    ]);
                }

                if (($quote['status'] ?? null) !== 'priced') {
                    throw ValidationException::withMessages([
                        'packages' => [$quote['message'] ?? 'Destinazione europea non supportata dal listino attuale.'],
                    ]);
                }

                $singlePrice = round(((int) $quote['price_cents']) / 100, 2);
                $package['quantity'] = 1;
                $package['weight_price'] = $singlePrice;
                $package['volume_price'] = $singlePrice;
                $package['single_price'] = $singlePrice;
                $package['single_price_orig'] = $singlePrice;
                $package['pricing_scope'] = 'europe_monocollo';
                $package['europe_band'] = $quote['band']['label'] ?? null;
                $package['europe_rate_country'] = $quote['rate']['country_name'] ?? null;

                return $package;
            }

            $weightPrice = self::findBandPrice('weight', $weight);
            $package['weight_price'] = $weightPrice;
            $volumePrice = self::findBandPrice('volume', $vol);
            $package['volume_price'] = $volumePrice;

            $weightPriceCents = (int) round((float) $weightPrice * 100);
            $volumePriceCents = (int) round((float) $volumePrice * 100);
            $basePriceCents = max($weightPriceCents, $volumePriceCents) + $capSupplementCents;
            $package['single_price'] = round(($basePriceCents / 100) * $quantity, 2);

            return $package;
        })->values()->all();

        $totalPrice = collect($packages)->sum(fn (array $package) => (float) $package['single_price']);

        session()->put('shipment_details', $shipmentDetails);
        session()->put('packages', $packages);
        session()->put('total_price', round($totalPrice, 2));
        session()->put('step', 2);
        $this->forgetDownstreamFlowState();

        return response()->json([
            'data' => $this->buildSessionPayload(),
        ]);
    }

    public function secondStep(Request $request)
    {
        $validated = $request->validate([
            'services' => ['nullable', 'array'],
            'services.service_type' => ['nullable', 'string'],
            'services.date' => ['nullable', 'string'],
            'services.time' => ['nullable', 'string'],
            'services.serviceData' => ['nullable', 'array'],
            'services.sms_email_notification' => ['nullable', 'boolean'],
            'content_description' => ['required', 'string'],
            'pickup_date' => ['required', 'string'],
            'sms_email_notification' => ['nullable', 'boolean'],
            'origin_address' => ['nullable', 'array'],
            'origin_address.type' => ['nullable', 'string'],
            'origin_address.name' => ['nullable', 'string'],
            'origin_address.additional_information' => ['nullable', 'string'],
            'origin_address.address' => ['nullable', 'string'],
            'origin_address.number_type' => ['nullable', 'string'],
            'origin_address.address_number' => ['nullable', 'string'],
            'origin_address.intercom_code' => ['nullable', 'string'],
            'origin_address.country' => ['nullable', 'string'],
            'origin_address.city' => ['nullable', 'string'],
            'origin_address.postal_code' => ['nullable', 'string'],
            'origin_address.province' => ['nullable', 'string'],
            'origin_address.telephone_number' => ['nullable', 'string'],
            'origin_address.email' => ['nullable', 'string'],
            'destination_address' => ['nullable', 'array'],
            'destination_address.type' => ['nullable', 'string'],
            'destination_address.name' => ['nullable', 'string'],
            'destination_address.additional_information' => ['nullable', 'string'],
            'destination_address.address' => ['nullable', 'string'],
            'destination_address.number_type' => ['nullable', 'string'],
            'destination_address.address_number' => ['nullable', 'string'],
            'destination_address.intercom_code' => ['nullable', 'string'],
            'destination_address.country' => ['nullable', 'string'],
            'destination_address.city' => ['nullable', 'string'],
            'destination_address.postal_code' => ['nullable', 'string'],
            'destination_address.province' => ['nullable', 'string'],
            'destination_address.telephone_number' => ['nullable', 'string'],
            'destination_address.email' => ['nullable', 'string'],
            'delivery_mode' => ['nullable', 'string', 'in:home,pudo'],
            'selected_pudo' => ['nullable', 'array'],
        ]);

        $contentDescription = trim((string) ($validated['content_description'] ?? ''));
        $pickupDate = trim((string) ($validated['pickup_date'] ?? ''));
        $smsEmailNotification = (bool) ($validated['sms_email_notification'] ?? false);
        $serviceData = Arr::wrap($validated['services']['serviceData'] ?? []);
        $originAddress = $this->normalizeAddressPayload($validated['origin_address'] ?? null);
        $destinationAddress = $this->normalizeAddressPayload($validated['destination_address'] ?? null);
        $deliveryMode = (string) ($validated['delivery_mode'] ?? 'home');
        $selectedPudo = Arr::wrap($validated['selected_pudo'] ?? null);
        $pickupRequest = $this->normalizePickupRequest(
            Arr::wrap($serviceData['pickup_request'] ?? []),
            $pickupDate,
            trim((string) ($validated['services']['time'] ?? ''))
        );

        $services = [
            'service_type' => trim((string) ($validated['services']['service_type'] ?? '')),
            'date' => trim((string) ($validated['services']['date'] ?? $pickupDate)),
            'time' => $pickupRequest['time_slot'],
            'serviceData' => [
                ...$serviceData,
                'pickup_request' => $pickupRequest,
                'sms_email_notification' => $smsEmailNotification,
            ],
            'sms_email_notification' => $smsEmailNotification,
        ];

        session()->put('services', $services);
        session()->put('content_description', $contentDescription);
        session()->put('pickup_date', $pickupDate);
        session()->put('sms_email_notification', $smsEmailNotification);
        session()->put('service_data', $services['serviceData']);
        session()->put('delivery_mode', $deliveryMode);
        session()->put('selected_pudo', $selectedPudo ?: null);

        if ($originAddress !== null) {
            session()->put('origin_address', $originAddress);
        }

        if ($destinationAddress !== null) {
            session()->put('destination_address', $destinationAddress);
        }

        $flowState = $this->buildFlowState();
        session()->put('step', $flowState['summary_ready'] ? 4 : 3);

        return response()->json([
            'data' => $this->buildSessionPayload(),
        ]);
    }

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

    private function normalizeAddressPayload(mixed $address): ?array
    {
        if (! is_array($address) || empty($address)) {
            return null;
        }

        return [
            'type' => trim((string) ($address['type'] ?? '')),
            'name' => trim((string) ($address['name'] ?? '')),
            'additional_information' => trim((string) ($address['additional_information'] ?? '')),
            'address' => trim((string) ($address['address'] ?? '')),
            'number_type' => trim((string) ($address['number_type'] ?? 'Numero Civico')),
            'address_number' => trim((string) ($address['address_number'] ?? '')),
            'intercom_code' => trim((string) ($address['intercom_code'] ?? '')),
            'country' => trim((string) ($address['country'] ?? 'Italia')),
            'city' => trim((string) ($address['city'] ?? '')),
            'postal_code' => trim((string) ($address['postal_code'] ?? '')),
            'province' => trim((string) ($address['province'] ?? '')),
            'telephone_number' => trim((string) ($address['telephone_number'] ?? '')),
            'email' => trim((string) ($address['email'] ?? '')),
        ];
    }

    private function normalizePickupRequest(array $pickupRequest, string $pickupDate, string $pickupTime): array
    {
        $resolvedDate = trim((string) ($pickupRequest['date'] ?? $pickupDate));
        $resolvedTime = trim((string) ($pickupRequest['time_slot'] ?? $pickupTime));

        return [
            'enabled' => (bool) ($pickupRequest['enabled'] ?? ($resolvedDate !== '')),
            'date' => $this->normalizePickupRequestDate($resolvedDate),
            'time_slot' => $resolvedTime !== '' ? $resolvedTime : '09:00-18:00',
            'notes' => trim((string) ($pickupRequest['notes'] ?? '')),
        ];
    }

    private function normalizePickupRequestDate(string $pickupDate): string
    {
        $pickupDate = trim($pickupDate);
        if ($pickupDate === '') {
            return '';
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $pickupDate)) {
            return $pickupDate;
        }

        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $pickupDate, $matches)) {
            return sprintf('%s-%02d-%02d', $matches[3], (int) $matches[2], (int) $matches[1]);
        }

        return $pickupDate;
    }

    private function forgetDownstreamFlowState(): void
    {
        session()->forget([
            'services',
            'content_description',
            'pickup_date',
            'sms_email_notification',
            'service_data',
            'origin_address',
            'destination_address',
            'delivery_mode',
            'selected_pudo',
        ]);
    }
}
