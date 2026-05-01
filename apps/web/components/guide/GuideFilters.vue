<script setup>
defineProps({
	searchQuery: { type: String, default: '' },
	activeCategory: { type: String, default: 'Tutte' },
	allCategories: { type: Array, default: () => [] },
});

defineEmits(['update:searchQuery', 'update:activeCategory']);
</script>

<template>
	<section class="py-6 bg-brand-bg-alt border-b border-brand-border">
		<div class="max-w-6xl mx-auto px-4 space-y-4">
			<div class="flex items-center gap-2 rounded-control border border-brand-border bg-brand-card px-4 py-2.5 transition focus-within:ring-2 focus-within:ring-brand-primary/30 focus-within:border-brand-primary">
				<svg class="h-5 w-5 shrink-0 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="8" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
				<input
					:value="searchQuery"
					type="text"
					placeholder="Cerca nelle guide..."
					class="flex-1 bg-transparent outline-none placeholder:text-brand-text-muted text-brand-text"
					@input="$emit('update:searchQuery', $event.target.value)"
				>
				<button
					v-if="searchQuery"
					class="shrink-0 p-1 rounded hover:bg-brand-bg-alt text-brand-text-muted transition"
					aria-label="Cancella ricerca"
					@click="$emit('update:searchQuery', '')"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>

			<div class="flex flex-wrap gap-2">
				<button
					v-for="cat in allCategories"
					:key="cat"
					type="button"
					class="px-4 py-2 rounded-full text-sm font-semibold transition border"
					:class="activeCategory === cat
						? 'bg-brand-primary text-white border-brand-primary shadow-sf-sm'
						: 'bg-brand-card text-brand-text-secondary border-brand-border hover:bg-brand-bg-alt hover:text-brand-text'"
					@click="$emit('update:activeCategory', cat)"
				>
					{{ cat }}
				</button>
			</div>
		</div>
	</section>
</template>
