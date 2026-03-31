<!--
  Lista indirizzi salvati con azioni (modifica, elimina, predefinito).
  Props: addresses, addressStats, defaultAddressName, deleteConfirmId, deleteLoading.
  Events: edit, set-default, delete, confirm-delete, cancel-delete, create.
-->
<script setup>
defineProps({
	addresses: { type: [Object, null], default: null },
	addressStats: { type: Object, required: true },
	defaultAddressName: { type: String, required: true },
	deleteConfirmId: { type: [Number, null], default: null },
	deleteLoading: { type: Boolean, default: false },
});

const emit = defineEmits(['edit', 'set-default', 'delete', 'confirm-delete', 'cancel-delete', 'create']);

const getProvinceCode = (provinceName) => {
	if (!provinceName) return '';
	return provinceName.slice(0, 2);
};
</script>

<template>
	<!-- Summary cards -->
	<div class="mb-[18px] grid gap-[12px] desktop:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
		<div class="rounded-[18px] border border-[#E9EBEC] bg-white px-[16px] py-[14px] shadow-sm">
			<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[#095866]">Vista rubrica</p>
			<h2 class="mt-[6px] text-[1rem] font-bold text-[#252B42]">Indirizzi ordinati e pronti all&apos;uso</h2>
			<p class="mt-[6px] text-[0.875rem] leading-[1.55] text-[#737373]">
				Mantieni in ordine i riferimenti più usati, aggiorna i dettagli in pochi tap e lascia sempre visibile quello principale.
			</p>
			<div class="mt-[12px] flex flex-wrap gap-[8px]">
				<span class="inline-flex items-center gap-[6px] rounded-full bg-[#F0F6F7] px-[12px] py-[6px] text-[0.75rem] font-semibold text-[#095866]">
					<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M14.5,9A3.5,3.5 0 0,0 11,5.5A3.5,3.5 0 0,0 7.5,9A3.5,3.5 0 0,0 11,12.5A3.5,3.5 0 0,0 14.5,9M11,7A2,2 0 0,1 13,9A2,2 0 0,1 11,11A2,2 0 0,1 9,9A2,2 0 0,1 11,7M11,2C7.13,2 4,5.13 4,9C4,14.25 11,22 11,22C11,22 18,14.25 18,9A7,7 0 0,0 11,2M11,4A5,5 0 0,1 16,9C16,11.38 13.12,16.24 11,19.19C8.88,16.24 6,11.38 6,9A5,5 0 0,1 11,4Z"/></svg>
					{{ addressStats.total }} salvati
				</span>
				<span class="inline-flex items-center gap-[6px] rounded-full bg-[#FFF3EC] px-[12px] py-[6px] text-[0.75rem] font-semibold text-[#E44203]">
					<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.78L23,12M13,17H11V15H13V17M13,13H11V7H13V13Z"/></svg>
					{{ addressStats.defaults }} predefiniti
				</span>
			</div>
		</div>
		<div class="rounded-[18px] border border-[#DDECEE] bg-[#F8FCFD] px-[16px] py-[14px] shadow-sm">
			<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[#095866]">Predefinito attivo</p>
			<p class="mt-[8px] text-[1rem] font-bold text-[#252B42]">{{ defaultAddressName }}</p>
			<p class="mt-[6px] text-[0.8125rem] leading-[1.55] text-[#737373]">
				Un indirizzo principale alla volta, tutto il resto resta sempre modificabile o eliminabile senza perdere la rubrica.
			</p>
		</div>
	</div>

	<!-- Loading skeleton -->
	<div v-if="!addresses" class="space-y-[12px]">
		<div v-for="n in 2" :key="n" class="bg-white rounded-[16px] p-[24px] border border-[#E9EBEC] animate-pulse">
			<div class="flex items-center gap-[16px]">
				<div class="w-[44px] h-[44px] rounded-[50px] bg-gray-200"></div>
				<div class="flex-1 space-y-[8px]">
					<div class="h-[14px] bg-gray-200 rounded w-[50%]"></div>
					<div class="h-[12px] bg-gray-200 rounded w-[35%]"></div>
				</div>
			</div>
		</div>
	</div>

	<!-- Empty state -->
	<div v-else-if="addresses?.data?.length === 0" class="bg-white rounded-[16px] p-[48px] border border-[#E9EBEC] text-center">
		<div class="w-[72px] h-[72px] mx-auto mb-[20px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
			<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#C8CCD0"><path d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"/></svg>
		</div>
		<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Nessun indirizzo salvato</h2>
		<p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto mb-[24px] leading-[1.6]">
			Salva i tuoi indirizzi per velocizzare la compilazione delle spedizioni.
		</p>
		<button
			@click="emit('create')"
			class="inline-flex items-center gap-[6px] px-[24px] py-[12px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] font-semibold text-[0.9375rem] transition-colors cursor-pointer">
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>
			Aggiungi il tuo primo indirizzo
		</button>
	</div>

	<!-- Elenco indirizzi -->
	<div v-else class="space-y-[10px]">
		<div
			v-for="address in addresses.data"
			:key="address.id"
			:class="['bg-white rounded-[16px] p-[16px] desktop:p-[20px] border transition-all', address.default ? 'border-[#095866] shadow-sm' : 'border-[#E9EBEC] hover:border-[#D7E1E4]']">
			<div class="flex flex-col gap-[12px] desktop:flex-row desktop:items-start desktop:gap-[16px]">
				<!-- Icona -->
				<div :class="['w-[40px] h-[40px] rounded-[50px] flex items-center justify-center shrink-0', address.default ? 'bg-[#095866]/10' : 'bg-[#F8F9FB]']">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" :fill="address.default ? '#095866' : '#737373'"><path d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"/></svg>
				</div>

				<!-- Dati -->
				<div class="flex-1 min-w-0">
					<div class="flex flex-wrap items-center gap-[8px] mb-[4px]">
						<h3 class="text-[0.9375rem] font-bold text-[#252B42]">{{ address.name }}</h3>
						<span v-if="address.default" class="inline-block px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium bg-[#095866]/10 text-[#095866]">
							Predefinito
						</span>
					</div>
					<p class="text-[0.875rem] text-[#404040]">{{ address.address }}</p>
					<p class="text-[0.875rem] text-[#737373]">
						{{ address.postal_code }} {{ address.city }}
						<span v-if="address.province_name">({{ getProvinceCode(address.province_name) }})</span>
					</p>
				</div>

				<!-- Azioni -->
				<div class="flex flex-wrap gap-[8px] shrink-0 desktop:max-w-[220px] desktop:justify-end">
					<button
						v-if="!address.default"
						@click="emit('set-default', address)"
						class="inline-flex items-center justify-center gap-[4px] rounded-full border border-[#D7E8EA] bg-[#F8FCFD] px-[12px] py-[8px] text-[0.75rem] font-semibold text-[#095866] transition-colors hover:bg-[#EEF7F8] cursor-pointer">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/></svg>
						Predefinito
					</button>
					<button
						@click="emit('edit', address)"
						class="inline-flex items-center justify-center gap-[4px] rounded-full border border-[#E3E7EA] bg-white px-[12px] py-[8px] text-[0.75rem] font-semibold text-[#404040] transition-colors hover:bg-[#F8F9FB] cursor-pointer">
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>
						Modifica
					</button>

					<!-- Conferma eliminazione -->
					<template v-if="deleteConfirmId !== address.id">
						<button
							@click="emit('confirm-delete', address.id)"
							class="inline-flex items-center justify-center gap-[4px] rounded-full border border-[#F3D7D7] bg-white px-[12px] py-[8px] text-[0.75rem] font-semibold text-red-500 transition-colors hover:bg-red-50 cursor-pointer">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z"/></svg>
							Elimina
						</button>
					</template>
					<template v-else>
						<div class="flex flex-wrap gap-[8px]">
							<button
								@click="emit('delete', address.id)"
								:disabled="deleteLoading"
								class="inline-flex items-center justify-center gap-[4px] rounded-full bg-red-600 px-[12px] py-[8px] text-[0.75rem] font-semibold text-white cursor-pointer transition-colors hover:bg-red-700 disabled:opacity-60">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
								{{ deleteLoading ? 'Eliminazione...' : 'Conferma' }}
							</button>
							<button
								@click="emit('cancel-delete')"
								class="inline-flex items-center justify-center gap-[4px] rounded-full border border-[#E3E7EA] bg-white px-[12px] py-[8px] text-[0.75rem] font-semibold text-[#404040] transition-colors hover:bg-[#F8F9FB] cursor-pointer">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
								Annulla
							</button>
						</div>
					</template>
				</div>
			</div>
		</div>
	</div>
</template>
