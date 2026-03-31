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
	middleware: ["app-auth"],
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
const submitDisabled = computed(() => isSending.value || !subject.value.trim() || !message.value.trim());

const supportCards = computed(() => [
	{
		title: "Email",
		value: "assistenza@spediamofacile.it",
		iconSvg: '<path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6M20 6L12 11L4 6H20M20 18H4V8L12 13L20 8V18Z" fill="currentColor"/>',
		iconWrap: "bg-[#F0F6F7]",
		iconColor: "text-[#095866]",
	},
	{
		title: "Account usato",
		value: user.value?.email || "Email account non disponibile",
		iconSvg: '<path d="M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" fill="currentColor"/>',
		iconWrap: "bg-[#F7F3FF]",
		iconColor: "text-[#7C3AED]",
	},
	{
		title: "Orari",
		value: "Lun - Ven: 9:00 - 18:00",
		iconSvg: '<path d="M12,20A7,7 0 0,1 5,13A7,7 0 0,1 12,6A7,7 0 0,1 19,13A7,7 0 0,1 12,20M12,4A9,9 0 0,0 3,13A9,9 0 0,0 12,22A9,9 0 0,0 21,13A9,9 0 0,0 12,4M12.5,8H11V14L15.75,16.85L16.5,15.62L12.5,13.25V8M7.88,3.39L6.6,1.86L2,5.71L3.29,7.24L7.88,3.39M22,5.72L17.4,1.86L16.11,3.39L20.71,7.25L22,5.72Z" fill="currentColor"/>',
		iconWrap: "bg-emerald-50",
		iconColor: "text-emerald-600",
	},
]);

const supportChecklist = [
	"Indica il riferimento della spedizione o dell'ordine se esiste gia'.",
	"Descrivi il problema in modo concreto: cosa vedi, cosa ti aspettavi, quando e' successo.",
	"Se utile, aggiungi dettagli pratici per velocizzare la risposta del team.",
];

/**
 * Invia la richiesta di assistenza autenticata.
 * I ticket vengono salvati nel database e resi visibili nel pannello admin.
 */
const handleSubmit = async () => {
	if (!subject.value.trim() || !message.value.trim()) {
		feedback.value = "Compila tutti i campi obbligatori.";
		feedbackType.value = "error";
		return;
	}

	isSending.value = true;
	feedback.value = null;

	try {
		await sanctum("/api/support-tickets", {
			method: "POST",
			body: {
				subject: subject.value.trim(),
				message: message.value.trim(),
			},
		});
		feedback.value = "Richiesta inviata con successo. La trovi subito nel pannello assistenza del team.";
		feedbackType.value = "success";
		subject.value = "";
		message.value = "";
	} catch (error) {
		feedback.value = error?.response?._data?.message || error?.data?.message || "Non siamo riusciti a inviare la richiesta. Riprova tra poco.";
		feedbackType.value = "error";
	} finally {
		isSending.value = false;
	}
};
</script>

<template>
		<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
			<div class="my-container">
				<AccountPageHeader
				title="Assistenza"
				description="Apri una richiesta reale dal tuo account. Il team riceve il ticket con i tuoi dati gia' associati e puo' risponderti senza passaggi manuali."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Assistenza' },
					]"
				/>

				<div class="mb-[24px] rounded-[18px] border border-[#E9EBEC] bg-[#F8FCFD] px-[16px] py-[14px] shadow-sm desktop:mb-[28px] desktop:px-[20px] desktop:py-[16px]">
					<div class="flex flex-col gap-[12px] desktop:flex-row desktop:items-center desktop:justify-between">
						<div>
							<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[#095866]">Canale ticket</p>
							<h2 class="mt-[4px] text-[1rem] font-bold text-[#252B42]">Richiesta diretta dal tuo account</h2>
							<p class="mt-[4px] text-[0.875rem] leading-[1.55] text-[#737373]">
								Il ticket arriva gia' collegato ai tuoi dati, cosi' il team puo' orientarsi subito e risponderti con meno passaggi.
							</p>
						</div>
						<div class="flex flex-wrap gap-[8px]">
							<span class="inline-flex items-center gap-[6px] rounded-full bg-white px-[12px] py-[6px] text-[0.75rem] font-semibold text-[#095866] shadow-sm">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[15px] h-[15px]" fill="currentColor"><path d="M21,11C21,16.55 17.16,21.74 12,23C6.84,21.74 3,16.55 3,11V5L12,1L21,5V11M12,21C15.75,20 19,15.54 19,11.22V6.3L12,3.18L5,6.3V11.22C5,15.54 8.25,20 12,21M10,14.17L7.83,12L6.41,13.41L10,17L17.59,9.41L16.17,8L10,14.17Z"/></svg>
								Account verificato
							</span>
							<span class="inline-flex items-center gap-[6px] rounded-full bg-white px-[12px] py-[6px] text-[0.75rem] font-semibold text-[#095866] shadow-sm">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[15px] h-[15px]" fill="currentColor"><path d="M15,4A8,8 0 0,1 23,12A8,8 0 0,1 15,20A8,8 0 0,1 7,12A8,8 0 0,1 15,4M15,6A6,6 0 0,0 9,12A6,6 0 0,0 15,18A6,6 0 0,0 21,12A6,6 0 0,0 15,6M14,8H15.5V11.78L17.83,14.11L16.77,15.17L14,12.4V8M2,18A1,1 0 0,1 1,17A1,1 0 0,1 2,16H5.83C6.14,16.71 6.54,17.38 7,18H2M3,13A1,1 0 0,1 2,12A1,1 0 0,1 3,11H5.05C5,11.33 5,11.67 5.05,12L5.1,13H3M4,8A1,1 0 0,1 3,7A1,1 0 0,1 4,6H7C6.54,6.62 6.14,7.29 5.83,8H4Z"/></svg>
								Presa in carico rapida
							</span>
						</div>
					</div>
				</div>

				<div class="grid gap-[18px] desktop:grid-cols-[minmax(0,0.78fr)_minmax(0,1.12fr)] desktop:items-start">
					<div class="space-y-[14px]">
						<div class="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-1 gap-[12px]">
							<div
								v-for="card in supportCards"
								:key="card.title"
								class="rounded-[18px] border border-[#E9EBEC] bg-white p-[18px] shadow-sm">
								<div class="flex items-center gap-[12px]">
									<div :class="['flex h-[42px] w-[42px] items-center justify-center rounded-full', card.iconWrap]">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" :class="['w-[22px] h-[22px]', card.iconColor]" v-html="card.iconSvg"></svg>
									</div>
									<div class="min-w-0">
										<p class="text-[0.8125rem] font-semibold uppercase tracking-[0.8px] text-[#737373]">{{ card.title }}</p>
										<p class="mt-[4px] break-words text-[0.9375rem] font-semibold text-[#252B42]">{{ card.value }}</p>
									</div>
								</div>
							</div>
						</div>

						<div class="rounded-[18px] border border-[#E9EBEC] bg-white p-[18px] shadow-sm">
							<div class="flex items-center gap-[10px]">
								<div class="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[#FFF3EC]">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-[#E44203]" fill="currentColor"><path d="M8,12H16V14H8V12M10,20H6V4H13V9H18V12.1L20,10.1V8L14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H10V20M8,18H12.1L13,17.1V16H8V18M20.2,13C20.3,13 20.5,13.1 20.6,13.2L21.9,14.5C22.1,14.7 22.1,15.1 21.9,15.3L20.9,16.3L18.8,14.2L19.8,13.2C19.9,13.1 20,13 20.2,13M20.2,16.9L14.1,23H12V20.9L18.1,14.8L20.2,16.9Z"/></svg>
								</div>
								<div>
									<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[#E44203]">Per velocizzare</p>
									<h3 class="mt-[2px] text-[1rem] font-bold text-[#252B42]">Cosa conviene scrivere</h3>
								</div>
							</div>
							<ul class="mt-[14px] space-y-[10px]">
								<li
									v-for="item in supportChecklist"
									:key="item"
									class="flex items-start gap-[10px] text-[0.875rem] leading-[1.55] text-[#404040]">
									<span class="mt-[2px] inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#F0F6F7] text-[#095866]">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
									</span>
									{{ item }}
								</li>
							</ul>
						</div>
					</div>

					<div class="bg-white rounded-[20px] p-[20px] desktop:p-[28px] shadow-sm border border-[#E9EBEC]">
						<div class="flex items-start justify-between gap-[12px] mb-[20px] desktop:mb-[24px]">
							<div class="flex items-center gap-[12px]">
								<div class="w-[42px] h-[42px] rounded-full bg-[#F0F6F7] flex items-center justify-center">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[22px] h-[22px] text-[#095866]" fill="currentColor"><path d="M12,1C7,1 3,5 3,10V17A3,3 0 0,0 6,20H9V12H5V10A7,7 0 0,1 12,3A7,7 0 0,1 19,10V12H15V20H18A3,3 0 0,0 21,17V10C21,5 16.97,1 12,1Z"/></svg>
								</div>
								<div>
									<h2 class="text-[1.125rem] font-bold text-[#252B42]">Invia una richiesta</h2>
									<p class="mt-[4px] text-[0.8125rem] text-[#737373]">Oggetto chiaro e contesto essenziale per una risposta piu' rapida.</p>
								</div>
							</div>
							<span class="hidden tablet:inline-flex items-center gap-[6px] rounded-full bg-[#F8FCFD] px-[12px] py-[6px] text-[0.75rem] font-semibold text-[#095866]">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M2,3L22,12L2,21V14L11,12L2,10V3M4,6.03V9.97L8.84,11.17L4,6.03M4,18V14.03L8.84,12.83L4,18M17,12L22,7L20.59,5.59L17,9.17L15.41,7.58L14,9L17,12Z"/></svg>
								Ticket diretto
							</span>
						</div>

						<div class="mb-[20px]">
							<label class="form-label">Oggetto *</label>
							<input
								v-model="subject"
								type="text"
								placeholder="Es. Problema con la spedizione #1234"
								class="form-input" />
						</div>

						<div class="mb-[24px]">
							<label class="form-label">Messaggio *</label>
							<textarea
								v-model="message"
								rows="6"
								placeholder="Descrivi il tuo problema o la tua richiesta..."
								class="form-input resize-none"></textarea>
						</div>

						<div v-if="feedback" :class="['mb-[20px] p-[14px] rounded-[16px] text-[0.875rem] font-medium flex items-center gap-[8px]', feedbackType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200']">
							<svg v-if="feedbackType === 'success'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg>
							<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
							{{ feedback }}
						</div>

						<button
							@click="handleSubmit"
							:disabled="submitDisabled"
							class="btn-primary w-full py-[14px] flex items-center justify-center gap-[8px] text-[0.9375rem]">
							<svg v-if="!isSending" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/></svg>
							{{ isSending ? "Invio in corso..." : "Invia richiesta" }}
						</button>
					</div>
				</div>
			</div>
		</section>
</template>
