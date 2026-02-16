<!--
  FILE: pages/preventivo.vue
  SCOPO: Pagina calcolo preventivo — inserimento dati pacco e stima prezzo.

  API: nessuna chiamata diretta (il componente Preventivo gestisce POST /api/session/first-step).
  COMPONENTI: Preventivo.
  ROUTE: /preventivo (pubblica).

  DATI IN INGRESSO: nessuno (la logica del calcolo e' nel componente Preventivo).
  DATI IN USCITA: nessuno (il componente Preventivo salva nella sessione e nello store).

  VINCOLI: non rimuovere il componente Preventivo — e' il cuore del flusso di acquisto.
  ERRORI TIPICI: aggiungere logica qui invece che nel componente Preventivo.vue.
  PUNTI DI MODIFICA SICURI: meta tag SEO, JSON-LD, padding/spaziatura.
  COLLEGAMENTI: components/Preventivo.vue, composables/usePriceBands.js.
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
	<!-- pb: spazio generoso sotto il box preventivo per staccarlo dal footer -->
	<div class="pb-[48px] tablet:pb-[64px] desktop:pb-[80px]">
		<Preventivo />
	</div>
</template>
