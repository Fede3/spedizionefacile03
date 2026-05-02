/**
 * useShipmentPaymentSummaryView — incapsula tutti i computed "view" usati
 * dallo step Pagamento (ShipmentStepPagamento.vue) per scegliere se
 * mostrare i dati dell'ordine esistente vs. i dati live del funnel.
 *
 * Estratto dallo script setup di ShipmentFlowPage.vue per ridurre i ~80 LOC
 * di "boundary payment summary" che vivevano inline come computed manuali.
 *
 * Tutti i campi sono pure derivazioni: hasExistingOrderSummary === true
 *   → usa il dato dall'ordine ripreso
 * else → usa il dato corrente del funnel (con fallback SSR-safe)
 */
import type { ComputedRef, Ref } from 'vue';
import { buildEmptyPaymentAddress, type PaymentAddress } from '~/utils/shipmentStepHelpers';

type Args = {
	summaryHydrationReady: Ref<boolean>;
	hasExistingOrderSummary: Ref<boolean> | ComputedRef<boolean>;
	deliveryMode: Ref<string>;

	// Funnel-derived (live) data
	packageAccordionSummary: Ref<string> | ComputedRef<string>;
	addressAccordionSummary: Ref<string> | ComputedRef<string>;
	trattaLabel: Ref<string> | ComputedRef<string>;
	colloLabel: Ref<string> | ComputedRef<string>;
	summaryPackageLabel: Ref<string> | ComputedRef<string>;
	summaryDimensionsLabel: Ref<string> | ComputedRef<string>;
	confirmationOriginContact: Ref<string> | ComputedRef<string>;
	confirmationDestinationContact: Ref<string> | ComputedRef<string>;
	confirmationPickupDate: Ref<string> | ComputedRef<string>;
	paymentSummaryServicesLabel: Ref<string> | ComputedRef<string>;
	resolvedContentDescription: Ref<string> | ComputedRef<string>;
	paymentDeliveryLabel: Ref<string> | ComputedRef<string>;
	originAddress: Ref<PaymentAddress>;
	destinationAddress: Ref<PaymentAddress>;

	// Existing order data
	existingOrderRouteLabel: ComputedRef<string>;
	existingOrderPackageLabel: ComputedRef<string>;
	existingOrderDimensionsLabel: ComputedRef<string>;
	existingOrderOriginAddress: ComputedRef<PaymentAddress>;
	existingOrderDestinationAddress: ComputedRef<PaymentAddress>;
	existingOrderDeliveryMode: ComputedRef<'pudo' | 'home'>;
	existingOrderPickupDate: ComputedRef<string>;
	existingOrderServicesLabel: ComputedRef<string>;
	existingOrderContentDescription: ComputedRef<string>;
};

export function useShipmentPaymentSummaryView(args: Args) {
	const {
		summaryHydrationReady,
		hasExistingOrderSummary,
		deliveryMode,
		packageAccordionSummary,
		addressAccordionSummary,
		trattaLabel,
		colloLabel,
		summaryPackageLabel,
		summaryDimensionsLabel,
		confirmationOriginContact,
		confirmationDestinationContact,
		confirmationPickupDate,
		paymentSummaryServicesLabel,
		resolvedContentDescription,
		paymentDeliveryLabel,
		originAddress,
		destinationAddress,
		existingOrderRouteLabel,
		existingOrderPackageLabel,
		existingOrderDimensionsLabel,
		existingOrderOriginAddress,
		existingOrderDestinationAddress,
		existingOrderDeliveryMode,
		existingOrderPickupDate,
		existingOrderServicesLabel,
		existingOrderContentDescription,
	} = args;

	// SSR-safe wrappers (evitano mismatch markup tra server e idratazione client)
	const ssrSafePackageAccordionSummary = computed(() => (summaryHydrationReady.value ? packageAccordionSummary.value : '0 colli · —'));
	const ssrSafeAddressAccordionSummary = computed(() => (summaryHydrationReady.value ? addressAccordionSummary.value : '— -> —'));
	const ssrSafeTrattaLabel = computed(() => (summaryHydrationReady.value ? trattaLabel.value : 'Tratta da definire'));
	const ssrSafeSummaryPackageLabel = computed(() => (summaryHydrationReady.value ? summaryPackageLabel.value : '0 colli'));
	const ssrSafeSummaryDimensionsLabel = computed(() => (summaryHydrationReady.value ? summaryDimensionsLabel.value : '—'));
	const ssrSafeConfirmationOriginContact = computed(() =>
		summaryHydrationReady.value ? confirmationOriginContact.value : 'Mittente da completare',
	);
	const ssrSafeConfirmationDestinationContact = computed(() =>
		summaryHydrationReady.value
			? confirmationDestinationContact.value
			: deliveryMode.value === 'pudo'
				? 'Punto BRT da selezionare'
				: 'Destinatario da completare',
	);
	const ssrSafePaymentOriginAddress = computed<PaymentAddress>(() => (
		summaryHydrationReady.value ? originAddress.value : buildEmptyPaymentAddress()
	));
	const ssrSafePaymentDestinationAddress = computed<PaymentAddress>(() => (
		summaryHydrationReady.value ? destinationAddress.value : buildEmptyPaymentAddress()
	));

	// Boundary payment summary: il checkout da order_id vive sul backend, non nel
	// draft del funnel. Qui scegliamo i dati ordine persistito solo per la UI.
	const paymentTrattaLabel = computed(() => (
		hasExistingOrderSummary.value ? existingOrderRouteLabel.value : ssrSafeTrattaLabel.value
	));
	const paymentColloLabel = computed(() => (
		hasExistingOrderSummary.value ? existingOrderPackageLabel.value : colloLabel.value
	));
	const paymentSummaryPackageLabel = computed(() => (
		hasExistingOrderSummary.value ? existingOrderPackageLabel.value : ssrSafeSummaryPackageLabel.value
	));
	const paymentSummaryDimensionsLabel = computed(() => (
		hasExistingOrderSummary.value ? existingOrderDimensionsLabel.value : ssrSafeSummaryDimensionsLabel.value
	));
	const paymentConfirmationOriginContact = computed(() => (
		hasExistingOrderSummary.value ? existingOrderOriginAddress.value.full_name : ssrSafeConfirmationOriginContact.value
	));
	const paymentConfirmationDestinationContact = computed(() => (
		hasExistingOrderSummary.value ? existingOrderDestinationAddress.value.full_name : ssrSafeConfirmationDestinationContact.value
	));
	const paymentOriginAddress = computed<PaymentAddress>(() => (
		hasExistingOrderSummary.value ? existingOrderOriginAddress.value : ssrSafePaymentOriginAddress.value
	));
	const paymentDestinationAddress = computed<PaymentAddress>(() => (
		hasExistingOrderSummary.value ? existingOrderDestinationAddress.value : ssrSafePaymentDestinationAddress.value
	));
	const paymentDeliveryMode = computed(() => (
		hasExistingOrderSummary.value ? existingOrderDeliveryMode.value : deliveryMode.value
	));
	const paymentPickupDate = computed(() => (
		hasExistingOrderSummary.value ? existingOrderPickupDate.value : confirmationPickupDate.value
	));
	const paymentServicesLabel = computed(() => (
		hasExistingOrderSummary.value ? existingOrderServicesLabel.value : paymentSummaryServicesLabel.value
	));
	const paymentContentDescription = computed(() => (
		hasExistingOrderSummary.value ? existingOrderContentDescription.value : resolvedContentDescription.value
	));
	const paymentDeliveryDisplayLabel = computed(() => (
		hasExistingOrderSummary.value
			? (existingOrderDeliveryMode.value === 'pudo' ? 'Punto BRT' : 'Consegna a domicilio')
			: paymentDeliveryLabel.value
	));

	const packagesStageSummary = computed(() => {
		if (!hasExistingOrderSummary.value) return ssrSafePackageAccordionSummary.value;
		const dimensions = String(existingOrderDimensionsLabel.value || '').trim();
		return `${existingOrderPackageLabel.value} · ${dimensions || 'Misure disponibili'}`;
	});
	const addressStageSummary = computed(() => (
		hasExistingOrderSummary.value
			? (existingOrderRouteLabel.value || ssrSafeAddressAccordionSummary.value)
			: ssrSafeAddressAccordionSummary.value
	));

	return {
		// SSR-safe
		ssrSafePackageAccordionSummary,
		ssrSafeAddressAccordionSummary,
		ssrSafeTrattaLabel,
		ssrSafeSummaryPackageLabel,
		ssrSafeSummaryDimensionsLabel,
		ssrSafeConfirmationOriginContact,
		ssrSafeConfirmationDestinationContact,
		ssrSafePaymentOriginAddress,
		ssrSafePaymentDestinationAddress,

		// Payment summary view (existing-order-aware)
		paymentTrattaLabel,
		paymentColloLabel,
		paymentSummaryPackageLabel,
		paymentSummaryDimensionsLabel,
		paymentConfirmationOriginContact,
		paymentConfirmationDestinationContact,
		paymentOriginAddress,
		paymentDestinationAddress,
		paymentDeliveryMode,
		paymentPickupDate,
		paymentServicesLabel,
		paymentContentDescription,
		paymentDeliveryDisplayLabel,
		packagesStageSummary,
		addressStageSummary,
	};
}
