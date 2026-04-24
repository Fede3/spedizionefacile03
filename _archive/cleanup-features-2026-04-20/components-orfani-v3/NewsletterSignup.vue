<!-- COMPONENTE: NewsletterSignup (NewsletterSignup.vue) -->
<script setup>
import '~/assets/css/components/sf-newsletter-signup.css';
import { ref, computed } from 'vue';

const email = ref('');
const privacyConsent = ref(false);
const state = ref('idle'); // idle | loading | success | error
const feedback = ref('');

const isValidEmail = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value));
const canSubmit = computed(
	() => isValidEmail.value && privacyConsent.value && state.value !== 'loading',
);

const emit = defineEmits(['submit-success', 'submit-error']);

const handleSubmit = async () => {
	if (!canSubmit.value) return;

	state.value = 'loading';
	feedback.value = '';

	try {
		// TODO [NEWSLETTER-BACKEND]:
		//   implementare endpoint Laravel POST /api/newsletter/subscribe,
		//   integrare con Brevo via NUXT_PUBLIC_BREVO_API_KEY + listId.
		//   Per ora stub: simula success dopo 600ms.
		await new Promise((resolve) => setTimeout(resolve, 600));

		state.value = 'success';
		feedback.value = 'Iscrizione confermata. Riceverai le nostre novita sulla casella indicata.';
		emit('submit-success', email.value);

		// Reset email, mantieni consent spuntato per eventuale re-subscribe.
		email.value = '';
	} catch (error) {
		state.value = 'error';
		feedback.value = 'Non e stato possibile iscriverti. Riprova tra qualche istante.';
		emit('submit-error', feedback.value);
	}
};
</script>

<template>
	<form
		class="newsletter-signup"
		novalidate
		aria-labelledby="newsletter-title"
		@submit.prevent="handleSubmit"
	>
		<h3 id="newsletter-title" class="newsletter-signup__title">
			Iscriviti alla newsletter
		</h3>
		<p class="newsletter-signup__hint">
			Novita, sconti riservati e guide utili. Zero spam.
		</p>

		<div class="newsletter-signup__row">
			<label for="newsletter-email" class="sr-only">Email</label>
			<input
				id="newsletter-email"
				v-model="email"
				type="email"
				required
				autocomplete="email"
				placeholder="tua@email.it"
				class="newsletter-signup__input"
				:disabled="state === 'loading'"
				aria-describedby="newsletter-feedback"
			/>
			<button
				type="submit"
				class="newsletter-signup__submit"
				:disabled="!canSubmit"
				:aria-busy="state === 'loading' ? 'true' : 'false'"
			>
				<span v-if="state === 'loading'">Invio...</span>
				<span v-else>Iscriviti</span>
			</button>
		</div>

		<label class="newsletter-signup__consent">
			<input
				v-model="privacyConsent"
				type="checkbox"
				required
				:disabled="state === 'loading'"
			/>
			<span>
				Ho letto e accetto la
				<NuxtLink to="/privacy-policy" class="newsletter-signup__consent-link">
					Privacy Policy
				</NuxtLink>
				e acconsento al trattamento dei miei dati per finalita di marketing.
			</span>
		</label>

		<p
			id="newsletter-feedback"
			class="newsletter-signup__feedback"
			:class="{
				'is-success': state === 'success',
				'is-error': state === 'error',
			}"
			role="status"
			aria-live="polite"
		>
			{{ feedback }}
		</p>
	</form>
</template>
