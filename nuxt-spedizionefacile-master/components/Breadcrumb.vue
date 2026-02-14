<!--
	COMPONENTE BREADCRUMB (Breadcrumb.vue)

	Questo componente mostra il "percorso di navigazione" (breadcrumb),
	cioe' quella riga di link tipo: Home > Servizi > Pagamento alla consegna
	che aiuta l'utente a capire dove si trova nel sito e a tornare indietro facilmente.

	Riceve come parametro la lista di voci da mostrare (items) e usa il componente
	UBreadcrumb della libreria Nuxt UI per visualizzarle.
-->
<script setup>
const props = defineProps({
	items: Array,
});
</script>

<template>
	<UBreadcrumb :items="items" />
</template>
