/**
 * Reusable validation handlers for the shipment funnel.
 *
 * The composable keeps package/service validation close to the UI while the
 * field rules remain inside the smart-validation service passed by the page.
 */
import type { Ref } from 'vue';
import type { Package } from '~/types';

type PackageFieldKey = 'weight' | 'first_size' | 'second_size' | 'third_size';

type SmartValidation = {
	getError: (key: string) => string | null;
	errorClass: (key: string, baseClass: string) => string;
	onInput: (key: string, validator: () => boolean) => void;
	onBlur: (key: string, validator: () => boolean) => void;
	validatePeso: (key: string, value: Package[PackageFieldKey]) => boolean;
	validateDimensione: (key: string, value: Package[PackageFieldKey], label: string) => boolean;
	markTouched: (key: string) => void;
};

type UseFunnelValidationOptions = {
	sv: SmartValidation;
	editablePackages: Ref<Package[]>;
	calcPriceWithWeight: (pack: Package) => void;
	calcPriceWithVolume: (pack: Package) => void;
	recalcPackageQuantity: (pack: Package) => void;
	validateInlineServiceDetails: () => boolean;
};

const PACKAGE_FIELDS: PackageFieldKey[] = ['weight', 'first_size', 'second_size', 'third_size'];

export const PACKAGE_VALIDATION_LABELS: Record<PackageFieldKey, string> = {
	weight: 'Peso',
	first_size: 'Lato 1',
	second_size: 'Lato 2',
	third_size: 'Lato 3',
};

export const PACKAGE_VALIDATION_KEYS: Record<PackageFieldKey, string> = {
	weight: 'peso',
	first_size: 'first_size',
	second_size: 'second_size',
	third_size: 'third_size',
};

export function useFunnelValidation({
	sv,
	editablePackages,
	calcPriceWithWeight,
	calcPriceWithVolume,
	recalcPackageQuantity,
	validateInlineServiceDetails,
}: UseFunnelValidationOptions) {
	const packagesError = ref('');

	const getPackageValidationKey = (fieldKey: PackageFieldKey, packIndex: number) =>
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
				document.querySelector<HTMLElement>(firstErrorSelector) ||
				document.querySelector<HTMLElement>('.package-metric-input, .quantity-stepper__input');
			if (!target) return;
			target.scrollIntoView({ behavior: 'smooth', block: 'center' });
			window.setTimeout(() => target.focus({ preventScroll: true }), 120);
		});
	};

	const focusFirstInvalidServiceField = () => {
		nextTick(() => {
			const expandedCard = document.querySelector<HTMLElement>('.service-surface--expanded');
			const focusTarget = expandedCard?.querySelector<HTMLElement>(
				'.service-panel__input, .sf-shared-segment, .service-panel__footer .btn-primary',
			);
			focusTarget?.focus({ preventScroll: true });
		});
	};

	const sanitizePackageWeightValue = (value: unknown) =>
		String(value ?? '')
			.replace(',', '.')
			.replace(/[^0-9.]/g, '');

	const sanitizePackageDimensionValue = (value: unknown) => String(value ?? '').replace(/\D/g, '');

	const onPackageQuantityInput = (pack: Package) => {
		packagesError.value = '';
		recalcPackageQuantity(pack);
	};

	const onPackageWeightInput = (pack: Package, packIndex: number) => {
		packagesError.value = '';
		pack.weight = sanitizePackageWeightValue(pack.weight);
		calcPriceWithWeight(pack);
		sv.onInput(getPackageValidationKey('weight', packIndex), () =>
			sv.validatePeso(getPackageValidationKey('weight', packIndex), pack.weight),
		);
	};

	const onPackageWeightBlur = (pack: Package, packIndex: number) => {
		pack.weight = sanitizePackageWeightValue(pack.weight);
		calcPriceWithWeight(pack);
		sv.onBlur(getPackageValidationKey('weight', packIndex), () =>
			sv.validatePeso(getPackageValidationKey('weight', packIndex), pack.weight),
		);
	};

	const onPackageDimensionInput = (pack: Package, packIndex: number, key: PackageFieldKey) => {
		packagesError.value = '';
		pack[key] = sanitizePackageDimensionValue(pack[key]);
		calcPriceWithVolume(pack);
		sv.onInput(getPackageValidationKey(key, packIndex), () =>
			sv.validateDimensione(getPackageValidationKey(key, packIndex), pack[key], PACKAGE_VALIDATION_LABELS[key]),
		);
	};

	const onPackageDimensionBlur = (pack: Package, packIndex: number, key: PackageFieldKey) => {
		pack[key] = sanitizePackageDimensionValue(pack[key]);
		calcPriceWithVolume(pack);
		sv.onBlur(getPackageValidationKey(key, packIndex), () =>
			sv.validateDimensione(getPackageValidationKey(key, packIndex), pack[key], PACKAGE_VALIDATION_LABELS[key]),
		);
	};

	const validatePackagesStep = () => {
		packagesError.value = '';
		const packages = editablePackages.value || [];
		if (!packages.length) {
			packagesError.value = 'Aggiungi almeno un collo prima di continuare.';
			return false;
		}

		let isValid = true;
		packages.forEach((pack, packIndex) => {
			const quantity = Number.parseInt(String(pack.quantity ?? ''), 10);
			if (!Number.isFinite(quantity) || quantity < 1) pack.quantity = 1;

			PACKAGE_FIELDS.forEach((fieldKey) => {
				const validationKey = getPackageValidationKey(fieldKey, packIndex);
				sv.markTouched(validationKey);
				const validator =
					fieldKey === 'weight'
						? () => sv.validatePeso(validationKey, pack.weight)
						: () => sv.validateDimensione(validationKey, pack[fieldKey], PACKAGE_VALIDATION_LABELS[fieldKey]);
				if (!validator()) isValid = false;
			});
		});

		if (!isValid) focusFirstInvalidPackageField();
		return isValid;
	};

	const validateServicesStep = () => {
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
