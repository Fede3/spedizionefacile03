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
	selectAll.value = selectedItems.value.length === filteredItems.value.length && filteredItems.value.length > 0;
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
				String(item.id).includes(filterRiferimento.value)
			);
		}
		if (filterDateFrom.value) {
			const from = new Date(filterDateFrom.value);
			items = items.filter(item => {
				const d = item.created_at ? new Date(item.created_at) : new Date();
				return d >= from;
			});
		}
		if (filterDateTo.value) {
			const to = new Date(filterDateTo.value);
			to.setHours(23, 59, 59);
			items = items.filter(item => {
				const d = item.created_at ? new Date(item.created_at) : new Date();
				return d <= to;
			});
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

// Edit popup
const showEdit = ref(false);
const editItem = ref(null);
const editForm = ref({});
const editSaving = ref(false);

const openEdit = (item) => {
	editItem.value = item;
	editForm.value = {
		origin_name: item.origin_address?.name || '',
		origin_address: item.origin_address?.address || '',
		origin_address_number: item.origin_address?.address_number || '',
		origin_city: item.origin_address?.city || '',
		origin_postal_code: item.origin_address?.postal_code || '',
		origin_province: item.origin_address?.province || '',
		origin_telephone: item.origin_address?.telephone_number || '',
		dest_name: item.destination_address?.name || '',
		dest_address: item.destination_address?.address || '',
		dest_address_number: item.destination_address?.address_number || '',
		dest_city: item.destination_address?.city || '',
		dest_postal_code: item.destination_address?.postal_code || '',
		dest_province: item.destination_address?.province || '',
		dest_telephone: item.destination_address?.telephone_number || '',
		package_type: item.package_type || '',
		quantity: item.quantity || 1,
		weight: item.weight || '',
		first_size: item.first_size || '',
		second_size: item.second_size || '',
		third_size: item.third_size || '',
	};
	showEdit.value = true;
};

const saveEdit = async () => {
	if (!editItem.value) return;
	editSaving.value = true;
	try {
		await sanctum(`/api/saved-shipments/${editItem.value.id}`, {
			method: 'PUT',
			body: {
				origin_address: {
					name: editForm.value.origin_name,
					address: editForm.value.origin_address,
					address_number: editForm.value.origin_address_number,
					city: editForm.value.origin_city,
					postal_code: editForm.value.origin_postal_code,
					province: editForm.value.origin_province,
					telephone_number: editForm.value.origin_telephone,
				},
				destination_address: {
					name: editForm.value.dest_name,
					address: editForm.value.dest_address,
					address_number: editForm.value.dest_address_number,
					city: editForm.value.dest_city,
					postal_code: editForm.value.dest_postal_code,
					province: editForm.value.dest_province,
					telephone_number: editForm.value.dest_telephone,
				},
				package_type: editForm.value.package_type,
				quantity: editForm.value.quantity,
				weight: editForm.value.weight,
				first_size: editForm.value.first_size,
				second_size: editForm.value.second_size,
				third_size: editForm.value.third_size,
			},
		});
		await refresh();
		showEdit.value = false;
	} catch (e) {
		console.error(e);
	} finally {
		editSaving.value = false;
	}
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
	<section class="min-h-[600px] py-[40px] desktop:py-[60px]">
		<div class="my-container max-w-[1200px]">
			<!-- Title -->
			<h1 class="text-[2rem] font-bold text-black text-center mb-[32px] font-montserrat">Spedizioni configurate</h1>

			<!-- Loading -->
			<div v-if="savedStatus === 'pending'" class="space-y-[12px]">
				<div v-for="n in 3" :key="n" class="bg-white rounded-[8px] border border-dashed border-[#A8C4D0] p-[20px] animate-pulse">
					<div class="h-[14px] bg-gray-200 rounded w-[60%] mb-[8px]"></div>
					<div class="h-[12px] bg-gray-200 rounded w-[40%]"></div>
				</div>
			</div>

			<!-- Content -->
			<div v-else>
				<!-- Filter section 1: Provenienza + Riferimento -->
				<div class="border border-dashed border-[#A8C4D0] rounded-[8px] p-[20px_24px] mb-[12px]">
					<div class="flex flex-wrap gap-[20px] items-center">
						<div class="flex-1 min-w-[200px] max-w-[450px]">
							<select v-model="filterProvenienza" class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[44px] px-[18px] text-[0.875rem] text-[#404040] appearance-none cursor-pointer">
								<option value="">Provenienza</option>
								<option v-for="city in uniqueCities" :key="city" :value="city">{{ city }}</option>
							</select>
						</div>
						<div class="flex-1 min-w-[200px] max-w-[450px]">
							<input type="text" v-model="filterRiferimento" placeholder="Riferimento" class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[44px] px-[18px] text-[0.875rem] text-[#404040] placeholder:text-[#999]" />
						</div>
					</div>
				</div>

				<!-- Filter section 2: Date range + buttons -->
				<div class="border border-dashed border-[#A8C4D0] rounded-[8px] p-[20px_24px] mb-[12px]">
					<div class="flex flex-wrap gap-[16px] items-center">
						<div class="flex-1 min-w-[180px] max-w-[280px]">
							<input type="date" v-model="filterDateFrom" placeholder="Da: (data creazione)" class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[44px] px-[18px] text-[0.875rem] text-[#404040]" />
						</div>
						<div class="flex-1 min-w-[180px] max-w-[280px]">
							<input type="date" v-model="filterDateTo" placeholder="A: (data creazione)" class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[44px] px-[18px] text-[0.875rem] text-[#404040]" />
						</div>
						<div class="flex gap-[12px] ml-auto">
							<button @click="resetFilters" type="button" class="bg-[#996D47] text-white font-semibold text-[0.9375rem] px-[28px] h-[44px] rounded-[30px] hover:opacity-90 transition cursor-pointer">Annulla</button>
							<button @click="applyFilters" type="button" class="bg-[#252B42] text-white font-semibold text-[0.9375rem] px-[28px] h-[44px] rounded-[30px] hover:opacity-90 transition cursor-pointer">Applica filtro</button>
						</div>
					</div>
				</div>

				<!-- CSV upload section -->
				<div class="border border-dashed border-[#A8C4D0] rounded-[8px] p-[20px_24px] mb-[12px]">
					<button type="button" class="bg-[#252B42] text-white font-semibold text-[0.9375rem] px-[28px] h-[44px] rounded-[30px] hover:opacity-90 transition cursor-pointer">
						Carica da file CSV
					</button>
				</div>

				<!-- Table section -->
				<div class="border border-dashed border-[#A8C4D0] rounded-[8px] overflow-hidden mb-[12px]">
					<!-- Table header -->
					<div class="hidden desktop:grid grid-cols-[40px_110px_100px_90px_80px_80px_160px_80px_90px_60px] gap-[8px] px-[16px] py-[12px] text-[0.8125rem] font-bold text-[#252B42] border-b border-[#D0D0D0]">
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
					</div>

					<!-- Table rows -->
					<div v-if="paginatedItems.length > 0">
						<div
							v-for="item in paginatedItems"
							:key="item.id"
							@dblclick="openEdit(item)"
							class="hidden desktop:grid grid-cols-[40px_110px_100px_90px_80px_80px_160px_80px_90px_60px] gap-[8px] items-center px-[16px] py-[12px] border-b border-[#E9EBEC] hover:bg-[#F8F9FB] transition-colors text-[0.8125rem] text-[#252B42] cursor-pointer">
							<span class="flex items-center">
								<input type="checkbox" :checked="selectedItems.includes(item.id)" @change="toggleItem(item.id)" class="w-[16px] h-[16px] accent-[#095866] cursor-pointer" />
							</span>
							<span>{{ formatCreatedDate(item) }}</span>
							<span>{{ item.origin_address?.city || '—' }}</span>
							<span class="text-[#737373]">......</span>
							<span>{{ item.services?.service_type?.split(',')[0]?.trim() || 'BRT' }}</span>
							<span class="flex items-center gap-[4px]">
								{{ item.quantity || 1 }} x
								<NuxtImg :src="getPackageIcon(item)" alt="" width="20" height="22" />
							</span>
							<span class="text-[0.75rem]">
								<div class="flex items-center gap-[4px]">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#996D47" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
									<span class="truncate">{{ item.origin_address?.name?.split(' ')[0] || '—' }} - {{ item.origin_address?.city || '' }}</span>
								</div>
								<div class="flex items-center gap-[4px] mt-[2px]">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#996D47" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
									<span class="truncate">{{ item.destination_address?.name?.split(' ')[0] || '—' }} - {{ item.destination_address?.city || '' }}</span>
								</div>
							</span>
							<span class="text-[#737373]">......</span>
							<span class="font-semibold">{{ formatPrice(item.single_price) }}</span>
							<span class="text-[#737373]">......</span>
						</div>

						<!-- Mobile rows -->
						<div v-for="item in paginatedItems" :key="'m-'+item.id" class="desktop:hidden p-[16px] border-b border-[#E9EBEC]">
							<div class="flex items-center justify-between mb-[10px]">
								<div class="flex items-center gap-[10px]">
									<input type="checkbox" :checked="selectedItems.includes(item.id)" @change="toggleItem(item.id)" class="w-[16px] h-[16px] accent-[#095866] cursor-pointer" />
									<div>
										<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.origin_address?.city || 'Partenza' }} &rarr; {{ item.destination_address?.city || 'Dest.' }}</p>
										<p class="text-[0.75rem] text-[#737373]">{{ item.quantity }}x - {{ item.weight }} kg - {{ formatCreatedDate(item) }}</p>
									</div>
								</div>
								<span class="text-[0.9375rem] font-bold text-[#252B42]">{{ formatPrice(item.single_price) }}</span>
							</div>
							<div class="flex gap-[12px] justify-end">
								<button @click="openEdit(item)" class="text-[0.75rem] text-[#095866] font-semibold hover:underline cursor-pointer">Modifica</button>
								<button @click="askDelete(item.id)" class="text-[0.75rem] text-red-500 font-semibold hover:underline cursor-pointer">Elimina</button>
							</div>
						</div>
					</div>

					<!-- Empty table -->
					<div v-else class="p-[40px] text-center text-[#737373] text-[0.9375rem]">
						Nessuna spedizione configurata trovata.
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

				<!-- Bottom action buttons -->
				<div class="flex items-center justify-center gap-[24px] mt-[20px]">
					<button @click="bulkDelete" :disabled="selectedItems.length === 0" type="button" class="bg-[#996D47] text-white font-semibold text-[0.9375rem] px-[36px] h-[48px] rounded-[30px] hover:opacity-90 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">Elimina</button>
					<button @click="bulkAddToCart" :disabled="selectedItems.length === 0 || addToCartLoading" type="button" class="bg-[#252B42] text-white font-semibold text-[0.9375rem] px-[36px] h-[48px] rounded-[30px] hover:opacity-90 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
						{{ addToCartLoading ? 'Aggiungendo...' : 'Aggiungi al carrello' }}
					</button>
				</div>
			</div>
		</div>

		<!-- Edit popup -->
		<UModal v-model:open="showEdit" :dismissible="true" :close="false">
			<template #title>
				<div class="flex items-center justify-between">
					<h3 class="text-[1.125rem] font-bold text-[#252B42]">Modifica spedizione</h3>
					<button type="button" @click="showEdit = false" class="text-[#737373] hover:text-[#252B42] cursor-pointer">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
				</div>
			</template>
			<template #body>
				<div v-if="editItem" class="space-y-[16px]">
					<!-- Partenza -->
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<h4 class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[10px]">Partenza</h4>
						<div class="grid grid-cols-2 gap-[8px]">
							<input v-model="editForm.origin_name" placeholder="Nome e Cognome" class="col-span-2 bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.origin_address" placeholder="Indirizzo" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.origin_address_number" placeholder="N. civico" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.origin_city" placeholder="Citta" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.origin_postal_code" placeholder="CAP" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.origin_province" placeholder="Provincia" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.origin_telephone" placeholder="Telefono" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
						</div>
					</div>
					<!-- Destinazione -->
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<h4 class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[10px]">Destinazione</h4>
						<div class="grid grid-cols-2 gap-[8px]">
							<input v-model="editForm.dest_name" placeholder="Nome e Cognome" class="col-span-2 bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.dest_address" placeholder="Indirizzo" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.dest_address_number" placeholder="N. civico" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.dest_city" placeholder="Citta" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.dest_postal_code" placeholder="CAP" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.dest_province" placeholder="Provincia" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							<input v-model="editForm.dest_telephone" placeholder="Telefono" class="bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
						</div>
					</div>
					<!-- Collo -->
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<h4 class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[10px]">Collo</h4>
						<div class="grid grid-cols-3 gap-[8px]">
							<div>
								<label class="text-[0.6875rem] text-[#737373]">Tipo</label>
								<input v-model="editForm.package_type" class="w-full bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							</div>
							<div>
								<label class="text-[0.6875rem] text-[#737373]">Quantita</label>
								<input type="number" v-model="editForm.quantity" min="1" class="w-full bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							</div>
							<div>
								<label class="text-[0.6875rem] text-[#737373]">Peso (kg)</label>
								<input v-model="editForm.weight" class="w-full bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							</div>
							<div>
								<label class="text-[0.6875rem] text-[#737373]">Lato 1 (cm)</label>
								<input v-model="editForm.first_size" class="w-full bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							</div>
							<div>
								<label class="text-[0.6875rem] text-[#737373]">Lato 2 (cm)</label>
								<input v-model="editForm.second_size" class="w-full bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							</div>
							<div>
								<label class="text-[0.6875rem] text-[#737373]">Lato 3 (cm)</label>
								<input v-model="editForm.third_size" class="w-full bg-white border border-[#D0D0D0] rounded-[8px] h-[38px] px-[12px] text-[0.8125rem]" />
							</div>
						</div>
					</div>

					<div class="flex justify-end gap-[10px] pt-[8px]">
						<button type="button" @click="showEdit = false" class="px-[20px] py-[10px] rounded-[30px] bg-[#996D47] text-white text-[0.875rem] font-semibold hover:opacity-90 transition cursor-pointer">Annulla</button>
						<button type="button" @click="saveEdit" :disabled="editSaving" class="px-[20px] py-[10px] rounded-[30px] bg-[#252B42] text-white text-[0.875rem] font-semibold hover:opacity-90 transition cursor-pointer disabled:opacity-60">
							{{ editSaving ? 'Salvataggio...' : 'Salva modifiche' }}
						</button>
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
					Sei sicuro di voler eliminare questa spedizione configurata?
				</p>
			</template>
			<template #footer>
				<div class="flex justify-end gap-[10px]">
					<button type="button" @click="showDeleteConfirm = false" class="px-[20px] py-[10px] rounded-[30px] bg-[#996D47] text-white text-[0.875rem] font-semibold hover:opacity-90 transition cursor-pointer">Annulla</button>
					<button type="button" @click="confirmDelete" :disabled="deleteLoading" class="px-[20px] py-[10px] rounded-[30px] bg-red-500 text-white hover:bg-red-600 transition text-[0.875rem] font-semibold disabled:opacity-60 cursor-pointer">
						{{ deleteLoading ? 'Eliminazione...' : 'Elimina' }}
					</button>
				</div>
			</template>
		</UModal>
	</section>
</template>
