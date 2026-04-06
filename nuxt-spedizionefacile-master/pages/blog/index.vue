<script setup>
import { formatDateIt } from '~/utils/date.js';

const { data: articlesResponse, pending } = await useFetch('/api/public/blog', {
	key: 'public-blog-list',
	server: true,
	lazy: false,
	default: () => ({ data: [] }),
});

const articles = computed(() => {
	const source = articlesResponse.value?.data || articlesResponse.value;
	return Array.isArray(source) ? source : [];
});

const featuredArticle = computed(() => articles.value[0] || null);
const articleGrid = computed(() => (featuredArticle.value ? articles.value.slice(1) : articles.value));

const articlePills = computed(() => {
	const pills = ['Editoriale pubblica', 'Consigli pratici'];

	if (articles.value.length) {
		pills.unshift(`${articles.value.length} articoli disponibili`);
	}

	return pills;
});

const getArticleDescription = (article) => {
	const text = String(article?.meta_description || article?.intro || '').trim();
	if (text.length <= 165) return text;
	return `${text.slice(0, 162).trim()}...`;
};

useSeoMeta({
	title: 'Blog | SpediamoFacile',
	ogTitle: 'Blog | SpediamoFacile',
	description: 'Approfondimenti pratici su spedizioni, logistica, imballaggio e flussi operativi per privati e aziende.',
	ogDescription: 'Approfondimenti pratici su spedizioni, logistica, imballaggio e flussi operativi per privati e aziende.',
});

useHead(() => ({
	script: [
		{
			key: 'blog-collection-schema',
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'CollectionPage',
				name: 'Blog | SpediamoFacile',
				url: 'https://spediamofacile.it/blog',
				description: 'Approfondimenti pratici su spedizioni, logistica e consegne.',
				mainEntity: {
					'@type': 'ItemList',
					itemListElement: articles.value.map((article, index) => ({
						'@type': 'ListItem',
						position: index + 1,
						url: `https://spediamofacile.it/blog/${article.slug}`,
						name: article.title,
					})),
				},
			}),
		},
	],
}));
</script>

<template>
	<section v-if="pending" class="flex min-h-[420px] items-center justify-center">
		<div class="h-[40px] w-[40px] rounded-full border-3 border-[var(--color-brand-border)] border-t-[var(--color-brand-primary)] animate-spin"></div>
	</section>

	<section v-else class="blog-index-shell min-h-screen py-[28px] desktop:py-[56px]">
		<div class="my-container space-y-[20px] desktop:space-y-[28px]">
			<!-- Breadcrumb -->
			<nav aria-label="Breadcrumb" class="flex items-center gap-[6px] text-[0.8125rem] text-[var(--color-brand-text-secondary)]">
				<NuxtLink to="/" class="transition-colors hover:text-[var(--color-brand-primary)]">Home</NuxtLink>
				<span aria-hidden="true">/</span>
				<span class="font-semibold text-[var(--color-brand-primary)]">Blog</span>
			</nav>

			<section class="blog-intro-card rounded-[14px] ring-[1px] ring-[#DFE2E7] px-[20px] py-[22px] shadow-[0_1px_4px_rgba(0,0,0,0.03)] desktop:px-[32px] desktop:py-[34px]">
				<div
					class="flex flex-col gap-[18px] desktop:grid desktop:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] desktop:items-center desktop:gap-[28px]">
					<div class="space-y-[12px]">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">Blog</p>
						<h1 class="max-w-[20ch] font-montserrat text-[2rem] font-[800] tracking-[-0.04em] text-[var(--color-brand-text)] desktop:text-[3.1rem]">
							Contenuti utili per spedire con meno attrito.
						</h1>
						<p class="max-w-[66ch] text-[0.95rem] leading-[1.68] text-[var(--color-brand-text-secondary)] desktop:text-[1.0625rem]">
							Il blog raccoglie checklist, consigli e casi reali per trasformare dubbi operativi in passaggi chiari prima del preventivo o
							della conferma ordine.
						</p>
						<div class="flex flex-wrap gap-[8px]">
							<span
								v-for="pill in articlePills"
								:key="pill"
								class="inline-flex items-center rounded-full bg-[var(--color-brand-secondary-soft-bg)] px-[12px] py-[6px] text-[0.75rem] font-semibold text-[var(--color-brand-primary)]">
								{{ pill }}
							</span>
						</div>
					</div>

					<div class="rounded-[14px] ring-[1px] ring-[#DFE2E7] bg-white/80 p-[18px] shadow-[0_1px_4px_rgba(0,0,0,0.03)] backdrop-blur">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand-accent)]">Percorso consigliato</p>
						<div class="mt-[12px] space-y-[12px] text-[0.85rem] leading-[1.6] text-[var(--color-brand-text-secondary)]">
							<p>Leggi una guida pratica, verifica i servizi utili e poi passa al preventivo solo quando il flusso è chiaro.</p>
							<p>Questo riduce errori su imballaggio, dati spedizione e servizi accessori già dal primo tentativo.</p>
						</div>
						<div class="mt-[16px] flex flex-wrap gap-[10px]">
							<NuxtLink to="/guide" class="btn-secondary btn-compact inline-flex items-center justify-center">Apri le guide</NuxtLink>
							<NuxtLink to="/preventivo" class="btn-cta btn-compact inline-flex items-center justify-center">Vai al preventivo</NuxtLink>
						</div>
					</div>
				</div>
			</section>

			<section
				v-if="featuredArticle"
				class="rounded-[14px] ring-[1px] ring-[#DFE2E7] bg-white px-[18px] py-[18px] shadow-[0_1px_4px_rgba(0,0,0,0.03)] desktop:px-[24px] desktop:py-[24px]">
				<div class="sf-page-intro">
					<p class="sf-section-kicker">In evidenza</p>
					<h2 class="font-montserrat text-[1.4rem] font-[800] tracking-[-0.03em] text-[var(--color-brand-text)] desktop:text-[2rem]">
						Lettura consigliata per partire dal punto giusto
					</h2>
				</div>

				<NuxtLink
					:to="`/blog/${featuredArticle.slug}`"
					class="blog-card-lift mt-[18px] grid gap-[16px] rounded-[14px] ring-[1px] ring-[#DFE2E7] bg-[var(--color-brand-secondary-soft-bg)] p-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.03)] transition-all duration-300 hover:ring-[var(--color-brand-secondary-soft-border)] hover:bg-white desktop:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
					<div class="space-y-[10px]">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand-primary)]">
							{{ formatDateIt(featuredArticle.created_at, '') || 'Articolo blog' }}
						</p>
						<h3 class="font-montserrat text-[1.3rem] font-[800] tracking-[-0.03em] text-[var(--color-brand-text)] desktop:text-[1.7rem]">
							{{ featuredArticle.title }}
						</h3>
						<p class="text-[0.9rem] leading-[1.68] text-[var(--color-brand-text-secondary)] desktop:text-[0.95rem]">
							{{ getArticleDescription(featuredArticle) }}
						</p>
						<span class="inline-flex items-center gap-[8px] text-[0.875rem] font-semibold text-[var(--color-brand-primary)]">
							Leggi l'articolo
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round">
								<path d="M5 12h14" />
								<path d="m12 5 7 7-7 7" />
							</svg>
						</span>
					</div>

					<div class="overflow-hidden rounded-[14px] ring-[1px] ring-[var(--color-brand-border)] bg-[linear-gradient(135deg,#0f5f6d_0%,#0c4853_100%)]">
						<img
							v-if="featuredArticle.featured_image"
							:src="featuredArticle.featured_image"
							:alt="featuredArticle.title"
							loading="lazy"
							decoding="async"
							class="h-full min-h-[220px] w-full object-cover" />
						<div
							v-else
							class="flex min-h-[220px] items-center justify-center px-[20px] text-center text-[1rem] font-semibold text-white/80">
							{{ featuredArticle.title }}
						</div>
					</div>
				</NuxtLink>
			</section>

			<section
				v-if="articles.length"
				class="rounded-[14px] ring-[1px] ring-[#DFE2E7] bg-white px-[18px] py-[18px] shadow-[0_1px_4px_rgba(0,0,0,0.03)] desktop:px-[24px] desktop:py-[24px]">
				<div class="sf-page-intro">
					<p class="sf-section-kicker">Archivio</p>
					<h2 class="font-montserrat text-[1.4rem] font-[800] tracking-[-0.03em] text-[var(--color-brand-text)] desktop:text-[2rem]">Tutti gli articoli disponibili</h2>
				</div>

				<div class="mt-[18px] grid gap-[14px] desktop:grid-cols-3">
					<NuxtLink
						v-for="article in articleGrid.length ? articleGrid : articles"
						:key="article.slug"
						:to="`/blog/${article.slug}`"
						class="blog-card-lift group flex h-full flex-col rounded-[14px] ring-[1px] ring-[#DFE2E7] bg-[var(--color-brand-secondary-soft-bg)] p-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.03)] transition-all duration-300 hover:ring-[var(--color-brand-secondary-soft-border)] hover:bg-white">
						<div class="overflow-hidden rounded-[14px] ring-[1px] ring-[var(--color-brand-border)] bg-[linear-gradient(135deg,#0f5f6d_0%,#0c4853_100%)]">
							<img
								v-if="article.featured_image"
								:src="article.featured_image"
								:alt="article.title"
								loading="lazy"
								decoding="async"
								class="h-[180px] w-full object-cover" />
							<div
								v-else
								class="flex h-[180px] items-center justify-center px-[18px] text-center text-[0.95rem] font-semibold text-white/80">
								{{ article.title }}
							</div>
						</div>

						<div class="mt-[14px] flex flex-1 flex-col">
							<p class="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-primary)]">
								{{ formatDateIt(article.created_at, 'Articolo blog') }}
							</p>
							<h3 class="mt-[8px] font-montserrat text-[1rem] font-[800] text-[var(--color-brand-text)] transition-colors group-hover:text-[var(--color-brand-primary)]">
								{{ article.title }}
							</h3>
							<p class="mt-[10px] flex-1 text-[0.875rem] leading-[1.65] text-[var(--color-brand-text-secondary)]">
								{{ getArticleDescription(article) }}
							</p>
							<span class="mt-[14px] inline-flex items-center gap-[8px] text-[0.875rem] font-semibold text-[var(--color-brand-primary)]">
								Apri articolo
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round">
									<path d="M5 12h14" />
									<path d="m12 5 7 7-7 7" />
								</svg>
							</span>
						</div>
					</NuxtLink>
				</div>
			</section>

			<section
				v-else
				class="rounded-[14px] ring-[1px] ring-dashed ring-[var(--color-brand-secondary-soft-border)] bg-white px-[20px] py-[28px] text-center shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
				<h2 class="font-montserrat text-[1.2rem] font-[800] text-[var(--color-brand-text)]">Il blog è pronto ma ancora vuoto</h2>
				<p class="mx-auto mt-[10px] max-w-[56ch] text-[0.9rem] leading-[1.65] text-[var(--color-brand-text-secondary)]">
					Gli articoli pubblici compariranno qui non appena verranno pubblicati dal pannello amministrativo.
				</p>
			</section>
		</div>
	</section>
</template>

<style scoped>
.blog-index-shell {
	background: linear-gradient(180deg, #F8F9FB 0%, #EEF0F3 100%);
}

.blog-intro-card {
	background:
		radial-gradient(circle at top right, rgba(228, 66, 3, 0.14), transparent 30%),
		linear-gradient(180deg, rgba(9, 88, 102, 0.07) 0%, rgba(9, 88, 102, 0.02) 100%);
}

.blog-card-lift {
	transition:
		transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
		box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1),
		border-color 0.3s ease,
		background-color 0.3s ease;
}

.blog-card-lift:hover {
	transform: translateY(-4px);
	box-shadow: 0 16px 40px rgba(15, 23, 42, 0.1);
}
</style>
