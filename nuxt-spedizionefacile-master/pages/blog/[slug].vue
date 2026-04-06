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

const _leadSections = computed(() => articleSections.value.slice(0, 2));
const _remainingSections = computed(() => articleSections.value.slice(2));

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
		<div class="h-[40px] w-[40px] rounded-full border-3 border-[var(--color-brand-border)] border-t-[var(--color-brand-primary)] animate-spin"></div>
	</section>

	<section v-else-if="article" class="blog-detail-shell min-h-screen py-[28px] desktop:py-[56px]">
		<div class="my-container space-y-[20px] desktop:space-y-[28px]">
			<!-- Breadcrumb -->
			<nav aria-label="Breadcrumb" class="flex items-center gap-[6px] text-[0.8125rem] text-[var(--color-brand-text-secondary)]">
				<NuxtLink to="/" class="transition-colors hover:text-[var(--color-brand-primary)]">Home</NuxtLink>
				<span aria-hidden="true">/</span>
				<NuxtLink to="/blog" class="transition-colors hover:text-[var(--color-brand-primary)]">Blog</NuxtLink>
				<span aria-hidden="true">/</span>
				<span class="font-semibold text-[var(--color-brand-primary)] truncate max-w-[28ch]">{{ article.title }}</span>
			</nav>

			<!-- Hero header -->
			<section class="blog-hero-card rounded-[14px] ring-[1px] ring-[#DFE2E7] px-[20px] py-[22px] shadow-[0_1px_4px_rgba(0,0,0,0.03)] desktop:px-[32px] desktop:py-[34px]">
				<div class="space-y-[12px]">
					<p class="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">Blog</p>
					<h1 class="max-w-[24ch] font-montserrat text-[2rem] font-[800] tracking-[-0.04em] text-[var(--color-brand-text)] desktop:text-[3rem]">
						{{ article.title }}
					</h1>
					<p class="max-w-[68ch] text-[0.95rem] leading-[1.68] text-[var(--color-brand-text-secondary)] desktop:text-[1.0625rem]">
						{{ article.intro || articleMetaDescription }}
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
			</section>

			<!-- Featured image -->
			<section
				v-if="article.featured_image"
				class="overflow-hidden rounded-[14px] ring-[1px] ring-[#DFE2E7] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
				<img :src="article.featured_image" :alt="article.title" loading="lazy" decoding="async" class="max-h-[420px] w-full object-cover" />
			</section>

			<!-- Article body: max-width 720px reading layout -->
			<div class="blog-reading-layout mx-auto w-full max-w-[720px] space-y-[24px] desktop:space-y-[32px]">
				<article
					v-for="section in articleSections"
					:key="section.heading"
					class="rounded-[14px] ring-[1px] ring-[#DFE2E7] bg-white px-[20px] py-[20px] shadow-[0_1px_4px_rgba(0,0,0,0.03)] desktop:px-[28px] desktop:py-[24px]">
					<h2 class="font-montserrat text-[1.2rem] font-[800] tracking-[-0.02em] text-[var(--color-brand-text)] desktop:text-[1.35rem]">{{ section.heading }}</h2>
					<div
						class="blog-prose mt-[12px] text-[0.9375rem] leading-[1.75] text-[var(--color-brand-text-secondary)] desktop:text-[1rem]"
						v-html="sanitize(section.text)"></div>
				</article>
			</div>

			<!-- Prev / Next navigation -->
			<section
				v-if="prevArticle || nextArticle"
				class="rounded-[14px] ring-[1px] ring-[#DFE2E7] bg-white px-[18px] py-[18px] shadow-[0_1px_4px_rgba(0,0,0,0.03)] desktop:px-[24px] desktop:py-[24px]">
				<div class="sf-page-intro">
					<p class="sf-section-kicker">Continua a leggere</p>
					<h2 class="font-montserrat text-[1.35rem] font-[800] tracking-[-0.03em] text-[var(--color-brand-text)] desktop:text-[1.8rem]">
						Altri articoli dello stesso archivio
					</h2>
				</div>

				<div class="mt-[18px] grid gap-[14px] desktop:grid-cols-2">
					<NuxtLink
						v-if="prevArticle"
						:to="`/blog/${prevArticle.slug}`"
						class="blog-nav-card group rounded-[14px] ring-[1px] ring-[#DFE2E7] bg-[var(--color-brand-secondary-soft-bg)] px-[16px] py-[16px] transition-all duration-300 hover:ring-[var(--color-brand-secondary-soft-border)] hover:bg-white">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-brand-primary)]">Articolo precedente</p>
						<h3 class="mt-[8px] font-montserrat text-[1rem] font-[800] text-[var(--color-brand-text)] transition-colors group-hover:text-[var(--color-brand-primary)]">
							{{ prevArticle.title }}
						</h3>
					</NuxtLink>
					<NuxtLink
						v-if="nextArticle"
						:to="`/blog/${nextArticle.slug}`"
						class="blog-nav-card group rounded-[14px] ring-[1px] ring-[#DFE2E7] bg-[var(--color-brand-secondary-soft-bg)] px-[16px] py-[16px] transition-all duration-300 hover:ring-[var(--color-brand-secondary-soft-border)] hover:bg-white">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-brand-primary)]">Articolo successivo</p>
						<h3 class="mt-[8px] font-montserrat text-[1rem] font-[800] text-[var(--color-brand-text)] transition-colors group-hover:text-[var(--color-brand-primary)]">
							{{ nextArticle.title }}
						</h3>
					</NuxtLink>
				</div>
			</section>

			<!-- CTA banner -->
			<section
				class="rounded-[14px] ring-[1px] ring-[var(--color-brand-secondary-soft-border)] bg-[linear-gradient(135deg,#0f5f6d_0%,#0c4853_100%)] px-[20px] py-[20px] text-white shadow-[0_1px_4px_rgba(0,0,0,0.03)] desktop:px-[28px] desktop:py-[28px]">
				<div class="flex flex-col gap-[16px] desktop:flex-row desktop:items-center desktop:justify-between">
					<div class="max-w-[60ch]">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-white/70">Passo successivo</p>
						<h2 class="mt-[8px] font-montserrat text-[1.35rem] font-[800] tracking-[-0.03em] desktop:text-[1.8rem]">
							Vuoi trasformare il consiglio in una spedizione reale?
						</h2>
						<p class="mt-[10px] text-[0.9rem] leading-[1.65] text-white/80">
							Usa l'articolo come riferimento rapido, poi apri il preventivo o torna alle guide per chiudere gli ultimi dubbi.
						</p>
					</div>

					<div class="flex flex-wrap gap-[10px]">
						<NuxtLink
							to="/preventivo"
							class="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-[18px] text-[0.875rem] font-[700] text-[var(--color-brand-primary)] shadow-[0_8px_20px_rgba(0,0,0,0.1)] transition-transform duration-200 hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(0,0,0,0.14)]">
							Calcola il preventivo
						</NuxtLink>
						<NuxtLink
							to="/guide"
							class="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/30 px-[18px] text-[0.875rem] font-[700] text-white transition-colors duration-200 hover:bg-white/10 hover:border-white/50">
							Apri le guide
						</NuxtLink>
					</div>
				</div>
			</section>
		</div>
	</section>
</template>

<style scoped>
.blog-detail-shell {
	background: linear-gradient(180deg, #F8F9FB 0%, #EEF0F3 100%);
}

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

.blog-prose :deep(li) {
	margin-top: 0.35rem;
}

.blog-prose :deep(a) {
	color: var(--color-brand-primary);
	text-decoration: underline;
}

.blog-prose :deep(strong) {
	color: var(--color-brand-text);
	font-weight: 600;
}

.blog-nav-card {
	transition:
		transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
		box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1),
		border-color 0.3s ease,
		background-color 0.3s ease;
}

.blog-nav-card:hover {
	transform: translateY(-3px);
	box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}
</style>
