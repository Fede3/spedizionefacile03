<!--
	COMPONENTE: Breadcrumb (Breadcrumb.vue)
	SCOPO: Mostra il percorso di navigazione (es. Home > Servizi > Pagamento alla consegna).

	DOVE SI USA: pages/servizi/*.vue, pages/guide/*.vue, pages/chi-siamo.vue e altre pagine interne
	PROPS: items (Array) — lista di voci [{label, to}] da mostrare nel percorso
	EMITS: nessuno

	DATI IN INGRESSO: props.items (passato dal componente padre)
	DATI IN USCITA: nessuno (solo visualizzazione e navigazione)

	VINCOLI: usa UBreadcrumb di Nuxt UI — lo stile e' personalizzato in app.config.ts
	PUNTI DI MODIFICA SICURI: classi CSS wrapper
	COLLEGAMENTI: app.config.ts (personalizzazione stile breadcrumb)
-->
<script setup>
const props = defineProps({
	items: Array,
});
</script>

<template>
	<div class="overflow-x-auto whitespace-nowrap scrollbar-hide scroll-smooth text-[0.75rem] tablet:text-[0.875rem]">
		<UBreadcrumb :items="items" />
	</div>
</template>
