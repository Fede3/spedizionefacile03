<?php

namespace App\Services;

use App\Models\Setting;

class ShipmentServicePricingService
{
    private const SETTINGS_KEY_CONFIG = 'pricing_service_rules';

    private const SETTINGS_KEY_VERSION = 'pricing_service_rules_version';

    /** Default config loaded from config/pricing_service_rules.php */
    private static ?array $defaultConfigCache = null;

    private static function getDefaultConfig(): array
    {
        return self::$defaultConfigCache ??= config('pricing_service_rules');
    }

    private ?array $cachedConfig = null;

    public function getPricingConfig(): array
    {
        if ($this->cachedConfig !== null) {
            return $this->cachedConfig;
        }

        $raw = Setting::get(self::SETTINGS_KEY_CONFIG);
        $decoded = $raw ? json_decode($raw, true) : null;
        $normalized = $this->normalizeConfig(is_array($decoded) ? $decoded : self::getDefaultConfig());
        $normalized['version'] = Setting::get(self::SETTINGS_KEY_VERSION) ?: (string) time();

        $this->cachedConfig = $normalized;

        return $this->cachedConfig;
    }

    public function savePricingConfig(array $config): array
    {
        $normalized = $this->normalizeConfig($config);
        $version = (string) time();

        Setting::set(self::SETTINGS_KEY_CONFIG, json_encode($normalized, JSON_UNESCAPED_UNICODE));
        Setting::set(self::SETTINGS_KEY_VERSION, $version);

        $this->cachedConfig = null;

        return $this->getPricingConfig();
    }

    public function invalidateLocalCache(): void
    {
        $this->cachedConfig = null;
    }

    public function calculateSurchargeBreakdown(array|string|null $serviceType = null, array $serviceData = [], bool $smsEmailNotification = false, array $context = []): array
    {
        $config = $this->getPricingConfig();
        $selected = $this->normalizeSelectedServices($serviceType);
        $items = [];

        $servicePricing = $config['service_pricing'] ?? [];

        if (in_array('senza_etichetta', $selected, true) && ($servicePricing['senza_etichetta']['enabled'] ?? false)) {
            $items[] = $this->buildFixedItem('senza_etichetta', $servicePricing['senza_etichetta'], (int) ($servicePricing['senza_etichetta']['price_cents'] ?? 0), false);
        }

        if (in_array('sponda_idraulica', $selected, true) && ($servicePricing['sponda_idraulica']['enabled'] ?? false)) {
            $items[] = $this->buildFixedItem('sponda_idraulica', $servicePricing['sponda_idraulica'], (int) ($servicePricing['sponda_idraulica']['price_cents'] ?? 0), false);
        }

        if (in_array('contrassegno', $selected, true) && ($servicePricing['contrassegno']['enabled'] ?? false)) {
            $amount = $this->extractContrassegnoAmount($serviceData);
            $fee = $this->calculateThresholdFeeCents($amount, $servicePricing['contrassegno']);
            if ($fee > 0) {
                $items[] = $this->buildFixedItem('contrassegno', $servicePricing['contrassegno'], $fee, false);
            }
        }

        if (in_array('assicurazione', $selected, true) && ($servicePricing['assicurazione']['enabled'] ?? false)) {
            $amount = $this->extractAssicurazioneAmount($serviceData);
            $fee = $this->calculateThresholdFeeCents($amount, $servicePricing['assicurazione']);
            if ($fee > 0) {
                $items[] = $this->buildFixedItem('assicurazione', $servicePricing['assicurazione'], $fee, false);
            }
        }

        $notificationsEnabled = $smsEmailNotification
            || (bool) ($serviceData['sms_email_notification'] ?? $serviceData['smsEmailNotification'] ?? false);

        if ($notificationsEnabled && ($servicePricing['notifications']['enabled'] ?? false)) {
            $items[] = $this->buildFixedItem('notifications', $servicePricing['notifications'], (int) ($servicePricing['notifications']['price_cents'] ?? 0), false);
        }

        $items = array_merge($items, $this->calculateAutomaticSupplementItems($config['automatic_supplements'] ?? [], $serviceData, $context));

        $totalCents = array_sum(array_map(static fn (array $item) => (int) ($item['amount_cents'] ?? 0), $items));

        return [
            'total_cents' => (int) $totalCents,
            'items' => array_values($items),
        ];
    }

    public function calculateSurchargeCents(array|string|null $serviceType = null, array $serviceData = [], bool $smsEmailNotification = false, array $context = []): int
    {
        return (int) ($this->calculateSurchargeBreakdown($serviceType, $serviceData, $smsEmailNotification, $context)['total_cents'] ?? 0);
    }

    public function buildSelectionSignature(array|string|null $serviceType = null, array $serviceData = [], bool $smsEmailNotification = false): string
    {
        $payload = [
            'selected' => $this->normalizeSelectedServices($serviceType),
            'service_data' => $this->sortRecursive($serviceData),
            'sms_email_notification' => $smsEmailNotification
                || (bool) ($serviceData['sms_email_notification'] ?? $serviceData['smsEmailNotification'] ?? false),
        ];

        return md5(json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    public function extractContrassegnoAmount(array $serviceData = []): float
    {
        $contrassegno = $serviceData['contrassegno'] ?? $serviceData['Contrassegno'] ?? [];
        return $this->parseCurrencyAmount($contrassegno['importo'] ?? null);
    }

    public function extractAssicurazioneAmount(array $serviceData = []): float
    {
        $assicurazione = $serviceData['assicurazione'] ?? $serviceData['Assicurazione'] ?? [];
        if (! is_array($assicurazione)) {
            return 0.0;
        }

        return array_reduce(
            array_values($assicurazione),
            fn (float $sum, mixed $value) => $sum + $this->parseCurrencyAmount($value),
            0.0
        );
    }

    public function normalizeSelectedServices(array|string|null $serviceType = null): array
    {
        $items = is_array($serviceType)
            ? $serviceType
            : explode(',', (string) ($serviceType ?? ''));

        $normalized = [];
        foreach ($items as $item) {
            $key = $this->normalizeServiceKey($item);
            if ($key !== '' && ! in_array($key, $normalized, true)) {
                $normalized[] = $key;
            }
        }

        return $normalized;
    }

    public function normalizeServiceKey(mixed $value): string
    {
        $raw = mb_strtolower(trim((string) ($value ?? '')), 'UTF-8');
        if ($raw === '' || $raw === 'nessuno') {
            return '';
        }

        $normalized = str_replace(
            ['à', 'è', 'é', 'ì', 'ò', 'ù'],
            ['a', 'e', 'e', 'i', 'o', 'u'],
            $raw
        );

        if (str_contains($normalized, 'senza') && str_contains($normalized, 'etichetta')) {
            return 'senza_etichetta';
        }
        if (str_contains($normalized, 'contrassegno')) {
            return 'contrassegno';
        }
        if (str_contains($normalized, 'assicurazione')) {
            return 'assicurazione';
        }
        if (str_contains($normalized, 'sponda')) {
            return 'sponda_idraulica';
        }
        if (str_contains($normalized, 'notifiche') || str_contains($normalized, 'sms')) {
            return 'sms_email_notification';
        }

        $sanitized = preg_replace('/[^a-z0-9]+/u', '_', $normalized) ?? '';
        return trim($sanitized, '_');
    }

    private function normalizeConfig(array $config): array
    {
        return [
            'service_pricing' => $this->normalizeServicePricing($config['service_pricing'] ?? []),
            'automatic_supplements' => $this->normalizeAutomaticSupplements($config['automatic_supplements'] ?? []),
            'operational_fees' => $this->normalizeOperationalFees($config['operational_fees'] ?? []),
        ];
    }

    private function normalizeServicePricing(array $config): array
    {
        $defaults = self::getDefaultConfig()['service_pricing'];
        $normalized = [];

        foreach ($defaults as $key => $default) {
            $source = is_array($config[$key] ?? null) ? $config[$key] : [];
            $normalized[$key] = [
                'label' => trim((string) ($source['label'] ?? $default['label'])),
                'description' => trim((string) ($source['description'] ?? $default['description'])),
                'pricing_type' => in_array(($source['pricing_type'] ?? $default['pricing_type']), ['fixed', 'threshold_percentage'], true)
                    ? $source['pricing_type'] ?? $default['pricing_type']
                    : $default['pricing_type'],
                'price_cents' => max(0, (int) ($source['price_cents'] ?? $default['price_cents'] ?? 0)),
                'threshold_amount_eur' => round((float) ($source['threshold_amount_eur'] ?? $default['threshold_amount_eur'] ?? 0), 2),
                'min_fee_cents' => max(0, (int) ($source['min_fee_cents'] ?? $default['min_fee_cents'] ?? 0)),
                'percentage_rate' => round((float) ($source['percentage_rate'] ?? $default['percentage_rate'] ?? 0), 4),
                'enabled' => ($source['enabled'] ?? $default['enabled']) !== false,
                'application' => trim((string) ($source['application'] ?? $default['application'])),
                'note' => trim((string) ($source['note'] ?? $default['note'])),
            ];
        }

        return $normalized;
    }

    private function normalizeAutomaticSupplements(array $config): array
    {
        $defaults = self::getDefaultConfig()['automatic_supplements'];
        $normalized = [];

        foreach ($defaults as $key => $default) {
            $source = is_array($config[$key] ?? null) ? $config[$key] : [];
            $normalized[$key] = [
                'label' => trim((string) ($source['label'] ?? $default['label'])),
                'description' => trim((string) ($source['description'] ?? $default['description'])),
                'enabled' => ($source['enabled'] ?? $default['enabled']) !== false,
                'pricing_type' => trim((string) ($source['pricing_type'] ?? $default['pricing_type'])),
                'application' => trim((string) ($source['application'] ?? $default['application'])),
                'price_cents' => array_key_exists('price_cents', $default) || array_key_exists('price_cents', $source)
                    ? max(0, (int) ($source['price_cents'] ?? $default['price_cents'] ?? 0))
                    : null,
                'province_codes' => $this->normalizeStringList($source['province_codes'] ?? $default['province_codes'] ?? [], true),
                'country_codes' => $this->normalizeStringList($source['country_codes'] ?? $default['country_codes'] ?? [], true),
                'keyword_list' => $this->normalizeStringList($source['keyword_list'] ?? $default['keyword_list'] ?? []),
                'flag_keys' => $this->normalizeStringList($source['flag_keys'] ?? $default['flag_keys'] ?? []),
                'delivery_modes' => $this->normalizeStringList($source['delivery_modes'] ?? $default['delivery_modes'] ?? []),
                'tiers' => $this->normalizeTiers($source['tiers'] ?? $default['tiers'] ?? []),
                'max_weight_kg' => array_key_exists('max_weight_kg', $default) || array_key_exists('max_weight_kg', $source)
                    ? round((float) ($source['max_weight_kg'] ?? $default['max_weight_kg'] ?? 0), 2)
                    : null,
                'threshold_cm' => array_key_exists('threshold_cm', $default) || array_key_exists('threshold_cm', $source)
                    ? round((float) ($source['threshold_cm'] ?? $default['threshold_cm'] ?? 0), 2)
                    : null,
                'longest_side_threshold_cm' => array_key_exists('longest_side_threshold_cm', $default) || array_key_exists('longest_side_threshold_cm', $source)
                    ? round((float) ($source['longest_side_threshold_cm'] ?? $default['longest_side_threshold_cm'] ?? 0), 2)
                    : null,
                'girth_threshold_cm' => array_key_exists('girth_threshold_cm', $default) || array_key_exists('girth_threshold_cm', $source)
                    ? round((float) ($source['girth_threshold_cm'] ?? $default['girth_threshold_cm'] ?? 0), 2)
                    : null,
                'min_longest_side_cm' => array_key_exists('min_longest_side_cm', $default) || array_key_exists('min_longest_side_cm', $source)
                    ? round((float) ($source['min_longest_side_cm'] ?? $default['min_longest_side_cm'] ?? 0), 2)
                    : null,
                'max_secondary_side_cm' => array_key_exists('max_secondary_side_cm', $default) || array_key_exists('max_secondary_side_cm', $source)
                    ? round((float) ($source['max_secondary_side_cm'] ?? $default['max_secondary_side_cm'] ?? 0), 2)
                    : null,
                'note' => trim((string) ($source['note'] ?? $default['note'] ?? '')),
            ];
        }

        return $normalized;
    }

    private function normalizeOperationalFees(array $config): array
    {
        $defaults = self::getDefaultConfig()['operational_fees'];
        $normalized = [];

        foreach ($defaults as $key => $default) {
            $source = is_array($config[$key] ?? null) ? $config[$key] : [];
            $normalized[$key] = [
                'label' => trim((string) ($source['label'] ?? $default['label'])),
                'description' => trim((string) ($source['description'] ?? $default['description'])),
                'pricing_type' => 'fixed',
                'price_cents' => max(0, (int) ($source['price_cents'] ?? $default['price_cents'] ?? 0)),
                'enabled' => ($source['enabled'] ?? $default['enabled']) !== false,
                'application' => trim((string) ($source['application'] ?? $default['application'])),
                'note' => trim((string) ($source['note'] ?? $default['note'])),
            ];
        }

        return $normalized;
    }

    private function normalizeStringList(array $values, bool $uppercase = false): array
    {
        $normalized = [];
        foreach ($values as $value) {
            $item = trim((string) $value);
            if ($item === '') {
                continue;
            }
            $item = $uppercase ? strtoupper($item) : mb_strtolower($item, 'UTF-8');
            $normalized[$item] = true;
        }

        return array_values(array_keys($normalized));
    }

    private function normalizeTiers(array $tiers): array
    {
        $normalized = array_map(static function ($tier) {
            return [
                'up_to_kg' => ($tier['up_to_kg'] ?? null) === null || $tier['up_to_kg'] === ''
                    ? null
                    : round((float) $tier['up_to_kg'], 2),
                'price_cents' => max(0, (int) ($tier['price_cents'] ?? 0)),
            ];
        }, array_values(array_filter($tiers, static fn ($tier) => is_array($tier))));

        usort($normalized, static function (array $a, array $b) {
            $aWeight = $a['up_to_kg'] ?? INF;
            $bWeight = $b['up_to_kg'] ?? INF;
            return $aWeight <=> $bWeight;
        });

        return $normalized;
    }

    private function calculateThresholdFeeCents(float $amount, array $rule): int
    {
        if ($amount <= 0) {
            return 0;
        }

        $threshold = (float) ($rule['threshold_amount_eur'] ?? 300);
        $minimum = (int) ($rule['min_fee_cents'] ?? 0);
        $percentageRate = (float) ($rule['percentage_rate'] ?? 0);

        if ($amount <= $threshold) {
            return max(0, $minimum);
        }

        return (int) round($amount * 100 * ($percentageRate / 100));
    }

    private function calculateAutomaticSupplementItems(array $config, array $serviceData, array $context): array
    {
        $items = [];
        $packages = $this->normalizePackages($context['packages'] ?? []);
        $destination = $this->normalizeAddress($context['destination_address'] ?? []);
        $deliveryMode = mb_strtolower(trim((string) ($context['delivery_mode'] ?? 'home')), 'UTF-8');
        $requiresManualQuote = (bool) ($context['requires_manual_quote'] ?? false);

        if (($config['calabria_sardegna_sicilia']['enabled'] ?? false) && $this->matchesProvince($destination, $config['calabria_sardegna_sicilia']['province_codes'] ?? [])) {
            foreach ($packages as $package) {
                $fee = $this->findTierPriceCents($package['weight_kg'], $config['calabria_sardegna_sicilia']['tiers'] ?? []);
                if ($fee > 0) {
                    $items[] = $this->buildFixedItem('calabria_sardegna_sicilia', $config['calabria_sardegna_sicilia'], $fee * $package['quantity'], true);
                }
            }
        }

        if (($config['brt_point_csi']['enabled'] ?? false)
            && $deliveryMode === 'pudo'
            && $this->matchesProvince($destination, $config['brt_point_csi']['province_codes'] ?? [])) {
            $maxWeight = (float) ($config['brt_point_csi']['max_weight_kg'] ?? 0);
            $fee = (int) ($config['brt_point_csi']['price_cents'] ?? 0);
            foreach ($packages as $package) {
                if ($package['weight_kg'] > 0 && ($maxWeight <= 0 || $package['weight_kg'] <= $maxWeight) && $fee > 0) {
                    $items[] = $this->buildFixedItem('brt_point_csi', $config['brt_point_csi'], $fee * $package['quantity'], true);
                }
            }
        }

        if (($config['isole_minori_italia']['enabled'] ?? false) && $this->matchesMinorIsland($destination, $config['isole_minori_italia'])) {
            $items[] = $this->buildFixedItem('isole_minori_italia', $config['isole_minori_italia'], (int) ($config['isole_minori_italia']['price_cents'] ?? 0), true);
        }

        if (($config['isole_minori_europa']['enabled'] ?? false) && $this->matchesMinorIsland($destination, $config['isole_minori_europa'])) {
            $items[] = $this->buildFixedItem('isole_minori_europa', $config['isole_minori_europa'], (int) ($config['isole_minori_europa']['price_cents'] ?? 0), true);
        }

        if (($config['fuori_sagoma']['enabled'] ?? false)) {
            foreach ($packages as $package) {
                if (! $this->matchesOutOfGauge($package, $serviceData, $config['fuori_sagoma'])) {
                    continue;
                }
                $fee = $this->findTierPriceCents($package['weight_kg'], $config['fuori_sagoma']['tiers'] ?? []);
                if ($fee > 0) {
                    $items[] = $this->buildFixedItem('fuori_sagoma', $config['fuori_sagoma'], $fee * $package['quantity'], true);
                }
            }
        }

        if (($config['lato_superiore_130cm']['enabled'] ?? false)) {
            $threshold = (float) ($config['lato_superiore_130cm']['threshold_cm'] ?? 130);
            $fee = (int) ($config['lato_superiore_130cm']['price_cents'] ?? 0);
            foreach ($packages as $package) {
                if ($fee > 0 && $package['max_side_cm'] > $threshold) {
                    $items[] = $this->buildFixedItem('lato_superiore_130cm', $config['lato_superiore_130cm'], $fee * $package['quantity'], true);
                }
            }
        }

        if (($config['aste_tubi']['enabled'] ?? false)) {
            $fee = (int) ($config['aste_tubi']['price_cents'] ?? 0);
            foreach ($packages as $package) {
                if ($fee > 0 && $this->matchesRodsAndTubes($package, $serviceData, $config['aste_tubi'])) {
                    $items[] = $this->buildFixedItem('aste_tubi', $config['aste_tubi'], $fee * $package['quantity'], true);
                }
            }
        }

        if (($config['eu_manual_extra']['enabled'] ?? false) && $requiresManualQuote) {
            $items[] = $this->buildFixedItem('eu_manual_extra', $config['eu_manual_extra'], (int) ($config['eu_manual_extra']['price_cents'] ?? 0), true);
        }

        return array_values(array_filter($items, static fn (array $item) => (int) ($item['amount_cents'] ?? 0) > 0));
    }

    private function buildFixedItem(string $key, array $rule, int $amountCents, bool $automatic): array
    {
        return [
            'key' => $key,
            'label' => (string) ($rule['label'] ?? $key),
            'amount_cents' => max(0, $amountCents),
            'type' => $automatic ? 'automatic_supplement' : 'service',
            'automatic' => $automatic,
            'application' => (string) ($rule['application'] ?? ''),
        ];
    }

    private function findTierPriceCents(float $weightKg, array $tiers): int
    {
        foreach ($tiers as $tier) {
            $limit = $tier['up_to_kg'] ?? null;
            if ($limit === null || $weightKg <= (float) $limit) {
                return (int) ($tier['price_cents'] ?? 0);
            }
        }

        return 0;
    }

    private function normalizePackages(array $packages): array
    {
        return array_values(array_filter(array_map(function ($package) {
            if ($package instanceof \App\Models\Package) {
                $package = [
                    'package_type' => $package->package_type,
                    'quantity' => $package->quantity,
                    'weight' => $package->weight,
                    'first_size' => $package->first_size,
                    'second_size' => $package->second_size,
                    'third_size' => $package->third_size,
                ];
            }

            if (! is_array($package)) {
                return null;
            }

            $first = (float) ($package['first_size'] ?? 0);
            $second = (float) ($package['second_size'] ?? 0);
            $third = (float) ($package['third_size'] ?? 0);
            $weight = (float) ($package['weight'] ?? 0);
            $quantity = max(1, (int) ($package['quantity'] ?? 1));

            return [
                'package_type' => trim((string) ($package['package_type'] ?? '')),
                'weight_kg' => max(0, $weight),
                'quantity' => $quantity,
                'first_size_cm' => max(0, $first),
                'second_size_cm' => max(0, $second),
                'third_size_cm' => max(0, $third),
                'max_side_cm' => max($first, $second, $third),
                'secondary_side_sum_cm' => $this->secondarySideSum([$first, $second, $third]),
                'raw' => $package,
            ];
        }, $packages), static fn ($package) => is_array($package)));
    }

    private function secondarySideSum(array $dimensions): float
    {
        rsort($dimensions);
        return (float) (($dimensions[1] ?? 0) + ($dimensions[2] ?? 0));
    }

    private function normalizeAddress(array $address): array
    {
        return [
            'country' => strtoupper(trim((string) ($address['country'] ?? $address['country_code'] ?? 'IT'))),
            'province' => strtoupper(trim((string) ($address['province'] ?? ''))),
            'city' => mb_strtolower(trim((string) ($address['city'] ?? '')), 'UTF-8'),
            'address' => mb_strtolower(trim((string) ($address['address'] ?? '')), 'UTF-8'),
            'additional_information' => mb_strtolower(trim((string) ($address['additional_information'] ?? '')), 'UTF-8'),
        ];
    }

    private function matchesProvince(array $address, array $provinceCodes): bool
    {
        $province = strtoupper(trim((string) ($address['province'] ?? '')));
        if ($province === '') {
            return false;
        }

        return in_array($province, array_map('strtoupper', $provinceCodes), true);
    }

    private function matchesMinorIsland(array $address, array $rule): bool
    {
        $countryCodes = array_map('strtoupper', $rule['country_codes'] ?? []);
        if (! empty($countryCodes) && ! in_array(strtoupper($address['country'] ?? ''), $countryCodes, true)) {
            return false;
        }

        $haystack = trim(implode(' | ', array_filter([
            $address['city'] ?? '',
            $address['address'] ?? '',
            $address['additional_information'] ?? '',
        ])));

        if ($haystack === '') {
            return false;
        }

        foreach (($rule['keyword_list'] ?? []) as $keyword) {
            if ($keyword !== '' && str_contains($haystack, mb_strtolower((string) $keyword, 'UTF-8'))) {
                return true;
            }
        }

        return false;
    }

    private function matchesOutOfGauge(array $package, array $serviceData, array $rule): bool
    {
        if ($this->matchesAnyFlag($package['raw'], $serviceData, $rule['flag_keys'] ?? [])) {
            return true;
        }

        $longestThreshold = (float) ($rule['longest_side_threshold_cm'] ?? 0);
        $girthThreshold = (float) ($rule['girth_threshold_cm'] ?? 0);

        return ($longestThreshold > 0 && $package['max_side_cm'] > $longestThreshold)
            || ($girthThreshold > 0 && $package['secondary_side_sum_cm'] > $girthThreshold);
    }

    private function matchesRodsAndTubes(array $package, array $serviceData, array $rule): bool
    {
        if ($this->matchesAnyFlag($package['raw'], $serviceData, $rule['flag_keys'] ?? [])) {
            return true;
        }

        $minLongest = (float) ($rule['min_longest_side_cm'] ?? 0);
        $maxSecondary = (float) ($rule['max_secondary_side_cm'] ?? 0);

        return $package['max_side_cm'] >= $minLongest
            && $package['secondary_side_sum_cm'] > 0
            && $package['secondary_side_sum_cm'] <= ($maxSecondary * 2);
    }

    private function matchesAnyFlag(array $package, array $serviceData, array $flagKeys): bool
    {
        foreach ($flagKeys as $flagKey) {
            $snakeKey = trim((string) $flagKey);
            if ($snakeKey === '') {
                continue;
            }

            if (! empty($package[$snakeKey])) {
                return true;
            }

            if (! empty($serviceData[$snakeKey])) {
                return true;
            }
        }

        return false;
    }

    private function parseCurrencyAmount(mixed $value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }

        if (is_numeric($value)) {
            return (float) $value;
        }

        $normalized = preg_replace('/[€\s]/u', '', (string) $value) ?? '';
        $normalized = preg_replace('/\.(?=\d{3}(?:\D|$))/u', '', $normalized) ?? $normalized;
        $normalized = str_replace(',', '.', $normalized);

        return is_numeric($normalized) ? (float) $normalized : 0.0;
    }

    private function sortRecursive(array $value): array
    {
        foreach ($value as $key => $item) {
            if (is_array($item)) {
                $value[$key] = $this->sortRecursive($item);
            }
        }

        ksort($value);

        return $value;
    }
}
