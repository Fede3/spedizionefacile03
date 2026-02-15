<!--
	COMPONENTE INDICATORE PASSI (Steps.vue)

	Questo componente mostra la "barra dei passi" (step) del processo di spedizione.
	Serve a far capire all'utente a che punto si trova nel percorso di prenotazione.

	I 5 passi sono:
	1. Misure - inserimento dimensioni e peso del pacco
	2. Servizi - scelta dei servizi aggiuntivi
	3. Ritiro - inserimento indirizzo di ritiro e consegna
	4. Conferma - riepilogo di tutti i dati
	5. Pagamento - pagamento della spedizione

	Il passo attivo viene evidenziato con un colore arancione.
	I passi gia' completati sono cliccabili per tornare indietro.
	I passi futuri sono grigi e non cliccabili.

	Il componente riconosce automaticamente in quale passo si trova
	guardando l'indirizzo della pagina (route.path), oppure puo' ricevere
	il passo corrente come parametro dal componente che lo usa.
-->
<script setup>
const props = defineProps({
	currentStep: { type: Number, default: -1 },
});

const emit = defineEmits(['navigate']);

const steps = ["Misure", "Servizi", "Ritiro", "Conferma", "Pagamento"];

const route = useRoute();

// Auto-detect step from route if not explicitly passed
const activeStep = computed(() => {
	if (props.currentStep >= 0) return props.currentStep;
	if (route.name === 'index' || route.path === '/') return 0;
	if (route.path.includes('la-tua-spedizione')) {
		// Se la query contiene step=ritiro, siamo allo step Ritiro (2)
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
					'bg-[#E44203] text-white tablet:w-auto !px-[12px] tablet:!px-[24px] text-center rounded-[38px] font-semibold step-active-pulse': index === activeStep,
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
