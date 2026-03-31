<!--
	COMPONENTE: Steps (Steps.vue)
	SCOPO: Barra di navigazione a 5 step del processo di spedizione.

	DOVE SI USA: components/Preventivo.vue (step 0),
	             pages/la-tua-spedizione/[step].vue (step 1-2),
	             pages/riepilogo.vue (step 3), pages/checkout.vue (step 4)
	PROPS: currentStep (Number, default -1 = auto-detect dalla route)
	EMITS: navigate(index) — emesso quando l'utente clicca su uno step precedente

	DATI IN INGRESSO: route.path (per auto-detect dello step corrente), props.currentStep
	DATI IN USCITA: emit('navigate', index), navigazione diretta via navigateTo()

	VINCOLI: l'ordine degli step e le route associate in stepRoutes devono restare sincronizzati
	PUNTI DI MODIFICA SICURI: array steps (nomi), stepRoutes (URL associati)
	COLLEGAMENTI: components/Preventivo.vue, pages/la-tua-spedizione/[step].vue

	I 5 PASSI:
	1. Misure — inserimento dimensioni e peso del pacco
	2. Servizi — scelta dei servizi aggiuntivi
	3. Ritiro — inserimento indirizzo di ritiro e consegna
	4. Conferma — riepilogo di tutti i dati
	5. Pagamento — pagamento della spedizione

	COMPORTAMENTO:
	- Step attivo: evidenziato in arancione
	- Step completati: cliccabili per tornare indietro
	- Step futuri: grigi e non cliccabili
-->
<script setup>
const props = defineProps({
	currentStep: { type: Number, default: -1 },
});

const emit = defineEmits(['navigate']);

const steps = ["Misure", "Servizi", "Indirizzi", "Conferma", "Pagamento"];
const route = useRoute();

// Auto-detect step from route if not explicitly passed
const activeStep = computed(() => {
	if (props.currentStep >= 0) return props.currentStep;
	if (route.name === 'index' || route.path === '/') return 0;
	if (route.path.includes('la-tua-spedizione')) {
		// Se la query contiene step=ritiro, siamo allo step Indirizzi (2)
		if (route.query.step === 'ritiro') return 2;
		// Altrimenti siamo allo step Servizi (1)
		return 1;
	}
	if (route.path.includes('riepilogo')) return 3;
	if (route.path.includes('checkout')) return 4;
	return 0;
});

const currentStepLabel = computed(() => steps[activeStep.value] || steps[0]);
const progressPercent = computed(() => (((activeStep.value + 1) / steps.length) * 100));

const canNavigate = (index) => {
	return index < activeStep.value;
};

const getStepState = (index) => {
	if (index === activeStep.value) return 'attivo';
	if (index < activeStep.value) return 'completato';
	return 'futuro';
};

const getStepAriaLabel = (step, index) => {
	return `Passo ${index + 1} di ${steps.length}, ${step}, ${getStepState(index)}`;
};

const stepRoutes = {
	0: '/#preventivo',
	1: '/la-tua-spedizione/2',
	2: '/la-tua-spedizione/2?step=ritiro',
	3: '/riepilogo',
	4: '/checkout',
};

const handleClick = (index) => {
	if (canNavigate(index)) {
		emit('navigate', index);
		navigateTo(stepRoutes[index] || '/');
	}
};
</script>

<template>
	<nav class="steps-nav" id="preventivo" aria-label="Progresso spedizione">
		<div class="steps-mobile-shell desktop:hidden">
			<div class="steps-mobile-meta">
				<div class="steps-mobile-copy">
					<span class="steps-mobile-kicker">Passo {{ activeStep + 1 }} di {{ steps.length }}</span>
					<div class="steps-mobile-inline">
						<strong class="steps-mobile-title">{{ currentStepLabel }}</strong>
						<span class="steps-mobile-percent">{{ Math.round(progressPercent) }}%</span>
					</div>
				</div>
			</div>
			<div class="steps-mobile-track" aria-hidden="true">
				<span class="steps-mobile-track__bar" :style="{ width: `${progressPercent}%` }"></span>
			</div>
		</div>

		<ul class="steps-grid hidden desktop:grid">
			<li
				v-for="(step, index) in steps"
				:key="index"
				class="steps-pill-item transition-[background-color,color,opacity,border-color,box-shadow,transform] duration-150 select-none rounded-[16px] border"
				:aria-current="index === activeStep ? 'step' : undefined"
				:aria-label="getStepAriaLabel(step, index)"
				:title="getStepAriaLabel(step, index)"
				:class="{
					'steps-pill-active text-white font-semibold shadow-[0_2px_10px_rgba(228,66,3,0.2)] border-transparent': index === activeStep,
					'steps-pill-completed text-[#0d5965] cursor-pointer hover:text-[#0d5965]': canNavigate(index) && index !== activeStep,
					'steps-pill-upcoming text-[#6b7480] cursor-default': index > activeStep,
				}"
				@click="handleClick(index)">
				<span class="steps-pill-content">
					<span
						class="steps-pill-status"
						:class="{
							'is-active': index === activeStep,
							'is-completed': canNavigate(index) && index !== activeStep,
							'is-upcoming': index > activeStep,
						}"
						aria-hidden="true">
						<svg
							v-if="canNavigate(index) && index !== activeStep"
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.7"
							stroke-linecap="round"
							stroke-linejoin="round">
							<polyline points="20 6 9 17 4 12" />
						</svg>
						<span v-else>{{ index + 1 }}</span>
					</span>
					<span class="steps-pill-label">{{ step }}</span>
				</span>
			</li>
		</ul>
	</nav>
</template>

<\!-- CSS in assets/css/steps.css -->
