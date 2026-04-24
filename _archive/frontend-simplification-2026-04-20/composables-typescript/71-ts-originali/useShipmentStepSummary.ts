import type { Ref } from 'vue';
import { calculateShipmentServiceSurcharge } from '~/utils/shipmentServicePricing';
import type { PudoPoint, ShipmentDetails } from '~/types';
import {
	formatPriceAmount,
	getPackageDimensionLabel,
	getPackageTypeIcon,
	getPackageTypeLabel,
	getPackagesTotal,
	normalizePackageTypeLabel,
	packageTypeVisualMap,
	parsePriceAmount,
	pickBestPriceAmount,
	resolvePackageTypeInfoForList,
	type PackageLike,
} from './useShipmentSummaryCalculations';
import {
	useAccordionHeightTransitions,
	useShipmentStepVisibility,
} from './useShipmentStepVisibility';

interface AddressLike {
	city?: string;
	postal_code?: string;
	address?: string;
	address_number?: string;
}

interface SessionValue {
	data?: {
		shipment_details?: Partial<ShipmentDetails>;
		origin_address?: AddressLike;
		destination_address?: AddressLike;
		packages?: PackageLike[];
		total_price?: number | string | null;
		services?: {
			service_type?: string;
			serviceData?: Record<string, unknown>;
			sms_email_notification?: boolean;
		};
		sms_email_notification?: boolean;
		delivery_mode?: string;
		selected_pudo?: PudoPoint | null;
	};
}

interface UserStoreLike {
	servicesArray: string[];
	serviceData?: Record<string, unknown>;
	pendingShipment?: {
		packages?: PackageLike[];
		services?: {
			service_type?: string;
			serviceData?: Record<string, unknown>;
			sms_email_notification?: boolean;
		};
		delivery_mode?: string;
		selected_pudo?: PudoPoint | null;
	};
	packages?: PackageLike[] | { value?: PackageLike[] };
	totalPrice?: number | string | null;
	originAddressData?: AddressLike | null;
	destinationAddressData?: AddressLike | null;
	shipmentDetails?: Partial<ShipmentDetails>;
	deliveryMode?: string;
	selectedPudo?: (PudoPoint & { zip_code?: string }) | null;
	smsEmailNotification?: boolean;
}

interface SummaryArgs {
	activeAccordionStep: Ref<string>;
	destinationAddress: Ref<AddressLike>;
	editablePackages: Ref<PackageLike[]>;
	normalizeLocationText: (value: string) => string;
	originAddress: Ref<AddressLike>;
	session: Ref<SessionValue | null>;
	showAddressFields: Ref<boolean>;
	status: Ref<string>;
	stepsRef: Ref<HTMLElement | null>;
	shipmentFlowStore: UserStoreLike;
}

interface MiniStep {
	id: number;
	label: string;
	to: string;
	isActive: boolean;
	isCompleted: boolean;
	isClickable: boolean;
}

export const useShipmentStepSummary = ({
	activeAccordionStep,
	destinationAddress,
	editablePackages,
	normalizeLocationText,
	originAddress,
	session,
	showAddressFields,
	status,
	stepsRef,
	shipmentFlowStore,
}: SummaryArgs) => {
	const { priceBands, loadPriceBands } = usePriceBands();
	const { stepsVisible, scheduleStepsVisibilityUpdate } = useShipmentStepVisibility({ stepsRef, status });

	onMounted(() => {
		loadPriceBands();
	});

	const summaryPackageLabel = computed<string>(() => {
		const count = editablePackages.value.length;
		return `${count} ${count === 1 ? 'collo' : 'colli'}`;
	});

	const summaryPackageTypeInfo = computed(() => resolvePackageTypeInfoForList(editablePackages.value));

	const summaryOriginCity = computed<string>(() => {
		const liveCity = String(originAddress.value?.city || '').trim();
		if (liveCity) return liveCity;
		if (showAddressFields.value) return '—';
		return (
			shipmentFlowStore.originAddressData?.city
			|| shipmentFlowStore.shipmentDetails?.origin_city
			|| session.value?.data?.shipment_details?.origin_city
			|| '—'
		);
	});

	const summaryDestinationCity = computed<string>(() => {
		const pudoCity = String(shipmentFlowStore.selectedPudo?.city || '').trim();
		if (pudoCity) return pudoCity;

		const liveCity = String(destinationAddress.value?.city || '').trim();
		if (liveCity) return liveCity;
		if (showAddressFields.value) return '—';
		return (
			shipmentFlowStore.destinationAddressData?.city
			|| shipmentFlowStore.shipmentDetails?.destination_city
			|| session.value?.data?.shipment_details?.destination_city
			|| '—'
		);
	});

	const summaryRouteLabel = computed<string>(() => `${summaryOriginCity.value} → ${summaryDestinationCity.value}`);
	const normalizeRouteText = (value: unknown): string => normalizeLocationText(String(value || '').replace(/\s+/g, ' '));
	const normalizeRouteNumber = (value: unknown): string => String(value || '').trim().toLowerCase().replace(/\s+/g, '');

	const routeConsistencyState = computed(() => {
		const originCity = normalizeRouteText(originAddress.value?.city);
		const destinationCity = normalizeRouteText(
			shipmentFlowStore.selectedPudo?.city
			|| destinationAddress.value?.city
			|| shipmentFlowStore.shipmentDetails?.destination_city,
		);
		if (!originCity || !destinationCity) {
			return { blocking: false, warning: false, message: '' };
		}

		const originCap = String(originAddress.value?.postal_code || '').trim();
		const destinationCap = String(
			shipmentFlowStore.selectedPudo?.zip_code
			|| destinationAddress.value?.postal_code
			|| shipmentFlowStore.shipmentDetails?.destination_postal_code
			|| '',
		).trim();
		const sameCity = originCity === destinationCity;
		const sameCap = !!originCap && !!destinationCap && originCap === destinationCap;

		const originStreet = normalizeRouteText(originAddress.value?.address);
		const destinationStreet = normalizeRouteText(
			shipmentFlowStore.selectedPudo?.address
			|| destinationAddress.value?.address,
		);
		const originNumber = normalizeRouteNumber(originAddress.value?.address_number);
		const destinationNumber = normalizeRouteNumber(
			shipmentFlowStore.selectedPudo ? 'SNC' : destinationAddress.value?.address_number,
		);
		const sameAddress =
			sameCity
			&& sameCap
			&& !!originStreet
			&& !!destinationStreet
			&& originStreet === destinationStreet
			&& !!originNumber
			&& !!destinationNumber
			&& originNumber === destinationNumber;

		if (sameAddress) {
			return {
				blocking: true,
				warning: true,
				message: 'Partenza e destinazione coincidono. Inserisci una destinazione diversa prima di continuare.',
			};
		}

		if (sameCity && sameCap) {
			return {
				blocking: false,
				warning: true,
				message: 'Tratta locale: verifica disponibilità del servizio BRT per questa combinazione di indirizzi.',
			};
		}

		return { blocking: false, warning: false, message: '' };
	});

	const routeWarningMessage = computed<string>(() => (
		routeConsistencyState.value.warning ? routeConsistencyState.value.message : ''
	));

	const selectedServicesFromState = computed<string[]>(() => {
		const local = Array.isArray(shipmentFlowStore.servicesArray) ? shipmentFlowStore.servicesArray.filter(Boolean) : [];
		if (local.length) return local;

		const persisted = String(
			shipmentFlowStore.pendingShipment?.services?.service_type
			|| session.value?.data?.services?.service_type
			|| '',
		)
			.split(',')
			.map((service) => service.trim())
			.filter(Boolean);

		return persisted;
	});

	const summaryServicesLabel = computed<string>(() => {
		const selected = selectedServicesFromState.value;
		return selected.length ? selected.join(', ') : 'Nessun servizio';
	});

	const summaryServicesItems = computed<string[]>(() => {
		const selected = selectedServicesFromState.value;
		return selected.length ? selected : ['Nessun servizio selezionato'];
	});

	const summaryDimensionsLabel = computed<string>(() => {
		const dimensionRows: Array<{ label: string; qty: number }> = [];
		for (const pack of editablePackages.value || []) {
			const label = getPackageDimensionLabel(pack);
			if (!label) continue;
			const qty = Math.max(1, Number(pack?.quantity) || 1);
			dimensionRows.push({ label, qty });
		}

		if (!dimensionRows.length) return '—';

		const totalQty = dimensionRows.reduce((sum, item) => sum + item.qty, 0);
		const primary = dimensionRows[0]?.label ?? '';

		if (dimensionRows.length === 1 && totalQty === 1) return primary;
		if (dimensionRows.length === 1) return `${primary} × ${totalQty}`;
		return `${primary} +${Math.max(totalQty - 1, 1)}`;
	});

	const summaryDimensionsItems = computed<Array<{ label: string; icon: string; type: string }>>(() => {
		const grouped = new Map<string, { type: string; dimension: string; icon: string; count: number }>();
		for (const pack of (editablePackages.value || [])) {
			const dimensionLabel = getPackageDimensionLabel(pack) || 'Misure non definite';
			const qty = Math.max(1, Number(pack?.quantity) || 1);
			const typeLabel = getPackageTypeLabel(pack);
			const groupKey = `${normalizePackageTypeLabel(typeLabel)}|${dimensionLabel}`;
			if (!grouped.has(groupKey)) {
				grouped.set(groupKey, {
					type: typeLabel,
					dimension: dimensionLabel,
					icon: getPackageTypeIcon(pack),
					count: 0,
				});
			}
			const current = grouped.get(groupKey)!;
			current.count += qty;
		}

		const rows = Array.from(grouped.values()).map((item) => ({
			label: item.count > 1 ? `${item.count}x ${item.type}: ${item.dimension}` : `${item.type}: ${item.dimension}`,
			icon: item.icon,
			type: item.type,
		}));

		return rows.length
			? rows
			: [{ label: 'Misure non disponibili', icon: (packageTypeVisualMap.pacco?.icon ?? ''), type: 'Pacco' }];
	});

	const canExpandSummaryServices = computed<boolean>(() => (
		summaryServicesItems.value.length > 1 || summaryServicesLabel.value.length > 26
	));
	const canExpandSummaryDimensions = computed<boolean>(() => (
		summaryDimensionsItems.value.length > 1 || summaryDimensionsLabel.value.length > 20
	));

	const summaryTotalPrice = computed<string>(() => {
		const sessionPackagesAmount = getPackagesTotal(session.value?.data?.packages);
		const storePackages = Array.isArray(shipmentFlowStore.packages)
			? shipmentFlowStore.packages
			: (shipmentFlowStore.packages as { value?: PackageLike[] } | undefined)?.value;
		const storePackagesAmount = getPackagesTotal(storePackages);
		const pendingAmount = getPackagesTotal(shipmentFlowStore.pendingShipment?.packages);
		const editableAmount = getPackagesTotal(editablePackages.value);

		const baseAmount = pickBestPriceAmount([
			pendingAmount,
			editableAmount,
			sessionPackagesAmount,
			storePackagesAmount,
			parsePriceAmount(shipmentFlowStore.totalPrice),
			parsePriceAmount(session.value?.data?.total_price),
		]);

		const pendingServices = shipmentFlowStore.pendingShipment?.services || {};
		const sessionServices = session.value?.data?.services || {};
		const selectedServices = Array.isArray(shipmentFlowStore.servicesArray) && shipmentFlowStore.servicesArray.length
			? shipmentFlowStore.servicesArray
			: (pendingServices.service_type || sessionServices.service_type || '');
		const selectedServiceData = Object.keys(shipmentFlowStore.serviceData || {}).length
			? shipmentFlowStore.serviceData
			: (pendingServices.serviceData || sessionServices.serviceData || {});
		const notificationsEnabled = Boolean(
			shipmentFlowStore.smsEmailNotification
			|| pendingServices.sms_email_notification
			|| (pendingServices.serviceData as Record<string, unknown> | undefined)?.sms_email_notification
			|| session.value?.data?.sms_email_notification
			|| sessionServices.sms_email_notification
			|| (sessionServices.serviceData as Record<string, unknown> | undefined)?.sms_email_notification,
		);

		const serviceSurcharge = calculateShipmentServiceSurcharge({
			selectedServices,
			serviceData: selectedServiceData,
			smsEmailNotification: notificationsEnabled,
			pricingConfig: priceBands.value as unknown,
			packages: editablePackages.value?.length
				? editablePackages.value
				: (shipmentFlowStore.pendingShipment?.packages || session.value?.data?.packages || []),
			originAddress: originAddress.value || shipmentFlowStore.originAddressData || session.value?.data?.origin_address || {},
			destinationAddress: destinationAddress.value || shipmentFlowStore.destinationAddressData || session.value?.data?.destination_address || {},
			deliveryMode: shipmentFlowStore.deliveryMode || shipmentFlowStore.pendingShipment?.delivery_mode || session.value?.data?.delivery_mode || 'home',
			selectedPudo: shipmentFlowStore.selectedPudo || shipmentFlowStore.pendingShipment?.selected_pudo || session.value?.data?.selected_pudo || null,
		} as Parameters<typeof calculateShipmentServiceSurcharge>[0]).total;

		return formatPriceAmount(baseAmount + serviceSurcharge);
	});

	const currentShipmentStep = computed<number>(() => {
		if (activeAccordionStep.value === 'payment' || activeAccordionStep.value === 'confirm') return 4;
		if (activeAccordionStep.value === 'addresses' || showAddressFields.value) return 3;
		if (activeAccordionStep.value === 'packages') return 1;
		return 2;
	});

	const summaryMiniSteps = computed<MiniStep[]>(() => {
		const defs = [
			{ id: 1, label: 'Colli', to: '/la-tua-spedizione/2?step=colli' },
			{ id: 2, label: 'Servizi', to: '/la-tua-spedizione/2' },
			{ id: 3, label: 'Indirizzi', to: '/la-tua-spedizione/2?step=ritiro' },
			{ id: 4, label: 'Pagamento', to: '/la-tua-spedizione/2?step=pagamento' },
		];

		return defs.map((step) => {
			const isActive = step.id === currentShipmentStep.value;
			const isCompleted = step.id < currentShipmentStep.value;
			return {
				...step,
				isActive,
				isCompleted,
				isClickable: isCompleted,
			};
		});
	});

	const showSummaryMiniSteps = computed<boolean>(() => !stepsVisible.value);

	const goToSummaryMiniStep = async (step: MiniStep): Promise<void> => {
		if (!step?.isClickable) return;
		await navigateTo(step.to);
	};

	const summaryExpanded = ref<boolean>(false);
	const summaryDetailPanel = ref<string | null>(null);

	const toggleSummaryDetailPanel = (panel: string): void => {
		summaryDetailPanel.value = summaryDetailPanel.value === panel ? null : panel;
	};

	watch(summaryExpanded, (isOpen) => {
		if (!isOpen) summaryDetailPanel.value = null;
		scheduleStepsVisibilityUpdate();
	});

	const { onAccordionEnter, onAccordionAfterEnter, onAccordionLeave } = useAccordionHeightTransitions();

	return {
		canExpandSummaryDimensions,
		canExpandSummaryServices,
		currentShipmentStep,
		goToSummaryMiniStep,
		onAccordionAfterEnter,
		onAccordionEnter,
		onAccordionLeave,
		routeConsistencyState,
		routeWarningMessage,
		showSummaryMiniSteps,
		summaryDetailPanel,
		summaryDimensionsItems,
		summaryDimensionsLabel,
		summaryDestinationCity,
		summaryExpanded,
		summaryMiniSteps,
		summaryOriginCity,
		summaryPackageLabel,
		summaryPackageTypeInfo,
		summaryRouteLabel,
		summaryServicesItems,
		summaryServicesLabel,
		summaryTotalPrice,
		toggleSummaryDetailPanel,
	};
};
