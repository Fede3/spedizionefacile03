import {
	type AuthUiSnapshot,
	hasAuthSessionCookie,
	readAuthUiSnapshotFromCookieHeader,
} from '~/utils/authUiState'

/**
 * Auth bootstrap centralizzato per middleware e plugin.
 *
 * Tre middleware (admin, app-auth, guest-auth) e il plugin sanctum-bootstrap
 * condividono la stessa logica di inizializzazione auth:
 *   1. Leggono useState('auth-bootstrap-ready') e useState('auth-bootstrap-status')
 *   2. Chiamano useSanctumAuth().init()
 *   3. Gestiscono 401/419 come "risolto" (utente non autenticato ma stato noto)
 *   4. Marcano bootstrap come pronto/fallito
 *
 * Questo modulo centralizza tutti questi pattern per evitare drift e duplicazione.
 */

// ── Tipi ──

export type AuthBootstrapResult = {
	bootstrapReady: ReturnType<typeof useState<boolean>>
	bootstrapStatus: ReturnType<typeof useState<'idle' | 'pending' | 'resolved' | 'failed'>>
}

// ── Stato condiviso ──

/**
 * Accede allo stato globale (useState) del bootstrap auth.
 * Tutti i consumatori usano le stesse chiavi, garantendo coerenza.
 */
export const useAuthBootstrapState = (): AuthBootstrapResult => {
	const bootstrapReady = useState('auth-bootstrap-ready', () => false)
	const bootstrapStatus = useState<'idle' | 'pending' | 'resolved' | 'failed'>('auth-bootstrap-status', () => 'idle')
	return { bootstrapReady, bootstrapStatus }
}

// ── Client-side bootstrap ──

/**
 * Esegue il bootstrap auth client-side: chiama init() e gestisce gli errori.
 *
 * Opzioni:
 *   - force: esegue anche se il bootstrap risulta gia' risolto (default: false)
 *   - skipIfNoSnapshot: salta init() se non c'e' una snapshot auth (guest-auth pattern)
 *
 * Restituisce il risultato dello stato bootstrap dopo l'esecuzione.
 */
export const runAuthBootstrap = async (options?: {
	force?: boolean
	skipIfNoSnapshot?: boolean
	hasAuthenticatedSnapshot?: boolean
}): Promise<AuthBootstrapResult> => {
	const { bootstrapReady, bootstrapStatus } = useAuthBootstrapState()
	const { init } = useSanctumAuth()

	const alreadyResolved = bootstrapReady.value && bootstrapStatus.value === 'resolved'

	if (alreadyResolved && !options?.force) {
		return { bootstrapReady, bootstrapStatus }
	}

	// guest-auth: evita /api/user se non esiste traccia di sessione autenticata
	if (options?.skipIfNoSnapshot && !options?.hasAuthenticatedSnapshot) {
		bootstrapStatus.value = 'resolved'
		bootstrapReady.value = true
		return { bootstrapReady, bootstrapStatus }
	}

	bootstrapReady.value = false
	bootstrapStatus.value = 'pending'

	try {
		await init()
		bootstrapStatus.value = 'resolved'
	} catch (error) {
		const err = error as { status?: number; response?: { status?: number } }
		const status = Number(err?.status ?? err?.response?.status ?? 0)

		if ([401, 419].includes(status)) {
			// Non autenticato o CSRF scaduto: stato noto, non e' un errore fatale
			bootstrapStatus.value = 'resolved'
		} else {
			bootstrapStatus.value = 'failed'
		}
	} finally {
		bootstrapReady.value = true
	}

	return { bootstrapReady, bootstrapStatus }
}

// ── SSR cookie check ──

export type SsrAuthCheck = {
	cookie: string
	authSnapshot: AuthUiSnapshot
	hasSessionCookie: boolean
	isAuthenticated: boolean
}

/**
 * Legge lo stato auth dai cookie nella request SSR.
 * Usato da admin.js e app-auth.ts per decidere se fare redirect
 * prima che il client abbia bootstrappato.
 */
export const readSsrAuthState = (): SsrAuthCheck => {
	const cookie = useRequestHeaders(['cookie'])?.cookie || ''
	const authSnapshot = readAuthUiSnapshotFromCookieHeader(cookie)
	const sessionCookie = hasAuthSessionCookie(cookie)

	return {
		cookie,
		authSnapshot,
		hasSessionCookie: sessionCookie,
		isAuthenticated: sessionCookie || authSnapshot.authenticated,
	}
}
