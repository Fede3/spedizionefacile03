<!--
  PAGINA: Aggiorna Password (aggiorna-password.vue)
  Form per impostare una nuova password dopo aver cliccato il link di recupero.
  Richiede il token di reset dalla URL (?token=XXX) e precompila l'email se presente.
  Dopo il successo, reindirizza automaticamente alla pagina di autenticazione.
-->
<script setup>
const route = useRoute();
const router = useRouter();

const data = ref({
	resetToken: "",
	email: "",
	password: "",
	password_confirmation: "",
});

const fieldErrors = ref({});
const messageError = ref(null);
const messageSuccess = ref(null);
const isLoading = ref(false);
const showPassword = ref(false);
const showPasswordConfirmation = ref(false);

const tokenFromRoute = computed(() => String(route.query.token || "").trim());
const emailFromRoute = computed(() => String(route.query.email || "").trim());

const passwordChecks = computed(() => {
	const pwd = data.value.password || "";
	return {
		minLength: pwd.length >= 8,
		hasLower: /[a-z]/.test(pwd),
		hasUpper: /[A-Z]/.test(pwd),
		hasNumber: /[0-9]/.test(pwd),
		hasSymbol: /[^a-zA-Z0-9\s]/.test(pwd),
	};
});

const passwordStrength = computed(() => Object.values(passwordChecks.value).filter(Boolean).length);

definePageMeta({
	layout: 'auth',
	middleware: ['sanctum:guest', 'update-password'],
});

const syncRoutePayload = () => {
	data.value.resetToken = tokenFromRoute.value;
	if (emailFromRoute.value) {
		data.value.email = emailFromRoute.value;
	}
};

watch(
	() => [tokenFromRoute.value, emailFromRoute.value],
	() => syncRoutePayload(),
	{ immediate: true }
);

const updatePassword = async () => {
	fieldErrors.value = {};
	messageError.value = null;
	messageSuccess.value = null;
	syncRoutePayload();

	if (!data.value.resetToken) {
		messageError.value = "Link di recupero non valido o incompleto. Richiedi una nuova email di reset.";
		return;
	}

	if (!data.value.email) {
		fieldErrors.value = { email: ["Inserisci l'email collegata all'account."] };
		return;
	}

	if (!data.value.password || !data.value.password_confirmation) {
		fieldErrors.value = { password: ["Inserisci e conferma la nuova password."] };
		return;
	}

	if (data.value.password !== data.value.password_confirmation) {
		fieldErrors.value = { password_confirmation: ["Le password non coincidono."] };
		return;
	}

	isLoading.value = true;

	try {
		const sanctum = useSanctumClient();
		const response = await sanctum("/api/update-password", {
			method: "POST",
			body: data.value,
		});

		messageSuccess.value = response.message || "Password aggiornata con successo.";
		setTimeout(() => {
			router.push("/autenticazione");
		}, 1200);
	} catch (error) {
		const backendErrors = error?.response?._data?.errors || error?.data?.errors || null;
		if (backendErrors && typeof backendErrors === "object") {
			fieldErrors.value = backendErrors;
		}

		messageError.value =
			error?.response?._data?.message ||
			error?.data?.message ||
			"Errore durante la modifica della password.";
	} finally {
		isLoading.value = false;
	}
};

</script>

<template>
	<section class="min-h-[500px] py-[24px] tablet:py-[40px] desktop:py-[60px]">
		<div class="my-container flex justify-center">
			<form
				@submit.prevent="updatePassword"
				class="w-full max-w-[560px] bg-white p-[20px] tablet:p-[28px] rounded-[20px] shadow-[0_14px_28px_rgba(20,37,48,0.06)] border border-[#E5EAEC] text-[#252B42]"
			>
				<div class="text-center mb-[20px]">
					<div class="w-[56px] h-[56px] mx-auto mb-[16px] bg-[#095866]/10 rounded-full flex items-center justify-center">
						<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
							<path d="M7 11V7a5 5 0 0 1 10 0v4" />
						</svg>
					</div>
					<h1 class="text-[1.25rem] font-bold text-[#252B42] mb-[8px]">Imposta nuova password</h1>
					<p class="text-[#6b7280] text-[0.9375rem] leading-[1.5]">
						Inserisci la tua email e scegli una nuova password. Se arrivi dall'email di recupero, l'email viene compilata automaticamente.
					</p>
				</div>

				<label for="email" class="form-label">Email</label>
				<input
					id="email"
					v-model="data.email"
					type="email"
					class="block w-full mt-1 mb-2 bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[12px] focus:border-[#095866] focus:outline-none transition-colors"
					required
					autocomplete="email"
				/>
				<p v-if="fieldErrors.email" class="text-red-500 text-[0.8125rem] mb-[12px] bg-red-50 p-[8px] rounded-[6px]">
					<span v-for="(error, index) in fieldErrors.email" :key="index" class="block">{{ error }}</span>
				</p>

				<label for="password" class="form-label">Nuova password</label>
				<div class="relative mb-[12px]">
					<input
						id="password"
						v-model="data.password"
						:type="showPassword ? 'text' : 'password'"
						class="block w-full mt-1 bg-[#F8F9FB] p-[12px] pr-[44px] border border-[#E9EBEC] rounded-[12px] focus:border-[#095866] focus:outline-none transition-colors"
						required
						autocomplete="new-password"
					/>
					<button
						type="button"
						class="absolute right-[10px] top-[50%] translate-y-[-50%] text-[#737373] cursor-pointer"
						@click="showPassword = !showPassword"
						:aria-label="showPassword ? 'Nascondi password' : 'Mostra password'"
					>
						<svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12c.73-2.11 2-3.94 3.6-5.4" />
							<path d="M10.58 10.58A2 2 0 1 0 13.42 13.42" />
							<path d="M1 1l22 22" />
							<path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a11.05 11.05 0 0 1-4.06 5.94" />
						</svg>
						<svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
							<circle cx="12" cy="12" r="3" />
						</svg>
					</button>
				</div>

				<div v-if="data.password" class="mt-[-4px] mb-[12px]">
					<div class="flex gap-[4px] mb-[8px]">
						<div
							v-for="i in 5"
							:key="i"
							class="h-[3px] flex-1 rounded-full transition-[background-color]"
							:class="passwordStrength >= i ? (passwordStrength <= 2 ? 'bg-red-400' : passwordStrength <= 3 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-[#E9EBEC]'"
						></div>
					</div>
					<ul class="grid grid-cols-1 tablet:grid-cols-2 gap-y-[4px] gap-x-[12px]">
						<li class="text-[0.75rem] flex items-center gap-[4px]" :class="passwordChecks.minLength ? 'text-emerald-600' : 'text-[#A0A5AB]'">
							<span>{{ passwordChecks.minLength ? '✓' : '•' }}</span> Minimo 8 caratteri
						</li>
						<li class="text-[0.75rem] flex items-center gap-[4px]" :class="passwordChecks.hasLower ? 'text-emerald-600' : 'text-[#A0A5AB]'">
							<span>{{ passwordChecks.hasLower ? '✓' : '•' }}</span> Una lettera minuscola
						</li>
						<li class="text-[0.75rem] flex items-center gap-[4px]" :class="passwordChecks.hasUpper ? 'text-emerald-600' : 'text-[#A0A5AB]'">
							<span>{{ passwordChecks.hasUpper ? '✓' : '•' }}</span> Una lettera maiuscola
						</li>
						<li class="text-[0.75rem] flex items-center gap-[4px]" :class="passwordChecks.hasNumber ? 'text-emerald-600' : 'text-[#A0A5AB]'">
							<span>{{ passwordChecks.hasNumber ? '✓' : '•' }}</span> Un numero
						</li>
						<li class="text-[0.75rem] flex items-center gap-[4px]" :class="passwordChecks.hasSymbol ? 'text-emerald-600' : 'text-[#A0A5AB]'">
							<span>{{ passwordChecks.hasSymbol ? '✓' : '•' }}</span> Un simbolo speciale
						</li>
					</ul>
				</div>
				<p v-if="fieldErrors.password" class="text-red-500 text-[0.8125rem] mb-[12px] bg-red-50 p-[8px] rounded-[6px]">
					<span v-for="(error, index) in fieldErrors.password" :key="index" class="block">{{ error }}</span>
				</p>

				<label for="password_confirmation" class="form-label">Conferma nuova password</label>
				<div class="relative mb-[12px]">
					<input
						id="password_confirmation"
						v-model="data.password_confirmation"
						:type="showPasswordConfirmation ? 'text' : 'password'"
						class="block w-full mt-1 bg-[#F8F9FB] p-[12px] pr-[44px] border border-[#E9EBEC] rounded-[12px] focus:border-[#095866] focus:outline-none transition-colors"
						required
						autocomplete="new-password"
					/>
					<button
						type="button"
						class="absolute right-[10px] top-[50%] translate-y-[-50%] text-[#737373] cursor-pointer"
						@click="showPasswordConfirmation = !showPasswordConfirmation"
						:aria-label="showPasswordConfirmation ? 'Nascondi conferma password' : 'Mostra conferma password'"
					>
						<svg v-if="showPasswordConfirmation" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12c.73-2.11 2-3.94 3.6-5.4" />
							<path d="M10.58 10.58A2 2 0 1 0 13.42 13.42" />
							<path d="M1 1l22 22" />
							<path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a11.05 11.05 0 0 1-4.06 5.94" />
						</svg>
						<svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
							<circle cx="12" cy="12" r="3" />
						</svg>
					</button>
				</div>
				<p v-if="fieldErrors.password_confirmation" class="text-red-500 text-[0.8125rem] mb-[12px] bg-red-50 p-[8px] rounded-[6px]">
					<span v-for="(error, index) in fieldErrors.password_confirmation" :key="index" class="block">{{ error }}</span>
				</p>

				<p v-if="messageError" class="text-red-600 mt-3 bg-red-50 p-[10px] rounded-[6px] text-[0.875rem]">{{ messageError }}</p>
				<p v-if="messageSuccess" class="text-green-600 mt-3 bg-emerald-50 p-[10px] rounded-[6px] text-[0.875rem]">{{ messageSuccess }}</p>

				<button
					type="submit"
					:disabled="isLoading"
					class="btn-primary w-full py-[14px] mt-[20px] text-[1rem]"
				>
					{{ isLoading ? "Salvataggio..." : "Aggiorna password" }}
				</button>
			</form>
		</div>
	</section>
</template>
