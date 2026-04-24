/**
 * useCookieConsent — Composable di gestione consenso cookie (GDPR/ePrivacy).
 *
 * Storage: localStorage chiave `cookie-consent-v1`.
 * Scadenza: 12 mesi dal timestamp salvato; oltre, il banner riappare.
 * Eventi globali (window):
 *   - `cookie-consent-updated` (CustomEvent<ConsentState>) — emesso a ogni salvataggio
 *   - `cookie-consent-open-preferences` — invocato da `openPreferences()` per
 *     consentire al banner di aprire la modale da qualunque entry-point
 *     (es. link "Gestisci cookie" del footer).
 *
 * Convenzione: i cookie tecnici/essenziali sono sempre `true` e non disattivabili.
 * Helper `isAllowed(category)` per caricamento condizionale di script analytics/marketing.
 */

const STORAGE_KEY = 'cookie-consent-v1'
const EXPIRY_MS = 1000 * 60 * 60 * 24 * 365 // ~12 mesi
export const CONSENT_UPDATED_EVENT = 'cookie-consent-updated'
export const CONSENT_OPEN_PREFERENCES_EVENT = 'cookie-consent-open-preferences'

export type ConsentCategory = 'essential' | 'analytics' | 'marketing'

export interface ConsentState {
	essential: true
	analytics: boolean
	marketing: boolean
	timestamp: number
}

interface ConsentPreferencesInput {
	analytics?: boolean
	marketing?: boolean
}

const DEFAULT_STATE: ConsentState = {
	essential: true,
	analytics: false,
	marketing: false,
	timestamp: 0,
}

const isClient = () => typeof window !== 'undefined'

const readFromStorage = (): ConsentState | null => {
	if (!isClient()) return null
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw) as Partial<ConsentState>
		if (typeof parsed?.timestamp !== 'number') return null
		// Scadenza: se più vecchio di EXPIRY_MS riteniamo il consenso scaduto.
		if (Date.now() - parsed.timestamp > EXPIRY_MS) return null
		return {
			essential: true,
			analytics: Boolean(parsed.analytics),
			marketing: Boolean(parsed.marketing),
			timestamp: parsed.timestamp,
		}
	} catch {
		return null
	}
}

const writeToStorage = (state: ConsentState) => {
	if (!isClient()) return
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
	} catch {
		// localStorage potrebbe essere bloccato (modalità privata Safari, quota piena).
		// Il consenso resta valido per la sessione corrente in memoria.
	}
}

const broadcast = (state: ConsentState) => {
	if (!isClient()) return
	try {
		window.dispatchEvent(new CustomEvent<ConsentState>(CONSENT_UPDATED_EVENT, { detail: state }))
	} catch {
		// CustomEvent non supportato: degradazione silenziosa.
	}
}

export const useCookieConsent = () => {
	// Stato globale condiviso fra istanze (banner, modale, footer link...).
	const state = useState<ConsentState>('cookie-consent-state', () => ({ ...DEFAULT_STATE }))

	const hydrate = () => {
		const stored = readFromStorage()
		if (stored) {
			state.value = stored
		}
	}

	const persist = (next: ConsentState) => {
		state.value = next
		writeToStorage(next)
		broadcast(next)
	}

	const hasConsented = (): boolean => {
		// Considera consenso valido solo se esiste un timestamp salvato e non scaduto.
		if (state.value.timestamp > 0) return true
		return readFromStorage() !== null
	}

	const acceptAll = () => {
		persist({
			essential: true,
			analytics: true,
			marketing: true,
			timestamp: Date.now(),
		})
	}

	const rejectAll = () => {
		persist({
			essential: true,
			analytics: false,
			marketing: false,
			timestamp: Date.now(),
		})
	}

	const setPreferences = (preferences: ConsentPreferencesInput) => {
		persist({
			essential: true,
			analytics: Boolean(preferences.analytics),
			marketing: Boolean(preferences.marketing),
			timestamp: Date.now(),
		})
	}

	const openPreferences = () => {
		if (!isClient()) return
		try {
			window.dispatchEvent(new Event(CONSENT_OPEN_PREFERENCES_EVENT))
		} catch {
			// no-op
		}
	}

	const isAllowed = (category: ConsentCategory): boolean => {
		if (category === 'essential') return true
		if (!hasConsented()) return false
		return Boolean(state.value[category])
	}

	return {
		state: readonly(state),
		hydrate,
		hasConsented,
		acceptAll,
		rejectAll,
		setPreferences,
		openPreferences,
		isAllowed,
	}
}

export default useCookieConsent
