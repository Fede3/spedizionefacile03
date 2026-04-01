import {
	AUTH_UI_COOKIE,
	AUTH_UI_STORAGE,
	type AuthUiSnapshot,
	createEmptySnapshot,
} from '~/utils/authUiState'

export default defineNuxtPlugin(() => {
	const authCookie = useCookie<AuthUiSnapshot | undefined>(AUTH_UI_COOKIE, {
		sameSite: 'lax',
		path: '/',
	})
	const initialSnapshot = useState<AuthUiSnapshot>('auth-ui-initial-snapshot', createEmptySnapshot)
	const storedSnapshot = useState<AuthUiSnapshot>('auth-ui-stored-snapshot', createEmptySnapshot)

	if (authCookie.value?.authenticated) {
		initialSnapshot.value = authCookie.value
	}

	if (import.meta.client) {
		storedSnapshot.value = createEmptySnapshot()

		// Keep client-side storage aligned with the SSR snapshot so hydration
		// does not briefly fall back to a guest UI on fresh tabs/reloads.
		if (initialSnapshot.value.authenticated) {
			if (!authCookie.value?.authenticated) {
				authCookie.value = initialSnapshot.value
			}
			storedSnapshot.value = initialSnapshot.value
			window.localStorage.setItem(AUTH_UI_STORAGE, JSON.stringify(initialSnapshot.value))
		} else {
			window.localStorage.removeItem(AUTH_UI_STORAGE)
		}

		// Non promuoviamo piu' il localStorage a "verita'" iniziale:
		// lato SSR quel dato non esiste e genera il classico flip guest -> logged
		// durante hydration. Lo snapshot iniziale deve arrivare solo da cookie.
	}
})
