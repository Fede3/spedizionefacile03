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
	<div class="rounded-[14px] ring-[1px] ring-[#DFE2E7] bg-white p-[16px] tablet:p-[24px_32px] mb-[16px]" style="box-shadow: 0 1px 4px rgba(0,0,0,0.03)">
		<div class="flex items-center justify-between mb-[14px] tablet:mb-[16px]">
			<div class="flex items-center gap-[10px]">
				<span class="inline-flex items-center justify-center w-[32px] h-[32px] rounded-full shrink-0" style="background: rgba(9,88,102,0.08)">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
				</span>
				<div>
					<p class="text-[0.75rem] font-[700] uppercase tracking-wide text-[var(--color-brand-primary)] mb-[2px]">Opzioni</p>
					<h2 class="font-montserrat text-[1rem] tablet:text-[1.125rem] font-[800] tracking-[-0.02em] text-[var(--color-brand-text)]">Servizi e data ritiro</h2>
				</div>
			</div>
			<button type="button" @click="emit('edit-services')" class="inline-flex items-center gap-[6px] rounded-full ring-[1.5px] ring-[#DFE2E7] bg-white px-[16px] py-[8px] text-[0.875rem] font-bold text-[var(--color-brand-text-secondary)] hover:bg-[#F8F9FB] transition-colors" title="Modifica servizi">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
				<span>Modifica</span>
			</button>
		</div>
		<div class="space-y-[12px]">
			<div>
				<p class="text-[0.75rem] font-[700] uppercase tracking-wide text-[var(--color-brand-primary)] mb-[6px] tablet:mb-[8px]">Servizi</p>
				<div v-if="services?.service_type && services.service_type !== 'Nessuno'" class="flex flex-wrap gap-[6px]">
					<span
						v-for="svc in services.service_type.split(', ').filter(Boolean)"
						:key="svc"
						class="inline-flex items-center gap-[5px] px-[12px] py-[5px] rounded-full text-[0.75rem] tablet:text-[0.8125rem] font-semibold text-[var(--color-brand-primary)]" style="background: rgba(9,88,102,0.08)">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
						{{ formatServiceDisplayName(svc) }}
					</span>
				</div>
				<p v-else class="text-[0.875rem] tablet:text-[0.9375rem] text-[var(--color-brand-text-secondary)]">Nessun servizio attivo</p>
			</div>
			<div v-if="services?.date">
				<p class="text-[0.75rem] font-[700] uppercase tracking-wide text-[var(--color-brand-primary)] mb-[4px] tablet:mb-[6px]">Data ritiro</p>
				<p class="text-[0.875rem] tablet:text-[0.9375rem] text-[var(--color-brand-text)] font-semibold flex items-center gap-[6px]">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
					{{ services.date }}
				</p>
			</div>
		</div>
	</div>
</template>
