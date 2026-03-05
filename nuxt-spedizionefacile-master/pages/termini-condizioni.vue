<!--
  PAGINA: Termini e Condizioni (termini-condizioni.vue)

  Pagina statica che mostra i termini e le condizioni di utilizzo del servizio.
  Descrive le regole che l'utente accetta quando usa SpediamoFacile:
  responsabilita', limiti del servizio, politiche di rimborso, ecc.

  Al momento il contenuto e' in fase di redazione (placeholder).
-->
<script setup>
// Meta tag SEO per la pagina termini e condizioni
useSeoMeta({
	title: 'Termini e Condizioni | SpediamoFacile',
	ogTitle: 'Termini e Condizioni | SpediamoFacile',
	description: 'Termini e condizioni di utilizzo del servizio SpediamoFacile.',
});
</script>

<template>
	<section class="min-h-[500px] py-[40px] desktop:py-[60px]">
		<div class="my-container">
			<h1 class="text-[2rem] font-bold text-[#252B42] mb-[24px]">Termini e Condizioni</h1>
			<div class="prose text-[#737373] text-[0.9375rem] leading-[1.8] space-y-[16px]">
				<p>Condizioni generali di servizio per l'utilizzo della piattaforma SpediamoFacile.</p>
				<p class="text-[#A0A5AB] italic">Contenuto in fase di redazione. Per informazioni, contattaci tramite la pagina <NuxtLink to="/contatti" class="text-[#095866] hover:underline">Contatti</NuxtLink>.</p>
			</div>
		</div>
	</section>
</template>
