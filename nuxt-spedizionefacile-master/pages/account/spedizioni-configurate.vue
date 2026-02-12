<script setup>
definePageMeta({
	middleware: ["sanctum:auth"],
});

const sanctum = useSanctumClient();
const router = useRouter();

// Fetch saved shipments
const { data: savedShipments, refresh, status: savedStatus } = useSanctumFetch("/api/saved-shipments", {
	method: "GET",
});

// Filters
const filterProvenienza = ref('');
const filterRiferimento = ref('');
const filterDateFrom = ref('');
const filterDateTo = ref('');
const filtersApplied = ref(false);

const applyFilters = () => { filtersApplied.value = true; };
const resetFilters = () => {
	filterProvenienza.value = '';
	filterRiferimento.value = '';
	filterDateFrom.value = '';
	filterDateTo.value = '';
	filtersApplied.value = false;
};

// Selection
const selectedItems = ref([]);
const selectAll = ref(false);

const toggleSelectAll = () => {
	if (selectAll.value) {
		selectedItems.value = filteredItems.value.map(item => item.id);
	} else {
		selectedItems.value = [];
	}
};

const toggleItem = (id) => {
	const idx = selectedItems.value.indexOf(id);
	if (idx > -1) {
		selectedItems.value.splice(idx, 1);
	} else {
		selectedItems.value.push(id);
	}
	selectAll.value = selectedItems.value.length === filteredItems.value.length;
};

// Pagination
const currentPage = ref(1);
const itemsPerPage = 10;

const filteredItems = computed(() => {
	if (!savedShipments.value?.data) return [];
	let items = [...savedShipments.value.data];

	if (filtersApplied.value) {
		if (filterProvenienza.value) {
			items = items.filter(item =>
				item.origin_address?.city?.toLowerCase().includes(filterProvenienza.value.toLowerCase())
			);
		}
		if (filterRiferimento.value) {
			items = items.filter(item =>
				(item.services?.service_type || '').toLowerCase().includes(filterRiferimento.value.toLowerCase()) ||
				String(item.id).includes(filterRiferimento.value)
			);
		}
	}

	return items;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredItems.value.length / itemsPerPage)));

const paginatedItems = computed(() => {
	const start = (currentPage.value - 1) * itemsPerPage;
	return filteredItems.value.slice(start, start + itemsPerPage);
});

const prevPage = () => { if (currentPage.value > 1) currentPage.value--; };
const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++; };

const uniqueCities = computed(() => {
	if (!savedShipments.value?.data) return [];
	const cities = savedShipments.value.data.map(item => item.origin_address?.city).filter(Boolean);
	return [...new Set(cities)];
});

// Delete
const showDeleteConfirm = ref(false);
const deleteTargetId = ref(null);
const deleteLoading = ref(false);

const askDelete = (id) => {
	deleteTargetId.value = id;
	showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
	deleteLoading.value = true;
	try {
		await sanctum(`/api/saved-shipments/${deleteTargetId.value}`, { method: "DELETE" });
		await refresh();
	} catch (e) {
		console.error(e);
	} finally {
		deleteLoading.value = false;
		showDeleteConfirm.value = false;
		deleteTargetId.value = null;
	}
};

// Bulk delete
const bulkDelete = async () => {
	if (!selectedItems.value.length) return;
	for (const id of selectedItems.value) {
		try {
			await sanctum(`/api/saved-shipments/${id}`, { method: "DELETE" });
		} catch (e) { /* silent */ }
	}
	selectedItems.value = [];
	selectAll.value = false;
	await refresh();
};

// Add to cart
const addToCartLoading = ref(false);
const bulkAddToCart = async () => {
	if (!selectedItems.value.length) return;
	addToCartLoading.value = true;
	try {
		await sanctum('/api/saved-shipments/add-to-cart', {
			method: 'POST',
			body: { package_ids: selectedItems.value },
		});
		selectedItems.value = [];
		selectAll.value = false;
		await refresh();
		router.push('/carrello');
	} catch (e) {
		console.error(e);
	} finally {
		addToCartLoading.value = false;
	}
};

// Detail popup
const showDetail = ref(false);
const detailItem = ref(null);

const openDetail = (item) => {
	detailItem.value = item;
	showDetail.value = true;
};

const formatPrice = (cents) => {
	if (!cents && cents !== 0) return '—';
	return (Number(cents) / 100).toFixed(2).replace('.', ',') + '€';
};

const formatCreatedDate = (item) => {
	if (item.created_at) {
		return new Date(item.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
	}
	return new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getPackageIcon = (item) => {
	const type = item.package_type?.toLowerCase() || '';
	if (type.includes('pallet')) return '/img/quote/first-step/pallet.png';
	if (type.includes('busta')) return '/img/quote/first-step/envelope.png';
	return '/img/quote/first-step/pack.png';
};
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[80px]">
		<div class="my-container max-w-[1200px]">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866]">Il tuo account</NuxtLink>
				<span class="mx-[6px]">/</span>
				<span class="font-semibold text-[#252B42]">Spedizioni configurate</span>
			</div>

			<div class="flex items-center justify-between mb-[24px]">
				<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42]">Spedizioni configurate</h1>
				<NuxtLink
					to="/preventivo"
					class="inline-flex items-center gap-[6px] px-[20px] h-[42px] rounded-[12px] bg-[#E44203] text-white text-[0.875rem] font-semibold hover:opacity-90 transition">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					Nuova spedizione
				</NuxtLink>
			</div>

			<!-- Loading -->
			<div v-if="savedStatus === 'pending'" class="space-y-[12px]">
				<div v-for="n in 3" :key="n" class="bg-white rounded-[16px] border border-[#E9EBEC] p-[20px] animate-pulse">
					<div class="h-[14px] bg-gray-200 rounded w-[60%] mb-[8px]"></div>
					<div class="h-[12px] bg-gray-200 rounded w-[40%]"></div>
				</div>
			</div>

			<!-- Has items -->
			<div v-else-if="filteredItems.length > 0 || savedShipments?.data?.length > 0">
				<!-- Filter Bar -->
				<div class="bg-[#F0F0F0] rounded-[16px] p-[20px_24px] mb-[16px]">
					<div class="flex flex-wrap gap-[12px] items-end">
						<div class="flex-1 min-w-[180px]">
							<select v-model="filterProvenienza" class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[42px] px-[16px] text-[0.875rem] text-[#404040] appearance-none cursor-pointer">
								<option value="">Provenienza</option>
								<option v-for="city in uniqueCities" :key="city" :value="city">{{ city }}</option>
							</select>
						</div>
						<div class="flex-1 min-w-[180px]">
							<input type="text" v-model="filterRiferimento" placeholder="Riferimento" class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[42px] px-[16px] text-[0.875rem] text-[#404040] placeholder:text-[#999]" />
						</div>
					</div>
					<div class="flex flex-wrap gap-[12px] items-center mt-[12px]">
						<div class="flex-1 min-w-[150px]">
							<input type="date" v-model="filterDateFrom" class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[42px] px-[16px] text-[0.875rem] text-[#404040]" />
						</div>
						<div class="flex-1 min-w-[150px]">
							<input type="date" v-model="filterDateTo" class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[42px] px-[16px] text-[0.875rem] text-[#404040]" />
						</div>
						<button @click="resetFilters" type="button" class="bg-[#E44203] text-white font-semibold text-[0.875rem] px-[24px] h-[42px] rounded-[30px] hover:opacity-90 transition cursor-pointer">Annulla</button>
						<button @click="applyFilters" type="button" class="bg-[#252B42] text-white font-semibold text-[0.875rem] px-[24px] h-[42px] rounded-[30px] hover:opacity-90 transition cursor-pointer">Applica filtro</button>
					</div>
				</div>

				<!-- CSV Upload -->
				<div class="mb-[16px]">
					<button type="button" class="bg-[#252B42] text-white font-semibold text-[0.875rem] px-[24px] h-[42px] rounded-[30px] hover:opacity-90 transition cursor-pointer inline-flex items-center gap-[8px]">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
						Carica da file CSV
					</button>
				</div>

				<!-- Table -->
				<div class="bg-white rounded-[16px] border border-[#E9EBEC] overflow-hidden">
					<div class="hidden desktop:grid grid-cols-[40px_110px_100px_100px_80px_80px_140px_80px_90px_60px_100px] gap-[8px] px-[16px] py-[12px] text-[0.75rem] font-bold text-[#252B42] border-b-[2px] border-[#E44203]">
						<span class="flex items-center">
							<input type="checkbox" v-model="selectAll" @change="toggleSelectAll" class="w-[16px] h-[16px] accent-[#095866] cursor-pointer" />
						</span>
						<span>Data creazione</span>
						<span>Provenienza</span>
						<span>Riferimento</span>
						<span>Servizio</span>
						<span>Colli</span>
						<span>Indirizzi</span>
						<span>Accessori</span>
						<span>Importo</span>
						<span>Errore</span>
						<span class="text-center"></span>
					</div>

					<div>
						<div
							v-for="item in paginatedItems"
							:key="item.id"
							class="hidden desktop:grid grid-cols-[40px_110px_100px_100px_80px_80px_140px_80px_90px_60px_100px] gap-[8px] items-center px-[16px] py-[12px] border-b border-[#E9EBEC] hover:bg-[#F8F9FB] transition-colors text-[0.8125rem] text-[#252B42]">
							<span class="flex items-center">
								<input type="checkbox" :checked="selectedItems.includes(item.id)" @change="toggleItem(item.id)" class="w-[16px] h-[16px] accent-[#095866] cursor-pointer" />
							</span>
							<span>{{ formatCreatedDate(item) }}</span>
							<span>{{ item.origin_address?.city || '—' }}</span>
							<span>{{ item.id }}</span>
							<span>{{ item.services?.service_type?.split(',')[0]?.trim() || 'BRT' }}</span>
							<span class="flex items-center gap-[4px]">
								{{ item.quantity || 1 }} x
								<NuxtImg :src="getPackageIcon(item)" alt="" width="18" height="18" />
							</span>
							<span class="text-[0.75rem]">
								<div class="flex items-center gap-[4px]">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
									<span class="truncate">{{ item.origin_address?.name || '—' }} - {{ item.origin_address?.city || '' }}</span>
								</div>
								<div class="flex items-center gap-[4px] mt-[2px]">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
									<span class="truncate">{{ item.destination_address?.name || '—' }} - {{ item.destination_address?.city || '' }}</span>
								</div>
							</span>
							<span class="text-[#737373]">......</span>
							<span class="font-semibold">{{ formatPrice(item.single_price) }}</span>
							<span class="text-[#737373]">......</span>
							<span class="flex items-center justify-end gap-[6px]">
								<button type="button" @click="openDetail(item)" title="Modifica" class="w-[28px] h-[28px] flex items-center justify-center cursor-pointer hover:opacity-70">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#252B42" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
								</button>
								<button type="button" @click="openDetail(item)" title="Anteprima" class="w-[28px] h-[28px] flex items-center justify-center cursor-pointer hover:opacity-70">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#252B42" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
								</button>
								<button type="button" @click="askDelete(item.id)" title="Elimina" class="w-[28px] h-[28px] flex items-center justify-center cursor-pointer hover:opacity-70">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#252B42" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
								</button>
							</span>
						</div>

						<!-- Mobile -->
						<div v-for="item in paginatedItems" :key="'m-'+item.id" class="desktop:hidden p-[16px] border-b border-[#E9EBEC]">
							<div class="flex items-center justify-between mb-[12px]">
								<div class="flex items-center gap-[10px]">
									<input type="checkbox" :checked="selectedItems.includes(item.id)" @change="toggleItem(item.id)" class="w-[16px] h-[16px] accent-[#095866] cursor-pointer" />
									<div>
										<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.origin_address?.city || 'Partenza' }} &rarr; {{ item.destination_address?.city || 'Destinazione' }}</p>
										<p class="text-[0.75rem] text-[#737373]">{{ item.quantity }}x - {{ item.weight }} kg</p>
									</div>
								</div>
								<span class="text-[0.9375rem] font-bold text-[#252B42]">{{ formatPrice(item.single_price) }}</span>
							</div>
							<div class="flex gap-[8px] justify-end">
								<button @click="openDetail(item)" class="text-[0.75rem] text-[#095866] font-semibold hover:underline cursor-pointer">Dettagli</button>
								<button @click="askDelete(item.id)" class="text-[0.75rem] text-red-500 font-semibold hover:underline cursor-pointer">Elimina</button>
							</div>
						</div>
					</div>

					<!-- Pagination -->
					<div class="flex items-center justify-center gap-[8px] py-[16px] border-t border-[#E9EBEC]">
						<button @click="prevPage" :disabled="currentPage <= 1" class="text-[0.875rem] font-medium text-[#252B42] hover:text-[#095866] disabled:text-[#C0C0C0] cursor-pointer disabled:cursor-not-allowed">Precedente</button>
						<span
							v-for="page in totalPages"
							:key="page"
							@click="currentPage = page"
							:class="['w-[32px] h-[32px] flex items-center justify-center rounded-[6px] text-[0.875rem] font-semibold cursor-pointer', currentPage === page ? 'bg-[#E44203] text-white' : 'text-[#252B42] hover:bg-[#F0F0F0]']">
							{{ page }}
						</span>
						<button @click="nextPage" :disabled="currentPage >= totalPages" class="text-[0.875rem] font-medium text-[#252B42] hover:text-[#095866] disabled:text-[#C0C0C0] cursor-pointer disabled:cursor-not-allowed">Successivo</button>
					</div>
				</div>

				<!-- Bottom buttons -->
				<div class="flex items-center justify-center gap-[24px] mt-[24px]">
					<button @click="bulkDelete" :disabled="selectedItems.length === 0" type="button" class="bg-[#996D47] text-white font-semibold text-[0.9375rem] px-[32px] h-[48px] rounded-[8px] hover:opacity-90 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">Elimina</button>
					<button @click="bulkAddToCart" :disabled="selectedItems.length === 0 || addToCartLoading" type="button" class="bg-[#252B42] text-white font-semibold text-[0.9375rem] px-[32px] h-[48px] rounded-[8px] hover:opacity-90 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
						{{ addToCartLoading ? 'Aggiungendo...' : 'Aggiungi al carrello' }}
					</button>
				</div>
			</div>

			<!-- Empty state -->
			<div v-else class="bg-white rounded-[16px] p-[48px] border border-[#E9EBEC] text-center">
				<div class="w-[72px] h-[72px] mx-auto mb-[20px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" class="text-[#C8CCD0]"><path fill="currentColor" d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18c-.21 0-.41-.06-.57-.18l-7.9-4.44A.99.99 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18c.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88zM12 4.15L6.04 7.5L12 10.85l5.96-3.35zM5 15.91l6 3.37v-6.73L5 9.18zm14 0V9.18l-6 3.37v6.73z"/></svg>
				</div>
				<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Nessuna spedizione configurata</h2>
				<p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto mb-[24px] leading-[1.6]">
					Non hai ancora salvato nessuna spedizione configurata.
				</p>
				<NuxtLink to="/preventivo" class="inline-block px-[24px] py-[12px] bg-[#095866] hover:bg-[#0a7a8c] text-white rounded-[10px] font-semibold text-[0.9375rem] transition-colors">Crea nuova spedizione</NuxtLink>
			</div>
		</div>

		<!-- Detail popup -->
		<UModal v-model:open="showDetail" :dismissible="true" :close="false">
			<template #title>
				<div class="flex items-center justify-between">
					<h3 class="text-[1.125rem] font-bold text-[#252B42]">Dettagli spedizione</h3>
					<button type="button" @click="showDetail = false" class="text-[#737373] hover:text-[#252B42] cursor-pointer">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
				</div>
			</template>
			<template #body>
				<div v-if="detailItem" class="space-y-[16px]">
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<h4 class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[8px]">Partenza</h4>
						<p class="text-[0.9375rem] font-semibold text-[#252B42]">{{ detailItem.origin_address?.name }}</p>
						<p class="text-[0.8125rem] text-[#404040]">{{ detailItem.origin_address?.address }} {{ detailItem.origin_address?.address_number }}</p>
						<p class="text-[0.8125rem] text-[#404040]">{{ detailItem.origin_address?.postal_code }} {{ detailItem.origin_address?.city }} <span v-if="detailItem.origin_address?.province">({{ detailItem.origin_address?.province }})</span></p>
						<p v-if="detailItem.origin_address?.telephone_number" class="text-[0.75rem] text-[#737373] mt-[4px]">Tel: {{ detailItem.origin_address?.telephone_number }}</p>
					</div>
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<h4 class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[8px]">Destinazione</h4>
						<p class="text-[0.9375rem] font-semibold text-[#252B42]">{{ detailItem.destination_address?.name }}</p>
						<p class="text-[0.8125rem] text-[#404040]">{{ detailItem.destination_address?.address }} {{ detailItem.destination_address?.address_number }}</p>
						<p class="text-[0.8125rem] text-[#404040]">{{ detailItem.destination_address?.postal_code }} {{ detailItem.destination_address?.city }} <span v-if="detailItem.destination_address?.province">({{ detailItem.destination_address?.province }})</span></p>
						<p v-if="detailItem.destination_address?.telephone_number" class="text-[0.75rem] text-[#737373] mt-[4px]">Tel: {{ detailItem.destination_address?.telephone_number }}</p>
					</div>
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<h4 class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[8px]">Collo</h4>
						<div class="grid grid-cols-2 gap-[8px] text-[0.8125rem] text-[#252B42]">
							<p><span class="text-[#737373]">Tipo:</span> {{ detailItem.package_type }}</p>
							<p><span class="text-[#737373]">Quantità:</span> {{ detailItem.quantity }}</p>
							<p><span class="text-[#737373]">Peso:</span> {{ detailItem.weight }} kg</p>
							<p><span class="text-[#737373]">Dimensioni:</span> {{ detailItem.first_size }}&times;{{ detailItem.second_size }}&times;{{ detailItem.third_size }} cm</p>
						</div>
					</div>
					<div class="bg-[#095866]/5 rounded-[12px] p-[16px] flex items-center justify-between">
						<span class="text-[0.875rem] font-bold text-[#252B42]">Importo</span>
						<span class="text-[1.25rem] font-bold text-[#095866]">{{ formatPrice(detailItem.single_price) }}</span>
					</div>
				</div>
			</template>
		</UModal>

		<!-- Delete confirm popup -->
		<UModal v-model:open="showDeleteConfirm" :dismissible="true" :close="false">
			<template #title>
				<h3 class="text-[1.125rem] font-bold text-[#252B42]">Conferma eliminazione</h3>
			</template>
			<template #body>
				<p class="text-[0.9375rem] text-[#737373] leading-[1.6]">
					Sei sicuro di voler eliminare questa spedizione configurata? L'azione non può essere annullata.
				</p>
			</template>
			<template #footer>
				<div class="flex justify-end gap-[10px]">
					<button type="button" @click="showDeleteConfirm = false" class="px-[20px] py-[10px] rounded-[10px] border border-[#E9EBEC] text-[#737373] hover:bg-[#F8F9FB] transition text-[0.875rem] font-medium cursor-pointer">Annulla</button>
					<button type="button" @click="confirmDelete" :disabled="deleteLoading" class="px-[20px] py-[10px] rounded-[10px] bg-red-500 text-white hover:bg-red-600 transition text-[0.875rem] font-semibold disabled:opacity-60 cursor-pointer">
						{{ deleteLoading ? 'Eliminazione...' : 'Elimina' }}
					</button>
				</div>
			</template>
		</UModal>
	</section>
</template>
