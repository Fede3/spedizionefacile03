import {
	AUTH_UI_COOKIE,
	AUTH_UI_STORAGE,
	createEmptySnapshot,
	snapshotFromUser,
} from '~/utils/authUiState'

/**
 * @typedef {import('~/utils/authUiState').AuthUiSnapshot} AuthUiSnapshot
 * @typedef {import('~/utils/authUiState').AuthUiUser} AuthUiUser
 */

/** Persistenza snapshot auth UI su cookie + localStorage, con useState per reattività SSR-safe. */
export const useAuthUiSnapshotPersistence = () => {
	const authCookie = useCookie(AUTH_UI_COOKIE, {
		sameSite: 'lax',
		path: '/',
	})
	const initialSnapshot = useState('auth-ui-initial-snapshot', createEmptySnapshot)
	const storedSnapshot = useState('auth-ui-stored-snapshot', createEmptySnapshot)

	const persistSnapshot = (snapshot) => {
		authCookie.value = snapshot
		initialSnapshot.value = snapshot
		storedSnapshot.value = snapshot
		if (import.meta.client) {
			window.localStorage.setItem(AUTH_UI_STORAGE, JSON.stringify(snapshot))
		}
	}

	const persistSnapshotFromUser = (user) => {
		if (!user) {
			return
		}

		persistSnapshot(snapshotFromUser(user))
	}

	const clearSnapshot = () => {
		const snapshot = createEmptySnapshot()
		authCookie.value = undefined
		initialSnapshot.value = snapshot
		storedSnapshot.value = snapshot
		if (import.meta.client) {
			window.localStorage.removeItem(AUTH_UI_STORAGE)
		}
	}

	return {
		authCookie,
		clearSnapshot,
		initialSnapshot,
		persistSnapshot,
		persistSnapshotFromUser,
		storedSnapshot,
	}
}
