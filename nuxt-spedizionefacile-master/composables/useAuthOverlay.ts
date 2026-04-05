import { waitForPostAuthSync } from '~/utils/postAuthSync'

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
  const { closeAuthModal, isOpen, openAuthModal, redirectPath, selectedTab } = useAuthModal()

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

  type ApiErrorPayload = {
    message?: string
    errors?: Record<string, string[] | string | undefined>
  }

  type VerifyResponse = {
    user?: Record<string, unknown>
    message?: string
  }

  // --- Computed ---
  const socialErrorTone = computed(() =>
    /temporaneamente non disponibile/i.test(socialError.value) ? 'muted' : 'error',
  )

  const sanitizeRedirect = (redirect?: string) => {
    if (!redirect || typeof redirect !== 'string') return '/'
    return redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
  }

  const currentRedirect = computed(() => sanitizeRedirect(redirectPath.value || route.fullPath))
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

  const extractFirstApiError = (error: any) => {
    const data: ApiErrorPayload = error?.response?._data || error?.data || {}
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

  const humanizeSocialError = (rawError: string) => {
    const map: Record<string, string> = {
      google_email_missing: "Il tuo account Google non ha un\u2019email disponibile. Usa un altro account oppure registrati con email.",
      facebook_email_missing: "Il tuo account Facebook non ha un\u2019email disponibile. Usa un altro account oppure registrati con email.",
      apple_email_missing: "Il tuo account Apple non ha un\u2019email disponibile. Usa un altro account oppure registrati con email.",
      google_unavailable: 'Accesso con Google temporaneamente non disponibile. Completiamo prima la configurazione del provider.',
      facebook_unavailable: 'Accesso con Facebook temporaneamente non disponibile. Completiamo prima la configurazione del provider.',
      apple_unavailable: 'Accesso con Apple temporaneamente non disponibile. Completiamo prima la configurazione del provider.',
    }
    if (map[rawError]) return map[rawError]
    if (rawError.startsWith('facebook_')) return "Errore durante l\u2019accesso con Facebook. Riprova."
    if (rawError.startsWith('google_')) return "Errore durante l\u2019accesso con Google. Riprova."
    if (rawError.startsWith('apple_')) return "Errore durante l\u2019accesso con Apple. Riprova."
    return "Errore durante l\u2019accesso social. Riprova."
  }

  // --- Social Auth ---
  const refreshProviderStatus = async () => {
    await refreshAuthProviders()
  }

  const buildSocialAuthUrl = (provider: 'google' | 'facebook' | 'apple') => {
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

  const startSocialAuth = async (provider: 'google' | 'facebook' | 'apple') => {
    await refreshProviderStatus()
    if (!authProviders.value[provider]) {
      socialError.value = humanizeSocialError(`${provider}_unavailable`)
      return
    }
    window.location.assign(buildSocialAuthUrl(provider))
  }

  // --- Auth Flow ---
  const finalizeAuth = async (responseUser: any) => {
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
    if (import.meta.client) {
      window.location.assign(redirectTarget)
      return
    }
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
      await finalizeAuth(response)
    } catch (error: any) {
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
      } catch (error: any) {
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
    } catch (error: any) {
      authError.value = extractFirstApiError(error)
    } finally {
      isLoading.value = false
    }
  }

  // --- Verification ---
  const handleVerificationInput = (index: number, event: Event) => {
    const target = event.target as HTMLInputElement
    verificationCode.value[index] = target.value.replace(/\D/g, '').slice(0, 1)
    if (verificationCode.value[index] && index < 5) {
      const next = document.querySelector<HTMLInputElement>(`[data-verification-index="${index + 1}"]`)
      next?.focus()
    }
  }

  const handleVerificationKeydown = (index: number, event: KeyboardEvent) => {
    if (event.key === 'Backspace' && !verificationCode.value[index] && index > 0) {
      const prev = document.querySelector<HTMLInputElement>(`[data-verification-index="${index - 1}"]`)
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
      const response = await sanctum<VerifyResponse>('/api/verify-code', {
        method: 'POST',
        body: {
          email: loginForm.value.email,
          password: loginForm.value.password,
          remember: loginForm.value.remember,
          code,
        },
      })
      await finalizeAuth(response?.user || response)
    } catch (error: any) {
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
      const response = await sanctum<VerifyResponse>('/api/resend-verification-email', {
        method: 'POST',
        body: { email: loginForm.value.email },
      })
      verificationSuccess.value = response?.message || 'Nuovo codice inviato.'
    } catch (error: any) {
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
