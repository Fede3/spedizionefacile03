<!--
  Componente: SpedizioniDetailModal
  Modale dettaglio spedizione con indirizzi, collo, servizi e importo.
-->
<script setup>
const props = defineProps({
	open: { type: Boolean, required: true },
	detailItem: { type: Object, default: null },
	formatPrice: { type: Function, required: true },
});

const emit = defineEmits(['update:open']);
</script>

<template>
	<UModal :open="open" @update:open="emit('update:open', $event)" :dismissible="true" :close="false"
		:ui="{ overlay: 'bg-[#09131c]/36 backdrop-blur-[6px]', content: '!divide-y-0 !ring-0 !p-0 sf-modal-surface w-[min(calc(100vw-1rem),44rem)]', body: '!p-0' }">
		<template #body>
			<section class="sf-modal-content">
				<div class="sf-modal-header">
					<div class="sf-modal-header__main">
						<div class="sf-modal-icon" aria-hidden="true">
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3,4A2,2 0 0,0 1,6V17H3A3,3 0 0,0 6,20A3,3 0 0,0 9,17H15A3,3 0 0,0 18,20A3,3 0 0,0 21,17H23V12L20,8H17V4M10,6L14,10L10,14V11H4V9H10M17,9.5H19.5L21.47,12H17M6,15.5A1.5,1.5 0 0,1 7.5,17A1.5,1.5 0 0,1 6,18.5A1.5,1.5 0 0,1 4.5,17A1.5,1.5 0 0,1 6,15.5M18,15.5A1.5,1.5 0 0,1 19.5,17A1.5,1.5 0 0,1 18,18.5A1.5,1.5 0 0,1 16.5,17A1.5,1.5 0 0,1 18,15.5Z"/></svg>
						</div>
						<div>
							<h3 class="sf-modal-title">Dettagli spedizione</h3>
							<p class="sf-modal-description">Riepilogo completo di tratta, indirizzi, collo e servizi della spedizione selezionata.</p>
						</div>
					</div>
					<button type="button" @click="emit('update:open', false)" class="sf-modal-close" aria-label="Chiudi dettagli spedizione">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
				</div>
				<div class="sf-modal-divider" />
				<div v-if="detailItem" class="sf-modal-body space-y-[16px] pb-[24px]">
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<h4 class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[8px]">Partenza</h4>
						<p class="text-[0.9375rem] font-semibold text-[#252B42]">{{ detailItem.origin_address?.name }}</p>
						<p class="text-[0.8125rem] text-[#404040]">{{ detailItem.origin_address?.address }} {{ detailItem.origin_address?.address_number }}</p>
						<p class="text-[0.8125rem] text-[#404040]">{{ detailItem.origin_address?.postal_code }} {{ detailItem.origin_address?.city }} <span v-if="detailItem.origin_address?.province">({{ detailItem.origin_address?.province }})</span></p>
						<p v-if="detailItem.origin_address?.telephone_number" class="text-[0.75rem] text-[#737373] mt-[4px]">Tel: {{ detailItem.origin_address?.telephone_number }}</p>
					</div>
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<h4 class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[8px]">Destinazione</h4>
						<p class="text-[0.9375rem] font-semibold text-[#252B42]">{{ detailItem.destination_address?.name }}</p>
						<p class="text-[0.8125rem] text-[#404040]">{{ detailItem.destination_address?.address }} {{ detailItem.destination_address?.address_number }}</p>
						<p class="text-[0.8125rem] text-[#404040]">{{ detailItem.destination_address?.postal_code }} {{ detailItem.destination_address?.city }} <span v-if="detailItem.destination_address?.province">({{ detailItem.destination_address?.province }})</span></p>
						<p v-if="detailItem.destination_address?.telephone_number" class="text-[0.75rem] text-[#737373] mt-[4px]">Tel: {{ detailItem.destination_address?.telephone_number }}</p>
					</div>
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<h4 class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[8px]">Collo</h4>
						<div class="grid grid-cols-2 gap-[8px] text-[0.8125rem] text-[#252B42]">
							<p><span class="text-[#737373]">Tipo:</span> {{ detailItem.package_type }}</p>
							<p><span class="text-[#737373]">Quantita:</span> {{ detailItem.quantity }}</p>
							<p><span class="text-[#737373]">Peso:</span> {{ detailItem.weight }} kg</p>
							<p><span class="text-[#737373]">Dimensioni:</span> {{ detailItem.first_size }}&times;{{ detailItem.second_size }}&times;{{ detailItem.third_size }} cm</p>
						</div>
					</div>
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<h4 class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[8px]">Servizi</h4>
						<p class="text-[0.8125rem] text-[#252B42]">{{ detailItem.services?.service_type || 'Standard' }}</p>
						<p v-if="detailItem.services?.date" class="text-[0.75rem] text-[#737373] mt-[4px]">Ritiro: {{ detailItem.services.date }}</p>
					</div>
					<div class="bg-[#095866]/5 rounded-[12px] p-[16px] flex items-center justify-between">
						<span class="text-[0.875rem] font-bold text-[#252B42]">Importo</span>
						<span class="text-[1.25rem] font-bold text-[#095866]">{{ formatPrice(detailItem.single_price) }}</span>
					</div>
				</div>
			</section>
		</template>
	</UModal>
</template>
