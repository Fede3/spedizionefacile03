<!--
  FILE: pages/autenticazione.vue
  SCOPO: Login/registrazione unificata — email/password, verifica 6 cifre, referral.

  API: POST /api/login (via useSanctumAuth), POST /api/custom-register,
       POST /api/verify-code, POST /api/resend-verification-email.
  COMPONENTI: AuthLoginForm, AuthRegisterForm, AuthVerificationForm.
  ROUTE: /autenticazione (middleware guest-auth, solo utenti non autenticati).

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
	description:
		'Accedi al tuo account SpediamoFacile o registrati gratuitamente per gestire le tue spedizioni, tracciare i pacchi e risparmiare sui corrieri.',
	ogDescription: 'Accedi o registrati su SpediamoFacile per gestire le tue spedizioni.',
});

definePageMeta({ layout: 'auth', middleware: ['guest-auth'] });

// Se l'utente arriva su /autenticazione, redirect alla home e apri l'overlay modale.
// Questo evita la pagina intera dedicata — l'auth viene mostrata come box sopra la pagina.
const { openAuthModal } = useAuthModal();
const route = useRoute();
const router = useRouter();
onMounted(() => {
	const tab = route.query.tab === 'register' ? 'register' : 'login';
	const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
	router.replace('/');
	nextTick(() => {
		openAuthModal({ tab, redirect });
	});
});

const {
	selectedAuthTab,
	onTabClick,
	credentials,
	messageError,
	messageSuccess,
	messageLoading,
	isLoading,
	showResendVerification,
	resendMessage,
	resendLoading,
	handleLogin,
	resendVerificationEmail,
	verificationMode,
	verificationCode,
	verificationLoading,
	verificationError,
	verificationSuccess,
	verificationCodeHint,
	resetVerificationFlow,
	verifyCode,
	handleVerificationInput,
	handleVerificationKeydown,
	handleVerificationPaste,
	resendCodeForVerification,
	registerForm,
	registerUser,
	passwordChecks,
	passwordStrength,
	showLoginPassword,
	showRegPassword,
	showRegPasswordConfirm,
	initAuth,
} = useAutenticazione();

const authShellState = computed(() =>
	selectedAuthTab.value === 'accedi'
		? {
				title: 'Bentornato',
				copy: 'Accedi per gestire le tue spedizioni',
			}
		: {
				title: 'Crea il tuo account',
				copy: 'Registrati per salvare indirizzi, spedizioni e dati utili al checkout.',
			},
);

const demoAccessCards = [
	{
		id: 'admin',
		title: 'Admin',
		caption: 'Accesso completo',
		email: 'admin@spediamofacile.it',
		password: 'Admin2026!',
		icon: 'shield',
	},
	{
		id: 'pro',
		title: 'Cliente Pro',
		caption: 'Funzioni avanzate',
		email: 'pro@spediamofacile.it',
		password: 'Partner2026!',
		icon: 'bolt',
	},
	{
		id: 'cliente',
		title: 'Cliente',
		caption: 'Account base',
		email: 'cliente@spediamofacile.it',
		password: 'Cliente2026!',
		icon: 'user',
	},
];

const onVerificationInput = (index, e) => {
	verificationCode.value[index] = e.target.value.replace(/\D/g, '');
	handleVerificationInput(index, e);
};

const applyDemoAccess = async (card) => {
	selectedAuthTab.value = 'accedi';
	Object.assign(credentials.value, {
		email: card.email,
		password: card.password,
		remember: true,
	});
	await handleLogin();
};

const backToLogin = () => {
	messageSuccess.value = null;
	selectedAuthTab.value = 'accedi';
};

const backToLoginFromVerification = () => {
	resetVerificationFlow();
	selectedAuthTab.value = 'accedi';
};

onMounted(async () => {
	await initAuth();
});
</script>

<template>
	<section class="auth-shell">
		<div class="my-container">
			<div class="auth-shell-frame">
				<header class="auth-shell-head">
					<div class="auth-shell-avatar" aria-hidden="true">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							class="auth-shell-avatar__icon"
							fill="none"
							stroke="currentColor"
							stroke-width="1.9"
							stroke-linecap="round"
							stroke-linejoin="round">
							<path d="M20 21a8 8 0 1 0-16 0" />
							<circle cx="12" cy="8" r="3.25" />
						</svg>
					</div>
					<h1 class="auth-shell-title">{{ authShellState.title }}</h1>
					<p class="auth-shell-copy">{{ authShellState.copy }}</p>
				</header>

				<div v-if="messageSuccess && !verificationMode" class="ux-alert ux-alert--success auth-shell-message">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						class="ux-alert__icon"
						fill="none"
						stroke="currentColor"
						stroke-width="1.9"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true">
						<path d="M20 6L9 17l-5-5" />
					</svg>
					<div class="auth-shell-message__body">
						<p class="ux-alert__title">{{ messageSuccess }}</p>
						<p class="auth-shell-message__copy">Accedi con le tue credenziali e completa il codice di verifica se richiesto.</p>
					</div>
					<button type="button" class="btn-secondary btn-compact auth-shell-message__action" @click="backToLogin">Torna al login</button>
				</div>

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
					@back="backToLoginFromVerification" />

				<div v-else class="auth-page-stack">
					<div class="auth-page-tabs" role="tablist" aria-label="Accesso o registrazione">
						<button
							type="button"
							role="tab"
							:aria-selected="selectedAuthTab === 'accedi' ? 'true' : 'false'"
							:class="selectedAuthTab === 'accedi' ? 'auth-page-tab auth-page-tab--active' : 'auth-page-tab'"
							@click="onTabClick('accedi')">
							Accedi
						</button>
						<button
							type="button"
							role="tab"
							:aria-selected="selectedAuthTab === 'registrati' ? 'true' : 'false'"
							:class="selectedAuthTab === 'registrati' ? 'auth-page-tab auth-page-tab--active' : 'auth-page-tab'"
							@click="onTabClick('registrati')">
							Registrati
						</button>
					</div>

					<div class="auth-page-card">
						<AuthLoginForm
							v-if="selectedAuthTab === 'accedi'"
							:credentials="credentials"
							:is-loading="isLoading"
							:show-login-password="showLoginPassword"
							:message-error="messageError"
							:message-loading="messageLoading"
							:show-resend-verification="showResendVerification"
							:resend-loading="resendLoading"
							:resend-message="resendMessage"
							:submit-handler="handleLogin"
							@update:show-login-password="showLoginPassword = $event"
							@resend-verification="resendVerificationEmail" />

						<AuthRegisterForm
							v-else
							:register-form="registerForm"
							:is-loading="isLoading"
							:show-reg-password="showRegPassword"
							:show-reg-password-confirm="showRegPasswordConfirm"
							:message-error="messageError"
							:message-loading="messageLoading"
							:password-checks="passwordChecks"
							:password-strength="passwordStrength"
							:submit-handler="registerUser"
							@update:show-reg-password="showRegPassword = $event"
							@update:show-reg-password-confirm="showRegPasswordConfirm = $event" />
					</div>

					<div v-if="selectedAuthTab === 'accedi'" class="auth-demo">
						<p class="auth-demo__label">Accesso rapido demo</p>
						<div class="auth-demo__grid">
							<button
								v-for="card in demoAccessCards"
								:key="card.id"
								type="button"
								class="auth-demo-card"
								:disabled="isLoading"
								@click="applyDemoAccess(card)">
								<span
									class="auth-demo-card__icon-shell"
									:class="`auth-demo-card__icon-shell--${card.icon}`"
									aria-hidden="true">
									<svg
										v-if="card.icon === 'shield'"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.9"
										stroke-linecap="round"
										stroke-linejoin="round">
										<path d="M12 3l7 3v6c0 4.25-2.69 7.8-7 9-4.31-1.2-7-4.75-7-9V6l7-3z" />
									</svg>
									<svg
										v-else-if="card.icon === 'bolt'"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.9"
										stroke-linecap="round"
										stroke-linejoin="round">
										<path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
									</svg>
									<svg
										v-else
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.9"
										stroke-linecap="round"
										stroke-linejoin="round">
										<path d="M20 21a8 8 0 1 0-16 0" />
										<circle cx="12" cy="8" r="3.25" />
									</svg>
								</span>
								<span class="auth-demo-card__title">{{ card.title }}</span>
								<span class="auth-demo-card__caption">{{ card.caption }}</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
