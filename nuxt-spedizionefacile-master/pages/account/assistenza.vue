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
		icon: "mdi:email-outline",
		iconWrap: "bg-[#F0F6F7]",
		iconColor: "text-[#095866]",
	},
	{
		title: "Account usato",
		value: user.value?.email || "Email account non disponibile",
		icon: "mdi:account-circle-outline",
		iconWrap: "bg-[#F7F3FF]",
		iconColor: "text-[#7C3AED]",
	},
	{
		title: "Orari",
		value: "Lun - Ven: 9:00 - 18:00",
		icon: "mdi:clock-outline",
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
								<Icon name="mdi:shield-check-outline" class="text-[15px]" />
								Account verificato
							</span>
							<span class="inline-flex items-center gap-[6px] rounded-full bg-white px-[12px] py-[6px] text-[0.75rem] font-semibold text-[#095866] shadow-sm">
								<Icon name="mdi:clock-fast" class="text-[15px]" />
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
										<Icon :name="card.icon" :class="['text-[22px]', card.iconColor]" />
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
									<Icon name="mdi:file-document-edit-outline" class="text-[20px] text-[#E44203]" />
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
										<Icon name="mdi:check" class="text-[12px]" />
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
									<Icon name="mdi:headset" class="text-[22px] text-[#095866]" />
								</div>
								<div>
									<h2 class="text-[1.125rem] font-bold text-[#252B42]">Invia una richiesta</h2>
									<p class="mt-[4px] text-[0.8125rem] text-[#737373]">Oggetto chiaro e contesto essenziale per una risposta piu' rapida.</p>
								</div>
							</div>
							<span class="hidden tablet:inline-flex items-center gap-[6px] rounded-full bg-[#F8FCFD] px-[12px] py-[6px] text-[0.75rem] font-semibold text-[#095866]">
								<Icon name="mdi:send-check-outline" class="text-[14px]" />
								Ticket diretto
							</span>
						</div>

						<div class="mb-[20px]">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Oggetto *</label>
							<input
								v-model="subject"
								type="text"
								placeholder="Es. Problema con la spedizione #1234"
								class="w-full px-[14px] py-[12px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[16px] text-[0.9375rem] text-[#252B42] placeholder:text-[#a0a0a0] focus:border-[#095866] focus:outline-none transition-colors" />
						</div>

						<div class="mb-[24px]">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[6px]">Messaggio *</label>
							<textarea
								v-model="message"
								rows="6"
								placeholder="Descrivi il tuo problema o la tua richiesta..."
								class="w-full px-[14px] py-[12px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[16px] text-[0.9375rem] text-[#252B42] placeholder:text-[#a0a0a0] focus:border-[#095866] focus:outline-none transition-colors resize-none"></textarea>
						</div>

						<div v-if="feedback" :class="['mb-[20px] p-[14px] rounded-[16px] text-[0.875rem] font-medium flex items-center gap-[8px]', feedbackType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200']">
							<Icon :name="feedbackType === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'" class="text-[18px] shrink-0" />
							{{ feedback }}
						</div>

						<button
							@click="handleSubmit"
							:disabled="submitDisabled"
							:class="[
								'w-full py-[14px] rounded-[50px] font-semibold text-[0.9375rem] transition-all flex items-center justify-center gap-[8px]',
								submitDisabled
									? 'bg-gray-200 text-gray-400 cursor-not-allowed'
									: 'bg-[#095866] hover:bg-[#074a56] text-white cursor-pointer',
							]">
							<Icon v-if="!isSending" name="mdi:send" class="text-[18px]" />
							{{ isSending ? "Invio in corso..." : "Invia richiesta" }}
						</button>
					</div>
				</div>
			</div>
		</section>
</template>
