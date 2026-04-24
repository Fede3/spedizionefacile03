<!-- COMPONENTE: Steps (Steps.vue) -->
<script setup>
// CSS split route-specific: il componente Steps è l'unico consumer
// di steps.css (homepage, /la-tua-spedizione, /riepilogo, /checkout).
import '~/assets/css/steps.css';

const props = defineProps({
	currentStep: { type: Number, default: -1 },
});

const emit = defineEmits(['navigate']);

const steps = ["Colli", "Servizi", "Indirizzi", "Pagamento"];
const route = useRoute();

// Auto-detect step from route if not explicitly passed
const activeStep = computed(() => {
	if (props.currentStep >= 0) return props.currentStep;
	if (route.name === 'index' || route.path === '/') return 0;
	if (route.path.includes('la-tua-spedizione')) {
		if (route.query.step === 'colli') return 0;
		if (route.query.step === 'ritiro') return 2;
		// NOTA: il vecchio step=conferma e' stato unificato nello step pagamento.
		// Manteniamo l'alias per non rompere deep-link esistenti.
		if (route.query.step === 'conferma' || route.query.step === 'pagamento') return 3;
		return 1;
	}
	// /riepilogo e /checkout sono trampolini storici → mappati su step 4 (Pagamento)
	if (route.path.includes('riepilogo')) return 3;
	if (route.path.includes('checkout')) return 3;
	return 0;
});

const currentStepLabel = computed(() => steps[activeStep.value] || steps[0]);
const progressPercent = computed(() => (((activeStep.value + 1) / steps.length) * 100));

const canNavigate = (index) => {
	return index < activeStep.value;
};

const isCompleted = (index) => {
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
	0: '/la-tua-spedizione/2?step=colli',
	1: '/la-tua-spedizione/2',
	2: '/la-tua-spedizione/2?step=ritiro',
	3: '/la-tua-spedizione/2?step=pagamento',
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
		<!-- Mobile: progress bar + label -->
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

		<!-- Desktop: pill-style stepper matching prototype -->
		<ol class="steps-figma-bar hidden desktop:flex">
			<template v-for="(step, index) in steps" :key="index">
				<!-- Connector line between steps -->
				<span
					v-if="index > 0"
					class="steps-figma-connector"
					:class="{ 'steps-figma-connector--done': isCompleted(index) }"
					aria-hidden="true" />

				<li
					class="steps-figma-item"
					:aria-current="index === activeStep ? 'step' : undefined"
					:aria-label="getStepAriaLabel(step, index)"
					:title="getStepAriaLabel(step, index)"
					:class="{
						'steps-figma-item--active': index === activeStep,
						'steps-figma-item--completed': isCompleted(index),
						'steps-figma-item--upcoming': index > activeStep,
					}"
					@click="handleClick(index)">
					<!-- Active: number inside translucent circle -->
					<span v-if="index === activeStep" class="steps-figma-circle steps-figma-circle--active">
						<span class="steps-figma-number">{{ index + 1 }}</span>
					</span>
					<!-- Completed: teal tinted check circle -->
					<span v-else-if="isCompleted(index)" class="steps-figma-circle steps-figma-circle--completed">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="20 6 9 17 4 12" />
						</svg>
					</span>
					<!-- Upcoming: bordered number circle -->
					<span v-else class="steps-figma-circle steps-figma-circle--upcoming">
						<span class="steps-figma-number">{{ index + 1 }}</span>
					</span>
					<span class="steps-figma-label">{{ step }}</span>
				</li>
			</template>
		</ol>
	</nav>
</template>

<!-- CSS in assets/css/steps.css -->
