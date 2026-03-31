<!--
  FILE: pages/autenticazione.vue
  SCOPO: Login/registrazione unificata — email/password, Google OAuth, verifica 6 cifre, referral.

  API: POST /api/login (via useSanctumAuth), POST /api/custom-register,
       POST /api/verify-code, POST /api/resend-verification-email,
       GET /api/auth/google/redirect (redirect OAuth).
  COMPONENTI: UTabs, UForm (Nuxt UI).
  ROUTE: /autenticazione (middleware sanctum:guest, solo utenti non autenticati).

  DATI IN INGRESSO: ?ref=CODICE (codice referral pre-compilato), ?redirect=PATH (redirect post-login),
                    ?error=google_auth_failed (errore OAuth Google).
  DATI IN USCITA: login riuscito -> redirect automatico (gestito da nuxt-auth-sanctum).

  VINCOLI: il CSRF token e' gestito automaticamente da nuxt-auth-sanctum, NON manualmente.
           La verifica a 6 cifre e' obbligatoria per account non verificati (risposta 403).
  ERRORI TIPICI: chiamare manualmente /sanctum/csrf-cookie (causa doppio token e errori 419).
                 Non gestire il retry automatico su errore 419 (CSRF scaduto).
  PUNTI DI MODIFICA SICURI: testi form, stili bottoni, prefissi telefonici, requisiti password.
  COLLEGAMENTI: composables/useSession.js, stores/userStore.js, pages/recupera-password.vue.
-->
<script setup>
useSeoMeta({
	title: 'Accedi o Registrati | SpediamoFacile',
	ogTitle: 'Accedi o Registrati | SpediamoFacile',
	description: 'Accedi al tuo account SpediamoFacile o registrati gratuitamente per gestire le tue spedizioni, tracciare i pacchi e risparmiare sui corrieri.',
	ogDescription: 'Accedi o registrati su SpediamoFacile per gestire le tue spedizioni.',
});

definePageMeta({ layout: 'auth', middleware: ['sanctum:guest'] });

const {
	items, selectedAuthTab, onTabClick,
	credentials, messageError, messageSuccess, messageLoading,
	isLoading, showResendVerification, resendMessage, resendLoading,
	handleLogin, resendVerificationEmail,
	verificationMode, verificationCode, verificationLoading, verificationError,
	verificationSuccess, verificationCodeHint, resetVerificationFlow,
	verifyCode, handleVerificationInput, handleVerificationKeydown,
	handleVerificationPaste, resendCodeForVerification,
	registerForm, registerUser, passwordChecks, passwordStrength,
	showLoginPassword, showRegPassword, showRegPasswordConfirm,
	authProviders, socialAuthError, socialAuthErrorMessage, startSocialAuth,
	isAuthenticated,
	initAuth,
} = useAutenticazione();

onMounted(async () => {
	if (isAuthenticated.value) { navigateTo('/'); return; }
	await initAuth();
});
</script>

<template>
	<section class="min-h-[0] py-[18px] tablet:py-[28px] desktop:py-[36px]">
		<div class="my-container">
			<div class="mx-auto w-full max-w-[760px]">
				<!-- Success message -->
				<div v-if="messageSuccess && !verificationMode" class="bg-emerald-50 border border-emerald-200 p-[24px] rounded-[12px] text-[#252B42] text-center">
					<div class="w-[56px] h-[56px] mx-auto mb-[16px] bg-emerald-100 rounded-full flex items-center justify-center">
						<span class="text-emerald-600 text-[1.5rem] font-bold">&#10003;</span>
					</div>
					<p class="text-[1rem] font-medium">{{ messageSuccess }}</p>
					<p class="text-[0.875rem] text-[#737373] mt-[8px]">Accedi con le tue credenziali e inserisci il codice di verifica per attivare l'account.</p>
					<button @click="messageSuccess = null; selectedAuthTab = 'accedi'" class="mt-[16px] px-[24px] py-[10px] bg-[#095866] text-white rounded-[8px] text-[0.875rem] font-semibold cursor-pointer hover:bg-[#074a56] transition-colors">
						Torna al login
					</button>
				</div>

				<div v-else-if="verificationMode" class="bg-white p-[16px] tablet:p-[28px] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E9EBEC] text-[#252B42] mt-[24px]">
					<div class="text-center mb-[20px]">
						<div class="w-[56px] h-[56px] mx-auto mb-[16px] bg-[#095866]/10 rounded-full flex items-center justify-center">
							<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
						</div>
						<h3 class="text-[1.125rem] font-semibold text-[#252B42]">Verifica il tuo account</h3>
						<p class="text-[0.875rem] text-[#737373] mt-[8px]">Inserisci il codice di verifica a 6 cifre per verificare l'account <strong>{{ credentials.email }}</strong></p>
						<div v-if="verificationCodeHint" class="mt-[12px] bg-blue-50 border border-blue-200 rounded-[8px] p-[12px] text-center">
							<p class="text-[0.8125rem] text-blue-700 mb-[4px]">Il tuo codice di verifica:</p>
							<p class="text-[1.5rem] font-bold text-blue-800 tracking-[8px]">{{ verificationCodeHint }}</p>
						</div>
					</div>
					<div class="flex justify-center gap-[6px] tablet:gap-[8px] mb-[20px]" @paste="handleVerificationPaste">
						<input v-for="(digit, index) in verificationCode" :key="index" type="text" maxlength="1" inputmode="numeric" :value="verificationCode[index]" @input="(e) => { verificationCode[index] = e.target.value.replace(/\D/g, ''); handleVerificationInput(index, e); }" @keydown="(e) => handleVerificationKeydown(index, e)" class="w-[40px] h-[48px] tablet:w-[48px] tablet:h-[56px] text-center text-[1.125rem] tablet:text-[1.25rem] font-bold bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] focus:border-[#095866] focus:outline-none transition-colors focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
					</div>
					<p v-if="verificationError" class="text-red-500 text-[0.8125rem] mb-[12px] bg-red-50 p-[10px] rounded-[6px] text-center">{{ verificationError }}</p>
					<p v-if="verificationSuccess" class="text-emerald-600 text-[0.8125rem] mb-[12px] bg-emerald-50 p-[10px] rounded-[6px] text-center">{{ verificationSuccess }}</p>
					<button type="button" @click="verifyCode" :disabled="verificationLoading" :class="['w-full py-[14px] rounded-[50px] text-white font-semibold text-[1rem] transition-[background-color,transform]', verificationLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#095866] hover:bg-[#074a56] cursor-pointer']">
						<span v-if="verificationLoading">Verifica in corso...</span>
						<span v-else>Verifica Account</span>
					</button>
					<div class="flex items-center justify-between mt-[16px]">
						<button type="button" @click="resendCodeForVerification" :disabled="verificationLoading" class="text-[0.8125rem] text-[#095866] font-semibold hover:underline cursor-pointer disabled:opacity-60">Invia nuovo codice</button>
						<button type="button" @click="resetVerificationFlow(); selectedAuthTab = 'accedi'" class="text-[0.8125rem] text-[#737373] hover:underline cursor-pointer">Torna al login</button>
					</div>
				</div>

				<UTabs v-else class="auth-tabs" :items="items" :model-value="selectedAuthTab" @update:modelValue="onTabClick">
					<!-- LOGIN TAB -->
					<template #accedi>
						<div v-if="showResendVerification" class="bg-amber-50 border border-amber-200 p-[16px] rounded-[50px] text-[#252B42] mt-[24px] mb-[12px]">
							<p class="text-[0.9375rem] font-medium">Email non confermata. Ti reinviamo subito una nuova email di verifica.</p>
							<button
								type="button"
								@click="resendVerificationEmail"
								:disabled="resendLoading"
								class="mt-[12px] px-[16px] py-[10px] rounded-[8px] bg-[#095866] text-white text-[0.875rem] font-semibold cursor-pointer hover:bg-[#074a56] disabled:opacity-60 disabled:cursor-not-allowed">
								{{ resendLoading ? 'Invio in corso...' : 'Invia nuova email di conferma' }}
							</button>
							<p v-if="resendMessage" class="text-[0.8125rem] mt-[10px]" :class="resendMessage.type === 'success' ? 'text-emerald-700' : 'text-red-600'">{{ resendMessage.text }}</p>
						</div>
						<div class="mt-[24px]">
						<!-- Social auth error -->
						<div v-if="socialAuthError" class="bg-red-50 border border-red-200 rounded-[12px] p-[12px] mb-[16px] text-red-600 text-[0.875rem]">
							{{ socialAuthErrorMessage }}
						</div>

						<div class="social-auth-grid">
							<button
								type="button"
								@click="startSocialAuth('google')"
								:class="['social-auth-button social-auth-button--google', !authProviders.google ? 'social-auth-button--unavailable' : '']"
							>
								<span class="social-auth-button__icon" aria-hidden="true">
								<svg width="20" height="20" viewBox="0 0 48 48">
									<path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
									<path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
									<path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
									<path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
								</svg>
								</span>
								<span class="social-auth-button__text">Continua con Google</span>
							</button>
							<button
								type="button"
								@click="startSocialAuth('facebook')"
								:class="['social-auth-button social-auth-button--facebook', !authProviders.facebook ? 'social-auth-button--unavailable' : '']"
							>
								<span class="social-auth-button__icon" aria-hidden="true">
								<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
									<path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.026 4.388 11.022 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.017 1.792-4.684 4.533-4.684 1.313 0 2.686.235 2.686.235v2.963H15.83c-1.491 0-1.956.927-1.956 1.879v2.27h3.328l-.532 3.49h-2.796V24C19.612 23.095 24 18.099 24 12.073z"/>
								</svg>
								</span>
								<span class="social-auth-button__text">Continua con Facebook</span>
							</button>
							<button
								type="button"
								:class="['social-auth-button social-auth-button--apple', !authProviders.apple ? 'social-auth-button--unavailable' : '']"
								@click="startSocialAuth('apple')">
								<span class="social-auth-button__icon" aria-hidden="true">
									<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
										<path d="M16.37 12.36c.02 2.14 1.88 2.85 1.9 2.86-.02.05-.3 1.04-1 2.07-.61.89-1.24 1.77-2.24 1.79-.98.02-1.3-.58-2.42-.58-1.12 0-1.48.56-2.4.6-.96.04-1.69-.96-2.3-1.85-1.25-1.81-2.2-5.13-.92-7.36.63-1.11 1.76-1.81 2.99-1.83.93-.02 1.81.63 2.42.63.61 0 1.74-.78 2.93-.66.5.02 1.91.2 2.81 1.51-.07.04-1.68.98-1.67 2.82Zm-2.04-5.05c.51-.62.85-1.48.75-2.34-.73.03-1.62.48-2.14 1.09-.47.54-.88 1.41-.77 2.25.81.06 1.64-.42 2.16-1Z"/>
									</svg>
								</span>
								<span class="social-auth-button__text">Continua con Apple</span>
							</button>
						</div>

						<div class="flex items-center gap-[16px] my-[16px]">
							<div class="flex-1 h-[1px] bg-[#E0E0E0]"></div>
							<span class="text-[0.8125rem] text-[#999] font-medium">oppure</span>
							<div class="flex-1 h-[1px] bg-[#E0E0E0]"></div>
						</div>
					</div>

					<form @submit.prevent="handleLogin" class="bg-white p-[16px] tablet:p-[28px] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E9EBEC] text-[#252B42]">
							<div class="mb-[20px]">
								<label for="login_email" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Email</label>
								<input
									type="email"
									id="login_email"
									name="email"
									v-model="credentials.email"
									placeholder="La tua email"
									autocomplete="username"
									class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[8px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
									required />
							</div>

							<div class="mb-[20px]">
								<label for="login_password" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Password</label>
								<div class="relative">
									<input
										:type="showLoginPassword ? 'text' : 'password'"
										id="login_password"
										name="password"
										v-model="credentials.password"
										placeholder="La tua password"
										autocomplete="current-password"
										class="bg-[#F8F9FB] p-[12px] pr-[44px] border border-[#E9EBEC] rounded-[8px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
										required />
									<button type="button" @click="showLoginPassword = !showLoginPassword" class="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#A0A5AB] hover:text-[#252B42] cursor-pointer transition-colors" tabindex="-1">
										<svg v-if="!showLoginPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
										<svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
									</button>
								</div>
							</div>

							<p v-if="messageError?.email" class="text-red-500 text-[0.8125rem] mb-[12px] bg-red-50 p-[10px] rounded-[6px]">
								{{ Array.isArray(messageError.email) ? messageError.email[0] : messageError.email }}
							</p>

							<p v-if="messageError?.message" class="text-red-500 text-[0.8125rem] mb-[12px] bg-red-50 p-[10px] rounded-[6px]">
								{{ messageError.message }}
							</p>

							<div class="flex items-center gap-[10px] mb-[20px]">
								<input type="checkbox" id="remember" v-model="credentials.remember" class="w-[18px] h-[18px] accent-[#095866] cursor-pointer shrink-0" />
								<label for="remember" class="text-[0.875rem] text-[#737373] cursor-pointer select-none">Ricordami</label>
							</div>

							<button
								type="submit"
								:disabled="isLoading"
								:class="[
									'w-full py-[14px] rounded-[50px] text-white font-semibold text-[1rem] transition-[background-color,transform]',
									isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#095866] hover:bg-[#074a56] cursor-pointer',
								]">
								<span v-if="isLoading">Accesso in corso...</span>
								<span v-else>Accedi</span>
							</button>

							<p class="text-center mt-[20px] text-[0.8125rem] text-[#737373]">
								Hai dimenticato la password?
								<NuxtLink to="/recupera-password" class="text-[#095866] font-semibold hover:underline">Recupera Password</NuxtLink>
							</p>

							<p v-if="messageLoading" class="text-center mt-[16px] text-[0.875rem] text-[#095866]">
								{{ messageLoading }}
							</p>
						</form>
					</template>

					<!-- REGISTRATION TAB -->
					<template #registrati>
						<div class="mt-[24px]">
							<!-- Social auth error -->
							<div v-if="socialAuthError" class="bg-red-50 border border-red-200 rounded-[12px] p-[12px] mb-[16px] text-red-600 text-[0.875rem]">
								{{ socialAuthErrorMessage }}
							</div>

						<div class="social-auth-grid">
								<button
									type="button"
									@click="startSocialAuth('google')"
									:class="['social-auth-button social-auth-button--google', !authProviders.google ? 'social-auth-button--unavailable' : '']"
								>
									<span class="social-auth-button__icon" aria-hidden="true">
									<svg width="20" height="20" viewBox="0 0 48 48">
										<path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
										<path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
										<path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
										<path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
									</svg>
									</span>
									<span class="social-auth-button__text">Continua con Google</span>
								</button>
								<button
									type="button"
									@click="startSocialAuth('facebook')"
									:class="['social-auth-button social-auth-button--facebook', !authProviders.facebook ? 'social-auth-button--unavailable' : '']"
								>
									<span class="social-auth-button__icon" aria-hidden="true">
									<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
										<path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.026 4.388 11.022 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.017 1.792-4.684 4.533-4.684 1.313 0 2.686.235 2.686.235v2.963H15.83c-1.491 0-1.956.927-1.956 1.879v2.27h3.328l-.532 3.49h-2.796V24C19.612 23.095 24 18.099 24 12.073z"/>
									</svg>
									</span>
									<span class="social-auth-button__text">Continua con Facebook</span>
								</button>
								<button
									type="button"
									:class="['social-auth-button social-auth-button--apple', !authProviders.apple ? 'social-auth-button--unavailable' : '']"
									@click="startSocialAuth('apple')">
									<span class="social-auth-button__icon" aria-hidden="true">
										<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
											<path d="M16.37 12.36c.02 2.14 1.88 2.85 1.9 2.86-.02.05-.3 1.04-1 2.07-.61.89-1.24 1.77-2.24 1.79-.98.02-1.3-.58-2.42-.58-1.12 0-1.48.56-2.4.6-.96.04-1.69-.96-2.3-1.85-1.25-1.81-2.2-5.13-.92-7.36.63-1.11 1.76-1.81 2.99-1.83.93-.02 1.81.63 2.42.63.61 0 1.74-.78 2.93-.66.5.02 1.91.2 2.81 1.51-.07.04-1.68.98-1.67 2.82Zm-2.04-5.05c.51-.62.85-1.48.75-2.34-.73.03-1.62.48-2.14 1.09-.47.54-.88 1.41-.77 2.25.81.06 1.64-.42 2.16-1Z"/>
										</svg>
									</span>
									<span class="social-auth-button__text">Continua con Apple</span>
								</button>
							</div>

							<div class="flex items-center gap-[16px] my-[16px]">
								<div class="flex-1 h-[1px] bg-[#E0E0E0]"></div>
								<span class="text-[0.8125rem] text-[#999] font-medium">oppure</span>
								<div class="flex-1 h-[1px] bg-[#E0E0E0]"></div>
							</div>
						</div>

						<UForm :state="registerForm" @submit.prevent="registerUser">
							<!-- Role selector -->
							<div class="flex items-center gap-[12px] justify-center mb-[20px]">
								<label
									:class="[
										'flex items-center gap-[8px] px-[20px] py-[12px] rounded-[50px] cursor-pointer border transition-[background-color,color,border-color] text-[0.9375rem] font-medium',
										registerForm.role === 'Cliente'
											? 'bg-[#095866] text-white border-[#095866] shadow-sm'
											: 'bg-white text-[#252B42] border-[#E9EBEC] hover:border-[#095866]',
									]">
									<input type="radio" value="Cliente" v-model="registerForm.role" class="sr-only" />
									Cliente
								</label>
								<label
									:class="[
										'flex items-center gap-[8px] px-[20px] py-[12px] rounded-[50px] cursor-pointer border transition-[background-color,color,border-color] text-[0.9375rem] font-medium',
										registerForm.role === 'Partner Pro'
											? 'bg-[#095866] text-white border-[#095866] shadow-sm'
											: 'bg-white text-[#252B42] border-[#E9EBEC] hover:border-[#095866]',
									]">
									<input type="radio" value="Partner Pro" v-model="registerForm.role" class="sr-only" />
									Partner Pro
								</label>
							</div>

							<div class="bg-white p-[16px] tablet:p-[28px] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E9EBEC]">
								<!-- Tipo account: Privato o Azienda -->
								<div class="flex items-center gap-[12px] mb-[20px]">
									<label
										:class="[
											'flex-1 flex items-center justify-center gap-[6px] px-[16px] py-[12px] rounded-[50px] cursor-pointer border transition-[background-color,color,border-color] text-[0.9375rem] font-medium text-center',
											registerForm.user_type === 'privato'
												? 'bg-[#095866] text-white border-[#095866] shadow-sm'
												: 'bg-white text-[#252B42] border-[#E9EBEC] hover:border-[#095866]',
										]">
										<input type="radio" value="privato" v-model="registerForm.user_type" class="sr-only" />
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></svg>
										Privato
									</label>
									<label
										:class="[
											'flex-1 flex items-center justify-center gap-[6px] px-[16px] py-[12px] rounded-[50px] cursor-pointer border transition-[background-color,color,border-color] text-[0.9375rem] font-medium text-center',
											registerForm.user_type === 'commerciante'
												? 'bg-[#095866] text-white border-[#095866] shadow-sm'
												: 'bg-white text-[#252B42] border-[#E9EBEC] hover:border-[#095866]',
										]">
										<input type="radio" value="commerciante" v-model="registerForm.user_type" class="sr-only" />
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M18,15H16V17H18M18,11H16V13H18M20,19H12V17H14V15H12V13H14V11H12V9H20M10,7H8V5H10M10,11H8V9H10M10,15H8V13H10M10,19H8V17H10M6,7H4V5H6M6,11H4V9H6M6,15H4V13H6M6,19H4V17H6M12,7V3H2V21H22V7H12Z"/></svg>
										Azienda
									</label>
								</div>

								<div class="grid grid-cols-1 mobile:grid-cols-2 gap-[12px] mb-[16px]">
									<div>
										<label for="reg_name" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Nome *</label>
										<input
											type="text"
											id="reg_name"
											v-model="registerForm.name"
											placeholder="Il tuo nome"
											class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[8px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
											required />
									</div>
									<div>
										<label for="reg_surname" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Cognome *</label>
										<input
											type="text"
											id="reg_surname"
											v-model="registerForm.surname"
											placeholder="Il tuo cognome"
											class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[8px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
											required />
									</div>
								</div>

								<p v-if="messageError?.name" class="text-red-500 text-[0.8125rem] mb-[8px]">{{ messageError.name[0] }}</p>
								<p v-if="messageError?.surname" class="text-red-500 text-[0.8125rem] mb-[8px]">{{ messageError.surname[0] }}</p>

								<div class="mb-[16px]">
									<label for="reg_telephone" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Telefono *</label>
									<div class="flex gap-[8px]">
										<select v-model="registerForm.prefix" id="reg_prefix" class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[8px] text-[0.9375rem] w-[120px] focus:border-[#095866] focus:outline-none">
											<option value="+39">+39 IT</option>
											<option value="+49">+49 DE</option>
										</select>
										<input
											type="tel"
											id="reg_telephone"
											placeholder="Numero di telefono"
											v-model="registerForm.telephone_number"
											class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[8px] placeholder:text-[#A0A5AB] flex-1 text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
											required />
									</div>
								</div>

								<p v-if="messageError?.telephone_number" class="text-red-500 text-[0.8125rem] mb-[8px]">{{ messageError.telephone_number[0] }}</p>

								<div class="mb-[16px]">
									<label for="reg_email" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Email *</label>
									<input
										type="email"
										id="reg_email"
										placeholder="La tua email"
										v-model="registerForm.email"
										class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[8px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
										required />
								</div>

								<div class="mb-[16px]">
									<label for="reg_email_confirmation" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Conferma Email *</label>
									<input
										type="email"
										id="reg_email_confirmation"
										placeholder="Conferma la tua email"
										v-model="registerForm.email_confirmation"
										class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[8px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
										required />
								</div>

								<p v-if="messageError?.email" class="text-red-500 text-[0.8125rem] mb-[8px] bg-red-50 p-[8px] rounded-[6px]">
									{{ Array.isArray(messageError.email) ? messageError.email[0] : messageError.email }}
								</p>

								<div class="mb-[16px]">
									<label for="reg_password" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Password *</label>
									<div class="relative">
										<input
											:type="showRegPassword ? 'text' : 'password'"
											id="reg_password"
											placeholder="Minimo 8 caratteri"
											v-model="registerForm.password"
											@change="registerForm.password = $event.target.value"
											autocomplete="new-password"
											class="bg-[#F8F9FB] p-[12px] pr-[44px] border border-[#E9EBEC] rounded-[8px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
											minlength="8"
											required />
										<button type="button" @click="showRegPassword = !showRegPassword" class="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#A0A5AB] hover:text-[#252B42] cursor-pointer transition-colors" tabindex="-1">
											<svg v-if="!showRegPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
											<svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
										</button>
									</div>
									<!-- Password strength indicator -->
									<div v-if="registerForm.password" class="mt-[8px]">
										<div class="flex gap-[4px] mb-[6px]">
											<div v-for="i in 5" :key="i" class="h-[3px] flex-1 rounded-full transition-[background-color]" :class="passwordStrength >= i ? (passwordStrength <= 2 ? 'bg-red-400' : passwordStrength <= 3 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-[#E9EBEC]'"></div>
										</div>
										<ul class="space-y-[2px]">
											<li class="text-[0.75rem] flex items-center gap-[4px]" :class="passwordChecks.minLength ? 'text-emerald-600' : 'text-[#A0A5AB]'">
												<span>{{ passwordChecks.minLength ? '\u2713' : '\u2022' }}</span> Minimo 8 caratteri
											</li>
											<li class="text-[0.75rem] flex items-center gap-[4px]" :class="passwordChecks.hasLower ? 'text-emerald-600' : 'text-[#A0A5AB]'">
												<span>{{ passwordChecks.hasLower ? '\u2713' : '\u2022' }}</span> Una lettera minuscola
											</li>
											<li class="text-[0.75rem] flex items-center gap-[4px]" :class="passwordChecks.hasUpper ? 'text-emerald-600' : 'text-[#A0A5AB]'">
												<span>{{ passwordChecks.hasUpper ? '\u2713' : '\u2022' }}</span> Una lettera maiuscola
											</li>
											<li class="text-[0.75rem] flex items-center gap-[4px]" :class="passwordChecks.hasNumber ? 'text-emerald-600' : 'text-[#A0A5AB]'">
												<span>{{ passwordChecks.hasNumber ? '\u2713' : '\u2022' }}</span> Un numero
											</li>
											<li class="text-[0.75rem] flex items-center gap-[4px]" :class="passwordChecks.hasSymbol ? 'text-emerald-600' : 'text-[#A0A5AB]'">
												<span>{{ passwordChecks.hasSymbol ? '\u2713' : '\u2022' }}</span> Un simbolo speciale (es. @!#.-_)
											</li>
										</ul>
									</div>
								</div>

								<div class="mb-[8px]">
									<label for="reg_password_confirmation" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Conferma Password *</label>
									<div class="relative">
										<input
											:type="showRegPasswordConfirm ? 'text' : 'password'"
											id="reg_password_confirmation"
											placeholder="Ripeti la password"
											v-model="registerForm.password_confirmation"
											@change="registerForm.password_confirmation = $event.target.value"
											autocomplete="new-password"
											class="bg-[#F8F9FB] p-[12px] pr-[44px] border border-[#E9EBEC] rounded-[8px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
											minlength="8"
											required />
										<button type="button" @click="showRegPasswordConfirm = !showRegPasswordConfirm" class="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#A0A5AB] hover:text-[#252B42] cursor-pointer transition-colors" tabindex="-1">
											<svg v-if="!showRegPasswordConfirm" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
											<svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
										</button>
									</div>
								</div>

								<p v-if="messageError?.password" class="text-red-500 text-[0.8125rem] mb-[8px] bg-red-50 p-[8px] rounded-[6px]">
									<span v-for="(error, index) in messageError.password" :key="index" class="block">
										{{ error }}
									</span>
								</p>

								<!-- Referral code (shown when arriving from referral link) -->
								<div v-if="registerForm.referred_by" class="bg-emerald-50 border border-emerald-200 p-[12px] rounded-[8px] mt-[8px]">
									<p class="text-[0.8125rem] text-emerald-700 font-medium">Codice referral applicato: <strong>{{ registerForm.referred_by }}</strong></p>
									<p class="text-[0.75rem] text-emerald-600 mt-[4px]">Riceverai uno sconto del 5% su tutte le spedizioni!</p>
								</div>
								<p v-if="messageError?.referred_by" class="text-red-500 text-[0.8125rem] mb-[8px]">{{ messageError.referred_by[0] }}</p>
							</div>

							<button
								type="submit"
								:disabled="isLoading"
								:class="[
									'w-full py-[14px] rounded-[50px] text-white font-semibold text-[1rem] mt-[20px] transition-[background-color,transform]',
									isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#095866] hover:bg-[#074a56] cursor-pointer',
								]">
								<span v-if="isLoading">Registrazione in corso...</span>
								<span v-else>Crea Account</span>
							</button>

							<p v-if="messageLoading" class="text-center mt-[12px] text-[0.875rem] text-[#095866]">
								{{ messageLoading }}
							</p>
						</UForm>
					</template>
				</UTabs>
			</div>
		</div>
	</section>
</template>

<style scoped>
.auth-tabs :deep([data-slot='list']) {
	background: #eef5f7;
	padding: 0.22rem;
	border-radius: 0.95rem;
}

.auth-tabs :deep([data-slot='indicator']) {
	display: none;
}

.auth-tabs :deep([data-slot='trigger']) {
	min-height: 2.6rem;
	font-size: 0.975rem;
	font-weight: 600;
	color: #58727b;
	border-radius: 0.72rem;
	transition: background-color 160ms ease, color 160ms ease;
}

.auth-tabs :deep([data-slot='trigger'][data-state='active']) {
	background: #095866;
	color: #ffffff;
}

.auth-tabs :deep([data-slot='trigger'][data-state='inactive']) {
	color: #58727b;
}

.social-auth-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.8rem;
	align-items: stretch;
}

.social-auth-button {
	display: inline-flex;
	align-items: center;
	justify-content: flex-start;
	gap: 0.72rem;
	width: 100%;
	min-height: 3.28rem;
	padding: 0.85rem 1.1rem;
	border-radius: 0.95rem;
	border: 1px solid #d9e3e7;
	background: #ffffff;
	color: #252b42;
	font-size: 0.94rem;
	font-weight: 700;
	line-height: 1.2;
	text-decoration: none;
	cursor: pointer;
	transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}

.social-auth-button:hover {
	background: #fbfdfe;
	box-shadow: 0 8px 18px rgba(37, 43, 66, 0.06);
}

.social-auth-button:focus-visible {
	outline: none;
	border-color: #095866;
	box-shadow: 0 0 0 3px rgba(9, 88, 102, 0.12);
}

.social-auth-button__icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	width: 1.42rem;
	height: 1.42rem;
}

.social-auth-button__text {
	min-width: 0;
	flex: 0 1 auto;
	text-align: left;
	white-space: nowrap;
}

.social-auth-button--google:hover {
	border-color: rgba(66, 133, 244, 0.38);
}

.social-auth-button--facebook:hover {
	border-color: rgba(24, 119, 242, 0.4);
}

.social-auth-button--apple {
	color: #111827;
}

.social-auth-button--unavailable {
	opacity: 0.62;
	background: #fbfcfd;
	border-color: #e5ecef;
}

.social-auth-button--unavailable:hover {
	background: #fbfcfd;
	box-shadow: none;
}

@media (max-width: 47.99rem) {
	.social-auth-grid {
		grid-template-columns: 1fr;
	}
}
</style>
