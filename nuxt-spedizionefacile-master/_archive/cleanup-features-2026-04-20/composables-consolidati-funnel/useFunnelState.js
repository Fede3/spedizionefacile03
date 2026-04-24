/**
 * useFunnelState
 * ----------------------------------------------------------------------------
 * Aggregates locally-owned refs used across the shipment funnel page
 * (/la-tua-spedizione/[step].vue) that are NOT already provided by existing
 * composables (useShipmentStepServices, useShipmentStepAddresses, useCheckout,
 * useShipmentStepFlow, ...).
 *
 * This composable is intentionally thin: it only extracts reactive state and
 * pure template helpers. Payment route context and accordion orchestration
 * remain in the page to preserve fix T3.6.5 (syncPaymentRouteContext /
 * ensurePaymentStageReady / openPaymentAccordion) exactly as shipped.
 * ----------------------------------------------------------------------------
 */

import { computed, ref } from 'vue';

const THROTTLE_ERROR_PATTERN = /numero massimo di tentativi|hai superato|riprova tra|attendi(?: ancora)?|\d+\s*(second|minut)|too many (attempts|requests)|tentativi troppo frequenti|rate limit|429/i;
const THROTTLE_STATUS_PATTERN = /\b429\b|too[\s_-]*many[\s_-]*requests|throttled|rate[\s_-]*limited/i;

const createFunnelErrorHelpers = () => {
	const normalizeFunnelErrorMessage = (message) => {
		if (!message) return '';
		if (typeof message === 'string') return message.trim();
		if (Array.isArray(message)) {
			return message
				.map((entry) => normalizeFunnelErrorMessage(entry))
				.filter(Boolean)
				.join(' ');
		}
		if (typeof message === 'object') {
			const anyMsg = message;
			return [
				anyMsg.message,
				anyMsg.error,
				anyMsg.errors,
				anyMsg.statusMessage,
				anyMsg.data?.message,
				anyMsg.data?.error,
				anyMsg.data?.errors,
				anyMsg.response?._data?.message,
				anyMsg.response?._data?.error,
				anyMsg.response?._data?.errors,
				anyMsg.response?.data?.message,
				anyMsg.response?.data?.error,
				anyMsg.response?.data?.errors,
			]
				.map((entry) => normalizeFunnelErrorMessage(entry))
				.filter(Boolean)
				.join(' ');
		}

		return String(message).trim();
	};

	const resolveFunnelErrorMessage = (error, fallbackMessage = '') => (
		normalizeFunnelErrorMessage(error) || normalizeFunnelErrorMessage(fallbackMessage)
	);

	const normalizeFunnelErrorStatus = (message) => {
		if (!message || typeof message !== 'object') return '';
		const anyMsg = message;

		return [
			anyMsg.status,
			anyMsg.statusCode,
			anyMsg.code,
			anyMsg.statusText,
			anyMsg.data?.status,
			anyMsg.data?.statusCode,
			anyMsg.data?.code,
			anyMsg.data?.statusText,
			anyMsg.response?.status,
			anyMsg.response?.statusCode,
			anyMsg.response?.statusText,
			anyMsg.response?._data?.status,
			anyMsg.response?._data?.statusCode,
			anyMsg.response?._data?.code,
			anyMsg.response?._data?.statusText,
			anyMsg.response?.data?.status,
			anyMsg.response?.data?.statusCode,
			anyMsg.response?.data?.code,
			anyMsg.response?.data?.statusText,
		]
			.map((entry) => String(entry ?? '').trim())
			.find(Boolean) || '';
	};

	const isThrottleLikeFunnelError = (message) => {
		const normalizedMessage = normalizeFunnelErrorMessage(message);
		if (normalizedMessage && THROTTLE_ERROR_PATTERN.test(normalizedMessage)) return true;

		const normalizedStatus = normalizeFunnelErrorStatus(message);
		return THROTTLE_STATUS_PATTERN.test(normalizedStatus);
	};

	const stripFunnelThrottleMessage = (message) => {
		const normalized = normalizeFunnelErrorMessage(message);
		if (isThrottleLikeFunnelError(message)) return '';
		return normalized;
	};

	return {
		normalizeFunnelErrorMessage,
		resolveFunnelErrorMessage,
		normalizeFunnelErrorStatus,
		isThrottleLikeFunnelError,
		stripFunnelThrottleMessage,
	};
};

/** Composable aggregatore stato locale pagina funnel. */
export function useFunnelState() {
	const errors = {
		dateError: ref(null),
		submitError: ref(null),
		contentError: ref(null),
		paymentBootstrapError: ref(''),
		packagesError: ref(''),
	};

	const templateRefs = {
		formRef: ref(null),
		stepsRef: ref(null),
		pickupDateSectionRef: ref(null),
		packagesStageRef: ref(null),
		servicesStageRef: ref(null),
		addressStageRef: ref(null),
		paymentStageRef: ref(null),
	};

	const ui = {
		paymentBootstrapPending: ref(false),
		paymentSummaryExpanded: ref(false),
		isProceedingToPayment: ref(false),
	};

	const iconFilters = {
		SERVICE_ICON_FILTER_IDLE:
			'brightness(0) saturate(100%) invert(23%) sepia(23%) saturate(1100%) hue-rotate(151deg) brightness(92%) contrast(88%)',
		SERVICE_ICON_FILTER_ACTIVE: 'brightness(0) invert(1)',
	};

	const helpers = createFunnelErrorHelpers();

	const visibleSubmitError = computed(() => helpers.stripFunnelThrottleMessage(errors.submitError.value));
	const visiblePaymentBootstrapError = computed(() =>
		helpers.stripFunnelThrottleMessage(errors.paymentBootstrapError.value),
	);

	// Auto-clear throttle-like messages so we never surface them. Consumers
	// must still pass paymentError (owned by useCheckout) to keep parity.
	watch(
		() => errors.submitError.value,
		(value) => {
			if (!value || !helpers.isThrottleLikeFunnelError(value)) return;
			errors.submitError.value = null;
		},
		{ flush: 'sync' },
	);

	watch(
		() => errors.paymentBootstrapError.value,
		(value) => {
			if (!value || !helpers.isThrottleLikeFunnelError(value)) return;
			errors.paymentBootstrapError.value = '';
		},
		{ flush: 'sync' },
	);

	return {
		errors,
		templateRefs,
		ui,
		iconFilters,
		helpers,
		visibleSubmitError,
		visiblePaymentBootstrapError,
	};
}
