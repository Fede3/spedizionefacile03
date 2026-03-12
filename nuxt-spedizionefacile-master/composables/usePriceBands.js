const EPSILON = 0.0000001;

const FALLBACK_WEIGHT_BANDS = [
	{ id: "weight-1", type: "weight", min_value: 0, max_value: 2, base_price: 890, discount_price: null, show_discount: true, sort_order: 1 },
	{ id: "weight-2", type: "weight", min_value: 2, max_value: 5, base_price: 1190, discount_price: null, show_discount: true, sort_order: 2 },
	{ id: "weight-3", type: "weight", min_value: 5, max_value: 10, base_price: 1490, discount_price: null, show_discount: true, sort_order: 3 },
	{ id: "weight-4", type: "weight", min_value: 10, max_value: 25, base_price: 1990, discount_price: null, show_discount: true, sort_order: 4 },
	{ id: "weight-5", type: "weight", min_value: 25, max_value: 50, base_price: 2990, discount_price: null, show_discount: true, sort_order: 5 },
	{ id: "weight-6", type: "weight", min_value: 50, max_value: 75, base_price: 3990, discount_price: null, show_discount: true, sort_order: 6 },
	{ id: "weight-7", type: "weight", min_value: 75, max_value: 100, base_price: 4990, discount_price: null, show_discount: true, sort_order: 7 },
];

const FALLBACK_VOLUME_BANDS = [
	{ id: "volume-1", type: "volume", min_value: 0, max_value: 0.010, base_price: 890, discount_price: null, show_discount: true, sort_order: 1 },
	{ id: "volume-2", type: "volume", min_value: 0.010, max_value: 0.020, base_price: 1190, discount_price: null, show_discount: true, sort_order: 2 },
	{ id: "volume-3", type: "volume", min_value: 0.020, max_value: 0.040, base_price: 1490, discount_price: null, show_discount: true, sort_order: 3 },
	{ id: "volume-4", type: "volume", min_value: 0.040, max_value: 0.100, base_price: 1990, discount_price: null, show_discount: true, sort_order: 4 },
	{ id: "volume-5", type: "volume", min_value: 0.100, max_value: 0.200, base_price: 2990, discount_price: null, show_discount: true, sort_order: 5 },
	{ id: "volume-6", type: "volume", min_value: 0.200, max_value: 0.300, base_price: 3990, discount_price: null, show_discount: true, sort_order: 6 },
	{ id: "volume-7", type: "volume", min_value: 0.300, max_value: 0.400, base_price: 4990, discount_price: null, show_discount: true, sort_order: 7 },
];

const DEFAULT_EXTRA_RULES = {
	enabled: true,
	weight_start: 101,
	weight_step: 50,
	volume_start: 0.401,
	volume_step: 0.200,
	increment_cents: 500,
	increment_mode: "flat",
	weight_increment_ladder: [{ from_step: 1, to_step: null, increment_cents: 500 }],
	volume_increment_ladder: [{ from_step: 1, to_step: null, increment_cents: 500 }],
	base_price_cents_mode: "last_band_effective",
	base_price_cents_manual: null,
	weight_resolution: 1,
	volume_resolution: 0.001,
};

const DEFAULT_SUPPLEMENTS = [
	{ id: "supplement-1", prefix: "90", amount_cents: 250, apply_to: "both", enabled: true },
];

const DEFAULT_PROMO = {
	active: false,
	label_text: "",
	label_color: "#E44203",
	label_image: null,
	show_badges: false,
	description: "",
};

const priceBands = ref({
	weight: FALLBACK_WEIGHT_BANDS,
	volume: FALLBACK_VOLUME_BANDS,
	extra_rules: DEFAULT_EXTRA_RULES,
	supplements: DEFAULT_SUPPLEMENTS,
	version: null,
});

const promoSettings = ref(DEFAULT_PROMO);
const loading = ref(false);
const loaded = ref(false);
let lastFetchTime = 0;
const TTL_MS = 5 * 60 * 1000;
let pendingFetchPromise = null;

const toNumber = (value, fallback = 0) => {
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
};

const toInt = (value, fallback = 0) => {
	const n = Number.parseInt(value, 10);
	return Number.isFinite(n) ? n : fallback;
};

const normalizeDecimal = (value, fallback = 0) => {
	return Number(toNumber(value, fallback).toFixed(4));
};

const normalizeBandArray = (bands = [], type) => {
	if (!Array.isArray(bands) || bands.length === 0) {
		return type === "weight" ? [...FALLBACK_WEIGHT_BANDS] : [...FALLBACK_VOLUME_BANDS];
	}

	return [...bands]
		.map((band, idx) => ({
			id: String(band?.id ?? `${type}-${idx + 1}`),
			type,
			min_value: normalizeDecimal(band?.min_value ?? 0),
			max_value: normalizeDecimal(band?.max_value ?? 0),
			base_price: Math.max(0, toInt(band?.base_price, 0)),
			discount_price: band?.discount_price === null || band?.discount_price === "" || band?.discount_price === undefined
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

const normalizeExtraRules = (rules = {}) => ({
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
	base_price_cents_manual: rules?.base_price_cents_manual === null || rules?.base_price_cents_manual === "" || rules?.base_price_cents_manual === undefined
		? null
		: Math.max(0, toInt(rules.base_price_cents_manual, 0)),
	weight_resolution: normalizeDecimal(rules?.weight_resolution ?? DEFAULT_EXTRA_RULES.weight_resolution),
	volume_resolution: normalizeDecimal(rules?.volume_resolution ?? DEFAULT_EXTRA_RULES.volume_resolution),
});

function normalizeIncrementLadder(ladder, fallbackIncrementCents) {
	const fallbackIncrement = Math.max(0, toInt(fallbackIncrementCents, DEFAULT_EXTRA_RULES.increment_cents));
	const source = Array.isArray(ladder) ? ladder : [];
	const rows = source
		.map((row, idx) => {
			const fromStep = Math.max(1, toInt(row?.from_step, idx + 1));
			const rawTo = row?.to_step;
			const toStep = rawTo === null || rawTo === "" || rawTo === undefined ? null : Math.max(fromStep, toInt(rawTo, fromStep));
			const increment = Math.max(0, toInt(row?.increment_cents, fallbackIncrement));
			return { from_step: fromStep, to_step: toStep, increment_cents: increment };
		})
		.sort((a, b) => a.from_step - b.from_step);

	if (!rows.length) {
		return [{ from_step: 1, to_step: null, increment_cents: fallbackIncrement }];
	}

	rows[rows.length - 1].to_step = null;
	return rows;
}

const normalizeSupplements = (rules = []) => {
	if (!Array.isArray(rules)) {
		return [...DEFAULT_SUPPLEMENTS];
	}
	if (rules.length === 0) {
		return [];
	}

	return rules
		.map((rule, idx) => ({
			id: String(rule?.id ?? `supplement-${idx + 1}`),
			prefix: String(rule?.prefix ?? "").replace(/\D+/g, ""),
			amount_cents: Math.max(0, toInt(rule?.amount_cents ?? 0, 0)),
			apply_to: ["origin", "destination", "both"].includes(rule?.apply_to) ? rule.apply_to : "both",
			enabled: rule?.enabled !== false,
		}))
		.filter((rule) => rule.prefix.length > 0);
};

const effectivePriceCents = (band) => {
	const discount = band?.discount_price;
	if (discount !== null && discount !== undefined) {
		return toInt(discount, 0);
	}
	return toInt(band?.base_price, 0);
};

const ceilByResolution = (value, resolution) => {
	const safeResolution = resolution > 0 ? resolution : 1;
	const multiplier = 1 / safeResolution;
	return normalizeDecimal(Math.ceil((value * multiplier) - EPSILON) / multiplier, value);
};

const findBand = (bands, value) => {
	if (!Array.isArray(bands) || bands.length === 0 || !Number.isFinite(value) || value <= 0) return null;

	for (let idx = 0; idx < bands.length; idx += 1) {
		const band = bands[idx];
		const min = Number(band.min_value);
		const max = Number(band.max_value);
		const lowerOk = idx === 0 ? value >= (min - EPSILON) : value > (min + EPSILON);
		const upperOk = value <= (max + EPSILON);
		if (lowerOk && upperOk) return band;
	}
	return null;
};

const computeExtraPriceCents = (type, rawValue, bands, extraRules) => {
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

	// Regola business corrente: incremento fisso per ogni fascia extra.
	return baseCents + (bandNumber * increment);
};

const getBandPriceCents = (type, rawValue) => {
	const value = Number(rawValue);
	if (!Number.isFinite(value) || value <= 0) return null;

	const bands = type === "weight" ? priceBands.value.weight : priceBands.value.volume;
	const band = findBand(bands, value);
	if (band) return effectivePriceCents(band);

	const extra = computeExtraPriceCents(type, value, bands, priceBands.value.extra_rules || DEFAULT_EXTRA_RULES);
	if (extra !== null) return extra;

	if (Array.isArray(bands) && bands.length > 0) {
		return effectivePriceCents(bands[bands.length - 1]);
	}

	const fallback = type === "weight" ? FALLBACK_WEIGHT_BANDS : FALLBACK_VOLUME_BANDS;
	return effectivePriceCents(fallback[fallback.length - 1]);
};

const getBandInfo = (band) => {
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

const getExtraBandInfo = (cents) => ({
	effectivePrice: cents / 100,
	basePrice: cents / 100,
	discountPercent: null,
	showDiscount: false,
	hasDiscount: false,
	isExtra: true,
});

export const usePriceBands = () => {
	const sanctum = useSanctumClient();

	const fetchFromApi = async () => {
		loading.value = true;
		try {
			const res = await sanctum("/api/public/price-bands");
			const payload = res?.data || res || {};
			const data = payload?.data || payload || {};

			const weight = normalizeBandArray(data?.weight, "weight");
			const volume = normalizeBandArray(data?.volume, "volume");
			const extraRules = normalizeExtraRules(data?.extra_rules || DEFAULT_EXTRA_RULES);
			const supplements = normalizeSupplements(data?.supplements || DEFAULT_SUPPLEMENTS);
			const version = data?.version || payload?.version || String(Date.now());

			priceBands.value = {
				weight,
				volume,
				extra_rules: extraRules,
				supplements: supplements,
				version,
			};

			if (payload?.promo) {
				promoSettings.value = { ...DEFAULT_PROMO, ...payload.promo };
			}

			loaded.value = true;
			lastFetchTime = Date.now();
		} catch (e) {
			console.warn("[usePriceBands] API non disponibile, uso fallback locale:", e?.message || e);
			priceBands.value = {
				weight: [...FALLBACK_WEIGHT_BANDS],
				volume: [...FALLBACK_VOLUME_BANDS],
				extra_rules: { ...DEFAULT_EXTRA_RULES },
				supplements: [...DEFAULT_SUPPLEMENTS],
				version: String(Date.now()),
			};
			promoSettings.value = { ...DEFAULT_PROMO };
			loaded.value = true;
			lastFetchTime = Date.now();
		} finally {
			loading.value = false;
		}
	};

	const loadPriceBands = async () => {
		const expired = Date.now() - lastFetchTime > TTL_MS;
		if (loaded.value && !expired) return;
		if (pendingFetchPromise) return pendingFetchPromise;
		pendingFetchPromise = fetchFromApi().finally(() => {
			pendingFetchPromise = null;
		});
		return pendingFetchPromise;
	};

	const forceReload = async () => {
		lastFetchTime = 0;
		loaded.value = false;
		await fetchFromApi();
	};

	const getWeightPrice = (weightKg) => {
		const cents = getBandPriceCents("weight", weightKg);
		return cents == null ? null : cents / 100;
	};

	const getVolumePrice = (volumeM3) => {
		const cents = getBandPriceCents("volume", volumeM3);
		return cents == null ? null : cents / 100;
	};

	const getWeightBandInfo = (weightKg) => {
		const value = Number(weightKg);
		if (!Number.isFinite(value) || value <= 0) return null;
		const band = findBand(priceBands.value.weight, value);
		if (band) return getBandInfo(band);
		const cents = getBandPriceCents("weight", value);
		return cents == null ? null : getExtraBandInfo(cents);
	};

	const getVolumeBandInfo = (volumeM3) => {
		const value = Number(volumeM3);
		if (!Number.isFinite(value) || value <= 0) return null;
		const band = findBand(priceBands.value.volume, value);
		if (band) return getBandInfo(band);
		const cents = getBandPriceCents("volume", value);
		return cents == null ? null : getExtraBandInfo(cents);
	};

	const getCapSupplementCents = (originCap, destinationCap) => {
		const rules = priceBands.value.supplements || [];
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

	const getCapSupplement = (originCap, destinationCap) => getCapSupplementCents(originCap, destinationCap) / 100;

	const getMinPrice = () => {
		const firstBand = priceBands.value.weight?.[0];
		if (!firstBand) {
			return { effectivePrice: 8.9, basePrice: 8.9, discountPercent: null, showDiscount: false, hasDiscount: false, isExtra: false };
		}
		return getBandInfo(firstBand);
	};

	return {
		priceBands,
		promoSettings,
		loading,
		loaded,
		loadPriceBands,
		forceReload,
		getWeightPrice,
		getVolumePrice,
		getWeightBandInfo,
		getVolumeBandInfo,
		getCapSupplement,
		getCapSupplementCents,
		getMinPrice,
	};
};
