import {
	createClientSubmissionId,
	ensureClientSubmissionId,
	readClientSubmissionId,
	readNestedClientSubmissionId,
} from '~/utils/shipment'

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
