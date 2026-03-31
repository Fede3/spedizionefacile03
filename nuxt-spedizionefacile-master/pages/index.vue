<!--
  FILE: pages/index.vue
  SCOPO: Homepage — form preventivo rapido, sezioni informative, JSON-LD SEO.

  API: nessuna chiamata diretta (i componenti interni gestiscono le API).
  COMPONENTI: Preventivo, LazyHomepageStep, LazyHomepageRecensioni, LazyHomepageServizi.
  ROUTE: / (pubblica, accessibile a tutti).

  DATI IN INGRESSO: nessuno (pagina pubblica senza parametri).
  DATI IN USCITA: nessuno (i componenti figli gestiscono i propri dati).

  VINCOLI: non rimuovere i dati strutturati JSON-LD (servono per la SEO).
  ERRORI TIPICI: modificare il testo "8,90" senza aggiornare anche ContenutoHeader.vue.
  PUNTI DI MODIFICA SICURI: testi CTA, ordine sezioni lazy, meta tag SEO.
  COLLEGAMENTI: components/Preventivo.vue, components/Homepage/*.vue, composables/usePriceBands.js.
-->
<script setup>
// Imposta i meta tag SEO per la homepage (titolo, descrizione, Open Graph)
useSeoMeta({
	title: 'SpediamoFacile - Spedizioni Economiche e Veloci | Confronta Prezzi',
	ogTitle: 'SpediamoFacile - Spedizioni Economiche e Veloci',
	description: 'Confronta i migliori corrieri e risparmia sulle tue spedizioni. Preventivo gratuito in pochi click, ritiro a domicilio e tracking in tempo reale.',
	ogDescription: 'Confronta i migliori corrieri e risparmia sulle tue spedizioni. Preventivo gratuito in pochi click.',
});

// Aggiunge dati strutturati JSON-LD per i motori di ricerca
// - Organization: identifica SpediamoFacile come organizzazione
// - WebSite: abilita la ricerca diretta dal motore di ricerca (SearchAction)
useHead({
	script: [
		{
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'Organization',
				name: 'SpediamoFacile',
				url: 'https://spediamofacile.it',
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
				name: 'SpediamoFacile',
				url: 'https://spediamofacile.it',
				potentialAction: {
					'@type': 'SearchAction',
					target: 'https://spediamofacile.it/preventivo?q={search_term_string}',
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


	<!-- Sezione "Come funziona" con i passaggi da seguire (caricata in modo lazy) -->
	<LazyHomepageStep />

	<!-- Sezione servizi offerti (caricata in modo lazy) -->
	<LazyHomepageServizi />

	<!-- Sezione recensioni dei clienti (caricata in modo lazy) -->
	<LazyHomepageRecensioni />
</template>
