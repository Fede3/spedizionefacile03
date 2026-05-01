<script setup>
defineProps({
	featuredGuide: { type: Object, default: null },
	remainingGuides: { type: Array, default: () => [] },
	filteredGuidesLength: { type: Number, default: 0 },
	getImage: { type: Function, required: true },
	getCategory: { type: Function, required: true },
	getTime: { type: Function, required: true },
	getDescription: { type: Function, required: true },
	getCategoryColor: { type: Function, required: true },
	applyFallback: { type: Function, required: true },
});

defineEmits(['reset-filters']);
</script>

<template>
	<section class="py-8 md:py-12">
		<div class="max-w-6xl mx-auto px-4 space-y-8">
			<GuideCard
				v-if="featuredGuide"
				:guide="featuredGuide"
				:image="getImage(featuredGuide)"
				:category="getCategory(featuredGuide)"
				:category-color="getCategoryColor(featuredGuide)"
				:read-time="getTime(featuredGuide)"
				:description="getDescription(featuredGuide)"
				:apply-fallback="applyFallback"
				featured
			/>

			<div v-if="remainingGuides.length" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				<GuideCard
					v-for="guide in remainingGuides"
					:key="guide.slug"
					:guide="guide"
					:image="getImage(guide)"
					:category="getCategory(guide)"
					:category-color="getCategoryColor(guide)"
					:read-time="getTime(guide)"
					:description="getDescription(guide)"
					:apply-fallback="applyFallback"
				/>
			</div>

			<SfEmptyState
				v-if="!filteredGuidesLength"
				icon="mdi:magnify-close"
				title="Nessun risultato"
				description="Prova a cercare con parole diverse o seleziona un'altra categoria."
			>
				<template #cta>
					<SfButton variant="secondary" @click="$emit('reset-filters')">
						Mostra tutte le guide
					</SfButton>
				</template>
			</SfEmptyState>
		</div>
	</section>
</template>
