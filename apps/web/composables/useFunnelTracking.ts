/**
 * useFunnelTracking — analytics funnel SpediamoFacile (Plausible).
 *
 *
 * Privacy: MAI trackare PII (email, nome, indirizzi, phone, CF/VAT, stripe_account_id).
 * Importi in cents (integer), mai EUR decimali. order_id ok (riferimento tecnico).
 * Failure mode: wrappato in try/catch — un analytics rotto non blocca il checkout.
 * Sampling 100% (eventi business rari, ~5-10/sessione).
 *
 * GA4 archiviato — vedi _archive/frontend-simplification-2026-04-20/npm-packages/ga4-duplicato/
 * Sentry archiviato — vedi _archive/frontend-simplification-2026-04-20/npm-packages/sentry-frontend/
 */

type FunnelPropValue = string | number | boolean | null | undefined;
type FunnelProps = Record<string, FunnelPropValue>;
type AuthMethod = 'email' | 'google' | 'apple' | 'facebook' | string;

const isScalarFunnelProp = (value: unknown): value is FunnelPropValue => (
	value === null
	|| value === undefined
	|| ['string', 'number', 'boolean'].includes(typeof value)
);

/** Composable analytics funnel verso Plausible. */
export const useFunnelAnalytics = () => {
	/**
	 * Rimuove PII accidentali prima di inviare ai sink.
	 * Whitelist approach: manteniamo solo chiavi "safe".
	 */
	const sanitizeProps = (props?: Record<string, unknown> | null): FunnelProps | undefined => {
		if (!props) return undefined;
		const PII_KEYS = new Set([
			'email', 'email_confirmation', 'password', 'password_confirmation',
			'name', 'surname', 'full_name', 'fiscal_code', 'vat', 'phone',
			'address', 'street', 'postal_code', 'city', 'country',
			'iban', 'card_number', 'stripe_account_id', 'token', 'access_token',
		]);
		const clean: FunnelProps = {};
		for (const [key, value] of Object.entries(props)) {
			if (PII_KEYS.has(key.toLowerCase())) continue;
			if (value === undefined || value === null) continue;
			// Non lasciare passare oggetti/array — Plausible accetta solo scalari.
			if (!isScalarFunnelProp(value) || typeof value === 'object') continue;
			clean[key] = value;
		}
		return clean;
	};

	const sendToPlausible = (event: string, props?: FunnelProps) => {
		const plausible = typeof window !== 'undefined' && typeof window.plausible === 'function'
			? window.plausible as (event: string, options?: { props?: FunnelProps }) => void
			: null;
		if (!plausible) return;
		try {
			plausible(event, props ? { props } : undefined);
		} catch {
			// no-op: analytics non deve rompere la pagina.
		}
	};

	const track = (event: string, rawProps?: Record<string, unknown> | null) => {
		if (typeof window === 'undefined') return;
		const props = sanitizeProps(rawProps);
		sendToPlausible(event, props);
		if (import.meta.dev && window.localStorage?.getItem('sf_debug_shipment') === '1') {
			// eslint-disable-next-line no-console
			console.debug(`[Funnel] ${event}`, props || {});
		}
	};

	// ── Eventi funnel preventivo (step 1 → 5) ────────────────────────────────
	const trackPreventivoStart = (quoteType: unknown) => {
		track('preventivo_start', { quote_type: String(quoteType || 'unknown') });
	};

	const trackServicesSelected = (services: unknown[] | null | undefined) => {
		track('services_selected', {
			count: Array.isArray(services) ? services.length : 0,
			// Nomi servizi OK (non sono PII): sms_email, assicurazione, contrassegno, etc.
			services: Array.isArray(services) ? services.join(',').slice(0, 120) : '',
		});
	};

	const trackAddressesFilled = () => {
		track('addresses_filled', {});
	};

	const trackPaymentInit = (amountCents: unknown) => {
		track('payment_init', { amount_cents: Math.round(Number(amountCents) || 0) });
	};

	const trackPaymentSuccess = (orderId: unknown, amountCents: unknown) => {
		track('payment_success', {
			order_id: String(orderId || ''),
			amount_cents: Math.round(Number(amountCents) || 0),
		});
	};

	const trackPaymentFail = (reason: unknown) => {
		track('payment_fail', { reason: String(reason || 'unknown').slice(0, 80) });
	};

	// ── Eventi auth ──────────────────────────────────────────────────────────
	const trackAuthLogin = (method: AuthMethod) => {
		track('auth_login', { method });
	};

	const trackAuthRegister = (method: AuthMethod) => {
		track('auth_register', { method });
	};

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
	};
};
