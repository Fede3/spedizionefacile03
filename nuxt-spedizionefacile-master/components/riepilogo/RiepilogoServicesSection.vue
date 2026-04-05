<!--
  Sezione "Servizi e data ritiro" del riepilogo.
-->
<script setup>
defineProps({
	services: { type: Object, default: () => ({}) },
	formatServiceDisplayName: { type: Function, required: true },
});
const emit = defineEmits(['edit-services']);
</script>

<template>
	<div class="bg-[#E4E4E4] rounded-[12px] p-[12px] tablet:p-[24px_28px] mb-[12px] tablet:mb-[16px]">
		<div class="flex items-center justify-between mb-[10px] tablet:mb-[12px]">
			<h2 class="text-[1rem] tablet:text-[1.125rem] font-bold text-[#252B42]">Servizi e data ritiro</h2>
			<button type="button" @click="emit('edit-services')" class="btn-secondary btn-compact inline-flex items-center gap-[6px]" title="Modifica servizi">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
				<span>Modifica</span>
			</button>
		</div>
		<div class="space-y-[8px]">
			<div class="mb-[6px] tablet:mb-[8px]">
				<p class="text-[0.6875rem] tablet:text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[4px] tablet:mb-[6px]">Servizi</p>
				<div v-if="services?.service_type && services.service_type !== 'Nessuno'" class="flex flex-wrap gap-[5px]">
					<span
						v-for="svc in services.service_type.split(', ').filter(Boolean)"
						:key="svc"
						class="inline-block px-[10px] py-[3px] bg-[#095866]/10 text-[#095866] rounded-[12px] text-[0.75rem] tablet:text-[0.8125rem] font-semibold">
						{{ formatServiceDisplayName(svc) }}
					</span>
				</div>
				<p v-else class="text-[0.875rem] tablet:text-[0.9375rem] text-[#737373]">Nessun servizio attivo</p>
			</div>
			<div v-if="services?.date" class="mt-[8px] tablet:mt-[10px]">
				<p class="text-[0.6875rem] tablet:text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[3px] tablet:mb-[4px]">Data ritiro</p>
				<p class="text-[0.875rem] tablet:text-[0.9375rem] text-[#252B42] font-semibold">{{ services.date }}</p>
			</div>
		</div>
	</div>
</template>
