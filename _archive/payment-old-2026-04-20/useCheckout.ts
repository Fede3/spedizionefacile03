import type { ComputedRef, Ref } from 'vue'
import { useCartOperations } from '~/composables/useCartOperations'
import { usePaymentFlow } from '~/composables/usePaymentFlow'
import { useCheckoutValidation } from '~/composables/useCheckoutValidation'

// Re-export utility pure da utils/checkoutSignature per backward-compat.
// Le funzioni vere vivono in utils/ per rompere il ciclo usePaymentFlow ↔ useCheckout.
export {
	buildCheckoutSubmissionSignature,
	recoverCheckoutCartState,
	type BuildCheckoutSubmissionSignatureParams,
	type RecoverCheckoutCartStateParams,
} from '~/utils/checkoutSignature'

// ---------------------------------------------------------------------------
// Facade composable — wires the three sub-composables together
// ---------------------------------------------------------------------------

export function useCheckout() {
	// 1. Cart operations (no dependencies on the other two)
	const cartOps = useCartOperations()

	// 2. Payment flow — depends on cart operations.
	//    We pass in a lazy `canPay` ref that will be populated after validation is created.
	//    Also pass `validateBillingFields` and `validateMinimumAmount` via a wrapper.
	const lazyCanPay = ref<boolean>(false)
	// Lazy `termsAccepted` → propagato al payment flow per guardare il wallet express
	// (Apple Pay / Google Pay) che non passa per canPay.
	const lazyTermsAccepted = ref<boolean>(false)
	const lazyValidateBillingFields = (): string | null => null
	const lazyValidateMinimumAmount = (): string | null => null

	// Store references to validation functions that will be replaced after init
	const validationFns: {
		billing: () => string | null
		amount: () => string | null
	} = { billing: lazyValidateBillingFields, amount: lazyValidateMinimumAmount }

	// NOTE: the current dependency types of usePaymentFlow are stricter than the
	// shapes cartOps returns (historical JS union / optional divergences). These
	// `as unknown as ...` assertions preserve the pre-existing runtime behaviour
	// while the underlying sub-composables are progressively tightened up.
	const paymentFlow = usePaymentFlow({
		cart: cartOps.cart,
		refreshCart: cartOps.refreshCart as unknown as () => Promise<void>,
		sanctum: cartOps.sanctum,
		shipmentFlowStore: cartOps.shipmentFlowStore,
		user: cartOps.user,
		existingOrderId: cartOps.existingOrderId as unknown as Ref<string | number | null>,
		existingOrder: cartOps.existingOrder,
		getNumberTotal: cartOps.getNumberTotal,
		finalTotal: cartOps.finalTotal,
		billingPayload: cartOps.billingPayload,
		couponApplied: cartOps.couponApplied,
		loadWalletBalance: cartOps.loadWalletBalance,
		canPay: lazyCanPay as unknown as ComputedRef<boolean>,
		validateBillingFields: () => validationFns.billing(),
		validateMinimumAmount: () => validationFns.amount(),
		termsAccepted: lazyTermsAccepted,
	})

	// 3. Checkout validation — depends on both cart ops and payment flow refs.
	const validation = useCheckoutValidation({
		fatturazioneType: cartOps.fatturazioneType,
		invoiceSubjectType: cartOps.invoiceSubjectType,
		fatturaData: cartOps.fatturaData,
		finalTotal: cartOps.finalTotal,
		finalTotalFormatted: cartOps.finalTotalFormatted,
		walletLoaded: cartOps.walletLoaded,
		walletSufficient: cartOps.walletSufficient,
		paymentMethod: paymentFlow.paymentMethod,
		cardComplete: paymentFlow.cardComplete,
		defaultPayment: paymentFlow.defaultPayment,
		useNewCard: paymentFlow.useNewCard,
		isProcessing: paymentFlow.isProcessing,
	})

	// Wire the lazy canPay ref to the real computed from validation
	watch(validation.canPay, (val) => { lazyCanPay.value = val }, { immediate: true })
	// Wire lazy termsAccepted → utilizzato dal payment flow per guard wallet express.
	watch(validation.termsAccepted, (val) => { lazyTermsAccepted.value = val }, { immediate: true })

	// Wire real validation functions into the payment flow
	validationFns.billing = validation.validateBillingFields
	validationFns.amount = validation.validateMinimumAmount

	// ---------------------------------------------------------------------------
	// Return the same flat API that consumers expect
	// ---------------------------------------------------------------------------
	return {
		// page state
		pageReady: cartOps.pageReady,
		existingOrderId: cartOps.existingOrderId,
		existingOrder: cartOps.existingOrder,
		initCheckoutPage: cartOps.initCheckoutPage,

		// stripe
		stripeLoading: paymentFlow.stripeLoading,
		stripeReady: paymentFlow.stripeReady,
		stripeConfigured: paymentFlow.stripeConfigured,
		cardPaymentsUnavailable: paymentFlow.cardPaymentsUnavailable,
		cardPaymentsNotice: paymentFlow.cardPaymentsNotice,
		initStripe: paymentFlow.initStripe,

		// wallet express (Apple Pay / Google Pay)
		canMakePayment: paymentFlow.canMakePayment,
		paymentRequestContainer: paymentFlow.paymentRequestContainer,
		paymentRequestError: paymentFlow.paymentRequestError,
		isAppleAvailable: paymentFlow.isAppleAvailable,
		isGoogleAvailable: paymentFlow.isGoogleAvailable,
		mountPaymentRequestButton: paymentFlow.mountPaymentRequestButton,

		// promo
		loadPriceBands: cartOps.loadPriceBands,
		promoSettings: cartOps.promoSettings,

		// packages & totals
		displayPackages: cartOps.displayPackages,
		addressGroups: cartOps.addressGroups,
		hasMultipleGroups: cartOps.hasMultipleGroups,
		mergeGroupsCount: cartOps.mergeGroupsCount,
		getTotal: cartOps.getTotal,
		getNumberTotal: cartOps.getNumberTotal,
		totalPackages: cartOps.totalPackages,
		contentDescription: cartOps.contentDescription,
		formatPrice: cartOps.formatPrice,
		finalTotal: cartOps.finalTotal,
		finalTotalFormatted: cartOps.finalTotalFormatted,

		// billing
		fatturazioneType: cartOps.fatturazioneType,
		invoiceSubjectType: cartOps.invoiceSubjectType,
		fatturaData: cartOps.fatturaData,
		billingShippingFullAddress: cartOps.billingShippingFullAddress,

		// wallet
		walletFormatted: cartOps.walletFormatted,
		walletLoaded: cartOps.walletLoaded,
		walletSufficient: cartOps.walletSufficient,

		// coupon
		couponCode: cartOps.couponCode,
		couponLoading: cartOps.couponLoading,
		couponError: cartOps.couponError,
		couponApplied: cartOps.couponApplied,
		couponPanelOpen: cartOps.couponPanelOpen,
		validateCoupon: cartOps.validateCoupon,
		removeCoupon: cartOps.removeCoupon,
		autoApplyReferral: cartOps.autoApplyReferral,

		// payment method
		paymentMethod: paymentFlow.paymentMethod,
		paymentMethodOptions: paymentFlow.paymentMethodOptions,
		selectPaymentMethod: paymentFlow.selectPaymentMethod,

		// card element
		cardElementContainer: paymentFlow.cardElementContainer,
		cardMounted: paymentFlow.cardMounted,
		cardComplete: paymentFlow.cardComplete,
		cardError: paymentFlow.cardError,
		shouldShowCardForm: paymentFlow.shouldShowCardForm,
		useNewCard: paymentFlow.useNewCard,
		saveCardForFuture: paymentFlow.saveCardForFuture,
		hasSavedCard: paymentFlow.hasSavedCard,
		defaultPayment: paymentFlow.defaultPayment,

		// payment flow
		termsAccepted: validation.termsAccepted,
		showConfirmModal: paymentFlow.showConfirmModal,
		confirmPayment: paymentFlow.confirmPayment,
		proceedWithPayment: paymentFlow.proceedWithPayment,
		isProcessing: paymentFlow.isProcessing,
		paymentError: paymentFlow.paymentError,
		paymentSuccess: paymentFlow.paymentSuccess,
		successOrderId: paymentFlow.successOrderId,
		paymentStep: paymentFlow.paymentStep,
		paymentActionLabel: validation.paymentActionLabel,
		canPay: validation.canPay,
		payButtonTooltip: validation.payButtonTooltip,

		// fallback
		fallbackFlowRoute: cartOps.fallbackFlowRoute,
	}
}
