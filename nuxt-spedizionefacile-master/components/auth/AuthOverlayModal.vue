<script setup lang="ts">
import { useAuthUiSnapshotPersistence } from '~/composables/useAuthUiSnapshotPersistence'

const route = useRoute()
const router = useRouter()
const sanctum = useSanctumClient()
const { refreshIdentity } = useSanctumAuth()
const { persistSnapshotFromUser } = useAuthUiSnapshotPersistence()
const { authProviders, refreshAuthProviders } = useAuthProviders()
const { closeAuthModal, isOpen, openAuthModal, redirectPath, selectedTab } = useAuthModal()

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

const socialErrorTone = computed(() => (/temporaneamente non disponibile/i.test(socialError.value) ? 'muted' : 'error'))

const modalUi = {
  overlay: 'bg-[#09131c]/38 backdrop-blur-[7px]',
  content: 'sf-modal-surface w-[calc(100vw-0.75rem)] max-w-[504px] max-h-[88vh] overflow-hidden border-0',
  body: 'p-0 overflow-y-auto overscroll-contain scrollbar-hide',
}

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

const sanitizeRedirect = (redirect?: string) => {
  if (!redirect || typeof redirect !== 'string') return '/'
  return redirect.startsWith('/') ? redirect : '/'
}

const currentRedirect = computed(() => sanitizeRedirect(redirectPath.value || route.fullPath))
const isBusy = computed(() => isLoading.value || resendLoading.value || verificationLoading.value)

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
    if (!firstKey) {
      return 'Operazione non riuscita. Riprova.'
    }

    const firstEntry = errors[firstKey]
    const firstVal = Array.isArray(firstEntry) ? firstEntry[0] : firstEntry
    if (firstVal) return String(firstVal)
  }
  return 'Operazione non riuscita. Riprova.'
}

const humanizeSocialError = (rawError: string) => {
  if (rawError === 'google_email_missing') return 'Il tuo account Google non ha un’email disponibile. Usa un altro account oppure registrati con email.'
  if (rawError === 'facebook_email_missing') return 'Il tuo account Facebook non ha un’email disponibile. Usa un altro account oppure registrati con email.'
  if (rawError === 'apple_email_missing') return 'Il tuo account Apple non ha un’email disponibile. Usa un altro account oppure registrati con email.'
  if (rawError === 'google_unavailable') return 'Accesso con Google temporaneamente non disponibile. Completiamo prima la configurazione del provider.'
  if (rawError === 'facebook_unavailable') return 'Accesso con Facebook temporaneamente non disponibile. Completiamo prima la configurazione del provider.'
  if (rawError === 'apple_unavailable') return 'Accesso con Apple temporaneamente non disponibile. Completiamo prima la configurazione del provider.'
  if (rawError.startsWith('facebook_')) return 'Errore durante l’accesso con Facebook. Riprova.'
  if (rawError.startsWith('google_')) return 'Errore durante l’accesso con Google. Riprova.'
  if (rawError.startsWith('apple_')) return 'Errore durante l’accesso con Apple. Riprova.'
  return 'Errore durante l’accesso social. Riprova.'
}

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
    if (registerForm.value.referred_by.trim()) {
      params.set('ref', registerForm.value.referred_by.trim())
    }
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

const finalizeAuth = async (responseUser: any) => {
  persistSnapshotFromUser(responseUser?.user || responseUser)
  await refreshIdentity()
  await refreshNuxtData()
  const redirectTarget = currentRedirect.value
  closeAuthModal()
  resetModalState()

  if (redirectTarget !== route.fullPath) {
    await navigateTo(redirectTarget)
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
    await sanctum('/api/custom-register', {
      method: 'POST',
      body: registerForm.value,
    })

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
        verificationSuccess.value = 'Registrazione completata. Inserisci il codice a 6 cifre per attivare l’account.'
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
    verificationError.value = 'Inserisci prima un’email valida.'
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

watch(isOpen, async (open) => {
  if (!open) return
  clearFeedback()
  await refreshProviderStatus()
})

watch(
  () => route.query.auth_error,
  async () => {
    await handleRouteAuthError()
  },
  { immediate: true },
)
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :dismissible="!isBusy"
    :close="false"
    :ui="modalUi"
  >
    <template #body>
      <div class="auth-overlay-shell">
        <div class="sr-only">
          <h2>Accedi o registrati</h2>
        </div>
        <div class="auth-overlay-head">
          <div class="auth-overlay-tabs">
            <button
              type="button"
              :class="selectedTab === 'login' ? 'auth-overlay-tab auth-overlay-tab--active' : 'auth-overlay-tab'"
              @click="selectedTab = 'login'; resetVerificationMode(); clearFeedback()"
            >
              Accedi
            </button>
            <button
              type="button"
              :class="selectedTab === 'register' ? 'auth-overlay-tab auth-overlay-tab--active' : 'auth-overlay-tab'"
              @click="selectedTab = 'register'; resetVerificationMode(); clearFeedback()"
            >
              Registrati
            </button>
          </div>

          <button
            type="button"
            class="auth-overlay-close sf-modal-close"
            aria-label="Chiudi accesso"
            @click="closeModal"
          >
            <Icon name="mdi:close" class="text-[1.05rem]" />
          </button>
        </div>

        <div v-if="socialError" :class="['auth-feedback', socialErrorTone === 'muted' ? 'auth-feedback--muted' : 'auth-feedback--error']">{{ socialError }}</div>
        <div v-if="authError" class="auth-feedback auth-feedback--error">{{ authError }}</div>
        <div v-if="authSuccess" class="auth-feedback auth-feedback--success">{{ authSuccess }}</div>

        <div class="auth-overlay-social-stack">
          <div class="auth-social-grid">
            <button
              type="button"
              :class="['auth-social-button', !authProviders.google ? 'auth-social-button--unavailable' : '']"
              @click="startSocialAuth('google')"
            >
              <span class="auth-social-button__icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                </svg>
              </span>
              <span class="auth-social-button__text">Google</span>
            </button>
            <button
              type="button"
              :class="['auth-social-button', !authProviders.facebook ? 'auth-social-button--unavailable' : '']"
              @click="startSocialAuth('facebook')"
            >
              <span class="auth-social-button__icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.026 4.388 11.022 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.017 1.792-4.684 4.533-4.684 1.313 0 2.686.235 2.686.235v2.963H15.83c-1.491 0-1.956.927-1.956 1.879v2.27h3.328l-.532 3.49h-2.796V24C19.612 23.095 24 18.099 24 12.073z"/>
                </svg>
              </span>
              <span class="auth-social-button__text">Facebook</span>
            </button>
            <button
              type="button"
              :class="['auth-social-button', !authProviders.apple ? 'auth-social-button--unavailable' : '']"
              @click="startSocialAuth('apple')"
            >
              <span class="auth-social-button__icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.37 12.36c.02 2.14 1.88 2.85 1.9 2.86-.02.05-.3 1.04-1 2.07-.61.89-1.24 1.77-2.24 1.79-.98.02-1.3-.58-2.42-.58-1.12 0-1.48.56-2.4.6-.96.04-1.69-.96-2.3-1.85-1.25-1.81-2.2-5.13-.92-7.36.63-1.11 1.76-1.81 2.99-1.83.93-.02 1.81.63 2.42.63.61 0 1.74-.78 2.93-.66.5.02 1.91.2 2.81 1.51-.07.04-1.68.98-1.67 2.82Zm-2.04-5.05c.51-.62.85-1.48.75-2.34-.73.03-1.62.48-2.14 1.09-.47.54-.88 1.41-.77 2.25.81.06 1.64-.42 2.16-1Z"/>
                </svg>
              </span>
              <span class="auth-social-button__text">Apple</span>
            </button>
          </div>
          <div class="auth-overlay-divider" aria-hidden="true"></div>
        </div>

        <div class="auth-overlay-panel">
          <div v-if="verificationMode" class="auth-overlay-form auth-overlay-form--verification">
            <div>
              <p class="auth-panel-title">Verifica il tuo account</p>
              <p class="auth-panel-copy">Inserisci il codice a 6 cifre inviato a <strong>{{ loginForm.email }}</strong>.</p>
            </div>
            <div class="flex items-center justify-center gap-[8px]">
              <input
                v-for="(digit, index) in verificationCode"
                :key="index"
                :value="digit"
                :data-verification-index="index"
                type="text"
                inputmode="numeric"
                maxlength="1"
                class="verification-digit"
                @input="handleVerificationInput(index, $event)"
                @keydown="handleVerificationKeydown(index, $event)"
              />
            </div>
            <div v-if="verificationError" class="auth-feedback auth-feedback--error">{{ verificationError }}</div>
            <div v-if="verificationSuccess" class="auth-feedback auth-feedback--success">{{ verificationSuccess }}</div>
            <div class="flex flex-col gap-[10px]">
              <button type="button" class="auth-primary-submit" :disabled="verificationLoading" @click="verifyCode">
                {{ verificationLoading ? 'Verifica in corso...' : 'Verifica e continua' }}
              </button>
              <div class="flex items-center justify-between gap-[12px] text-[0.8125rem]">
                <button type="button" class="auth-text-link" :disabled="resendLoading" @click="resendVerificationEmail">
                  {{ resendLoading ? 'Invio...' : 'Invia nuovo codice' }}
                </button>
                <button type="button" class="auth-text-link auth-text-link--muted" @click="resetVerificationMode()">
                  Torna indietro
                </button>
              </div>
            </div>
          </div>

          <form v-else-if="selectedTab === 'login'" class="auth-overlay-form" @submit.prevent="handleLogin">
            <div class="auth-field-group">
              <label class="auth-field-label" for="auth-modal-email">Email</label>
              <input id="auth-modal-email" v-model="loginForm.email" class="auth-field-input" type="email" autocomplete="username" placeholder="La tua email" />
            </div>
            <div class="auth-field-group">
              <label class="auth-field-label" for="auth-modal-password">Password</label>
              <div class="auth-password-wrap">
                <input id="auth-modal-password" v-model="loginForm.password" class="auth-field-input auth-field-input--password" :type="showLoginPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="La tua password" />
                <button type="button" class="auth-password-toggle" tabindex="-1" @click="showLoginPassword = !showLoginPassword">
                  <Icon :name="showLoginPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" class="text-[1rem]" />
                </button>
              </div>
            </div>
            <label class="auth-checkbox-row" for="auth-modal-remember">
              <input id="auth-modal-remember" v-model="loginForm.remember" type="checkbox" class="auth-checkbox" />
              <span>Ricordami</span>
            </label>
            <button type="submit" class="auth-primary-submit" :disabled="isLoading">
              {{ isLoading ? 'Accesso in corso...' : 'Accedi e continua' }}
            </button>
          </form>

          <form v-else class="auth-overlay-form" @submit.prevent="handleRegister">
            <div class="auth-segmented-row">
              <button
                type="button"
                :class="registerForm.user_type === 'privato' ? 'auth-segment auth-segment--active' : 'auth-segment'"
                @click="registerForm.user_type = 'privato'"
              >
                Privato
              </button>
              <button
                type="button"
                :class="registerForm.user_type === 'commerciante' ? 'auth-segment auth-segment--active' : 'auth-segment'"
                @click="registerForm.user_type = 'commerciante'"
              >
                Azienda
              </button>
            </div>
            <div class="auth-grid-two">
              <div class="auth-field-group">
                <label class="auth-field-label">Nome</label>
                <input v-model="registerForm.name" class="auth-field-input" type="text" autocomplete="given-name" placeholder="Nome" />
              </div>
              <div class="auth-field-group">
                <label class="auth-field-label">Cognome</label>
                <input v-model="registerForm.surname" class="auth-field-input" type="text" autocomplete="family-name" placeholder="Cognome" />
              </div>
            </div>
            <div class="auth-grid-two">
              <div class="auth-field-group">
                <label class="auth-field-label">Email</label>
                <input v-model="registerForm.email" class="auth-field-input" type="email" autocomplete="email" placeholder="La tua email" />
              </div>
              <div class="auth-field-group">
                <label class="auth-field-label">Conferma email</label>
                <input v-model="registerForm.email_confirmation" class="auth-field-input" type="email" autocomplete="email" placeholder="Conferma email" />
              </div>
            </div>
            <div class="auth-grid-phone">
              <div class="auth-field-group">
                <label class="auth-field-label">Prefisso</label>
                <select v-model="registerForm.prefix" class="auth-field-input auth-field-select">
                  <option value="+39">+39 IT</option>
                  <option value="+49">+49 DE</option>
                </select>
              </div>
              <div class="auth-field-group">
                <label class="auth-field-label">Telefono</label>
                <input v-model="registerForm.telephone_number" class="auth-field-input" type="tel" autocomplete="tel" placeholder="Numero di telefono" />
              </div>
            </div>
            <div class="auth-grid-two">
              <div class="auth-field-group">
                <label class="auth-field-label">Password</label>
                <div class="auth-password-wrap">
                  <input v-model="registerForm.password" class="auth-field-input auth-field-input--password" :type="showRegisterPassword ? 'text' : 'password'" autocomplete="new-password" placeholder="Minimo 8 caratteri" />
                  <button type="button" class="auth-password-toggle" tabindex="-1" @click="showRegisterPassword = !showRegisterPassword">
                    <Icon :name="showRegisterPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" class="text-[1rem]" />
                  </button>
                </div>
              </div>
              <div class="auth-field-group">
                <label class="auth-field-label">Conferma password</label>
                <div class="auth-password-wrap">
                  <input v-model="registerForm.password_confirmation" class="auth-field-input auth-field-input--password" :type="showRegisterPasswordConfirm ? 'text' : 'password'" autocomplete="new-password" placeholder="Ripeti la password" />
                  <button type="button" class="auth-password-toggle" tabindex="-1" @click="showRegisterPasswordConfirm = !showRegisterPasswordConfirm">
                    <Icon :name="showRegisterPasswordConfirm ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" class="text-[1rem]" />
                  </button>
                </div>
              </div>
            </div>
            <button type="submit" class="auth-primary-submit" :disabled="isLoading">
              {{ isLoading ? 'Creazione account...' : 'Registrati e continua' }}
            </button>
          </form>
        </div>
      </div>
    </template>
  </UModal>
</template>
