<script setup>
definePageMeta({
	middleware: ["sanctum:auth"],
});

const filters = ref(["Tutti", "Aperti", "Chiusi", "In giacenza", "Annullati"]);

const activeFilter = ref(0);
const textFilter = ref("Tutti");

const { data: orders, refresh, status: ordersStatus } = useSanctumFetch("/api/orders", {
	method: "GET",
});

const { cart, refresh: refreshCart, status: cartStatus } = useCart();
const sanctumClient = useSanctumClient();
const router = useRouter();

const changeFilter = (filter, filterIndex) => {
	activeFilter.value = filterIndex;
	textFilter.value = filter;
};

const statusLabel = (status) => {
	const map = {
		pending: 'In attesa',
		processing: 'In lavorazione',
		completed: 'Completato',
		payment_failed: 'Pagamento fallito',
	};
	return map[status] || status;
};

const statusColor = (status) => {
	const map = {
		pending: 'bg-yellow-100 text-yellow-700',
		processing: 'bg-blue-100 text-blue-700',
		completed: 'bg-emerald-100 text-emerald-700',
		payment_failed: 'bg-red-100 text-red-700',
	};
	return map[status] || 'bg-gray-100 text-gray-700';
};

/* Elimina dal carrello */
const deletingId = ref(null);
const deleteFromCart = async (id) => {
	deletingId.value = id;
	try {
		await sanctumClient(`/api/cart/${id}`, { method: "DELETE" });
		await refreshCart();
	} catch (e) {
		// silent
	} finally {
		deletingId.value = null;
	}
};

const formatPrice = (cents) => {
	if (!cents && cents !== 0) return '—';
	return (Number(cents) / 100).toFixed(2).replace('.', ',') + '€';
};

/* Detail popup */
const showDetail = ref(false);
const detailItem = ref(null);
const detailType = ref('cart');

const openDetail = (item, type = 'cart') => {
	detailItem.value = item;
	detailType.value = type;
	showDetail.value = true;
};

/* Spedizioni configurate - filters */
const filterProvenienza = ref('');
const filterRiferimento = ref('');
const filterDateFrom = ref('');
const filterDateTo = ref('');
const filtersApplied = ref(false);

const applyFilters = () => {
	filtersApplied.value = true;
};

const resetFilters = () => {
	filterProvenienza.value = '';
	filterRiferimento.value = '';
	filterDateFrom.value = '';
	filterDateTo.value = '';
	filtersApplied.value = false;
};

/* Spedizioni configurate - selection */
const selectedItems = ref([]);
const selectAll = ref(false);

const toggleSelectAll = () => {
	if (selectAll.value) {
		selectedItems.value = filteredCartItems.value.map(item => item.id);
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
	selectAll.value = selectedItems.value.length === filteredCartItems.value.length;
};

/* Spedizioni configurate - pagination */
const currentPage = ref(1);
const itemsPerPage = 10;

const filteredCartItems = computed(() => {
	if (!cart.value?.data) return [];
	let items = [...cart.value.data];

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

const totalPages = computed(() => Math.max(1, Math.ceil(filteredCartItems.value.length / itemsPerPage)));

const paginatedCartItems = computed(() => {
	const start = (currentPage.value - 1) * itemsPerPage;
	return filteredCartItems.value.slice(start, start + itemsPerPage);
});

const prevPage = () => {
	if (currentPage.value > 1) currentPage.value--;
};
const nextPage = () => {
	if (currentPage.value < totalPages.value) currentPage.value++;
};

/* Bulk delete */
const bulkDelete = async () => {
	if (!selectedItems.value.length) return;
	for (const id of selectedItems.value) {
		try {
			await sanctumClient(`/api/cart/${id}`, { method: "DELETE" });
		} catch (e) { /* silent */ }
	}
	selectedItems.value = [];
	selectAll.value = false;
	await refreshCart();
};

/* Bulk add to cart - navigates to carrello */
const bulkAddToCart = () => {
	router.push('/carrello');
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
	if (type.includes('valigia')) return '/img/quote/first-step/suitcase.png';
	return '/img/quote/first-step/pack.png';
};
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[80px]">
		<div class="my-container max-w-[1100px]">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866]">Il tuo account</NuxtLink>
				<span class="mx-[6px]">/</span>
				<span class="font-semibold text-[#252B42]">Spedizioni</span>
			</div>

			<div class="flex items-center justify-between mb-[24px]">
				<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42]">Le tue spedizioni</h1>
				<NuxtLink
					to="/preventivo"
					class="inline-flex items-center gap-[6px] px-[20px] h-[42px] rounded-[12px] bg-[#E44203] text-white text-[0.875rem] font-semibold hover:opacity-90 transition">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					Nuova spedizione
				</NuxtLink>
			</div>

			<!-- Filtri -->
			<div class="flex flex-wrap gap-[8px] mb-[32px]">
				<button
					v-for="(filter, filterIndex) in filters"
					:key="filterIndex"
					@click="changeFilter(filter, filterIndex)"
					type="button"
					:class="filterIndex === activeFilter
						? 'bg-[#095866] text-white'
						: 'bg-[#F0F0F0] text-[#737373] hover:bg-[#E0E0E0]'"
					class="px-[18px] py-[10px] rounded-[30px] text-[0.875rem] font-medium cursor-pointer transition-colors">
					{{ filter }}
				</button>
			</div>

			<!-- Spedizioni configurate (nel carrello) -->
			<div v-if="cart?.data?.length > 0" class="mb-[40px]">
				<h2 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42] text-center mb-[24px]">Spedizioni configurate</h2>

				<!-- Filter Bar -->
				<div class="bg-[#F0F0F0] rounded-[16px] p-[20px_24px] mb-[16px]">
					<div class="flex flex-wrap gap-[12px] items-end">
						<!-- Provenienza -->
						<div class="flex-1 min-w-[180px]">
							<select v-model="filterProvenienza" class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[42px] px-[16px] text-[0.875rem] text-[#404040] appearance-none cursor-pointer">
								<option value="">Provenienza</option>
								<option v-for="item in cart.data" :key="'prov-'+item.id" :value="item.origin_address?.city">{{ item.origin_address?.city }}</option>
							</select>
						</div>
						<!-- Riferimento -->
						<div class="flex-1 min-w-[180px]">
							<input type="text" v-model="filterRiferimento" placeholder="Riferimento" class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[42px] px-[16px] text-[0.875rem] text-[#404040] placeholder:text-[#999]" />
						</div>
					</div>
					<div class="flex flex-wrap gap-[12px] items-center mt-[12px]">
						<!-- Date range -->
						<div class="flex-1 min-w-[150px]">
							<input type="date" v-model="filterDateFrom" placeholder="Da: (data creazione)" class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[42px] px-[16px] text-[0.875rem] text-[#404040]" />
						</div>
						<div class="flex-1 min-w-[150px]">
							<input type="date" v-model="filterDateTo" placeholder="A: (data creazione)" class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[42px] px-[16px] text-[0.875rem] text-[#404040]" />
						</div>
						<button @click="resetFilters" type="button" class="bg-[#E44203] text-white font-semibold text-[0.875rem] px-[24px] h-[42px] rounded-[30px] hover:opacity-90 transition cursor-pointer">
							Annulla
						</button>
						<button @click="applyFilters" type="button" class="bg-[#252B42] text-white font-semibold text-[0.875rem] px-[24px] h-[42px] rounded-[30px] hover:opacity-90 transition cursor-pointer">
							Applica filtro
						</button>
					</div>
				</div>

				<!-- CSV Upload -->
				<div class="mb-[16px]">
					<button type="button" class="bg-[#252B42] text-white font-semibold text-[0.875rem] px-[24px] h-[42px] rounded-[30px] hover:opacity-90 transition cursor-pointer inline-flex items-center gap-[8px]">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
						Carica da file CSV
					</button>
				</div>

				<!-- Table -->
				<div class="bg-white rounded-[16px] border border-[#E9EBEC] overflow-hidden">
					<!-- Table header -->
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

					<!-- Table rows -->
					<div>
						<div
							v-for="item in paginatedCartItems"
							:key="item.id"
							class="hidden desktop:grid grid-cols-[40px_110px_100px_100px_80px_80px_140px_80px_90px_60px_100px] gap-[8px] items-center px-[16px] py-[12px] border-b border-[#E9EBEC] hover:bg-[#F8F9FB] transition-colors text-[0.8125rem] text-[#252B42]">
							<!-- Checkbox -->
							<span class="flex items-center">
								<input type="checkbox" :checked="selectedItems.includes(item.id)" @change="toggleItem(item.id)" class="w-[16px] h-[16px] accent-[#095866] cursor-pointer" />
							</span>
							<!-- Data creazione -->
							<span class="text-[0.8125rem]">{{ formatCreatedDate(item) }}</span>
							<!-- Provenienza -->
							<span class="text-[0.8125rem]">{{ item.origin_address?.city ? 'Qui' : '—' }}</span>
							<!-- Riferimento -->
							<span class="text-[0.8125rem]">......</span>
							<!-- Servizio -->
							<span class="text-[0.8125rem]">{{ item.services?.service_type?.split(',')[0]?.trim() || 'BRT' }}</span>
							<!-- Colli -->
							<span class="flex items-center gap-[4px] text-[0.8125rem]">
								{{ item.quantity || 1 }} x
								<NuxtImg :src="getPackageIcon(item)" alt="" width="18" height="18" />
							</span>
							<!-- Indirizzi -->
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
							<!-- Accessori -->
							<span class="text-[0.8125rem]">......</span>
							<!-- Importo -->
							<span class="text-[0.8125rem] font-semibold">{{ formatPrice(item.single_price) }}</span>
							<!-- Errore -->
							<span class="text-[0.8125rem]">......</span>
							<!-- Azioni -->
							<span class="flex items-center justify-end gap-[6px]">
								<button type="button" @click="openDetail(item, 'cart')" title="Modifica" class="w-[28px] h-[28px] flex items-center justify-center cursor-pointer hover:opacity-70">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#252B42" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
								</button>
								<button type="button" @click="openDetail(item, 'cart')" title="Anteprima" class="w-[28px] h-[28px] flex items-center justify-center cursor-pointer hover:opacity-70">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#252B42" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
								</button>
								<button type="button" @click="deleteFromCart(item.id)" :disabled="deletingId === item.id" title="Elimina" class="w-[28px] h-[28px] flex items-center justify-center cursor-pointer hover:opacity-70 disabled:opacity-50">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#252B42" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
								</button>
							</span>
						</div>

						<!-- Mobile cards -->
						<div v-for="item in paginatedCartItems" :key="'m-'+item.id" class="desktop:hidden p-[16px] border-b border-[#E9EBEC]">
							<div class="flex items-center justify-between mb-[12px]">
								<div class="flex items-center gap-[10px]">
									<input type="checkbox" :checked="selectedItems.includes(item.id)" @change="toggleItem(item.id)" class="w-[16px] h-[16px] accent-[#095866] cursor-pointer" />
									<div>
										<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.origin_address?.city || 'Partenza' }} &rarr; {{ item.destination_address?.city || 'Destinazione' }}</p>
										<p class="text-[0.75rem] text-[#737373]">{{ item.quantity }}x &ndash; {{ item.weight }} kg</p>
									</div>
								</div>
								<span class="text-[0.9375rem] font-bold text-[#252B42]">{{ formatPrice(item.single_price) }}</span>
							</div>
							<div class="flex gap-[8px] justify-end">
								<button type="button" @click="openDetail(item, 'cart')" class="text-[0.75rem] text-[#095866] font-semibold hover:underline cursor-pointer">Dettagli</button>
								<button type="button" @click="deleteFromCart(item.id)" :disabled="deletingId === item.id" class="text-[0.75rem] text-red-500 font-semibold hover:underline cursor-pointer disabled:opacity-50">
									{{ deletingId === item.id ? 'Eliminando...' : 'Elimina' }}
								</button>
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
							:class="[
								'w-[32px] h-[32px] flex items-center justify-center rounded-[6px] text-[0.875rem] font-semibold cursor-pointer',
								currentPage === page ? 'bg-[#E44203] text-white' : 'text-[#252B42] hover:bg-[#F0F0F0]'
							]">
							{{ page }}
						</span>
						<button @click="nextPage" :disabled="currentPage >= totalPages" class="text-[0.875rem] font-medium text-[#252B42] hover:text-[#095866] disabled:text-[#C0C0C0] cursor-pointer disabled:cursor-not-allowed">Successivo</button>
					</div>
				</div>

				<!-- Bottom buttons -->
				<div class="flex items-center justify-center gap-[24px] mt-[24px]">
					<button
						@click="bulkDelete"
						:disabled="selectedItems.length === 0"
						type="button"
						class="bg-[#996D47] text-white font-semibold text-[0.9375rem] px-[32px] h-[48px] rounded-[8px] hover:opacity-90 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
						Elimina
					</button>
					<button
						@click="bulkAddToCart"
						type="button"
						class="bg-[#252B42] text-white font-semibold text-[0.9375rem] px-[32px] h-[48px] rounded-[8px] hover:opacity-90 transition cursor-pointer">
						Aggiungi al carrello
					</button>
				</div>
			</div>

			<!-- Ordini / Spedizioni -->
			<div>
				<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[16px] flex items-center gap-[10px]">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-[#095866]"><path fill="currentColor" d="M18 18.5a1.5 1.5 0 0 1-1.5-1.5a1.5 1.5 0 0 1 1.5-1.5a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5m1.5-9l1.96 2.5H17V9.5m-11 9a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 6 15.5A1.5 1.5 0 0 1 7.5 17A1.5 1.5 0 0 1 6 18.5M20 8h-3V4H3c-1.11 0-2 .89-2 2v11h2a3 3 0 0 0 3 3a3 3 0 0 0 3-3h6a3 3 0 0 0 3 3a3 3 0 0 0 3-3h2v-5z"/></svg>
					Spedizioni
				</h2>

				<!-- Loading -->
				<div v-if="ordersStatus === 'pending'" class="space-y-[12px]">
					<div v-for="n in 3" :key="n" class="bg-white rounded-[16px] border border-[#E9EBEC] p-[20px_24px] animate-pulse">
						<div class="flex items-center gap-[16px]">
							<div class="w-[44px] h-[44px] rounded-[10px] bg-gray-200"></div>
							<div class="flex-1 space-y-[8px]">
								<div class="h-[14px] bg-gray-200 rounded w-[60%]"></div>
								<div class="h-[12px] bg-gray-200 rounded w-[40%]"></div>
							</div>
						</div>
					</div>
				</div>

				<!-- Table header (desktop) -->
				<div v-else-if="orders?.data?.length > 0">
					<div class="hidden desktop:grid grid-cols-[60px_1fr_1fr_120px_100px_100px] gap-[12px] px-[24px] pb-[10px] text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider border-b border-[#E9EBEC]">
						<span>#</span>
						<span>Tratta</span>
						<span>Data</span>
						<span>Stato</span>
						<span class="text-right">Importo</span>
						<span class="text-center">Azioni</span>
					</div>

					<!-- Table rows -->
					<div class="space-y-[8px] mt-[8px]">
						<div
							v-for="order in orders.data"
							:key="order.id"
							class="bg-white rounded-[14px] border border-[#E9EBEC] hover:border-[#095866] transition-all">

							<!-- Desktop row -->
							<div class="hidden desktop:grid grid-cols-[60px_1fr_1fr_120px_100px_100px] gap-[12px] items-center p-[14px_24px]">
								<!-- ID -->
								<div>
									<span class="text-[0.875rem] font-semibold text-[#252B42]">#{{ order.id }}</span>
								</div>
								<!-- Tratta -->
								<div>
									<p class="text-[0.875rem] font-semibold text-[#252B42]" v-if="order.packages?.length > 0">
										{{ order.packages[0].origin_address?.city }} &rarr; {{ order.packages[0].destination_address?.city }}
									</p>
									<p v-else class="text-[0.8125rem] text-[#737373]">—</p>
								</div>
								<!-- Data -->
								<div>
									<p class="text-[0.8125rem] text-[#737373]">{{ order.created_at }}</p>
								</div>
								<!-- Stato -->
								<div>
									<span :class="statusColor(order.status)" class="px-[10px] py-[4px] rounded-full text-[0.6875rem] font-medium inline-block">
										{{ statusLabel(order.status) }}
									</span>
								</div>
								<!-- Importo -->
								<div class="text-right">
									<span v-if="order.packages?.length > 0" class="text-[0.9375rem] font-bold text-[#252B42]">
										{{ formatPrice(order.packages[0].single_price) }}
									</span>
									<span v-else class="text-[#737373]">—</span>
								</div>
								<!-- Azioni -->
								<div class="flex items-center justify-center gap-[8px]">
									<NuxtLink :to="`/account/spedizioni/${order.id}`" title="Vedi dettagli" class="w-[32px] h-[32px] rounded-[8px] bg-[#095866]/10 flex items-center justify-center hover:bg-[#095866]/20 transition">
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
									</NuxtLink>
								</div>
							</div>

							<!-- Mobile card -->
							<div class="desktop:hidden p-[16px]">
								<div class="flex items-center justify-between mb-[8px]">
									<div class="flex items-center gap-[10px]">
										<div class="w-[40px] h-[40px] rounded-[10px] bg-[#095866]/10 flex items-center justify-center shrink-0">
											<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-[#095866]"><path fill="currentColor" d="M18 18.5a1.5 1.5 0 0 1-1.5-1.5a1.5 1.5 0 0 1 1.5-1.5a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5m1.5-9l1.96 2.5H17V9.5m-11 9a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 6 15.5A1.5 1.5 0 0 1 7.5 17A1.5 1.5 0 0 1 6 18.5M20 8h-3V4H3c-1.11 0-2 .89-2 2v11h2a3 3 0 0 0 3 3a3 3 0 0 0 3-3h6a3 3 0 0 0 3 3a3 3 0 0 0 3-3h2v-5z"/></svg>
										</div>
										<div>
											<div class="flex items-center gap-[6px]">
												<p class="text-[0.875rem] font-semibold text-[#252B42]">Ordine #{{ order.id }}</p>
												<span :class="statusColor(order.status)" class="px-[8px] py-[2px] rounded-full text-[0.625rem] font-medium">{{ statusLabel(order.status) }}</span>
											</div>
											<p class="text-[0.75rem] text-[#737373]" v-if="order.packages?.length > 0">
												{{ order.packages[0].origin_address?.city }} &rarr; {{ order.packages[0].destination_address?.city }}
											</p>
											<p class="text-[0.75rem] text-[#737373]">{{ order.created_at }}</p>
										</div>
									</div>
								</div>
								<div class="flex justify-end">
									<NuxtLink :to="`/account/spedizioni/${order.id}`" class="text-[0.75rem] text-[#095866] font-semibold hover:underline">Vedi dettagli</NuxtLink>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Empty state -->
				<div v-else class="bg-white rounded-[16px] p-[48px] border border-[#E9EBEC] text-center">
					<div class="w-[72px] h-[72px] mx-auto mb-[20px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" class="text-[#C8CCD0]"><path fill="currentColor" d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18c-.21 0-.41-.06-.57-.18l-7.9-4.44A.99.99 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18c.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88zM12 4.15L6.04 7.5L12 10.85l5.96-3.35zM5 15.91l6 3.37v-6.73L5 9.18zm14 0V9.18l-6 3.37v6.73z"/></svg>
					</div>
					<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Nessuna spedizione</h2>
					<p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto mb-[24px] leading-[1.6]">
						Non hai ancora effettuato nessun ordine. Configura la tua prima spedizione per iniziare.
					</p>
					<NuxtLink
						to="/preventivo"
						class="inline-block px-[24px] py-[12px] bg-[#095866] hover:bg-[#0a7a8c] text-white rounded-[10px] font-semibold text-[0.9375rem] transition-colors">
						Crea nuova spedizione
					</NuxtLink>
				</div>
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
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<h4 class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[8px]">Servizi</h4>
						<p class="text-[0.8125rem] text-[#252B42]">{{ detailItem.services?.service_type || 'Standard' }}</p>
						<p v-if="detailItem.services?.date" class="text-[0.75rem] text-[#737373] mt-[4px]">Ritiro: {{ detailItem.services.date }}</p>
					</div>
					<div class="bg-[#095866]/5 rounded-[12px] p-[16px] flex items-center justify-between">
						<span class="text-[0.875rem] font-bold text-[#252B42]">Importo</span>
						<span class="text-[1.25rem] font-bold text-[#095866]">{{ formatPrice(detailItem.single_price) }}</span>
					</div>
				</div>
			</template>
		</UModal>
	</section>
</template>
