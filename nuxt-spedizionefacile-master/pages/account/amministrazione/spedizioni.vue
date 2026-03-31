<!--
  FILE: pages/account/amministrazione/spedizioni.vue
  SCOPO: Pannello admin — lista di tutte le spedizioni BRT della piattaforma.
         Ricerca, filtri per stato, download etichette, link tracking, cambio stato.
  API: GET /api/admin/shipments?page=&search=&status= — lista spedizioni paginata,
       PATCH /api/admin/orders/{id}/status — cambio stato ordine.
  COMPONENTI: nessun componente custom.
  ROUTE: /account/amministrazione/spedizioni (middleware sanctum:auth + admin).

  DATI IN INGRESSO:
    - shipmentsData (da fetchShipments) — lista spedizioni paginata.
    - useAdmin() — composable con utility admin (formatDate, statusConfig, downloadLabel).

  DATI IN USCITA:
    - PATCH su stato ordine.

  VINCOLI:
    - Solo utenti Admin (middleware admin).
    - La ricerca ha debounce di 400ms.
    - Mostra solo spedizioni con brt_parcel_id (inviate a BRT).

  ERRORI TIPICI:
    - Nessuna spedizione trovata → empty state con icona camion.

  PUNTI DI MODIFICA SICURI:
    - Aggiungere colonne alla tabella: modificare <thead> e <tbody>.
    - Aggiungere stati al filtro: aggiungere <option> nel <select>.

  COLLEGAMENTI:
    - composables/useAdmin.js → utility condivise admin.
    - pages/account/amministrazione/ordini.vue → gestione ordini (complementare).
-->
<script setup>
definePageMeta({
	middleware: ["app-auth", "admin"],
});

const sanctum = useSanctumClient();
const { actionLoading, actionMessage, showSuccess, showError, formatCurrency, formatDate, orderStatusConfig, downloadLabel } = useAdmin();

const shipmentsData = ref({ data: [], last_page: 1 });
const shipmentsPage = ref(1);
const shipmentsSearch = ref("");
const shipmentsStatusFilter = ref("");
const tabLoading = ref(false);

const fetchShipments = async () => {
	tabLoading.value = true;
	try {
		const params = new URLSearchParams();
		params.set("page", shipmentsPage.value);
		if (shipmentsSearch.value) params.set("search", shipmentsSearch.value);
		if (shipmentsStatusFilter.value) params.set("status", shipmentsStatusFilter.value);
		const res = await sanctum(`/api/admin/shipments?${params.toString()}`);
		shipmentsData.value = res;
	} catch (e) { shipmentsData.value = { data: [], last_page: 1 }; }
	tabLoading.value = false;
};

let shipmentsSearchTimeout;
const onShipmentsSearch = () => {
	clearTimeout(shipmentsSearchTimeout);
	shipmentsSearchTimeout = setTimeout(() => { shipmentsPage.value = 1; fetchShipments(); }, 400);
};

const changeOrderStatus = async (orderId, status) => {
	actionLoading.value = `order-${orderId}`;
	try {
		await sanctum(`/api/admin/orders/${orderId}/status`, { method: "PATCH", body: { status } });
		showSuccess(`Stato ordine #${orderId} aggiornato.`);
		await fetchShipments();
	} catch (e) { showError(e, "Errore durante l'aggiornamento stato ordine."); }
	finally { actionLoading.value = null; }
};

onMounted(() => { fetchShipments(); });
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Admin"
				title="Spedizioni"
				description="Tracking, etichette e stati."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Amministrazione', to: '/account/amministrazione' },
					{ label: 'Spedizioni' },
				]"
				back-to="/account/amministrazione"
				back-label="Torna all'amministrazione" />
			<div class="bg-blue-50 rounded-[12px] px-[16px] py-[10px] border border-blue-200 mb-[24px] flex items-center gap-[8px]">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-blue-600 shrink-0" fill="currentColor"><path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
				<p class="text-[0.8125rem] text-blue-700">Questa sezione mostra <strong>tutte le spedizioni BRT di tutti gli utenti</strong> della piattaforma. Per le tue spedizioni personali, vai su "Le mie spedizioni".</p>
			</div>

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

			<div class="flex flex-wrap gap-[12px] mb-[20px]">
				<div class="relative flex-1 min-w-[200px]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="absolute left-[12px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#737373]" fill="currentColor"><path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/></svg>
					<input v-model="shipmentsSearch" @input="onShipmentsSearch" type="text" placeholder="Cerca Parcel ID o utente..." class="w-full pl-[40px] pr-[14px] py-[10px] bg-white border border-[#E9EBEC] rounded-[50px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
				</div>
				<select v-model="shipmentsStatusFilter" @change="shipmentsPage = 1; fetchShipments()" class="px-[14px] py-[10px] bg-white border border-[#E9EBEC] rounded-[50px] text-[0.875rem] focus:border-[#095866] focus:outline-none cursor-pointer">
					<option value="">Tutti gli stati</option>
					<option value="completed">Completato</option>
					<option value="payed">Pagato</option>
					<option value="in_transit">In transito</option>
					<option value="delivered">Consegnato</option>
					<option value="in_giacenza">In giacenza</option>
				</select>
			</div>

			<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
				<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">Spedizioni</h2>

				<div v-if="tabLoading" class="py-[40px] flex justify-center">
					<div class="w-[32px] h-[32px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
				</div>

				<div v-else-if="!shipmentsData.data?.length" class="text-center py-[48px] text-[#737373]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[40px] h-[40px] text-[#C8CCD0] mx-auto mb-[12px]" fill="currentColor"><path d="M3,4A2,2 0 0,0 1,6V17H3A3,3 0 0,0 6,20A3,3 0 0,0 9,17H15A3,3 0 0,0 18,20A3,3 0 0,0 21,17H23V12L20,8H17V4M17,9.5H19.5L21.47,12H17M6,15.5A1.5,1.5 0 0,1 7.5,17A1.5,1.5 0 0,1 6,18.5A1.5,1.5 0 0,1 4.5,17A1.5,1.5 0 0,1 6,15.5M18,15.5A1.5,1.5 0 0,1 19.5,17A1.5,1.5 0 0,1 18,18.5A1.5,1.5 0 0,1 16.5,17A1.5,1.5 0 0,1 18,15.5Z"/></svg>
					<p>Nessuna spedizione BRT trovata.</p>
				</div>

				<div v-else class="space-y-[12px]">
					<div class="tablet:hidden space-y-[12px]">
						<div v-for="(s, idx) in shipmentsData.data" :key="s.id" class="rounded-[16px] border border-[#E9EBEC] bg-[#F8FAFB] p-[14px] shadow-sm">
							<div class="flex items-start justify-between gap-[12px]">
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-[8px] mb-[6px]">
										<span class="text-[0.9375rem] font-bold text-[#252B42]">#{{ s.id }}</span>
										<span :class="['inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium', orderStatusConfig[s.status]?.bg || 'bg-gray-50', orderStatusConfig[s.status]?.text || 'text-gray-700']">
											{{ orderStatusConfig[s.status]?.label || s.status }}
										</span>
									</div>
									<p class="text-[0.875rem] font-medium text-[#252B42] truncate">{{ s.user?.name }} {{ s.user?.surname }}</p>
									<p class="text-[0.75rem] text-[#737373] truncate">{{ s.user?.email }}</p>
								</div>
								<div class="text-right shrink-0">
									<p class="text-[0.75rem] text-[#737373]">{{ formatDate(s.created_at) }}</p>
									<p v-if="s.is_cod" class="text-[0.875rem] font-semibold text-amber-700">&euro;{{ formatCurrency(s.cod_amount) }}</p>
									<p v-else class="text-[0.75rem] text-[#C8CCD0]">&mdash;</p>
								</div>
							</div>
							<div class="flex flex-wrap items-center gap-[8px] mt-[12px] text-[0.75rem]">
								<span v-if="s.brt_parcel_id" class="font-mono bg-indigo-50 text-indigo-700 px-[6px] py-[2px] rounded">{{ s.brt_parcel_id }}</span>
								<span v-else class="text-[#C8CCD0]">&mdash;</span>
								<span v-if="s.brt_pudo_id" class="text-[0.625rem] font-semibold bg-[#095866]/10 text-[#095866] px-[6px] py-[2px] rounded">PUDO</span>
							</div>
							<div class="mt-[12px] grid grid-cols-2 gap-[8px]">
								<a v-if="s.brt_tracking_url" :href="s.brt_tracking_url" target="_blank" class="inline-flex items-center justify-center gap-[4px] px-[12px] py-[9px] rounded-[10px] bg-indigo-50 text-indigo-700 text-[0.75rem] font-medium hover:bg-indigo-100 transition-colors">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M18,15A3,3 0 0,1 21,18A3,3 0 0,1 18,21C16.69,21 15.58,20.17 15.17,19H14V17H15.17C15.58,15.83 16.69,15 18,15M18,17A1,1 0 0,0 17,18A1,1 0 0,0 18,19A1,1 0 0,0 19,18A1,1 0 0,0 18,17M6,15A3,3 0 0,1 9,18A3,3 0 0,1 6,21A3,3 0 0,1 3,18A3,3 0 0,1 6,15M6,17A1,1 0 0,0 5,18A1,1 0 0,0 6,19A1,1 0 0,0 7,18A1,1 0 0,0 6,17M11,7L9.5,13H13.5L12,7M9,3H14L18,17H12.5L12,15H11L10.5,17H5L9,3Z"/></svg>
									Tracking
								</a>
								<button v-if="s.brt_parcel_id" @click="downloadLabel(s)" class="inline-flex items-center justify-center gap-[4px] px-[12px] py-[9px] rounded-[10px] bg-emerald-50 text-emerald-700 text-[0.75rem] font-medium hover:bg-emerald-100 cursor-pointer transition-colors">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg>
									Etichetta
								</button>
								<button v-else disabled class="inline-flex items-center justify-center gap-[4px] px-[12px] py-[9px] rounded-[10px] bg-gray-50 text-[#C8CCD0] text-[0.75rem] font-medium cursor-not-allowed">
									No label
								</button>
								<select @change="changeOrderStatus(s.id, $event.target.value); $event.target.value = ''" class="col-span-2 w-full px-[10px] py-[9px] rounded-[10px] bg-white text-[#252B42] text-[0.75rem] cursor-pointer border border-[#D7E1E4] font-medium focus:border-[#095866] focus:outline-none">
									<option value="" selected disabled>Stato</option>
									<option value="in_transit">In transito</option>
									<option value="delivered">Consegnato</option>
									<option value="in_giacenza">In giacenza</option>
								</select>
							</div>
						</div>
					</div>

					<div class="hidden tablet:block overflow-x-auto">
					<table class="w-full text-[0.875rem]">
						<thead>
							<tr class="border-b border-[#E9EBEC] text-left text-[#737373]">
								<th class="pb-[12px] font-medium">Ordine</th>
								<th class="pb-[12px] font-medium">Utente</th>
								<th class="pb-[12px] font-medium">Parcel ID</th>
								<th class="pb-[12px] font-medium">Stato</th>
								<th class="pb-[12px] font-medium">COD</th>
								<th class="pb-[12px] font-medium">Data</th>
								<th class="pb-[12px] font-medium text-right">Azioni</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(s, idx) in shipmentsData.data" :key="s.id" :class="['border-b border-[#F0F0F0] last:border-0', idx % 2 === 1 ? 'bg-[#FAFBFC]' : '']">
								<td class="py-[14px] font-bold text-[#252B42]">#{{ s.id }}</td>
								<td class="py-[14px] text-[#404040]">{{ s.user?.name }} {{ s.user?.surname }}</td>
								<td class="py-[14px]">
									<span class="font-mono text-[0.8125rem] text-indigo-700">{{ s.brt_parcel_id }}</span>
									<span v-if="s.brt_pudo_id" class="ml-[4px] text-[0.625rem] font-semibold bg-[#095866]/10 text-[#095866] px-[6px] py-[2px] rounded" title="Ritiro in Punto BRT">PUDO</span>
								</td>
								<td class="py-[14px]">
									<span :class="['inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium', orderStatusConfig[s.status]?.bg || 'bg-gray-50', orderStatusConfig[s.status]?.text || 'text-gray-700']">
										<svg v-if="s.status === 'pending'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/></svg>
										<svg v-else-if="s.status === 'processing'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.04 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.04 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/></svg>
										<svg v-else-if="s.status === 'completed' || s.status === 'payed'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg>
										<svg v-else-if="s.status === 'in_transit'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M3,4A2,2 0 0,0 1,6V17H3A3,3 0 0,0 6,20A3,3 0 0,0 9,17H15A3,3 0 0,0 18,20A3,3 0 0,0 21,17H23V12L20,8H17V4M17,9.5H19.5L21.47,12H17M6,15.5A1.5,1.5 0 0,1 7.5,17A1.5,1.5 0 0,1 6,18.5A1.5,1.5 0 0,1 4.5,17A1.5,1.5 0 0,1 6,15.5M18,15.5A1.5,1.5 0 0,1 19.5,17A1.5,1.5 0 0,1 18,18.5A1.5,1.5 0 0,1 16.5,17A1.5,1.5 0 0,1 18,15.5Z"/></svg>
										<svg v-else-if="s.status === 'delivered'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5Z"/></svg>
										<svg v-else-if="s.status === 'cancelled' || s.status === 'payment_failed'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12C4,13.85 4.63,15.55 5.68,16.91L16.91,5.68C15.55,4.63 13.85,4 12,4M12,20A8,8 0 0,0 20,12C20,10.15 19.37,8.45 18.32,7.09L7.09,18.32C8.45,19.37 10.15,20 12,20Z"/></svg>
										<svg v-else-if="s.status === 'in_giacenza'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5Z"/></svg>
										{{ orderStatusConfig[s.status]?.label || s.status }}
									</span>
								</td>
								<td class="py-[14px]">
									<span v-if="s.is_cod" class="text-amber-700 font-medium">&euro;{{ formatCurrency(s.cod_amount) }}</span>
									<span v-else class="text-[#C8CCD0]">&mdash;</span>
								</td>
								<td class="py-[14px] text-[#737373] text-[0.8125rem]">{{ formatDate(s.created_at) }}</td>
								<td class="py-[14px] text-right">
									<div class="flex justify-end gap-[6px]">
										<a v-if="s.brt_tracking_url" :href="s.brt_tracking_url" target="_blank" class="px-[8px] py-[5px] rounded-[6px] bg-indigo-50 text-indigo-700 text-[0.6875rem] font-medium hover:bg-indigo-100 transition-colors inline-flex items-center gap-[3px]">
											<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M18,15A3,3 0 0,1 21,18A3,3 0 0,1 18,21C16.69,21 15.58,20.17 15.17,19H14V17H15.17C15.58,15.83 16.69,15 18,15M18,17A1,1 0 0,0 17,18A1,1 0 0,0 18,19A1,1 0 0,0 19,18A1,1 0 0,0 18,17M6,15A3,3 0 0,1 9,18A3,3 0 0,1 6,21A3,3 0 0,1 3,18A3,3 0 0,1 6,15M6,17A1,1 0 0,0 5,18A1,1 0 0,0 6,19A1,1 0 0,0 7,18A1,1 0 0,0 6,17M11,7L9.5,13H13.5L12,7M9,3H14L18,17H12.5L12,15H11L10.5,17H5L9,3Z"/></svg> Tracking
										</a>
										<button v-if="s.brt_parcel_id" @click="downloadLabel(s)" class="px-[8px] py-[5px] rounded-[6px] bg-emerald-50 text-emerald-700 text-[0.6875rem] font-medium hover:bg-emerald-100 cursor-pointer transition-colors inline-flex items-center gap-[3px]">
											<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[12px] h-[12px]" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg> Etichetta
										</button>
										<span v-else class="px-[8px] py-[5px] rounded-[6px] bg-gray-50 text-[#C8CCD0] text-[0.6875rem]">No label</span>
										<select @change="changeOrderStatus(s.id, $event.target.value); $event.target.value = ''" class="px-[6px] py-[5px] rounded-[6px] bg-[#095866] text-white text-[0.6875rem] cursor-pointer border-0 font-medium">
											<option value="" selected disabled>Stato</option>
											<option value="in_transit">In transito</option>
											<option value="delivered">Consegnato</option>
											<option value="in_giacenza">In giacenza</option>
										</select>
									</div>
								</td>
							</tr>
						</tbody>
					</table>

						<div v-if="shipmentsData.last_page > 1" class="flex items-center justify-center gap-[8px] mt-[20px]">
							<button @click="shipmentsPage = Math.max(1, shipmentsPage - 1); fetchShipments()" :disabled="shipmentsPage <= 1" class="px-[12px] py-[8px] rounded-[8px] bg-[#F0F0F0] text-[0.8125rem] font-medium disabled:opacity-40 cursor-pointer hover:bg-[#E0E0E0]">Precedente</button>
							<span class="text-[0.8125rem] text-[#737373]">Pagina {{ shipmentsPage }} di {{ shipmentsData.last_page }}</span>
							<button @click="shipmentsPage = Math.min(shipmentsData.last_page, shipmentsPage + 1); fetchShipments()" :disabled="shipmentsPage >= shipmentsData.last_page" class="px-[12px] py-[8px] rounded-[8px] bg-[#F0F0F0] text-[0.8125rem] font-medium disabled:opacity-40 cursor-pointer hover:bg-[#E0E0E0]">Successiva</button>
						</div>
					</div>
				</div>
			</div>
		</div>
		</section>
</template>
