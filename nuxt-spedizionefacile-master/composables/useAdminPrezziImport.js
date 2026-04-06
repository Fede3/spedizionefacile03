/**
 * COMPOSABLE: useAdminPrezziImport (useAdminPrezziImport.js)
 * SCOPO: Fetch, salvataggio, seed, gestione promo (CRUD + upload immagine),
 *        payload builders, normalizzatori, costanti default.
 *
 * DOVE SI USA: Importato da useAdminPrezzi.js (facade).
 *
 * API: GET/PUT /api/admin/price-bands, POST /api/admin/price-bands/seed,
 *      GET/POST /api/admin/promo-settings, POST /api/admin/promo-settings/upload-image.
 */

// ────────────────────────────────────────────────────────────
// Costanti default
// ────────────────────────────────────────────────────────────

const DEFAULT_WEIGHT_BANDS = [
	{ min_value: 0, max_value: 2, base_price: 890, discount_price: null, show_discount: true },
	{ min_value: 2, max_value: 5, base_price: 1190, discount_price: null, show_discount: true },
	{ min_value: 5, max_value: 10, base_price: 1490, discount_price: null, show_discount: true },
	{ min_value: 10, max_value: 25, base_price: 1990, discount_price: null, show_discount: true },
	{ min_value: 25, max_value: 50, base_price: 2990, discount_price: null, show_discount: true },
	{ min_value: 50, max_value: 75, base_price: 3990, discount_price: null, show_discount: true },
	{ min_value: 75, max_value: 100, base_price: 4990, discount_price: null, show_discount: true },
];
const DEFAULT_VOLUME_BANDS = [
	{ min_value: 0, max_value: 0.010, base_price: 890, discount_price: null, show_discount: true },
	{ min_value: 0.010, max_value: 0.020, base_price: 1190, discount_price: null, show_discount: true },
	{ min_value: 0.020, max_value: 0.040, base_price: 1490, discount_price: null, show_discount: true },
	{ min_value: 0.040, max_value: 0.100, base_price: 1990, discount_price: null, show_discount: true },
	{ min_value: 0.100, max_value: 0.200, base_price: 2990, discount_price: null, show_discount: true },
	{ min_value: 0.200, max_value: 0.300, base_price: 3990, discount_price: null, show_discount: true },
	{ min_value: 0.300, max_value: 0.400, base_price: 4990, discount_price: null, show_discount: true },
];
const DEFAULT_EXTRA_RULES = {
	enabled: true,
	weight_start: 101,
	weight_step: 50,
	volume_start: 0.401,
	volume_step: 0.2,
	increment_cents: 500,
	increment_mode: 'flat',
	weight_increment_ladder: [{ from_step: 1, to_step: null, increment_cents: 500 }],
	volume_increment_ladder: [{ from_step: 1, to_step: null, increment_cents: 500 }],
	base_price_cents_mode: 'last_band_effective',
	base_price_cents_manual: null,
	weight_resolution: 1,
	volume_resolution: 0.001,
};
const DEFAULT_SUPPLEMENTS = [
	{ id: 'supplement-1', prefix: '90', amount_cents: 250, apply_to: 'both', enabled: true },
];
const DEFAULT_EUROPE_PRICING = {
	enabled: true,
	scope: 'europe_monocollo',
	origin_country_code: 'IT',
	max_packages: 1,
	max_quantity_per_package: 1,
	bands: [],
	supported_country_codes: [],
	version: null,
};
const DEFAULT_SERVICE_PRICING = {
	senza_etichetta: {
		label: 'Senza etichetta',
		description: "Il corriere stampa e applica l'etichetta al ritiro.",
		pricing_type: 'fixed',
		price_cents: 99,
		enabled: true,
		application: 'per_spedizione',
		note: '',
	},
	notifications: {
		label: 'Notifiche spedizione',
		description: 'SMS ed email al ritiro, in transito e alla consegna.',
		pricing_type: 'fixed',
		price_cents: 50,
		enabled: true,
		application: 'per_spedizione',
		note: '',
	},
	sponda_idraulica: {
		label: 'Sponda idraulica',
		description: 'Supplemento per mezzo con pedana.',
		pricing_type: 'fixed',
		price_cents: 1500,
		enabled: true,
		application: 'per_spedizione',
		note: '',
	},
	contrassegno: {
		label: 'Contrassegno',
		description: 'Incasso alla consegna comprensivo di bonifico.',
		pricing_type: 'threshold_percentage',
		threshold_amount_eur: 300,
		min_fee_cents: 700,
		percentage_rate: 2,
		enabled: true,
		application: 'per_spedizione',
		note: '',
	},
	assicurazione: {
		label: 'Assicurazione',
		description: 'Protezione economica sulla merce dichiarata.',
		pricing_type: 'threshold_percentage',
		threshold_amount_eur: 300,
		min_fee_cents: 700,
		percentage_rate: 2,
		enabled: true,
		application: 'per_spedizione',
		note: '',
	},
};
const DEFAULT_AUTOMATIC_SUPPLEMENTS = {
	calabria_sardegna_sicilia: {
		label: 'Calabria / Sardegna / Sicilia',
		description: 'Supplemento automatico destinazione per collo.',
		enabled: true,
		pricing_type: 'tiered_weight',
		application: 'automatic_destination_per_package',
		province_codes: ['AG', 'CL', 'CT', 'EN', 'ME', 'PA', 'RG', 'SR', 'TP', 'CA', 'CI', 'NU', 'OG', 'OR', 'OT', 'SS', 'SU', 'VS', 'CS', 'CZ', 'KR', 'RC', 'VV'],
		tiers: [
			{ up_to_kg: 10, price_cents: 600 },
			{ up_to_kg: 25, price_cents: 700 },
			{ up_to_kg: 50, price_cents: 800 },
			{ up_to_kg: 100, price_cents: 1500 },
			{ up_to_kg: null, price_cents: 2000 },
		],
		note: '',
	},
	brt_point_csi: {
		label: 'BRT Point Calabria / Sardegna / Sicilia',
		description: 'Supplemento ridotto per punto BRT fino a 20 kg/collo.',
		enabled: true,
		pricing_type: 'fixed_with_threshold',
		application: 'automatic_destination_per_package',
		province_codes: ['AG', 'CL', 'CT', 'EN', 'ME', 'PA', 'RG', 'SR', 'TP', 'CA', 'CI', 'NU', 'OG', 'OR', 'OT', 'SS', 'SU', 'VS', 'CS', 'CZ', 'KR', 'RC', 'VV'],
		delivery_modes: ['pudo'],
		max_weight_kg: 20,
		price_cents: 200,
		note: '',
	},
	isole_minori_italia: {
		label: 'Isole minori Italia',
		description: 'Supplemento automatico per località italiane insulari minori.',
		enabled: true,
		pricing_type: 'fixed',
		application: 'automatic_destination',
		country_codes: ['IT'],
		keyword_list: ['la maddalena', 'carloforte', 'calasetta', 'pantelleria', 'lampedusa', 'linosa', 'favignana', 'levanzo', 'marettimo', 'lipari', 'vulcano', 'salina', 'panarea', 'stromboli', 'filicudi', 'alicudi', 'ustica', 'ponza', 'ventotene', 'procida', 'ischia', 'capri', 'elba', 'giglio', 'giannutri', 'tremiti', 'capraia'],
		price_cents: 2000,
		note: '',
	},
	isole_minori_europa: {
		label: 'Isole minori Europa',
		description: 'Supplemento automatico per località europee insulari minori.',
		enabled: true,
		pricing_type: 'fixed',
		application: 'automatic_destination',
		country_codes: ['ES', 'PT', 'FR', 'GR', 'HR', 'MT', 'CY'],
		keyword_list: ['ibiza', 'formentera', 'menorca', 'minorca', 'mallorca', 'majorca', 'canarie', 'canary', 'tenerife', 'gran canaria', 'fuerteventura', 'lanzarote', 'madeira', 'azores', 'porto santo', 'corsica', 'corfu', 'santorini', 'mykonos', 'rodos', 'rhodes', 'crete'],
		price_cents: 2500,
		note: '',
	},
	fuori_sagoma: {
		label: 'Fuori sagoma',
		description: 'Supplemento automatico per colli fuori sagoma.',
		enabled: true,
		pricing_type: 'tiered_weight',
		application: 'automatic_package_shape',
		flag_keys: ['fuori_sagoma', 'out_of_gauge', 'oversized'],
		longest_side_threshold_cm: 100,
		girth_threshold_cm: 260,
		tiers: [
			{ up_to_kg: 10, price_cents: 300 },
			{ up_to_kg: null, price_cents: 500 },
		],
		note: '',
	},
	lato_superiore_130cm: {
		label: 'Lato superiore a 130 cm',
		description: 'Supplemento automatico per colli con lato massimo oltre 130 cm.',
		enabled: true,
		pricing_type: 'fixed',
		application: 'automatic_per_package',
		threshold_cm: 130,
		price_cents: 500,
		note: '',
	},
	aste_tubi: {
		label: 'Aste / Tubi',
		description: 'Supplemento per colli molto lunghi e stretti.',
		enabled: true,
		pricing_type: 'fixed',
		application: 'automatic_per_package',
		flag_keys: ['aste_tubi', 'tubi', 'tubo', 'rod_tube'],
		min_longest_side_cm: 100,
		max_secondary_side_cm: 20,
		price_cents: 500,
		note: '',
	},
	eu_manual_extra: {
		label: 'Extra Europa su preventivo manuale',
		description: 'Fee extra per pratiche Europa con preventivo manuale.',
		enabled: true,
		pricing_type: 'fixed',
		application: 'manual_quote_only',
		price_cents: 1500,
		note: '',
	},
};
const DEFAULT_OPERATIONAL_FEES = {
	giacenza: {
		label: 'Giacenza',
		description: 'Costo operativo per gestione giacenza.',
		pricing_type: 'fixed',
		price_cents: 1000,
		enabled: true,
		application: 'manual_admin',
		note: '',
	},
};

// ────────────────────────────────────────────────────────────
// Normalizzatori interni
// ────────────────────────────────────────────────────────────

const normalizeStringListForAdmin = (values = [], { uppercase = false } = {}) => {
	if (!Array.isArray(values)) return [];
	return [...new Set(values
		.map((value) => String(value || '').trim())
		.filter(Boolean)
		.map((value) => uppercase ? value.toUpperCase() : value.toLowerCase()))];
};

const normalizeTiersForAdmin = (tiers = []) => {
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

const normalizePricingGroupForAdmin = (config = {}, defaults = {}) => Object.fromEntries(
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

const normalizeEuropePricingForAdmin = (config = {}) => {
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

const buildPricingRulesPayload = (group = {}) => JSON.parse(JSON.stringify(group));

// ────────────────────────────────────────────────────────────
// Composable
// ────────────────────────────────────────────────────────────

export const useAdminPrezziImport = ({
	weightBands,
	volumeBands,
	bandsFromDb,
	extraRules,
	supplementRules,
	pricingVersion,
	europePricing,
	servicePricing,
	automaticSupplements,
	operationalFees,
	originalWeightBands,
	originalVolumeBands,
	originalExtraRules,
	originalSupplementRules,
	originalEuropePricing,
	originalServicePricing,
	originalAutomaticSupplements,
	originalOperationalFees,
	normalizeLadderForPayload,
	showSuccess,
	showError,
}) => {
	const sanctum = useSanctumClient();
	const { forceReload: reloadPublicPriceBands } = usePriceBands();

	// ── Loading state ────────────────────────────────────
	const isLoading = ref(true);
	const saving = ref(false);
	const seeding = ref(false);

	// ── Promo state ──────────────────────────────────────
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

	// ── Payload builders ─────────────────────────────────
	const buildEuropePricingPayload = () => {
		const normalized = normalizeEuropePricingForAdmin(europePricing.value);
		return {
			enabled: normalized.enabled !== false,
			origin_country_code: 'IT',
			max_packages: 1,
			max_quantity_per_package: 1,
			bands: normalized.bands.map((band) => ({
				id: band.id,
				label: band.label,
				max_weight_kg: Number(band.max_weight_kg || 0),
				max_volume_m3: Number(band.max_volume_m3 || 0),
				volumetric_factor: Number(band.volumetric_factor || 250),
				rates: band.rates.map((rate) => ({
					country_code: String(rate.country_code || '').trim().toUpperCase(),
					country_name: String(rate.country_name || '').trim(),
					price_cents: rate.quote_required || rate.price_cents === null || rate.price_cents === '' || rate.price_cents === undefined
						? null
						: Number(rate.price_cents || 0),
					quote_required: rate.quote_required === true,
				})),
			})),
		};
	};

	const buildPricingPayload = () => ({
		weight: weightBands.value.map((band, idx) => ({
			id: band.id || `w-${idx + 1}`,
			min_value: Number(band.min_value),
			max_value: Number(band.max_value),
			base_price: Number(band.base_price || 0),
			discount_price: band.discount_price === null || band.discount_price === '' ? null : Number(band.discount_price),
			show_discount: band.show_discount !== false,
			sort_order: idx + 1,
		})),
		volume: volumeBands.value.map((band, idx) => ({
			id: band.id || `v-${idx + 1}`,
			min_value: Number(band.min_value),
			max_value: Number(band.max_value),
			base_price: Number(band.base_price || 0),
			discount_price: band.discount_price === null || band.discount_price === '' ? null : Number(band.discount_price),
			show_discount: band.show_discount !== false,
			sort_order: idx + 1,
		})),
		extra_rules: {
			enabled: extraRules.value.enabled !== false,
			weight_start: Number(extraRules.value.weight_start),
			weight_step: Number(extraRules.value.weight_step),
			volume_start: Number(extraRules.value.volume_start),
			volume_step: Number(extraRules.value.volume_step),
			increment_cents: Number(extraRules.value.increment_cents || 0),
			increment_mode: 'flat',
			weight_increment_ladder: normalizeLadderForPayload([{ from_step: 1, to_step: null, increment_cents: Number(extraRules.value.increment_cents || 0) }], Number(extraRules.value.increment_cents || 0)),
			volume_increment_ladder: normalizeLadderForPayload([{ from_step: 1, to_step: null, increment_cents: Number(extraRules.value.increment_cents || 0) }], Number(extraRules.value.increment_cents || 0)),
			base_price_cents_mode: extraRules.value.base_price_cents_mode === 'manual' ? 'manual' : 'last_band_effective',
			base_price_cents_manual: extraRules.value.base_price_cents_mode === 'manual'
				? Number(extraRules.value.base_price_cents_manual || 0)
				: null,
			weight_resolution: Number(extraRules.value.weight_resolution || 1),
			volume_resolution: Number(extraRules.value.volume_resolution || 0.001),
		},
		supplements: supplementRules.value
			.map((rule, idx) => ({
				id: rule.id || `supplement-${idx + 1}`,
				prefix: String(rule.prefix || '').replace(/\D+/g, ''),
				amount_cents: Number(rule.amount_cents || 0),
				apply_to: ['origin', 'destination', 'both'].includes(rule.apply_to) ? rule.apply_to : 'both',
				enabled: rule.enabled !== false,
			}))
			.filter((rule) => rule.prefix.length > 0),
		europe: buildEuropePricingPayload(),
		service_pricing: buildPricingRulesPayload(servicePricing.value),
		automatic_supplements: buildPricingRulesPayload(automaticSupplements.value),
		operational_fees: buildPricingRulesPayload(operationalFees.value),
	});

	// ── Defaults ─────────────────────────────────────────
	const applyDefaults = () => {
		weightBands.value = DEFAULT_WEIGHT_BANDS.map((b, i) => ({ ...b, id: `new-w-${i}` }));
		volumeBands.value = DEFAULT_VOLUME_BANDS.map((b, i) => ({ ...b, id: `new-v-${i}` }));
		extraRules.value = { ...DEFAULT_EXTRA_RULES };
		extraRules.value.increment_mode = 'flat';
		extraRules.value.weight_increment_ladder = normalizeLadderForPayload(extraRules.value.weight_increment_ladder, extraRules.value.increment_cents);
		extraRules.value.volume_increment_ladder = normalizeLadderForPayload(extraRules.value.volume_increment_ladder, extraRules.value.increment_cents);
		supplementRules.value = DEFAULT_SUPPLEMENTS.map(rule => ({ ...rule }));
		originalExtraRules.value = JSON.parse(JSON.stringify(extraRules.value));
		originalSupplementRules.value = JSON.parse(JSON.stringify(supplementRules.value));
		europePricing.value = normalizeEuropePricingForAdmin(DEFAULT_EUROPE_PRICING);
		originalEuropePricing.value = JSON.parse(JSON.stringify(europePricing.value));
		servicePricing.value = normalizePricingGroupForAdmin({}, DEFAULT_SERVICE_PRICING);
		automaticSupplements.value = normalizePricingGroupForAdmin({}, DEFAULT_AUTOMATIC_SUPPLEMENTS);
		operationalFees.value = normalizePricingGroupForAdmin({}, DEFAULT_OPERATIONAL_FEES);
		originalServicePricing.value = JSON.parse(JSON.stringify(servicePricing.value));
		originalAutomaticSupplements.value = JSON.parse(JSON.stringify(automaticSupplements.value));
		originalOperationalFees.value = JSON.parse(JSON.stringify(operationalFees.value));
		pricingVersion.value = null;
		bandsFromDb.value = false;
	};

	// ── Fetch ────────────────────────────────────────────
	const fetchPriceBands = async () => {
		isLoading.value = true;
		try {
			const res = await sanctum("/api/admin/price-bands");
			const payload = res?.data || res || {};
			const data = payload?.data || payload || {};
			const w = data.weight || [];
			const v = data.volume || [];
			if (w.length > 0 || v.length > 0) {
				weightBands.value = w.map(b => ({ ...b }));
				volumeBands.value = v.map(b => ({ ...b }));
				originalWeightBands.value = w.map(b => ({ ...b }));
				originalVolumeBands.value = v.map(b => ({ ...b }));
				extraRules.value = { ...DEFAULT_EXTRA_RULES, ...(data.extra_rules || {}) };
				extraRules.value.increment_mode = 'flat';
				extraRules.value.weight_increment_ladder = normalizeLadderForPayload(extraRules.value.weight_increment_ladder, extraRules.value.increment_cents);
				extraRules.value.volume_increment_ladder = normalizeLadderForPayload(extraRules.value.volume_increment_ladder, extraRules.value.increment_cents);
				const supplementsFromApi = Array.isArray(data.supplements) ? data.supplements : DEFAULT_SUPPLEMENTS;
				supplementRules.value = supplementsFromApi.map((rule, idx) => ({ id: rule.id || `supplement-${idx + 1}`, ...rule }));
				originalExtraRules.value = JSON.parse(JSON.stringify(extraRules.value));
				originalSupplementRules.value = JSON.parse(JSON.stringify(supplementRules.value));
				europePricing.value = normalizeEuropePricingForAdmin(data.europe || DEFAULT_EUROPE_PRICING);
				originalEuropePricing.value = JSON.parse(JSON.stringify(europePricing.value));
				servicePricing.value = normalizePricingGroupForAdmin(data.service_pricing || {}, DEFAULT_SERVICE_PRICING);
				automaticSupplements.value = normalizePricingGroupForAdmin(data.automatic_supplements || {}, DEFAULT_AUTOMATIC_SUPPLEMENTS);
				operationalFees.value = normalizePricingGroupForAdmin(data.operational_fees || {}, DEFAULT_OPERATIONAL_FEES);
				originalServicePricing.value = JSON.parse(JSON.stringify(servicePricing.value));
				originalAutomaticSupplements.value = JSON.parse(JSON.stringify(automaticSupplements.value));
				originalOperationalFees.value = JSON.parse(JSON.stringify(operationalFees.value));
				pricingVersion.value = data.version || null;
				bandsFromDb.value = true;
			} else {
				applyDefaults();
			}
		} catch (e) {
			applyDefaults();
		} finally {
			isLoading.value = false;
		}
	};

	const fetchPromoSettings = async () => {
		promoLoading.value = true;
		try {
			const res = await sanctum("/api/admin/promo-settings");
			const data = res?.data || res || {};
			promo.value = {
				active: data.promo_active === 'true' || data.promo_active === true,
				label_text: data.promo_label_text || '',
				label_color: data.promo_label_color || '#E44203',
				label_image: data.promo_label_image || null,
				show_badges: data.promo_show_badges === 'true' || data.promo_show_badges === true,
				description: data.promo_description || '',
			};
		} catch (e) {
			// Default values already set
		} finally {
			promoLoading.value = false;
		}
	};

	// ── Save ─────────────────────────────────────────────
	const seedBands = async () => {
		seeding.value = true;
		try {
			await sanctum("/api/admin/price-bands/seed", { method: "POST" });
			showSuccess("Fasce di prezzo inizializzate nel database.");
			await fetchPriceBands();
			await reloadPublicPriceBands();
		} catch (e) {
			showError(e, "Errore durante l'inizializzazione delle fasce.");
		} finally {
			seeding.value = false;
		}
	};

	const savePriceBands = async () => {
		saving.value = true;
		try {
			const payload = buildPricingPayload();
			const response = await sanctum("/api/admin/price-bands", { method: "PUT", body: payload });
			const data = response?.data || {};
			showSuccess("Configurazione prezzi nazionale ed Europa salvata con successo.");
			bandsFromDb.value = true;
			originalWeightBands.value = (data.weight || payload.weight).map(b => ({ ...b }));
			originalVolumeBands.value = (data.volume || payload.volume).map(b => ({ ...b }));
			originalExtraRules.value = JSON.parse(JSON.stringify(data.extra_rules || payload.extra_rules));
			originalSupplementRules.value = JSON.parse(JSON.stringify(data.supplements || payload.supplements));
			europePricing.value = normalizeEuropePricingForAdmin(data.europe || payload.europe || DEFAULT_EUROPE_PRICING);
			originalEuropePricing.value = JSON.parse(JSON.stringify(europePricing.value));
			servicePricing.value = normalizePricingGroupForAdmin(data.service_pricing || payload.service_pricing || {}, DEFAULT_SERVICE_PRICING);
			automaticSupplements.value = normalizePricingGroupForAdmin(data.automatic_supplements || payload.automatic_supplements || {}, DEFAULT_AUTOMATIC_SUPPLEMENTS);
			operationalFees.value = normalizePricingGroupForAdmin(data.operational_fees || payload.operational_fees || {}, DEFAULT_OPERATIONAL_FEES);
			originalServicePricing.value = JSON.parse(JSON.stringify(servicePricing.value));
			originalAutomaticSupplements.value = JSON.parse(JSON.stringify(automaticSupplements.value));
			originalOperationalFees.value = JSON.parse(JSON.stringify(operationalFees.value));
			pricingVersion.value = data.version || pricingVersion.value;
			await reloadPublicPriceBands();
		} catch (e) {
			showError(e, "Errore durante il salvataggio della configurazione prezzi.");
		} finally {
			saving.value = false;
		}
	};

	const savePromo = async () => {
		promoSaving.value = true;
		try {
			await sanctum("/api/admin/promo-settings", {
				method: "POST",
				body: {
					promo_active: promo.value.active ? 'true' : 'false',
					promo_label_text: promo.value.label_text,
					promo_label_color: promo.value.label_color,
					promo_show_badges: promo.value.show_badges ? 'true' : 'false',
					promo_description: promo.value.description,
				},
			});
			showSuccess("Impostazioni promozione salvate con successo.");
			await reloadPublicPriceBands();
		} catch (e) {
			showError(e, "Errore durante il salvataggio della promozione.");
		} finally {
			promoSaving.value = false;
		}
	};

	const uploadPromoImage = async (event) => {
		const file = event.target.files?.[0];
		if (!file) return;
		const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
		if (!validTypes.includes(file.type)) {
			showError(null, "Formato file non valido. Usa JPG, PNG, GIF o WebP.");
			event.target.value = '';
			return;
		}
		const maxSize = 2 * 1024 * 1024;
		if (file.size > maxSize) {
			showError(null, "File troppo grande. Dimensione massima: 2MB.");
			event.target.value = '';
			return;
		}
		promoImageUploading.value = true;
		try {
			const formData = new FormData();
			formData.append('image', file);
			const res = await sanctum("/api/admin/promo-settings/upload-image", { method: "POST", body: formData });
			promo.value.label_image = res?.image_url || null;
			showSuccess("Immagine promo caricata.");
		} catch (e) {
			showError(e, "Errore durante l'upload dell'immagine.");
		} finally {
			promoImageUploading.value = false;
			event.target.value = '';
		}
	};

	return {
		// Loading state
		isLoading,
		saving,
		seeding,
		// Promo state
		promoLoading,
		promoSaving,
		promoImageUploading,
		promo,
		// Payload builder (needed by List composable for hasChanges)
		buildPricingPayload,
		// Fetch/save
		fetchPriceBands,
		fetchPromoSettings,
		seedBands,
		savePriceBands,
		savePromo,
		uploadPromoImage,
	};
};
