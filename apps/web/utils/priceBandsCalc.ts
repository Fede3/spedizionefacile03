/**
 * priceBandsCalc — normalizzazione e calcolo fasce prezzo (peso/volume).
 * Tutte funzioni pure, riusate sia dal composable usePriceBands sia dalla controparte admin.
 */

import {
	EPSILON,
	toNumber,
	toInt,
	normalizeDecimal,
	FALLBACK_WEIGHT_BANDS,
	FALLBACK_VOLUME_BANDS,
	DEFAULT_EXTRA_RULES,
	DEFAULT_SUPPLEMENTS,
	DEFAULT_EUROPE_PRICING,
} from '~/utils/priceBandsConstants';
import type {
	BandType,
	EuropeBand,
	EuropePricing,
	ExtraRules,
	IncrementLadderRow,
	PriceBand,
	PriceBandsState,
	PricingRule,
	PricingRuleGroup,
	SupplementRule,
} from '~/types/pricing'

// ---- Normalization helpers ----

export function normalizeIncrementLadder(ladder: unknown, fallbackIncrementCents: unknown): IncrementLadderRow[] {
	const fallbackIncrement = Math.max(0, toInt(fallbackIncrementCents, DEFAULT_EXTRA_RULES.increment_cents));
	const source = Array.isArray(ladder) ? ladder as Array<Partial<IncrementLadderRow>> : [];
	const rows = source
		.map((row, idx) => {
			const fromStep = Math.max(1, toInt(row?.from_step, idx + 1));
			const rawTo = row?.to_step;
			const toStep = rawTo === null || rawTo === undefined ? null : Math.max(fromStep, toInt(rawTo, fromStep));
			const increment = Math.max(0, toInt(row?.increment_cents, fallbackIncrement));
			return { from_step: fromStep, to_step: toStep, increment_cents: increment };
		})
		.sort((a, b) => a.from_step - b.from_step);

	if (!rows.length) {
		return [{ from_step: 1, to_step: null, increment_cents: fallbackIncrement }];
	}

	const last = rows[rows.length - 1];
	if (last) last.to_step = null;
	return rows;
}

export const normalizeBandArray = (bands: unknown = [], type: BandType): PriceBand[] => {
	if (!Array.isArray(bands) || bands.length === 0) {
		return type === "weight" ? [...FALLBACK_WEIGHT_BANDS] : [...FALLBACK_VOLUME_BANDS];
	}

	return [...(bands as Array<Partial<PriceBand>>)]
		.map((band, idx) => ({
			id: String(band?.id ?? `${type}-${idx + 1}`),
			type,
			min_value: normalizeDecimal(band?.min_value ?? 0),
			max_value: normalizeDecimal(band?.max_value ?? 0),
			base_price: Math.max(0, toInt(band?.base_price, 0)),
			discount_price: band?.discount_price === null || band?.discount_price === undefined
				? null
				: Math.max(0, toInt(band.discount_price, 0)),
			show_discount: band?.show_discount !== false,
			sort_order: toInt(band?.sort_order, idx + 1),
		}))
		.sort((a, b) => {
			if (a.min_value === b.min_value) return a.max_value - b.max_value;
			return a.min_value - b.min_value;
		});
};

export const normalizeExtraRules = (rules: Partial<ExtraRules> = {}): ExtraRules => ({
	enabled: rules?.enabled !== false,
	weight_start: normalizeDecimal(rules?.weight_start ?? DEFAULT_EXTRA_RULES.weight_start),
	weight_step: normalizeDecimal(rules?.weight_step ?? DEFAULT_EXTRA_RULES.weight_step),
	volume_start: normalizeDecimal(rules?.volume_start ?? DEFAULT_EXTRA_RULES.volume_start),
	volume_step: normalizeDecimal(rules?.volume_step ?? DEFAULT_EXTRA_RULES.volume_step),
	increment_cents: Math.max(0, toInt(rules?.increment_cents ?? DEFAULT_EXTRA_RULES.increment_cents, DEFAULT_EXTRA_RULES.increment_cents)),
	increment_mode: "flat",
	weight_increment_ladder: normalizeIncrementLadder(rules?.weight_increment_ladder, toInt(rules?.increment_cents ?? DEFAULT_EXTRA_RULES.increment_cents, DEFAULT_EXTRA_RULES.increment_cents)),
	volume_increment_ladder: normalizeIncrementLadder(rules?.volume_increment_ladder, toInt(rules?.increment_cents ?? DEFAULT_EXTRA_RULES.increment_cents, DEFAULT_EXTRA_RULES.increment_cents)),
	base_price_cents_mode: rules?.base_price_cents_mode === "manual" ? "manual" : "last_band_effective",
	base_price_cents_manual: rules?.base_price_cents_manual === null || rules?.base_price_cents_manual === undefined
		? null
		: Math.max(0, toInt(rules.base_price_cents_manual, 0)),
	weight_resolution: normalizeDecimal(rules?.weight_resolution ?? DEFAULT_EXTRA_RULES.weight_resolution),
	volume_resolution: normalizeDecimal(rules?.volume_resolution ?? DEFAULT_EXTRA_RULES.volume_resolution),
});

export const normalizeSupplements = (rules: unknown = []): SupplementRule[] => {
	if (!Array.isArray(rules)) {
		return [...DEFAULT_SUPPLEMENTS];
	}
	if (rules.length === 0) {
		return [];
	}

	return (rules as Array<Partial<SupplementRule>>)
		.map((rule, idx) => {
			const applyTo = String(rule?.apply_to || "both");
			return {
				id: String(rule?.id ?? `supplement-${idx + 1}`),
				prefix: String(rule?.prefix ?? "").replace(/\D+/g, ""),
				amount_cents: Math.max(0, toInt(rule?.amount_cents ?? 0, 0)),
				apply_to: ["origin", "destination", "both"].includes(applyTo) ? applyTo : "both",
				enabled: rule?.enabled !== false,
			};
		})
		.filter((rule) => rule.prefix.length > 0);
};

export const normalizeEuropePricing = (config: Partial<EuropePricing> = {}): EuropePricing => {
	const bands = Array.isArray(config?.bands)
		? [...config.bands as Array<Partial<EuropeBand>>]
			.map((band, idx) => ({
				id: String(band?.id ?? `eu-band-${idx + 1}`),
				label: String(band?.label ?? "").trim(),
				max_weight_kg: normalizeDecimal(band?.max_weight_kg ?? 0),
				max_volume_m3: Number(toNumber(band?.max_volume_m3 ?? 0, 0).toFixed(6)),
				volumetric_factor: Math.max(1, toInt(band?.volumetric_factor ?? 250, 250)),
				rates: Array.isArray(band?.rates)
					? (band.rates as Array<Partial<EuropeBand['rates'][number]>>)
						.map((rate) => ({
							country_code: String(rate?.country_code ?? "").trim().toUpperCase(),
							country_name: String(rate?.country_name ?? "").trim(),
							price_cents: rate?.price_cents === null || rate?.price_cents === undefined
								? null
								: Math.max(0, toInt(rate.price_cents, 0)),
							quote_required: rate?.quote_required === true,
						}))
						.filter((rate) => rate.country_code)
					: [],
			}))
			.filter((band) => band.max_weight_kg > 0 && band.max_volume_m3 > 0)
			.sort((a, b) => a.max_weight_kg - b.max_weight_kg)
		: [];

	const supportedCountryCodes = Array.isArray(config?.supported_country_codes)
		? [...new Set(config.supported_country_codes.map((code) => String(code || "").trim().toUpperCase()).filter(Boolean))].sort()
		: [...new Set(bands.flatMap((band) => band.rates.map((rate) => rate.country_code)))].sort();

	return {
		enabled: config?.enabled !== false && bands.length > 0,
		scope: "europe_monocollo",
		origin_country_code: String(config?.origin_country_code ?? "IT").trim().toUpperCase() || "IT",
		max_packages: Math.max(1, toInt(config?.max_packages ?? 1, 1)),
		max_quantity_per_package: Math.max(1, toInt(config?.max_quantity_per_package ?? 1, 1)),
		supported_country_codes: supportedCountryCodes,
		bands,
		version: config?.version || null,
	};
};

export const normalizeKeyedPricingGroup = (
	config: Record<string, Partial<PricingRule>> = {},
	defaults: PricingRuleGroup = {},
): PricingRuleGroup => {
	return Object.fromEntries(
		Object.entries(defaults).map(([key, fallback]) => {
			const source = config?.[key] && typeof config[key] === "object" ? config[key] : {};
			return [key, {
				...fallback,
				...source,
				enabled: source?.enabled !== false && fallback?.enabled !== false,
				price_cents: source?.price_cents === null || source?.price_cents === undefined
					? fallback?.price_cents ?? null
					: Math.max(0, toInt(source.price_cents, fallback?.price_cents ?? 0)),
				min_fee_cents: source?.min_fee_cents === null || source?.min_fee_cents === undefined
					? fallback?.min_fee_cents ?? null
					: Math.max(0, toInt(source.min_fee_cents, fallback?.min_fee_cents ?? 0)),
				percentage_rate: source?.percentage_rate === null || source?.percentage_rate === undefined
					? fallback?.percentage_rate ?? null
					: toNumber(source.percentage_rate, fallback?.percentage_rate ?? 0),
				threshold_amount_eur: source?.threshold_amount_eur === null || source?.threshold_amount_eur === undefined
					? fallback?.threshold_amount_eur ?? null
					: toNumber(source.threshold_amount_eur, fallback?.threshold_amount_eur ?? 0),
				max_weight_kg: source?.max_weight_kg === null || source?.max_weight_kg === undefined
					? fallback?.max_weight_kg ?? null
					: toNumber(source.max_weight_kg, fallback?.max_weight_kg ?? 0),
				threshold_cm: source?.threshold_cm === null || source?.threshold_cm === undefined
					? fallback?.threshold_cm ?? null
					: toNumber(source.threshold_cm, fallback?.threshold_cm ?? 0),
				longest_side_threshold_cm: source?.longest_side_threshold_cm === null || source?.longest_side_threshold_cm === undefined
					? fallback?.longest_side_threshold_cm ?? null
					: toNumber(source.longest_side_threshold_cm, fallback?.longest_side_threshold_cm ?? 0),
				girth_threshold_cm: source?.girth_threshold_cm === null || source?.girth_threshold_cm === undefined
					? fallback?.girth_threshold_cm ?? null
					: toNumber(source.girth_threshold_cm, fallback?.girth_threshold_cm ?? 0),
				min_longest_side_cm: source?.min_longest_side_cm === null || source?.min_longest_side_cm === undefined
					? fallback?.min_longest_side_cm ?? null
					: toNumber(source.min_longest_side_cm, fallback?.min_longest_side_cm ?? 0),
				max_secondary_side_cm: source?.max_secondary_side_cm === null || source?.max_secondary_side_cm === undefined
					? fallback?.max_secondary_side_cm ?? null
					: toNumber(source.max_secondary_side_cm, fallback?.max_secondary_side_cm ?? 0),
				province_codes: Array.isArray(source?.province_codes) ? source.province_codes.map((item) => String(item).trim().toUpperCase()).filter(Boolean) : [...(fallback?.province_codes || [])],
				country_codes: Array.isArray(source?.country_codes) ? source.country_codes.map((item) => String(item).trim().toUpperCase()).filter(Boolean) : [...(fallback?.country_codes || [])],
				keyword_list: Array.isArray(source?.keyword_list) ? source.keyword_list.map((item) => String(item).trim().toLowerCase()).filter(Boolean) : [...(fallback?.keyword_list || [])],
				flag_keys: Array.isArray(source?.flag_keys) ? source.flag_keys.map((item) => String(item).trim().toLowerCase()).filter(Boolean) : [...(fallback?.flag_keys || [])],
				delivery_modes: Array.isArray(source?.delivery_modes) ? source.delivery_modes.map((item) => String(item).trim().toLowerCase()).filter(Boolean) : [...(fallback?.delivery_modes || [])],
				tiers: Array.isArray(source?.tiers)
					? source.tiers.map((tier) => ({
						up_to_kg: tier?.up_to_kg === null || tier?.up_to_kg === undefined ? null : toNumber(tier.up_to_kg, 0),
						price_cents: Math.max(0, toInt(tier?.price_cents, 0)),
					}))
					: [...(fallback?.tiers || [])],
			}];
		}),
	);
};

// ---- Pure pricing helpers ----

export const effectivePriceCents = (band?: Partial<PriceBand> | null): number => {
	const discount = band?.discount_price;
	if (discount !== null && discount !== undefined) {
		return toInt(discount, 0);
	}
	return toInt(band?.base_price, 0);
};

export const ceilByResolution = (value: number, resolution: number): number => {
	const safeResolution = resolution > 0 ? resolution : 1;
	const multiplier = 1 / safeResolution;
	return normalizeDecimal(Math.ceil((value * multiplier) - EPSILON) / multiplier, value);
};

export const findBand = (bands: PriceBand[] | undefined, value: number): PriceBand | null => {
	if (!Array.isArray(bands) || bands.length === 0 || !Number.isFinite(value) || value <= 0) return null;

	for (let idx = 0; idx < bands.length; idx += 1) {
		const band = bands[idx];
		if (!band) continue;
		const min = Number(band.min_value);
		const max = Number(band.max_value);
		const lowerOk = idx === 0 ? value >= (min - EPSILON) : value > (min + EPSILON);
		const upperOk = value <= (max + EPSILON);
		if (lowerOk && upperOk) return band;
	}
	return null;
};

export const computeExtraPriceCents = (
	type: BandType,
	rawValue: number,
	bands: PriceBand[] | undefined,
	extraRules: ExtraRules,
): number | null => {
	if (!extraRules?.enabled) return null;
	if (!Number.isFinite(rawValue) || rawValue <= 0) return null;

	const isWeight = type === "weight";
	const start = isWeight ? Number(extraRules.weight_start) : Number(extraRules.volume_start);
	const step = isWeight ? Number(extraRules.weight_step) : Number(extraRules.volume_step);
	const resolution = isWeight ? Number(extraRules.weight_resolution) : Number(extraRules.volume_resolution);
	const increment = toInt(extraRules.increment_cents, 0);

	if (!Number.isFinite(start) || !Number.isFinite(step) || !Number.isFinite(resolution) || step <= 0 || resolution <= 0) {
		return null;
	}

	const value = ceilByResolution(rawValue, resolution);
	if (value + EPSILON < start) return null;

	let baseCents = 0;
	if (extraRules.base_price_cents_mode === "manual" && extraRules.base_price_cents_manual !== null) {
		baseCents = toInt(extraRules.base_price_cents_manual, 0);
	} else {
		const last = Array.isArray(bands) && bands.length > 0 ? bands[bands.length - 1] : null;
		baseCents = last ? effectivePriceCents(last) : (isWeight ? effectivePriceCents(FALLBACK_WEIGHT_BANDS[FALLBACK_WEIGHT_BANDS.length - 1]) : effectivePriceCents(FALLBACK_VOLUME_BANDS[FALLBACK_VOLUME_BANDS.length - 1]));
	}

	const stepsFromStart = Math.floor(((value - start) + EPSILON) / step);
	const bandNumber = Math.max(0, stepsFromStart) + 1;

	return baseCents + (bandNumber * increment);
};

export const getBandPriceCents = (type: BandType, rawValue: number | string, priceBandsValue: Pick<PriceBandsState, 'weight' | 'volume' | 'extra_rules'>): number | null => {
	const value = Number(rawValue);
	if (!Number.isFinite(value) || value <= 0) return null;

	const bands = type === "weight" ? priceBandsValue.weight : priceBandsValue.volume;
	const band = findBand(bands, value);
	if (band) return effectivePriceCents(band);

	const extra = computeExtraPriceCents(type, value, bands, priceBandsValue.extra_rules || DEFAULT_EXTRA_RULES);
	if (extra !== null) return extra;

	if (Array.isArray(bands) && bands.length > 0) {
		return effectivePriceCents(bands[bands.length - 1]);
	}

	const fallback = type === "weight" ? FALLBACK_WEIGHT_BANDS : FALLBACK_VOLUME_BANDS;
	return effectivePriceCents(fallback[fallback.length - 1]);
};

export const getBandInfo = (band?: PriceBand | null) => {
	if (!band) return null;
	const basePriceCents = toInt(band.base_price, 0);
	const discountPriceCents = band.discount_price !== null && band.discount_price !== undefined ? toInt(band.discount_price, 0) : null;
	const effectivePriceCentsValue = discountPriceCents ?? basePriceCents;
	const discountPercent = discountPriceCents !== null && discountPriceCents < basePriceCents && basePriceCents > 0
		? Math.round((1 - discountPriceCents / basePriceCents) * 100)
		: null;

	return {
		effectivePrice: effectivePriceCentsValue / 100,
		basePrice: basePriceCents / 100,
		discountPercent,
		showDiscount: band.show_discount !== false,
		hasDiscount: discountPercent !== null && discountPercent > 0,
		isExtra: false,
	};
};

export const getExtraBandInfo = (cents: number) => ({
	effectivePrice: cents / 100,
	basePrice: cents / 100,
	discountPercent: null,
	showDiscount: false,
	hasDiscount: false,
	isExtra: true,
});

export const calcCapSupplementCents = (originCap: number | string, destinationCap: number | string, supplements?: SupplementRule[]): number => {
	const rules = supplements || [];
	const origin = String(originCap || "").replace(/\D+/g, "");
	const destination = String(destinationCap || "").replace(/\D+/g, "");

	let total = 0;
	rules.forEach((rule) => {
		if (rule?.enabled === false) return;
		const prefix = String(rule?.prefix || "").replace(/\D+/g, "");
		if (!prefix) return;
		const amount = Math.max(0, toInt(rule?.amount_cents, 0));
		if (!amount) return;
		const applyTo = ["origin", "destination", "both"].includes(rule?.apply_to) ? rule.apply_to : "both";
		if ((applyTo === "origin" || applyTo === "both") && origin.startsWith(prefix)) total += amount;
		if ((applyTo === "destination" || applyTo === "both") && destination.startsWith(prefix)) total += amount;
	});

	return total;
};

export const calcEuropeQuote = (
	destinationCountryCode: string,
	weightKg: number | string,
	volumeM3: number | string,
	europePricing?: EuropePricing,
) => {
	const pricing = europePricing || DEFAULT_EUROPE_PRICING;
	const countryCode = String(destinationCountryCode || "").trim().toUpperCase();
	if (!pricing.enabled || !countryCode || countryCode === "IT") {
		return { status: "not_europe", message: "Destinazione non europea o nazionale." };
	}

	if (!pricing.supported_country_codes.includes(countryCode)) {
		return { status: "not_supported", message: "Destinazione europea non configurata nel listino attuale." };
	}

	const weight = Number(weightKg);
	const volume = Number(volumeM3);
	if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(volume) || volume <= 0) {
		return { status: "incomplete", message: "Inserisci peso e dimensioni per calcolare il listino Europa." };
	}

	const findEuropeBand = () => {
		const bandByRange = (matcher: (entry: EuropeBand) => boolean) => pricing.bands.find((entry) => matcher(entry) && volume <= entry.max_volume_m3);
		return (
			bandByRange((entry) => weight <= 10 && entry.max_weight_kg <= 10 + EPSILON)
			|| bandByRange((entry) => weight > 10 + EPSILON && weight < 25 && entry.max_weight_kg > 10 && entry.max_weight_kg <= 30 + EPSILON)
			|| bandByRange((entry) => weight >= 25 && weight <= 50 + EPSILON && entry.max_weight_kg > 25 && entry.max_weight_kg <= 50 + EPSILON)
			|| bandByRange((entry) => weight > 50 + EPSILON && weight <= 75 + EPSILON && entry.max_weight_kg > 50 && entry.max_weight_kg <= 75 + EPSILON)
			|| bandByRange((entry) => weight > 75 + EPSILON && weight <= 100 + EPSILON && entry.max_weight_kg > 75 && entry.max_weight_kg <= 100 + EPSILON)
			|| pricing.bands.find((entry) => weight <= entry.max_weight_kg && volume <= entry.max_volume_m3)
			|| null
		);
	};

	const band = findEuropeBand();
	if (!band) {
		return { status: "requires_quote", message: "Per questo peso o volume verso l'Europa serve un preventivo manuale." };
	}

	const rate = band.rates.find((entry) => entry.country_code === countryCode);
	if (!rate) {
		return { status: "not_supported", message: "Destinazione europea non configurata nel listino attuale.", band };
	}

	if (rate.quote_required || rate.price_cents === null) {
		return {
			status: "requires_quote",
			message: `Per ${rate.country_name || countryCode} in questa fascia va richiesto un preventivo manuale.`,
			band,
			rate,
		};
	}

	return {
		status: "priced",
		price_cents: rate.price_cents,
		price: Number((rate.price_cents / 100).toFixed(2)),
		band,
		rate,
	};
};
