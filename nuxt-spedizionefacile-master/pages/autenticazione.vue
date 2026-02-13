<script setup>
import { FetchError } from "ofetch";

useSeoMeta({
	title: 'Accedi o Registrati | SpedizioneFacile',
	ogTitle: 'Accedi o Registrati | SpedizioneFacile',
	description: 'Accedi al tuo account SpedizioneFacile o registrati gratuitamente per gestire le tue spedizioni, tracciare i pacchi e risparmiare sui corrieri.',
	ogDescription: 'Accedi o registrati su SpedizioneFacile per gestire le tue spedizioni.',
});

const { login } = useSanctumAuth();

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

const credentials = ref({
	email: "",
	password: "",
	remember: false,
});

const messageError = ref(null);

const limitMessageError = ref(null);

const messageSuccess = ref(null);

const messageLoading = ref(null);

const isLoading = ref(false);

const isGoogle = ref(false);
const showResendVerification = ref(false);
const resendMessage = ref(null);
const resendLoading = ref(false);

// Verification code flow
const verificationMode = ref(false);
const verificationCode = ref(["", "", "", "", "", ""]);
const verificationLoading = ref(false);
const verificationError = ref(null);
const verificationSuccess = ref(null);
const verificationCodeHint = ref(null);

const handleLogin = async () => {
	messageError.value = null;
	showResendVerification.value = false;
	resendMessage.value = null;

	if (!credentials.value.email || !credentials.value.password) {
		messageError.value = { email: ["Inserisci email e password."] };
		return;
	}

	if (!isGoogle.value) {
		messageLoading.value = "Login in corso...";
	}

	isLoading.value = true;

	try {
		const response = await login(credentials.value);

		items.value.forEach((item) => {
			item.disabled = true;
		});

		if (response) {
			if (!messageError.value) {
				credentials.value.email = null;
				credentials.value.password = null;
				credentials.value.remember = false;
			}

			isLoading.value = false;
		}
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
			messageError.value = { email: ["Sessione scaduta. Ricarica la pagina e riprova."] };
		} else if (status >= 500) {
			messageError.value = { email: ["Errore del server. Riprova tra poco."] };
		} else {
			messageError.value = { email: ["Errore di connessione. Verifica che il server sia attivo e riprova."] };
		}
	} finally {
		messageLoading.value = null;
		isLoading.value = false;
	}
};


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

		verificationSuccess.value = response?.message || "Account verificato con successo!";
		verificationMode.value = false;

		// Auto-login after verification
		await login(credentials.value);
	} catch (error) {
		const data = error?.response?._data || error?.data;
		verificationError.value = data?.message || "Codice non valido. Riprova.";
	} finally {
		verificationLoading.value = false;
	}
};

const handleVerificationInput = (index, event) => {
	const value = event.target.value;
	if (value && index < 5) {
		const nextInput = event.target.parentElement.querySelector(`input:nth-child(${index + 2})`);
		if (nextInput) nextInput.focus();
	}
};

const handleVerificationKeydown = (index, event) => {
	if (event.key === "Backspace" && !verificationCode.value[index] && index > 0) {
		const prevInput = event.target.parentElement.querySelector(`input:nth-child(${index})`);
		if (prevInput) prevInput.focus();
	}
};

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

// Password strength for registration
const passwordChecks = computed(() => {
	const pwd = registerForm.value.password || "";
	return {
		minLength: pwd.length >= 8,
		hasLower: /[a-z]/.test(pwd),
		hasUpper: /[A-Z]/.test(pwd),
		hasNumber: /[0-9]/.test(pwd),
		hasSymbol: /[@$!%*?&#^]/.test(pwd),
	};
});

const passwordStrength = computed(() => {
	const checks = passwordChecks.value;
	const passed = Object.values(checks).filter(Boolean).length;
	return passed;
});

definePageMeta({
	middleware: ["sanctum:guest"],
});

const apiBase = useRuntimeConfig().public.apiBase;

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
});

// Capture referral code from URL (?ref=CODE) and auto-switch to registration tab
const route = useRoute();
const refCode = route.query.ref;
const defaultTabValue = refCode ? 'registrati' : 'accedi';

if (refCode) {
	registerForm.value.referred_by = String(refCode).toUpperCase();
}

const registerUser = async () => {
	messageError.value = null;
	messageSuccess.value = null;
	showResendVerification.value = false;
	resendMessage.value = null;

	messageLoading.value = "Registrazione in corso...";

	items.value.forEach((item) => {
		item.disabled = true;
	});

	isLoading.value = true;

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

		if (status === 422 || data?.errors) {
			messageError.value = data?.errors || error?.response?._data?.errors;
		} else if (status === 419) {
			messageError.value = { email: ["Sessione scaduta. Ricarica la pagina e riprova."] };
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

const showLoginPassword = ref(false);
const showRegPassword = ref(false);
const showRegPasswordConfirm = ref(false);

const loginGoogle = () => {
	isGoogle.value = true;
	const frontendOrigin = window.location.origin;
	window.location.href = `${apiBase}/api/auth/google/redirect?frontend=${encodeURIComponent(frontendOrigin)}`;
};

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
	<section class="min-h-[500px] py-[40px] desktop:py-[60px]">
		<div class="my-container">
			<div class="mx-auto w-full max-w-[440px]">
				<!-- Success message -->
				<div v-if="messageSuccess" class="bg-emerald-50 border border-emerald-200 p-[24px] rounded-[12px] text-[#252B42] text-center">
					<div class="w-[56px] h-[56px] mx-auto mb-[16px] bg-emerald-100 rounded-full flex items-center justify-center">
						<span class="text-emerald-600 text-[1.5rem] font-bold">&#10003;</span>
					</div>
					<p class="text-[1rem] font-medium">{{ messageSuccess }}</p>
					<p class="text-[0.875rem] text-[#737373] mt-[8px]">Accedi con le tue credenziali e inserisci il codice di verifica per attivare l'account.</p>
					<button @click="messageSuccess = null" class="mt-[16px] px-[24px] py-[10px] bg-[#095866] text-white rounded-[8px] text-[0.875rem] font-semibold cursor-pointer hover:bg-[#0a7a8c] transition-colors">
						Torna al login
					</button>
				</div>

				<UTabs :items="items" v-if="!messageSuccess" :default-value="defaultTabValue" @update:modelValue="onTabClick">
					<!-- LOGIN TAB -->
					<template #accedi>
						<!-- Verification Code Input -->
						<div v-if="verificationMode" class="bg-white p-[28px] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E9EBEC] text-[#252B42] mt-[24px]">
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
							<div class="flex justify-center gap-[8px] mb-[20px]" @paste="handleVerificationPaste">
								<input v-for="(digit, index) in verificationCode" :key="index" type="text" maxlength="1" inputmode="numeric" :value="verificationCode[index]" @input="(e) => { verificationCode[index] = e.target.value.replace(/\D/g, ''); handleVerificationInput(index, e); }" @keydown="(e) => handleVerificationKeydown(index, e)" class="w-[48px] h-[56px] text-center text-[1.25rem] font-bold bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] focus:border-[#095866] focus:outline-none transition-colors" />
							</div>
							<p v-if="verificationError" class="text-red-500 text-[0.8125rem] mb-[12px] bg-red-50 p-[10px] rounded-[6px] text-center">{{ verificationError }}</p>
							<p v-if="verificationSuccess" class="text-emerald-600 text-[0.8125rem] mb-[12px] bg-emerald-50 p-[10px] rounded-[6px] text-center">{{ verificationSuccess }}</p>
							<button type="button" @click="verifyCode" :disabled="verificationLoading" :class="['w-full py-[14px] rounded-[10px] text-white font-semibold text-[1rem] transition-all', verificationLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#095866] hover:bg-[#0a7a8c] cursor-pointer']">
								<span v-if="verificationLoading">Verifica in corso...</span>
								<span v-else>Verifica Account</span>
							</button>
							<div class="flex items-center justify-between mt-[16px]">
								<button type="button" @click="resendCodeForVerification" :disabled="verificationLoading" class="text-[0.8125rem] text-[#095866] font-semibold hover:underline cursor-pointer disabled:opacity-60">Invia nuovo codice</button>
								<button type="button" @click="verificationMode = false; verificationError = null; verificationSuccess = null;" class="text-[0.8125rem] text-[#737373] hover:underline cursor-pointer">Torna al login</button>
							</div>
						</div>

						<div v-if="showResendVerification && !verificationMode" class="bg-amber-50 border border-amber-200 p-[16px] rounded-[10px] text-[#252B42] mt-[24px] mb-[12px]">
							<p class="text-[0.9375rem] font-medium">Email non confermata. Ti reinviamo subito una nuova email di verifica.</p>
							<button
								type="button"
								@click="resendVerificationEmail"
								:disabled="resendLoading"
								class="mt-[12px] px-[16px] py-[10px] rounded-[8px] bg-[#095866] text-white text-[0.875rem] font-semibold cursor-pointer hover:bg-[#0a7a8c] disabled:opacity-60 disabled:cursor-not-allowed">
								{{ resendLoading ? 'Invio in corso...' : 'Invia nuova email di conferma' }}
							</button>
							<p v-if="resendMessage" class="text-[0.8125rem] mt-[10px]" :class="resendMessage.type === 'success' ? 'text-emerald-700' : 'text-red-600'">{{ resendMessage.text }}</p>
						</div>
						<UForm v-if="!verificationMode" :state="credentials" @submit.prevent="handleLogin" class="bg-white p-[28px] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E9EBEC] text-[#252B42] mt-[24px]">
							<div class="mb-[20px]">
								<label for="login_email" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Email</label>
								<input
									type="email"
									id="login_email"
									v-model="credentials.email"
									placeholder="La tua email"
									class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[8px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
									required />
							</div>

							<div class="mb-[20px]">
								<label for="login_password" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Password</label>
								<div class="relative">
									<input
										:type="showLoginPassword ? 'text' : 'password'"
										id="login_password"
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

							<div class="flex items-center gap-[8px] mb-[20px]">
								<input type="checkbox" id="remember" v-model="credentials.remember" class="w-[16px] h-[16px] accent-[#095866]" />
								<label for="remember" class="text-[0.8125rem] text-[#737373] cursor-pointer">Ricordami</label>
							</div>

							<button
								type="submit"
								:disabled="isLoading"
								:class="[
									'w-full py-[14px] rounded-[10px] text-white font-semibold text-[1rem] transition-all',
									isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#095866] hover:bg-[#0a7a8c] cursor-pointer',
								]">
								<span v-if="isLoading">Accesso in corso...</span>
								<span v-else>Accedi</span>
							</button>

							<div class="relative my-[20px]">
								<div class="absolute inset-0 flex items-center"><div class="w-full border-t border-[#E9EBEC]"></div></div>
								<div class="relative flex justify-center"><span class="bg-white px-[12px] text-[0.75rem] text-[#A0A5AB] uppercase tracking-[1px]">oppure</span></div>
							</div>

							<button type="button" @click="loginGoogle" class="w-full flex items-center justify-center gap-[10px] border border-[#E9EBEC] rounded-[10px] py-[12px] cursor-pointer hover:bg-[#F8F9FB] transition-colors">
								<Icon name="flat-color-icons:google" class="text-[24px]" />
								<span class="text-[0.9375rem] font-medium text-[#252B42]">Accedi con Google</span>
							</button>

							<p class="text-center mt-[20px] text-[0.8125rem] text-[#737373]">
								Hai dimenticato la password?
								<NuxtLink to="/recupera-password" class="text-[#095866] font-semibold hover:underline">Recupera Password</NuxtLink>
							</p>

							<p v-if="messageLoading" class="text-center mt-[16px] text-[0.875rem] text-[#095866]">
								{{ messageLoading }}
							</p>
						</UForm>
					</template>

					<!-- REGISTRATION TAB -->
					<template #registrati>
						<UForm :state="registerForm" @submit.prevent="registerUser" class="mt-[24px]">
							<!-- Role selector -->
							<div class="flex items-center gap-[12px] justify-center mb-[20px]">
								<label
									:class="[
										'flex items-center gap-[8px] px-[20px] py-[12px] rounded-[10px] cursor-pointer border transition-all text-[0.9375rem] font-medium',
										registerForm.role === 'Cliente'
											? 'bg-[#095866] text-white border-[#095866] shadow-sm'
											: 'bg-white text-[#252B42] border-[#E9EBEC] hover:border-[#095866]',
									]">
									<input type="radio" value="Cliente" v-model="registerForm.role" class="sr-only" />
									Cliente
								</label>
								<label
									:class="[
										'flex items-center gap-[8px] px-[20px] py-[12px] rounded-[10px] cursor-pointer border transition-all text-[0.9375rem] font-medium',
										registerForm.role === 'Partner Pro'
											? 'bg-[#095866] text-white border-[#095866] shadow-sm'
											: 'bg-white text-[#252B42] border-[#E9EBEC] hover:border-[#095866]',
									]">
									<input type="radio" value="Partner Pro" v-model="registerForm.role" class="sr-only" />
									Partner Pro
								</label>
							</div>

							<div class="bg-white p-[28px] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E9EBEC]">
								<div class="grid grid-cols-2 gap-[12px] mb-[16px]">
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
											<div v-for="i in 5" :key="i" class="h-[3px] flex-1 rounded-full transition-all" :class="passwordStrength >= i ? (passwordStrength <= 2 ? 'bg-red-400' : passwordStrength <= 3 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-[#E9EBEC]'"></div>
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
												<span>{{ passwordChecks.hasSymbol ? '\u2713' : '\u2022' }}</span> Un simbolo (@$!%*?&#^)
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
									'w-full py-[14px] rounded-[10px] text-white font-semibold text-[1rem] mt-[20px] transition-all',
									isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#095866] hover:bg-[#0a7a8c] cursor-pointer',
								]">
								<span v-if="isLoading">Registrazione in corso...</span>
								<span v-else>Crea Account</span>
							</button>

							<div class="relative my-[20px]">
								<div class="absolute inset-0 flex items-center"><div class="w-full border-t border-[#E9EBEC]"></div></div>
								<div class="relative flex justify-center"><span class="bg-[#eeeeee] px-[12px] text-[0.75rem] text-[#A0A5AB] uppercase tracking-[1px]">oppure</span></div>
							</div>

							<button type="button" @click="loginGoogle" class="w-full flex items-center justify-center gap-[10px] border border-[#E9EBEC] rounded-[10px] py-[12px] cursor-pointer hover:bg-[#F8F9FB] transition-colors bg-white">
								<Icon name="flat-color-icons:google" class="text-[24px]" />
								<span class="text-[0.9375rem] font-medium text-[#252B42]">Registrati con Google</span>
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
