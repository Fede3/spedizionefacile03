<script setup>
const steps = [
	{
		indexLabel: '01',
		title: 'Pacco e dimensioni',
		description: 'Inserisci peso e misure: ottieni subito un totale leggibile e coerente.',
		icon: '/img/homepage/timeline/weight.png',
	},
	{
		indexLabel: '02',
		title: 'Servizi aggiuntivi',
		description: 'Attiva solo ciò che serve: assicurazione, contrassegno, senza etichetta.',
		icon: '/img/homepage/timeline/services.png',
	},
	{
		indexLabel: '03',
		title: 'Ritiro e consegna',
		description: 'Definisci mittente, destinatario e data in un flusso lineare e guidato.',
		icon: '/img/homepage/timeline/shipping.png',
	},
	{
		indexLabel: '04',
		title: 'Conferma e pagamento',
		description: 'Conferma in sicurezza e ricevi un riepilogo completo della spedizione.',
		icon: '/img/homepage/timeline/pay.png',
	},
];
</script>

<template>
	<section class="hp-step-section cv-auto">
		<div class="my-container font-montserrat">
			<div class="hp-step-shell">
				<header class="hp-step-header">
					<p class="hp-step-eyebrow">Come funziona</p>
					<h2 class="hp-step-title">Spedisci in 4 passaggi, senza attriti</h2>
					<p class="hp-step-subtitle">
						Dalla quotazione alla conferma: un percorso chiaro, leggibile e stabile su desktop e mobile.
					</p>
				</header>

				<ol class="hp-step-timeline">
					<li
						v-for="step in steps"
						:key="step.title"
						class="hp-step-card">
						<span class="hp-step-ghost" aria-hidden="true">{{ step.indexLabel }}</span>
						<div class="hp-step-icon-wrap">
							<NuxtImg
								:src="step.icon"
								:alt="step.title"
								width="88"
								height="88"
								loading="lazy"
								decoding="async"
								class="hp-step-icon" />
						</div>
						<div class="hp-step-content">
							<h3 class="hp-step-card-title">{{ step.title }}</h3>
							<p class="hp-step-card-text">{{ step.description }}</p>
						</div>
					</li>
				</ol>

				<div class="hp-step-cta-row">
					<a href="/#preventivo" class="hp-step-cta">Calcola il prezzo</a>
				</div>
			</div>
		</div>
	</section>
</template>

<\!-- CSS in assets/css/homepage-step.css -->
