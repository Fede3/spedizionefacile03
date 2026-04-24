import type { Ref } from 'vue'
import type { LocationSearchResult, ShipmentDetails } from '~/types'
import { formatResolvedLocation } from './usePreventivoQuoteSnapshot'

type CountryCode = string

interface QuickQuoteSmartValidation {
	filterCAP: (value: string, options?: { countryCode?: string }) => string
	clearError: (key: string) => void
}

/**
 * Firma compatibile con l'oggetto restituito da `useLocationSearch` (sia .js legacy che .ts).
 * Manteniamo i parametri "larghi" (`any`/`object`) per evitare breaking changes ai consumer.
 */
type LocationSearchHelpers = {
	cityMatchesQuery: (place: unknown, query: unknown) => boolean
	clearLocationSearchError?: () => void
	dedupeLocations?: (locations?: LocationSearchResult[]) => LocationSearchResult[]
	getProvinceLabel: (location: object) => string
	locationKey: (location: LocationSearchResult) => string
	locationSearchError?: { value: string }
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	normalizeLocationText: (value?: any) => string
	searchLocations: (query: unknown, limit?: number, countryCode?: CountryCode) => Promise<LocationSearchResult[]>
	searchLocationsByCap: (cap: unknown, countryCode?: CountryCode) => Promise<LocationSearchResult[]>
	searchLocationsByCity: (city: unknown, limit?: number, countryCode?: CountryCode) => Promise<LocationSearchResult[]>
	sortCitySuggestionsByRelevance: (locations: LocationSearchResult[], query: unknown) => LocationSearchResult[]
	sortLocations: (a: LocationSearchResult, b: LocationSearchResult) => number
}

interface QuickQuoteArgs {
	shipmentDetails: ShipmentDetails
	search: LocationSearchHelpers
	smartValidation: QuickQuoteSmartValidation
	onCapInputSmart: (fieldKey: string, value: string, countryCode: CountryCode) => void
	debounceMs?: number
}

export const useQuickQuoteLocations = ({
	shipmentDetails,
	search,
	smartValidation,
	onCapInputSmart,
	debounceMs = 180,
}: QuickQuoteArgs) => {
	const {
		cityMatchesQuery,
		clearLocationSearchError,
		getProvinceLabel,
		locationKey,
		normalizeLocationText,
		searchLocations,
		searchLocationsByCap,
		searchLocationsByCity,
		sortCitySuggestionsByRelevance,
		sortLocations,
	} = search

	const originSuggestions = ref<LocationSearchResult[]>([])
	const destSuggestions = ref<LocationSearchResult[]>([])
	const showOriginSuggestions = ref<boolean>(false)
	const showDestSuggestions = ref<boolean>(false)
	const originQuery = ref<string>('')
	const destQuery = ref<string>('')

	let originHideTimeout: ReturnType<typeof setTimeout> | null = null
	let destHideTimeout: ReturnType<typeof setTimeout> | null = null
	let originSearchTimeout: ReturnType<typeof setTimeout> | null = null
	let destSearchTimeout: ReturnType<typeof setTimeout> | null = null
	let originSearchSeq = 0
	let destSearchSeq = 0

	const isCapQuery = (value: string = ''): boolean => /^\d+$/.test(String(value).trim())
	const normalizeCap = (value: string = '', countryCode: CountryCode = 'IT'): string =>
		smartValidation.filterCAP(String(value).trim(), { countryCode })
	const resolveCountryCode = (location: { country_code?: string }): string =>
		String(location?.country_code || 'IT').trim().toUpperCase() || 'IT'
	const resolveCountryName = (location: { country_name?: string; country_code?: string }): string =>
		String(location?.country_name || (resolveCountryCode(location) === 'IT' ? 'Italia' : resolveCountryCode(location))).trim()

	const formatLocationDisplay = formatResolvedLocation

	const applyQueryDraftToShipment = (
		queryRef: Ref<string>,
		cityKey: keyof ShipmentDetails,
		capKey: keyof ShipmentDetails,
		fieldKey: string,
		countryCodeKey: keyof ShipmentDetails,
		countryNameKey: keyof ShipmentDetails,
	): string => {
		const rawQuery = String(queryRef.value || '').trim()
		const currentCountryCode = String(shipmentDetails[countryCodeKey] || 'IT').trim().toUpperCase() || 'IT'
		const currentCountryName = String(
			shipmentDetails[countryNameKey]
			|| (currentCountryCode === 'IT' ? 'Italia' : currentCountryCode),
		).trim()

		if (!rawQuery) {
			clearLocationSearchError?.()
			;(shipmentDetails as unknown as Record<string, string>)[cityKey as string] = ''
			;(shipmentDetails as unknown as Record<string, string>)[capKey as string] = ''
			;(shipmentDetails as unknown as Record<string, string>)[countryCodeKey as string] = currentCountryCode
			;(shipmentDetails as unknown as Record<string, string>)[countryNameKey as string] = currentCountryName
			smartValidation.clearError(fieldKey)
			return ''
		}

		const separatorMatch = rawQuery.match(/^(.+?)\s*[·•]\s*(.*)$/)
		if (separatorMatch) {
			const cityPart = (separatorMatch[1] ?? '').trim()
			const capPart = (separatorMatch[2] ?? '').trim()
			clearLocationSearchError?.()
			;(shipmentDetails as unknown as Record<string, string>)[cityKey as string] = cityPart
			;(shipmentDetails as unknown as Record<string, string>)[capKey as string] = capPart
			;(shipmentDetails as unknown as Record<string, string>)[countryCodeKey as string] = currentCountryCode
			;(shipmentDetails as unknown as Record<string, string>)[countryNameKey as string] = currentCountryName
			smartValidation.clearError(fieldKey)
			return cityPart
		}

		if (isCapQuery(rawQuery)) {
			clearLocationSearchError?.()
			const filteredCap = normalizeCap(rawQuery, currentCountryCode)
			queryRef.value = filteredCap
			;(shipmentDetails as unknown as Record<string, string>)[capKey as string] = filteredCap
			;(shipmentDetails as unknown as Record<string, string>)[cityKey as string] = ''
			;(shipmentDetails as unknown as Record<string, string>)[countryCodeKey as string] = currentCountryCode
			;(shipmentDetails as unknown as Record<string, string>)[countryNameKey as string] = currentCountryName
			onCapInputSmart(fieldKey, filteredCap, currentCountryCode)
			return filteredCap
		}

		clearLocationSearchError?.()
		;(shipmentDetails as unknown as Record<string, string>)[cityKey as string] = rawQuery
		;(shipmentDetails as unknown as Record<string, string>)[capKey as string] = ''
		;(shipmentDetails as unknown as Record<string, string>)[countryCodeKey as string] = currentCountryCode
		;(shipmentDetails as unknown as Record<string, string>)[countryNameKey as string] = currentCountryName
		smartValidation.clearError(fieldKey)
		return rawQuery
	}

	const getCitySuggestions = async (query: string, countryCode: CountryCode = 'IT'): Promise<LocationSearchResult[]> => {
		if (!query || query.length < 2) return []

		let results = await searchLocationsByCity(query, 200, countryCode)
		if (!results.length) {
			results = await searchLocations(query, 500, countryCode)
		}

		return sortCitySuggestionsByRelevance(
			results
				.filter((location) => cityMatchesQuery(location.place_name, query))
				.sort(sortLocations),
			query,
		)
	}

	const getCapSuggestions = async (
		capQuery: string,
		linkedCityQuery: string = '',
		countryCode: CountryCode = 'IT',
	): Promise<LocationSearchResult[]> => {
		if (!capQuery || capQuery.length < 3) return []

		let results: LocationSearchResult[] = []
		if (capQuery.length === 5) {
			results = await searchLocationsByCap(capQuery, countryCode)
		} else {
			results = await searchLocations(capQuery, 500, countryCode)
		}

		return results
			.filter((location) => String(location.postal_code || '').startsWith(capQuery))
			.filter((location) => !linkedCityQuery || cityMatchesQuery(location.place_name, linkedCityQuery))
			.sort(sortLocations)
	}

	const getSuggestionsForQuery = async (
		queryValue: string,
		linkedCity: string = '',
		countryCode: CountryCode = 'IT',
	): Promise<LocationSearchResult[]> => {
		const query = String(queryValue || '').trim()
		if (!query) return []

		if (isCapQuery(query)) {
			return getCapSuggestions(normalizeCap(query, countryCode), linkedCity, countryCode)
		}

		return getCitySuggestions(query, countryCode)
	}

	const findAutoResolvedLocation = (
		queryValue: string,
		suggestions: LocationSearchResult[] = [],
		countryCode: CountryCode = 'IT',
	): LocationSearchResult | null => {
		const query = String(queryValue || '').trim()
		if (!query || !suggestions.length) return null

		if (isCapQuery(query)) {
			const filteredCap = normalizeCap(query, countryCode)
			return suggestions.find((location) => String(location.postal_code || '') === filteredCap) || null
		}

		const normalizedQuery = normalizeLocationText(query)
		const exactMatches = suggestions.filter(
			(location) => normalizeLocationText(location.place_name) === normalizedQuery,
		)

		return exactMatches.length === 1 ? (exactMatches[0] ?? null) : null
	}

	const hideOriginSuggestions = (): void => {
		if (originHideTimeout) clearTimeout(originHideTimeout)
		originHideTimeout = setTimeout(() => {
			showOriginSuggestions.value = false
			originHideTimeout = null
		}, 200)
	}

	const hideDestSuggestions = (): void => {
		if (destHideTimeout) clearTimeout(destHideTimeout)
		destHideTimeout = setTimeout(() => {
			showDestSuggestions.value = false
			destHideTimeout = null
		}, 200)
	}

	const selectOriginLocation = (location: LocationSearchResult): void => {
		clearLocationSearchError?.()
		shipmentDetails.origin_city = location.place_name
		shipmentDetails.origin_postal_code = location.postal_code
		shipmentDetails.origin_country_code = resolveCountryCode(location)
		shipmentDetails.origin_country = resolveCountryName(location)
		originQuery.value = formatLocationDisplay(location.place_name, location.postal_code)
		onCapInputSmart('origin_cap', shipmentDetails.origin_postal_code, shipmentDetails.origin_country_code)
		smartValidation.clearError('origin_cap')
		if (originHideTimeout) clearTimeout(originHideTimeout)
		showOriginSuggestions.value = false
	}

	const selectDestLocation = (location: LocationSearchResult): void => {
		clearLocationSearchError?.()
		shipmentDetails.destination_city = location.place_name
		shipmentDetails.destination_postal_code = location.postal_code
		shipmentDetails.destination_country_code = resolveCountryCode(location)
		shipmentDetails.destination_country = resolveCountryName(location)
		destQuery.value = formatLocationDisplay(location.place_name, location.postal_code)
		onCapInputSmart('dest_cap', shipmentDetails.destination_postal_code, shipmentDetails.destination_country_code)
		smartValidation.clearError('dest_cap')
		if (destHideTimeout) clearTimeout(destHideTimeout)
		showDestSuggestions.value = false
	}

	const updateOriginSuggestions = async (): Promise<void> => {
		const query = applyQueryDraftToShipment(
			originQuery,
			'origin_city',
			'origin_postal_code',
			'origin_cap',
			'origin_country_code',
			'origin_country',
		)
		const seq = ++originSearchSeq

		if ((isCapQuery(query) && query.length < 3) || (!isCapQuery(query) && query.length < 2)) {
			originSuggestions.value = []
			showOriginSuggestions.value = false
			return
		}

		const suggestions = await getSuggestionsForQuery(
			query,
			shipmentDetails.origin_city,
			shipmentDetails.origin_country_code,
		)
		if (seq !== originSearchSeq) return
		originSuggestions.value = suggestions
		showOriginSuggestions.value = suggestions.length > 0
	}

	const updateDestSuggestions = async (): Promise<void> => {
		const query = applyQueryDraftToShipment(
			destQuery,
			'destination_city',
			'destination_postal_code',
			'dest_cap',
			'destination_country_code',
			'destination_country',
		)
		const seq = ++destSearchSeq

		if ((isCapQuery(query) && query.length < 3) || (!isCapQuery(query) && query.length < 2)) {
			destSuggestions.value = []
			showDestSuggestions.value = false
			return
		}

		const suggestions = await getSuggestionsForQuery(
			query,
			shipmentDetails.destination_city,
			shipmentDetails.destination_country_code,
		)
		if (seq !== destSearchSeq) return
		destSuggestions.value = suggestions
		showDestSuggestions.value = suggestions.length > 0
	}

	const onOriginQueryInput = (): void => {
		clearLocationSearchError?.()
		if (originSearchTimeout) clearTimeout(originSearchTimeout)
		if (originHideTimeout) clearTimeout(originHideTimeout)
		originSearchTimeout = setTimeout(updateOriginSuggestions, debounceMs)
	}

	const onDestQueryInput = (): void => {
		clearLocationSearchError?.()
		if (destSearchTimeout) clearTimeout(destSearchTimeout)
		if (destHideTimeout) clearTimeout(destHideTimeout)
		destSearchTimeout = setTimeout(updateDestSuggestions, debounceMs)
	}

	const onOriginQueryFocus = async (): Promise<void> => {
		clearLocationSearchError?.()
		if (originHideTimeout) clearTimeout(originHideTimeout)
		const seq = ++originSearchSeq
		const query = String(originQuery.value || '').trim()
			|| formatLocationDisplay(shipmentDetails.origin_city, shipmentDetails.origin_postal_code)

		if ((isCapQuery(query) && query.length < 3) || (!isCapQuery(query) && query.length < 2)) {
			return
		}

		const suggestions = await getSuggestionsForQuery(
			query,
			shipmentDetails.origin_city,
			shipmentDetails.origin_country_code,
		)
		if (seq !== originSearchSeq) return
		originSuggestions.value = suggestions
		showOriginSuggestions.value = suggestions.length > 0
	}

	const onDestQueryFocus = async (): Promise<void> => {
		clearLocationSearchError?.()
		if (destHideTimeout) clearTimeout(destHideTimeout)
		const seq = ++destSearchSeq
		const query = String(destQuery.value || '').trim()
			|| formatLocationDisplay(shipmentDetails.destination_city, shipmentDetails.destination_postal_code)

		if ((isCapQuery(query) && query.length < 3) || (!isCapQuery(query) && query.length < 2)) {
			return
		}

		const suggestions = await getSuggestionsForQuery(
			query,
			shipmentDetails.destination_city,
			shipmentDetails.destination_country_code,
		)
		if (seq !== destSearchSeq) return
		destSuggestions.value = suggestions
		showDestSuggestions.value = suggestions.length > 0
	}

	const settleOriginQuery = async (): Promise<void> => {
		const query = String(originQuery.value || '').trim()
		if (!query) {
			hideOriginSuggestions()
			return
		}

		const suggestions = await getSuggestionsForQuery(
			query,
			shipmentDetails.origin_city,
			shipmentDetails.origin_country_code,
		)
		const autoResolvedLocation = findAutoResolvedLocation(
			query,
			suggestions,
			shipmentDetails.origin_country_code,
		)
		if (autoResolvedLocation) {
			selectOriginLocation(autoResolvedLocation)
			return
		}

		hideOriginSuggestions()
	}

	const settleDestQuery = async (): Promise<void> => {
		const query = String(destQuery.value || '').trim()
		if (!query) {
			hideDestSuggestions()
			return
		}

		const suggestions = await getSuggestionsForQuery(
			query,
			shipmentDetails.destination_city,
			shipmentDetails.destination_country_code,
		)
		const autoResolvedLocation = findAutoResolvedLocation(
			query,
			suggestions,
			shipmentDetails.destination_country_code,
		)
		if (autoResolvedLocation) {
			selectDestLocation(autoResolvedLocation)
			return
		}

		hideDestSuggestions()
	}

	watch(
		() => [shipmentDetails.origin_city, shipmentDetails.origin_postal_code],
		([city, cap]) => {
			const formattedValue = formatLocationDisplay(city, cap)
			if (formattedValue !== originQuery.value) {
				originQuery.value = formattedValue
			}
		},
		{ immediate: true },
	)

	watch(
		() => [shipmentDetails.destination_city, shipmentDetails.destination_postal_code],
		([city, cap]) => {
			const formattedValue = formatLocationDisplay(city, cap)
			if (formattedValue !== destQuery.value) {
				destQuery.value = formattedValue
			}
		},
		{ immediate: true },
	)

	onBeforeUnmount(() => {
		if (originSearchTimeout) clearTimeout(originSearchTimeout)
		if (destSearchTimeout) clearTimeout(destSearchTimeout)
		if (originHideTimeout) clearTimeout(originHideTimeout)
		if (destHideTimeout) clearTimeout(destHideTimeout)
	})

	return {
		destQuery,
		destSuggestions,
		getProvinceLabel,
		hideDestSuggestions,
		hideOriginSuggestions,
		locationKey,
		onDestQueryFocus,
		onDestQueryInput,
		onOriginQueryFocus,
		onOriginQueryInput,
		originQuery,
		originSuggestions,
		selectDestLocation,
		selectOriginLocation,
		settleDestQuery,
		settleOriginQuery,
		showDestSuggestions,
		showOriginSuggestions,
	}
}
