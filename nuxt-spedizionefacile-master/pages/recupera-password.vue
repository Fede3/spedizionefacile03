<!--
  PAGINA: Recupera Password (recupera-password.vue)
  Form per richiedere il reset della password.
  L'utente inserisce la propria email e il backend invia un link di reimpostazione.
  Solo per utenti non autenticati (middleware guest-auth).
-->
<script setup>
useSeoMeta({
	title: 'Recupera Password | SpediamoFacile',
	ogTitle: 'Recupera Password | SpediamoFacile',
	description: 'Richiedi un link per reimpostare la password del tuo account SpediamoFacile.',
	ogDescription: 'Recupera la password del tuo account SpediamoFacile.',
});

const resetPassword = ref({
	email: '',
});

const messageError = ref(null);
const messageSuccess = ref(null);
const isLoading = ref(false);

const sendEmailResetPassword = async () => {
	messageError.value = null;
	messageSuccess.value = null;
	isLoading.value = true;

	try {
		const sanctum = useSanctumClient();
		const response = await sanctum('/api/forgot-password', {
			method: 'POST',
			body: resetPassword.value,
		});

		messageSuccess.value = response.message;
	} catch (error) {
		messageError.value = error?.response?._data?.message || "Errore durante l'invio dell'email di recupero password.";
	} finally {
		isLoading.value = false;
	}
};

definePageMeta({
	layout: 'auth',
	middleware: ['guest-auth'],
});
</script>

<template>
	<section class="auth-shell">
		<div class="my-container">
			<div class="auth-shell-frame">
				<div class="auth-shell-head">
					<div class="auth-shell-avatar" aria-hidden="true">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="auth-shell-avatar__icon" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
							<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
							<path d="M7 11V7a5 5 0 0 1 10 0v4" />
						</svg>
					</div>
					<h1 class="auth-shell-title">{{ messageSuccess ? 'Email inviata' : 'Recupera password' }}</h1>
					<p class="auth-shell-copy">
						{{ messageSuccess ? 'Controlla la tua casella: ti abbiamo inviato il link per reimpostare la password.' : 'Inserisci la tua email per ricevere il link di reimpostazione.' }}
					</p>
				</div>

				<div v-if="messageSuccess" class="auth-shell-message auth-feedback--success">
					<div class="auth-shell-message__icon" aria-hidden="true">
						<span>&#10003;</span>
					</div>
					<div class="auth-shell-message__body">
						<p class="auth-shell-message__title">Richiesta inviata</p>
						<p class="auth-shell-message__copy">{{ messageSuccess }}</p>
					</div>
					<NuxtLink to="/autenticazione" class="btn-cta btn-compact inline-flex items-center justify-center gap-[8px] auth-shell-message__action">
						Torna al login
					</NuxtLink>
				</div>

				<form v-else @submit.prevent="sendEmailResetPassword" class="auth-page-body auth-page-stack">
					<div class="auth-field-group">
						<label for="email" class="auth-field-label">Email</label>
						<input
							id="email"
							v-model="resetPassword.email"
							type="email"
							class="form-input"
							placeholder="nome@esempio.it"
							required
						/>
					</div>

					<p v-if="messageError" class="auth-feedback auth-feedback--error">{{ messageError }}</p>

					<button type="submit" :disabled="isLoading" class="btn-cta w-full inline-flex items-center justify-center gap-[8px]">
						{{ isLoading ? 'Invio in corso...' : 'Invia link recupero password' }}
					</button>

					<p class="text-center text-[0.8125rem] text-[var(--color-brand-text-secondary)]">
						Ricordi la password?
						<NuxtLink to="/autenticazione" class="auth-text-link">Torna al login</NuxtLink>
					</p>
				</form>
			</div>
		</div>
	</section>
</template>
