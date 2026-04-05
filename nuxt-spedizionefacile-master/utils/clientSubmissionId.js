const normalizeSubmissionId = (value) => String(value ?? '').trim();

export const createClientSubmissionId = () => (
	`sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
);

export const readClientSubmissionId = (...sources) => {
	for (const source of sources) {
		if (!source || typeof source !== 'object') continue;
		const submissionId = normalizeSubmissionId(source.client_submission_id);
		if (submissionId) return submissionId;
	}

	return null;
};

export const ensureClientSubmissionId = (target) => {
	const existing = readClientSubmissionId(target);
	if (existing) return existing;

	const created = createClientSubmissionId();
	if (target && typeof target === 'object') {
		target.client_submission_id = created;
	}

	return created;
};
