import {
	AUTH_UI_COOKIE,
	AUTH_UI_STORAGE,
	type AuthUiSnapshot,
	createEmptySnapshot,
	parseStoredSnapshot,
} from '~/utils/auth'

export default defineNuxtPlugin(() => {
	const authCookie = useCookie<AuthUiSnapshot | undefined>(AUTH_UI_COOKIE, {
		sameSite: 'lax',
		path: '/',
	})
	const initialSnapshot = useState<AuthUiSnapshot>('auth-ui-initial-snapshot', createEmptySnapshot)
	const storedSnapshot = useState<AuthUiSnapshot>('auth-ui-stored-snapshot', createEmptySnapshot)

	const cookieSnapshot = typeof authCookie.value === 'string'
		? parseStoredSnapshot(authCookie.value)
		: (authCookie.value || createEmptySnapshot())

	if (cookieSnapshot.authenticated) {
		initialSnapshot.value = cookieSnapshot
	}

	if (import.meta.client) {
		const rawStoredSnapshot = window.localStorage.getItem(AUTH_UI_STORAGE)
		let parsedStoredSnapshot: AuthUiSnapshot | null = null

		if (rawStoredSnapshot) {
			try {
				parsedStoredSnapshot = JSON.parse(rawStoredSnapshot)
			} catch {
				window.localStorage.removeItem(AUTH_UI_STORAGE)
			}
		}

		if (initialSnapshot.value.authenticated) {
			if (!cookieSnapshot.authenticated) {
				authCookie.value = initialSnapshot.value
			}
			storedSnapshot.value = initialSnapshot.value
			window.localStorage.setItem(AUTH_UI_STORAGE, JSON.stringify(initialSnapshot.value))
		} else if (parsedStoredSnapshot?.authenticated) {
			storedSnapshot.value = parsedStoredSnapshot
		} else {
			storedSnapshot.value = createEmptySnapshot()
			window.localStorage.removeItem(AUTH_UI_STORAGE)
		}
	}
})
