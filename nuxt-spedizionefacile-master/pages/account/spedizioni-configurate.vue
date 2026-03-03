<!--
  FILE: pages/account/spedizioni-configurate.vue
  SCOPO: Spedizioni salvate — lista, filtro, selezione multipla, aggiungi a carrello, modifica, elimina.
         Permette di risparmiare tempo ri-inviando configurazioni di spedizione gia' usate.
  API: GET /api/saved-shipments — lista spedizioni salvate,
       PUT /api/saved-shipments/{id} — modifica nome/note,
       DELETE /api/saved-shipments/{id} — elimina,
       POST /api/saved-shipments/add-to-cart — aggiungi selezionate al carrello.
  COMPONENTI: nessun componente custom.
  ROUTE: /account/spedizioni-configurate (middleware sanctum:auth).

  DATI IN INGRESSO:
    - savedShipments (da useSanctumFetch) — lista spedizioni salvate.

  DATI IN USCITA:
    - PUT/DELETE su saved-shipments, POST add-to-cart.

  VINCOLI:
    - L'utente deve essere autenticato.
    - La selezione multipla permette di aggiungere piu' spedizioni al carrello in una volta.

  ERRORI TIPICI:
    - Spedizione salvata con dati obsoleti → errore al momento dell'aggiunta al carrello.

  PUNTI DI MODIFICA SICURI:
    - Aggiungere campi modificabili: modificare il form inline e il body PUT.
    - Cambiare il layout card: modificare il template.

  COLLEGAMENTI:
    - pages/carrello.vue → dopo l'aggiunta al carrello.
    - pages/account/spedizioni/index.vue → lista ordini (da cui si puo' salvare).
-->
<script setup>
/* Richiede che l'utente sia autenticato */
definePageMeta({
	middleware: ["sanctum:auth"],
});

const sanctum = useSanctumClient();
const router = useRouter();

/* Carica le spedizioni salvate dal server */
// lazy: true — la lista si carica dopo il render iniziale (mostra skeleton nel frattempo)
const { data: savedShipments, refresh, status: savedStatus } = useSanctumFetch("/api/saved-shipments", {
	method: "GET",
	lazy: true,
});

/* === FILTRI === */
/* Filtro per citta' di provenienza */
const filterProvenienza = ref('');
/* Filtro per numero di riferimento */
const filterRiferimento = ref('');
/* Filtro per data: da/a */
const filterDateFrom = ref('');
const filterDateTo = ref('');
/* Indica se i filtri sono stati applicati */
const filtersApplied = ref(false);

const applyFilters = () => {
	filtersApplied.value = true;
	currentPage.value = 1;
};
const resetFilters = () => {
	filterProvenienza.value = '';
	filterRiferimento.value = '';
	filterDateFrom.value = '';
	filterDateTo.value = '';
	filtersApplied.value = false;
	currentPage.value = 1;
};

/* === SELEZIONE MULTIPLA === */
/* Lista degli ID delle spedizioni selezionate con la checkbox */
const selectedItems = ref([]);
/* Se true, tutte le spedizioni visibili sono selezionate */
const selectAll = ref(false);

/* Seleziona o deseleziona tutte le spedizioni */
const toggleSelectAll = () => {
	if (selectAll.value) {
		selectedItems.value = filteredItems.value.map(item => item.id);
	} else {
		selectedItems.value = [];
	}
};

/* Aggiunge o rimuove una singola spedizione dalla selezione */
const toggleItem = (id) => {
	const idx = selectedItems.value.indexOf(id);
	if (idx > -1) {
		selectedItems.value.splice(idx, 1);
	} else {
		selectedItems.value.push(id);
	}
	selectAll.value = selectedItems.value.length === filteredItems.value.length && filteredItems.value.length > 0;
};

/* === PAGINAZIONE === */
/* Pagina corrente della tabella */
const currentPage = ref(1);
/* Numero di spedizioni per pagina */
const itemsPerPage = 10;

/* Lista delle spedizioni filtrate in base ai filtri attivi (citta', data, riferimento) */
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

/* === ELIMINAZIONE SINGOLA === */
/* Mostra/nasconde il popup di conferma eliminazione */
const showDeleteConfirm = ref(false);
/* ID della spedizione da eliminare */
const deleteTargetId = ref(null);
/* Indica se l'eliminazione e' in corso */
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
		showFeedback('Spedizione eliminata con successo.');
	} catch (e) {
		console.error(e);
		showFeedback('Errore durante l\'eliminazione.', 'error');
	} finally {
		deleteLoading.value = false;
		showDeleteConfirm.value = false;
		deleteTargetId.value = null;
	}
};

/* Elimina tutte le spedizioni selezionate (una per una) */
const bulkDeleteLoading = ref(false);
const bulkDelete = async () => {
	if (!selectedItems.value.length) return;
	const count = selectedItems.value.length;
	if (!confirm(`Sei sicuro di voler eliminare ${count} spedizion${count === 1 ? 'e configurata' : 'i configurate'}?`)) {
		return;
	}
	bulkDeleteLoading.value = true;
	try {
		for (const id of selectedItems.value) {
			await sanctum(`/api/saved-shipments/${id}`, { method: "DELETE" });
		}
		selectedItems.value = [];
		selectAll.value = false;
		await refresh();
		showFeedback(`${count} spedizion${count === 1 ? 'e eliminata' : 'i eliminate'} con successo.`);
	} catch (e) {
		console.error(e);
		showFeedback('Errore durante l\'eliminazione.', 'error');
		await refresh();
	} finally {
		bulkDeleteLoading.value = false;
	}
};

/* === AGGIUNTA AL CARRELLO === */
const addToCartLoading = ref(false);
/* Aggiunge le spedizioni selezionate al carrello e reindirizza alla pagina carrello */
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

/* === MODIFICA SPEDIZIONE (popup) === */
/* Mostra/nasconde il popup di modifica */
const showEdit = ref(false);
/* La spedizione che si sta modificando */
const editItem = ref(null);
/* Dati del form di modifica (indirizzi, collo, dimensioni) */
const editForm = ref({});
/* Indica se il salvataggio modifiche e' in corso */
const editSaving = ref(false);

/* Apre il popup di modifica con i dati della spedizione selezionata */
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

/* Salva le modifiche della spedizione nel server */
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
		showFeedback('Spedizione aggiornata con successo.');
	} catch (e) {
		console.error(e);
		showFeedback('Errore durante il salvataggio.', 'error');
	} finally {
		editSaving.value = false;
	}
};

/* === MESSAGGI DI FEEDBACK === */
/* Messaggio di successo/errore mostrato in alto nella pagina */
const feedbackMessage = ref('');
const feedbackType = ref('success');
const showFeedback = (msg, type = 'success') => {
	feedbackMessage.value = msg;
	feedbackType.value = type;
	setTimeout(() => { feedbackMessage.value = ''; }, 5000);
};

/* Converte il prezzo da centesimi a euro con virgola (es. 1500 -> "15,00 EUR") */
const formatPrice = (cents) => {
	if (!cents && cents !== 0) return '—';
	return (Number(cents) / 100).toFixed(2).replace('.', ',') + '€';
};

/* === RILEVAMENTO DESTINAZIONI DUPLICATE === */
/* Genera una chiave univoca per l'indirizzo di destinazione */
const destKey = (item) => {
	const d = item.destination_address;
	if (!d) return '';
	return [d.name, d.address, d.address_number, d.city, d.postal_code].filter(Boolean).join('|').toLowerCase();
};

/* Mappa delle destinazioni duplicate: chiave -> array di ID */
const duplicateDestinations = computed(() => {
	if (!savedShipments.value?.data) return new Set();
	const map = {};
	for (const item of savedShipments.value.data) {
		const key = destKey(item);
		if (!key) continue;
		if (!map[key]) map[key] = [];
		map[key].push(item.id);
	}
	const dupeIds = new Set();
	for (const ids of Object.values(map)) {
		if (ids.length > 1) {
			ids.forEach(id => dupeIds.add(id));
		}
	}
	return dupeIds;
});

const isDuplicateDest = (item) => duplicateDestinations.value.has(item.id);

const formatCreatedDate = (item) => {
	if (item.created_at) {
		return new Date(item.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
	}
	return new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/* Sceglie l'icona del pacco: pallet, busta o pacco standard */
const getPackageIcon = (item) => {
	const type = item.package_type?.toLowerCase() || '';
	if (type.includes('pallet')) return '/img/quote/first-step/pallet.png';
	if (type.includes('busta')) return '/img/quote/first-step/envelope.png';
	return '/img/quote/first-step/pack.png';
};
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px]">
		<div class="my-container">
			<!-- Breadcrumb - aggiunto per navigazione coerente con le altre pagine account -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Il tuo account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Spedizioni configurate</span>
			</div>

			<!-- Titolo - allineato a sinistra coerente con le altre pagine -->
			<h1 class="text-[1.75rem] font-bold text-[#252B42] mb-[8px]">Spedizioni configurate</h1>
			<p class="text-[#737373] text-[0.9375rem] mb-[32px]">Gestisci le spedizioni salvate, modificale o aggiungile al carrello.</p>

			<!-- Feedback message - successo/errore -->
			<Transition name="fade">
				<div v-if="feedbackMessage" :class="['mb-[20px] px-[16px] py-[12px] rounded-[50px] text-[0.875rem] font-medium', feedbackType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200']">
					{{ feedbackMessage }}
				</div>
			</Transition>

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
							<button @click="resetFilters" type="button" class="inline-flex items-center gap-[6px] bg-[#E9EBEC] text-[#252B42] font-semibold text-[0.9375rem] px-[28px] h-[44px] rounded-[30px] hover:opacity-90 transition cursor-pointer"><Icon name="mdi:close" class="text-[18px]" />Annulla</button>
							<button @click="applyFilters" type="button" class="inline-flex items-center gap-[6px] bg-[#252B42] text-white font-semibold text-[0.9375rem] px-[28px] h-[44px] rounded-[30px] hover:opacity-90 transition cursor-pointer"><Icon name="mdi:filter-outline" class="text-[18px]" />Applica filtro</button>
						</div>
					</div>
				</div>

				<!-- CSV upload section -->
				<div class="border border-dashed border-[#A8C4D0] rounded-[8px] p-[20px_24px] mb-[12px]">
					<button type="button" class="inline-flex items-center gap-[6px] bg-[#252B42] text-white font-semibold text-[0.9375rem] px-[28px] h-[44px] rounded-[30px] hover:opacity-90 transition cursor-pointer">
						<Icon name="mdi:file-upload-outline" class="text-[18px]" />
						Carica da file CSV
					</button>
				</div>

				<!-- Table section -->
				<div class="border border-dashed border-[#A8C4D0] rounded-[8px] overflow-hidden mb-[12px]">
					<!-- Table header -->
					<div class="hidden desktop:grid grid-cols-[3%_10%_10%_9%_8%_10%_22%_7%_9%_12%] gap-[4px] px-[16px] py-[12px] text-[0.8125rem] font-bold text-[#252B42] border-b border-[#D0D0D0]">
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
						<span class="text-center">Azioni</span>
					</div>

					<!-- Table rows -->
					<!-- Zebra striping: righe alterne con sfondo piu' chiaro -->
					<div v-if="paginatedItems.length > 0">
						<div
							v-for="(item, idx) in paginatedItems"
							:key="item.id"
							@dblclick="openEdit(item)"
							:class="['hidden desktop:grid grid-cols-[3%_10%_10%_9%_8%_10%_22%_7%_9%_12%] gap-[4px] items-center px-[16px] py-[12px] border-b border-[#E9EBEC] hover:bg-[#EDF5F7] transition-colors text-[0.8125rem] text-[#252B42] cursor-pointer', idx % 2 === 1 ? 'bg-[#F8F9FB]' : '', isDuplicateDest(item) ? 'ring-1 ring-amber-400 ring-inset' : '']">
							<span class="flex items-center">
								<input type="checkbox" :checked="selectedItems.includes(item.id)" @change="toggleItem(item.id)" class="w-[16px] h-[16px] accent-[#095866] cursor-pointer" />
							</span>
							<span>{{ formatCreatedDate(item) }}</span>
							<span>{{ item.origin_address?.city || '—' }}</span>
							<span class="text-[#737373]">......</span>
							<span>{{ item.services?.service_type?.split(',')[0]?.trim() || 'BRT' }}</span>
							<span class="flex items-center gap-[4px]">
								{{ item.quantity || 1 }} x
								<!-- Ottimizzazione: lazy loading + decoding async -->
								<NuxtImg :src="getPackageIcon(item)" alt="" width="20" height="22" loading="lazy" decoding="async" />
							</span>
							<span class="text-[0.75rem]">
								<div class="flex items-center gap-[4px]">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" class="shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
									<span class="truncate">{{ item.origin_address?.name?.split(' ')[0] || '—' }} - {{ item.origin_address?.city || '' }}</span>
								</div>
								<div class="flex items-center gap-[4px] mt-[2px]">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" class="shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
									<span class="truncate">{{ item.destination_address?.name?.split(' ')[0] || '—' }} - {{ item.destination_address?.city || '' }}</span>
								</div>
								<div v-if="isDuplicateDest(item)" class="flex items-center gap-[4px] mt-[4px] text-amber-600 text-[0.6875rem] font-medium">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
									Destinazione duplicata
								</div>
							</span>
							<span class="text-[#737373]">......</span>
							<span class="font-semibold">{{ formatPrice(item.single_price) }}</span>
							<span class="flex items-center justify-center gap-[8px]">
								<button type="button" @click="openEdit(item)" class="text-[#095866] hover:text-[#074a56] cursor-pointer" title="Modifica">
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
								</button>
								<button type="button" @click="askDelete(item.id)" class="text-red-500 hover:text-red-700 cursor-pointer" title="Elimina">
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
								</button>
							</span>
						</div>

						<!-- Mobile rows -->
						<div v-for="item in paginatedItems" :key="'m-'+item.id" :class="['desktop:hidden p-[16px] border-b border-[#E9EBEC]', isDuplicateDest(item) ? 'bg-amber-50 border-l-[3px] border-l-amber-400' : '']">
							<div class="flex items-center justify-between mb-[10px]">
								<div class="flex items-center gap-[10px]">
									<input type="checkbox" :checked="selectedItems.includes(item.id)" @change="toggleItem(item.id)" class="w-[16px] h-[16px] accent-[#095866] cursor-pointer" />
									<div>
										<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.origin_address?.city || 'Partenza' }} &rarr; {{ item.destination_address?.city || 'Dest.' }}</p>
										<p class="text-[0.75rem] text-[#737373]">{{ item.quantity }}x - {{ item.weight }} kg - {{ formatCreatedDate(item) }}</p>
										<p v-if="isDuplicateDest(item)" class="text-[0.6875rem] text-amber-600 font-medium mt-[2px] flex items-center gap-[4px]">
											<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
											Destinazione duplicata
										</p>
									</div>
								</div>
								<span class="text-[0.9375rem] font-bold text-[#252B42]">{{ formatPrice(item.single_price) }}</span>
							</div>
							<div class="flex gap-[12px] justify-end">
								<button @click="openEdit(item)" class="inline-flex items-center gap-[4px] text-[0.75rem] text-[#095866] font-semibold hover:underline cursor-pointer">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
									Modifica
								</button>
								<button @click="askDelete(item.id)" class="text-red-500 hover:text-red-700 cursor-pointer" title="Elimina">
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
								</button>
							</div>
						</div>
					</div>

					<!-- Empty state migliorato con icona, messaggio e CTA -->
					<div v-else class="p-[48px] text-center">
						<div class="w-[72px] h-[72px] mx-auto mb-[20px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
							<Icon name="mdi:package-variant-closed" class="text-[32px] text-[#C8CCD0]" />
						</div>
						<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Nessuna spedizione configurata</h2>
						<p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto mb-[24px] leading-[1.6]">
							Le spedizioni salvate appariranno qui. Puoi salvarle dalla pagina delle spedizioni o crearne una nuova.
						</p>
						<NuxtLink to="/preventivo" class="inline-flex items-center gap-[6px] px-[24px] py-[12px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] font-semibold text-[0.9375rem] transition-colors">
							<Icon name="mdi:plus" class="text-[18px]" />
							Crea nuova spedizione
						</NuxtLink>
					</div>

					<!-- Pagination -->
					<div class="flex items-center justify-center gap-[8px] py-[16px] border-t border-[#E9EBEC]">
						<button @click="prevPage" :disabled="currentPage <= 1" class="inline-flex items-center gap-[4px] text-[0.875rem] font-medium text-[#252B42] hover:text-[#095866] disabled:text-[#C0C0C0] cursor-pointer disabled:cursor-not-allowed"><Icon name="mdi:chevron-left" class="text-[18px]" />Precedente</button>
						<span
							v-for="page in totalPages"
							:key="page"
							@click="currentPage = page"
							:class="['w-[32px] h-[32px] flex items-center justify-center rounded-[6px] text-[0.875rem] font-semibold cursor-pointer', currentPage === page ? 'bg-[#095866] text-white' : 'text-[#252B42] hover:bg-[#F0F0F0]']">
							{{ page }}
						</span>
						<button @click="nextPage" :disabled="currentPage >= totalPages" class="inline-flex items-center gap-[4px] text-[0.875rem] font-medium text-[#252B42] hover:text-[#095866] disabled:text-[#C0C0C0] cursor-pointer disabled:cursor-not-allowed">Successivo<Icon name="mdi:chevron-right" class="text-[18px]" /></button>
					</div>
				</div>

				<!-- Bottom action buttons -->
				<div class="flex items-center justify-center gap-[24px] mt-[20px]">
					<button @click="bulkDelete" :disabled="selectedItems.length === 0 || bulkDeleteLoading" type="button" class="inline-flex items-center gap-[6px] bg-red-500 text-white font-semibold text-[0.9375rem] px-[36px] h-[48px] rounded-[30px] hover:bg-red-600 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
						<Icon name="mdi:delete-outline" class="text-[18px]" />
						{{ bulkDeleteLoading ? 'Eliminazione...' : `Elimina${selectedItems.length ? ` (${selectedItems.length})` : ''}` }}
					</button>
					<button @click="bulkAddToCart" :disabled="selectedItems.length === 0 || addToCartLoading" type="button" class="inline-flex items-center gap-[6px] bg-[#252B42] text-white font-semibold text-[0.9375rem] px-[36px] h-[48px] rounded-[30px] hover:opacity-90 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
						<Icon name="mdi:cart-plus" class="text-[18px]" />
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
						<Icon name="mdi:close" class="text-[20px]" />
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
						<button type="button" @click="showEdit = false" class="inline-flex items-center gap-[6px] px-[20px] py-[10px] rounded-[30px] bg-[#E9EBEC] text-[#252B42] text-[0.875rem] font-semibold hover:opacity-90 transition cursor-pointer"><Icon name="mdi:close" class="text-[18px]" />Annulla</button>
						<button type="button" @click="saveEdit" :disabled="editSaving" class="inline-flex items-center gap-[6px] px-[20px] py-[10px] rounded-[30px] bg-[#252B42] text-white text-[0.875rem] font-semibold hover:opacity-90 transition cursor-pointer disabled:opacity-60">
							<Icon name="mdi:content-save" class="text-[18px]" />
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
					<button type="button" @click="showDeleteConfirm = false" class="inline-flex items-center gap-[6px] px-[20px] py-[10px] rounded-[30px] bg-[#E9EBEC] text-[#252B42] text-[0.875rem] font-semibold hover:opacity-90 transition cursor-pointer"><Icon name="mdi:close" class="text-[18px]" />Annulla</button>
					<button type="button" @click="confirmDelete" :disabled="deleteLoading" class="inline-flex items-center gap-[6px] px-[20px] py-[10px] rounded-[30px] bg-red-500 text-white hover:bg-red-600 transition text-[0.875rem] font-semibold disabled:opacity-60 cursor-pointer">
						<Icon name="mdi:delete-outline" class="text-[18px]" />
						{{ deleteLoading ? 'Eliminazione...' : 'Elimina' }}
					</button>
				</div>
			</template>
		</UModal>
	</section>
</template>

<style scoped>
/* Transizione per i messaggi di feedback */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
