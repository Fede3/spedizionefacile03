/**
 * useShipmentStepValidation (FACADE)
 *
 * Compone useShipmentLocationAutocomplete e useShipmentFormValidation
 * in un'unica interfaccia pubblica. Tutti i consumer esistenti continuano
 * a destrutturare da questa funzione senza alcuna modifica.
 *
 * Moduli interni:
 *   - useShipmentLocationAutocomplete: autocomplete citta'/CAP/provincia,
 *     input handlers, focus handlers, smart blur, validazione coerenza location
 *   - useShipmentFormValidation: validateForm, error summary, field assist,
 *     focus helpers, softenErrorMessage, field display helpers
 */
import type { Ref } from 'vue'

export interface ShipmentStepValidationDeps {
	contentError: Ref<string | null>
	dateError: Ref<string | null>
	deliveryMode: Ref<string>
	destinationAddress: Ref<unknown>
	originAddress: Ref<unknown>
	sanctumClient: unknown
	services: Ref<unknown>
	shipmentFlowStore: unknown
}

export const useShipmentStepValidation = ({
	contentError,
	dateError,
	deliveryMode,
	destinationAddress,
	originAddress,
	sanctumClient,
	services,
	shipmentFlowStore,
}: ShipmentStepValidationDeps) => {
	const sv = useSmartValidation()

	// --- Location autocomplete & input handlers ---
	// Cast dei Ref<unknown> e di sanctumClient/shipmentFlowStore ai tipi attesi dal sub-composable:
	// la facade accetta `unknown` per retrocompatibilità con i consumer esistenti.
	const autocomplete = useShipmentLocationAutocomplete({
		deliveryMode,
		destinationAddress: destinationAddress as Parameters<typeof useShipmentLocationAutocomplete>[0]['destinationAddress'],
		originAddress: originAddress as Parameters<typeof useShipmentLocationAutocomplete>[0]['originAddress'],
		sanctumClient: sanctumClient as Parameters<typeof useShipmentLocationAutocomplete>[0]['sanctumClient'],
		sv,
		shipmentFlowStore: shipmentFlowStore as Parameters<typeof useShipmentLocationAutocomplete>[0]['shipmentFlowStore'],
	})

	// --- Form validation, error summary, field assist ---
	// I callback dell'autocomplete sono tipati Section = 'origin' | 'dest'; la validation facade
	// li richiede col tipo più ampio `string`. I consumer reali passano solo 'origin'/'dest',
	// quindi facciamo un cast controllato per compatibilità.
	type FormValidationArg = Parameters<typeof useShipmentFormValidation>[0]
	const formValidation = useShipmentFormValidation({
		contentError,
		dateError,
		deliveryMode,
		destinationAddress,
		originAddress,
		services,
		sv,
		shipmentFlowStore,
		// Pass through from autocomplete
		applyLocationToSection: autocomplete.applyLocationToSection as FormValidationArg['applyLocationToSection'],
		getSectionAddress: autocomplete.getSectionAddress as FormValidationArg['getSectionAddress'],
		getSectionCountryCode: autocomplete.getSectionCountryCode as FormValidationArg['getSectionCountryCode'],
		locationLinkHints: autocomplete.locationLinkHints,
		normalizeLocationText: autocomplete.normalizeLocationText,
		validateAddressLocationLink: autocomplete.validateAddressLocationLink as FormValidationArg['validateAddressLocationLink'],
		validateProvinceField: autocomplete.validateProvinceField as FormValidationArg['validateProvinceField'],
		originCitySuggestions: autocomplete.originCitySuggestions,
		originCapSuggestions: autocomplete.originCapSuggestions,
		destCitySuggestions: autocomplete.destCitySuggestions,
		destCapSuggestions: autocomplete.destCapSuggestions,
	})

	return {
		// From useShipmentFormValidation
		applyFieldAssist: formValidation.applyFieldAssist,
		contentFieldHint: formValidation.contentFieldHint,
		destinationSectionHint: formValidation.destinationSectionHint,
		fieldClass: formValidation.fieldClass,
		fieldErrorText: formValidation.fieldErrorText,
		focusContentDescriptionField: formValidation.focusContentDescriptionField,
		focusFirstFormError: formValidation.focusFirstFormError,
		focusFormError: formValidation.focusFormError,
		formErrorSummary: formValidation.formErrorSummary,
		getFieldAssist: formValidation.getFieldAssist,
		getFieldError: formValidation.getFieldError,
		originSectionHint: formValidation.originSectionHint,
		showGlobalFormSummary: formValidation.showGlobalFormSummary,
		softenErrorMessage: formValidation.softenErrorMessage,
		validateForm: formValidation.validateForm,

		// From useShipmentLocationAutocomplete
		destCapSuggestions: autocomplete.destCapSuggestions,
		destCitySuggestions: autocomplete.destCitySuggestions,
		destProvinceSuggestions: autocomplete.destProvinceSuggestions,
		formatCapSuggestionLabel: autocomplete.formatCapSuggestionLabel,
		formatCitySuggestionLabel: autocomplete.formatCitySuggestionLabel,
		normalizeLocationText: autocomplete.normalizeLocationText,
		onCapFocus: autocomplete.onCapFocus,
		onCapInput: autocomplete.onCapInput,
		onCityFocus: autocomplete.onCityFocus,
		onCityInput: autocomplete.onCityInput,
		onNameInput: autocomplete.onNameInput,
		onProvinceFocus: autocomplete.onProvinceFocus,
		onProvinciaInput: autocomplete.onProvinciaInput,
		onTelefonoInput: autocomplete.onTelefonoInput,
		originCapSuggestions: autocomplete.originCapSuggestions,
		originCitySuggestions: autocomplete.originCitySuggestions,
		originProvinceSuggestions: autocomplete.originProvinceSuggestions,
		selectCap: autocomplete.selectCap,
		selectCity: autocomplete.selectCity,
		selectProvincia: autocomplete.selectProvincia,
		smartBlur: autocomplete.smartBlur,

		// Smart validation instance
		sv,
	}
}
