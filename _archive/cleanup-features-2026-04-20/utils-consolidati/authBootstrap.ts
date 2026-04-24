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
 *   - force: esegue anche se il bootstrap risulta già risolto (default: false)
 *   - skipIfNoSnapshot: salta init() se non c'è una snapshot auth (guest-auth pattern)
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
			// Non autenticato o CSRF scaduto: stato noto, non è un errore fatale
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

export type SsrAuthValidation = {
	checked: boolean
	authenticated: boolean
	user: AuthUiUser | null
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
		// In SSR consideriamo valida l'auth solo se coesistono
		// una sessione server e una snapshot UI autenticata.
		// Evita falsi positivi con cookie di sessione stantii.
		isAuthenticated: Boolean(sessionCookie && authSnapshot.authenticated),
	}
}

export const validateSsrAuthSession = async (): Promise<SsrAuthValidation> => {
	const validationState = useState<SsrAuthValidation>('auth-ssr-validation', () => ({
		checked: false,
		authenticated: false,
		user: null,
	}))

	if (validationState.value.checked) {
		return validationState.value
	}

	if (import.meta.client) {
		validationState.value = {
			checked: true,
			authenticated: false,
			user: null,
		}
		return validationState.value
	}

	const { cookie, hasSessionCookie } = readSsrAuthState()

	if (!hasSessionCookie) {
		validationState.value = {
			checked: true,
			authenticated: false,
			user: null,
		}
		return validationState.value
	}

	const requestFetch = useRequestFetch()
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), 1800)

	try {
		const user = await requestFetch<AuthUiUser>('/api/user', {
			method: 'GET',
			headers: {
				accept: 'application/json',
				cookie,
				'x-requested-with': 'XMLHttpRequest',
			},
			signal: controller.signal,
		})

		validationState.value = {
			checked: true,
			authenticated: Boolean(user),
			user: user || null,
		}
	} catch {
		validationState.value = {
			checked: true,
			authenticated: false,
			user: null,
		}
	} finally {
		clearTimeout(timeout)
	}

	return validationState.value
}
