<!--
  Toolbar ricerca, filtri e toggle vista per la pagina admin ordini.
  Props: stato filtri, contatori, formattazione.
  Emits: aggiorna, toggle-group, reset, search.
-->
<script setup>
const props = defineProps({
	ordersSearch: { type: String, default: '' },
	ordersStatusFilter: { type: String, default: '' },
	orderStatusOptions: { type: Array, default: () => [] },
	visibleOrdersCount: { type: Number, default: 0 },
	groupedUsersCount: { type: Number, default: 0 },
	visibleOrdersTotal: { type: Number, default: 0 },
	groupByUser: { type: Boolean, default: false },
	hasActiveFilters: { type: Boolean, default: false },
	activeStatusLabel: { type: String, default: 'Tutti gli stati' },
	formatCents: { type: Function, required: true },
});

const emit = defineEmits(['update:ordersSearch', 'update:ordersStatusFilter', 'refresh', 'toggle-group', 'reset', 'search', 'filter-change']);
</script>

<template>
	<div class="mb-[20px] rounded-[24px] border border-[#E9EBEC] bg-white p-[16px] tablet:p-[20px] desktop:p-[24px] shadow-sm">
		<div class="flex flex-col gap-[16px]">
			<div class="flex flex-col gap-[14px] desktop:flex-row desktop:items-start desktop:justify-between">
				<div class="min-w-0">
					<p class="text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-[#6A7486]">Vista ordini</p>
					<div class="mt-[6px] flex flex-wrap items-center gap-[8px]">
						<span class="inline-flex items-center rounded-full bg-[#E8F4FB] px-[10px] py-[5px] text-[0.75rem] font-semibold text-[#095866]">
							{{ visibleOrdersCount }} ordini visibili
						</span>
						<span class="inline-flex items-center rounded-full bg-[#F4F6F8] px-[10px] py-[5px] text-[0.75rem] font-medium text-[#4F5B67]">
							{{ groupByUser ? `${groupedUsersCount} utenti` : activeStatusLabel }}
						</span>
						<span class="inline-flex items-center rounded-full bg-[#FFF3EC] px-[10px] py-[5px] text-[0.75rem] font-semibold text-[#E44203]">
							{{ formatCents(visibleOrdersTotal) }} &euro;
						</span>
					</div>
				</div>
				<div class="grid grid-cols-1 gap-[8px] tablet:grid-cols-3 desktop:w-auto">
					<button type="button" @click="emit('refresh')" class="inline-flex items-center justify-center gap-[6px] rounded-[50px] border border-[#D7E1E4] bg-white px-[14px] py-[10px] text-[0.875rem] font-medium text-[#404040] transition-colors hover:border-[#095866] hover:text-[#095866] cursor-pointer">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="currentColor"><path d="M12,6V9L16,5L12,1V4C7.58,4 4,7.58 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.96 6,13 6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.75,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8,19L12,23V20C16.42,20 20,16.42 20,12C20,10.43 19.54,8.97 18.76,7.74Z"/></svg>
						Aggiorna
					</button>
					<button type="button" @click="emit('toggle-group')" :class="['inline-flex items-center justify-center gap-[6px] rounded-[50px] px-[14px] py-[10px] text-[0.875rem] font-medium transition-colors cursor-pointer', groupByUser ? 'bg-[#095866] text-white' : 'bg-white border border-[#D7E1E4] text-[#404040] hover:border-[#095866] hover:text-[#095866]']">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="currentColor"><path d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V18H22V16.5C22,14.17 18.33,13 16,13M8,13C5.67,13 2,14.17 2,16.5V18H14V16.5C14,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"/></svg>
						{{ groupByUser ? 'Vista lista' : 'Per utente' }}
					</button>
					<button type="button" @click="emit('reset')" :disabled="!hasActiveFilters" class="inline-flex items-center justify-center gap-[6px] rounded-[50px] border border-[#D7E1E4] bg-[#F8FAFB] px-[14px] py-[10px] text-[0.875rem] font-medium text-[#404040] transition-colors hover:border-[#095866] hover:text-[#095866] disabled:cursor-not-allowed disabled:opacity-45">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="currentColor"><path d="M13.39,8.23L15.5,10.34L20.43,5.41L19,4L15.5,7.5L14.8,6.8C13.76,5.76 12.33,5.11 10.76,5.02C7.06,4.8 4,7.84 4,11.54C4,13.37 4.73,15.03 5.91,16.22L4.5,17.63C2.95,16.08 2,13.93 2,11.54C2,6.56 6.11,2.5 11.09,2.54C13.42,2.56 15.53,3.5 17.06,5L20.41,1.65L21.82,3.06L16.89,7.99L19,10.1H13.39V8.23M10.61,15.77L8.5,13.66L3.57,18.59L5,20L8.5,16.5L9.2,17.2C10.24,18.24 11.67,18.89 13.24,18.98C16.94,19.2 20,16.16 20,12.46C20,10.63 19.27,8.97 18.09,7.78L19.5,6.37C21.05,7.92 22,10.07 22,12.46C22,17.44 17.89,21.5 12.91,21.46C10.58,21.44 8.47,20.5 6.94,19L3.59,22.35L2.18,20.94L7.11,16.01L5,13.9H10.61V15.77Z"/></svg>
						Reset
					</button>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-[10px] tablet:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.7fr)]">
				<div class="relative min-w-0">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="absolute left-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#737373]" fill="currentColor"><path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/></svg>
					<input :value="ordersSearch" @input="emit('update:ordersSearch', $event.target.value); emit('search')" type="text" placeholder="Cerca per ID, nome, email..." class="w-full pl-[40px] pr-[14px] py-[11px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[50px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
				</div>
				<select :value="ordersStatusFilter" @change="emit('update:ordersStatusFilter', $event.target.value); emit('filter-change')" class="w-full px-[14px] py-[11px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[50px] text-[0.875rem] focus:border-[#095866] focus:outline-none cursor-pointer">
					<option v-for="option in orderStatusOptions" :key="option.value || 'all'" :value="option.value">{{ option.label }}</option>
				</select>
			</div>
		</div>
	</div>
</template>
