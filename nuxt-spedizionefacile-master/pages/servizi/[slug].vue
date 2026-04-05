<!--
  PAGINA: Servizio Singolo (servizi/[slug].vue)
  Template dinamico servizi con fetch SSR, SEO reale lato server e shell pubblica coerente.
-->
<script setup>
const route = useRoute();
const slug = computed(() => String(route.params.slug || ''));

const { data: serviceResponse, pending } = await useFetch(() => `/api/public/services/${slug.value}`, {
	key: () => `public-service:${slug.value}`,
	server: true,
	lazy: false,
	default: () => null,
});

const service = computed(() => {
	const data = serviceResponse.value?.data || serviceResponse.value;
	return data?.id ? data : null;
});

if (!service.value) {
	await navigateTo('/servizi');
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

const serviceSections = computed(() =>
	parseArrayPayload(service.value?.sections)
		.map((section) => ({
			heading: String(section?.heading || '').trim(),
			text: String(section?.text || '').trim(),
		}))
		.filter((section) => section.heading && section.text),
);

const serviceFaqs = computed(() =>
	parseArrayPayload(service.value?.faqs)
		.map((faq) => ({
			title: String(faq?.title || '').trim(),
			text: String(faq?.text || '').trim(),
		}))
		.filter((faq) => faq.title && faq.text),
);

const overviewCards = computed(() => serviceSections.value.slice(0, 2));
const detailSections = computed(() => serviceSections.value.slice(2));

const servicePills = computed(() => {
	const pills = ['Servizio pubblico', 'Preventivo immediato'];

	if (serviceSections.value.length) {
		pills.unshift(`${serviceSections.value.length} passaggi chiave`);
	}

	if (serviceFaqs.value.length) {
		pills.push(`${serviceFaqs.value.length} FAQ`);
	}

	return pills;
});

const serviceMetaDescription = computed(() =>
	String(service.value?.meta_description || service.value?.intro || 'Scopri il servizio SpediamoFacile e attivalo nel preventivo.').trim(),
);

const supportChecklist = computed(() => {
	const items = serviceSections.value.slice(0, 4).map((section) => section.heading);
	if (items.length) return items;

	return [
		'Verifica disponibilita e condizioni operative.',
		'Configura il servizio nel preventivo prima del pagamento.',
		'Controlla eventuali dati aggiuntivi richiesti dal corriere.',
		'Usa il riepilogo finale per confermare il flusso.',
	];
});

useSeoMeta({
	title: () => (service.value?.title ? `${service.value.title} | SpediamoFacile` : 'Servizio | SpediamoFacile'),
	ogTitle: () => (service.value?.title ? `${service.value.title} | SpediamoFacile` : 'Servizio | SpediamoFacile'),
	description: () => serviceMetaDescription.value,
	ogDescription: () => serviceMetaDescription.value,
});

useHead(() => {
	if (!service.value) return {};

	const scripts = [
		{
			key: 'service-schema',
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'Service',
				name: service.value.title,
				url: `https://spediamofacile.it/servizi/${slug.value}`,
				provider: {
					'@type': 'Organization',
					name: 'SpediamoFacile',
					url: 'https://spediamofacile.it',
				},
				description: serviceMetaDescription.value,
			}),
		},
	];

	if (serviceFaqs.value.length) {
		scripts.push({
			key: 'service-faq-schema',
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'FAQPage',
				mainEntity: serviceFaqs.value.map((faq) => ({
					'@type': 'Question',
					name: faq.title,
					acceptedAnswer: {
						'@type': 'Answer',
						text: faq.text,
					},
				})),
			}),
		});
	}

	return { script: scripts };
});
</script>

<template>
	<section v-if="pending" class="flex min-h-[420px] items-center justify-center">
		<div class="h-[40px] w-[40px] rounded-full border-3 border-[var(--color-brand-border)] border-t-[var(--color-brand-primary)] animate-spin"></div>
	</section>

	<section v-else-if="service" class="service-detail-shell py-[28px] desktop:py-[56px]">
		<div class="my-container space-y-[20px] desktop:space-y-[28px]">
			<div class="mt-[8px]">
				<NuxtLink
					to="/servizi"
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
					Tutti i servizi
				</NuxtLink>
			</div>

			<section class="service-hero-card rounded-[28px] border border-[#E4EAEE] px-[20px] py-[22px] desktop:px-[32px] desktop:py-[34px]">
				<div
					class="flex flex-col gap-[18px] desktop:grid desktop:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] desktop:items-center desktop:gap-[28px]">
					<div class="space-y-[12px]">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">Servizio</p>
						<h1 class="text-[2rem] font-bold tracking-[-0.04em] text-[#1F2937] desktop:text-[3.1rem]">
							{{ service.title }}
						</h1>
						<p class="max-w-[62ch] text-[0.9375rem] leading-[1.65] text-[#5B6670] desktop:text-[1.0625rem]">
							{{ service.intro || serviceMetaDescription }}
						</p>
						<div class="flex flex-wrap gap-[8px]">
							<span
								v-for="pill in servicePills"
								:key="pill"
								class="inline-flex items-center rounded-full bg-[#F0F6F7] px-[12px] py-[6px] text-[0.75rem] font-semibold text-[var(--color-brand-primary)]">
								{{ pill }}
							</span>
						</div>
					</div>

					<div class="rounded-[24px] border border-white/70 bg-white/75 p-[18px] shadow-[0_18px_40px_rgba(9,88,102,0.08)] backdrop-blur">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand-accent)]">Quando usarlo</p>
						<div class="mt-[12px] space-y-[12px]">
							<div
								v-for="item in supportChecklist"
								:key="item"
								class="rounded-[18px] border border-[#E9EEF2] bg-[#F8FBFC] px-[14px] py-[12px] text-[0.8125rem] leading-[1.55] text-[#5B6670]">
								{{ item }}
							</div>
						</div>
						<div class="mt-[16px] flex flex-wrap gap-[10px]">
							<NuxtLink to="/preventivo" class="btn-cta btn-compact inline-flex items-center justify-center">
								Calcola il preventivo
							</NuxtLink>
							<NuxtLink to="/contatti" class="btn-secondary btn-compact inline-flex items-center justify-center">Parla con noi</NuxtLink>
						</div>
					</div>
				</div>
			</section>

			<section v-if="overviewCards.length" class="grid gap-[16px] desktop:grid-cols-2">
				<article
					v-for="card in overviewCards"
					:key="card.heading"
					class="rounded-[24px] border border-[#E9EEF2] bg-white px-[18px] py-[18px] shadow-[0_12px_26px_rgba(15,23,42,0.04)] desktop:px-[22px] desktop:py-[22px]">
					<h2 class="text-[1.125rem] font-semibold tracking-[-0.02em] text-[#1F2937]">{{ card.heading }}</h2>
					<p class="mt-[10px] text-[0.875rem] leading-[1.65] text-[#5B6670] desktop:text-[0.9375rem]">
						{{ card.text }}
					</p>
				</article>
			</section>

			<section
				v-if="detailSections.length"
				class="rounded-[28px] border border-[#E9EEF2] bg-white px-[18px] py-[18px] shadow-[0_14px_30px_rgba(15,23,42,0.05)] desktop:px-[24px] desktop:py-[24px]">
				<div class="sf-page-intro">
					<p class="sf-section-kicker">Approfondimento</p>
					<h2 class="text-[1.4rem] font-semibold tracking-[-0.03em] text-[#1F2937] desktop:text-[2rem]">Come entra nel flusso operativo</h2>
					<p class="sf-section-description max-w-[64ch]">
						Le sezioni sotto spiegano cosa cambia davvero quando attivi questo servizio e quali controlli conviene fare prima della
						conferma.
					</p>
				</div>

				<div class="mt-[18px] grid gap-[14px] desktop:grid-cols-2">
					<article
						v-for="section in detailSections"
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
				v-if="serviceFaqs.length"
				class="rounded-[28px] border border-[#E9EEF2] bg-white px-[18px] py-[18px] shadow-[0_14px_30px_rgba(15,23,42,0.05)] desktop:px-[24px] desktop:py-[24px]">
				<div class="sf-page-intro">
					<p class="sf-section-kicker">FAQ</p>
					<h2 class="text-[1.4rem] font-semibold tracking-[-0.03em] text-[#1F2937] desktop:text-[2rem]">
						Domande frequenti su {{ service.title }}
					</h2>
				</div>

				<div class="mt-[18px] grid gap-[14px] desktop:grid-cols-2">
					<article
						v-for="faq in serviceFaqs"
						:key="faq.title"
						class="rounded-[22px] border border-[#EDF2F5] bg-[#F8FBFC] px-[16px] py-[16px]">
						<h3 class="text-[1rem] font-semibold text-[#1F2937]">{{ faq.title }}</h3>
						<p class="mt-[10px] text-[0.875rem] leading-[1.65] text-[#5B6670]">
							{{ faq.text }}
						</p>
					</article>
				</div>
			</section>

			<section
				class="rounded-[26px] border border-[#DCE8EC] bg-[linear-gradient(135deg,#0f5f6d_0%,#0c4853_100%)] px-[20px] py-[20px] text-white shadow-[0_18px_40px_rgba(9,88,102,0.18)] desktop:px-[28px] desktop:py-[28px]">
				<div class="flex flex-col gap-[16px] desktop:flex-row desktop:items-center desktop:justify-between">
					<div class="max-w-[60ch]">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-white/70">Prossimo passo</p>
						<h2 class="mt-[8px] text-[1.35rem] font-semibold tracking-[-0.03em] desktop:text-[1.8rem]">
							Vuoi attivare {{ service.title.toLowerCase() }}?
						</h2>
						<p class="mt-[10px] text-[0.9rem] leading-[1.65] text-white/80">
							Parti dal preventivo per vedere subito costi, combinazioni compatibili e impatto sul riepilogo finale.
						</p>
					</div>

					<div class="flex flex-wrap gap-[10px]">
						<NuxtLink
							to="/preventivo"
							class="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-[18px] text-[0.875rem] font-semibold text-[#0B5360] transition-transform duration-200 hover:-translate-y-[1px]">
							Calcola il preventivo
						</NuxtLink>
						<NuxtLink
							to="/servizi"
							class="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/30 px-[18px] text-[0.875rem] font-semibold text-white transition-colors duration-200 hover:bg-white/10">
							Esplora altri servizi
						</NuxtLink>
					</div>
				</div>
			</section>
		</div>
	</section>
</template>

<style scoped>
.service-hero-card {
	background:
		radial-gradient(circle at top right, rgba(228, 66, 3, 0.16), transparent 30%),
		linear-gradient(180deg, rgba(9, 88, 102, 0.07) 0%, rgba(9, 88, 102, 0.02) 100%);
}
</style>
