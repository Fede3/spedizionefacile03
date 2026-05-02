/**
 * Tracking eventi del funnel preventivo + checkout (Plausible / GA4).
 * Wrapper sul plugin Plausible attivo su tutto il sito.
 *
 * Tutti i metodi sono no-op se il tracker non e' inizializzato (build SSR
 * o ambiente test). Gli argomenti vengono validati per evitare crash.
 */

function safeTrack(name: string, props?: Record<string, unknown>): void {
	try {
		const tracker = (globalThis as unknown as { useTrackEvent?: (n: string, o?: { props?: Record<string, unknown> }) => void }).useTrackEvent
		if (typeof tracker === 'function') {
			tracker(name, props ? { props } : undefined)
		}
	} catch {
		// SSR o tracker non disponibile: ignora.
	}
}

export function useFunnelAnalytics() {
	return {
		trackAuthLogin: (method: string = 'email') => safeTrack('auth_login', { method }),
		trackAuthRegister: (method: string = 'email') => safeTrack('auth_register', { method }),
		trackPaymentInit: (amountCents: number | string) => safeTrack('payment_init', { amount_cents: Number(amountCents) }),
		trackPaymentSuccess: (orderId: string | number, method: string) => safeTrack('payment_success', { order_id: String(orderId), method }),
		trackPaymentFailed: (reason: string, method: string) => safeTrack('payment_failed', { reason, method }),
		trackBeginCheckout: (totalCents?: number) => safeTrack('begin_checkout', totalCents !== undefined ? { total_cents: totalCents } : undefined),
		trackFunnelStep: (step: string) => safeTrack('funnel_step', { step }),
		trackPreventivoStart: (origin?: string) => safeTrack('preventivo_start', origin ? { origin } : undefined),
	}
}
