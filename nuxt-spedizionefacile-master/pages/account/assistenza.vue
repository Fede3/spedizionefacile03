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
import { accountCardIcons } from '~/utils/accountNavigation';

/* Richiede che l'utente sia autenticato */
definePageMeta({
	middleware: ['app-auth'],
});

useSeoMeta({
	title: 'Assistenza account | SpediamoFacile',
	ogTitle: 'Assistenza account | SpediamoFacile',
	description: 'Apri e consulta richieste di supporto dalla tua area account SpediamoFacile.',
	ogDescription: 'Centro assistenza account con richieste e supporto dedicato su SpediamoFacile.',
});

const { user } = useSanctumAuth();
const sanctum = useSanctumClient();

/* Oggetto della richiesta di assistenza */
const subject = ref('');
/* Testo del messaggio di assistenza */
const message = ref('');
/* Indica se l'invio e' in corso */
const isSending = ref(false);
/* Messaggio di conferma o errore dopo l'invio */
const feedback = ref(null);
const feedbackType = ref('success');
const submitDisabled = computed(() => isSending.value || !subject.value.trim() || !message.value.trim());

const supportCards = computed(() => [
	{
		title: 'Email',
		value: 'assistenza@spediamofacile.it',
		iconKey: 'email',
	},
	{
		title: 'Account usato',
		value: user.value?.email || 'Email account non disponibile',
		iconKey: 'account',
	},
	{
		title: 'Orari',
		value: 'Lun - Ven: 9:00 - 18:00',
		iconKey: 'headset',
	},
]);

const supportChecklist = [
	"Indica il riferimento della spedizione o dell'ordine se esiste gia'.",
	"Descrivi il problema in modo concreto: cosa vedi, cosa ti aspettavi, quando e' successo.",
	'Se utile, aggiungi dettagli pratici per velocizzare la risposta del team.',
];

const supportHeaderMeta = computed(() => [
	{ label: 'Canale', value: 'Ticket diretto' },
	{ label: 'Tempo', value: 'Presa in carico rapida' },
]);

/**
 * Invia la richiesta di assistenza autenticata.
 * I ticket vengono salvati nel database e resi visibili nel pannello admin.
 */
const handleSubmit = async () => {
	if (!subject.value.trim() || !message.value.trim()) {
		feedback.value = 'Compila tutti i campi obbligatori.';
		feedbackType.value = 'error';
		return;
	}

	isSending.value = true;
	feedback.value = null;

	try {
		await sanctum('/api/support-tickets', {
			method: 'POST',
			body: {
				subject: subject.value.trim(),
				message: message.value.trim(),
			},
		});
		feedback.value = 'Richiesta inviata con successo. La trovi subito nel pannello assistenza del team.';
		feedbackType.value = 'success';
		subject.value = '';
		message.value = '';
	} catch (error) {
		feedback.value =
			error?.response?._data?.message || error?.data?.message || 'Non siamo riusciti a inviare la richiesta. Riprova tra poco.';
		feedbackType.value = 'error';
	} finally {
		isSending.value = false;
	}
};
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[28px] desktop:py-[56px]">
		<div class="my-container">
			<AccountPageHeader
				title="Assistenza"
				description="Apri una richiesta reale dal tuo account. Il team riceve il ticket con i tuoi dati gia' associati e puo' risponderti senza passaggi manuali."
				:crumbs="[{ label: 'Account', to: '/account' }, { label: 'Assistenza' }]">
				<template #meta>
					<div class="flex flex-wrap gap-[8px]">
						<span v-for="item in supportHeaderMeta" :key="item.label" class="sf-account-meta-pill">{{ item.label }}: {{ item.value }}</span>
					</div>
				</template>
			</AccountPageHeader>

			<div class="grid gap-[18px] desktop:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)] desktop:items-start">
				<div class="space-y-[14px]">
					<div class="grid grid-cols-1 gap-[12px] tablet:grid-cols-2 desktop:grid-cols-1">
						<div v-for="card in supportCards" :key="card.title" class="sf-account-panel rounded-[22px] p-[18px]">
							<div class="flex items-center gap-[12px]">
								<div class="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#F0F6F7] text-[#095866]">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										class="h-[20px] w-[20px]"
										fill="currentColor"
										v-html="accountCardIcons[card.iconKey]"></svg>
								</div>
								<div class="min-w-0">
									<p class="text-[0.8125rem] font-semibold uppercase tracking-[0.8px] text-[#737373]">{{ card.title }}</p>
									<p class="mt-[4px] break-words text-[0.9375rem] font-semibold text-[#252B42]">{{ card.value }}</p>
								</div>
							</div>
						</div>
					</div>

					<div class="sf-account-panel rounded-[22px] p-[18px]">
						<div class="flex items-center gap-[10px]">
							<div class="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[#F0F6F7] text-[#095866]">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									class="h-[20px] w-[20px]"
									fill="currentColor"
									v-html="accountCardIcons['clipboard-list']"></svg>
							</div>
							<div>
								<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[#095866]">Per velocizzare</p>
								<h3 class="mt-[2px] text-[1rem] font-bold text-[#252B42]">Cosa conviene scrivere</h3>
							</div>
						</div>
						<ul class="mt-[14px] space-y-[10px]">
							<li
								v-for="item in supportChecklist"
								:key="item"
								class="flex items-start gap-[10px] text-[0.875rem] leading-[1.55] text-[#404040]">
								<span
									class="mt-[2px] inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#F0F6F7] text-[#095866]">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor">
										<path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
									</svg>
								</span>
								{{ item }}
							</li>
						</ul>
					</div>
				</div>

				<div class="sf-account-panel rounded-[24px] p-[20px] desktop:p-[28px]">
					<div class="flex items-start justify-between gap-[12px] mb-[20px] desktop:mb-[24px]">
						<div class="flex items-center gap-[12px]">
							<div class="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#F0F6F7] text-[#095866]">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									class="h-[22px] w-[22px]"
									fill="currentColor"
									v-html="accountCardIcons.headset"></svg>
							</div>
							<div>
								<h2 class="text-[1.125rem] font-bold text-[#252B42]">Invia una richiesta</h2>
								<p class="mt-[4px] text-[0.8125rem] text-[#737373]">Oggetto chiaro e contesto essenziale per una risposta piu' rapida.</p>
							</div>
						</div>
						<span
							class="hidden tablet:inline-flex items-center gap-[6px] rounded-full bg-[#F8FCFD] px-[12px] py-[6px] text-[0.75rem] font-semibold text-[#095866]">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								class="w-[14px] h-[14px]"
								fill="currentColor"
								v-html="accountCardIcons.email"></svg>
							Ticket diretto
						</span>
					</div>

					<div class="mb-[20px]">
						<label class="form-label">Oggetto *</label>
						<input v-model="subject" type="text" placeholder="Es. Problema con la spedizione #1234" class="form-input" />
					</div>

					<div class="mb-[24px]">
						<label class="form-label">Messaggio *</label>
						<textarea
							v-model="message"
							rows="6"
							placeholder="Descrivi il tuo problema o la tua richiesta..."
							class="form-input resize-none"></textarea>
					</div>

					<div v-if="feedback" :class="['mb-[20px] ux-alert', feedbackType === 'success' ? 'ux-alert--success' : 'ux-alert--critical']">
						<svg
							v-if="feedbackType === 'success'"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							class="ux-alert__icon shrink-0"
							fill="currentColor">
							<path
								d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" />
						</svg>
						<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="ux-alert__icon shrink-0" fill="currentColor">
							<path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
						</svg>
						<span>{{ feedback }}</span>
					</div>

					<button
						@click="handleSubmit"
						:disabled="submitDisabled"
						class="btn-cta btn-compact flex w-full items-center justify-center gap-[8px] py-[14px] text-[0.9375rem]">
						<svg v-if="!isSending" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor">
							<path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
						</svg>
						{{ isSending ? 'Invio in corso...' : 'Invia richiesta' }}
					</button>
				</div>
			</div>
		</div>
	</section>
</template>
