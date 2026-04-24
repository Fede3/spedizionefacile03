// usePaymentProcess — pagamento singolo ordine (carta/bonifico/wallet)
// con gestione stati Stripe: succeeded, requires_action (3DS), errori vari.
import { parsePrice } from '~/utils/price';
import { STRIPE_ERRORS_IT } from '~/utils/stripeErrors';
import type { Ref } from 'vue';

interface PayOrderDeps {
	paymentMethod: Ref<string>;
	paymentError: Ref<string | null>;
	existingOrderId: Ref<string | number | null>;
	finalTotal: Ref<number | string>;
	defaultPayment: Ref<any>;
	useNewCard: Ref<boolean>;
	cardElement: Ref<any>;
	saveCardForFuture: Ref<boolean>;
	getStripeInstance: () => any;
	sanctum: any;
}

/** Alias retrocompatibile — puntata alla mappa unificata in utils/stripeErrors. */
export const STRIPE_CARD_ERRORS = STRIPE_ERRORS_IT;

/**
 * Paga un singolo ordine secondo il metodo scelto.
 * Ritorna true se pagato, false se fallito (paymentError già settato).
 */
export const createPayOrder = (deps: PayOrderDeps, submissionContext: { client_submission_id: string }) => {
	const {
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
	} = deps;

	const isExisting = !!existingOrderId.value;

	return async (orderId: string | number, orderIdsLength: number): Promise<boolean> => {
		// --- BONIFICO ---
		if (paymentMethod.value === 'bonifico') {
			await sanctum('/api/stripe/mark-order-completed', {
				method: 'POST',
				body: {
					order_id: orderId,
					payment_type: 'bonifico',
					is_existing_order: isExisting,
					...submissionContext,
				},
			});
			return true;
		}

		// --- WALLET ---
		if (paymentMethod.value === 'wallet') {
			const orderData = orderIdsLength > 1 ? await sanctum(`/api/orders/${orderId}`) as any : null;
			const orderAmountCents = orderData
				? parsePrice(orderData?.data?.subtotal) ?? 0
				: Math.round(Number(finalTotal.value || 0) * 100);
			const orderAmount = orderAmountCents / 100;

			const walletResult = await sanctum('/api/wallet/pay', {
				method: 'POST',
				body: {
					amount: orderAmount,
					reference: `order-${orderId}`,
					description: `Pagamento ordine #${orderId}`,
				},
			}) as any;

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
						is_existing_order: isExisting,
						...submissionContext,
					},
				});
				return true;
			}
			paymentError.value = walletResult?.message || 'Pagamento con wallet non riuscito.';
			return false;
		}

		// --- PAYPAL ---
		// Stripe PaymentIntent con automatic_payment_methods.enabled=true accetta
		// già paypal come payment_method_type. Richiede redirect al sito PayPal per
		// autenticazione → return_url gestisce il callback post-approvazione.
		// PREREQUISITO: PayPal abilitato in Stripe Dashboard → Settings → Payment methods.
		if (paymentMethod.value === 'paypal') {
			const piEndpoint = isExisting ? '/api/stripe/existing-order-payment-intent' : '/api/stripe/create-payment-intent';
			const piResponse = await sanctum(piEndpoint, {
				method: 'POST',
				body: { order_id: orderId, ...submissionContext },
			}) as any;
			if (piResponse.error) {
				paymentError.value = piResponse.error;
				return false;
			}
			const returnUrl = `${window.location.origin}/la-tua-spedizione/2?step=pagamento&order_id=${orderId}&checkout_success=1&payment_method=paypal`;
			// PayPal richiede sempre redirect al sito esterno. Non passiamo redirect:'if_required'
			// altrimenti Stripe fallisce con "Failed to redirect to pm-redirects.stripe.com".
			const result = await getStripeInstance().confirmPayment({
				clientSecret: piResponse.client_secret,
				confirmParams: {
					return_url: returnUrl,
					payment_method_data: { type: 'paypal' },
				},
			});
			// Se siamo qui con result.error è fallito PRIMA del redirect (config / network).
			if (result?.error) {
				paymentError.value = STRIPE_CARD_ERRORS[result.error.code] || result.error.message || 'Pagamento PayPal non riuscito. Attiva PayPal in Stripe Dashboard e riprova.';
				return false;
			}
			// In caso contrario il browser sta facendo il redirect a PayPal.
			return true;
		}

		// --- GOOGLE PAY ---
		// Usa lo stesso PaymentRequest widget di Apple Pay. Se l'utente arriva qui
		// con 'google_pay' selezionato ma senza token wallet attivo, fallback su
		// confirmPayment con redirect (prompt standard Chrome/Android).
		if (paymentMethod.value === 'google_pay') {
			const piEndpoint = isExisting ? '/api/stripe/existing-order-payment-intent' : '/api/stripe/create-payment-intent';
			const piResponse = await sanctum(piEndpoint, {
				method: 'POST',
				body: { order_id: orderId, ...submissionContext },
			}) as any;
			if (piResponse.error) {
				paymentError.value = piResponse.error;
				return false;
			}
			const returnUrl = `${window.location.origin}/la-tua-spedizione/2?step=pagamento&order_id=${orderId}&checkout_success=1&payment_method=google_pay`;
			const { error, paymentIntent } = await getStripeInstance().confirmPayment({
				clientSecret: piResponse.client_secret,
				confirmParams: {
					return_url: returnUrl,
				},
				redirect: 'if_required',
			});
			if (error) {
				paymentError.value = STRIPE_CARD_ERRORS[error.code] || error.message || 'Pagamento Google Pay non riuscito. Usa il bottone "Pagamento rapido" in alto se disponibile.';
				return false;
			}
			if (paymentIntent?.status === 'succeeded') {
				const paidEndpoint = isExisting ? '/api/stripe/existing-order-paid' : '/api/stripe/order-paid';
				await sanctum(paidEndpoint, {
					method: 'POST',
					body: { order_id: orderId, ext_id: paymentIntent.id, is_existing_order: isExisting, ...submissionContext },
				});
				return true;
			}
			return true;
		}

		// --- CARTA SALVATA ---
		if (paymentMethod.value === 'carta' && (defaultPayment.value as any)?.card && !useNewCard.value) {
			const payEndpoint = isExisting ? '/api/stripe/existing-order-payment' : '/api/stripe/create-payment';
			const payResult = await sanctum(payEndpoint, {
				method: 'POST',
				body: {
					order_id: orderId,
					currency: 'eur',
					payment_method_id: (defaultPayment.value as any).card.id,
					...submissionContext,
				},
			}) as any;

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
			}
			if (payResult.status === 'requires_action' && payResult.client_secret) {
				const { error: actionError, paymentIntent } = await getStripeInstance().handleCardAction(payResult.client_secret);
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
			}
			if (payResult.status === 'requires_action') {
				paymentError.value = 'Autenticazione 3D Secure richiesta ma non disponibile. Riprova o usa una carta diversa.';
				return false;
			}
			paymentError.value = 'Pagamento non riuscito. Stato: ' + payResult.status;
			return false;
		}

		// --- CARTA NUOVA ---
		if (paymentMethod.value === 'carta' && (useNewCard.value || !(defaultPayment.value as any)?.card)) {
			const piEndpoint = isExisting ? '/api/stripe/existing-order-payment-intent' : '/api/stripe/create-payment-intent';
			const piResponse = await sanctum(piEndpoint, {
				method: 'POST',
				body: {
					order_id: orderId,
					...submissionContext,
				},
			}) as any;

			if (piResponse.error) {
				paymentError.value = piResponse.error;
				return false;
			}

			const confirmationData: any = {
				payment_method: { card: cardElement.value },
				...(saveCardForFuture.value ? { setup_future_usage: 'off_session' } : {}),
			};

			const { error, paymentIntent } = await getStripeInstance().confirmCardPayment(piResponse.client_secret, confirmationData);

			if (error) {
				paymentError.value = STRIPE_CARD_ERRORS[error.code] || error.message;
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
					} catch (_err: any) {
						console.warn('Failed to save card as default:', _err?.message || _err);
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
			}
			if (paymentIntent.status === 'requires_action') {
				paymentError.value = 'Autenticazione 3D Secure richiesta ma non completata.';
				return false;
			}
			if (paymentIntent.status === 'processing') {
				paymentError.value = 'Pagamento in elaborazione. Controlla lo stato tra qualche minuto.';
				return false;
			}
			if (paymentIntent.status === 'requires_payment_method') {
				paymentError.value = "Metodo di pagamento non valido. Riprova con un'altra carta.";
				return false;
			}
			paymentError.value = 'Stato pagamento: ' + paymentIntent.status;
			return false;
		}

		return false;
	};
};
