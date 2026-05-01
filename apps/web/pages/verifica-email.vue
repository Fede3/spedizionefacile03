<!-- Verifica Email — landing post-click link email. ?status ∈ verified|invalid_signature|already_verified.
     Nessun status → redirect homepage. -->
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
	<section class="relative overflow-clip flex flex-col min-h-[calc(100vh-80px)] py-[clamp(20px,3vw,28px)] pb-[clamp(32px,5vh,48px)] bg-gradient-to-b from-[var(--surface-page)] to-[var(--surface-page-end)]">
		<div class="relative z-[1] mx-auto w-full max-w-[1280px] px-3.5 sm:px-10">
			<div class="grid gap-5 w-full max-w-[40rem] mx-auto">
				<header class="grid justify-items-center gap-2 text-center">
					<div
						class="inline-flex items-center justify-center w-[3.25rem] h-[3.25rem] rounded-full text-white shadow-[0_10px_24px_rgba(9,88,102,0.18)]"
						style="background: linear-gradient(135deg, var(--color-brand-primary) 0%, var(--color-teal-400) 100%);"
						aria-hidden="true"
					>
						<svg
							v-if="statusState?.icon === 'check'"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							class="w-[1.35rem] h-[1.35rem]"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M20 6 9 17l-5-5" />
						</svg>
						<svg
							v-else
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							class="w-[1.35rem] h-[1.35rem]"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M12 9v4" />
							<path d="M12 17h.01" />
							<circle cx="12" cy="12" r="9" />
						</svg>
					</div>
					<h1 class="max-w-[15ch] font-montserrat text-[18px] leading-[1.2] font-extrabold text-brand-text">
						{{ statusState?.title }}
					</h1>
					<p class="max-w-[32rem] text-base leading-[1.55] text-brand-text-secondary">
						{{ statusState?.copy }}
					</p>
				</header>

				<div class="relative overflow-hidden grid gap-4 px-6 py-7 bg-white rounded-2xl border border-brand-border shadow-[0_2px_8px_rgba(9,88,102,0.05),0_0_0_1px_rgba(9,88,102,0.04)] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-brand-primary before:to-[var(--color-teal-400)]">
					<div
						class="px-3 py-2.5 rounded-2xl text-sm leading-[1.5]"
						:class="statusState?.tone === 'error'
							? 'text-[var(--color-error-text)] bg-[var(--surface-accent-wash)] border border-[var(--color-error-border)]'
							: 'text-[var(--color-success-text-strong)] bg-[var(--color-success-bg)] border border-[var(--color-success-border)]'"
					>
						{{ statusState?.copy }}
					</div>
					<SfButton :to="loginOverlayLocation" variant="primary" block>Vai al login</SfButton>
				</div>
			</div>
		</div>
	</section>
</template>
