import type { Ref } from 'vue'
import { computed } from 'vue'
import type { LocationRecord } from '~/utils/location'
import { dedupeLocations, getProvinceLabel } from '~/utils/location'
import { buildEmailSuggestion, extractAddressAndNumber, normalizeSimpleText } from '~/utils/shipmentFormHelpers'

type AddressSection = 'origin' | 'dest'
type AssistField =
	| 'full_name'
	| 'address'
	| 'address_number'
	| 'city'
	| 'province'
	| 'postal_code'
	| 'telephone_number'
	| 'email'
type ShipmentFormAddress = Partial<Record<AssistField, string>>
type FieldAssist = {
	label: string
	apply: () => void
} | null
type SmartValidation = {
	autoCapitalize: (value: string) => string
	markTouched: (key: string) => void
	validateNomeCognome: (key: string, value: string) => void
	validateTelefono: (key: string, value: string) => void
	validateEmail: (key: string, value: string) => void
	clearError: (key: string) => void
}
type FieldAssistOptions = {
	deliveryMode: Ref<string>
	sv: SmartValidation
	applyLocationToSection: (section: AddressSection, location: LocationRecord) => void
	getSectionAddress: (section: AddressSection) => ShipmentFormAddress
	getFieldError: (section: AddressSection, field: AssistField) => string | null | undefined
	locationLinkHints: Partial<Record<AddressSection, LocationRecord[]>>
	normalizeLocationText: (value: unknown) => string
	originCitySuggestions: Ref<LocationRecord[]>
	originCapSuggestions: Ref<LocationRecord[]>
	destCitySuggestions: Ref<LocationRecord[]>
	destCapSuggestions: Ref<LocationRecord[]>
}

const ADDRESS_FIELDS: AssistField[] = [
	'full_name',
	'address',
	'address_number',
	'city',
	'province',
	'postal_code',
	'telephone_number',
	'email',
]
const PUDO_LOCKED_FIELDS: AssistField[] = ['address', 'address_number', 'city', 'province', 'postal_code']

export const useShipmentFormFieldAssist = ({
	deliveryMode,
	sv,
	applyLocationToSection,
	getSectionAddress,
	getFieldError,
	locationLinkHints,
	normalizeLocationText,
	originCitySuggestions,
	originCapSuggestions,
	destCitySuggestions,
	destCapSuggestions,
}: FieldAssistOptions) => {
	const getBestLocationCandidate = (section: AddressSection): LocationRecord | null => {
		const addr = getSectionAddress(section)
		const cap = String(addr.postal_code || '').trim()
		const cityNorm = normalizeLocationText(addr.city || '')
		const provinceNorm = normalizeLocationText(addr.province || '')
		const cityList = section === 'origin' ? originCitySuggestions.value : destCitySuggestions.value
		const capList = section === 'origin' ? originCapSuggestions.value : destCapSuggestions.value
		const hintList = locationLinkHints[section] || []

		let pool = dedupeLocations([...(capList || []), ...(cityList || []), ...(hintList || [])])
		if (!pool.length) return null

		if (cap.length === 5) {
			const capMatches = pool.filter((loc) => String(loc.postal_code || '') === cap)
			if (capMatches.length) pool = capMatches
		}

		pool.sort((a, b) => {
			const aCity = normalizeLocationText(a.place_name)
			const bCity = normalizeLocationText(b.place_name)
			const aProv = normalizeLocationText(getProvinceLabel(a))
			const bProv = normalizeLocationText(getProvinceLabel(b))
			const aScore =
				(aCity === cityNorm ? 3 : 0) +
				(aProv === provinceNorm ? 2 : 0) +
				(cap && String(a.postal_code || '') === cap ? 2 : 0)
			const bScore =
				(bCity === cityNorm ? 3 : 0) +
				(bProv === provinceNorm ? 2 : 0) +
				(cap && String(b.postal_code || '') === cap ? 2 : 0)

			return aScore !== bScore ? bScore - aScore : String(a.postal_code || '').localeCompare(String(b.postal_code || ''))
		})

		return pool[0] || null
	}

	const buildFieldAssist = (section: AddressSection, field: AssistField): FieldAssist => {
		const error = getFieldError(section, field)
		if (!error) return null

		const addr = getSectionAddress(section)
		const key = `${section}_${field}`
		const isDestPudoAddress = section === 'dest' && deliveryMode.value === 'pudo' && PUDO_LOCKED_FIELDS.includes(field)
		if (isDestPudoAddress) return null

		if (field === 'full_name') {
			const current = String(addr.full_name || '')
			const cleaned = sv.autoCapitalize(current.replace(/\d/g, '').replace(/\s+/g, ' ').trim())
			if (cleaned && cleaned !== current) {
				return {
					label: `Usa "${cleaned}"`,
					apply: () => {
						addr.full_name = cleaned
						sv.markTouched(key)
						sv.validateNomeCognome(key, cleaned)
					},
				}
			}
		}

		if (field === 'telephone_number') {
			const current = String(addr.telephone_number || '')
			const onlyDigits = current.replace(/\D/g, '').replace(/^39/, '')
			const candidateDigits = onlyDigits.length > 10 ? onlyDigits.slice(0, 10) : onlyDigits
			if (candidateDigits.length >= 6 && candidateDigits !== onlyDigits) {
				return {
					label: `Correggi numero in ${candidateDigits}`,
					apply: () => {
						addr.telephone_number = candidateDigits
						sv.markTouched(key)
						sv.validateTelefono(key, candidateDigits)
					},
				}
			}
		}

		if (field === 'email') {
			const current = String(addr.email || '')
			const suggestion = buildEmailSuggestion(current)
			if (suggestion && suggestion !== current.toLowerCase()) {
				return {
					label: `Usa "${suggestion}"`,
					apply: () => {
						addr.email = suggestion
						sv.markTouched(key)
						sv.validateEmail(key, suggestion)
					},
				}
			}
		}

		if (field === 'address' || field === 'address_number') {
			const parsed = extractAddressAndNumber(addr.address)
			if (parsed && !normalizeSimpleText(addr.address_number)) {
				return {
					label: field === 'address' ? `Separa civico: ${parsed.street}, ${parsed.number}` : `Imposta civico ${parsed.number}`,
					apply: () => {
						addr.address = parsed.street
						addr.address_number = parsed.number
						sv.markTouched(`${section}_address`)
						sv.markTouched(`${section}_address_number`)
						sv.clearError(`${section}_address`)
						sv.clearError(`${section}_address_number`)
					},
				}
			}
		}

		if (field === 'city' || field === 'province' || field === 'postal_code') {
			const candidate = getBestLocationCandidate(section)
			if (!candidate) return null

			const city = String(candidate.place_name || '').trim()
			const province = getProvinceLabel(candidate)
			const cap = String(candidate.postal_code || '').trim()
			const cityDiff = city && normalizeLocationText(city) !== normalizeLocationText(addr.city || '')
			const provinceDiff = province && normalizeLocationText(province) !== normalizeLocationText(addr.province || '')
			const capDiff = cap && cap !== String(addr.postal_code || '').trim()

			if (cityDiff || provinceDiff || capDiff) {
				const labelParts: string[] = []
				if (cityDiff) labelParts.push(city)
				if (provinceDiff) labelParts.push(province)
				if (capDiff) labelParts.push(cap)

				return {
					label: `Applica correzione: ${labelParts.join(' - ')}`,
					apply: () => {
						applyLocationToSection(section, candidate)
						sv.markTouched(`${section}_city`)
						sv.markTouched(`${section}_province`)
						sv.markTouched(`${section}_postal_code`)
					},
				}
			}
		}

		return null
	}

	const fieldAssistMap = computed<Record<string, FieldAssist>>(() => {
		const map: Record<string, FieldAssist> = {}
		;(['origin', 'dest'] as AddressSection[]).forEach((section) => {
			ADDRESS_FIELDS.forEach((field) => {
				map[`${section}_${field}`] = buildFieldAssist(section, field)
			})
		})
		return map
	})

	const getFieldAssist = (section: AddressSection, field: AssistField): FieldAssist =>
		fieldAssistMap.value[`${section}_${field}`] || null

	const applyFieldAssist = (section: AddressSection, field: AssistField) => {
		getFieldAssist(section, field)?.apply()
	}

	return {
		getFieldAssist,
		applyFieldAssist,
	}
}
