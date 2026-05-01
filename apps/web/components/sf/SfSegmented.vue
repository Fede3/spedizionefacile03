<script setup lang="ts">
/**
 * SfSegmented — segmented control (toggle group).
 *
 * Pattern (es. selezione metodo pagamento):
 *   <SfSegmented v-model="method" :options="[
 *     { value: 'card', label: 'Carta', icon: 'mdi:credit-card' },
 *     { value: 'wallet', label: 'Wallet', icon: 'mdi:wallet' },
 *   ]" />
 */

interface Option {
	value: string;
	label: string;
	icon?: string;
	disabled?: boolean;
}

interface Props {
	modelValue: string;
	options: Option[];
	/** Riempie larghezza disponibile (default false). */
	full?: boolean;
}

withDefaults(defineProps<Props>(), {
	full: false,
});

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
	<div
		role="tablist"
		:class="[
			'inline-flex p-1 bg-brand-bg-alt rounded-control border border-brand-border',
			full ? 'w-full' : '',
		]"
	>
		<button
			v-for="opt in options"
			:key="opt.value"
			type="button"
			role="tab"
			:aria-selected="modelValue === opt.value"
			:disabled="opt.disabled"
			:class="[
				'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-control text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-brand-primary',
				modelValue === opt.value
					? 'bg-brand-card text-brand-text shadow-sf-sm'
					: 'text-brand-text-secondary hover:text-brand-text',
				opt.disabled ? 'opacity-50 cursor-not-allowed' : '',
				full ? 'flex-1' : '',
			]"
			@click="emit('update:modelValue', opt.value)"
		>
			<UIcon v-if="opt.icon" :name="opt.icon" class="h-4 w-4" />
			{{ opt.label }}
		</button>
	</div>
</template>
