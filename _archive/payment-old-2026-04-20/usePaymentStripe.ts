// usePaymentStripe — bootstrap Stripe SDK + card element lifecycle + saved card detection.
import type { Ref } from 'vue';

interface UsePaymentStripeOptions {
	user: Ref<any>;
	paymentMethod: Ref<string>;
}

export const usePaymentStripe = ({ user, paymentMethod }: UsePaymentStripeOptions) => {
	const sanctum = useSanctumClient();
	const config = useRuntimeConfig();

	// --- STRIPE CONFIG ---
	const stripePublishableKey = ref('');
	const isAdmin = computed(() => user.value?.role === 'Admin');
	const stripeLoading = ref(true);
	const isValidStripePublishableKey = (value: unknown): boolean => {
		const key = String(value || '').trim();
		return key.startsWith('pk_') && !key.includes('placeholder');
	};
	const stripeConfigured = computed(() => isValidStripePublishableKey(stripePublishableKey.value));
	const cardPaymentsUnavailable = computed(() => !stripeLoading.value && !stripeConfigured.value);
	const cardPaymentsNotice = computed(() => {
		return isAdmin.value
			? 'I pagamenti con carta non sono ancora attivi in questo ambiente. Completa la configurazione di Stripe dal pannello amministrazione per riabilitarli.'
			: "I pagamenti con carta non sono ancora attivi su questo sito. Per ora puoi completare l'ordine con bonifico o wallet.";
	});

	// --- SAVED CARD ---
	const { data: defaultPayment } = useSanctumFetch('/api/stripe/default-payment-method', { lazy: true });
	const hasSavedCard = computed(() => Boolean((defaultPayment.value as any)?.card));

	// --- CARD ELEMENT ---
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let stripe: any = null;
	const stripeReady = ref(false);
	const cardElement = ref<any>(null);
	const cardMounted = ref(false);
	const cardComplete = ref(false);
	const cardError = ref<string | null>(null);
	const cardElementContainer = ref<HTMLElement | null>(null);
	const useNewCard = ref(false);
	// GDPR: opt-in esplicito. L'utente deve selezionare la checkbox per salvare la carta.
	const saveCardForFuture = ref(false);
	const paymentError = ref<string | null>(null);

	const createCardElement = (): void => {
		if (cardElement.value || !stripe) return;

		// locale 'it' -> placeholder e messaggi errore Stripe in italiano.
		const elements = stripe.elements({ locale: 'it' });
		cardElement.value = elements.create('card', {
			style: {
				base: {
					fontSize: '15px',
					color: '#252B42',
					fontFamily: '"Inter", sans-serif',
					'::placeholder': { color: '#A0A5AB' },
				},
				invalid: { color: '#EF4444' },
			},
			hidePostalCode: true,
		});

		cardElement.value.on('change', (event: any) => {
			cardComplete.value = event.complete;
			cardError.value = event.error?.message || null;
		});
	};

	const mountCardElement = async (): Promise<void> => {
		if (!stripe) return;

		for (let attempt = 0; attempt < 12; attempt += 1) {
			await nextTick();
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

			const container = cardElementContainer.value;
			if (!container || !container.isConnected) {
				await new Promise<void>((resolve) => setTimeout(resolve, 40));
				continue;
			}

			createCardElement();
			if (!cardElement.value) return;

			if (cardMounted.value) {
				const hasIframe = container.querySelector('iframe');
				if (hasIframe) return;
				cardMounted.value = false;
			}

			container.innerHTML = '';
			cardElement.value.mount(container);
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

			if (!container.querySelector('iframe')) {
				cardMounted.value = false;
				cardElement.value.unmount?.();
				await new Promise<void>((resolve) => setTimeout(resolve, 60));
				continue;
			}

			cardMounted.value = true;
			cardError.value = null;
			return;
		}

		cardError.value = 'Il campo carta non si è caricato correttamente. Riprova o ricarica la pagina.';
	};

	const unmountCardElement = (): void => {
		if (!cardElement.value || !cardMounted.value) return;
		cardElement.value.unmount();
		cardMounted.value = false;
	};

	const shouldShowCardForm = computed(() => {
		return (
			paymentMethod.value === 'carta' &&
			stripeReady.value &&
			!stripeLoading.value &&
			!cardPaymentsUnavailable.value &&
			(!hasSavedCard.value || useNewCard.value)
		);
	});

	watch(
		shouldShowCardForm,
		async (shouldShow) => {
			if (shouldShow) {
				await mountCardElement();
				return;
			}
			unmountCardElement();
		},
		{ flush: 'post', immediate: true },
	);

	watch(
		cardElementContainer,
		async (container) => {
			if (!container || !shouldShowCardForm.value) return;
			await mountCardElement();
		},
		{ flush: 'post' },
	);

	// --- STRIPE INIT ---
	const resolveStripePublishableKey = async (): Promise<string> => {
		try {
			const stripeConfig = await sanctum('/api/settings/stripe') as any;
			const key = String(stripeConfig?.publishable_key || '').trim();
			if (isValidStripePublishableKey(key)) return key;
		} catch {
			// Fallback below
		}
		return String((config.public as any).stripeKey || '').trim();
	};

	const initStripe = async (): Promise<void> => {
		const stripeTimeout = setTimeout(() => {
			if (!stripeReady.value) {
				paymentError.value = 'Impossibile caricare Stripe. Ricarica la pagina.';
			}
		}, 10000);

		try {
			if (stripe && stripeReady.value) {
				clearTimeout(stripeTimeout);
				stripeLoading.value = false;
				return;
			}
			stripePublishableKey.value = await resolveStripePublishableKey();
			if (!stripeConfigured.value) {
				clearTimeout(stripeTimeout);
				if (paymentMethod.value === 'carta') {
					paymentMethod.value = 'bonifico';
				}
				stripeLoading.value = false;
				return;
			}

			const { loadStripe } = await import('@stripe/stripe-js');
			const stripePromise = loadStripe(stripePublishableKey.value);
			stripe = await stripePromise;
			if (!stripe) {
				throw new Error('Stripe non inizializzato correttamente.');
			}
			stripeReady.value = true;
			clearTimeout(stripeTimeout);
		} catch {
			clearTimeout(stripeTimeout);
			paymentError.value = 'Errore caricamento sistema pagamenti.';
		} finally {
			stripeLoading.value = false;
		}
	};

	const getStripeInstance = () => stripe;

	return {
		// state
		stripeLoading,
		stripeReady,
		stripeConfigured,
		cardPaymentsUnavailable,
		cardPaymentsNotice,
		// saved card
		defaultPayment,
		hasSavedCard,
		// card element
		cardElementContainer,
		cardElement,
		cardMounted,
		cardComplete,
		cardError,
		shouldShowCardForm,
		useNewCard,
		saveCardForFuture,
		// errors shared with flow
		paymentError,
		// actions
		initStripe,
		getStripeInstance,
	};
};
