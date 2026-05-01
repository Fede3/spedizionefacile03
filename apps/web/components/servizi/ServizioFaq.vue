<script setup>
defineProps({
	items: { type: Array, default: () => [] },
});

const emit = defineEmits(['toggle']);
const toggle = (idx) => emit('toggle', idx);
</script>

<template>
	<section class="py-12 md:py-16">
		<div class="max-w-5xl mx-auto px-4">
			<header class="mb-8 md:mb-10">
				<span class="inline-block text-xs font-bold uppercase tracking-widest text-brand-accent mb-2">FAQ</span>
				<span aria-hidden="true" class="block h-1 w-12 bg-brand-accent rounded-full mb-3" />
				<h2 class="font-display text-2xl md:text-3xl font-bold text-brand-text">
					Domande frequenti sui servizi
				</h2>
			</header>
			<div class="space-y-3">
				<div
					v-for="(item, idx) in items"
					:key="`faq-${idx}`"
					class="rounded-card border bg-brand-card overflow-hidden transition-colors"
					:class="item.open
						? 'border-brand-primary shadow-sf'
						: 'border-brand-border hover:border-brand-primary/40'"
				>
					<button
						type="button"
						class="flex w-full items-center justify-between gap-3 p-4 text-left text-sm md:text-base font-semibold text-brand-text"
						:aria-expanded="item.open"
						@click="toggle(idx)"
					>
						<span>{{ item.question }}</span>
						<span
							aria-hidden="true"
							class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary transition-transform"
							:class="item.open ? 'rotate-180' : ''"
						>
							<svg
								v-if="!item.open"
								width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
								stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
							>
								<path d="M12 5v14" />
								<path d="M5 12h14" />
							</svg>
							<svg
								v-else
								width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
								stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
							>
								<path d="M5 12h14" />
							</svg>
						</span>
					</button>
					<div v-show="item.open" class="px-4 pb-4 text-sm leading-relaxed text-brand-text-secondary">
						<p>{{ item.answer }}</p>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
