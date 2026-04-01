/**
 * useAutenticazione.js
 * Composable per la pagina di autenticazione (login, registrazione, verifica codice, social auth).
 *
 * API usate:
 *   POST /api/login (via useSanctumAuth)
 *   POST /api/custom-register
 *   POST /api/verify-code
 *   POST /api/resend-verification-email
 *   GET  /api/auth/{provider}/redirect
 *
 * Dipendenze: useSanctumAuth, useSanctumClient, useAuthUiSnapshotPersistence, useAuthProviders.
 */
import { useAuthUiSnapshotPersistence } from '~/composables/useAuthUiSnapshotPersistence';

export function useAutenticazione() {
	const sanctum = useSanctumClient();
	const { isAuthenticated, refreshIdentity } = useSanctumAuth();
	const { persistSnapshotFromUser } = useAuthUiSnapshotPersistence();
	const { authProviders, refreshAuthProviders } = useAuthProviders();
	const route = useRoute();
	const requestUrl = useRequestURL();
	const sanitizeRedirect = (redirect) => {
		if (!redirect || typeof redirect !== 'string') return '/account';
		return redirect.startsWith('/') ? redirect : '/account';
	};
	const finalizeAuth = async (responseUser) => {
		const redirectTarget = sanitizeRedirect(String(route.query.redirect || '/account'));
		persistSnapshotFromUser(responseUser?.user || responseUser);
		try {
			await refreshIdentity();
		} catch {
			// Dopo login riuscito non blocchiamo il redirect per un refresh identità in ritardo.
		}
		try {
			await refreshNuxtData();
		} catch {
			// Il redirect duro ricostruisce comunque la pagina con i cookie aggiornati.
		}
		if (import.meta.client) {
			window.location.assign(redirectTarget);
			return;
		}
		return navigateTo(redirectTarget);
	};

	// ── Tab state ──
	const items = ref([
		{ label: 'Accedi', icon: '', slot: 'accedi', value: 'accedi', disabled: false },
		{ label: 'Registrati', icon: '', slot: 'registrati', value: 'registrati', disabled: false },
	]);

	const refCode = route.query.ref;
	const defaultTabValue = refCode ? 'registrati' : 'accedi';
	const selectedAuthTab = ref(defaultTabValue);

	// ── Login state ──
	const credentials = ref({ email: '', password: '', remember: false });
	const messageError = ref(null);
	const limitMessageError = ref(null);
	const messageSuccess = ref(null);
	const messageLoading = ref(null);
	const isLoading = ref(false);
	const isGoogle = ref(false);
	const showResendVerification = ref(false);
	const resendMessage = ref(null);
	const resendLoading = ref(false);

	// ── Verification state ──
	const verificationMode = ref(false);
	const verificationCode = ref(['', '', '', '', '', '']);
	const verificationLoading = ref(false);
	const verificationError = ref(null);
	const verificationSuccess = ref(null);
	const verificationCodeHint = ref(null);

	const resetVerificationFlow = () => {
		verificationMode.value = false;
		verificationCode.value = ['', '', '', '', '', ''];
		verificationLoading.value = false;
		verificationError.value = null;
		verificationSuccess.value = null;
		verificationCodeHint.value = null;
	};

	const openVerificationFlow = ({ email = '', password = '', remember = false, successMessage = null, codeHint = null } = {}) => {
		credentials.value.email = email;
		credentials.value.password = password;
		credentials.value.remember = remember;
		verificationMode.value = true;
		verificationCode.value = ['', '', '', '', '', ''];
		verificationLoading.value = false;
		verificationError.value = null;
		verificationSuccess.value = successMessage;
		verificationCodeHint.value = codeHint;
		messageError.value = null;
		messageSuccess.value = null;
		showResendVerification.value = false;
		resendMessage.value = null;
		selectedAuthTab.value = 'accedi';
	};

	// ── CSRF (no-op, gestito da nuxt-auth-sanctum) ──
	const refreshCsrf = async () => {};

	// ── Login handler ──
	const handleLogin = async (isRetry = false) => {
		let loginCompleted = false;
		messageError.value = null;
		showResendVerification.value = false;
		resendMessage.value = null;

		if (!credentials.value.email || !credentials.value.password) {
			messageError.value = { email: ['Inserisci email e password.'] };
			return;
		}

		if (!isGoogle.value) {
			messageLoading.value = isRetry ? 'Riconnessione in corso...' : 'Login in corso...';
		}
		isLoading.value = true;

		if (!isRetry) await refreshCsrf();

		try {
			const response = await sanctum('/api/custom-login', {
				method: 'POST',
				body: {
					email: credentials.value.email,
					password: credentials.value.password,
					remember: credentials.value.remember,
				},
			});
			items.value.forEach((item) => { item.disabled = true; });
			await finalizeAuth(response);
			loginCompleted = true;
		} catch (error) {
			const status = error?.response?.status || error?.statusCode;
			const data = error?.response?._data || error?.data;

			if (status === 403 && data?.requires_verification) {
				const msg = data?.message || '';
				const codeMatch = msg.match(/Codice:\s*(\d{6})/);
				openVerificationFlow({
					email: credentials.value.email,
					password: credentials.value.password,
					remember: credentials.value.remember,
					codeHint: codeMatch ? codeMatch[1] : null,
				});
			} else if (status === 419 && !isRetry) {
				await refreshCsrf();
				return handleLogin(true);
			} else if (status === 422) {
				messageError.value = data?.errors || { email: ['Credenziali non valide.'] };
			} else if (status === 401) {
				const message = data?.message || 'Credenziali non corrette.';
				messageError.value = data?.errors || data || { email: [message] };
				if (String(message).toLowerCase().includes('verifica')) {
					showResendVerification.value = true;
				}
			} else if (status === 429) {
				messageError.value = { email: ['Troppi tentativi. Riprova tra qualche minuto.'] };
			} else if (status === 419) {
				messageError.value = { email: ['Errore di sessione. Svuota la cache del browser e riprova.'] };
			} else if (status >= 500) {
				messageError.value = { email: ['Errore del server. Riprova tra poco.'] };
			} else {
				messageError.value = { email: ['Errore di connessione. Verifica che il server sia attivo e riprova.'] };
			}
		} finally {
			if (!loginCompleted) {
				messageLoading.value = null;
				isLoading.value = false;
			}
		}
	};

	// ── Resend verification email ──
	const resendVerificationEmail = async () => {
		resendMessage.value = null;
		showResendVerification.value = true;
		if (!credentials.value.email) {
			resendMessage.value = { type: 'error', text: 'Inserisci prima la tua email nel campo login.' };
			return;
		}
		resendLoading.value = true;
		try {
			const sanctum = useSanctumClient();
			const response = await sanctum('/api/resend-verification-email', { method: 'POST', body: { email: credentials.value.email } });
			resendMessage.value = { type: 'success', text: response?.message || 'Email inviata con successo.' };
		} catch (error) {
			const data = error?.response?._data || error?.data;
			resendMessage.value = { type: 'error', text: data?.message || "Errore durante l'invio. Riprova." };
		} finally {
			resendLoading.value = false;
		}
	};

	// ── Verify 6-digit code ──
	const verifyCode = async () => {
		const code = verificationCode.value.join('');
		if (code.length !== 6) {
			verificationError.value = 'Inserisci il codice completo a 6 cifre.';
			return;
		}
		verificationLoading.value = true;
		verificationError.value = null;

		try {
			const sanctum = useSanctumClient();
			const response = await sanctum('/api/verify-code', {
				method: 'POST',
				body: { email: credentials.value.email, password: credentials.value.password, code, remember: credentials.value.remember },
			});

			verificationMode.value = false;
			messageLoading.value = 'Account verificato! Accesso in corso...';
			isLoading.value = true;

			try {
				await finalizeAuth(response);
			} catch {
				messageSuccess.value = response?.message || 'Account verificato con successo! Ora puoi accedere.';
				isLoading.value = false;
				messageLoading.value = null;
			}
		} catch (error) {
			const data = error?.response?._data || error?.data;
			verificationError.value = data?.message || 'Codice non valido. Riprova.';
		} finally {
			verificationLoading.value = false;
		}
	};

	// ── Verification input helpers ──
	const handleVerificationInput = (index, event) => {
		const value = event.target.value;
		if (value && index < 5) {
			const nextInput = event.target.parentElement.querySelector(`input:nth-child(${index + 2})`);
			if (nextInput) nextInput.focus();
		}
	};

	const handleVerificationKeydown = (index, event) => {
		if (event.key === 'Backspace' && !verificationCode.value[index] && index > 0) {
			const prevInput = event.target.parentElement.querySelector(`input:nth-child(${index})`);
			if (prevInput) prevInput.focus();
		}
	};

	const handleVerificationPaste = (event) => {
		event.preventDefault();
		const paste = (event.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
		for (let i = 0; i < 6; i++) {
			verificationCode.value[i] = paste[i] || '';
		}
	};

	const resendCodeForVerification = async () => {
		verificationError.value = null;
		verificationLoading.value = true;
		try {
			const sanctum = useSanctumClient();
			const response = await sanctum('/api/resend-verification-email', { method: 'POST', body: { email: credentials.value.email } });
			verificationError.value = null;
			const resendMsg = response?.message || 'Nuovo codice inviato!';
			verificationSuccess.value = resendMsg;
			const resendCodeMatch = resendMsg.match(/(\d{6})/);
			if (resendCodeMatch) verificationCodeHint.value = resendCodeMatch[1];
		} catch (error) {
			const data = error?.response?._data || error?.data;
			verificationError.value = data?.message || "Errore nell'invio del codice. Riprova.";
		} finally {
			verificationLoading.value = false;
		}
	};

	// ── Password strength (registration) ──
	const registerForm = ref({
		name: '', surname: '', email: '', email_confirmation: '',
		prefix: '+39', telephone_number: '',
		password: '', password_confirmation: '',
		role: 'Cliente', referred_by: '', user_type: 'privato',
	});

	if (refCode) registerForm.value.referred_by = String(refCode).toUpperCase();

	const passwordChecks = computed(() => {
		const pwd = registerForm.value.password || '';
		return {
			minLength: pwd.length >= 8,
			hasLower: /[a-z]/.test(pwd),
			hasUpper: /[A-Z]/.test(pwd),
			hasNumber: /[0-9]/.test(pwd),
			hasSymbol: /[^a-zA-Z0-9\s]/.test(pwd),
		};
	});

	const passwordStrength = computed(() => Object.values(passwordChecks.value).filter(Boolean).length);

	// ── Register handler ──
	const registerUser = async (isRetry = false) => {
		messageError.value = null;
		messageSuccess.value = null;
		showResendVerification.value = false;
		resendMessage.value = null;
		messageLoading.value = isRetry ? 'Riconnessione in corso...' : 'Registrazione in corso...';
		items.value.forEach((item) => { item.disabled = true; });
		isLoading.value = true;

		if (!isRetry) await refreshCsrf();

		try {
			const sanctum = useSanctumClient();
			const response = await sanctum('/api/custom-register', { method: 'POST', body: registerForm.value });
			const successMessage = response?.message || 'Registrazione completata! Inserisci il codice di verifica a 6 cifre inviato alla tua email.';
			const codeMatch = successMessage.match(/(\d{6})/);
			openVerificationFlow({
				email: registerForm.value.email,
				password: registerForm.value.password,
				successMessage,
				codeHint: codeMatch ? codeMatch[1] : null,
			});
		} catch (error) {
			const status = error?.response?.status || error?.statusCode;
			const data = error?.response?._data || error?.data;
			if (status === 419 && !isRetry) {
				await refreshCsrf();
				return registerUser(true);
			} else if (status === 422 || data?.errors) {
				messageError.value = data?.errors || error?.response?._data?.errors;
			} else if (status === 419) {
				messageError.value = { email: ['Errore di sessione. Svuota la cache del browser e riprova.'] };
			} else if (status >= 500) {
				messageError.value = { email: ['Errore del server. Riprova tra poco.'] };
			} else {
				messageError.value = { email: ['Errore di connessione. Verifica che il server sia attivo e riprova.'] };
			}
		} finally {
			messageLoading.value = null;
			isLoading.value = false;
			items.value.forEach((item) => { item.disabled = false; });
		}
	};

	// ── Password visibility toggles ──
	const showLoginPassword = ref(false);
	const showRegPassword = ref(false);
	const showRegPasswordConfirm = ref(false);

	// ── Social auth ──
	const socialAuthError = ref(false);
	const socialAuthErrorMessage = ref('Errore durante l\'accesso social. Riprova.');

	const humanizeSocialError = (rawError) => {
		const map = {
			google_email_missing: 'Il tuo account Google non ha un\'email disponibile. Usa un altro account oppure registrati con email.',
			facebook_email_missing: 'Il tuo account Facebook non ha un\'email disponibile. Usa un altro account oppure registrati con email.',
			apple_email_missing: 'Il tuo account Apple non ha un\'email disponibile. Usa un altro account oppure registrati con email.',
			google_unavailable: 'Accesso con Google temporaneamente non disponibile. Completiamo prima la configurazione del provider.',
			facebook_unavailable: 'Accesso con Facebook temporaneamente non disponibile. Completiamo prima la configurazione del provider.',
			apple_unavailable: 'Accesso con Apple temporaneamente non disponibile. Completiamo prima la configurazione del provider.',
		};
		if (map[rawError]) return map[rawError];
		if (rawError.startsWith('facebook_')) return 'Errore durante l\'accesso con Facebook. Riprova.';
		if (rawError.startsWith('google_')) return 'Errore durante l\'accesso con Google. Riprova.';
		if (rawError.startsWith('apple_')) return 'Errore durante l\'accesso con Apple. Riprova.';
		return 'Errore durante l\'accesso social. Riprova.';
	};

	const browserFrontendOrigin = ref(requestUrl.origin);
	const frontendOrigin = computed(() => browserFrontendOrigin.value);

	const buildSocialAuthUrl = (provider) => {
		const socialIntent = selectedAuthTab.value === 'registrati' ? 'register' : 'login';
		const socialParams = new URLSearchParams({
			frontend: frontendOrigin.value,
			redirect: String(route.query.redirect || '/account'),
			intent: socialIntent,
		});
		if (socialIntent === 'register') {
			if (registerForm.value.referred_by) socialParams.set('ref', registerForm.value.referred_by);
			if (registerForm.value.user_type) socialParams.set('user_type', registerForm.value.user_type);
		}
		return `/api/auth/${provider}/redirect?${socialParams.toString()}`;
	};

	const startSocialAuth = async (provider) => {
		await refreshAuthProviders();
		if (!authProviders.value[provider]) {
			socialAuthError.value = true;
			socialAuthErrorMessage.value = humanizeSocialError(`${provider}_unavailable`);
			return;
		}
		if (!import.meta.client) return;
		window.location.assign(buildSocialAuthUrl(provider));
	};

	// ── Tab change handler ──
	const onTabClick = (newValue) => {
		selectedAuthTab.value = newValue;
		if (messageError.value) messageError.value = null;
		messageSuccess.value = null;
		showResendVerification.value = false;
		resendMessage.value = null;
		resetVerificationFlow();
	};

	// ── Init (call in onMounted) ──
	const initAuth = async () => {
		if (import.meta.client) {
			browserFrontendOrigin.value = window.location.origin;
		}
		await refreshAuthProviders();
		const socialError = String(route.query.auth_error || route.query.error || '');
		if (socialError) {
			socialAuthError.value = true;
			socialAuthErrorMessage.value = humanizeSocialError(socialError);
		}
	};

	return {
		// Tab
		items, selectedAuthTab, onTabClick,
		// Login
		credentials, messageError, limitMessageError, messageSuccess, messageLoading,
		isLoading, isGoogle, showResendVerification, resendMessage, resendLoading,
		handleLogin, resendVerificationEmail,
		// Verification
		verificationMode, verificationCode, verificationLoading, verificationError,
		verificationSuccess, verificationCodeHint, resetVerificationFlow,
		verifyCode, handleVerificationInput, handleVerificationKeydown,
		handleVerificationPaste, resendCodeForVerification,
		// Registration
		registerForm, registerUser, passwordChecks, passwordStrength,
		// Password visibility
		showLoginPassword, showRegPassword, showRegPasswordConfirm,
		// Social auth
		authProviders, socialAuthError, socialAuthErrorMessage, startSocialAuth,
		// Auth state
		isAuthenticated,
		// Init
		initAuth,
	};
}
