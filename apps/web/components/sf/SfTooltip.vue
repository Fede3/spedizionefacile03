<script setup lang="ts">
/**
 * SfTooltip — tooltip CSS-only (no JS positioning).
 *
 * Pattern:
 *   <SfTooltip text="Testo aiuto">
 *     <button>Hover me</button>
 *   </SfTooltip>
 */

interface Props {
	text: string;
	position?: 'top' | 'bottom' | 'left' | 'right';
}

withDefaults(defineProps<Props>(), {
	position: 'top',
});

const POSITION_CLASS: Record<string, string> = {
	top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
	bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
	left: 'right-full top-1/2 -translate-y-1/2 mr-2',
	right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};
</script>

<template>
	<span class="relative inline-flex group/tooltip">
		<slot />
		<span
			role="tooltip"
			:class="[
				'pointer-events-none absolute z-50 whitespace-nowrap px-2.5 py-1.5 text-xs font-medium text-white bg-brand-text rounded-md shadow-sf opacity-0 transition-opacity duration-150',
				'group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100',
				POSITION_CLASS[position],
			]"
		>
			{{ text }}
		</span>
	</span>
</template>
