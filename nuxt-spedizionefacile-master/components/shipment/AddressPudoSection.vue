<!--
  ShipmentAddressPudoSection.vue
  Sezione PUDO: toggle modalita consegna + ricerca Punto BRT + dettagli punto selezionato.
  Estratto da StepAddressSection.vue per ridurre la dimensione.
-->
<script setup>
defineProps({
	deliveryMode: { type: String, required: true },
	destinationAddress: { type: Object, required: true },
	selectedPudo: { type: Object, default: null },
});

defineEmits(['update:delivery-mode', 'pudo-selected', 'pudo-deselected']);
</script>

<template>
	<!-- TOGGLE MODALITA' CONSEGNA -->
	<div class="mt-[20px] mb-[4px]">
		<p class="text-[0.875rem] font-bold text-[#252B42] mb-[10px]">Modalita di consegna</p>
		<div class="flex flex-col tablet:flex-row gap-[10px]">
			<button type="button" @click="$emit('update:delivery-mode', 'home')" class="inline-flex items-center gap-[8px] px-[18px] py-[12px] rounded-[50px] text-[0.875rem] font-semibold border-2 transition-[background-color,color,border-color] duration-200 cursor-pointer" :class="deliveryMode === 'home' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#252B42] border-[#D0D0D0] hover:border-[#095866]'">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
				Consegna a domicilio
			</button>
			<button type="button" @click="$emit('update:delivery-mode', 'pudo')" class="inline-flex items-center gap-[8px] px-[18px] py-[12px] rounded-[50px] text-[0.875rem] font-semibold border-2 transition-[background-color,color,border-color] duration-200 cursor-pointer" :class="deliveryMode === 'pudo' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#252B42] border-[#D0D0D0] hover:border-[#095866]'">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
				Ritira in un Punto BRT
			</button>
		</div>
	</div>

	<!-- SELETTORE PUDO -->
	<div v-if="deliveryMode === 'pudo'" class="bg-[#E4E4E4] rounded-[16px] text-[#252B42] mt-[16px] px-[16px] tablet:px-[40px] pt-[24px] tablet:pt-[35px] pb-[24px] tablet:pb-[43px]">
		<h2 class="font-bold text-[1.125rem] tracking-[0.1px] flex items-center gap-[8px] mb-[4px]">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
			Cerca un Punto BRT
		</h2>
		<p class="text-[0.8125rem] text-[#737373] mb-[8px]">Cerca un tabaccaio, edicola o negozio convenzionato BRT vicino alla destinazione.</p>
		<PudoSelector :initial-city="destinationAddress.city" :initial-zip="destinationAddress.postal_code" @select="$emit('pudo-selected', $event)" @deselect="$emit('pudo-deselected')" />
		<div v-if="selectedPudo" class="mt-[16px] p-[12px] bg-white rounded-[10px] border-2 border-[#095866] text-[0.875rem]">
			<div class="flex items-center gap-[6px] text-[#095866] font-bold mb-[4px]">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
				Punto selezionato
			</div>
			<p class="font-semibold text-[#252B42]">{{ selectedPudo.name }}</p>
			<p class="text-[#737373]">{{ selectedPudo.address }}, {{ selectedPudo.zip_code }} {{ selectedPudo.city }}</p>
		</div>
	</div>
</template>
