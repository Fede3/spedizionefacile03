/**
 * Tipi per il provide/inject del form indirizzi (ShipmentFlowPage → AddressFormFields).
 *
 * Sostituiscono `inject('shipmentFormHandlers')` string-key con
 * `inject(shipmentFormHandlersKey)` Symbol-typed (vedi utils/injectionKeys.ts).
 *
 * Tre sub-interfacce coese per permettere ai consumer di destrutturare solo
 * cio' che usano:
 *  - ShipmentFieldHandlers — validazione/blur/error (5 fn)
 *  - ShipmentFieldAssistHandlers — UX assist su autocomplete (2 fn)
 *  - ShipmentAddressInputHandlers — input/select handler (14 fn)
 */
import type { LocationRecord } from '~/utils/location'

type SmartValidationLike = {
	autoCapitalize?: (value: string) => string
	markTouched?: (key: string) => void
	validateNomeCognome?: (key: string, value: string) => void
	validateTelefono?: (key: string, value: string) => void
	validateEmail?: (key: string, value: string) => void
	clearError?: (key: string) => void
}

type AddressSection = 'origin' | 'dest'

type FieldAssist = {
	label: string
	apply: () => void
} | null

/** Handler per validazione/blur/error: 5 funzioni base. */
export interface ShipmentFieldHandlers {
	fieldClass: (section: AddressSection, field: string) => string
	getFieldError: (section: AddressSection, field: string) => string | null | undefined
	fieldErrorText: (section: AddressSection, field: string) => string
	smartBlur: (key: string, value: string) => void
	sv: SmartValidationLike
}

/** Handler UX assist (suggerimenti rapidi di completamento): 2 funzioni. */
export interface ShipmentFieldAssistHandlers {
	getFieldAssist: (section: AddressSection, field: string) => FieldAssist
	applyFieldAssist: (assist: FieldAssist) => void
}

/** Handler input/select per i campi indirizzo: 14 funzioni. */
export interface ShipmentAddressInputHandlers {
	updateAddressField: (section: AddressSection, field: string, value: unknown) => void
	onNameInput: (section: AddressSection, value: string) => void
	onCityInput: (section: AddressSection, value: string) => void
	onCityFocus: (section: AddressSection) => void
	onProvinciaInput: (section: AddressSection, value: string) => void
	onProvinceFocus: (section: AddressSection) => void
	onCapInput: (section: AddressSection, value: string) => void
	onCapFocus: (section: AddressSection) => void
	onTelefonoInput: (section: AddressSection, value: string) => void
	selectCity: (section: AddressSection, location: LocationRecord) => void
	selectProvincia: (section: AddressSection, location: LocationRecord) => void
	selectCap: (section: AddressSection, location: LocationRecord) => void
	formatCitySuggestionLabel: (location: LocationRecord) => string
	formatCapSuggestionLabel: (location: LocationRecord) => string
}

/** Bundle completo iniettato in provide(): intersezione delle 3 sub-interfacce. */
export type ShipmentFormHandlers =
	& ShipmentFieldHandlers
	& ShipmentFieldAssistHandlers
	& ShipmentAddressInputHandlers

/** Suggerimenti location (autocomplete CAP/citta/provincia per origine + destinazione). */
export interface ShipmentSuggestions {
	originCitySuggestions: ReadonlyArray<LocationRecord>
	originProvinceSuggestions: ReadonlyArray<LocationRecord>
	originCapSuggestions: ReadonlyArray<LocationRecord>
	destCitySuggestions: ReadonlyArray<LocationRecord>
	destProvinceSuggestions: ReadonlyArray<LocationRecord>
	destCapSuggestions: ReadonlyArray<LocationRecord>
}
