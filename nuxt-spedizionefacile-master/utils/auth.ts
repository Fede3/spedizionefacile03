// === utils/auth.ts — Helper autenticazione consolidati ===
// Consolidamento di:
//   - utils/authUiState.ts     (snapshot, cookie, extract/parse)
//   - utils/authHelpers.ts     (sanitizeAuthRedirect, humanizeSocialAuthError)
//   - utils/authRouting.ts     (buildAuthOverlayLocation, normalizeAuthTab, ...)
//   - utils/authBootstrap.ts   (runAuthBootstrap, readSsrAuthState, validateSsrAuthSession)
//   - utils/postAuthSync.ts    (waitForPostAuthSync)
// Tutti gli export originali sono preservati identici.

// ─────────────────────────────────────────────────────────────────
// SEZIONE 1 — ex utils/authUiState.ts
// ─────────────────────────────────────────────────────────────────

export type AuthUiSnapshot = {
	authenticated: boolean;
	name: string;
	surname: string;
	email: string;
	createdAt: string;
	userType: string;
	role: string | null;
};

export type AuthUiUser = {
	name?: string | null;
	surname?: string | null;
	email?: string | null;
	created_at?: string | null;
	user_type?: string | null;
	role?: string | null;
};

export type AuthBootstrapStatus = 'idle' | 'pending' | 'resolved' | 'failed';

export const AUTH_UI_COOKIE = 'sf_auth_ui';
export const AUTH_UI_STORAGE = 'sf_auth_ui_cache';

export const createEmptySnapshot = (): AuthUiSnapshot => ({
	authenticated: false,
	name: '',
	surname: '',
	email: '',
	createdAt: '',
	userType: '',
	role: null,
});

export const snapshotFromUser = (user: AuthUiUser): AuthUiSnapshot => ({
	authenticated: true,
	name: String(user.name || ''),
	surname: String(user.surname || ''),
	email: String(user.email || ''),
	createdAt: String(user.created_at || ''),
	userType: String(user.user_type || ''),
	role: user.role || null,
});

export const parseStoredSnapshot = (value: string | null): AuthUiSnapshot => {
	if (!value) {
		return createEmptySnapshot();
	}

	try {
		const parsed = JSON.parse(value) as Partial<AuthUiSnapshot>;
		if (!parsed.authenticated) {
			return createEmptySnapshot();
		}

		return {
			authenticated: true,
			name: String(parsed.name || ''),
			surname: String(parsed.surname || ''),
			email: String(parsed.email || ''),
			createdAt: String(parsed.createdAt || ''),
			userType: String(parsed.userType || ''),
			role: parsed.role || null,
		};
	} catch {
		return createEmptySnapshot();
	}
};

export const extractCookieValue = (cookieHeader: string, name: string): string | null => {
	const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
	return match?.[1] ? decodeURIComponent(match[1]) : null;
};

export const hasAuthSessionCookie = (cookieHeader: string): boolean =>
	/(?:^|;\s*)(?:[^=;]+_session)=/.test(cookieHeader);

export const readAuthUiSnapshotFromCookieHeader = (cookieHeader: string): AuthUiSnapshot =>
	parseStoredSnapshot(extractCookieValue(cookieHeader, AUTH_UI_COOKIE));

export const isAuthenticatedSnapshotValue = (value: unknown): value is AuthUiSnapshot =>
	Boolean(
		value
		&& typeof value === 'object'
		&& (value as Partial<AuthUiSnapshot>).authenticated,
	);

// ─────────────────────────────────────────────────────────────────
// SEZIONE 2 — ex utils/authHelpers.ts
// ─────────────────────────────────────────────────────────────────

/**
 * Helper condivisi per la logica di autenticazione.
 *
 * Funzioni usate da useAuthOverlay (modale auth inline) e dalle pagine di auth
 * standalone (aggiorna-password, verifica-email). Centralizzate qui per evitare drift.
 *
 * NOTA: il vecchio composable useAutenticazione.js (pagina standalone /autenticazione)
 * e' stato archiviato il 2026-04-20 insieme alle pagine legacy, che ora redirezionano
 * tutte al modale overlay via buildLegacyAuthOverlayRedirect().
 */

// ── Redirect sanitization ──

/**
 * Valida e normalizza un path di redirect post-auth.
 * Previene open redirect rifiutando path non relativi.
 */
export const sanitizeAuthRedirect = (redirect?: string | null, fallback = '/account'): string => {
	if (!redirect || typeof redirect !== 'string') return fallback
	if (redirect.startsWith('/') && !redirect.startsWith('//')) {
		const normalized = redirect !== '/' && redirect.endsWith('/') ? redirect.slice(0, -1) : redirect
		const blockedPrefixes = [
			'/autenticazione',
			'/login',
			'/registrazione',
			'/recupera-password',
			'/aggiorna-password',
			'/verifica-email',
		]

		if (blockedPrefixes.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
			return fallback
		}

		return normalized
	}
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

// ─────────────────────────────────────────────────────────────────
// SEZIONE 3 — ex utils/authRouting.ts
// ─────────────────────────────────────────────────────────────────

export type AuthOverlayTab = 'login' | 'register'

const isSameOrNestedPath = (path: string, prefix: string) =>
  path === prefix || path.startsWith(`${prefix}/`)

export const getRouteQueryValue = <T>(value: T | T[] | undefined | null): T | undefined =>
  Array.isArray(value) ? value[0] : value ?? undefined

export const normalizeAuthTab = (value: unknown): AuthOverlayTab =>
  value === 'register' || value === 'registrati' ? 'register' : 'login'

export const normalizeRequestedPath = (path?: string | null, fallback = '/') => {
  const sanitized = sanitizeAuthRedirect(path, fallback)
  return sanitized !== '/' && sanitized.endsWith('/') ? sanitized.slice(0, -1) : sanitized
}

export const resolveAuthOverlayHost = (requestedPath: string) => {
  if (isSameOrNestedPath(requestedPath, '/checkout')) return '/carrello'
  if (isSameOrNestedPath(requestedPath, '/account')) return '/'
  return requestedPath
}

export const buildAuthOverlayLocation = ({
  forgot = false,
  requestedPath,
  tab = 'login',
}: {
  forgot?: boolean
  requestedPath?: string | null
  tab?: AuthOverlayTab
}) => {
  const redirect = normalizeRequestedPath(requestedPath, '/')
  const path = resolveAuthOverlayHost(redirect)

  return {
    path,
    query: {
      ...(forgot ? { auth_forgot: '1' } : {}),
      auth_modal: tab,
      redirect,
    },
  }
}

export const buildLegacyAuthOverlayRedirect = (
  routeLike: { query?: Record<string, unknown> } | null | undefined,
  {
    defaultTab = 'login',
    allowRequestedMode = false,
    allowRequestedTab = false,
    forceForgot = false,
    fallbackPath = '/',
  }: {
    defaultTab?: AuthOverlayTab
    allowRequestedMode?: boolean
    allowRequestedTab?: boolean
    forceForgot?: boolean
    fallbackPath?: string
  } = {},
) => {
  const query = routeLike?.query || {}
  const requestedRedirect = getRouteQueryValue(query.redirect as string | string[] | undefined)
  const requestedMode = getRouteQueryValue(query.mode as string | string[] | undefined)
  const requestedTab = getRouteQueryValue(query.tab as string | string[] | undefined)

  const targetTab = allowRequestedMode && requestedMode === 'register'
    ? 'register'
    : allowRequestedTab
      ? normalizeAuthTab(requestedTab)
      : defaultTab

  return buildAuthOverlayLocation({
    forgot: forceForgot || (allowRequestedMode && requestedMode === 'forgot'),
    requestedPath: normalizeRequestedPath(requestedRedirect, fallbackPath),
    tab: targetTab,
  })
}

// ─────────────────────────────────────────────────────────────────
// SEZIONE 4 — ex utils/authBootstrap.ts
// ─────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────
// SEZIONE 5 — ex utils/postAuthSync.ts
// ─────────────────────────────────────────────────────────────────

const POST_AUTH_RETRY_DELAYS = [0, 180, 420, 900]

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const waitForPostAuthSync = async (
	refreshIdentity: () => Promise<unknown>,
) => {
	for (const delay of POST_AUTH_RETRY_DELAYS) {
		if (delay > 0) {
			await wait(delay)
		}

		try {
			await refreshIdentity()
			return true
		} catch {
			// Dopo login/registrazione i cookie possono assestarsi con un leggero ritardo.
		}
	}

	return false
}
