<!--
  FILE: pages/index.vue
  SCOPO: Homepage — form preventivo rapido, sezioni informative, JSON-LD SEO.
  API: nessuna chiamata diretta (i componenti interni gestiscono le API).
  COMPONENTI: PreventivoRapido, Servizi, Step, LoghiPartner, Recensioni.
  ROUTE: / (pubblica, accessibile a tutti).
-->
<script setup>
// Promo settings per banner nella CTA
const { loadPriceBands, promoSettings } = usePriceBands();
onMounted(() => { loadPriceBands(); });

// Imposta i meta tag SEO per la homepage (titolo, descrizione, Open Graph)
useSeoMeta({
	title: 'SpedizioneFacile - Spedizioni Economiche e Veloci | Confronta Prezzi',
	ogTitle: 'SpedizioneFacile - Spedizioni Economiche e Veloci',
	description: 'Confronta i migliori corrieri e risparmia sulle tue spedizioni. Preventivo gratuito in pochi click, ritiro a domicilio e tracking in tempo reale.',
	ogDescription: 'Confronta i migliori corrieri e risparmia sulle tue spedizioni. Preventivo gratuito in pochi click.',
});

// Aggiunge dati strutturati JSON-LD per i motori di ricerca
// - Organization: identifica SpedizioneFacile come organizzazione
// - WebSite: abilita la ricerca diretta dal motore di ricerca (SearchAction)
useHead({
	script: [
		{
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'Organization',
				name: 'SpedizioneFacile',
				url: 'https://spedizionefacile.it',
				description: 'Piattaforma di confronto e prenotazione spedizioni nazionali e internazionali.',
				contactPoint: {
					'@type': 'ContactPoint',
					contactType: 'customer service',
					availableLanguage: 'Italian',
				},
			}),
		},
		{
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'WebSite',
				name: 'SpedizioneFacile',
				url: 'https://spedizionefacile.it',
				potentialAction: {
					'@type': 'SearchAction',
					target: 'https://spedizionefacile.it/preventivo?q={search_term_string}',
					'query-input': 'required name=search_term_string',
				},
			}),
		},
	],
});
</script>

<template>
	<!-- Form di preventivo rapido - componente principale della homepage -->
	<Preventivo />

	<!-- <HomepagePreventivoRapido /> -->

	<!-- <HomepageLoghiPartner /> -->

	<!-- Sezione "Come funziona" con i passaggi da seguire (caricata in modo lazy) -->
	<LazyHomepageStep />

	<!-- Sezione recensioni dei clienti (caricata in modo lazy) -->
	<LazyHomepageRecensioni />

	<!-- Sezione servizi offerti (caricata in modo lazy) -->
	<LazyHomepageServizi />

	<!-- Miglioramento UX: CTA finale prima del footer per convertire gli utenti indecisi -->
	<section class="bg-[#095866] py-[48px] tablet:py-[60px] desktop:py-[80px]">
		<div class="my-container text-center">
			<!-- Promo banner -->
			<div v-if="promoSettings?.active && promoSettings?.label_text" class="flex justify-center mb-[16px]">
				<span
					:style="{ backgroundColor: promoSettings.label_color || '#E44203' }"
					class="inline-flex items-center gap-[6px] px-[14px] tablet:px-[16px] py-[7px] tablet:py-[8px] rounded-[10px] text-white text-[0.875rem] tablet:text-[1rem] font-bold tracking-wide shadow-sm max-w-full">
					<img v-if="promoSettings.label_image" :src="promoSettings.label_image" alt="" class="h-[18px] tablet:h-[20px] w-auto shrink-0" />
					{{ promoSettings.label_text }}
				</span>
			</div>
			<h2 class="text-white text-[1.25rem] tablet:text-[1.5rem] desktop:text-[2.5rem] font-bold tracking-[-0.48px] mb-[12px]">Pronto a spedire?</h2>
			<p class="text-white/80 text-[0.875rem] tablet:text-[0.9375rem] desktop:text-[1.125rem] max-w-[500px] mx-auto mb-[24px] tablet:mb-[28px] leading-[1.6]">
				Calcola il preventivo in pochi secondi. Nessun costo nascosto, nessun vincolo.
			</p>
			<NuxtLink
				to="/preventivo"
				class="inline-block bg-[#E44203] text-white px-[28px] tablet:px-[32px] py-[14px] tablet:py-[16px] rounded-[35px] font-semibold text-[1rem] desktop:text-[1.125rem] btn-hover min-h-[48px]">
				Calcola il tuo preventivo
			</NuxtLink>
		</div>
	</section>
</template>
