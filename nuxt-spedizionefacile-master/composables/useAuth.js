/**
 * useAuth.js — Aggregatore auth: snapshot+persistence, UI state, social providers, overlay form.
 * NOTA: `useAuthModal` resta in file separato (solo open/close, usato da navbar/carrello).
 */

import {
	AUTH_UI_COOKIE,
	AUTH_UI_STORAGE,
	createEmptySnapshot,
	humanizeSocialAuthError,
	parseStoredSnapshot,
	sanitizeAuthRedirect,
	snapshotFromUser,
	useAuthBootstrapState,
	waitForPostAuthSync,
} from '~/utils/auth'

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 1: Snapshot Persistence (ex useAuthUiSnapshotPersistence)
// Persistenza snapshot auth UI su cookie + localStorage, con useState per reattività SSR-safe.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {import('~/utils/authUiState').AuthUiSnapshot} AuthUiSnapshot
 * @typedef {import('~/utils/authUiState').AuthUiUser} AuthUiUser
 */

/** Persistenza snapshot auth UI su cookie + localStorage, con useState per reattività SSR-safe. */
export const useAuthUiSnapshotPersistence = () => {
	const authCookie = useCookie(AUTH_UI_COOKIE, {
		sameSite: 'lax',
		path: '/',
		// HTTPS-only in produzione (in dev http://localhost va in chiaro per non rompere il login).
		secure: !import.meta.dev,
	})
	const initialSnapshot = useState('auth-ui-initial-snapshot', createEmptySnapshot)
	const storedSnapshot = useState('auth-ui-stored-snapshot', createEmptySnapshot)

	// In alcuni bootstrap/client restore il cookie arriva come stringa JSON url-encoded
	// invece che come oggetto gia' deserializzato. Normalizziamo subito per evitare
	// che middleware e plugin leggano `authenticated` come undefined.
	if (typeof authCookie.value === 'string') {
		authCookie.value = parseStoredSnapshot(authCookie.value)
	}

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

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 2: UI State (ex useAuthUiState)
// Stato UI auth: snapshot SSR-safe + sync opzionale con Sanctum live (guest-only blacklist).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {import('~/utils/authUiState').AuthUiUser} AuthUiUser
 */

/** Stato UI auth: snapshot SSR-safe + sync opzionale con Sanctum live (guest-only blacklist). */
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
	const auth = shallowRef(null)
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
	const liveUser = computed(() => {
		const user = auth.value?.user?.value
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
	const authenticatedState = ref(null)
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

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 3: Providers Config (ex useAuthProviders)
// Tiene traccia della disponibilità dei provider social (Google/Facebook/Apple).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {{ google: boolean, facebook: boolean, apple: boolean }} AuthProvidersAvailability
 */

const defaultProviders = () => ({
	google: false,
	facebook: false,
	apple: false,
})

/**
 * Composable che tiene traccia della disponibilità dei provider social (Google/Facebook/Apple).
 * Thin wrapper retro-compat sullo store Pinia `authProvidersStore` (Vue DevTools-friendly).
 */
export const useAuthProviders = () => {
	const store = useAuthProvidersStore()
	const { providers, loaded, loading } = storeToRefs(store)

	return {
		authProviders: providers,
		authProvidersLoaded: loaded,
		authProvidersLoading: loading,
		refreshAuthProviders: store.refresh,
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 4: Overlay Logic (ex useAuthOverlay)
// Logica completa per il modale di autenticazione (login, registrazione, verifica, social).
// Usato da AuthOverlayModal.vue per mantenere il componente snello.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Composable: useAuthOverlay
 * Logica completa per il modale di autenticazione (login, registrazione, verifica, social).
 * Usato da AuthOverlayModal.vue per mantenere il componente snello.
 */
export function useAuthOverlay() {
	const route = useRoute()
	const router = useRouter()
	const sanctum = useSanctumClient()
	const { refreshIdentity } = useSanctumAuth()
	const { persistSnapshotFromUser } = useAuthUiSnapshotPersistence()
	const { authProviders, refreshAuthProviders } = useAuthProviders()
	const { closeAuthModal, isOpen, openAuthModal, redirectPath, selectedTab, entryMode } = useAuthModal()
	// Funnel analytics: track login/register success.
	const { trackAuthLogin, trackAuthRegister } = useFunnelAnalytics()

	// --- State ---
	const loginForm = ref({
		email: '',
		password: '',
		remember: false,
	})

	const registerForm = ref({
		name: '',
		surname: '',
		email: '',
		email_confirmation: '',
		prefix: '+39',
		telephone_number: '',
		password: '',
		password_confirmation: '',
		role: 'Cliente',
		user_type: 'privato',
		referred_by: '',
		privacy_accepted: false,
	})

	const isLoading = ref(false)
	const resendLoading = ref(false)
	const authError = ref('')
	const authSuccess = ref('')
	const socialError = ref('')
	const verificationMode = ref(false)
	const verificationLoading = ref(false)
	const verificationCode = ref(['', '', '', '', '', ''])
	const verificationError = ref('')
	const verificationSuccess = ref('')
	const showLoginPassword = ref(false)
	const showRegisterPassword = ref(false)
	const showRegisterPasswordConfirm = ref(false)

	// --- Computed ---
	const socialErrorTone = computed(() =>
		/temporaneamente non disponibile/i.test(socialError.value) ? 'muted' : 'error',
	)

	const currentRedirect = computed(() => sanitizeAuthRedirect(redirectPath.value || route.fullPath, '/'))
	const isBusy = computed(() => isLoading.value || resendLoading.value || verificationLoading.value)

	// --- Helpers ---
	const clearFeedback = () => {
		authError.value = ''
		authSuccess.value = ''
		socialError.value = ''
		verificationError.value = ''
		verificationSuccess.value = ''
	}

	const resetVerificationMode = () => {
		verificationMode.value = false
		verificationCode.value = ['', '', '', '', '', '']
		verificationError.value = ''
		verificationSuccess.value = ''
	}

	const resetModalState = () => {
		clearFeedback()
		resetVerificationMode()
	}

	const closeModal = () => {
		if (isBusy.value) return
		closeAuthModal()
	}

	const extractFirstApiError = (error) => {
		const data = error?.response?._data || error?.data || {}
		const explicit = data?.message || error?.message
		if (explicit) return String(explicit)
		const errors = data?.errors
		if (errors && typeof errors === 'object') {
			const firstKey = Object.keys(errors)[0]
			if (!firstKey) return 'Operazione non riuscita. Riprova.'
			const firstEntry = errors[firstKey]
			const firstVal = Array.isArray(firstEntry) ? firstEntry[0] : firstEntry
			if (firstVal) return String(firstVal)
		}
		return 'Operazione non riuscita. Riprova.'
	}

	const humanizeSocialError = humanizeSocialAuthError

	// --- Social Auth ---
	const refreshProviderStatus = async () => {
		await refreshAuthProviders()
	}

	const buildSocialAuthUrl = (provider) => {
		const params = new URLSearchParams({
			frontend: window.location.origin,
			redirect: currentRedirect.value,
			intent: selectedTab.value === 'register' ? 'register' : 'login',
		})
		if (selectedTab.value === 'register') {
			if (registerForm.value.referred_by.trim()) params.set('ref', registerForm.value.referred_by.trim())
			params.set('user_type', registerForm.value.user_type)
		}
		return `/api/auth/${provider}/redirect?${params.toString()}`
	}

	const startSocialAuth = async (provider) => {
		await refreshProviderStatus()
		if (!authProviders.value[provider]) {
			socialError.value = humanizeSocialError(`${provider}_unavailable`)
			return
		}
		// Analytics: trackiamo l'intent, non il success (il success avviene dopo
		// il redirect OAuth che esce dall'app). Il tab attivo indica login vs register.
		if (selectedTab.value === 'register') {
			trackAuthRegister(provider)
		} else {
			trackAuthLogin(provider)
		}
		window.location.assign(buildSocialAuthUrl(provider))
	}

	// --- Auth Flow ---
	const finalizeAuth = async (responseUser) => {
		const redirectTarget = currentRedirect.value
		persistSnapshotFromUser(responseUser?.user || responseUser)
		await waitForPostAuthSync(refreshIdentity)
		try {
			await refreshNuxtData()
		} catch {
			// Se refreshNuxtData fallisce, la navigazione verso la route protetta riallinea comunque la UI.
		}
		closeAuthModal()
		resetModalState()
		// IMPORTANTE: niente window.location.assign() qui.
		// Un hard reload svuota il shipmentFlowStore (Pinia) PRIMA dell'idratazione da
		// sessionStorage. Il middleware shipment-validation trova localFlowState
		// con tutti i flag a false e reindirizza a step 1 colli — l'utente perde
		// tutti i dati form compilati (peso colli, indirizzi, servizi).
		// refreshIdentity() sopra + refreshNuxtData() hanno gia' sincronizzato
		// Sanctum. Una soft navigation preserva lo state Pinia.
		if (redirectTarget !== route.fullPath) {
			await navigateTo(redirectTarget, { replace: true })
		}
	}

	const openVerificationFromLogin = () => {
		verificationMode.value = true
		verificationCode.value = ['', '', '', '', '', '']
		verificationError.value = ''
		verificationSuccess.value = 'Inserisci il codice di verifica inviato alla tua email.'
		authSuccess.value = ''
	}

	const handleLogin = async () => {
		if (isLoading.value) return
		clearFeedback()
		if (!loginForm.value.email || !loginForm.value.password) {
			authError.value = 'Inserisci email e password per continuare.'
			return
		}
		isLoading.value = true
		try {
			const response = await sanctum('/api/custom-login', {
				method: 'POST',
				body: {
					email: loginForm.value.email,
					password: loginForm.value.password,
					remember: loginForm.value.remember,
				},
			})
			// Analytics: login email-password riuscito (no PII nel payload).
			trackAuthLogin('email')
			await finalizeAuth(response)
		} catch (error) {
			const statusCode = error?.response?.status || error?.statusCode
			const data = error?.response?._data || error?.data
			if (statusCode === 403 && data?.requires_verification) {
				openVerificationFromLogin()
				return
			}
			authError.value = extractFirstApiError(error)
		} finally {
			isLoading.value = false
		}
	}

	const handleRegister = async () => {
		if (isLoading.value) return
		clearFeedback()
		if (!registerForm.value.name || !registerForm.value.surname) {
			authError.value = 'Inserisci nome e cognome.'
			return
		}
		if (!registerForm.value.email || !registerForm.value.email_confirmation) {
			authError.value = 'Inserisci e conferma la tua email.'
			return
		}
		if (registerForm.value.email !== registerForm.value.email_confirmation) {
			authError.value = 'Le email non coincidono.'
			return
		}
		if (!registerForm.value.password || !registerForm.value.password_confirmation) {
			authError.value = 'Inserisci e conferma la password.'
			return
		}
		if (registerForm.value.password !== registerForm.value.password_confirmation) {
			authError.value = 'Le password non coincidono.'
			return
		}
		isLoading.value = true
		try {
			await sanctum('/api/custom-register', { method: 'POST', body: registerForm.value })
			// Analytics: registrazione email riuscita. Trackiamo qui perché l'auto-login
			// successivo può fallire per verification pending senza che la registrazione
			// in sé sia fallita.
			trackAuthRegister('email')
			try {
				const loginResponse = await sanctum('/api/custom-login', {
					method: 'POST',
					body: {
						email: registerForm.value.email,
						password: registerForm.value.password,
						remember: true,
					},
				})
				await finalizeAuth(loginResponse)
				return
			} catch (error) {
				const statusCode = error?.response?.status || error?.statusCode
				const data = error?.response?._data || error?.data
				if (statusCode === 403 && data?.requires_verification) {
					loginForm.value.email = registerForm.value.email
					loginForm.value.password = registerForm.value.password
					loginForm.value.remember = true
					selectedTab.value = 'register'
					openVerificationFromLogin()
					verificationSuccess.value = "Registrazione completata. Inserisci il codice a 6 cifre per attivare l\u2019account."
					return
				}
				throw error
			}
		} catch (error) {
			authError.value = extractFirstApiError(error)
		} finally {
			isLoading.value = false
		}
	}

	// --- Verification ---
	const handleVerificationInput = (index, event) => {
		const target = event.target
		verificationCode.value[index] = target.value.replace(/\D/g, '').slice(0, 1)
		if (verificationCode.value[index] && index < 5) {
			const next = document.querySelector(`[data-verification-index="${index + 1}"]`)
			next?.focus()
		}
	}

	const handleVerificationKeydown = (index, event) => {
		if (event.key === 'Backspace' && !verificationCode.value[index] && index > 0) {
			const prev = document.querySelector(`[data-verification-index="${index - 1}"]`)
			prev?.focus()
		}
	}

	const verifyCode = async () => {
		const code = verificationCode.value.join('')
		if (code.length !== 6) {
			verificationError.value = 'Inserisci il codice completo a 6 cifre.'
			return
		}
		verificationLoading.value = true
		verificationError.value = ''
		try {
			const response = await sanctum('/api/verify-code', {
				method: 'POST',
				body: {
					email: loginForm.value.email,
					password: loginForm.value.password,
					remember: loginForm.value.remember,
					code,
				},
			})
			await finalizeAuth(response?.user || response)
		} catch (error) {
			verificationError.value = extractFirstApiError(error)
		} finally {
			verificationLoading.value = false
		}
	}

	const resendVerificationEmail = async () => {
		if (!loginForm.value.email) {
			verificationError.value = "Inserisci prima un\u2019email valida."
			return
		}
		resendLoading.value = true
		verificationError.value = ''
		try {
			const response = await sanctum('/api/resend-verification-email', {
				method: 'POST',
				body: { email: loginForm.value.email },
			})
			verificationSuccess.value = response?.message || 'Nuovo codice inviato.'
		} catch (error) {
			verificationError.value = extractFirstApiError(error)
		} finally {
			resendLoading.value = false
		}
	}

	// --- Route error watcher ---
	const clearAuthErrorQuery = async () => {
		const nextQuery = { ...route.query }
		delete nextQuery.auth_error
		delete nextQuery.auth_modal
		await router.replace({ path: route.path, query: nextQuery, hash: route.hash })
	}

	const handleRouteAuthError = async () => {
		const routeError = route.query.auth_error
		const authErrorValue = Array.isArray(routeError) ? routeError[0] : routeError
		if (!authErrorValue) return
		selectedTab.value = 'login'
		openAuthModal({ redirect: route.fullPath, tab: 'login' })
		socialError.value = humanizeSocialError(String(authErrorValue))
		await clearAuthErrorQuery()
	}

	// --- Watchers ---
	watch(isOpen, async (open) => {
		if (!open) return
		clearFeedback()
		await refreshProviderStatus()
	})

	watch(
		() => route.query.auth_error,
		async () => { await handleRouteAuthError() },
		{ immediate: true },
	)

	return {
		// State
		loginForm,
		registerForm,
		isLoading,
		resendLoading,
		authError,
		authSuccess,
		socialError,
		verificationMode,
		verificationLoading,
		verificationCode,
		verificationError,
		verificationSuccess,
		showLoginPassword,
		showRegisterPassword,
		showRegisterPasswordConfirm,
		// Computed
		socialErrorTone,
		isBusy,
		isOpen,
		selectedTab,
		entryMode,
		authProviders,
		// Methods
		clearFeedback,
		resetVerificationMode,
		closeModal,
		startSocialAuth,
		handleLogin,
		handleRegister,
		handleVerificationInput,
		handleVerificationKeydown,
		verifyCode,
		resendVerificationEmail,
	}
}
