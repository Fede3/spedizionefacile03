<!-- Hero unificato pagine content (contatti, servizi, guide, traccia, faq, chi-siamo, privacy/termini/cookie).
     Centrato, con variante compact per flussi operativi come il preventivo. -->
<script setup lang="ts">
import '~/assets/css/components/sf-public-page-header.css'

type PublicPageCrumb = {
	label: string
	to?: string
}

const props = withDefaults(defineProps<{
	crumbs?: PublicPageCrumb[]
	eyebrow?: string
	title: string
	description?: string
	kicker?: string
	variant?: 'default' | 'compact'
}>(), {
	crumbs: () => [],
	eyebrow: '',
	description: '',
	kicker: '',
	variant: 'default',
})

const eyebrowText = computed(() => props.eyebrow || props.kicker || '')
const hasBreadcrumbs = computed(() => props.crumbs.length > 0)
const hasExtra = useSlots().default !== undefined
const hasActions = useSlots().actions !== undefined
const headerClass = computed(() => ({
	'public-page-header--compact': props.variant === 'compact',
}))
const breadcrumbClass = computed(() => ({
	'public-page-breadcrumb--compact': props.variant === 'compact',
}))
</script>

<template>
	<section class="public-page-header" :class="headerClass" aria-labelledby="public-page-header-title">
		<div class="my-container public-page-header__inner">
			<span class="public-page-header__accent" aria-hidden="true" />
			<p v-if="eyebrowText" class="public-page-header__eyebrow">{{ eyebrowText }}</p>
			<h1 id="public-page-header-title" class="public-page-header__title">{{ title }}</h1>
			<p v-if="description" class="public-page-header__lead">{{ description }}</p>
			<div v-if="hasActions" class="public-page-header__actions">
				<slot name="actions" />
			</div>
			<div v-if="hasExtra" class="public-page-header__extra">
				<slot />
			</div>
		</div>
	</section>
	<!-- Breadcrumb left-aligned sotto l'hero (coerente con pattern "navigazione separata") -->
	<nav v-if="hasBreadcrumbs" class="public-page-breadcrumb" :class="breadcrumbClass" aria-label="Percorso di navigazione">
		<div class="my-container public-page-breadcrumb__inner">
			<template v-for="(crumb, index) in crumbs" :key="`${crumb.label}-${index}`">
				<NuxtLink v-if="crumb.to" :to="crumb.to" class="public-page-breadcrumb__link">
					{{ crumb.label }}
				</NuxtLink>
				<span v-else class="public-page-breadcrumb__current" aria-current="page">{{ crumb.label }}</span>
				<span v-if="index < crumbs.length - 1" class="public-page-breadcrumb__sep" aria-hidden="true">/</span>
			</template>
		</div>
	</nav>
</template>
