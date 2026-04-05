<!--
  Vista raggruppata per utente nella pagina admin ordini.
  Ogni utente ha un header cliccabile che espande i suoi ordini.
-->
<script setup>
const props = defineProps({
	groupedOrders: { type: Array, default: () => [] },
	expandedUsers: { type: Object, required: true },
	orderStatusConfig: { type: Object, default: () => ({}) },
	formatCents: { type: Function, required: true },
	formatDate: { type: Function, required: true },
	getAvailableStatuses: { type: Function, required: true },
});

const emit = defineEmits(['toggle-user', 'show-detail', 'change-status', 'change-user-type']);
</script>

<template>
	<div class="space-y-[12px]">
		<div v-for="group in groupedOrders" :key="group.user?.id || 'unknown'" class="border border-[var(--color-brand-border)] rounded-[12px] overflow-hidden">
			<!-- Header utente -->
			<button type="button" @click="emit('toggle-user', group.user?.id)" class="w-full bg-[#F8F9FA] px-[14px] py-[14px] tablet:px-[20px] flex flex-col gap-[12px] cursor-pointer hover:bg-[#F0F4F5] transition-colors tablet:flex-row tablet:items-center tablet:justify-between" :class="expandedUsers.has(group.user?.id) ? 'border-b border-[var(--color-brand-border)]' : ''">
				<div class="flex min-w-0 items-center gap-[12px]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[var(--color-brand-text-secondary)] transition-transform" :class="expandedUsers.has(group.user?.id) ? 'rotate-90' : ''" fill="currentColor"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/></svg>
					<div class="w-[40px] h-[40px] rounded-full bg-[var(--color-brand-primary)] flex items-center justify-center text-white text-[0.875rem] font-bold shrink-0">
						{{ (group.user?.name || '?')[0]?.toUpperCase() }}
					</div>
					<div class="min-w-0 text-left">
						<div class="flex flex-wrap items-center gap-[8px]">
							<p class="text-[0.875rem] font-semibold text-[var(--color-brand-text)]">{{ group.user?.name }} {{ group.user?.surname }}</p>
							<span :class="['px-[8px] py-[2px] rounded-full text-[0.625rem] font-semibold uppercase tracking-[0.5px]', (group.user?.user_type || 'privato') === 'commerciante' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600']">
								{{ (group.user?.user_type || 'privato') === 'commerciante' ? 'Commerciante' : 'Privato' }}
							</span>
							<span v-if="group.user?.role === 'Partner Pro'" class="px-[8px] py-[2px] rounded-full text-[0.625rem] font-semibold uppercase tracking-[0.5px] bg-purple-100 text-purple-700">Pro</span>
							<span v-if="group.user?.role === 'Admin'" class="px-[8px] py-[2px] rounded-full text-[0.625rem] font-semibold uppercase tracking-[0.5px] bg-red-100 text-red-700">Admin</span>
						</div>
						<p class="truncate text-[0.75rem] text-[var(--color-brand-text-secondary)]">{{ group.user?.email }}</p>
					</div>
				</div>
				<div class="flex w-full flex-wrap items-center justify-between gap-[8px] tablet:w-auto tablet:justify-end">
					<span class="text-[0.75rem] font-medium text-[var(--color-brand-primary)] bg-[#E8F4FB] px-[10px] py-[4px] rounded-full">{{ group.orders.length }} ordini</span>
					<span class="text-[0.8125rem] font-semibold text-[var(--color-brand-text)]">&euro;{{ formatCents(group.totalAmount) }}</span>
				</div>
			</button>

			<!-- Ordini espansi -->
			<div v-if="expandedUsers.has(group.user?.id)">
				<div class="px-[14px] py-[10px] tablet:px-[20px] bg-[#FAFBFC] border-b border-[#F0F0F0] flex flex-col gap-[8px] tablet:flex-row tablet:items-center tablet:gap-[12px]">
					<span class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">Tipo account:</span>
					<select :value="group.user?.user_type || 'privato'" @change="emit('change-user-type', group.user?.id, $event.target.value)" class="w-full tablet:w-auto px-[10px] py-[6px] rounded-[12px] bg-white border border-[var(--color-brand-border)] text-[0.75rem] cursor-pointer focus:border-[var(--color-brand-primary)] focus:outline-none">
						<option value="privato">Privato</option>
						<option value="commerciante">Commerciante</option>
					</select>
				</div>
				<div class="divide-y divide-[#F0F0F0]">
					<div v-for="order in group.orders" :key="order.id" class="grid gap-[12px] px-[14px] py-[12px] hover:bg-[#FAFBFC] transition-colors tablet:grid-cols-[minmax(0,1fr)_auto] tablet:items-center tablet:px-[20px]">
						<div class="flex min-w-0 flex-wrap items-center gap-[10px]">
							<span class="text-[0.8125rem] font-bold text-[var(--color-brand-text)]">#{{ order.id }}</span>
							<span class="text-[0.8125rem] text-[var(--color-brand-text-secondary)]">{{ order.packages?.length || 0 }} colli</span>
							<span v-if="order.brt_pudo_id" class="text-[0.625rem] font-semibold bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] px-[6px] py-[2px] rounded">PUDO</span>
							<span class="text-[0.75rem] text-[var(--color-brand-text-secondary)] tablet:hidden">{{ formatDate(order.created_at) }}</span>
						</div>
						<div class="flex flex-wrap items-center gap-[8px] tablet:justify-end">
							<span class="text-[0.875rem] font-semibold text-[var(--color-brand-text)]">&euro;{{ formatCents(order.subtotal?.amount ?? order.subtotal) }}</span>
							<span :class="['inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium', orderStatusConfig[order.status]?.bg || 'bg-gray-50', orderStatusConfig[order.status]?.text || 'text-gray-700']">
								{{ orderStatusConfig[order.status]?.label || order.status }}
							</span>
							<span class="hidden text-[0.75rem] text-[var(--color-brand-text-secondary)] desktop:inline">{{ formatDate(order.created_at) }}</span>
							<button @click="emit('show-detail', order)" class="inline-flex items-center gap-[5px] px-[12px] py-[7px] rounded-[12px] bg-white border border-[#D7E1E4] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] text-[#404040] text-[0.75rem] cursor-pointer font-medium transition-colors">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17C7,17 2.73,13.89 1,12C2.73,10.11 7,7 12,7C17,7 21.27,10.11 23,12C21.27,13.89 17,17 12,17Z"/></svg>
								Dettagli
							</button>
							<select @change="emit('change-status', order.id, $event.target.value, order.status); $event.target.value = ''" class="px-[10px] py-[7px] rounded-[12px] bg-[#F8FAFB] text-[var(--color-brand-text)] text-[0.75rem] cursor-pointer border border-[#D7E1E4] font-medium focus:border-[var(--color-brand-primary)] focus:outline-none">
								<option value="" selected disabled>Stato</option>
								<option v-for="s in getAvailableStatuses(order.status)" :key="s.value" :value="s.value">{{ s.label }}</option>
							</select>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
