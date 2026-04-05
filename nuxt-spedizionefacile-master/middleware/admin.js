import { hasAuthSessionCookie, readAuthUiSnapshotFromCookieHeader } from '~/utils/authUiState';

const buildAdminLoginRedirect = (fullPath) => ({
	path: '/autenticazione',
	query: { redirect: fullPath },
});

/**
 * MIDDLEWARE: admin (middleware/admin.js)
 * SCOPO: Protegge le pagine admin — solo utenti con ruolo "Admin" possono accedervi.
 *
 * DOVE SI USA: pages/account/amministrazione/*.vue (definePageMeta → middleware: ['admin'])
 * REDIRECT: se l'utente non e' admin → /account
 *
 * COME FUNZIONA:
 * I middleware sono "controlli automatici" eseguiti PRIMA di mostrare una pagina.
 * Questo controlla il campo user.role: se non e' "Admin", l'utente viene
 * reindirizzato alla pagina del suo account.
 *
 * VINCOLI: richiede che l'utente sia gia' autenticato (usare insieme a app-auth)
 * COLLEGAMENTI: laravel-spedizionefacile-main/app/Models/User.php (campo role)
 */
export default defineNuxtRouteMiddleware(async (to) => {
	// SSR: controlla cookie di sessione — se manca, redirect immediato
	if (import.meta.server) {
		const cookie = useRequestHeaders(['cookie'])?.cookie || '';
		const authSnapshot = readAuthUiSnapshotFromCookieHeader(cookie);

		if (!hasAuthSessionCookie(cookie) && !authSnapshot.authenticated) {
			return navigateTo(buildAdminLoginRedirect(to.fullPath), { replace: true });
		}

		if (authSnapshot.authenticated && authSnapshot.role && authSnapshot.role !== 'Admin') {
			return navigateTo('/account', { replace: true });
		}

		return;
	}

	const { init, user } = useSanctumAuth();
	const bootstrapReady = useState('auth-bootstrap-ready', () => false);
	const bootstrapStatus = useState('auth-bootstrap-status', () => 'idle');

	// Solo se app-auth non ha gia' risolto lo stato auth (evita doppia init)
	if (!(bootstrapReady.value && bootstrapStatus.value === 'resolved')) {
		bootstrapReady.value = false;
		bootstrapStatus.value = 'pending';

		try {
			await init();
			bootstrapStatus.value = 'resolved';
		} catch (error) {
			const err = /** @type {{ status?: number; response?: { status?: number } }} */ (error);
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

	// Se bootstrap fallisce o utente non autenticato → redirect al login
	if (bootstrapStatus.value === 'failed' || !user.value) {
		return navigateTo(buildAdminLoginRedirect(to.fullPath), { replace: true });
	}

	if (user.value.role !== 'Admin') {
		return navigateTo('/account');
	}
});
