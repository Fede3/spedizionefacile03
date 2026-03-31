<!--
  PAGINA: Articolo Blog Singolo (blog/[slug].vue)
  Pagina dinamica che mostra il contenuto di un singolo articolo del blog.
  Carica il contenuto dall'API pubblica /api/public/blog/{slug}.
  Include dati strutturati JSON-LD per il SEO (Article).
-->
<script setup>
const route = useRoute();
const slug = route.params.slug;
const sanctum = useSanctumClient();
const { sanitize } = useSanitize();

const article = ref(null);
const loading = ref(true);
const prevArticle = ref(null);
const nextArticle = ref(null);

onMounted(async () => {
	try {
		// Carica l'articolo singolo
		const res = await sanctum(`/api/public/blog/${slug}`);
		const data = res?.data || res;
		if (data?.id) {
			article.value = data;
		}

		// Carica la lista completa per navigazione prev/next
		const listRes = await sanctum('/api/public/blog');
		const list = listRes?.data || listRes;
		if (Array.isArray(list)) {
			const idx = list.findIndex(a => a.slug === slug);
			if (idx > 0) prevArticle.value = list[idx - 1];
			if (idx < list.length - 1) nextArticle.value = list[idx + 1];
		}
	} catch {
		// Articolo non trovato
	}
	loading.value = false;

	if (!loading.value && !article.value) {
		navigateTo('/blog');
	}
});

// SEO dinamico (dopo il caricamento)
watchEffect(() => {
	if (article.value) {
		useSeoMeta({
			title: `${article.value.title} | Blog - SpediamoFacile`,
			ogTitle: `${article.value.title} | Blog - SpediamoFacile`,
			description: article.value.meta_description,
			ogDescription: article.value.meta_description,
		});
	}
});

// Parse sections (possono arrivare come JSON string o array)
const parsedSections = computed(() => {
	if (!article.value?.sections) return [];
	if (typeof article.value.sections === 'string') {
		try { return JSON.parse(article.value.sections); } catch { return []; }
	}
	return article.value.sections;
});

// Formatta data in italiano
const formatDate = (dateStr) => {
	if (!dateStr) return '';
	const date = new Date(dateStr);
	return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
};
</script>

<template>
	<!-- Loading -->
	<section v-if="loading" class="min-h-[400px] flex items-center justify-center">
		<div class="w-[40px] h-[40px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"/>
	</section>

	<section v-else-if="article">
		<div class="my-container">
			<!-- Back link -->
			<div class="mt-[32px] mb-[24px]">
				<NuxtLink to="/blog" class="inline-flex items-center gap-[8px] text-[0.9375rem] text-[#095866] font-medium hover:underline transition-colors">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 9H5"/><path d="M9 5l-4 4 4 4"/></svg>
					Torna al blog
				</NuxtLink>
			</div>

			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/" class="hover:underline text-[#095866] font-medium">Home</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<NuxtLink to="/blog" class="hover:underline text-[#095866] font-medium">Blog</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">{{ article.title }}</span>
			</div>

			<!-- Header banner -->
			<div class="blog-detail__banner rounded-[20px] overflow-hidden mb-[40px] desktop:mb-[56px]">
				<div class="h-[3px] bg-[#E44203]"/>
				<div class="px-[28px] py-[36px] desktop:px-[48px] desktop:py-[48px]">
					<p class="text-[0.8125rem] desktop:text-[0.875rem] font-medium text-white/70 tracking-[1.8px] uppercase mb-[16px]">Blog</p>
					<h1 class="text-[1.75rem] desktop:text-[2.5rem] desktop-xl:text-[3rem] font-medium tracking-[-1px] desktop:tracking-[-1.536px] text-white leading-[120%]">
						{{ article.title }}
					</h1>
					<p v-if="article.created_at" class="text-[0.875rem] text-white/60 mt-[16px]">
						{{ formatDate(article.created_at) }}
					</p>
				</div>
			</div>

			<!-- Featured image -->
			<div v-if="article.featured_image" class="mb-[40px] desktop:mb-[56px] max-w-[820px]">
				<img
					:src="article.featured_image"
					:alt="article.title"
					loading="lazy"
					decoding="async"
					class="w-full rounded-[16px] border border-[#E9EBEC] object-cover max-h-[400px]" >
			</div>

			<!-- Intro -->
			<p v-if="article.intro" class="text-[1.0625rem] desktop:text-[1.1875rem] leading-[175%] tracking-[-0.252px] text-[#404040] font-medium mb-[40px] desktop:mb-[56px] max-w-[820px]">
				{{ article.intro }}
			</p>

			<!-- Content sections -->
			<div class="mb-[60px] desktop:mb-[80px] max-w-[820px]">
				<div v-for="(section, index) in parsedSections" :key="index" class="mb-[48px] desktop:mb-[56px]">
					<h2 class="text-[1.375rem] desktop:text-[1.75rem] font-medium tracking-[-0.576px] text-[#222222] mb-[16px] desktop:mb-[20px] leading-[125%]">
						{{ section.heading }}
					</h2>
					<!-- eslint-disable-next-line vue/no-v-html -->
					<div class="prose prose-sm max-w-none text-[0.9375rem] desktop:text-[1.0625rem] leading-[175%] tracking-[-0.252px] text-[#555555]" v-html="sanitize(section.text)"/>
				</div>
			</div>

			<!-- Previous / Next navigation -->
			<div v-if="prevArticle || nextArticle" class="border-t border-[#E9EBEC] pt-[32px] pb-[16px] mb-[32px]">
				<div class="flex flex-col tablet:flex-row gap-[16px]" :class="prevArticle ? 'justify-between' : 'justify-end'">
					<NuxtLink
						v-if="prevArticle"
						:to="`/blog/${prevArticle.slug}`"
						class="group flex items-center gap-[12px] p-[16px] desktop:p-[20px] rounded-[16px] border border-[#E9EBEC] hover:border-[#095866] hover:shadow-sm transition-all flex-1 max-w-[400px]">
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M14 10H6"/><path d="M10 6l-4 4 4 4"/></svg>
						<div>
							<p class="text-[0.75rem] text-[#737373] font-medium mb-[4px]">Articolo precedente</p>
							<p class="text-[0.875rem] desktop:text-[0.9375rem] text-[#222222] font-medium leading-[130%] group-hover:text-[#095866] transition-colors">{{ prevArticle.title }}</p>
						</div>
					</NuxtLink>
					<NuxtLink
						v-if="nextArticle"
						:to="`/blog/${nextArticle.slug}`"
						class="group flex items-center gap-[12px] p-[16px] desktop:p-[20px] rounded-[16px] border border-[#E9EBEC] hover:border-[#095866] hover:shadow-sm transition-all flex-1 max-w-[400px] tablet:text-right tablet:ml-auto">
						<div class="flex-1">
							<p class="text-[0.75rem] text-[#737373] font-medium mb-[4px]">Articolo successivo</p>
							<p class="text-[0.875rem] desktop:text-[0.9375rem] text-[#222222] font-medium leading-[130%] group-hover:text-[#095866] transition-colors">{{ nextArticle.title }}</p>
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
.blog-detail__banner {
	background: linear-gradient(135deg, #095866 0%, #0b6d7d 100%);
}
</style>
