/**
 * useShipmentExistingOrderSummary — incapsula tutti i computed legati a un
 * ordine "existing" (gia' creato, viene ripreso per pagamento) usati in
 * ShipmentFlowPage.vue per popolare la card di riepilogo dello step Pagamento.
 *
 * Estratto dalla page orchestrator per ridurre LOC dello script setup
 * mantenendo invariata la logica di business (pure presentational logic).
 */
import type { ComputedRef, Ref } from 'vue';
import {
	cleanPaymentSummaryText,
	formatExistingOrderDate,
	getExistingOrderPackageDimensions,
	getExistingOrderPackageQuantity,
	getExistingOrderPackageType,
	normalizeExistingOrderAddress,
	type PaymentAddress,
} from '~/utils/shipmentStepHelpers';

type ExistingOrderPackage = Record<string, unknown> & {
	origin_address?: Record<string, unknown>;
	destination_address?: Record<string, unknown>;
	services?: Record<string, unknown>;
	content_description?: unknown;
};
type ExistingOrder = {
	pickup_date?: unknown;
	brt_pudo_id?: unknown;
} | null;

type Args = {
	existingOrder: Ref<ExistingOrder>;
	existingOrderId: Ref<string | number | null | undefined>;
	displayPackages: Ref<ExistingOrderPackage[] | undefined>;
	checkoutContentDescription: Ref<string | null | undefined>;
};

export type ExistingOrderSummary = {
	existingOrderPackages: ComputedRef<ExistingOrderPackage[]>;
	existingOrderPrimaryPackage: ComputedRef<ExistingOrderPackage | null>;
	hasExistingOrderSummary: ComputedRef<boolean>;
	existingOrderPackageCount: ComputedRef<number>;
	existingOrderPackageLabel: ComputedRef<string>;
	existingOrderDimensionsLabel: ComputedRef<string>;
	existingOrderOriginAddress: ComputedRef<PaymentAddress>;
	existingOrderDestinationAddress: ComputedRef<PaymentAddress>;
	existingOrderService: ComputedRef<Record<string, unknown>>;
	existingOrderDeliveryMode: ComputedRef<'pudo' | 'home'>;
	existingOrderPickupDate: ComputedRef<string>;
	existingOrderServicesLabel: ComputedRef<string>;
	existingOrderContentDescription: ComputedRef<string>;
	existingOrderRouteLabel: ComputedRef<string>;
};

export function useShipmentExistingOrderSummary({
	existingOrder,
	existingOrderId,
	displayPackages,
	checkoutContentDescription,
}: Args): ExistingOrderSummary {
	const existingOrderPackages = computed<ExistingOrderPackage[]>(() => (
		existingOrder.value && Array.isArray(displayPackages.value) ? displayPackages.value : []
	));
	const existingOrderPrimaryPackage = computed<ExistingOrderPackage | null>(() => existingOrderPackages.value[0] || null);
	const hasExistingOrderSummary = computed(() => Boolean(existingOrderId.value && existingOrderPackages.value.length));

	const existingOrderPackageCount = computed(() =>
		existingOrderPackages.value.reduce((sum, pack) => sum + getExistingOrderPackageQuantity(pack), 0),
	);
	const existingOrderPackageLabel = computed(() => {
		const count = existingOrderPackageCount.value;
		return `${count} ${count === 1 ? 'collo' : 'colli'}`;
	});
	const existingOrderDimensionsLabel = computed(() => {
		const grouped = new Map<string, number>();
		for (const pack of existingOrderPackages.value) {
			const dimensions = getExistingOrderPackageDimensions(pack);
			if (!dimensions) continue;
			const type = getExistingOrderPackageType(pack);
			const key = `${type}|${dimensions}`;
			grouped.set(key, (grouped.get(key) || 0) + getExistingOrderPackageQuantity(pack));
		}

		const rows = Array.from(grouped.entries()).map(([key, qty]) => {
			const [type, dimensions] = key.split('|');
			return qty > 1 ? `${qty}x ${type}: ${dimensions}` : `${type}: ${dimensions}`;
		});

		if (!rows.length) return '';
		const first = rows[0] ?? '';
		return rows.length === 1 ? first : `${first} +${rows.length - 1}`;
	});
	const existingOrderOriginAddress = computed(() =>
		normalizeExistingOrderAddress(existingOrderPrimaryPackage.value?.origin_address),
	);
	const existingOrderDestinationAddress = computed(() =>
		normalizeExistingOrderAddress(existingOrderPrimaryPackage.value?.destination_address),
	);
	const existingOrderService = computed<Record<string, unknown>>(() => existingOrderPrimaryPackage.value?.services || {});
	const existingOrderDeliveryMode = computed<'pudo' | 'home'>(() => (
		existingOrder.value?.brt_pudo_id ? 'pudo' : 'home'
	));
	const existingOrderPickupDate = computed(() =>
		formatExistingOrderDate(
			existingOrder.value?.pickup_date
			|| (existingOrderService.value as { date?: unknown })?.date
			|| (existingOrderService.value as { serviceData?: { pickup_request?: { date?: unknown } } })?.serviceData?.pickup_request?.date,
		),
	);
	const existingOrderServicesLabel = computed(() => {
		const raw = cleanPaymentSummaryText((existingOrderService.value as { service_type?: unknown })?.service_type);
		return !raw || raw.toLowerCase() === 'nessuno' ? 'Nessun extra selezionato' : raw;
	});
	const existingOrderContentDescription = computed(() => (
		cleanPaymentSummaryText(existingOrderPackages.value.find((pack) => cleanPaymentSummaryText(pack?.content_description))?.content_description)
		|| cleanPaymentSummaryText(checkoutContentDescription.value)
	));
	const existingOrderRouteLabel = computed(() => {
		const originCity = cleanPaymentSummaryText(existingOrderOriginAddress.value.city);
		const destinationCity = cleanPaymentSummaryText(existingOrderDestinationAddress.value.city || existingOrderDestinationAddress.value.name);
		if (originCity && destinationCity) return `${originCity} -> ${destinationCity}`;
		return '';
	});

	return {
		existingOrderPackages,
		existingOrderPrimaryPackage,
		hasExistingOrderSummary,
		existingOrderPackageCount,
		existingOrderPackageLabel,
		existingOrderDimensionsLabel,
		existingOrderOriginAddress,
		existingOrderDestinationAddress,
		existingOrderService,
		existingOrderDeliveryMode,
		existingOrderPickupDate,
		existingOrderServicesLabel,
		existingOrderContentDescription,
		existingOrderRouteLabel,
	};
}
