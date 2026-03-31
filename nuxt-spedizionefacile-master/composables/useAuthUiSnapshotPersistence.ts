import {
	AUTH_UI_COOKIE,
	AUTH_UI_STORAGE,
	type AuthUiSnapshot,
	type AuthUiUser,
	createEmptySnapshot,
	snapshotFromUser,
} from '~/utils/authUiState'

export const useAuthUiSnapshotPersistence = () => {
	const authCookie = useCookie<AuthUiSnapshot>(AUTH_UI_COOKIE, {
		default: createEmptySnapshot,
		sameSite: 'lax',
		path: '/',
	})
	const initialSnapshot = useState<AuthUiSnapshot>('auth-ui-initial-snapshot', createEmptySnapshot)
	const storedSnapshot = useState<AuthUiSnapshot>('auth-ui-stored-snapshot', createEmptySnapshot)

	const persistSnapshot = (snapshot: AuthUiSnapshot) => {
		authCookie.value = snapshot
		initialSnapshot.value = snapshot
		storedSnapshot.value = snapshot
		if (import.meta.client) {
			window.localStorage.setItem(AUTH_UI_STORAGE, JSON.stringify(snapshot))
		}
	}

	const persistSnapshotFromUser = (user: AuthUiUser | null | undefined) => {
		if (!user) {
			return
		}

		persistSnapshot(snapshotFromUser(user))
	}

	const clearSnapshot = () => {
		const snapshot = createEmptySnapshot()
		authCookie.value = snapshot
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
