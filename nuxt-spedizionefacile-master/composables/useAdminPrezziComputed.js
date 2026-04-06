/**
 * COMPOSABLE: useAdminPrezziComputed (useAdminPrezziComputed.js)
 * SCOPO: Computed properties e preview pricing per il pannello admin prezzi.
 *        Estratto da useAdminPrezzi.js per ridurre la complessita'.
 *
 * DOVE SI USA: Importato internamente da useAdminPrezzi.js — non usare direttamente.
 */

// ────────────────────────────────────────────────────────────
// Computed factory
// ────────────────────────────────────────────────────────────

/**
 * Crea tutte le computed properties per il pannello admin prezzi.
 * @param {Object} deps - Dipendenze iniettate dal composable principale.
 * @param {Object} deps.state - Stato reattivo da useAdminPrezziState.
 * @param {Function} deps.centsToEuro - Conversione centesimi -> stringa euro.
 * @param {Function} deps.buildPricingPayload - Builder del payload pricing completo.
 * @returns {Object} Oggetto con tutte le computed properties.
 */
export function useAdminPrezziComputed(deps) {
	const { state, centsToEuro, buildPricingPayload } = deps;

	const {
		weightBands, volumeBands, bandsFromDb,
		extraRules, supplementRules,
		originalWeightBands, originalVolumeBands,
		originalExtraRules, originalSupplementRules,
		europePricing, originalEuropePricing,
		servicePricing, automaticSupplements, operationalFees,
		originalServicePricing, originalAutomaticSupplements, originalOperationalFees,
		europeSearch, europeStatusFilter, europeBandFilter, europeSort,
		serviceSearch, serviceFilter,
	} = state;

	// ── Preview price calc (internal) ─────────────────
	const PREVIEW_EPSILON = 0.0000001;

	const effectivePriceCentsLocal = (band) => {
		if (!band) return 0;
		if (band.discount_price != null && Number(band.discount_price) >= 0) {
			return Number(band.discount_price);
		}
		return Number(band.base_price || 0);
	};

	const ceilByResolutionLocal = (value, resolution) => {
		const safeResolution = Number(resolution) > 0 ? Number(resolution) : 1;
		const multiplier = 1 / safeResolution;
		return Number((Math.ceil((Number(value) * multiplier) - PREVIEW_EPSILON) / multiplier).toFixed(4));
	};

	const findBandLocal = (bands, rawValue) => {
		const value = Number(rawValue);
		if (!Array.isArray(bands) || !bands.length || !Number.isFinite(value) || value <= 0) return null;
		for (let idx = 0; idx < bands.length; idx += 1) {
			const band = bands[idx];
			const min = Number(band.min_value);
			const max = Number(band.max_value);
			const lowerOk = idx === 0 ? value >= (min - PREVIEW_EPSILON) : value > (min + PREVIEW_EPSILON);
			const upperOk = value <= (max + PREVIEW_EPSILON);
			if (lowerOk && upperOk) return band;
		}
		return null;
	};

	const calculateExtraPriceCentsLocal = (type, rawValue) => {
		if (!extraRules.value?.enabled) return null;
		const isWeight = type === 'weight';
		const start = Number(isWeight ? extraRules.value.weight_start : extraRules.value.volume_start);
		const step = Number(isWeight ? extraRules.value.weight_step : extraRules.value.volume_step);
		const resolution = Number(isWeight ? extraRules.value.weight_resolution : extraRules.value.volume_resolution);
		const increment = Number(extraRules.value.increment_cents || 0);
		if (!Number.isFinite(start) || !Number.isFinite(step) || !Number.isFinite(resolution) || step <= 0 || resolution <= 0 || increment < 0) {
			return null;
		}
		const value = ceilByResolutionLocal(rawValue, resolution);
		if (value + PREVIEW_EPSILON < start) return null;
		let baseCents = 0;
		if (extraRules.value.base_price_cents_mode === 'manual') {
			baseCents = Number(extraRules.value.base_price_cents_manual || 0);
		} else {
			const sourceBands = isWeight ? weightBands.value : volumeBands.value;
			const lastBand = sourceBands[sourceBands.length - 1];
			baseCents = effectivePriceCentsLocal(lastBand);
		}
		const stepsFromStart = Math.floor(((value - start) + PREVIEW_EPSILON) / step);
		const bandNumber = Math.max(0, stepsFromStart) + 1;
		return Math.max(0, Math.round(baseCents + (bandNumber * increment)));
	};

	const calculateBandPriceCentsLocal = (type, rawValue) => {
		const bands = type === 'weight' ? weightBands.value : volumeBands.value;
		const band = findBandLocal(bands, rawValue);
		if (band) return effectivePriceCentsLocal(band);
		const extraPrice = calculateExtraPriceCentsLocal(type, rawValue);
		if (extraPrice !== null) return extraPrice;
		const lastBand = bands[bands.length - 1];
		return effectivePriceCentsLocal(lastBand);
	};

	// ── Computed ──────────────────────────────────────
	const toComparable = (obj) => JSON.stringify(obj);

	const hasChanges = computed(() => {
		const current = toComparable(buildPricingPayload());
		const original = toComparable({
			weight: originalWeightBands.value,
			volume: originalVolumeBands.value,
			extra_rules: originalExtraRules.value || extraRules.value,
			supplements: originalSupplementRules.value || supplementRules.value,
			europe: originalEuropePricing.value || europePricing.value,
			service_pricing: originalServicePricing.value || servicePricing.value,
			automatic_supplements: originalAutomaticSupplements.value || automaticSupplements.value,
			operational_fees: originalOperationalFees.value || operationalFees.value,
		});
		return !bandsFromDb.value || current !== original;
	});

	const servicePricingEntries = computed(() =>
		Object.entries(servicePricing.value || {}).map(([key, rule]) => ({ key, rule, section: 'service_pricing' })),
	);

	const automaticSupplementEntries = computed(() =>
		Object.entries(automaticSupplements.value || {}).map(([key, rule]) => ({ key, rule, section: 'automatic_supplements' })),
	);

	const operationalFeeEntries = computed(() =>
		Object.entries(operationalFees.value || {}).map(([key, rule]) => ({ key, rule, section: 'operational_fees' })),
	);

	const filteredServiceEntries = computed(() => {
		const search = serviceSearch.value.trim().toLowerCase();
		const activeFilter = serviceFilter.value;
		return [
			...(activeFilter === 'all' || activeFilter === 'service_pricing' ? servicePricingEntries.value : []),
			...(activeFilter === 'all' || activeFilter === 'automatic_supplements' ? automaticSupplementEntries.value : []),
			...(activeFilter === 'all' || activeFilter === 'operational_fees' ? operationalFeeEntries.value : []),
		].filter(({ rule }) => {
			if (!search) return true;
			return `${rule.label} ${rule.description} ${rule.note || ''}`.toLowerCase().includes(search);
		});
	});

	const europeBandFilters = computed(() => [
		{ value: 'all', label: 'Tutte le fasce' },
		...europePricing.value.bands.map((band) => ({ value: band.id, label: band.label })),
	]);

	const filteredEuropeBands = computed(() => {
		const search = europeSearch.value.trim().toLowerCase();
		const status = europeStatusFilter.value;
		const sortMode = europeSort.value;
		const selectedBand = europeBandFilter.value;

		const sortRates = (rates) => [...rates].sort((left, right) => {
			if (sortMode === 'price_asc') {
				return (left.price_cents ?? Number.POSITIVE_INFINITY) - (right.price_cents ?? Number.POSITIVE_INFINITY);
			}
			if (sortMode === 'price_desc') {
				return (right.price_cents ?? -1) - (left.price_cents ?? -1);
			}
			if (sortMode === 'status') {
				return Number(left.quote_required) - Number(right.quote_required);
			}
			return String(left.country_name || left.country_code).localeCompare(String(right.country_name || right.country_code), 'it');
		});

		return europePricing.value.bands
			.filter((band) => selectedBand === 'all' || band.id === selectedBand)
			.map((band) => {
				const rates = sortRates(band.rates.filter((rate) => {
					const matchesSearch = !search || `${rate.country_name} ${rate.country_code}`.toLowerCase().includes(search);
					const matchesStatus = status === 'all'
						|| (status === 'quote_required' && rate.quote_required)
						|| (status === 'active' && !rate.quote_required);
					return matchesSearch && matchesStatus;
				}));
				return {
					...band,
					rates,
					activeCount: rates.filter((rate) => !rate.quote_required).length,
					quoteCount: rates.filter((rate) => rate.quote_required).length,
				};
			})
			.filter((band) => band.rates.length > 0);
	});

	const extraRuleExamples = computed(() => {
		const firstWeightFrom = Number(extraRules.value.weight_start || 101);
		const firstWeightTo = Number((firstWeightFrom + Number(extraRules.value.weight_step || 50) - Number(extraRules.value.weight_resolution || 1)).toFixed(4));
		const secondWeightFrom = Number((firstWeightFrom + Number(extraRules.value.weight_step || 50)).toFixed(4));
		const secondWeightTo = Number((secondWeightFrom + Number(extraRules.value.weight_step || 50) - Number(extraRules.value.weight_resolution || 1)).toFixed(4));
		const firstVolumeFrom = Number(extraRules.value.volume_start || 0.401);
		const firstVolumeTo = Number((firstVolumeFrom + Number(extraRules.value.volume_step || 0.2) - Number(extraRules.value.volume_resolution || 0.001)).toFixed(4));
		const secondVolumeFrom = Number((firstVolumeFrom + Number(extraRules.value.volume_step || 0.2)).toFixed(4));
		const secondVolumeTo = Number((secondVolumeFrom + Number(extraRules.value.volume_step || 0.2) - Number(extraRules.value.volume_resolution || 0.001)).toFixed(4));
		return { firstWeightFrom, firstWeightTo, secondWeightFrom, secondWeightTo, firstVolumeFrom, firstVolumeTo, secondVolumeFrom, secondVolumeTo };
	});

	const pricingPreviewCases = computed(() => {
		const weightStart = Number(extraRules.value.weight_start || 101);
		const weightStep = Number(extraRules.value.weight_step || 50);
		const weightResolution = Number(extraRules.value.weight_resolution || 1);
		const volumeStart = Number(extraRules.value.volume_start || 0.401);
		const volumeStep = Number(extraRules.value.volume_step || 0.2);
		const volumeResolution = Number(extraRules.value.volume_resolution || 0.001);

		const standardWeight = Number((weightStart - weightResolution).toFixed(4));
		const standardVolume = Number((volumeStart - volumeResolution).toFixed(4));
		const firstExtraWeightMax = Number((weightStart + weightStep - weightResolution).toFixed(4));
		const firstExtraVolumeMax = Number((volumeStart + volumeStep - volumeResolution).toFixed(4));
		const secondExtraWeightStart = Number((weightStart + weightStep).toFixed(4));
		const secondExtraVolumeStart = Number((volumeStart + volumeStep).toFixed(4));

		const rows = [
			{ id: 'standard', label: 'Ultima fascia standard', weight: standardWeight, volume: standardVolume },
			{ id: 'extra1w', label: 'Primo extra (inizio)', weight: weightStart, volume: volumeStart },
			{ id: 'extra1max', label: 'Primo extra (limite)', weight: firstExtraWeightMax, volume: firstExtraVolumeMax },
			{ id: 'extra2', label: 'Secondo extra', weight: secondExtraWeightStart, volume: secondExtraVolumeStart },
		];

		return rows.map((row) => {
			const weightPriceCents = calculateBandPriceCentsLocal('weight', row.weight);
			const volumePriceCents = calculateBandPriceCentsLocal('volume', row.volume);
			const totalCents = Math.max(weightPriceCents, volumePriceCents);
			return { ...row, weightPriceLabel: centsToEuro(weightPriceCents), volumePriceLabel: centsToEuro(volumePriceCents), totalLabel: centsToEuro(totalCents) };
		});
	});

	return {
		hasChanges, servicePricingEntries, automaticSupplementEntries,
		operationalFeeEntries, filteredServiceEntries, europeBandFilters,
		filteredEuropeBands, extraRuleExamples, pricingPreviewCases,
	};
}
