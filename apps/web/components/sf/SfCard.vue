<script setup lang="ts">
/**
 * SfCard — card unificata (header + body + footer slot).
 *
 * Pattern uso:
 *   <SfCard title="Profilo" description="Dati personali e fatturazione">
 *     <template #icon><UIcon name="mdi:account" /></template>
 *     <p>Body content</p>
 *     <template #footer><SfButton>Salva</SfButton></template>
 *   </SfCard>
 */

interface Props {
	title?: string;
	description?: string;
	/** Padding body (default md). */
	padding?: 'none' | 'sm' | 'md' | 'lg';
	/** Variante shadow (default sf, none = card piatta). */
	shadow?: 'none' | 'sf' | 'sf-lg';
	/** Bordo visibile (default true). */
	bordered?: boolean;
	/** Tag HTML root (default 'section', 'article' per content). */
	as?: 'section' | 'article' | 'div';
}

withDefaults(defineProps<Props>(), {
	title: '',
	description: '',
	padding: 'md',
	shadow: 'sf',
	bordered: true,
	as: 'section',
});

const paddingClass = {
	none: 'p-0',
	sm: 'p-4',
	md: 'p-5 md:p-6',
	lg: 'p-6 md:p-8',
};

const shadowClass = {
	none: '',
	sf: 'shadow-sf',
	'sf-lg': 'shadow-sf-lg',
};
</script>

<template>
	<component
		:is="as"
		class="bg-brand-card rounded-card overflow-hidden"
		:class="[shadowClass[shadow], bordered ? 'border border-brand-border' : '']"
	>
		<header
			v-if="title || description || $slots.header || $slots.icon"
			class="flex items-start gap-3 px-5 md:px-6 pt-5 md:pt-6 pb-3 border-b border-brand-border"
		>
			<div v-if="$slots.icon" class="shrink-0">
				<slot name="icon" />
			</div>
			<div class="flex-1 min-w-0">
				<slot name="header">
					<h3 v-if="title" class="font-display text-lg font-semibold text-brand-text">
						{{ title }}
					</h3>
					<p v-if="description" class="text-sm text-brand-text-secondary mt-0.5">
						{{ description }}
					</p>
				</slot>
			</div>
			<div v-if="$slots.actions" class="shrink-0">
				<slot name="actions" />
			</div>
		</header>

		<div :class="paddingClass[padding]">
			<slot />
		</div>

		<footer
			v-if="$slots.footer"
			class="px-5 md:px-6 py-4 border-t border-brand-border bg-brand-bg-alt flex items-center justify-end gap-3"
		>
			<slot name="footer" />
		</footer>
	</component>
</template>
