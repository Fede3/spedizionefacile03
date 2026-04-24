import type { Ref } from 'vue';

interface UsePaymentRequestOptions {
	getStripeInstance: () => any;
	totalAmountCents: Ref<number>;
	currency: Ref<string>;
	label: Ref<string>;
}

export const usePaymentRequestButton = ({
	getStripeInstance,
	totalAmountCents,
	currency,
	label,
}: UsePaymentRequestOptions) => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const paymentRequest = ref<any>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const paymentRequestElement = ref<any>(null);
	const canMakePayment = ref(false);
	const paymentRequestContainer = ref<HTMLElement | null>(null);
	const paymentRequestError = ref<string | null>(null);
	const paymentRequestMethodTypes = ref<Set<string>>(new Set());
	const paymentRequestMounted = ref(false);

	const isAppleAvailable = computed(() => paymentRequestMethodTypes.value.has('applePay'));
	const isGoogleAvailable = computed(() => paymentRequestMethodTypes.value.has('googlePay'));

	/**
	 * Inizializza il PaymentRequest e verifica se il device/browser
	 * supporta Apple Pay o Google Pay. Va chiamato una sola volta,
	 * dopo che Stripe e' pronto.
	 */
	const initPaymentRequest = async (): Promise<void> => {
		const stripe = getStripeInstance();
		if (!stripe || paymentRequest.value) return;

		try {
			const pr = stripe.paymentRequest({
				country: 'IT',
				currency: (currency.value || 'eur').toLowerCase(),
				total: {
					label: label.value || 'Spedizione',
					amount: Math.max(0, Math.round(totalAmountCents.value || 0)),
				},
				requestPayerName: true,
				requestPayerEmail: true,
			});

			const result = await pr.canMakePayment();
			canMakePayment.value = Boolean(result);

			if (result) {
				// result e' tipo { applePay: true } oppure { googlePay: true }
				const types = new Set<string>();
				Object.keys(result).forEach((k) => {
					if ((result as Record<string, boolean>)[k]) types.add(k);
				});
				paymentRequestMethodTypes.value = types;
				paymentRequest.value = pr;
			}
		} catch (err: any) {
			// Stripe lancia se currency/amount non validi: logghiamo ma non blocchiamo il flusso.
			console.warn('[usePaymentRequestButton] init fallito:', err?.message || err);
			canMakePayment.value = false;
		}
	};

	/**
	 * Monta il bottone Apple Pay / Google Pay nel container ref.
	 * Stripe renderizza automaticamente il logo giusto (Apple o Google)
	 * in base al device/browser dell'utente.
	 */
	const mountPaymentRequestButton = async (): Promise<void> => {
		const stripe = getStripeInstance();
		if (!stripe || !paymentRequest.value) return;
		if (!paymentRequestContainer.value) return;
		if (paymentRequestMounted.value) return;

		const elements = stripe.elements();
		paymentRequestElement.value = elements.create('paymentRequestButton', {
			paymentRequest: paymentRequest.value,
			style: {
				paymentRequestButton: {
					type: 'default', // 'default' | 'buy' | 'donate' | 'book'
					theme: 'dark',
					height: '46px',
				},
			},
		});

		paymentRequestElement.value.on('click', () => {
			paymentRequestError.value = null;
		});

		paymentRequestContainer.value.innerHTML = '';
		paymentRequestElement.value.mount(paymentRequestContainer.value);
		paymentRequestMounted.value = true;
	};

	const unmountPaymentRequestButton = (): void => {
		if (!paymentRequestElement.value || !paymentRequestMounted.value) return;
		try {
			paymentRequestElement.value.unmount();
		} catch {
			// no-op: l'unmount puo' fallire se il DOM e' gia' stato distrutto.
		}
		paymentRequestMounted.value = false;
	};

	/**
	 * Aggiorna amount/currency sul PaymentRequest gia' creato.
	 * Necessario quando il totale cambia (coupon applicato, servizi aggiunti).
	 */
	const updateAmount = (): void => {
		if (!paymentRequest.value) return;
		try {
			paymentRequest.value.update({
				total: {
					label: label.value || 'Spedizione',
					amount: Math.max(0, Math.round(totalAmountCents.value || 0)),
				},
				currency: (currency.value || 'eur').toLowerCase(),
			});
		} catch (err: any) {
			console.warn('[usePaymentRequestButton] update fallito:', err?.message || err);
		}
	};

	watch([totalAmountCents, currency, label], () => {
		updateAmount();
	});

	/**
	 * Registra l'handler per l'evento "paymentmethod" emesso dal PaymentRequest
	 * dopo che l'utente conferma il pagamento nella sheet Apple/Google Pay.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const onPaymentRequestEvent = (handler: (event: any) => Promise<void> | void): void => {
		if (!paymentRequest.value) return;
		paymentRequest.value.on('paymentmethod', handler);
	};

	return {
		paymentRequest,
		canMakePayment,
		paymentRequestContainer,
		paymentRequestError,
		paymentRequestMounted,
		isAppleAvailable,
		isGoogleAvailable,
		initPaymentRequest,
		mountPaymentRequestButton,
		unmountPaymentRequestButton,
		onPaymentRequestEvent,
		updateAmount,
	};
};
