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

const modalUi = {
  overlay: 'bg-[#09131c]/38 backdrop-blur-[7px]',
  content: 'sf-modal-surface w-[calc(100vw-0.75rem)] max-w-[504px] max-h-[88vh] overflow-hidden border-0 rounded-[28px]',
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
        <div class="sr-only">
          <DialogTitle>Accedi o registrati</DialogTitle>
          <DialogDescription>
            Accedi o crea un account per continuare con spedizioni, salvataggi e checkout.
          </DialogDescription>
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[1.05rem] h-[1.05rem]" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
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
                  <svg v-if="showLoginPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[1rem] h-[1rem]" fill="currentColor"><path d="M2,5.27L3.28,4L20,20.72L18.73,22L15.65,18.92C14.5,19.3 13.28,19.5 12,19.5C7,19.5 2.73,16.39 1,12C1.69,10.24 2.79,8.69 4.19,7.46L2,5.27M12,9A3,3 0 0,1 15,12C15,12.35 14.94,12.69 14.83,13L11,9.17C11.31,9.06 11.65,9 12,9M12,4.5C17,4.5 21.27,7.61 23,12C22.18,14.08 20.79,15.88 19,17.19L17.58,15.76C18.94,14.82 20.06,13.54 20.82,12C19.17,8.64 15.76,6.5 12,6.5C10.91,6.5 9.84,6.68 8.84,7.03L7.31,5.5C8.77,4.85 10.36,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C12.69,17.5 13.37,17.43 14,17.29L11.72,15C10.29,14.85 9.15,13.71 9,12.28L5.6,8.87C4.61,9.72 3.78,10.78 3.18,12Z"/></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[1rem] h-[1rem]" fill="currentColor"><path d="M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C15.76,17.5 19.17,15.36 20.82,12C19.17,8.64 15.76,6.5 12,6.5C8.24,6.5 4.83,8.64 3.18,12Z"/></svg>
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
              <button type="button" :class="registerForm.user_type === 'privato' ? 'auth-segment auth-segment--active' : 'auth-segment'" @click="registerForm.user_type = 'privato'">Privato</button>
              <button type="button" :class="registerForm.user_type === 'commerciante' ? 'auth-segment auth-segment--active' : 'auth-segment'" @click="registerForm.user_type = 'commerciante'">Azienda</button>
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
                    <svg v-if="showRegisterPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[1rem] h-[1rem]" fill="currentColor"><path d="M2,5.27L3.28,4L20,20.72L18.73,22L15.65,18.92C14.5,19.3 13.28,19.5 12,19.5C7,19.5 2.73,16.39 1,12C1.69,10.24 2.79,8.69 4.19,7.46L2,5.27M12,9A3,3 0 0,1 15,12C15,12.35 14.94,12.69 14.83,13L11,9.17C11.31,9.06 11.65,9 12,9M12,4.5C17,4.5 21.27,7.61 23,12C22.18,14.08 20.79,15.88 19,17.19L17.58,15.76C18.94,14.82 20.06,13.54 20.82,12C19.17,8.64 15.76,6.5 12,6.5C10.91,6.5 9.84,6.68 8.84,7.03L7.31,5.5C8.77,4.85 10.36,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C12.69,17.5 13.37,17.43 14,17.29L11.72,15C10.29,14.85 9.15,13.71 9,12.28L5.6,8.87C4.61,9.72 3.78,10.78 3.18,12Z"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[1rem] h-[1rem]" fill="currentColor"><path d="M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C15.76,17.5 19.17,15.36 20.82,12C19.17,8.64 15.76,6.5 12,6.5C8.24,6.5 4.83,8.64 3.18,12Z"/></svg>
                  </button>
                </div>
              </div>
              <div class="auth-field-group">
                <label class="auth-field-label">Conferma password</label>
                <div class="auth-password-wrap">
                  <input v-model="registerForm.password_confirmation" class="auth-field-input auth-field-input--password" :type="showRegisterPasswordConfirm ? 'text' : 'password'" autocomplete="new-password" placeholder="Ripeti la password" />
                  <button type="button" class="auth-password-toggle" tabindex="-1" @click="showRegisterPasswordConfirm = !showRegisterPasswordConfirm">
                    <svg v-if="showRegisterPasswordConfirm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[1rem] h-[1rem]" fill="currentColor"><path d="M2,5.27L3.28,4L20,20.72L18.73,22L15.65,18.92C14.5,19.3 13.28,19.5 12,19.5C7,19.5 2.73,16.39 1,12C1.69,10.24 2.79,8.69 4.19,7.46L2,5.27M12,9A3,3 0 0,1 15,12C15,12.35 14.94,12.69 14.83,13L11,9.17C11.31,9.06 11.65,9 12,9M12,4.5C17,4.5 21.27,7.61 23,12C22.18,14.08 20.79,15.88 19,17.19L17.58,15.76C18.94,14.82 20.06,13.54 20.82,12C19.17,8.64 15.76,6.5 12,6.5C10.91,6.5 9.84,6.68 8.84,7.03L7.31,5.5C8.77,4.85 10.36,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C12.69,17.5 13.37,17.43 14,17.29L11.72,15C10.29,14.85 9.15,13.71 9,12.28L5.6,8.87C4.61,9.72 3.78,10.78 3.18,12Z"/></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[1rem] h-[1rem]" fill="currentColor"><path d="M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C15.76,17.5 19.17,15.36 20.82,12C19.17,8.64 15.76,6.5 12,6.5C8.24,6.5 4.83,8.64 3.18,12Z"/></svg>
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
<!-- CSS in assets/css/auth-overlay.css -->
