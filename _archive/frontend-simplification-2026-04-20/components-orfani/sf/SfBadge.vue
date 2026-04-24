<script setup lang="ts">
import { computed } from 'vue';

type Variant = 'success' | 'warning' | 'info' | 'neutral' | 'danger' | 'accent';
type Size = 'xs' | 'sm';

interface Props {
	variant?: Variant;
	size?: Size;
}

const props = withDefaults(defineProps<Props>(), { variant: 'neutral', size: 'sm' });

const classes = computed(() => ['sf-badge', `sf-badge--${props.variant}`, `sf-badge--${props.size}`]);
</script>

<template>
	<span :class="classes"><slot /></span>
</template>

<style scoped>
.sf-badge {
	display: inline-flex; align-items: center; gap: 4px;
	border-radius: var(--radius-pill);
	font-family: var(--font-inter); font-weight: 600;
	line-height: 1; white-space: nowrap;
}
.sf-badge--xs { font-size: 11px; padding: 3px 8px; }
.sf-badge--sm { font-size: var(--font-size-xs); padding: 4px 10px; }
.sf-badge--success { background: var(--admin-status-success-bg); color: var(--admin-status-success-text); }
.sf-badge--warning { background: var(--admin-status-warning-bg); color: var(--admin-status-warning-text); }
.sf-badge--info { background: var(--admin-status-info-bg); color: var(--admin-status-info-text); }
.sf-badge--neutral { background: var(--admin-status-neutral-bg); color: var(--admin-status-neutral-text); }
.sf-badge--danger { background: var(--admin-status-danger-bg); color: var(--admin-status-danger-text); }
.sf-badge--accent { background: var(--color-accent-surface); color: var(--color-brand-accent); }
</style>
