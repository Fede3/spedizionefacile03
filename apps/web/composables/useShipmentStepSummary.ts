/**
 * useShipmentStepSummary — orchestra le ~30 computed del riepilogo funnel
 * (cart, session, store, props). Helper puri in utils/shipmentSummaryHelpers.ts.
 */
import { calculateShipmentServiceSurcharge } from "~/utils/shipmentServicePricing";
import {
	firstMeaningfulValue as firstMeaningfulValueHelper,
	parsePriceAmount,
	formatPriceAmount,
	pickBestPriceAmount,
	getPackagesTotal,
} from "~/utils/shipmentSummaryHelpers";
import type { Ref } from 'vue';

type N<T> = T | null;
type SN = number | string | null;
type Rec = Record<string, unknown>;
type SummaryAddress = { name?: N<string>; surname?: N<string>; city?: N<string>; postal_code?: N<string>; zip_code?: N<string>; address?: N<string>; address_number?: N<string>; province?: N<string>; [k: string]: unknown };
type SummaryPackage = { package_type?: N<string>; quantity?: SN; weight?: SN; first_size?: SN; second_size?: SN; third_size?: SN; length?: SN; width?: SN; height?: SN; single_price?: SN; single_priceOrig?: SN; weight_price?: SN; volume_price?: SN; [k: string]: unknown };
type SummaryPudo = SummaryAddress & { pudo_id?: N<string> };
type SummaryServices = { service_type?: N<string>; serviceData?: Rec; sms_email_notification?: boolean; [k: string]: unknown };
type SummarySessionData = { packages?: SummaryPackage[]; shipment_details?: Rec; origin_address?: SummaryAddress; destination_address?: SummaryAddress; selected_pudo?: N<SummaryPudo>; services?: SummaryServices; total_price?: SN; sms_email_notification?: boolean; delivery_mode?: string };
type SummarySession = { data?: SummarySessionData };
type PendingShipment = { packages?: SummaryPackage[]; origin_address?: SummaryAddress; destination_address?: SummaryAddress; selected_pudo?: N<SummaryPudo>; services?: SummaryServices; delivery_mode?: string };
type ShipmentFlowStoreLike = { originAddressData?: N<SummaryAddress>; destinationAddressData?: N<SummaryAddress>; selectedPudo?: N<SummaryPudo>; shipmentDetails?: Rec; pendingShipment?: N<PendingShipment>; servicesArray?: string[]; serviceData?: Rec; smsEmailNotification?: boolean; totalPrice?: SN; packages?: SummaryPackage[] | Ref<SummaryPackage[]>; deliveryMode?: string };
type MiniStep = { id: number; label: string; to: string; isActive?: boolean; isCompleted?: boolean; isClickable?: boolean };
type SummaryPanel = 'services' | 'dimensions' | null;
type UseShipmentStepSummaryArgs = {
	destinationAddress: Ref<SummaryAddress>; editablePackages: Ref<SummaryPackage[]>;
	normalizeLocationText: (value: string) => string; originAddress: Ref<SummaryAddress>;
	session: Ref<N<SummarySession>>; showAddressFields: Ref<boolean>;
	status: Ref<string>; stepsRef: Ref<N<HTMLElement>>;
	shipmentFlowStore?: N<ShipmentFlowStoreLike>;
};

const PKG_VISUAL: Record<string, { label: string; icon: string }> = {
	pacco: { label: 'Pacco', icon: '/img/quote/first-step/pack.png' },
	pallet: { label: 'Pallet', icon: '/img/quote/first-step/pallet.png' },
	valigia: { label: 'Valigia', icon: '/img/quote/first-step/suitcase.png' },
	busta: { label: 'Busta', icon: '/img/quote/first-step/envelope.png' },
	wallet: { label: 'Wallet', icon: '/img/quote/first-step/suitcase.png' },
};
const PKG_DEFAULT = PKG_VISUAL.pacco as { label: string; icon: string };

const getStorePackages = (s?: SummaryPackage[] | Ref<SummaryPackage[]>): SummaryPackage[] =>
	Array.isArray(s) ? s : (s && Array.isArray(s.value) ? s.value : []);
const normPkgType = (v: unknown): string => (v ? String(v).trim().toLowerCase() : 'pacco');
const cap = (v: string): string => (v ? v[0]!.toUpperCase() + v.slice(1) : '');
const dimNum = (v: unknown): number | null => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
const dimLabel = (p: SummaryPackage): string | null => {
	const a = dimNum(p?.first_size ?? p?.length), b = dimNum(p?.second_size ?? p?.width), c = dimNum(p?.third_size ?? p?.height);
	return a && b && c ? `${a}×${b}×${c} cm` : null;
};
const pkgVisual = (p: SummaryPackage) => PKG_VISUAL[normPkgType(p?.package_type || 'Pacco')] || PKG_DEFAULT;

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
		nextTick(() => { clientDraftSummaryReady.value = true; });
	});

	const firstMeaningfulValue = (...c: unknown[]): string => firstMeaningfulValueHelper(c, normalizeLocationText);

	const summaryPackagesSource = computed(() => {
		const src = clientDraftSummaryReady.value ? editablePackages.value : session.value?.data?.packages;
		return Array.isArray(src) ? src : [];
	});

	const summaryPackageLabel = computed(() => {
		const c = summaryPackagesSource.value.length;
		return `${c} ${c === 1 ? 'collo' : 'colli'}`;
	});

	const getPackageTypeLabel = (p: SummaryPackage): string => {
		const n = normPkgType(p?.package_type || 'Pacco');
		return PKG_VISUAL[n]?.label || cap(n) || 'Pacco';
	};
	const getPackageTypeIcon = (p: SummaryPackage): string => pkgVisual(p).icon;

	const summaryPackageTypeInfo = computed(() => {
		const types = [...new Set(summaryPackagesSource.value.map((p) => normPkgType(p?.package_type || 'Pacco')).filter(Boolean))];
		if (!types.length) return PKG_DEFAULT;
		if (types.length > 1) return { label: 'Misto', icon: PKG_DEFAULT.icon };
		const n = types[0] || 'pacco';
		return PKG_VISUAL[n] || { label: cap(n), icon: PKG_DEFAULT.icon };
	});

	const resolveCity = (liveVal: () => unknown, pudoVal: () => unknown, storeKey: 'originAddressData' | 'destinationAddressData', detailKey: 'origin_city' | 'destination_city') => {
		if (!clientDraftSummaryReady.value) return session.value?.data?.shipment_details?.[detailKey] || 'â€”';
		const pudo = String(pudoVal() || '').trim();
		if (pudo) return pudo;
		const live = String(liveVal() || '').trim();
		if (live) return live;
		if (showAddressFields.value) return '—';
		return shipmentFlowStore?.[storeKey]?.city || shipmentFlowStore?.shipmentDetails?.[detailKey] || session.value?.data?.shipment_details?.[detailKey] || '—';
	};
	const summaryOriginCity = computed(() => resolveCity(() => originAddress.value?.city, () => '', 'originAddressData', 'origin_city'));
	const summaryDestinationCity = computed(() => resolveCity(() => destinationAddress.value?.city, () => shipmentFlowStore?.selectedPudo?.city, 'destinationAddressData', 'destination_city'));

	const resolvedSummaryOriginCity = computed(() => firstMeaningfulValue(
		originAddress.value?.city, shipmentFlowStore?.originAddressData?.city,
		shipmentFlowStore?.pendingShipment?.origin_address?.city, session.value?.data?.origin_address?.city,
		shipmentFlowStore?.shipmentDetails?.origin_city, session.value?.data?.shipment_details?.origin_city,
		summaryOriginCity.value,
	) || '—');

	const resolvedSummaryDestinationCity = computed(() => firstMeaningfulValue(
		shipmentFlowStore?.selectedPudo?.city, shipmentFlowStore?.pendingShipment?.selected_pudo?.city,
		session.value?.data?.selected_pudo?.city, destinationAddress.value?.city,
		shipmentFlowStore?.destinationAddressData?.city, shipmentFlowStore?.pendingShipment?.destination_address?.city,
		session.value?.data?.destination_address?.city, shipmentFlowStore?.shipmentDetails?.destination_city,
		session.value?.data?.shipment_details?.destination_city, summaryDestinationCity.value,
	) || '—');

	const resolvedSummaryRouteLabel = computed(() => `${resolvedSummaryOriginCity.value} → ${resolvedSummaryDestinationCity.value}`);

	const normRouteText = (v: unknown): string => normalizeLocationText(String(v || '').replace(/\s+/g, ' '));
	const normRouteNum = (v: unknown): string => String(v || '').trim().toLowerCase().replace(/\s+/g, '');

	const routeConsistencyState = computed(() => {
		const empty = { blocking: false, warning: false, message: '' };
		const pudo = shipmentFlowStore?.selectedPudo;
		const oa = originAddress.value, da = destinationAddress.value, sd = shipmentFlowStore?.shipmentDetails;
		const oCity = normRouteText(oa?.city);
		const dCity = normRouteText(pudo?.city || da?.city || sd?.destination_city);
		if (!oCity || !dCity) return empty;
		const oCap = String(oa?.postal_code || '').trim();
		const dCap = String(pudo?.zip_code || da?.postal_code || sd?.destination_postal_code || '').trim();
		const sameCity = oCity === dCity, sameCap = !!oCap && !!dCap && oCap === dCap;
		const oStreet = normRouteText(oa?.address), dStreet = normRouteText(pudo?.address || da?.address);
		const oNum = normRouteNum(oa?.address_number), dNum = normRouteNum(pudo ? 'SNC' : da?.address_number);
		if (sameCity && sameCap && !!oStreet && !!dStreet && oStreet === dStreet && !!oNum && !!dNum && oNum === dNum)
			return { blocking: true, warning: true, message: 'Partenza e destinazione coincidono. Inserisci una destinazione diversa prima di continuare.' };
		if (sameCity && sameCap) return { blocking: false, warning: true, message: 'Tratta locale: verifica disponibilità del servizio BRT per questa combinazione di indirizzi.' };
		return empty;
	});

	const routeWarningMessage = computed(() => routeConsistencyState.value.warning ? routeConsistencyState.value.message : '');

	const selectedServicesFromState = computed(() => {
		const local = Array.isArray(shipmentFlowStore?.servicesArray) ? shipmentFlowStore.servicesArray.filter(Boolean) : [];
		if (local.length) return local;
		return String(shipmentFlowStore?.pendingShipment?.services?.service_type || session.value?.data?.services?.service_type || "")
			.split(",").map((s) => s.trim()).filter(Boolean);
	});

	const summaryServicesLabel = computed(() => selectedServicesFromState.value.length ? selectedServicesFromState.value.join(', ') : 'Nessun servizio');
	const summaryServicesItems = computed(() => selectedServicesFromState.value.length ? selectedServicesFromState.value : ['Nessun servizio selezionato']);

	const summaryDimensionsLabel = computed(() => {
		const rows = (editablePackages.value || []).map((p) => ({ label: dimLabel(p), qty: Math.max(1, Number(p?.quantity) || 1) }))
			.filter((r): r is { label: string; qty: number } => !!r.label);
		if (!rows.length) return '—';
		const totalQty = rows.reduce((s, i) => s + i.qty, 0);
		const primary = rows[0]?.label || 'Misure non definite';
		if (rows.length === 1) return totalQty === 1 ? primary : `${primary} × ${totalQty}`;
		return `${primary} +${Math.max(totalQty - 1, 1)}`;
	});

	const summaryDimensionsItems = computed(() => {
		const grouped = new Map<string, { type: string; dimension: string; icon: string; count: number }>();
		for (const p of (editablePackages.value || [])) {
			const dimension = dimLabel(p) || 'Misure non definite';
			const type = getPackageTypeLabel(p);
			const cur = grouped.get(`${normPkgType(type)}|${dimension}`) || { type, dimension, icon: getPackageTypeIcon(p), count: 0 };
			cur.count += Math.max(1, Number(p?.quantity) || 1);
			grouped.set(`${normPkgType(type)}|${dimension}`, cur);
		}
		const rows = Array.from(grouped.values()).map(({ type, dimension, icon, count }) => ({
			label: count > 1 ? `${count}x ${type}: ${dimension}` : `${type}: ${dimension}`, icon, type,
		}));
		return rows.length ? rows : [{ label: 'Misure non disponibili', icon: PKG_DEFAULT.icon, type: 'Pacco' }];
	});

	const canExpandSummaryServices = computed(() => summaryServicesItems.value.length > 1 || summaryServicesLabel.value.length > 26);
	const canExpandSummaryDimensions = computed(() => summaryDimensionsItems.value.length > 1 || summaryDimensionsLabel.value.length > 20);

	const summaryTotalPrice = computed(() => {
		const pend = shipmentFlowStore?.pendingShipment, sess = session.value?.data;
		const ps = pend?.services || {}, ss = sess?.services || {}, sa = shipmentFlowStore?.servicesArray;
		const base = pickBestPriceAmount([
			getPackagesTotal(pend?.packages), getPackagesTotal(editablePackages.value),
			getPackagesTotal(sess?.packages), getPackagesTotal(getStorePackages(shipmentFlowStore?.packages)),
			parsePriceAmount(shipmentFlowStore?.totalPrice), parsePriceAmount(sess?.total_price),
		]);
		const surcharge = calculateShipmentServiceSurcharge({
			selectedServices: Array.isArray(sa) && sa.length ? sa : (ps.service_type || ss.service_type || ""),
			serviceData: Object.keys(shipmentFlowStore?.serviceData || {}).length ? shipmentFlowStore?.serviceData : (ps.serviceData || ss.serviceData || {}),
			smsEmailNotification: Boolean(shipmentFlowStore?.smsEmailNotification || ps.sms_email_notification || ps.serviceData?.sms_email_notification || sess?.sms_email_notification || ss.sms_email_notification || ss.serviceData?.sms_email_notification),
			pricingConfig: priceBands.value,
			packages: editablePackages.value?.length ? editablePackages.value : (pend?.packages || sess?.packages || []),
			originAddress: originAddress.value || shipmentFlowStore?.originAddressData || sess?.origin_address || {},
			destinationAddress: destinationAddress.value || shipmentFlowStore?.destinationAddressData || sess?.destination_address || {},
			deliveryMode: shipmentFlowStore?.deliveryMode || pend?.delivery_mode || sess?.delivery_mode || "home",
			selectedPudo: shipmentFlowStore?.selectedPudo || pend?.selected_pudo || sess?.selected_pudo || null,
		}).total;
		return formatPriceAmount(base + surcharge);
	});

	const currentShipmentStep = computed(() => showAddressFields.value ? 3 : 2);

	const summaryMiniSteps = computed(() => ([
		{ id: 1, label: 'Misure', to: '/#preventivo' },
		{ id: 2, label: 'Servizi', to: '/la-tua-spedizione/2?step=servizi' },
		{ id: 3, label: 'Indirizzi', to: '/la-tua-spedizione/2?step=indirizzi' },
		{ id: 4, label: 'Pagamento', to: '/la-tua-spedizione/2?step=pagamento' },
	].map((s) => ({ ...s, isActive: s.id === currentShipmentStep.value, isCompleted: s.id < currentShipmentStep.value, isClickable: s.id < currentShipmentStep.value }))));

	const showSummaryMiniSteps = computed(() => !stepsVisible.value);

	const goToSummaryMiniStep = async (step: MiniStep) => {
		if (!step?.isClickable) return;
		await navigateTo(step.to);
	};

	const updateStepsVisibility = () => {
		if (!import.meta.client || !stepsRef.value) return;
		const r = stepsRef.value.getBoundingClientRect();
		const vh = window.innerHeight || document.documentElement.clientHeight;
		const ratio = r.height > 0 ? Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / r.height : 0;
		stepsVisible.value = r.bottom > 0 && r.top < vh && ratio >= 0.55;
	};
	const scheduleStepsVisibilityUpdate = () => {
		if (!import.meta.client) return;
		if (stepsVisibilityRaf) cancelAnimationFrame(stepsVisibilityRaf);
		stepsVisibilityRaf = requestAnimationFrame(() => { updateStepsVisibility(); stepsVisibilityRaf = null; });
	};
	const teardownStepsVisibilityObserver = () => {
		if (!import.meta.client) return;
		window.removeEventListener('scroll', scheduleStepsVisibilityUpdate);
		window.removeEventListener('resize', scheduleStepsVisibilityUpdate);
		if (stepsVisibilityRaf) { cancelAnimationFrame(stepsVisibilityRaf); stepsVisibilityRaf = null; }
		if (stepsObserver) { stepsObserver.disconnect(); stepsObserver = null; }
	};
	const initStepsVisibilityObserver = () => {
		if (!import.meta.client || !stepsRef.value) return;
		teardownStepsVisibilityObserver();
		if ('IntersectionObserver' in window) {
			stepsObserver = new IntersectionObserver(() => scheduleStepsVisibilityUpdate(), { root: null, threshold: [0, 0.2, 0.4, 0.55, 0.75, 1], rootMargin: '0px' });
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

	watch(summaryExpanded, (open) => {
		if (!open) summaryDetailPanel.value = null;
		scheduleStepsVisibilityUpdate();
	});
	watch(() => stepsRef.value, (el) => { if (import.meta.client && el) nextTick(() => initStepsVisibilityObserver()); }, { flush: 'post' });
	watch(() => status.value, (s) => { if (import.meta.client && s !== 'pending') nextTick(() => initStepsVisibilityObserver()); });

	onMounted(() => { nextTick(() => initStepsVisibilityObserver()); });
	onBeforeUnmount(() => { teardownStepsVisibilityObserver(); });

	const setAcc = (el: Element, h: string, o: string) => { const t = el as HTMLElement; t.style.height = h; t.style.overflow = o; };
	const onAccordionEnter = (el: Element) => setAcc(el, '0', 'hidden');
	const onAccordionAfterEnter = (el: Element) => setAcc(el, 'auto', 'visible');
	const onAccordionLeave = (el: Element) => {
		setAcc(el, `${(el as HTMLElement).scrollHeight}px`, 'hidden');
		requestAnimationFrame(() => { (el as HTMLElement).style.height = '0'; });
	};

	return {
		canExpandSummaryDimensions, canExpandSummaryServices, currentShipmentStep, goToSummaryMiniStep,
		onAccordionAfterEnter, onAccordionEnter, onAccordionLeave, routeConsistencyState, routeWarningMessage,
		showSummaryMiniSteps, summaryDetailPanel, summaryDimensionsItems, summaryDimensionsLabel,
		summaryDestinationCity: resolvedSummaryDestinationCity, summaryExpanded, summaryMiniSteps,
		summaryOriginCity: resolvedSummaryOriginCity, summaryPackageLabel, summaryPackageTypeInfo,
		summaryRouteLabel: resolvedSummaryRouteLabel, summaryServicesItems, summaryServicesLabel,
		summaryTotalPrice, toggleSummaryDetailPanel,
	};
};
