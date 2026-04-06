/**
 * Helper condivisi per la logica di autenticazione.
 *
 * Funzioni usate sia da useAutenticazione (pagina /autenticazione) sia da
 * useAuthOverlay (modale auth inline). Centralizzate qui per evitare drift.
 */

// ── Redirect sanitization ──

/**
 * Valida e normalizza un path di redirect post-auth.
 * Previene open redirect rifiutando path non relativi.
 */
export const sanitizeAuthRedirect = (redirect?: string | null, fallback = '/account'): string => {
	if (!redirect || typeof redirect !== 'string') return fallback
	if (redirect.startsWith('/') && !redirect.startsWith('//')) return redirect
	return fallback
}

// ── Social auth error messages ──

const SOCIAL_ERROR_MAP: Record<string, string> = {
	google_email_missing: "Il tuo account Google non ha un\u2019email disponibile. Usa un altro account oppure registrati con email.",
	facebook_email_missing: "Il tuo account Facebook non ha un\u2019email disponibile. Usa un altro account oppure registrati con email.",
	apple_email_missing: "Il tuo account Apple non ha un\u2019email disponibile. Usa un altro account oppure registrati con email.",
	google_unavailable: 'Accesso con Google temporaneamente non disponibile. Completiamo prima la configurazione del provider.',
	facebook_unavailable: 'Accesso con Facebook temporaneamente non disponibile. Completiamo prima la configurazione del provider.',
	apple_unavailable: 'Accesso con Apple temporaneamente non disponibile. Completiamo prima la configurazione del provider.',
}

/**
 * Traduce un codice errore social auth in un messaggio leggibile per l'utente.
 */
export const humanizeSocialAuthError = (rawError: string): string => {
	if (SOCIAL_ERROR_MAP[rawError]) return SOCIAL_ERROR_MAP[rawError]
	if (rawError.startsWith('facebook_')) return "Errore durante l\u2019accesso con Facebook. Riprova."
	if (rawError.startsWith('google_')) return "Errore durante l\u2019accesso con Google. Riprova."
	if (rawError.startsWith('apple_')) return "Errore durante l\u2019accesso con Apple. Riprova."
	return "Errore durante l\u2019accesso social. Riprova."
}
