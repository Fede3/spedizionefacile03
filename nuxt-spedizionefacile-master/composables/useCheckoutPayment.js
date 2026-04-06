/**
 * useCheckoutPayment — Stripe init, card element, payment methods, and payment processing.
 *
 * Handles Stripe loading, card element mount/unmount, saved card detection,
 * payment method selection, and the full payment flow (card, wallet, bonifico).
 *
 * @param {Object} deps
 * @param {import('vue').ComputedRef<number>} deps.finalTotal - final total after discounts
 * @param {import('vue').ComputedRef<string>} deps.finalTotalFormatted - formatted final total
 * @param {import('vue').ComputedRef<number>} deps.getNumberTotal - numeric total before discounts
 * @param {import('vue').ComputedRef<string|null>} deps.existingOrderId - existing order ID from query
 * @param {import('vue').Ref<Object|null>} deps.existingOrder - existing order data
 * @param {import('vue').ComputedRef<Object>} deps.billingPayload - billing data payload
 * @param {import('vue').Ref<Object|null>} deps.couponApplied - applied coupon/referral
 * @param {Function} deps.validateBilling - validates billing, returns error string or null
 * @param {Function} deps.buildCheckoutSubmissionContext - builds submission context with idempotency key
 * @param {import('vue').ComputedRef<Array>} deps.cart - cart data ref
 * @param {Function} deps.refreshCart - refresh cart function
 */
export function useCheckoutPayment({
	finalTotal,
	finalTotalFormatted,
	getNumberTotal,
	existingOrderId,
	existingOrder,
	billingPayload,
	couponApplied,
	validateBilling,
	buildCheckoutSubmissionContext,
	cart,
	refreshCart,
}) {
	const { user } = useSanctumAuth();
	const sanctum = useSanctumClient();
	const config = useRuntimeConfig();

	// --- STRIPE CONFIG ---
	const stripePublishableKey = ref('');
	const isAdmin = computed(() => user.value?.role === 'Admin');
	const stripeLoading = ref(true);
	const isValidStripePublishableKey = (value) => {
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

	// --- WALLET ---
	const walletBalance = ref(0);
	const walletLoaded = ref(false);

	const loadWalletBalance = async () => {
		if (walletLoaded.value) return;
		try {
			const result = await sanctum('/api/wallet/balance');
			walletBalance.value = Number(result?.balance ?? 0);
			walletLoaded.value = true;
		} catch (e) {
			walletBalance.value = 0;
			walletLoaded.value = true;
		}
	};

	const walletFormatted = computed(() => walletBalance.value.toFixed(2).replace('.', ',') + '€');
	const walletSufficient = computed(() => walletBalance.value >= finalTotal.value);

	// --- SAVED CARD ---
	const { data: defaultPayment } = useSanctumFetch('/api/stripe/default-payment-method', { lazy: true });
	const hasSavedCard = computed(() => Boolean(defaultPayment.value?.card));

	// --- PAYMENT METHOD ---
	const paymentMethod = ref('carta');
	const paymentMethodOptions = [
		{ key: 'carta', title: 'Carta', description: 'Visa, Mastercard, Amex', badge: 'Più usato' },
		{ key: 'bonifico', title: 'Bonifico', description: '1-2 giorni lavorativi' },
		{ key: 'wallet', title: 'Wallet', description: 'Saldo prepagato' },
	];

	const selectPaymentMethod = async (method) => {
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

	// --- CARD ELEMENT ---
	let stripe = null;
	const stripeReady = ref(false);
	const cardElement = ref(null);
	const cardMounted = ref(false);
	const cardComplete = ref(false);
	const cardError = ref(null);
	const cardElementContainer = ref(null);
	const useNewCard = ref(false);
	const saveCardForFuture = ref(true);

	const createCardElement = () => {
		if (cardElement.value || !stripe) return;

		const elements = stripe.elements();
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

		cardElement.value.on('change', (event) => {
			cardComplete.value = event.complete;
			cardError.value = event.error?.message || null;
		});
	};

	const mountCardElement = async () => {
		if (!stripe) return;

		for (let attempt = 0; attempt < 12; attempt += 1) {
			await nextTick();
			await new Promise((resolve) => requestAnimationFrame(() => resolve()));

			const container = cardElementContainer.value;
			if (!container || !container.isConnected) {
				await new Promise((resolve) => setTimeout(resolve, 40));
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
			await new Promise((resolve) => requestAnimationFrame(() => resolve()));
			await new Promise((resolve) => requestAnimationFrame(() => resolve()));

			if (!container.querySelector('iframe')) {
				cardMounted.value = false;
				cardElement.value.unmount?.();
				await new Promise((resolve) => setTimeout(resolve, 60));
				continue;
			}

			cardMounted.value = true;
			cardError.value = null;
			return;
		}

		cardError.value = 'Il campo carta non si è caricato correttamente. Riprova o ricarica la pagina.';
	};

	const unmountCardElement = () => {
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

	// --- TERMS ---
	const termsAccepted = ref(false);

	// --- CONFIRM MODAL ---
	const showConfirmModal = ref(false);

	const confirmPayment = () => {
		if (!canPay.value) return;
		showConfirmModal.value = true;
	};

	const proceedWithPayment = () => {
		showConfirmModal.value = false;
		processPayment();
	};

	// --- PAYMENT STATE ---
	const isProcessing = ref(false);
	const paymentError = ref(null);
	const paymentSuccess = ref(false);
	const successOrderId = ref(null);
	const paymentStep = ref('');

	const paymentActionLabel = computed(() => {
		if (isProcessing.value) return 'Elaborazione...';
		if (paymentMethod.value === 'bonifico') return `Conferma ordine · ${finalTotalFormatted.value}`;
		return `Completa il pagamento · ${finalTotalFormatted.value}`;
	});

	const canPay = computed(() => {
		if (!termsAccepted.value) return false;
		if (isProcessing.value) return false;
		if (paymentMethod.value === 'carta') {
			if (defaultPayment.value?.card && !useNewCard.value) return true;
			return cardComplete.value;
		}
		if (paymentMethod.value === 'bonifico') return true;
		if (paymentMethod.value === 'wallet') return walletSufficient.value;
		return false;
	});

	const payButtonTooltip = computed(() => {
		if (!termsAccepted.value) return 'Accetta i termini e condizioni per procedere.';
		if (paymentMethod.value === 'wallet' && walletLoaded.value && !walletSufficient.value) return 'Saldo wallet insufficiente.';
		if (paymentMethod.value === 'carta' && !defaultPayment.value?.card && !cardComplete.value) return 'Inserisci i dati della carta.';
		return '';
	});

	// --- PAYMENT PROCESSING ---
	const processPayment = async () => {
		if (!canPay.value) return;
		isProcessing.value = true;
		paymentError.value = null;
		paymentStep.value = 'Validazione dati...';

		if (paymentMethod.value === 'carta' && finalTotal.value < 0.5) {
			paymentError.value = 'Importo minimo per pagamento con carta: 0,50€';
			isProcessing.value = false;
			paymentStep.value = '';
			return;
		}

		const billingError = validateBilling();
		if (billingError) {
			paymentError.value = billingError;
			isProcessing.value = false;
			paymentStep.value = '';
			return;
		}

		try {
			let orderIds = [];
			const isExisting = !!existingOrderId.value;
			const submissionContext = buildCheckoutSubmissionContext();

			paymentStep.value = 'Creazione ordine...';

			if (isExisting) {
				orderIds = [existingOrderId.value];
			} else {
				const orderResponse = await sanctum('/api/stripe/create-order', {
					method: 'POST',
					body: {
						subtotal: Math.round(getNumberTotal.value * 100),
						billing_data: billingPayload.value,
						...submissionContext,
					},
				});
				orderIds = orderResponse.order_ids || [orderResponse.order_id];
			}

			const primaryOrderId = orderIds[0];

			const onPaymentSuccess = async () => {
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
					} catch (_) {
						// Referral apply is best-effort after payment success
					}
				}

				paymentSuccess.value = true;
				successOrderId.value = orderIds.length > 1 ? orderIds.join(', ') : primaryOrderId;
				if (!existingOrderId.value) {
					clearNuxtData('cart');
					await refreshNuxtData('cart');
				}
				paymentStep.value = '';
			};

			const payOrder = async (orderId, isFirst) => {
				if (orderIds.length > 1) {
					paymentStep.value = `Pagamento ordine ${orderIds.indexOf(orderId) + 1} di ${orderIds.length}...`;
				} else {
					paymentStep.value = 'Elaborazione pagamento...';
				}

				if (paymentMethod.value === 'bonifico') {
					await sanctum('/api/stripe/mark-order-completed', {
						method: 'POST',
						body: {
							order_id: orderId,
							payment_type: 'bonifico',
							is_existing_order: !!existingOrderId.value,
							...submissionContext,
						},
					});
					return true;
				}

				if (paymentMethod.value === 'wallet') {
					const orderData = orderIds.length > 1 ? await sanctum(`/api/orders/${orderId}`) : null;
					const orderAmount = orderData
						? Number(
								String(orderData?.data?.subtotal || '0')
									.replace(/[^0-9.,]/g, '')
									.replace(',', '.'),
							)
						: finalTotal.value;

					const walletResult = await sanctum('/api/wallet/pay', {
						method: 'POST',
						body: {
							amount: orderAmount,
							reference: `order-${orderId}`,
							description: `Pagamento ordine #${orderId}`,
						},
					});

					if (walletResult?.success) {
						if (!walletResult?.data?.id) {
							paymentError.value = 'Pagamento wallet non verificabile. Riprova.';
							return false;
						}

						await sanctum('/api/stripe/mark-order-completed', {
							method: 'POST',
							body: {
								order_id: orderId,
								payment_type: 'wallet',
								ext_id: `wallet-${walletResult.data.id}`,
								is_existing_order: !!existingOrderId.value,
								...submissionContext,
							},
						});
						return true;
					} else {
						paymentError.value = walletResult?.message || 'Pagamento con wallet non riuscito.';
						return false;
					}
				}

				if (paymentMethod.value === 'carta' && defaultPayment.value?.card && !useNewCard.value) {
					const payEndpoint = isExisting ? '/api/stripe/existing-order-payment' : '/api/stripe/create-payment';
					const payResult = await sanctum(payEndpoint, {
						method: 'POST',
						body: {
							order_id: orderId,
							currency: 'eur',
							payment_method_id: defaultPayment.value.card.id,
							...submissionContext,
						},
					});

					if (payResult.status === 'succeeded') {
						const paidEndpoint = isExisting ? '/api/stripe/existing-order-paid' : '/api/stripe/order-paid';
						await sanctum(paidEndpoint, {
							method: 'POST',
							body: {
								order_id: orderId,
								ext_id: payResult.payment_intent_id,
								is_existing_order: isExisting,
								...submissionContext,
							},
						});
						return true;
					} else if (payResult.status === 'requires_action' && payResult.client_secret) {
						const { error: actionError, paymentIntent } = await stripe.handleCardAction(payResult.client_secret);
						if (actionError) {
							paymentError.value = actionError.message || 'Autenticazione 3D Secure fallita.';
							return false;
						}
						if (paymentIntent?.status === 'succeeded') {
							const paidEndpoint = isExisting ? '/api/stripe/existing-order-paid' : '/api/stripe/order-paid';
							await sanctum(paidEndpoint, {
								method: 'POST',
								body: {
									order_id: orderId,
									ext_id: paymentIntent.id,
									is_existing_order: isExisting,
									...submissionContext,
								},
							});
							return true;
						}
						paymentError.value = 'Autenticazione 3D Secure fallita. Riprova o usa una carta diversa.';
						return false;
					} else if (payResult.status === 'requires_action') {
						paymentError.value = 'Autenticazione 3D Secure richiesta ma non disponibile. Riprova o usa una carta diversa.';
						return false;
					} else {
						paymentError.value = 'Pagamento non riuscito. Stato: ' + payResult.status;
						return false;
					}
				}

				if (paymentMethod.value === 'carta' && (useNewCard.value || !defaultPayment.value?.card)) {
					const piEndpoint = isExisting ? '/api/stripe/existing-order-payment-intent' : '/api/stripe/create-payment-intent';
					const piResponse = await sanctum(piEndpoint, {
						method: 'POST',
						body: {
							order_id: orderId,
							...submissionContext,
						},
					});

					if (piResponse.error) {
						paymentError.value = piResponse.error;
						return false;
					}

					const confirmationData = {
						payment_method: { card: cardElement.value },
						...(saveCardForFuture.value ? { setup_future_usage: 'off_session' } : {}),
					};

					const { error, paymentIntent } = await stripe.confirmCardPayment(piResponse.client_secret, confirmationData);

					if (error) {
						const errorMessages = {
							card_declined: "Carta rifiutata. Verifica i dati o usa un'altra carta.",
							insufficient_funds: 'Fondi insufficienti sulla carta.',
							expired_card: 'Carta scaduta.',
							incorrect_cvc: 'Codice CVC non corretto.',
							incorrect_number: 'Numero carta non valido.',
							invalid_expiry_year: 'Anno di scadenza non valido.',
							invalid_expiry_month: 'Mese di scadenza non valido.',
							processing_error: 'Errore temporaneo. Riprova tra qualche minuto.',
							authentication_required: 'Autenticazione 3D Secure fallita.',
							payment_intent_authentication_failure: 'Autenticazione 3D Secure non riuscita.',
						};
						paymentError.value = errorMessages[error.code] || error.message;
						return false;
					}

					if (paymentIntent.status === 'succeeded') {
						if (saveCardForFuture.value && paymentIntent.payment_method) {
							try {
								await sanctum('/api/stripe/set-default-payment-method', {
									method: 'POST',
									body: { payment_method: paymentIntent.payment_method },
								});
								await refreshNuxtData('/api/stripe/default-payment-method');
							} catch (_) {
								// Save card is best-effort; payment already succeeded
							}
						}

						const paidEndpoint = isExisting ? '/api/stripe/existing-order-paid' : '/api/stripe/order-paid';
						await sanctum(paidEndpoint, {
							method: 'POST',
							body: {
								order_id: orderId,
								ext_id: paymentIntent.id,
								is_existing_order: isExisting,
								...submissionContext,
							},
						});
						return true;
					} else if (paymentIntent.status === 'requires_action') {
						paymentError.value = 'Autenticazione 3D Secure richiesta ma non completata.';
						return false;
					} else if (paymentIntent.status === 'processing') {
						paymentError.value = 'Pagamento in elaborazione. Controlla lo stato tra qualche minuto.';
						return false;
					} else if (paymentIntent.status === 'requires_payment_method') {
						paymentError.value = "Metodo di pagamento non valido. Riprova con un'altra carta.";
						return false;
					} else {
						paymentError.value = 'Stato pagamento: ' + paymentIntent.status;
						return false;
					}
				}

				return false;
			};

			const paidOrderIds = [];
			let allSuccess = true;

			for (let i = 0; i < orderIds.length; i++) {
				const success = await payOrder(orderIds[i], i === 0);
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
		} catch (err) {
			paymentError.value =
				err?.response?._data?.error ||
				err?.response?._data?.message ||
				err?.data?.error ||
				err?.message ||
				'Errore durante il pagamento. Riprova.';
		} finally {
			isProcessing.value = false;
			paymentStep.value = '';
		}
	};

	// --- STRIPE INIT (must be called from onMounted in page) ---
	const resolveStripePublishableKey = async () => {
		try {
			const stripeConfig = await sanctum('/api/settings/stripe');
			const key = String(stripeConfig?.publishable_key || '').trim();
			if (isValidStripePublishableKey(key)) return key;
		} catch (e) {
			// Fallback below
		}
		return String(config.public.stripeKey || '').trim();
	};

	const initStripe = async () => {
		const stripeTimeout = setTimeout(() => {
			if (!stripeReady.value) {
				paymentError.value = 'Impossibile caricare Stripe. Ricarica la pagina.';
			}
		}, 10000);

		try {
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
		} catch (e) {
			clearTimeout(stripeTimeout);
			paymentError.value = 'Errore caricamento sistema pagamenti.';
		} finally {
			stripeLoading.value = false;
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

		// wallet
		walletFormatted,
		walletLoaded,
		walletSufficient,

		// payment method
		paymentMethod,
		paymentMethodOptions,
		selectPaymentMethod,

		// card element
		cardElementContainer,
		cardMounted,
		cardComplete,
		cardError,
		shouldShowCardForm,
		useNewCard,
		saveCardForFuture,
		hasSavedCard,
		defaultPayment,

		// payment flow
		termsAccepted,
		showConfirmModal,
		confirmPayment,
		proceedWithPayment,
		isProcessing,
		paymentError,
		paymentSuccess,
		successOrderId,
		paymentStep,
		paymentActionLabel,
		canPay,
		payButtonTooltip,
	};
}
