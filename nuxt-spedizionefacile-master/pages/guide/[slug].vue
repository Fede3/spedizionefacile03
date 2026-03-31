<!--
  PAGINA: Guida Singola (guide/[slug].vue)
  Pagina dinamica che mostra il contenuto di una singola guida.
  Carica il contenuto dall'API pubblica /api/public/guides/{slug}.
  Include dati strutturati JSON-LD per il SEO (Article).
-->
<script setup>
const route = useRoute();
const slug = route.params.slug;
const sanctum = useSanctumClient();

const guide = ref(null);
const loading = ref(true);
const prevGuide = ref(null);
const nextGuide = ref(null);

onMounted(async () => {
	try {
		// Carica la guida singola
		const res = await sanctum(`/api/public/guides/${slug}`);
		const data = res?.data || res;
		if (data?.id) {
			guide.value = data;
		}

		// Carica la lista completa per navigazione prev/next
		const listRes = await sanctum('/api/public/guides');
		const list = listRes?.data || listRes;
		if (Array.isArray(list)) {
			const idx = list.findIndex(g => g.slug === slug);
			if (idx > 0) prevGuide.value = list[idx - 1];
			if (idx < list.length - 1) nextGuide.value = list[idx + 1];
		}
	} catch (e) {
		// Guide non trovata, redirect alla lista
	}
	loading.value = false;

	if (!loading.value && !guide.value) {
		navigateTo('/guide');
	}
});

// SEO dinamico (dopo il caricamento)
watchEffect(() => {
	if (guide.value) {
		useSeoMeta({
			title: `${guide.value.title} | SpediamoFacile`,
			ogTitle: `${guide.value.title} | SpediamoFacile`,
			description: guide.value.meta_description,
			ogDescription: guide.value.meta_description,
		});
	}
});

// Parse sections (possono arrivare come JSON string o array)
const parsedSections = computed(() => {
	if (!guide.value?.sections) return [];
	if (typeof guide.value.sections === 'string') {
		try { return JSON.parse(guide.value.sections); } catch { return []; }
	}
	return guide.value.sections;
});
</script>

<template>
	<!-- Loading -->
	<section v-if="loading" class="min-h-[400px] flex items-center justify-center">
		<div class="w-[40px] h-[40px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
	</section>

	<section v-else-if="guide">
		<div class="my-container">
			<!-- Back link -->
			<div class="mt-[32px] mb-[24px]">
				<NuxtLink to="/guide" class="inline-flex items-center gap-[8px] text-[0.9375rem] text-[#095866] font-medium hover:underline transition-colors">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 9H5"/><path d="M9 5l-4 4 4 4"/></svg>
					Torna alle guide
				</NuxtLink>
			</div>

			<!-- Header banner -->
			<div class="guide-detail__banner rounded-[20px] overflow-hidden mb-[40px] desktop:mb-[56px]">
				<div class="h-[3px] bg-[#E44203]"></div>
				<div class="px-[28px] py-[36px] desktop:px-[48px] desktop:py-[48px]">
					<p class="text-[0.8125rem] desktop:text-[0.875rem] font-medium text-white/70 tracking-[1.8px] uppercase mb-[16px]">Guida</p>
					<h1 class="text-[1.75rem] desktop:text-[2.5rem] desktop-xl:text-[3rem] font-medium tracking-[-1px] desktop:tracking-[-1.536px] text-white leading-[120%]">
						{{ guide.title }}
					</h1>
				</div>
			</div>

			<!-- Intro -->
			<p v-if="guide.intro" class="text-[1.0625rem] desktop:text-[1.1875rem] leading-[175%] tracking-[-0.252px] text-[#404040] font-medium mb-[40px] desktop:mb-[56px] max-w-[820px]">
				{{ guide.intro }}
			</p>

			<!-- Content sections -->
			<div class="mb-[60px] desktop:mb-[80px] max-w-[820px]">
				<div v-for="(section, index) in parsedSections" :key="index" class="mb-[48px] desktop:mb-[56px]">
					<h2 class="text-[1.375rem] desktop:text-[1.75rem] font-medium tracking-[-0.576px] text-[#222222] mb-[16px] desktop:mb-[20px] leading-[125%]">
						{{ section.heading }}
					</h2>
					<p class="text-[0.9375rem] desktop:text-[1.0625rem] leading-[175%] tracking-[-0.252px] text-[#555555]">
						{{ section.text }}
					</p>
				</div>
			</div>

			<!-- Previous / Next navigation -->
			<div v-if="prevGuide || nextGuide" class="border-t border-[#E9EBEC] pt-[32px] pb-[16px] mb-[32px]">
				<div class="flex flex-col tablet:flex-row gap-[16px]" :class="prevGuide ? 'justify-between' : 'justify-end'">
					<NuxtLink
						v-if="prevGuide"
						:to="`/guide/${prevGuide.slug}`"
						class="group flex items-center gap-[12px] p-[16px] desktop:p-[20px] rounded-[16px] border border-[#E9EBEC] hover:border-[#095866] hover:shadow-sm transition-all flex-1 max-w-[400px]">
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M14 10H6"/><path d="M10 6l-4 4 4 4"/></svg>
						<div>
							<p class="text-[0.75rem] text-[#737373] font-medium mb-[4px]">Guida precedente</p>
							<p class="text-[0.875rem] desktop:text-[0.9375rem] text-[#222222] font-medium leading-[130%] group-hover:text-[#095866] transition-colors">{{ prevGuide.title }}</p>
						</div>
					</NuxtLink>
					<NuxtLink
						v-if="nextGuide"
						:to="`/guide/${nextGuide.slug}`"
						class="group flex items-center gap-[12px] p-[16px] desktop:p-[20px] rounded-[16px] border border-[#E9EBEC] hover:border-[#095866] hover:shadow-sm transition-all flex-1 max-w-[400px] tablet:text-right tablet:ml-auto">
						<div class="flex-1">
							<p class="text-[0.75rem] text-[#737373] font-medium mb-[4px]">Guida successiva</p>
							<p class="text-[0.875rem] desktop:text-[0.9375rem] text-[#222222] font-medium leading-[130%] group-hover:text-[#095866] transition-colors">{{ nextGuide.title }}</p>
						</div>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M6 10h8"/><path d="M10 6l4 4-4 4"/></svg>
					</NuxtLink>
				</div>
			</div>

			<!-- CTA -->
			<div class="border-t border-[#E9EBEC] pt-[40px] mb-[80px] desktop:mb-[120px]">
				<p class="text-[1.25rem] font-medium text-[#222222] mb-[20px]">Hai bisogno di spedire?</p>
				<NuxtLink to="/preventivo" class="inline-flex items-center gap-[8px] h-[52px] px-[32px] rounded-[35px] bg-[#E44203] text-white font-semibold tracking-[-0.384px] text-[1rem] hover:opacity-90 transition-opacity">
					Calcola il preventivo
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h10"/><path d="M10 5l4 4-4 4"/></svg>
				</NuxtLink>
			</div>
		</div>
	</section>
</template>

<style scoped>
.guide-detail__banner {
	background: linear-gradient(135deg, #095866 0%, #0b6d7d 100%);
}
</style>
