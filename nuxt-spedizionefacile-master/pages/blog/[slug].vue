<script setup>
import { formatDateIt } from '~/utils/date.js';

const route = useRoute();
const slug = computed(() => String(route.params.slug || ''));
const { sanitize } = useSanitize();

const [{ data: articleResponse, pending }, { data: articleListResponse }] = await Promise.all([
	useFetch(() => `/api/public/blog/${slug.value}`, {
		key: () => `public-blog:${slug.value}`,
		server: true,
		lazy: false,
		default: () => null,
	}),
	useFetch('/api/public/blog', {
		key: 'public-blog-list',
		server: true,
		lazy: false,
		default: () => ({ data: [] }),
	}),
]);

const article = computed(() => {
	const data = articleResponse.value?.data || articleResponse.value;
	return data?.id ? data : null;
});

if (!article.value) {
	await navigateTo('/blog');
}

const parseArrayPayload = (value) => {
	if (!value) return [];
	if (Array.isArray(value)) return value;
	if (typeof value !== 'string') return [];

	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

const articleSections = computed(() =>
	parseArrayPayload(article.value?.sections)
		.map((section) => ({
			heading: String(section?.heading || '').trim(),
			text: String(section?.text || '').trim(),
		}))
		.filter((section) => section.heading && section.text),
);

const articles = computed(() => {
	const source = articleListResponse.value?.data || articleListResponse.value;
	return Array.isArray(source) ? source : [];
});

const articleIndex = computed(() => articles.value.findIndex((item) => item.slug === slug.value));
const prevArticle = computed(() => (articleIndex.value > 0 ? articles.value[articleIndex.value - 1] : null));
const nextArticle = computed(() =>
	articleIndex.value >= 0 && articleIndex.value < articles.value.length - 1 ? articles.value[articleIndex.value + 1] : null,
);

const articleMetaDescription = computed(() =>
	String(article.value?.meta_description || article.value?.intro || 'Articolo del blog SpediamoFacile.').trim(),
);

const articlePills = computed(() => {
	const pills = ['Articolo blog'];

	if (article.value?.created_at) {
		pills.unshift(formatDateIt(article.value.created_at, '').replace(/\.$/, ''));
	}

	if (articleSections.value.length) {
		pills.push(`${articleSections.value.length} sezioni`);
	}

	return pills.filter(Boolean);
});

const leadSections = computed(() => articleSections.value.slice(0, 2));
const remainingSections = computed(() => articleSections.value.slice(2));

useSeoMeta({
	title: () => (article.value?.title ? `${article.value.title} | Blog | SpediamoFacile` : 'Blog | SpediamoFacile'),
	ogTitle: () => (article.value?.title ? `${article.value.title} | Blog | SpediamoFacile` : 'Blog | SpediamoFacile'),
	description: () => articleMetaDescription.value,
	ogDescription: () => articleMetaDescription.value,
});

useHead(() => {
	if (!article.value) return {};

	return {
		script: [
			{
				key: 'blog-article-schema',
				type: 'application/ld+json',
				innerHTML: JSON.stringify({
					'@context': 'https://schema.org',
					'@type': 'Article',
					headline: article.value.title,
					description: articleMetaDescription.value,
					mainEntityOfPage: `https://spediamofacile.it/blog/${slug.value}`,
					image: article.value.featured_image || undefined,
					datePublished: article.value.created_at || undefined,
					author: {
						'@type': 'Organization',
						name: 'SpediamoFacile',
					},
					publisher: {
						'@type': 'Organization',
						name: 'SpediamoFacile',
						url: 'https://spediamofacile.it',
					},
				}),
			},
		],
	};
});
</script>

<template>
	<section v-if="pending" class="flex min-h-[420px] items-center justify-center">
		<div class="h-[40px] w-[40px] rounded-full border-3 border-[#E9EBEC] border-t-[#095866] animate-spin"></div>
	</section>

	<section v-else-if="article" class="blog-detail-shell py-[28px] desktop:py-[56px]">
		<div class="my-container space-y-[20px] desktop:space-y-[28px]">
			<div class="mt-[8px]">
				<NuxtLink
					to="/blog"
					class="inline-flex items-center gap-[8px] text-[0.875rem] font-medium text-[#095866] transition-colors hover:text-[#0B6D7D]">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 18 18"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round">
						<path d="M13 9H5" />
						<path d="M9 5l-4 4 4 4" />
					</svg>
					Torna al blog
				</NuxtLink>
			</div>

			<section class="blog-hero-card rounded-[28px] border border-[#E4EAEE] px-[20px] py-[22px] desktop:px-[32px] desktop:py-[34px]">
				<div class="space-y-[12px]">
					<p class="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[#095866]">Blog</p>
					<h1 class="max-w-[18ch] text-[2rem] font-bold tracking-[-0.04em] text-[#1F2937] desktop:text-[3rem]">
						{{ article.title }}
					</h1>
					<p class="max-w-[68ch] text-[0.95rem] leading-[1.68] text-[#5B6670] desktop:text-[1.0625rem]">
						{{ article.intro || articleMetaDescription }}
					</p>
					<div class="flex flex-wrap gap-[8px]">
						<span
							v-for="pill in articlePills"
							:key="pill"
							class="inline-flex items-center rounded-full bg-[#F0F6F7] px-[12px] py-[6px] text-[0.75rem] font-semibold text-[#095866]">
							{{ pill }}
						</span>
					</div>
				</div>
			</section>

			<section
				v-if="article.featured_image"
				class="overflow-hidden rounded-[28px] border border-[#E9EEF2] bg-white shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
				<img :src="article.featured_image" :alt="article.title" loading="lazy" decoding="async" class="max-h-[420px] w-full object-cover" />
			</section>

			<section v-if="leadSections.length" class="grid gap-[16px] desktop:grid-cols-2">
				<article
					v-for="section in leadSections"
					:key="section.heading"
					class="rounded-[24px] border border-[#E9EEF2] bg-white px-[18px] py-[18px] shadow-[0_12px_26px_rgba(15,23,42,0.04)] desktop:px-[22px] desktop:py-[22px]">
					<h2 class="text-[1.125rem] font-semibold tracking-[-0.02em] text-[#1F2937]">{{ section.heading }}</h2>
					<div
						class="blog-prose mt-[10px] text-[0.875rem] leading-[1.7] text-[#5B6670] desktop:text-[0.9375rem]"
						v-html="sanitize(section.text)"></div>
				</article>
			</section>

			<section
				v-if="remainingSections.length"
				class="rounded-[28px] border border-[#E9EEF2] bg-white px-[18px] py-[18px] shadow-[0_14px_30px_rgba(15,23,42,0.05)] desktop:px-[24px] desktop:py-[24px]">
				<div class="sf-page-intro">
					<p class="sf-section-kicker">Approfondimento</p>
					<h2 class="text-[1.4rem] font-semibold tracking-[-0.03em] text-[#1F2937] desktop:text-[2rem]">
						I dettagli che aiutano davvero nel flusso operativo
					</h2>
				</div>

				<div class="mt-[18px] grid gap-[14px] desktop:grid-cols-2">
					<article
						v-for="section in remainingSections"
						:key="section.heading"
						class="rounded-[22px] border border-[#EDF2F5] bg-[#F8FBFC] px-[16px] py-[16px]">
						<h3 class="text-[1rem] font-semibold text-[#1F2937]">{{ section.heading }}</h3>
						<div class="blog-prose mt-[10px] text-[0.875rem] leading-[1.65] text-[#5B6670]" v-html="sanitize(section.text)"></div>
					</article>
				</div>
			</section>

			<section
				v-if="prevArticle || nextArticle"
				class="rounded-[28px] border border-[#E9EEF2] bg-white px-[18px] py-[18px] shadow-[0_14px_30px_rgba(15,23,42,0.05)] desktop:px-[24px] desktop:py-[24px]">
				<div class="sf-page-intro">
					<p class="sf-section-kicker">Continua a leggere</p>
					<h2 class="text-[1.35rem] font-semibold tracking-[-0.03em] text-[#1F2937] desktop:text-[1.8rem]">
						Altri articoli dello stesso archivio
					</h2>
				</div>

				<div class="mt-[18px] grid gap-[14px] desktop:grid-cols-2">
					<NuxtLink
						v-if="prevArticle"
						:to="`/blog/${prevArticle.slug}`"
						class="group rounded-[22px] border border-[#EDF2F5] bg-[#F8FBFC] px-[16px] py-[16px] transition-colors hover:border-[#CFE0E6] hover:bg-white">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#095866]">Articolo precedente</p>
						<h3 class="mt-[8px] text-[1rem] font-semibold text-[#1F2937] transition-colors group-hover:text-[#095866]">
							{{ prevArticle.title }}
						</h3>
					</NuxtLink>
					<NuxtLink
						v-if="nextArticle"
						:to="`/blog/${nextArticle.slug}`"
						class="group rounded-[22px] border border-[#EDF2F5] bg-[#F8FBFC] px-[16px] py-[16px] transition-colors hover:border-[#CFE0E6] hover:bg-white">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#095866]">Articolo successivo</p>
						<h3 class="mt-[8px] text-[1rem] font-semibold text-[#1F2937] transition-colors group-hover:text-[#095866]">
							{{ nextArticle.title }}
						</h3>
					</NuxtLink>
				</div>
			</section>

			<section
				class="rounded-[26px] border border-[#DCE8EC] bg-[linear-gradient(135deg,#0f5f6d_0%,#0c4853_100%)] px-[20px] py-[20px] text-white shadow-[0_18px_40px_rgba(9,88,102,0.18)] desktop:px-[28px] desktop:py-[28px]">
				<div class="flex flex-col gap-[16px] desktop:flex-row desktop:items-center desktop:justify-between">
					<div class="max-w-[60ch]">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-white/70">Passo successivo</p>
						<h2 class="mt-[8px] text-[1.35rem] font-semibold tracking-[-0.03em] desktop:text-[1.8rem]">
							Vuoi trasformare il consiglio in una spedizione reale?
						</h2>
						<p class="mt-[10px] text-[0.9rem] leading-[1.65] text-white/80">
							Usa l'articolo come riferimento rapido, poi apri il preventivo o torna alle guide per chiudere gli ultimi dubbi.
						</p>
					</div>

					<div class="flex flex-wrap gap-[10px]">
						<NuxtLink
							to="/preventivo"
							class="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-[18px] text-[0.875rem] font-semibold text-[#0B5360] transition-transform duration-200 hover:-translate-y-[1px]">
							Calcola il preventivo
						</NuxtLink>
						<NuxtLink
							to="/guide"
							class="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/30 px-[18px] text-[0.875rem] font-semibold text-white transition-colors duration-200 hover:bg-white/10">
							Apri le guide
						</NuxtLink>
					</div>
				</div>
			</section>
		</div>
	</section>
</template>

<style scoped>
.blog-intro-card,
.blog-hero-card {
	background:
		radial-gradient(circle at top right, rgba(228, 66, 3, 0.14), transparent 30%),
		linear-gradient(180deg, rgba(9, 88, 102, 0.07) 0%, rgba(9, 88, 102, 0.02) 100%);
}

.blog-prose :deep(p) {
	margin: 0;
}

.blog-prose :deep(p + p) {
	margin-top: 0.85rem;
}

.blog-prose :deep(ul),
.blog-prose :deep(ol) {
	margin: 0.85rem 0 0;
	padding-left: 1.15rem;
}

.blog-prose :deep(a) {
	color: #095866;
	text-decoration: underline;
}
</style>
