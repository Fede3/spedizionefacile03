<!--
  PAGINA: Privacy Policy (privacy-policy.vue)
  Informativa sulla privacy ai sensi del GDPR (Reg. UE 2016/679).
  Descrive raccolta, trattamento e protezione dei dati personali.
  CSS condiviso: assets/css/legal.css
-->
<script setup>
useSeoMeta({
	title: 'Privacy Policy | SpediamoFacile',
	ogTitle: 'Privacy Policy | SpediamoFacile',
	description: 'Informativa sulla privacy di SpediamoFacile ai sensi del GDPR. Scopri come trattiamo i tuoi dati personali.',
});

const lastUpdate = '31 marzo 2026';

const sections = [
	{
		title: '1. Titolare del trattamento',
		text: 'Il titolare del trattamento dei dati personali è SpediamoFacile S.r.l., con sede legale in Italia. Per qualsiasi richiesta relativa al trattamento dei dati personali è possibile scrivere a privacy@spediamofacile.it.',
	},
	{
		title: '2. Tipi di dati raccolti',
		text: 'Il sito raccoglie le seguenti categorie di dati: dati identificativi (nome, cognome, codice fiscale o P.IVA), dati di contatto (indirizzo e-mail, numero di telefono, indirizzo postale), dati di navigazione (indirizzo IP, tipo di browser, pagine visitate, orario di accesso), dati di pagamento (gestiti interamente da Stripe, non conservati sui nostri server) e dati relativi alle spedizioni (indirizzi di ritiro e consegna, dimensioni e peso dei colli).',
	},
	{
		title: '3. Finalità del trattamento',
		text: 'I dati personali vengono trattati per: erogazione del servizio di intermediazione spedizioni e gestione degli ordini; creazione e gestione dell\'account utente; elaborazione dei pagamenti e fatturazione; comunicazioni di servizio relative allo stato delle spedizioni; adempimento di obblighi di legge, fiscali e contabili; miglioramento del servizio attraverso analisi statistiche aggregate; invio di comunicazioni promozionali, solo previo consenso esplicito dell\'utente.',
	},
	{
		title: '4. Base giuridica del trattamento',
		text: 'Il trattamento dei dati si fonda su: esecuzione di un contratto di cui l\'interessato è parte (art. 6, par. 1, lett. b GDPR); adempimento di obblighi legali (art. 6, par. 1, lett. c GDPR); consenso dell\'interessato per finalità di marketing (art. 6, par. 1, lett. a GDPR); legittimo interesse del titolare per analisi statistiche e miglioramento del servizio (art. 6, par. 1, lett. f GDPR).',
	},
	{
		title: '5. Modalità di trattamento e conservazione',
		text: 'I dati sono trattati con strumenti informatici e misure di sicurezza adeguate a garantirne riservatezza e integrità. I dati personali vengono conservati per il tempo strettamente necessario alle finalità per cui sono stati raccolti e comunque non oltre i termini previsti dalla normativa vigente. I dati relativi alla fatturazione sono conservati per 10 anni ai sensi della normativa fiscale.',
	},
	{
		title: '6. Comunicazione e trasferimento dei dati',
		text: 'I dati possono essere comunicati a: corrieri partner per l\'esecuzione delle spedizioni; Stripe per l\'elaborazione dei pagamenti; fornitori di servizi tecnici (hosting, e-mail transazionali) che operano come responsabili del trattamento. I dati non vengono venduti né ceduti a terzi per finalità di marketing. Eventuali trasferimenti verso paesi extra-UE avvengono nel rispetto delle garanzie previste dal GDPR (decisioni di adeguatezza o clausole contrattuali standard).',
	},
	{
		title: '7. Cookie',
		text: 'Il sito utilizza cookie tecnici necessari al funzionamento e, previo consenso, cookie analitici per migliorare l\'esperienza di navigazione. Per informazioni dettagliate sui cookie utilizzati, consulta la nostra Cookie Policy.',
		link: { text: 'Vai alla Cookie Policy', url: '/cookie-policy' },
	},
	{
		title: '8. Diritti dell\'utente',
		text: 'Ai sensi degli articoli 15-22 del GDPR, l\'utente ha diritto di: accedere ai propri dati personali e ottenerne copia; rettificare dati inesatti o incompleti; cancellare i propri dati (diritto all\'oblio) quando non più necessari alle finalità del trattamento; limitare il trattamento in determinati casi; ricevere i dati in formato strutturato e leggibile (portabilità); opporsi al trattamento per motivi legittimi; revocare il consenso in qualsiasi momento, senza pregiudicare la liceità del trattamento precedente; proporre reclamo al Garante per la Protezione dei Dati Personali.',
	},
	{
		title: '9. Modifiche alla presente informativa',
		text: 'Il titolare si riserva di aggiornare la presente informativa per adeguarla alla normativa vigente o a nuove esigenze operative. Eventuali modifiche sostanziali verranno comunicate tramite il sito o via e-mail agli utenti registrati.',
	},
];
</script>

<template>
	<section class="legal-page">
		<div class="legal-page__container">
			<h1 class="legal-page__title">Privacy Policy</h1>
			<p class="legal-page__subtitle">Ultimo aggiornamento: {{ lastUpdate }}</p>

			<div
				v-for="(section, i) in sections"
				:key="i"
				class="legal-section"
			>
				<h2 class="legal-section__title">{{ section.title }}</h2>
				<p class="legal-section__text">{{ section.text }}</p>
				<NuxtLink
					v-if="section.link"
					:to="section.link.url"
					class="legal-link"
					style="display: inline-block; margin-top: 12px; font-size: 0.875rem;"
				>
					{{ section.link.text }}
				</NuxtLink>
			</div>

			<div class="legal-footer-card">
				<h2 class="legal-footer-card__title">Contatti per la privacy</h2>
				<p class="legal-footer-card__text">
					Per esercitare i tuoi diritti o per qualsiasi domanda sul trattamento dei dati, scrivi a
					<a href="mailto:privacy@spediamofacile.it" class="legal-link">privacy@spediamofacile.it</a>.
				</p>
			</div>
		</div>
	</section>
</template>
