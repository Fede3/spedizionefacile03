<!--
  PAGINA: Recupera Password (recupera-password.vue)
  Form per richiedere il reset della password.
  L'utente inserisce la propria email e il backend invia un link di reimpostazione.
  Solo per utenti non autenticati (middleware sanctum:guest).
-->
<script setup>
// Dati del form: solo l'email
const resetPassword = ref({
	email: "",
});

const messageError = ref(null);
const messageSuccess = ref(null);
const isLoading = ref(false);

// Invia la richiesta di reset password al backend (/api/forgot-password)
const sendEmailResetPassword = async () => {
	messageError.value = null;
	messageSuccess.value = null;
	isLoading.value = true;

	try {
		const sanctum = useSanctumClient();
		const response = await sanctum("/api/forgot-password", {
			method: "POST",
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
	middleware: ["sanctum:guest"],
});
</script>

<!-- Miglioramento UX: aggiunta icona visiva, feedback piu' chiaro per successo/errore, link "Torna al login" -->
<template>
	<section class="min-h-[420px]">
		<div class="my-container flex justify-center items-center h-full py-[40px] desktop:py-[60px]">
			<!-- Stato di successo: messaggio chiaro con icona e prossimi passi -->
			<div v-if="messageSuccess" class="w-full max-w-[460px] bg-white p-[32px] rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] text-center">
				<div class="w-[56px] h-[56px] mx-auto mb-[16px] bg-emerald-100 rounded-full flex items-center justify-center">
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
				</div>
				<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[8px]">Email inviata!</h2>
				<p class="text-[0.9375rem] text-[#737373] leading-[1.6] mb-[20px]">{{ messageSuccess }}</p>
				<NuxtLink to="/autenticazione" class="inline-block px-[24px] py-[10px] bg-[#095866] text-white rounded-[8px] text-[0.875rem] font-semibold hover:bg-[#074a56] transition-colors">
					Torna al login
				</NuxtLink>
			</div>

			<form v-else @submit.prevent="sendEmailResetPassword" class="w-full max-w-[460px] bg-white p-[32px] rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] text-[#252B42]">
				<div class="w-[48px] h-[48px] mx-auto mb-[16px] bg-[#095866]/10 rounded-full flex items-center justify-center">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
				</div>
				<h1 class="text-[1.25rem] font-bold text-center mb-[8px]">Recupera password</h1>
				<p class="text-[0.9375rem] text-[#737373] mb-[20px] text-center leading-[1.5]">Inserisci la tua email per ricevere il link di reimpostazione.</p>
				<label for="email" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Email</label>
				<input id="email" v-model="resetPassword.email" type="email" class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[8px] placeholder:text-[#A0A5AB] w-full focus:border-[#095866] focus:outline-none transition-colors" placeholder="nome@esempio.it" required />

				<p v-if="messageError" class="text-red-500 text-[0.8125rem] mt-[10px] bg-red-50 p-[10px] rounded-[6px]">{{ messageError }}</p>

				<button type="submit" :disabled="isLoading" :class="['w-full py-[14px] rounded-[10px] text-white font-semibold text-[1rem] mt-[20px] transition-[background-color]', isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#095866] hover:bg-[#074a56] cursor-pointer']">
					{{ isLoading ? 'Invio in corso...' : 'Invia link recupero password' }}
				</button>

				<p class="text-center mt-[16px] text-[0.8125rem] text-[#737373]">
					Ricordi la password? <NuxtLink to="/autenticazione" class="text-[#095866] font-semibold hover:underline">Torna al login</NuxtLink>
				</p>
			</form>
		</div>
	</section>
</template>
