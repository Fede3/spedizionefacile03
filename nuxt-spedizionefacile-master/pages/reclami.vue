<!--
  PAGINA: Reclami (reclami.vue)
  Pagina informativa su come presentare un reclamo per una spedizione.
  CSS condiviso: assets/css/legal.css
-->
<script setup>
useSeoMeta({
	title: 'Reclami | SpediamoFacile',
	ogTitle: 'Reclami | SpediamoFacile',
	description: 'Presenta un reclamo per la tua spedizione con SpediamoFacile: scopri le modalità e i tempi di gestione.',
});

const lastUpdate = '31 marzo 2026';

const sections = [
	{
		title: '1. Quando presentare un reclamo',
		text: 'Puoi presentare un reclamo se hai riscontrato un problema con la tua spedizione: ritardo significativo nella consegna, pacco danneggiato, smarrito o consegnato a un indirizzo errato. Il reclamo deve essere inoltrato entro 14 giorni dalla data di consegna prevista o dall\'ultimo aggiornamento di tracking disponibile.',
	},
	{
		title: '2. Informazioni necessarie',
		text: 'Per consentirci di gestire il reclamo in modo rapido ed efficace, includi nella segnalazione: il numero d\'ordine o il codice di tracking, una descrizione chiara del problema riscontrato, eventuali fotografie del pacco danneggiato (se applicabile) e i tuoi dati di contatto.',
	},
	{
		title: '3. Tempi di gestione',
		text: 'Una volta ricevuto il reclamo, il nostro team lo prenderà in carico entro 2 giorni lavorativi. La risoluzione dipende dalla tipologia del problema e dalla collaborazione del corriere: i casi più semplici vengono risolti in 5-7 giorni lavorativi, mentre quelli che richiedono indagini più approfondite possono richiedere fino a 30 giorni.',
	},
];
</script>

<template>
	<section class="legal-page">
		<div class="legal-page__container">
			<h1 class="legal-page__title">Reclami</h1>
			<p class="legal-page__subtitle">Ultimo aggiornamento: {{ lastUpdate }}</p>

			<!-- Come contattarci -->
			<div class="legal-section">
				<h2 class="legal-section__title">Come contattarci</h2>
				<p class="legal-section__text" style="margin-bottom: 16px;">Se hai riscontrato un problema con la tua spedizione, puoi presentare un reclamo attraverso uno dei seguenti canali:</p>
				<div class="legal-channels">
					<div class="legal-channel-card">
						<svg class="legal-channel-card__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
						<div>
							<p class="legal-channel-card__title">Via email</p>
							<p class="legal-channel-card__text">Scrivi a <a href="mailto:assistenza@spediamofacile.it" class="legal-link">assistenza@spediamofacile.it</a> indicando il numero d'ordine e una descrizione del problema.</p>
						</div>
					</div>
					<div class="legal-channel-card">
						<svg class="legal-channel-card__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
						<div>
							<p class="legal-channel-card__title">Dall'area personale</p>
							<p class="legal-channel-card__text">Accedi alla sezione <NuxtLink to="/account/assistenza" class="legal-link">Assistenza</NuxtLink> per aprire un ticket di supporto.</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Sezioni informative -->
			<div
				v-for="(section, i) in sections"
				:key="i"
				class="legal-section"
			>
				<h2 class="legal-section__title">{{ section.title }}</h2>
				<p class="legal-section__text">{{ section.text }}</p>
			</div>

			<!-- Footer contatti -->
			<div class="legal-footer-card">
				<h2 class="legal-footer-card__title">Hai bisogno di assistenza?</h2>
				<p class="legal-footer-card__text">
					Per qualsiasi domanda, scrivi a
					<a href="mailto:assistenza@spediamofacile.it" class="legal-link">assistenza@spediamofacile.it</a>
					oppure consulta le nostre
					<NuxtLink to="/termini-condizioni" class="legal-link">Condizioni di servizio</NuxtLink>
					per dettagli su rimborsi e cancellazioni.
				</p>
			</div>
		</div>
	</section>
</template>
