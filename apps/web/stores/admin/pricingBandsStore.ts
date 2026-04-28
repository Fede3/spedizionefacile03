/**
 * pricingBandsStore — fasce nazionali (peso + volume) + extra rules + Europa.
 *
 * Estratto dalla sezione "bands" di composables/useAdminPrezzi.js
 * (split atomico Pinia 2026-04-26). Comprende:
 *   - state delle bande peso/volume + snapshot originali
 *   - extra rules ladder con CRUD (add/remove/continuita\u0300)
 *   - editing inline cella (editingCell + editValue)
 *   - state Europa (bands + filtri UI + computed) e relativi helpers
 *   - calcolo prezzi anteprima (delegato a utils/adminPrezziHelpers)
 *
 * Le actions di rete (fetch/save/seed) vivono nel wrapper composable
 * useAdminPrezzi() che orchestra anche supplementsStore + servicesStore.
 */
import { defineStore } from 'pinia'
import {
	adminCentsToEuro,
	adminEuroToCents,
	adminIncrementCentsToEuro,
	adminNormalizeEuropePricing,
	ADMIN_DEFAULT_EUROPE_PRICING,
	ADMIN_DEFAULT_EXTRA_RULES,
	ADMIN_DEFAULT_WEIGHT_BANDS,
	ADMIN_DEFAULT_VOLUME_BANDS,
	calculateBandPriceCents,
	cloneForSnapshot,
	discountInfo,
	effectivePrice,
	normalizeLadderForPayload,
	type EuropePricing,
	type ExtraRules,
	type LadderRow,
	type PriceBand,
} from '~/utils/adminPrezziHelpers'

type BandKind = 'weight' | 'volume'

const DEFAULT_INCREMENT_LADDER: LadderRow[] = [{ from_step: 1, to_step: null, increment_cents: 500 }]

export const useAdminPricingBandsStore = defineStore('admin-pricing-bands', () => {
	// ---------- STATE ----------
	const weightBands = ref<PriceBand[]>([])
	const volumeBands = ref<PriceBand[]>([])
	const originalWeightBands = ref<PriceBand[]>([])
	const originalVolumeBands = ref<PriceBand[]>([])
	const bandsFromDb = ref(false)

	const extraRules = ref<ExtraRules>({ ...ADMIN_DEFAULT_EXTRA_RULES })
	const originalExtraRules = ref<ExtraRules | null>(null)

	const europePricing = ref<EuropePricing>({ ...ADMIN_DEFAULT_EUROPE_PRICING })
	const originalEuropePricing = ref<EuropePricing | null>(null)

	const pricingVersion = ref<string | null>(null)

	// Editing inline cella (es. "weight-3-base_price")
	const editingCell = ref<string | null>(null)
	const editValue = ref<string>('')

	// ---------- UI STATE EUROPA ----------
	const compactEuropeView = ref(false)
	const europeSearch = ref('')
	const europeStatusFilter = ref<'all' | 'active' | 'quote_required'>('all')
	const europeBandFilter = ref<string>('all')
	const europeSort = ref<'country_asc' | 'price_asc' | 'price_desc' | 'status'>('country_asc')

	// ---------- HELPERS INTERNI ----------
	const bandsFor = (type: BandKind): PriceBand[] => (type === 'weight' ? weightBands.value : volumeBands.value)

	const ladderRowsFor = (kind: BandKind): LadderRow[] => (
		kind === 'weight' ? extraRules.value.weight_increment_ladder : extraRules.value.volume_increment_ladder
	)

	const setLadderRows = (kind: BandKind, rows: LadderRow[]): void => {
		if (kind === 'weight') extraRules.value.weight_increment_ladder = rows
		else extraRules.value.volume_increment_ladder = rows
	}

	// ---------- BANDA: CRUD ----------
	const addBand = (type: BandKind): void => {
		const bands = bandsFor(type)
		const last = bands[bands.length - 1]
		const min = last ? Number(last.max_value) : 0
		const max = Number((min + (type === 'weight' ? 50 : 0.2)).toFixed(3))
		bands.push({
			id: `${type}-new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
			type,
			min_value: Number(min.toFixed(3)),
			max_value: max,
			base_price: last ? Number(last.base_price || 0) : 0,
			discount_price: null,
			show_discount: true,
			sort_order: bands.length + 1,
		})
	}

	const removeBand = (type: BandKind, idx: number, onError?: (msg: string) => void): void => {
		const bands = bandsFor(type)
		if (bands.length <= 1) {
			onError?.('Deve rimanere almeno una fascia.')
			return
		}
		bands.splice(idx, 1)
	}

	const moveBand = (type: BandKind, idx: number, direction: -1 | 1): void => {
		const bands = bandsFor(type)
		const target = idx + direction
		if (target < 0 || target >= bands.length) return
		const a = bands[idx]
		const b = bands[target]
		if (!a || !b) return
		;[bands[idx], bands[target]] = [b, a]
	}

	const toggleShowDiscount = (type: BandKind, idx: number): void => {
		const bands = bandsFor(type)
		const band = bands[idx]
		if (!band) return
		band.show_discount = !band.show_discount
	}

	// ---------- BANDA: EDIT INLINE ----------
	const startEdit = (type: BandKind, idx: number, field: 'base_price' | 'discount_price'): void => {
		const key = `${type}-${idx}-${field}`
		editingCell.value = key
		const bands = bandsFor(type)
		const band = bands[idx]
		if (!band) return
		const cents = band[field]
		editValue.value = cents != null ? (Number(cents) / 100).toFixed(2).replace('.', ',') : ''
		nextTick(() => {
			const input = document.getElementById(`edit-${key}`)
			if (input) {
				;(input as HTMLInputElement).focus()
				;(input as HTMLInputElement).select()
			}
		})
	}

	const confirmEdit = (
		type: BandKind,
		idx: number,
		field: 'base_price' | 'discount_price',
		onError?: (msg: string) => void,
	): void => {
		const key = `${type}-${idx}-${field}`
		if (editingCell.value !== key) return
		const bands = bandsFor(type)
		const band = bands[idx]
		if (!band) return
		const newCents = adminEuroToCents(editValue.value)
		if (newCents !== null && newCents < 0) {
			onError?.("Il prezzo non puo\u0300 essere negativo.")
			editingCell.value = null
			editValue.value = ''
			return
		}
		band[field] = newCents
		editingCell.value = null
		editValue.value = ''
	}

	const cancelEdit = (): void => {
		editingCell.value = null
		editValue.value = ''
	}

	// ---------- LADDER ----------
	const updateLadderIncrementFromEuro = (row: LadderRow, rawValue: string): void => {
		const cents = adminEuroToCents(rawValue)
		row.increment_cents = Math.max(0, cents ?? 0)
	}

	const addLadderRow = (kind: BandKind): void => {
		const rows = ladderRowsFor(kind)
		const payloadRows = normalizeLadderForPayload(rows, extraRules.value.increment_cents)
		const last: LadderRow = payloadRows[payloadRows.length - 1] ?? {
			from_step: 1,
			to_step: null,
			increment_cents: Number(extraRules.value.increment_cents || 0),
		}
		const fromStep = last.to_step == null ? (last.from_step + 1) : (last.to_step + 1)
		rows.push({
			from_step: fromStep,
			to_step: null,
			increment_cents: Number(last.increment_cents || extraRules.value.increment_cents || 0),
		})
	}

	const removeLadderRow = (kind: BandKind, idx: number, onError?: (msg: string) => void): void => {
		const rows = ladderRowsFor(kind)
		if (rows.length <= 1) {
			onError?.('Deve rimanere almeno uno scaglione incremento.')
			return
		}
		rows.splice(idx, 1)
	}

	const ensureLadderContinuity = (kind: BandKind): void => {
		const rows = ladderRowsFor(kind)
		const normalized = normalizeLadderForPayload(rows, extraRules.value.increment_cents)
		const rebuilt = normalized.map((row, idx) => {
			const prev = normalized[idx - 1]
			return {
				from_step: idx === 0 || !prev ? 1 : (prev.to_step ?? prev.from_step) + 1,
				to_step: idx === normalized.length - 1 ? null : (row.to_step ?? row.from_step),
				increment_cents: row.increment_cents,
			}
		})
		setLadderRows(kind, rebuilt)
	}

	// ---------- EUROPA ----------
	const updateEuropeRateAmountFromEuro = (rate: { price_cents: number | null }, rawValue: string): void => {
		const cents = adminEuroToCents(rawValue)
		rate.price_cents = cents == null ? null : Math.max(0, cents)
	}

	const toggleEuropeRateQuote = (rate: { quote_required: boolean, price_cents: number | null }): void => {
		rate.quote_required = !rate.quote_required
		if (rate.quote_required) {
			rate.price_cents = null
		}
	}

	// ---------- COMPUTED EUROPA ----------
	const europeBandFilters = computed(() => [
		{ value: 'all', label: 'Tutte le fasce' },
		...(europePricing.value?.bands || []).map((band) => ({ value: band.id, label: band.label })),
	])

	const filteredEuropeBands = computed(() => {
		const search = europeSearch.value.trim().toLowerCase()
		const status = europeStatusFilter.value
		const sortMode = europeSort.value
		const selectedBand = europeBandFilter.value

		const sortRates = (rates: EuropePricing['bands'][number]['rates']) => [...rates].sort((left, right) => {
			if (sortMode === 'price_asc') {
				return (left.price_cents ?? Number.POSITIVE_INFINITY) - (right.price_cents ?? Number.POSITIVE_INFINITY)
			}
			if (sortMode === 'price_desc') {
				return (right.price_cents ?? -1) - (left.price_cents ?? -1)
			}
			if (sortMode === 'status') {
				return Number(left.quote_required) - Number(right.quote_required)
			}
			return String(left.country_name || left.country_code).localeCompare(
				String(right.country_name || right.country_code),
				'it',
			)
		})

		return (europePricing.value?.bands || [])
			.filter((band) => selectedBand === 'all' || band.id === selectedBand)
			.map((band) => {
				const rates = sortRates((band.rates || []).filter((rate) => {
					const matchesSearch = !search || `${rate.country_name} ${rate.country_code}`.toLowerCase().includes(search)
					const matchesStatus = status === 'all'
						|| (status === 'quote_required' && rate.quote_required)
						|| (status === 'active' && !rate.quote_required)
					return matchesSearch && matchesStatus
				}))
				return {
					...band,
					rates,
					activeCount: rates.filter((rate) => !rate.quote_required).length,
					quoteCount: rates.filter((rate) => rate.quote_required).length,
				}
			})
			.filter((band) => band.rates.length > 0)
	})

	// ---------- ANTEPRIMA PREZZI ----------
	const calcLocalPrice = (type: BandKind, rawValue: number): number =>
		calculateBandPriceCents(type, rawValue, extraRules.value, weightBands.value, volumeBands.value)

	const extraRuleExamples = computed(() => {
		const r = extraRules.value
		const firstWeightFrom = Number(r.weight_start || 101)
		const firstWeightTo = Number((firstWeightFrom + Number(r.weight_step || 50) - Number(r.weight_resolution || 1)).toFixed(4))
		const secondWeightFrom = Number((firstWeightFrom + Number(r.weight_step || 50)).toFixed(4))
		const secondWeightTo = Number((secondWeightFrom + Number(r.weight_step || 50) - Number(r.weight_resolution || 1)).toFixed(4))
		const firstVolumeFrom = Number(r.volume_start || 0.401)
		const firstVolumeTo = Number((firstVolumeFrom + Number(r.volume_step || 0.2) - Number(r.volume_resolution || 0.001)).toFixed(4))
		const secondVolumeFrom = Number((firstVolumeFrom + Number(r.volume_step || 0.2)).toFixed(4))
		const secondVolumeTo = Number((secondVolumeFrom + Number(r.volume_step || 0.2) - Number(r.volume_resolution || 0.001)).toFixed(4))
		return { firstWeightFrom, firstWeightTo, secondWeightFrom, secondWeightTo, firstVolumeFrom, firstVolumeTo, secondVolumeFrom, secondVolumeTo }
	})

	const pricingPreviewCases = computed(() => {
		const r = extraRules.value
		const weightStart = Number(r.weight_start || 101)
		const weightStep = Number(r.weight_step || 50)
		const weightResolution = Number(r.weight_resolution || 1)
		const volumeStart = Number(r.volume_start || 0.401)
		const volumeStep = Number(r.volume_step || 0.2)
		const volumeResolution = Number(r.volume_resolution || 0.001)

		const standardWeight = Number((weightStart - weightResolution).toFixed(4))
		const standardVolume = Number((volumeStart - volumeResolution).toFixed(4))
		const firstExtraWeightMax = Number((weightStart + weightStep - weightResolution).toFixed(4))
		const firstExtraVolumeMax = Number((volumeStart + volumeStep - volumeResolution).toFixed(4))
		const secondExtraWeightStart = Number((weightStart + weightStep).toFixed(4))
		const secondExtraVolumeStart = Number((volumeStart + volumeStep).toFixed(4))

		const rows = [
			{ id: 'standard', label: 'Ultima fascia standard', weight: standardWeight, volume: standardVolume },
			{ id: 'extra1w', label: 'Primo extra (inizio)', weight: weightStart, volume: volumeStart },
			{ id: 'extra1max', label: 'Primo extra (limite)', weight: firstExtraWeightMax, volume: firstExtraVolumeMax },
			{ id: 'extra2', label: 'Secondo extra', weight: secondExtraWeightStart, volume: secondExtraVolumeStart },
		]

		return rows.map((row) => {
			const weightPriceCents = calcLocalPrice('weight', row.weight)
			const volumePriceCents = calcLocalPrice('volume', row.volume)
			const totalCents = Math.max(weightPriceCents, volumePriceCents)
			return {
				...row,
				weightPriceLabel: adminCentsToEuro(weightPriceCents),
				volumePriceLabel: adminCentsToEuro(volumePriceCents),
				totalLabel: adminCentsToEuro(totalCents),
			}
		})
	})

	// ---------- HYDRATATION ----------
	const applyDefaults = (): void => {
		weightBands.value = ADMIN_DEFAULT_WEIGHT_BANDS.map((b, i) => ({ ...b, id: `new-w-${i}` }))
		volumeBands.value = ADMIN_DEFAULT_VOLUME_BANDS.map((b, i) => ({ ...b, id: `new-v-${i}` }))
		extraRules.value = {
			...ADMIN_DEFAULT_EXTRA_RULES,
			increment_mode: 'flat',
			weight_increment_ladder: [...DEFAULT_INCREMENT_LADDER],
			volume_increment_ladder: [...DEFAULT_INCREMENT_LADDER],
		}
		extraRules.value.weight_increment_ladder = normalizeLadderForPayload(
			extraRules.value.weight_increment_ladder,
			extraRules.value.increment_cents,
		)
		extraRules.value.volume_increment_ladder = normalizeLadderForPayload(
			extraRules.value.volume_increment_ladder,
			extraRules.value.increment_cents,
		)
		originalExtraRules.value = cloneForSnapshot(extraRules.value)
		europePricing.value = adminNormalizeEuropePricing(ADMIN_DEFAULT_EUROPE_PRICING)
		originalEuropePricing.value = cloneForSnapshot(europePricing.value)
		pricingVersion.value = null
		bandsFromDb.value = false
	}

	const hydrateFromApi = (data: Record<string, unknown>): void => {
		const w = (data.weight as PriceBand[]) || []
		const v = (data.volume as PriceBand[]) || []
		weightBands.value = w.map((b) => ({ ...b }))
		volumeBands.value = v.map((b) => ({ ...b }))
		originalWeightBands.value = w.map((b) => ({ ...b }))
		originalVolumeBands.value = v.map((b) => ({ ...b }))
		extraRules.value = {
			...ADMIN_DEFAULT_EXTRA_RULES,
			...(data.extra_rules as Partial<ExtraRules> || {}),
			increment_mode: 'flat',
		}
		extraRules.value.weight_increment_ladder = normalizeLadderForPayload(
			extraRules.value.weight_increment_ladder,
			extraRules.value.increment_cents,
		)
		extraRules.value.volume_increment_ladder = normalizeLadderForPayload(
			extraRules.value.volume_increment_ladder,
			extraRules.value.increment_cents,
		)
		originalExtraRules.value = cloneForSnapshot(extraRules.value)
		europePricing.value = adminNormalizeEuropePricing((data.europe as Parameters<typeof adminNormalizeEuropePricing>[0]) || ADMIN_DEFAULT_EUROPE_PRICING)
		originalEuropePricing.value = cloneForSnapshot(europePricing.value)
		pricingVersion.value = (data.version as string | null) || null
		bandsFromDb.value = true
	}

	const persistApiResponse = (data: Record<string, unknown>, fallbackPayload: Record<string, unknown>): void => {
		bandsFromDb.value = true
		originalWeightBands.value = ((data.weight as PriceBand[]) || (fallbackPayload.weight as PriceBand[])).map((b: PriceBand) => ({ ...b }))
		originalVolumeBands.value = ((data.volume as PriceBand[]) || (fallbackPayload.volume as PriceBand[])).map((b: PriceBand) => ({ ...b }))
		originalExtraRules.value = cloneForSnapshot(
			(data.extra_rules as ExtraRules) || (fallbackPayload.extra_rules as ExtraRules),
		)
		europePricing.value = adminNormalizeEuropePricing(
			(data.europe as Parameters<typeof adminNormalizeEuropePricing>[0])
			|| (fallbackPayload.europe as Parameters<typeof adminNormalizeEuropePricing>[0])
			|| ADMIN_DEFAULT_EUROPE_PRICING,
		)
		originalEuropePricing.value = cloneForSnapshot(europePricing.value)
		pricingVersion.value = (data.version as string | null) || pricingVersion.value
	}

	// ---------- PAYLOAD ----------
	const buildBandsPayload = () => ({
		weight: weightBands.value.map((band, idx) => ({
			id: band.id || `w-${idx + 1}`,
			min_value: Number(band.min_value),
			max_value: Number(band.max_value),
			base_price: Number(band.base_price || 0),
			discount_price: band.discount_price === null || (band.discount_price as unknown) === ''
				? null
				: Number(band.discount_price),
			show_discount: band.show_discount !== false,
			sort_order: idx + 1,
		})),
		volume: volumeBands.value.map((band, idx) => ({
			id: band.id || `v-${idx + 1}`,
			min_value: Number(band.min_value),
			max_value: Number(band.max_value),
			base_price: Number(band.base_price || 0),
			discount_price: band.discount_price === null || (band.discount_price as unknown) === ''
				? null
				: Number(band.discount_price),
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
			weight_increment_ladder: normalizeLadderForPayload(
				[{ from_step: 1, to_step: null, increment_cents: Number(extraRules.value.increment_cents || 0) }],
				Number(extraRules.value.increment_cents || 0),
			),
			volume_increment_ladder: normalizeLadderForPayload(
				[{ from_step: 1, to_step: null, increment_cents: Number(extraRules.value.increment_cents || 0) }],
				Number(extraRules.value.increment_cents || 0),
			),
			base_price_cents_mode: extraRules.value.base_price_cents_mode === 'manual' ? 'manual' : 'last_band_effective',
			base_price_cents_manual: extraRules.value.base_price_cents_mode === 'manual'
				? Number(extraRules.value.base_price_cents_manual || 0)
				: null,
			weight_resolution: Number(extraRules.value.weight_resolution || 1),
			volume_resolution: Number(extraRules.value.volume_resolution || 0.001),
		},
	})

	const buildEuropePayload = () => {
		const normalized = adminNormalizeEuropePricing(europePricing.value)
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
					price_cents: rate.quote_required || rate.price_cents === null || (rate.price_cents as unknown) === '' || rate.price_cents === undefined
						? null
						: Number(rate.price_cents || 0),
					quote_required: rate.quote_required === true,
				})),
			})),
		}
	}

	// ---------- API EXPOSED ----------
	return {
		// state
		weightBands,
		volumeBands,
		originalWeightBands,
		originalVolumeBands,
		bandsFromDb,
		extraRules,
		originalExtraRules,
		europePricing,
		originalEuropePricing,
		pricingVersion,
		editingCell,
		editValue,
		// ui state Europa
		compactEuropeView,
		europeSearch,
		europeStatusFilter,
		europeBandFilter,
		europeSort,
		// computed Europa + anteprima
		europeBandFilters,
		filteredEuropeBands,
		extraRuleExamples,
		pricingPreviewCases,
		// helpers puri (re-export per la pagina)
		centsToEuro: adminCentsToEuro,
		euroToCents: adminEuroToCents,
		effectivePrice,
		discountInfo,
		incrementCentsToEuro: adminIncrementCentsToEuro,
		// band actions
		addBand,
		removeBand,
		moveBand,
		toggleShowDiscount,
		startEdit,
		confirmEdit,
		cancelEdit,
		// ladder actions
		addLadderRow,
		removeLadderRow,
		ensureLadderContinuity,
		ladderRowsFor,
		updateLadderIncrementFromEuro,
		// europa actions
		updateEuropeRateAmountFromEuro,
		toggleEuropeRateQuote,
		// hydration & payload (per il wrapper composable)
		applyDefaults,
		hydrateFromApi,
		persistApiResponse,
		buildBandsPayload,
		buildEuropePayload,
		calcLocalPrice,
	}
})
