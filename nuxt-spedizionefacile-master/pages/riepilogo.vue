<script setup>
/*
 * trampolino legacy.
 * Il vecchio step "Conferma" e' stato unificato nel Pagamento: qualsiasi deep-link
 * a /riepilogo o a /la-tua-spedizione/2?step=conferma atterra direttamente sul
 * payment accordion del funnel a 4 step (Colli, Servizi, Indirizzi, Pagamento).
 * Il riepilogo vive come sezione espandibile/modificabile dentro il pagamento.
 */
import { buildShipmentFlowLocation } from '~/utils/shipment';

const route = useRoute();

useSeoMeta({
	title: 'Riepilogo Spedizione | SpediamoFacile',
	description: 'Rivedi i dettagli della tua spedizione BRT prima del pagamento.',
	robots: 'noindex, nofollow',
});

await navigateTo(
	buildShipmentFlowLocation(route, 'pagamento'),
	{ replace: true, redirectCode: 302 },
);
</script>

<template>
	<section class="min-h-[40vh]"></section>
</template>
