import type { Ref } from 'vue';

export type AuthUiSnapshot = {
    authenticated: boolean;
    name: string;
    surname: string;
    email: string;
    createdAt: string;
    userType: string;
    role: string | null;
};

type AuthUiUser = {
    name?: string | null;
    surname?: string | null;
    email?: string | null;
    created_at?: string | null;
    user_type?: string | null;
    role?: string | null;
};

type AuthBootstrapStatus = 'idle' | 'pending' | 'resolved' | 'failed';
type AuthOverlayTab = 'login' | 'register';
type AuthBootstrapResult = {
    bootstrapReady: Ref<boolean>;
    bootstrapStatus: Ref<AuthBootstrapStatus>;
};
type AuthOverlayLocation = { path: string; query: Record<string, string> };
type LegacyAuthRouteLike = { query?: Record<string, unknown> } | null | undefined;
type LegacyAuthRedirectOptions = {
    defaultTab?: AuthOverlayTab;
    allowRequestedMode?: boolean;
    allowRequestedTab?: boolean;
    forceForgot?: boolean;
    fallbackPath?: string;
};
type AuthBootstrapOptions = {
    force?: boolean;
    skipIfNoSnapshot?: boolean;
    hasAuthenticatedSnapshot?: boolean;
};
type AuthErrorLike = {
    status?: number | string;
    response?: { status?: number | string };
};
type SsrAuthCheck = {
    cookie: string;
    authSnapshot: AuthUiSnapshot;
    hasSessionCookie: boolean;
    isAuthenticated: boolean;
};
type SsrAuthValidation = {
    checked: boolean;
    authenticated: boolean;
    user: AuthUiUser | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

// === utils/auth.js — Helper autenticazione consolidati ===
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
export const AUTH_UI_COOKIE = 'sf_auth_ui';
export const AUTH_UI_STORAGE = 'sf_auth_ui_cache';
/**
 * Crea uno snapshot auth vuoto (utente non autenticato).
 */
export const createEmptySnapshot = (): AuthUiSnapshot => ({
    authenticated: false,
    name: '',
    surname: '',
    email: '',
    createdAt: '',
    userType: '',
    role: null,
});
/**
 * Costruisce uno snapshot a partire dai campi di un utente autenticato.
 */
export const snapshotFromUser = (user: AuthUiUser): AuthUiSnapshot => ({
    authenticated: true,
    name: String(user.name || ''),
    surname: String(user.surname || ''),
    email: String(user.email || ''),
    createdAt: String(user.created_at || ''),
    userType: String(user.user_type || ''),
    role: user.role || null,
});
/**
 * Parsa uno snapshot salvato (JSON string) restituendo sempre un oggetto valido.
 */
export const parseStoredSnapshot = (value: string | null | undefined): AuthUiSnapshot => {
    if (!value) {
        return createEmptySnapshot();
    }
    try {
        const parsed: unknown = JSON.parse(value);
        if (!isRecord(parsed) || !parsed.authenticated) {
            return createEmptySnapshot();
        }
        return {
            authenticated: true,
            name: String(parsed.name || ''),
            surname: String(parsed.surname || ''),
            email: String(parsed.email || ''),
            createdAt: String(parsed.createdAt || ''),
            userType: String(parsed.userType || ''),
            role: typeof parsed.role === 'string' ? parsed.role : null,
        };
    }
    catch {
        return createEmptySnapshot();
    }
};
/**
 * Estrae il valore di un cookie dalla stringa Cookie header (ritorna null se assente).
 */
export const extractCookieValue = (cookieHeader: string, name: string): string | null => {
    const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match?.[1] ? decodeURIComponent(match[1]) : null;
};
/**
 * Indica se nella Cookie header è presente almeno un cookie di sessione (_session).
 */
export const hasAuthSessionCookie = (cookieHeader: string): boolean =>
	cookieHeader
		.split(';')
		.some((cookie) => {
			const name = String(cookie || '').trim().split('=')[0] || '';
			return name === 'XSRF-TOKEN' || name.endsWith('_session');
		});
/**
 * Legge lo snapshot auth dai cookie presenti nella Cookie header.
 */
export const readAuthUiSnapshotFromCookieHeader = (cookieHeader: string): AuthUiSnapshot => parseStoredSnapshot(extractCookieValue(cookieHeader, AUTH_UI_COOKIE));
/**
 * Type-guard: true se il valore è uno snapshot autenticato.
 */
export const isAuthenticatedSnapshotValue = (value: unknown): value is AuthUiSnapshot =>
    Boolean(isRecord(value) && value.authenticated);
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
    if (!redirect || typeof redirect !== 'string')
        return fallback;
    if (redirect.startsWith('/') && !redirect.startsWith('//')) {
        const normalized = redirect !== '/' && redirect.endsWith('/') ? redirect.slice(0, -1) : redirect;
        const blockedPrefixes = [
            '/autenticazione',
            '/login',
            '/registrazione',
            '/recupera-password',
            '/aggiorna-password',
            '/verifica-email',
        ];
        if (blockedPrefixes.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
            return fallback;
        }
        return normalized;
    }
    return fallback;
};
// ── Social auth error messages ──
/** @type {Record<string, string>} */
const SOCIAL_ERROR_MAP: Record<string, string> = {
    google_email_missing: "Il tuo account Google non ha un\u2019email disponibile. Usa un altro account oppure registrati con email.",
    facebook_email_missing: "Il tuo account Facebook non ha un\u2019email disponibile. Usa un altro account oppure registrati con email.",
    apple_email_missing: "Il tuo account Apple non ha un\u2019email disponibile. Usa un altro account oppure registrati con email.",
    google_unavailable: 'Accesso con Google temporaneamente non disponibile. Completiamo prima la configurazione del provider.',
    facebook_unavailable: 'Accesso con Facebook temporaneamente non disponibile. Completiamo prima la configurazione del provider.',
    apple_unavailable: 'Accesso con Apple temporaneamente non disponibile. Completiamo prima la configurazione del provider.',
};
/**
 * Traduce un codice errore social auth in un messaggio leggibile per l'utente.
 */
export const humanizeSocialAuthError = (rawError: string): string => {
    if (SOCIAL_ERROR_MAP[rawError])
        return SOCIAL_ERROR_MAP[rawError];
    if (rawError.startsWith('facebook_'))
        return "Errore durante l\u2019accesso con Facebook. Riprova.";
    if (rawError.startsWith('google_'))
        return "Errore durante l\u2019accesso con Google. Riprova.";
    if (rawError.startsWith('apple_'))
        return "Errore durante l\u2019accesso con Apple. Riprova.";
    return "Errore durante l\u2019accesso social. Riprova.";
};
// ─────────────────────────────────────────────────────────────────
// SEZIONE 3 — ex utils/authRouting.ts
// ─────────────────────────────────────────────────────────────────
/**
 * Indica se path coincide con prefix o ne è una sotto-route.
 */
const isSameOrNestedPath = (path: string, prefix: string): boolean => path === prefix || path.startsWith(`${prefix}/`);
/**
 * Normalizza un valore di query route: se è array prende il primo elemento.
 * @template T
 */
export const getRouteQueryValue = <T>(value: T | T[] | undefined | null): T | undefined => Array.isArray(value) ? value[0] : value ?? undefined;
/**
 * Normalizza il valore del tab dell'overlay auth (default login).
 */
export const normalizeAuthTab = (value: unknown): AuthOverlayTab => value === 'register' || value === 'registrati' ? 'register' : 'login';
/**
 * Normalizza il path richiesto dall'utente post-auth applicando sanitize + trim slash.
 */
export const normalizeRequestedPath = (path?: string | null, fallback = '/'): string => {
    const sanitized = sanitizeAuthRedirect(path, fallback);
    return sanitized !== '/' && sanitized.endsWith('/') ? sanitized.slice(0, -1) : sanitized;
};
/**
 * Restituisce la pagina su cui montare l'overlay auth in base al path richiesto.
 */
export const resolveAuthOverlayHost = (requestedPath: string): string => {
    if (isSameOrNestedPath(requestedPath, '/checkout'))
        return '/carrello';
    if (isSameOrNestedPath(requestedPath, '/account'))
        return '/';
    return requestedPath;
};
/**
 * Costruisce una location Nuxt { path, query } per aprire il modale auth nel punto corretto.
 */
export const buildAuthOverlayLocation = ({
    forgot = false,
    requestedPath,
    tab = 'login',
}: {
    forgot?: boolean;
    requestedPath?: string | null;
    tab?: AuthOverlayTab;
}): AuthOverlayLocation => {
    const redirect = normalizeRequestedPath(requestedPath, '/');
    const path = resolveAuthOverlayHost(redirect);
    return {
        path,
        query: {
            ...(forgot ? { auth_forgot: '1' } : {}),
            auth_modal: tab,
            redirect,
        },
    };
};
/**
 * Costruisce un redirect dal vecchio flusso auth standalone al modale overlay attuale.
 */
export const buildLegacyAuthOverlayRedirect = (
    routeLike: LegacyAuthRouteLike,
    { defaultTab = 'login', allowRequestedMode = false, allowRequestedTab = false, forceForgot = false, fallbackPath = '/' }: LegacyAuthRedirectOptions = {},
): AuthOverlayLocation => {
    const query = routeLike?.query || {};
    const requestedRedirect = getRouteQueryValue(query.redirect);
    const requestedMode = getRouteQueryValue(query.mode);
    const requestedTab = getRouteQueryValue(query.tab);
    const targetTab = allowRequestedMode && requestedMode === 'register'
        ? 'register'
        : allowRequestedTab
            ? normalizeAuthTab(requestedTab)
            : defaultTab;
    return buildAuthOverlayLocation({
        forgot: forceForgot || (allowRequestedMode && requestedMode === 'forgot'),
        requestedPath: normalizeRequestedPath(typeof requestedRedirect === 'string' ? requestedRedirect : null, fallbackPath),
        tab: targetTab,
    });
};
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
// ── Stato condiviso ──
/**
 * Accede allo stato globale (useState) del bootstrap auth.
 * Tutti i consumatori usano le stesse chiavi, garantendo coerenza.
 */
export const useAuthBootstrapState = (): AuthBootstrapResult => {
    const bootstrapReady = useState<boolean>('auth-bootstrap-ready', () => false);
    const bootstrapStatus = useState<AuthBootstrapStatus>('auth-bootstrap-status', () => 'idle');
    return { bootstrapReady, bootstrapStatus };
};
// ── Client-side bootstrap ──
/**
 * Esegue il bootstrap auth client-side: chiama init() e gestisce gli errori.
 *
 * Opzioni:
 *   - force: esegue anche se il bootstrap risulta già risolto (default: false)
 *   - skipIfNoSnapshot: salta init() se non c'è una snapshot auth (guest-auth pattern)
 *
 * Restituisce il risultato dello stato bootstrap dopo l'esecuzione.
 *
 */
export const runAuthBootstrap = async (options: AuthBootstrapOptions = {}): Promise<AuthBootstrapResult> => {
    const { bootstrapReady, bootstrapStatus } = useAuthBootstrapState();
    const { init } = useSanctumAuth();
    const alreadyResolved = bootstrapReady.value && bootstrapStatus.value === 'resolved';
    if (alreadyResolved && !options.force) {
        return { bootstrapReady, bootstrapStatus };
    }
    // guest-auth: evita /api/user se non esiste traccia di sessione autenticata
    if (options.skipIfNoSnapshot && !options.hasAuthenticatedSnapshot) {
        bootstrapStatus.value = 'resolved';
        bootstrapReady.value = true;
        return { bootstrapReady, bootstrapStatus };
    }
    bootstrapReady.value = false;
    bootstrapStatus.value = 'pending';
    try {
        await init();
        bootstrapStatus.value = 'resolved';
    }
    catch (error) {
        const err = error as AuthErrorLike;
        const status = Number(err?.status ?? err?.response?.status ?? 0);
        if ([401, 419].includes(status)) {
            // Non autenticato o CSRF scaduto: stato noto, non è un errore fatale
            bootstrapStatus.value = 'resolved';
        }
        else {
            bootstrapStatus.value = 'failed';
        }
    }
    finally {
        bootstrapReady.value = true;
    }
    return { bootstrapReady, bootstrapStatus };
};
// ── SSR cookie check ──
/**
 * Legge lo stato auth dai cookie nella request SSR.
 * Usato da admin.js e app-auth.js per decidere se fare redirect
 * prima che il client abbia bootstrappato.
 */
export const readSsrAuthState = (): SsrAuthCheck => {
    const cookie = useRequestHeaders(['cookie'])?.cookie || '';
    const authSnapshot = readAuthUiSnapshotFromCookieHeader(cookie);
    const sessionCookie = hasAuthSessionCookie(cookie);
    return {
        cookie,
        authSnapshot,
        hasSessionCookie: sessionCookie,
        // In SSR consideriamo valida l'auth solo se coesistono
        // una sessione server e una snapshot UI autenticata.
        // Evita falsi positivi con cookie di sessione stantii.
        isAuthenticated: Boolean(sessionCookie && authSnapshot.authenticated),
    };
};
/**
 * Valida la sessione SSR chiamando /api/user con i cookie propagati.
 * Il risultato viene memoizzato in useState('auth-ssr-validation').
 */
export const validateSsrAuthSession = async (): Promise<SsrAuthValidation> => {
    const validationState = useState<SsrAuthValidation>('auth-ssr-validation', () => ({
        checked: false,
        authenticated: false,
        user: null,
    }));
    if (validationState.value.checked) {
        return validationState.value;
    }
    if (import.meta.client) {
        validationState.value = {
            checked: true,
            authenticated: false,
            user: null,
        };
        return validationState.value;
    }
    const { cookie, hasSessionCookie } = readSsrAuthState();
    if (!hasSessionCookie) {
        validationState.value = {
            checked: true,
            authenticated: false,
            user: null,
        };
        return validationState.value;
    }
    const requestFetch = useRequestFetch();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    try {
        const user = await requestFetch<AuthUiUser>('/api/user', {
            method: 'GET',
            headers: {
                accept: 'application/json',
                cookie,
                'x-requested-with': 'XMLHttpRequest',
            },
            signal: controller.signal,
        });
        validationState.value = {
            checked: true,
            authenticated: Boolean(user),
            user: user || null,
        };
    }
    catch {
        validationState.value = {
            checked: true,
            authenticated: false,
            user: null,
        };
    }
    finally {
        clearTimeout(timeout);
    }
    return validationState.value;
};
// ─────────────────────────────────────────────────────────────────
// SEZIONE 5 — ex utils/postAuthSync.ts
// ─────────────────────────────────────────────────────────────────
const POST_AUTH_RETRY_DELAYS = [0, 180, 420, 900];
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/**
 * Riprova a chiamare refreshIdentity con backoff per far assestare i cookie post-login.
 */
export const waitForPostAuthSync = async (refreshIdentity: () => Promise<unknown>): Promise<boolean> => {
    for (const delay of POST_AUTH_RETRY_DELAYS) {
        if (delay > 0) {
            await wait(delay);
        }
        try {
            await refreshIdentity();
            return true;
        }
        catch {
            // Dopo login/registrazione i cookie possono assestarsi con un leggero ritardo.
        }
    }
    return false;
};
