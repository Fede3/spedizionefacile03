import type { Ref } from 'vue'

interface Location {
	place_name?: string
	postal_code?: string
	[key: string]: unknown
}

type SanctumClient = <T = unknown>(url: string, opts?: Record<string, unknown>) => Promise<T>

interface UseLocationSearchReturn {
	cityMatchesQuery: (cityValue: string, rawQuery: string) => boolean
	clearLocationSearchError: () => void
	dedupeLocations: (locations: Location[]) => Location[]
	getProvinceLabel: (location: Location) => string
	locationKey: (location: Location) => string
	locationSearchError: Ref<string>
	normalizeLocationText: (value: string) => string
	searchLocations: (query: string, limit?: number, countryCode?: string) => Promise<Location[]>
	searchLocationsByCap: (cap: string, countryCode?: string) => Promise<Location[]>
	searchLocationsByCity: (city: string, limit?: number, countryCode?: string) => Promise<Location[]>
	sortCitySuggestionsByRelevance: (locations: Location[], query: string) => Location[]
	sortLocations: (a: Location, b: Location) => number
}

export const useLocationSearch = (client?: SanctumClient): UseLocationSearchReturn => {
	const locationSearchError = ref('')

	const setLocationSearchError = (): void => {
		locationSearchError.value = 'Ricerca località temporaneamente non disponibile. Riprova tra pochi secondi.'
	}

	const clearLocationSearchError = (): void => {
		locationSearchError.value = ''
	}

	const normalizeCountryCode = (value: string = ''): string => {
		const normalized = String(value || '').trim().toUpperCase()
		return normalized.length === 2 ? normalized : ''
	}

	const buildCountryQuery = (countryCode: string): string => {
		const normalized = normalizeCountryCode(countryCode)
		return normalized ? `&country=${encodeURIComponent(normalized)}` : ''
	}

	const cityMatchesQuery = (cityValue: string, rawQuery: string): boolean => {
		const city = normalizeLocationText(cityValue)
		const query = normalizeLocationText(rawQuery)
		if (!query) return true
		return city.startsWith(query)
	}

	const sortLocations = (a: Location, b: Location): number => {
		const aName = normalizeLocationText(a?.place_name || '')
		const bName = normalizeLocationText(b?.place_name || '')
		if (aName !== bName) return aName.localeCompare(bName)
		return String(a?.postal_code || '').localeCompare(String(b?.postal_code || ''))
	}

	const cityRelevanceScore = (location: Location, rawQuery: string): number => {
		const query = normalizeLocationText(rawQuery)
		const city = normalizeLocationText(location?.place_name || '')
		if (!query) return 99

		if (city === query) return 0
		if (city.startsWith(`${query} `) || city.startsWith(`${query}'`) || city.startsWith(`${query}-`)) return 1
		if (city.startsWith(query)) return 2
		return 99
	}

	const sortCitySuggestionsByRelevance = (locations: Location[], query: string): Location[] => {
		return [...locations].sort((a, b) => {
			const scoreA = cityRelevanceScore(a, query)
			const scoreB = cityRelevanceScore(b, query)
			if (scoreA !== scoreB) return scoreA - scoreB

			const nameA = normalizeLocationText(a?.place_name || '')
			const nameB = normalizeLocationText(b?.place_name || '')
			if (nameA.length !== nameB.length) return nameA.length - nameB.length
			if (nameA !== nameB) return nameA.localeCompare(nameB)

			return String(a?.postal_code || '').localeCompare(String(b?.postal_code || ''))
		})
	}

	const requestLocations = async (url: string): Promise<Location[]> => {
		let primaryError: unknown = null

		if (typeof client === 'function') {
			try {
				return await client<Location[]>(url)
			} catch (error) {
				primaryError = error
			}
		}

		try {
			return await $fetch<Location[]>(url, { credentials: 'include' })
		} catch (fallbackError) {
			throw primaryError || fallbackError
		}
	}

	const searchLocations = async (query: string, limit: number = 200, countryCode: string = ''): Promise<Location[]> => {
		if (!query || String(query).trim().length < 2) return []
		try {
			const q = encodeURIComponent(String(query).trim())
			const results = await requestLocations(`/api/locations/search?q=${q}&limit=${limit}${buildCountryQuery(countryCode)}`)
			clearLocationSearchError()
			return dedupeLocations(results || [])
		} catch {
			setLocationSearchError()
			return []
		}
	}

	const searchLocationsByCap = async (cap: string, countryCode: string = ''): Promise<Location[]> => {
		if (!cap) return []
		try {
			const q = encodeURIComponent(String(cap).trim())
			const results = await requestLocations(`/api/locations/by-cap?cap=${q}${buildCountryQuery(countryCode)}`)
			clearLocationSearchError()
			return dedupeLocations(results || [])
		} catch {
			setLocationSearchError()
			return []
		}
	}

	const searchLocationsByCity = async (city: string, limit: number = 200, countryCode: string = ''): Promise<Location[]> => {
		if (!city || String(city).trim().length < 2) return []
		try {
			const q = encodeURIComponent(String(city).trim())
			const results = await requestLocations(`/api/locations/by-city?city=${q}&limit=${limit}${buildCountryQuery(countryCode)}`)
			clearLocationSearchError()
			return dedupeLocations(results || [])
		} catch {
			setLocationSearchError()
			return []
		}
	}

	return {
		cityMatchesQuery,
		clearLocationSearchError,
		dedupeLocations,
		getProvinceLabel,
		locationKey,
		locationSearchError,
		normalizeLocationText,
		searchLocations,
		searchLocationsByCap,
		searchLocationsByCity,
		sortCitySuggestionsByRelevance,
		sortLocations,
	}
}
