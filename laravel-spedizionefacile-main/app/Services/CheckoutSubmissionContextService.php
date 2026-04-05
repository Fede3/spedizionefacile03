<?php

namespace App\Services;

class CheckoutSubmissionContextService
{
    public function fromRequestArray(array $input): array
    {
        $context = [];

        foreach (['client_submission_id'] as $field) {
            $value = trim((string) ($input[$field] ?? ''));
            if ($value !== '') {
                $context[$field] = $value;
            }
        }

        return $context;
    }

    public function enrich(array $context, array $snapshot, array $seed = []): array
    {
        $normalizedSnapshot = $this->sortRecursive($snapshot);
        $version = 1;

        $signature = $this->fingerprint([
            'snapshot' => $normalizedSnapshot,
            'version' => $version,
        ]);

        $submissionId = trim((string) ($context['client_submission_id'] ?? ''));
        if ($submissionId === '') {
            $submissionId = 'submission-'.$this->fingerprint([
                'snapshot' => $normalizedSnapshot,
                'version' => $version,
                'seed' => $this->sortRecursive($seed),
            ]);
        }

        return [
            'client_submission_id' => $submissionId,
            'pricing_signature' => $signature,
            'pricing_snapshot_version' => $version,
            'pricing_snapshot' => $normalizedSnapshot,
        ];
    }

    public function snapshotFromPackages($packages, ?array $billingData = null): array
    {
        // Preserva Eloquent\Collection per non perdere loadMissing() usato nel calcolo subtotal.
        $collection = $packages instanceof \Illuminate\Database\Eloquent\Collection
            ? $packages
            : \Illuminate\Database\Eloquent\Collection::make($packages);
        $firstPackage = $collection->first();
        $service = $firstPackage?->service;
        $serviceData = is_array($service?->service_data) ? $service->service_data : [];
        $deliveryMode = (string) ($serviceData['delivery_mode'] ?? 'home');
        $selectedPudo = $deliveryMode === 'pudo' ? ($serviceData['pudo'] ?? null) : null;
        $groupSnapshots = $this->buildPackageGroupSnapshotsFromModels($collection);

        return $this->baseSnapshot(
            $collection->map(function ($package) {
                return [
                    'package_type' => (string) ($package->package_type ?? ''),
                    'quantity' => (int) ($package->quantity ?? 1),
                    'weight' => (string) ($package->weight ?? ''),
                    'first_size' => (string) ($package->first_size ?? ''),
                    'second_size' => (string) ($package->second_size ?? ''),
                    'third_size' => (string) ($package->third_size ?? ''),
                    'single_price_cents' => (int) ($package->single_price ?? 0),
                ];
            })->all(),
            [
                'origin' => $this->compactAddress($firstPackage?->originAddress?->toArray() ?? []),
                'destination' => $this->compactAddress(
                    $deliveryMode === 'pudo' && is_array($selectedPudo)
                        ? $selectedPudo
                        : ($firstPackage?->destinationAddress?->toArray() ?? [])
                ),
            ],
            [
                'service_type' => (string) ($service?->service_type ?? 'Nessuno'),
                'selected' => $this->normalizeServiceTypeList((string) ($service?->service_type ?? 'Nessuno')),
                'service_payload' => $this->compactServiceData($serviceData),
            ],
            (int) app(CartService::class)::subtotalFromModels($collection)->amount(),
            $billingData,
            $groupSnapshots,
        );
    }

    public function snapshotFromDirectOrderPayload(array $data, int $subtotalCents): array
    {
        $services = is_array($data['services'] ?? null) ? $data['services'] : [];
        $serviceData = $services['service_data'] ?? $services['serviceData'] ?? [];
        $deliveryMode = (string) ($data['delivery_mode'] ?? ($serviceData['delivery_mode'] ?? 'home'));
        $selectedPudo = $data['selected_pudo'] ?? $data['pudo'] ?? ($serviceData['pudo'] ?? null);

        return $this->baseSnapshot(
            collect($data['packages'] ?? [])->map(function (array $package) {
                return [
                    'package_type' => (string) ($package['package_type'] ?? ''),
                    'quantity' => (int) ($package['quantity'] ?? 1),
                    'weight' => (string) ($package['weight'] ?? ''),
                    'first_size' => (string) ($package['first_size'] ?? ''),
                    'second_size' => (string) ($package['second_size'] ?? ''),
                    'third_size' => (string) ($package['third_size'] ?? ''),
                    'single_price_cents' => (int) ($package['single_price_cents'] ?? 0),
                ];
            })->all(),
            [
                'origin' => $this->compactAddress($data['origin_address'] ?? []),
                'destination' => $this->compactAddress(
                    $deliveryMode === 'pudo' && is_array($selectedPudo)
                        ? $selectedPudo
                        : ($data['destination_address'] ?? [])
                ),
            ],
            [
                'service_type' => (string) ($services['service_type'] ?? 'Nessuno'),
                'selected' => $this->normalizeServiceTypeList((string) ($services['service_type'] ?? 'Nessuno')),
                'service_payload' => $this->compactServiceData(is_array($serviceData) ? $serviceData : []),
            ],
            $subtotalCents,
            $data['billing_data'] ?? null,
            [[
                'group_key' => 'direct-order',
                'packages' => collect($data['packages'] ?? [])->map(function (array $package) {
                    return [
                        'package_type' => (string) ($package['package_type'] ?? ''),
                        'quantity' => (int) ($package['quantity'] ?? 1),
                        'weight' => (string) ($package['weight'] ?? ''),
                        'first_size' => (string) ($package['first_size'] ?? ''),
                        'second_size' => (string) ($package['second_size'] ?? ''),
                        'third_size' => (string) ($package['third_size'] ?? ''),
                        'single_price_cents' => (int) ($package['single_price_cents'] ?? 0),
                    ];
                })->all(),
                'route' => [
                    'origin' => $this->compactAddress($data['origin_address'] ?? []),
                    'destination' => $this->compactAddress(
                        $deliveryMode === 'pudo' && is_array($selectedPudo)
                            ? $selectedPudo
                            : ($data['destination_address'] ?? [])
                    ),
                ],
                'services' => [
                    'service_type' => (string) ($services['service_type'] ?? 'Nessuno'),
                    'selected' => $this->normalizeServiceTypeList((string) ($services['service_type'] ?? 'Nessuno')),
                    'service_payload' => $this->compactServiceData(is_array($serviceData) ? $serviceData : []),
                ],
                'subtotal_cents' => $subtotalCents,
            ]],
        );
    }

    private function baseSnapshot(array $packages, array $route, array $services, int $subtotalCents, ?array $billingData, array $groups = []): array
    {
        $servicePayload = $services['service_payload'] ?? $services['service_data'] ?? [];
        if (! is_array($servicePayload)) {
            $servicePayload = [];
        }

        if (array_key_exists('service_data', $services) && ! array_key_exists('service_payload', $services)) {
            $servicePayload = $this->compactServiceData($servicePayload);
        }

        return $this->sortRecursive([
            'total_cents' => $subtotalCents,
            'package_count' => collect($packages)->sum(fn (array $package) => (int) ($package['quantity'] ?? 1)),
            'packages' => $packages,
            'route' => $route,
            'services' => [
                'service_type' => (string) ($services['service_type'] ?? 'Nessuno'),
                'selected' => $this->normalizeServiceTypeList((string) ($services['service_type'] ?? 'Nessuno')),
                'service_payload' => $this->sortRecursive($servicePayload),
            ],
            'group_count' => max(1, count($groups)),
            'groups' => $groups !== [] ? $groups : [[
                'group_key' => 'single-group',
                'packages' => $packages,
                'route' => $route,
                'services' => [
                    'service_type' => (string) ($services['service_type'] ?? 'Nessuno'),
                    'selected' => $this->normalizeServiceTypeList((string) ($services['service_type'] ?? 'Nessuno')),
                    'service_payload' => $this->sortRecursive($servicePayload),
                ],
                'subtotal_cents' => $subtotalCents,
            ]],
            'billing_type' => is_array($billingData) ? ($billingData['type'] ?? null) : null,
        ]);
    }

    private function buildPackageGroupSnapshotsFromModels($packages): array
    {
        $servicePricing = app(ShipmentServicePricingService::class);
        $normalize = fn ($value) => mb_strtolower(trim((string) $value), 'UTF-8');
        $groups = [];

        foreach ($packages as $package) {
            $origin = $package->originAddress?->toArray() ?? [];
            $destination = $package->destinationAddress?->toArray() ?? [];
            $service = $package->service;
            $serviceData = is_array($service?->service_data) ? $service->service_data : [];
            $serviceType = (string) ($service?->service_type ?? 'Nessuno');
            $serviceSignature = $servicePricing->buildSelectionSignature(
                $serviceType,
                $serviceData,
                (bool) ($serviceData['sms_email_notification'] ?? false),
            );

            $key = md5(implode('::', [
                $this->compactAddressSignature($origin, $normalize),
                $this->compactAddressSignature($destination, $normalize),
                $normalize($serviceType),
                $serviceSignature,
            ]));

            if (! isset($groups[$key])) {
                $groups[$key] = [
                    'group_key' => $key,
                    'packages' => [],
                    'route' => [
                        'origin' => $this->compactAddress($origin),
                        'destination' => $this->compactAddress($destination),
                    ],
                    'services' => [
                        'service_type' => $serviceType,
                        'selected' => $this->normalizeServiceTypeList($serviceType),
                        'service_payload' => $this->compactServiceData($serviceData),
                    ],
                    'subtotal_cents' => 0,
                ];
            }

            $groups[$key]['packages'][] = [
                'package_type' => (string) ($package->package_type ?? ''),
                'quantity' => (int) ($package->quantity ?? 1),
                'weight' => (string) ($package->weight ?? ''),
                'first_size' => (string) ($package->first_size ?? ''),
                'second_size' => (string) ($package->second_size ?? ''),
                'third_size' => (string) ($package->third_size ?? ''),
                'single_price_cents' => (int) ($package->single_price ?? 0),
            ];
            $groups[$key]['subtotal_cents'] += (int) ($package->single_price ?? 0);
        }

        ksort($groups);

        return array_values($groups);
    }

    private function compactAddressSignature(array $address, callable $normalize): string
    {
        return implode('|', [
            $normalize($address['name'] ?? $address['full_name'] ?? ''),
            $normalize($address['address'] ?? ''),
            $normalize($address['address_number'] ?? ''),
            $normalize($address['city'] ?? ''),
            $normalize($address['postal_code'] ?? $address['zip_code'] ?? ''),
            $normalize($address['province'] ?? ''),
        ]);
    }

    private function compactServiceData(array $serviceData): array
    {
        $payload = [];

        $payload['delivery_mode'] = (string) ($serviceData['delivery_mode'] ?? 'home');
        $payload['sms_email_notification'] = (bool) ($serviceData['sms_email_notification'] ?? false);
        $payload['requires_manual_quote'] = (bool) ($serviceData['requires_manual_quote'] ?? false);

        if (isset($serviceData['pudo']) && is_array($serviceData['pudo'])) {
            $payload['pudo'] = $this->compactPudo($serviceData['pudo']);
        }

        $contrassegno = $serviceData['contrassegno'] ?? $serviceData['Contrassegno'] ?? null;
        if (is_array($contrassegno)) {
            $payload['contrassegno'] = $this->compactMonetaryServiceSection($contrassegno, [
                'importo',
                'modalita_incasso',
                'modalita_rimborso',
                'dettaglio_rimborso',
            ]);
        }

        $assicurazione = $serviceData['assicurazione'] ?? $serviceData['Assicurazione'] ?? null;
        if (is_array($assicurazione)) {
            $payload['assicurazione'] = $this->compactMonetarySection($assicurazione);
        }

        $flags = $this->compactServiceFlags($serviceData);
        if ($flags !== []) {
            $payload['flags'] = $flags;
        }

        return $this->sortRecursive($payload);
    }

    private function compactMonetaryServiceSection(array $section, array $allowedKeys): array
    {
        $payload = [];

        foreach ($allowedKeys as $key) {
            if (! array_key_exists($key, $section)) {
                continue;
            }

            $value = $section[$key];
            $payload[$key] = $key === 'importo'
                ? $this->normalizeCurrencyToCents($value)
                : trim((string) $value);
        }

        return $this->sortRecursive($payload);
    }

    private function compactMonetarySection(array $section): array
    {
        $payload = [];

        foreach ($section as $key => $value) {
            $payload[$key] = is_array($value)
                ? $this->compactMonetarySection($value)
                : $this->normalizeCurrencyToCents($value);
        }

        return $this->sortRecursive($payload);
    }

    private function compactServiceFlags(array $serviceData): array
    {
        $flagKeys = [
            'fuori_sagoma',
            'out_of_gauge',
            'oversized',
            'lato_superiore_130cm',
            'aste_tubi',
            'tubi',
            'tubo',
            'rod_tube',
        ];

        return collect($flagKeys)
            ->filter(fn (string $key) => ! empty($serviceData[$key]))
            ->values()
            ->all();
    }

    private function normalizeCurrencyToCents(mixed $value): int
    {
        if ($value === null || $value === '') {
            return 0;
        }

        if (is_numeric($value)) {
            return (int) round(((float) $value) * 100);
        }

        $normalized = preg_replace('/[€\s]/u', '', (string) $value) ?? '';
        $normalized = preg_replace('/\.(?=\d{3}(?:\D|$))/u', '', $normalized) ?? $normalized;
        $normalized = str_replace(',', '.', $normalized);

        return is_numeric($normalized) ? (int) round(((float) $normalized) * 100) : 0;
    }

    private function compactAddress(array $address): array
    {
        return [
            'name' => trim((string) ($address['name'] ?? $address['full_name'] ?? '')),
            'address' => trim((string) ($address['address'] ?? '')),
            'address_number' => trim((string) ($address['address_number'] ?? '')),
            'city' => trim((string) ($address['city'] ?? '')),
            'postal_code' => trim((string) ($address['postal_code'] ?? $address['zip_code'] ?? '')),
            'province' => trim((string) ($address['province'] ?? '')),
            'country' => trim((string) ($address['country'] ?? 'Italia')),
        ];
    }

    private function compactPudo(array $pudo): array
    {
        return [
            'pudo_id' => trim((string) ($pudo['pudo_id'] ?? '')),
            'name' => trim((string) ($pudo['name'] ?? '')),
            'address' => trim((string) ($pudo['address'] ?? '')),
            'city' => trim((string) ($pudo['city'] ?? '')),
            'zip_code' => trim((string) ($pudo['zip_code'] ?? $pudo['postal_code'] ?? '')),
        ];
    }

    private function normalizeServiceTypeList(string $serviceType): array
    {
        return collect(explode(',', $serviceType))
            ->map(fn (string $value) => trim($value))
            ->filter()
            ->values()
            ->all();
    }

    private function fingerprint(array $payload): string
    {
        return hash(
            'sha256',
            json_encode($this->sortRecursive($payload), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );
    }

    private function sortRecursive(mixed $value): mixed
    {
        if (! is_array($value)) {
            return $value;
        }

        if (array_is_list($value)) {
            return array_map(fn ($item) => $this->sortRecursive($item), $value);
        }

        ksort($value);

        foreach ($value as $key => $item) {
            $value[$key] = $this->sortRecursive($item);
        }

        return $value;
    }
}
