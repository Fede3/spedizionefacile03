/**
 * @file useShipmentForm — Composable useShipmentForm.
 */
// useShipmentForm.js — Validazione + error summary + field assist per form spedizione.
//
// Consolidato il 2026-04-20 da:
//  - useShipmentFormValidation.js  (208 LOC) → SEZIONE 3
//  - useShipmentFormErrorSummary.js (170 LOC) → SEZIONE 1
//  - useShipmentFormFieldAssist.js  (243 LOC) → SEZIONE 2
// API pubblica identica: 3 export con nomi invariati + helper riesportati.

import type { Ref } from "vue";

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 1: Error Summary
// Ordina/raggruppa/umanizza errori step indirizzi.
// Espone FIELD_ERROR_ORDER / LABELS / IDS + computed (formErrorSummary,
// groupedFormErrors, hints).
// ─────────────────────────────────────────────────────────────────────────────

/** @type {string[]} */

import {
  FIELD_ERROR_ORDER,
  FIELD_ERROR_LABELS,
  FIELD_ERROR_IDS,
  softenErrorMessage,
} from '~/utils/shipmentFormHelpers';

type AddressSection = 'origin' | 'dest';
type AddressDraft = {
	full_name?: string;
	address?: string;
	address_number?: string;
	city?: string;
	province?: string;
	postal_code?: string;
	telephone_number?: string;
	email?: string;
	[key: string]: string | undefined;
};
type FormErrorItem = {
	key: string;
	message: string;
	label: string;
	targetId: string;
};
type GroupedFormErrors = Record<AddressSection | 'generic', FormErrorItem[]>;
type SmartValidationApi = {
	errors: Ref<Record<string, string | undefined>>;
	autoCapitalize: (value: string) => string;
	clearError: (key: string) => void;
	getError: (key: string) => string | null;
	hasError: (key: string) => boolean;
	markTouched: (key: string) => void;
	setError: (key: string, message: string) => void;
	validateCAP: (key: string, value: unknown, options?: { countryCode?: string }) => boolean;
	validateEmail: (key: string, value: unknown) => boolean;
	validateNomeCognome: (key: string, value: unknown) => boolean;
	validateTelefono: (key: string, value: unknown) => boolean;
};
type ShipmentFormErrorSummaryArgs = {
	sv: SmartValidationApi;
	contentError: Ref<string | null>;
};
type ShipmentFormValidationArgs = {
	contentError: Ref<string | null>;
	dateError: Ref<string | null>;
	deliveryMode: Ref<string>;
	destinationAddress: Ref<AddressDraft>;
	originAddress: Ref<AddressDraft>;
	services: Ref<{ date?: unknown }>;
	sv: SmartValidationApi;
	shipmentFlowStore: { contentDescription?: string };
	applyLocationToSection: (...args: unknown[]) => unknown;
	getSectionAddress: (section: AddressSection) => AddressDraft;
	getSectionCountryCode: (section: AddressSection) => string;
	locationLinkHints: Partial<Record<AddressSection, import("~/utils/location").LocationRecord[]>>;
	normalizeLocationText: (value: unknown) => string;
	validateAddressLocationLink: (section: AddressSection) => Promise<boolean>;
	validateProvinceField: (section: AddressSection, value: unknown) => boolean;
	originCitySuggestions: Ref<import("~/utils/location").LocationRecord[]>;
	originCapSuggestions: Ref<import("~/utils/location").LocationRecord[]>;
	destCitySuggestions: Ref<import("~/utils/location").LocationRecord[]>;
	destCapSuggestions: Ref<import("~/utils/location").LocationRecord[]>;
};
const FIELD_LABEL_MAP = FIELD_ERROR_LABELS as Record<string, string>;
const FIELD_ID_MAP = FIELD_ERROR_IDS as Record<string, string>;

// Re-export rimosso: i caller importano direttamente da utils/shipmentFormHelpers.
// Nuxt auto-import preferisce comunque la versione utils/.

/** Crea i computed di sintesi / raggruppamento / section hints da `sv.errors`. */
export const useShipmentFormErrorSummary = ({ sv, contentError }: ShipmentFormErrorSummaryArgs) => {
	const formErrorSummary = computed<FormErrorItem[]>(() => {
		const errors = sv.errors?.value || {};
		const keys = Object.keys(errors || {}).sort((a, b) => {
			const aIndex = FIELD_ERROR_ORDER.indexOf(a as (typeof FIELD_ERROR_ORDER)[number]);
			const bIndex = FIELD_ERROR_ORDER.indexOf(b as (typeof FIELD_ERROR_ORDER)[number]);
			return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
		});

		return keys
			.filter((key) => Boolean(errors[key]))
			.map((key) => ({
				key,
				message: softenErrorMessage(errors[key]),
				label: FIELD_LABEL_MAP[key] || key,
				targetId: FIELD_ID_MAP[key] || '',
			}));
	});

	const groupedFormErrors = computed<GroupedFormErrors>(() => {
		const groups: GroupedFormErrors = { origin: [], dest: [], generic: [] };
		for (const item of formErrorSummary.value) {
			if (item.key.startsWith('origin_')) groups.origin.push(item);
			else if (item.key.startsWith('dest_')) groups.dest.push(item);
			else groups.generic.push(item);
		}
		return groups;
	});

	const sectionsWithErrorsCount = computed(() => {
		let count = 0;
		if (groupedFormErrors.value.origin.length) count += 1;
		if (groupedFormErrors.value.dest.length) count += 1;
		if (groupedFormErrors.value.generic.length) count += 1;
		return count;
	});

	const showGlobalFormSummary = computed(() => formErrorSummary.value.length > 1 && sectionsWithErrorsCount.value > 1);

	const originSectionHint = computed(() => {
		const errors = groupedFormErrors.value.origin;
		if (!errors.length) return '';
		const firstError = errors[0];
		if (errors.length === 1 && firstError) return `${firstError.label}: ${firstError.message}`;
		return `Controlla ${errors.length} campi nella sezione Partenza.`;
	});

	const destinationSectionHint = computed(() => {
		const errors = groupedFormErrors.value.dest;
		if (!errors.length) return '';
		const firstError = errors[0];
		if (errors.length === 1 && firstError) return `${firstError.label}: ${firstError.message}`;
		return `Controlla ${errors.length} campi nella sezione Destinazione.`;
	});

	const contentFieldHint = computed(() => {
		if (!contentError.value) return '';
		return 'Ti ho portato qui perché manca il contenuto del pacco. Inseriscilo per continuare.';
	});

	return {
		formErrorSummary,
		groupedFormErrors,
		sectionsWithErrorsCount,
		showGlobalFormSummary,
		originSectionHint,
		destinationSectionHint,
		contentFieldHint,
	};
};

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 2: Field Assist
// Auto-correzione campi form indirizzi: capitalizza nomi, pulisce telefoni,
// suggerisce domini email, separa civico, applica location da suggestion
// CAP/città/provincia.
// ─────────────────────────────────────────────────────────────────────────────

// useShipmentFormFieldAssist estratto in composables/useShipmentFormFieldAssist.js

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 3: Validation
// Composable principale: validateForm, focus helpers, integra error summary
// e field assist dalle sezioni 1 e 2.
// ─────────────────────────────────────────────────────────────────────────────

/** @returns {object} composable form validation */
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
}: ShipmentFormValidationArgs) => {
	const showValidation = ref(false);

	// --- Form validation ---
	const validateForm = async () => {
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

		const validateRequiredField = (key: string, value: unknown, message: string) => {
			if (!value || !String(value).trim()) {
				sv.setError(key, message);
				return false;
			}
			sv.clearError(key);
			return true;
		};

		const validateAddr = (section: AddressSection, addr: AddressDraft) => {
			const isDestPudoContactOnly = section === 'dest' && deliveryMode.value === 'pudo';
			const commonFields = [
				['full_name', addr.full_name, () => sv.validateNomeCognome(`${section}_full_name`, addr.full_name)],
				['telephone_number', addr.telephone_number, () => sv.validateTelefono(`${section}_telephone_number`, addr.telephone_number)],
			];
			const fullAddressFields = [
				['address', addr.address, () => validateRequiredField(`${section}_address`, addr.address, 'Indirizzo è obbligatorio')],
				['address_number', addr.address_number, () => validateRequiredField(`${section}_address_number`, addr.address_number, 'Numero civico è obbligatorio')],
				['city', addr.city, () => validateRequiredField(`${section}_city`, addr.city, 'Città è obbligatoria')],
				['province', addr.province, () => validateProvinceField(section, addr.province)],
				['postal_code', addr.postal_code, () => sv.validateCAP(`${section}_postal_code`, addr.postal_code, { countryCode: getSectionCountryCode(section) })],
			];
			const fields = (isDestPudoContactOnly ? commonFields : [...commonFields, ...fullAddressFields]) as Array<[string, unknown, () => boolean]>;

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
	const getFieldError = (section: AddressSection, field: string) => sv.getError(`${section}_${field}`);

	const fieldClass = (section: AddressSection, field: string) => {
		const key = `${section}_${field}`;
		return sv.hasError(key)
			? 'input-preventivo-step-2 input-preventivo-step-2--warning'
			: 'input-preventivo-step-2';
	};

	const fieldErrorText = (section: AddressSection, field: string) => softenErrorMessage(getFieldError(section, field));

	// --- Focus helpers ---
	const focusFormError = (errorItem: FormErrorItem) => {
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

	const focusContentDescriptionField = () => {
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

	const focusFirstFormError = () => {
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
