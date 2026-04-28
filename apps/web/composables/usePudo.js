/**
 * usePudo.js — thin wrapper retro-compat sul pudoStore (Pinia).
 *
 * Quattro entry point:
 *   - usePudoSearchApi(props, emit) → bridge reattivo allo store con emit('deselect')
 *   - usePudoMap(deps, emit)        → helper mappa (selezione, dettagli, orari, stato)
 *   - usePudoSearch(props, emit)    → funnel <PudoSelector /> (legacy API combinata)
 *   - usePudoSearch()               → pagina /pudo (API filtri + query + debounce)
 *
 * Lo stato canonico vive in `stores/pudoStore.ts`. I helper puri in `utils/pudoHelpers.ts`.
 */
import { storeToRefs } from 'pinia'
import { usePudoStore } from '~/stores/pudoStore'
import {
	extractTodayHoursAt, formatOpeningHoursText, formatPudoDistance, isPudoCurrentlyOpenAt,
} from '~/utils/pudoHelpers'

// ---------------------------------------------------------------------------
// SEZIONE 1 — API service: bridge props/emit allo store Pinia
// ---------------------------------------------------------------------------

export function usePudoSearchApi(props, emit) {
	const store = usePudoStore()
	const refs = storeToRefs(store)

	if (props?.initialCity && !store.searchCity) store.searchCity = props.initialCity
	if (props?.initialZip && !store.searchZip) store.searchZip = props.initialZip
	watch(() => props?.initialCity, (v) => { if (v && !store.searchCity) store.searchCity = v })
	watch(() => props?.initialZip, (v) => { if (v && !store.searchZip) store.searchZip = v })

	// Wrap actions: lo store ritorna `true` se la selezione corrente e' stata invalidata.
	const searchPudo = async () => { if (await store.searchPudo()) emit('deselect') }
	const useCurrentLocation = async () => { if (await store.useCurrentLocation()) emit('deselect') }
	const onMapReferenceClick = async (payload) => { if (await store.onMapReferenceClick(payload)) emit('deselect') }
	const fetchPudoDetails = (pudo, key) => store.fetchPudoDetails(pudo, key)

	return {
		searchAddress: refs.searchAddress, searchCity: refs.searchCity, searchZip: refs.searchZip,
		loading: refs.loading, geolocating: refs.geolocating, searched: refs.searched,
		searchError: refs.searchError, searchMeta: refs.searchMeta, referenceUpdateMessage: refs.referenceUpdateMessage,
		pudoResults: refs.pudoResults, selectedPudoKey: refs.selectedPudoKey, expandedPudoKey: refs.expandedPudoKey,
		loadingDetailsKey: refs.loadingDetailsKey, pudoDetails: refs.pudoDetails, detailsErrors: refs.detailsErrors,
		mapClickLoading: refs.mapClickLoading,
		hasSearchInput: refs.hasSearchInput, mapPoints: refs.mapPoints, mapReferencePoint: refs.mapReferencePoint,
		strategyListLabel: refs.strategyListLabel,
		searchPudo, useCurrentLocation, onMapReferenceClick, fetchPudoDetails,
	}
}

// ---------------------------------------------------------------------------
// SEZIONE 2 — Helper mappa (selezione + dettagli + orari + stato)
// ---------------------------------------------------------------------------

export function usePudoMap(deps, emit) {
	const { selectedPudoKey, expandedPudoKey, pudoDetails, fetchPudoDetails } = deps

	const nowTick = ref(Date.now())
	let nowTimer = null
	const startNowTimer = () => { nowTimer = window.setInterval(() => { nowTick.value = Date.now() }, 60000) }
	const stopNowTimer = () => { if (nowTimer) { window.clearInterval(nowTimer); nowTimer = null } }
	onScopeDispose(stopNowTimer)

	const selectPudo = (pudo) => {
		if (selectedPudoKey.value === pudo.ui_key) { selectedPudoKey.value = null; emit('deselect'); return }
		selectedPudoKey.value = pudo.ui_key || null
		emit('select', pudo)
	}
	const toggleDetails = async (pudo) => {
		const detailKey = String(pudo.pudo_id || pudo.ui_key)
		if (expandedPudoKey.value === detailKey) { expandedPudoKey.value = null; return }
		expandedPudoKey.value = detailKey
		if (pudoDetails.value[detailKey]) return
		await fetchPudoDetails(pudo, detailKey)
	}

	const distanceLabel = (pudo) => Number.isFinite(Number(pudo?.distance_meters)) ? formatPudoDistance(pudo.distance_meters) : 'n/d'
	const getRawOpeningHours = (pudo) => (pudoDetails.value[String(pudo.pudo_id || pudo.ui_key)] || {}).opening_hours ?? pudo.opening_hours
	const getTodayHoursText = (pudo) => extractTodayHoursAt(getRawOpeningHours(pudo), nowTick.value) || 'Orari di oggi non disponibili'
	const getPudoStatus = (pudo) => {
		const details = pudoDetails.value[String(pudo.pudo_id || pudo.ui_key)] || {}
		const enabled = typeof details.enabled === 'boolean' ? details.enabled : pudo.enabled
		const open = isPudoCurrentlyOpenAt(getTodayHoursText(pudo), nowTick.value)
		if (enabled === false) return { label: 'Chiuso', className: 'text-rose-700 bg-rose-50 border-rose-200' }
		if (open === true) return { label: 'Aperto ora', className: 'text-[#0a8a7a] bg-[#f0fdf4] border-[#d1fae5]' }
		if (open === false) return { label: 'Chiuso ora', className: 'text-rose-700 bg-rose-50 border-rose-200' }
		return { label: 'Da verificare', className: 'text-gray-700 bg-gray-100 border-gray-200' }
	}

	return {
		selectPudo, toggleDetails,
		distanceLabel, getTodayHoursText, getPudoStatus, formatOpeningHours: formatOpeningHoursText,
		startNowTimer, stopNowTimer,
	}
}

// ---------------------------------------------------------------------------
// SEZIONE 3 — Dispatcher pubblico (legacy selector vs pagina /pudo)
// ---------------------------------------------------------------------------

export function usePudoSearch(props, emit) {
	if (props && emit) return buildLegacyApi(props, emit)
	return buildPageApi()
}

function buildMap(api, emit) {
	return usePudoMap({
		selectedPudoKey: api.selectedPudoKey, expandedPudoKey: api.expandedPudoKey,
		pudoDetails: api.pudoDetails, detailsErrors: api.detailsErrors,
		loadingDetailsKey: api.loadingDetailsKey, fetchPudoDetails: api.fetchPudoDetails,
	}, emit)
}

function buildLegacyApi(props, emit) {
	const api = usePudoSearchApi(props, emit)
	return { ...api, ...buildMap(api, emit) }
}

// Routing query → campi store (CAP / indirizzo / citta).
function applyQueryToFields(api, raw) {
	const q = String(raw || '').trim()
	api.searchAddress.value = ''
	api.searchCity.value = ''
	api.searchZip.value = ''
	if (!q) return false
	const onlyDigits = q.replace(/\D/g, '')
	if (/^\d{5}$/.test(q)) { api.searchZip.value = q; return true }
	if (/\d/.test(q) || /^(?:via|viale|corso|piazza|piazzale|largo|vicolo|strada)\b/i.test(q)) {
		api.searchAddress.value = q
		if (onlyDigits.length >= 5) api.searchZip.value = onlyDigits.slice(0, 5)
		const cityGuess = q.replace(/\d+/g, '').trim().split(/\s+/).pop() || ''
		if (cityGuess && cityGuess.length > 2) api.searchCity.value = cityGuess
		return true
	}
	api.searchCity.value = q
	return true
}

function buildPageApi() {
	const noopEmit = () => {}
	const api = usePudoSearchApi({ initialCity: '', initialZip: '' }, noopEmit)
	const map = buildMap(api, noopEmit)

	const query = ref('')
	const filters = ref({ openNow: false, ritiro: false, consegna: false, sabato: false })

	let debounceTimer = null
	const search = (q) => {
		if (typeof q === 'string') query.value = q
		if (debounceTimer) clearTimeout(debounceTimer)
		debounceTimer = setTimeout(() => { searchImmediate() }, 300)
	}
	const searchImmediate = async () => {
		const ok = applyQueryToFields(api, query.value)
		if (!ok) {
			api.pudoResults.value = []
			api.searched.value = false
			api.searchError.value = null
			return
		}
		await api.searchPudo()
	}

	const referencePoint = computed(() => {
		const r = api.mapReferencePoint.value
		if (!r) return null
		return { latitude: r.latitude, longitude: r.longitude, label: r.label || r.city || r.zip_code || '' }
	})

	// Filtri locali. ritiro/consegna pass-through (BRT supporta entrambi nei PUDO).
	const matchesFilters = (p) => {
		if (filters.value.openNow && map.getPudoStatus(p).label !== 'Aperto ora') return false
		if (filters.value.sabato && !/sab|sat/.test(String(p.opening_hours || '').toLowerCase())) return false
		return true
	}

	const rawResults = computed(() => api.pudoResults.value)
	const results = computed(() => rawResults.value.filter(matchesFilters))
	const selected = computed(() => {
		const key = api.selectedPudoKey.value
		if (!key) return null
		return rawResults.value.find((p) => String(p.ui_key) === String(key)) || null
	})

	const selectPudo = (p) => { api.selectedPudoKey.value = p ? String(p.ui_key) : null }
	const clearSelection = () => { api.selectedPudoKey.value = null }
	const resetFilters = () => { filters.value = { openNow: false, ritiro: false, consegna: false, sabato: false } }

	watch(query, (v) => {
		if (!String(v || '').trim()) {
			api.searched.value = false
			api.pudoResults.value = []
			api.searchError.value = null
		}
	})

	return {
		query, filters,
		loading: api.loading, geolocating: api.geolocating, searched: api.searched,
		searchError: api.searchError, searchMeta: api.searchMeta,
		rawResults, results, selectedKey: api.selectedPudoKey, selected,
		mapPoints: api.mapPoints, referencePoint,
		search, searchImmediate, useCurrentLocation: api.useCurrentLocation,
		selectPudo, clearSelection, resetFilters,
		distanceLabel: map.distanceLabel, getTodayHoursText: map.getTodayHoursText,
		getPudoStatus: map.getPudoStatus, formatOpeningHours: map.formatOpeningHours,
		startNowTimer: map.startNowTimer, stopNowTimer: map.stopNowTimer,
	}
}
