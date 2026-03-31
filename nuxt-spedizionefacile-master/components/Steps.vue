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

<style scoped>
.steps-nav {
	width: 100%;
	overflow: visible;
}

.steps-mobile-shell {
	display: grid;
	gap: 7px;
	margin: 2px 0 10px;
	padding: 9px 12px 11px;
	border-radius: 16px;
	border: 1px solid #e5edf2;
	background: linear-gradient(180deg, #ffffff 0%, #f8fbfc 100%);
	box-shadow: 0 10px 24px rgba(9, 88, 102, 0.05);
}

.steps-mobile-meta {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: 10px;
}

.steps-mobile-copy {
	display: grid;
	gap: 2px;
	min-width: 0;
	width: 100%;
}

.steps-mobile-inline {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
}

.steps-mobile-kicker {
	font-size: 0.6875rem;
	line-height: 1;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: #738295;
}

.steps-mobile-title {
	font-size: 0.9375rem;
	line-height: 1.1;
	font-weight: 800;
	letter-spacing: -0.02em;
	color: #1f2a3c;
}

.steps-mobile-percent {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 52px;
	height: 28px;
	padding: 0 9px;
	border-radius: 999px;
	background: #edf6f8;
	border: 1px solid #c7dde2;
	font-size: 0.75rem;
	font-weight: 800;
	line-height: 1;
	color: #0e6572;
	flex: 0 0 auto;
}

.steps-mobile-track {
	width: 100%;
	height: 6px;
	border-radius: 999px;
	background: #e8eef3;
	overflow: hidden;
}

.steps-mobile-track__bar {
	display: block;
	height: 100%;
	border-radius: inherit;
	background: linear-gradient(90deg, #e45a1c 0%, #ef8250 100%);
	box-shadow: 0 4px 10px rgba(228, 90, 28, 0.14);
	transition: width var(--sf-motion-base) var(--sf-ease-soft);
}

.steps-nav::-webkit-scrollbar {
	display: none;
}

.steps-grid {
	display: grid;
	grid-template-columns: repeat(5, minmax(0, 1fr));
	gap: 4px;
	margin: 8px 0 10px;
	padding: 0;
	min-width: 0;
}

.steps-pill-item {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 0;
	min-height: 42px;
	padding: 0 3px;
	text-align: center;
	border-radius: 12px;
}

.steps-pill-content {
	display: flex;
	width: 100%;
	min-width: 0;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	gap: 4px;
}

.steps-pill-status {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	border-radius: 999px;
	background: #e3f0f3;
	color: #0c5662;
	font-size: 10px;
	font-weight: 800;
	line-height: 1;
	flex: 0 0 auto;
}

.steps-pill-status.is-active {
	background: rgba(255, 255, 255, 0.18);
	color: #ffffff;
}

.steps-pill-status.is-completed {
	background: #d4e8ed;
	color: #0c5662;
}

.steps-pill-status.is-upcoming {
	background: #eef2f6;
	color: #7a8390;
}

.steps-pill-label {
	display: inline-flex;
	max-width: 100%;
	align-items: center;
	justify-content: center;
	font-size: 8.5px;
	line-height: 1.1;
	font-weight: 700;
	letter-spacing: -0.12px;
	text-align: center;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: normal;
}

.steps-pill-completed {
	background: #edf6f8;
	border-color: #bdd5dc;
	font-weight: 700;
}

.steps-pill-completed:hover {
	background: #e5f1f4;
	border-color: #98bdc7;
}

.steps-pill-upcoming {
	background: #f5f7fa;
	border-color: #d7e1e8;
	color: #647282;
}

.steps-pill-active {
	background: #e45a1c;
	box-shadow: 0 10px 18px rgba(228, 90, 28, 0.22);
}

@media (min-width: 64rem) {
	.steps-nav {
		overflow: visible;
	}

	.steps-mobile-shell {
		display: none;
	}

	.steps-grid {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 10px;
		margin: 20px 0;
		min-width: 0;
	}

	.steps-pill-item {
		flex: 0 1 auto;
		min-height: 42px;
		padding-inline: 12px;
		border-radius: 999px;
	}

	.steps-pill-label {
		font-size: 14px;
		line-height: 1;
		letter-spacing: -0.28px;
		white-space: nowrap;
	}

	.steps-pill-content {
		flex-direction: row;
		gap: 8px;
	}
}
</style>
