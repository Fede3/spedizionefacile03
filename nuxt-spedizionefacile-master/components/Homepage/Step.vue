<script setup>
const steps = [
	{
		num: '01',
		title: 'Pacco e dimensioni',
		description: 'Inserisci peso e misure: ottieni subito un totale leggibile e coerente.',
	},
	{
		num: '02',
		title: 'Servizi aggiuntivi',
		description: 'Attiva solo ciò che serve: assicurazione, contrassegno, senza etichetta.',
	},
	{
		num: '03',
		title: 'Ritiro e consegna',
		description: 'Definisci mittente, destinatario e data in un flusso lineare e guidato.',
	},
	{
		num: '04',
		title: 'Conferma e pagamento',
		description: 'Conferma in sicurezza e ricevi un riepilogo completo della spedizione.',
	},
];
</script>

<template>
	<section class="hp-step-section">
		<div class="my-container font-montserrat">
			<div class="hp-step-shell">
				<header class="hp-step-header">
					<p class="hp-step-eyebrow">Come funziona</p>
					<h2 class="hp-step-title">Spedisci in 4 passaggi, senza attriti</h2>
					<p class="hp-step-lead">
						Dalla quotazione alla conferma: un percorso chiaro, leggibile e stabile su desktop e mobile.
					</p>
				</header>

				<ol class="hp-step-timeline">
					<!-- Desktop connecting gradient line -->
					<li class="hp-step-connecting-line" aria-hidden="true" />

					<li
						v-for="(step, idx) in steps"
						:key="step.title"
						class="hp-step-card">

						<!-- Numero grande decorativo (sfondo) -->
						<span class="hp-step-deco-number" aria-hidden="true">{{ step.num }}</span>

						<!-- Step icon box -->
						<div class="hp-step-icon-box" aria-hidden="true">
							<!-- Pacco e dimensioni -->
							<svg v-if="idx === 0" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
							<!-- Servizi aggiuntivi -->
							<svg v-if="idx === 1" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
							<!-- Ritiro e consegna -->
							<svg v-if="idx === 2" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
							<!-- Conferma e pagamento -->
							<svg v-if="idx === 3" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
						</div>

						<div class="hp-step-card-content">
							<h3 class="hp-step-card-title">{{ step.title }}</h3>
							<p class="hp-step-card-text">{{ step.description }}</p>
						</div>
					</li>
				</ol>

				<!-- CTA rimosso: il preventivo è già nella homepage, non serve un link ridondante -->
			</div>
		</div>
	</section>
</template>

<!-- CSS in assets/css/homepage-servizi.css (step timeline section) -->
