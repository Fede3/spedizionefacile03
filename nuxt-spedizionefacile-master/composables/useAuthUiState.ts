import {
	type AuthBootstrapStatus,
	type AuthUiUser,
	createEmptySnapshot,
	snapshotFromUser,
} from '~/utils/authUiState'
import { useAuthUiSnapshotPersistence } from '~/composables/useAuthUiSnapshotPersistence'

export const useAuthUiState = () => {
	const bootstrapReady = useState('auth-bootstrap-ready', () => false)
	const bootstrapStatus = useState<AuthBootstrapStatus>('auth-bootstrap-status', () => 'idle')
	const { authCookie, clearSnapshot, initialSnapshot, persistSnapshotFromUser } =
		useAuthUiSnapshotPersistence()
	const route = useRoute()
	const liveAuthPrefixes = ['/account', '/carrello']
	const shouldAttachLiveAuth = computed(() => {
		if (!import.meta.client) return false
		if (authCookie.value?.authenticated) return true
		return liveAuthPrefixes.some((prefix) => route.path.startsWith(prefix))
	})
	const auth = shallowRef<any>(null)
	const liveAuthInitPending = ref(false)

	if (import.meta.client) {
		watchEffect(() => {
			if (!auth.value && shouldAttachLiveAuth.value) {
				auth.value = useSanctumAuth()
			}
		})

		watch(
			() => [shouldAttachLiveAuth.value, Boolean(authCookie.value?.authenticated), Boolean(auth.value?.isAuthenticated?.value)],
			async ([shouldAttach, hasAuthenticatedSnapshot, alreadyAuthenticated]) => {
				if (!shouldAttach || !hasAuthenticatedSnapshot || alreadyAuthenticated || !auth.value || liveAuthInitPending.value) {
					return
				}

				liveAuthInitPending.value = true
				try {
					await auth.value.init?.()
				} catch {
					// Se il cookie snapshot e' stantio lasciamo il composable degradare sulla snapshot stessa.
				} finally {
					liveAuthInitPending.value = false
				}
			},
			{ immediate: true },
		)
	}

	const liveAuthenticated = computed(() => Boolean(auth.value?.isAuthenticated?.value))
	const liveUser = computed<AuthUiUser | null>(() => {
		const user = auth.value?.user?.value as AuthUiUser | null | undefined
		return user ?? null
	})

	if (import.meta.client) {
		watch(
			[liveAuthenticated, liveUser, bootstrapReady, bootstrapStatus],
			([authenticated, user, ready, status]) => {
				if (authenticated && user) {
					persistSnapshotFromUser(user)
					return
				}

				if (ready && status === 'resolved') {
					clearSnapshot()
				}
			},
			{ immediate: true },
		)
	}

	const uiSnapshot = computed(() => {
		if (liveAuthenticated.value && liveUser.value) {
			return snapshotFromUser(liveUser.value)
		}

		if (bootstrapStatus.value !== 'resolved') {
			if (initialSnapshot.value.authenticated) {
				return initialSnapshot.value
			}
		}

		return createEmptySnapshot()
	})

	const isAuthenticatedForUi = computed(() => uiSnapshot.value.authenticated)
	const accountLabel = computed(() => {
		if (!uiSnapshot.value.authenticated) return 'Accedi'
		if (uiSnapshot.value.role === 'Admin') return 'Area Admin'
		return uiSnapshot.value.name ? `Ciao ${uiSnapshot.value.name}` : 'Il mio account'
	})
	const mobileAccountLabel = computed(() => {
		if (!uiSnapshot.value.authenticated) return 'Accedi o Registrati'
		if (uiSnapshot.value.role === 'Admin') return 'Area Admin'
		return 'Il mio account'
	})

	return {
		accountLabel,
		bootstrapReady,
		bootstrapStatus,
		isAuthenticatedForUi,
		liveAuthenticated,
		liveUser,
		mobileAccountLabel,
		uiSnapshot,
	}
}
