<script setup lang="ts">
import { computed } from 'vue';

type Variant = 'base' | 'featured' | 'kpi' | 'flat';
type Padding = 'sm' | 'md' | 'lg';
type Shadow = 'none' | 'sm' | 'md' | 'lg';

interface Props {
	variant?: Variant;
	padding?: Padding;
	shadow?: Shadow;
	as?: string;
}

const props = withDefaults(defineProps<Props>(), {
	variant: 'base',
	padding: 'md',
	shadow: 'sm',
	as: 'div',
});

const classes = computed(() => [
	'sf-card',
	`sf-card--${props.variant}`,
	`sf-card--pad-${props.padding}`,
	`sf-card--shadow-${props.shadow}`,
]);
</script>

<template>
	<component :is="as" :class="classes">
		<slot />
	</component>
</template>

<style scoped>
.sf-card {
	background: var(--color-brand-card);
	border: 1px solid var(--color-brand-border);
	border-radius: var(--radius-md);
	transition: box-shadow var(--duration-fast) var(--ease-out);
}
.sf-card--base { border-radius: var(--radius-md); }
.sf-card--featured { border-radius: var(--radius-lg); border-color: var(--color-brand-secondary-soft-border); }
.sf-card--kpi { border-radius: var(--radius-md); background: var(--surface-inner); }
.sf-card--flat { border-radius: var(--radius-md); border-color: transparent; background: transparent; }

.sf-card--pad-sm { padding: var(--gap-3); }
.sf-card--pad-md { padding: 20px; }
.sf-card--pad-lg { padding: 28px; }

.sf-card--shadow-none { box-shadow: none; }
.sf-card--shadow-sm { box-shadow: var(--shadow-sm); }
.sf-card--shadow-md { box-shadow: var(--shadow-md); }
.sf-card--shadow-lg { box-shadow: var(--shadow-lg); }
</style>
