<!--
  PAGINA: FAQ - Domande Frequenti (faq.vue)
  Versione mobile-first con intro panel, accordion custom e CTA finale piu' guidata.
-->
<script setup>
useSeoMeta({
	title: 'FAQ - Domande Frequenti | SpediamoFacile',
	ogTitle: 'FAQ | SpediamoFacile',
	description: 'Trova risposte alle domande più frequenti su SpediamoFacile: prezzi, servizi, tracking, assicurazione, contrassegno e molto altro.',
	ogDescription: 'Domande frequenti su SpediamoFacile: tutto quello che devi sapere sulle spedizioni.',
});

const items = ref([
	{
		label: 'Come viene calcolato il prezzo di una spedizione su SpediamoFacile?',
		content:
			'Il costo di ogni spedizione dipende da peso e dimensioni del collo, destinazione, tipologia di servizio scelto ed eventuali servizi aggiuntivi. Il sistema calcola automaticamente il prezzo in tempo reale prima della conferma, cosi puoi vedere subito tutte le opzioni disponibili e scegliere quella piu conveniente, senza sorprese finali.',
	},
	{
		label: 'Ci sono costi aggiuntivi o commissioni nascoste?',
		content:
			'No. Non ci sono costi di attivazione, canoni fissi o commissioni nascoste. Paghi solo le spedizioni e i servizi aggiuntivi che selezioni in fase di ordine. Eventuali costi extra del corriere vengono rendicontati in modo trasparente nel tuo profilo.',
	},
	{
		label: 'Posso avere condizioni economiche personalizzate per la mia azienda?',
		content:
			'Si. Se la tua azienda spedisce volumi regolari o elevati possiamo valutare tariffe dedicate e modalita di fatturazione su misura. Dopo la registrazione puoi contattarci indicando i volumi medi e le esigenze operative.',
	},
	{
		label: 'Posso provare il servizio prima di impegnarmi?',
		content:
			'La registrazione a SpediamoFacile e gratuita e senza vincoli. Puoi creare il tuo account, simulare preventivi, salvare indirizzi e testare il flusso di creazione spedizione. Paghi solo quando confermi un ordine reale.',
	},
	{
		label: 'Ci sono vincoli contrattuali o posso smettere di usare il servizio quando voglio?',
		content:
			'Non ci sono vincoli contrattuali ne obblighi di volumi minimi. Il servizio e flessibile: puoi usarlo quando vuoi e interromperlo senza penali. Non ci sono canoni mensili ne costi fissi.',
	},
	{
		label: 'Come posso controllare lo stato delle mie spedizioni?',
		content:
			'Ogni spedizione viene associata a un codice di monitoraggio. Dal pannello di SpediamoFacile puoi vedere in tempo reale lo stato di tutti gli invii, consultare lo storico e ricevere avvisi in caso di anomalie.',
	},
	{
		label: 'Cosa succede se un pacco viene danneggiato o non arriva a destinazione?',
		content:
			'In caso di smarrimento, danneggiamento o consegna problematica, puoi aprire una segnalazione dalla tua area riservata. Ti guidiamo nella raccolta dei documenti necessari e inoltriamo la richiesta al corriere secondo le procedure previste.',
	},
	{
		label: 'Come funziona il portafoglio ricaricabile di SpediamoFacile?',
		content:
			'Il portafoglio digitale e un credito prepagato che puoi usare per pagare rapidamente tutte le spedizioni. Puoi ricaricarlo con i metodi disponibili, vedere saldo e movimenti e velocizzare il processo di acquisto.',
	},
]);

const faqTopics = ['Prezzi', 'Tracking', 'Contrassegno', 'Assicurazione', 'Account', 'Supporto'];
const openFaqIndex = ref(0);

const toggleFaq = (index) => {
	openFaqIndex.value = openFaqIndex.value === index ? -1 : index;
};

useHead({
	script: [
		{
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'FAQPage',
				mainEntity: items.value.map((item) => ({
					'@type': 'Question',
					name: item.label,
					acceptedAnswer: {
						'@type': 'Answer',
						text: item.content,
					},
				})),
			}),
		},
	],
});
</script>

<template>
	<section class="faq-page-shell">
		<div class="my-container">
			<div class="faq-intro-panel">
				<div class="faq-intro-panel__copy">
					<p class="faq-intro-panel__eyebrow">FAQ</p>
					<h1 class="faq-intro-panel__title">Risposte rapide ai dubbi che bloccano piu spesso il flusso.</h1>
					<p class="faq-intro-panel__text">Prezzi, tracking, servizi aggiuntivi, account e supporto: qui trovi le risposte essenziali senza dover inseguire pagine o passaggi inutili.</p>
				</div>

				<div class="faq-intro-panel__topics">
					<span v-for="topic in faqTopics" :key="topic" class="faq-intro-panel__topic">{{ topic }}</span>
				</div>
			</div>

			<div class="faq-list-shell">
				<article
					v-for="(item, index) in items"
					:key="item.label"
					class="faq-card"
					:class="{ 'is-open': openFaqIndex === index }"
				>
					<button type="button" class="faq-card__trigger" @click="toggleFaq(index)">
						<span class="faq-card__number">{{ String(index + 1).padStart(2, '0') }}</span>
						<span class="faq-card__question">{{ item.label }}</span>
						<span class="faq-card__icon-shell">
							<svg class="faq-card__icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
						</span>
					</button>
					<div class="faq-card__panel">
						<div class="faq-card__panel-inner">
							<p class="faq-card__answer">{{ item.content }}</p>
						</div>
					</div>
				</article>
			</div>

			<div class="faq-cta-panel">
				<div class="faq-cta-panel__copy">
					<h2 class="faq-cta-panel__title">Non hai trovato la risposta?</h2>
					<p class="faq-cta-panel__text">Se il dubbio riguarda una spedizione concreta o un caso operativo, conviene scriverci con il contesto giusto oppure partire dal preventivo.</p>
				</div>
				<div class="faq-cta-panel__actions">
					<NuxtLink to="/contatti" class="faq-cta-panel__button faq-cta-panel__button--primary">Contattaci</NuxtLink>
					<NuxtLink to="/preventivo" class="faq-cta-panel__button faq-cta-panel__button--secondary">Vai al preventivo</NuxtLink>
				</div>
			</div>
		</div>
	</section>
</template>

<!-- CSS in assets/css/faq.css -->
