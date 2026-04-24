// usePaymentFlow — orchestratore del flusso pagamento checkout.
// Delega Stripe/card element a usePaymentStripe, processPayment a usePaymentProcess.
import { createClientSubmissionId, ensureClientSubmissionId, readClientSubmissionId } from '~/utils/clientSubmissionId';
import { buildCheckoutSubmissionSignature, recoverCheckoutCartState } from '~/utils/checkoutSignature';
import { buildCheckoutSuccessQuery, readCheckoutSuccessState, clearCheckoutSuccessQuery } from '~/utils/checkoutSuccess';
import { usePaymentStripe } from '~/composables/usePaymentStripe';
import { usePaymentRequestButton } from '~/composables/usePaymentRequestButton';
import { createPayOrder } from '~/composables/usePaymentProcess';
import { translateStripeError } from '~/utils/stripeErrors';

import type { Ref, ComputedRef } from 'vue';

interface PaymentMethodOption {
	key: string;
	title: string;
	description: string;
	badge?: string;
}

interface PaymentFlowDeps {
	// from useCartOperations
	cart: Ref<any>;
	refreshCart: () => Promise<void>;
	sanctum: any;
	shipmentFlowStore: any;
	user: Ref<any>;
	existingOrderId: Ref<string | number | null>;
	existingOrder: Ref<any>;
	getNumberTotal: ComputedRef<number>;
	finalTotal: Ref<number | string>;
	billingPayload: Ref<any>;
	couponApplied: Ref<any>;
	loadWalletBalance: () => Promise<void>;
	// from useCheckoutValidation
	canPay: ComputedRef<boolean>;
	validateBillingFields: () => string | null;
	validateMinimumAmount: () => string | null;
	// Opzionale: se fornito, viene usato come guard hard per wallet express
	// (Apple Pay / Google Pay) — canPay già copre il flow classico ma il
	// bottone PaymentRequest può scatenarsi indipendentemente.
	termsAccepted?: Ref<boolean>;
}

export function usePaymentFlow({
	cart,
	refreshCart,
	sanctum,
	shipmentFlowStore,
	user,
	existingOrderId,
	existingOrder,
	getNumberTotal,
	finalTotal,
	billingPayload,
	couponApplied,
	loadWalletBalance,
	canPay,
	validateBillingFields,
	validateMinimumAmount,
	termsAccepted,
}: PaymentFlowDeps = {} as PaymentFlowDeps) {
	const route = useRoute();
	const router = useRouter();
	// Funnel analytics: track payment_success / payment_fail.
	// Nessun PII: solo order_id e amount in cents.
	const { trackPaymentSuccess, trackPaymentFail } = useFunnelAnalytics();
	// GA4 e-commerce: purchase event standard (transaction_id, value, items).
	const { purchase: trackPurchase } = useEcommerceAnalytics();

	// --- PAYMENT METHOD ---
	const paymentMethod = ref<string>('carta');
	const paymentMethodOptions: PaymentMethodOption[] = [
		{ key: 'carta', title: 'Carta', description: 'Visa, Mastercard, Amex', badge: 'Più usato' },
		{ key: 'paypal', title: 'PayPal', description: 'Paga col tuo conto PayPal' },
		{ key: 'google_pay', title: 'Google Pay', description: 'Paga rapido da Android' },
		{ key: 'bonifico', title: 'Bonifico', description: '1-2 giorni lavorativi' },
		{ key: 'wallet', title: 'Wallet', description: 'Saldo prepagato' },
	];

	// --- STRIPE (card element + saved card) delegato a usePaymentStripe ---
	const stripe = usePaymentStripe({ user, paymentMethod });
	const {
		stripeLoading,
		stripeReady,
		stripeConfigured,
		cardPaymentsUnavailable,
		cardPaymentsNotice,
		defaultPayment,
		hasSavedCard,
		cardElementContainer,
		cardElement,
		cardMounted,
		cardComplete,
		cardError,
		shouldShowCardForm,
		useNewCard,
		saveCardForFuture,
		paymentError,
		initStripe: initStripeCore,
		getStripeInstance,
	} = stripe;

	// --- APPLE PAY / GOOGLE PAY (Stripe PaymentRequestButton) ---
	// wallet rapidi come scorciatoia sopra i metodi
	// classici. Riusa lo stesso PaymentIntent flow di carta nuova, quindi
	// nessun nuovo endpoint backend necessario. Vedi TODO_PAYPAL.md per PayPal.
	const totalAmountCents = computed(() => Math.round(Number(finalTotal.value || 0) * 100));
	const paymentRequestCurrency = ref('eur');
	const paymentRequestLabel = computed(() => 'Spedizione SpedizioneFacile');

	const prButton = usePaymentRequestButton({
		getStripeInstance,
		totalAmountCents,
		currency: paymentRequestCurrency,
		label: paymentRequestLabel as unknown as Ref<string>,
	});
	const {
		paymentRequest,
		canMakePayment,
		paymentRequestContainer,
		paymentRequestError,
		isAppleAvailable,
		isGoogleAvailable,
		initPaymentRequest,
		mountPaymentRequestButton,
		unmountPaymentRequestButton,
		onPaymentRequestEvent,
	} = prButton;

	// Termini non accettati → smontiamo il bottone Apple/Google Pay, rimontiamo
	// appena l'utente spunta. Stripe PaymentRequest non espone un disable nativo,
	// quindi l'unica UX pulita è togliere/rimettere il bottone dal DOM.
	// Fallback difensivo: la guard in processWalletExpressPayment aborta comunque.
	//
	// `immediate: true` garantisce che, se termsAccepted è false al primo render,
	// NON montiamo l'express button (e se è true e PR è gia' pronto, lo montiamo).
	// `paymentRequest.value` puo' essere null se initStripe non ha ancora completato:
	// in tal caso initStripe stesso gestira' il primo mount via mountPaymentRequestButton.
	if (termsAccepted) {
		watch(
			termsAccepted,
			async (accepted) => {
				if (!paymentRequest.value) return;
				if (accepted && canMakePayment.value) {
					await mountPaymentRequestButton();
				} else {
					unmountPaymentRequestButton();
				}
			},
			{ flush: 'post', immediate: true },
		);
	}

	// Memory leak guard: smonta il bottone Stripe quando il componente viene
	// distrutto (navigazione via router, HMR, ecc.). Stripe Elements non si
	// auto-distruggono e tengono iframe + listener attaccati al DOM.
	onBeforeUnmount(() => {
		unmountPaymentRequestButton();
	});

	const selectPaymentMethod = async (method: string): Promise<void> => {
		if (method === 'carta' && cardPaymentsUnavailable.value) return;
		paymentMethod.value = method;
	};

	watch(
		cardPaymentsUnavailable,
		(unavailable) => {
			if (unavailable && paymentMethod.value === 'carta') {
				paymentMethod.value = 'bonifico';
			}
		},
		{ immediate: true },
	);

	watch(paymentMethod, async (val) => {
		if (val === 'wallet') {
			await loadWalletBalance();
		}
	});

	// --- SUBMISSION CONTEXT (idempotency) ---
	const checkoutSubmissionContext = ref<{ signature: string; client_submission_id: string } | null>(null);
	const checkoutSubmissionSignature = computed(() => {
		const sourcePackages = existingOrder.value ? existingOrder.value.packages || [] : cart.value?.data || [];

		return buildCheckoutSubmissionSignature({
			existingOrderId: existingOrderId.value,
			cartPackages: sourcePackages,
			billingPayload: billingPayload.value,
		});
	});

	const buildCheckoutSubmissionContext = (): { client_submission_id: string } => {
		const signature = checkoutSubmissionSignature.value;
		const cachedContext = checkoutSubmissionContext.value;

		if (cachedContext?.signature === signature && cachedContext?.client_submission_id) {
			return { client_submission_id: cachedContext.client_submission_id };
		}

		const pendingShipment = shipmentFlowStore.pendingShipment || {};
		const clientSubmissionId = cachedContext?.signature
			? createClientSubmissionId()
			: readClientSubmissionId(existingOrder.value, pendingShipment) ||
				ensureClientSubmissionId(pendingShipment) ||
				createClientSubmissionId();

		checkoutSubmissionContext.value = {
			signature,
			client_submission_id: clientSubmissionId,
		};

		return { client_submission_id: clientSubmissionId };
	};

	// --- CONFIRM MODAL ---
	const showConfirmModal = ref(false);

	const confirmPayment = (): void => {
		if (!canPay.value) return;
		showConfirmModal.value = true;
	};

	const proceedWithPayment = (): void => {
		showConfirmModal.value = false;
		processPayment();
	};

	// --- PAYMENT STATE ---
	const isProcessing = ref(false);
	const paymentSuccess = ref(false);
	const successOrderId = ref<string | null>(null);
	const paymentStep = ref('');
	const syncPaymentSuccessFromRoute = (): void => {
		const successState = readCheckoutSuccessState(route.query);
		if (!successState.active) {
			return;
		}

		paymentSuccess.value = true;
		successOrderId.value = successState.orderIds.join(', ');
		paymentError.value = null;
		paymentStep.value = '';

		if (successState.paymentMethod && paymentMethodOptions.some((option) => option.key === successState.paymentMethod)) {
			paymentMethod.value = successState.paymentMethod;
		}

		// Clean checkout-success query params from URL after consuming them
		const cleanedQuery = clearCheckoutSuccessQuery(route.query);
		router.replace({ query: cleanedQuery });
	};

	watch(
		() => route.query,
		() => {
			if (isProcessing.value) return;
			syncPaymentSuccessFromRoute();
		},
		{ immediate: true, deep: true },
	);

	// --- PAYMENT PROCESSING ---
	const processPayment = async (): Promise<void> => {
		if (!canPay.value) return;
		isProcessing.value = true;
		paymentError.value = null;
		paymentStep.value = 'Validazione dati...';

		// Validate minimum amount for card payments
		const amountError = validateMinimumAmount();
		if (amountError) {
			paymentError.value = amountError;
			isProcessing.value = false;
			paymentStep.value = '';
			return;
		}

		// Validate billing fields if invoice requested
		const billingError = validateBillingFields();
		if (billingError) {
			paymentError.value = billingError;
			isProcessing.value = false;
			paymentStep.value = '';
			return;
		}

		try {
			let orderIds: (string | number)[] = [];
			const isExisting = !!existingOrderId.value;
			const submissionContext = buildCheckoutSubmissionContext();

			paymentStep.value = 'Creazione ordine...';

			if (isExisting) {
				orderIds = [existingOrderId.value!];
			} else {
				const orderResponse = await sanctum('/api/stripe/create-order', {
					method: 'POST',
					body: {
						subtotal: Math.round(getNumberTotal.value * 100),
						billing_data: billingPayload.value,
						...submissionContext,
					},
				}) as any;
				orderIds = orderResponse.order_ids || [orderResponse.order_id];
			}

			const primaryOrderId = orderIds[0];

			const onPaymentSuccess = async (): Promise<void> => {
				paymentStep.value = 'Finalizzazione...';
				if (couponApplied.value && couponApplied.value.type === 'referral') {
					try {
						await sanctum('/api/referral/apply', {
							method: 'POST',
							body: {
								code: couponApplied.value.code,
								order_id: primaryOrderId,
								order_amount: getNumberTotal.value,
							},
						});
					} catch (_err: any) {
						console.warn('Failed to apply referral after payment:', _err?.message || _err);
					}
				}

				const successfulOrderId = orderIds.length > 1 ? orderIds.join(', ') : primaryOrderId;
				paymentSuccess.value = true;
				successOrderId.value = String(successfulOrderId);
				// Analytics: pagamento completato. Amount in cents (finalTotal × 100).
				// Trackiamo TUTTI gli ordini pagati nel batch, non solo il primo.
				try {
					const amountCents = Math.round(Number(finalTotal.value || 0) * 100);
					trackPaymentSuccess(String(successfulOrderId ?? ''), amountCents);
					// GA4 e-commerce: purchase (transaction_id = order_id, value = finalTotal)
					trackPurchase({
						transactionId: String(primaryOrderId ?? successfulOrderId ?? ''),
						totalCents: amountCents,
						paymentType: String(paymentMethod.value || ''),
					});
				} catch {
					// no-op: analytics non blocca il flusso post-success.
				}
				if (!existingOrderId.value) {
					clearNuxtData('cart');
					await refreshNuxtData('cart');
				}
				const successQueryBase = { ...route.query };
				delete successQueryBase.order_id;
				await router.replace({
					query: buildCheckoutSuccessQuery(successQueryBase, {
						orderIds,
						paymentMethod: paymentMethod.value,
					}),
				});
				paymentStep.value = '';
			};

			const payOrderImpl = createPayOrder(
				{
					paymentMethod,
					paymentError,
					existingOrderId,
					finalTotal,
					defaultPayment,
					useNewCard,
					cardElement,
					saveCardForFuture,
					getStripeInstance,
					sanctum,
				},
				submissionContext,
			);

			const payOrder = async (orderId: string | number): Promise<boolean> => {
				if (orderIds.length > 1) {
					paymentStep.value = `Pagamento ordine ${orderIds.indexOf(orderId) + 1} di ${orderIds.length}...`;
				} else {
					paymentStep.value = 'Elaborazione pagamento...';
				}
				return payOrderImpl(orderId, orderIds.length);
			};

			const paidOrderIds: (string | number)[] = [];
			let allSuccess = true;

			for (let i = 0; i < orderIds.length; i++) {
				const success = await payOrder(orderIds[i]);
				if (success) {
					paidOrderIds.push(orderIds[i]);
				} else {
					allSuccess = false;
					if (paidOrderIds.length > 0) {
						paymentError.value = `Attenzione: ${paidOrderIds.length} ordine/i pagato/i con successo (${paidOrderIds.join(', ')}), ma il pagamento dell'ordine ${orderIds[i]} è fallito. Contatta l'assistenza per completare l'ordine rimanente.`;
						await recoverCheckoutCartState({
							refreshCartState: refreshCart,
							refreshCartCache: refreshNuxtData,
						});
					}
					return;
				}
			}

			if (allSuccess) {
				await onPaymentSuccess();
			}
		} catch (err: any) {
			paymentError.value = translateStripeError(err);
			// Analytics: pagamento fallito. Reason è la stringa d'errore tecnica,
			// utile per segmentare i fail per causa (insufficient_funds, 3ds_fail, ecc.).
			try {
				trackPaymentFail(String(paymentError.value || 'unknown'));
			} catch {
				// no-op
			}
		} finally {
			isProcessing.value = false;
			paymentStep.value = '';
		}
	};

	/**
	 * Processa un pagamento partito da Apple Pay / Google Pay.
	 * Flusso identico a processPayment carta, ma la conferma PaymentIntent
	 * avviene con il paymentMethod.id fornito dal PaymentRequest (non dal card element).
	 * Il parametro `event` e' l'evento Stripe "paymentmethod" con payload:
	 *   { paymentMethod, payerName, payerEmail, complete(status) }
	 */
	const processWalletExpressPayment = async (event: any): Promise<void> => {
		// Guard hard: Apple Pay / Google Pay scatenano la sheet nativa direttamente,
		// bypassando il bottone "Completa pagamento" in cui canPay include termsAccepted.
		// Se l'utente non ha accettato i termini, abortiamo qui.
		if (termsAccepted && !termsAccepted.value) {
			event.complete('fail');
			paymentError.value = 'Devi accettare i termini prima di procedere';
			paymentRequestError.value = paymentError.value;
			return;
		}
		if (isProcessing.value) {
			event.complete('fail');
			return;
		}

		isProcessing.value = true;
		paymentError.value = null;
		paymentRequestError.value = null;
		paymentStep.value = 'Validazione dati...';

		const amountError = validateMinimumAmount();
		if (amountError) {
			event.complete('fail');
			paymentError.value = amountError;
			paymentRequestError.value = amountError;
			isProcessing.value = false;
			paymentStep.value = '';
			return;
		}

		const billingError = validateBillingFields();
		if (billingError) {
			event.complete('fail');
			paymentError.value = billingError;
			paymentRequestError.value = billingError;
			isProcessing.value = false;
			paymentStep.value = '';
			return;
		}

		try {
			let orderIds: (string | number)[] = [];
			const isExisting = !!existingOrderId.value;
			const submissionContext = buildCheckoutSubmissionContext();

			paymentStep.value = 'Creazione ordine...';

			if (isExisting) {
				orderIds = [existingOrderId.value!];
			} else {
				const orderResponse = (await sanctum('/api/stripe/create-order', {
					method: 'POST',
					body: {
						subtotal: Math.round(getNumberTotal.value * 100),
						billing_data: billingPayload.value,
						...submissionContext,
					},
				})) as any;
				orderIds = orderResponse.order_ids || [orderResponse.order_id];
			}

			const primaryOrderId = orderIds[0];

			// Apple/Google Pay: un solo PaymentIntent puo' coprire l'ordine primario.
			// Se ci sono multi-ordini (hasMultipleGroups), per la scorciatoia wallet
			// paghiamo solo il primo e lasciamo gli altri in attesa — altrimenti
			// servirebbe una sheet per ogni ordine, UX inaccettabile.
			// In pratica pero' il backend accumula i gruppi in order_ids[]: qui
			// paghiamo il primaryOrderId e poi marchiamo gli altri con lo stesso PI id
			// tramite una loop successiva (safe: idempotente via submissionContext).
			paymentStep.value = 'Elaborazione pagamento...';

			const piEndpoint = isExisting
				? '/api/stripe/existing-order-payment-intent'
				: '/api/stripe/create-payment-intent';
			const piResponse = (await sanctum(piEndpoint, {
				method: 'POST',
				body: {
					order_id: primaryOrderId,
					...submissionContext,
				},
			})) as any;

			if (piResponse.error) {
				event.complete('fail');
				paymentError.value = piResponse.error;
				paymentRequestError.value = piResponse.error;
				trackPaymentFail(String(piResponse.error));
				return;
			}

			// Conferma con il paymentMethod fornito dalla sheet Apple/Google Pay.
			// handleActions: false ci lascia gestire 3DS manualmente DOPO event.complete.
			const { error: confirmError, paymentIntent } = await getStripeInstance().confirmCardPayment(
				piResponse.client_secret,
				{ payment_method: event.paymentMethod.id },
				{ handleActions: false },
			);

			if (confirmError) {
				event.complete('fail');
				paymentError.value = translateStripeError(confirmError) || 'Pagamento rifiutato.';
				paymentRequestError.value = paymentError.value;
				trackPaymentFail(String(confirmError.code || confirmError.message || 'confirm_failed'));
				return;
			}

			// Chiude la sheet Apple/Google Pay con stato "success" PRIMA di eventuale 3DS.
			event.complete('success');

			// 3DS handling: se richiesto, Stripe apre il modal di autenticazione.
			if (paymentIntent && paymentIntent.status === 'requires_action') {
				const { error: actionError, paymentIntent: afterAction } = await getStripeInstance().confirmCardPayment(
					piResponse.client_secret,
				);
				if (actionError) {
					paymentError.value = translateStripeError(actionError) || 'Autenticazione 3D Secure fallita.';
					trackPaymentFail(String(actionError.code || actionError.message || '3ds_failed'));
					return;
				}
				if (afterAction?.status !== 'succeeded') {
					paymentError.value = 'Stato pagamento: ' + (afterAction?.status || 'unknown');
					trackPaymentFail(String(afterAction?.status || 'unknown'));
					return;
				}
			} else if (paymentIntent && paymentIntent.status !== 'succeeded') {
				paymentError.value = 'Stato pagamento: ' + paymentIntent.status;
				trackPaymentFail(String(paymentIntent.status));
				return;
			}

			paymentStep.value = 'Finalizzazione...';

			// Marca tutti gli order_ids come pagati con lo stesso payment_intent_id.
			// submissionContext garantisce idempotenza lato backend.
			const paidEndpoint = isExisting ? '/api/stripe/existing-order-paid' : '/api/stripe/order-paid';
			for (const orderId of orderIds) {
				await sanctum(paidEndpoint, {
					method: 'POST',
					body: {
						order_id: orderId,
						ext_id: paymentIntent.id,
						is_existing_order: isExisting,
						...submissionContext,
					},
				});
			}

			// Coupon referral (post-success, best effort).
			if (couponApplied.value && couponApplied.value.type === 'referral') {
				try {
					await sanctum('/api/referral/apply', {
						method: 'POST',
						body: {
							code: couponApplied.value.code,
							order_id: primaryOrderId,
							order_amount: getNumberTotal.value,
						},
					});
				} catch (_err: any) {
					console.warn('Failed to apply referral after wallet payment:', _err?.message || _err);
				}
			}

			// UI: success state identico al flow carta.
			const successfulOrderId = orderIds.length > 1 ? orderIds.join(', ') : primaryOrderId;
			paymentSuccess.value = true;
			successOrderId.value = String(successfulOrderId);

			try {
				const amountCents = Math.round(Number(finalTotal.value || 0) * 100);
				trackPaymentSuccess(String(successfulOrderId ?? ''), amountCents);
				// GA4 e-commerce: purchase event per pagamento wallet.
				trackPurchase({
					transactionId: String(primaryOrderId ?? successfulOrderId ?? ''),
					totalCents: amountCents,
					paymentType: String(paymentMethod.value || 'wallet'),
				});
			} catch {
				// no-op
			}

			if (!existingOrderId.value) {
				clearNuxtData('cart');
				await refreshNuxtData('cart');
			}

			// Tag payment_method = 'wallet-express' nel query per Success.vue.
			const successQueryBase = { ...route.query };
			delete successQueryBase.order_id;
			await router.replace({
				query: buildCheckoutSuccessQuery(successQueryBase, {
					orderIds,
					paymentMethod: isAppleAvailable.value ? 'apple-pay' : 'google-pay',
				}),
			});
		} catch (err: any) {
			// event.complete gia' chiamato OPPURE fallimento pre-complete → chiudiamo fail.
			try { event.complete('fail'); } catch { /* gia' chiuso */ }
			paymentError.value = translateStripeError(err);
			paymentRequestError.value = paymentError.value;
			try {
				trackPaymentFail(String(paymentError.value || 'unknown'));
			} catch { /* no-op */ }
		} finally {
			isProcessing.value = false;
			paymentStep.value = '';
		}
	};

	/**
	 * Wrapper di initStripe: dopo l'init "core" (SDK + publishable key)
	 * inizializza anche il PaymentRequest per Apple/Google Pay e registra
	 * l'handler per processare il pagamento quando l'utente conferma nella sheet.
	 * Definito QUI (dopo processWalletExpressPayment) per evitare temporal dead zone.
	 */
	const initStripe = async (): Promise<void> => {
		await initStripeCore();
		if (stripeReady.value) {
			await initPaymentRequest();
			// Registra l'handler UNA sola volta, dopo che paymentRequest esiste.
			if (canMakePayment.value) {
				onPaymentRequestEvent((event) => processWalletExpressPayment(event));
			}
		}
	};

	return {
		// stripe config
		stripeLoading,
		stripeReady,
		stripeConfigured,
		cardPaymentsUnavailable,
		cardPaymentsNotice,
		initStripe,

		// wallet express (Apple Pay / Google Pay)
		canMakePayment,
		paymentRequestContainer,
		paymentRequestError,
		isAppleAvailable,
		isGoogleAvailable,
		mountPaymentRequestButton,

		// payment method
		paymentMethod,
		paymentMethodOptions,
		selectPaymentMethod,
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

		// confirm modal
		showConfirmModal,
		confirmPayment,
		proceedWithPayment,

		// payment state
		isProcessing,
		paymentError,
		paymentSuccess,
		successOrderId,
		paymentStep,
	};
}
