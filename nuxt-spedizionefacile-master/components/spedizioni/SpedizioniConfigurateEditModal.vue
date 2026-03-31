<!--
  Componente: SpedizioniConfigurateEditModal
  Modale di modifica spedizione configurata (indirizzi + collo).
-->
<script setup>
const props = defineProps({
	open: { type: Boolean, required: true },
	editItem: { type: Object, default: null },
	editForm: { type: Object, required: true },
	editSaving: { type: Boolean, default: false },
});

const emit = defineEmits(['update:open', 'save']);
</script>

<template>
	<UModal
		:open="open"
		@update:open="emit('update:open', $event)"
		:dismissible="true"
		:close="false"
		:ui="{ overlay: 'bg-[#09131c]/36 backdrop-blur-[6px]', content: '!divide-y-0 !ring-0 !p-0 sf-modal-surface w-[min(calc(100vw-1rem),56rem)]', body: '!p-0' }">
		<template #body>
			<div v-if="editItem" class="sf-modal-content">
				<div class="sf-modal-header">
					<div class="sf-modal-header__main">
						<div class="sf-modal-icon" aria-hidden="true">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
						</div>
						<div>
							<h3 class="sf-modal-title">Modifica spedizione</h3>
							<p class="sf-modal-description">Aggiorna i dati essenziali mantenendo lo stesso formato del resto dell'account.</p>
						</div>
					</div>
					<button type="button" @click="emit('update:open', false)" class="sf-modal-close">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
				</div>
				<div class="sf-modal-divider" />
				<div class="space-y-[16px] px-[24px] pt-[20px]">
					<!-- Partenza -->
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<h4 class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[10px]">Partenza</h4>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-[8px]">
							<input v-model="editForm.origin_name" placeholder="Nome e Cognome" class="sm:col-span-2 bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.origin_address" placeholder="Indirizzo" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.origin_address_number" placeholder="N. civico" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.origin_city" placeholder="Citta" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.origin_postal_code" placeholder="CAP" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.origin_province" placeholder="Provincia" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.origin_telephone" placeholder="Telefono" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
						</div>
					</div>
					<!-- Destinazione -->
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<h4 class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[10px]">Destinazione</h4>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-[8px]">
							<input v-model="editForm.dest_name" placeholder="Nome e Cognome" class="sm:col-span-2 bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.dest_address" placeholder="Indirizzo" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.dest_address_number" placeholder="N. civico" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.dest_city" placeholder="Citta" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.dest_postal_code" placeholder="CAP" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.dest_province" placeholder="Provincia" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.dest_telephone" placeholder="Telefono" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
						</div>
					</div>
					<!-- Collo -->
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<h4 class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[10px]">Collo</h4>
						<div class="grid grid-cols-1 sm:grid-cols-2 desktop:grid-cols-3 gap-[8px]">
							<div><label class="text-[0.6875rem] text-[#737373]">Tipo</label><input v-model="editForm.package_type" class="w-full bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" /></div>
							<div><label class="text-[0.6875rem] text-[#737373]">Quantita</label><input type="number" v-model="editForm.quantity" min="1" class="w-full bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" /></div>
							<div><label class="text-[0.6875rem] text-[#737373]">Peso (kg)</label><input v-model="editForm.weight" class="w-full bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" /></div>
							<div><label class="text-[0.6875rem] text-[#737373]">Lato 1 (cm)</label><input v-model="editForm.first_size" class="w-full bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" /></div>
							<div><label class="text-[0.6875rem] text-[#737373]">Lato 2 (cm)</label><input v-model="editForm.second_size" class="w-full bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" /></div>
							<div><label class="text-[0.6875rem] text-[#737373]">Lato 3 (cm)</label><input v-model="editForm.third_size" class="w-full bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" /></div>
						</div>
					</div>
				</div>
				<div class="sf-modal-actions">
					<button type="button" @click="emit('update:open', false)" class="btn-secondary inline-flex items-center justify-center gap-[6px]">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
						Annulla
					</button>
					<button type="button" @click="emit('save')" :disabled="editSaving" class="btn-primary inline-flex items-center justify-center gap-[6px] disabled:opacity-60">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
						{{ editSaving ? 'Salvataggio...' : 'Salva modifiche' }}
					</button>
				</div>
			</div>
		</template>
	</UModal>
</template>
