<!-- Aggiorna Password — landing post-link-recupero. Richiede ?token=XXX, precompila email se presente.
     Redirect a /autenticazione dopo successo. -->
<script setup>
import { buildAuthOverlayLocation } from '~/utils/auth';

useSeoMeta({
	title: 'Aggiorna Password',
	ogTitle: 'Aggiorna Password',
	description: 'Imposta una nuova password per completare il recupero del tuo account SpediamoFacile.',
	ogDescription: 'Aggiorna la password del tuo account SpediamoFacile.',
});

const route = useRoute();
const router = useRouter();
const loginOverlayLocation = buildAuthOverlayLocation({
	requestedPath: '/',
	tab: 'login',
});

const data = ref({
	resetToken: '',
	email: '',
	password: '',
	password_confirmation: '',
});

const fieldErrors = ref({});
const messageError = ref(null);
const messageSuccess = ref(null);
const isLoading = ref(false);
const showPassword = ref(false);
const showPasswordConfirmation = ref(false);

const tokenFromRoute = computed(() => String(route.query.token || '').trim());
const emailFromRoute = computed(() => String(route.query.email || '').trim());

const passwordChecks = computed(() => {
	const pwd = data.value.password || '';
	return {
		minLength: pwd.length >= 8,
		hasLower: /[a-z]/.test(pwd),
		hasUpper: /[A-Z]/.test(pwd),
		hasNumber: /\d/.test(pwd),
		hasSymbol: /[^a-z0-9\s]/i.test(pwd),
	};
});

const passwordStrength = computed(() => Object.values(passwordChecks.value).filter(Boolean).length);

definePageMeta({
	layout: 'auth',
	middleware: ['guest-auth', 'update-password'],
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
		messageError.value = 'Link di recupero non valido o incompleto. Richiedi una nuova email di reset.';
		return;
	}

	if (!data.value.email) {
		fieldErrors.value = { email: ["Inserisci l'email collegata all'account."] };
		return;
	}

	if (!data.value.password || !data.value.password_confirmation) {
		fieldErrors.value = { password: ['Inserisci e conferma la nuova password.'] };
		return;
	}

	if (data.value.password !== data.value.password_confirmation) {
		fieldErrors.value = { password_confirmation: ['Le password non coincidono.'] };
		return;
	}

	isLoading.value = true;

	try {
		const sanctum = useSanctumClient();
		const response = await sanctum('/api/update-password', {
			method: 'POST',
			body: data.value,
		});

		messageSuccess.value = response.message || 'Password aggiornata con successo.';
		setTimeout(() => {
			router.push(loginOverlayLocation);
		}, 1200);
	} catch (error) {
		const backendErrors = error?.response?._data?.errors || error?.data?.errors || null;
		if (backendErrors && typeof backendErrors === 'object') {
			fieldErrors.value = backendErrors;
		}

		messageError.value =
			error?.response?._data?.message ||
			error?.data?.message ||
			'Errore durante la modifica della password.';
	} finally {
		isLoading.value = false;
	}
};
</script>

<template>
	<section class="relative overflow-clip flex flex-col min-h-[calc(100vh-80px)] py-[clamp(20px,3vw,28px)] pb-[clamp(32px,5vh,48px)] bg-gradient-to-b from-[var(--surface-page)] to-[var(--surface-page-end)]">
		<div class="relative z-[1] mx-auto w-full max-w-[1280px] px-3.5 sm:px-10">
			<div class="grid gap-5 w-full max-w-[36rem] mx-auto">
				<header class="grid justify-items-center gap-2 text-center">
					<div
						class="inline-flex items-center justify-center w-[3.25rem] h-[3.25rem] rounded-full text-white shadow-[0_10px_24px_rgba(9,88,102,0.18)]"
						style="background: linear-gradient(135deg, var(--color-brand-primary) 0%, var(--color-teal-400) 100%);"
						aria-hidden="true"
					>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[1.35rem] h-[1.35rem]" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
							<path d="M7 11V7a5 5 0 0 1 10 0v4" />
						</svg>
					</div>
					<h1 class="max-w-[15ch] font-montserrat text-[18px] leading-[1.2] font-extrabold text-brand-text">
						Imposta nuova password
					</h1>
					<p class="max-w-[32rem] text-base leading-[1.55] text-brand-text-secondary">
						Scegli una nuova password sicura per completare il recupero del tuo account.
					</p>
				</header>

				<div
					v-if="messageSuccess"
					class="relative overflow-hidden flex flex-wrap items-center justify-between gap-4 w-full p-6 bg-white rounded-2xl border border-brand-border shadow-[0_2px_8px_rgba(9,88,102,0.05),0_0_0_1px_rgba(9,88,102,0.04)] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-brand-primary before:to-[var(--color-brand-primary-light)] max-sm:items-start"
				>
					<div aria-hidden="true">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M20 6L9 17l-5-5" />
						</svg>
					</div>
					<div class="min-w-0 grid gap-0.5 flex-1 basis-60">
						<p class="font-montserrat text-base font-extrabold text-brand-text">Password aggiornata</p>
						<p class="text-sm leading-[1.45] text-brand-text-secondary">{{ messageSuccess }}</p>
					</div>
					<SfButton
						:to="loginOverlayLocation"
						variant="primary"
						block
						class="flex-none min-h-10 px-4 whitespace-nowrap max-sm:w-full"
					>
						Torna al login
					</SfButton>
				</div>

				<form
					v-else
					class="relative overflow-hidden grid gap-4 px-6 py-7 bg-white rounded-2xl border border-brand-border shadow-[0_2px_8px_rgba(9,88,102,0.05),0_0_0_1px_rgba(9,88,102,0.04)] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-brand-primary before:to-[var(--color-teal-400)] max-sm:p-4"
					@submit.prevent="updatePassword"
				>
					<div class="flex flex-col gap-1.5">
						<label for="email" class="text-[11px] font-bold uppercase tracking-[0.4px] text-brand-text-muted leading-none">Email</label>
						<input
							id="email"
							v-model="data.email"
							type="email"
							class="form-input"
							required
							autocomplete="email"
						>
					</div>
					<p v-if="fieldErrors.email" class="mt-0 px-3 py-2.5 rounded-2xl text-sm leading-[1.5] text-[var(--color-error-text)] bg-[var(--surface-accent-wash)] border border-[var(--color-error-border)]">
						<span v-for="(error, index) in fieldErrors.email" :key="index" class="block">{{ error }}</span>
					</p>

					<div class="flex flex-col gap-1.5">
						<label for="password" class="text-[11px] font-bold uppercase tracking-[0.4px] text-brand-text-muted leading-none">Nuova password</label>
						<div class="relative">
							<input
								id="password"
								v-model="data.password"
								:type="showPassword ? 'text' : 'password'"
								class="form-input pr-[2.55rem]"
								required
								autocomplete="new-password"
							>
							<button
								type="button"
								class="absolute top-1/2 right-3 -translate-y-1/2 inline-flex items-center justify-center w-[1.6rem] h-[1.6rem] text-brand-text-muted cursor-pointer bg-transparent border-0 p-0"
								:aria-label="showPassword ? 'Nascondi password' : 'Mostra password'"
								@click="showPassword = !showPassword"
							>
								<svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
									<line x1="1" y1="1" x2="23" y2="23" />
								</svg>
								<svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
									<circle cx="12" cy="12" r="3" />
								</svg>
							</button>
						</div>
						<div v-if="data.password" class="flex gap-1 mt-0.5">
							<div
								v-for="i in 5"
								:key="i"
								class="h-[3px] flex-1 rounded-full transition-colors duration-200"
								:class="passwordStrength >= i
									? (passwordStrength <= 2
										? 'bg-brand-error'
										: passwordStrength <= 3
											? 'bg-[var(--color-warning-text)]'
											: 'bg-[var(--color-brand-success)]')
									: 'bg-brand-border'"
							/>
						</div>
						<ul v-if="data.password" class="grid grid-cols-2 max-sm:grid-cols-1 gap-y-[5px] gap-x-2.5 mt-1">
							<li class="flex items-center gap-1 text-xs leading-[1.35] text-brand-text-muted">
								<span>{{ passwordChecks.minLength ? '✓' : '•' }}</span> Minimo 8 caratteri
							</li>
							<li class="flex items-center gap-1 text-xs leading-[1.35] text-brand-text-muted">
								<span>{{ passwordChecks.hasLower ? '✓' : '•' }}</span> Una lettera minuscola
							</li>
							<li class="flex items-center gap-1 text-xs leading-[1.35] text-brand-text-muted">
								<span>{{ passwordChecks.hasUpper ? '✓' : '•' }}</span> Una lettera maiuscola
							</li>
							<li class="flex items-center gap-1 text-xs leading-[1.35] text-brand-text-muted">
								<span>{{ passwordChecks.hasNumber ? '✓' : '•' }}</span> Un numero
							</li>
							<li class="flex items-center gap-1 text-xs leading-[1.35] text-brand-text-muted">
								<span>{{ passwordChecks.hasSymbol ? '✓' : '•' }}</span> Un simbolo speciale
							</li>
						</ul>
					</div>
					<p v-if="fieldErrors.password" class="mt-0 px-3 py-2.5 rounded-2xl text-sm leading-[1.5] text-[var(--color-error-text)] bg-[var(--surface-accent-wash)] border border-[var(--color-error-border)]">
						<span v-for="(error, index) in fieldErrors.password" :key="index" class="block">{{ error }}</span>
					</p>

					<div class="flex flex-col gap-1.5">
						<label for="password_confirmation" class="text-[11px] font-bold uppercase tracking-[0.4px] text-brand-text-muted leading-none">Conferma nuova password</label>
						<div class="relative">
							<input
								id="password_confirmation"
								v-model="data.password_confirmation"
								:type="showPasswordConfirmation ? 'text' : 'password'"
								class="form-input pr-[2.55rem]"
								required
								autocomplete="new-password"
							>
							<button
								type="button"
								class="absolute top-1/2 right-3 -translate-y-1/2 inline-flex items-center justify-center w-[1.6rem] h-[1.6rem] text-brand-text-muted cursor-pointer bg-transparent border-0 p-0"
								:aria-label="showPasswordConfirmation ? 'Nascondi conferma password' : 'Mostra conferma password'"
								@click="showPasswordConfirmation = !showPasswordConfirmation"
							>
								<svg v-if="showPasswordConfirmation" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
									<line x1="1" y1="1" x2="23" y2="23" />
								</svg>
								<svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
									<circle cx="12" cy="12" r="3" />
								</svg>
							</button>
						</div>
					</div>
					<p v-if="fieldErrors.password_confirmation" class="mt-0 px-3 py-2.5 rounded-2xl text-sm leading-[1.5] text-[var(--color-error-text)] bg-[var(--surface-accent-wash)] border border-[var(--color-error-border)]">
						<span v-for="(error, index) in fieldErrors.password_confirmation" :key="index" class="block">{{ error }}</span>
					</p>

					<p v-if="messageError" class="mt-0 px-3 py-2.5 rounded-2xl text-sm leading-[1.5] text-[var(--color-error-text)] bg-[var(--surface-accent-wash)] border border-[var(--color-error-border)]">{{ messageError }}</p>
					<p v-if="messageSuccess" class="mt-0 px-3 py-2.5 rounded-2xl text-sm leading-[1.5] text-[var(--color-success-text-strong)] bg-[var(--color-success-bg)] border border-[var(--color-success-border)]">{{ messageSuccess }}</p>

					<SfButton type="submit" variant="primary" block :loading="isLoading" loading-text="Salvataggio...">Aggiorna password</SfButton>
				</form>
			</div>
		</div>
	</section>
</template>
