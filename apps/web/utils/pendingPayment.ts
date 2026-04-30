export const PENDING_PAYMENT_KEY = 'sf_pending_payment'
export const PENDING_PAYMENT_TTL_MS = 24 * 60 * 60 * 1000

export type PendingPaymentDraft = {
	orderId: string | number
	paymentMethod?: string
	submissionId?: string
	isExisting?: boolean
	amount?: number
	createdAt?: number
	expiresAt?: number
	[key: string]: unknown
}

export function safeLocalGet<T = unknown>(key: string): T | null {
	if (typeof window === 'undefined') return null
	try {
		const raw = window.localStorage.getItem(key)
		return raw ? JSON.parse(raw) as T : null
	} catch {
		return null
	}
}

export function safeLocalSet(key: string, value: unknown) {
	if (typeof window === 'undefined') return
	try {
		window.localStorage.setItem(key, JSON.stringify(value))
	} catch {
		/* storage full or disabled */
	}
}

export function safeLocalRemove(key: string) {
	if (typeof window === 'undefined') return
	try {
		window.localStorage.removeItem(key)
	} catch {
		/* storage disabled */
	}
}

export function loadPendingPayment(): PendingPaymentDraft | null {
	const data = safeLocalGet<PendingPaymentDraft>(PENDING_PAYMENT_KEY)
	if (!data) return null
	if (data.expiresAt && data.expiresAt < Date.now()) {
		safeLocalRemove(PENDING_PAYMENT_KEY)
		return null
	}
	return data
}

export function clearPendingPayment() {
	safeLocalRemove(PENDING_PAYMENT_KEY)
}
