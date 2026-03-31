<script setup>
const services = [
	{
		title: 'Ritiro a domicilio',
		icon: '/img/homepage/services/home-pickup.svg',
		description: 'Prenoti online, scegli data e indirizzo e mantieni il flusso lineare anche da smartphone.',
		button: 'Prenota ritiro',
		url: '/servizi',
	},
	{
		title: 'Senza etichetta',
		icon: '/img/homepage/services/label-free-shipping.svg',
		description: 'Se non hai stampante, il corriere porta e gestisce l’etichetta al momento del ritiro.',
		button: 'Scopri il servizio',
		url: '/servizi',
	},
	{
		title: 'Tracking live',
		icon: '/img/homepage/services/tracking-live.svg',
		description: 'Aggiornamenti in tempo reale sullo stato della spedizione fino alla consegna.',
		button: 'Traccia ora',
		url: '/traccia-spedizione',
	},
	{
		title: 'Contrassegno',
		icon: '/img/homepage/services/cash-on-delivery.svg',
		description: 'Incasso alla consegna con controllo diretto delle opzioni e riepilogo chiaro.',
		button: 'Dettagli',
		url: '/servizi/pagamento-alla-consegna',
	},
	{
		title: 'Assicurazione',
		icon: '/img/homepage/services/insurance-shield-check.svg',
		description: 'Proteggi il valore della spedizione con attivazione rapida in un click.',
		button: 'Attiva copertura',
		url: '/servizi',
	},
	{
		title: 'Assistenza rapida',
		icon: '/img/homepage/services/quick-assistance.svg',
		description: 'Supporto pratico dal preventivo alla consegna con risposte veloci e tracciabili.',
		button: 'Contattaci',
		url: '/contatti',
	},
];
</script>

<template>
	<section class="hp-services-section cv-auto">
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
					v-for="service in services"
					:key="service.title"
					:to="service.url"
					class="hp-services-card"
					:aria-label="`${service.title}: ${service.button}`">
					<div class="hp-services-head">
						<div class="hp-services-icon-wrap">
							<NuxtImg
								:src="service.icon"
								:alt="service.title"
								width="96"
								height="96"
								loading="lazy"
								decoding="async"
								class="hp-services-icon" />
						</div>
						<h3 class="hp-services-card-title">{{ service.title }}</h3>
					</div>

					<p class="hp-services-card-text">{{ service.description }}</p>

					<span class="hp-services-cta">{{ service.button }}</span>
				</NuxtLink>
			</div>
		</div>
	</section>
</template>

<\!-- CSS in assets/css/homepage-servizi.css -->
