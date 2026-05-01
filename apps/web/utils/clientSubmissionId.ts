/**
 * Idempotency key client-side per preventivo + checkout.
 *
 * Il backend (Stripe + ordini) usa il `client_submission_id` per deduplicare
 * doppi-submit (utente impaziente, retry rete, doppio click). Generato lato
 * client come stringa breve `sub-<base36-timestamp>-<random>`.
 *
 */
export type SubmissionSource = { client_submission_id?: unknown };
export type NestedSubmissionSource = SubmissionSource & {
	data?: NestedSubmissionSource | null;
	pendingShipment?: NestedSubmissionSource | null;
};

const normalizeSubmissionId = (value: unknown): string => String(value ?? '').trim();

/**
 * Genera un nuovo ID submission client (idempotency key).
 */
export const createClientSubmissionId = () =>
	`sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Cerca il primo client_submission_id valido fra le sorgenti passate (flat).
 */
export const readClientSubmissionId = (
	...sources: Array<SubmissionSource | null | undefined>
): string | null => {
	for (const source of sources) {
		if (!source || typeof source !== 'object') continue;
		const submissionId = normalizeSubmissionId(source.client_submission_id);
		if (submissionId) return submissionId;
	}
	return null;
};

/**
 * Cerca ricorsivamente client_submission_id nelle chiavi pendingShipment/data.
 */
export const readNestedClientSubmissionId = (
	...sources: Array<NestedSubmissionSource | null | undefined>
): string | null => {
	const queue = [...sources];
	const visited = new Set<NestedSubmissionSource>();
	while (queue.length > 0) {
		const source = queue.shift();
		if (!source || typeof source !== 'object') continue;
		if (visited.has(source)) continue;
		visited.add(source);
		const submissionId = normalizeSubmissionId(source.client_submission_id);
		if (submissionId) return submissionId;
		const nestedCandidates = [source.pendingShipment, source.data];
		for (const candidate of nestedCandidates) {
			if (candidate && typeof candidate === 'object') {
				queue.push(candidate);
			}
		}
	}
	return null;
};

/**
 * Se target non ha un client_submission_id, ne genera uno e lo salva in place.
 */
export const ensureClientSubmissionId = (target: SubmissionSource | null | undefined): string => {
	const existing = readClientSubmissionId(target);
	if (existing) return existing;
	const created = createClientSubmissionId();
	if (target && typeof target === 'object') {
		target.client_submission_id = created;
	}
	return created;
};
