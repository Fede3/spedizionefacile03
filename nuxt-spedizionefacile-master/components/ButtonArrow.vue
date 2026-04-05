<script setup>
const props = defineProps({
	sizeClass: {
		type: String,
		default: 'w-[18px] h-[18px]',
	},
	direction: {
		type: String,
		default: 'right', // right | down | left | up
	},
});

const rotationClass = computed(() => {
	if (props.direction === 'down') return 'rotate-90';
	if (props.direction === 'left') return 'rotate-180';
	if (props.direction === 'up') return '-rotate-90';
	return '';
});
</script>

<template>
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2.5"
		stroke-linecap="round"
		stroke-linejoin="round"
		:class="['shrink-0', sizeClass, rotationClass]">
		<path d="M5 12h14" />
		<path d="M12 5l7 7-7 7" />
	</svg>
</template>
