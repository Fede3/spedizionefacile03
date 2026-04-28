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

let redirectTimer = null;
onBeforeUnmount(() => {
	if (redirectTimer) {
		clearTimeout(redirectTimer);
		redirectTimer = null;
	}
});


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
		if (redirectTimer) clearTimeout(redirectTimer);
		redirectTimer = setTimeout(() => {
			redirectTimer = null;
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

const meterToneClass = (active, strength) => {
	if (!active) return 'bg-[var(--color-brand-border)]';
	if (strength <= 2) return 'bg-[var(--color-brand-error)]';
	if (strength <= 3) return 'bg-[var(--color-warning-text)]';
	return 'bg-[var(--color-brand-success)]';
};
</script>

<template>
	<section class="auth-page-shell">
		<div class="my-container relative z-[1] mx-auto max-w-[1280px] px-[14px] sm:px-[40px]">
			<div class="mx-auto grid w-full max-w-[36rem] gap-5">
				<header class="grid justify-items-center gap-2 text-center">
					<div class="inline-flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full text-white shadow-[0_10px_24px_rgba(9,88,102,0.18)] bg-[linear-gradient(135deg,var(--color-brand-primary)_0%,var(--color-teal-400)_100%)]" aria-hidden="true">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[1.35rem] w-[1.35rem]" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
							<path d="M7 11V7a5 5 0 0 1 10 0v4" />
						</svg>
					</div>
					<h1 class="max-w-[15ch] font-extrabold leading-[1.2] text-[18px] text-[var(--color-brand-text)] font-[var(--font-montserrat)]">Imposta nuova password</h1>
					<p class="max-w-[32rem] text-base leading-[1.55] text-[var(--color-brand-text-secondary)]">
						Scegli una nuova password sicura per completare il recupero del tuo account.
					</p>
				</header>

				<div v-if="messageSuccess" class="auth-page-card relative flex w-full flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[0_2px_8px_rgba(9,88,102,0.05),0_0_0_1px_rgba(9,88,102,0.04)]">
					<div class="auth-page-card__bar" aria-hidden="true" />
					<div class="grid min-w-0 flex-[1_1_240px] gap-[2px]">
						<p class="text-base font-extrabold text-[var(--color-brand-text)] font-[var(--font-montserrat)]">Password aggiornata</p>
						<p class="text-sm leading-[1.45] text-[var(--color-brand-text-secondary)]">{{ messageSuccess }}</p>
					</div>
					<SfButton :to="loginOverlayLocation" variant="primary" block class="min-h-[2.5rem] flex-none whitespace-nowrap px-4 max-sm:w-full">Torna al login</SfButton>
				</div>

				<form v-else class="auth-page-card relative grid gap-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white px-6 py-7 shadow-[0_2px_8px_rgba(9,88,102,0.05),0_0_0_1px_rgba(9,88,102,0.04)] max-sm:p-4" @submit.prevent="updatePassword">
					<div class="auth-page-card__bar" aria-hidden="true" />

					<div class="flex flex-col gap-[0.3rem]">
						<label for="email" class="text-[11px] font-bold uppercase leading-none tracking-[0.4px] text-[var(--color-brand-text-muted)]">Email</label>
						<input
							id="email"
							v-model="data.email"
							type="email"
							class="form-input auth-page-card-input"
							required
							autocomplete="email" >
					</div>
					<p v-if="fieldErrors.email" class="rounded-2xl border border-[var(--color-error-border)] bg-[var(--surface-accent-wash)] px-3 py-[0.62rem] text-sm leading-[1.5] text-[var(--color-error-text)]">
						<span v-for="(error, index) in fieldErrors.email" :key="index" class="block">{{ error }}</span>
					</p>

					<div class="flex flex-col gap-[0.3rem]">
						<label for="password" class="text-[11px] font-bold uppercase leading-none tracking-[0.4px] text-[var(--color-brand-text-muted)]">Nuova password</label>
						<div class="relative">
							<input
								id="password"
								v-model="data.password"
								:type="showPassword ? 'text' : 'password'"
								class="form-input auth-page-card-input pr-[2.55rem]"
								required
								autocomplete="new-password" >
							<button
								type="button"
								class="absolute right-3 top-1/2 inline-flex h-[1.6rem] w-[1.6rem] -translate-y-1/2 cursor-pointer items-center justify-center text-[var(--color-brand-text-muted)]"
								:aria-label="showPassword ? 'Nascondi password' : 'Mostra password'"
								@click="showPassword = !showPassword">
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
						<div v-if="data.password" class="mt-[2px] flex gap-1">
							<div
								v-for="i in 5"
								:key="i"
								class="h-[3px] flex-1 rounded-full transition-colors"
								:class="meterToneClass(passwordStrength >= i, passwordStrength)" />
						</div>
						<ul v-if="data.password" class="mt-1 grid grid-cols-1 gap-x-[10px] gap-y-[5px] sm:grid-cols-2">
							<li
								v-for="(check, key) in [
									{ k: 'minLength', label: 'Minimo 8 caratteri' },
									{ k: 'hasLower', label: 'Una lettera minuscola' },
									{ k: 'hasUpper', label: 'Una lettera maiuscola' },
									{ k: 'hasNumber', label: 'Un numero' },
									{ k: 'hasSymbol', label: 'Un simbolo speciale' },
								]"
								:key="key"
								class="flex items-center gap-1 text-xs leading-[1.35]"
								:class="passwordChecks[check.k] ? 'text-[var(--color-success-text)]' : 'text-[var(--color-brand-text-muted)]'">
								<span>{{ passwordChecks[check.k] ? '✓' : '•' }}</span> {{ check.label }}
							</li>
						</ul>
					</div>
					<p v-if="fieldErrors.password" class="rounded-2xl border border-[var(--color-error-border)] bg-[var(--surface-accent-wash)] px-3 py-[0.62rem] text-sm leading-[1.5] text-[var(--color-error-text)]">
						<span v-for="(error, index) in fieldErrors.password" :key="index" class="block">{{ error }}</span>
					</p>

					<div class="flex flex-col gap-[0.3rem]">
						<label for="password_confirmation" class="text-[11px] font-bold uppercase leading-none tracking-[0.4px] text-[var(--color-brand-text-muted)]">Conferma nuova password</label>
						<div class="relative">
							<input
								id="password_confirmation"
								v-model="data.password_confirmation"
								:type="showPasswordConfirmation ? 'text' : 'password'"
								class="form-input auth-page-card-input pr-[2.55rem]"
								required
								autocomplete="new-password" >
							<button
								type="button"
								class="absolute right-3 top-1/2 inline-flex h-[1.6rem] w-[1.6rem] -translate-y-1/2 cursor-pointer items-center justify-center text-[var(--color-brand-text-muted)]"
								:aria-label="showPasswordConfirmation ? 'Nascondi conferma password' : 'Mostra conferma password'"
								@click="showPasswordConfirmation = !showPasswordConfirmation">
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
					<p v-if="fieldErrors.password_confirmation" class="rounded-2xl border border-[var(--color-error-border)] bg-[var(--surface-accent-wash)] px-3 py-[0.62rem] text-sm leading-[1.5] text-[var(--color-error-text)]">
						<span v-for="(error, index) in fieldErrors.password_confirmation" :key="index" class="block">{{ error }}</span>
					</p>

					<p v-if="messageError" class="rounded-2xl border border-[var(--color-error-border)] bg-[var(--surface-accent-wash)] px-3 py-[0.62rem] text-sm leading-[1.5] text-[var(--color-error-text)]">{{ messageError }}</p>
					<p v-if="messageSuccess" class="rounded-2xl border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-3 py-[0.62rem] text-sm leading-[1.5] text-[var(--color-success-text-strong)]">{{ messageSuccess }}</p>

					<SfButton type="submit" variant="primary" block :loading="isLoading" loading-text="Salvataggio...">Aggiorna password</SfButton>
				</form>
			</div>
		</div>
	</section>
</template>

<style scoped>
.auth-page-shell {
	position: relative;
	overflow: clip;
	min-height: calc(100vh - 80px);
	padding: clamp(20px, 3vw, 28px) 0 clamp(32px, 5vh, 48px);
	background: linear-gradient(180deg, var(--surface-page) 0%, var(--surface-page-end) 100%);
}
.auth-page-shell::before,
.auth-page-shell::after {
	content: '';
	position: absolute;
	border-radius: 999px;
	pointer-events: none;
}
.auth-page-shell::before {
	top: 4.5rem;
	right: -7rem;
	width: 15rem;
	height: 15rem;
	background: radial-gradient(circle, rgba(9, 88, 102, 0.06) 0%, rgba(9, 88, 102, 0) 68%);
}
.auth-page-shell::after {
	bottom: 1rem;
	left: -6rem;
	width: 13rem;
	height: 13rem;
	background: radial-gradient(circle, rgba(9, 88, 102, 0.04) 0%, rgba(9, 88, 102, 0) 70%);
}
.auth-page-card__bar {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 3px;
	background: linear-gradient(90deg, var(--color-brand-primary), var(--color-teal-400));
}
.auth-page-card-input {
	min-height: 46px;
	border-radius: 12px;
	border: none;
	box-shadow: inset 0 0 0 1.5px var(--color-border);
}
.auth-page-card-input:focus {
	box-shadow: inset 0 0 0 2px rgba(9, 88, 102, 0.25);
}
</style>
