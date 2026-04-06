/**
 * COMPOSABLE: useAdminPrezziState (useAdminPrezziState.js)
 * SCOPO: Costanti default, normalizzatori e stato reattivo per il pannello admin prezzi.
 *        Estratto da useAdminPrezzi.js per ridurre la complessita'.
 *
 * DOVE SI USA: Importato internamente da useAdminPrezzi.js — non usare direttamente.
 */

// ────────────────────────────────────────────────────────────
// Costanti default
// ────────────────────────────────────────────────────────────

export const DEFAULT_WEIGHT_BANDS = [
	{ min_value: 0, max_value: 2, base_price: 890, discount_price: null, show_discount: true },
	{ min_value: 2, max_value: 5, base_price: 1190, discount_price: null, show_discount: true },
	{ min_value: 5, max_value: 10, base_price: 1490, discount_price: null, show_discount: true },
	{ min_value: 10, max_value: 25, base_price: 1990, discount_price: null, show_discount: true },
	{ min_value: 25, max_value: 50, base_price: 2990, discount_price: null, show_discount: true },
	{ min_value: 50, max_value: 75, base_price: 3990, discount_price: null, show_discount: true },
	{ min_value: 75, max_value: 100, base_price: 4990, discount_price: null, show_discount: true },
];
export const DEFAULT_VOLUME_BANDS = [
	{ min_value: 0, max_value: 0.010, base_price: 890, discount_price: null, show_discount: true },
	{ min_value: 0.010, max_value: 0.020, base_price: 1190, discount_price: null, show_discount: true },
	{ min_value: 0.020, max_value: 0.040, base_price: 1490, discount_price: null, show_discount: true },
	{ min_value: 0.040, max_value: 0.100, base_price: 1990, discount_price: null, show_discount: true },
	{ min_value: 0.100, max_value: 0.200, base_price: 2990, discount_price: null, show_discount: true },
	{ min_value: 0.200, max_value: 0.300, base_price: 3990, discount_price: null, show_discount: true },
	{ min_value: 0.300, max_value: 0.400, base_price: 4990, discount_price: null, show_discount: true },
];
// DEFAULT_EXTRA_RULES — definito in usePriceBandsDefaults.js (auto-import Nuxt)
// DEFAULT_SUPPLEMENTS — definito in usePriceBandsDefaults.js (auto-import Nuxt)
// DEFAULT_EUROPE_PRICING — definito in usePriceBandsDefaults.js (auto-import Nuxt)
// DEFAULT_SERVICE_PRICING — definito in usePriceBandsDefaults.js (auto-import Nuxt)
// DEFAULT_AUTOMATIC_SUPPLEMENTS — definito in usePriceBandsDefaults.js (auto-import Nuxt)
// DEFAULT_OPERATIONAL_FEES — definito in usePriceBandsDefaults.js (auto-import Nuxt)

// ────────────────────────────────────────────────────────────
// Normalizzatori interni
// ────────────────────────────────────────────────────────────

export const normalizeStringListForAdmin = (values = [], { uppercase = false } = {}) => {
	if (!Array.isArray(values)) return [];
	return [...new Set(values
		.map((value) => String(value || '').trim())
		.filter(Boolean)
		.map((value) => uppercase ? value.toUpperCase() : value.toLowerCase()))];
};

export const normalizeTiersForAdmin = (tiers = []) => {
	if (!Array.isArray(tiers)) return [];
	return [...tiers]
		.map((tier) => ({
			up_to_kg: tier?.up_to_kg === null || tier?.up_to_kg === undefined || tier?.up_to_kg === ''
				? null
				: Number(tier.up_to_kg),
			price_cents: Number(tier?.price_cents || 0),
		}))
		.sort((a, b) => {
			const left = a.up_to_kg ?? Number.POSITIVE_INFINITY;
			const right = b.up_to_kg ?? Number.POSITIVE_INFINITY;
			return left - right;
		});
};

export const normalizePricingGroupForAdmin = (config = {}, defaults = {}) => Object.fromEntries(
	Object.entries(defaults).map(([key, fallback]) => {
		const source = config?.[key] && typeof config[key] === 'object' ? config[key] : {};
		return [key, {
			...fallback,
			...source,
			enabled: source?.enabled !== false && fallback?.enabled !== false,
			price_cents: source?.price_cents === null || source?.price_cents === undefined
				? fallback?.price_cents ?? null
				: Number(source.price_cents || 0),
			min_fee_cents: source?.min_fee_cents === null || source?.min_fee_cents === undefined
				? fallback?.min_fee_cents ?? null
				: Number(source.min_fee_cents || 0),
			percentage_rate: source?.percentage_rate === null || source?.percentage_rate === undefined
				? fallback?.percentage_rate ?? null
				: Number(source.percentage_rate || 0),
			threshold_amount_eur: source?.threshold_amount_eur === null || source?.threshold_amount_eur === undefined
				? fallback?.threshold_amount_eur ?? null
				: Number(source.threshold_amount_eur || 0),
			max_weight_kg: source?.max_weight_kg === null || source?.max_weight_kg === undefined
				? fallback?.max_weight_kg ?? null
				: Number(source.max_weight_kg || 0),
			threshold_cm: source?.threshold_cm === null || source?.threshold_cm === undefined
				? fallback?.threshold_cm ?? null
				: Number(source.threshold_cm || 0),
			longest_side_threshold_cm: source?.longest_side_threshold_cm === null || source?.longest_side_threshold_cm === undefined
				? fallback?.longest_side_threshold_cm ?? null
				: Number(source.longest_side_threshold_cm || 0),
			girth_threshold_cm: source?.girth_threshold_cm === null || source?.girth_threshold_cm === undefined
				? fallback?.girth_threshold_cm ?? null
				: Number(source.girth_threshold_cm || 0),
			min_longest_side_cm: source?.min_longest_side_cm === null || source?.min_longest_side_cm === undefined
				? fallback?.min_longest_side_cm ?? null
				: Number(source.min_longest_side_cm || 0),
			max_secondary_side_cm: source?.max_secondary_side_cm === null || source?.max_secondary_side_cm === undefined
				? fallback?.max_secondary_side_cm ?? null
				: Number(source.max_secondary_side_cm || 0),
			province_codes: Array.isArray(source?.province_codes)
				? normalizeStringListForAdmin(source.province_codes, { uppercase: true })
				: [...(fallback?.province_codes || [])],
			country_codes: Array.isArray(source?.country_codes)
				? normalizeStringListForAdmin(source.country_codes, { uppercase: true })
				: [...(fallback?.country_codes || [])],
			keyword_list: Array.isArray(source?.keyword_list)
				? normalizeStringListForAdmin(source.keyword_list)
				: [...(fallback?.keyword_list || [])],
			flag_keys: Array.isArray(source?.flag_keys)
				? normalizeStringListForAdmin(source.flag_keys)
				: [...(fallback?.flag_keys || [])],
			delivery_modes: Array.isArray(source?.delivery_modes)
				? normalizeStringListForAdmin(source.delivery_modes)
				: [...(fallback?.delivery_modes || [])],
			tiers: Array.isArray(source?.tiers)
				? normalizeTiersForAdmin(source.tiers)
				: normalizeTiersForAdmin(fallback?.tiers || []),
		}];
	}),
);

export const normalizeEuropePricingForAdmin = (config = {}) => {
	const bands = Array.isArray(config?.bands)
		? config.bands.map((band, bandIndex) => ({
			id: String(band?.id ?? `eu-band-${bandIndex + 1}`),
			label: String(band?.label ?? '').trim(),
			max_weight_kg: Number(band?.max_weight_kg ?? 0),
			max_volume_m3: Number(band?.max_volume_m3 ?? 0),
			volumetric_factor: Number(band?.volumetric_factor ?? 250),
			rates: Array.isArray(band?.rates)
				? band.rates.map((rate) => ({
					country_code: String(rate?.country_code ?? '').trim().toUpperCase(),
					country_name: String(rate?.country_name ?? '').trim(),
					price_cents: rate?.price_cents === null || rate?.price_cents === '' || rate?.price_cents === undefined
						? null
						: Number(rate.price_cents),
					quote_required: rate?.quote_required === true,
				}))
				: [],
		}))
		: [];

	return {
		...DEFAULT_EUROPE_PRICING,
		enabled: config?.enabled !== false,
		origin_country_code: String(config?.origin_country_code ?? 'IT').trim().toUpperCase() || 'IT',
		max_packages: 1,
		max_quantity_per_package: 1,
		bands,
		supported_country_codes: Array.isArray(config?.supported_country_codes)
			? [...config.supported_country_codes]
			: [...new Set(bands.flatMap((band) => band.rates.map((rate) => rate.country_code)))].sort(),
		version: config?.version || null,
	};
};

export const buildPricingRulesPayload = (group = {}) => JSON.parse(JSON.stringify(group));

// ────────────────────────────────────────────────────────────
// State factory
// ────────────────────────────────────────────────────────────

/**
 * Crea tutti i ref() reattivi usati dal pannello admin prezzi.
 * @returns {Object} Oggetto con tutti i ref reattivi.
 */
export function useAdminPrezziState() {
	const isLoading = ref(true);
	const saving = ref(false);
	const seeding = ref(false);
	const weightBands = ref([]);
	const volumeBands = ref([]);
	const bandsFromDb = ref(false);
	const originalWeightBands = ref([]);
	const originalVolumeBands = ref([]);
	const extraRules = ref({ ...DEFAULT_EXTRA_RULES });
	const supplementRules = ref([
		{ id: 'supplement-1', prefix: '90', amount_cents: 250, apply_to: 'both', enabled: true },
	]);
	const originalExtraRules = ref(null);
	const originalSupplementRules = ref([]);
	const pricingVersion = ref(null);
	const europePricing = ref({ ...DEFAULT_EUROPE_PRICING });
	const originalEuropePricing = ref(null);
	const servicePricing = ref({});
	const automaticSupplements = ref({});
	const operationalFees = ref({});
	const originalServicePricing = ref({});
	const originalAutomaticSupplements = ref({});
	const originalOperationalFees = ref({});
	const adminView = ref('nazionale');
	const compactEuropeView = ref(false);
	const europeSearch = ref('');
	const europeStatusFilter = ref('all');
	const europeBandFilter = ref('all');
	const europeSort = ref('country_asc');
	const serviceSearch = ref('');
	const serviceFilter = ref('all');

	// Promo
	const promoLoading = ref(false);
	const promoSaving = ref(false);
	const promoImageUploading = ref(false);
	const promo = ref({
		active: false,
		label_text: '',
		label_color: '#E44203',
		label_image: null,
		show_badges: true,
		description: '',
	});

	// Editing state
	const editingCell = ref(null);
	const editValue = ref('');

	return {
		isLoading, saving, seeding,
		weightBands, volumeBands, bandsFromDb,
		originalWeightBands, originalVolumeBands,
		extraRules, supplementRules,
		originalExtraRules, originalSupplementRules,
		pricingVersion,
		europePricing, originalEuropePricing,
		servicePricing, automaticSupplements, operationalFees,
		originalServicePricing, originalAutomaticSupplements, originalOperationalFees,
		adminView, compactEuropeView,
		europeSearch, europeStatusFilter, europeBandFilter, europeSort,
		serviceSearch, serviceFilter,
		promoLoading, promoSaving, promoImageUploading, promo,
		editingCell, editValue,
	};
}
