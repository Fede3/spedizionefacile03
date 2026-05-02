/**
 * useShipmentPaymentEvents — handler `update:*` emessi da ShipmentStepPagamento.
 *
 * Nel template Vue i `ref` sono auto-unwrappati e non si puo' fare
 * `ref.value = v` direttamente: serve una funzione nello script setup.
 * Estratto da ShipmentFlowPage.vue per liberare ~50 LOC dallo script setup
 * senza modificare semantica.
 */
import type { Ref } from 'vue';

type FatturaDataLike = Record<string, unknown>;

type Args = {
	paymentSummaryExpanded: Ref<boolean>;
	couponPanelOpen: Ref<boolean>;
	couponCode: Ref<string>;
	useNewCard: Ref<boolean>;
	saveCardForFuture: Ref<boolean>;
	fatturazioneType: Ref<string>;
	invoiceSubjectType: Ref<string>;
	fatturaData: Ref<FatturaDataLike>;
	checkoutTermsAccepted: Ref<boolean>;
	showConfirmModal: Ref<boolean>;
};

export function useShipmentPaymentEvents(args: Args) {
	const {
		paymentSummaryExpanded,
		couponPanelOpen,
		couponCode,
		useNewCard,
		saveCardForFuture,
		fatturazioneType,
		invoiceSubjectType,
		fatturaData,
		checkoutTermsAccepted,
		showConfirmModal,
	} = args;

	return {
		onPaymentSummaryExpanded: (v: boolean) => {
			paymentSummaryExpanded.value = v;
		},
		onCouponPanelOpen: (v: boolean) => {
			couponPanelOpen.value = v;
		},
		onCouponCode: (v: string) => {
			couponCode.value = v;
		},
		onUseNewCard: (v: boolean) => {
			useNewCard.value = v;
		},
		onSaveCardForFuture: (v: boolean) => {
			saveCardForFuture.value = v;
		},
		onFatturazioneType: (v: string) => {
			fatturazioneType.value = v;
		},
		onInvoiceSubjectType: (v: string) => {
			invoiceSubjectType.value = v;
		},
		onFatturaData: (v: FatturaDataLike) => {
			fatturaData.value = {
				...fatturaData.value,
				...v,
			};
		},
		onCheckoutTermsAccepted: (v: boolean) => {
			checkoutTermsAccepted.value = v;
		},
		onShowConfirmModal: (v: boolean) => {
			showConfirmModal.value = v;
		},
	};
}
