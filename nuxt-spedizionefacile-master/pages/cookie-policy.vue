<!--
  PAGINA: Cookie Policy (cookie-policy.vue)

  Pagina statica che mostra l'informativa sui cookie utilizzati dal sito.
  I cookie sono piccoli file di testo che il sito salva nel browser dell'utente
  per ricordare le preferenze e migliorare l'esperienza di navigazione.

  Al momento il contenuto e' in fase di redazione (placeholder).
-->
<script setup>
// Meta tag SEO per la pagina cookie policy
useSeoMeta({
	title: 'Cookie Policy | SpedizioneFacile',
	ogTitle: 'Cookie Policy | SpedizioneFacile',
	description: 'Informativa sui cookie utilizzati da SpedizioneFacile.',
});
</script>

<template>
	<section class="min-h-[500px] py-[40px] desktop:py-[60px]">
		<div class="my-container">
			<h1 class="text-[2rem] font-bold text-[#252B42] mb-[24px]">Cookie Policy</h1>
			<div class="prose text-[#737373] text-[0.9375rem] leading-[1.8] space-y-[16px]">
				<p>Questo sito utilizza cookie tecnici necessari al funzionamento e cookie analitici per migliorare l'esperienza di navigazione.</p>
				<p class="text-[#A0A5AB] italic">Contenuto in fase di redazione. Per informazioni, contattaci tramite la pagina <NuxtLink to="/contatti" class="text-[#095866] hover:underline">Contatti</NuxtLink>.</p>
			</div>
		</div>
	</section>
</template>
