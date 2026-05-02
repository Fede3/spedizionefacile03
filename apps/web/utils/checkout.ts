import type { LocationQuery } from 'vue-router'
import {
	createClientSubmissionId,
	ensureClientSubmissionId,
	readClientSubmissionId,
	readNestedClientSubmissionId,
} from '~/utils/clientSubmissionId'

// === utils/checkout.js — Helper checkout / post-pagamento ===
// Consolidamento di:
//   - utils/checkoutSuccess.ts  (build/read/clear checkout success query, status)
//   - utils/stripeErrors.ts     (mappa errori Stripe IT, translateStripeError)
// Tutti gli export originali sono preservati identici.

// ─────────────────────────────────────────────────────────────────
// SEZIONE 1 — ex utils/checkoutSuccess.ts
// ─────────────────────────────────────────────────────────────────

/**
 * checkoutSuccess — helpers for persisting / reading / clearing checkout success
 * state via URL query parameters.
 *
 * After a successful payment the checkout page encodes order-ids and payment
 * method into the URL so the success screen survives full-page reloads.
 * `clearCheckoutSuccessQuery` removes those params once they've been consumed
 * to keep the URL clean.
 *
 */

const QUERY_KEY_SUCCESS = 'checkout_success'
const QUERY_KEY_ORDER_IDS = 'order_ids'
const QUERY_KEY_PAYMENT_METHOD = 'payment_method'

/**
 * Order statuses that are considered "successfully placed".
 * Used by components that need to decide whether an order is in a terminal
 * positive state.  "pending" is included because bonifico orders start in
 * pending and are still considered successful from the checkout perspective.
 *
 */
export const SUCCESSFUL_ORDER_STATUSES = Object.freeze([
  'paid',
  'completed',
  'processing',
  'label_generated',
  'shipped',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'pending',
])

/**
 * Merges checkout-success query params into an existing query object.
 * Returns a new LocationQuery that the caller can pass to `router.replace`.
 *
 */
export function buildCheckoutSuccessQuery(
  baseQuery: LocationQuery,
  { orderIds, paymentMethod }: { orderIds: Array<string | number>; paymentMethod: string },
): LocationQuery {
  return {
    ...baseQuery,
    [QUERY_KEY_SUCCESS]: '1',
    [QUERY_KEY_ORDER_IDS]: orderIds.map(String).join(','),
    [QUERY_KEY_PAYMENT_METHOD]: paymentMethod,
  }
}

/**
 * Reads the checkout-success state from the current route query.
 *
 */
export function readCheckoutSuccessState(query: LocationQuery) {
  const active = query[QUERY_KEY_SUCCESS] === '1'
  if (!active) {
    return { active: false, orderIds: [], paymentMethod: '' }
  }

  const rawIds = String(query[QUERY_KEY_ORDER_IDS] || '')
  const orderIds = rawIds
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  if (orderIds.length === 0) {
    return { active: false, orderIds: [], paymentMethod: '' }
  }

  const paymentMethod = String(query[QUERY_KEY_PAYMENT_METHOD] || '')

  return { active: true, orderIds, paymentMethod }
}

/**
 * Returns a new LocationQuery with checkout-success params stripped out.
 * The caller should pass this to `router.replace({ query })` to clean the URL.
 *
 */
export function clearCheckoutSuccessQuery(query: LocationQuery): LocationQuery {
  const {
    checkout_success: _checkoutSuccess,
    order_ids: _orderIds,
    payment_method: _paymentMethod,
    ...cleaned
  } = query
  return cleaned
}

// ─────────────────────────────────────────────────────────────────
// SEZIONE 2 — ex utils/stripeErrors.ts
// ─────────────────────────────────────────────────────────────────

/**
 * stripeErrors — messaggi errore Stripe unificati in italiano.
 *
 * Prima di questo file, le mappe erano duplicate in usePaymentFlow,
 * usePaymentProcess e useWalletTopUp con testi leggermente diversi.
 * Ora una sola fonte di verità: modifica QUI le traduzioni.
 *
 * Stripe restituisce `err.code` (API error) o `err.decline_code`
 * (carta rifiutata). I codici non mappati ricadono sul message
 * originale (che può essere in EN).
 *
 */
export const STRIPE_ERRORS_IT: Record<string, string> = {
	card_declined: "Carta rifiutata. Verifica i dati o usa un'altra carta.",
	insufficient_funds: 'Fondi insufficienti sulla carta.',
	expired_card: 'Carta scaduta.',
	incorrect_cvc: 'Codice CVC non corretto.',
	incorrect_number: 'Numero carta non valido.',
	invalid_number: 'Numero carta non valido. Verifica il numero inserito.',
	invalid_cvc: 'Codice CVC non valido.',
	invalid_expiry_month: 'Mese di scadenza non valido.',
	invalid_expiry_year: 'Anno di scadenza non valido.',
	incomplete_number: 'Numero carta incompleto.',
	incomplete_expiry: 'Data di scadenza incompleta.',
	incomplete_cvc: 'Codice CVC incompleto.',
	processing_error: 'Errore di elaborazione. Riprova tra qualche istante.',
	authentication_required: 'La banca richiede una verifica aggiuntiva (3D Secure).',
	payment_intent_authentication_failure: 'Autenticazione 3D Secure non riuscita.',
	generic_decline: 'Pagamento rifiutato. Contatta la tua banca.',
	rate_limit: 'Troppe richieste in poco tempo. Attendi un istante e riprova.',
	card_not_supported: "Tipo di carta non supportato. Prova con un'altra carta.",
	lost_card: 'Carta segnalata come smarrita. Contatta la tua banca.',
	stolen_card: 'Carta segnalata come rubata. Contatta la tua banca.',
};

/**
 * Traduce un errore Stripe nel messaggio italiano corrispondente.
 * Fallback sul message originale o generico se il codice non è mappato.
 *
 */
type StripeLikeError = {
	code?: string
	decline_code?: string
	response?: { _data?: { error?: string; message?: string } }
	data?: { error?: string }
	message?: string
}

export function translateStripeError(err: unknown, fallback = 'Errore durante il pagamento. Riprova.') {
	if (!err) return fallback;
	const source = err as StripeLikeError;
	const code = source.code || source.decline_code;
	if (code && STRIPE_ERRORS_IT[code]) return STRIPE_ERRORS_IT[code];
	return (
		source.response?._data?.error ||
		source.response?._data?.message ||
		source.data?.error ||
		source.message ||
		fallback
	);
}

// ─── Submission context (idempotency key) ─────────────────────────
// Estratto da checkoutSubmissionContext.ts — Sessione 7.6 merge.

type SubmissionSource = {
	id?: string | number | null
	client_submission_id?: unknown
	pendingShipment?: SubmissionSource | null
	data?: SubmissionSource | null
	[key: string]: unknown
}
type ShipmentFlowWithPending = {
	pendingShipment?: unknown
	[key: string]: unknown
}
type CheckoutCachedContext = {
	signature?: string | null
	client_submission_id?: string | null
}
type BuildSignatureInput = {
	existingOrderId?: string | number | null
	total?: number
	billingPayload?: SubmissionSource | null
}
type BuildContextInput = BuildSignatureInput & {
	preferExisting?: boolean
	generate?: boolean
	existingOrder?: SubmissionSource | null
	pendingShipment?: SubmissionSource | null
	sessionData?: SubmissionSource | null
	cachedContext?: CheckoutCachedContext | null
	localSubmissionId?: string | null
}
type SubmissionContextResult = {
	clientSubmissionId: string
	context: {
		signature: string
		client_submission_id: string
	}
}

const asSubmissionSource = (value: unknown): SubmissionSource | null =>
	value && typeof value === 'object' ? value as SubmissionSource : null

export const readPendingShipmentDraft = (shipmentFlowStore: ShipmentFlowWithPending | null | undefined): SubmissionSource | null =>
	asSubmissionSource(shipmentFlowStore?.pendingShipment)

export const syncPendingShipmentSubmissionId = (
	shipmentFlowStore: ShipmentFlowWithPending | null | undefined,
	submissionId: unknown,
) => {
	const normalized = typeof submissionId === 'string' ? submissionId.trim() : ''
	if (!normalized) return

	const pendingShipment = readPendingShipmentDraft(shipmentFlowStore)
	if (!pendingShipment || pendingShipment.client_submission_id === normalized || !shipmentFlowStore) return

	shipmentFlowStore.pendingShipment = {
		...pendingShipment,
		client_submission_id: normalized,
	}
}

export const readExistingOrderSubmissionId = (existingOrder: SubmissionSource | null | undefined): string | null =>
	readClientSubmissionId(existingOrder)

export const buildCheckoutSubmissionSignature = ({
	existingOrderId,
	total = 0,
	billingPayload = null,
}: BuildSignatureInput): string => JSON.stringify({
	existingOrderId: existingOrderId ?? null,
	total: Number(total || 0),
	billingPayload: billingPayload || null,
})

export const buildCheckoutSubmissionContext = ({
	preferExisting = true,
	generate = true,
	existingOrder = null,
	existingOrderId = null,
	pendingShipment = null,
	sessionData = null,
	cachedContext = null,
	localSubmissionId = null,
	total = 0,
	billingPayload = null,
}: BuildContextInput): SubmissionContextResult => {
	const signature = buildCheckoutSubmissionSignature({
		existingOrderId: existingOrderId || existingOrder?.id || null,
		total,
		billingPayload,
	})
	const existingOrderSubmissionId = preferExisting ? readExistingOrderSubmissionId(existingOrder) : null

	if (existingOrderSubmissionId) {
		return {
			clientSubmissionId: existingOrderSubmissionId,
			context: { signature, client_submission_id: existingOrderSubmissionId },
		}
	}

	const cachedSubmissionId = typeof cachedContext?.client_submission_id === 'string'
		? cachedContext.client_submission_id.trim()
		: ''
	if (cachedContext?.signature === signature && cachedSubmissionId) {
		return {
			clientSubmissionId: cachedSubmissionId,
			context: { signature, client_submission_id: cachedSubmissionId },
		}
	}

	const localSubmissionSource = localSubmissionId ? { client_submission_id: localSubmissionId } : null
	const nestedKnownSubmissionId = preferExisting
		? readNestedClientSubmissionId(existingOrder, pendingShipment, sessionData?.pendingShipment || null, sessionData, localSubmissionSource)
		: readNestedClientSubmissionId(pendingShipment, sessionData?.pendingShipment || null, sessionData)

	let submissionId = nestedKnownSubmissionId
	if (!submissionId && pendingShipment) {
		submissionId = ensureClientSubmissionId(pendingShipment)
	}
	if (!submissionId && generate) {
		submissionId = localSubmissionId?.trim() || createClientSubmissionId()
	}

	return {
		clientSubmissionId: submissionId || '',
		context: {
			signature,
			client_submission_id: submissionId || '',
		},
	}
}
