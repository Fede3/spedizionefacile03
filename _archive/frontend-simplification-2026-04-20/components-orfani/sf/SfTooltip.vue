<script setup lang="ts">
import { computed, ref, useId } from 'vue';

type Position = 'top' | 'bottom' | 'left' | 'right';

interface Props {
	position?: Position;
	delay?: number;
	text?: string;
}

const props = withDefaults(defineProps<Props>(), {
	position: 'top',
	delay: 150,
	text: '',
});

const tooltipId = `sf-tooltip-${useId()}`;
const visible = ref(false);
let openTimer: ReturnType<typeof setTimeout> | null = null;
let closeTimer: ReturnType<typeof setTimeout> | null = null;

function show() {
	if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
	openTimer = setTimeout(() => { visible.value = true; }, props.delay);
}
function hide() {
	if (openTimer) { clearTimeout(openTimer); openTimer = null; }
	closeTimer = setTimeout(() => { visible.value = false; }, 80);
}

const panelClass = computed(() => ['sf-tooltip__panel', `sf-tooltip__panel--${props.position}`]);
</script>

<template>
	<span
		class="sf-tooltip"
		:aria-describedby="visible ? tooltipId : undefined"
		@mouseenter="show"
		@mouseleave="hide"
		@focusin="show"
		@focusout="hide"
	>
		<slot />
		<span v-if="visible" :id="tooltipId" role="tooltip" :class="panelClass">
			<slot name="content">{{ text }}</slot>
		</span>
	</span>
</template>

<style scoped>
.sf-tooltip { position: relative; display: inline-flex; }
.sf-tooltip__panel {
	position: absolute; z-index: 60;
	background: var(--color-brand-text); color: #fff;
	font-family: var(--font-inter); font-size: var(--font-size-xs);
	padding: 6px 10px; border-radius: var(--radius-sm);
	white-space: nowrap; pointer-events: none;
	box-shadow: var(--shadow-md); animation: sf-tooltip-in var(--duration-fast) var(--ease-out);
}
.sf-tooltip__panel--top { bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); }
.sf-tooltip__panel--bottom { top: calc(100% + 8px); left: 50%; transform: translateX(-50%); }
.sf-tooltip__panel--left { right: calc(100% + 8px); top: 50%; transform: translateY(-50%); }
.sf-tooltip__panel--right { left: calc(100% + 8px); top: 50%; transform: translateY(-50%); }
@keyframes sf-tooltip-in { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .sf-tooltip__panel { animation: none; } }
</style>
