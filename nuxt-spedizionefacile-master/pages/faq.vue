<!--
  PAGINA: FAQ - Domande Frequenti (faq.vue)
  Pagina con accordion di domande e risposte frequenti.
  Copre argomenti come: calcolo prezzi, costi, condizioni aziende,
  tracking, danni, portafoglio ricaricabile.
  Include dati strutturati JSON-LD per il SEO (FAQPage) per i rich snippets Google.
-->
<script setup>
// Meta tag SEO
useSeoMeta({
	title: 'FAQ - Domande Frequenti | SpedizioneFacile',
	ogTitle: 'FAQ | SpedizioneFacile',
	description: 'Trova risposte alle domande più frequenti su SpedizioneFacile: prezzi, servizi, tracking, assicurazione, contrassegno e molto altro.',
	ogDescription: 'Domande frequenti su SpedizioneFacile: tutto quello che devi sapere sulle spedizioni.',
});

// Lista delle domande frequenti mostrate nell'accordion (UAccordion)
const items = ref([
	{
		label: "1. Come viene calcolato il prezzo di una spedizione su SpedizioneFacile?",
		content:
			"Il costo di ogni spedizione dipende da diversi fattori: peso e dimensioni del collo, destinazione, tipologia di servizio scelto (standard, espresso, internazionale) ed eventuali servizi aggiuntivi (assicurazione, contrassegno, consegna su appuntamento, ecc.). Il sistema calcola automaticamente il prezzo in tempo reale prima della conferma, così puoi vedere subito tutte le opzioni disponibili e scegliere quella più conveniente per te, senza sorprese finali.",
	},
	{
		label: "2. Ci sono costi aggiuntivi o commissioni nascoste?",
		content:
			"No, non ci sono costi di attivazione, canoni fissi o commissioni nascoste. Paghi solo le spedizioni e i servizi aggiuntivi che selezioni in fase di ordine. Eventuali costi extra richiesti dal corriere (ad esempio giacenza prolungata, modifica dell'indirizzo, mancato ritiro per causa del mittente) vengono sempre indicati e rendicontati in modo trasparente nel tuo profilo.",
	},
	{
		label: "3. Posso avere condizioni economiche personalizzate per la mia azienda?",
		content:
			"Sì. Se la tua azienda spedisce volumi regolari o elevati, possiamo valutare tariffe dedicate e modalità di fatturazione su misura. Dopo la registrazione puoi contattarci, indicarci i volumi medi e le tipologie di spedizione di cui hai bisogno: il nostro team ti proporrà un profilo personalizzato con listino dedicato e gestione semplificata dei pagamenti.",
	},
	{
		label: "4. Posso provare il servizio prima di impegnarmi?",
		content:
			"La registrazione a SpedizioneFacile è gratuita e senza vincoli. Puoi creare il tuo account, simulare preventivi, salvare indirizzi e testare il flusso di creazione spedizione. Paghi solo quando confermi un ordine reale. Per le aziende è possibile richiedere anche una sessione di affiancamento iniziale per configurare al meglio profilo, rubrica, centri di costo e modalità di pagamento.",
	},
	{
		label: "5. Ci sono vincoli contrattuali o posso smettere di usare il servizio quando voglio?",
		content:
			"No, non ci sono vincoli contrattuali né obblighi di volumi minimi. Il servizio è completamente flessibile: puoi utilizzarlo quando vuoi e interrompere in qualsiasi momento senza penali. Non ci sono canoni mensili né costi fissi. Paghi esclusivamente le spedizioni che decidi di effettuare, quando le effettui. Il tuo account resta attivo e puoi tornare a spedire in qualsiasi momento.",
	},
	{
		label: "6. Come posso controllare lo stato delle mie spedizioni?",
		content:
			"Ogni spedizione viene associata a un codice di monitoraggio. Dal pannello di SpedizioneFacile puoi vedere in tempo reale lo stato di tutti gli invii: ritiro effettuato, in transito, in consegna, consegnato, eventuali giacenze o problemi segnalati dal corriere. Puoi consultare lo storico completo, scaricare le prove di consegna (dove disponibili) e ricevere avvisi in caso di anomalie, così da intervenire subito.",
	},
	{
		label: "7. Cosa succede se un pacco viene danneggiato o non arriva a destinazione?",
		content:
			"In caso di smarrimento, danneggiamento o consegna problematica, puoi aprire una segnalazione direttamente dalla tua area riservata. Ti guidiamo nella raccolta dei documenti necessari (foto del danno, prova di valore della merce, ecc.) e inoltriamo la richiesta al corriere secondo le procedure previste. L'eventuale rimborso dipende dalle condizioni del vettore e dall'eventuale copertura assicurativa aggiuntiva selezionata in fase di ordine.",
	},
	{
		label: "8. Come funziona il portafoglio ricaricabile di SpedizioneFacile?",
		content:
			"Il portafoglio digitale è un credito prepagato che puoi utilizzare per pagare rapidamente tutte le spedizioni. Puoi ricaricarlo con i metodi di pagamento disponibili (ad esempio carta, bonifico, altri sistemi elettronici), vedere in qualsiasi momento saldo e movimenti, associare le spese a diversi centri di costo e scaricare i relativi documenti contabili. Il portafoglio ti permette di velocizzare il processo di acquisto, evitare pagamenti ripetuti per ogni singola spedizione e avere sempre sotto controllo quanto stai spendendo.",
	},
]);

useHead({
	script: [
		{
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'FAQPage',
				mainEntity: [
					{
						'@type': 'Question',
						name: 'Come viene calcolato il prezzo di una spedizione su SpedizioneFacile?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Il costo di ogni spedizione dipende da peso e dimensioni del collo, destinazione, tipologia di servizio scelto ed eventuali servizi aggiuntivi. Il sistema calcola automaticamente il prezzo in tempo reale prima della conferma.',
						},
					},
					{
						'@type': 'Question',
						name: 'Ci sono costi aggiuntivi o commissioni nascoste?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'No, non ci sono costi di attivazione, canoni fissi o commissioni nascoste. Paghi solo le spedizioni e i servizi aggiuntivi che selezioni in fase di ordine.',
						},
					},
					{
						'@type': 'Question',
						name: 'Come posso controllare lo stato delle mie spedizioni?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Ogni spedizione viene associata a un codice di monitoraggio. Dal pannello di SpedizioneFacile puoi vedere in tempo reale lo stato di tutti gli invii.',
						},
					},
					{
						'@type': 'Question',
						name: 'Come funziona il portafoglio ricaricabile di SpedizioneFacile?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Il portafoglio digitale è un credito prepagato che puoi utilizzare per pagare rapidamente tutte le spedizioni. Puoi ricaricarlo con i metodi di pagamento disponibili.',
						},
					},
				],
			}),
		},
	],
});
</script>

<!-- Miglioramento UX: aggiunto titolo, sottotitolo e spaziatura per migliorare la leggibilita' e la gerarchia visiva -->
<template>
	<section class="py-[40px] desktop:py-[80px]">
		<div class="my-container">
			<!-- Icona e titolo sezione FAQ -->
			<div class="flex justify-center mb-[12px]">
				<div class="w-[56px] h-[56px] rounded-full bg-[#e8f4fb] flex items-center justify-center">
					<Icon name="mdi:frequently-asked-questions" class="text-[28px] text-[#1a7fba]" />
				</div>
			</div>
			<h1 class="text-[1.75rem] desktop:text-[2.5rem] font-bold text-[#252B42] text-center mb-[8px]">Domande Frequenti</h1>
			<p class="text-[0.9375rem] text-[#737373] text-center max-w-[500px] mx-auto mb-[40px] leading-[1.6]">Trova risposte alle domande piu' comuni su SpedizioneFacile.</p>
			<UAccordion :items="items" />
			<!-- CTA finale: se l'utente non trova la risposta, lo indirizziamo al form di contatto -->
			<div class="mt-[40px] text-center bg-[#F8F9FB] rounded-[16px] p-[32px]">
				<p class="text-[0.9375rem] text-[#737373] mb-[16px]">Non hai trovato la risposta che cercavi?</p>
				<NuxtLink to="/contatti" class="inline-flex items-center gap-[8px] px-[24px] py-[12px] bg-[#095866] text-white rounded-[10px] font-semibold text-[0.9375rem] hover:bg-[#074a56] transition-colors">
					<Icon name="mdi:email-outline" class="text-[18px]" />
					Contattaci
				</NuxtLink>
			</div>
		</div>
	</section>
</template>
