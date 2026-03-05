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

const canNavigate = (index) => {
	return index < activeStep.value;
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
	<nav class="overflow-x-auto scrollbar-hide scroll-smooth" id="preventivo">
		<ul class="flex justify-center gap-x-[6px] tablet:gap-x-[30px] desktop-xl:gap-x-[50px] desktop-xl:my-[50px] my-[16px] tablet:my-[30px] text-[0.6875rem] tablet:text-[0.875rem] desktop-xl:text-[1rem] text-[#737373] tracking-[-0.252px] min-h-[36px] tablet:min-h-[44px] px-[4px]">
			<li
				v-for="(step, index) in steps"
				:key="index"
				class="min-h-[36px] leading-[36px] tablet:min-h-[44px] tablet:leading-[44px] tablet:leading-[48px] transition-[color,background-color,opacity] duration-200 select-none whitespace-nowrap px-[6px] tablet:px-[0px]"
				:class="{
					'bg-[#E44203] text-white tablet:w-auto !px-[12px] tablet:!px-[24px] text-center rounded-[50px] font-semibold step-active-pulse': index === activeStep,
					'cursor-pointer hover:text-[#095866]': canNavigate(index),
					'opacity-40 cursor-default': index > activeStep,
				}"
				@click="handleClick(index)">
				<span class="tablet:hidden" v-if="index !== activeStep">{{ index + 1 }}</span>
				<span class="tablet:hidden" v-if="index === activeStep">{{ index + 1 }}. {{ step }}</span>
				<span class="hidden tablet:inline">{{ index + 1 }}. {{ step }}</span>
			</li>
		</ul>
	</nav>
</template>
