/**
 * Helper di parsing/normalizzazione del modulo pricing.
 *
 * Estratti da utils/shipmentServicePricing.ts (Ondata 3 split). Funzioni pure
 * (no side effects) — facili da testare e composare con altri moduli.
 */
import { DEFAULT_AUTOMATIC_SUPPLEMENTS, DEFAULT_SERVICE_PRICING } from './defaults'
import type {
	AddressInput,
	NormalizedAddress,
	NormalizedPackage,
	PackageInput,
	PricingConfig,
	PricingTier,
	ServicePricingRule,
} from './types'

const asRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === 'object' ? value as Record<string, unknown> : {}

const asPackageInput = (value: unknown): PackageInput | null =>
	value && typeof value === 'object' ? value as PackageInput : null

/** Arrotondamento monetario: 2 decimali. Usato per evitare floating-drift. */
export const roundCurrency = (value: number | string | null | undefined): number =>
	Math.round((Number(value) || 0) * 100) / 100

/**
 * Parsing tollerante: accetta "1.234,56", "1234.56", "€ 1,23", numero o null.
 */
export const parseCurrencyAmount = (value: unknown): number => {
	if (value === null || value === undefined) return 0
	if (typeof value === 'number') return Number.isFinite(value) ? value : 0

	const normalized = String(value)
		.trim()
		.replace(/[€\s]/g, '')
		.replace(/\.(?=\d{3}(?:\D|$))/g, '')
		.replace(',', '.')

	const parsed = Number(normalized)
	return Number.isFinite(parsed) ? parsed : 0
}

const parseNumericValue = (value: unknown): number => {
	const parsed = parseCurrencyAmount(value)
	return parsed > 0 ? parsed : 0
}

/**
 * Normalizza la chiave di un servizio umano-readable in chiave canonica
 * (es. "Senza etichetta" -> "senza_etichetta").
 */
export const normalizeServiceKey = (value: unknown): string => {
	const raw = String(value || '')
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036F]/g, '')

	if (!raw || raw === 'nessuno') return ''
	if (raw.includes('senza') && raw.includes('etichetta')) return 'senza_etichetta'
	if (raw.includes('contrassegno')) return 'contrassegno'
	if (raw.includes('assicurazione')) return 'assicurazione'
	if (raw.includes('sponda')) return 'sponda_idraulica'
	if (raw.includes('sms') || raw.includes('notifiche')) return 'sms_email_notification'
	return raw.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

/**
 * Normalizza la selezione servizi (array/stringa csv) in lista di chiavi
 * canoniche dedupplicate.
 */
export const normalizeSelectedServices = (
	serviceSelection: string[] | string | null | undefined,
): string[] => {
	if (Array.isArray(serviceSelection)) {
		return [...new Set(serviceSelection.map(normalizeServiceKey).filter(Boolean))]
	}

	const raw = String(serviceSelection || '').trim()
	if (!raw || raw.toLowerCase() === 'nessuno') return []
	return [...new Set(raw.split(',').map((entry) => normalizeServiceKey(entry)).filter(Boolean))]
}

/** Primo valore non undefined fra i nomi chiave elencati. */
export const getNested = (
	source: Record<string, unknown> | null | undefined,
	keys: string[] = [],
): unknown | undefined => {
	if (!source || typeof source !== 'object') return undefined
	for (const key of keys) {
		if (key in source) return source[key]
	}
	return undefined
}

export const getContrassegnoAmount = (serviceData: Record<string, unknown> = {}): number => {
	const contrassegno = asRecord(getNested(serviceData, ['contrassegno', 'Contrassegno']))
	return parseCurrencyAmount(contrassegno?.importo)
}

export const getAssicurazioneAmount = (serviceData: Record<string, unknown> = {}): number => {
	const assicurazione = getNested(serviceData, ['assicurazione', 'Assicurazione'])
	if (!assicurazione || typeof assicurazione !== 'object') return 0

	return Object.values(asRecord(assicurazione))
		.map(parseCurrencyAmount)
		.reduce((sum, value) => sum + value, 0)
}

/**
 * Normalizza una lista di stringhe: trim, filtro vuoti, dedup e opzionale
 * uppercase/lowercase.
 */
export const normalizeList = (
	items: unknown,
	{ uppercase = false }: { uppercase?: boolean } = {},
): string[] => {
	if (!Array.isArray(items)) return []
	return [...new Set(items
		.map((item) => String(item || '').trim())
		.filter(Boolean)
		.map((item) => (uppercase ? item.toUpperCase() : item.toLowerCase())),
	)]
}

/** Normalizza i tier di peso: up_to_kg numerico o null, ordinati per peso. */
const normalizeTiers = (tiers: unknown = []): PricingTier[] => {
	if (!Array.isArray(tiers)) return []
	return [...tiers]
		.map((rawTier) => {
			const tier = asRecord(rawTier)
			return {
				up_to_kg: tier.up_to_kg === null || tier.up_to_kg === undefined || tier.up_to_kg === ''
					? null
					: parseNumericValue(tier.up_to_kg),
				price_cents: Math.max(0, Math.round(Number(tier?.price_cents || 0))),
			}
		})
		.sort((a, b) => {
			const left = a.up_to_kg ?? Number.POSITIVE_INFINITY
			const right = b.up_to_kg ?? Number.POSITIVE_INFINITY
			return left - right
		})
}

/**
 * Normalizza un gruppo chiave->regola applicando fallback e coercizioni numeriche.
 */
const normalizeKeyedPricingGroup = (
	group: Record<string, Partial<ServicePricingRule>> = {},
	defaults: Record<string, ServicePricingRule> = {},
): Record<string, ServicePricingRule> => Object.fromEntries(
	Object.entries(defaults).map(([key, fallback]) => {
		const candidate = group?.[key]
		const source: Partial<ServicePricingRule> = candidate && typeof candidate === 'object' ? candidate : {}
		const numberOrFallback = (srcVal: unknown, fbVal?: number | null) => {
			if (srcVal === null || srcVal === undefined) return fbVal ?? null
			return Number(srcVal) || 0
		}
		const centsOrFallback = (srcVal: unknown, fbVal?: number | null) => {
			if (srcVal === null || srcVal === undefined) return fbVal ?? null
			return Math.max(0, Math.round(Number(srcVal || 0)))
		}
		return [key, {
			...fallback,
			...source,
			enabled: source?.enabled !== false && fallback?.enabled !== false,
			price_cents: centsOrFallback(source?.price_cents, fallback?.price_cents),
			min_fee_cents: centsOrFallback(source?.min_fee_cents, fallback?.min_fee_cents),
			percentage_rate: numberOrFallback(source?.percentage_rate, fallback?.percentage_rate),
			threshold_amount_eur: numberOrFallback(source?.threshold_amount_eur, fallback?.threshold_amount_eur),
			max_weight_kg: numberOrFallback(source?.max_weight_kg, fallback?.max_weight_kg),
			threshold_cm: numberOrFallback(source?.threshold_cm, fallback?.threshold_cm),
			longest_side_threshold_cm: numberOrFallback(source?.longest_side_threshold_cm, fallback?.longest_side_threshold_cm),
			girth_threshold_cm: numberOrFallback(source?.girth_threshold_cm, fallback?.girth_threshold_cm),
			min_longest_side_cm: numberOrFallback(source?.min_longest_side_cm, fallback?.min_longest_side_cm),
			max_secondary_side_cm: numberOrFallback(source?.max_secondary_side_cm, fallback?.max_secondary_side_cm),
			province_codes: Array.isArray(source?.province_codes)
				? normalizeList(source.province_codes, { uppercase: true })
				: [...(fallback?.province_codes || [])],
			country_codes: Array.isArray(source?.country_codes)
				? normalizeList(source.country_codes, { uppercase: true })
				: [...(fallback?.country_codes || [])],
			keyword_list: Array.isArray(source?.keyword_list)
				? normalizeList(source.keyword_list)
				: [...(fallback?.keyword_list || [])],
			flag_keys: Array.isArray(source?.flag_keys)
				? normalizeList(source.flag_keys)
				: [...(fallback?.flag_keys || [])],
			delivery_modes: Array.isArray(source?.delivery_modes)
				? normalizeList(source.delivery_modes)
				: [...(fallback?.delivery_modes || [])],
			tiers: Array.isArray(source?.tiers)
				? normalizeTiers(source.tiers)
				: normalizeTiers(fallback?.tiers || []),
		} as ServicePricingRule]
	}),
)

export const normalizePricingConfig = (pricingConfig: Partial<PricingConfig> = {}): PricingConfig => ({
	service_pricing: normalizeKeyedPricingGroup(pricingConfig?.service_pricing || {}, DEFAULT_SERVICE_PRICING),
	automatic_supplements: normalizeKeyedPricingGroup(pricingConfig?.automatic_supplements || {}, DEFAULT_AUTOMATIC_SUPPLEMENTS),
})

export const normalizePackages = (packages: unknown = []): NormalizedPackage[] => {
	if (!Array.isArray(packages)) return []
	return packages
		.map((candidate) => {
			const pkg = asPackageInput(candidate)
			if (!pkg) return null
			const first = parseNumericValue(pkg.first_size ?? pkg.length)
			const second = parseNumericValue(pkg.second_size ?? pkg.width)
			const third = parseNumericValue(pkg.third_size ?? pkg.height)
			const dimensions = [first, second, third].sort((a, b) => b - a)
			return {
				package_type: String(pkg.package_type || '').trim().toLowerCase(),
				weight_kg: parseNumericValue(pkg.weight),
				quantity: Math.max(1, Number.parseInt(String(pkg.quantity ?? '1'), 10) || 1),
				first_size_cm: first,
				second_size_cm: second,
				third_size_cm: third,
				max_side_cm: dimensions[0] || 0,
				secondary_side_sum_cm: (dimensions[1] || 0) + (dimensions[2] || 0),
				raw: pkg,
			}
		})
		.filter((pkg): pkg is NormalizedPackage => pkg !== null)
}

export const normalizeAddress = (address: AddressInput = {}): NormalizedAddress => ({
	country: String(address?.country || address?.country_code || 'IT').trim().toUpperCase(),
	province: String(address?.province || '').trim().toUpperCase(),
	city: String(address?.city || '').trim().toLowerCase(),
	address: String(address?.address || '').trim().toLowerCase(),
	additional_information: String(address?.additional_information || '').trim().toLowerCase(),
})
