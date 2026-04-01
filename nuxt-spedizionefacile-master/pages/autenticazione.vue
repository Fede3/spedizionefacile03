<!--
  FILE: pages/autenticazione.vue
  SCOPO: Login/registrazione unificata — email/password, Google OAuth, verifica 6 cifre, referral.

  API: POST /api/login (via useSanctumAuth), POST /api/custom-register,
       POST /api/verify-code, POST /api/resend-verification-email,
       GET /api/auth/google/redirect (redirect OAuth).
  COMPONENTI: UTabs, AuthSocialButtons, AuthLoginForm, AuthRegisterForm, AuthVerificationForm.
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

definePageMeta({ layout: 'default', middleware: ['sanctum:guest'] });

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

const onVerificationInput = (index, e) => {
	verificationCode.value[index] = e.target.value.replace(/\D/g, '');
	handleVerificationInput(index, e);
};

onMounted(async () => {
	await initAuth();
});
</script>

<template>
	<section class="min-h-[0] py-[18px] tablet:py-[28px] desktop:py-[36px]">
		<div class="my-container">
			<div class="mx-auto w-full max-w-[520px] bg-white rounded-[28px] border border-[#E9EBEC] shadow-sm p-[24px] sm:p-[32px] auth-box">
				<!-- Success message -->
				<div v-if="messageSuccess && !verificationMode" class="bg-emerald-50 border border-emerald-200 p-[24px] rounded-[12px] text-[#252B42] text-center">
					<div class="w-[56px] h-[56px] mx-auto mb-[16px] bg-emerald-100 rounded-full flex items-center justify-center">
						<span class="text-emerald-600 text-[1.5rem] font-bold">&#10003;</span>
					</div>
					<p class="text-[1rem] font-medium">{{ messageSuccess }}</p>
					<p class="text-[0.875rem] text-[#737373] mt-[8px]">Accedi con le tue credenziali e inserisci il codice di verifica per attivare l'account.</p>
					<button @click="messageSuccess = null; selectedAuthTab = 'accedi'" class="btn-primary mt-[16px] text-[0.875rem]">
						Torna al login
					</button>
				</div>

				<!-- Verification mode -->
				<AuthVerificationForm
					v-if="verificationMode"
					:email="credentials.email"
					:verification-code="verificationCode"
					:verification-code-hint="verificationCodeHint"
					:verification-error="verificationError"
					:verification-success="verificationSuccess"
					:verification-loading="verificationLoading"
					@input="onVerificationInput"
					@keydown="handleVerificationKeydown"
					@paste="handleVerificationPaste"
					@verify="verifyCode"
					@resend="resendCodeForVerification"
					@back="resetVerificationFlow(); selectedAuthTab = 'accedi'"
				/>

				<!-- Tabs: Login / Register -->
				<UTabs v-else class="auth-tabs" :items="items" :model-value="selectedAuthTab" @update:modelValue="onTabClick">
					<template #accedi>
						<AuthSocialButtons
							:auth-providers="authProviders"
							:social-auth-error="socialAuthError"
							:social-auth-error-message="socialAuthErrorMessage"
							@social-auth="startSocialAuth"
						/>
						<AuthLoginForm
							:credentials="credentials"
							:is-loading="isLoading"
							:show-login-password="showLoginPassword"
							:message-error="messageError"
							:message-loading="messageLoading"
							:show-resend-verification="showResendVerification"
							:resend-loading="resendLoading"
							:resend-message="resendMessage"
							@submit="handleLogin"
							@update:show-login-password="showLoginPassword = $event"
							@resend-verification="resendVerificationEmail"
						/>
					</template>

					<template #registrati>
						<AuthSocialButtons
							:auth-providers="authProviders"
							:social-auth-error="socialAuthError"
							:social-auth-error-message="socialAuthErrorMessage"
							@social-auth="startSocialAuth"
						/>
						<AuthRegisterForm
							:register-form="registerForm"
							:is-loading="isLoading"
							:show-reg-password="showRegPassword"
							:show-reg-password-confirm="showRegPasswordConfirm"
							:message-error="messageError"
							:message-loading="messageLoading"
							:password-checks="passwordChecks"
							:password-strength="passwordStrength"
							@submit="registerUser"
							@update:show-reg-password="showRegPassword = $event"
							@update:show-reg-password-confirm="showRegPasswordConfirm = $event"
						/>
					</template>
				</UTabs>
			</div>
		</div>
	</section>
</template>
