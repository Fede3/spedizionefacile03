import { readSsrAuthState, runAuthBootstrap } from '~/utils/authBootstrap';

const normalizeRequestedPath = (path: string) => (path !== '/' && path.endsWith('/') ? path.slice(0, -1) : path);

const buildAuthRedirectTarget = (requestedPath: string) =>
	requestedPath === '/' ? '/autenticazione' : { path: '/autenticazione', query: { redirect: requestedPath } };

export default defineNuxtRouteMiddleware(async (to) => {
	// SSR: controlla cookie di sessione — se manca, redirect immediato
	if (import.meta.server) {
		const { isAuthenticated } = readSsrAuthState();
		const requestedPath = normalizeRequestedPath(to.fullPath);

		if (!isAuthenticated) {
			return navigateTo(buildAuthRedirectTarget(requestedPath), { replace: true });
		}

		return;
	}

	const { isAuthenticated } = useSanctumAuth();
	await runAuthBootstrap();

	// Se autenticato → procedi normalmente
	if (isAuthenticated.value) {
		return;
	}

	// Se bootstrap fallisce o utente non autenticato → redirect al login
	const requestedPath = normalizeRequestedPath(to.fullPath);

	return navigateTo(buildAuthRedirectTarget(requestedPath), { replace: true });
});
