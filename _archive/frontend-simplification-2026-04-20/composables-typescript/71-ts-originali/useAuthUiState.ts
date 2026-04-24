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
	const guestOnlyPrefixes = ['/autenticazione', '/login', '/registrazione', '/recupera-password', '/aggiorna-password']
	const hasAuthenticatedSnapshot = computed(() => Boolean(authCookie.value?.authenticated))
	// BLACKLIST: Sanctum si attacca ovunque TRANNE sulle pagine guest-only.
	// Evita di tenere disattivo il live auth su pagine pubbliche dove l'utente
	// potrebbe gia' essere autenticato (es. homepage, servizi, contatti).
	const shouldAttachLiveAuth = computed(() => {
		if (!import.meta.client) return false
		if (guestOnlyPrefixes.some((prefix) => route.path.startsWith(prefix))) return false
		return true
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

				if (!auth.value || initPending || status === 'pending') {
					return
				}

				if (ready && status === 'resolved') {
					// Guard anti-logout spurio: se il cookie snapshot SSR-safe e' ancora
					// valido (authenticated=true), NON cancellare. Il backend e' fonte di
					// verita' finale ma il cookie preserva la UI finche' non c'e'
					// evidenza opposta (401 esplicito dal backend).
					if (authCookie.value?.authenticated) {
						return
					}
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

	// Stato stabile per evitare flicker: aggiorna solo quando abbiamo evidenza
	// forte (true=auth confermato, false=resolved senza auth). Negli stati
	// intermedi (pending, init) mantiene il valore precedente.
	const authenticatedState = ref<boolean | null>(null)
	if (import.meta.client) {
		watch(
			[liveAuthenticated, bootstrapStatus, hasAuthenticatedSnapshot],
			([authenticated, status, snapshotAuth]) => {
				if (authenticated || snapshotAuth) {
					authenticatedState.value = true
					return
				}
				if (status === 'resolved' && !authenticated && !snapshotAuth) {
					authenticatedState.value = false
					return
				}
				// altrimenti mantieni il valore precedente (no flicker)
			},
			{ immediate: true },
		)
	}

	const isAuthenticatedForUi = computed(() => {
		if (authenticatedState.value !== null) return authenticatedState.value
		return uiSnapshot.value.authenticated
	})

	// Pending UI: true finche' non abbiamo una risposta stabile sull'auth
	// (bootstrap non risolto E nessuno snapshot cookie autoritativo).
	const isAuthUiPending = computed(() => {
		if (authenticatedState.value !== null) return false
		if (authCookie.value?.authenticated) return false
		return bootstrapStatus.value !== 'resolved'
	})

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
		isAuthUiPending,
		liveAuthenticated,
		liveUser,
		mobileAccountLabel,
		uiSnapshot,
	}
}
