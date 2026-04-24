/**
 * usePriceBands.ts
 * Thin orchestrator that composes sub-composables.
 */
import {
	FALLBACK_WEIGHT_BANDS,
	FALLBACK_VOLUME_BANDS,
	DEFAULT_EXTRA_RULES,
	DEFAULT_SUPPLEMENTS,
	DEFAULT_PROMO,
	DEFAULT_EUROPE_PRICING,
	DEFAULT_SERVICE_PRICING,
	DEFAULT_AUTOMATIC_SUPPLEMENTS,
	DEFAULT_OPERATIONAL_FEES,
	normalizeBandArray,
	normalizeExtraRules,
	normalizeSupplements,
	normalizeEuropePricing,
	normalizeKeyedPricingGroup,
	findBand,
	getBandPriceCents,
	getBandInfo,
	getExtraBandInfo,
	calcCapSupplementCents,
	calcEuropeQuote,
} from './usePriceBandsDefaults'

interface PriceBandsState {
	weight: unknown[]
	volume: unknown[]
	extra_rules: typeof DEFAULT_EXTRA_RULES
	supplements: unknown[]
	europe: typeof DEFAULT_EUROPE_PRICING
	service_pricing: unknown
	automatic_supplements: unknown
	operational_fees: unknown
	version: string | null
}

const priceBands = ref<PriceBandsState>({
	weight: FALLBACK_WEIGHT_BANDS as unknown[],
	volume: FALLBACK_VOLUME_BANDS as unknown[],
	extra_rules: DEFAULT_EXTRA_RULES,
	supplements: DEFAULT_SUPPLEMENTS as unknown[],
	europe: DEFAULT_EUROPE_PRICING,
	service_pricing: DEFAULT_SERVICE_PRICING,
	automatic_supplements: DEFAULT_AUTOMATIC_SUPPLEMENTS,
	operational_fees: DEFAULT_OPERATIONAL_FEES,
	version: null,
})

const promoSettings = ref(DEFAULT_PROMO)
const loading = ref(false)
const loaded = ref(false)
let lastFetchTime = 0
const TTL_MS = 5 * 60 * 1000
let pendingFetchPromise: Promise<unknown> | null = null

export const usePriceBands = () => {
	const runtimeConfig = useRuntimeConfig()
	const apiBase = String(runtimeConfig.public?.apiBase || 'http://127.0.0.1:8787').replace(/\/$/, '')

	const publicApiFetch = async <T = unknown>(path: string, options: Record<string, unknown> = {}): Promise<T> => {
		const url = path.startsWith('http') ? path : `${apiBase}${path}`
		return await $fetch<T>(url, {
			credentials: 'include',
			...options,
		})
	}

	if (import.meta.server) {
		priceBands.value = {
			weight: [...FALLBACK_WEIGHT_BANDS] as unknown[],
			volume: [...FALLBACK_VOLUME_BANDS] as unknown[],
			extra_rules: { ...DEFAULT_EXTRA_RULES },
			supplements: [...DEFAULT_SUPPLEMENTS] as unknown[],
			europe: { ...DEFAULT_EUROPE_PRICING },
			service_pricing: normalizeKeyedPricingGroup({}, DEFAULT_SERVICE_PRICING),
			automatic_supplements: normalizeKeyedPricingGroup({}, DEFAULT_AUTOMATIC_SUPPLEMENTS),
			operational_fees: normalizeKeyedPricingGroup({}, DEFAULT_OPERATIONAL_FEES),
			version: null,
		}
		promoSettings.value = { ...DEFAULT_PROMO }
		loading.value = false
		loaded.value = false
		lastFetchTime = 0
		pendingFetchPromise = null
	}

	const fetchFromApi = async (): Promise<void> => {
		loading.value = true
		try {
			const res = await publicApiFetch<Record<string, unknown>>('/api/public/price-bands')
			const payload = (res?.data as Record<string, unknown> | undefined) || res || {}
			const data = ((payload as Record<string, unknown>)?.data as Record<string, unknown> | undefined) || payload || {}

			const weight = normalizeBandArray(data?.weight, 'weight')
			const volume = normalizeBandArray(data?.volume, 'volume')
			const extraRules = normalizeExtraRules((data?.extra_rules as Record<string, unknown>) || DEFAULT_EXTRA_RULES)
			const supplements = normalizeSupplements((data?.supplements as unknown[]) || DEFAULT_SUPPLEMENTS)
			const europe = normalizeEuropePricing((data?.europe as Record<string, unknown>) || DEFAULT_EUROPE_PRICING)
			const version = (data?.version as string | undefined) || (payload as { version?: string })?.version || String(Date.now())

			priceBands.value = {
				weight,
				volume,
				extra_rules: extraRules,
				supplements,
				europe,
				service_pricing: normalizeKeyedPricingGroup((data?.service_pricing as Record<string, unknown>) || {}, DEFAULT_SERVICE_PRICING),
				automatic_supplements: normalizeKeyedPricingGroup((data?.automatic_supplements as Record<string, unknown>) || {}, DEFAULT_AUTOMATIC_SUPPLEMENTS),
				operational_fees: normalizeKeyedPricingGroup((data?.operational_fees as Record<string, unknown>) || {}, DEFAULT_OPERATIONAL_FEES),
				version,
			}

			if ((payload as { promo?: Record<string, unknown> })?.promo) {
				promoSettings.value = { ...DEFAULT_PROMO, ...(payload as { promo: Record<string, unknown> }).promo }
			}

			loaded.value = true
			lastFetchTime = Date.now()
		} catch {
			priceBands.value = {
				weight: [...FALLBACK_WEIGHT_BANDS] as unknown[],
				volume: [...FALLBACK_VOLUME_BANDS] as unknown[],
				extra_rules: { ...DEFAULT_EXTRA_RULES },
				supplements: [...DEFAULT_SUPPLEMENTS] as unknown[],
				europe: { ...DEFAULT_EUROPE_PRICING },
				service_pricing: normalizeKeyedPricingGroup({}, DEFAULT_SERVICE_PRICING),
				automatic_supplements: normalizeKeyedPricingGroup({}, DEFAULT_AUTOMATIC_SUPPLEMENTS),
				operational_fees: normalizeKeyedPricingGroup({}, DEFAULT_OPERATIONAL_FEES),
				version: String(Date.now()),
			}
			promoSettings.value = { ...DEFAULT_PROMO }
			loaded.value = true
			lastFetchTime = Date.now()
		} finally {
			loading.value = false
		}
	}

	const loadPriceBands = async (): Promise<unknown> => {
		const expired = Date.now() - lastFetchTime > TTL_MS
		if (loaded.value && !expired) return
		if (pendingFetchPromise) return pendingFetchPromise
		pendingFetchPromise = fetchFromApi().finally(() => {
			pendingFetchPromise = null
		})
		return pendingFetchPromise
	}

	const forceReload = async (): Promise<void> => {
		lastFetchTime = 0
		loaded.value = false
		await fetchFromApi()
	}

	const getWeightPrice = (weightKg: unknown): number | null => {
		const cents = getBandPriceCents('weight', weightKg, priceBands.value as never)
		return cents == null ? null : cents / 100
	}

	const getVolumePrice = (volumeM3: unknown): number | null => {
		const cents = getBandPriceCents('volume', volumeM3, priceBands.value as never)
		return cents == null ? null : cents / 100
	}

	const getWeightBandInfo = (weightKg: unknown) => {
		const value = Number(weightKg)
		if (!Number.isFinite(value) || value <= 0) return null
		const band = findBand(priceBands.value.weight as never, value)
		if (band) return getBandInfo(band)
		const cents = getBandPriceCents('weight', value, priceBands.value as never)
		return cents == null ? null : getExtraBandInfo(cents)
	}

	const getVolumeBandInfo = (volumeM3: unknown) => {
		const value = Number(volumeM3)
		if (!Number.isFinite(value) || value <= 0) return null
		const band = findBand(priceBands.value.volume as never, value)
		if (band) return getBandInfo(band)
		const cents = getBandPriceCents('volume', value, priceBands.value as never)
		return cents == null ? null : getExtraBandInfo(cents)
	}

	const getCapSupplementCents = (originCap: unknown, destinationCap: unknown): number => {
		return calcCapSupplementCents(originCap, destinationCap, (priceBands.value.supplements || []) as never)
	}

	const getCapSupplement = (originCap: unknown, destinationCap: unknown): number => getCapSupplementCents(originCap, destinationCap) / 100

	const getEuropeQuote = (destinationCountryCode: string, weightKg: unknown, volumeM3: unknown) => {
		return calcEuropeQuote(destinationCountryCode, weightKg, volumeM3, (priceBands.value.europe || DEFAULT_EUROPE_PRICING) as never)
	}

	const getMinPrice = () => {
		const firstBand = (priceBands.value.weight as unknown[])?.[0]
		if (!firstBand) {
			return { effectivePrice: 8.9, basePrice: 8.9, discountPercent: null, showDiscount: false, hasDiscount: false, isExtra: false }
		}
		return getBandInfo(firstBand as never)
	}

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
		getEuropeQuote,
		getMinPrice,
	}
}
