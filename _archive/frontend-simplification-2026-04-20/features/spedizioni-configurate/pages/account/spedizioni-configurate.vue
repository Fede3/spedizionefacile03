<script setup>
definePageMeta({ middleware: ['app-auth'] });

useSeoMeta({
	title: 'Spedizioni configurate | SpediamoFacile',
	ogTitle: 'Spedizioni configurate | SpediamoFacile',
	description: 'Riprendi, modifica o elimina spedizioni salvate dalla tua area account SpediamoFacile.',
	ogDescription: 'Archivio delle spedizioni configurate e riutilizzabili su SpediamoFacile.',
	robots: 'noindex, nofollow',
});

const {
	savedStatus,
	filterProvenienza,
	filterRiferimento,
	filterDateFrom,
	filterDateTo,
	applyFilters,
	resetFilters,
	selectedItems,
	selectAll,
	toggleSelectAll,
	toggleItem,
	currentPage,
	totalPages,
	paginatedItems,
	totalShipmentsCount,
	visibleShipmentsCount,
	selectedShipmentsCount,
	activeFiltersCount,
	prevPage,
	nextPage,
	uniqueCities,
	showDeleteConfirm,
	deleteLoading,
	askDelete,
	confirmDelete,
	bulkDeleteLoading,
	showBulkDeleteConfirm,
	askBulkDelete,
	bulkDelete,
	addToCartLoading,
	bulkAddToCart,
	showEdit,
	editItem,
	editForm,
	editSaving,
	openEdit,
	saveEdit,
	feedbackMessage,
	feedbackType,
	formatPrice,
	isDuplicateDest,
	formatCreatedDate,
	getPackageIcon,
} = useSavedShipments();

const configuredShipmentsDescription = computed(() => {
	if (!totalShipmentsCount.value) {
		return 'Salva i modelli che riusi più spesso e ritrovali qui pronti per il carrello o per una modifica rapida.';
	}

	if (activeFiltersCount.value) {
		return 'Filtra, seleziona e riattiva in pochi clic le configurazioni giÁ  salvate.';
	}

	return 'Riusa, modifica o aggiungi al carrello i modelli salvati senza ripartire ogni volta da zero.';
});

const showBulkActions = computed(() => selectedItems.value.length > 0);
const showPagination = computed(() => totalPages.value > 1 && visibleShipmentsCount.value > 0);
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[20px] tablet:py-[24px] desktop:py-[28px]">
		<div class="my-container max-w-[1280px]">
			<AccountPageHeader
				eyebrow="Archivio"
				title="Spedizioni configurate"
				:description="configuredShipmentsDescription"
				back-to="/account"
				back-label="Torna al tuo account"
				current="Spedizioni configurate">
				<template #actions>
					<NuxtLink to="/preventivo" class="btn btn-cta inline-flex items-center justify-center">
						Nuova spedizione
					</NuxtLink>
				</template>
			</AccountPageHeader>

			<!-- Stats — metric card unificate -->
			<div class="mb-[20px] grid grid-cols-1 tablet:grid-cols-3 gap-[14px] sf-animate-in sf-animate-in-1">
				<div class="sf-account-metric-card">
					<div class="flex items-center gap-[10px]">
						<span class="sf-account-metric-card__icon">
							<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V5H19V19M17,12H15V14H13V12H11V14H9V12H7V10H9V8H11V10H13V8H15V10H17V12Z"/></svg>
						</span>
						<p class="sf-account-metric-card__label">Modelli pronti</p>
					</div>
					<p class="sf-account-metric-card__value">{{ totalShipmentsCount }}</p>
				</div>
				<div class="sf-account-metric-card">
					<div class="flex items-center gap-[10px]">
						<span class="sf-account-metric-card__icon">
							<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14,12V19.88C14.04,20.18 13.94,20.5 13.71,20.71C13.32,21.1 12.69,21.1 12.3,20.71L10.29,18.7C10.06,18.47 9.96,18.16 10,17.87V12H9.97L4.21,4.62C3.87,4.19 3.95,3.56 4.38,3.22C4.57,3.08 4.78,3 5,3V3H19V3C19.22,3 19.43,3.08 19.62,3.22C20.05,3.56 20.13,4.19 19.79,4.62L14.03,12H14Z"/></svg>
						</span>
						<p class="sf-account-metric-card__label">Filtri attivi</p>
					</div>
					<p class="sf-account-metric-card__value">{{ activeFiltersCount }}</p>
				</div>
				<div class="sf-account-metric-card">
					<div class="flex items-center gap-[10px]">
						<span class="sf-account-metric-card__icon">
							<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10.5,17L5.5,12L6.91,10.59L10.5,14.17L17.59,7.08L19,8.5L10.5,17Z"/></svg>
						</span>
						<p class="sf-account-metric-card__label">Selezionate</p>
					</div>
					<p class="sf-account-metric-card__value">{{ selectedShipmentsCount }}</p>
				</div>
			</div>

			<!-- Feedback -->
			<Transition name="fade">
				<div
					v-if="feedbackMessage"
					:class="['mb-[16px] ux-alert', feedbackType === 'success' ? 'ux-alert--success' : 'ux-alert--critical']">
					<svg
						v-if="feedbackType === 'success'"
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="currentColor"
						class="ux-alert__icon shrink-0"
						aria-hidden="true">
						<path
							d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z" />
					</svg>
					<svg
						v-else
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="currentColor"
						class="ux-alert__icon shrink-0"
						aria-hidden="true">
						<path
							d="M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z" />
					</svg>
					<span>{{ feedbackMessage }}</span>
				</div>
			</Transition>

			<!-- Loading: 3 card skeleton unificate via SfSkeleton -->
			<div v-if="savedStatus === 'pending'" class="space-y-[14px]" aria-busy="true">
				<div v-for="n in 3" :key="n" class="bg-white rounded-[16px] border border-dashed border-[rgba(9,88,102,0.12)] p-[16px]">
					<SfSkeleton variant="text-block" />
				</div>
			</div>

			<div v-else>
				<!-- Toolbar filtri -->
				<div class="sf-section-block mb-[16px] p-[16px] tablet:p-[18px_20px]">
					<div class="flex flex-col gap-[12px] tablet:flex-row tablet:items-start tablet:justify-between">
						<div class="min-w-0">
							<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-brand-text-muted)]">Filtri rapidi</p>
							<p class="mt-[2px] text-[0.9375rem] font-semibold text-[var(--color-brand-text)]">
								Filtra e trova le configurazioni gia salvate.
							</p>
						</div>
						<div class="flex flex-wrap items-center gap-[8px]">
							<button type="button"
								@click="resetFilters"
								
								class="btn-secondary btn-compact inline-flex items-center justify-center gap-[6px]">
								<svg aria-hidden="true"
									width="17"
									height="17"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round">
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
								Resetta
							</button>
							<button @click="applyFilters" type="button" class="btn-primary btn-compact inline-flex items-center justify-center gap-[6px]">
								<svg aria-hidden="true"
									width="17"
									height="17"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round">
									<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
								</svg>
								Applica filtro
							</button>
						</div>
					</div>

					<div class="mt-[12px] grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-[1.1fr_1fr_1fr] gap-[10px]">
						<div>
							<label class="form-label">Provenienza</label>
							<select v-model="filterProvenienza" class="form-input cursor-pointer">
								<option value="">Tutte le provenienze</option>
								<option v-for="city in uniqueCities" :key="city" :value="city">{{ city }}</option>
							</select>
						</div>
						<div>
							<label class="form-label">Riferimento</label>
							<input type="text" v-model="filterRiferimento" placeholder="Cerca per riferimento" class="form-input" />
						</div>
						<div class="grid grid-cols-2 gap-[10px] tablet:col-span-2 desktop:col-span-1">
							<div>
								<label class="form-label">Da</label>
								<input type="date" v-model="filterDateFrom" class="form-input" />
							</div>
							<div>
								<label class="form-label">A</label>
								<input type="date" v-model="filterDateTo" class="form-input" />
							</div>
						</div>
					</div>

					<div
						class="mt-[12px] flex flex-col gap-[10px] tablet:flex-row tablet:items-center tablet:justify-between border-t border-[rgba(9,88,102,0.06)] pt-[12px]">
						<div class="flex flex-wrap items-center gap-[8px] text-[0.75rem] text-[var(--color-brand-text-muted)]">
							<span class="inline-flex items-center gap-[6px] rounded-full bg-[#F5F6F9] px-[10px] py-[5px] font-semibold text-[var(--color-brand-text)]">
								Visibili {{ visibleShipmentsCount }}
							</span>
							<span class="inline-flex items-center gap-[6px] rounded-full bg-[#F5F6F9] px-[10px] py-[5px] font-semibold text-[var(--color-brand-text)]">
								{{ selectedShipmentsCount }} selezionate
							</span>
							<span
								v-if="activeFiltersCount"
								class="inline-flex items-center gap-[6px] rounded-full bg-[#EAF4F6] px-[10px] py-[5px] font-semibold text-[var(--color-brand-primary)]">
								{{ activeFiltersCount }} filtri attivi
							</span>
						</div>
					</div>
				</div>

				<!-- Table -->
				<div class="sf-section-block mb-[12px]">
					<!-- Header -->
					<div
						class="hidden desktop:grid grid-cols-[3%_10%_10%_9%_8%_10%_22%_7%_9%_12%] gap-[4px] px-[14px] py-[12px] text-[0.75rem] font-bold text-[var(--color-brand-text)] border-b border-[rgba(9,88,102,0.06)] bg-[#FBFCFD]">
						<span class="flex items-center">
							<input
								type="checkbox"
								v-model="selectAll"
								@change="toggleSelectAll"
								class="w-[16px] h-[16px] accent-[var(--color-brand-primary)] cursor-pointer" />
						</span>
						<span>Data creazione</span>
						<span>Provenienza</span>
						<span>Riferimento</span>
						<span>Servizio</span>
						<span>Colli</span>
						<span>Indirizzi</span>
						<span>Accessori</span>
						<span>Importo</span>
						<span class="text-center">Azioni</span>
					</div>

					<!-- Rows -->
					<div v-if="paginatedItems.length > 0">
						<SpedizioniConfigurateDesktopRow
							v-for="(item, idx) in paginatedItems"
							:key="item.id"
							:item="item"
							:index="idx"
							:is-selected="selectedItems.includes(item.id)"
							:is-duplicate="isDuplicateDest(item)"
							:format-created-date="formatCreatedDate"
							:format-price="formatPrice"
							:get-package-icon="getPackageIcon"
							@toggle="toggleItem"
							@edit="openEdit"
							@delete="askDelete" />
						<SpedizioniConfigurateMobileCard
							v-for="item in paginatedItems"
							:key="'m-' + item.id"
							:item="item"
							:is-selected="selectedItems.includes(item.id)"
							:is-duplicate="isDuplicateDest(item)"
							:format-created-date="formatCreatedDate"
							:format-price="formatPrice"
							:get-package-icon="getPackageIcon"
							@toggle="toggleItem"
							@edit="openEdit"
							@delete="askDelete" />
					</div>

					<!-- Empty — pattern sf-empty-state condiviso sitewide -->
					<div v-else class="sf-empty-state sf-empty-state--inset" role="status">
						<div class="sf-empty-state__icon" aria-hidden="true">
							<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
								<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
								<path d="m3.3 7 8.7 5 8.7-5" />
								<path d="M12 22V12" />
								<path d="M16 5.5 7.5 10" />
							</svg>
						</div>
						<h3 class="sf-empty-state__title">Nessuna configurazione salvata</h3>
						<p class="sf-empty-state__copy">
							I modelli che decidi di riusare appaiono qui. Puoi salvarli dal flusso spedizione oppure partire da un nuovo preventivo.
						</p>
						<div class="sf-empty-state__actions">
							<NuxtLink to="/preventivo" class="sf-empty-state__cta">
								<span>Crea nuova spedizione</span>
								<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
									<path d="M5 12h14" />
									<path d="m13 5 7 7-7 7" />
								</svg>
							</NuxtLink>
							<NuxtLink to="/account/spedizioni" class="sf-empty-state__cta sf-empty-state__cta--ghost">
								<span>Vedi spedizioni recenti</span>
							</NuxtLink>
						</div>
					</div>

					<!-- Pagination -->
					<div v-if="showPagination" class="flex flex-wrap items-center justify-center gap-[8px] py-[14px] border-t border-[rgba(9,88,102,0.06)]">
						<button type="button"
							@click="prevPage"
							:disabled="currentPage <= 1"
							class="inline-flex items-center gap-[4px] text-[0.8125rem] font-medium text-[var(--color-brand-text)] hover:text-[var(--color-brand-primary)] disabled:text-[#C0C0C0] cursor-pointer disabled:cursor-not-allowed">
							<svg aria-hidden="true"
								width="17"
								height="17"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round">
								<polyline points="15 18 9 12 15 6" />
							</svg>
							Precedente
						</button>
						<span
							v-for="page in totalPages"
							:key="page"
							@click="currentPage = page"
							:class="[
								'w-[30px] h-[30px] flex items-center justify-center rounded-[6px] text-[0.8125rem] font-semibold cursor-pointer',
								currentPage === page ? 'bg-[var(--color-brand-primary)] text-white' : 'text-[var(--color-brand-text)] hover:bg-[rgba(9,88,102,0.06)]',
							]">
							{{ page }}
						</span>
						<button type="button"
							@click="nextPage"
							:disabled="currentPage >= totalPages"
							class="inline-flex items-center gap-[4px] text-[0.8125rem] font-medium text-[var(--color-brand-text)] hover:text-[var(--color-brand-primary)] disabled:text-[#C0C0C0] cursor-pointer disabled:cursor-not-allowed">
							Successivo
							<svg aria-hidden="true"
								width="17"
								height="17"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round">
								<polyline points="9 18 15 12 9 6" />
							</svg>
						</button>
					</div>
				</div>

				<!-- Bottom actions -->
				<div v-if="showBulkActions" class="sf-section-block flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-[10px] sm:gap-[16px] mt-[16px] p-[14px_18px]">
					<p class="text-[0.8125rem] text-[var(--color-brand-text-secondary)]">
						<span class="font-[700] text-[var(--color-brand-text)]">{{ selectedItems.length }}</span>
						{{ selectedItems.length === 1 ? 'spedizione selezionata' : 'spedizioni selezionate' }}
					</p>
					<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-[10px]">
						<button type="button"
							@click="askBulkDelete"
							:disabled="selectedItems.length === 0 || bulkDeleteLoading"
							class="btn btn-secondary btn-sm inline-flex items-center justify-center"
							style="color:#B91C1C;border-color:rgba(185,28,28,0.22);">
							<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="3 6 5 6 21 6" />
								<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
							</svg>
							{{ bulkDeleteLoading ? 'Eliminazione...' : `Elimina${selectedItems.length ? ` (${selectedItems.length})` : ''}` }}
						</button>
						<button type="button"
							@click="bulkAddToCart"
							:disabled="selectedItems.length === 0 || addToCartLoading"
							class="btn btn-cta btn-sm inline-flex items-center justify-center">
							<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="9" cy="21" r="1" />
								<circle cx="20" cy="21" r="1" />
								<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
								<line x1="16" y1="9" x2="16" y2="15" />
								<line x1="13" y1="12" x2="19" y2="12" />
							</svg>
							{{ addToCartLoading ? 'Aggiungendo...' : 'Aggiungi al carrello' }}
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Edit modal -->
		<SpedizioniConfigurateEditModal
			v-model:open="showEdit"
			:edit-item="editItem"
			:edit-form="editForm"
			:edit-saving="editSaving"
			@save="saveEdit" />

		<!-- Delete confirmations -->
		<AccountConfirmDialog
			v-model:open="showDeleteConfirm"
			title="Elimina spedizione configurata"
			description="Questa configurazione verra' rimossa dal tuo archivio personale. L'azione non si può annullare."
			confirm-label="Elimina spedizione"
			:loading="deleteLoading"
			@confirm="confirmDelete" />
		<AccountConfirmDialog
			v-model:open="showBulkDeleteConfirm"
			title="Elimina selezione"
			:description="`Stai per eliminare ${selectedItems.length} spedizion${selectedItems.length === 1 ? 'e configurata' : 'i configurate'}. L'azione non si può annullare.`"
			confirm-label="Elimina selezionate"
			:loading="bulkDeleteLoading"
			@confirm="bulkDelete" />
	</section>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>

