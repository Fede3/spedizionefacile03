<!--
  Vista lista flat (mobile cards + desktop table) per la pagina admin ordini.
-->
<script setup>
const props = defineProps({
	orders: { type: Array, default: () => [] },
	orderStatusConfig: { type: Object, default: () => ({}) },
	formatCents: { type: Function, required: true },
	formatDate: { type: Function, required: true },
	getAvailableStatuses: { type: Function, required: true },
});

const emit = defineEmits(['show-detail', 'change-status']);
</script>

<template>
	<div class="space-y-[12px]">
		<!-- Mobile cards -->
		<div class="grid grid-cols-1 gap-[12px] desktop:hidden tablet:grid-cols-2">
			<div v-for="order in orders" :key="order.id" class="rounded-[16px] border border-[#E9EBEC] bg-[#F8FAFB] p-[14px] shadow-sm">
				<div class="flex items-start justify-between gap-[12px]">
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-[8px] mb-[6px]">
							<span class="text-[0.9375rem] font-bold text-[#252B42]">#{{ order.id }}</span>
							<span :class="['inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium', orderStatusConfig[order.status]?.bg || 'bg-gray-50', orderStatusConfig[order.status]?.text || 'text-gray-700']">
								{{ orderStatusConfig[order.status]?.label || order.status }}
							</span>
						</div>
						<p class="text-[0.875rem] font-medium text-[#252B42] truncate">{{ order.user?.name }} {{ order.user?.surname }}</p>
						<p class="text-[0.75rem] text-[#737373] truncate">{{ order.user?.email }}</p>
					</div>
					<div class="text-right shrink-0">
						<p class="text-[1rem] font-bold text-[#252B42]">&euro;{{ formatCents(order.subtotal?.amount ?? order.subtotal) }}</p>
						<p class="text-[0.75rem] text-[#737373]">{{ formatDate(order.created_at) }}</p>
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-[8px] mt-[12px] text-[0.75rem]">
					<span class="text-[#404040]">{{ order.packages?.length || 0 }} colli</span>
					<span v-if="order.brt_parcel_id" class="text-[0.75rem] font-mono bg-indigo-50 text-indigo-700 px-[6px] py-[2px] rounded">{{ order.brt_parcel_id }}</span>
					<span v-if="order.brt_pudo_id" class="text-[0.625rem] font-semibold bg-[#095866]/10 text-[#095866] px-[6px] py-[2px] rounded">PUDO</span>
				</div>
				<div class="mt-[12px] grid grid-cols-2 gap-[8px]">
					<button @click="emit('show-detail', order)" class="inline-flex items-center justify-center gap-[5px] px-[12px] py-[9px] rounded-[12px] bg-white border border-[#D7E1E4] hover:border-[#095866] hover:text-[#095866] text-[#404040] text-[0.75rem] cursor-pointer font-medium transition-colors">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17C7,17 2.73,13.89 1,12C2.73,10.11 7,7 12,7C17,7 21.27,10.11 23,12C21.27,13.89 17,17 12,17Z"/></svg>
						Dettagli
					</button>
					<select @change="emit('change-status', order.id, $event.target.value, order.status); $event.target.value = ''" class="w-full px-[10px] py-[9px] rounded-[12px] bg-white text-[#252B42] text-[0.75rem] cursor-pointer border border-[#D7E1E4] font-medium focus:border-[#095866] focus:outline-none">
						<option value="" selected disabled>Stato</option>
						<option v-for="s in getAvailableStatuses(order.status)" :key="s.value" :value="s.value">{{ s.label }}</option>
					</select>
				</div>
			</div>
		</div>

		<!-- Desktop table -->
		<div class="hidden desktop:block overflow-x-auto">
			<table class="w-full min-w-[980px] text-[0.875rem]">
				<thead>
					<tr class="border-b border-[#E9EBEC] text-left text-[#737373]">
						<th class="pb-[12px] font-medium">ID</th>
						<th class="pb-[12px] font-medium">Utente</th>
						<th class="pb-[12px] font-medium">Colli</th>
						<th class="pb-[12px] font-medium text-right">Importo</th>
						<th class="pb-[12px] font-medium">Stato</th>
						<th class="pb-[12px] font-medium">BRT</th>
						<th class="pb-[12px] font-medium">Data</th>
						<th class="pb-[12px] font-medium text-right">Azioni</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(order, idx) in orders" :key="order.id" :class="['border-b border-[#F0F0F0] last:border-0', idx % 2 === 1 ? 'bg-[#FAFBFC]' : '']">
						<td class="py-[14px] font-bold text-[#252B42]">#{{ order.id }}</td>
						<td class="py-[14px]">
							<span class="text-[#252B42] font-medium">{{ order.user?.name }} {{ order.user?.surname }}</span>
							<br /><span class="text-[0.75rem] text-[#737373]">{{ order.user?.email }}</span>
						</td>
						<td class="py-[14px] text-[#404040]">{{ order.packages?.length || 0 }}</td>
						<td class="py-[14px] text-right font-semibold text-[#252B42]">&euro;{{ formatCents(order.subtotal?.amount ?? order.subtotal) }}</td>
						<td class="py-[14px]">
							<span :class="['inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium', orderStatusConfig[order.status]?.bg || 'bg-gray-50', orderStatusConfig[order.status]?.text || 'text-gray-700']">
								{{ orderStatusConfig[order.status]?.label || order.status }}
							</span>
						</td>
						<td class="py-[14px]">
							<span v-if="order.brt_parcel_id" class="text-[0.75rem] font-mono bg-indigo-50 text-indigo-700 px-[6px] py-[2px] rounded">{{ order.brt_parcel_id }}</span>
							<span v-else class="text-[#C8CCD0]">&mdash;</span>
							<span v-if="order.brt_pudo_id" class="ml-[4px] text-[0.625rem] font-semibold bg-[#095866]/10 text-[#095866] px-[6px] py-[2px] rounded" title="Ritiro in Punto BRT">PUDO</span>
						</td>
						<td class="py-[14px] text-[#737373] text-[0.8125rem]">{{ formatDate(order.created_at) }}</td>
						<td class="py-[14px] text-right">
							<div class="flex justify-end gap-[6px]">
								<button @click="emit('show-detail', order)" class="inline-flex items-center gap-[5px] px-[12px] py-[7px] rounded-[12px] bg-white border border-[#D7E1E4] hover:border-[#095866] hover:text-[#095866] text-[#404040] text-[0.75rem] cursor-pointer font-medium transition-colors">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17C7,17 2.73,13.89 1,12C2.73,10.11 7,7 12,7C17,7 21.27,10.11 23,12C21.27,13.89 17,17 12,17Z"/></svg>
									Dettagli
								</button>
								<select @change="emit('change-status', order.id, $event.target.value, order.status); $event.target.value = ''" class="px-[10px] py-[7px] rounded-[12px] bg-[#F8FAFB] text-[#252B42] text-[0.75rem] cursor-pointer border border-[#D7E1E4] font-medium focus:border-[#095866] focus:outline-none">
									<option value="" selected disabled>Stato</option>
									<option v-for="s in getAvailableStatuses(order.status)" :key="s.value" :value="s.value">{{ s.label }}</option>
								</select>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>
