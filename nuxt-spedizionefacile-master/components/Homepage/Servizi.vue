<script setup>
const services = [
	{
		title: 'Ritiro a domicilio',
		description: 'Prenoti online, scegli data e indirizzo e mantieni il flusso lineare anche da smartphone.',
		button: 'Prenota ritiro',
		url: '/servizi',
	},
	{
		title: 'Senza etichetta',
		description: 'Se non hai stampante, il corriere porta e gestisce l\'etichetta al momento del ritiro.',
		button: 'Scopri il servizio',
		url: '/servizi',
	},
	{
		title: 'Tracking live',
		description: 'Aggiornamenti in tempo reale sullo stato della spedizione fino alla consegna.',
		button: 'Traccia ora',
		url: '/traccia-spedizione',
	},
	{
		title: 'Contrassegno',
		description: 'Incasso alla consegna con controllo diretto delle opzioni e riepilogo chiaro.',
		button: 'Dettagli',
		url: '/servizi/pagamento-alla-consegna',
	},
	{
		title: 'Assicurazione',
		description: 'Proteggi il valore della spedizione con attivazione rapida in un click.',
		button: 'Attiva copertura',
		url: '/servizi',
	},
	{
		title: 'Assistenza rapida',
		description: 'Supporto pratico dal preventivo alla consegna con risposte veloci e tracciabili.',
		button: 'Contattaci',
		url: '/contatti',
	},
];
</script>

<template>
	<section class="hp-services-section">
		<div class="my-container font-montserrat">
			<header class="hp-services-header">
				<p class="hp-services-eyebrow">Servizi</p>
				<h2 class="hp-services-title">Tutto quello che ti serve in un unico flusso</h2>
				<p class="hp-services-subtitle">
					Opzioni chiare, attivabili in pochi secondi, pensate per spedire meglio senza aumentare la complessità operativa.
				</p>
			</header>

			<div class="hp-services-grid">
				<NuxtLink
					v-for="(service, i) in services"
					:key="service.title"
					:to="service.url"
					class="hp-services-card"
					:aria-label="`${service.title}: ${service.button}`">
					<div class="hp-services-head">
						<div class="hp-services-icon-wrap">
							<!-- Ritiro a domicilio -->
							<svg v-if="i === 0" class="hp-services-icon-svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
							<!-- Senza etichetta -->
							<svg v-if="i === 1" class="hp-services-icon-svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
							<!-- Tracking live -->
							<svg v-if="i === 2" class="hp-services-icon-svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>
							<!-- Contrassegno -->
							<svg v-if="i === 3" class="hp-services-icon-svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
							<!-- Assicurazione -->
							<svg v-if="i === 4" class="hp-services-icon-svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>
							<!-- Assistenza rapida -->
							<svg v-if="i === 5" class="hp-services-icon-svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
						</div>
						<h3 class="hp-services-card-title">{{ service.title }}</h3>
					</div>

					<p class="hp-services-card-text">{{ service.description }}</p>

					<span class="hp-services-cta-pill">{{ service.button }}</span>
				</NuxtLink>
			</div>
		</div>
	</section>
</template>

<!-- CSS in assets/css/homepage-servizi.css -->
