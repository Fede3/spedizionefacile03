/**
 * useFunnelValidation
 * ----------------------------------------------------------------------------
 * Step-by-step validation logic for the shipment funnel.
 * Encapsulates package-field sanitisation, per-step validation and
 * focus-on-error behaviour previously inlined in [step].vue.
 *
 * Depends on:
 *   - useShipmentStepValidation().sv (smart-validation primitives)
 *   - useQuickQuotePackages() calc helpers (injected via options)
 * ----------------------------------------------------------------------------
 */

import { nextTick, ref, type Ref } from 'vue';

export const PACKAGE_VALIDATION_LABELS = {
	weight: 'Peso',
	first_size: 'Lato 1',
	second_size: 'Lato 2',
	third_size: 'Lato 3',
} as const;

export const PACKAGE_VALIDATION_KEYS = {
	weight: 'peso',
	first_size: 'first_size',
	second_size: 'second_size',
	third_size: 'third_size',
} as const;

export type PackageFieldKey = keyof typeof PACKAGE_VALIDATION_LABELS;

export interface FunnelValidationOptions {
	/** Smart-validation wrapper from useShipmentStepValidation(). */
	sv: any;
	/** Editable packages ref from useShipmentStepCartEdit(). */
	editablePackages: Ref<any[]>;
	/** Package helpers from useQuickQuotePackages(). */
	calcPriceWithWeight: (pack: any) => void;
	calcPriceWithVolume: (pack: any) => void;
	recalcPackageQuantity: (pack: any) => void;
	/** Inline service-detail validator from useShipmentStepServiceCards(). */
	validateInlineServiceDetails: () => boolean;
}

export interface UseFunnelValidationReturn {
	packagesError: Ref<string>;
	getPackageValidationKey: (fieldKey: PackageFieldKey, packIndex: number) => string;
	getPackageMetricError: (packIndex: number, fieldKey: PackageFieldKey) => string | null | undefined;
	getPackageMetricClass: (packIndex: number, fieldKey: PackageFieldKey) => string | string[];
	focusFirstInvalidPackageField: () => void;
	focusFirstInvalidServiceField: () => void;
	sanitizePackageWeightValue: (value: unknown) => string;
	sanitizePackageDimensionValue: (value: unknown) => string;
	onPackageQuantityInput: (pack: any) => void;
	onPackageWeightInput: (pack: any, packIndex: number) => void;
	onPackageWeightBlur: (pack: any, packIndex: number) => void;
	onPackageDimensionInput: (pack: any, packIndex: number, key: PackageFieldKey) => void;
	onPackageDimensionBlur: (pack: any, packIndex: number, key: PackageFieldKey) => void;
	validatePackagesStep: () => boolean;
	validateServicesStep: () => boolean;
}

export function useFunnelValidation(
	options: FunnelValidationOptions,
): UseFunnelValidationReturn {
	const {
		sv,
		editablePackages,
		calcPriceWithWeight,
		calcPriceWithVolume,
		recalcPackageQuantity,
		validateInlineServiceDetails,
	} = options;

	const packagesError = ref<string>('');

	const getPackageValidationKey = (fieldKey: PackageFieldKey, packIndex: number): string =>
		`${PACKAGE_VALIDATION_KEYS[fieldKey]}_${packIndex}`;

	const getPackageMetricError = (packIndex: number, fieldKey: PackageFieldKey) =>
		sv.getError(getPackageValidationKey(fieldKey, packIndex));

	const getPackageMetricClass = (packIndex: number, fieldKey: PackageFieldKey) =>
		sv.errorClass(getPackageValidationKey(fieldKey, packIndex), 'package-metric-input');

	const focusFirstInvalidPackageField = () => {
		nextTick(() => {
			const firstErrorSelector = [
				'#package-weight-0',
				'#package-first_size-0',
				'#package-second_size-0',
				'#package-third_size-0',
				'#package-quantity-0',
			].join(', ');
			const target =
				document.querySelector(firstErrorSelector) ||
				document.querySelector('.package-metric-input, .quantity-stepper__input');
			if (!(target instanceof HTMLElement)) return;
			target.scrollIntoView({ behavior: 'smooth', block: 'center' });
			window.setTimeout(() => {
				target.focus?.({ preventScroll: true });
			}, 120);
		});
	};

	const focusFirstInvalidServiceField = () => {
		nextTick(() => {
			const expandedCard = document.querySelector('.service-option--expanded');
			if (!expandedCard) return;

			const focusTarget = expandedCard.querySelector(
				'.service-inline-field__input, .service-inline-choice, .service-inline-panel__submit',
			) as HTMLElement | null;

			focusTarget?.focus?.({ preventScroll: true });
		});
	};

	const sanitizePackageWeightValue = (value: unknown): string =>
		String(value ?? '')
			.replace(',', '.')
			.replace(/[^0-9.]/g, '');

	const sanitizePackageDimensionValue = (value: unknown): string =>
		String(value ?? '').replace(/[^0-9]/g, '');

	const onPackageQuantityInput = (pack: any) => {
		packagesError.value = '';
		recalcPackageQuantity(pack);
	};

	const onPackageWeightInput = (pack: any, packIndex: number) => {
		packagesError.value = '';
		pack.weight = sanitizePackageWeightValue(pack.weight);
		calcPriceWithWeight(pack);
		sv.onInput(
			getPackageValidationKey('weight', packIndex),
			() => sv.validatePeso(getPackageValidationKey('weight', packIndex), pack.weight),
		);
	};

	const onPackageWeightBlur = (pack: any, packIndex: number) => {
		pack.weight = sanitizePackageWeightValue(pack.weight);
		calcPriceWithWeight(pack);
		sv.onBlur(
			getPackageValidationKey('weight', packIndex),
			() => sv.validatePeso(getPackageValidationKey('weight', packIndex), pack.weight),
		);
	};

	const onPackageDimensionInput = (pack: any, packIndex: number, key: PackageFieldKey) => {
		packagesError.value = '';
		pack[key] = sanitizePackageDimensionValue(pack[key]);
		calcPriceWithVolume(pack);
		sv.onInput(
			getPackageValidationKey(key, packIndex),
			() => sv.validateDimensione(getPackageValidationKey(key, packIndex), pack[key], PACKAGE_VALIDATION_LABELS[key]),
		);
	};

	const onPackageDimensionBlur = (pack: any, packIndex: number, key: PackageFieldKey) => {
		pack[key] = sanitizePackageDimensionValue(pack[key]);
		calcPriceWithVolume(pack);
		sv.onBlur(
			getPackageValidationKey(key, packIndex),
			() => sv.validateDimensione(getPackageValidationKey(key, packIndex), pack[key], PACKAGE_VALIDATION_LABELS[key]),
		);
	};

	const validatePackagesStep = (): boolean => {
		packagesError.value = '';

		const packages = editablePackages.value || [];
		if (!packages.length) {
			packagesError.value = 'Aggiungi almeno un collo prima di continuare.';
			return false;
		}

		let isValid = true;
		packages.forEach((pack: any, packIndex: number) => {
			const quantity = Number.parseInt(String(pack?.quantity ?? ''), 10);
			if (!Number.isFinite(quantity) || quantity < 1) {
				pack.quantity = 1;
			}

			(['weight', 'first_size', 'second_size', 'third_size'] as PackageFieldKey[]).forEach((fieldKey) => {
				const validationKey = getPackageValidationKey(fieldKey, packIndex);
				sv.markTouched(validationKey);
				const validator =
					fieldKey === 'weight'
						? () => sv.validatePeso(validationKey, pack.weight)
						: () => sv.validateDimensione(validationKey, pack[fieldKey], PACKAGE_VALIDATION_LABELS[fieldKey]);

				if (!validator()) {
					isValid = false;
				}
			});
		});

		if (!isValid) {
			focusFirstInvalidPackageField();
		}

		return isValid;
	};

	/**
	 * Validates the services step inline panels (content description, insurance,
	 * cash-on-delivery, etc.) and returns whether the step can advance.
	 */
	const validateServicesStep = (): boolean => {
		const ok = validateInlineServiceDetails();
		if (!ok) focusFirstInvalidServiceField();
		return ok;
	};

	return {
		packagesError,
		getPackageValidationKey,
		getPackageMetricError,
		getPackageMetricClass,
		focusFirstInvalidPackageField,
		focusFirstInvalidServiceField,
		sanitizePackageWeightValue,
		sanitizePackageDimensionValue,
		onPackageQuantityInput,
		onPackageWeightInput,
		onPackageWeightBlur,
		onPackageDimensionInput,
		onPackageDimensionBlur,
		validatePackagesStep,
		validateServicesStep,
	};
}
