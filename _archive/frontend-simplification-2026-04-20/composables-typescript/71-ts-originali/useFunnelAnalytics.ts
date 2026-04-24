/**
 * Analytics funnel tracking unificato: Plausible (unico sink attivo).
 *
 * STORIA: in origine questo composable inoltrava anche a GA4 (window.gtag) e
 * Sentry (breadcrumbs). Entrambi sono stati ARCHIVIATI il 2026-04-20 nella
 * semplificazione frontend (vedi `_archive/frontend-simplification-2026-04-20/
 * npm-packages/`). Ora Plausible è l'unico sink attivo.
 *
 * Privacy: MAI trackare PII (email, nome, indirizzi, stripe_account_id, phone, CF/VAT).
 *   - Importi sempre in cents (integer), MAI valori EUR con decimali.
 *   - order_id è accettabile (è un riferimento tecnico, non PII).
 *   - Niente autocompilazione dei props: solo quello che passiamo esplicitamente.
 *
 * Failure mode:
 *   - Il sink Plausible è wrappato in try/catch. Un analytics rotto NON deve
 *     rompere la pagina né bloccare il flusso (es. checkout).
 *   - Se Plausible non è disponibile (dev senza env), il composable è un no-op.
 *
 * Sampling:
 *   - 100% per gli eventi business (sono pochi per sessione, ~5-10 max).
 */

type FunnelProps = Record<string, string | number | boolean | null | undefined>
type AuthMethod = 'email' | 'google' | 'apple' | 'facebook'
type QuoteType = 'nazionale' | 'internazionale' | 'pudo' | string

declare global {
	interface Window {
		plausible?: {
			(event: string, options?: { props?: FunnelProps; callback?: () => void }): void
			q?: unknown[]
		}
	}
}

export const useFunnelAnalytics = () => {
	/**
	 * Rimuove PII accidentali prima di inviare ai sink.
	 * Whitelist approach: manteniamo solo chiavi "safe".
	 */
	const sanitizeProps = (props?: FunnelProps): FunnelProps | undefined => {
		if (!props) return undefined
		const PII_KEYS = new Set([
			'email', 'email_confirmation', 'password', 'password_confirmation',
			'name', 'surname', 'full_name', 'fiscal_code', 'vat', 'phone',
			'address', 'street', 'postal_code', 'city', 'country',
			'iban', 'card_number', 'stripe_account_id', 'token', 'access_token',
		])
		const clean: FunnelProps = {}
		for (const [key, value] of Object.entries(props)) {
			if (PII_KEYS.has(key.toLowerCase())) continue
			if (value === undefined || value === null) continue
			// Non lasciare passare oggetti/array — Plausible accetta solo scalari.
			if (typeof value === 'object') continue
			clean[key] = value
		}
		return clean
	}

	const sendToPlausible = (event: string, props?: FunnelProps): void => {
		if (typeof window === 'undefined' || typeof window.plausible !== 'function') return
		try {
			window.plausible(event, props ? { props } : undefined)
		} catch {
			// no-op: analytics non deve rompere la pagina.
		}
	}

	// GA4 archiviato — vedi _archive/frontend-simplification-2026-04-20/npm-packages/ga4-duplicato/
	// Sentry archiviato — vedi _archive/frontend-simplification-2026-04-20/npm-packages/sentry-frontend/

	const track = (event: string, rawProps?: FunnelProps): void => {
		if (typeof window === 'undefined') return
		const props = sanitizeProps(rawProps)
		sendToPlausible(event, props)
		if (import.meta.dev) {
			// eslint-disable-next-line no-console
			console.debug(`[Funnel] ${event}`, props || {})
		}
	}

	// ---------------------------------------------------------------------------
	// Eventi funnel preventivo (step 1 → 5)
	// ---------------------------------------------------------------------------

	const trackPreventivoStart = (quoteType: QuoteType): void => {
		track('preventivo_start', { quote_type: String(quoteType || 'unknown') })
	}

	const trackServicesSelected = (services: string[]): void => {
		track('services_selected', {
			count: Array.isArray(services) ? services.length : 0,
			// Nomi servizi OK (non sono PII): sms_email, assicurazione, contrassegno, etc.
			services: Array.isArray(services) ? services.join(',').slice(0, 120) : '',
		})
	}

	const trackAddressesFilled = (): void => {
		track('addresses_filled')
	}

	const trackPaymentInit = (amountCents: number): void => {
		track('payment_init', { amount_cents: Math.round(Number(amountCents) || 0) })
	}

	const trackPaymentSuccess = (orderId: string | number, amountCents: number): void => {
		track('payment_success', {
			order_id: String(orderId || ''),
			amount_cents: Math.round(Number(amountCents) || 0),
		})
	}

	const trackPaymentFail = (reason: string): void => {
		track('payment_fail', { reason: String(reason || 'unknown').slice(0, 80) })
	}

	// ---------------------------------------------------------------------------
	// Eventi auth
	// ---------------------------------------------------------------------------

	const trackAuthLogin = (method: AuthMethod): void => {
		track('auth_login', { method })
	}

	const trackAuthRegister = (method: AuthMethod): void => {
		track('auth_register', { method })
	}

	return {
		track,
		trackPreventivoStart,
		trackServicesSelected,
		trackAddressesFilled,
		trackPaymentInit,
		trackPaymentSuccess,
		trackPaymentFail,
		trackAuthLogin,
		trackAuthRegister,
	}
}
