<script setup>
import { buildAuthOverlayLocation } from '~/utils/auth';

useSeoMeta({
	title: 'Verifica Email',
	ogTitle: 'Verifica Email',
	description: 'Conferma la tua email e completa l\'attivazione dell\'account SpediamoFacile.',
	ogDescription: 'Verifica la tua email su SpediamoFacile.',
});

definePageMeta({
	layout: 'auth',
	middleware: ['guest-auth', 'email-verification'],
});

const route = useRoute();
const router = useRouter();
const loginOverlayLocation = buildAuthOverlayLocation({
	requestedPath: '/',
	tab: 'login',
});

const status = route.query.status;

const statusState = computed(() => {
	if (status === 'verified') {
		return {
			title: 'Email verificata',
			copy: 'La tua email è stata confermata con successo. Ora puoi accedere al tuo account.',
			tone: 'success',
			icon: 'check',
		};
	}

	if (status === 'invalid_signature') {
		return {
			title: 'Link non valido',
			copy: 'Il link di verifica non è valido o è scaduto. Richiedi una nuova email di verifica.',
			tone: 'error',
			icon: 'alert',
		};
	}

	if (status === 'already_verified') {
		return {
			title: 'Email già verificata',
			copy: 'Questa email risulta già confermata. Puoi accedere subito al tuo account.',
			tone: 'success',
			icon: 'check',
		};
	}

	return null;
});

if (!statusState.value) {
	router.push('/');
}
</script>

<template>
	<section class="auth-page-shell">
		<div class="my-container relative z-[1] mx-auto max-w-[1280px] px-[14px] sm:px-[40px]">
			<div class="mx-auto grid w-full max-w-[40rem] gap-5">
				<header class="grid justify-items-center gap-2 text-center">
					<div class="inline-flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full text-white shadow-[0_10px_24px_rgba(9,88,102,0.18)] bg-[linear-gradient(135deg,var(--color-brand-primary)_0%,var(--color-teal-400)_100%)]" aria-hidden="true">
						<svg
							v-if="statusState?.icon === 'check'"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							class="h-[1.35rem] w-[1.35rem]"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round">
							<path d="M20 6 9 17l-5-5" />
						</svg>
						<svg
							v-else
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							class="h-[1.35rem] w-[1.35rem]"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round">
							<path d="M12 9v4" />
							<path d="M12 17h.01" />
							<circle cx="12" cy="12" r="9" />
						</svg>
					</div>
					<h1 class="max-w-[15ch] font-extrabold leading-[1.2] text-[18px] text-[var(--color-brand-text)] font-[var(--font-montserrat)]">{{ statusState?.title }}</h1>
					<p class="max-w-[32rem] text-base leading-[1.55] text-[var(--color-brand-text-secondary)]">{{ statusState?.copy }}</p>
				</header>

				<div class="auth-page-card relative grid gap-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white px-6 py-7 shadow-[0_2px_8px_rgba(9,88,102,0.05),0_0_0_1px_rgba(9,88,102,0.04)] max-sm:p-4">
					<div class="auth-page-card__bar" aria-hidden="true" />
					<div
						class="rounded-2xl px-3 py-[0.62rem] text-sm leading-[1.5]"
						:class="statusState?.tone === 'error'
							? 'border border-[var(--color-error-border)] bg-[var(--surface-accent-wash)] text-[var(--color-error-text)]'
							: 'border border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text-strong)]'">
						{{ statusState?.copy }}
					</div>
					<SfButton :to="loginOverlayLocation" variant="primary" block>Vai al login</SfButton>
				</div>
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
</style>
