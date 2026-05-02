import { ref } from 'vue'
import { readClientSubmissionId } from '~/utils/clientSubmissionId'
import {
	buildCheckoutSubmissionContext,
	buildCheckoutSubmissionSignature,
	readPendingShipmentDraft,
	syncPendingShipmentSubmissionId,
} from '~/utils/checkout'

type OrderLike = {
	id?: string | number | null
	client_submission_id?: unknown
	[key: string]: unknown
}
type ApiOrderResponse = OrderLike & {
	data?: OrderLike | null
	order_ids?: Array<string | number | null>
	order_id?: string | number | null
	client_submission_id?: string | null
}
type CheckoutSubmissionContext = {
	signature: string
	client_submission_id: string
}
type ValueRef<T> = {
	value: T
}
type CheckoutCartContext = {
	existingOrderId?: ValueRef<unknown>
	existingOrder?: ValueRef<unknown>
	finalTotal?: ValueRef<unknown>
	getNumberTotal?: ValueRef<unknown>
	billingPayload: ValueRef<unknown>
	discountContext?: ValueRef<unknown>
}
type ShipmentFlowStoreLike = {
	pendingShipment?: unknown
}
type CheckoutSession = ValueRef<unknown>
type CheckoutOrderContextOptions = {
	cart: CheckoutCartContext
	sanctum: <T = ApiOrderResponse>(url: string, options?: Record<string, unknown>) => Promise<T>
	shipmentFlowStore: object
	session: CheckoutSession
	paymentStep?: ValueRef<string>
}
type BuildSubmissionOptions = {
	preferExisting?: boolean
	generate?: boolean
}

const normalizeOrderId = (value: unknown): string => String(value ?? '').trim()
const toOrderId = (value: unknown): string | number | null => {
	if (typeof value === 'number') return value
	if (typeof value === 'string' && value.trim()) return value.trim()
	return null
}
const asOrderLike = (value: unknown): OrderLike | null =>
	value && typeof value === 'object' ? value as OrderLike : null
const asRecordOrNull = (value: unknown): Record<string, unknown> | null =>
	value && typeof value === 'object' ? value as Record<string, unknown> : null
const getSessionData = (value: unknown): Record<string, unknown> | null => {
	const source = asRecordOrNull(value)
	if (!source) return null
	const nestedData = asRecordOrNull(source.data)
	return nestedData || source
}

export function useCheckoutOrderContext({
	cart,
	sanctum,
	shipmentFlowStore,
	session,
	paymentStep,
}: CheckoutOrderContextOptions) {
	const clientSubmissionId = ref<string | null>(null)
	const checkoutSubmissionContext = ref<CheckoutSubmissionContext | null>(null)
	const shipmentFlowDraftSource = shipmentFlowStore as ShipmentFlowStoreLike

	function currentOrderMatchesRoute(order: OrderLike | null | undefined) {
		const routeOrderId = normalizeOrderId(cart.existingOrderId?.value)
		if (!routeOrderId) return true
		return normalizeOrderId(order?.id) === routeOrderId
	}
	function getPendingShipment() {
		return readPendingShipmentDraft(shipmentFlowDraftSource)
	}
	function syncCheckoutSubmissionContext(submissionId: unknown) {
		const normalized = typeof submissionId === 'string' ? submissionId.trim() : ''
		if (!normalized) return

		clientSubmissionId.value = normalized
		syncPendingShipmentSubmissionId(shipmentFlowDraftSource, normalized)
		checkoutSubmissionContext.value = {
			signature: buildCheckoutSubmissionSignature({
				existingOrderId: toOrderId(cart.existingOrderId?.value) ?? asOrderLike(cart.existingOrder?.value)?.id ?? null,
				total: Number(cart.finalTotal?.value ?? cart.getNumberTotal?.value ?? 0),
				billingPayload: asRecordOrNull(cart.billingPayload.value),
			}),
			client_submission_id: normalized,
		}
	}
	async function restoreExistingOrder({ force = false }: { force?: boolean } = {}) {
		const orderId = toOrderId(cart.existingOrderId?.value)
		if (!orderId) return null

		const currentOrder = asOrderLike(cart.existingOrder?.value)
		const currentSubmissionId = readClientSubmissionId(currentOrder)
		if (currentOrder?.id && currentSubmissionId && currentOrderMatchesRoute(currentOrder) && !force) {
			syncCheckoutSubmissionContext(currentSubmissionId)
			return currentOrder
		}

		const res = await sanctum<ApiOrderResponse>(`/api/orders/${orderId}`)
		const hydratedOrder = res.data ?? res ?? null
		if (cart.existingOrder?.value !== undefined) {
			cart.existingOrder.value = hydratedOrder
		}

		const canonicalSubmissionId = readClientSubmissionId(hydratedOrder)
		if (canonicalSubmissionId) syncCheckoutSubmissionContext(canonicalSubmissionId)
		return hydratedOrder
	}
	function buildSubmissionContext({ preferExisting = true, generate = true }: BuildSubmissionOptions = {}) {
		const { clientSubmissionId: nextSubmissionId, context } = buildCheckoutSubmissionContext({
			preferExisting,
			generate,
			existingOrder: asOrderLike(cart.existingOrder?.value),
			existingOrderId: toOrderId(cart.existingOrderId?.value) ?? asOrderLike(cart.existingOrder?.value)?.id ?? null,
			pendingShipment: getPendingShipment(),
			sessionData: getSessionData(session.value),
			cachedContext: checkoutSubmissionContext.value || null,
			localSubmissionId: clientSubmissionId.value,
			total: Number(cart.finalTotal?.value ?? cart.getNumberTotal?.value ?? 0),
			billingPayload: asRecordOrNull(cart.billingPayload.value),
		})

		clientSubmissionId.value = nextSubmissionId
		syncPendingShipmentSubmissionId(shipmentFlowDraftSource, nextSubmissionId)
		checkoutSubmissionContext.value = context

		return {
			client_submission_id: nextSubmissionId,
			...(asRecordOrNull(cart.discountContext?.value) ? { discount_context: asRecordOrNull(cart.discountContext?.value) } : {}),
		}
	}
	async function createCheckoutOrder() {
		if (paymentStep?.value !== undefined) {
			paymentStep.value = 'Creazione ordine...'
		}

		const subtotalCents = Math.round(Number(cart.getNumberTotal?.value ?? 0) * 100)
		const submissionContext = buildSubmissionContext({ preferExisting: false, generate: true })
		const res = await sanctum<ApiOrderResponse>('/api/stripe/create-order', {
			method: 'POST',
			body: {
				subtotal: subtotalCents,
				billing_data: cart.billingPayload.value,
				single_order_only: true,
				...submissionContext,
			},
		})

		const orderIds = Array.isArray(res.order_ids) ? res.order_ids.filter(Boolean) : []
		if (orderIds.length > 1) {
			throw new Error('Il pagamento di piu spedizioni separate va completato una spedizione alla volta.')
		}

		const orderId = orderIds[0] ?? res.order_id
		if (!orderId) throw new Error('Ordine non creato: id mancante nella risposta.')
		if (res.client_submission_id) syncCheckoutSubmissionContext(res.client_submission_id)
		return orderId
	}
	async function resolvePayableOrderId() {
	const existing = asOrderLike(cart.existingOrder?.value)
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
