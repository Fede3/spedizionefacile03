<!--
  Componente: SpedizioniOrderPackageCard
  Mostra i dettagli di un singolo collo nell'ordine: tipo, peso, dimensioni, prezzo,
  indirizzi mittente/destinatario, eventuale punto BRT, e servizio.
-->
<script setup>
const props = defineProps({
	pkg: { type: Object, required: true },
	index: { type: Number, required: true },
	hasPudo: { type: Boolean, default: false },
	formatPrice: { type: Function, required: true },
});
</script>

<template>
	<div class="bg-white rounded-[12px] p-[24px] border border-[#E9EBEC]">
		<h3 class="text-[1rem] font-bold text-[#252B42] mb-[16px]">Collo #{{ index + 1 }}</h3>

		<div class="grid grid-cols-2 desktop:grid-cols-4 gap-[14px] mb-[16px]">
			<div>
				<p class="text-[0.6875rem] text-[#737373] uppercase font-medium mb-[2px]">Tipo</p>
				<p class="text-[0.875rem] text-[#252B42]">{{ pkg.package_type || 'Pacco' }}</p>
			</div>
			<div>
				<p class="text-[0.6875rem] text-[#737373] uppercase font-medium mb-[2px]">Peso</p>
				<p class="text-[0.875rem] text-[#252B42]">{{ pkg.weight }} kg</p>
			</div>
			<div>
				<p class="text-[0.6875rem] text-[#737373] uppercase font-medium mb-[2px]">Dimensioni</p>
				<p class="text-[0.875rem] text-[#252B42]">{{ pkg.first_size }} x {{ pkg.second_size }} x {{ pkg.third_size }} cm</p>
			</div>
			<div>
				<p class="text-[0.6875rem] text-[#737373] uppercase font-medium mb-[2px]">Prezzo</p>
				<p class="text-[0.875rem] text-[#252B42]">{{ formatPrice(pkg.single_price) }}</p>
			</div>
		</div>

		<!-- Mittente -->
		<div v-if="pkg.origin_address" class="bg-[#F8F9FB] rounded-[50px] p-[16px] mb-[10px]">
			<p class="text-[0.75rem] text-[#737373] uppercase font-medium mb-[6px]">Mittente</p>
			<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ pkg.origin_address.name }}</p>
			<p class="text-[0.8125rem] text-[#737373]">{{ pkg.origin_address.address }} {{ pkg.origin_address.address_number }}</p>
			<p class="text-[0.8125rem] text-[#737373]">{{ pkg.origin_address.postal_code }} {{ pkg.origin_address.city }} ({{ pkg.origin_address.province }})</p>
			<p v-if="pkg.origin_address.telephone_number" class="text-[0.8125rem] text-[#737373]">Tel: {{ pkg.origin_address.telephone_number }}</p>
		</div>

		<!-- Badge PUDO -->
		<div v-if="hasPudo" class="bg-[#095866]/10 rounded-[50px] p-[12px] flex items-center gap-[8px]">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
			<span class="text-[0.8125rem] font-bold text-[#095866]">Consegna presso Punto BRT</span>
		</div>

		<!-- Destinatario -->
		<div v-if="pkg.destination_address" class="bg-[#F8F9FB] rounded-[50px] p-[16px]">
			<p class="text-[0.75rem] text-[#737373] uppercase font-medium mb-[6px]">Destinatario</p>
			<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ pkg.destination_address.name }}</p>
			<p class="text-[0.8125rem] text-[#737373]">{{ pkg.destination_address.address }} {{ pkg.destination_address.address_number }}</p>
			<p class="text-[0.8125rem] text-[#737373]">{{ pkg.destination_address.postal_code }} {{ pkg.destination_address.city }} ({{ pkg.destination_address.province }})</p>
			<p v-if="pkg.destination_address.telephone_number" class="text-[0.8125rem] text-[#737373]">Tel: {{ pkg.destination_address.telephone_number }}</p>
		</div>

		<!-- Servizio -->
		<div v-if="pkg.services" class="mt-[10px] bg-[#F8F9FB] rounded-[50px] p-[16px]">
			<p class="text-[0.75rem] text-[#737373] uppercase font-medium mb-[6px]">Servizio</p>
			<p class="text-[0.875rem] text-[#252B42]">{{ pkg.services.service_type || 'Standard' }}</p>
			<p v-if="pkg.services.date" class="text-[0.8125rem] text-[#737373]">Data: {{ pkg.services.date }}</p>
		</div>
	</div>
</template>
