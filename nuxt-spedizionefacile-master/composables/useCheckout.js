/**
 * useCheckout — facade composable that re-exports from three focused modules.
 *
 * Split into:
 *   - useCartOperations:      cart, packages, totals, billing, wallet, coupon/referral
 *   - usePaymentFlow:         Stripe init, card element, payment method, payment processing
 *   - useCheckoutValidation:  terms, canPay, billing validation, pay button tooltip
 *
 * All existing consumers of useCheckout() continue to work without changes.
 * The pure utility functions (buildCheckoutSubmissionSignature, recoverCheckoutCartState)
 * remain exported from this file so existing named imports are not broken.
 */
import { useCartOperations } from '~/composables/useCartOperations';
import { usePaymentFlow } from '~/composables/usePaymentFlow';
import { useCheckoutValidation } from '~/composables/useCheckoutValidation';

// ---------------------------------------------------------------------------
// Pure utility helpers — exported by name (used by tests & usePaymentFlow)
// ---------------------------------------------------------------------------

const normalizeCheckoutValue = (value) => {
	if (Array.isArray(value)) {
		return value.map((item) => normalizeCheckoutValue(item));
	}

	if (value && typeof value === 'object') {
		return Object.keys(value)
			.sort()
			.reduce((acc, key) => {
				const normalized = normalizeCheckoutValue(value[key]);
				if (normalized !== undefined) {
					acc[key] = normalized;
				}
				return acc;
			}, {});
	}

	if (value === undefined) return null;
	return value;
};

const normalizeCheckoutPackageSnapshot = (pkg = {}) => ({
	id: pkg.id ?? pkg.package_id ?? null,
	package_type: String(pkg.package_type ?? '').trim() || null,
	quantity: Number(pkg.quantity) || 1,
	weight: Number(pkg.weight) || 0,
	first_size: Number(pkg.first_size) || 0,
	second_size: Number(pkg.second_size) || 0,
	third_size: Number(pkg.third_size) || 0,
	single_price: Number(pkg.single_price) || 0,
	content_description: String(pkg.content_description ?? '').trim() || null,
	origin_address: normalizeCheckoutValue(pkg.origin_address || {}),
	destination_address: normalizeCheckoutValue(pkg.destination_address || {}),
	services: normalizeCheckoutValue(pkg.services || {}),
	delivery_mode: pkg.delivery_mode ?? pkg.services?.serviceData?.delivery_mode ?? null,
	selected_pudo: normalizeCheckoutValue(pkg.selected_pudo ?? pkg.pudo ?? pkg.services?.serviceData?.pudo ?? null),
	sms_email_notification: Boolean(
		pkg.sms_email_notification || pkg.services?.sms_email_notification || pkg.services?.serviceData?.sms_email_notification,
	),
});

export const buildCheckoutSubmissionSignature = ({ existingOrderId = null, cartPackages = [], billingPayload = null } = {}) => {
	const normalizedPackages = Array.isArray(cartPackages) ? cartPackages.map((pkg) => normalizeCheckoutPackageSnapshot(pkg)) : [];

	normalizedPackages.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));

	return JSON.stringify(
		normalizeCheckoutValue({
			existingOrderId: existingOrderId ?? null,
			cartPackages: normalizedPackages,
			billingPayload: billingPayload ?? null,
		}),
	);
};

export const recoverCheckoutCartState = async ({
	clearCartData = null,
	refreshCartState = null,
	refreshCartCache = null,
	cartKey = 'cart',
} = {}) => {
	const clearFn = clearCartData || globalThis.clearNuxtData;
	clearFn?.(cartKey);

	await Promise.allSettled([
		typeof refreshCartState === 'function' ? Promise.resolve(refreshCartState()) : Promise.resolve(),
		typeof refreshCartCache === 'function' ? Promise.resolve(refreshCartCache(cartKey)) : Promise.resolve(),
	]);
};

// ---------------------------------------------------------------------------
// Facade composable — wires the three sub-composables together
// ---------------------------------------------------------------------------

export function useCheckout() {
	// 1. Cart operations (no dependencies on the other two)
	const cartOps = useCartOperations();

	// 2. Payment flow — depends on cart operations.
	//    We pass in a lazy `canPay` ref that will be populated after validation is created.
	//    Also pass `validateBillingFields` and `validateMinimumAmount` via a wrapper.
	const lazyCanPay = ref(false);
	const lazyValidateBillingFields = () => null;
	const lazyValidateMinimumAmount = () => null;

	// Store references to validation functions that will be replaced after init
	const validationFns = { billing: lazyValidateBillingFields, amount: lazyValidateMinimumAmount };

	const paymentFlow = usePaymentFlow({
		cart: cartOps.cart,
		refreshCart: cartOps.refreshCart,
		sanctum: cartOps.sanctum,
		userStore: cartOps.userStore,
		user: cartOps.user,
		existingOrderId: cartOps.existingOrderId,
		existingOrder: cartOps.existingOrder,
		getNumberTotal: cartOps.getNumberTotal,
		finalTotal: cartOps.finalTotal,
		billingPayload: cartOps.billingPayload,
		couponApplied: cartOps.couponApplied,
		loadWalletBalance: cartOps.loadWalletBalance,
		canPay: lazyCanPay,
		validateBillingFields: () => validationFns.billing(),
		validateMinimumAmount: () => validationFns.amount(),
	});

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
	});

	// Wire the lazy canPay ref to the real computed from validation
	watch(validation.canPay, (val) => { lazyCanPay.value = val; }, { immediate: true });

	// Wire real validation functions into the payment flow
	validationFns.billing = validation.validateBillingFields;
	validationFns.amount = validation.validateMinimumAmount;

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
	};
}
