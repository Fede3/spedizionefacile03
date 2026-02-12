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
	if (route.path.includes('la-tua-spedizione')) return 1;
	if (route.path.includes('carrello') || route.path.includes('checkout')) return 4;
	return 0;
});

const canNavigate = (index) => {
	return index < activeStep.value;
};

const handleClick = (index) => {
	if (canNavigate(index)) {
		emit('navigate', index);
	}
};
</script>

<template>
	<ul class="flex justify-center flex-wrap gap-x-[30px] desktop-xl:gap-x-[50px] desktop-xl:my-[50px] my-[30px] text-[0.875rem] desktop-xl:text-[1rem] text-[#737373] tracking-[-0.252px] h-[48px]" id="preventivo">
		<li
			v-for="(step, index) in steps"
			:key="index"
			class="h-full leading-[48px] transition-all select-none whitespace-nowrap"
			:class="{
				'bg-[#E44203] text-white px-[24px] rounded-[38px] font-semibold': index === activeStep,
				'cursor-pointer hover:text-[#095866]': canNavigate(index),
				'opacity-40 cursor-default': index > activeStep,
			}"
			@click="handleClick(index)">
			{{ index + 1 }}. {{ step }}
		</li>
	</ul>
</template>
