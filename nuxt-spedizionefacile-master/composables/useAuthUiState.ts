import {
	type AuthUiUser,
	createEmptySnapshot,
	snapshotFromUser,
} from '~/utils/authUiState'
import { useAuthBootstrapState } from '~/utils/authBootstrap'
import { useAuthUiSnapshotPersistence } from '~/composables/useAuthUiSnapshotPersistence'

export const useAuthUiState = () => {
	const { bootstrapReady, bootstrapStatus } = useAuthBootstrapState()
	const { authCookie, clearSnapshot, initialSnapshot, persistSnapshotFromUser } =
		useAuthUiSnapshotPersistence()
	const route = useRoute()
	const liveAuthPrefixes = ['/account', '/la-tua-spedizione', '/riepilogo', '/checkout', '/carrello']
	const guestOnlyPrefixes = ['/autenticazione', '/login', '/registrazione', '/recupera-password', '/aggiorna-password']
	const hasAuthenticatedSnapshot = computed(() => Boolean(authCookie.value?.authenticated))
	const shouldAttachLiveAuth = computed(() => {
		if (!import.meta.client) return false
		if (guestOnlyPrefixes.some((prefix) => route.path.startsWith(prefix))) return false
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
			() => [shouldAttachLiveAuth.value, hasAuthenticatedSnapshot.value, Boolean(auth.value?.isAuthenticated?.value)],
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
			[liveAuthenticated, liveUser, bootstrapReady, bootstrapStatus, liveAuthInitPending],
			([authenticated, user, ready, status, initPending]) => {
				if (authenticated && user) {
					persistSnapshotFromUser(user)
					return
				}

				if (!auth.value || initPending) {
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

		// Su pagine pubbliche non agganciamo live auth per evitare fetch inutili,
		// ma dopo un login da modale il cookie SSR-safe deve aggiornare subito navbar e CTA.
		if (authCookie.value?.authenticated) {
			return authCookie.value
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
