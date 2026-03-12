<?php

namespace App\Services;

use App\Models\PriceBand;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PriceEngineService
{
    private const SETTINGS_KEY_WEIGHT_BANDS = 'pricing_national_bands_weight';
    private const SETTINGS_KEY_VOLUME_BANDS = 'pricing_national_bands_volume';
    private const SETTINGS_KEY_EXTRA_RULES = 'pricing_national_extra_rules';
    private const SETTINGS_KEY_SUPPLEMENTS = 'pricing_national_supplements';
    private const SETTINGS_KEY_VERSION = 'pricing_national_version';

    private const EPSILON = 0.0000001;
    private const ALLOWED_APPLY_TO = ['origin', 'destination', 'both'];

    private const DEFAULT_WEIGHT_BANDS = [
        ['min_value' => 0, 'max_value' => 2, 'base_price' => 890, 'discount_price' => null, 'show_discount' => true],
        ['min_value' => 2, 'max_value' => 5, 'base_price' => 1190, 'discount_price' => null, 'show_discount' => true],
        ['min_value' => 5, 'max_value' => 10, 'base_price' => 1490, 'discount_price' => null, 'show_discount' => true],
        ['min_value' => 10, 'max_value' => 25, 'base_price' => 1990, 'discount_price' => null, 'show_discount' => true],
        ['min_value' => 25, 'max_value' => 50, 'base_price' => 2990, 'discount_price' => null, 'show_discount' => true],
        ['min_value' => 50, 'max_value' => 75, 'base_price' => 3990, 'discount_price' => null, 'show_discount' => true],
        ['min_value' => 75, 'max_value' => 100, 'base_price' => 4990, 'discount_price' => null, 'show_discount' => true],
    ];

    private const DEFAULT_VOLUME_BANDS = [
        ['min_value' => 0, 'max_value' => 0.010, 'base_price' => 890, 'discount_price' => null, 'show_discount' => true],
        ['min_value' => 0.010, 'max_value' => 0.020, 'base_price' => 1190, 'discount_price' => null, 'show_discount' => true],
        ['min_value' => 0.020, 'max_value' => 0.040, 'base_price' => 1490, 'discount_price' => null, 'show_discount' => true],
        ['min_value' => 0.040, 'max_value' => 0.100, 'base_price' => 1990, 'discount_price' => null, 'show_discount' => true],
        ['min_value' => 0.100, 'max_value' => 0.200, 'base_price' => 2990, 'discount_price' => null, 'show_discount' => true],
        ['min_value' => 0.200, 'max_value' => 0.300, 'base_price' => 3990, 'discount_price' => null, 'show_discount' => true],
        ['min_value' => 0.300, 'max_value' => 0.400, 'base_price' => 4990, 'discount_price' => null, 'show_discount' => true],
    ];

    private const DEFAULT_EXTRA_RULES = [
        'enabled' => true,
        'weight_start' => 101,
        'weight_step' => 50,
        'volume_start' => 0.401,
        'volume_step' => 0.200,
        'increment_cents' => 500,
        'increment_mode' => 'flat',
        'weight_increment_ladder' => [
            ['from_step' => 1, 'to_step' => null, 'increment_cents' => 500],
        ],
        'volume_increment_ladder' => [
            ['from_step' => 1, 'to_step' => null, 'increment_cents' => 500],
        ],
        'base_price_cents_mode' => 'last_band_effective',
        'base_price_cents_manual' => null,
        'weight_resolution' => 1,
        'volume_resolution' => 0.001,
    ];

    private const DEFAULT_SUPPLEMENTS = [
        [
            'prefix' => '90',
            'amount_cents' => 250,
            'apply_to' => 'both',
            'enabled' => true,
        ],
    ];

    private ?array $cachedConfig = null;

    public function getPricingConfig(): array
    {
        if ($this->cachedConfig !== null) {
            return $this->cachedConfig;
        }

        $weightBands = $this->decodeJsonSetting(self::SETTINGS_KEY_WEIGHT_BANDS);
        $volumeBands = $this->decodeJsonSetting(self::SETTINGS_KEY_VOLUME_BANDS);

        if (empty($weightBands)) {
            $weightBands = $this->loadBandsFromDatabase('weight');
        }
        if (empty($volumeBands)) {
            $volumeBands = $this->loadBandsFromDatabase('volume');
        }

        if (empty($weightBands)) {
            $weightBands = self::DEFAULT_WEIGHT_BANDS;
        }
        if (empty($volumeBands)) {
            $volumeBands = self::DEFAULT_VOLUME_BANDS;
        }

        $extraRules = $this->normalizeExtraRules($this->decodeJsonSetting(self::SETTINGS_KEY_EXTRA_RULES, self::DEFAULT_EXTRA_RULES));

        try {
            $normalizedWeightBands = $this->normalizeBands($weightBands, 'weight', (float) $extraRules['weight_resolution']);
        } catch (ValidationException $e) {
            $normalizedWeightBands = $this->normalizeBands(self::DEFAULT_WEIGHT_BANDS, 'weight', (float) self::DEFAULT_EXTRA_RULES['weight_resolution']);
        }

        try {
            $normalizedVolumeBands = $this->normalizeBands($volumeBands, 'volume', (float) $extraRules['volume_resolution']);
        } catch (ValidationException $e) {
            $normalizedVolumeBands = $this->normalizeBands(self::DEFAULT_VOLUME_BANDS, 'volume', (float) self::DEFAULT_EXTRA_RULES['volume_resolution']);
        }

        try {
            $this->validateExtraRulesAgainstBands($normalizedWeightBands, $normalizedVolumeBands, $extraRules);
        } catch (ValidationException $e) {
            $extraRules = $this->normalizeExtraRules(self::DEFAULT_EXTRA_RULES);
        }

        $supplements = $this->normalizeSupplements($this->decodeJsonSetting(self::SETTINGS_KEY_SUPPLEMENTS, self::DEFAULT_SUPPLEMENTS));

        $version = Setting::get(self::SETTINGS_KEY_VERSION);
        if (!$version) {
            $version = (string) time();
        }

        $this->cachedConfig = [
            'weight' => $normalizedWeightBands,
            'volume' => $normalizedVolumeBands,
            'extra_rules' => $extraRules,
            'supplements' => $supplements,
            'version' => $version,
        ];

        return $this->cachedConfig;
    }

    public function invalidateLocalCache(): void
    {
        $this->cachedConfig = null;
    }

    public function calculateBandPrice(string $type, float $value): float
    {
        return $this->calculateBandPriceCents($type, $value) / 100;
    }

    public function calculateBandPriceCents(string $type, float $value): int
    {
        $type = $type === 'volume' ? 'volume' : 'weight';
        $config = $this->getPricingConfig();
        $bands = $config[$type] ?? [];

        $band = $this->findMatchingBand($bands, $value);
        if ($band !== null) {
            return $this->effectivePriceCents($band);
        }

        $extraPrice = $this->calculateExtraPriceCents($type, $value, $bands, $config['extra_rules'] ?? self::DEFAULT_EXTRA_RULES);
        if ($extraPrice !== null) {
            return $extraPrice;
        }

        // Fallback estremo: ultima fascia disponibile o ultima fascia di default
        if (!empty($bands)) {
            return $this->effectivePriceCents(end($bands));
        }

        $fallbackBands = $type === 'weight' ? self::DEFAULT_WEIGHT_BANDS : self::DEFAULT_VOLUME_BANDS;
        return $this->effectivePriceCents(end($fallbackBands));
    }

    public function calculateCapSupplementCents(?string $originCap, ?string $destinationCap): int
    {
        $config = $this->getPricingConfig();
        $supplements = $config['supplements'] ?? [];

        $origin = preg_replace('/\D+/', '', (string) ($originCap ?? ''));
        $destination = preg_replace('/\D+/', '', (string) ($destinationCap ?? ''));

        $total = 0;

        foreach ($supplements as $rule) {
            if (!($rule['enabled'] ?? true)) {
                continue;
            }

            $prefix = preg_replace('/\D+/', '', (string) ($rule['prefix'] ?? ''));
            if ($prefix === '') {
                continue;
            }

            $amount = (int) ($rule['amount_cents'] ?? 0);
            if ($amount <= 0) {
                continue;
            }

            $applyTo = (string) ($rule['apply_to'] ?? 'both');

            if (($applyTo === 'origin' || $applyTo === 'both') && $origin !== '' && str_starts_with($origin, $prefix)) {
                $total += $amount;
            }

            if (($applyTo === 'destination' || $applyTo === 'both') && $destination !== '' && str_starts_with($destination, $prefix)) {
                $total += $amount;
            }
        }

        return $total;
    }

    public function calculateCapSupplement(?string $originCap, ?string $destinationCap): float
    {
        return $this->calculateCapSupplementCents($originCap, $destinationCap) / 100;
    }

    public function savePricingConfig(array $input): array
    {
        $normalizedExtraRules = $this->normalizeExtraRules($input['extra_rules'] ?? []);
        $normalizedWeight = $this->normalizeBands($input['weight'] ?? [], 'weight', (float) $normalizedExtraRules['weight_resolution']);
        $normalizedVolume = $this->normalizeBands($input['volume'] ?? [], 'volume', (float) $normalizedExtraRules['volume_resolution']);
        $this->validateExtraRulesAgainstBands($normalizedWeight, $normalizedVolume, $normalizedExtraRules);
        $normalizedSupplements = $this->normalizeSupplements($input['supplements'] ?? []);

        DB::transaction(function () use ($normalizedWeight, $normalizedVolume, $normalizedExtraRules, $normalizedSupplements): void {
            Setting::set(self::SETTINGS_KEY_WEIGHT_BANDS, json_encode($normalizedWeight, JSON_UNESCAPED_UNICODE));
            Setting::set(self::SETTINGS_KEY_VOLUME_BANDS, json_encode($normalizedVolume, JSON_UNESCAPED_UNICODE));
            Setting::set(self::SETTINGS_KEY_EXTRA_RULES, json_encode($normalizedExtraRules, JSON_UNESCAPED_UNICODE));
            Setting::set(self::SETTINGS_KEY_SUPPLEMENTS, json_encode($normalizedSupplements, JSON_UNESCAPED_UNICODE));
            Setting::set(self::SETTINGS_KEY_VERSION, (string) (int) round(microtime(true) * 1000));
        });

        $this->invalidateLocalCache();

        return $this->getPricingConfig();
    }

    public function clearPricingSettings(): void
    {
        DB::transaction(function (): void {
            Setting::set(self::SETTINGS_KEY_WEIGHT_BANDS, null);
            Setting::set(self::SETTINGS_KEY_VOLUME_BANDS, null);
            Setting::set(self::SETTINGS_KEY_EXTRA_RULES, null);
            Setting::set(self::SETTINGS_KEY_SUPPLEMENTS, null);
            Setting::set(self::SETTINGS_KEY_VERSION, (string) (int) round(microtime(true) * 1000));
        });

        $this->invalidateLocalCache();
    }

    private function findMatchingBand(array $bands, float $value): ?array
    {
        if (empty($bands)) {
            return null;
        }

        foreach ($bands as $idx => $band) {
            $min = (float) $band['min_value'];
            $max = (float) $band['max_value'];
            $lowerOk = $idx === 0 ? $value >= ($min - self::EPSILON) : $value > ($min + self::EPSILON);
            $upperOk = $value <= ($max + self::EPSILON);

            if ($lowerOk && $upperOk) {
                return $band;
            }
        }

        return null;
    }

    private function calculateExtraPriceCents(string $type, float $rawValue, array $bands, array $extraRules): ?int
    {
        if (!($extraRules['enabled'] ?? true)) {
            return null;
        }

        $start = (float) ($type === 'weight' ? ($extraRules['weight_start'] ?? 101) : ($extraRules['volume_start'] ?? 0.401));
        $step = (float) ($type === 'weight' ? ($extraRules['weight_step'] ?? 50) : ($extraRules['volume_step'] ?? 0.200));
        $resolution = (float) ($type === 'weight' ? ($extraRules['weight_resolution'] ?? 1) : ($extraRules['volume_resolution'] ?? 0.001));
        $increment = (int) ($extraRules['increment_cents'] ?? 500);

        if ($step <= 0 || $increment < 0 || $resolution <= 0) {
            return null;
        }

        $value = $this->ceilByResolution($rawValue, $resolution);

        if ($value + self::EPSILON < $start) {
            return null;
        }

        $baseMode = (string) ($extraRules['base_price_cents_mode'] ?? 'last_band_effective');
        if ($baseMode === 'manual') {
            $extraBaseCents = (int) ($extraRules['base_price_cents_manual'] ?? 0);
        } else {
            $lastBand = end($bands);
            if ($lastBand === false) {
                $fallbackBands = $type === 'weight' ? self::DEFAULT_WEIGHT_BANDS : self::DEFAULT_VOLUME_BANDS;
                $lastBand = end($fallbackBands);
            }
            $extraBaseCents = $this->effectivePriceCents($lastBand);
        }

        $stepsFromStart = (int) floor((($value - $start) + self::EPSILON) / $step);
        $bandNumber = max(0, $stepsFromStart) + 1;

        // Regola business corrente: incremento sempre fisso per ogni fascia extra.
        return $extraBaseCents + ($bandNumber * $increment);
    }

    private function normalizeBands(array $bands, string $type, float $resolution): array
    {
        if (empty($bands)) {
            throw ValidationException::withMessages([
                sprintf('%s_bands', $type) => sprintf('Devi configurare almeno una fascia %s.', $type),
            ]);
        }

        $normalized = [];

        foreach (array_values($bands) as $idx => $band) {
            $minValue = $this->normalizeDecimal($band['min_value'] ?? 0);
            $maxValue = $this->normalizeDecimal($band['max_value'] ?? 0);
            $basePrice = (int) ($band['base_price'] ?? 0);
            $discountPrice = isset($band['discount_price']) && $band['discount_price'] !== '' ? (int) $band['discount_price'] : null;
            $showDiscount = isset($band['show_discount']) ? (bool) $band['show_discount'] : true;

            $normalized[] = [
                'id' => (string) ($band['id'] ?? sprintf('%s-%d', $type, $idx + 1)),
                'type' => $type,
                'min_value' => $minValue,
                'max_value' => $maxValue,
                'base_price' => $basePrice,
                'discount_price' => $discountPrice,
                'show_discount' => $showDiscount,
                'sort_order' => (int) ($band['sort_order'] ?? ($idx + 1)),
            ];
        }

        usort($normalized, function (array $a, array $b) {
            if ($a['min_value'] === $b['min_value']) {
                return $a['max_value'] <=> $b['max_value'];
            }
            return $a['min_value'] <=> $b['min_value'];
        });

        foreach ($normalized as $index => &$band) {
            $band['sort_order'] = $index + 1;
        }
        unset($band);

        $errors = [];
        $safeResolution = $resolution > 0 ? $resolution : ($type === 'weight' ? 1.0 : 0.001);

        foreach ($normalized as $idx => $band) {
            $rowNum = $idx + 1;
            $min = (float) $band['min_value'];
            $max = (float) $band['max_value'];
            $base = (int) $band['base_price'];
            $discount = $band['discount_price'] !== null ? (int) $band['discount_price'] : null;

            if ($min < 0 || $max <= 0) {
                $errors[sprintf('%s.%d.range', $type, $idx)] = sprintf('Fascia %s #%d: min/max devono essere positivi.', $type, $rowNum);
            }

            if ($max <= $min) {
                $errors[sprintf('%s.%d.max_value', $type, $idx)] = sprintf('Fascia %s #%d: max deve essere maggiore di min.', $type, $rowNum);
            }

            if ($base < 0) {
                $errors[sprintf('%s.%d.base_price', $type, $idx)] = sprintf('Fascia %s #%d: prezzo base non valido.', $type, $rowNum);
            }

            if ($discount !== null && $discount < 0) {
                $errors[sprintf('%s.%d.discount_price', $type, $idx)] = sprintf('Fascia %s #%d: prezzo scontato non valido.', $type, $rowNum);
            }

            if ($discount !== null && $discount > $base) {
                $errors[sprintf('%s.%d.discount_price', $type, $idx)] = sprintf('Fascia %s #%d: prezzo scontato non può superare il prezzo base.', $type, $rowNum);
            }

            if ($idx === 0) {
                continue;
            }

            $prev = $normalized[$idx - 1];
            $prevMax = (float) $prev['max_value'];

            if ($min < ($prevMax - self::EPSILON)) {
                $errors[sprintf('%s.%d.overlap', $type, $idx)] = sprintf('Fascia %s #%d: range sovrapposto con la fascia precedente.', $type, $rowNum);
            }

            if ($min > ($prevMax + $safeResolution + self::EPSILON)) {
                $errors[sprintf('%s.%d.gap', $type, $idx)] = sprintf('Fascia %s #%d: gap incoerente con risoluzione %s.', $type, $rowNum, $safeResolution);
            }
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages($errors);
        }

        return $normalized;
    }

    private function normalizeExtraRules(array $rules): array
    {
        $merged = array_merge(self::DEFAULT_EXTRA_RULES, $rules);

        $weightLadder = $this->normalizeIncrementLadder(
            is_array($merged['weight_increment_ladder'] ?? null) ? $merged['weight_increment_ladder'] : [],
            (int) ($merged['increment_cents'] ?? 500)
        );
        $volumeLadder = $this->normalizeIncrementLadder(
            is_array($merged['volume_increment_ladder'] ?? null) ? $merged['volume_increment_ladder'] : [],
            (int) ($merged['increment_cents'] ?? 500)
        );

        return [
            'enabled' => (bool) ($merged['enabled'] ?? true),
            'weight_start' => $this->normalizeDecimal($merged['weight_start'] ?? 101),
            'weight_step' => $this->normalizeDecimal($merged['weight_step'] ?? 50),
            'volume_start' => $this->normalizeDecimal($merged['volume_start'] ?? 0.401),
            'volume_step' => $this->normalizeDecimal($merged['volume_step'] ?? 0.200),
            'increment_cents' => (int) ($merged['increment_cents'] ?? 500),
            'increment_mode' => 'flat',
            'weight_increment_ladder' => $weightLadder,
            'volume_increment_ladder' => $volumeLadder,
            'base_price_cents_mode' => ($merged['base_price_cents_mode'] ?? 'last_band_effective') === 'manual' ? 'manual' : 'last_band_effective',
            'base_price_cents_manual' => isset($merged['base_price_cents_manual']) && $merged['base_price_cents_manual'] !== '' ? (int) $merged['base_price_cents_manual'] : null,
            'weight_resolution' => $this->normalizeDecimal($merged['weight_resolution'] ?? 1),
            'volume_resolution' => $this->normalizeDecimal($merged['volume_resolution'] ?? 0.001),
        ];
    }

    private function normalizeSupplements(array $supplements): array
    {
        if (empty($supplements)) {
            return [];
        }

        $normalized = [];
        foreach (array_values($supplements) as $idx => $rule) {
            $applyTo = (string) ($rule['apply_to'] ?? 'both');
            if (!in_array($applyTo, self::ALLOWED_APPLY_TO, true)) {
                $applyTo = 'both';
            }

            $normalized[] = [
                'id' => (string) ($rule['id'] ?? sprintf('supplement-%d', $idx + 1)),
                'prefix' => preg_replace('/\D+/', '', (string) ($rule['prefix'] ?? '')),
                'amount_cents' => (int) ($rule['amount_cents'] ?? 0),
                'apply_to' => $applyTo,
                'enabled' => isset($rule['enabled']) ? (bool) $rule['enabled'] : true,
            ];
        }

        return array_values(array_filter($normalized, function (array $rule) {
            return $rule['prefix'] !== '' && $rule['amount_cents'] >= 0;
        }));
    }

    private function validateExtraRulesAgainstBands(array $weightBands, array $volumeBands, array $extraRules): void
    {
        $errors = [];

        $weightStep = (float) ($extraRules['weight_step'] ?? 0);
        $volumeStep = (float) ($extraRules['volume_step'] ?? 0);
        $weightResolution = (float) ($extraRules['weight_resolution'] ?? 0);
        $volumeResolution = (float) ($extraRules['volume_resolution'] ?? 0);
        $increment = (int) ($extraRules['increment_cents'] ?? -1);
        $baseMode = (string) ($extraRules['base_price_cents_mode'] ?? 'last_band_effective');
        $baseManual = $extraRules['base_price_cents_manual'] ?? null;

        if ($weightStep <= 0) {
            $errors['extra_rules.weight_step'] = 'weight_step deve essere > 0.';
        }
        if ($volumeStep <= 0) {
            $errors['extra_rules.volume_step'] = 'volume_step deve essere > 0.';
        }
        if ($weightResolution <= 0) {
            $errors['extra_rules.weight_resolution'] = 'weight_resolution deve essere > 0.';
        }
        if ($volumeResolution <= 0) {
            $errors['extra_rules.volume_resolution'] = 'volume_resolution deve essere > 0.';
        }
        if ($increment < 0) {
            $errors['extra_rules.increment_cents'] = 'increment_cents non può essere negativo.';
        }
        if ($baseMode === 'manual' && (!is_int($baseManual) || $baseManual < 0)) {
            $errors['extra_rules.base_price_cents_manual'] = 'base_price_cents_manual è obbligatorio e non negativo in modalità manual.';
        }

        $lastWeight = end($weightBands);
        $lastVolume = end($volumeBands);
        $lastWeightMax = $lastWeight !== false ? (float) $lastWeight['max_value'] : 0;
        $lastVolumeMax = $lastVolume !== false ? (float) $lastVolume['max_value'] : 0;

        $weightStart = (float) ($extraRules['weight_start'] ?? 0);
        $volumeStart = (float) ($extraRules['volume_start'] ?? 0);

        if ($weightStart <= ($lastWeightMax + self::EPSILON)) {
            $errors['extra_rules.weight_start'] = sprintf('weight_start deve essere oltre l\'ultima fascia peso (%s).', $lastWeightMax);
        }
        if ($volumeStart <= ($lastVolumeMax + self::EPSILON)) {
            $errors['extra_rules.volume_start'] = sprintf('volume_start deve essere oltre l\'ultima fascia volume (%s).', $lastVolumeMax);
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function normalizeIncrementLadder(array $ladder, int $fallbackIncrement): array
    {
        $rows = [];
        foreach (array_values($ladder) as $idx => $row) {
            $from = max(1, (int) ($row['from_step'] ?? ($idx + 1)));
            $toRaw = $row['to_step'] ?? null;
            $to = ($toRaw === null || $toRaw === '') ? null : max($from, (int) $toRaw);
            $increment = max(0, (int) ($row['increment_cents'] ?? $fallbackIncrement));
            $rows[] = [
                'from_step' => $from,
                'to_step' => $to,
                'increment_cents' => $increment,
            ];
        }

        if (empty($rows)) {
            return [
                ['from_step' => 1, 'to_step' => null, 'increment_cents' => max(0, $fallbackIncrement)],
            ];
        }

        usort($rows, function (array $a, array $b) {
            return $a['from_step'] <=> $b['from_step'];
        });

        // Garantisce estensione all'infinito: l'ultima riga diventa open-ended.
        $lastIdx = count($rows) - 1;
        $rows[$lastIdx]['to_step'] = null;

        return $rows;
    }

    private function validateIncrementLadder(array $ladder, string $pathPrefix): array
    {
        $errors = [];

        if (empty($ladder)) {
            $errors[$pathPrefix] = 'Devi configurare almeno uno scaglione di incremento.';
            return $errors;
        }

        $expectedFrom = 1;
        foreach (array_values($ladder) as $idx => $row) {
            $from = (int) ($row['from_step'] ?? 0);
            $toRaw = $row['to_step'] ?? null;
            $to = ($toRaw === null || $toRaw === '') ? null : (int) $toRaw;
            $increment = (int) ($row['increment_cents'] ?? -1);

            if ($from < 1) {
                $errors[sprintf('%s.%d.from_step', $pathPrefix, $idx)] = 'from_step deve essere >= 1.';
                continue;
            }
            if ($increment < 0) {
                $errors[sprintf('%s.%d.increment_cents', $pathPrefix, $idx)] = 'increment_cents non può essere negativo.';
            }
            if ($from !== $expectedFrom) {
                $errors[sprintf('%s.%d.from_step', $pathPrefix, $idx)] = sprintf('Lo scaglione deve partire da step %d.', $expectedFrom);
            }

            if ($to === null) {
                if ($idx !== count($ladder) - 1) {
                    $errors[sprintf('%s.%d.to_step', $pathPrefix, $idx)] = 'Solo l\'ultimo scaglione può essere aperto (∞).';
                }
                $expectedFrom = PHP_INT_MAX;
                continue;
            }

            if ($to < $from) {
                $errors[sprintf('%s.%d.to_step', $pathPrefix, $idx)] = 'to_step deve essere >= from_step.';
                continue;
            }

            $expectedFrom = $to + 1;
        }

        $last = end($ladder);
        if ($last !== false) {
            $lastTo = $last['to_step'] ?? null;
            if ($lastTo !== null && $lastTo !== '') {
                $errors[sprintf('%s.%d.to_step', $pathPrefix, count($ladder) - 1)] = 'L\'ultimo scaglione deve essere aperto (∞).';
            }
        }

        return $errors;
    }

    private function calculateCumulativeIncrementFromLadder(int $bandNumber, array $ladder, int $fallbackIncrement): int
    {
        if ($bandNumber <= 0) {
            return 0;
        }

        $total = 0;
        foreach ($ladder as $row) {
            $from = max(1, (int) ($row['from_step'] ?? 1));
            $toRaw = $row['to_step'] ?? null;
            $to = ($toRaw === null || $toRaw === '') ? PHP_INT_MAX : max($from, (int) $toRaw);
            $increment = max(0, (int) ($row['increment_cents'] ?? $fallbackIncrement));

            if ($bandNumber < $from) {
                break;
            }

            $coveredTo = min($bandNumber, $to);
            if ($coveredTo >= $from) {
                $count = ($coveredTo - $from) + 1;
                $total += $count * $increment;
            }

            if ($coveredTo >= $bandNumber) {
                return $total;
            }
        }

        // Fallback di sicurezza nel caso in cui la ladder non copra fino a bandNumber.
        $lastCovered = 0;
        if (!empty($ladder)) {
            $lastRow = end($ladder);
            if ($lastRow !== false) {
                $lastToRaw = $lastRow['to_step'] ?? null;
                $lastCovered = ($lastToRaw === null || $lastToRaw === '') ? $bandNumber : (int) $lastToRaw;
            }
        }
        if ($bandNumber > $lastCovered) {
            $total += ($bandNumber - $lastCovered) * max(0, $fallbackIncrement);
        }

        return $total;
    }

    private function decodeJsonSetting(string $key, ?array $default = []): array
    {
        $raw = Setting::get($key);
        if ($raw === null || $raw === '') {
            return $default ?? [];
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : ($default ?? []);
    }

    private function loadBandsFromDatabase(string $type): array
    {
        $rows = PriceBand::where('type', $type)
            ->orderBy('sort_order')
            ->orderBy('min_value')
            ->get();

        if ($rows->isEmpty()) {
            return [];
        }

        return $rows->map(function (PriceBand $band) {
            return [
                'id' => (string) $band->id,
                'type' => $band->type,
                'min_value' => (float) $band->min_value,
                'max_value' => (float) $band->max_value,
                'base_price' => (int) $band->base_price,
                'discount_price' => $band->discount_price !== null ? (int) $band->discount_price : null,
                'show_discount' => (bool) ($band->show_discount ?? true),
                'sort_order' => (int) ($band->sort_order ?? 0),
            ];
        })->all();
    }

    private function effectivePriceCents(array $band): int
    {
        if (isset($band['discount_price']) && $band['discount_price'] !== null && (int) $band['discount_price'] >= 0) {
            return (int) $band['discount_price'];
        }

        return (int) ($band['base_price'] ?? 0);
    }

    private function ceilByResolution(float $value, float $resolution): float
    {
        if ($resolution <= 0) {
            return $value;
        }

        $multiplier = 1 / $resolution;
        $rounded = ceil(($value * $multiplier) - self::EPSILON) / $multiplier;
        return $this->normalizeDecimal($rounded);
    }

    private function normalizeDecimal($value): float
    {
        $num = (float) $value;
        return (float) number_format($num, 4, '.', '');
    }
}
