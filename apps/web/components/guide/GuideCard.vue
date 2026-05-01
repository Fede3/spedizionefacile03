<script setup>
defineProps({
	guide: { type: Object, required: true },
	image: { type: String, required: true },
	category: { type: String, required: true },
	categoryColor: { type: Object, required: true },
	readTime: { type: String, required: true },
	description: { type: String, default: '' },
	featured: { type: Boolean, default: false },
	applyFallback: { type: Function, required: true },
});
</script>

<template>
	<NuxtLink
		v-if="featured"
		:to="`/guide/${guide.slug}`"
		class="group grid md:grid-cols-2 gap-0 overflow-hidden rounded-card bg-brand-card border border-brand-border shadow-sf transition-all hover:shadow-sf-lg hover:-translate-y-0.5"
	>
		<div class="relative overflow-hidden aspect-[3/2] md:aspect-auto">
			<img
				:src="image"
				:alt="guide.title"
				class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
				loading="eager"
				width="720"
				height="480"
				@error="applyFallback"
			>
			<div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
			<span
				class="absolute top-4 left-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
				:style="{ background: categoryColor.bg, color: categoryColor.text }"
			>
				{{ category }}
			</span>
		</div>
		<div class="p-6 md:p-8 flex flex-col gap-4">
			<span class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-accent">
				<svg class="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
				In evidenza
			</span>
			<h2 class="font-display text-2xl md:text-3xl font-bold text-brand-text leading-tight transition-colors group-hover:text-brand-primary">
				{{ guide.title }}
			</h2>
			<p class="text-brand-text-secondary leading-relaxed">{{ description }}</p>
			<div class="mt-auto flex items-center justify-between gap-4 pt-2">
				<span class="inline-flex items-center gap-1.5 text-xs font-medium text-brand-text-muted">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" /></svg>
					{{ readTime }}
				</span>
				<span class="inline-flex items-center gap-1 text-sm font-bold text-brand-primary group-hover:gap-2 transition-all">
					Leggi guida
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
				</span>
			</div>
		</div>
	</NuxtLink>

	<NuxtLink
		v-else
		:to="`/guide/${guide.slug}`"
		class="group flex flex-col overflow-hidden rounded-card bg-brand-card border border-brand-border shadow-sf-sm transition-all hover:shadow-sf hover:-translate-y-0.5"
	>
		<div class="relative aspect-[5/3] overflow-hidden">
			<img
				:src="image"
				:alt="guide.title"
				class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
				loading="lazy"
				width="400"
				height="240"
				@error="applyFallback"
			>
			<div class="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
			<span
				class="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide"
				:style="{ background: categoryColor.bg, color: categoryColor.text }"
			>
				{{ category }}
			</span>
		</div>

		<div class="flex flex-col flex-1 gap-3 p-5">
			<h3 class="font-display text-lg font-bold text-brand-text leading-tight transition-colors group-hover:text-brand-primary line-clamp-2">
				{{ guide.title }}
			</h3>
			<p class="text-sm text-brand-text-secondary leading-relaxed line-clamp-3">{{ description }}</p>
			<div class="mt-auto flex items-center justify-between gap-3 pt-2">
				<span class="inline-flex items-center gap-1 text-xs text-brand-text-muted">
					<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" /></svg>
					{{ readTime }}
				</span>
				<span class="inline-flex items-center gap-0.5 text-xs font-bold text-brand-primary group-hover:gap-1.5 transition-all">
					Leggi guida
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
				</span>
			</div>
		</div>
	</NuxtLink>
</template>
