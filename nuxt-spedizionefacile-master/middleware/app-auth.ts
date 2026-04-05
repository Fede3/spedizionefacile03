import { hasAuthSessionCookie, readAuthUiSnapshotFromCookieHeader } from '~/utils/authUiState';

const normalizeRequestedPath = (path: string) => (path !== '/' && path.endsWith('/') ? path.slice(0, -1) : path);

const buildAuthRedirectTarget = (requestedPath: string) =>
	requestedPath === '/' ? '/autenticazione' : { path: '/autenticazione', query: { redirect: requestedPath } };

export default defineNuxtRouteMiddleware(async (to) => {
	// SSR: controlla cookie di sessione — se manca, redirect immediato
	if (import.meta.server) {
		const cookie = useRequestHeaders(['cookie'])?.cookie || '';
		const requestedPath = normalizeRequestedPath(to.fullPath);
		const authSnapshot = readAuthUiSnapshotFromCookieHeader(cookie);

		if (!hasAuthSessionCookie(cookie) && !authSnapshot.authenticated) {
			return navigateTo(buildAuthRedirectTarget(requestedPath), { replace: true });
		}

		return;
	}

	const { init, isAuthenticated } = useSanctumAuth();
	const bootstrapReady = useState('auth-bootstrap-ready', () => false);
	const bootstrapStatus = useState<'idle' | 'pending' | 'resolved' | 'failed'>('auth-bootstrap-status', () => 'idle');

	if (!(bootstrapReady.value && bootstrapStatus.value === 'resolved')) {
		bootstrapReady.value = false;
		bootstrapStatus.value = 'pending';

		try {
			await init();
			bootstrapStatus.value = 'resolved';
		} catch (error) {
			const err = error as { status?: number; response?: { status?: number } };
			const status = Number(err?.status ?? err?.response?.status ?? 0);

			if ([401, 419].includes(status)) {
				bootstrapStatus.value = 'resolved';
			} else {
				bootstrapStatus.value = 'failed';
			}
		} finally {
			bootstrapReady.value = true;
		}
	}

	// Se autenticato → procedi normalmente
	if (isAuthenticated.value) {
		return;
	}

	// Se bootstrap fallisce o utente non autenticato → redirect al login
	const requestedPath = normalizeRequestedPath(to.fullPath);

	return navigateTo(buildAuthRedirectTarget(requestedPath), { replace: true });
});
