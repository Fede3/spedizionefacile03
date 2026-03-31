/**
 * COMPOSABLE: useAdminPrezzi (useAdminPrezzi.js)
 * SCOPO: Logica completa del pannello admin prezzi — fasce nazionali, Europa, servizi, promo.
 *        Estratto da pages/account/amministrazione/prezzi.vue per ridurre la dimensione della pagina.
 *
 * DOVE SI USA: pages/account/amministrazione/prezzi.vue e sotto-componenti admin prezzi.
 *
 * COSA RESTITUISCE:
 *   - Stato reattivo: weightBands, volumeBands, extraRules, supplementRules, europePricing,
 *     servicePricing, automaticSupplements, operationalFees, promo, adminView, ecc.
 *   - Funzioni CRUD: addBand, removeBand, moveBand, startEdit, confirmEdit, cancelEdit, ecc.
 *   - Fetch/salvataggio: fetchPriceBands, savePriceBands, fetchPromoSettings, savePromo, seedBands.
 *   - Utility: centsToEuro, euroToCents, effectivePrice, discountInfo, formatApplicationLabel.
 *   - Computed: hasChanges, filteredEuropeBands, filteredServiceEntries, pricingPreviewCases, ecc.
 *
 * API: GET/PUT /api/admin/price-bands, POST /api/admin/price-bands/seed,
 *      GET/POST /api/admin/promo-settings, POST /api/admin/promo-settings/upload-image.
 *
 * VINCOLI:
 *   - Prezzi in centesimi nel DB, visualizzati in euro nel frontend.
 *   - Formula: MAX(prezzo_peso, prezzo_volume) + supplementi CAP.
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

export const useAdminPrezzi = () => {
	const sanctum = useSanctumClient();
	const { actionMessage, showSuccess, showError } = useAdmin();
	const { forceReload: reloadPublicPriceBands } = usePriceBands();

	// ── Stato reattivo ──────────────────────────────────
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

	// ── Promo ──────────────────────────────────────────
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

	// ── Editing state ─────────────────────────────────
	const editingCell = ref(null);
	const editValue = ref('');

	// ── Utility ───────────────────────────────────────
	const centsToEuro = (cents) => {
		if (cents == null || cents === '') return '-';
		return (Number(cents) / 100).toFixed(2).replace('.', ',') + '\u20AC';
	};

	const euroToCents = (euro) => {
		if (euro == null || euro === '') return null;
		const cleaned = String(euro).replace(/[€\s]/g, '').replace(',', '.');
		const num = parseFloat(cleaned);
		return isNaN(num) ? null : Math.round(num * 100);
	};

	const effectivePrice = (band) => {
		return band.discount_price != null ? band.discount_price : band.base_price;
	};

	const discountInfo = (band) => {
		if (band.discount_price == null || band.base_price <= 0) return null;
		const diff = ((1 - band.discount_price / band.base_price) * 100);
		return Math.round(diff);
	};

	const formatApplicationLabel = (value) => ({
		per_spedizione: 'Per spedizione',
		automatic_destination_per_package: 'Automatico su destinazione / collo',
		automatic_destination: 'Automatico su destinazione',
		automatic_package_shape: 'Automatico per forma collo',
		automatic_per_package: 'Automatico per collo',
		manual_quote_only: 'Solo preventivo manuale',
		manual_admin: 'Fee operativa admin',
	}[value] || value || '\u2014');

	const incrementCentsToEuro = (value) => (Number(value || 0) / 100).toFixed(2).replace('.', ',');

	const updateLadderIncrementFromEuro = (row, rawValue) => {
		const cents = euroToCents(rawValue);
		row.increment_cents = Math.max(0, cents ?? 0);
	};

	// ── Ladder helpers ────────────────────────────────
	const normalizeLadderForPayload = (rows, fallbackIncrement) => {
		const fallback = Math.max(0, Number(fallbackIncrement || 0));
		const source = Array.isArray(rows) ? rows : [];
		const normalized = source
			.map((row, idx) => {
				const fromStep = Math.max(1, Number.parseInt(row?.from_step ?? (idx + 1), 10) || 1);
				const toRaw = row?.to_step;
				const toStep = toRaw === null || toRaw === '' || toRaw === undefined
					? null
					: Math.max(fromStep, Number.parseInt(toRaw, 10) || fromStep);
				const increment = Math.max(0, Number.parseInt(row?.increment_cents ?? fallback, 10) || 0);
				return { from_step: fromStep, to_step: toStep, increment_cents: increment };
			})
			.sort((a, b) => a.from_step - b.from_step);

		if (!normalized.length) {
			return [{ from_step: 1, to_step: null, increment_cents: fallback }];
		}
		normalized[normalized.length - 1].to_step = null;
		return normalized;
	};

	const ladderRowsFor = (kind) => {
		return kind === 'weight' ? extraRules.value.weight_increment_ladder : extraRules.value.volume_increment_ladder;
	};

	const addLadderRow = (kind) => {
		const rows = ladderRowsFor(kind);
		const payloadRows = normalizeLadderForPayload(rows, extraRules.value.increment_cents);
		const last = payloadRows[payloadRows.length - 1] || { from_step: 1, to_step: null, increment_cents: Number(extraRules.value.increment_cents || 0) };
		const fromStep = last.to_step == null ? (last.from_step + 1) : (last.to_step + 1);
		rows.push({
			from_step: fromStep,
			to_step: null,
			increment_cents: Number(last.increment_cents || extraRules.value.increment_cents || 0),
		});
	};

	const removeLadderRow = (kind, idx) => {
		const rows = ladderRowsFor(kind);
		if (rows.length <= 1) {
			showError(null, 'Deve rimanere almeno uno scaglione incremento.');
			return;
		}
		rows.splice(idx, 1);
	};

	const ensureLadderContinuity = (kind) => {
		const rows = ladderRowsFor(kind);
		const normalized = normalizeLadderForPayload(rows, extraRules.value.increment_cents);
		const rebuilt = normalized.map((row, idx) => ({
			from_step: idx === 0 ? 1 : normalized[idx - 1].to_step + 1,
			to_step: idx === normalized.length - 1 ? null : (row.to_step ?? row.from_step),
			increment_cents: row.increment_cents,
		}));
		if (kind === 'weight') {
			extraRules.value.weight_increment_ladder = rebuilt;
		} else {
			extraRules.value.volume_increment_ladder = rebuilt;
		}
	};

	// ── Preview price calc ────────────────────────────
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

	// ── Payload builders ──────────────────────────────
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

	// ── Band edit actions ─────────────────────────────
	const startEdit = (type, idx, field) => {
		const key = `${type}-${idx}-${field}`;
		editingCell.value = key;
		const bands = type === 'weight' ? weightBands.value : volumeBands.value;
		const cents = bands[idx][field];
		editValue.value = cents != null ? (Number(cents) / 100).toFixed(2).replace('.', ',') : '';
		nextTick(() => {
			const input = document.getElementById(`edit-${key}`);
			if (input) { input.focus(); input.select(); }
		});
	};

	const confirmEdit = (type, idx, field) => {
		const key = `${type}-${idx}-${field}`;
		if (editingCell.value !== key) return;
		const bands = type === 'weight' ? weightBands.value : volumeBands.value;
		const newCents = euroToCents(editValue.value);
		if (newCents !== null && newCents < 0) {
			showError(null, "Il prezzo non può essere negativo.");
			editingCell.value = null;
			editValue.value = '';
			return;
		}
		bands[idx][field] = newCents;
		editingCell.value = null;
		editValue.value = '';
	};

	const cancelEdit = () => {
		editingCell.value = null;
		editValue.value = '';
	};

	const toggleShowDiscount = (type, idx) => {
		const bands = type === 'weight' ? weightBands.value : volumeBands.value;
		bands[idx].show_discount = !bands[idx].show_discount;
	};

	const addBand = (type) => {
		const bands = type === 'weight' ? weightBands.value : volumeBands.value;
		const last = bands[bands.length - 1];
		const min = last ? Number(last.max_value) : 0;
		const max = Number((min + (type === 'weight' ? 50 : 0.2)).toFixed(3));
		bands.push({
			id: `${type}-new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
			type,
			min_value: Number(min.toFixed(3)),
			max_value: max,
			base_price: last ? Number(last.base_price || 0) : 0,
			discount_price: null,
			show_discount: true,
			sort_order: bands.length + 1,
		});
	};

	const removeBand = (type, idx) => {
		const bands = type === 'weight' ? weightBands.value : volumeBands.value;
		if (bands.length <= 1) {
			showError(null, "Deve rimanere almeno una fascia.");
			return;
		}
		bands.splice(idx, 1);
	};

	const moveBand = (type, idx, direction) => {
		const bands = type === 'weight' ? weightBands.value : volumeBands.value;
		const target = idx + direction;
		if (target < 0 || target >= bands.length) return;
		[bands[idx], bands[target]] = [bands[target], bands[idx]];
	};

	// ── Supplement actions ─────────────────────────────
	const addSupplement = () => {
		supplementRules.value.push({
			id: `supplement-${Date.now()}`,
			prefix: '',
			amount_cents: 0,
			apply_to: 'both',
			enabled: true,
		});
	};

	const removeSupplement = (idx) => {
		supplementRules.value.splice(idx, 1);
	};

	const supplementAmountToEuro = (rule) => {
		const cents = Number(rule?.amount_cents || 0);
		return (cents / 100).toFixed(2).replace('.', ',');
	};

	const updateSupplementAmountFromEuro = (rule, rawValue) => {
		const cleaned = String(rawValue || '').replace(/[€\s]/g, '').replace(',', '.');
		const value = Number.parseFloat(cleaned);
		if (!Number.isFinite(value) || value < 0) {
			rule.amount_cents = 0;
			return;
		}
		rule.amount_cents = Math.round(value * 100);
	};

	// ── Service / keyed rule helpers ──────────────────
	const keyedRuleAmountToEuro = (rule) => (Number(rule?.price_cents || 0) / 100).toFixed(2).replace('.', ',');

	const updateKeyedRuleAmountFromEuro = (rule, rawValue) => {
		const cents = euroToCents(rawValue);
		rule.price_cents = Math.max(0, cents ?? 0);
	};

	const keyedRuleMinFeeToEuro = (rule) => (Number(rule?.min_fee_cents || 0) / 100).toFixed(2).replace('.', ',');

	const updateKeyedRuleMinFeeFromEuro = (rule, rawValue) => {
		const cents = euroToCents(rawValue);
		rule.min_fee_cents = Math.max(0, cents ?? 0);
	};

	const normalizeArrayFieldInput = (rawValue, { uppercase = false } = {}) =>
		String(rawValue || '')
			.split(',')
			.map((item) => String(item || '').trim())
			.filter(Boolean)
			.map((item) => uppercase ? item.toUpperCase() : item.toLowerCase());

	const updateArrayField = (rule, field, rawValue, { uppercase = false } = {}) => {
		rule[field] = normalizeArrayFieldInput(rawValue, { uppercase });
	};

	const addTierRow = (rule) => {
		const last = Array.isArray(rule.tiers) && rule.tiers.length ? rule.tiers[rule.tiers.length - 1] : null;
		rule.tiers = Array.isArray(rule.tiers) ? rule.tiers : [];
		rule.tiers.push({
			up_to_kg: last?.up_to_kg != null ? Number(last.up_to_kg) + 5 : null,
			price_cents: Number(last?.price_cents || 0),
		});
	};

	const removeTierRow = (rule, idx) => {
		if (!Array.isArray(rule.tiers) || rule.tiers.length <= 1) {
			showError(null, 'Serve almeno uno scaglione per la regola selezionata.');
			return;
		}
		rule.tiers.splice(idx, 1);
	};

	// ── Europe rate helpers ───────────────────────────
	const updateEuropeRateAmountFromEuro = (rate, rawValue) => {
		const cents = euroToCents(rawValue);
		rate.price_cents = cents == null ? null : Math.max(0, cents);
	};

	const toggleEuropeRateQuote = (rate) => {
		rate.quote_required = !rate.quote_required;
		if (rate.quote_required) {
			rate.price_cents = null;
		}
	};

	// ── Fetch ─────────────────────────────────────────
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

	// ── Save ──────────────────────────────────────────
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
		// State
		isLoading, saving, seeding, weightBands, volumeBands, bandsFromDb,
		extraRules, supplementRules, pricingVersion,
		europePricing, servicePricing, automaticSupplements, operationalFees,
		adminView, compactEuropeView, europeSearch, europeStatusFilter,
		europeBandFilter, europeSort, serviceSearch, serviceFilter,
		promoLoading, promoSaving, promoImageUploading, promo,
		editingCell, editValue, actionMessage,
		// Computed
		hasChanges, servicePricingEntries, automaticSupplementEntries,
		operationalFeeEntries, filteredServiceEntries, europeBandFilters,
		filteredEuropeBands, extraRuleExamples, pricingPreviewCases,
		// Utility
		centsToEuro, euroToCents, effectivePrice, discountInfo,
		formatApplicationLabel, incrementCentsToEuro, updateLadderIncrementFromEuro,
		// Band actions
		startEdit, confirmEdit, cancelEdit, toggleShowDiscount,
		addBand, removeBand, moveBand,
		// Supplement actions
		addSupplement, removeSupplement, supplementAmountToEuro, updateSupplementAmountFromEuro,
		// Ladder actions
		addLadderRow, removeLadderRow, ensureLadderContinuity, ladderRowsFor,
		// Service/keyed rule helpers
		keyedRuleAmountToEuro, updateKeyedRuleAmountFromEuro,
		keyedRuleMinFeeToEuro, updateKeyedRuleMinFeeFromEuro,
		updateArrayField, addTierRow, removeTierRow,
		// Europe helpers
		updateEuropeRateAmountFromEuro, toggleEuropeRateQuote,
		// Fetch/save
		fetchPriceBands, fetchPromoSettings, seedBands, savePriceBands, savePromo, uploadPromoImage,
	};
};
