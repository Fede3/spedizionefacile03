/**
 * useShipmentLocationAutocomplete
 *
 * Gestisce l'autocomplete per citta, CAP e provincia nelle sezioni
 * di indirizzo (origin/dest) del form spedizione, oltre a input handlers
 * per nome, telefono e smart blur per ogni campo.
 *
 * Usato da: useShipmentStepValidation (facade)
 */
import type { Ref } from 'vue'
import type { LocationSearchResult, ShipmentDetails } from '~/types'

type Section = 'origin' | 'dest'
type Field = 'full_name' | 'city' | 'postal_code' | 'telephone_number' | 'email' | 'province' | string

interface AddressForm {
	full_name?: string
	city?: string
	postal_code?: string
	province?: string
	telephone_number?: string
	email?: string
	address?: string
	address_number?: string
	country?: string
	country_code?: string
	country_name?: string
	[key: string]: unknown
}

interface SmartValidation {
	setError: (key: string, message: string) => void
	clearError: (key: string) => void
	validateProvincia: (key: string, value: string) => boolean
	filterProvincia: (value: string | undefined | null) => string
	filterCAP: (value: string | undefined | null, options?: { countryCode?: string }) => string
	formatTelefono: (value: string) => string
	validateNomeCognome: (key: string, value: string) => boolean
	validateCAP: (key: string, value: string, options?: { countryCode?: string }) => boolean
	validateTelefono: (key: string, value: string) => boolean
	validateEmail: (key: string, value: string) => boolean
	onInput: (key: string, validator: () => void) => void
	onBlur: (key: string, validator: () => void) => void
	autoCapitalize: (value: string) => string
	getProvinceSuggestions: (prefix: string) => string[]
}

interface AutocompleteArgs {
	deliveryMode: Ref<string>
	destinationAddress: Ref<AddressForm>
	originAddress: Ref<AddressForm>
	sanctumClient: (url: string, options?: Record<string, unknown>) => Promise<unknown>
	sv: SmartValidation
	shipmentFlowStore: { shipmentDetails: ShipmentDetails }
}

interface InputOptions {
	immediate?: boolean
}

export const useShipmentLocationAutocomplete = ({
	deliveryMode,
	destinationAddress,
	originAddress,
	sanctumClient,
	sv,
	shipmentFlowStore,
}: AutocompleteArgs) => {
	const {
		dedupeLocations,
		getProvinceLabel,
		normalizeLocationText,
		searchLocations,
		searchLocationsByCap,
		searchLocationsByCity,
	} = useLocationSearch(sanctumClient)

	// Province autocomplete
	const originProvinceSuggestions = ref<string[]>([])
	const destProvinceSuggestions = ref<string[]>([])

	// City/CAP autocomplete
	const originCitySuggestions = ref<LocationSearchResult[]>([])
	const destCitySuggestions = ref<LocationSearchResult[]>([])
	const originCapSuggestions = ref<LocationSearchResult[]>([])
	const destCapSuggestions = ref<LocationSearchResult[]>([])
	const citySearchTimeout: Record<Section, ReturnType<typeof setTimeout> | null> = { origin: null, dest: null }
	const capSearchTimeout: Record<Section, ReturnType<typeof setTimeout> | null> = { origin: null, dest: null }
	const citySearchSeq = reactive({ origin: 0, dest: 0 })
	const capSearchSeq = reactive({ origin: 0, dest: 0 })
	const locationLinkHints = reactive<{ origin: LocationSearchResult[]; dest: LocationSearchResult[] }>({ origin: [], dest: [] })
	const sanitizeFullNameValue = (value: unknown): string => (
		sv.autoCapitalize(
			String(value || '')
				.replace(/[0-9]/g, '')
				.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'’`.\-\s]/g, ' ')
				.replace(/\s+/g, ' ')
				.trim(),
		)
	)

	const getSectionAddress = (section: Section): AddressForm => (section === 'origin' ? originAddress.value : destinationAddress.value)
	const getSectionCountryCode = (section: Section): string => (
		section === 'origin'
			? String(shipmentFlowStore.shipmentDetails.origin_country_code || 'IT').trim().toUpperCase()
			: String(shipmentFlowStore.shipmentDetails.destination_country_code || 'IT').trim().toUpperCase()
	)
	const isItalianSection = (section: Section): boolean => getSectionCountryCode(section) === 'IT'

	const setSectionCitySuggestions = (section: Section, suggestions: LocationSearchResult[]): void => {
		if (section === 'origin') originCitySuggestions.value = suggestions
		else destCitySuggestions.value = suggestions
	}

	const setSectionCapSuggestions = (section: Section, suggestions: LocationSearchResult[]): void => {
		if (section === 'origin') originCapSuggestions.value = suggestions
		else destCapSuggestions.value = suggestions
	}

	const setSectionProvinceSuggestions = (section: Section, suggestions: string[]): void => {
		if (section === 'origin') originProvinceSuggestions.value = suggestions
		else destProvinceSuggestions.value = suggestions
	}

	const formatCitySuggestionLabel = (location: LocationSearchResult): string => {
		const province = getProvinceLabel(location)
		if (province) return `${location.place_name} (${province}) - ${location.postal_code}`
		return `${location.place_name} - ${location.postal_code}`
	}

	const formatCapSuggestionLabel = (location: LocationSearchResult): string => {
		const province = getProvinceLabel(location)
		if (province) return `${location.postal_code} - ${location.place_name} (${province})`
		return `${location.postal_code} - ${location.place_name}`
	}

	const setProvinceSuggestionsFromLocations = (section: Section, locations: LocationSearchResult[]): void => {
		const provinces = [...new Set(
			dedupeLocations(locations)
				.map((loc: LocationSearchResult) => getProvinceLabel(loc))
				.filter(Boolean),
		)].sort() as string[]
		setSectionProvinceSuggestions(section, provinces.slice(0, 20))
	}

	const isLocationCoherent = (location: LocationSearchResult, city: string | undefined, province: string | undefined): boolean => {
		const cityNorm = normalizeLocationText(city || '')
		const provinceNorm = normalizeLocationText(province || '')
		const locCityNorm = normalizeLocationText(location?.place_name || '')
		const locProvinceNorm = normalizeLocationText(getProvinceLabel(location) || '')

		if (cityNorm && locCityNorm !== cityNorm) return false
		if (provinceNorm && locProvinceNorm !== provinceNorm) return false
		return true
	}

	const validateProvinceField = (section: Section, value: string | undefined): boolean => {
		if (!isItalianSection(section)) {
			if (!value || !String(value).trim()) {
				sv.setError(`${section}_province`, 'Provincia/Stato è obbligatorio')
				return false
			}
			sv.clearError(`${section}_province`)
			return true
		}

		return sv.validateProvincia(`${section}_province`, value || '')
	}

	const applyLocationToSection = (section: Section, location: LocationSearchResult): void => {
		const address = getSectionAddress(section)
		address.city = location.place_name || address.city
		address.postal_code = String(location.postal_code || address.postal_code || '')
		address.country = location.country_name || address.country || 'Italia'
		const province = getProvinceLabel(location)
		if (province) address.province = province
		setSectionCitySuggestions(section, [])
		setSectionCapSuggestions(section, [])
		setSectionProvinceSuggestions(section, [])
		sv.clearError(`${section}_city`)
		sv.clearError(`${section}_postal_code`)
		sv.clearError(`${section}_province`)
	}

	// --- Validazione coerenza indirizzo-location ---
	const validateAddressLocationLink = async (section: Section): Promise<boolean> => {
		if (section === 'dest' && deliveryMode.value === 'pudo') return true
		if (!isItalianSection(section)) return true

		const address = getSectionAddress(section)
		const city = String(address.city || '').trim()
		const province = sv.filterProvincia(address.province || '')
		const cap = sv.filterCAP(address.postal_code || '')
		if (!city || !province || cap.length !== 5) return true

		try {
			const results = await searchLocationsByCap(cap, getSectionCountryCode(section)) as LocationSearchResult[]
			locationLinkHints[section] = results
			if (!results.length) {
				sv.setError(`${section}_postal_code`, `CAP ${cap} non trovato.`)
				return false
			}

			const cityNorm = normalizeLocationText(city)
			const provinceNorm = normalizeLocationText(province)
			const exact = results.find((loc) =>
				normalizeLocationText(loc.place_name) === cityNorm &&
				normalizeLocationText(getProvinceLabel(loc) || '') === provinceNorm,
			)

			if (!exact) {
				const cityMatch = results.find((loc) => normalizeLocationText(loc.place_name) === cityNorm)
				const provinceMatch = results.find((loc) => normalizeLocationText(getProvinceLabel(loc) || '') === provinceNorm)
				const hint = results[0]
				if (!hint) {
					return false
				}
				const hintProvince = getProvinceLabel(hint)
				const hintText = hintProvince ? `${hint.place_name} (${hintProvince})` : hint.place_name

				sv.setError(`${section}_postal_code`, `CAP ${cap} non coerente con città/provincia.`)
				if (!cityMatch) sv.setError(`${section}_city`, `Per CAP ${cap} la città corretta è ${hintText}.`)
				if (!provinceMatch) sv.setError(`${section}_province`, `Provincia non coerente con CAP ${cap}.`)
				return false
			}

			address.city = exact.place_name || address.city
			address.province = getProvinceLabel(exact) || address.province
			sv.clearError(`${section}_city`)
			sv.clearError(`${section}_province`)
			sv.clearError(`${section}_postal_code`)
			locationLinkHints[section] = []
			return true
		} catch {
			locationLinkHints[section] = []
			return true
		}
	}

	// --- Provincia handlers ---
	const onProvinciaInput = (section: Section, value: string): void => {
		if (!isItalianSection(section)) {
			const cleaned = String(value || '').trimStart()
			if (section === 'origin') {
				originAddress.value.province = cleaned
				originProvinceSuggestions.value = []
			} else {
				destinationAddress.value.province = cleaned
				destProvinceSuggestions.value = []
			}
			sv.onInput(`${section}_province`, () => validateProvinceField(section, cleaned))
			return
		}

		const filtered = sv.filterProvincia(value)
		const contextualLocations = dedupeLocations([
			...(section === 'origin' ? originCitySuggestions.value : destCitySuggestions.value),
			...(section === 'origin' ? originCapSuggestions.value : destCapSuggestions.value),
		]) as LocationSearchResult[]
		const contextualProvinces = [...new Set(
			contextualLocations
				.map((loc) => getProvinceLabel(loc))
				.filter(Boolean),
		)].filter((prov) => (prov as string).startsWith(filtered)) as string[]
		const provinceSuggestions = contextualProvinces.length > 0
			? contextualProvinces.slice(0, 20)
			: sv.getProvinceSuggestions(filtered)

		if (section === 'origin') {
			originAddress.value.province = filtered
			originProvinceSuggestions.value = provinceSuggestions
		} else {
			destinationAddress.value.province = filtered
			destProvinceSuggestions.value = provinceSuggestions
		}
		sv.onInput(`${section}_province`, () => validateProvinceField(section, filtered))
	}

	const selectProvincia = (section: Section, prov: string): void => {
		if (section === 'origin') {
			originAddress.value.province = prov
			originProvinceSuggestions.value = []
		} else {
			destinationAddress.value.province = prov
			destProvinceSuggestions.value = []
		}
		sv.clearError(`${section}_province`)
		void validateAddressLocationLink(section)
	}

	// --- CAP helpers ---
	const loadCapSuggestionsFromCity = async (section: Section, cityValue: unknown): Promise<void> => {
		const city = String(cityValue || '').trim()
		if (city.length < 2) return
		try {
			const results = await searchLocationsByCity(city, 300, getSectionCountryCode(section)) as LocationSearchResult[]
			const cityNorm = normalizeLocationText(city)
			let filtered = results
				.filter((loc) => normalizeLocationText(loc.place_name).startsWith(cityNorm))
			if (isItalianSection(section)) {
				filtered = filtered.sort((a, b) => String(a.postal_code).localeCompare(String(b.postal_code)))
			}
			setSectionCapSuggestions(section, filtered.slice(0, 40))
			setProvinceSuggestionsFromLocations(section, filtered)
		} catch {
			// ignore
		}
	}

	// --- Focus handlers ---
	const onCityFocus = (section: Section): void => {
		const addr = getSectionAddress(section)
		if (addr.city && String(addr.city).trim().length >= 2) {
			void onCityInput(section, addr.city, { immediate: true })
		}
	}

	const onCapFocus = (section: Section): void => {
		const addr = getSectionAddress(section)
		const cap = String(addr.postal_code || '')
		if (cap.length >= 3) {
			void onCapInput(section, cap, { immediate: true })
			return
		}
		if (String(addr.city || '').trim().length >= 2) {
			void loadCapSuggestionsFromCity(section, addr.city)
		}
	}

	const onProvinceFocus = (section: Section): void => {
		const addr = getSectionAddress(section)
		const filtered = isItalianSection(section)
			? sv.filterProvincia(addr.province || '')
			: String(addr.province || '').trimStart()
		onProvinciaInput(section, filtered)
		if (!filtered && String(addr.postal_code || '').length >= 3) {
			void onCapInput(section, addr.postal_code || '', { immediate: true })
		}
		if (!filtered && String(addr.city || '').trim().length >= 2) {
			void onCityInput(section, addr.city || '', { immediate: true })
		}
	}

	// --- City autocomplete with API ---
	const onCityInput = async (section: Section, value: string, options: InputOptions = {}): Promise<void> => {
		if (citySearchTimeout[section]) clearTimeout(citySearchTimeout[section] as ReturnType<typeof setTimeout>)

		sv.onInput(`${section}_city`, () => {
			if (!value || !String(value).trim()) {
				sv.setError(`${section}_city`, 'Città è obbligatoria')
			} else {
				sv.clearError(`${section}_city`)
			}
		})

		if (!value || value.length < 2) {
			setSectionCitySuggestions(section, [])
			return
		}

		const delay = options.immediate ? 0 : 260
		citySearchTimeout[section] = setTimeout(async () => {
			const seq = ++citySearchSeq[section]
			try {
				const results = await searchLocationsByCity(value, 300, getSectionCountryCode(section)) as LocationSearchResult[]
				if (seq !== citySearchSeq[section]) return

				const queryNorm = normalizeLocationText(value)
				const address = getSectionAddress(section)
				const capPrefix = String(address.postal_code || '')
				const provincePrefix = normalizeLocationText(address.province || '')

				let suggestions = results.filter((loc) =>
					normalizeLocationText(loc.place_name).startsWith(queryNorm),
				)

				const currentCity = normalizeLocationText(address.city || '')
				const isEditingAfterSelection = currentCity && queryNorm !== currentCity

				if (!isEditingAfterSelection && capPrefix.length >= 3) {
					suggestions = suggestions.filter((loc) =>
						String(loc.postal_code || '').startsWith(capPrefix),
					)
				}

				if (!isEditingAfterSelection && provincePrefix.length === 2) {
					suggestions = suggestions.filter((loc) =>
						normalizeLocationText(getProvinceLabel(loc) || '') === provincePrefix,
					)
				}

				suggestions.sort((a, b) => {
					const aName = normalizeLocationText(a.place_name)
					const bName = normalizeLocationText(b.place_name)
					const aExact = aName === queryNorm ? 0 : 1
					const bExact = bName === queryNorm ? 0 : 1
					if (aExact !== bExact) return aExact - bExact
					if (aName.length !== bName.length) return aName.length - bName.length
					if (aName !== bName) return aName.localeCompare(bName)
					return String(a.postal_code || '').localeCompare(String(b.postal_code || ''))
				})

				setSectionCitySuggestions(section, suggestions.slice(0, 25))
				setProvinceSuggestionsFromLocations(section, suggestions)

				if (capPrefix.length >= 3) {
					setSectionCapSuggestions(
						section,
						suggestions
							.filter((loc) => String(loc.postal_code || '').startsWith(capPrefix))
							.slice(0, 40),
					)
				}
			} catch {
				setSectionCitySuggestions(section, [])
			}
		}, delay)
	}

	const selectCity = (section: Section, location: LocationSearchResult): void => {
		applyLocationToSection(section, location)
	}

	const selectCap = (section: Section, location: LocationSearchResult): void => {
		applyLocationToSection(section, location)
	}

	// --- Name input ---
	const onNameInput = (section: Section, value: string): void => {
		const capitalized = sanitizeFullNameValue(value)
		if (section === 'origin') {
			originAddress.value.full_name = capitalized
		} else {
			destinationAddress.value.full_name = capitalized
		}
		sv.onInput(`${section}_full_name`, () => sv.validateNomeCognome(`${section}_full_name`, capitalized))
	}

	// --- CAP input ---
	const onCapInput = async (section: Section, value: string, options: InputOptions = {}): Promise<void> => {
		if (capSearchTimeout[section]) clearTimeout(capSearchTimeout[section] as ReturnType<typeof setTimeout>)
		const countryCode = getSectionCountryCode(section)
		const filtered = sv.filterCAP(value, { countryCode })
		if (section === 'origin') {
			originAddress.value.postal_code = filtered
		} else {
			destinationAddress.value.postal_code = filtered
		}
		sv.onInput(`${section}_postal_code`, () => sv.validateCAP(`${section}_postal_code`, filtered, { countryCode }))

		if (!filtered || filtered.length < (countryCode === 'IT' ? 3 : 2)) {
			setSectionCapSuggestions(section, [])
			return
		}

		const delay = options.immediate ? 0 : 220
		capSearchTimeout[section] = setTimeout(async () => {
			const seq = ++capSearchSeq[section]
			const address = getSectionAddress(section)
			const cityNorm = normalizeLocationText(address.city || '')
			const provinceNorm = normalizeLocationText(address.province || '')

			try {
				let results: LocationSearchResult[] = []
				if (countryCode === 'IT' && filtered.length === 5) {
					results = await searchLocationsByCap(filtered, countryCode) as LocationSearchResult[]
				} else {
					results = await searchLocations(filtered, 300, countryCode) as LocationSearchResult[]
				}
				if (seq !== capSearchSeq[section]) return

				let suggestions = countryCode === 'IT'
					? results.filter((loc) => String(loc.postal_code || '').startsWith(filtered))
					: results.filter((loc) => String(loc.postal_code || '').toUpperCase().startsWith(filtered.toUpperCase()))

				const currentCap = String(address.postal_code || '')
				const isEditingCap = currentCap && filtered !== currentCap

				if (!isEditingCap && cityNorm.length >= 2) {
					suggestions = suggestions.filter((loc) =>
						normalizeLocationText(loc.place_name).startsWith(cityNorm),
					)
				}

				if (!isEditingCap && countryCode === 'IT' && provinceNorm.length === 2) {
					suggestions = suggestions.filter((loc) =>
						normalizeLocationText(getProvinceLabel(loc) || '') === provinceNorm,
					)
				}

				suggestions.sort((a, b) => {
					const aCap = String(a.postal_code || '')
					const bCap = String(b.postal_code || '')
					if (aCap !== bCap) return aCap.localeCompare(bCap)
					return normalizeLocationText(a.place_name).localeCompare(normalizeLocationText(b.place_name))
				})

				setSectionCapSuggestions(section, suggestions.slice(0, 40))
				setProvinceSuggestionsFromLocations(section, suggestions)

				if (countryCode === 'IT' && filtered.length === 5) {
					const exactCoherent = suggestions.find((loc) =>
						isLocationCoherent(loc, address.city, address.province),
					)
					if (exactCoherent) {
						applyLocationToSection(section, exactCoherent)
					} else if (!address.city && suggestions.length === 1 && suggestions[0]) {
						applyLocationToSection(section, suggestions[0])
					}
				}
			} catch {
				setSectionCapSuggestions(section, [])
			}
		}, delay)
	}

	// --- Telefono input ---
	const onTelefonoInput = (section: Section, value: string): void => {
		const formatted = sv.formatTelefono(value)
		if (section === 'origin') {
			originAddress.value.telephone_number = formatted
		} else {
			destinationAddress.value.telephone_number = formatted
		}
		sv.onInput(`${section}_telephone_number`, () => sv.validateTelefono(`${section}_telephone_number`, formatted))
	}

	// --- Smart blur ---
	const smartBlur = (section: Section, field: Field): void => {
		const key = `${section}_${field}`
		const addr = section === 'origin' ? originAddress.value : destinationAddress.value
		const value = addr[field] as string | undefined

		if (field === 'full_name') {
			sv.onBlur(key, () => sv.validateNomeCognome(key, value || ''))
		} else if (field === 'city') {
			sv.onBlur(key, () => {
				if (!value || !String(value).trim()) sv.setError(key, 'Città è obbligatoria')
				else sv.clearError(key)
			})
			setTimeout(() => setSectionCitySuggestions(section, []), 200)
			void validateAddressLocationLink(section)
		} else if (field === 'postal_code') {
			sv.onBlur(key, () => sv.validateCAP(key, value || '', { countryCode: getSectionCountryCode(section) }))
			setTimeout(() => setSectionCapSuggestions(section, []), 200)
			void validateAddressLocationLink(section)
		} else if (field === 'telephone_number') {
			sv.onBlur(key, () => sv.validateTelefono(key, value || ''))
		} else if (field === 'email') {
			sv.onBlur(key, () => sv.validateEmail(key, value || ''))
		} else if (field === 'province') {
			sv.onBlur(key, () => validateProvinceField(section, value))
			setTimeout(() => {
				setSectionProvinceSuggestions(section, [])
			}, 200)
			void validateAddressLocationLink(section)
		} else {
			sv.onBlur(key, () => {
				if (!value || !String(value).trim()) {
					sv.setError(key, 'Campo obbligatorio')
				} else {
					sv.clearError(key)
				}
			})
		}
	}

	return {
		applyLocationToSection,
		destCapSuggestions,
		destCitySuggestions,
		destProvinceSuggestions,
		formatCapSuggestionLabel,
		formatCitySuggestionLabel,
		getSectionAddress,
		getSectionCountryCode,
		isLocationCoherent,
		locationLinkHints,
		normalizeLocationText,
		onCapFocus,
		onCapInput,
		onCityFocus,
		onCityInput,
		onNameInput,
		onProvinceFocus,
		onProvinciaInput,
		onTelefonoInput,
		originCapSuggestions,
		originCitySuggestions,
		originProvinceSuggestions,
		selectCap,
		selectCity,
		selectProvincia,
		smartBlur,
		validateAddressLocationLink,
		validateProvinceField,
	}
}
