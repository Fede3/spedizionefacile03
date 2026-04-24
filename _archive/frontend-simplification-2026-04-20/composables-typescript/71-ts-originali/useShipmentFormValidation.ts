import type { Ref } from 'vue';
import { softenErrorMessage, useShipmentFormErrorSummary } from './useShipmentFormErrorSummary';
import { useShipmentFormFieldAssist } from './useShipmentFormFieldAssist';

interface LocationCandidate {
	postal_code?: string;
	place_name?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
}

interface ShipmentFormValidationDeps {
	contentError: Ref<string | null>;
	dateError: Ref<string | null>;
	deliveryMode: Ref<string>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	destinationAddress: Ref<any>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	originAddress: Ref<any>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	services: Ref<any>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	sv: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	shipmentFlowStore: any;
	// From useShipmentLocationAutocomplete
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	applyLocationToSection: (section: string, location: any) => void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getSectionAddress: (section: string) => any;
	getSectionCountryCode: (section: string) => string;
	locationLinkHints: Record<string, LocationCandidate[]>;
	normalizeLocationText: (text: string) => string;
	validateAddressLocationLink: (section: string) => Promise<boolean>;
	validateProvinceField: (section: string, value: string) => boolean;
	originCitySuggestions: Ref<LocationCandidate[]>;
	originCapSuggestions: Ref<LocationCandidate[]>;
	destCitySuggestions: Ref<LocationCandidate[]>;
	destCapSuggestions: Ref<LocationCandidate[]>;
}

export const useShipmentFormValidation = ({
	contentError,
	dateError,
	deliveryMode,
	destinationAddress,
	originAddress,
	services,
	sv,
	shipmentFlowStore,
	// From useShipmentLocationAutocomplete
	applyLocationToSection,
	getSectionAddress,
	getSectionCountryCode,
	locationLinkHints,
	normalizeLocationText,
	validateAddressLocationLink,
	validateProvinceField,
	originCitySuggestions,
	originCapSuggestions,
	destCitySuggestions,
	destCapSuggestions,
}: ShipmentFormValidationDeps) => {
	const showValidation = ref(false);

	// --- Form validation ---
	const validateForm = async (): Promise<boolean> => {
		showValidation.value = true;
		let isValid = true;

		if (!services.value.date) {
			dateError.value = 'Seleziona un giorno di ritiro prima di procedere.';
			isValid = false;
		} else {
			dateError.value = null;
		}

		// Validazione contenuto del pacco
		if (!shipmentFlowStore.contentDescription || !shipmentFlowStore.contentDescription.trim()) {
			contentError.value = 'Il contenuto del pacco è obbligatorio';
			isValid = false;
		} else {
			contentError.value = null;
		}

		const validateRequiredField = (key: string, value: unknown, message: string): boolean => {
			if (!value || !String(value).trim()) {
				sv.setError(key, message);
				return false;
			}
			sv.clearError(key);
			return true;
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const validateAddr = (section: string, addr: any): void => {
			const isDestPudoContactOnly = section === 'dest' && deliveryMode.value === 'pudo';
			const commonFields: [string, unknown, () => boolean][] = [
				['full_name', addr.full_name, () => sv.validateNomeCognome(`${section}_full_name`, addr.full_name)],
				['telephone_number', addr.telephone_number, () => sv.validateTelefono(`${section}_telephone_number`, addr.telephone_number)],
			];
			const fullAddressFields: [string, unknown, () => boolean][] = [
				['address', addr.address, () => validateRequiredField(`${section}_address`, addr.address, 'Indirizzo è obbligatorio')],
				['address_number', addr.address_number, () => validateRequiredField(`${section}_address_number`, addr.address_number, 'Numero civico è obbligatorio')],
				['city', addr.city, () => validateRequiredField(`${section}_city`, addr.city, 'Città è obbligatoria')],
				['province', addr.province, () => validateProvinceField(section, addr.province)],
				['postal_code', addr.postal_code, () => sv.validateCAP(`${section}_postal_code`, addr.postal_code, { countryCode: getSectionCountryCode(section) })],
			];
			const fields = isDestPudoContactOnly ? commonFields : [...commonFields, ...fullAddressFields];

			for (const [field, , validateFn] of fields) {
				sv.markTouched(`${section}_${field}`);
				if (!validateFn()) isValid = false;
			}

			if (addr.email) {
				sv.markTouched(`${section}_email`);
				if (!sv.validateEmail(`${section}_email`, addr.email)) isValid = false;
			}
		};

		validateAddr('origin', originAddress.value);
		validateAddr('dest', destinationAddress.value);

		const originLinkOk = await validateAddressLocationLink('origin');
		if (!originLinkOk) isValid = false;

		if (deliveryMode.value !== 'pudo') {
			const destLinkOk = await validateAddressLocationLink('dest');
			if (!destLinkOk) isValid = false;
		}

		const hasFieldErrors = Object.values(sv.errors?.value || {}).some(Boolean);
		return isValid && !hasFieldErrors ? true : !dateError.value && !contentError.value && !hasFieldErrors;
	};

	// --- Error summary / grouping / hints ---
	const {
		formErrorSummary,
		groupedFormErrors,
		sectionsWithErrorsCount,
		showGlobalFormSummary,
		originSectionHint,
		destinationSectionHint,
		contentFieldHint,
	} = useShipmentFormErrorSummary({ sv, contentError });

	// --- Field error display helpers ---
	const getFieldError = (section: string, field: string): string | null => sv.getError(`${section}_${field}`);

	const fieldClass = (section: string, field: string): string => {
		const key = `${section}_${field}`;
		return sv.hasError(key)
			? 'input-preventivo-step-2 input-preventivo-step-2--warning'
			: 'input-preventivo-step-2';
	};

	const fieldErrorText = (section: string, field: string): string => softenErrorMessage(getFieldError(section, field));

	// --- Focus helpers ---
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const focusFormError = (errorItem: any | null): void => {
		const targetId = errorItem?.targetId;
		if (!targetId) return;
		const field = document.getElementById(targetId);
		if (!field) {
			const section = errorItem?.key?.startsWith('origin_')
				? 'origin'
				: errorItem?.key?.startsWith('dest_')
					? 'dest'
					: null;
			if (section && import.meta.client) {
				window.dispatchEvent(new CustomEvent('shipment:focus-address-field', {
					detail: { section, targetId },
				}));
			}
			return;
		}
		const rect = field.getBoundingClientRect?.();
		const isVisible = rect && rect.top >= 96 && rect.bottom <= window.innerHeight - 24;
		if (!isVisible) {
			field.scrollIntoView({ behavior: 'auto', block: 'nearest' });
		}
		window.setTimeout(() => {
			field.focus?.();
		}, 120);
	};

	const focusContentDescriptionField = (): void => {
		const field = document.getElementById('content_description');
		if (!field) return;
		const rect = field.getBoundingClientRect?.();
		const isVisible = rect && rect.top >= 96 && rect.bottom <= window.innerHeight - 24;
		if (!isVisible) {
			field.scrollIntoView({ behavior: 'auto', block: 'nearest' });
		}
		window.setTimeout(() => {
			field.focus?.();
		}, 120);
	};

	const focusFirstFormError = (): void => {
		if (contentError.value) {
			focusContentDescriptionField();
			return;
		}
		const firstError = formErrorSummary.value[0];
		if (!firstError) return;
		focusFormError(firstError);
	};

	// --- Field assist (auto-correction suggestions) ---
	const { getFieldAssist, applyFieldAssist } = useShipmentFormFieldAssist({
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
	});

	return {
		applyFieldAssist,
		contentFieldHint,
		destinationSectionHint,
		fieldClass,
		fieldErrorText,
		focusContentDescriptionField,
		focusFirstFormError,
		focusFormError,
		formErrorSummary,
		getFieldAssist,
		getFieldError,
		groupedFormErrors,
		originSectionHint,
		sectionsWithErrorsCount,
		showGlobalFormSummary,
		showValidation,
		softenErrorMessage,
		validateForm,
	};
};
