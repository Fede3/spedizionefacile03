import { runAuthBootstrap } from '~/utils/authBootstrap'

const getGuestRedirectTarget = (query: Record<string, unknown>) => {
	const redirectValue = Array.isArray(query.redirect) ? query.redirect[0] : query.redirect
	return typeof redirectValue === 'string' && redirectValue.startsWith('/') ? redirectValue : '/account'
}

export default defineNuxtRouteMiddleware(async (to) => {
	if (import.meta.server) {
		return
	}

	const { authCookie, clearSnapshot } = useAuthUiSnapshotPersistence()
	const { isAuthenticated } = useSanctumAuth()
	const hasAuthenticatedSnapshot = Boolean(authCookie.value?.authenticated)

	await runAuthBootstrap({
		force: true,
		skipIfNoSnapshot: true,
		hasAuthenticatedSnapshot,
	})

	// Se la snapshot era stantia (401/419), pulisci il cookie
	if (hasAuthenticatedSnapshot && !isAuthenticated.value) {
		clearSnapshot()
	}

	if (isAuthenticated.value) {
		return navigateTo(getGuestRedirectTarget(to.query), { replace: true })
	}
})
