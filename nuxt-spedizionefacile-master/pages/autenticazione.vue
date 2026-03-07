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
// Nota: rimosso import inutilizzato di FetchError da "ofetch" (dead code, riduce parse time)

useSeoMeta({
	title: 'Accedi o Registrati | SpediamoFacile',
	ogTitle: 'Accedi o Registrati | SpediamoFacile',
	description: 'Accedi al tuo account SpediamoFacile o registrati gratuitamente per gestire le tue spedizioni, tracciare i pacchi e risparmiare sui corrieri.',
	ogDescription: 'Accedi o registrati su SpediamoFacile per gestire le tue spedizioni.',
});

// Funzione di login da nuxt-auth-sanctum
const { login, isAuthenticated } = useSanctumAuth();

// Tab per alternare tra Login e Registrazione
const items = ref([
	{
		label: "Accedi",
		icon: "",
		slot: "accedi",
		value: "accedi",
		disabled: false,
	},
	{
		label: "Registrati",
		icon: "",
		slot: "registrati",
		value: "registrati",
		disabled: false,
	},
]);

// --- STATO LOGIN ---
const credentials = ref({
	email: "",
	password: "",
	remember: false, // Checkbox "ricordami"
});

const messageError = ref(null);         // Errori di validazione (oggetto con chiavi campo)
const limitMessageError = ref(null);    // Errore limite tentativi
const messageSuccess = ref(null);       // Messaggio di successo (es. registrazione completata)
const messageLoading = ref(null);       // Messaggio di caricamento (es. "Login in corso...")
const isLoading = ref(false);           // Stato di caricamento globale
const isGoogle = ref(false);            // Se l'utente sta facendo login con Google
const showResendVerification = ref(false); // Mostra il bottone per re-inviare email di verifica
const resendMessage = ref(null);        // Messaggio di feedback re-invio
const resendLoading = ref(false);       // Stato caricamento re-invio

// --- VERIFICA CODICE A 6 CIFRE ---
// Quando l'account non e' verificato, il backend risponde con 403 e richiede il codice
const verificationMode = ref(false);                     // Se siamo nella modalita' verifica codice
const verificationCode = ref(["", "", "", "", "", ""]);  // Array con le 6 cifre del codice
const verificationLoading = ref(false);
const verificationError = ref(null);
const verificationSuccess = ref(null);
const verificationCodeHint = ref(null);  // Suggerimento codice (mostrato in ambiente dev)

// GESTIONE CSRF — PERCHE' QUESTA FUNZIONE E' VUOTA?
//
// Il "CSRF token" e' una protezione contro attacchi dove un sito malevolo
// prova a fare richieste al nostro backend fingendosi l'utente.
//
// COME FUNZIONA IL FLUSSO AUTOMATICO (gestito dal modulo nuxt-auth-sanctum):
// 1. Prima di ogni richiesta POST/PUT/DELETE/PATCH, l'interceptor del modulo
//    (file: node_modules/nuxt-auth-sanctum/dist/runtime/interceptors/request/stateful.js)
//    controlla se il cookie "XSRF-TOKEN" esiste nel browser
// 2. Se il cookie NON esiste, il modulo chiama GET /sanctum/csrf-cookie automaticamente
//    per ottenere un nuovo token da Laravel
// 3. Il modulo legge il valore del cookie e lo mette nell'header "X-XSRF-TOKEN"
// 4. Laravel confronta cookie e header: se corrispondono, la richiesta e' valida
//
// PERCHE' ERA UN PROBLEMA PRIMA:
// Prima questa funzione chiamava $fetch('/sanctum/csrf-cookie') manualmente,
// bypassando il client del modulo sanctum. Questo causava:
// - Doppia richiesta CSRF (una manuale + una automatica del modulo)
// - Possibili conflitti di cookie se i timing non corrispondevano
// - Errore "Unauthenticated" perche' il token poteva scadere tra le due chiamate
//
// Ora la funzione e' mantenuta come "no-op" (non fa nulla) per compatibilita':
// handleLogin() e registerUser() la chiamano ancora nei retry su errore 419,
// ma il vero refresh del CSRF avviene automaticamente dal modulo alla prossima richiesta.
const refreshCsrf = async () => {
	// No-op: il modulo nuxt-auth-sanctum gestisce il CSRF automaticamente.
	// Vedi commento sopra per la spiegazione dettagliata.
};

// Gestisce il login con email e password
// Se il backend risponde 403 con requires_verification, attiva la modalita' verifica codice
// In caso di errore 419 (CSRF scaduto), rinfresca automaticamente il token e riprova
const handleLogin = async (isRetry = false) => {
	let loginCompleted = false;
	messageError.value = null;
	showResendVerification.value = false;
	resendMessage.value = null;

	if (!credentials.value.email || !credentials.value.password) {
		messageError.value = { email: ["Inserisci email e password."] };
		return;
	}

	if (!isGoogle.value) {
		messageLoading.value = isRetry ? "Riconnessione in corso..." : "Login in corso...";
	}

	isLoading.value = true;

	// Rinfresca sempre il CSRF token prima del login per evitare errori 419
	if (!isRetry) {
		await refreshCsrf();
	}

	try {
		const response = await login(credentials.value);

		items.value.forEach((item) => {
			item.disabled = true;
		});
		loginCompleted = true;

		// Login riuscito: non svuotiamo i campi perche' la pagina sta per cambiare
		// (il modulo sanctum fa il redirect automatico dopo il login).
		// Mantenere isLoading=true evita il flash dei campi vuoti prima del redirect.
	} catch (error) {
		const status = error?.response?.status || error?.statusCode;
		const data = error?.response?._data || error?.data;

		if (status === 403 && data?.requires_verification) {
			// Account not verified - show verification code input
			verificationMode.value = true;
			verificationCode.value = ["", "", "", "", "", ""];
			verificationError.value = null;
			verificationSuccess.value = null;
			messageError.value = null;
			// Extract code from response message if available
			const msg = data?.message || "";
			const codeMatch = msg.match(/Codice:\s*(\d{6})/);
			if (codeMatch) {
				verificationCodeHint.value = codeMatch[1];
			}
		} else if (status === 419 && !isRetry) {
			// CSRF token scaduto: rinfresca il token e riprova automaticamente (1 volta sola)
			await refreshCsrf();
			return handleLogin(true);
		} else if (status === 422) {
			messageError.value = data?.errors || { email: ["Credenziali non valide."] };
		} else if (status === 401) {
			const message = data?.message || "Credenziali non corrette.";
			messageError.value = data?.errors || data || { email: [message] };
			if (String(message).toLowerCase().includes("verificare l'email") || String(message).toLowerCase().includes("verifica")) {
				showResendVerification.value = true;
			}
		} else if (status === 429) {
			messageError.value = { email: ["Troppi tentativi. Riprova tra qualche minuto."] };
		} else if (status === 419) {
			// Retry gia' tentato e ancora 419 - errore persistente
			messageError.value = { email: ["Errore di sessione. Svuota la cache del browser e riprova."] };
		} else if (status >= 500) {
			messageError.value = { email: ["Errore del server. Riprova tra poco."] };
		} else {
			messageError.value = { email: ["Errore di connessione. Verifica che il server sia attivo e riprova."] };
		}
	} finally {
		if (!loginCompleted) {
			messageLoading.value = null;
			isLoading.value = false;
		}
	}
};


// Re-invia l'email di verifica all'indirizzo inserito nel campo login
const resendVerificationEmail = async () => {
	resendMessage.value = null;
	showResendVerification.value = true;
	if (!credentials.value.email) {
		resendMessage.value = { type: "error", text: "Inserisci prima la tua email nel campo login." };
		return;
	}

	resendLoading.value = true;
	try {
		const sanctum = useSanctumClient();
		const response = await sanctum("/api/resend-verification-email", {
			method: "POST",
			body: { email: credentials.value.email },
		});
		resendMessage.value = { type: "success", text: response?.message || "Email inviata con successo." };
	} catch (error) {
		const data = error?.response?._data || error?.data;
		resendMessage.value = { type: "error", text: data?.message || "Errore durante l'invio. Riprova." };
	} finally {
		resendLoading.value = false;
	}
};

// Verifica il codice a 6 cifre inserito dall'utente e, se valido, esegue il login automatico
const verifyCode = async () => {
	const code = verificationCode.value.join("");
	if (code.length !== 6) {
		verificationError.value = "Inserisci il codice completo a 6 cifre.";
		return;
	}

	verificationLoading.value = true;
	verificationError.value = null;

	try {
		const sanctum = useSanctumClient();
		const response = await sanctum("/api/verify-code", {
			method: "POST",
			body: {
				email: credentials.value.email,
				password: credentials.value.password,
				code: code,
			},
		});

		// Account verificato: eseguiamo il login automatico
		verificationMode.value = false;
		messageLoading.value = "Account verificato! Accesso in corso...";
		isLoading.value = true;

		try {
			await login(credentials.value);
		} catch (loginError) {
			// Se il login automatico fallisce, mostriamo un messaggio di successo
			// e chiediamo all'utente di riprovare manualmente
			messageSuccess.value = response?.message || "Account verificato con successo! Ora puoi accedere.";
			isLoading.value = false;
			messageLoading.value = null;
		}
	} catch (error) {
		const data = error?.response?._data || error?.data;
		verificationError.value = data?.message || "Codice non valido. Riprova.";
	} finally {
		verificationLoading.value = false;
	}
};

// Gestisce l'input nei campi del codice di verifica: avanza automaticamente al campo successivo
const handleVerificationInput = (index, event) => {
	const value = event.target.value;
	if (value && index < 5) {
		const nextInput = event.target.parentElement.querySelector(`input:nth-child(${index + 2})`);
		if (nextInput) nextInput.focus();
	}
};

// Gestisce il tasto Backspace nei campi verifica: torna al campo precedente se vuoto
const handleVerificationKeydown = (index, event) => {
	if (event.key === "Backspace" && !verificationCode.value[index] && index > 0) {
		const prevInput = event.target.parentElement.querySelector(`input:nth-child(${index})`);
		if (prevInput) prevInput.focus();
	}
};

// Gestisce il "copia e incolla" del codice di verifica: distribuisce le cifre nei 6 campi
const handleVerificationPaste = (event) => {
	event.preventDefault();
	const paste = (event.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6);
	for (let i = 0; i < 6; i++) {
		verificationCode.value[i] = paste[i] || "";
	}
};

const resendCodeForVerification = async () => {
	verificationError.value = null;
	verificationLoading.value = true;
	try {
		const sanctum = useSanctumClient();
		const response = await sanctum("/api/resend-verification-email", {
			method: "POST",
			body: { email: credentials.value.email },
		});
		verificationError.value = null;
		const resendMsg = response?.message || "Nuovo codice inviato!";
		verificationSuccess.value = resendMsg;
		// Extract code from resend response
		const resendCodeMatch = resendMsg.match(/(\d{6})/);
		if (resendCodeMatch) {
			verificationCodeHint.value = resendCodeMatch[1];
		}
	} catch (error) {
		const data = error?.response?._data || error?.data;
		verificationError.value = data?.message || "Errore nell'invio del codice. Riprova.";
	} finally {
		verificationLoading.value = false;
	}
};

// --- INDICATORE FORZA PASSWORD (registrazione) ---
// Controlla i requisiti della password: lunghezza, maiuscola, minuscola, numero, simbolo
const passwordChecks = computed(() => {
	const pwd = registerForm.value.password || "";
	return {
		minLength: pwd.length >= 8,
		hasLower: /[a-z]/.test(pwd),
		hasUpper: /[A-Z]/.test(pwd),
		hasNumber: /[0-9]/.test(pwd),
		hasSymbol: /[^a-zA-Z0-9\s]/.test(pwd),
	};
});

// Numero di requisiti soddisfatti (da 0 a 5) per la barra di forza
const passwordStrength = computed(() => {
	const checks = passwordChecks.value;
	const passed = Object.values(checks).filter(Boolean).length;
	return passed;
});

// Pagina pubblica: evitiamo middleware sanctum:guest per non forzare
// chiamate /api/user rumorose in sessione guest.
onMounted(() => {
	if (isAuthenticated.value) {
		navigateTo('/');
	}
});

const apiBase = useRuntimeConfig().public.apiBase;

// --- STATO REGISTRAZIONE ---
const registerForm = ref({
	name: "",
	surname: "",
	email: "",
	email_confirmation: "",
	prefix: "+39",
	telephone_number: "",
	password: "",
	password_confirmation: "",
	role: "Cliente",
	referred_by: "",
	user_type: "privato",
});

// Cattura il codice referral dall'URL (?ref=CODICE) e apre automaticamente il tab di registrazione
const route = useRoute();
const refCode = route.query.ref;
const defaultTabValue = refCode ? 'registrati' : 'accedi';

if (refCode) {
	registerForm.value.referred_by = String(refCode).toUpperCase();
}

// Invia il form di registrazione al backend (/api/custom-register)
// In caso di errore 419 (CSRF scaduto), rinfresca il token e riprova automaticamente
const registerUser = async (isRetry = false) => {
	messageError.value = null;
	messageSuccess.value = null;
	showResendVerification.value = false;
	resendMessage.value = null;

	messageLoading.value = isRetry ? "Riconnessione in corso..." : "Registrazione in corso...";

	items.value.forEach((item) => {
		item.disabled = true;
	});

	isLoading.value = true;

	// Rinfresca il CSRF token prima della registrazione
	if (!isRetry) {
		await refreshCsrf();
	}

	try {
		const sanctum = useSanctumClient();
		const response = await sanctum("/api/custom-register", {
			method: "POST",
			body: registerForm.value,
		});

		messageSuccess.value = response?.message || "Registrazione completata con successo!";
	} catch (error) {
		const status = error?.response?.status || error?.statusCode;
		const data = error?.response?._data || error?.data;

		if (status === 419 && !isRetry) {
			// CSRF scaduto: rinfresca e riprova
			await refreshCsrf();
			return registerUser(true);
		} else if (status === 422 || data?.errors) {
			messageError.value = data?.errors || error?.response?._data?.errors;
		} else if (status === 419) {
			messageError.value = { email: ["Errore di sessione. Svuota la cache del browser e riprova."] };
		} else if (status >= 500) {
			messageError.value = { email: ["Errore del server. Riprova tra poco."] };
		} else {
			messageError.value = { email: ["Errore di connessione. Verifica che il server sia attivo e riprova."] };
		}
	} finally {
		messageLoading.value = null;
		isLoading.value = false;
		items.value.forEach((item) => {
			item.disabled = false;
		});
	}
};

const showForm = ref(false);

// Toggle visibilita' password nei campi di input
const showLoginPassword = ref(false);
const showRegPassword = ref(false);
const showRegPasswordConfirm = ref(false);

// Google auth error handling
const googleError = ref(false);
onMounted(async () => {
	if (route.query.error === 'google_auth_failed') {
		googleError.value = true;
		navigateTo('/autenticazione', { replace: true });
	}
});

// Google Auth URL (computed per usarlo come href nel template)
const googleAuthUrl = computed(() => {
	const currentRedirect = route.query.redirect || '/account';
	const frontendOrigin = typeof window !== 'undefined' ? window.location.origin : '';
	return `${apiBase}/api/auth/google/redirect?frontend=${encodeURIComponent(frontendOrigin)}&redirect=${encodeURIComponent(currentRedirect)}`;
});

// Quando l'utente cambia tab (Login <-> Registrazione), resetta tutti i messaggi di errore/successo
function onTabClick(newValue) {
	if (messageError.value) {
		messageError.value = null;
	}
	messageSuccess.value = null;
	showResendVerification.value = false;
	resendMessage.value = null;
	verificationMode.value = false;
	verificationError.value = null;
	verificationSuccess.value = null;
}
</script>

<template>
	<section class="min-h-[500px] py-[24px] tablet:py-[40px] desktop:py-[60px]">
		<div class="my-container">
			<div class="mx-auto w-full max-w-[440px]">
				<!-- Success message -->
				<div v-if="messageSuccess" class="bg-emerald-50 border border-emerald-200 p-[24px] rounded-[12px] text-[#252B42] text-center">
					<div class="w-[56px] h-[56px] mx-auto mb-[16px] bg-emerald-100 rounded-full flex items-center justify-center">
						<span class="text-emerald-600 text-[1.5rem] font-bold">&#10003;</span>
					</div>
					<p class="text-[1rem] font-medium">{{ messageSuccess }}</p>
					<p class="text-[0.875rem] text-[#737373] mt-[8px]">Accedi con le tue credenziali e inserisci il codice di verifica per attivare l'account.</p>
					<button @click="messageSuccess = null" class="mt-[16px] px-[24px] py-[10px] bg-[#095866] text-white rounded-[8px] text-[0.875rem] font-semibold cursor-pointer hover:bg-[#074a56] transition-colors">
						Torna al login
					</button>
				</div>

				<UTabs :items="items" v-if="!messageSuccess" :default-value="defaultTabValue" @update:modelValue="onTabClick">
					<!-- LOGIN TAB -->
					<template #accedi>
						<!-- Verification Code Input -->
						<div v-if="verificationMode" class="bg-white p-[16px] tablet:p-[28px] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E9EBEC] text-[#252B42] mt-[24px]">
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
								<button type="button" @click="verificationMode = false; verificationError = null; verificationSuccess = null;" class="text-[0.8125rem] text-[#737373] hover:underline cursor-pointer">Torna al login</button>
							</div>
						</div>

						<div v-if="showResendVerification && !verificationMode" class="bg-amber-50 border border-amber-200 p-[16px] rounded-[50px] text-[#252B42] mt-[24px] mb-[12px]">
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
						<div v-if="!verificationMode" class="mt-[24px]">
						<!-- Google auth error -->
						<div v-if="googleError" class="bg-red-50 border border-red-200 rounded-[12px] p-[12px] mb-[16px] text-red-600 text-[0.875rem]">
							Errore durante l'accesso con Google. Riprova.
						</div>

						<!-- Accedi con Google -->
						<a
							:href="googleAuthUrl"
							class="flex items-center justify-center gap-[12px] w-full h-[52px] bg-white border-2 border-[#E0E0E0] rounded-[12px] text-[#333] font-semibold text-[1rem] transition-[border-color,box-shadow,transform] duration-200 hover:border-[#4285F4] hover:shadow-[0_2px_12px_rgba(66,133,244,0.15)] active:scale-[0.98]"
						>
							<svg width="20" height="20" viewBox="0 0 48 48">
								<path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
								<path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
								<path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
								<path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
							</svg>
							Continua con Google
						</a>

						<div class="flex items-center gap-[16px] my-[16px]">
							<div class="flex-1 h-[1px] bg-[#E0E0E0]"></div>
							<span class="text-[0.8125rem] text-[#999] font-medium">oppure</span>
							<div class="flex-1 h-[1px] bg-[#E0E0E0]"></div>
						</div>
					</div>

					<form v-if="!verificationMode" @submit.prevent="handleLogin" class="bg-white p-[16px] tablet:p-[28px] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E9EBEC] text-[#252B42]">
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
							<!-- Google auth error -->
							<div v-if="googleError" class="bg-red-50 border border-red-200 rounded-[12px] p-[12px] mb-[16px] text-red-600 text-[0.875rem]">
								Errore durante l'accesso con Google. Riprova.
							</div>

							<!-- Registrati con Google -->
							<a
								:href="googleAuthUrl"
								class="flex items-center justify-center gap-[12px] w-full h-[52px] bg-white border-2 border-[#E0E0E0] rounded-[12px] text-[#333] font-semibold text-[1rem] transition-[border-color,box-shadow,transform] duration-200 hover:border-[#4285F4] hover:shadow-[0_2px_12px_rgba(66,133,244,0.15)] active:scale-[0.98]"
							>
								<svg width="20" height="20" viewBox="0 0 48 48">
									<path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
									<path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
									<path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
									<path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
								</svg>
								Continua con Google
							</a>

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
