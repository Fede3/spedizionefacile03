<!-- COMPONENTE: SfButton (atom) -->
<script setup lang="ts">
import { computed } from 'vue';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'cta';
type Size = 'xs' | 'sm' | 'md' | 'lg';
type IconPosition = 'start' | 'end';

interface Props {
	variant?: Variant;
	size?: Size;
	loading?: boolean;
	disabled?: boolean;
	icon?: string;
	iconPosition?: IconPosition;
	type?: 'button' | 'submit' | 'reset';
	ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
	variant: 'primary',
	size: 'md',
	loading: false,
	disabled: false,
	icon: '',
	iconPosition: 'start',
	type: 'button',
	ariaLabel: '',
});

defineEmits<{ (e: 'click', ev: MouseEvent): void }>();

const classes = computed(() => [
	'sf-btn',
	`sf-btn--${props.variant}`,
	`sf-btn--${props.size}`,
	{
		'sf-btn--loading': props.loading,
		'sf-btn--icon-end': props.iconPosition === 'end',
	},
]);

const isDisabled = computed(() => props.disabled || props.loading);
</script>

<template>
	<button
		:type="type"
		:class="classes"
		:disabled="isDisabled"
		:aria-busy="loading || undefined"
		:aria-label="ariaLabel || undefined"
		@click="$emit('click', $event)"
	>
		<span v-if="loading" class="sf-btn__spinner" aria-hidden="true" />
		<slot name="icon">
			<UIcon v-if="icon && !loading" :name="icon" class="sf-btn__icon" />
		</slot>
		<span class="sf-btn__label"><slot /></span>
	</button>
</template>

<style scoped>
.sf-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: var(--gap-2);
	border-radius: var(--sf-radius-button);
	font-family: var(--font-inter);
	font-weight: 600;
	font-size: var(--font-size-base);
	line-height: 1;
	letter-spacing: var(--letter-spacing-normal);
	border: 1.5px solid transparent;
	cursor: pointer;
	transition:
		background-color var(--duration-fast) var(--ease-out),
		border-color var(--duration-fast) var(--ease-out),
		box-shadow var(--duration-fast) var(--ease-out),
		transform var(--duration-instant) var(--ease-out);
	padding: 0 20px;
	white-space: nowrap;
}
.sf-btn:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.sf-btn:active:not(:disabled) { transform: translateY(1px); }
.sf-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.sf-btn--icon-end { flex-direction: row-reverse; }

.sf-btn--xs { height: var(--button-height-xs); font-size: var(--font-size-sm); padding: 0 12px; }
.sf-btn--sm { height: var(--button-height-sm); font-size: var(--font-size-sm); padding: 0 16px; }
.sf-btn--md { height: var(--button-height-md); }
.sf-btn--lg { height: var(--button-height-lg); font-size: var(--font-size-md); padding: 0 28px; }

.sf-btn--primary { background: var(--color-brand-primary); color: #fff; }
.sf-btn--primary:hover:not(:disabled) { background: var(--color-brand-primary-hover); }

.sf-btn--secondary { background: transparent; color: var(--color-brand-primary); border-color: var(--color-brand-primary); }
.sf-btn--secondary:hover:not(:disabled) { background: var(--color-brand-secondary-soft-bg); }

.sf-btn--tertiary { background: transparent; color: var(--color-brand-primary); }
.sf-btn--tertiary:hover:not(:disabled) { text-decoration: underline; }

.sf-btn--ghost { background: transparent; color: var(--color-brand-text); }
.sf-btn--ghost:hover:not(:disabled) { background: var(--color-brand-secondary-soft-bg); color: var(--color-brand-primary); }

.sf-btn--cta { background: var(--color-brand-accent); color: #fff; box-shadow: var(--shadow-cta); }
.sf-btn--cta:hover:not(:disabled) { background: var(--color-brand-accent-hover); }

.sf-btn__icon { width: var(--icon-small); height: var(--icon-small); }
.sf-btn--xs .sf-btn__icon, .sf-btn--sm .sf-btn__icon { width: var(--icon-micro); height: var(--icon-micro); }

.sf-btn__spinner {
	width: 16px; height: 16px;
	border: 2px solid currentColor;
	border-right-color: transparent;
	border-radius: var(--radius-pill);
	animation: sf-btn-spin 720ms linear infinite;
}
@keyframes sf-btn-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
	.sf-btn { transition: none; }
	.sf-btn__spinner { animation-duration: 1800ms; }
}
</style>
