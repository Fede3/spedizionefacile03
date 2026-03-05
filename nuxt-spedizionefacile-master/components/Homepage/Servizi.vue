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
		icon: '/img/quote/second-step/insurance-icon.png',
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
				<article
					v-for="service in services"
					:key="service.title"
					class="hp-services-card">
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

					<NuxtLink :to="service.url" class="hp-services-cta">{{ service.button }}</NuxtLink>
				</article>
			</div>
		</div>
	</section>
</template>

<style scoped>
.hp-services-section {
	margin-top: 92px;
	padding: 74px 0 64px;
	background: #f3f8fb;
	border-top: 1px solid #dbe7ee;
}

.hp-services-header {
	text-align: center;
	max-width: 860px;
	margin-inline: auto;
}

.hp-services-eyebrow {
	font-size: 0.8125rem;
	font-weight: 700;
	letter-spacing: 0.28px;
	text-transform: uppercase;
	color: #0c6674;
}

.hp-services-title {
	margin-top: 10px;
	font-size: clamp(1.95rem, 3.6vw, 3rem);
	line-height: 1.06;
	letter-spacing: -0.02em;
	font-weight: 800;
	color: #1d2738;
}

.hp-services-subtitle {
	margin-top: 12px;
	font-size: 1rem;
	line-height: 1.62;
	color: #607083;
}

.hp-services-grid {
	margin-top: 30px;
	display: grid;
	grid-template-columns: 1fr;
	gap: 14px;
}

.hp-services-card {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 18px;
	border-radius: 20px;
	border: 1px solid #d7e4eb;
	background: #ffffff;
	box-shadow: 0 4px 10px rgba(15, 23, 42, 0.05), 0 18px 30px rgba(15, 23, 42, 0.07);
	min-height: 230px;
}

.hp-services-head {
	display: flex;
	align-items: center;
	gap: 12px;
}

.hp-services-icon-wrap {
	width: 58px;
	height: 58px;
	border-radius: 16px;
	border: 1px solid #d1e1ea;
	background: #f7fbfd;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.hp-services-icon {
	width: 40px;
	height: 40px;
	object-fit: contain;
}

.hp-services-card-title {
	font-size: 1.24rem;
	line-height: 1.18;
	font-weight: 780;
	color: #1f2937;
}

.hp-services-card-text {
	font-size: 0.97rem;
	line-height: 1.58;
	color: #526172;
}

.hp-services-cta {
	margin-top: auto;
	height: 40px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	align-self: flex-start;
	padding: 0 15px;
	border-radius: 12px;
	background: #e44203;
	color: #fff;
	text-decoration: none;
	font-size: 0.89rem;
	font-weight: 700;
	transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.hp-services-cta:hover {
	background: #cb3a00;
	transform: translateY(-1px);
	box-shadow: 0 10px 20px rgba(228, 66, 3, 0.22);
}

.hp-services-cta:focus-visible {
	outline: 2px solid #095866;
	outline-offset: 2px;
}

@media (min-width: 48rem) {
	.hp-services-section {
		margin-top: 112px;
		padding: 84px 0 72px;
	}

	.hp-services-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}
}

@media (min-width: 72rem) {
	.hp-services-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 18px;
	}
}

@media (max-width: 34rem) {
	.hp-services-section {
		padding: 60px 0 52px;
	}

	.hp-services-card {
		padding: 15px;
		border-radius: 18px;
		min-height: 212px;
	}

	.hp-services-icon-wrap {
		width: 52px;
		height: 52px;
	}
}

@media (prefers-reduced-motion: reduce) {
	.hp-services-cta {
		transition: none;
	}

	.hp-services-cta:hover {
		transform: none;
	}
}
</style>
