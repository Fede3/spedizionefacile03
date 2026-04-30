/**
 * useShipmentStepSummary — orchestra le ~30 computed del riepilogo funnel
 * (cart, session, store, props).
 *
 * Helper puri (parse/format prezzo, cleanDisplayText, ecc.) sono in
 * utils/shipmentSummaryHelpers.ts per testabilita' isolata.
 */
import { calculateShipmentServiceSurcharge } from "~/utils/shipmentServicePricing";
import {
	cleanDisplayText as cleanDisplayTextHelper,
	firstMeaningfulValue as firstMeaningfulValueHelper,
	parsePriceAmount,
	formatPriceAmount,
	pickBestPriceAmount,
	normalizePackagePrice,
	getPackageLineAmount,
	getPackagesTotal,
} from "~/utils/shipmentSummaryHelpers";
import type { Ref } from 'vue';

type SummaryAddress = {
	name?: string | null;
	surname?: string | null;
	city?: string | null;
	postal_code?: string | null;
	zip_code?: string | null;
	address?: string | null;
	address_number?: string | null;
	province?: string | null;
	[key: string]: unknown;
};
type SummaryPackage = {
	package_type?: string | null;
	quantity?: number | string | null;
	weight?: number | string | null;
	first_size?: number | string | null;
	second_size?: number | string | null;
	third_size?: number | string | null;
	length?: number | string | null;
	width?: number | string | null;
	height?: number | string | null;
	single_price?: number | string | null;
	single_priceOrig?: number | string | null;
	weight_price?: number | string | null;
	volume_price?: number | string | null;
	[key: string]: unknown;
};
type SummaryPudo = SummaryAddress & {
	pudo_id?: string | null;
	name?: string | null;
};
type SummaryServices = {
	service_type?: string | null;
	serviceData?: Record<string, unknown>;
	sms_email_notification?: boolean;
	[key: string]: unknown;
};
type SummarySessionData = {
	packages?: SummaryPackage[];
	shipment_details?: Record<string, unknown>;
	origin_address?: SummaryAddress;
	destination_address?: SummaryAddress;
	selected_pudo?: SummaryPudo | null;
	services?: SummaryServices;
	total_price?: number | string | null;
	sms_email_notification?: boolean;
	delivery_mode?: string;
};
type SummarySession = {
	data?: SummarySessionData;
};
type PendingShipment = {
	packages?: SummaryPackage[];
	origin_address?: SummaryAddress;
	destination_address?: SummaryAddress;
	selected_pudo?: SummaryPudo | null;
	services?: SummaryServices;
	delivery_mode?: string;
};
type ShipmentFlowStoreLike = {
	originAddressData?: SummaryAddress | null;
	destinationAddressData?: SummaryAddress | null;
	selectedPudo?: SummaryPudo | null;
	shipmentDetails?: Record<string, unknown>;
	pendingShipment?: PendingShipment | null;
	servicesArray?: string[];
	serviceData?: Record<string, unknown>;
	smsEmailNotification?: boolean;
	totalPrice?: number | string | null;
	packages?: SummaryPackage[] | Ref<SummaryPackage[]>;
	deliveryMode?: string;
};
type MiniStep = {
	id: number;
	label: string;
	to: string;
	isActive?: boolean;
	isCompleted?: boolean;
	isClickable?: boolean;
};
type SummaryPanel = 'services' | 'dimensions' | null;
type UseShipmentStepSummaryArgs = {
	destinationAddress: Ref<SummaryAddress>;
	editablePackages: Ref<SummaryPackage[]>;
	normalizeLocationText: (value: string) => string;
	originAddress: Ref<SummaryAddress>;
	session: Ref<SummarySession | null>;
	showAddressFields: Ref<boolean>;
	status: Ref<string>;
	stepsRef: Ref<HTMLElement | null>;
	shipmentFlowStore?: ShipmentFlowStoreLike | null;
};

const PACKAGE_TYPE_VISUAL_MAP: Record<string, { label: string; icon: string }> = {
	pacco: { label: 'Pacco', icon: '/img/quote/first-step/pack.png' },
	pallet: { label: 'Pallet', icon: '/img/quote/first-step/pallet.png' },
	valigia: { label: 'Valigia', icon: '/img/quote/first-step/suitcase.png' },
	busta: { label: 'Busta', icon: '/img/quote/first-step/envelope.png' },
	wallet: { label: 'Wallet', icon: '/img/quote/first-step/suitcase.png' },
};
const DEFAULT_PACKAGE_VISUAL = PACKAGE_TYPE_VISUAL_MAP.pacco as { label: string; icon: string };

const getStorePackages = (source?: SummaryPackage[] | Ref<SummaryPackage[]>): SummaryPackage[] => {
	if (Array.isArray(source)) return source;
	if (source && Array.isArray(source.value)) return source.value;
	return [];
};

export const useShipmentStepSummary = ({
	destinationAddress,
	editablePackages,
	normalizeLocationText,
	originAddress,
	session,
	showAddressFields,
	status,
	stepsRef,
	shipmentFlowStore,
}: UseShipmentStepSummaryArgs) => {
	const { priceBands, loadPriceBands } = usePriceBands();
	const stepsVisible = ref(true);
	const clientDraftSummaryReady = ref(false);
	let stepsObserver: IntersectionObserver | null = null;
	let stepsVisibilityRaf: number | null = null;

	onMounted(() => {
		loadPriceBands();
		nextTick(() => {
			clientDraftSummaryReady.value = true;
		});
	});

	// Wrapper locali iniettano normalizeLocationText (dipendenza ref) negli helper puri.
	const cleanDisplayText = (value: unknown): string => cleanDisplayTextHelper(value, normalizeLocationText);
	const firstMeaningfulValue = (...candidates: unknown[]): string => firstMeaningfulValueHelper(candidates, normalizeLocationText);
	// parsePriceAmount, formatPriceAmount, pickBestPriceAmount, normalizePackagePrice,
	// getPackageLineAmount, getPackagesTotal: importati da utils/shipmentSummaryHelpers.

	const summaryPackagesSource = computed(() => {
		if (clientDraftSummaryReady.value) {
			return Array.isArray(editablePackages.value) ? editablePackages.value : [];
		}
		return Array.isArray(session.value?.data?.packages) ? session.value.data.packages : [];
	});

	const summaryPackageLabel = computed(() => {
		const count = summaryPackagesSource.value.length;
		return `${count} ${count === 1 ? 'collo' : 'colli'}`;
	});

	const normalizePackageTypeLabel = (value: unknown): string => {
		if (!value) return 'pacco';
		return String(value).trim().toLowerCase();
	};

	const getPackageTypeLabel = (pack: SummaryPackage): string => {
		const normalized = normalizePackageTypeLabel(pack?.package_type || 'Pacco');
		const mapped = PACKAGE_TYPE_VISUAL_MAP[normalized];
		if (mapped?.label) return mapped.label;
		return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Pacco';
	};

	const getPackageTypeIcon = (pack: SummaryPackage): string => {
		const normalized = normalizePackageTypeLabel(pack?.package_type || 'Pacco');
		const mapped = PACKAGE_TYPE_VISUAL_MAP[normalized];
		return mapped?.icon || DEFAULT_PACKAGE_VISUAL.icon;
	};

	const summaryPackageTypeInfo = computed(() => {
		const types = (summaryPackagesSource.value || [])
			.map((pack) => normalizePackageTypeLabel(pack?.package_type || 'Pacco'))
			.filter(Boolean);

		if (!types.length) {
			return DEFAULT_PACKAGE_VISUAL;
		}

		const uniqueTypes = [...new Set(types)];
		if (uniqueTypes.length === 1) {
			const normalized = uniqueTypes[0] || 'pacco';
			const match = PACKAGE_TYPE_VISUAL_MAP[normalized];
			if (match) return match;

			const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);
			return { label, icon: DEFAULT_PACKAGE_VISUAL.icon };
		}

		return { label: 'Misto', icon: DEFAULT_PACKAGE_VISUAL.icon };
	});

	const summaryOriginCity = computed(() => {
		if (!clientDraftSummaryReady.value) {
			return session.value?.data?.shipment_details?.origin_city || 'â€”';
		}
		const liveCity = String(originAddress.value?.city || '').trim();
		if (liveCity) return liveCity;
		if (showAddressFields.value) return '—';
		return (
			shipmentFlowStore?.originAddressData?.city
			|| shipmentFlowStore?.shipmentDetails?.origin_city
			|| session.value?.data?.shipment_details?.origin_city
			|| '—'
		);
	});

	const summaryDestinationCity = computed(() => {
		if (!clientDraftSummaryReady.value) {
			return session.value?.data?.shipment_details?.destination_city || 'â€”';
		}
		const pudoCity = String(shipmentFlowStore?.selectedPudo?.city || '').trim();
		if (pudoCity) return pudoCity;

		const liveCity = String(destinationAddress.value?.city || '').trim();
		if (liveCity) return liveCity;
		if (showAddressFields.value) return '—';
		return (
			shipmentFlowStore?.destinationAddressData?.city
			|| shipmentFlowStore?.shipmentDetails?.destination_city
			|| session.value?.data?.shipment_details?.destination_city
			|| '—'
		);
	});

	const resolvedSummaryOriginCity = computed(() => (
		firstMeaningfulValue(
			originAddress.value?.city,
			shipmentFlowStore?.originAddressData?.city,
			shipmentFlowStore?.pendingShipment?.origin_address?.city,
			session.value?.data?.origin_address?.city,
			shipmentFlowStore?.shipmentDetails?.origin_city,
			session.value?.data?.shipment_details?.origin_city,
			summaryOriginCity.value,
		) || '—'
	));

	const resolvedSummaryDestinationCity = computed(() => (
		firstMeaningfulValue(
			shipmentFlowStore?.selectedPudo?.city,
			shipmentFlowStore?.pendingShipment?.selected_pudo?.city,
			session.value?.data?.selected_pudo?.city,
			destinationAddress.value?.city,
			shipmentFlowStore?.destinationAddressData?.city,
			shipmentFlowStore?.pendingShipment?.destination_address?.city,
			session.value?.data?.destination_address?.city,
			shipmentFlowStore?.shipmentDetails?.destination_city,
			session.value?.data?.shipment_details?.destination_city,
			summaryDestinationCity.value,
		) || '—'
	));

	const resolvedSummaryRouteLabel = computed(() => `${resolvedSummaryOriginCity.value} → ${resolvedSummaryDestinationCity.value}`);
	const normalizeRouteText = (value: unknown): string => normalizeLocationText(String(value || '').replace(/\s+/g, ' '));
	const normalizeRouteNumber = (value: unknown): string => String(value || '').trim().toLowerCase().replace(/\s+/g, '');
	const routeConsistencyState = computed(() => {
		const originCity = normalizeRouteText(originAddress.value?.city);
		const destinationCity = normalizeRouteText(
			shipmentFlowStore?.selectedPudo?.city
			|| destinationAddress.value?.city
			|| shipmentFlowStore?.shipmentDetails?.destination_city
		);
		if (!originCity || !destinationCity) {
			return { blocking: false, warning: false, message: '' };
		}

		const originCap = String(originAddress.value?.postal_code || '').trim();
		const destinationCap = String(
			shipmentFlowStore?.selectedPudo?.zip_code
			|| destinationAddress.value?.postal_code
			|| shipmentFlowStore?.shipmentDetails?.destination_postal_code
			|| ''
		).trim();
		const sameCity = originCity === destinationCity;
		const sameCap = !!originCap && !!destinationCap && originCap === destinationCap;

		const originStreet = normalizeRouteText(originAddress.value?.address);
		const destinationStreet = normalizeRouteText(
			shipmentFlowStore?.selectedPudo?.address
			|| destinationAddress.value?.address
		);
		const originNumber = normalizeRouteNumber(originAddress.value?.address_number);
		const destinationNumber = normalizeRouteNumber(
			shipmentFlowStore?.selectedPudo ? 'SNC' : destinationAddress.value?.address_number
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

	const routeWarningMessage = computed(() => (
		routeConsistencyState.value.warning ? routeConsistencyState.value.message : ''
	));
	const selectedServicesFromState = computed(() => {
		const local = Array.isArray(shipmentFlowStore?.servicesArray) ? shipmentFlowStore?.servicesArray.filter(Boolean) : [];
		if (local.length) return local;

		const persisted = String(
			shipmentFlowStore?.pendingShipment?.services?.service_type
			|| session.value?.data?.services?.service_type
			|| "",
		)
			.split(",")
			.map((service) => service.trim())
			.filter(Boolean);

		return persisted;
	});
	const summaryServicesLabel = computed(() => {
		const selected = selectedServicesFromState.value;
		return selected.length ? selected.join(', ') : 'Nessun servizio';
	});
	const summaryServicesItems = computed(() => {
		const selected = selectedServicesFromState.value;
		return selected.length ? selected : ['Nessun servizio selezionato'];
	});

	const normalizeDimensionValue = (value: unknown): number | null => {
		const parsed = Number(value);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
	};

	const getPackageDimensionLabel = (pack: SummaryPackage): string | null => {
		const side1 = normalizeDimensionValue(pack?.first_size ?? pack?.length);
		const side2 = normalizeDimensionValue(pack?.second_size ?? pack?.width);
		const side3 = normalizeDimensionValue(pack?.third_size ?? pack?.height);
		if (!side1 || !side2 || !side3) return null;
		return `${side1}×${side2}×${side3} cm`;
	};

	const summaryDimensionsLabel = computed(() => {
		const dimensionRows: Array<{ label: string; qty: number }> = [];
		for (const pack of editablePackages.value || []) {
			const label = getPackageDimensionLabel(pack);
			if (!label) continue;
			const qty = Math.max(1, Number(pack?.quantity) || 1);
			dimensionRows.push({ label, qty });
		}

		if (!dimensionRows.length) return '—';

		const totalQty = dimensionRows.reduce((sum, item) => sum + item.qty, 0);
		const primary = dimensionRows[0]?.label || 'Misure non definite';

		if (dimensionRows.length === 1 && totalQty === 1) return primary;
		if (dimensionRows.length === 1) return `${primary} × ${totalQty}`;
		return `${primary} +${Math.max(totalQty - 1, 1)}`;
	});
	const summaryDimensionsItems = computed(() => {
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
			const current = grouped.get(groupKey);
			if (!current) continue;
			current.count += qty;
		}

		const rows = Array.from(grouped.values()).map((item) => ({
			label: item.count > 1 ? `${item.count}x ${item.type}: ${item.dimension}` : `${item.type}: ${item.dimension}`,
			icon: item.icon,
			type: item.type,
		}));

		return rows.length
			? rows
			: [{ label: 'Misure non disponibili', icon: DEFAULT_PACKAGE_VISUAL.icon, type: 'Pacco' }];
	});

	const canExpandSummaryServices = computed(() => (
		summaryServicesItems.value.length > 1 || summaryServicesLabel.value.length > 26
	));
	const canExpandSummaryDimensions = computed(() => (
		summaryDimensionsItems.value.length > 1 || summaryDimensionsLabel.value.length > 20
	));

	const summaryTotalPrice = computed(() => {
		const sessionPackagesAmount = getPackagesTotal(session.value?.data?.packages);
		const storePackagesAmount = getPackagesTotal(getStorePackages(shipmentFlowStore?.packages));
		const pendingAmount = getPackagesTotal(shipmentFlowStore?.pendingShipment?.packages);
		const editableAmount = getPackagesTotal(editablePackages.value);

		const baseAmount = pickBestPriceAmount([
			pendingAmount,
			editableAmount,
			sessionPackagesAmount,
			storePackagesAmount,
			parsePriceAmount(shipmentFlowStore?.totalPrice),
			parsePriceAmount(session.value?.data?.total_price),
		]);

		const pendingServices = shipmentFlowStore?.pendingShipment?.services || {};
		const sessionServices = session.value?.data?.services || {};
		const selectedServices = Array.isArray(shipmentFlowStore?.servicesArray) && shipmentFlowStore?.servicesArray.length
			? shipmentFlowStore?.servicesArray
			: (pendingServices.service_type || sessionServices.service_type || "");
		const selectedServiceData = Object.keys(shipmentFlowStore?.serviceData || {}).length
			? shipmentFlowStore?.serviceData
			: (pendingServices.serviceData || sessionServices.serviceData || {});
		const notificationsEnabled = Boolean(
			shipmentFlowStore?.smsEmailNotification
			|| pendingServices.sms_email_notification
			|| pendingServices.serviceData?.sms_email_notification
			|| session.value?.data?.sms_email_notification
			|| sessionServices.sms_email_notification
			|| sessionServices.serviceData?.sms_email_notification
		);

		const serviceSurcharge = calculateShipmentServiceSurcharge({
			selectedServices,
			serviceData: selectedServiceData,
			smsEmailNotification: notificationsEnabled,
			pricingConfig: priceBands.value,
			packages: editablePackages.value?.length
				? editablePackages.value
				: (shipmentFlowStore?.pendingShipment?.packages || session.value?.data?.packages || []),
			originAddress: originAddress.value || shipmentFlowStore?.originAddressData || session.value?.data?.origin_address || {},
			destinationAddress: destinationAddress.value || shipmentFlowStore?.destinationAddressData || session.value?.data?.destination_address || {},
			deliveryMode: shipmentFlowStore?.deliveryMode || shipmentFlowStore?.pendingShipment?.delivery_mode || session.value?.data?.delivery_mode || "home",
			selectedPudo: shipmentFlowStore?.selectedPudo || shipmentFlowStore?.pendingShipment?.selected_pudo || session.value?.data?.selected_pudo || null,
		}).total;

		return formatPriceAmount(baseAmount + serviceSurcharge);
	});

	const currentShipmentStep = computed(() => (
		showAddressFields.value ? 3 : 2
	));

	const summaryMiniSteps = computed(() => {
		const defs = [
			{ id: 1, label: 'Misure', to: '/#preventivo' },
			{ id: 2, label: 'Servizi', to: '/la-tua-spedizione/2?step=servizi' },
			{ id: 3, label: 'Indirizzi', to: '/la-tua-spedizione/2?step=indirizzi' },
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

	const showSummaryMiniSteps = computed(() => !stepsVisible.value);

	const goToSummaryMiniStep = async (step: MiniStep) => {
		if (!step?.isClickable) return;
		await navigateTo(step.to);
	};

	const updateStepsVisibility = () => {
		if (!import.meta.client || !stepsRef.value) return;
		const rect = stepsRef.value.getBoundingClientRect();
		const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
		const visibleTop = Math.max(rect.top, 0);
		const visibleBottom = Math.min(rect.bottom, viewportHeight);
		const visibleHeight = Math.max(0, visibleBottom - visibleTop);
		const visibleRatio = rect.height > 0 ? visibleHeight / rect.height : 0;
		const isClearlyVisible = rect.bottom > 0 && rect.top < viewportHeight && visibleRatio >= 0.55;
		stepsVisible.value = isClearlyVisible;
	};

	const scheduleStepsVisibilityUpdate = () => {
		if (!import.meta.client) return;
		if (stepsVisibilityRaf) cancelAnimationFrame(stepsVisibilityRaf);
		stepsVisibilityRaf = requestAnimationFrame(() => {
			updateStepsVisibility();
			stepsVisibilityRaf = null;
		});
	};

	const teardownStepsVisibilityObserver = () => {
		if (!import.meta.client) return;
		window.removeEventListener('scroll', scheduleStepsVisibilityUpdate);
		window.removeEventListener('resize', scheduleStepsVisibilityUpdate);
		if (stepsVisibilityRaf) {
			cancelAnimationFrame(stepsVisibilityRaf);
			stepsVisibilityRaf = null;
		}
		if (stepsObserver) {
			stepsObserver.disconnect();
			stepsObserver = null;
		}
	};

	const initStepsVisibilityObserver = () => {
		if (!import.meta.client || !stepsRef.value) return;
		teardownStepsVisibilityObserver();

		if ('IntersectionObserver' in window) {
			stepsObserver = new IntersectionObserver(
				() => {
					scheduleStepsVisibilityUpdate();
				},
				{
					root: null,
					threshold: [0, 0.2, 0.4, 0.55, 0.75, 1],
					rootMargin: '0px',
				}
			);
			stepsObserver.observe(stepsRef.value);
		}

		window.addEventListener('scroll', scheduleStepsVisibilityUpdate, { passive: true });
		window.addEventListener('resize', scheduleStepsVisibilityUpdate);
		scheduleStepsVisibilityUpdate();
	};

	const summaryExpanded = ref(false);
	const summaryDetailPanel = ref<SummaryPanel>(null);

	const toggleSummaryDetailPanel = (panel: SummaryPanel) => {
		summaryDetailPanel.value = summaryDetailPanel.value === panel ? null : panel;
	};

	watch(summaryExpanded, (isOpen) => {
		if (!isOpen) summaryDetailPanel.value = null;
		scheduleStepsVisibilityUpdate();
	});

	watch(
		() => stepsRef.value,
		(el) => {
			if (!import.meta.client || !el) return;
			nextTick(() => initStepsVisibilityObserver());
		},
		{ flush: 'post' }
	);

	watch(
		() => status.value,
		(newStatus) => {
			if (!import.meta.client || newStatus === 'pending') return;
			nextTick(() => initStepsVisibilityObserver());
		}
	);

	onMounted(() => {
		nextTick(() => initStepsVisibilityObserver());
	});

	onBeforeUnmount(() => {
		teardownStepsVisibilityObserver();
	});

	const onAccordionEnter = (el: Element) => {
		const target = el as HTMLElement;
		target.style.height = '0';
		target.style.overflow = 'hidden';
	};

	const onAccordionAfterEnter = (el: Element) => {
		const target = el as HTMLElement;
		target.style.height = 'auto';
		target.style.overflow = 'visible';
	};

	const onAccordionLeave = (el: Element) => {
		const target = el as HTMLElement;
		target.style.height = `${target.scrollHeight}px`;
		target.style.overflow = 'hidden';
		requestAnimationFrame(() => {
			target.style.height = '0';
		});
	};

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
		summaryDestinationCity: resolvedSummaryDestinationCity,
		summaryExpanded,
		summaryMiniSteps,
		summaryOriginCity: resolvedSummaryOriginCity,
		summaryPackageLabel,
		summaryPackageTypeInfo,
		summaryRouteLabel: resolvedSummaryRouteLabel,
		summaryServicesItems,
		summaryServicesLabel,
		summaryTotalPrice,
		toggleSummaryDetailPanel,
	};
};
