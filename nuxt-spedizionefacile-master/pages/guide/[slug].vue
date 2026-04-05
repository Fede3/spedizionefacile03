<!--
  PAGINA: Guida Singola (guide/[slug].vue)
  Template dinamico guide con fetch SSR, SEO server-side e shell editoriale coerente.
-->
<script setup>
import { formatDateIt } from '~/utils/date.js';

const route = useRoute();
const slug = computed(() => String(route.params.slug || ''));

const [{ data: guideResponse, pending }, { data: guideListResponse }] = await Promise.all([
	useFetch(() => `/api/public/guides/${slug.value}`, {
		key: () => `public-guide:${slug.value}`,
		server: true,
		lazy: false,
		default: () => null,
	}),
	useFetch('/api/public/guides', {
		key: 'public-guides-list',
		server: true,
		lazy: false,
		default: () => ({ data: [] }),
	}),
]);

const guide = computed(() => {
	const data = guideResponse.value?.data || guideResponse.value;
	return data?.id ? data : null;
});

if (!guide.value) {
	await navigateTo('/guide');
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

const guideSections = computed(() =>
	parseArrayPayload(guide.value?.sections)
		.map((section) => ({
			heading: String(section?.heading || '').trim(),
			text: String(section?.text || '').trim(),
		}))
		.filter((section) => section.heading && section.text),
);

const guides = computed(() => {
	const source = guideListResponse.value?.data || guideListResponse.value;
	return Array.isArray(source) ? source : [];
});

const guideIndex = computed(() => guides.value.findIndex((item) => item.slug === slug.value));
const prevGuide = computed(() => (guideIndex.value > 0 ? guides.value[guideIndex.value - 1] : null));
const nextGuide = computed(() =>
	guideIndex.value >= 0 && guideIndex.value < guides.value.length - 1 ? guides.value[guideIndex.value + 1] : null,
);

const guideMetaDescription = computed(() =>
	String(guide.value?.meta_description || guide.value?.intro || 'Guida pratica SpediamoFacile.').trim(),
);

const readingPills = computed(() => {
	const pills = ['Guida pratica', 'Lettura rapida'];
	if (guideSections.value.length) pills.unshift(`${guideSections.value.length} blocchi utili`);
	if (guide.value?.created_at) pills.push(formatDateIt(guide.value.created_at, '').replace(/\.$/, ''));
	return pills.filter(Boolean);
});

const firstSections = computed(() => guideSections.value.slice(0, 2));
const remainingSections = computed(() => guideSections.value.slice(2));

useSeoMeta({
	title: () => (guide.value?.title ? `${guide.value.title} | SpediamoFacile` : 'Guida | SpediamoFacile'),
	ogTitle: () => (guide.value?.title ? `${guide.value.title} | SpediamoFacile` : 'Guida | SpediamoFacile'),
	description: () => guideMetaDescription.value,
	ogDescription: () => guideMetaDescription.value,
});

useHead(() => {
	if (!guide.value) return {};

	return {
		script: [
			{
				key: 'guide-article-schema',
				type: 'application/ld+json',
				innerHTML: JSON.stringify({
					'@context': 'https://schema.org',
					'@type': 'Article',
					headline: guide.value.title,
					description: guideMetaDescription.value,
					mainEntityOfPage: `https://spediamofacile.it/guide/${slug.value}`,
					author: {
						'@type': 'Organization',
						name: 'SpediamoFacile',
					},
					publisher: {
						'@type': 'Organization',
						name: 'SpediamoFacile',
						url: 'https://spediamofacile.it',
					},
					datePublished: guide.value.created_at || undefined,
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

	<section v-else-if="guide" class="guide-detail-shell py-[28px] desktop:py-[56px]">
		<div class="my-container space-y-[20px] desktop:space-y-[28px]">
			<div class="mt-[8px]">
				<NuxtLink
					to="/guide"
					class="inline-flex items-center gap-[8px] text-[0.875rem] font-medium text-[var(--color-brand-primary)] transition-colors hover:text-[#0B6D7D]">
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
					Torna alle guide
				</NuxtLink>
			</div>

			<section class="guide-hero-card rounded-[28px] border border-[#E4EAEE] px-[20px] py-[22px] desktop:px-[32px] desktop:py-[34px]">
				<div class="space-y-[12px]">
					<p class="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">Guida</p>
					<h1 class="max-w-[16ch] text-[2rem] font-bold tracking-[-0.04em] text-[#1F2937] desktop:text-[3rem]">
						{{ guide.title }}
					</h1>
					<p class="max-w-[68ch] text-[0.95rem] leading-[1.68] text-[#5B6670] desktop:text-[1.0625rem]">
						{{ guide.intro || guideMetaDescription }}
					</p>
					<div class="flex flex-wrap gap-[8px]">
						<span
							v-for="pill in readingPills"
							:key="pill"
							class="inline-flex items-center rounded-full bg-[#F0F6F7] px-[12px] py-[6px] text-[0.75rem] font-semibold text-[var(--color-brand-primary)]">
							{{ pill }}
						</span>
					</div>
				</div>
			</section>

			<section v-if="firstSections.length" class="grid gap-[16px] desktop:grid-cols-2">
				<article
					v-for="section in firstSections"
					:key="section.heading"
					class="rounded-[24px] border border-[#E9EEF2] bg-white px-[18px] py-[18px] shadow-[0_12px_26px_rgba(15,23,42,0.04)] desktop:px-[22px] desktop:py-[22px]">
					<h2 class="text-[1.125rem] font-semibold tracking-[-0.02em] text-[#1F2937]">{{ section.heading }}</h2>
					<p class="mt-[10px] text-[0.875rem] leading-[1.7] text-[#5B6670] desktop:text-[0.9375rem]">
						{{ section.text }}
					</p>
				</article>
			</section>

			<section
				v-if="remainingSections.length"
				class="rounded-[28px] border border-[#E9EEF2] bg-white px-[18px] py-[18px] shadow-[0_14px_30px_rgba(15,23,42,0.05)] desktop:px-[24px] desktop:py-[24px]">
				<div class="sf-page-intro">
					<p class="sf-section-kicker">Approfondimento</p>
					<h2 class="text-[1.4rem] font-semibold tracking-[-0.03em] text-[#1F2937] desktop:text-[2rem]">
						I dettagli utili per applicarla davvero
					</h2>
				</div>

				<div class="mt-[18px] grid gap-[14px] desktop:grid-cols-2">
					<article
						v-for="section in remainingSections"
						:key="section.heading"
						class="rounded-[22px] border border-[#EDF2F5] bg-[#F8FBFC] px-[16px] py-[16px]">
						<h3 class="text-[1rem] font-semibold text-[#1F2937]">{{ section.heading }}</h3>
						<p class="mt-[10px] text-[0.875rem] leading-[1.65] text-[#5B6670]">
							{{ section.text }}
						</p>
					</article>
				</div>
			</section>

			<section
				v-if="prevGuide || nextGuide"
				class="rounded-[28px] border border-[#E9EEF2] bg-white px-[18px] py-[18px] shadow-[0_14px_30px_rgba(15,23,42,0.05)] desktop:px-[24px] desktop:py-[24px]">
				<div class="sf-page-intro">
					<p class="sf-section-kicker">Continua a leggere</p>
					<h2 class="text-[1.35rem] font-semibold tracking-[-0.03em] text-[#1F2937] desktop:text-[1.8rem]">
						Altre guide della stessa libreria
					</h2>
				</div>

				<div class="mt-[18px] grid gap-[14px] desktop:grid-cols-2">
					<NuxtLink
						v-if="prevGuide"
						:to="`/guide/${prevGuide.slug}`"
						class="group rounded-[22px] border border-[#EDF2F5] bg-[#F8FBFC] px-[16px] py-[16px] transition-colors hover:border-[#CFE0E6] hover:bg-white">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-brand-primary)]">Guida precedente</p>
						<h3 class="mt-[8px] text-[1rem] font-semibold text-[#1F2937] transition-colors group-hover:text-[var(--color-brand-primary)]">
							{{ prevGuide.title }}
						</h3>
					</NuxtLink>
					<NuxtLink
						v-if="nextGuide"
						:to="`/guide/${nextGuide.slug}`"
						class="group rounded-[22px] border border-[#EDF2F5] bg-[#F8FBFC] px-[16px] py-[16px] transition-colors hover:border-[#CFE0E6] hover:bg-white">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-brand-primary)]">Guida successiva</p>
						<h3 class="mt-[8px] text-[1rem] font-semibold text-[#1F2937] transition-colors group-hover:text-[var(--color-brand-primary)]">
							{{ nextGuide.title }}
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
							Vuoi passare dalla teoria al preventivo?
						</h2>
						<p class="mt-[10px] text-[0.9rem] leading-[1.65] text-white/80">
							Usa la guida come checklist pratica e poi apri il preventivo per trasformare i consigli in una spedizione reale.
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
							Tutte le guide
						</NuxtLink>
					</div>
				</div>
			</section>
		</div>
	</section>
</template>

<style scoped>
.guide-hero-card {
	background:
		radial-gradient(circle at top right, rgba(228, 66, 3, 0.16), transparent 30%),
		linear-gradient(180deg, rgba(9, 88, 102, 0.07) 0%, rgba(9, 88, 102, 0.02) 100%);
}
</style>
