<script setup>

// (definePageMeta + useSeoMeta) + render <ShipmentFlowPage />.
// L'orchestratore (14 composable, 65 computed, 22 handler, template 4 step)
// vive in components/shipment/ShipmentFlowPage.vue.
import ShipmentFlowPage from '~/components/shipment/ShipmentFlowPage.vue';

definePageMeta({ middleware: ['shipment-validation'] });

useSeoMeta({
	title: 'Preventivo',
	description: 'Configura colli, servizi, indirizzi e pagamento in un flusso unico, chiaro e modificabile.',
	ogTitle: 'Preventivo - SpediamoFacile',
	ogDescription: 'Configura colli, servizi, indirizzi e pagamento in un flusso unico, chiaro e modificabile.',
});
</script>

<template>
	<ShipmentFlowPage />
</template>
