<!--
  FILE: pages/account/amministrazione/ordini.vue
  SCOPO: Pannello admin — gestione ordini di tutti gli utenti.
         Lista con ricerca, filtri per stato, cambio stato, dettaglio modale,
         vista raggruppata per utente, gestione PUDO, download etichette BRT.
  API: GET /api/admin/orders?page=&search=&status= — lista ordini paginata,
       PATCH /api/admin/orders/{id}/status — cambio stato ordine,
       PATCH /api/admin/orders/{id}/pudo — assegna/rimuovi punto PUDO,
       PATCH /api/admin/users/{id}/user-type — cambio tipo account utente.
  COMPONENTI: PudoSelector (selettore punto di ritiro BRT).
  ROUTE: /account/amministrazione/ordini (middleware sanctum:auth + admin).

  DATI IN INGRESSO:
    - ordersData (da fetchOrders) — lista ordini paginata dal server.
    - useAdmin() — composable con utility admin (formatCurrency, formatDate, statusConfig, ecc.).

  DATI IN USCITA:
    - PATCH su stato ordine, PUDO, tipo account utente.

  VINCOLI:
    - Solo utenti con ruolo Admin possono accedere (middleware admin).
    - Non si possono annullare ordini consegnati o in transito.
    - La ricerca ha debounce di 400ms.

  ERRORI TIPICI:
    - Errore di rete durante cambio stato → messaggio errore rosso.
    - Ordine senza pacchetti → il dettaglio mostra sezione vuota.

  PUNTI DI MODIFICA SICURI:
    - Aggiungere nuovi stati: modificare getAvailableStatuses() e orderStatusConfig nel composable.
    - Aggiungere colonne alla tabella: modificare il template <table>.

  COLLEGAMENTI:
    - composables/useAdmin.js → utility condivise per tutte le pagine admin.
    - components/PudoSelector.vue → selettore punti di ritiro BRT.
    - pages/account/amministrazione/spedizioni.vue → vista spedizioni BRT.
-->
<script setup>
definePageMeta({
	middleware: ["sanctum:auth", "admin"],
});

const sanctum = useSanctumClient();
const { actionLoading, actionMessage, showSuccess, showError, formatCurrency, formatCents, formatDate, orderStatusConfig, downloadLabel } = useAdmin();

const ordersData = ref({ data: [], last_page: 1 });
const ordersPage = ref(1);
const ordersSearch = ref("");
const ordersStatusFilter = ref("");
const tabLoading = ref(false);
const fetchError = ref(false);
const groupByUser = ref(false);

const fetchOrders = async () => {
	tabLoading.value = true;
	fetchError.value = false;
	try {
		const params = new URLSearchParams();
		params.set("page", ordersPage.value);
		if (ordersSearch.value) params.set("search", ordersSearch.value);
		if (ordersStatusFilter.value) params.set("status", ordersStatusFilter.value);
		const res = await sanctum(`/api/admin/orders?${params.toString()}`);
		// Handle both paginator wrapper and direct data
		if (res && Array.isArray(res.data)) {
			ordersData.value = { data: res.data, last_page: res.last_page || 1 };
		} else if (res && Array.isArray(res)) {
			ordersData.value = { data: res, last_page: 1 };
		} else {
			ordersData.value = { data: [], last_page: 1 };
		}
	} catch (e) {
		ordersData.value = { data: [], last_page: 1 };
		fetchError.value = true;
	}
	tabLoading.value = false;
};

let ordersSearchTimeout;
const onOrdersSearch = () => {
	clearTimeout(ordersSearchTimeout);
	ordersSearchTimeout = setTimeout(() => { ordersPage.value = 1; fetchOrders(); }, 400);
};

const changeOrderStatus = async (orderId, status, currentStatus) => {
	// Validate state transition
	const validTransitions = {
		'pending': ['processing', 'cancelled'],
		'processing': ['completed', 'in_transit', 'cancelled'],
		'completed': ['in_transit'],
		'in_transit': ['delivered'],
		'delivered': [],
		'cancelled': [],
		'payment_failed': ['pending'],
	};

	const allowedStates = validTransitions[currentStatus] || [];
	if (!allowedStates.includes(status)) {
		showError(null, `Transizione non valida: ${currentStatus} → ${status}. Stati permessi: ${allowedStates.join(', ') || 'nessuno'}`);
		return;
	}

	actionLoading.value = `order-${orderId}`;
	console.log(`[AUDIT] Admin changing order #${orderId} status: ${currentStatus} → ${status}`);
	try {
		await sanctum(`/api/admin/orders/${orderId}/status`, { method: "PATCH", body: { status } });
		showSuccess(`Stato ordine #${orderId} aggiornato.`);
		await fetchOrders();
	} catch (e) { showError(e, "Errore durante l'aggiornamento stato ordine."); }
	finally { actionLoading.value = null; }
};

const selectedOrder = ref(null);
const showOrderDetail = (order) => { selectedOrder.value = order; };
const closeOrderDetail = () => { selectedOrder.value = null; };

// Vista raggruppata per utente (collassata)
const expandedUsers = ref(new Set());
const toggleUser = (userId) => {
	if (expandedUsers.value.has(userId)) {
		expandedUsers.value.delete(userId);
	} else {
		expandedUsers.value.add(userId);
	}
};

// Raggruppamento ordini per utente
const groupedOrders = computed(() => {
	if (!ordersData.value.data?.length) return [];
	const map = new Map();
	for (const order of ordersData.value.data) {
		const userId = order.user?.id || 'unknown';
		if (!map.has(userId)) {
			map.set(userId, {
				user: order.user,
				orders: [],
				totalAmount: 0,
			});
		}
		const group = map.get(userId);
		group.orders.push(order);
		group.totalAmount += Number(order.subtotal?.amount ?? order.subtotal ?? 0);
	}
	return Array.from(map.values());
});

// Cambia tipo account (privato/commerciante)
// Stati disponibili per il cambio stato (l'admin non può annullare ordini consegnati o in transito)
const getAvailableStatuses = (currentStatus) => {
	const all = [
		{ value: 'pending', label: 'In attesa' },
		{ value: 'processing', label: 'In lavorazione' },
		{ value: 'completed', label: 'Completato' },
		{ value: 'in_transit', label: 'In transito' },
		{ value: 'delivered', label: 'Consegnato' },
		{ value: 'cancelled', label: 'Annullato' },
	];
	// Non permettere annullamento per ordini consegnati o in transito
	if (currentStatus === 'delivered' || currentStatus === 'in_transit') {
		return all.filter(s => s.value !== 'cancelled');
	}
	return all;
};

const changeUserType = async (userId, newType) => {
	console.log(`[AUDIT] Admin changing user #${userId} type to: ${newType}`);
	try {
		await sanctum(`/api/admin/users/${userId}/user-type`, { method: "PATCH", body: { user_type: newType } });
		showSuccess(`Tipo account aggiornato a "${newType}".`);
		// Aggiorna localmente
		for (const order of ordersData.value.data) {
			if (order.user?.id === userId) {
				order.user.user_type = newType;
			}
		}
	} catch (e) { showError(e, "Errore durante l'aggiornamento tipo account."); }
};

// Estrae i dati del punto PUDO dal service_data dei pacchetti dell'ordine
// I dati PUDO vengono salvati dentro service_data quando l'utente sceglie un punto di ritiro
const getPudoFromOrder = (order) => {
	if (!order?.packages?.length) return null;
	for (const pkg of order.packages) {
		const sd = pkg.service?.service_data;
		if (sd?.pudo?.name) return sd.pudo;
	}
	return null;
};

// Admin PUDO: permette all'admin di scegliere/cambiare il punto PUDO per un ordine
const showPudoSelector = ref(false);   // Mostra/nasconde il PudoSelector nel modal
const pudoSaving = ref(false);         // true durante il salvataggio del PUDO

// Quando l'admin seleziona un punto PUDO dal PudoSelector
const onAdminPudoSelected = async (pudo) => {
	if (!selectedOrder.value) return;
	pudoSaving.value = true;
	try {
		await sanctum(`/api/admin/orders/${selectedOrder.value.id}/pudo`, {
			method: 'PATCH',
			body: { pudo_id: pudo.pudo_id, pudo_name: pudo.name, pudo_address: pudo.address, pudo_city: pudo.city, pudo_zip: pudo.zip_code },
		});
		selectedOrder.value.brt_pudo_id = pudo.pudo_id;
		showPudoSelector.value = false;
		showSuccess(`Punto PUDO impostato per ordine #${selectedOrder.value.id}`);
		await fetchOrders();
	} catch (e) {
		showError(e, 'Errore nel salvataggio del punto PUDO.');
	} finally {
		pudoSaving.value = false;
	}
};

// Rimuove il PUDO da un ordine (torna a consegna a domicilio)
const removeAdminPudo = async () => {
	if (!selectedOrder.value) return;
	pudoSaving.value = true;
	try {
		await sanctum(`/api/admin/orders/${selectedOrder.value.id}/pudo`, {
			method: 'PATCH',
			body: { pudo_id: null },
		});
		selectedOrder.value.brt_pudo_id = null;
		showPudoSelector.value = false;
		showSuccess(`Punto PUDO rimosso dall'ordine #${selectedOrder.value.id}`);
		await fetchOrders();
	} catch (e) {
		showError(e, 'Errore nella rimozione del punto PUDO.');
	} finally {
		pudoSaving.value = false;
	}
};

onMounted(() => { fetchOrders(); });
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Il tuo account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Ordini</span>
			</div>

			<h1 class="text-[1.75rem] font-bold text-[#252B42] mb-[24px]">Ordini</h1>

			<!-- Action message -->
			<div
				v-if="actionMessage"
				:class="[
					'mb-[20px] px-[16px] py-[12px] rounded-[12px] text-[0.875rem] font-medium flex items-center gap-[8px]',
					actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200',
				]">
				<svg v-if="actionMessage.type === 'success'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg>
				<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
				{{ actionMessage.text }}
			</div>

			<!-- Search, filters and view toggle -->
			<div class="flex flex-wrap gap-[12px] mb-[20px]">
				<div class="relative flex-1 min-w-[200px]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="absolute left-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#737373]" fill="currentColor"><path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/></svg>
					<input v-model="ordersSearch" @input="onOrdersSearch" type="text" placeholder="Cerca per ID, nome, email..." class="w-full pl-[40px] pr-[14px] py-[10px] bg-white border border-[#E9EBEC] rounded-[50px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
				</div>
				<select v-model="ordersStatusFilter" @change="ordersPage = 1; fetchOrders()" class="px-[14px] py-[10px] bg-white border border-[#E9EBEC] rounded-[50px] text-[0.875rem] focus:border-[#095866] focus:outline-none cursor-pointer">
					<option value="">Tutti gli stati</option>
					<option value="pending">In attesa</option>
					<option value="processing">In lavorazione</option>
					<option value="completed">Completato</option>
					<option value="payed">Pagato</option>
					<option value="in_transit">In transito</option>
					<option value="delivered">Consegnato</option>
					<option value="cancelled">Annullato</option>
					<option value="payment_failed">Pagamento fallito</option>
				</select>
				<button
					@click="groupByUser = !groupByUser"
					:class="['px-[14px] py-[10px] rounded-[50px] text-[0.875rem] font-medium transition-colors cursor-pointer inline-flex items-center gap-[6px]', groupByUser ? 'bg-[#095866] text-white' : 'bg-white border border-[#E9EBEC] text-[#404040] hover:border-[#095866]']">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V18H22V16.5C22,14.17 18.33,13 16,13M8,13C5.67,13 2,14.17 2,16.5V18H14V16.5C14,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"/></svg>
					{{ groupByUser ? 'Vista lista' : 'Per utente' }}
				</button>
			</div>

			<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
				<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">{{ groupByUser ? 'Ordini per utente' : 'Tutti gli ordini' }}</h2>

				<div v-if="tabLoading" class="py-[40px] flex justify-center">
					<div class="w-[32px] h-[32px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
				</div>

				<!-- Error state -->
				<div v-else-if="fetchError" class="text-center py-[48px]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[40px] h-[40px] text-red-300 mx-auto mb-[12px]" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
					<p class="text-[#737373] mb-[12px]">Errore nel caricamento degli ordini.</p>
					<button @click="fetchOrders" class="px-[20px] py-[10px] bg-[#095866] text-white rounded-[50px] text-[0.875rem] font-medium cursor-pointer hover:bg-[#074a56] transition-colors">Riprova</button>
				</div>

				<div v-else-if="!ordersData.data?.length" class="text-center py-[48px] text-[#737373]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[40px] h-[40px] text-[#C8CCD0] mx-auto mb-[12px]" fill="currentColor"><path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5Z"/></svg>
					<p>Nessun ordine trovato.</p>
				</div>

				<!-- VISTA RAGGRUPPATA PER UTENTE (collassata) -->
				<div v-else-if="groupByUser" class="space-y-[10px]">
					<div v-for="group in groupedOrders" :key="group.user?.id || 'unknown'" class="border border-[#E9EBEC] rounded-[14px] overflow-hidden">
						<!-- Header utente (cliccabile per espandere) -->
						<button
							type="button"
							@click="toggleUser(group.user?.id)"
							class="w-full bg-[#F8F9FA] px-[20px] py-[14px] flex items-center justify-between cursor-pointer hover:bg-[#F0F4F5] transition-colors"
							:class="expandedUsers.has(group.user?.id) ? 'border-b border-[#E9EBEC]' : ''">
							<div class="flex items-center gap-[12px]">
								<!-- Freccia espansione -->
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[#737373] transition-transform" :class="expandedUsers.has(group.user?.id) ? 'rotate-90' : ''" fill="currentColor"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/></svg>
								<!-- Avatar -->
								<div class="w-[40px] h-[40px] rounded-full bg-[#095866] flex items-center justify-center text-white text-[0.875rem] font-bold shrink-0">
									{{ (group.user?.name || '?')[0]?.toUpperCase() }}
								</div>
								<div class="text-left">
									<div class="flex items-center gap-[8px]">
										<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ group.user?.name }} {{ group.user?.surname }}</p>
										<!-- Badge tipo account -->
										<span :class="[
											'px-[8px] py-[2px] rounded-full text-[0.625rem] font-semibold uppercase tracking-[0.5px]',
											(group.user?.user_type || 'privato') === 'commerciante' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
										]">
											{{ (group.user?.user_type || 'privato') === 'commerciante' ? 'Commerciante' : 'Privato' }}
										</span>
										<!-- Badge ruolo -->
										<span v-if="group.user?.role === 'Partner Pro'" class="px-[8px] py-[2px] rounded-full text-[0.625rem] font-semibold uppercase tracking-[0.5px] bg-purple-100 text-purple-700">Pro</span>
										<span v-if="group.user?.role === 'Admin'" class="px-[8px] py-[2px] rounded-full text-[0.625rem] font-semibold uppercase tracking-[0.5px] bg-red-100 text-red-700">Admin</span>
									</div>
									<p class="text-[0.75rem] text-[#737373]">{{ group.user?.email }}</p>
								</div>
							</div>
							<div class="flex items-center gap-[12px]">
								<span class="text-[0.75rem] font-medium text-[#095866] bg-[#E8F4FB] px-[10px] py-[4px] rounded-full">{{ group.orders.length }} ordini</span>
								<span class="text-[0.8125rem] font-semibold text-[#252B42]">&euro;{{ formatCents(group.totalAmount) }}</span>
							</div>
						</button>

						<!-- Azioni utente + ordini (visibili solo se espanso) -->
						<div v-if="expandedUsers.has(group.user?.id)">
							<!-- Barra azioni utente -->
							<div class="px-[20px] py-[10px] bg-[#FAFBFC] border-b border-[#F0F0F0] flex items-center gap-[12px]">
								<span class="text-[0.75rem] text-[#737373]">Tipo account:</span>
								<select
									:value="group.user?.user_type || 'privato'"
									@change="changeUserType(group.user?.id, $event.target.value)"
									class="px-[10px] py-[4px] rounded-[8px] bg-white border border-[#E9EBEC] text-[0.75rem] cursor-pointer focus:border-[#095866] focus:outline-none">
									<option value="privato">Privato</option>
									<option value="commerciante">Commerciante</option>
								</select>
							</div>
							<!-- Ordini dell'utente -->
							<div class="divide-y divide-[#F0F0F0]">
								<div v-for="order in group.orders" :key="order.id" class="flex items-center justify-between px-[20px] py-[12px] hover:bg-[#FAFBFC] transition-colors">
									<div class="flex items-center gap-[14px]">
										<span class="text-[0.8125rem] font-bold text-[#252B42]">#{{ order.id }}</span>
										<span class="text-[0.8125rem] text-[#737373]">{{ order.packages?.length || 0 }} colli</span>
										<span v-if="order.brt_pudo_id" class="text-[0.625rem] font-semibold bg-[#095866]/10 text-[#095866] px-[6px] py-[2px] rounded">PUDO</span>
									</div>
									<div class="flex items-center gap-[10px]">
										<span class="text-[0.875rem] font-semibold text-[#252B42]">&euro;{{ formatCents(order.subtotal?.amount ?? order.subtotal) }}</span>
										<span :class="['inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium', orderStatusConfig[order.status]?.bg || 'bg-gray-50', orderStatusConfig[order.status]?.text || 'text-gray-700']">
											{{ orderStatusConfig[order.status]?.label || order.status }}
										</span>
										<span class="text-[0.75rem] text-[#737373] hidden desktop:inline">{{ formatDate(order.created_at) }}</span>
										<button @click="showOrderDetail(order)" class="px-[10px] py-[6px] rounded-[8px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] text-[0.75rem] cursor-pointer font-medium">Dettagli</button>
										<select @change="changeOrderStatus(order.id, $event.target.value, order.status); $event.target.value = ''" class="px-[8px] py-[6px] rounded-[8px] bg-[#095866] text-white text-[0.75rem] cursor-pointer border-0 font-medium">
											<option value="" selected disabled>Stato</option>
											<option v-for="s in getAvailableStatuses(order.status)" :key="s.value" :value="s.value">{{ s.label }}</option>
										</select>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- VISTA LISTA FLAT (originale) -->
				<div v-else class="overflow-x-auto">
					<table class="w-full text-[0.875rem]">
						<thead>
							<tr class="border-b border-[#E9EBEC] text-left text-[#737373]">
								<th class="pb-[12px] font-medium">ID</th>
								<th class="pb-[12px] font-medium">Utente</th>
								<th class="pb-[12px] font-medium">Colli</th>
								<th class="pb-[12px] font-medium text-right">Importo</th>
								<th class="pb-[12px] font-medium">Stato</th>
								<th class="pb-[12px] font-medium">BRT</th>
								<th class="pb-[12px] font-medium">Data</th>
								<th class="pb-[12px] font-medium text-right">Azioni</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(order, idx) in ordersData.data" :key="order.id" :class="['border-b border-[#F0F0F0] last:border-0', idx % 2 === 1 ? 'bg-[#FAFBFC]' : '']">
								<td class="py-[14px] font-bold text-[#252B42]">#{{ order.id }}</td>
								<td class="py-[14px]">
									<span class="text-[#252B42] font-medium">{{ order.user?.name }} {{ order.user?.surname }}</span>
									<br /><span class="text-[0.75rem] text-[#737373]">{{ order.user?.email }}</span>
								</td>
								<td class="py-[14px] text-[#404040]">{{ order.packages?.length || 0 }}</td>
								<td class="py-[14px] text-right font-semibold text-[#252B42]">&euro;{{ formatCents(order.subtotal?.amount ?? order.subtotal) }}</td>
								<td class="py-[14px]">
									<span :class="['inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium', orderStatusConfig[order.status]?.bg || 'bg-gray-50', orderStatusConfig[order.status]?.text || 'text-gray-700']">
										{{ orderStatusConfig[order.status]?.label || order.status }}
									</span>
								</td>
								<td class="py-[14px]">
									<span v-if="order.brt_parcel_id" class="text-[0.75rem] font-mono bg-indigo-50 text-indigo-700 px-[6px] py-[2px] rounded">{{ order.brt_parcel_id }}</span>
									<span v-else class="text-[#C8CCD0]">&mdash;</span>
									<span v-if="order.brt_pudo_id" class="ml-[4px] text-[0.625rem] font-semibold bg-[#095866]/10 text-[#095866] px-[6px] py-[2px] rounded" title="Ritiro in Punto BRT">PUDO</span>
								</td>
								<td class="py-[14px] text-[#737373] text-[0.8125rem]">{{ formatDate(order.created_at) }}</td>
								<td class="py-[14px] text-right">
									<div class="flex justify-end gap-[6px]">
										<button @click="showOrderDetail(order)" class="px-[10px] py-[6px] rounded-[8px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] text-[0.75rem] cursor-pointer font-medium">Dettagli</button>
										<select @change="changeOrderStatus(order.id, $event.target.value, order.status); $event.target.value = ''" class="px-[8px] py-[6px] rounded-[8px] bg-[#095866] text-white text-[0.75rem] cursor-pointer border-0 font-medium">
											<option value="" selected disabled>Stato</option>
											<option v-for="s in getAvailableStatuses(order.status)" :key="s.value" :value="s.value">{{ s.label }}</option>
										</select>
									</div>
								</td>
							</tr>
						</tbody>
					</table>

					<div v-if="ordersData.last_page > 1" class="flex items-center justify-center gap-[8px] mt-[20px]">
						<button @click="ordersPage = Math.max(1, ordersPage - 1); fetchOrders()" :disabled="ordersPage <= 1" class="px-[12px] py-[8px] rounded-[8px] bg-[#F0F0F0] text-[0.8125rem] font-medium disabled:opacity-40 cursor-pointer hover:bg-[#E0E0E0]">Precedente</button>
						<span class="text-[0.8125rem] text-[#737373]">Pagina {{ ordersPage }} di {{ ordersData.last_page }}</span>
						<button @click="ordersPage = Math.min(ordersData.last_page, ordersPage + 1); fetchOrders()" :disabled="ordersPage >= ordersData.last_page" class="px-[12px] py-[8px] rounded-[8px] bg-[#F0F0F0] text-[0.8125rem] font-medium disabled:opacity-40 cursor-pointer hover:bg-[#E0E0E0]">Successiva</button>
					</div>
				</div>

				<!-- Pagination for grouped view -->
				<div v-if="groupByUser && ordersData.last_page > 1" class="flex items-center justify-center gap-[8px] mt-[20px]">
					<button @click="ordersPage = Math.max(1, ordersPage - 1); fetchOrders()" :disabled="ordersPage <= 1" class="px-[12px] py-[8px] rounded-[8px] bg-[#F0F0F0] text-[0.8125rem] font-medium disabled:opacity-40 cursor-pointer hover:bg-[#E0E0E0]">Precedente</button>
					<span class="text-[0.8125rem] text-[#737373]">Pagina {{ ordersPage }} di {{ ordersData.last_page }}</span>
					<button @click="ordersPage = Math.min(ordersData.last_page, ordersPage + 1); fetchOrders()" :disabled="ordersPage >= ordersData.last_page" class="px-[12px] py-[8px] rounded-[8px] bg-[#F0F0F0] text-[0.8125rem] font-medium disabled:opacity-40 cursor-pointer hover:bg-[#E0E0E0]">Successiva</button>
				</div>
			</div>

			<!-- Order detail modal -->
			<div v-if="selectedOrder" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-[20px]" @click.self="closeOrderDetail">
				<div class="bg-white rounded-[20px] p-[28px] shadow-2xl max-w-[750px] w-full max-h-[80vh] overflow-y-auto">
					<div class="flex items-center justify-between mb-[24px]">
						<h3 class="text-[1.125rem] font-bold text-[#252B42]">Ordine #{{ selectedOrder.id }}</h3>
						<button @click="closeOrderDetail" class="w-[36px] h-[36px] flex items-center justify-center rounded-full bg-[#F0F0F0] hover:bg-[#E0E0E0] cursor-pointer">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[#404040]" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
						</button>
					</div>

					<div class="grid grid-cols-2 gap-[16px] mb-[20px]">
						<div>
							<p class="text-[0.75rem] text-[#737373] mb-[4px]">Utente</p>
							<p class="text-[0.875rem] font-medium text-[#252B42]">{{ selectedOrder.user?.name }} {{ selectedOrder.user?.surname }}</p>
							<p class="text-[0.8125rem] text-[#737373]">{{ selectedOrder.user?.email }}</p>
						</div>
						<div>
							<p class="text-[0.75rem] text-[#737373] mb-[4px]">Stato</p>
							<span :class="['inline-flex items-center gap-[4px] px-[10px] py-[4px] rounded-full text-[0.75rem] font-medium', orderStatusConfig[selectedOrder.status]?.bg, orderStatusConfig[selectedOrder.status]?.text]">
								{{ orderStatusConfig[selectedOrder.status]?.label || selectedOrder.status }}
							</span>
						</div>
						<div>
							<p class="text-[0.75rem] text-[#737373] mb-[4px]">Importo</p>
							<p class="text-[1rem] font-bold text-[#252B42]">&euro;{{ formatCents(selectedOrder.subtotal?.amount ?? selectedOrder.subtotal) }}</p>
						</div>
						<div>
							<p class="text-[0.75rem] text-[#737373] mb-[4px]">Data</p>
							<p class="text-[0.875rem] text-[#404040]">{{ formatDate(selectedOrder.created_at) }}</p>
						</div>
					</div>

					<div v-if="selectedOrder.brt_parcel_id" class="bg-indigo-50 rounded-[12px] p-[16px] mb-[16px]">
						<p class="text-[0.75rem] font-medium text-indigo-700 mb-[6px]">Dati BRT</p>
						<div class="grid grid-cols-2 gap-[8px] text-[0.8125rem]">
							<div><span class="text-[#737373]">Parcel ID:</span> <span class="font-mono font-medium text-indigo-800">{{ selectedOrder.brt_parcel_id }}</span></div>
							<div v-if="selectedOrder.brt_numeric_sender_reference"><span class="text-[#737373]">Rif. Mittente:</span> <span class="font-mono">{{ selectedOrder.brt_numeric_sender_reference }}</span></div>
						</div>
						<div class="flex gap-[8px] mt-[10px]">
							<a v-if="selectedOrder.brt_tracking_url" :href="selectedOrder.brt_tracking_url" target="_blank" class="inline-flex items-center gap-[4px] px-[12px] py-[6px] bg-indigo-600 text-white rounded-[8px] text-[0.75rem] font-medium hover:bg-indigo-700 transition-colors">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M18,15A3,3 0 0,1 21,18A3,3 0 0,1 18,21C16.69,21 15.58,20.17 15.17,19H14V17H15.17C15.58,15.83 16.69,15 18,15M18,17A1,1 0 0,0 17,18A1,1 0 0,0 18,19A1,1 0 0,0 19,18A1,1 0 0,0 18,17M6,15A3,3 0 0,1 9,18A3,3 0 0,1 6,21A3,3 0 0,1 3,18A3,3 0 0,1 6,15M6,17A1,1 0 0,0 5,18A1,1 0 0,0 6,19A1,1 0 0,0 7,18A1,1 0 0,0 6,17M11,7L9.5,13H13.5L12,7M9,3H14L18,17H12.5L12,15H11L10.5,17H5L9,3Z"/></svg> Tracking BRT
							</a>
							<button v-if="selectedOrder.brt_parcel_id" @click="downloadLabel(selectedOrder)" class="inline-flex items-center gap-[4px] px-[12px] py-[6px] bg-white border border-indigo-300 text-indigo-700 rounded-[8px] text-[0.75rem] font-medium hover:bg-indigo-50 cursor-pointer transition-colors">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg> Scarica etichetta
							</button>
						</div>
					</div>

					<!-- Sezione PUDO: mostra il punto PUDO attuale + bottoni admin per gestirlo -->
					<div class="bg-[#095866]/10 rounded-[12px] p-[16px] mb-[16px]">
						<div class="flex items-center justify-between mb-[6px]">
							<div class="flex items-center gap-[8px]">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
								<span class="text-[0.875rem] font-bold text-[#095866]">Punto di ritiro BRT</span>
							</div>
							<div class="flex gap-[6px]">
								<button
									@click="showPudoSelector = !showPudoSelector"
									class="px-[10px] py-[4px] rounded-[8px] bg-[#095866] text-white text-[0.75rem] font-medium cursor-pointer hover:bg-[#074a56] transition-colors inline-flex items-center gap-[4px]">
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
									{{ selectedOrder.brt_pudo_id ? 'Cambia' : 'Scegli' }}
								</button>
								<button
									v-if="selectedOrder.brt_pudo_id"
									@click="removeAdminPudo"
									:disabled="pudoSaving"
									class="px-[10px] py-[4px] rounded-[8px] bg-red-500 text-white text-[0.75rem] font-medium cursor-pointer hover:bg-red-600 transition-colors disabled:opacity-50">
									Rimuovi
								</button>
							</div>
						</div>
						<!-- Info PUDO attuale -->
						<template v-if="selectedOrder.brt_pudo_id">
							<p class="text-[0.8125rem] text-[#404040]">PUDO ID: <span class="font-mono font-medium">{{ selectedOrder.brt_pudo_id }}</span></p>
							<template v-if="getPudoFromOrder(selectedOrder)">
								<p class="text-[0.8125rem] text-[#252B42] font-semibold mt-[4px]">{{ getPudoFromOrder(selectedOrder).name }}</p>
								<p class="text-[0.8125rem] text-[#737373]">{{ getPudoFromOrder(selectedOrder).address }}, {{ getPudoFromOrder(selectedOrder).zip_code }} {{ getPudoFromOrder(selectedOrder).city }}</p>
							</template>
						</template>
						<p v-else class="text-[0.8125rem] text-[#737373]">Consegna a domicilio (nessun punto PUDO selezionato)</p>

						<!-- PudoSelector per l'admin -->
						<div v-if="showPudoSelector" class="mt-[12px] pt-[12px] border-t border-[#095866]/20">
							<PudoSelector @select="onAdminPudoSelected" @deselect="() => {}" />
						</div>
					</div>

					<div v-if="selectedOrder.is_cod" class="bg-amber-50 rounded-[12px] p-[12px] mb-[16px] text-[0.8125rem]">
						<span class="font-medium text-amber-800">Contrassegno: &euro;{{ formatCurrency(selectedOrder.cod_amount) }}</span>
					</div>

					<div v-if="selectedOrder.packages?.length" class="mb-[16px]">
						<p class="text-[0.75rem] font-medium text-[#737373] mb-[8px] uppercase tracking-[0.5px]">Colli ({{ selectedOrder.packages.length }})</p>
						<div class="space-y-[6px]">
							<div v-for="pkg in selectedOrder.packages" :key="pkg.id" class="p-[12px] rounded-[50px] border border-[#E9EBEC] text-[0.8125rem]">
								<span class="font-medium text-[#252B42]">{{ pkg.weight }}kg</span>
								<span class="text-[#737373] ml-[8px]">{{ pkg.first_size }}x{{ pkg.second_size }}x{{ pkg.third_size }} cm</span>
								<span v-if="pkg.service" class="text-[0.75rem] ml-[8px] px-[6px] py-[1px] bg-[#F0F0F0] rounded text-[#737373]">{{ pkg.service.service_type }}</span>
							</div>
						</div>
					</div>

					<div v-if="selectedOrder.transactions?.length">
						<p class="text-[0.75rem] font-medium text-[#737373] mb-[8px] uppercase tracking-[0.5px]">Transazioni</p>
						<div class="space-y-[6px]">
							<div v-for="tx in selectedOrder.transactions" :key="tx.id" class="flex items-center justify-between p-[12px] rounded-[50px] border border-[#E9EBEC] text-[0.8125rem]">
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
		</div>
	</section>
</template>
