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
export const useShipmentStepValidation = ({
	contentError,
	dateError,
	deliveryMode,
	destinationAddress,
	originAddress,
	sanctumClient,
	services,
	userStore,
}) => {
	const sv = useSmartValidation();

	// --- Location autocomplete & input handlers ---
	const autocomplete = useShipmentLocationAutocomplete({
		deliveryMode,
		destinationAddress,
		originAddress,
		sanctumClient,
		sv,
		userStore,
	});

	// --- Form validation, error summary, field assist ---
	const formValidation = useShipmentFormValidation({
		contentError,
		dateError,
		deliveryMode,
		destinationAddress,
		originAddress,
		services,
		sv,
		userStore,
		// Pass through from autocomplete
		applyLocationToSection: autocomplete.applyLocationToSection,
		getSectionAddress: autocomplete.getSectionAddress,
		getSectionCountryCode: autocomplete.getSectionCountryCode,
		locationLinkHints: autocomplete.locationLinkHints,
		normalizeLocationText: autocomplete.normalizeLocationText,
		validateAddressLocationLink: autocomplete.validateAddressLocationLink,
		validateProvinceField: autocomplete.validateProvinceField,
		originCitySuggestions: autocomplete.originCitySuggestions,
		originCapSuggestions: autocomplete.originCapSuggestions,
		destCitySuggestions: autocomplete.destCitySuggestions,
		destCapSuggestions: autocomplete.destCapSuggestions,
	});

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
	};
};
