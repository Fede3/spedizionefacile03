<!--
  PAGINA: Servizio Singolo (servizi/[slug].vue)
  Pagina dinamica che mostra il dettaglio di un singolo servizio.
  Carica il contenuto dall'API pubblica /api/public/services/{slug}.
  Include dati strutturati JSON-LD per il SEO (Service).
-->
<script setup>
const route = useRoute();
const slug = route.params.slug;
const sanctum = useSanctumClient();

const service = ref(null);
const loading = ref(true);

onMounted(async () => {
	try {
		const res = await sanctum(`/api/public/services/${slug}`);
		const data = res?.data || res;
		if (data?.id) {
			service.value = data;
		}
	} catch (e) {
		// Servizio non trovato
	}
	loading.value = false;

	if (!loading.value && !service.value) {
		navigateTo('/servizi');
	}
});

// SEO dinamico
watchEffect(() => {
	if (service.value) {
		useSeoMeta({
			title: `${service.value.title} | SpedizioneFacile`,
			ogTitle: `${service.value.title} | SpedizioneFacile`,
			description: service.value.meta_description,
			ogDescription: service.value.meta_description,
		});

		useHead({
			script: [
				{
					type: 'application/ld+json',
					innerHTML: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'Service',
						name: service.value.title,
						url: `https://spedizionefacile.it/servizi/${slug}`,
						provider: {
							'@type': 'Organization',
							name: 'SpedizioneFacile',
							url: 'https://spedizionefacile.it',
						},
						description: service.value.meta_description,
					}),
				},
			],
		});
	}
});

// Parse sections e faqs (possono arrivare come JSON string o array)
const parsedSections = computed(() => {
	if (!service.value?.sections) return [];
	if (typeof service.value.sections === 'string') {
		try { return JSON.parse(service.value.sections); } catch { return []; }
	}
	return service.value.sections;
});

const parsedFaqs = computed(() => {
	if (!service.value?.faqs) return [];
	if (typeof service.value.faqs === 'string') {
		try { return JSON.parse(service.value.faqs); } catch { return []; }
	}
	return service.value.faqs;
});
</script>

<template>
	<!-- Loading -->
	<section v-if="loading" class="min-h-[400px] flex items-center justify-center">
		<div class="w-[40px] h-[40px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
	</section>

	<section v-else-if="service">
		<div class="my-container">
			<div class="mt-[32px] mb-[16px]">
				<NuxtLink to="/servizi" class="text-[0.875rem] text-[#095866] font-medium hover:underline">
					&larr; Tutti i servizi
				</NuxtLink>
			</div>

			<h1 class="desktop-xl:text-[4rem] font-medium tracking-[-1.536px] text-[#222222] mt-[20px] mb-[24px] text-[2rem] desktop:text-[3rem] leading-[110%]">
				{{ service.title }}
			</h1>

			<p class="desktop:text-[1.25rem] leading-[160%] tracking-[-0.336px] font-medium text-[#404040] text-[1.125rem] mb-[40px] desktop:mb-[60px] desktop:max-w-[800px]">
				{{ service.intro }}
			</p>

			<div class="mb-[60px]">
				<div v-for="(section, index) in parsedSections" :key="index" class="mb-[40px] desktop:mb-[50px]">
					<h2 class="text-[1.5rem] desktop:text-[2rem] font-medium tracking-[-0.576px] text-[#222222] mb-[16px] leading-[120%]">
						{{ section.heading }}
					</h2>
					<p class="desktop:text-[1.125rem] leading-[160%] tracking-[-0.252px] text-[#737373] text-[0.875rem] desktop:text-[1rem]">
						{{ section.text }}
					</p>
				</div>
			</div>

			<div v-if="parsedFaqs.length" class="mb-[80px] desktop:mb-[120px]">
				<h2 class="desktop:text-[2.5rem] font-medium leading-[110%] tracking-[-0.96px] desktop:mb-[30px] text-[#222222] text-[1.875rem] mb-[20px]">
					Domande frequenti
				</h2>
				<div class="desktop:flex desktop:items-start desktop:justify-between desktop:flex-wrap desktop:gap-x-[24px] desktop:gap-y-[40px] gap-y-[20px]">
					<div v-for="(faq, faqIndex) in parsedFaqs" :key="faqIndex" class="desktop:w-[calc(50%-20px)]">
						<h3 class="desktop:text-[1.5rem] text-[1.25rem] font-medium tracking-[-0.576px] leading-[110%] text-[#222222] mb-[12px] mt-[20px] desktop:mt-0">
							{{ faq.title }}
						</h3>
						<p class="desktop:text-[1.125rem] tracking-[-0.252px] leading-[160%] text-[rgba(82,82,82,.6)]">
							{{ faq.text }}
						</p>
					</div>
				</div>
			</div>

			<div class="border-t border-[#E0E0E0] pt-[40px] mb-[80px] desktop:mb-[120px]">
				<p class="text-[1.25rem] font-medium text-[#222222] mb-[20px]">Vuoi provare questo servizio?</p>
				<NuxtLink to="/preventivo" class="inline-block h-[52px] px-[32px] rounded-[35px] bg-[#E44203] leading-[52px] text-center text-white font-semibold tracking-[-0.384px] text-[1rem] hover:opacity-90 transition-opacity">
					Calcola il preventivo
				</NuxtLink>
			</div>
		</div>
	</section>
</template>
