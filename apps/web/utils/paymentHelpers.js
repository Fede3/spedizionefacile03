/**
 * paymentHelpers — funzioni pure per il flusso pagamento (auth-retry, errori, draft).
 *
 * Estratte da `composables/usePayment.js` (split atomico Pinia 2026-04-26).
 * Tutte le funzioni qui dentro sono SSR-safe e non dipendono da Vue/Pinia.
 */

interface ErrorWithStatus {
	response?: { status?: number }
	statusCode?: number
	status?: number
	data?: { statusCode?: number }
}

/** True se l'errore HTTP indica sessione scaduta (401) o CSRF mismatch (419). */
export function isAuthError(error: unknown): boolean {
	const e = error as ErrorWithStatus | null
	const status = e?.response?.status ?? e?.statusCode ?? e?.status ?? e?.data?.statusCode
	return status === 401 || status === 419
}

/**
 * Auth-retry generico: se `fn` lancia 401/419 (sessione scaduta durante 3DS),
 * chiama `reauth()` e ritenta. Max `attempts` retry.
 */
export async function callWithAuthRetry<T>(
	fn: () => Promise<T>,
	reauth: () => Promise<void>,
	{ attempts = 2, label = 'payment call' }: { attempts?: number, label?: string } = {},
): Promise<T> {
	let lastError: unknown = null
	for (let attempt = 0; attempt <= attempts; attempt++) {
		try { return await fn() }
		catch (error) {
			lastError = error
			if (isAuthError(error) && attempt < attempts) {
				console.warn(`[payment] ${label}: 401, tentativo re-auth #${attempt + 1}`)
				try { await reauth() }
				catch (authErr) { console.warn(`[payment] re-auth fallito:`, (authErr as Error)?.message || authErr) }
				continue
			}
			throw error
		}
	}
	throw lastError
}

/** Distingue saldo insufficiente da errore tecnico per messaggio contestuale all'utente. */
export function detectInsufficientFunds(serverMessage: unknown): boolean {
	return typeof serverMessage === 'string' && /saldo|insufficien/i.test(serverMessage)
}

/** Stile Stripe Card Element (font, colori, placeholder). */
export const STRIPE_CARD_STYLE = {
	base: {
		fontSize: '16px',
		lineHeight: '40px',
		color: '#0f172a',
		fontFamily: 'Inter, system-ui, sans-serif',
		'::placeholder': { color: '#94a3b8' },
	},
	invalid: { color: '#b91c1c' },
}
