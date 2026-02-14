<!--
  FILE: pages/preventivo.vue
  SCOPO: Pagina calcolo preventivo — inserimento dati pacco e stima prezzo.
  API: nessuna chiamata diretta (il componente Preventivo gestisce POST /api/session/first-step).
  COMPONENTI: Preventivo.
  ROUTE: /preventivo (pubblica).
-->
<script setup>
// Meta tag SEO per la pagina preventivo
useSeoMeta({
	title: 'Preventivo Spedizione Gratuito | SpedizioneFacile',
	ogTitle: 'Preventivo Spedizione Gratuito | SpedizioneFacile',
	description: 'Calcola il preventivo per la tua spedizione in pochi secondi. Confronta tariffe di corrieri nazionali e internazionali e scegli la soluzione migliore.',
	ogDescription: 'Calcola il preventivo per la tua spedizione in pochi secondi. Confronta tariffe e risparmia.',
});

useHead({
	script: [
		{
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'Service',
				name: 'Preventivo Spedizione',
				provider: {
					'@type': 'Organization',
					name: 'SpedizioneFacile',
					url: 'https://spedizionefacile.it',
				},
				description: 'Calcola il preventivo per la tua spedizione in pochi secondi. Confronta tariffe di corrieri nazionali e internazionali.',
				serviceType: 'Confronto tariffe spedizioni',
				areaServed: {
					'@type': 'Country',
					name: 'IT',
				},
			}),
		},
	],
});
</script>

<template>
	<Preventivo />
</template>
