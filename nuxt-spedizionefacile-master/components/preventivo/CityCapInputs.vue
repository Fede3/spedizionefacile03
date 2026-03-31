<!--
  CityCapInputs.vue
  Input citta'/CAP con autocomplete per origine e destinazione.
  Gestisce internamente la ricerca, i suggerimenti e la selezione.
  Modifica direttamente shipmentDetails nello store (via v-model dal parent).
-->
<script setup>
const props = defineProps({
  originCity: { type: String, default: '' },
  originPostalCode: { type: String, default: '' },
  destinationCity: { type: String, default: '' },
  destinationPostalCode: { type: String, default: '' },
  messageError: { type: Object, default: null },
  sv: { type: Object, required: true },
})

const emit = defineEmits([
  'update:originCity',
  'update:originPostalCode',
  'update:destinationCity',
  'update:destinationPostalCode',
])

const sanctum = useSanctumClient()

// --- Costanti e helpers ---
const AUTOCOMPLETE_DEBOUNCE_MS = 180

const normalizeLocationText = (value = '') =>
  String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()

const getProvinceLabel = (loc) => {
  const value = loc?.province ?? loc?.province_name ?? ''
  return String(value).trim()
}

const locationKey = (loc) => `${loc?.postal_code || ''}-${loc?.place_name || ''}-${getProvinceLabel(loc)}`

const dedupeLocations = (list = []) => {
  const map = new Map()
  list.forEach((loc) => {
    if (!loc?.place_name || !loc?.postal_code) return
    const key = locationKey(loc)
    if (!map.has(key)) map.set(key, loc)
  })
  return Array.from(map.values())
}

const cityMatchesQuery = (cityValue, rawQuery) => {
  const city = normalizeLocationText(cityValue)
  const query = normalizeLocationText(rawQuery)
  if (!query) return true
  return city.startsWith(query)
}

const sortLocations = (a, b) => {
  const aName = normalizeLocationText(a?.place_name || '')
  const bName = normalizeLocationText(b?.place_name || '')
  if (aName !== bName) return aName.localeCompare(bName)
  return String(a?.postal_code || '').localeCompare(String(b?.postal_code || ''))
}

const cityRelevanceScore = (loc, rawQuery) => {
  const query = normalizeLocationText(rawQuery)
  const city = normalizeLocationText(loc?.place_name || '')
  if (!query) return 99
  if (city === query) return 0
  if (city.startsWith(`${query} `) || city.startsWith(`${query}'`) || city.startsWith(`${query}-`)) return 1
  if (city.startsWith(query)) return 2
  return 99
}

const sortCitySuggestionsByRelevance = (list, query) => {
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
const searchLocations = async (query, limit = 200) => {
  if (!query || query.length < 2) return []
  try {
    const q = encodeURIComponent(query.trim())
    const results = await sanctum(`/api/locations/search?q=${q}&limit=${limit}`)
    return dedupeLocations(results || [])
  } catch (e) { return [] }
}

const searchLocationsByCap = async (cap) => {
  if (!cap) return []
  try {
    const q = encodeURIComponent(String(cap).trim())
    const results = await sanctum(`/api/locations/by-cap?cap=${q}`)
    return dedupeLocations(results || [])
  } catch (e) { return [] }
}

const searchLocationsByCity = async (city) => {
  if (!city || city.length < 2) return []
  try {
    const q = encodeURIComponent(city.trim())
    const results = await sanctum(`/api/locations/by-city?city=${q}`)
    return dedupeLocations(results || [])
  } catch (e) { return [] }
}

const getCitySuggestions = async (query) => {
  if (!query || query.length < 2) return []
  let results = await searchLocationsByCity(query)
  if (!results.length) results = await searchLocations(query, 500)
  return sortCitySuggestionsByRelevance(
    dedupeLocations(results).filter((loc) => cityMatchesQuery(loc.place_name, query)).sort(sortLocations),
    query,
  )
}

const getCapSuggestions = async (capQuery, linkedCityQuery = '') => {
  if (!capQuery || capQuery.length < 3) return []
  let results = []
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

const getCapSuggestionsFromCity = async (cityQuery) => {
  if (!cityQuery || cityQuery.length < 2) return []
  const results = await getCitySuggestions(cityQuery)
  return dedupeLocations(results).sort(sortLocations)
}

// --- Stato suggerimenti ---
const originSuggestions = ref([])
const destSuggestions = ref([])
const showOriginSuggestions = ref(false)
const showDestSuggestions = ref(false)
let originHideTimeout = null
let destHideTimeout = null
let originSearchTimeout = null
let destSearchTimeout = null
let originSearchSeq = 0
let destSearchSeq = 0

// --- Origin handlers ---
const onOriginCityInput = (event) => {
  const val = event?.target?.value ?? props.originCity
  emit('update:originCity', val)
  clearTimeout(originSearchTimeout)
  clearTimeout(originHideTimeout)
  originSearchTimeout = setTimeout(async () => {
    const q = String(val || '').trim()
    const seq = ++originSearchSeq
    if (q && q.length >= 2) {
      const suggestions = await getCitySuggestions(q)
      if (seq !== originSearchSeq) return
      originSuggestions.value = suggestions
      showOriginSuggestions.value = originSuggestions.value.length > 0
    } else {
      originSuggestions.value = []
      showOriginSuggestions.value = false
    }
  }, AUTOCOMPLETE_DEBOUNCE_MS)
}

const onOriginCapInput = (event) => {
  let val = event?.target?.value ?? props.originPostalCode
  val = props.sv.filterCAP(val)
  emit('update:originPostalCode', val)
  clearTimeout(originSearchTimeout)
  clearTimeout(originHideTimeout)
  props.sv.isTouched('origin_cap') && props.sv.validateCAP('origin_cap', val)
  originSearchTimeout = setTimeout(async () => {
    const q = String(val || '').trim()
    const linkedCity = String(props.originCity || '').trim()
    const seq = ++originSearchSeq
    if (q && q.length >= 3) {
      const suggestions = await getCapSuggestions(q, linkedCity)
      if (seq !== originSearchSeq) return
      originSuggestions.value = suggestions
      showOriginSuggestions.value = originSuggestions.value.length > 0
    } else {
      originSuggestions.value = []
      showOriginSuggestions.value = false
    }
  }, AUTOCOMPLETE_DEBOUNCE_MS)
}

const selectOriginLocation = (loc) => {
  emit('update:originCity', loc.place_name)
  emit('update:originPostalCode', loc.postal_code)
  props.sv.isTouched('origin_cap') && props.sv.validateCAP('origin_cap', loc.postal_code)
  props.sv.clearError('origin_cap')
  clearTimeout(originHideTimeout)
  showOriginSuggestions.value = false
}

const onOriginCityFocus = async () => {
  clearTimeout(originHideTimeout)
  const cityQuery = String(props.originCity || '').trim()
  const capQuery = String(props.originPostalCode || '').trim()
  const seq = ++originSearchSeq
  if (cityQuery.length >= 2) {
    const suggestions = await getCitySuggestions(cityQuery)
    if (seq !== originSearchSeq) return
    originSuggestions.value = suggestions
    showOriginSuggestions.value = originSuggestions.value.length > 0
    return
  }
  if (capQuery.length >= 3) {
    const suggestions = await getCapSuggestions(capQuery)
    if (seq !== originSearchSeq) return
    originSuggestions.value = suggestions
    showOriginSuggestions.value = originSuggestions.value.length > 0
  }
}

const onOriginCapFocus = async () => {
  clearTimeout(originHideTimeout)
  const capQuery = String(props.originPostalCode || '').trim()
  const cityQuery = String(props.originCity || '').trim()
  const seq = ++originSearchSeq
  if (capQuery.length >= 3) {
    const suggestions = await getCapSuggestions(capQuery, cityQuery)
    if (seq !== originSearchSeq) return
    originSuggestions.value = suggestions
    showOriginSuggestions.value = originSuggestions.value.length > 0
    return
  }
  if (cityQuery.length >= 2) {
    const suggestions = await getCapSuggestionsFromCity(cityQuery)
    if (seq !== originSearchSeq) return
    originSuggestions.value = suggestions
    showOriginSuggestions.value = originSuggestions.value.length > 0
  }
}

const hideOriginSuggestions = () => {
  clearTimeout(originHideTimeout)
  originHideTimeout = setTimeout(() => { showOriginSuggestions.value = false; originHideTimeout = null }, 200)
}

// --- Destination handlers ---
const onDestCityInput = (event) => {
  const val = event?.target?.value ?? props.destinationCity
  emit('update:destinationCity', val)
  clearTimeout(destSearchTimeout)
  clearTimeout(destHideTimeout)
  destSearchTimeout = setTimeout(async () => {
    const q = String(val || '').trim()
    const seq = ++destSearchSeq
    if (q && q.length >= 2) {
      const suggestions = await getCitySuggestions(q)
      if (seq !== destSearchSeq) return
      destSuggestions.value = suggestions
      showDestSuggestions.value = destSuggestions.value.length > 0
    } else {
      destSuggestions.value = []
      showDestSuggestions.value = false
    }
  }, AUTOCOMPLETE_DEBOUNCE_MS)
}

const onDestCapInput = (event) => {
  let val = event?.target?.value ?? props.destinationPostalCode
  val = props.sv.filterCAP(val)
  emit('update:destinationPostalCode', val)
  clearTimeout(destSearchTimeout)
  clearTimeout(destHideTimeout)
  props.sv.isTouched('dest_cap') && props.sv.validateCAP('dest_cap', val)
  destSearchTimeout = setTimeout(async () => {
    const q = String(val || '').trim()
    const linkedCity = String(props.destinationCity || '').trim()
    const seq = ++destSearchSeq
    if (q && q.length >= 3) {
      const suggestions = await getCapSuggestions(q, linkedCity)
      if (seq !== destSearchSeq) return
      destSuggestions.value = suggestions
      showDestSuggestions.value = destSuggestions.value.length > 0
    } else {
      destSuggestions.value = []
      showDestSuggestions.value = false
    }
  }, AUTOCOMPLETE_DEBOUNCE_MS)
}

const selectDestLocation = (loc) => {
  emit('update:destinationCity', loc.place_name)
  emit('update:destinationPostalCode', loc.postal_code)
  props.sv.isTouched('dest_cap') && props.sv.validateCAP('dest_cap', loc.postal_code)
  props.sv.clearError('dest_cap')
  clearTimeout(destHideTimeout)
  showDestSuggestions.value = false
}

const onDestCityFocus = async () => {
  clearTimeout(destHideTimeout)
  const cityQuery = String(props.destinationCity || '').trim()
  const capQuery = String(props.destinationPostalCode || '').trim()
  const seq = ++destSearchSeq
  if (cityQuery.length >= 2) {
    const suggestions = await getCitySuggestions(cityQuery)
    if (seq !== destSearchSeq) return
    destSuggestions.value = suggestions
    showDestSuggestions.value = destSuggestions.value.length > 0
    return
  }
  if (capQuery.length >= 3) {
    const suggestions = await getCapSuggestions(capQuery)
    if (seq !== destSearchSeq) return
    destSuggestions.value = suggestions
    showDestSuggestions.value = destSuggestions.value.length > 0
  }
}

const onDestCapFocus = async () => {
  clearTimeout(destHideTimeout)
  const capQuery = String(props.destinationPostalCode || '').trim()
  const cityQuery = String(props.destinationCity || '').trim()
  const seq = ++destSearchSeq
  if (capQuery.length >= 3) {
    const suggestions = await getCapSuggestions(capQuery, cityQuery)
    if (seq !== destSearchSeq) return
    destSuggestions.value = suggestions
    showDestSuggestions.value = destSuggestions.value.length > 0
    return
  }
  if (cityQuery.length >= 2) {
    const suggestions = await getCapSuggestionsFromCity(cityQuery)
    if (seq !== destSearchSeq) return
    destSuggestions.value = suggestions
    showDestSuggestions.value = destSuggestions.value.length > 0
  }
}

const hideDestSuggestions = () => {
  clearTimeout(destHideTimeout)
  destHideTimeout = setTimeout(() => { showDestSuggestions.value = false; destHideTimeout = null }, 200)
}

// Cleanup
onBeforeUnmount(() => {
  clearTimeout(originSearchTimeout)
  clearTimeout(destSearchTimeout)
  clearTimeout(originHideTimeout)
  clearTimeout(destHideTimeout)
})
</script>

<template>
  <div class="flex items-start flex-wrap tablet:justify-center desktop-xl:justify-between tablet:gap-x-[20px] gap-y-[16px] tablet:gap-y-[20px] desktop:gap-y-[36px] desktop-xl:gap-y-0 border-[1px] border-[rgba(0,0,0,.2)] rounded-[16px] p-[12px] tablet:p-[15px] mt-[10px]">
    <!-- Citta' Ritiro -->
    <div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px] relative">
      <label for="origin_city" class="label-preventivo-rapido">Citta di Ritiro</label>
      <input type="text" :value="originCity" id="origin_city" placeholder="Citta" class="input-preventivo-rapido" required autocomplete="off" @focus="onOriginCityFocus" @input="onOriginCityInput($event)" @blur="hideOriginSuggestions" />
      <ul v-if="showOriginSuggestions && originSuggestions.length" role="listbox" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#D0D0D0] rounded-[8px] mt-[2px] max-h-[200px] overflow-y-auto shadow-lg">
        <li v-for="loc in originSuggestions" :key="locationKey(loc)" role="option" aria-selected="false" @mousedown.prevent="selectOriginLocation(loc)" class="px-[14px] py-[12px] tablet:py-[10px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42] border-b border-[#F0F0F0] last:border-0">
          <span class="font-semibold">{{ loc.place_name }}</span>
          <span class="text-[#737373]">
            <template v-if="getProvinceLabel(loc)">({{ getProvinceLabel(loc) }}) - </template>{{ loc.postal_code }}
          </span>
        </li>
      </ul>
      <p v-if="messageError?.['shipment_details.origin_city']" class="text-red-500 text-[1rem] mt-[10px]">
        {{ messageError['shipment_details.origin_city'][0] }}
      </p>
    </div>

    <!-- CAP Ritiro -->
    <div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px] relative">
      <label for="origin_postal_code" class="label-preventivo-rapido">CAP di Ritiro</label>
      <input type="text" :value="originPostalCode" id="origin_postal_code" placeholder="CAP" :class="sv.errorClass('origin_cap', 'input-preventivo-rapido')" required autocomplete="off" maxlength="5" inputmode="numeric" pattern="[0-9]{5}" @focus="onOriginCapFocus" @input="onOriginCapInput($event)" @blur="hideOriginSuggestions(); sv.onBlur('origin_cap', () => sv.validateCAP('origin_cap', originPostalCode))" />
      <ul v-if="showOriginSuggestions && originSuggestions.length" role="listbox" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#D0D0D0] rounded-[8px] mt-[2px] max-h-[200px] overflow-y-auto shadow-lg">
        <li v-for="loc in originSuggestions" :key="locationKey(loc)" role="option" aria-selected="false" @mousedown.prevent="selectOriginLocation(loc)" class="px-[14px] py-[12px] tablet:py-[10px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42] border-b border-[#F0F0F0] last:border-0">
          <span class="font-semibold">{{ loc.postal_code }}</span> - {{ loc.place_name }}
          <span v-if="getProvinceLabel(loc)" class="text-[#737373]"> ({{ getProvinceLabel(loc) }})</span>
        </li>
      </ul>
      <p v-if="sv.getError('origin_cap')" class="text-red-500 text-[0.8125rem] mt-[4px]">{{ sv.getError('origin_cap') }}</p>
      <p v-else-if="messageError?.['shipment_details.origin_postal_code']" class="text-red-500 text-[1rem] mt-[10px]">
        {{ messageError['shipment_details.origin_postal_code'][0] }}
      </p>
    </div>

    <!-- Citta' Consegna -->
    <div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px] relative">
      <label for="destination_city" class="label-preventivo-rapido">Citta Consegna</label>
      <input type="text" :value="destinationCity" id="destination_city" placeholder="Citta" class="input-preventivo-rapido" required autocomplete="off" @focus="onDestCityFocus" @input="onDestCityInput($event)" @blur="hideDestSuggestions" />
      <ul v-if="showDestSuggestions && destSuggestions.length" role="listbox" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#D0D0D0] rounded-[8px] mt-[2px] max-h-[200px] overflow-y-auto shadow-lg">
        <li v-for="loc in destSuggestions" :key="locationKey(loc)" role="option" aria-selected="false" @mousedown.prevent="selectDestLocation(loc)" class="px-[14px] py-[12px] tablet:py-[10px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42] border-b border-[#F0F0F0] last:border-0">
          <span class="font-semibold">{{ loc.place_name }}</span>
          <span class="text-[#737373]">
            <template v-if="getProvinceLabel(loc)">({{ getProvinceLabel(loc) }}) - </template>{{ loc.postal_code }}
          </span>
        </li>
      </ul>
      <p v-if="messageError?.['shipment_details.destination_city']" class="text-red-500 text-[1rem] mt-[10px]">
        {{ messageError['shipment_details.destination_city'][0] }}
      </p>
    </div>

    <!-- CAP Consegna -->
    <div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px] relative">
      <label for="destination_postal_code" class="label-preventivo-rapido">CAP Consegna</label>
      <input type="text" :value="destinationPostalCode" id="destination_postal_code" placeholder="CAP" :class="sv.errorClass('dest_cap', 'input-preventivo-rapido')" required autocomplete="off" maxlength="5" inputmode="numeric" pattern="[0-9]{5}" @focus="onDestCapFocus" @input="onDestCapInput($event)" @blur="hideDestSuggestions(); sv.onBlur('dest_cap', () => sv.validateCAP('dest_cap', destinationPostalCode))" />
      <ul v-if="showDestSuggestions && destSuggestions.length" role="listbox" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#D0D0D0] rounded-[8px] mt-[2px] max-h-[200px] overflow-y-auto shadow-lg">
        <li v-for="loc in destSuggestions" :key="locationKey(loc)" role="option" aria-selected="false" @mousedown.prevent="selectDestLocation(loc)" class="px-[14px] py-[12px] tablet:py-[10px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42] border-b border-[#F0F0F0] last:border-0">
          <span class="font-semibold">{{ loc.postal_code }}</span> - {{ loc.place_name }}
          <span v-if="getProvinceLabel(loc)" class="text-[#737373]"> ({{ getProvinceLabel(loc) }})</span>
        </li>
      </ul>
      <p v-if="sv.getError('dest_cap')" class="text-red-500 text-[0.8125rem] mt-[4px]">{{ sv.getError('dest_cap') }}</p>
      <p v-else-if="messageError?.['shipment_details.destination_postal_code']" class="text-red-500 text-[1rem] mt-[10px]">
        {{ messageError['shipment_details.destination_postal_code'][0] }}
      </p>
    </div>
  </div>
</template>
