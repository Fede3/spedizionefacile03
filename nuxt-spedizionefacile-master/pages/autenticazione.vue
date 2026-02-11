<script setup>
import { FetchError } from "ofetch";

const { login } = useSanctumAuth();

const items = ref([
	{
		label: "Accedi",
		icon: "",
		slot: "accedi",
		disabled: false,
	},
	{
		label: "Registrati",
		icon: "",
		slot: "registrati",
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

		if (status === 422) {
			messageError.value = data?.errors || { email: ["Credenziali non valide."] };
		} else if (status === 401) {
			const message = data?.message || "Credenziali non corrette.";
			messageError.value = data?.errors || data || { email: [message] };
			if (String(message).toLowerCase().includes("verificare l'email") || String(message).toLowerCase().includes("verificare l’email")) {
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
});

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
					<p class="text-[0.875rem] text-[#737373] mt-[8px]">Il tuo account è attivo. Ora puoi accedere con le tue credenziali.</p>
					<button @click="messageSuccess = null" class="mt-[16px] px-[24px] py-[10px] bg-[#095866] text-white rounded-[8px] text-[0.875rem] font-semibold cursor-pointer hover:bg-[#0a7a8c] transition-colors">
						Torna al login
					</button>
				</div>

				<UTabs :items="items" v-if="!messageSuccess" @update:modelValue="onTabClick">
					<!-- LOGIN TAB -->
					<template #accedi>
						<div v-if="showResendVerification" class="bg-amber-50 border border-amber-200 p-[16px] rounded-[10px] text-[#252B42] mt-[24px] mb-[12px]">
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
						<UForm :state="credentials" @submit.prevent="handleLogin" class="bg-white p-[28px] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E9EBEC] text-[#252B42] mt-[24px]">
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
								<input
									type="password"
									id="login_password"
									v-model="credentials.password"
									placeholder="La tua password"
									class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[8px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
									required />
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
									<input
										type="password"
										id="reg_password"
										placeholder="Minimo 8 caratteri"
										v-model="registerForm.password"
										class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[8px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
										minlength="8"
										required />
								</div>

								<div class="mb-[8px]">
									<label for="reg_password_confirmation" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Conferma Password *</label>
									<input
										type="password"
										id="reg_password_confirmation"
										placeholder="Ripeti la password"
										v-model="registerForm.password_confirmation"
										class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[8px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
										minlength="8"
										required />
								</div>

								<p v-if="messageError?.password" class="text-red-500 text-[0.8125rem] mb-[8px] bg-red-50 p-[8px] rounded-[6px]">
									<span v-for="(error, index) in messageError.password" :key="index" class="block">
										{{ error }}
									</span>
								</p>
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
