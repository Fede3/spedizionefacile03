<script setup>
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
			"Il costo di ogni spedizione dipende da diversi fattori: peso e dimensioni del collo, destinazione, tipologia di servizio scelto (standard, espresso, internazionale) ed eventuali servizi aggiuntivi (assicurazione, contrassegno, consegna su appuntamento, ecc.). Il sistema calcola automaticamente il prezzo in tempo reale prima della conferma, così puoi vedere subito tutte le opzioni disponibili e scegliere quella più conveniente per te, senza sorprese finali.32",
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
</script>

<template>
	<section>
		<div class="my-container">
			<UAccordion :items="items" />
		</div>
	</section>
</template>
