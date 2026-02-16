<!--
  PAGINA: Reclami (reclami.vue)

  Pagina che spiega all'utente come presentare un reclamo per una spedizione.
  Mostra due opzioni per contattare l'assistenza:
  1. Via email: scrivendo a assistenza@spedizionefacile.it
  2. Dall'area personale: aprendo un ticket dalla sezione Assistenza

  E' una pagina informativa senza form interattivi.
-->
<script setup>
// Meta tag SEO per la pagina reclami
useSeoMeta({
	title: 'Reclami | SpedizioneFacile',
	ogTitle: 'Reclami | SpedizioneFacile',
	description: 'Presenta un reclamo per la tua spedizione con SpedizioneFacile.',
});
</script>

<template>
	<section class="min-h-[500px] py-[40px] desktop:py-[60px]">
		<div class="my-container max-w-[800px]">
			<h1 class="text-[2rem] font-bold text-[#252B42] mb-[8px]">Reclami</h1>
			<p class="text-[#737373] text-[0.9375rem] leading-[1.8] mb-[24px]">Se hai riscontrato un problema con la tua spedizione, puoi presentare un reclamo.</p>

			<div class="bg-white rounded-[16px] p-[24px_20px] desktop:p-[32px] shadow-[0_4px_20px_rgba(0,0,0,0.08)] space-y-[16px]">
				<div class="flex items-start gap-[12px] p-[16px] bg-[#F8F9FB] rounded-[10px]">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-[2px]"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
					<div>
						<p class="text-[0.9375rem] font-semibold text-[#252B42]">Via email</p>
						<p class="text-[0.875rem] text-[#737373]">Scrivi a <strong>assistenza@spedizionefacile.it</strong> indicando il numero d'ordine e una descrizione del problema.</p>
					</div>
				</div>
				<div class="flex items-start gap-[12px] p-[16px] bg-[#F8F9FB] rounded-[10px]">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-[2px]"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
					<div>
						<p class="text-[0.9375rem] font-semibold text-[#252B42]">Dall'area personale</p>
						<p class="text-[0.875rem] text-[#737373]">Accedi alla sezione <NuxtLink to="/account/assistenza" class="text-[#095866] hover:underline font-medium">Assistenza</NuxtLink> per aprire un ticket di supporto.</p>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
