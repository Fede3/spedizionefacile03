/**
 * usePayment.js — thin wrapper retro-compat sul paymentStore (Pinia).
 *
 * Boundary frontend del pagamento checkout. Possiede:
 *   - bootstrap auth/Stripe lifecycle
 *   - dispatch metodo (carta / wallet / bonifico) con auth-retry su 401
 *   - computed cart-aware (canPay, payButtonTooltip, paymentActionLabel)
 *
 * Lo stato canonico vive in `stores/paymentStore.ts`. I helper di recovery
 * `loadPendingPayment` / `clearPendingPayment` sono re-esportati dallo store.
 *
 * Nota wallet: e' un flusso 2-step backend (`/api/wallet/pay` + `/api/stripe/mark-order-completed`).
 */
import { storeToRefs } from 'pinia'
import { readClientSubmissionId } from '~/utils/shipment'
import {
	buildCheckoutSubmissionContext,
	buildCheckoutSubmissionSignature,
	readPendingShipmentDraft,
	syncPendingShipmentSubmissionId,
} from '~/utils/checkoutSubmissionContext'
import { usePaymentStore, PAYMENT_METHOD_OPTIONS, clearPendingPayment, loadPendingPayment } from '~/stores/paymentStore'
import { buildCheckoutSuccessQuery, translateStripeError } from '~/utils/checkout'
import { callWithAuthRetry as _callWithAuthRetry, detectInsufficientFunds, STRIPE_CARD_STYLE } from '~/utils/paymentHelpers'

// Re-export helper recovery (compat con codice storico).
export { loadPendingPayment, clearPendingPayment }

// Boundary frontend canonico per "quale ordine sto pagando".
//
// Possiede soltanto:
// - riuso / generazione del client_submission_id
// - restore dell'ordine esistente
// - creazione ordine nuova se il checkout non ha ancora un order_id
//
// Non possiede:
// - logica Stripe
// - scelta metodo pagamento
// - finalizzazione wallet / bonifico / carta
function useCheckoutOrderContext({
	cart,
	sanctum,
	shipmentFlowStore,
	session,
	paymentStep,
}) {
	const clientSubmissionId = ref(null)
	const checkoutSubmissionContext = ref(null)

	const normalizeOrderId = (value) => String(value ?? '').trim()

	function currentOrderMatchesRoute(order) {
		const routeOrderId = normalizeOrderId(cart.existingOrderId?.value)
		if (!routeOrderId) return true
		return normalizeOrderId(order?.id) === routeOrderId
	}

	function getPendingShipment() {
		return readPendingShipmentDraft(shipmentFlowStore)
	}

	function syncCheckoutSubmissionContext(submissionId) {
		const normalized = typeof submissionId === 'string' ? submissionId.trim() : ''
		if (!normalized) return

		clientSubmissionId.value = normalized
		syncPendingShipmentSubmissionId(shipmentFlowStore, normalized)
		checkoutSubmissionContext.value = {
			signature: buildCheckoutSubmissionSignature({
				existingOrderId: cart.existingOrderId?.value || cart.existingOrder?.value?.id || null,
				total: Number(cart.finalTotal?.value ?? cart.getNumberTotal?.value ?? 0),
				billingPayload: cart.billingPayload?.value || null,
			}),
			client_submission_id: normalized,
		}
	}

	async function restoreExistingOrder({ force = false } = {}) {
		const orderId = cart.existingOrderId?.value
		if (!orderId) return null

		const currentOrder = cart.existingOrder?.value
		const currentSubmissionId = readClientSubmissionId(currentOrder)
		if (currentOrder?.id && currentSubmissionId && currentOrderMatchesRoute(currentOrder) && !force) {
			syncCheckoutSubmissionContext(currentSubmissionId)
			return currentOrder
		}

		const res = await sanctum(`/api/orders/${orderId}`)
		const hydratedOrder = res?.data ?? res ?? null
		if (cart.existingOrder?.value !== undefined) {
			cart.existingOrder.value = hydratedOrder
		}

		const canonicalSubmissionId = readClientSubmissionId(hydratedOrder)
		if (canonicalSubmissionId) {
			syncCheckoutSubmissionContext(canonicalSubmissionId)
		}

		return hydratedOrder
	}

	function buildSubmissionContext({ preferExisting = true, generate = true } = {}) {
		const { clientSubmissionId: nextSubmissionId, context } = buildCheckoutSubmissionContext({
			preferExisting,
			generate,
			existingOrder: cart.existingOrder?.value || null,
			existingOrderId: cart.existingOrderId?.value || cart.existingOrder?.value?.id || null,
			pendingShipment: getPendingShipment(),
			sessionData: session.value?.data || null,
			cachedContext: checkoutSubmissionContext.value || null,
			localSubmissionId: clientSubmissionId.value,
			total: Number(cart.finalTotal?.value ?? cart.getNumberTotal?.value ?? 0),
			billingPayload: cart.billingPayload?.value || null,
		})

		clientSubmissionId.value = nextSubmissionId
		syncPendingShipmentSubmissionId(shipmentFlowStore, nextSubmissionId)
		checkoutSubmissionContext.value = context

		return {
			client_submission_id: nextSubmissionId,
			...(cart.discountContext?.value ? { discount_context: cart.discountContext.value } : {}),
		}
	}

	async function createCheckoutOrder() {
		if (paymentStep?.value !== undefined) {
			paymentStep.value = 'Creazione ordine...'
		}

		const subtotalCents = Math.round(Number(cart.getNumberTotal?.value ?? 0) * 100)
		const submissionContext = buildSubmissionContext({ preferExisting: false, generate: true })
		const res = await sanctum('/api/stripe/create-order', {
			method: 'POST',
			body: {
				subtotal: subtotalCents,
				billing_data: cart.billingPayload.value,
				single_order_only: true,
				...submissionContext,
			},
		})

		const orderIds = Array.isArray(res?.order_ids) ? res.order_ids.filter(Boolean) : []
		if (orderIds.length > 1) {
			throw new Error('Il pagamento di piu spedizioni separate va completato una spedizione alla volta.')
		}

		const orderId = orderIds[0] ?? res?.order_id
		if (!orderId) {
			throw new Error('Ordine non creato: id mancante nella risposta.')
		}
		if (res?.client_submission_id) {
			syncCheckoutSubmissionContext(res.client_submission_id)
		}

		return orderId
	}

	async function resolvePayableOrderId() {
		const existing = cart.existingOrder?.value
		if (existing?.id && currentOrderMatchesRoute(existing)) {
			const existingSubmissionId = readClientSubmissionId(existing)
			if (existingSubmissionId) {
				syncCheckoutSubmissionContext(existingSubmissionId)
				return existing.id
			}

			if (cart.existingOrderId?.value) {
				const hydratedExisting = await restoreExistingOrder({ force: true })
				if (hydratedExisting?.id) return hydratedExisting.id
			}

			return existing.id
		}

		if (cart.existingOrderId?.value) {
			const hydratedExisting = await restoreExistingOrder({ force: true })
			if (hydratedExisting?.id) return hydratedExisting.id
			throw new Error('Ordine non disponibile. Ricarica la pagina e riprova.')
		}

		return createCheckoutOrder()
	}

	return {
		buildSubmissionContext,
		resolvePayableOrderId,
		restoreExistingOrder,
		syncCheckoutSubmissionContext,
	}
}

/**
 * @param {object} cart - Output di useCart() con: finalTotal, finalTotalFormatted,
 *   getNumberTotal, billingPayload, existingOrder, existingOrderId, walletSufficient?,
 *   loadWalletBalance?, discountContext?.
 */
export function usePayment(cart) {
	const route = useRoute()
	const router = useRouter()
	const sanctum = useSanctumClient()
	const { user, isAuthenticated, refreshIdentity } = useSanctumAuth()
	const { authCookie } = useAuthUiSnapshotPersistence()
	const { session } = useSession()
	const shipmentFlowStore = useShipmentFlowStore()

	const store = usePaymentStore()
	const refs = storeToRefs(store)

	const { buildSubmissionContext, resolvePayableOrderId } = useCheckoutOrderContext({
		cart, sanctum, shipmentFlowStore, session, paymentStep: refs.paymentStep,
	})

	// ---------- AUTH BOOTSTRAP + RETRY ----------
	async function ensurePaymentAuthContext({ force = false } = {}) {
		const hasUiSnapshot = Boolean(authCookie.value?.authenticated)
		if (force || !isAuthenticated.value) {
			try { await runAuthBootstrap({ force: force || hasUiSnapshot }) }
			catch (error) { console.warn('[usePayment] auth bootstrap failed before payment:', error?.message || error) }
		}
		if (!isAuthenticated.value) {
			const synced = await waitForPostAuthSync(refreshIdentity)
			if (!synced) throw new Error('Sessione non valida. Accedi di nuovo per completare il pagamento.')
		}
		try { await $fetch('/sanctum/csrf-cookie', { method: 'GET', credentials: 'include' }) }
		catch (error) { console.warn('[usePayment] csrf refresh failed before payment:', error?.message || error) }
	}

	/** Auth-retry su 401/419 (sessione scaduta durante 3DS). Max 2 retry via util. */
	const callWithAuthRetry = (fn, opts) => _callWithAuthRetry(fn, () => ensurePaymentAuthContext({ force: true }), opts)

	// ---------- INIT STRIPE ----------
	async function initStripe() {
		if (store.stripeReady || store.stripeLoading) return
		store.stripeLoading = true
		try {
			const settings = await sanctum('/api/settings/stripe')
			const publishableKey = settings?.publishable_key
			if (!publishableKey) throw new Error('Stripe publishable key mancante.')
			store.stripeConfigured = true

			const { loadStripe } = await import('@stripe/stripe-js')
			store.stripe = await loadStripe(publishableKey)
			if (!store.stripe) throw new Error('Caricamento Stripe SDK fallito.')

			const elements = store.stripe.elements({ locale: 'it' })
			store.cardElement = elements.create('card', { hidePostalCode: true, style: STRIPE_CARD_STYLE })
			store.cardElement.on('change', (e) => {
				store.cardComplete = !!e.complete
				store.cardError = e.error?.message || ''
			})

			// Mount lazy: aspetta che il container v-if sia disponibile.
			// stop watcher su unmount: Stripe Elements accetta un solo mount point;
			// remount su navigazione causa errori silenti.
			const stopCardMountWatch = watch(refs.cardElementContainer, (el) => {
				if (el && store.cardElement && !store.cardMounted) {
					store.cardElement.mount(el)
					store.cardMounted = true
				}
			}, { flush: 'post', immediate: true })

			if (getCurrentScope()) {
				onScopeDispose(() => {
					stopCardMountWatch()
					if (store.cardElement && store.cardMounted) {
						try { store.cardElement.unmount() } catch { /* gia' distrutto */ }
						store.cardMounted = false
					}
				})
			}

			// Carica eventuale carta salvata (silent on 404).
			try {
				const saved = await sanctum('/api/stripe/default-payment-method')
				if (saved?.card) { store.defaultPayment = saved; store.hasSavedCard = true }
			} catch { /* nessuna carta salvata, ok */ }

			store.stripeReady = true
		} catch (err) {
			store.setStripeUnavailable()
			console.warn('[usePayment] initStripe failed:', err?.message || err)
		} finally {
			store.stripeLoading = false
		}
	}

	// ---------- SELEZIONE METODO ----------
	function selectPaymentMethod(key) {
		store.selectPaymentMethod(key)
		if (key === 'wallet' && typeof cart.loadWalletBalance === 'function') cart.loadWalletBalance()
	}

	// ---------- VALIDAZIONE / GUARD ----------
	const canPay = computed(() => {
		if (store.isProcessing) return false
		if (!store.termsAccepted) return false
		if (!cart.billingPayload?.value) return false
		if (store.paymentMethod === 'carta') {
			if (store.cardPaymentsUnavailable) return false
			if (store.hasSavedCard && !store.useNewCard) return true
			return store.cardComplete
		}
		if (store.paymentMethod === 'wallet') return cart.walletSufficient?.value ?? false
		if (store.paymentMethod === 'bonifico') return true
		return false
	})

	const payButtonTooltip = computed(() => {
		if (!store.termsAccepted) return 'Accetta i termini per procedere'
		if (!cart.billingPayload?.value) return 'Completa i dati di fatturazione'
		if (store.paymentMethod === 'carta') {
			if (store.cardPaymentsUnavailable) return 'Pagamento con carta non disponibile'
			if (!store.hasSavedCard && !store.cardComplete) return 'Completa i dati della carta'
			if (store.hasSavedCard && store.useNewCard && !store.cardComplete) return 'Completa i dati della carta'
		}
		if (store.paymentMethod === 'wallet' && !cart.walletSufficient?.value) return 'Saldo wallet insufficiente'
		return ''
	})

	const paymentActionLabel = computed(() => {
		const total = cart.finalTotalFormatted?.value ?? ''
		if (store.paymentMethod === 'bonifico') return `Conferma ordine · ${total}`
		return `Paga · ${total}`
	})

	const shouldShowCardForm = computed(() =>
		store.paymentMethod === 'carta' && store.stripeReady
		&& !store.cardPaymentsUnavailable
		&& (!store.hasSavedCard || store.useNewCard),
	)

	// ---------- DISPATCHER ----------
	function confirmPayment() {
		if (!canPay.value) return
		store.paymentError = ''
		store.showConfirmModal = true
	}

	async function proceedWithPayment() {
		if (store.isProcessing) return
		store.showConfirmModal = false
		store.isProcessing = true
		store.paymentError = ''
		try {
			await ensurePaymentAuthContext()
			if (store.paymentMethod === 'carta') await payWithCard()
			else if (store.paymentMethod === 'wallet') await payWithWallet()
			else if (store.paymentMethod === 'bonifico') await payWithBonifico()
			else throw new Error('Metodo di pagamento non supportato.')
		} catch (err) {
			store.paymentError = translateStripeError(err) || err?.message || 'Pagamento fallito. Riprova.'
			console.warn('[usePayment] proceedWithPayment failed:', err)
		} finally {
			store.isProcessing = false
			store.paymentStep = ''
		}
	}

	// ---------- CARTA (+ 3DS automatico) ----------
	async function payWithCard() {
		if (!store.stripe) throw new Error('Stripe non inizializzato.')
		const orderId = await resolvePayableOrderId()
		const isExisting = Boolean(cart.existingOrder?.value || cart.existingOrderId?.value)
		const submissionContext = buildSubmissionContext({ preferExisting: isExisting, generate: true })
		const submissionId = submissionContext.client_submission_id
		const useSaved = store.hasSavedCard && !store.useNewCard

		// Persist draft PRIMA del 3DS: recovery se sessione Sanctum scade durante challenge.
		store.persistPaymentDraft({
			orderId, paymentMethod: 'carta', submissionId, isExisting,
			amount: Number(cart.finalTotal?.value ?? 0),
		})
		store.paymentStep = 'Conferma pagamento...'

		if (useSaved) {
			const endpoint = isExisting ? '/api/stripe/existing-order-payment' : '/api/stripe/create-payment'
			const result = await sanctum(endpoint, {
				method: 'POST',
				body: {
					order_id: orderId, currency: 'eur',
					payment_method_id: store.defaultPayment?.card?.id,
					...submissionContext,
				},
			})
			let finalIntentId = result?.payment_intent_id ?? null
			if (result?.status === 'requires_action' && result?.client_secret) {
				const { paymentIntent, error } = await store.stripe.handleCardAction(result.client_secret)
				if (error) throw error
				if (paymentIntent?.status !== 'succeeded') throw new Error('Autenticazione 3D Secure non completata.')
				finalIntentId = paymentIntent.id
			} else if (result?.status !== 'succeeded') {
				throw new Error('Pagamento non riuscito. Stato: ' + (result?.status || 'sconosciuto'))
			}
			await markOrderPaid(orderId, finalIntentId, isExisting, submissionId)
		} else {
			if (!store.cardElement) throw new Error('Campo carta non pronto.')
			const intentEndpoint = isExisting ? '/api/stripe/existing-order-payment-intent' : '/api/stripe/create-payment-intent'
			const intent = await sanctum(intentEndpoint, { method: 'POST', body: { order_id: orderId, ...submissionContext } })
			if (!intent?.client_secret) throw new Error(intent?.error || 'PaymentIntent non creato.')

			const billingName = cart.billingPayload.value?.full_name || cart.billingPayload.value?.name || user.value?.name || ''
			const confirmOpts = { payment_method: { card: store.cardElement, billing_details: { name: billingName } } }
			if (store.saveCardForFuture) confirmOpts.setup_future_usage = 'off_session'

			const { paymentIntent, error } = await store.stripe.confirmCardPayment(intent.client_secret, confirmOpts)
			if (error) throw error
			if (paymentIntent?.status !== 'succeeded') throw new Error('Stato pagamento: ' + paymentIntent?.status)

			await markOrderPaid(orderId, paymentIntent.id, isExisting, submissionId)

			// Salva carta come default (non bloccante).
			if (store.saveCardForFuture && paymentIntent.payment_method) {
				try {
					await sanctum('/api/stripe/set-default-payment-method', {
						method: 'POST', body: { payment_method: paymentIntent.payment_method },
					})
				} catch (e) { console.warn('[usePayment] save card failed (non bloccante):', e?.message || e) }
			}
		}
		await onPaymentSuccess(orderId, 'carta')
	}

	/** Notifica backend ordine pagato (email + sync stato). Auth retry su 401 durante 3DS. */
	async function markOrderPaid(orderId, extId, isExisting, submissionId) {
		store.paymentStep = 'Finalizzazione...'
		const endpoint = isExisting ? '/api/stripe/existing-order-paid' : '/api/stripe/order-paid'
		await callWithAuthRetry(
			() => sanctum(endpoint, {
				method: 'POST',
				body: { order_id: orderId, ext_id: extId, is_existing_order: isExisting, client_submission_id: submissionId },
			}),
			{ label: 'markOrderPaid' },
		)
	}

	// ---------- WALLET ----------
	async function payWithWallet() {
		const orderId = await resolvePayableOrderId()
		const isExisting = Boolean(cart.existingOrder?.value || cart.existingOrderId?.value)
		const submissionContext = buildSubmissionContext({ preferExisting: isExisting, generate: true })
		const submissionId = submissionContext.client_submission_id

		store.persistPaymentDraft({
			orderId, paymentMethod: 'wallet', submissionId, isExisting,
			amount: Number(cart.finalTotal?.value ?? 0),
		})

		store.paymentStep = 'Addebito saldo wallet...'
		const amountEur = Number(cart.finalTotal?.value ?? 0)
		const res = await callWithAuthRetry(
			() => sanctum('/api/wallet/pay', {
				method: 'POST',
				body: { amount: amountEur, reference: `order-${orderId}`, description: `Pagamento ordine #${orderId}` },
			}),
			{ label: 'wallet pay' },
		)
		if (!res?.success || !res?.data?.id) {
			// Distingue saldo insufficiente da errore tecnico per evitare false comunicazioni.
			const serverMessage = res?.message || res?.error
			const fallback = detectInsufficientFunds(serverMessage)
				? 'Saldo wallet insufficiente per completare il pagamento.'
				: 'Errore durante l\'addebito dal wallet. Riprova tra poco o contatta l\'assistenza.'
			throw new Error(serverMessage || fallback)
		}

		store.paymentStep = 'Finalizzazione...'
		await callWithAuthRetry(
			() => sanctum('/api/stripe/mark-order-completed', {
				method: 'POST',
				body: {
					order_id: orderId, payment_type: 'wallet',
					ext_id: `wallet-${res.data.id}`, is_existing_order: isExisting,
					...submissionContext,
				},
			}),
			{ label: 'wallet mark-completed' },
		)
		await onPaymentSuccess(orderId, 'wallet')
	}

	// ---------- BONIFICO ----------
	async function payWithBonifico() {
		const orderId = await resolvePayableOrderId()
		const isExisting = Boolean(cart.existingOrder?.value || cart.existingOrderId?.value)
		const submissionContext = buildSubmissionContext({ preferExisting: isExisting, generate: true })
		const submissionId = submissionContext.client_submission_id

		store.persistPaymentDraft({
			orderId, paymentMethod: 'bonifico', submissionId, isExisting,
			amount: Number(cart.finalTotal?.value ?? 0),
		})

		store.paymentStep = 'Registrazione ordine...'
		await callWithAuthRetry(
			() => sanctum('/api/stripe/mark-order-completed', {
				method: 'POST',
				body: {
					order_id: orderId, payment_type: 'bonifico',
					is_existing_order: isExisting, ...submissionContext,
				},
			}),
			{ label: 'bonifico mark-completed' },
		)
		await onPaymentSuccess(orderId, 'bonifico')
	}

	// ---------- SUCCESS + ANALYTICS ----------
	async function onPaymentSuccess(orderId, method) {
		store.markPaymentSuccess(orderId)
		clearPendingPayment()

		// Reset COMPLETO flusso: l'utente che torna a /preventivo riparte da zero
		// invece di vedere dati ordine appena chiuso. Pulisce store + sessionStorage
		// + session backend Laravel (altrimenti indirizzi pre-compilati riaffiorano).
		try { shipmentFlowStore.resetFlow?.() } catch { /* gia' resettato */ }
		try { await sanctum('/api/session/reset', { method: 'POST' }) } catch { /* non bloccante */ }
		try { clearNuxtData?.('cart') } catch { /* nessuna cache */ }

		const nextQuery = buildCheckoutSuccessQuery(route.query, { orderIds: [orderId], paymentMethod: method })
		router.replace({ path: route.path, query: nextQuery })
	}

	function trackBeginCheckout() { /* GA4 archiviato 2026-04-20 — Plausible via useFunnelAnalytics */ }

	// ---------- APPLE/GOOGLE PAY (ARCHIVIATO 2026-04-20) ----------
	const mountPaymentRequestButton = () => { /* no-op */ }

	// ---------- RETURN API (caller invariati: stesse chiavi del composable originale) ----------
	return {
		...refs,
		paymentMethodOptions: PAYMENT_METHOD_OPTIONS,
		selectPaymentMethod, initStripe,
		mountPaymentRequestButton,
		confirmPayment, proceedWithPayment,
		shouldShowCardForm, paymentActionLabel, canPay, payButtonTooltip,
		trackBeginCheckout,
	}
}
