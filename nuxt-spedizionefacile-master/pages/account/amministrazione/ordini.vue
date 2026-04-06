<!--
  FILE: pages/account/amministrazione/ordini.vue
  SCOPO: Pannello admin — gestione ordini di tutti gli utenti.
         Lista con ricerca, filtri per stato, cambio stato, dettaglio modale,
         vista raggruppata per utente, gestione PUDO, download etichette BRT.
  API: GET /api/admin/orders?page=&search=&status= — lista ordini paginata,
       PATCH /api/admin/orders/{id}/status — cambio stato ordine,
       PATCH /api/admin/orders/{id}/pudo — assegna/rimuovi punto PUDO,
       PATCH /api/admin/users/{id}/user-type — cambio tipo account utente.
  COMPONENTI: AdminOrdiniToolbar, AdminOrdiniFlatView, AdminOrdiniGroupedView, AdminOrderDetailModal, PudoSelector.
  ROUTE: /account/amministrazione/ordini (middleware sanctum:auth + admin).
  COMPOSABLE: useAdminOrdini — logica business, fetch, filtri, paginazione, stato ordine, PUDO.
-->
<script setup>
definePageMeta({
	middleware: ['app-auth', 'admin'],
});

const {
	ordersData, ordersPage, ordersSearch, ordersStatusFilter,
	tabLoading, fetchError, groupByUser, orderStatusOptions,
	selectedOrder, expandedUsers, showPudoSelector, pudoSaving,
	groupedOrders, visibleOrdersCount, groupedUsersCount,
	visibleOrdersTotal, hasActiveFilters, activeStatusLabel, paginationLabel,
	fetchOrders, onOrdersSearch, changeOrderStatus,
	showOrderDetail, closeOrderDetail, toggleUser,
	resetFilters, getAvailableStatuses, changeUserType,
	getPudoFromOrder, onAdminPudoSelected, removeAdminPudo,
	actionMessage, formatCurrency, formatCents, formatDate, orderStatusConfig, downloadLabel,
} = useAdminOrdini();

onMounted(() => { fetchOrders(); });
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Console operativa"
				title="Ordini"
				description="Ricerca, filtri e cambio stato in una superficie piu' stabile e leggibile anche su mobile e tablet."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Amministrazione', to: '/account/amministrazione' },
					{ label: 'Ordini' },
				]" />

			<div
				v-if="actionMessage"
				:class="[
					'mb-[20px] px-[16px] py-[12px] rounded-[20px] text-[0.875rem] font-medium flex items-center gap-[8px]',
					actionMessage.type === 'success' ? 'bg-[#f0fdf4] text-[#0a8a7a] border border-[#d1fae5]' : 'bg-red-50 text-red-700 border border-red-200',
				]">
				<svg v-if="actionMessage.type === 'success'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg>
				<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
				{{ actionMessage.text }}
			</div>

			<AdminOrdiniToolbar
				:orders-search="ordersSearch"
				:orders-status-filter="ordersStatusFilter"
				:order-status-options="orderStatusOptions"
				:visible-orders-count="visibleOrdersCount"
				:grouped-users-count="groupedUsersCount"
				:visible-orders-total="visibleOrdersTotal"
				:group-by-user="groupByUser"
				:has-active-filters="hasActiveFilters"
				:active-status-label="activeStatusLabel"
				:format-cents="formatCents"
				@update:orders-search="ordersSearch = $event"
				@update:orders-status-filter="ordersStatusFilter = $event"
				@refresh="fetchOrders"
				@toggle-group="groupByUser = !groupByUser"
				@reset="resetFilters"
				@search="onOrdersSearch"
				@filter-change="ordersPage = 1; fetchOrders()" />

			<div class="bg-white rounded-[20px] p-[18px] tablet:p-[24px] desktop:p-[32px] shadow-sm border border-[var(--color-brand-border)]">
				<div class="mb-[20px] flex flex-col gap-[10px] border-b border-[#EEF1F3] pb-[18px] tablet:flex-row tablet:items-end tablet:justify-between">
					<div>
						<h2 class="text-[1.125rem] font-bold text-[var(--color-brand-text)]">{{ groupByUser ? 'Ordini per utente' : 'Tutti gli ordini' }}</h2>
						<p class="mt-[4px] text-[0.8125rem] text-[var(--color-brand-text-secondary)]">
							{{ groupByUser ? 'Raggruppa, apri e gestisci gli ordini per singolo cliente.' : 'Controlla stato, importo e dettagli in una lista piu\' leggibile.' }}
						</p>
					</div>
					<div class="flex flex-wrap gap-[8px]">
						<span class="inline-flex items-center rounded-full bg-[#F4F6F8] px-[10px] py-[5px] text-[0.75rem] font-medium text-[var(--color-brand-text-secondary)]">{{ paginationLabel }}</span>
						<span v-if="hasActiveFilters" class="inline-flex items-center rounded-full bg-[#FFF3EC] px-[10px] py-[5px] text-[0.75rem] font-medium text-[var(--color-brand-accent)]">Filtri attivi</span>
					</div>
				</div>

				<div v-if="tabLoading" class="py-[40px] flex justify-center">
					<div class="w-[32px] h-[32px] border-3 border-[var(--color-brand-border)] border-t-[var(--color-brand-primary)] rounded-full animate-spin"></div>
				</div>

				<div v-else-if="fetchError" class="text-center py-[48px]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[40px] h-[40px] text-red-300 mx-auto mb-[12px]" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
					<p class="text-[var(--color-brand-text-secondary)] mb-[12px]">Errore nel caricamento degli ordini.</p>
					<button @click="fetchOrders" class="px-[20px] py-[10px] bg-[var(--color-brand-primary)] text-white rounded-[50px] text-[0.875rem] font-medium cursor-pointer hover:bg-[var(--color-brand-primary-hover)] transition-colors">Riprova</button>
				</div>

				<div v-else-if="!ordersData.data?.length" class="text-center py-[48px]">
					<div class="w-[64px] h-[64px] mx-auto mb-[16px] bg-[#F5F6F9] rounded-full flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[28px] h-[28px]" fill="#C8CCD0"><path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5Z"/></svg>
					</div>
					<h2 class="text-[1.125rem] font-bold text-[var(--color-brand-text)] mb-[8px]">Nessun ordine trovato</h2>
					<p class="text-[var(--color-brand-text-secondary)] text-[0.875rem]">Nessun ordine corrisponde ai filtri selezionati.</p>
				</div>

				<AdminOrdiniGroupedView
					v-else-if="groupByUser"
					:grouped-orders="groupedOrders"
					:expanded-users="expandedUsers"
					:order-status-config="orderStatusConfig"
					:format-cents="formatCents"
					:format-date="formatDate"
					:get-available-statuses="getAvailableStatuses"
					@toggle-user="toggleUser"
					@show-detail="showOrderDetail"
					@change-status="changeOrderStatus"
					@change-user-type="changeUserType" />

				<AdminOrdiniFlatView
					v-else
					:orders="ordersData.data"
					:order-status-config="orderStatusConfig"
					:format-cents="formatCents"
					:format-date="formatDate"
					:get-available-statuses="getAvailableStatuses"
					@show-detail="showOrderDetail"
					@change-status="changeOrderStatus" />

				<div v-if="ordersData.last_page > 1" class="mt-[22px] flex flex-col gap-[10px] rounded-[20px] border border-[#EEF1F3] bg-[#FAFBFC] px-[14px] py-[12px] tablet:flex-row tablet:items-center tablet:justify-between">
					<p class="text-[0.8125rem] text-[var(--color-brand-text-secondary)]">{{ paginationLabel }}</p>
					<div class="flex items-center justify-between gap-[8px] tablet:justify-end">
						<button @click="ordersPage = Math.max(1, ordersPage - 1); fetchOrders()" :disabled="ordersPage <= 1" class="btn-tertiary px-[12px] py-[8px] text-[0.8125rem] disabled:opacity-40">Precedente</button>
						<button @click="ordersPage = Math.min(ordersData.last_page, ordersPage + 1); fetchOrders()" :disabled="ordersPage >= ordersData.last_page" class="btn-tertiary px-[12px] py-[8px] text-[0.8125rem] disabled:opacity-40">Successivo</button>
					</div>
				</div>
			</div>

			<AdminOrderDetailModal
				:order="selectedOrder"
				:order-status-config="orderStatusConfig"
				:format-cents="formatCents"
				:format-currency="formatCurrency"
				:format-date="formatDate"
				:show-pudo-selector="showPudoSelector"
				:pudo-saving="pudoSaving"
				:get-pudo-from-order="getPudoFromOrder"
				@close="closeOrderDetail"
				@download-label="downloadLabel"
				@toggle-pudo-selector="showPudoSelector = !showPudoSelector"
				@pudo-selected="onAdminPudoSelected"
				@remove-pudo="removeAdminPudo" />
		</div>
	</section>
</template>
