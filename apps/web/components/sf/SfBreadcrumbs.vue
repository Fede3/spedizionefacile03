<script setup lang="ts">
/**
 * SfBreadcrumbs — breadcrumb accessibile.
 *
 * Pattern:
 *   <SfBreadcrumbs :items="[
 *     { label: 'Account', to: '/account' },
 *     { label: 'Ordini', to: '/account/spedizioni' },
 *     { label: 'Ordine #123' },
 *   ]" />
 */

interface Crumb {
	label: string;
	to?: string;
	icon?: string;
}

interface Props {
	items: Crumb[];
	separator?: string;
}

withDefaults(defineProps<Props>(), {
	separator: 'mdi:chevron-right',
});
</script>

<template>
	<nav aria-label="Breadcrumbs">
		<ol class="flex flex-wrap items-center gap-1.5 text-xs text-brand-text-muted">
			<li
				v-for="(item, idx) in items"
				:key="`${item.label}-${idx}`"
				class="flex items-center gap-1.5"
			>
				<NuxtLink
					v-if="item.to && idx < items.length - 1"
					:to="item.to"
					class="inline-flex items-center gap-1 font-bold text-brand-primary hover:underline"
				>
					<UIcon v-if="item.icon" :name="item.icon" class="h-3.5 w-3.5" />
					{{ item.label }}
				</NuxtLink>
				<span
					v-else
					:aria-current="idx === items.length - 1 ? 'page' : undefined"
					class="font-semibold text-brand-text"
				>
					{{ item.label }}
				</span>

				<UIcon
					v-if="idx < items.length - 1"
					:name="separator"
					class="h-3 w-3 text-brand-text-muted/60"
					aria-hidden="true"
				/>
			</li>
		</ol>
	</nav>
</template>
