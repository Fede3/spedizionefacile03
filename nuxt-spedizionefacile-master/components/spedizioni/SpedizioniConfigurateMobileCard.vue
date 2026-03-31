<!--
  Componente: SpedizioniConfigurateMobileCard
  Card mobile per spedizioni configurate.
-->
<script setup>
const props = defineProps({
	item: { type: Object, required: true },
	isSelected: { type: Boolean, default: false },
	isDuplicate: { type: Boolean, default: false },
	formatCreatedDate: { type: Function, required: true },
	formatPrice: { type: Function, required: true },
	getPackageIcon: { type: Function, required: true },
});

const emit = defineEmits(['toggle', 'edit', 'delete']);
</script>

<template>
	<div :class="['desktop:hidden p-[14px] tablet:p-[16px] border-b border-[#E9EBEC] bg-white', isDuplicate ? 'bg-amber-50 border-l-[3px] border-l-amber-400' : '']">
		<div class="flex items-start justify-between gap-[10px]">
			<div class="flex items-start gap-[8px] min-w-0">
				<input type="checkbox" :checked="isSelected" @change="emit('toggle', item.id)" class="w-[16px] h-[16px] accent-[#095866] cursor-pointer" />
				<div class="min-w-0">
					<p class="text-[0.875rem] font-semibold text-[#252B42] leading-[1.25]">{{ item.origin_address?.city || 'Partenza' }} &rarr; {{ item.destination_address?.city || 'Dest.' }}</p>
					<p class="mt-[3px] text-[0.75rem] text-[#737373] leading-[1.35]">{{ item.quantity }}x - {{ item.weight }} kg - {{ formatCreatedDate(item) }}</p>
					<p v-if="isDuplicate" class="text-[0.6875rem] text-amber-600 font-medium mt-[4px] flex items-center gap-[4px]">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
						Destinazione duplicata
					</p>
				</div>
			</div>
			<span class="shrink-0 text-[0.9375rem] font-bold text-[#252B42]">{{ formatPrice(item.single_price) }}</span>
		</div>
		<div class="mt-[10px] flex flex-wrap gap-[8px]">
			<span class="inline-flex items-center gap-[6px] rounded-full bg-[#F8F9FB] px-[10px] py-[5px] text-[0.75rem] font-medium text-[#252B42]">
				<NuxtImg :src="getPackageIcon(item)" alt="" width="16" height="18" loading="lazy" decoding="async" class="shrink-0" />
				{{ item.package_type || 'Pacco' }}
			</span>
			<span class="inline-flex items-center gap-[6px] rounded-full bg-[#F8F9FB] px-[10px] py-[5px] text-[0.75rem] font-medium text-[#252B42]">
				{{ item.services?.service_type?.split(',')[0]?.trim() || 'BRT' }}
			</span>
			<span class="inline-flex items-center gap-[6px] rounded-full bg-[#F8F9FB] px-[10px] py-[5px] text-[0.75rem] font-medium text-[#252B42]">
				{{ item.quantity || 1 }} colli
			</span>
			<span class="inline-flex items-center gap-[6px] rounded-full bg-[#EAF4F6] px-[10px] py-[5px] text-[0.75rem] font-medium text-[#095866]">
				{{ item.origin_address?.name?.split(' ')[0] || '\u2014' }} &rarr; {{ item.destination_address?.name?.split(' ')[0] || '\u2014' }}
			</span>
		</div>
		<div class="mt-[12px] grid grid-cols-1 sm:grid-cols-2 gap-[8px]">
			<div class="rounded-[12px] bg-[#F8F9FB] px-[12px] py-[10px]">
				<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[#737373]">Da</p>
				<p class="mt-[2px] text-[0.8125rem] font-semibold text-[#252B42] leading-[1.25]">{{ item.origin_address?.city || '\u2014' }}</p>
			</div>
			<div class="rounded-[12px] bg-[#F8F9FB] px-[12px] py-[10px]">
				<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[#737373]">A</p>
				<p class="mt-[2px] text-[0.8125rem] font-semibold text-[#252B42] leading-[1.25]">{{ item.destination_address?.city || '\u2014' }}</p>
			</div>
		</div>
		<div class="mt-[12px] flex flex-wrap gap-[10px] justify-end">
			<button @click="emit('edit', item)" class="inline-flex items-center gap-[4px] rounded-full border border-[#E9EBEC] bg-white px-[12px] py-[7px] text-[0.75rem] text-[#095866] font-semibold hover:border-[#095866] cursor-pointer">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
				Modifica
			</button>
			<button @click="emit('delete', item.id)" class="inline-flex items-center gap-[4px] rounded-full border border-red-200 bg-white px-[12px] py-[7px] text-[0.75rem] text-red-600 font-semibold hover:border-red-300 cursor-pointer" title="Elimina">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
			</button>
		</div>
	</div>
</template>
