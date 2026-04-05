const getGuestRedirectTarget = (query: Record<string, unknown>) => {
	const redirectValue = Array.isArray(query.redirect) ? query.redirect[0] : query.redirect
	return typeof redirectValue === 'string' && redirectValue.startsWith('/') ? redirectValue : '/account'
}

export default defineNuxtRouteMiddleware(async (to) => {
	if (import.meta.server) {
		return
	}

	const { authCookie, clearSnapshot } = useAuthUiSnapshotPersistence()
	const { init, isAuthenticated } = useSanctumAuth()
	const bootstrapReady = useState('auth-bootstrap-ready', () => false)
	const bootstrapStatus = useState<'idle' | 'pending' | 'resolved' | 'failed'>('auth-bootstrap-status', () => 'idle')
	const hasAuthenticatedSnapshot = Boolean(authCookie.value?.authenticated)
	let shouldRedirect = false

	bootstrapReady.value = false
	bootstrapStatus.value = 'pending'

	try {
		// Sulle route guest evitiamo /api/user inutili se non esiste alcuna
		// traccia di sessione autenticata nella UI snapshot SSR-safe.
		if (hasAuthenticatedSnapshot) {
			await init()
		}
		shouldRedirect = Boolean(isAuthenticated.value)
		bootstrapStatus.value = 'resolved'
	} catch (error) {
		const err = error as { status?: number; response?: { status?: number } }
		const status = Number(err?.status ?? err?.response?.status ?? 0)
		if ([401, 419].includes(status)) {
			clearSnapshot()
		}
		bootstrapStatus.value = [401, 419].includes(status) ? 'resolved' : 'failed'
	} finally {
		bootstrapReady.value = true
	}

	if (shouldRedirect) {
		return navigateTo(getGuestRedirectTarget(to.query), { replace: true })
	}
})
