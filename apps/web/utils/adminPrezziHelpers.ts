/**
 * adminPrezziHelpers — defaults + helper puri per il pannello admin prezzi.
 *
 * Estratto da composables/useAdminPrezzi.js (split atomico Pinia 2026-04-26).
 * Tutto qui dentro e' framework-agnostic: nessun ref/computed/watch.
 * Owner reattivo dello stato: stores/admin/*.
 */

// ----------------------------------------------------------------------------
// Tipi pubblici
// ----------------------------------------------------------------------------

export interface PriceBand {
	id?: string
	type?: 'weight' | 'volume'
	min_value: number
	max_value: number
	base_price: number | null
	discount_price: number | null
	show_discount: boolean
	sort_order?: number
}

export interface ExtraRules {
	enabled: boolean
	weight_start: number
	weight_step: number
	volume_start: number
	volume_step: number
	increment_cents: number
	increment_mode: 'flat'
	weight_increment_ladder: LadderRow[]
	volume_increment_ladder: LadderRow[]
	base_price_cents_mode: 'manual' | 'last_band_effective'
	base_price_cents_manual: number | null
	weight_resolution: number
	volume_resolution: number
}

export interface LadderRow {
	from_step: number
	to_step: number | null
	increment_cents: number
}

export interface SupplementRule {
	id: string
	prefix: string
	amount_cents: number
	apply_to: 'origin' | 'destination' | 'both'
	enabled: boolean
}

export interface EuropeRate {
	country_code: string
	country_name: string
	price_cents: number | null
	quote_required: boolean
}

export interface EuropeBand {
	id: string
	label: string
	max_weight_kg: number
	max_volume_m3: number
	volumetric_factor: number
	rates: EuropeRate[]
}

export interface EuropePricing {
	enabled: boolean
	scope: string
	origin_country_code: string
	max_packages: number
	max_quantity_per_package: number
	bands: EuropeBand[]
	supported_country_codes: string[]
	version: string | null
}

export interface PromoState {
	active: boolean
	label_text: string
	label_color: string
	label_image: string | null
	show_badges: boolean
	description: string
}

// ----------------------------------------------------------------------------
// Defaults (cents per i prezzi)
// ----------------------------------------------------------------------------

export const ADMIN_DEFAULT_WEIGHT_BANDS: PriceBand[] = [
	{ min_value: 0, max_value: 2, base_price: 890, discount_price: null, show_discount: true },
	{ min_value: 2, max_value: 5, base_price: 1190, discount_price: null, show_discount: true },
	{ min_value: 5, max_value: 10, base_price: 1490, discount_price: null, show_discount: true },
	{ min_value: 10, max_value: 25, base_price: 1990, discount_price: null, show_discount: true },
	{ min_value: 25, max_value: 50, base_price: 2990, discount_price: null, show_discount: true },
	{ min_value: 50, max_value: 75, base_price: 3990, discount_price: null, show_discount: true },
	{ min_value: 75, max_value: 100, base_price: 4990, discount_price: null, show_discount: true },
]

export const ADMIN_DEFAULT_VOLUME_BANDS: PriceBand[] = [
	{ min_value: 0, max_value: 0.010, base_price: 890, discount_price: null, show_discount: true },
	{ min_value: 0.010, max_value: 0.020, base_price: 1190, discount_price: null, show_discount: true },
	{ min_value: 0.020, max_value: 0.040, base_price: 1490, discount_price: null, show_discount: true },
	{ min_value: 0.040, max_value: 0.100, base_price: 1990, discount_price: null, show_discount: true },
	{ min_value: 0.100, max_value: 0.200, base_price: 2990, discount_price: null, show_discount: true },
	{ min_value: 0.200, max_value: 0.300, base_price: 3990, discount_price: null, show_discount: true },
	{ min_value: 0.300, max_value: 0.400, base_price: 4990, discount_price: null, show_discount: true },
]

export const ADMIN_DEFAULT_EXTRA_RULES: ExtraRules = {
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
}

export const ADMIN_DEFAULT_SUPPLEMENTS: SupplementRule[] = [
	{ id: 'supplement-1', prefix: '90', amount_cents: 250, apply_to: 'both', enabled: true },
]

export const ADMIN_DEFAULT_EUROPE_PRICING: EuropePricing = {
	enabled: true,
	scope: 'europe_monocollo',
	origin_country_code: 'IT',
	max_packages: 1,
	max_quantity_per_package: 1,
	bands: [],
	supported_country_codes: [],
	version: null,
}

export const ADMIN_DEFAULT_SERVICE_PRICING: Record<string, Record<string, unknown>> = {
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
}

export const ADMIN_DEFAULT_AUTOMATIC_SUPPLEMENTS: Record<string, Record<string, unknown>> = {
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
		description: 'Supplemento automatico per localita\u0300 italiane insulari minori.',
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
		description: 'Supplemento automatico per localita\u0300 europee insulari minori.',
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
}

export const ADMIN_DEFAULT_OPERATIONAL_FEES: Record<string, Record<string, unknown>> = {
	giacenza: {
		label: 'Giacenza',
		description: 'Costo operativo per gestione giacenza.',
		pricing_type: 'fixed',
		price_cents: 1000,
		enabled: true,
		application: 'manual_admin',
		note: '',
	},
}

export const ADMIN_DEFAULT_PROMO: PromoState = {
	active: false,
	label_text: '',
	label_color: '#E44203',
	label_image: null,
	show_badges: true,
	description: '',
}

// ----------------------------------------------------------------------------
// Conversioni cents <-> euro + format
// ----------------------------------------------------------------------------

export const adminCentsToEuro = (cents: number | string | null | undefined): string => {
	if (cents == null || cents === '') return '-'
	return (Number(cents) / 100).toFixed(2).replace('.', ',') + '\u20AC'
}

export const adminEuroToCents = (euro: number | string | null | undefined): number | null => {
	if (euro == null || euro === '') return null
	const cleaned = String(euro).replace(/[€\s]/g, '').replace(',', '.')
	const num = Number.parseFloat(cleaned)
	return Number.isNaN(num) ? null : Math.round(num * 100)
}

export const adminIncrementCentsToEuro = (value: number | string | null | undefined): string =>
	(Number(value || 0) / 100).toFixed(2).replace('.', ',')

export const effectivePrice = (band: PriceBand): number => {
	return band.discount_price != null ? band.discount_price : (band.base_price ?? 0)
}

export const discountInfo = (band: PriceBand): number | null => {
	if (band.discount_price == null || (band.base_price ?? 0) <= 0) return null
	return Math.round((1 - band.discount_price / (band.base_price as number)) * 100)
}

const APPLICATION_LABELS: Record<string, string> = {
	per_spedizione: 'Per spedizione',
	automatic_destination_per_package: 'Automatico su destinazione / collo',
	automatic_destination: 'Automatico su destinazione',
	automatic_package_shape: 'Automatico per forma collo',
	automatic_per_package: 'Automatico per collo',
	manual_quote_only: 'Solo preventivo manuale',
	manual_admin: 'Fee operativa admin',
}

export const formatApplicationLabel = (value: string | null | undefined): string =>
	APPLICATION_LABELS[value as string] || value || '\u2014'

// ----------------------------------------------------------------------------
// Normalizzatori per payload + risposta API
// ----------------------------------------------------------------------------

export const normalizeStringList = (
	values: unknown[] = [],
	{ uppercase = false }: { uppercase?: boolean } = {},
): string[] => {
	if (!Array.isArray(values)) return []
	return [...new Set(values
		.map((value) => String(value || '').trim())
		.filter(Boolean)
		.map((value) => uppercase ? value.toUpperCase() : value.toLowerCase()))]
}

interface RawTier {
	up_to_kg?: number | string | null
	price_cents?: number | string | null
}

export const normalizeTiers = (tiers: RawTier[] = []): { up_to_kg: number | null, price_cents: number }[] => {
	if (!Array.isArray(tiers)) return []
	return [...tiers]
		.map((tier) => ({
			up_to_kg: tier?.up_to_kg === null || tier?.up_to_kg === undefined || tier?.up_to_kg === ''
				? null
				: Number(tier.up_to_kg),
			price_cents: Number(tier?.price_cents || 0),
		}))
		.sort((a, b) => {
			const left = a.up_to_kg ?? Number.POSITIVE_INFINITY
			const right = b.up_to_kg ?? Number.POSITIVE_INFINITY
			return left - right
		})
}

const numericFieldOrNull = (raw: unknown, fallback: unknown): number | null => {
	if (raw === null || raw === undefined) {
		return fallback === null || fallback === undefined ? null : Number(fallback)
	}
	return Number(raw || 0)
}

export const normalizePricingGroup = (
	config: Record<string, Record<string, unknown>> = {},
	defaults: Record<string, Record<string, unknown>> = {},
): Record<string, Record<string, unknown>> => Object.fromEntries(
	Object.entries(defaults).map(([key, fallback]) => {
		const source = (config?.[key] && typeof config[key] === 'object' ? config[key] : {}) as Record<string, unknown>
		return [key, {
			...fallback,
			...source,
			enabled: (source?.enabled as boolean) !== false && (fallback?.enabled as boolean) !== false,
			price_cents: numericFieldOrNull(source?.price_cents, fallback?.price_cents),
			min_fee_cents: numericFieldOrNull(source?.min_fee_cents, fallback?.min_fee_cents),
			percentage_rate: numericFieldOrNull(source?.percentage_rate, fallback?.percentage_rate),
			threshold_amount_eur: numericFieldOrNull(source?.threshold_amount_eur, fallback?.threshold_amount_eur),
			max_weight_kg: numericFieldOrNull(source?.max_weight_kg, fallback?.max_weight_kg),
			threshold_cm: numericFieldOrNull(source?.threshold_cm, fallback?.threshold_cm),
			longest_side_threshold_cm: numericFieldOrNull(source?.longest_side_threshold_cm, fallback?.longest_side_threshold_cm),
			girth_threshold_cm: numericFieldOrNull(source?.girth_threshold_cm, fallback?.girth_threshold_cm),
			min_longest_side_cm: numericFieldOrNull(source?.min_longest_side_cm, fallback?.min_longest_side_cm),
			max_secondary_side_cm: numericFieldOrNull(source?.max_secondary_side_cm, fallback?.max_secondary_side_cm),
			province_codes: Array.isArray(source?.province_codes)
				? normalizeStringList(source.province_codes as unknown[], { uppercase: true })
				: [...((fallback?.province_codes as string[]) || [])],
			country_codes: Array.isArray(source?.country_codes)
				? normalizeStringList(source.country_codes as unknown[], { uppercase: true })
				: [...((fallback?.country_codes as string[]) || [])],
			keyword_list: Array.isArray(source?.keyword_list)
				? normalizeStringList(source.keyword_list as unknown[])
				: [...((fallback?.keyword_list as string[]) || [])],
			flag_keys: Array.isArray(source?.flag_keys)
				? normalizeStringList(source.flag_keys as unknown[])
				: [...((fallback?.flag_keys as string[]) || [])],
			delivery_modes: Array.isArray(source?.delivery_modes)
				? normalizeStringList(source.delivery_modes as unknown[])
				: [...((fallback?.delivery_modes as string[]) || [])],
			tiers: Array.isArray(source?.tiers)
				? normalizeTiers(source.tiers as RawTier[])
				: normalizeTiers((fallback?.tiers as RawTier[]) || []),
		}]
	}),
)

interface RawEuropeBand {
	id?: string | number
	label?: string
	max_weight_kg?: number
	max_volume_m3?: number
	volumetric_factor?: number
	rates?: Array<{
		country_code?: string
		country_name?: string
		price_cents?: number | string | null
		quote_required?: boolean
	}>
}

interface RawEuropePricing {
	enabled?: boolean
	origin_country_code?: string
	bands?: RawEuropeBand[]
	supported_country_codes?: string[]
	version?: string | null
}

export const adminNormalizeEuropePricing = (config: RawEuropePricing = {}): EuropePricing => {
	const bands: EuropeBand[] = Array.isArray(config?.bands)
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
		: []

	return {
		...ADMIN_DEFAULT_EUROPE_PRICING,
		enabled: config?.enabled !== false,
		origin_country_code: String(config?.origin_country_code ?? 'IT').trim().toUpperCase() || 'IT',
		max_packages: 1,
		max_quantity_per_package: 1,
		bands,
		supported_country_codes: Array.isArray(config?.supported_country_codes)
			? [...config.supported_country_codes]
			: [...new Set(bands.flatMap((band) => band.rates.map((rate) => rate.country_code)))].sort(),
		version: config?.version || null,
	}
}

export const buildPricingRulesPayload = <T>(group: T): T => JSON.parse(JSON.stringify(group))

// ----------------------------------------------------------------------------
// Ladder helpers
// ----------------------------------------------------------------------------

export const normalizeLadderForPayload = (rows: LadderRow[] | unknown, fallbackIncrement: number): LadderRow[] => {
	const fallback = Math.max(0, Number(fallbackIncrement || 0))
	const source = Array.isArray(rows) ? rows : []
	const normalized = source
		.map((row, idx) => {
			const fromStep = Math.max(1, Number.parseInt(String(row?.from_step ?? (idx + 1)), 10) || 1)
			const toRaw = row?.to_step
			const toStep = toRaw === null || toRaw === '' || toRaw === undefined
				? null
				: Math.max(fromStep, Number.parseInt(String(toRaw), 10) || fromStep)
			const increment = Math.max(0, Number.parseInt(String(row?.increment_cents ?? fallback), 10) || 0)
			return { from_step: fromStep, to_step: toStep, increment_cents: increment }
		})
		.sort((a, b) => a.from_step - b.from_step)

	if (!normalized.length) {
		return [{ from_step: 1, to_step: null, increment_cents: fallback }]
	}
	const lastRow = normalized[normalized.length - 1]
	if (lastRow) lastRow.to_step = null
	return normalized
}

// ----------------------------------------------------------------------------
// Calcolo prezzo (replica logica usePriceBandsCalc per anteprima admin)
// ----------------------------------------------------------------------------

const PREVIEW_EPSILON = 0.0000001

const effectivePriceCents = (band: PriceBand | null | undefined): number => {
	if (!band) return 0
	if (band.discount_price != null && Number(band.discount_price) >= 0) {
		return Number(band.discount_price)
	}
	return Number(band.base_price || 0)
}

const ceilByResolution = (value: number, resolution: number): number => {
	const safeResolution = Number(resolution) > 0 ? Number(resolution) : 1
	const multiplier = 1 / safeResolution
	return Number((Math.ceil((Number(value) * multiplier) - PREVIEW_EPSILON) / multiplier).toFixed(4))
}

const findBand = (bands: PriceBand[], rawValue: number): PriceBand | null => {
	const value = Number(rawValue)
	if (!Array.isArray(bands) || !bands.length || !Number.isFinite(value) || value <= 0) return null
	for (let idx = 0; idx < bands.length; idx += 1) {
		const band = bands[idx]
		if (!band) continue
		const min = Number(band.min_value)
		const max = Number(band.max_value)
		const lowerOk = idx === 0 ? value >= (min - PREVIEW_EPSILON) : value > (min + PREVIEW_EPSILON)
		const upperOk = value <= (max + PREVIEW_EPSILON)
		if (lowerOk && upperOk) return band
	}
	return null
}

export const calculateExtraPriceCents = (
	type: 'weight' | 'volume',
	rawValue: number,
	rules: ExtraRules,
	weightBands: PriceBand[],
	volumeBands: PriceBand[],
): number | null => {
	if (!rules?.enabled) return null
	const isWeight = type === 'weight'
	const start = Number(isWeight ? rules.weight_start : rules.volume_start)
	const step = Number(isWeight ? rules.weight_step : rules.volume_step)
	const resolution = Number(isWeight ? rules.weight_resolution : rules.volume_resolution)
	const increment = Number(rules.increment_cents || 0)
	if (!Number.isFinite(start) || !Number.isFinite(step) || !Number.isFinite(resolution) || step <= 0 || resolution <= 0 || increment < 0) {
		return null
	}
	const value = ceilByResolution(rawValue, resolution)
	if (value + PREVIEW_EPSILON < start) return null
	let baseCents = 0
	if (rules.base_price_cents_mode === 'manual') {
		baseCents = Number(rules.base_price_cents_manual || 0)
	} else {
		const sourceBands = isWeight ? weightBands : volumeBands
		const lastBand = sourceBands[sourceBands.length - 1]
		baseCents = effectivePriceCents(lastBand)
	}
	const stepsFromStart = Math.floor(((value - start) + PREVIEW_EPSILON) / step)
	const bandNumber = Math.max(0, stepsFromStart) + 1
	return Math.max(0, Math.round(baseCents + (bandNumber * increment)))
}

export const calculateBandPriceCents = (
	type: 'weight' | 'volume',
	rawValue: number,
	rules: ExtraRules,
	weightBands: PriceBand[],
	volumeBands: PriceBand[],
): number => {
	const bands = type === 'weight' ? weightBands : volumeBands
	const band = findBand(bands, rawValue)
	if (band) return effectivePriceCents(band)
	const extraPrice = calculateExtraPriceCents(type, rawValue, rules, weightBands, volumeBands)
	if (extraPrice !== null) return extraPrice
	const lastBand = bands[bands.length - 1]
	return effectivePriceCents(lastBand)
}

// ----------------------------------------------------------------------------
// Helpers input lista (CSV in textarea)
// ----------------------------------------------------------------------------

export const normalizeArrayFieldInput = (
	rawValue: string | null | undefined,
	{ uppercase = false }: { uppercase?: boolean } = {},
): string[] => String(rawValue || '')
	.split(',')
	.map((item) => String(item || '').trim())
	.filter(Boolean)
	.map((item) => uppercase ? item.toUpperCase() : item.toLowerCase())

// ----------------------------------------------------------------------------
// Deep clone per snapshot "original" (immutabile, niente proxy reattivi)
// ----------------------------------------------------------------------------

export const cloneForSnapshot = <T>(value: T): T => JSON.parse(JSON.stringify(value))
