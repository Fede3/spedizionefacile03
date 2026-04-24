/**
 * usePudoSearch.ts
 *
 * Composable PUDO con DOPPIA INTERFACCIA retrocompatibile.
 *
 * 1) `usePudoSearch(props, emit)` — orchestrator legacy per `<PudoSelector />`
 *    nel funnel `/la-tua-spedizione`. Mantiene l'esatta API esistente
 *    (composizione di `usePudoSearchApi` + `usePudoMap`).
 *
 * 2) `usePudoSearch()` — API pubblica per la pagina `/pudo`:
 *      - `query` (ref<string>): CAP o citta o indirizzo libero
 *      - `filters` (ref<PudoFilters>): { openNow, ritiro, consegna, sabato }
 *      - `results` (computed<BrtPudoNormalized[]>): risultati FILTRATI
 *      - `rawResults` (computed): risultati grezzi prima dei filtri locali
 *      - `loading`, `geolocating`, `searched`, `searchError`
 *      - `selectedKey`, `selected` (computed)
 *      - `mapPoints`, `referencePoint`
 *      - `search(q?)` con debounce 300ms
 *      - `useCurrentLocation()`, `selectPudo()`, `clearSelection()`
 *      - `distanceLabel()`, `getTodayHoursText()`, `getPudoStatus()`
 */
import { computed, ref, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { BrtPudoNormalized, BrtPudoMeta } from '~/types'
import { usePudoSearchApi } from './usePudoSearchApi'
import { usePudoMap } from './usePudoMap'

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface PudoFilters {
	openNow: boolean
	ritiro: boolean
	consegna: boolean
	sabato: boolean
}

type LegacyEmit = (event: string, ...args: unknown[]) => void

export interface PudoSearchPageApi {
	// Stato input
	query: Ref<string>
	filters: Ref<PudoFilters>
	// Stato richiesta
	loading: Ref<boolean>
	geolocating: Ref<boolean>
	searched: Ref<boolean>
	searchError: Ref<string | null>
	searchMeta: Ref<BrtPudoMeta | null>
	// Risultati
	rawResults: ComputedRef<BrtPudoNormalized[]>
	results: ComputedRef<BrtPudoNormalized[]>
	// Selezione
	selectedKey: Ref<string | null>
	selected: ComputedRef<BrtPudoNormalized | null>
	// Mappa
	mapPoints: ComputedRef<BrtPudoNormalized[]>
	referencePoint: ComputedRef<{ latitude: number; longitude: number; label: string } | null>
	// Azioni
	search: (q?: string) => void
	searchImmediate: () => Promise<void>
	useCurrentLocation: () => Promise<void>
	selectPudo: (p: BrtPudoNormalized | null) => void
	clearSelection: () => void
	resetFilters: () => void
	// Helpers UI
	distanceLabel: (p: BrtPudoNormalized) => string
	getTodayHoursText: (p: BrtPudoNormalized) => string
	getPudoStatus: (p: BrtPudoNormalized) => { label: string; className: string }
	formatOpeningHours: (h: unknown) => string
	startNowTimer: () => void
	stopNowTimer: () => void
}

// ---------------------------------------------------------------------------
// Overload signatures
// ---------------------------------------------------------------------------

export function usePudoSearch(): PudoSearchPageApi
export function usePudoSearch(
	props: Record<string, unknown>,
	emit: LegacyEmit,
): ReturnType<typeof buildLegacyApi>
export function usePudoSearch(
	props?: Record<string, unknown>,
	emit?: LegacyEmit,
): PudoSearchPageApi | ReturnType<typeof buildLegacyApi> {
	if (props && emit) return buildLegacyApi(props, emit)
	return buildPageApi()
}

// ---------------------------------------------------------------------------
// Implementazione legacy (PudoSelector funnel) — invariata
// ---------------------------------------------------------------------------

function buildLegacyApi(props: Record<string, unknown>, emit: LegacyEmit) {
	const api = usePudoSearchApi(props as { initialCity?: string; initialZip?: string }, emit)
	const map = usePudoMap(
		{
			selectedPudoKey: api.selectedPudoKey as never,
			expandedPudoKey: api.expandedPudoKey as never,
			pudoDetails: api.pudoDetails as never,
			detailsErrors: api.detailsErrors as never,
			loadingDetailsKey: api.loadingDetailsKey as never,
			fetchPudoDetails: api.fetchPudoDetails as never,
		},
		emit,
	)

	return {
		searchAddress: api.searchAddress,
		searchCity: api.searchCity,
		searchZip: api.searchZip,
		loading: api.loading,
		geolocating: api.geolocating,
		searched: api.searched,
		searchError: api.searchError,
		searchMeta: api.searchMeta,
		referenceUpdateMessage: api.referenceUpdateMessage,
		pudoResults: api.pudoResults,
		selectedPudoKey: api.selectedPudoKey,
		expandedPudoKey: api.expandedPudoKey,
		loadingDetailsKey: api.loadingDetailsKey,
		pudoDetails: api.pudoDetails,
		detailsErrors: api.detailsErrors,
		mapClickLoading: api.mapClickLoading,
		hasSearchInput: api.hasSearchInput,
		mapPoints: api.mapPoints,
		mapReferencePoint: api.mapReferencePoint,
		strategyListLabel: api.strategyListLabel,
		searchPudo: api.searchPudo,
		useCurrentLocation: api.useCurrentLocation,
		onMapReferenceClick: api.onMapReferenceClick,
		selectPudo: map.selectPudo,
		toggleDetails: map.toggleDetails,
		distanceLabel: map.distanceLabel,
		getTodayHoursText: map.getTodayHoursText,
		getPudoStatus: map.getPudoStatus,
		formatOpeningHours: map.formatOpeningHours,
		startNowTimer: map.startNowTimer,
		stopNowTimer: map.stopNowTimer,
	}
}

// ---------------------------------------------------------------------------
// Implementazione pagina pubblica /pudo
// ---------------------------------------------------------------------------

function buildPageApi(): PudoSearchPageApi {
	// Underlying API service (single shared instance per call site).
	const props = { initialCity: '', initialZip: '' }
	const noopEmit: LegacyEmit = () => {}
	const api = usePudoSearchApi(props, noopEmit)
	const map = usePudoMap(
		{
			selectedPudoKey: api.selectedPudoKey as never,
			expandedPudoKey: api.expandedPudoKey as never,
			pudoDetails: api.pudoDetails as never,
			detailsErrors: api.detailsErrors as never,
			loadingDetailsKey: api.loadingDetailsKey as never,
			fetchPudoDetails: api.fetchPudoDetails as never,
		},
		noopEmit,
	)

	const query = ref<string>('')
	const filters = ref<PudoFilters>({
		openNow: false,
		ritiro: false,
		consegna: false,
		sabato: false,
	})

	// Routing della query: numeri solo => CAP; "via", "corso" o presenza spazi => indirizzo;
	// stringa singola alfabetica => citta. Strategia tollerante: si imposta SEMPRE city
	// e zip in base al pattern; il backend richiede city OR zip_code.
	const applyQueryToFields = (raw: string): boolean => {
		const q = String(raw || '').trim()
		api.searchAddress.value = ''
		api.searchCity.value = ''
		api.searchZip.value = ''
		if (!q) return false

		const onlyDigits = q.replace(/\D/g, '')
		if (/^\d{5}$/.test(q)) {
			api.searchZip.value = q
			return true
		}
		// Indirizzo con civico o parola chiave via/viale/corso/piazza
		if (/\d/.test(q) || /^(via|viale|corso|piazza|piazzale|largo|vicolo|strada)\b/i.test(q)) {
			api.searchAddress.value = q
			// Estrai eventuale CAP a 5 cifre embedded
			if (onlyDigits.length >= 5) api.searchZip.value = onlyDigits.slice(0, 5)
			// Resto come citta best-effort (ultima parola alfabetica)
			const cityGuess = q.replace(/\d+/g, '').trim().split(/\s+/).pop() || ''
			if (cityGuess && cityGuess.length > 2) api.searchCity.value = cityGuess
			return true
		}
		// Default: trattalo come citta
		api.searchCity.value = q
		return true
	}

	let debounceTimer: ReturnType<typeof setTimeout> | null = null
	const search = (q?: string): void => {
		if (typeof q === 'string') query.value = q
		if (debounceTimer) clearTimeout(debounceTimer)
		debounceTimer = setTimeout(() => {
			searchImmediate()
		}, 300)
	}

	const searchImmediate = async (): Promise<void> => {
		const ok = applyQueryToFields(query.value)
		if (!ok) {
			api.pudoResults.value = []
			api.searched.value = false
			api.searchError.value = null
			return
		}
		await api.searchPudo()
	}

	const referencePoint = computed(() => {
		const ref = api.mapReferencePoint.value
		if (!ref) return null
		return {
			latitude: ref.latitude,
			longitude: ref.longitude,
			label: ref.label || ref.city || ref.zip_code || '',
		}
	})

	// Filtri locali sui risultati (orari oggi / sabato / etichette servizi).
	// Nota: backend BRT non sempre espone le capabilities ritiro/consegna sui PUDO
	// (la maggior parte permette entrambi). I filtri ritiro/consegna sono pass-through
	// se i metadata mancano. Vengono comunque mostrati per consistenza UX.
	const matchesFilters = (p: BrtPudoNormalized): boolean => {
		if (filters.value.openNow) {
			const status = map.getPudoStatus(p)
			if (status.label !== 'Aperto ora') return false
		}
		if (filters.value.sabato) {
			const hours = String(p.opening_hours || '').toLowerCase()
			if (!/(sab|sabato|sat)/.test(hours)) return false
		}
		// ritiro/consegna: pass-through (la BRT li supporta in genere entrambi)
		return true
	}

	const rawResults = computed<BrtPudoNormalized[]>(() => api.pudoResults.value)
	const results = computed<BrtPudoNormalized[]>(() => rawResults.value.filter(matchesFilters))

	const selected = computed<BrtPudoNormalized | null>(() => {
		const key = api.selectedPudoKey.value
		if (!key) return null
		return rawResults.value.find((p) => String(p.ui_key) === String(key)) || null
	})

	const selectPudo = (p: BrtPudoNormalized | null): void => {
		if (!p) {
			api.selectedPudoKey.value = null
			return
		}
		api.selectedPudoKey.value = String(p.ui_key)
	}

	const clearSelection = (): void => {
		api.selectedPudoKey.value = null
	}

	const resetFilters = (): void => {
		filters.value = { openNow: false, ritiro: false, consegna: false, sabato: false }
	}

	// Reset auto su query vuota
	watch(query, (v) => {
		if (!String(v || '').trim()) {
			api.searched.value = false
			api.pudoResults.value = []
			api.searchError.value = null
		}
	})

	return {
		query,
		filters,
		loading: api.loading,
		geolocating: api.geolocating,
		searched: api.searched,
		searchError: api.searchError,
		searchMeta: api.searchMeta,
		rawResults,
		results,
		selectedKey: api.selectedPudoKey,
		selected,
		mapPoints: api.mapPoints,
		referencePoint,
		search,
		searchImmediate,
		useCurrentLocation: api.useCurrentLocation,
		selectPudo,
		clearSelection,
		resetFilters,
		distanceLabel: map.distanceLabel as unknown as (p: BrtPudoNormalized) => string,
		getTodayHoursText: map.getTodayHoursText as unknown as (p: BrtPudoNormalized) => string,
		getPudoStatus: map.getPudoStatus as unknown as (p: BrtPudoNormalized) => { label: string; className: string },
		formatOpeningHours: map.formatOpeningHours,
		startNowTimer: map.startNowTimer,
		stopNowTimer: map.stopNowTimer,
	}
}
