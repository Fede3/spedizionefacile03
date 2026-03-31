<!--
  Componente: SpedizioniConfigurateDesktopRow
  Riga desktop della tabella spedizioni configurate.
-->
<script setup>
const props = defineProps({
	item: { type: Object, required: true },
	index: { type: Number, required: true },
	isSelected: { type: Boolean, default: false },
	isDuplicate: { type: Boolean, default: false },
	formatCreatedDate: { type: Function, required: true },
	formatPrice: { type: Function, required: true },
	getPackageIcon: { type: Function, required: true },
});

const emit = defineEmits(['toggle', 'edit', 'delete']);
</script>

<template>
	<div
		@dblclick="emit('edit', item)"
		:class="['hidden desktop:grid grid-cols-[3%_10%_10%_9%_8%_10%_22%_7%_9%_12%] gap-[4px] items-center px-[14px] py-[10px] border-b border-[#E9EBEC] hover:bg-[#EDF5F7] transition-colors text-[0.75rem] text-[#252B42] cursor-pointer', index % 2 === 1 ? 'bg-[#F8F9FB]' : '', isDuplicate ? 'ring-1 ring-amber-400 ring-inset' : '']">
		<span class="flex items-center">
			<input type="checkbox" :checked="isSelected" @change="emit('toggle', item.id)" class="w-[16px] h-[16px] accent-[#095866] cursor-pointer" />
		</span>
		<span>{{ formatCreatedDate(item) }}</span>
		<span>{{ item.origin_address?.city || '\u2014' }}</span>
		<span class="text-[#737373]">......</span>
		<span>{{ item.services?.service_type?.split(',')[0]?.trim() || 'BRT' }}</span>
		<span class="flex items-center gap-[4px]">
			{{ item.quantity || 1 }} x
			<NuxtImg :src="getPackageIcon(item)" alt="" width="20" height="22" loading="lazy" decoding="async" />
		</span>
		<span class="text-[0.75rem]">
			<div class="flex items-center gap-[4px]">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" class="shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
				<span class="truncate">{{ item.origin_address?.name?.split(' ')[0] || '\u2014' }} - {{ item.origin_address?.city || '' }}</span>
			</div>
			<div class="flex items-center gap-[4px] mt-[2px]">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" class="shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
				<span class="truncate">{{ item.destination_address?.name?.split(' ')[0] || '\u2014' }} - {{ item.destination_address?.city || '' }}</span>
			</div>
			<div v-if="isDuplicate" class="flex items-center gap-[4px] mt-[4px] text-amber-600 text-[0.6875rem] font-medium">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
				Destinazione duplicata
			</div>
		</span>
		<span class="text-[#737373]">......</span>
		<span class="font-semibold">{{ formatPrice(item.single_price) }}</span>
		<span class="flex items-center justify-center gap-[8px]">
			<button type="button" @click="emit('edit', item)" class="text-[#095866] hover:text-[#074a56] cursor-pointer" title="Modifica" aria-label="Modifica configurazione">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
			</button>
			<button type="button" @click="emit('delete', item.id)" class="text-red-500 hover:text-red-700 cursor-pointer" title="Elimina" aria-label="Elimina configurazione">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
			</button>
		</span>
	</div>
</template>
