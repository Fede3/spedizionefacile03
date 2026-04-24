/**
 * Analytics funnel — Plausible unico sink (GA4+Sentry archiviati 2026-04-20).
 *
 * Privacy: MAI trackare PII (email, nome, indirizzi, phone, CF/VAT, stripe_account_id).
 * Importi in cents (integer), mai EUR decimali. order_id ok (riferimento tecnico).
 * Failure mode: wrappato in try/catch — un analytics rotto non blocca il checkout.
 * Sampling 100% (eventi business rari, ~5-10/sessione).
 *
 * @typedef {Record<string, string|number|boolean|null|undefined>} FunnelProps
 * @typedef {'email'|'google'|'apple'|'facebook'} AuthMethod
 * @typedef {'nazionale'|'internazionale'|'pudo'|string} QuoteType
 */

/** Composable analytics funnel verso Plausible. */
export const useFunnelAnalytics = () => {
	/**
	 * Rimuove PII accidentali prima di inviare ai sink.
	 * Whitelist approach: manteniamo solo chiavi "safe".
	 */
	const sanitizeProps = (props) => {
		if (!props) return undefined
		const PII_KEYS = new Set([
			'email', 'email_confirmation', 'password', 'password_confirmation',
			'name', 'surname', 'full_name', 'fiscal_code', 'vat', 'phone',
			'address', 'street', 'postal_code', 'city', 'country',
			'iban', 'card_number', 'stripe_account_id', 'token', 'access_token',
		])
		const clean = {}
		for (const [key, value] of Object.entries(props)) {
			if (PII_KEYS.has(key.toLowerCase())) continue
			if (value === undefined || value === null) continue
			// Non lasciare passare oggetti/array — Plausible accetta solo scalari.
			if (typeof value === 'object') continue
			clean[key] = value
		}
		return clean
	}

	const sendToPlausible = (event, props) => {
		if (typeof window === 'undefined' || typeof window.plausible !== 'function') return
		try {
			window.plausible(event, props ? { props } : undefined)
		} catch {
			// no-op: analytics non deve rompere la pagina.
		}
	}

	// GA4 archiviato — vedi _archive/frontend-simplification-2026-04-20/npm-packages/ga4-duplicato/
	// Sentry archiviato — vedi _archive/frontend-simplification-2026-04-20/npm-packages/sentry-frontend/

	const track = (event, rawProps) => {
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

	const trackPreventivoStart = (quoteType) => {
		track('preventivo_start', { quote_type: String(quoteType || 'unknown') })
	}

	const trackServicesSelected = (services) => {
		track('services_selected', {
			count: Array.isArray(services) ? services.length : 0,
			// Nomi servizi OK (non sono PII): sms_email, assicurazione, contrassegno, etc.
			services: Array.isArray(services) ? services.join(',').slice(0, 120) : '',
		})
	}

	const trackAddressesFilled = () => {
		track('addresses_filled')
	}

	const trackPaymentInit = (amountCents) => {
		track('payment_init', { amount_cents: Math.round(Number(amountCents) || 0) })
	}

	const trackPaymentSuccess = (orderId, amountCents) => {
		track('payment_success', {
			order_id: String(orderId || ''),
			amount_cents: Math.round(Number(amountCents) || 0),
		})
	}

	const trackPaymentFail = (reason) => {
		track('payment_fail', { reason: String(reason || 'unknown').slice(0, 80) })
	}

	// ---------------------------------------------------------------------------
	// Eventi auth
	// ---------------------------------------------------------------------------

	const trackAuthLogin = (method) => {
		track('auth_login', { method })
	}

	const trackAuthRegister = (method) => {
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
