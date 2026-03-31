<!--
  FILE: pages/account/spedizioni-configurate.vue
  SCOPO: Spedizioni salvate — lista, filtro, selezione multipla, aggiungi a carrello, modifica, elimina.
  API: GET /api/saved-shipments, PUT /api/saved-shipments/{id}, DELETE /api/saved-shipments/{id},
       POST /api/saved-shipments/add-to-cart.
  COMPONENTI: SpedizioniConfigurateDesktopRow, SpedizioniConfigurateMobileCard, SpedizioniConfigurateEditModal.
  ROUTE: /account/spedizioni-configurate (middleware sanctum:auth).
-->
<script setup>
definePageMeta({ middleware: ["app-auth"] });

const {
	savedStatus,
	filterProvenienza, filterRiferimento, filterDateFrom, filterDateTo,
	applyFilters, resetFilters,
	selectedItems, selectAll, toggleSelectAll, toggleItem,
	currentPage, totalPages, paginatedItems,
	totalShipmentsCount, visibleShipmentsCount, selectedShipmentsCount, activeFiltersCount,
	prevPage, nextPage, uniqueCities,
	showDeleteConfirm, deleteLoading, askDelete, confirmDelete,
	bulkDeleteLoading, showBulkDeleteConfirm, askBulkDelete, bulkDelete,
	addToCartLoading, bulkAddToCart,
	showEdit, editItem, editForm, editSaving, openEdit, saveEdit,
	feedbackMessage, feedbackType,
	formatPrice, isDuplicateDest, formatCreatedDate, getPackageIcon,
} = useSavedShipments();
</script>

<template>
	<section class="min-h-[600px] py-[32px] desktop:py-[56px]">
		<div class="my-container">
			<AccountPageHeader
				title="Spedizioni configurate"
				description="Riusa i modelli che usi piu' spesso, aggiornali quando servono e aggiungili al carrello senza ripartire da zero."
				:crumbs="[{ label: 'Account', to: '/account' }, { label: 'Spedizioni configurate' }]"
			/>

			<!-- Stats -->
			<div class="mb-[16px] grid grid-cols-1 tablet:grid-cols-3 gap-[10px]">
				<div class="rounded-[16px] border border-[#E9EBEC] bg-white px-[14px] py-[12px] shadow-sm">
					<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#737373]">Spedizioni salvate</p>
					<p class="mt-[2px] text-[1.125rem] font-bold text-[#252B42]">{{ totalShipmentsCount }}</p>
				</div>
				<div class="rounded-[16px] border border-[#E9EBEC] bg-white px-[14px] py-[12px] shadow-sm">
					<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#737373]">Filtri attivi</p>
					<p class="mt-[2px] text-[1.125rem] font-bold text-[#252B42]">{{ activeFiltersCount }}</p>
				</div>
				<div class="rounded-[16px] border border-[#E9EBEC] bg-white px-[14px] py-[12px] shadow-sm">
					<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#737373]">Selezionate</p>
					<p class="mt-[2px] text-[1.125rem] font-bold text-[#252B42]">{{ selectedShipmentsCount }}</p>
				</div>
			</div>

			<!-- Feedback -->
			<Transition name="fade">
				<div v-if="feedbackMessage" :class="['mb-[16px] px-[14px] py-[10px] rounded-[14px] text-[0.8125rem] font-medium', feedbackType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200']">{{ feedbackMessage }}</div>
			</Transition>

			<!-- Loading -->
			<div v-if="savedStatus === 'pending'" class="space-y-[10px]">
				<div v-for="n in 3" :key="n" class="bg-white rounded-[12px] border border-dashed border-[#A8C4D0] p-[16px] animate-pulse">
					<div class="h-[14px] bg-gray-200 rounded w-[60%] mb-[8px]"></div>
					<div class="h-[12px] bg-gray-200 rounded w-[40%]"></div>
				</div>
			</div>

			<div v-else>
				<!-- Toolbar filtri -->
				<div class="bg-white border border-[#E9EBEC] rounded-[18px] p-[14px] tablet:p-[18px_20px] mb-[12px] shadow-sm">
					<div class="flex flex-col gap-[10px] tablet:flex-row tablet:items-start tablet:justify-between">
						<div class="min-w-0">
							<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#737373]">Filtri rapidi</p>
							<p class="mt-[2px] text-[0.9375rem] font-semibold text-[#252B42]">Trova, ordina e riusa le configurazioni salvate senza perdere il contesto.</p>
						</div>
						<div class="flex flex-wrap items-center gap-[8px]">
							<button @click="resetFilters" type="button" class="inline-flex items-center justify-center gap-[6px] bg-[#E9EBEC] text-[#252B42] font-semibold text-[0.875rem] px-[16px] h-[42px] rounded-[14px] hover:opacity-90 transition cursor-pointer">
								<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
								Annulla
							</button>
							<button @click="applyFilters" type="button" class="inline-flex items-center justify-center gap-[6px] bg-[#252B42] text-white font-semibold text-[0.875rem] px-[16px] h-[42px] rounded-[14px] hover:opacity-90 transition cursor-pointer">
								<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
								Applica filtro
							</button>
						</div>
					</div>

					<div class="mt-[12px] grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-[1.1fr_1fr_1fr] gap-[10px]">
						<select v-model="filterProvenienza" class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] h-[44px] px-[14px] text-[0.8125rem] text-[#404040] appearance-none cursor-pointer">
							<option value="">Provenienza</option>
							<option v-for="city in uniqueCities" :key="city" :value="city">{{ city }}</option>
						</select>
						<input type="text" v-model="filterRiferimento" placeholder="Riferimento" class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] h-[44px] px-[14px] text-[0.8125rem] text-[#404040] placeholder:text-[#999]" />
						<div class="grid grid-cols-2 gap-[10px] tablet:col-span-2 desktop:col-span-1">
							<input type="date" v-model="filterDateFrom" class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] h-[44px] px-[12px] text-[0.8125rem] text-[#404040]" />
							<input type="date" v-model="filterDateTo" class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] h-[44px] px-[12px] text-[0.8125rem] text-[#404040]" />
						</div>
					</div>

					<div class="mt-[12px] flex flex-col gap-[10px] tablet:flex-row tablet:items-center tablet:justify-between border-t border-[#F0F0F0] pt-[12px]">
						<div class="flex flex-wrap items-center gap-[8px] text-[0.75rem] text-[#737373]">
							<span class="inline-flex items-center gap-[6px] rounded-full bg-[#F8F9FB] px-[10px] py-[5px] font-semibold text-[#252B42]">Visibili {{ visibleShipmentsCount }}</span>
							<span class="inline-flex items-center gap-[6px] rounded-full bg-[#F8F9FB] px-[10px] py-[5px] font-semibold text-[#252B42]">{{ selectedShipmentsCount }} selezionate</span>
							<span v-if="activeFiltersCount" class="inline-flex items-center gap-[6px] rounded-full bg-[#EAF4F6] px-[10px] py-[5px] font-semibold text-[#095866]">{{ activeFiltersCount }} filtri attivi</span>
						</div>
					</div>
				</div>

				<!-- Table -->
				<div class="bg-white border border-[#E9EBEC] rounded-[18px] overflow-hidden mb-[12px] shadow-sm">
					<!-- Header -->
					<div class="hidden desktop:grid grid-cols-[3%_10%_10%_9%_8%_10%_22%_7%_9%_12%] gap-[4px] px-[14px] py-[12px] text-[0.75rem] font-bold text-[#252B42] border-b border-[#D0D0D0] bg-[#FBFCFD]">
						<span class="flex items-center"><input type="checkbox" v-model="selectAll" @change="toggleSelectAll" class="w-[16px] h-[16px] accent-[#095866] cursor-pointer" /></span>
						<span>Data creazione</span><span>Provenienza</span><span>Riferimento</span><span>Servizio</span><span>Colli</span><span>Indirizzi</span><span>Accessori</span><span>Importo</span><span class="text-center">Azioni</span>
					</div>

					<!-- Rows -->
					<div v-if="paginatedItems.length > 0">
						<SpedizioniConfigurateDesktopRow
							v-for="(item, idx) in paginatedItems" :key="item.id"
							:item="item" :index="idx"
							:is-selected="selectedItems.includes(item.id)"
							:is-duplicate="isDuplicateDest(item)"
							:format-created-date="formatCreatedDate" :format-price="formatPrice" :get-package-icon="getPackageIcon"
							@toggle="toggleItem" @edit="openEdit" @delete="askDelete"
						/>
						<SpedizioniConfigurateMobileCard
							v-for="item in paginatedItems" :key="'m-'+item.id"
							:item="item"
							:is-selected="selectedItems.includes(item.id)"
							:is-duplicate="isDuplicateDest(item)"
							:format-created-date="formatCreatedDate" :format-price="formatPrice" :get-package-icon="getPackageIcon"
							@toggle="toggleItem" @edit="openEdit" @delete="askDelete"
						/>
					</div>

					<!-- Empty -->
					<div v-else class="p-[36px] text-center">
						<div class="w-[60px] h-[60px] mx-auto mb-[16px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
							<svg width="28" height="28" viewBox="0 0 24 24" fill="#C8CCD0"><path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5Z"/></svg>
						</div>
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[8px]">Nessuna spedizione configurata</h2>
						<p class="text-[#737373] text-[0.875rem] max-w-[400px] mx-auto mb-[20px] leading-[1.55]">Le spedizioni salvate appariranno qui. Puoi salvarle dalla pagina delle spedizioni o crearne una nuova.</p>
						<NuxtLink to="/preventivo" class="btn-primary btn-compact inline-flex items-center gap-[6px] text-[0.875rem]">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
							Crea nuova spedizione
						</NuxtLink>
					</div>

					<!-- Pagination -->
					<div class="flex flex-wrap items-center justify-center gap-[8px] py-[14px] border-t border-[#E9EBEC]">
						<button @click="prevPage" :disabled="currentPage <= 1" class="inline-flex items-center gap-[4px] text-[0.8125rem] font-medium text-[#252B42] hover:text-[#095866] disabled:text-[#C0C0C0] cursor-pointer disabled:cursor-not-allowed">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
							Precedente
						</button>
						<span v-for="page in totalPages" :key="page" @click="currentPage = page"
							:class="['w-[30px] h-[30px] flex items-center justify-center rounded-[6px] text-[0.8125rem] font-semibold cursor-pointer', currentPage === page ? 'bg-[#095866] text-white' : 'text-[#252B42] hover:bg-[#F0F0F0]']">{{ page }}</span>
						<button @click="nextPage" :disabled="currentPage >= totalPages" class="inline-flex items-center gap-[4px] text-[0.8125rem] font-medium text-[#252B42] hover:text-[#095866] disabled:text-[#C0C0C0] cursor-pointer disabled:cursor-not-allowed">
							Successivo
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
						</button>
					</div>
				</div>

				<!-- Bottom actions -->
				<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-[10px] sm:gap-[16px] mt-[16px]">
					<button @click="askBulkDelete" :disabled="selectedItems.length === 0 || bulkDeleteLoading" type="button"
						class="btn-danger inline-flex items-center justify-center gap-[6px] text-[0.875rem] px-[20px] desktop:px-[28px] h-[46px]">
						<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
						{{ bulkDeleteLoading ? 'Eliminazione...' : `Elimina${selectedItems.length ? ` (${selectedItems.length})` : ''}` }}
					</button>
					<button @click="bulkAddToCart" :disabled="selectedItems.length === 0 || addToCartLoading" type="button"
						class="btn-primary inline-flex items-center justify-center gap-[6px] text-[0.875rem] px-[20px] desktop:px-[28px] h-[46px]">
						<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/><line x1="16" y1="9" x2="16" y2="15"/><line x1="13" y1="12" x2="19" y2="12"/></svg>
						{{ addToCartLoading ? 'Aggiungendo...' : 'Aggiungi al carrello' }}
					</button>
				</div>
			</div>
		</div>

		<!-- Edit modal -->
		<SpedizioniConfigurateEditModal v-model:open="showEdit" :edit-item="editItem" :edit-form="editForm" :edit-saving="editSaving" @save="saveEdit" />

		<!-- Delete confirmations -->
		<AccountConfirmDialog v-model:open="showDeleteConfirm" title="Elimina spedizione configurata" description="Questa configurazione verra' rimossa dal tuo archivio personale. L'azione non si puo' annullare." confirm-label="Elimina spedizione" :loading="deleteLoading" @confirm="confirmDelete" />
		<AccountConfirmDialog v-model:open="showBulkDeleteConfirm" title="Elimina selezione" :description="`Stai per eliminare ${selectedItems.length} spedizion${selectedItems.length === 1 ? 'e configurata' : 'i configurate'}. L'azione non si puo' annullare.`" confirm-label="Elimina selezionate" :loading="bulkDeleteLoading" @confirm="bulkDelete" />
	</section>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
