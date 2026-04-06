<!--
  PAGINA: Verifica Email (verifica-email.vue)
  Pagina di atterraggio dopo il click sul link di verifica email.
  Legge il parametro ?status dalla URL e mostra il messaggio corrispondente:
  - "verified": email verificata con successo
  - "invalid_signature": link non valido
  - "already_verified": email gia' verificata
  Se nessuno status e' presente, reindirizza alla homepage.
-->
<script setup>
useSeoMeta({
	title: 'Verifica Email | SpediamoFacile',
	ogTitle: 'Verifica Email | SpediamoFacile',
	description: 'Conferma la tua email e completa l’attivazione dell’account SpediamoFacile.',
	ogDescription: 'Verifica la tua email su SpediamoFacile.',
});

definePageMeta({
	layout: 'auth',
	middleware: ['guest-auth', 'email-verification'],
});

const route = useRoute();
const router = useRouter();

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
	<section class="auth-shell">
		<div class="my-container">
			<div class="auth-shell-frame">
				<header class="auth-shell-head">
					<div class="auth-shell-avatar" aria-hidden="true">
						<svg
							v-if="statusState?.icon === 'check'"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							class="auth-shell-avatar__icon"
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
							class="auth-shell-avatar__icon"
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
					<h1 class="auth-shell-title">{{ statusState?.title }}</h1>
					<p class="auth-shell-copy">{{ statusState?.copy }}</p>
				</header>

				<div class="auth-page-body auth-page-stack">
					<div class="auth-feedback" :class="statusState?.tone === 'error' ? 'auth-feedback--error' : 'auth-feedback--success'">
						{{ statusState?.copy }}
					</div>
					<NuxtLink to="/autenticazione" class="btn-cta w-full inline-flex items-center justify-center gap-[8px]">
						Vai al login
					</NuxtLink>
				</div>
			</div>
		</div>
	</section>
</template>
