<!--
  PAGINA: Privacy Policy (privacy-policy.vue)

  Pagina statica che mostra l'informativa sulla privacy del sito.
  Descrive come SpedizioneFacile raccoglie, utilizza e protegge i dati personali
  degli utenti, in conformita' con il GDPR (Regolamento Europeo sulla Privacy).

  Al momento il contenuto e' in fase di redazione (placeholder).
-->
<script setup>
// Meta tag SEO per la pagina privacy policy
useSeoMeta({
	title: 'Privacy Policy | SpedizioneFacile',
	ogTitle: 'Privacy Policy | SpedizioneFacile',
	description: 'Informativa sulla privacy di SpedizioneFacile. Scopri come trattiamo i tuoi dati personali.',
});
</script>

<template>
	<section class="min-h-[500px] py-[40px] desktop:py-[60px]">
		<div class="my-container max-w-[800px]">
			<h1 class="text-[2rem] font-bold text-[#252B42] mb-[24px]">Privacy Policy</h1>
			<div class="prose text-[#737373] text-[0.9375rem] leading-[1.8] space-y-[16px]">
				<p>Informativa sulla privacy ai sensi del Regolamento UE 2016/679 (GDPR).</p>
				<p>Questa pagina descrive le modalità di gestione del sito in riferimento al trattamento dei dati personali degli utenti che lo consultano.</p>
				<p class="text-[#A0A5AB] italic">Contenuto in fase di redazione. Per informazioni, contattaci tramite la pagina <NuxtLink to="/contatti" class="text-[#095866] hover:underline">Contatti</NuxtLink>.</p>
			</div>
		</div>
	</section>
</template>
