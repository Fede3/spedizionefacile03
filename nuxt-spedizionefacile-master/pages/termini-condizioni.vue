<!--
  PAGINA: Termini e Condizioni (termini-condizioni.vue)
  Condizioni generali di servizio per l'utilizzo della piattaforma SpediamoFacile.
  CSS condiviso: assets/css/legal.css
-->
<script setup>
useSeoMeta({
	title: 'Termini e Condizioni | SpediamoFacile',
	ogTitle: 'Termini e Condizioni | SpediamoFacile',
	description: 'Termini e condizioni di utilizzo del servizio di intermediazione spedizioni SpediamoFacile.',
});

const lastUpdate = '31 marzo 2026';

const sections = [
	{
		title: '1. Oggetto del servizio',
		text: 'SpediamoFacile è una piattaforma di intermediazione che consente agli utenti di confrontare, prenotare e gestire spedizioni nazionali e internazionali tramite corrieri partner. SpediamoFacile non è un corriere e non esegue direttamente il trasporto dei colli: agisce come intermediario tra l\'utente e i vettori selezionati, facilitando la prenotazione, il pagamento e il monitoraggio delle spedizioni.',
	},
	{
		title: '2. Registrazione e account',
		text: 'L\'utilizzo completo dei servizi richiede la creazione di un account gratuito con dati veritieri e aggiornati. L\'utente è responsabile della riservatezza delle proprie credenziali e di tutte le attività svolte tramite il proprio account. SpediamoFacile si riserva di sospendere o cancellare account in caso di violazione dei presenti termini, utilizzo fraudolento o dichiarazioni false.',
	},
	{
		title: '3. Processo di ordine e pagamento',
		text: 'L\'utente inserisce i dati della spedizione, seleziona il servizio e i corrieri disponibili, ed effettua il pagamento online tramite i metodi accettati (carta di credito, portafoglio digitale). L\'ordine si considera confermato solo dopo l\'avvenuto pagamento. I prezzi visualizzati includono IVA ove applicabile e sono calcolati in tempo reale in base a peso, dimensioni, origine e destinazione del collo. Eventuali supplementi (contrassegno, assicurazione, sovrappeso) vengono indicati chiaramente prima della conferma.',
	},
	{
		title: '4. Obblighi dell\'utente',
		text: 'L\'utente si impegna a: fornire dati corretti e completi per mittente e destinatario; imballare adeguatamente il contenuto secondo le linee guida del corriere; non spedire merci vietate dalla legge, materiali pericolosi, infiammabili, deperibili o il cui trasporto sia proibito dalle normative vigenti; rendere il pacco disponibile al ritiro nella data e fascia oraria concordata. SpediamoFacile non è responsabile per ritardi, danni o mancate consegne derivanti da informazioni errate, imballaggio inadeguato o contenuto non conforme.',
	},
	{
		title: '5. Responsabilità di SpediamoFacile',
		text: 'SpediamoFacile si impegna a trasmettere correttamente gli ordini ai corrieri partner e a fornire strumenti di tracciamento e assistenza. Tuttavia, in qualità di intermediario, SpediamoFacile non è direttamente responsabile per: ritardi nella consegna imputabili al corriere; danni al contenuto del pacco durante il trasporto; eventi di forza maggiore (calamità naturali, scioperi, emergenze sanitarie). In caso di problemi, SpediamoFacile facilita la comunicazione con il corriere e supporta l\'utente nella gestione del reclamo.',
	},
	{
		title: '6. Rimborsi e cancellazioni',
		text: 'L\'utente può richiedere la cancellazione dell\'ordine prima che il corriere abbia preso in carico il pacco, con rimborso completo. Dopo il ritiro del pacco, la cancellazione non è possibile e si applicano le politiche del corriere. In caso di smarrimento accertato, il rimborso viene calcolato secondo i termini contrattuali del corriere e l\'eventuale copertura assicurativa sottoscritta. I rimborsi vengono elaborati entro 14 giorni lavorativi dalla conferma, con lo stesso metodo di pagamento utilizzato per l\'acquisto.',
	},
	{
		title: '7. Assicurazione e contrassegno',
		text: 'L\'utente può sottoscrivere una copertura assicurativa aggiuntiva in fase di ordine, che copre smarrimento e danneggiamento fino al valore dichiarato. Il servizio di contrassegno (pagamento alla consegna) è disponibile per le spedizioni nazionali secondo le condizioni indicate al momento dell\'ordine. Entrambi i servizi comportano costi aggiuntivi esplicitamente indicati prima della conferma.',
	},
	{
		title: '8. Proprietà intellettuale',
		text: 'Tutti i contenuti del sito (testi, grafica, logo, software) sono di proprietà di SpediamoFacile o dei rispettivi licenzianti e sono protetti dalle leggi sul diritto d\'autore. È vietata la riproduzione, distribuzione o utilizzo non autorizzato dei contenuti del sito.',
	},
	{
		title: '9. Modifiche ai termini',
		text: 'SpediamoFacile si riserva di aggiornare i presenti termini in qualsiasi momento. Le modifiche entrano in vigore dalla data di pubblicazione sul sito. L\'utilizzo continuato del servizio dopo la pubblicazione delle modifiche costituisce accettazione dei nuovi termini. In caso di modifiche sostanziali, gli utenti registrati verranno informati tramite e-mail.',
	},
	{
		title: '10. Legge applicabile e foro competente',
		text: 'I presenti termini sono regolati dalla legge italiana. Per qualsiasi controversia derivante dall\'utilizzo del servizio sarà competente il foro del luogo di residenza del consumatore, ai sensi del D.Lgs. 206/2005 (Codice del Consumo). Per utenti professionali, il foro competente è quello della sede legale di SpediamoFacile.',
	},
];
</script>

<template>
	<section class="legal-page">
		<div class="legal-page__container">
			<h1 class="legal-page__title">Termini e Condizioni</h1>
			<p class="legal-page__subtitle">Ultimo aggiornamento: {{ lastUpdate }}</p>

			<div
				v-for="(section, i) in sections"
				:key="i"
				class="legal-section"
			>
				<h2 class="legal-section__title">{{ section.title }}</h2>
				<p class="legal-section__text">{{ section.text }}</p>
			</div>

			<div class="legal-footer-card">
				<h2 class="legal-footer-card__title">Hai domande sui termini?</h2>
				<p class="legal-footer-card__text">
					Per chiarimenti sui presenti termini e condizioni, contattaci a
					<a href="mailto:info@spediamofacile.it" class="legal-link">info@spediamofacile.it</a>
					oppure visita la pagina
					<NuxtLink to="/contatti" class="legal-link">Contatti</NuxtLink>.
				</p>
			</div>
		</div>
	</section>
</template>
