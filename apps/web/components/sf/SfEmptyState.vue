<script setup lang="ts">
/**
 * SfEmptyState — placeholder per liste/risultati vuoti.
 *
 * Pattern:
 *   <SfEmptyState
 *     icon="mdi:package-variant-closed"
 *     title="Nessun ordine ancora"
 *     description="Crea il tuo primo preventivo per iniziare"
 *   >
 *     <template #cta>
 *       <SfButton to="/preventivo">Nuovo preventivo</SfButton>
 *     </template>
 *   </SfEmptyState>
 */

interface Props {
	icon?: string;
	title: string;
	description?: string;
	/** Variante visuale (default 'centered', 'compact' per liste inline). */
	variant?: 'centered' | 'compact';
}

withDefaults(defineProps<Props>(), {
	icon: 'mdi:inbox-outline',
	description: '',
	variant: 'centered',
});
</script>

<template>
	<div
		v-if="variant === 'centered'"
		class="flex flex-col items-center justify-center text-center py-12 px-6 gap-4"
	>
		<div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-bg-alt text-brand-text-muted">
			<UIcon :name="icon" class="h-8 w-8" />
		</div>
		<div class="space-y-1.5 max-w-sm">
			<h3 class="font-display text-lg font-semibold text-brand-text">{{ title }}</h3>
			<p v-if="description" class="text-sm text-brand-text-secondary">{{ description }}</p>
		</div>
		<div v-if="$slots.cta" class="mt-2">
			<slot name="cta" />
		</div>
	</div>

	<div
		v-else
		class="flex items-center gap-3 p-4 rounded-card border border-dashed border-brand-border bg-brand-bg-alt/50"
	>
		<UIcon :name="icon" class="h-5 w-5 text-brand-text-muted shrink-0" />
		<div class="flex-1 min-w-0">
			<div class="text-sm font-semibold text-brand-text">{{ title }}</div>
			<div v-if="description" class="text-xs text-brand-text-muted">{{ description }}</div>
		</div>
		<div v-if="$slots.cta" class="shrink-0">
			<slot name="cta" />
		</div>
	</div>
</template>
