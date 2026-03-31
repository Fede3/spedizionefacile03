<!--
  COMPONENTE: AdminSupplementRow.vue
  SCOPO: Singola riga supplemento CAP nel pannello admin prezzi.
         Mostra prefisso, importo, applicazione, toggle e pulsante elimina.
-->
<script setup>
defineProps({
	rule: { type: Object, required: true },
	supplementAmountToEuro: { type: Function, required: true },
	updateSupplementAmountFromEuro: { type: Function, required: true },
});

defineEmits(['remove']);
</script>

<template>
	<div class="grid grid-cols-1 tablet:grid-cols-[120px_160px_1fr_auto_auto] gap-[8px] items-center p-[12px] rounded-[12px] border border-[#E9EBEC] bg-[#FAFBFC]">
		<label class="text-[0.75rem] text-[#6A7486]">Prefisso CAP
			<input v-model="rule.prefix" type="text" inputmode="numeric" maxlength="5" class="mt-[4px] w-full h-[36px] px-[10px] rounded-[10px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
		</label>
		<label class="text-[0.75rem] text-[#6A7486]">Importo (&euro;)
			<input :value="supplementAmountToEuro(rule)" @input="updateSupplementAmountFromEuro(rule, $event.target.value)" type="text" class="mt-[4px] w-full h-[36px] px-[10px] rounded-[10px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
		</label>
		<label class="text-[0.75rem] text-[#6A7486]">Applica a
			<select v-model="rule.apply_to" class="mt-[4px] w-full h-[36px] px-[10px] rounded-[10px] border border-[#C8CCD0] bg-white text-[0.8125rem]">
				<option value="both">Origine + Destinazione</option>
				<option value="origin">Solo origine</option>
				<option value="destination">Solo destinazione</option>
			</select>
		</label>
		<button type="button" @click="rule.enabled = !rule.enabled" :class="rule.enabled ? 'bg-[#095866]' : 'bg-[#C8CCD0]'" class="relative inline-flex h-[28px] w-[48px] items-center rounded-full transition-colors cursor-pointer mt-[16px]">
			<span :class="rule.enabled ? 'translate-x-[24px]' : 'translate-x-[2px]'" class="inline-block h-[22px] w-[22px] transform rounded-full bg-white transition-transform shadow-sm" />
		</button>
		<button type="button" class="px-[10px] py-[7px] rounded-[12px] border border-red-200 text-red-600 text-[0.75rem] hover:bg-red-50 cursor-pointer mt-[16px]" @click="$emit('remove')">
			Elimina
		</button>
	</div>
</template>
