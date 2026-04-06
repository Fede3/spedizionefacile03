<script setup lang="ts">
import { DialogDescription, DialogTitle } from 'reka-ui'

const {
  loginForm, registerForm, isLoading, resendLoading,
  authError, authSuccess, socialError, verificationMode,
  verificationLoading, verificationCode, verificationError,
  verificationSuccess, showLoginPassword, showRegisterPassword,
  showRegisterPasswordConfirm, socialErrorTone, isBusy,
  isOpen, selectedTab, authProviders,
  clearFeedback, resetVerificationMode, closeModal,
  startSocialAuth, handleLogin, handleRegister,
  handleVerificationInput, handleVerificationKeydown,
  verifyCode, resendVerificationEmail,
} = useAuthOverlay()

// --- Forgot password state (local to this component) ---
const forgotMode = ref(false)
const forgotEmail = ref('')
const forgotLoading = ref(false)
const forgotError = ref('')
const forgotSuccess = ref('')

const sanctum = useSanctumClient()

const enterForgotMode = () => {
  forgotMode.value = true
  forgotEmail.value = loginForm.value.email || ''
  forgotError.value = ''
  forgotSuccess.value = ''
  clearFeedback()
}

const exitForgotMode = () => {
  forgotMode.value = false
  forgotError.value = ''
  forgotSuccess.value = ''
}

const handleForgotPassword = async () => {
  forgotError.value = ''
  forgotSuccess.value = ''
  if (!forgotEmail.value) {
    forgotError.value = 'Inserisci la tua email per continuare.'
    return
  }
  forgotLoading.value = true
  try {
    const response = await sanctum<{ message?: string }>('/api/forgot-password', {
      method: 'POST',
      body: { email: forgotEmail.value },
    })
    forgotSuccess.value = response?.message || 'Link di recupero inviato. Controlla la tua email.'
  } catch (error: any) {
    const data = error?.response?._data || error?.data || {}
    forgotError.value = data?.message || "Errore durante l'invio. Riprova."
  } finally {
    forgotLoading.value = false
  }
}

// Reset forgot mode when switching tabs
watch(selectedTab, () => {
  if (forgotMode.value) exitForgotMode()
})

// Reset forgot mode when modal closes
watch(isOpen, (open) => {
  if (!open) exitForgotMode()
})

const modalUi = {
  overlay: 'bg-[#09131c]/40 backdrop-blur-[8px]',
  content: 'auth-overlay-surface w-[calc(100vw-1rem)] max-w-[420px] max-h-[90vh] overflow-hidden rounded-[20px] border-0 shadow-none',
  body: 'p-0 overflow-y-auto overscroll-contain scrollbar-hide',
}
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
        <!-- SR-only title for accessibility -->
        <div class="sr-only">
          <DialogTitle>Accedi o registrati</DialogTitle>
          <DialogDescription>
            Accedi o crea un account per continuare con spedizioni, salvataggi e checkout.
          </DialogDescription>
        </div>

        <!-- Gradient header line -->
        <div class="auth-overlay-accent-line" aria-hidden="true"></div>

        <!-- Close button -->
        <button
          type="button"
          class="auth-overlay-close-btn"
          aria-label="Chiudi"
          @click="closeModal"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <!-- Content area -->
        <div class="auth-overlay-content">

          <!-- Heading -->
          <h2 class="auth-overlay-heading">
            <template v-if="forgotMode">Recupera password</template>
            <template v-else-if="verificationMode">Verifica account</template>
            <template v-else>{{ selectedTab === 'login' ? 'Bentornato' : 'Benvenuto' }}</template>
          </h2>

          <!-- Tab switch (hidden during forgot/verification) -->
          <div v-if="!forgotMode && !verificationMode" class="auth-overlay-pill-tabs">
            <button
              type="button"
              :class="['auth-overlay-pill-tab', selectedTab === 'login' && 'auth-overlay-pill-tab--active']"
              @click="selectedTab = 'login'; resetVerificationMode(); clearFeedback()"
            >
              Accedi
            </button>
            <button
              type="button"
              :class="['auth-overlay-pill-tab', selectedTab === 'register' && 'auth-overlay-pill-tab--active']"
              @click="selectedTab = 'register'; resetVerificationMode(); clearFeedback()"
            >
              Registrati
            </button>
          </div>

          <!-- Feedback messages -->
          <div v-if="socialError" :class="['auth-feedback', socialErrorTone === 'muted' ? 'auth-feedback--muted' : 'auth-feedback--error']">{{ socialError }}</div>
          <div v-if="authError" class="auth-feedback auth-feedback--error">{{ authError }}</div>
          <div v-if="authSuccess" class="auth-feedback auth-feedback--success">{{ authSuccess }}</div>

          <!-- ===================== FORGOT PASSWORD MODE ===================== -->
          <div v-if="forgotMode" class="auth-overlay-form">
            <p class="auth-overlay-forgot-copy">
              Inserisci la tua email e ti invieremo un link per reimpostare la password.
            </p>

            <div v-if="forgotError" class="auth-feedback auth-feedback--error">{{ forgotError }}</div>
            <div v-if="forgotSuccess" class="auth-feedback auth-feedback--success">{{ forgotSuccess }}</div>

            <div class="auth-field-group">
              <label class="auth-overlay-label" for="auth-forgot-email">Email</label>
              <input
                id="auth-forgot-email"
                v-model="forgotEmail"
                class="auth-overlay-input"
                type="email"
                autocomplete="email"
                placeholder="La tua email"
              />
            </div>

            <button
              type="button"
              class="auth-overlay-submit"
              :disabled="forgotLoading"
              @click="handleForgotPassword"
            >
              {{ forgotLoading ? 'Invio in corso...' : 'Invia link di recupero' }}
            </button>

            <button
              type="button"
              class="auth-overlay-back-link"
              @click="exitForgotMode"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Torna al login
            </button>
          </div>

          <!-- ===================== VERIFICATION MODE ===================== -->
          <div v-else-if="verificationMode" class="auth-overlay-form">
            <p class="auth-overlay-forgot-copy">
              Inserisci il codice a 6 cifre inviato a <strong>{{ loginForm.email }}</strong>.
            </p>

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

            <button
              type="button"
              class="auth-overlay-submit"
              :disabled="verificationLoading"
              @click="verifyCode"
            >
              {{ verificationLoading ? 'Verifica in corso...' : 'Verifica e continua' }}
            </button>

            <div class="flex items-center justify-between gap-[12px] text-[13px]">
              <button type="button" class="auth-overlay-inline-link" :disabled="resendLoading" @click="resendVerificationEmail">
                {{ resendLoading ? 'Invio...' : 'Invia nuovo codice' }}
              </button>
              <button type="button" class="auth-overlay-inline-link auth-overlay-inline-link--muted" @click="resetVerificationMode()">
                Torna indietro
              </button>
            </div>
          </div>

          <!-- ===================== LOGIN FORM ===================== -->
          <form
            v-else-if="selectedTab === 'login'"
            class="auth-overlay-form"
            action="javascript:void(0)"
            method="post"
            @submit.capture.prevent.stop="handleLogin"
          >
            <div class="auth-field-group">
              <label class="auth-overlay-label" for="auth-modal-email">Email</label>
              <input
                id="auth-modal-email"
                v-model="loginForm.email"
                class="auth-overlay-input"
                type="email"
                autocomplete="username"
                placeholder="La tua email"
              />
            </div>

            <div class="auth-field-group">
              <div class="flex items-center justify-between">
                <label class="auth-overlay-label" for="auth-modal-password">Password</label>
                <button
                  type="button"
                  class="auth-overlay-forgot-link"
                  @click="enterForgotMode"
                >
                  Password dimenticata?
                </button>
              </div>
              <div class="auth-password-wrap">
                <input
                  id="auth-modal-password"
                  v-model="loginForm.password"
                  class="auth-overlay-input auth-overlay-input--password"
                  :type="showLoginPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="La tua password"
                />
                <button type="button" class="auth-password-toggle" tabindex="-1" @click="showLoginPassword = !showLoginPassword">
                  <svg v-if="showLoginPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor"><path d="M2,5.27L3.28,4L20,20.72L18.73,22L15.65,18.92C14.5,19.3 13.28,19.5 12,19.5C7,19.5 2.73,16.39 1,12C1.69,10.24 2.79,8.69 4.19,7.46L2,5.27M12,9A3,3 0 0,1 15,12C15,12.35 14.94,12.69 14.83,13L11,9.17C11.31,9.06 11.65,9 12,9M12,4.5C17,4.5 21.27,7.61 23,12C22.18,14.08 20.79,15.88 19,17.19L17.58,15.76C18.94,14.82 20.06,13.54 20.82,12C19.17,8.64 15.76,6.5 12,6.5C10.91,6.5 9.84,6.68 8.84,7.03L7.31,5.5C8.77,4.85 10.36,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C12.69,17.5 13.37,17.43 14,17.29L11.72,15C10.29,14.85 9.15,13.71 9,12.28L5.6,8.87C4.61,9.72 3.78,10.78 3.18,12Z"/></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor"><path d="M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C15.76,17.5 19.17,15.36 20.82,12C19.17,8.64 15.76,6.5 12,6.5C8.24,6.5 4.83,8.64 3.18,12Z"/></svg>
                </button>
              </div>
            </div>

            <button
              type="button"
              class="auth-overlay-submit"
              :disabled="isLoading"
              @click="handleLogin"
            >
              {{ isLoading ? 'Accesso in corso...' : 'Accedi' }}
            </button>
          </form>

          <!-- ===================== REGISTER FORM ===================== -->
          <form
            v-else
            class="auth-overlay-form"
            action="javascript:void(0)"
            method="post"
            @submit.capture.prevent.stop="handleRegister"
          >
            <!-- User type segmented -->
            <div class="auth-overlay-pill-tabs auth-overlay-pill-tabs--compact">
              <button
                type="button"
                :class="['auth-overlay-pill-tab', registerForm.user_type === 'privato' && 'auth-overlay-pill-tab--active']"
                @click="registerForm.user_type = 'privato'"
              >
                Privato
              </button>
              <button
                type="button"
                :class="['auth-overlay-pill-tab', registerForm.user_type === 'commerciante' && 'auth-overlay-pill-tab--active']"
                @click="registerForm.user_type = 'commerciante'"
              >
                Azienda
              </button>
            </div>

            <div class="auth-overlay-grid-2">
              <div class="auth-field-group">
                <label class="auth-overlay-label">Nome</label>
                <input v-model="registerForm.name" class="auth-overlay-input" type="text" autocomplete="given-name" placeholder="Nome" />
              </div>
              <div class="auth-field-group">
                <label class="auth-overlay-label">Cognome</label>
                <input v-model="registerForm.surname" class="auth-overlay-input" type="text" autocomplete="family-name" placeholder="Cognome" />
              </div>
            </div>

            <div class="auth-overlay-grid-2">
              <div class="auth-field-group">
                <label class="auth-overlay-label">Email</label>
                <input v-model="registerForm.email" class="auth-overlay-input" type="email" autocomplete="email" placeholder="La tua email" />
              </div>
              <div class="auth-field-group">
                <label class="auth-overlay-label">Conferma email</label>
                <input v-model="registerForm.email_confirmation" class="auth-overlay-input" type="email" autocomplete="email" placeholder="Conferma email" />
              </div>
            </div>

            <div class="auth-overlay-grid-phone">
              <div class="auth-field-group">
                <label class="auth-overlay-label">Prefisso</label>
                <select v-model="registerForm.prefix" class="auth-overlay-input auth-overlay-select">
                  <option value="+39">+39 IT</option>
                  <option value="+49">+49 DE</option>
                </select>
              </div>
              <div class="auth-field-group">
                <label class="auth-overlay-label">Telefono</label>
                <input v-model="registerForm.telephone_number" class="auth-overlay-input" type="tel" autocomplete="tel" placeholder="Numero di telefono" />
              </div>
            </div>

            <div class="auth-overlay-grid-2">
              <div class="auth-field-group">
                <label class="auth-overlay-label">Password</label>
                <div class="auth-password-wrap">
                  <input v-model="registerForm.password" class="auth-overlay-input auth-overlay-input--password" :type="showRegisterPassword ? 'text' : 'password'" autocomplete="new-password" placeholder="Min. 8 caratteri" />
                  <button type="button" class="auth-password-toggle" tabindex="-1" @click="showRegisterPassword = !showRegisterPassword">
                    <svg v-if="showRegisterPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor"><path d="M2,5.27L3.28,4L20,20.72L18.73,22L15.65,18.92C14.5,19.3 13.28,19.5 12,19.5C7,19.5 2.73,16.39 1,12C1.69,10.24 2.79,8.69 4.19,7.46L2,5.27M12,9A3,3 0 0,1 15,12C15,12.35 14.94,12.69 14.83,13L11,9.17C11.31,9.06 11.65,9 12,9M12,4.5C17,4.5 21.27,7.61 23,12C22.18,14.08 20.79,15.88 19,17.19L17.58,15.76C18.94,14.82 20.06,13.54 20.82,12C19.17,8.64 15.76,6.5 12,6.5C10.91,6.5 9.84,6.68 8.84,7.03L7.31,5.5C8.77,4.85 10.36,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C12.69,17.5 13.37,17.43 14,17.29L11.72,15C10.29,14.85 9.15,13.71 9,12.28L5.6,8.87C4.61,9.72 3.78,10.78 3.18,12Z"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor"><path d="M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C15.76,17.5 19.17,15.36 20.82,12C19.17,8.64 15.76,6.5 12,6.5C8.24,6.5 4.83,8.64 3.18,12Z"/></svg>
                  </button>
                </div>
              </div>
              <div class="auth-field-group">
                <label class="auth-overlay-label">Conferma password</label>
                <div class="auth-password-wrap">
                  <input v-model="registerForm.password_confirmation" class="auth-overlay-input auth-overlay-input--password" :type="showRegisterPasswordConfirm ? 'text' : 'password'" autocomplete="new-password" placeholder="Ripeti la password" />
                  <button type="button" class="auth-password-toggle" tabindex="-1" @click="showRegisterPasswordConfirm = !showRegisterPasswordConfirm">
                    <svg v-if="showRegisterPasswordConfirm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor"><path d="M2,5.27L3.28,4L20,20.72L18.73,22L15.65,18.92C14.5,19.3 13.28,19.5 12,19.5C7,19.5 2.73,16.39 1,12C1.69,10.24 2.79,8.69 4.19,7.46L2,5.27M12,9A3,3 0 0,1 15,12C15,12.35 14.94,12.69 14.83,13L11,9.17C11.31,9.06 11.65,9 12,9M12,4.5C17,4.5 21.27,7.61 23,12C22.18,14.08 20.79,15.88 19,17.19L17.58,15.76C18.94,14.82 20.06,13.54 20.82,12C19.17,8.64 15.76,6.5 12,6.5C10.91,6.5 9.84,6.68 8.84,7.03L7.31,5.5C8.77,4.85 10.36,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C12.69,17.5 13.37,17.43 14,17.29L11.72,15C10.29,14.85 9.15,13.71 9,12.28L5.6,8.87C4.61,9.72 3.78,10.78 3.18,12Z"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor"><path d="M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C15.76,17.5 19.17,15.36 20.82,12C19.17,8.64 15.76,6.5 12,6.5C8.24,6.5 4.83,8.64 3.18,12Z"/></svg>
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              class="auth-overlay-submit"
              :disabled="isLoading"
              @click="handleRegister"
            >
              {{ isLoading ? 'Creazione account...' : 'Registrati' }}
            </button>
          </form>

          <!-- ===================== SOCIAL AUTH (below forms) ===================== -->
          <template v-if="!forgotMode && !verificationMode">
            <!-- Divider -->
            <div class="auth-overlay-divider-line" aria-hidden="true">
              <span>oppure continua con</span>
            </div>

            <!-- Google full-width -->
            <button
              type="button"
              :class="['auth-overlay-social-google', !authProviders.google && 'auth-overlay-social--disabled']"
              @click="startSocialAuth('google')"
            >
              <svg width="20" height="20" viewBox="0 0 48 48" class="flex-shrink-0">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              <span>Continua con Google</span>
            </button>

            <!-- Apple + Facebook 2-column grid -->
            <div class="auth-overlay-social-row">
              <button
                type="button"
                :class="['auth-overlay-social-apple', !authProviders.apple && 'auth-overlay-social--disabled']"
                @click="startSocialAuth('apple')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="flex-shrink-0">
                  <path d="M16.37 12.36c.02 2.14 1.88 2.85 1.9 2.86-.02.05-.3 1.04-1 2.07-.61.89-1.24 1.77-2.24 1.79-.98.02-1.3-.58-2.42-.58-1.12 0-1.48.56-2.4.6-.96.04-1.69-.96-2.3-1.85-1.25-1.81-2.2-5.13-.92-7.36.63-1.11 1.76-1.81 2.99-1.83.93-.02 1.81.63 2.42.63.61 0 1.74-.78 2.93-.66.5.02 1.91.2 2.81 1.51-.07.04-1.68.98-1.67 2.82Zm-2.04-5.05c.51-.62.85-1.48.75-2.34-.73.03-1.62.48-2.14 1.09-.47.54-.88 1.41-.77 2.25.81.06 1.64-.42 2.16-1Z"/>
                </svg>
                <span>Apple</span>
              </button>
              <button
                type="button"
                :class="['auth-overlay-social-facebook', !authProviders.facebook && 'auth-overlay-social--disabled']"
                @click="startSocialAuth('facebook')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" class="flex-shrink-0">
                  <path fill="currentColor" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.026 4.388 11.022 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.017 1.792-4.684 4.533-4.684 1.313 0 2.686.235 2.686.235v2.963H15.83c-1.491 0-1.956.927-1.956 1.879v2.27h3.328l-.532 3.49h-2.796V24C19.612 23.095 24 18.099 24 12.073z"/>
                </svg>
                <span>Facebook</span>
              </button>
            </div>
          </template>

        </div>
      </div>
    </template>
  </UModal>
</template>
