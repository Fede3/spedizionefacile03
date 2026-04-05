/**
 * useCityCapAutocomplete
 * Logica di ricerca, suggerimenti e selezione per input citta/CAP con autocomplete.
 * Estratto da CityCapInputs.vue per ridurre la dimensione del componente.
 */

interface LocationResult {
  postal_code: string
  place_name: string
  province?: string
  province_name?: string
}

export function useCityCapAutocomplete() {
  const sanctum = useSanctumClient()

  // --- Costanti e helpers ---
  const AUTOCOMPLETE_DEBOUNCE_MS = 180

  const normalizeLocationText = (value = '') =>
    String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()

  const getProvinceLabel = (loc: LocationResult) => {
    const value = loc?.province ?? loc?.province_name ?? ''
    return String(value).trim()
  }

  const locationKey = (loc: LocationResult) => `${loc?.postal_code || ''}-${loc?.place_name || ''}-${getProvinceLabel(loc)}`

  const dedupeLocations = (list: LocationResult[] = []) => {
    const map = new Map()
    list.forEach((loc) => {
      if (!loc?.place_name || !loc?.postal_code) return
      const key = locationKey(loc)
      if (!map.has(key)) map.set(key, loc)
    })
    return Array.from(map.values())
  }

  const cityMatchesQuery = (cityValue: string, rawQuery: string) => {
    const city = normalizeLocationText(cityValue)
    const query = normalizeLocationText(rawQuery)
    if (!query) return true
    return city.startsWith(query)
  }

  const sortLocations = (a: any, b: any) => {
    const aName = normalizeLocationText(a?.place_name || '')
    const bName = normalizeLocationText(b?.place_name || '')
    if (aName !== bName) return aName.localeCompare(bName)
    return String(a?.postal_code || '').localeCompare(String(b?.postal_code || ''))
  }

  const cityRelevanceScore = (loc: any, rawQuery: string) => {
    const query = normalizeLocationText(rawQuery)
    const city = normalizeLocationText(loc?.place_name || '')
    if (!query) return 99
    if (city === query) return 0
    if (city.startsWith(`${query} `) || city.startsWith(`${query}'`) || city.startsWith(`${query}-`)) return 1
    if (city.startsWith(query)) return 2
    return 99
  }

  const sortCitySuggestionsByRelevance = (list: any[], query: string) => {
    return [...list].sort((a, b) => {
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

  // --- Funzioni di ricerca API ---
  const searchLocations = async (query: string, limit = 200) => {
    if (!query || query.length < 2) return []
    try {
      const q = encodeURIComponent(query.trim())
      const results = await sanctum(`/api/locations/search?q=${q}&limit=${limit}`) as LocationResult[]
      return dedupeLocations(results || [])
    } catch { return [] }
  }

  const searchLocationsByCap = async (cap: string) => {
    if (!cap) return []
    try {
      const q = encodeURIComponent(String(cap).trim())
      const results = await sanctum(`/api/locations/by-cap?cap=${q}`) as LocationResult[]
      return dedupeLocations(results || [])
    } catch { return [] }
  }

  const searchLocationsByCity = async (city: string) => {
    if (!city || city.length < 2) return []
    try {
      const q = encodeURIComponent(city.trim())
      const results = await sanctum(`/api/locations/by-city?city=${q}`) as LocationResult[]
      return dedupeLocations(results || [])
    } catch { return [] }
  }

  const getCitySuggestions = async (query: string) => {
    if (!query || query.length < 2) return []
    let results = await searchLocationsByCity(query)
    if (!results.length) results = await searchLocations(query, 500)
    return sortCitySuggestionsByRelevance(
      dedupeLocations(results).filter((loc) => cityMatchesQuery(loc.place_name, query)).sort(sortLocations),
      query,
    )
  }

  const getCapSuggestions = async (capQuery: string, linkedCityQuery = '') => {
    if (!capQuery || capQuery.length < 3) return []
    let results: any[] = []
    if (capQuery.length === 5) {
      results = await searchLocationsByCap(capQuery)
    } else {
      results = await searchLocations(capQuery, 500)
    }
    return dedupeLocations(results)
      .filter((loc) => String(loc.postal_code || '').startsWith(capQuery))
      .filter((loc) => !linkedCityQuery || cityMatchesQuery(loc.place_name, linkedCityQuery))
      .sort(sortLocations)
  }

  const getCapSuggestionsFromCity = async (cityQuery: string) => {
    if (!cityQuery || cityQuery.length < 2) return []
    const results = await getCitySuggestions(cityQuery)
    return dedupeLocations(results).sort(sortLocations)
  }

  /**
   * Crea handlers per una direzione (origin o dest).
   * Riduce la duplicazione nel componente CityCapInputs.
   */
  function createDirectionHandlers(opts: {
    getCity: () => string
    getCap: () => string
    emitCity: (v: string) => void
    emitCap: (v: string) => void
    sv: any
    capKey: string
    filterCAP: (v: string) => string
  }) {
    const suggestions = ref<any[]>([])
    const showSuggestions = ref(false)
    let hideTimeout: any = null
    let searchTimeout: any = null
    let searchSeq = 0

    const onCityInput = (event: any) => {
      const val = event?.target?.value ?? opts.getCity()
      opts.emitCity(val)
      clearTimeout(searchTimeout)
      clearTimeout(hideTimeout)
      searchTimeout = setTimeout(async () => {
        const q = String(val || '').trim()
        const seq = ++searchSeq
        if (q && q.length >= 2) {
          const res = await getCitySuggestions(q)
          if (seq !== searchSeq) return
          suggestions.value = res
          showSuggestions.value = res.length > 0
        } else {
          suggestions.value = []
          showSuggestions.value = false
        }
      }, AUTOCOMPLETE_DEBOUNCE_MS)
    }

    const onCapInput = (event: any) => {
      let val = event?.target?.value ?? opts.getCap()
      val = opts.filterCAP(val)
      opts.emitCap(val)
      clearTimeout(searchTimeout)
      clearTimeout(hideTimeout)
      opts.sv.isTouched(opts.capKey) && opts.sv.validateCAP(opts.capKey, val)
      searchTimeout = setTimeout(async () => {
        const q = String(val || '').trim()
        const linkedCity = String(opts.getCity() || '').trim()
        const seq = ++searchSeq
        if (q && q.length >= 3) {
          const res = await getCapSuggestions(q, linkedCity)
          if (seq !== searchSeq) return
          suggestions.value = res
          showSuggestions.value = res.length > 0
        } else {
          suggestions.value = []
          showSuggestions.value = false
        }
      }, AUTOCOMPLETE_DEBOUNCE_MS)
    }

    const selectLocation = (loc: any) => {
      opts.emitCity(loc.place_name)
      opts.emitCap(loc.postal_code)
      opts.sv.isTouched(opts.capKey) && opts.sv.validateCAP(opts.capKey, loc.postal_code)
      opts.sv.clearError(opts.capKey)
      clearTimeout(hideTimeout)
      showSuggestions.value = false
    }

    const onCityFocus = async () => {
      clearTimeout(hideTimeout)
      const cityQuery = String(opts.getCity() || '').trim()
      const capQuery = String(opts.getCap() || '').trim()
      const seq = ++searchSeq
      if (cityQuery.length >= 2) {
        const res = await getCitySuggestions(cityQuery)
        if (seq !== searchSeq) return
        suggestions.value = res
        showSuggestions.value = res.length > 0
        return
      }
      if (capQuery.length >= 3) {
        const res = await getCapSuggestions(capQuery)
        if (seq !== searchSeq) return
        suggestions.value = res
        showSuggestions.value = res.length > 0
      }
    }

    const onCapFocus = async () => {
      clearTimeout(hideTimeout)
      const capQuery = String(opts.getCap() || '').trim()
      const cityQuery = String(opts.getCity() || '').trim()
      const seq = ++searchSeq
      if (capQuery.length >= 3) {
        const res = await getCapSuggestions(capQuery, cityQuery)
        if (seq !== searchSeq) return
        suggestions.value = res
        showSuggestions.value = res.length > 0
        return
      }
      if (cityQuery.length >= 2) {
        const res = await getCapSuggestionsFromCity(cityQuery)
        if (seq !== searchSeq) return
        suggestions.value = res
        showSuggestions.value = res.length > 0
      }
    }

    const hideSuggestions = () => {
      clearTimeout(hideTimeout)
      hideTimeout = setTimeout(() => { showSuggestions.value = false; hideTimeout = null }, 200)
    }

    const cleanup = () => {
      clearTimeout(searchTimeout)
      clearTimeout(hideTimeout)
    }

    return { suggestions, showSuggestions, onCityInput, onCapInput, selectLocation, onCityFocus, onCapFocus, hideSuggestions, cleanup }
  }

  return {
    AUTOCOMPLETE_DEBOUNCE_MS,
    getProvinceLabel,
    locationKey,
    getCitySuggestions,
    getCapSuggestions,
    getCapSuggestionsFromCity,
    createDirectionHandlers,
  }
}
