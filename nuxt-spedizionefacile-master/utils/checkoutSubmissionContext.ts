import {
	createClientSubmissionId,
	ensureClientSubmissionId,
	readClientSubmissionId,
	readNestedClientSubmissionId,
} from '~/utils/shipment'

type MaybeRecord = Record<string, unknown> | null | undefined

interface BuildContextInput {
	preferExisting?: boolean
	generate?: boolean
	existingOrder?: MaybeRecord
	existingOrderId?: string | number | null
	pendingShipment?: MaybeRecord
	sessionData?: MaybeRecord
	cachedContext?: MaybeRecord
	localSubmissionId?: string | null
	total?: number
	billingPayload?: MaybeRecord
}

interface SubmissionContextResult {
	clientSubmissionId: string
	context: {
		signature: string
		client_submission_id: string
	}
}

// Boundary canonico del contesto checkout lato frontend.
// Qui vive solo la logica di deduplicazione / riuso del client_submission_id
// e la signature del payload pagabile; il pagamento reale resta in usePayment.

export const readPendingShipmentDraft = (shipmentFlowStore: MaybeRecord): MaybeRecord => (
	shipmentFlowStore?.pendingShipment && typeof shipmentFlowStore.pendingShipment === 'object'
		? shipmentFlowStore.pendingShipment as MaybeRecord
		: null
)

export const syncPendingShipmentSubmissionId = (
	shipmentFlowStore: MaybeRecord,
	submissionId: unknown,
): void => {
	const normalized = typeof submissionId === 'string' ? submissionId.trim() : ''
	if (!normalized) return

	const pendingShipment = readPendingShipmentDraft(shipmentFlowStore)
	if (!pendingShipment) return
	if (pendingShipment.client_submission_id === normalized) return

	shipmentFlowStore!.pendingShipment = {
		...pendingShipment,
		client_submission_id: normalized,
	}
}

export const readExistingOrderSubmissionId = (existingOrder: MaybeRecord): string | null => (
	readClientSubmissionId(existingOrder as Record<string, unknown> | null | undefined)
)

export const buildCheckoutSubmissionSignature = ({
	existingOrderId,
	total = 0,
	billingPayload = null,
}: {
	existingOrderId?: string | number | null
	total?: number
	billingPayload?: MaybeRecord
}): string => JSON.stringify({
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
		existingOrderId: existingOrderId || (existingOrder?.id as string | number | null) || null,
		total,
		billingPayload,
	})

	const existingOrderSubmissionId = preferExisting
		? readExistingOrderSubmissionId(existingOrder)
		: null

	if (existingOrderSubmissionId) {
		return {
			clientSubmissionId: existingOrderSubmissionId,
			context: {
				signature,
				client_submission_id: existingOrderSubmissionId,
			},
		}
	}

	if (
		cachedContext?.signature === signature
		&& typeof cachedContext?.client_submission_id === 'string'
		&& cachedContext.client_submission_id.trim() !== ''
	) {
		const cachedSubmissionId = cachedContext.client_submission_id.trim()
		return {
			clientSubmissionId: cachedSubmissionId,
			context: {
				signature,
				client_submission_id: cachedSubmissionId,
			},
		}
	}

	const nestedKnownSubmissionId = preferExisting
		? readNestedClientSubmissionId(
			existingOrder as Record<string, unknown> | null | undefined,
			pendingShipment as Record<string, unknown> | null | undefined,
			(sessionData?.pendingShipment || null) as Record<string, unknown> | null | undefined,
			sessionData as Record<string, unknown> | null | undefined,
			localSubmissionId ? { client_submission_id: localSubmissionId } : null,
		)
		: readNestedClientSubmissionId(
			pendingShipment as Record<string, unknown> | null | undefined,
			(sessionData?.pendingShipment || null) as Record<string, unknown> | null | undefined,
			sessionData as Record<string, unknown> | null | undefined,
		)

	let submissionId = nestedKnownSubmissionId

	if (!submissionId && pendingShipment) {
		submissionId = ensureClientSubmissionId(
			pendingShipment as Record<string, unknown> | null | undefined,
		)
	}

	if (!submissionId && generate) {
		submissionId = typeof localSubmissionId === 'string' && localSubmissionId.trim() !== ''
			? localSubmissionId.trim()
			: createClientSubmissionId()
	}

	return {
		clientSubmissionId: submissionId || '',
		context: {
			signature,
			client_submission_id: submissionId || '',
		},
	}
}
