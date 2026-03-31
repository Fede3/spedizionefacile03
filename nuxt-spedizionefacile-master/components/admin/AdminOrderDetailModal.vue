<!--
  Modal dettaglio ordine per la pagina admin ordini.
  Mostra: utente, stato, importo, data, BRT, PUDO, colli, transazioni.
-->
<script setup>
const props = defineProps({
	order: { type: Object, default: null },
	orderStatusConfig: { type: Object, default: () => ({}) },
	formatCents: { type: Function, required: true },
	formatCurrency: { type: Function, default: (v) => v },
	formatDate: { type: Function, required: true },
	showPudoSelector: { type: Boolean, default: false },
	pudoSaving: { type: Boolean, default: false },
	getPudoFromOrder: { type: Function, required: true },
});

const emit = defineEmits(['close', 'download-label', 'toggle-pudo-selector', 'pudo-selected', 'remove-pudo']);
</script>

<template>
	<div v-if="order" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-[12px] tablet:p-[20px]" @click.self="emit('close')">
		<div class="bg-white rounded-[12px] p-[18px] tablet:p-[28px] shadow-2xl max-w-[750px] w-full max-h-[85vh] overflow-y-auto">
			<div class="mb-[20px] flex items-center justify-between gap-[12px] border-b border-[#EEF1F3] pb-[16px]">
				<h3 class="text-[1.125rem] font-bold text-[#252B42]">Ordine #{{ order.id }}</h3>
				<button @click="emit('close')" class="w-[36px] h-[36px] flex items-center justify-center rounded-full bg-[#F0F0F0] hover:bg-[#E0E0E0] cursor-pointer" aria-label="Chiudi dettaglio ordine">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[#404040]" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
				</button>
			</div>

			<!-- Info cards -->
			<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[16px] mb-[20px]">
				<div class="rounded-[12px] bg-[#F8FAFB] border border-[#E9EEF0] p-[16px]">
					<p class="text-[0.75rem] text-[#737373] mb-[4px]">Utente</p>
					<p class="text-[0.875rem] font-medium text-[#252B42]">{{ order.user?.name }} {{ order.user?.surname }}</p>
					<p class="text-[0.8125rem] text-[#737373]">{{ order.user?.email }}</p>
				</div>
				<div class="rounded-[12px] bg-[#F8FAFB] border border-[#E9EEF0] p-[16px]">
					<p class="text-[0.75rem] text-[#737373] mb-[4px]">Stato</p>
					<span :class="['inline-flex items-center gap-[4px] px-[10px] py-[4px] rounded-full text-[0.75rem] font-medium', orderStatusConfig[order.status]?.bg, orderStatusConfig[order.status]?.text]">
						{{ orderStatusConfig[order.status]?.label || order.status }}
					</span>
				</div>
				<div class="rounded-[12px] bg-[#F8FAFB] border border-[#E9EEF0] p-[16px]">
					<p class="text-[0.75rem] text-[#737373] mb-[4px]">Importo</p>
					<p class="text-[1rem] font-bold text-[#252B42]">&euro;{{ formatCents(order.subtotal?.amount ?? order.subtotal) }}</p>
				</div>
				<div class="rounded-[12px] bg-[#F8FAFB] border border-[#E9EEF0] p-[16px]">
					<p class="text-[0.75rem] text-[#737373] mb-[4px]">Data</p>
					<p class="text-[0.875rem] text-[#404040]">{{ formatDate(order.created_at) }}</p>
				</div>
			</div>

			<!-- BRT data -->
			<div v-if="order.brt_parcel_id" class="bg-indigo-50 rounded-[12px] p-[16px] mb-[16px]">
				<p class="text-[0.75rem] font-medium text-indigo-700 mb-[6px]">Dati BRT</p>
				<div class="grid grid-cols-2 gap-[8px] text-[0.8125rem]">
					<div><span class="text-[#737373]">Parcel ID:</span> <span class="font-mono font-medium text-indigo-800">{{ order.brt_parcel_id }}</span></div>
					<div v-if="order.brt_numeric_sender_reference"><span class="text-[#737373]">Rif. Mittente:</span> <span class="font-mono">{{ order.brt_numeric_sender_reference }}</span></div>
				</div>
				<div class="flex gap-[8px] mt-[10px]">
					<a v-if="order.brt_tracking_url" :href="order.brt_tracking_url" target="_blank" class="inline-flex items-center gap-[4px] px-[12px] py-[6px] bg-indigo-600 text-white rounded-[12px] text-[0.75rem] font-medium hover:bg-indigo-700 transition-colors">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M18,15A3,3 0 0,1 21,18A3,3 0 0,1 18,21C16.69,21 15.58,20.17 15.17,19H14V17H15.17C15.58,15.83 16.69,15 18,15M18,17A1,1 0 0,0 17,18A1,1 0 0,0 18,19A1,1 0 0,0 19,18A1,1 0 0,0 18,17M6,15A3,3 0 0,1 9,18A3,3 0 0,1 6,21A3,3 0 0,1 3,18A3,3 0 0,1 6,15M6,17A1,1 0 0,0 5,18A1,1 0 0,0 6,19A1,1 0 0,0 7,18A1,1 0 0,0 6,17M11,7L9.5,13H13.5L12,7M9,3H14L18,17H12.5L12,15H11L10.5,17H5L9,3Z"/></svg> Tracking BRT
					</a>
					<button v-if="order.brt_parcel_id" @click="emit('download-label', order)" class="inline-flex items-center gap-[4px] px-[12px] py-[6px] bg-white border border-indigo-300 text-indigo-700 rounded-[12px] text-[0.75rem] font-medium hover:bg-indigo-50 cursor-pointer transition-colors">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg> Scarica etichetta
					</button>
				</div>
			</div>

			<!-- PUDO section -->
			<div class="bg-[#095866]/10 rounded-[12px] p-[16px] mb-[16px]">
				<div class="flex items-center justify-between mb-[6px]">
					<div class="flex items-center gap-[8px]">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
						<span class="text-[0.875rem] font-bold text-[#095866]">Punto di ritiro BRT</span>
					</div>
					<div class="flex gap-[6px]">
						<button @click="emit('toggle-pudo-selector')" class="px-[10px] py-[4px] rounded-[12px] bg-[#095866] text-white text-[0.75rem] font-medium cursor-pointer hover:bg-[#074a56] transition-colors inline-flex items-center gap-[4px]">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
							{{ order.brt_pudo_id ? 'Cambia' : 'Scegli' }}
						</button>
						<button v-if="order.brt_pudo_id" @click="emit('remove-pudo')" :disabled="pudoSaving" class="px-[10px] py-[4px] rounded-[12px] bg-red-500 text-white text-[0.75rem] font-medium cursor-pointer hover:bg-red-600 transition-colors disabled:opacity-50">
							Rimuovi
						</button>
					</div>
				</div>
				<template v-if="order.brt_pudo_id">
					<p class="text-[0.8125rem] text-[#404040]">PUDO ID: <span class="font-mono font-medium">{{ order.brt_pudo_id }}</span></p>
					<template v-if="getPudoFromOrder(order)">
						<p class="text-[0.8125rem] text-[#252B42] font-semibold mt-[4px]">{{ getPudoFromOrder(order).name }}</p>
						<p class="text-[0.8125rem] text-[#737373]">{{ getPudoFromOrder(order).address }}, {{ getPudoFromOrder(order).zip_code }} {{ getPudoFromOrder(order).city }}</p>
					</template>
				</template>
				<p v-else class="text-[0.8125rem] text-[#737373]">Consegna a domicilio (nessun punto PUDO selezionato)</p>
				<div v-if="showPudoSelector" class="mt-[12px] pt-[12px] border-t border-[#095866]/20">
					<PudoSelector @select="emit('pudo-selected', $event)" @deselect="() => {}" />
				</div>
			</div>

			<!-- COD -->
			<div v-if="order.is_cod" class="bg-amber-50 rounded-[12px] p-[12px] mb-[16px] text-[0.8125rem]">
				<span class="font-medium text-amber-800">Contrassegno: &euro;{{ formatCurrency(order.cod_amount) }}</span>
			</div>

			<!-- Packages -->
			<div v-if="order.packages?.length" class="mb-[16px]">
				<p class="text-[0.75rem] font-medium text-[#737373] mb-[8px] uppercase tracking-[0.5px]">Colli ({{ order.packages.length }})</p>
				<div class="space-y-[6px]">
					<div v-for="pkg in order.packages" :key="pkg.id" class="p-[12px] rounded-[12px] border border-[#E9EBEC] bg-[#FAFBFC] text-[0.8125rem]">
						<span class="font-medium text-[#252B42]">{{ pkg.weight }}kg</span>
						<span class="text-[#737373] ml-[8px]">{{ pkg.first_size }}x{{ pkg.second_size }}x{{ pkg.third_size }} cm</span>
						<span v-if="pkg.service" class="text-[0.75rem] ml-[8px] px-[6px] py-[1px] bg-[#F0F0F0] rounded text-[#737373]">{{ pkg.service.service_type }}</span>
					</div>
				</div>
			</div>

			<!-- Transactions -->
			<div v-if="order.transactions?.length">
				<p class="text-[0.75rem] font-medium text-[#737373] mb-[8px] uppercase tracking-[0.5px]">Transazioni</p>
				<div class="space-y-[6px]">
					<div v-for="tx in order.transactions" :key="tx.id" class="flex items-center justify-between p-[12px] rounded-[12px] border border-[#E9EBEC] bg-[#FAFBFC] text-[0.8125rem]">
						<div>
							<span class="font-medium text-[#252B42]">{{ tx.type }}</span>
							<span :class="['ml-[8px] px-[6px] py-[2px] rounded-full text-[0.6875rem]', tx.status === 'succeeded' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700']">{{ tx.status }}</span>
							<span v-if="tx.ext_id" class="ml-[6px] font-mono text-[0.6875rem] text-[#737373]">{{ tx.ext_id }}</span>
						</div>
						<span class="font-semibold text-[#252B42]">&euro;{{ formatCurrency(tx.total?.amount ?? tx.total) }}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
