/**
 * Wrapper API client per autocomplete/lookup localita' Italia + UE.
 * Espone i metodi richiesti dai composable consumer (useQuote,
 * useShipmentLocationAutocomplete, useQuickQuoteLocations) usando
 * gli endpoint `/api/locations/search`, `/locations/by-cap`, `/locations/by-city`.
 */

import { dedupeLocations, getProvinceLabel, locationKey, normalizeLocationText, type LocationRecord } from '~/utils/location'

type FetchLike = (url: string, opts?: { query?: Record<string, unknown> }) => Promise<unknown>

function asArray(value: unknown): LocationRecord[] {
	if (!Array.isArray(value)) return []
	return value.filter((entry) => entry && typeof entry === 'object') as LocationRecord[]
}

function citySortValue(location: LocationRecord, query: string): number {
	const name = normalizeLocationText(location.place_name)
	const q = normalizeLocationText(query)
	if (!q) return 3
	if (name === q) return 0
	if (name.startsWith(q + ' ')) return 1
	if (name.startsWith(q)) return 2
	return 3
}

export function useLocationSearch(client?: FetchLike) {
	const fetcher: FetchLike = client ?? ((url, opts) => ($fetch as unknown as FetchLike)(url, opts))
	const locationSearchError = ref('')

	const callApi = async (path: string, query: Record<string, unknown>) => {
		try {
			const result = await fetcher(path, { query })
			locationSearchError.value = ''
			return asArray(result)
		} catch (e) {
			locationSearchError.value = (e as { message?: string })?.message || 'errore_ricerca_localita'
			return []
		}
	}

	const searchLocations = (query: unknown, limit = 120, countryCode?: string) => {
		const q = String(query ?? '').trim()
		if (q.length < 2) return Promise.resolve<LocationRecord[]>([])
		const params: Record<string, unknown> = { q, limit }
		if (countryCode) params.country = countryCode
		return callApi('/api/locations/search', params)
	}

	const searchLocationsByCap = (cap: unknown, countryCode?: string) => {
		const value = String(cap ?? '').trim()
		if (!value) return Promise.resolve<LocationRecord[]>([])
		const params: Record<string, unknown> = { cap: value }
		if (countryCode) params.country = countryCode
		return callApi('/api/locations/by-cap', params)
	}

	const searchLocationsByCity = (city: unknown, limit = 500, countryCode?: string) => {
		const value = String(city ?? '').trim()
		if (value.length < 2) return Promise.resolve<LocationRecord[]>([])
		const params: Record<string, unknown> = { city: value, limit }
		if (countryCode) params.country = countryCode
		return callApi('/api/locations/by-city', params)
	}

	const sortLocations = (a: LocationRecord, b: LocationRecord) => {
		const an = normalizeLocationText(a.place_name)
		const bn = normalizeLocationText(b.place_name)
		if (an === bn) return String(a.postal_code || '').localeCompare(String(b.postal_code || ''))
		return an.localeCompare(bn)
	}

	const sortCitySuggestionsByRelevance = <T extends LocationRecord>(locations: T[], query: unknown): T[] => {
		const q = String(query ?? '')
		return [...locations].sort((a, b) => citySortValue(a, q) - citySortValue(b, q))
	}

	const cityMatchesQuery = (cityName: unknown, query: unknown) => {
		const a = normalizeLocationText(cityName)
		const b = normalizeLocationText(query)
		if (!b) return true
		return a === b || a.startsWith(b + ' ') || a.startsWith(b) || a.includes(' ' + b)
	}

	const clearLocationSearchError = () => {
		locationSearchError.value = ''
	}

	return {
		dedupeLocations,
		getProvinceLabel,
		locationKey,
		normalizeLocationText,
		searchLocations,
		searchLocationsByCap,
		searchLocationsByCity,
		sortLocations,
		sortCitySuggestionsByRelevance,
		cityMatchesQuery,
		locationSearchError,
		clearLocationSearchError,
	}
}
