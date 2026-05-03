/**
 * UI service cards for the shipment "Servizi" step.
 *
 * Keeps card-level validation, inline configuration and toggle interactions
 * separate from the broader step orchestration.
 */
import type { ComputedRef, Ref } from 'vue';
import type { Package } from '~/types';

type ShipmentService = {
	key: string;
	name: string;
	isSelected?: boolean;
	featured?: boolean;
	hasDetails?: boolean;
};

type ServiceData = {
	contrassegno: {
		importo?: string | number;
		modalita_incasso?: string;
		modalita_rimborso?: string;
		dettaglio_rimborso?: string;
	};
	assicurazione: Record<number, string | number>;
};

type ServiceCardErrors = {
	contrassegnoImporto: string;
	contrassegnoIncasso: string;
	contrassegnoRimborso: string;
	contrassegnoDettaglio: string;
	assicurazione: Record<number, string>;
};

type ShipmentServicesStore = {
	servicesArray: string[];
};

type ServiceAction = (service: ShipmentService, serviceIndex?: number) => void;

type UseShipmentStepServiceCardsArgs = {
	editablePackages: Ref<Package[]>;
	ensureServiceSelected: ServiceAction;
	expandedServiceKey: Ref<string>;
	featuredService: ComputedRef<ShipmentService | null>;
	chooseService: ServiceAction;
	removeService: ServiceAction;
	resetServicesState?: () => void;
	serviceData: Ref<ServiceData>;
	servicesList: Ref<ShipmentService[]>;
	smsEmailNotification?: Ref<boolean>;
	submitError: Ref<string | null>;
	toggleServiceDetails: ServiceAction;
	toggleServiceSelection: ServiceAction;
	shipmentFlowStore?: ShipmentServicesStore | null;
};

const CONFIGURABLE_SERVICE_KEYS = new Set(['contrassegno', 'assicurazione']);

export function useShipmentStepServiceCards({
	editablePackages,
	ensureServiceSelected,
	expandedServiceKey,
	featuredService,
	chooseService,
	removeService,
	serviceData,
	servicesList,
	submitError,
	toggleServiceDetails,
	toggleServiceSelection,
	shipmentFlowStore,
}: UseShipmentStepServiceCardsArgs) {
	const serviceCardErrors = reactive<ServiceCardErrors>({
		contrassegnoImporto: '',
		contrassegnoIncasso: '',
		contrassegnoRimborso: '',
		contrassegnoDettaglio: '',
		assicurazione: {},
	});

	const clearServiceCardErrors = () => {
		serviceCardErrors.contrassegnoImporto = '';
		serviceCardErrors.contrassegnoIncasso = '';
		serviceCardErrors.contrassegnoRimborso = '';
		serviceCardErrors.contrassegnoDettaglio = '';
		serviceCardErrors.assicurazione = {};
	};

	const updateContrassegnoField = (field: keyof ServiceData['contrassegno'], value: string | number) => {
		serviceData.value.contrassegno = {
			...serviceData.value.contrassegno,
			[field]: value,
		};
	};

	const updateAssicurazioneValue = (index: number, value: string | number) => {
		serviceData.value.assicurazione = {
			...serviceData.value.assicurazione,
			[index]: value,
		};
	};

	const clearContrassegnoError = (field: keyof Omit<ServiceCardErrors, 'assicurazione'>) => {
		serviceCardErrors[field] = '';
	};

	const clearAssicurazioneError = (index: number) => {
		serviceCardErrors.assicurazione = {
			...serviceCardErrors.assicurazione,
			[index]: '',
		};
	};

	const normalizeCurrencyInput = (value: unknown) => {
		const sanitized = String(value || '')
			.replace(/[^\d,.\s]/g, '')
			.replace(/\s+/g, '')
			.replace(/\./g, ',');
		const [integerRaw = '', ...decimalParts] = sanitized.split(',');
		const integer = integerRaw.replace(/^0+(?=\d)/, '');
		const decimals = decimalParts.join('').slice(0, 2);
		if (!integer && !decimals) return '';
		if (!decimalParts.length) return integer || '0';
		return `${integer || '0'},${decimals}`;
	};

	const parseCurrencyValue = (value: unknown) => {
		const normalized = normalizeCurrencyInput(value);
		return normalized ? Number(normalized.replace(',', '.')) || 0 : 0;
	};

	const insurancePackages = computed(() => {
		if (Array.isArray(editablePackages.value) && editablePackages.value.length > 0) {
			return editablePackages.value;
		}
		return [{ package_type: 'pacco', weight: '', first_size: '', second_size: '', third_size: '' }];
	});

	const contrassegnoIncassoOptions = [
		{ value: 'contanti', label: 'Contanti' },
		{ value: 'assegno', label: 'Assegno' },
	];
	const contrassegnoRimborsoOptions = [
		{ value: 'bonifico', label: 'Bonifico' },
		{ value: 'assegno', label: 'Assegno' },
		{ value: 'assegno_circolare', label: 'Assegno circolare' },
	];

	const requiresContrassegnoDettaglio = computed(
		() => serviceData.value.contrassegno.modalita_rimborso === 'bonifico',
	);

	const clearInlineState = () => {
		clearServiceCardErrors();
		submitError.value = null;
	};

	const isServiceSelected = (serviceKey: string) => {
		const service = servicesList.value.find((item) => item.key === serviceKey);
		return service ? shipmentFlowStore?.servicesArray.includes(service.name) : false;
	};

	const validateContrassegnoInline = (force = false) => {
		clearServiceCardErrors();
		let isValid = true;
		if (!force && !isServiceSelected('contrassegno')) return true;

		if (parseCurrencyValue(serviceData.value.contrassegno.importo) <= 0) {
			serviceCardErrors.contrassegnoImporto = 'Inserisci un importo valido.';
			isValid = false;
		}
		if (!serviceData.value.contrassegno.modalita_incasso) {
			serviceCardErrors.contrassegnoIncasso = "Seleziona l'incasso.";
			isValid = false;
		}
		if (!serviceData.value.contrassegno.modalita_rimborso) {
			serviceCardErrors.contrassegnoRimborso = 'Seleziona il rimborso.';
			isValid = false;
		}
		if (requiresContrassegnoDettaglio.value && !String(serviceData.value.contrassegno.dettaglio_rimborso || '').trim()) {
			serviceCardErrors.contrassegnoDettaglio = "Inserisci l'IBAN.";
			isValid = false;
		}
		return isValid;
	};

	const validateAssicurazioneInline = (force = false) => {
		let isValid = true;
		if (!force && !isServiceSelected('assicurazione')) return true;

		const nextErrors: Record<number, string> = {};
		insurancePackages.value.forEach((_, index) => {
			if (parseCurrencyValue(serviceData.value.assicurazione[index]) <= 0) {
				nextErrors[index] = 'Inserisci un valore.';
				isValid = false;
			}
		});

		serviceCardErrors.assicurazione = nextErrors;
		return isValid;
	};

	const validateInlineServiceDetails = () => {
		if (!validateContrassegnoInline()) {
			expandedServiceKey.value = 'contrassegno';
			submitError.value = 'Completa i dettagli del contrassegno.';
			return false;
		}
		if (!validateAssicurazioneInline()) {
			expandedServiceKey.value = 'assicurazione';
			submitError.value = "Completa i dettagli dell'assicurazione.";
			return false;
		}
		submitError.value = null;
		return true;
	};

	const isServiceExpanded = (serviceKey: string) => expandedServiceKey.value === serviceKey;
	const getServiceIndex = (service: ShipmentService) => servicesList.value.findIndex((item) => item.key === service.key);
	const featuredServiceIndex = computed(() => servicesList.value.findIndex((item) => item.featured));
	const canConfigureService = (service: ShipmentService | null | undefined) =>
		Boolean(service?.key && CONFIGURABLE_SERVICE_KEYS.has(service.key));
	const getServiceConfigureLabel = (service: ShipmentService) => (service.isSelected ? 'Modifica' : 'Configura');

	const focusInvalidServiceField = (serviceKey: string) => {
		nextTick(() => {
			const expandedCard = document.querySelector<HTMLElement>('.service-surface--expanded');
			const panel =
				document.getElementById(`service-inline-panel-${serviceKey}`) ||
				expandedCard?.querySelector<HTMLElement>('.service-panel');
			if (!panel) return;

			let focusTarget: HTMLElement | null = null;
			if (serviceKey === 'contrassegno') {
				const inputs = panel.querySelectorAll<HTMLElement>('.service-panel__input');
				if (serviceCardErrors.contrassegnoImporto) {
					focusTarget = inputs[0] || panel.querySelector<HTMLElement>('.service-panel__input');
				} else if (serviceCardErrors.contrassegnoDettaglio) {
					focusTarget = inputs[1] || panel.querySelector<HTMLElement>('.service-panel__input');
				} else if (serviceCardErrors.contrassegnoIncasso) {
					focusTarget = panel.querySelector<HTMLElement>('[aria-label="Modalita incasso contrassegno"] .sf-shared-segment');
				} else if (serviceCardErrors.contrassegnoRimborso) {
					focusTarget = panel.querySelector<HTMLElement>('[aria-label="Modalita accredito contrassegno"] .sf-shared-segment');
				}
			}

			if (serviceKey === 'assicurazione') {
				focusTarget = panel.querySelector<HTMLElement>('.service-panel__input');
			}

			(focusTarget || panel.querySelector<HTMLElement>('.service-panel__footer .btn-primary'))?.focus({
				preventScroll: true,
			});
		});
	};

	const activateConfiguredService = (service: ShipmentService) => {
		if (!canConfigureService(service)) return;
		clearInlineState();

		let isValid = true;
		if (service.key === 'contrassegno') {
			isValid = validateContrassegnoInline(true);
			if (!isValid) submitError.value = 'Completa i dettagli del contrassegno.';
		}
		if (service.key === 'assicurazione') {
			isValid = validateAssicurazioneInline(true);
			if (!isValid) submitError.value = "Completa i dettagli dell'assicurazione.";
		}
		if (!isValid) {
			expandedServiceKey.value = service.key;
			focusInvalidServiceField(service.key);
			return;
		}
		if (!service.isSelected) {
			const serviceIndex = getServiceIndex(service);
			if (serviceIndex === -1) return;
			ensureServiceSelected(service, serviceIndex);
		}
		expandedServiceKey.value = '';
	};

	const toggleRegularService = (service: ShipmentService) => {
		const serviceIndex = getServiceIndex(service);
		if (serviceIndex === -1) return;
		clearInlineState();
		toggleServiceSelection(service, serviceIndex);
	};

	const toggleServiceAccordion = (service: ShipmentService) => {
		const serviceIndex = getServiceIndex(service);
		if (serviceIndex === -1) return;
		clearInlineState();
		toggleServiceDetails(service, serviceIndex);
	};

	const handleServicePrimaryAction = (service: ShipmentService) => {
		if (canConfigureService(service)) {
			toggleServiceAccordion(service);
			return;
		}
		toggleRegularService(service);
	};

	const removeConfiguredService = (service: ShipmentService) => {
		if (!canConfigureService(service) || !service.isSelected) return;
		clearInlineState();
		removeService(service);
	};

	const toggleFeaturedService = () => {
		if (!featuredService.value || featuredServiceIndex.value === -1) return;
		clearInlineState();
		chooseService(featuredService.value, featuredServiceIndex.value);
	};

	return {
		serviceCardErrors,
		clearServiceCardErrors,
		updateContrassegnoField,
		updateAssicurazioneValue,
		clearContrassegnoError,
		clearAssicurazioneError,
		normalizeCurrencyInput,
		parseCurrencyValue,
		contrassegnoIncassoOptions,
		contrassegnoRimborsoOptions,
		requiresContrassegnoDettaglio,
		insurancePackages,
		validateContrassegnoInline,
		validateAssicurazioneInline,
		validateInlineServiceDetails,
		isServiceExpanded,
		featuredServiceIndex,
		canConfigureService,
		getServiceConfigureLabel,
		activateConfiguredService,
		handleServicePrimaryAction,
		removeConfiguredService,
		toggleRegularService,
		toggleServiceAccordion,
		toggleFeaturedService,
	};
}
