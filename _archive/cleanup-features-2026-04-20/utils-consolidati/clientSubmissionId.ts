// Idempotency key client-side: protegge preventivo e checkout da doppio submit e retry di rete (usato da backend Stripe/ordini per deduplica).
const normalizeSubmissionId = (value: unknown): string => String(value ?? '').trim()

export const createClientSubmissionId = (): string => (
	`sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
)

interface SubmissionSource {
	client_submission_id?: unknown
	[key: string]: unknown
}

export const readClientSubmissionId = (...sources: Array<SubmissionSource | null | undefined>): string | null => {
	for (const source of sources) {
		if (!source || typeof source !== 'object') continue
		const submissionId = normalizeSubmissionId(source.client_submission_id)
		if (submissionId) return submissionId
	}

	return null
}

export const ensureClientSubmissionId = (target: SubmissionSource | null | undefined): string => {
	const existing = readClientSubmissionId(target)
	if (existing) return existing

	const created = createClientSubmissionId()
	if (target && typeof target === 'object') {
		target.client_submission_id = created
	}

	return created
}
