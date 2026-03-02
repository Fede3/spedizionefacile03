<!--
  PAGINA: Blog (blog/index.vue)
  Pagina che elenca tutti gli articoli del blog pubblicati.
  Carica gli articoli dall'API pubblica /api/public/blog.
  Mostra una griglia di card responsive con immagine, titolo, anteprima e data.
  Include dati strutturati JSON-LD per il SEO (CollectionPage).
-->
<script setup>
useSeoMeta({
	title: 'Blog - SpedizioneFacile',
	ogTitle: 'Blog - SpedizioneFacile',
	description: 'Leggi i nostri articoli su spedizioni, logistica, consigli pratici e novita dal mondo delle consegne.',
	ogDescription: 'Articoli e approfondimenti su spedizioni e logistica da SpedizioneFacile.',
});

useHead({
	script: [
		{
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'CollectionPage',
				name: 'Blog - SpedizioneFacile',
				url: 'https://spedizionefacile.it/blog',
				description: 'Articoli e approfondimenti su spedizioni e logistica.',
				mainEntity: {
					'@type': 'Organization',
					name: 'SpedizioneFacile',
					url: 'https://spedizionefacile.it',
				},
			}),
		},
	],
});

const sanctum = useSanctumClient();
const articles = ref([]);
const loading = ref(true);

onMounted(async () => {
	try {
		const res = await sanctum('/api/public/blog');
		const data = res?.data || res;
		if (Array.isArray(data)) {
			articles.value = data;
		}
	} catch {
		// API non disponibile
	}
	loading.value = false;
});

// Descrizione breve per la card
const getDescription = (article) => {
	const text = article.meta_description || article.intro || '';
	if (text.length > 160) return text.substring(0, 160) + '...';
	return text;
};

// Formatta data in italiano
const formatDate = (dateStr) => {
	if (!dateStr) return '';
	const date = new Date(dateStr);
	return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
};
</script>

<template>
	<section id="blog">
		<div class="my-container">
			<!-- Header -->
			<p class="text-[0.875rem] desktop-xl:text-[1.25rem] font-medium text-[rgba(0,0,0,.6)] tracking-[1.8px] border-[#C4C4C4] border-b-[1px] pb-[30px] mt-[32px] desktop:text-[1.25rem]">Blog</p>

			<p class="font-[General_Sans] text-[1.25rem] desktop-xl:text-[2.5rem] leading-[160%] tracking-[-0.48px] desktop:tracking-[-0.96px] text-[#222222] mt-[32px] border-[#C4C4C4] border-b-[1px] pb-[32px] desktop:text-[1.75rem]">
				Approfondimenti, consigli e novita dal mondo delle spedizioni. Resta aggiornato con il nostro blog.
			</p>

			<!-- Loading -->
			<div v-if="loading" class="flex justify-center py-[60px]">
				<div class="w-[40px] h-[40px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"/>
			</div>

			<!-- Nessun articolo -->
			<div v-else-if="!articles.length" class="text-center py-[80px]">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[48px] h-[48px] text-[#C8CCD0] mx-auto mb-[16px]" fill="currentColor"><path d="M13,12H20V13.5H13M13,9.5H20V11H13M13,14.5H20V16H13M21,4H3A2,2 0 0,0 1,6V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V6A2,2 0 0,0 21,4M21,19H12V6H21"/></svg>
				<p class="text-[1.125rem] text-[#737373]">Nessun articolo pubblicato al momento.</p>
				<p class="text-[0.875rem] text-[#A0A0A0] mt-[8px]">Torna a trovarci presto!</p>
			</div>

			<!-- Grid articoli -->
			<div v-else class="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-[24px] mt-[40px] mb-[80px] desktop:mb-[120px]">
				<NuxtLink
					v-for="article in articles"
					:key="article.slug"
					:to="`/blog/${article.slug}`"
					class="blog-card block rounded-[20px] overflow-hidden border border-[#E0E0E0] shadow-sm hover:shadow-lg hover:border-[#095866] transition-all group bg-white">

					<!-- Immagine di copertina -->
					<div class="blog-card__image relative h-[200px] overflow-hidden bg-gradient-to-br from-[#095866] to-[#0b6d7d]">
						<img
							v-if="article.featured_image"
							:src="article.featured_image"
							:alt="article.title"
							loading="lazy"
							decoding="async"
							class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" >
						<div v-else class="w-full h-full flex items-center justify-center">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[48px] h-[48px] text-white/40" fill="currentColor"><path d="M13,12H20V13.5H13M13,9.5H20V11H13M13,14.5H20V16H13M21,4H3A2,2 0 0,0 1,6V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V6A2,2 0 0,0 21,4M21,19H12V6H21"/></svg>
						</div>
					</div>

					<!-- Card body -->
					<div class="p-[24px] desktop:p-[28px]">
						<!-- Data -->
						<p class="text-[0.75rem] text-[#737373] font-medium mb-[10px] uppercase tracking-[0.5px]">
							{{ formatDate(article.created_at) }}
						</p>

						<h2 class="text-[1.125rem] desktop:text-[1.25rem] font-medium text-[#222222] leading-[130%] tracking-[-0.48px] mb-[10px] group-hover:text-[#095866] transition-colors">
							{{ article.title }}
						</h2>
						<p class="text-[0.875rem] desktop:text-[0.9375rem] text-[#737373] leading-[160%] tracking-[-0.252px] mb-[20px]">
							{{ getDescription(article) }}
						</p>
						<span class="inline-flex items-center gap-[6px] h-[42px] px-[20px] rounded-[35px] bg-[#E44203] text-white font-semibold tracking-[-0.336px] text-[0.875rem] group-hover:bg-[#c93800] transition-colors">
							Leggi
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10"/><path d="M9 4l4 4-4 4"/></svg>
						</span>
					</div>
				</NuxtLink>
			</div>
		</div>
	</section>
</template>
