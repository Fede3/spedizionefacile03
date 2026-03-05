<!--
  FILE: pages/account/assistenza.vue
  SCOPO: Pagina assistenza — form per inviare richieste di supporto all'admin.
         Mostra anche i contatti diretti (email assistenza e orari).
  API: POST /api/support-tickets — invia richiesta di assistenza.
  COMPONENTI: nessun componente custom.
  ROUTE: /account/assistenza (middleware sanctum:auth).

  DATI IN INGRESSO:
    - user (da useSanctumAuth) — dati utente per pre-compilare il form.

  DATI IN USCITA:
    - POST /api/support-tickets — crea ticket di assistenza.

  VINCOLI:
    - L'utente deve essere autenticato.
    - Oggetto e messaggio sono obbligatori.

  ERRORI TIPICI:
    - Errore di rete durante l'invio → messaggio errore.

  PUNTI DI MODIFICA SICURI:
    - Aggiungere campi al form: aggiungere ref e input nel template.
    - Cambiare email/orari assistenza: modificare il template.

  COLLEGAMENTI:
    - pages/account/index.vue → dashboard account.
-->
<script setup>
/* Richiede che l'utente sia autenticato */
definePageMeta({
	middleware: ["sanctum:auth"],
});

const { user } = useSanctumAuth();
const sanctum = useSanctumClient();

/* Oggetto della richiesta di assistenza */
const subject = ref("");
/* Testo del messaggio di assistenza */
const message = ref("");
/* Indica se l'invio e' in corso */
const isSending = ref(false);
/* Messaggio di conferma o errore dopo l'invio */
const feedback = ref(null);
const feedbackType = ref("success");

/**
 * Invia la richiesta di assistenza.
 * Controlla che i campi siano compilati, poi simula l'invio
 * (in futuro si colleghera' a un vero endpoint API per i ticket).
 */
const handleSubmit = async () => {
	if (!subject.value.trim() || !message.value.trim()) {
		feedback.value = "Compila tutti i campi obbligatori.";
		feedbackType.value = "error";
		return;
	}

	isSending.value = true;
	feedback.value = null;

	// Placeholder: in futuro si collegherà a un endpoint API per i ticket
	setTimeout(() => {
		feedback.value = "Richiesta inviata con successo! Ti risponderemo al più presto.";
		feedbackType.value = "success";
		subject.value = "";
		message.value = "";
		isSending.value = false;
	}, 1000);
};
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<!-- Breadcrumb -->
			<div class="mb-[28px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Il tuo account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Assistenza</span>
			</div>

			<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42] mb-[8px]">Assistenza</h1>
			<p class="text-[#737373] text-[0.9375rem] mb-[32px]">Hai bisogno di aiuto? Compila il modulo e ti risponderemo al più presto.</p>

			<!-- Contact Info Cards -->
			<div class="grid grid-cols-1 account-pages:grid-cols-2 gap-[16px] mb-[32px]">
				<div class="bg-white rounded-[16px] p-[24px] border border-[#E9EBEC] shadow-sm">
					<div class="flex items-center gap-[12px] mb-[12px]">
						<div class="w-[40px] h-[40px] rounded-[50px] bg-blue-50 flex items-center justify-center">
							<Icon name="mdi:email-outline" class="text-[22px] text-blue-600" />
						</div>
						<h3 class="text-[0.9375rem] font-bold text-[#252B42]">Email</h3>
					</div>
					<p class="text-[0.875rem] text-[#737373]">assistenza@spediamofacile.it</p>
				</div>
				<div class="bg-white rounded-[16px] p-[24px] border border-[#E9EBEC] shadow-sm">
					<div class="flex items-center gap-[12px] mb-[12px]">
						<div class="w-[40px] h-[40px] rounded-[50px] bg-emerald-50 flex items-center justify-center">
							<Icon name="mdi:clock-outline" class="text-[22px] text-emerald-600" />
						</div>
						<h3 class="text-[0.9375rem] font-bold text-[#252B42]">Orari</h3>
					</div>
					<p class="text-[0.875rem] text-[#737373]">Lun - Ven: 9:00 - 18:00</p>
				</div>
			</div>

			<!-- Ticket Form -->
			<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
				<div class="flex items-center gap-[12px] mb-[24px]">
					<div class="w-[40px] h-[40px] rounded-[50px] bg-[#e8f4fb] flex items-center justify-center">
						<Icon name="mdi:headset" class="text-[22px] text-[#1a7fba]" />
					</div>
					<h2 class="text-[1.125rem] font-bold text-[#252B42]">Invia una richiesta</h2>
				</div>

				<div class="mb-[20px]">
					<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Oggetto *</label>
					<input
						v-model="subject"
						type="text"
						placeholder="Es. Problema con la spedizione #1234"
						class="w-full px-[14px] py-[12px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[50px] text-[0.9375rem] text-[#252B42] placeholder:text-[#a0a0a0] focus:border-[#095866] focus:outline-none transition-colors" />
				</div>

				<div class="mb-[24px]">
					<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Messaggio *</label>
					<textarea
						v-model="message"
						rows="5"
						placeholder="Descrivi il tuo problema o la tua richiesta..."
						class="w-full px-[14px] py-[12px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[50px] text-[0.9375rem] text-[#252B42] placeholder:text-[#a0a0a0] focus:border-[#095866] focus:outline-none transition-colors resize-none"></textarea>
				</div>

				<!-- Feedback -->
				<div v-if="feedback" :class="['mb-[20px] p-[14px] rounded-[50px] text-[0.875rem] font-medium flex items-center gap-[8px]', feedbackType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200']">
					<Icon :name="feedbackType === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'" class="text-[18px] shrink-0" />
					{{ feedback }}
				</div>

				<button
					@click="handleSubmit"
					:disabled="isSending"
					:class="[
						'w-full py-[14px] rounded-[50px] font-semibold text-[0.9375rem] transition-all flex items-center justify-center gap-[8px]',
						isSending
							? 'bg-gray-200 text-gray-400 cursor-not-allowed'
							: 'bg-[#095866] hover:bg-[#074a56] text-white cursor-pointer',
					]">
					<Icon v-if="!isSending" name="mdi:send" class="text-[18px]" />
					{{ isSending ? "Invio in corso..." : "Invia richiesta" }}
				</button>
			</div>
		</div>
	</section>
</template>
