/**
 * paymentStore — stato canonico checkout pagamento (metodo, Stripe, terms, status).
 *
 * Lo store contiene SOLO state e azioni neutre rispetto al ciclo Vue.
 * Logica Stripe (init, confirmCardPayment, 3DS), API sanctum (auth retry, mark paid),
 * router/redirect/analytics e i computed cart-aware vivono nel wrapper `usePayment(cart)`.
 *
 * Helper di recovery localStorage (`loadPendingPayment`, `clearPendingPayment`)
 * sono esportati per uso esterno (es. pagina recupero ordine post-3DS).
 */
import { defineStore } from 'pinia'

// Chiave localStorage per draft pagamento in corso. Permette recovery dopo
// redirect 3DS o sessione Sanctum scaduta durante challenge.
const PENDING_PAYMENT_KEY = 'sf_pending_payment'
const PENDING_PAYMENT_TTL_MS = 24 * 60 * 60 * 1000

export interface PendingPaymentDraft {
	orderId: string | number
	paymentMethod: 'carta' | 'wallet' | 'bonifico'
	submissionId?: string | null
	isExisting?: boolean
	amount?: number
	createdAt?: number
	expiresAt?: number
}

export interface PaymentMethodOption {
	key: 'carta' | 'bonifico' | 'wallet'
	title: string
	description: string
	badge?: string
}

export interface SavedCardInfo {
	card?: { id?: string, [key: string]: unknown }
	[key: string]: unknown
}

function safeLocalGet<T = unknown>(key: string): T | null {
	if (typeof window === 'undefined') return null
	try {
		const raw = window.localStorage.getItem(key)
		return raw ? JSON.parse(raw) as T : null
	} catch {
		return null
	}
}

function safeLocalSet(key: string, value: unknown): void {
	if (typeof window === 'undefined') return
	try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage pieno */ }
}

function safeLocalRemove(key: string): void {
	if (typeof window === 'undefined') return
	try { window.localStorage.removeItem(key) } catch { /* storage disabilitato */ }
}

/** Legge draft pagamento in sospeso. Ritorna null se scaduto o assente. */
export function loadPendingPayment(): PendingPaymentDraft | null {
	const data = safeLocalGet<PendingPaymentDraft>(PENDING_PAYMENT_KEY)
	if (!data) return null
	if (data.expiresAt && data.expiresAt < Date.now()) {
		safeLocalRemove(PENDING_PAYMENT_KEY)
		return null
	}
	return data
}

export function clearPendingPayment(): void {
	safeLocalRemove(PENDING_PAYMENT_KEY)
}

export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
	{ key: 'carta', title: 'Carta', description: 'Visa, Mastercard, Amex', badge: 'Più usato' },
	{ key: 'bonifico', title: 'Bonifico', description: '1-2 giorni lavorativi' },
	{ key: 'wallet', title: 'Wallet', description: 'Saldo prepagato' },
]

export const usePaymentStore = defineStore('payment', () => {
	// ---------- METODO + UI ----------
	const paymentMethod = ref<'carta' | 'wallet' | 'bonifico'>('carta')
	const termsAccepted = ref(false)
	const showConfirmModal = ref(false)
	const isProcessing = ref(false)
	const paymentStep = ref('')
	const paymentError = ref('')
	const paymentSuccess = ref(false)
	const successOrderId = ref<string | number | null>(null)

	// ---------- STRIPE LIFECYCLE ----------
	// stripe/cardElement sono istanze SDK (non reattive a livello fine): le wrappiamo
	// in shallowRef per evitare overhead di reactive proxy su oggetti opachi.
	const stripe = shallowRef<unknown>(null)
	const cardElement = shallowRef<unknown>(null)
	const cardElementContainer = ref<HTMLElement | null>(null)
	const cardMounted = ref(false)
	const cardComplete = ref(false)
	const cardError = ref('')
	const stripeLoading = ref(false)
	const stripeReady = ref(false)
	const stripeConfigured = ref(false)
	const cardPaymentsUnavailable = ref(false)
	const cardPaymentsNotice = ref('')
	const saveCardForFuture = ref(false)
	const useNewCard = ref(false)
	const hasSavedCard = ref(false)
	const defaultPayment = ref<SavedCardInfo | null>(null)

	// ---------- APPLE/GOOGLE PAY (ARCHIVIATO 2026-04-20) ----------
	// Wallet express disattivati. Fallback inerti per compatibilita' template.
	const canMakePayment = ref(false)
	const isAppleAvailable = computed(() => false)
	const isGoogleAvailable = computed(() => false)
	const paymentRequestContainer = ref<HTMLElement | null>(null)
	const paymentRequestError = ref('')

	// ---------- AZIONI ----------
	function selectPaymentMethod(key: 'carta' | 'wallet' | 'bonifico'): void {
		paymentMethod.value = key
		paymentError.value = ''
	}

	/** Salva draft pagamento (prima di 3DS). Recovery se sessione scade durante challenge. */
	function persistPaymentDraft(draft: PendingPaymentDraft): void {
		if (!draft?.orderId) return
		safeLocalSet(PENDING_PAYMENT_KEY, {
			...draft,
			createdAt: Date.now(),
			expiresAt: Date.now() + PENDING_PAYMENT_TTL_MS,
		})
	}

	function setStripeUnavailable(notice = 'Pagamento con carta non disponibile al momento. Usa bonifico o wallet.'): void {
		cardPaymentsUnavailable.value = true
		cardPaymentsNotice.value = notice
	}

	function markPaymentSuccess(orderId: string | number): void {
		paymentSuccess.value = true
		successOrderId.value = orderId
	}

	/** Reset completo dello store (post pagamento riuscito o cambio carrello). */
	function resetPayment(): void {
		paymentMethod.value = 'carta'
		termsAccepted.value = false
		showConfirmModal.value = false
		isProcessing.value = false
		paymentStep.value = ''
		paymentError.value = ''
		paymentSuccess.value = false
		successOrderId.value = null
		stripe.value = null
		cardElement.value = null
		cardElementContainer.value = null
		cardMounted.value = false
		cardComplete.value = false
		cardError.value = ''
		stripeLoading.value = false
		stripeReady.value = false
		stripeConfigured.value = false
		cardPaymentsUnavailable.value = false
		cardPaymentsNotice.value = ''
		saveCardForFuture.value = false
		useNewCard.value = false
		hasSavedCard.value = false
		defaultPayment.value = null
	}

	return {
		// metodo + ui
		paymentMethod, termsAccepted, showConfirmModal, isProcessing,
		paymentStep, paymentError, paymentSuccess, successOrderId,
		// stripe lifecycle
		stripe, cardElement, cardElementContainer, cardMounted, cardComplete, cardError,
		stripeLoading, stripeReady, stripeConfigured, cardPaymentsUnavailable, cardPaymentsNotice,
		saveCardForFuture, useNewCard, hasSavedCard, defaultPayment,
		// apple/google pay (inerti)
		canMakePayment, isAppleAvailable, isGoogleAvailable, paymentRequestContainer, paymentRequestError,
		// actions
		selectPaymentMethod, persistPaymentDraft, setStripeUnavailable, markPaymentSuccess, resetPayment,
	}
})
