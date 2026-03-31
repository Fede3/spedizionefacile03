<!--
  FILE: pages/account/amministrazione/prezzi.vue
  SCOPO: Pannello admin — editor fasce di prezzo (peso e volume) e gestione promozione sito.
         Tabelle editabili inline con prezzi base, scontati, percentuale sconto, toggle visibilita'.
         Sezione promozione: etichetta personalizzabile, colore, immagine, descrizione, anteprima live.
  API: GET /api/admin/price-bands — leggi fasce prezzo,
       PUT /api/admin/price-bands — salva modifiche fasce,
       POST /api/admin/price-bands/seed — inizializza fasce nel DB,
       GET /api/admin/promo-settings — leggi impostazioni promo,
       POST /api/admin/promo-settings — salva impostazioni promo,
       POST /api/admin/promo-settings/upload-image — carica immagine promo.
  COMPONENTI: nessun componente custom.
  ROUTE: /account/amministrazione/prezzi (middleware sanctum:auth + admin).

  DATI IN INGRESSO:
    - weightBands, volumeBands (da fetchPriceBands) — fasce dal server o default.
    - promo (da fetchPromoSettings) — impostazioni promozione.
    - usePriceBands().forceReload — ricarica fasce pubbliche dopo salvataggio.

  DATI IN USCITA:
    - PUT fasce prezzo, POST promo settings, POST upload immagine.

  VINCOLI:
    - Solo utenti Admin (middleware admin).
    - I prezzi sono salvati in centesimi nel DB, visualizzati in euro nel frontend.
    - Formula prezzo: MAX(prezzo_peso, prezzo_volume) + supplementi CAP configurabili (prefisso, importo, origine/destinazione).
    - Se discount_price e' null, il prezzo effettivo e' il base_price.

  ERRORI TIPICI:
    - Fasce non ancora nel DB → banner giallo con pulsante "Inizializza".
    - Formato prezzo errato → euroToCents restituisce null.

  PUNTI DI MODIFICA SICURI:
    - Aggiungere fasce: modificare DEFAULT_WEIGHT_BANDS / DEFAULT_VOLUME_BANDS.
    - Cambiare formula sconto: modificare discountInfo().
    - Personalizzare anteprima promo: modificare il blocco "Anteprima header homepage".

  COLLEGAMENTI:
    - composables/usePriceBands.js → cache pubblica delle fasce prezzo.
    - components/Preventivo.vue → usa le fasce per il calcolo preventivo.
    - components/ContenutoHeader.vue → mostra etichetta promo e descrizione.
-->
<script setup>
definePageMeta({
	middleware: ["app-auth", "admin"],
});

const sanctum = useSanctumClient();
const { actionMessage, showSuccess, showError } = useAdmin();
const { forceReload: reloadPublicPriceBands } = usePriceBands();

const isLoading = ref(true);
const saving = ref(false);
const seeding = ref(false);
const weightBands = ref([]);
const volumeBands = ref([]);
const bandsFromDb = ref(false);
const originalWeightBands = ref([]);
const originalVolumeBands = ref([]);
const extraRules = ref({
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
});
const supplementRules = ref([
	{ id: 'supplement-1', prefix: '90', amount_cents: 250, apply_to: 'both', enabled: true },
]);
const originalExtraRules = ref(null);
const originalSupplementRules = ref([]);
const pricingVersion = ref(null);
const europePricing = ref({
	enabled: true,
	scope: 'europe_monocollo',
	origin_country_code: 'IT',
	max_packages: 1,
	max_quantity_per_package: 1,
	bands: [],
	supported_country_codes: [],
	version: null,
});
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

// --- PROMO ---
const promoLoading = ref(false);
const promoSaving = ref(false);
const promoImageUploading = ref(false);
const promo = ref({
	active: false,
	label_text: '',
	label_color: '#E44203',
	label_image: null,
	show_badges: true,
	description: '', // Descrizione testuale dello sconto mostrata nell'header homepage
});

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

// Fasce di default
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

const buildPricingRulesPayload = (group = {}) => JSON.parse(JSON.stringify(group));

const formatApplicationLabel = (value) => ({
	per_spedizione: 'Per spedizione',
	automatic_destination_per_package: 'Automatico su destinazione / collo',
	automatic_destination: 'Automatico su destinazione',
	automatic_package_shape: 'Automatico per forma collo',
	automatic_per_package: 'Automatico per collo',
	manual_quote_only: 'Solo preventivo manuale',
	manual_admin: 'Fee operativa admin',
}[value] || value || '—');

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

// Stato editing
const editingCell = ref(null);
const editValue = ref('');

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
			extraRules.value = {
				...DEFAULT_EXTRA_RULES,
				...(data.extra_rules || {}),
			};
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
		}
	} catch (e) {
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

// Calcola la percentuale di sconto/aumento
const discountInfo = (band) => {
	if (band.discount_price == null || band.base_price <= 0) return null;
	const diff = ((1 - band.discount_price / band.base_price) * 100);
	return Math.round(diff);
};

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

const incrementCentsToEuro = (value) => (Number(value || 0) / 100).toFixed(2).replace('.', ',');

const updateLadderIncrementFromEuro = (row, rawValue) => {
	const cents = euroToCents(rawValue);
	row.increment_cents = Math.max(0, cents ?? 0);
};

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

	// Regola business corrente: incremento fisso per ogni fascia extra.
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

const extraRuleExamples = computed(() => {
	const firstWeightFrom = Number(extraRules.value.weight_start || 101);
	const firstWeightTo = Number((firstWeightFrom + Number(extraRules.value.weight_step || 50) - Number(extraRules.value.weight_resolution || 1)).toFixed(4));
	const secondWeightFrom = Number((firstWeightFrom + Number(extraRules.value.weight_step || 50)).toFixed(4));
	const secondWeightTo = Number((secondWeightFrom + Number(extraRules.value.weight_step || 50) - Number(extraRules.value.weight_resolution || 1)).toFixed(4));

	const firstVolumeFrom = Number(extraRules.value.volume_start || 0.401);
	const firstVolumeTo = Number((firstVolumeFrom + Number(extraRules.value.volume_step || 0.2) - Number(extraRules.value.volume_resolution || 0.001)).toFixed(4));
	const secondVolumeFrom = Number((firstVolumeFrom + Number(extraRules.value.volume_step || 0.2)).toFixed(4));
	const secondVolumeTo = Number((secondVolumeFrom + Number(extraRules.value.volume_step || 0.2) - Number(extraRules.value.volume_resolution || 0.001)).toFixed(4));

	return {
		firstWeightFrom,
		firstWeightTo,
		secondWeightFrom,
		secondWeightTo,
		firstVolumeFrom,
		firstVolumeTo,
		secondVolumeFrom,
		secondVolumeTo,
	};
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
		return {
			...row,
			weightPriceLabel: centsToEuro(weightPriceCents),
			volumePriceLabel: centsToEuro(volumePriceCents),
			totalLabel: centsToEuro(totalCents),
		};
	});
});

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

	// Validate that price is not negative
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
	const step = type === 'weight' ? 1 : 0.001;
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

	// Validate file type
	const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
	if (!validTypes.includes(file.type)) {
		showError(null, "Formato file non valido. Usa JPG, PNG, GIF o WebP.");
		event.target.value = ''; // Reset input
		return;
	}

	// Validate file size (max 2MB)
	const maxSize = 2 * 1024 * 1024; // 2MB in bytes
	if (file.size > maxSize) {
		showError(null, "File troppo grande. Dimensione massima: 2MB.");
		event.target.value = ''; // Reset input
		return;
	}

	promoImageUploading.value = true;
	try {
		const formData = new FormData();
		formData.append('image', file);
		const res = await sanctum("/api/admin/promo-settings/upload-image", {
			method: "POST",
			body: formData,
		});
		promo.value.label_image = res?.image_url || null;
		showSuccess("Immagine promo caricata.");
	} catch (e) {
		showError(e, "Errore durante l'upload dell'immagine.");
	} finally {
		promoImageUploading.value = false;
		event.target.value = ''; // Reset input
	}
};

onMounted(() => {
	fetchPriceBands();
	fetchPromoSettings();
	if (window.innerWidth < 1280) {
		compactEuropeView.value = true;
	}
});
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Prezzi e fasce</span>
			</div>

			<h1 class="text-[1.375rem] tablet:text-[1.75rem] font-bold text-[#252B42] mb-[8px]">Prezzi e fasce</h1>
			<p class="text-[0.875rem] text-[#737373] mb-[16px]">Clicca su un prezzo per modificarlo. Premi Invio per confermare o Esc per annullare.</p>

			<div class="bg-white rounded-[24px] border border-[#E9EBEC] shadow-sm p-[16px] tablet:p-[20px] desktop:p-[24px] mb-[24px] overflow-hidden">
				<div class="grid gap-[12px]">
					<div class="grid grid-cols-1 tablet:grid-cols-3 gap-[10px] tablet:gap-[12px] desktop:max-w-[800px] desktop:w-full">
						<button
							v-for="view in [
								{ id: 'nazionale', label: 'Nazionale' },
								{ id: 'europa', label: 'Europa monocollo' },
								{ id: 'servizi', label: 'Servizi e supplementi' },
							]"
							:key="view.id"
							type="button"
							@click="adminView = view.id"
							:class="adminView === view.id ? 'bg-[#095866] text-white border-[#095866]' : 'bg-[#F7FAFC] text-[#425466] border-[#D8E3E8]'"
							class="inline-flex w-full min-h-[48px] items-center justify-center text-center whitespace-nowrap gap-[8px] px-[14px] tablet:px-[16px] py-[10px] rounded-full border text-[0.875rem] font-semibold transition-colors cursor-pointer">
							{{ view.label }}
						</button>
					</div>

					<div class="min-h-[112px] tablet:min-h-[92px] desktop:min-h-[92px] flex items-start">
						<div v-if="adminView === 'europa'" class="grid w-full grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-[minmax(0,1fr)_160px_160px_180px_auto] gap-[10px]">
							<input v-model="europeSearch" type="text" placeholder="Cerca paese o codice..." class="h-[42px] w-full min-w-0 px-[14px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.875rem] text-[#252B42]">
							<select v-model="europeStatusFilter" class="h-[42px] w-full min-w-0 px-[14px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.875rem] text-[#252B42]">
								<option value="all">Tutti</option>
								<option value="active">Prezzo attivo</option>
								<option value="quote_required">Solo preventivo</option>
							</select>
							<select v-model="europeBandFilter" class="h-[42px] w-full min-w-0 px-[14px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.875rem] text-[#252B42]">
								<option v-for="option in europeBandFilters" :key="option.value" :value="option.value">{{ option.label }}</option>
							</select>
							<select v-model="europeSort" class="h-[42px] w-full min-w-0 px-[14px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.875rem] text-[#252B42]">
								<option value="country_asc">Ordina per paese</option>
								<option value="price_asc">Prezzo crescente</option>
								<option value="price_desc">Prezzo decrescente</option>
								<option value="status">Per stato</option>
							</select>
							<label class="inline-flex min-h-[42px] items-center gap-[8px] whitespace-nowrap text-[0.8125rem] text-[#4F5D75] desktop:justify-self-end">
								<input v-model="compactEuropeView" type="checkbox" class="rounded border-[#C8CCD0] text-[#095866] focus:ring-[#095866]">
								Vista compatta
							</label>
						</div>

						<div v-else-if="adminView === 'servizi'" class="grid w-full grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-[minmax(0,1fr)_190px_auto] gap-[10px]">
							<input v-model="serviceSearch" type="text" placeholder="Cerca regola o supplemento..." class="h-[42px] w-full min-w-0 px-[14px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.875rem] text-[#252B42]">
							<select v-model="serviceFilter" class="h-[42px] w-full min-w-0 px-[14px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.875rem] text-[#252B42]">
								<option value="all">Tutte le sezioni</option>
								<option value="service_pricing">Servizi utente</option>
								<option value="automatic_supplements">Supplementi automatici</option>
								<option value="operational_fees">Fee operative</option>
							</select>
							<div class="inline-flex min-h-[42px] items-center gap-[8px] px-[12px] py-[10px] rounded-[12px] bg-[#F4FAFC] border border-[#D8E9F0] text-[0.8125rem] text-[#095866] desktop:justify-self-end">
								{{ filteredServiceEntries.length }} regole visibili
							</div>
						</div>

						<div v-else class="inline-flex min-h-[42px] items-center gap-[8px] rounded-[12px] bg-[#F8FBFC] border border-[#E2ECEF] px-[12px] py-[10px] text-[0.8125rem] text-[#5B6B7D]">
							Gestisci fasce nazionali, volume e supplementi CAP da un layout stabile.
						</div>
					</div>
				</div>
			</div>

			<!-- Info calcolatore -->
			<div class="bg-purple-50 rounded-[16px] p-[12px] tablet:p-[16px] border border-purple-200 mb-[24px]">
				<h3 class="text-[0.9375rem] font-bold text-purple-800 mb-[8px] flex items-center gap-[6px]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M7,2H17A2,2 0 0,1 19,4V20A2,2 0 0,1 17,22H7A2,2 0 0,1 5,20V4A2,2 0 0,1 7,2M7,4V8H17V4H7M7,10V12H9V10H7M11,10V12H13V10H11M15,10V12H17V10H15M7,14V16H9V14H7M11,14V16H13V14H11M15,14V16H17V14H15M7,18V20H9V18H7M11,18V20H13V18H11M15,18V20H17V18H15Z"/></svg>
					Come funziona il calcolatore
				</h3>
				<ul class="text-[0.8125rem] text-purple-700 space-y-[4px] list-disc list-inside">
					<li><strong>Prezzo finale = MAX(prezzo_peso, prezzo_volume)</strong> + supplementi CAP configurati</li>
					<li><strong>Peso volumetrico:</strong> (Lunghezza x Larghezza x Altezza) / 5000 (dimensioni in cm)</li>
					<li><strong>Supplementi CAP:</strong> definibili da admin per prefisso, importo e applicazione (origine/destinazione/entrambi)</li>
					<li>Se c'e' un <strong>prezzo scontato</strong>, viene usato al posto del prezzo base</li>
					<li>Il prezzo visualizzato dal cliente e' il <strong>"Prezzo effettivo"</strong> in verde</li>
					<li><strong>Sconto %:</strong> calcolato automaticamente come (1 - scontato/base) &times; 100</li>
					<li><strong>Visibile:</strong> controlla se il badge sconto appare sul sito per quella fascia</li>
				</ul>
			</div>

			<!-- Action message -->
			<div
				v-if="actionMessage"
				:class="[
					'mb-[20px] px-[16px] py-[12px] rounded-[12px] text-[0.875rem] font-medium flex items-center gap-[8px]',
					actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200',
				]">
				<svg v-if="actionMessage.type === 'success'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg>
				<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
				{{ actionMessage.text }}
			</div>

			<!-- Loading -->
			<div v-if="isLoading" class="py-[60px] flex justify-center">
				<div class="w-[40px] h-[40px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
			</div>

			<template v-else>
				<div class="space-y-[24px]">
					<template v-if="adminView === 'nazionale'">
					<!-- Banner: fasce non salvate nel DB -->
					<div v-if="!bandsFromDb" class="bg-amber-50 rounded-[16px] p-[20px] border border-amber-200 mb-[24px]">
						<div class="flex items-start gap-[12px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[24px] h-[24px] text-amber-600 shrink-0 mt-[2px]" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
							<div>
								<h3 class="text-[0.9375rem] font-bold text-amber-800 mb-[4px]">Fasce di prezzo non ancora nel database</h3>
								<p class="text-[0.8125rem] text-amber-700 mb-[12px]">Stai vedendo i valori predefiniti del calcolatore. Premi il pulsante per salvarli nel database e poterli modificare.</p>
								<button
									@click="seedBands"
									:disabled="seeding"
									class="inline-flex items-center gap-[8px] px-[20px] py-[10px] bg-amber-600 hover:bg-amber-700 text-white rounded-[50px] text-[0.875rem] font-medium transition-colors cursor-pointer disabled:opacity-50">
									<svg v-if="seeding" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] animate-spin" fill="currentColor"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>
									<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M17,13H13V17H11V13H7V11H11V7H13V11H17M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
									{{ seeding ? "Inizializzazione..." : "Inizializza fasce nel database" }}
								</button>
							</div>
						</div>
					</div>

					<!-- Fasce peso -->
					<div class="bg-white rounded-[20px] p-[16px] tablet:p-[20px] desktop:p-[28px] shadow-sm border border-[#E9EBEC] overflow-hidden">
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[6px] flex items-center gap-[8px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-[#095866]" fill="currentColor"><path d="M12,3A4,4 0 0,1 16,7C16,7.73 15.81,8.41 15.46,9H18C18.95,9 19.75,9.67 19.95,10.56C21.96,18.57 22,18.78 22,19A2,2 0 0,1 20,21H4A2,2 0 0,1 2,19C2,18.78 2.04,18.57 4.05,10.56C4.25,9.67 5.05,9 6,9H8.54C8.19,8.41 8,7.73 8,7A4,4 0 0,1 12,3M12,5A2,2 0 0,0 10,7A2,2 0 0,0 12,9A2,2 0 0,0 14,7A2,2 0 0,0 12,5Z"/></svg> Fasce peso
						</h2>
						<p class="text-[0.75rem] text-[#737373] mb-[20px]">Clicca sul prezzo per modificarlo. I valori sono in euro.</p>

						<div v-if="!weightBands.length" class="text-center py-[32px] text-[#737373]">
							<p>Nessuna fascia peso configurata.</p>
						</div>

						<div v-else class="overflow-x-auto">
							<table class="w-full text-[0.875rem] min-w-[700px]">
								<thead>
									<tr class="border-b border-[#E9EBEC] text-left text-[#737373]">
										<th class="pb-[12px] font-medium">#</th>
										<th class="pb-[12px] font-medium">Min</th>
										<th class="pb-[12px] font-medium">Max</th>
										<th class="pb-[12px] font-medium">Prezzo base</th>
										<th class="pb-[12px] font-medium">Prezzo scontato</th>
										<th class="pb-[12px] font-medium">Effettivo</th>
										<th class="pb-[12px] font-medium">Sconto %</th>
										<th class="pb-[12px] font-medium text-center">Visibile</th>
										<th class="pb-[12px] font-medium text-right">Azioni</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="(band, idx) in weightBands" :key="band.id || idx" :class="['border-b border-[#F0F0F0] last:border-0', idx % 2 === 1 ? 'bg-[#FAFBFC]' : '']">
										<td class="py-[14px] font-bold text-[#252B42]">{{ idx + 1 }}</td>
										<td class="py-[14px] text-[#404040]">
											<input v-model.number="band.min_value" type="number" min="0" step="1" class="w-[86px] h-[34px] px-[8px] rounded-[8px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
										</td>
										<td class="py-[14px] text-[#404040]">
											<input v-model.number="band.max_value" type="number" min="0" step="1" class="w-[86px] h-[34px] px-[8px] rounded-[8px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
										</td>
										<td class="py-[14px]">
											<div v-if="editingCell === `weight-${idx}-base_price`" class="flex items-center gap-[6px]">
												<span class="text-[#737373]">&euro;</span>
												<input
													:id="`edit-weight-${idx}-base_price`"
													v-model="editValue"
													@keydown.enter="confirmEdit('weight', idx, 'base_price')"
													@keydown.esc="cancelEdit()"
													@blur="confirmEdit('weight', idx, 'base_price')"
													type="number"
													min="0"
													step="0.01"
													class="w-[100px] px-[10px] py-[8px] tablet:py-[6px] bg-white border-2 border-[#095866] rounded-[8px] text-[1rem] tablet:text-[0.8125rem] focus:outline-none"
													placeholder="0,00"
												/>
											</div>
											<button
												v-else
												type="button"
												@click="startEdit('weight', idx, 'base_price')"
												class="px-[12px] py-[6px] rounded-[8px] text-[0.875rem] font-semibold text-[#252B42] hover:bg-[#E8F4FB] transition-colors cursor-pointer border border-transparent hover:border-[#B0D4E8]">
												{{ centsToEuro(band.base_price) }}
											</button>
										</td>
										<td class="py-[14px]">
											<div v-if="editingCell === `weight-${idx}-discount_price`" class="flex items-center gap-[6px]">
												<span class="text-[#737373]">&euro;</span>
												<input
													:id="`edit-weight-${idx}-discount_price`"
													v-model="editValue"
													@keydown.enter="confirmEdit('weight', idx, 'discount_price')"
													@keydown.esc="cancelEdit()"
													@blur="confirmEdit('weight', idx, 'discount_price')"
													type="number"
													min="0"
													step="0.01"
													class="w-[100px] px-[10px] py-[8px] tablet:py-[6px] bg-white border-2 border-[#095866] rounded-[8px] text-[1rem] tablet:text-[0.8125rem] focus:outline-none"
													placeholder="vuoto = usa base"
												/>
											</div>
											<button
												v-else
												type="button"
												@click="startEdit('weight', idx, 'discount_price')"
												class="px-[12px] py-[6px] rounded-[8px] text-[0.875rem] text-[#737373] hover:bg-[#E8F4FB] transition-colors cursor-pointer border border-transparent hover:border-[#B0D4E8]">
												{{ band.discount_price != null ? centsToEuro(band.discount_price) : '-' }}
											</button>
										</td>
										<td class="py-[14px]">
											<span class="font-semibold text-emerald-600 text-[0.9375rem]">{{ centsToEuro(effectivePrice(band)) }}</span>
										</td>
										<td class="py-[14px]">
											<template v-if="discountInfo(band) !== null">
												<span v-if="discountInfo(band) > 0" class="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-[6px] bg-emerald-50 text-emerald-700 text-[0.8125rem] font-semibold border border-emerald-200">
													-{{ discountInfo(band) }}%
												</span>
												<span v-else class="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-[6px] bg-amber-50 text-amber-700 text-[0.75rem] font-medium border border-amber-200">
													+{{ Math.abs(discountInfo(band)) }}% (aumento)
												</span>
											</template>
											<span v-else class="text-[#C8CCD0]">-</span>
										</td>
										<td class="py-[14px] text-center">
											<button
												type="button"
												@click="toggleShowDiscount('weight', idx)"
												:class="band.show_discount ? 'bg-[#095866]' : 'bg-[#C8CCD0]'"
												class="relative inline-flex h-[32px] w-[56px] tablet:h-[24px] tablet:w-[44px] items-center rounded-full transition-colors cursor-pointer">
												<span
													:class="band.show_discount ? 'translate-x-[28px] tablet:translate-x-[22px]' : 'translate-x-[2px]'"
													class="inline-block h-[26px] w-[26px] tablet:h-[20px] tablet:w-[20px] transform rounded-full bg-white transition-transform shadow-sm" />
											</button>
										</td>
										<td class="py-[14px]">
											<div class="flex items-center justify-end gap-[6px]">
												<button type="button" class="px-[8px] py-[4px] rounded-[8px] border border-[#D5DDE1] text-[0.75rem] hover:bg-[#F4F8FA] cursor-pointer" @click="moveBand('weight', idx, -1)">↑</button>
												<button type="button" class="px-[8px] py-[4px] rounded-[8px] border border-[#D5DDE1] text-[0.75rem] hover:bg-[#F4F8FA] cursor-pointer" @click="moveBand('weight', idx, 1)">↓</button>
												<button type="button" class="px-[8px] py-[4px] rounded-[8px] border border-red-200 text-red-600 text-[0.75rem] hover:bg-red-50 cursor-pointer" @click="removeBand('weight', idx)">Elimina</button>
											</div>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
						<div class="mt-[14px] flex justify-end">
							<button type="button" class="px-[16px] py-[8px] rounded-[999px] bg-[#095866] text-white text-[0.8125rem] font-medium hover:bg-[#074a56] cursor-pointer" @click="addBand('weight')">
								Aggiungi fascia peso
							</button>
						</div>
					</div>

					<!-- Fasce volume -->
					<div class="bg-white rounded-[20px] p-[16px] tablet:p-[20px] desktop:p-[28px] shadow-sm border border-[#E9EBEC] overflow-hidden">
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[6px] flex items-center gap-[8px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-indigo-600" fill="currentColor"><path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L6.04,7.5L12,10.85L17.96,7.5L12,4.15M5,15.91L11,19.29V12.58L5,9.21V15.91M19,15.91V9.21L13,12.58V19.29L19,15.91Z"/></svg> Fasce volume
						</h2>
						<p class="text-[0.75rem] text-[#737373] mb-[20px]">Fasce basate sul peso volumetrico (L x P x H / 5000). Completamente editabili (min/max/prezzo).</p>

						<div v-if="!volumeBands.length" class="text-center py-[32px] text-[#737373]">
							<p>Nessuna fascia volume configurata.</p>
						</div>

						<div v-else class="overflow-x-auto">
							<table class="w-full text-[0.875rem] min-w-[760px]">
								<thead>
									<tr class="border-b border-[#E9EBEC] text-left text-[#737373]">
										<th class="pb-[12px] font-medium">#</th>
										<th class="pb-[12px] font-medium">Min</th>
										<th class="pb-[12px] font-medium">Max</th>
										<th class="pb-[12px] font-medium">Prezzo base</th>
										<th class="pb-[12px] font-medium">Prezzo scontato</th>
										<th class="pb-[12px] font-medium">Effettivo</th>
										<th class="pb-[12px] font-medium">Sconto %</th>
										<th class="pb-[12px] font-medium text-center">Visibile</th>
										<th class="pb-[12px] font-medium text-right">Azioni</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="(band, idx) in volumeBands" :key="band.id || idx" :class="['border-b border-[#F0F0F0] last:border-0', idx % 2 === 1 ? 'bg-[#FAFBFC]' : '']">
										<td class="py-[14px] font-bold text-[#252B42]">{{ idx + 1 }}</td>
										<td class="py-[14px] text-[#404040]">
											<input v-model.number="band.min_value" type="number" min="0" step="0.001" class="w-[98px] h-[34px] px-[8px] rounded-[8px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
										</td>
										<td class="py-[14px] text-[#404040]">
											<input v-model.number="band.max_value" type="number" min="0" step="0.001" class="w-[98px] h-[34px] px-[8px] rounded-[8px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
										</td>
										<td class="py-[14px]">
											<div v-if="editingCell === `volume-${idx}-base_price`" class="flex items-center gap-[6px]">
												<span class="text-[#737373]">&euro;</span>
												<input
													:id="`edit-volume-${idx}-base_price`"
													v-model="editValue"
													@keydown.enter="confirmEdit('volume', idx, 'base_price')"
													@keydown.esc="cancelEdit()"
													@blur="confirmEdit('volume', idx, 'base_price')"
													type="number"
													min="0"
													step="0.01"
													class="w-[100px] px-[10px] py-[8px] tablet:py-[6px] bg-white border-2 border-[#095866] rounded-[8px] text-[1rem] tablet:text-[0.8125rem] focus:outline-none"
													placeholder="0,00"
												/>
											</div>
											<button
												v-else
												type="button"
												@click="startEdit('volume', idx, 'base_price')"
												class="px-[12px] py-[6px] rounded-[8px] text-[0.875rem] font-semibold text-[#252B42] hover:bg-[#E8F4FB] transition-colors cursor-pointer border border-transparent hover:border-[#B0D4E8]">
												{{ centsToEuro(band.base_price) }}
											</button>
										</td>
										<td class="py-[14px]">
											<div v-if="editingCell === `volume-${idx}-discount_price`" class="flex items-center gap-[6px]">
												<span class="text-[#737373]">&euro;</span>
												<input
													:id="`edit-volume-${idx}-discount_price`"
													v-model="editValue"
													@keydown.enter="confirmEdit('volume', idx, 'discount_price')"
													@keydown.esc="cancelEdit()"
													@blur="confirmEdit('volume', idx, 'discount_price')"
													type="number"
													min="0"
													step="0.01"
													class="w-[100px] px-[10px] py-[8px] tablet:py-[6px] bg-white border-2 border-[#095866] rounded-[8px] text-[1rem] tablet:text-[0.8125rem] focus:outline-none"
													placeholder="vuoto = usa base"
												/>
											</div>
											<button
												v-else
												type="button"
												@click="startEdit('volume', idx, 'discount_price')"
												class="px-[12px] py-[6px] rounded-[8px] text-[0.875rem] text-[#737373] hover:bg-[#E8F4FB] transition-colors cursor-pointer border border-transparent hover:border-[#B0D4E8]">
												{{ band.discount_price != null ? centsToEuro(band.discount_price) : '-' }}
											</button>
										</td>
										<td class="py-[14px]">
											<span class="font-semibold text-emerald-600 text-[0.9375rem]">{{ centsToEuro(effectivePrice(band)) }}</span>
										</td>
										<td class="py-[14px]">
											<template v-if="discountInfo(band) !== null">
												<span v-if="discountInfo(band) > 0" class="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-[6px] bg-emerald-50 text-emerald-700 text-[0.8125rem] font-semibold border border-emerald-200">
													-{{ discountInfo(band) }}%
												</span>
												<span v-else class="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-[6px] bg-amber-50 text-amber-700 text-[0.75rem] font-medium border border-amber-200">
													+{{ Math.abs(discountInfo(band)) }}% (aumento)
												</span>
											</template>
											<span v-else class="text-[#C8CCD0]">-</span>
										</td>
										<td class="py-[14px] text-center">
											<button
												type="button"
												@click="toggleShowDiscount('volume', idx)"
												:class="band.show_discount ? 'bg-[#095866]' : 'bg-[#C8CCD0]'"
												class="relative inline-flex h-[32px] w-[56px] tablet:h-[24px] tablet:w-[44px] items-center rounded-full transition-colors cursor-pointer">
												<span
													:class="band.show_discount ? 'translate-x-[28px] tablet:translate-x-[22px]' : 'translate-x-[2px]'"
													class="inline-block h-[26px] w-[26px] tablet:h-[20px] tablet:w-[20px] transform rounded-full bg-white transition-transform shadow-sm" />
											</button>
										</td>
										<td class="py-[14px]">
											<div class="flex items-center justify-end gap-[6px]">
												<button type="button" class="px-[8px] py-[4px] rounded-[8px] border border-[#D5DDE1] text-[0.75rem] hover:bg-[#F4F8FA] cursor-pointer" @click="moveBand('volume', idx, -1)">↑</button>
												<button type="button" class="px-[8px] py-[4px] rounded-[8px] border border-[#D5DDE1] text-[0.75rem] hover:bg-[#F4F8FA] cursor-pointer" @click="moveBand('volume', idx, 1)">↓</button>
												<button type="button" class="px-[8px] py-[4px] rounded-[8px] border border-red-200 text-red-600 text-[0.75rem] hover:bg-red-50 cursor-pointer" @click="removeBand('volume', idx)">Elimina</button>
											</div>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
						<div class="mt-[14px] flex justify-end">
							<button type="button" class="px-[16px] py-[8px] rounded-[999px] bg-[#095866] text-white text-[0.8125rem] font-medium hover:bg-[#074a56] cursor-pointer" @click="addBand('volume')">
								Aggiungi fascia volume
							</button>
						</div>
					</div>

					<!-- Regole oltre 7ª fascia -->
					<div class="bg-white rounded-[20px] p-[16px] tablet:p-[20px] desktop:p-[28px] shadow-sm border border-[#E9EBEC] overflow-hidden">
						<div class="flex flex-wrap items-center justify-between gap-[12px] mb-[18px]">
							<div>
								<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[4px]">Regole oltre 7ª fascia</h2>
								<p class="text-[0.75rem] text-[#737373]">Configurazione scaglioni dinamici (es. 101-150, 151-200 e 0,401-0,600, 0,601-0,800).</p>
							</div>
							<button
								type="button"
								@click="extraRules.enabled = !extraRules.enabled"
								:class="extraRules.enabled ? 'bg-[#095866]' : 'bg-[#C8CCD0]'"
								class="relative inline-flex h-[32px] w-[56px] items-center rounded-full transition-colors cursor-pointer">
								<span
									:class="extraRules.enabled ? 'translate-x-[28px]' : 'translate-x-[2px]'"
									class="inline-block h-[26px] w-[26px] transform rounded-full bg-white transition-transform shadow-sm" />
							</button>
						</div>

						<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[16px]">
							<div class="space-y-[12px] p-[14px] rounded-[14px] border border-[#E9EBEC] bg-[#FAFBFC]">
								<h3 class="text-[0.875rem] font-semibold text-[#252B42]">Scaglioni Peso</h3>
								<div class="grid grid-cols-3 gap-[10px]">
									<label class="text-[0.75rem] text-[#737373]">Start
										<input v-model.number="extraRules.weight_start" type="number" min="0" step="1" class="mt-[4px] w-full h-[38px] px-[10px] rounded-[10px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
									</label>
									<label class="text-[0.75rem] text-[#737373]">Step
										<input v-model.number="extraRules.weight_step" type="number" min="0.0001" step="1" class="mt-[4px] w-full h-[38px] px-[10px] rounded-[10px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
									</label>
									<label class="text-[0.75rem] text-[#737373]">Risoluzione
										<input v-model.number="extraRules.weight_resolution" type="number" min="0.0001" step="1" class="mt-[4px] w-full h-[38px] px-[10px] rounded-[10px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
									</label>
								</div>
								<p class="text-[0.75rem] text-[#4F5D75]">Preview: {{ extraRuleExamples.firstWeightFrom }}-{{ extraRuleExamples.firstWeightTo }} / {{ extraRuleExamples.secondWeightFrom }}-{{ extraRuleExamples.secondWeightTo }}</p>
							</div>

							<div class="space-y-[12px] p-[14px] rounded-[14px] border border-[#E9EBEC] bg-[#FAFBFC]">
								<h3 class="text-[0.875rem] font-semibold text-[#252B42]">Scaglioni Volume (m&sup3;)</h3>
								<div class="grid grid-cols-3 gap-[10px]">
									<label class="text-[0.75rem] text-[#737373]">Start
										<input v-model.number="extraRules.volume_start" type="number" min="0" step="0.001" class="mt-[4px] w-full h-[38px] px-[10px] rounded-[10px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
									</label>
									<label class="text-[0.75rem] text-[#737373]">Step
										<input v-model.number="extraRules.volume_step" type="number" min="0.0001" step="0.001" class="mt-[4px] w-full h-[38px] px-[10px] rounded-[10px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
									</label>
									<label class="text-[0.75rem] text-[#737373]">Risoluzione
										<input v-model.number="extraRules.volume_resolution" type="number" min="0.0001" step="0.001" class="mt-[4px] w-full h-[38px] px-[10px] rounded-[10px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
									</label>
								</div>
								<p class="text-[0.75rem] text-[#4F5D75]">Preview: {{ extraRuleExamples.firstVolumeFrom.toFixed(3) }}-{{ extraRuleExamples.firstVolumeTo.toFixed(3) }} / {{ extraRuleExamples.secondVolumeFrom.toFixed(3) }}-{{ extraRuleExamples.secondVolumeTo.toFixed(3) }}</p>
							</div>

							<div class="space-y-[12px] p-[14px] rounded-[14px] border border-[#E9EBEC] bg-[#FAFBFC]">
								<h3 class="text-[0.875rem] font-semibold text-[#252B42]">Incrementi oltre 7ª fascia</h3>
								<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[10px]">
									<label class="text-[0.75rem] text-[#737373]">Base prezzo extra
										<select v-model="extraRules.base_price_cents_mode" class="mt-[4px] w-full h-[38px] px-[10px] rounded-[10px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
											<option value="last_band_effective">Ultima fascia effettiva</option>
											<option value="manual">Manuale</option>
										</select>
									</label>
									<label class="text-[0.75rem] text-[#737373]">Incremento fisso per ogni fascia extra (&euro;)
										<input
											:value="(Number(extraRules.increment_cents || 0) / 100).toFixed(2).replace('.', ',')"
											@input="extraRules.increment_cents = Math.max(0, euroToCents($event.target.value) ?? 0)"
											type="text"
											class="mt-[4px] w-full h-[38px] px-[10px] rounded-[10px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
									</label>
								</div>

								<label v-if="extraRules.base_price_cents_mode === 'manual'" class="text-[0.75rem] text-[#737373]">Prezzo base extra manuale (&euro;)
									<input
										:value="extraRules.base_price_cents_manual == null ? '' : (Number(extraRules.base_price_cents_manual || 0) / 100).toFixed(2).replace('.', ',')"
										@input="extraRules.base_price_cents_manual = euroToCents($event.target.value)"
										type="text"
										class="mt-[4px] w-full h-[38px] px-[10px] rounded-[10px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
								</label>
							</div>

							<div class="p-[14px] rounded-[14px] border border-[#D8E9F0] bg-[#F4FAFC]">
								<h3 class="text-[0.875rem] font-semibold text-[#095866] mb-[10px]">Casi rapidi</h3>
								<div class="overflow-x-auto">
									<table class="w-full min-w-[450px] text-[0.75rem]">
										<thead>
											<tr class="text-left text-[#67778E] border-b border-[#D8E9F0]">
												<th class="py-[6px]">Caso</th>
												<th class="py-[6px]">Peso</th>
												<th class="py-[6px]">Volume</th>
												<th class="py-[6px]">Prezzo peso</th>
												<th class="py-[6px]">Prezzo volume</th>
												<th class="py-[6px]">Totale (MAX)</th>
											</tr>
										</thead>
										<tbody>
											<tr v-for="row in pricingPreviewCases" :key="row.id" class="border-b border-[#EAF2F5] last:border-0 text-[#24344D]">
												<td class="py-[7px] font-semibold">{{ row.label }}</td>
												<td class="py-[7px]">{{ row.weight }}</td>
												<td class="py-[7px]">{{ row.volume }}</td>
												<td class="py-[7px]">{{ row.weightPriceLabel }}</td>
												<td class="py-[7px]">{{ row.volumePriceLabel }}</td>
												<td class="py-[7px] font-bold text-[#095866]">{{ row.totalLabel }}</td>
											</tr>
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>

					<!-- Supplementi CAP -->
					<div class="bg-white rounded-[20px] p-[20px] tablet:p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
						<div class="flex flex-wrap items-center justify-between gap-[12px] mb-[14px]">
							<div>
								<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[4px]">Supplementi CAP</h2>
								<p class="text-[0.75rem] text-[#737373]">Prefisso CAP + importo + applicazione (origine / destinazione / entrambi).</p>
							</div>
							<button type="button" class="px-[14px] py-[8px] rounded-[999px] bg-[#095866] text-white text-[0.8125rem] font-medium hover:bg-[#074a56] cursor-pointer" @click="addSupplement">
								Aggiungi supplemento
							</button>
						</div>

						<div v-if="!supplementRules.length" class="p-[14px] rounded-[12px] border border-dashed border-[#C8CCD0] text-[#6A7486] text-[0.8125rem]">
							Nessun supplemento attivo. Aggiungi una regola se necessario.
						</div>

						<div v-else class="space-y-[10px]">
							<div v-for="(rule, idx) in supplementRules" :key="rule.id || idx" class="grid grid-cols-1 tablet:grid-cols-[120px_160px_1fr_auto_auto] gap-[8px] items-center p-[12px] rounded-[12px] border border-[#E9EBEC] bg-[#FAFBFC]">
								<label class="text-[0.75rem] text-[#6A7486]">Prefisso CAP
									<input v-model="rule.prefix" type="text" inputmode="numeric" maxlength="5" class="mt-[4px] w-full h-[36px] px-[10px] rounded-[10px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
								</label>
								<label class="text-[0.75rem] text-[#6A7486]">Importo (&euro;)
									<input :value="supplementAmountToEuro(rule)" @input="updateSupplementAmountFromEuro(rule, $event.target.value)" type="text" class="mt-[4px] w-full h-[36px] px-[10px] rounded-[10px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
								</label>
								<label class="text-[0.75rem] text-[#6A7486]">Applica a
									<select v-model="rule.apply_to" class="mt-[4px] w-full h-[36px] px-[10px] rounded-[10px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
										<option value="both">Origine + Destinazione</option>
										<option value="origin">Solo origine</option>
										<option value="destination">Solo destinazione</option>
									</select>
								</label>
								<button type="button" @click="rule.enabled = !rule.enabled" :class="rule.enabled ? 'bg-[#095866]' : 'bg-[#C8CCD0]'" class="relative inline-flex h-[28px] w-[48px] items-center rounded-full transition-colors cursor-pointer mt-[16px]">
									<span :class="rule.enabled ? 'translate-x-[24px]' : 'translate-x-[2px]'" class="inline-block h-[22px] w-[22px] transform rounded-full bg-white transition-transform shadow-sm" />
								</button>
								<button type="button" class="px-[10px] py-[7px] rounded-[8px] border border-red-200 text-red-600 text-[0.75rem] hover:bg-red-50 cursor-pointer mt-[16px]" @click="removeSupplement(idx)">
									Elimina
								</button>
							</div>
						</div>
					</div>
					</template>

					<!-- Listino Europa monocollo -->
					<div v-if="adminView === 'europa'" class="bg-white rounded-[20px] p-[20px] tablet:p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
						<div class="flex flex-wrap items-start justify-between gap-[14px] mb-[18px]">
							<div class="space-y-[4px]">
								<h2 class="text-[1.125rem] font-bold text-[#252B42]">Europa monocollo</h2>
								<p class="text-[0.75rem] text-[#737373]">Listino Italia → Europa. Un solo collo per spedizione, quantità sempre 1.</p>
							</div>
							<div class="flex flex-wrap gap-[8px] text-[0.75rem]">
								<span class="inline-flex items-center gap-[6px] px-[10px] py-[6px] rounded-full bg-[#F4FAFC] text-[#095866] border border-[#D8E9F0]">Origine IT</span>
								<span class="inline-flex items-center gap-[6px] px-[10px] py-[6px] rounded-full bg-[#F4FAFC] text-[#095866] border border-[#D8E9F0]">Max colli 1</span>
								<span class="inline-flex items-center gap-[6px] px-[10px] py-[6px] rounded-full bg-[#F4FAFC] text-[#095866] border border-[#D8E9F0]">Q.tà per collo 1</span>
							</div>
						</div>

						<div class="space-y-[16px]">
							<div v-if="!filteredEuropeBands.length" class="p-[16px] rounded-[14px] border border-dashed border-[#C8CCD0] text-[#6A7486] text-[0.8125rem]">
								Nessun paese trovato con i filtri attuali.
							</div>
							<div
								v-for="band in filteredEuropeBands"
								:key="band.id"
								class="rounded-[16px] border border-[#E9EBEC] bg-[#FAFBFC] overflow-hidden">
								<div class="flex flex-wrap items-center justify-between gap-[10px] px-[16px] py-[14px] border-b border-[#E9EBEC] bg-white">
									<div>
										<h3 class="text-[0.9375rem] font-bold text-[#252B42]">{{ band.label }}</h3>
										<p class="text-[0.75rem] text-[#6A7486]">
											Max {{ band.max_weight_kg }} kg · Max {{ Number(band.max_volume_m3).toFixed(3) }} m³ · Fattore volumetrico {{ band.volumetric_factor }}
										</p>
									</div>
									<div class="flex flex-wrap gap-[8px]">
										<span class="inline-flex items-center gap-[6px] px-[10px] py-[5px] rounded-full bg-[#F0F7FA] text-[#095866] text-[0.75rem] font-medium">
											{{ band.rates.length }} paesi
										</span>
										<span class="inline-flex items-center gap-[6px] px-[10px] py-[5px] rounded-full bg-emerald-50 text-emerald-700 text-[0.75rem] font-medium border border-emerald-200">
											{{ band.activeCount }} attivi
										</span>
										<span class="inline-flex items-center gap-[6px] px-[10px] py-[5px] rounded-full bg-amber-50 text-amber-700 text-[0.75rem] font-medium border border-amber-200">
											{{ band.quoteCount }} preventivo
										</span>
									</div>
								</div>

								<div v-if="compactEuropeView" class="p-[16px] grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-[10px]">
									<div
										v-for="rate in band.rates"
										:key="`${band.id}-${rate.country_code}-compact`"
										class="rounded-[14px] border border-[#E6EDF1] bg-white px-[14px] py-[12px]">
										<div class="flex items-start justify-between gap-[10px] mb-[8px]">
											<div>
												<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ rate.country_name }}</p>
												<p class="text-[0.75rem] text-[#7D8998]">{{ rate.country_code }}</p>
											</div>
											<span :class="rate.quote_required ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-[#EDF6F8] text-[#095866] border-[#D8E9F0]'" class="inline-flex items-center px-[8px] py-[4px] rounded-full border text-[0.6875rem] font-semibold">
												{{ rate.quote_required ? 'Manuale' : 'Attivo' }}
											</span>
										</div>
										<input
											:value="rate.price_cents == null ? '' : (Number(rate.price_cents || 0) / 100).toFixed(2).replace('.', ',')"
											@input="updateEuropeRateAmountFromEuro(rate, $event.target.value)"
											:disabled="rate.quote_required"
											type="text"
											placeholder="0,00"
											class="w-full h-[38px] px-[10px] rounded-[10px] border border-[#C8CCD0] bg-white text-[#252B42] disabled:bg-[#F3F4F6] disabled:text-[#9AA3B2]">
									</div>
								</div>

								<div v-else class="overflow-x-auto">
									<table class="w-full min-w-[760px] text-[0.8125rem]">
										<thead>
											<tr class="text-left text-[#6A7486] border-b border-[#E9EBEC] bg-white">
												<th class="px-[16px] py-[10px] font-semibold">Paese</th>
												<th class="px-[16px] py-[10px] font-semibold">Prezzo</th>
												<th class="px-[16px] py-[10px] font-semibold">Stato</th>
											</tr>
										</thead>
										<tbody>
											<tr
												v-for="rate in band.rates"
												:key="`${band.id}-${rate.country_code}`"
												class="border-b border-[#EEF2F4] last:border-0">
												<td class="px-[16px] py-[10px] font-semibold text-[#252B42]">
													{{ rate.country_name }}
													<span class="text-[#8A94A6] font-medium">({{ rate.country_code }})</span>
												</td>
												<td class="px-[16px] py-[10px]">
													<input
														:value="rate.price_cents == null ? '' : (Number(rate.price_cents || 0) / 100).toFixed(2).replace('.', ',')"
														@input="updateEuropeRateAmountFromEuro(rate, $event.target.value)"
														:disabled="rate.quote_required"
														type="text"
														placeholder="0,00"
														class="w-[120px] h-[38px] px-[10px] rounded-[10px] border border-[#C8CCD0] bg-white text-[#252B42] disabled:bg-[#F3F4F6] disabled:text-[#9AA3B2]">
												</td>
												<td class="px-[16px] py-[10px]">
													<button
														type="button"
														@click="toggleEuropeRateQuote(rate)"
														:class="rate.quote_required ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-[#EDF6F8] text-[#095866] border-[#D8E9F0]'"
														class="inline-flex items-center gap-[6px] px-[12px] py-[8px] rounded-full border text-[0.75rem] font-medium cursor-pointer">
														{{ rate.quote_required ? 'Preventivo manuale' : 'Prezzo attivo' }}
													</button>
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>

					<!-- Servizi e supplementi -->
					<div v-if="adminView === 'servizi'" class="space-y-[18px]">
						<div class="grid grid-cols-1 desktop:grid-cols-3 gap-[14px]">
							<div class="rounded-[18px] border border-[#D8E9F0] bg-[#F4FAFC] p-[18px]">
								<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#6A7486] mb-[8px]">Servizi utente</p>
								<p class="text-[1.5rem] font-bold text-[#095866]">{{ servicePricingEntries.length }}</p>
								<p class="text-[0.8125rem] text-[#5B6B7F] mt-[6px]">Prezzi visibili nel flusso utente e nel riepilogo.</p>
							</div>
							<div class="rounded-[18px] border border-[#F4E2D6] bg-[#FFF8F2] p-[18px]">
								<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#A05D28] mb-[8px]">Supplementi automatici</p>
								<p class="text-[1.5rem] font-bold text-[#E44203]">{{ automaticSupplementEntries.length }}</p>
								<p class="text-[0.8125rem] text-[#7C5A46] mt-[6px]">Regole che scattano da destinazione, forma collo o punto BRT.</p>
							</div>
							<div class="rounded-[18px] border border-[#E4E7EC] bg-[#FBFCFD] p-[18px]">
								<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#6A7486] mb-[8px]">Fee operative</p>
								<p class="text-[1.5rem] font-bold text-[#252B42]">{{ operationalFeeEntries.length }}</p>
								<p class="text-[0.8125rem] text-[#5B6B7F] mt-[6px]">Costi gestionali come giacenza, separati dalle scelte utente.</p>
							</div>
						</div>

						<div class="space-y-[16px]">
							<div
								v-for="entry in filteredServiceEntries"
								:key="`${entry.section}-${entry.key}`"
								class="rounded-[20px] border border-[#E9EBEC] bg-white p-[16px] tablet:p-[18px] desktop:p-[20px] shadow-sm overflow-hidden">
								<div class="flex flex-col gap-[14px] desktop:flex-row desktop:items-start desktop:justify-between">
									<div class="space-y-[8px] max-w-[760px]">
										<div class="flex flex-wrap items-center gap-[8px]">
											<span class="inline-flex items-center px-[10px] py-[5px] rounded-full bg-[#F4FAFC] text-[#095866] text-[0.75rem] font-semibold border border-[#D8E9F0]">
												{{ entry.section === 'service_pricing' ? 'Servizio utente' : (entry.section === 'automatic_supplements' ? 'Supplemento automatico' : 'Fee operativa') }}
											</span>
											<span class="inline-flex items-center px-[10px] py-[5px] rounded-full bg-[#F8FAFC] text-[#5B6B7F] text-[0.75rem] font-medium border border-[#E5EAF0]">
												{{ formatApplicationLabel(entry.rule.application) }}
											</span>
										</div>
										<div>
											<h3 class="text-[1rem] font-bold text-[#252B42]">{{ entry.rule.label }}</h3>
											<p class="text-[0.875rem] text-[#6A7486]">{{ entry.rule.description }}</p>
										</div>
									</div>

									<button
										type="button"
										@click="entry.rule.enabled = !entry.rule.enabled"
										:class="entry.rule.enabled ? 'bg-[#095866]' : 'bg-[#C8CCD0]'"
										class="relative inline-flex h-[32px] w-[56px] items-center rounded-full transition-colors cursor-pointer shrink-0">
										<span
											:class="entry.rule.enabled ? 'translate-x-[28px]' : 'translate-x-[2px]'"
											class="inline-block h-[26px] w-[26px] transform rounded-full bg-white transition-transform shadow-sm" />
									</button>
								</div>

								<div class="mt-[16px] grid grid-cols-1 desktop:grid-cols-2 gap-[14px]">
									<label v-if="entry.rule.pricing_type === 'fixed' || entry.rule.price_cents != null" class="text-[0.75rem] text-[#6A7486]">
										Prezzo / fee (&euro;)
										<input :value="keyedRuleAmountToEuro(entry.rule)" @input="updateKeyedRuleAmountFromEuro(entry.rule, $event.target.value)" type="text" class="mt-[4px] w-full h-[42px] px-[12px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.875rem] text-[#252B42]">
									</label>
									<label v-if="entry.rule.pricing_type === 'threshold_percentage'" class="text-[0.75rem] text-[#6A7486]">
										Soglia (&euro;)
										<input v-model.number="entry.rule.threshold_amount_eur" type="number" min="0" step="0.01" class="mt-[4px] w-full h-[42px] px-[12px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.875rem] text-[#252B42]">
									</label>
									<label v-if="entry.rule.pricing_type === 'threshold_percentage'" class="text-[0.75rem] text-[#6A7486]">
										Minimo fisso (&euro;)
										<input :value="keyedRuleMinFeeToEuro(entry.rule)" @input="updateKeyedRuleMinFeeFromEuro(entry.rule, $event.target.value)" type="text" class="mt-[4px] w-full h-[42px] px-[12px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.875rem] text-[#252B42]">
									</label>
									<label v-if="entry.rule.pricing_type === 'threshold_percentage'" class="text-[0.75rem] text-[#6A7486]">
										Percentuale (%)
										<input v-model.number="entry.rule.percentage_rate" type="number" min="0" step="0.01" class="mt-[4px] w-full h-[42px] px-[12px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.875rem] text-[#252B42]">
									</label>
									<label v-if="entry.rule.max_weight_kg != null" class="text-[0.75rem] text-[#6A7486]">
										Peso massimo (kg)
										<input v-model.number="entry.rule.max_weight_kg" type="number" min="0" step="0.01" class="mt-[4px] w-full h-[42px] px-[12px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.875rem] text-[#252B42]">
									</label>
									<label v-if="entry.rule.threshold_cm != null" class="text-[0.75rem] text-[#6A7486]">
										Soglia lato (cm)
										<input v-model.number="entry.rule.threshold_cm" type="number" min="0" step="1" class="mt-[4px] w-full h-[42px] px-[12px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.875rem] text-[#252B42]">
									</label>
									<label v-if="entry.rule.longest_side_threshold_cm != null" class="text-[0.75rem] text-[#6A7486]">
										Lato lungo oltre (cm)
										<input v-model.number="entry.rule.longest_side_threshold_cm" type="number" min="0" step="1" class="mt-[4px] w-full h-[42px] px-[12px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.875rem] text-[#252B42]">
									</label>
									<label v-if="entry.rule.girth_threshold_cm != null" class="text-[0.75rem] text-[#6A7486]">
										Soglia perimetro secondario (cm)
										<input v-model.number="entry.rule.girth_threshold_cm" type="number" min="0" step="1" class="mt-[4px] w-full h-[42px] px-[12px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.875rem] text-[#252B42]">
									</label>
									<label v-if="entry.rule.min_longest_side_cm != null" class="text-[0.75rem] text-[#6A7486]">
										Lunghezza minima (cm)
										<input v-model.number="entry.rule.min_longest_side_cm" type="number" min="0" step="1" class="mt-[4px] w-full h-[42px] px-[12px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.875rem] text-[#252B42]">
									</label>
									<label v-if="entry.rule.max_secondary_side_cm != null" class="text-[0.75rem] text-[#6A7486]">
										Lato secondario max (cm)
										<input v-model.number="entry.rule.max_secondary_side_cm" type="number" min="0" step="1" class="mt-[4px] w-full h-[42px] px-[12px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.875rem] text-[#252B42]">
									</label>
								</div>

								<div v-if="entry.rule.tiers?.length" class="mt-[16px] rounded-[16px] border border-[#E9EEF2] bg-[#FBFCFD] p-[14px]">
									<div class="flex items-center justify-between gap-[10px] mb-[10px]">
										<h4 class="text-[0.8125rem] font-semibold text-[#252B42]">Scaglioni peso</h4>
										<button type="button" class="px-[12px] py-[7px] rounded-full bg-[#095866] text-white text-[0.75rem] font-medium cursor-pointer" @click="addTierRow(entry.rule)">Aggiungi soglia</button>
									</div>
									<div class="space-y-[8px]">
										<div v-for="(tier, tierIndex) in entry.rule.tiers" :key="`${entry.key}-tier-${tierIndex}`" class="grid grid-cols-1 tablet:grid-cols-[1fr_1fr_auto] gap-[8px] items-end">
											<label class="text-[0.75rem] text-[#6A7486]">
												Fino a kg
												<input v-model.number="tier.up_to_kg" type="number" min="0" step="0.01" placeholder="senza limite" class="mt-[4px] w-full h-[40px] px-[12px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.8125rem] text-[#252B42]">
											</label>
											<label class="text-[0.75rem] text-[#6A7486]">
												Prezzo (&euro;)
												<input :value="(Number(tier.price_cents || 0) / 100).toFixed(2).replace('.', ',')" @input="tier.price_cents = euroToCents($event.target.value) || 0" type="text" class="mt-[4px] w-full h-[40px] px-[12px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.8125rem] text-[#252B42]">
											</label>
											<button type="button" class="h-[40px] px-[12px] rounded-[12px] border border-red-200 text-red-600 text-[0.75rem] font-medium hover:bg-red-50 cursor-pointer" @click="removeTierRow(entry.rule, tierIndex)">Rimuovi</button>
										</div>
									</div>
								</div>

								<div class="mt-[16px] grid grid-cols-1 desktop:grid-cols-2 gap-[14px]" v-if="entry.section === 'automatic_supplements'">
									<label v-if="entry.rule.province_codes?.length || entry.key === 'calabria_sardegna_sicilia' || entry.key === 'brt_point_csi'" class="text-[0.75rem] text-[#6A7486]">
										Province
										<input :value="(entry.rule.province_codes || []).join(', ')" @input="updateArrayField(entry.rule, 'province_codes', $event.target.value, { uppercase: true })" type="text" class="mt-[4px] w-full h-[42px] px-[12px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.8125rem] text-[#252B42]">
									</label>
									<label v-if="entry.rule.country_codes?.length" class="text-[0.75rem] text-[#6A7486]">
										Paesi
										<input :value="(entry.rule.country_codes || []).join(', ')" @input="updateArrayField(entry.rule, 'country_codes', $event.target.value, { uppercase: true })" type="text" class="mt-[4px] w-full h-[42px] px-[12px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.8125rem] text-[#252B42]">
									</label>
									<label v-if="entry.rule.keyword_list?.length" class="text-[0.75rem] text-[#6A7486] desktop:col-span-2">
										Keyword località
										<input :value="(entry.rule.keyword_list || []).join(', ')" @input="updateArrayField(entry.rule, 'keyword_list', $event.target.value)" type="text" class="mt-[4px] w-full h-[42px] px-[12px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.8125rem] text-[#252B42]">
									</label>
									<label v-if="entry.rule.flag_keys?.length" class="text-[0.75rem] text-[#6A7486]">
										Flag chiave
										<input :value="(entry.rule.flag_keys || []).join(', ')" @input="updateArrayField(entry.rule, 'flag_keys', $event.target.value)" type="text" class="mt-[4px] w-full h-[42px] px-[12px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.8125rem] text-[#252B42]">
									</label>
									<label v-if="entry.rule.delivery_modes?.length" class="text-[0.75rem] text-[#6A7486]">
										Delivery mode
										<input :value="(entry.rule.delivery_modes || []).join(', ')" @input="updateArrayField(entry.rule, 'delivery_modes', $event.target.value)" type="text" class="mt-[4px] w-full h-[42px] px-[12px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.8125rem] text-[#252B42]">
									</label>
								</div>

								<label class="block mt-[16px] text-[0.75rem] text-[#6A7486]">
									Nota operativa
									<textarea v-model="entry.rule.note" rows="2" class="mt-[4px] w-full px-[12px] py-[10px] rounded-[12px] border border-[#D5DDE1] bg-white text-[0.8125rem] text-[#252B42] resize-y"></textarea>
								</label>
							</div>
						</div>
					</div>

					<!-- Save configurazione prezzi -->
					<div class="flex flex-col tablet:flex-row tablet:items-center tablet:justify-between gap-[10px] rounded-[18px] border border-[#E9EBEC] bg-white/80 p-[14px] tablet:p-[16px]">
						<div class="flex items-center gap-[8px] text-[0.75rem]">
							<span v-if="pricingVersion" class="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-[999px] bg-[#E8F4FB] text-[#095866] border border-[#B0D4E8]">
								Versione {{ pricingVersion }}
							</span>
							<span v-if="hasChanges" class="inline-flex items-center gap-[4px] px-[10px] py-[4px] rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-200">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
								Modifiche non salvate
							</span>
						</div>
						<button @click="savePriceBands" :disabled="saving || !hasChanges" class="inline-flex items-center justify-center gap-[8px] px-[24px] py-[12px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] text-[0.875rem] font-medium transition-colors cursor-pointer disabled:opacity-50">
							<svg v-if="saving" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] animate-spin" fill="currentColor"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>
							<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"/></svg>
							{{ saving ? "Salvataggio..." : "Salva configurazione prezzi" }}
						</button>
					</div>

					<!-- ======================== PROMOZIONE SITO ======================== -->
					<div class="bg-white rounded-[20px] p-[16px] tablet:p-[20px] desktop:p-[28px] shadow-sm border border-[#E9EBEC] overflow-hidden">
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[6px] flex items-center gap-[8px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-[#E44203]" fill="currentColor"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>
							Promozione Sito
						</h2>
						<p class="text-[0.75rem] text-[#737373] mb-[20px]">Gestisci l'etichetta promozionale e i badge sconto visibili su tutto il sito.</p>

						<div v-if="promoLoading" class="py-[40px] flex justify-center">
							<div class="w-[32px] h-[32px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
						</div>

						<div v-else class="space-y-[20px]">
							<!-- Toggle promozione attiva -->
							<div class="flex items-center justify-between p-[16px] bg-[#FAFBFC] rounded-[12px] border border-[#E9EBEC]">
								<div>
									<p class="text-[0.9375rem] font-semibold text-[#252B42]">Promozione attiva</p>
									<p class="text-[0.75rem] text-[#737373]">Mostra l'etichetta promozionale su tutto il sito</p>
								</div>
								<button
									type="button"
									@click="promo.active = !promo.active"
									:class="promo.active ? 'bg-[#095866]' : 'bg-[#C8CCD0]'"
									class="relative inline-flex h-[36px] w-[60px] tablet:h-[28px] tablet:w-[52px] items-center rounded-full transition-colors cursor-pointer">
									<span
										:class="promo.active ? 'translate-x-[28px] tablet:translate-x-[26px]' : 'translate-x-[2px]'"
										class="inline-block h-[30px] w-[30px] tablet:h-[24px] tablet:w-[24px] transform rounded-full bg-white transition-transform shadow-sm" />
								</button>
							</div>

							<!-- Testo etichetta -->
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[6px]">Testo etichetta</label>
								<input
									type="text"
									v-model="promo.label_text"
									placeholder="es. OFFERTA LANCIO"
									maxlength="100"
									class="w-full max-w-[400px] bg-[#FAFBFC] border border-[#D0D0D0] rounded-[50px] h-[48px] tablet:h-[44px] px-[16px] text-[1rem] tablet:text-[0.875rem] text-[#252B42] placeholder:text-[#A0A5AB] focus:border-[#095866] focus:outline-none" />
							</div>

							<!-- Descrizione sconto — testo libero mostrato nell'header homepage sotto il prezzo -->
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[6px]">Descrizione sconto (mostrata nell'header)</label>
								<textarea
									v-model="promo.description"
									placeholder="es. Sconto del 20% su tutte le spedizioni nazionali! Valido fino al 31 marzo."
									maxlength="300"
									rows="3"
									class="w-full max-w-[500px] bg-[#FAFBFC] border border-[#D0D0D0] rounded-[50px] px-[16px] py-[12px] text-[0.875rem] text-[#252B42] placeholder:text-[#A0A5AB] focus:border-[#095866] focus:outline-none resize-y"></textarea>
								<p class="text-[0.6875rem] text-[#999] mt-[4px]">Massimo 300 caratteri. Questo testo appare sotto il prezzo nella homepage.</p>
							</div>

							<!-- Colore etichetta -->
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[6px]">Colore etichetta</label>
								<div class="flex flex-wrap items-center gap-[12px]">
									<input
										type="color"
										v-model="promo.label_color"
										class="w-[44px] h-[44px] rounded-[8px] border border-[#D0D0D0] cursor-pointer" />
									<input
										type="text"
										v-model="promo.label_color"
										placeholder="#E44203"
										maxlength="20"
										class="w-[140px] bg-[#FAFBFC] border border-[#D0D0D0] rounded-[50px] h-[44px] px-[16px] text-[0.875rem] text-[#252B42] font-mono focus:border-[#095866] focus:outline-none" />
									<!-- Preview -->
									<span
										v-if="promo.label_text"
										:style="{ backgroundColor: promo.label_color }"
										class="inline-flex items-center px-[12px] py-[6px] rounded-[8px] text-white text-[0.8125rem] font-bold tracking-wide">
										{{ promo.label_text }}
									</span>
								</div>
							</div>

							<!-- Upload immagine -->
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#252B42] mb-[6px]">Immagine promozionale (opzionale)</label>
								<div class="flex flex-wrap items-center gap-[12px] tablet:gap-[16px]">
									<label class="inline-flex items-center gap-[8px] px-[16px] py-[10px] bg-[#FAFBFC] border border-[#D0D0D0] rounded-[50px] text-[0.875rem] text-[#252B42] hover:bg-[#E8F4FB] transition cursor-pointer">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[#095866]" fill="currentColor"><path d="M5,3A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H14.09C14.03,20.67 14,20.34 14,20C14,19.32 14.19,18.68 14.54,18H5L8.5,13.5L11,16.5L14.5,12L16.73,14.97C17.7,14.34 18.84,14 20,14C20.34,14 20.67,14.03 21,14.09V5A2,2 0 0,0 19,3H5M19,16V19H16V21H19V24H21V21H24V19H21V16H19Z"/></svg>
										{{ promoImageUploading ? 'Caricamento...' : 'Carica immagine' }}
										<input type="file" accept="image/*" class="hidden" @change="uploadPromoImage" :disabled="promoImageUploading" />
									</label>
									<div v-if="promo.label_image" class="flex items-center gap-[8px]">
										<!-- Ottimizzazione: lazy loading + decoding async -->
										<img :src="promo.label_image" alt="Promo" loading="lazy" decoding="async" width="80" height="40" class="h-[40px] w-auto rounded-[6px] border border-[#D0D0D0]" />
										<button type="button" @click="promo.label_image = null" class="text-red-500 text-[0.75rem] hover:underline cursor-pointer">Rimuovi</button>
									</div>
								</div>
							</div>

							<!-- Toggle badge sconto % -->
							<div class="flex items-center justify-between p-[16px] bg-[#FAFBFC] rounded-[12px] border border-[#E9EBEC]">
								<div>
									<p class="text-[0.9375rem] font-semibold text-[#252B42]">Mostra badge sconto %</p>
									<p class="text-[0.75rem] text-[#737373]">Mostra il badge con la percentuale di sconto accanto ai prezzi</p>
								</div>
								<button
									type="button"
									@click="promo.show_badges = !promo.show_badges"
									:class="promo.show_badges ? 'bg-[#095866]' : 'bg-[#C8CCD0]'"
									class="relative inline-flex h-[36px] w-[60px] tablet:h-[28px] tablet:w-[52px] items-center rounded-full transition-colors cursor-pointer">
									<span
										:class="promo.show_badges ? 'translate-x-[28px] tablet:translate-x-[26px]' : 'translate-x-[2px]'"
										class="inline-block h-[30px] w-[30px] tablet:h-[24px] tablet:w-[24px] transform rounded-full bg-white transition-transform shadow-sm" />
								</button>
							</div>

							<!-- Anteprima live — mostra come appare la promo nell'header homepage -->
							<div v-if="promo.active && (promo.label_text || promo.description)" class="p-[20px] bg-[#F0F4F5] rounded-[16px] border border-[#D0D8DA]">
								<p class="text-[0.75rem] font-semibold text-[#737373] mb-[12px] uppercase tracking-wider">Anteprima header homepage</p>
								<div class="bg-white rounded-[12px] p-[16px] shadow-sm">
									<p class="text-[1.25rem] font-bold text-[#222]">Spedisci in Italia</p>
									<div class="flex items-center gap-[10px] mt-[6px]">
										<span class="text-[1rem] text-[#444] font-semibold">a partire da</span>
										<span class="inline-flex items-center justify-center px-[14px] py-[6px] bg-[#E44203] text-white font-extrabold text-[1.25rem] rounded-[40px]">8,90 &euro;</span>
									</div>
									<!-- Badge sconto % -->
									<div v-if="promo.show_badges" class="flex items-center gap-[8px] mt-[6px]">
										<span class="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-[8px] bg-emerald-500 text-white text-[0.75rem] font-bold">-20%</span>
									</div>
									<!-- Etichetta promo -->
									<div v-if="promo.label_text" class="mt-[6px]">
										<span
											:style="{ backgroundColor: promo.label_color || '#E44203' }"
											class="inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-[8px] text-white text-[0.75rem] font-bold tracking-wide">
											<!-- Ottimizzazione: lazy loading + decoding async + dimensioni per CLS -->
											<img v-if="promo.label_image" :src="promo.label_image" alt="" loading="lazy" decoding="async" width="30" height="14" class="h-[14px] w-auto shrink-0" />
											{{ promo.label_text }}
										</span>
									</div>
									<!-- Descrizione sconto -->
									<p v-if="promo.description" class="text-[0.8125rem] text-[#444] font-medium mt-[6px]">{{ promo.description }}</p>
									<p class="text-[0.9375rem] font-extrabold mt-[10px] text-[#222]">IVA e ritiro incluso</p>
								</div>
							</div>

							<!-- Salva promozione -->
							<div class="flex justify-end">
								<button @click="savePromo" :disabled="promoSaving" class="inline-flex items-center gap-[8px] px-[24px] py-[12px] bg-[#E44203] hover:bg-[#c93800] text-white rounded-[50px] text-[0.875rem] font-medium transition-colors cursor-pointer disabled:opacity-50">
									<svg v-if="promoSaving" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] animate-spin" fill="currentColor"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>
									<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"/></svg>
									{{ promoSaving ? "Salvataggio..." : "Salva promozione" }}
								</button>
							</div>
						</div>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>
