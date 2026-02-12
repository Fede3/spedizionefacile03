<script setup>
useSeoMeta({
	title: 'SpedizioneFacile - Spedizioni Economiche e Veloci | Confronta Prezzi',
	ogTitle: 'SpedizioneFacile - Spedizioni Economiche e Veloci',
	description: 'Confronta i migliori corrieri e risparmia sulle tue spedizioni. Preventivo gratuito in pochi click, ritiro a domicilio e tracking in tempo reale.',
	ogDescription: 'Confronta i migliori corrieri e risparmia sulle tue spedizioni. Preventivo gratuito in pochi click.',
});

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
	<Preventivo />

	<!-- <HomepagePreventivoRapido /> -->

	<!-- <HomepageLoghiPartner /> -->

	<HomepageStep />

	<HomepageRecensioni />

	<HomepageServizi />
</template>
