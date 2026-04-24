<!-- COMPONENTE: SfBreadcrumb (SfBreadcrumb.vue) -->
<script setup>
const props = defineProps({
	items: {
		type: Array,
		required: true,
		validator: (arr) => Array.isArray(arr) && arr.every((i) => typeof i?.label === 'string'),
	},
});

// JSON-LD BreadcrumbList schema — solo client-side, non blocca SSR se useSchemaOrg non disponibile
const jsonLdScript = computed(() => {
	if (!Array.isArray(props.items) || props.items.length === 0) return null;
	const itemListElement = props.items.map((item, index) => {
		const entry = {
			'@type': 'ListItem',
			position: index + 1,
			name: item.label,
		};
		if (item.to && typeof item.to === 'string') {
			entry.item = item.to;
		}
		return entry;
	});
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement,
	};
});

useHead({
	script: computed(() => (
		jsonLdScript.value
			? [{ type: 'application/ld+json', innerHTML: JSON.stringify(jsonLdScript.value) }]
			: []
	)),
});
</script>

<template>
	<nav class="sf-breadcrumb" aria-label="Breadcrumb">
		<ol>
			<li v-for="(item, i) in items" :key="i">
				<NuxtLink
					v-if="item.to && i < items.length - 1"
					:to="item.to"
					class="sf-breadcrumb__link"
				>{{ item.label }}</NuxtLink>
				<span v-else class="sf-breadcrumb__current">{{ item.label }}</span>
				<span
					v-if="i < items.length - 1"
					class="sf-breadcrumb__separator"
					aria-hidden="true"
				>/</span>
			</li>
		</ol>
	</nav>
</template>

<style scoped>
.sf-breadcrumb {
	max-width: var(--container-lg, 1280px);
	margin: 0 auto;
	padding: 16px 20px 0;
	font-size: 13px;
	line-height: 1.4;
	color: var(--color-text-muted, #6b7280);
}

.sf-breadcrumb ol {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	list-style: none;
	margin: 0;
	padding: 0;
}

.sf-breadcrumb li {
	display: flex;
	align-items: center;
	gap: 4px;
}

.sf-breadcrumb__link {
	color: var(--color-brand-primary, #095866);
	text-decoration: none;
	transition: color 200ms ease;
	border-radius: 4px;
}

.sf-breadcrumb__link:hover {
	text-decoration: underline;
}

.sf-breadcrumb__link:focus-visible {
	outline: 2px solid var(--color-brand-primary, #095866);
	outline-offset: 2px;
}

.sf-breadcrumb__current {
	font-weight: 600;
	color: var(--color-text-primary, #1d2738);
}

.sf-breadcrumb__separator {
	color: var(--color-border, #DFE2E7);
	user-select: none;
}
</style>
