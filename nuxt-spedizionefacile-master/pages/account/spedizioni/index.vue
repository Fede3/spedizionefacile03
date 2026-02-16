<!--
  FILE: pages/account/spedizioni/index.vue
  SCOPO: Lista ordini utente — filtro per stato, pagamento in sospeso, annullamento, salva come configurata.

  API: GET /api/orders (lista ordini), POST /api/orders/{id}/cancel (annulla ordine),
       POST /api/saved-shipments (salva configurazione), GET /api/saved-shipments (lista salvate).
  COMPONENTI: nessuno di esterno (solo NuxtLink).
  ROUTE: /account/spedizioni (middleware sanctum:auth).

  DATI IN INGRESSO: nessuno (carica tutti gli ordini dell'utente autenticato).
  DATI IN USCITA: navigazione a /account/spedizioni/{id}, /checkout?order_id={id}.

  VINCOLI: single_price nel DB e' in centesimi; va diviso per 100 quando si salva come configurata.
           L'annullamento di ordini pagati applica una commissione di 2 EUR.
  ERRORI TIPICI: non convertire single_price da centesimi a euro al salvataggio come configurata.
  PUNTI DI MODIFICA SICURI: filtri (array filters), colori stato, layout card.
  COLLEGAMENTI: pages/account/spedizioni/[id].vue, pages/checkout.vue, controllers/OrderController.php.
-->
<script setup>
/* Richiede che l'utente sia autenticato */
definePageMeta({
	middleware: ["sanctum:auth"],
});

/* Filtri disponibili per lo stato delle spedizioni */
const filters = ref(["Tutti", "Aperti", "Chiusi", "Annullati", "In giacenza", "Bozze"]);
/* Indice del filtro attivo (0 = Tutti) */
const activeFilter = ref(0);
/* Testo del filtro attivo, usato per filtrare la lista */
const textFilter = ref("Tutti");

/* Carica tutti gli ordini dell'utente dal server. "refresh" permette di ricaricarli */
// lazy: true — la lista ordini si carica dopo il render iniziale (mostra skeleton nel frattempo)
const { data: orders, refresh, status: ordersStatus } = useSanctumFetch("/api/orders", {
	method: "GET",
	lazy: true,
});

/* Cambia il filtro attivo quando l'utente clicca su un tab (es. "Aperti", "Chiusi") */
const changeFilter = (filter, filterIndex) => {
	activeFilter.value = filterIndex;
	textFilter.value = filter;
};

/* Converte lo stato in italiano (es. "In attesa") nel codice interno (es. "pending") */
const statusRaw = (status) => {
	const map = {
		'In attesa': 'pending',
		'In lavorazione': 'processing',
		'Completato': 'completed',
		'Fallito': 'payment_failed',
		'Pagato': 'payed',
		'Annullato': 'cancelled',
		'Rimborsato': 'refunded',
		'In transito': 'in_transit',
		'Consegnato': 'delivered',
		'In giacenza': 'in_giacenza',
	};
	return map[status] || status;
};

/* Restituisce le classi CSS colorate in base allo stato (verde = completato, rosso = fallito, ecc.) */
const statusColor = (status) => {
	const raw = statusRaw(status);
	const map = {
		pending: 'bg-yellow-100 text-yellow-700',
		processing: 'bg-blue-100 text-blue-700',
		completed: 'bg-emerald-100 text-emerald-700',
		payment_failed: 'bg-red-100 text-red-700',
		payed: 'bg-emerald-100 text-emerald-700',
		cancelled: 'bg-gray-200 text-gray-600',
		refunded: 'bg-orange-100 text-orange-700',
		in_transit: 'bg-blue-100 text-blue-700',
		delivered: 'bg-emerald-100 text-emerald-700',
		in_giacenza: 'bg-orange-100 text-orange-700',
	};
	return map[raw] || 'bg-gray-100 text-gray-700';
};

/* Lista ordini filtrata in base al tab selezionato. Si aggiorna automaticamente */
const filteredOrders = computed(() => {
	if (!orders.value?.data) return [];
	if (textFilter.value === 'Tutti') return orders.value.data;

	const filterMap = {
		'Aperti': ['In attesa', 'In lavorazione', 'In transito', 'Pagato'],
		'Chiusi': ['Completato', 'Consegnato'],
		'Annullati': ['Annullato', 'Rimborsato', 'Fallito'],
		'In giacenza': ['In giacenza'],
		'Bozze': ['In attesa', 'Fallito'],
	};

	const allowed = filterMap[textFilter.value] || [];
	return orders.value.data.filter(order => allowed.includes(order.status));
});

/* Formatta una data nel formato italiano (es. "13/02/2026") */
const formatDate = (dateStr) => {
	if (!dateStr) return '—';
	try {
		const d = new Date(dateStr);
		return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
	} catch (e) {
		return dateStr;
	}
};

/* Restituisce l'icona del pacco in base al tipo: pallet, busta o pacco standard */
const getPackageIcon = (item) => {
	const type = item?.package_type?.toLowerCase() || '';
	if (type.includes('pallet')) return '/img/quote/first-step/pallet.png';
	if (type.includes('busta')) return '/img/quote/first-step/envelope.png';
	return '/img/quote/first-step/pack.png';
};

/* Crea il testo del percorso tipo "Roma(RM) -> Milano(MI)" */
const getRouteLabel = (order) => {
	if (!order.packages?.length) return '—';
	const pkg = order.packages[0];
	const originCity = pkg.origin_address?.city || '';
	const originProv = pkg.origin_address?.province || '';
	const destCity = pkg.destination_address?.city || '';
	const destProv = pkg.destination_address?.province || '';
	return `${originCity}${originProv ? '(' + originProv + ')' : ''} → ${destCity}${destProv ? '(' + destProv + ')' : ''}`;
};

/* Restituisce il nome del servizio di spedizione (es. "Espresso Nazionale") */
const getServiceLabel = (order) => {
	if (!order.packages?.length) return '—';
	return order.packages[0].services?.service_type?.split(',')[0]?.trim() || 'Espresso Nazionale';
};

const getSenderName = (order) => {
	if (!order.packages?.length) return '—';
	return order.packages[0].origin_address?.name || '—';
};

const getRecipientName = (order) => {
	if (!order.packages?.length) return '—';
	return order.packages[0].destination_address?.name || '—';
};

/* Controlla se l'ordine e' in attesa di pagamento o il pagamento e' fallito */
const isPendingPayment = (order) => {
	const raw = statusRaw(order.status);
	return raw === 'pending' || raw === 'payment_failed';
};

const getPendingReason = (order) => {
	const raw = statusRaw(order.status);
	if (raw === 'payment_failed') return 'Pagamento non riuscito. Riprova il pagamento per completare l\'ordine.';
	if (raw === 'pending') return 'In attesa di pagamento. Completa il pagamento per procedere con la spedizione.';
	return '';
};

const sanctum = useSanctumClient();
/* Stato di caricamento per il salvataggio come "spedizione configurata" (per ogni ordine) */
const savingToConfigured = ref({});
/* Tiene traccia degli ordini gia' salvati come configurati */
const savedToConfigured = ref({});
/* Eventuali errori durante il salvataggio (per ogni ordine) */
const saveError = ref({});
/* Stato di caricamento per l'annullamento ordine (per ogni ordine) */
const cancellingOrder = ref({});

/* Controlla se l'ordine e' annullabile (flag dall'API) */
const isCancellable = (order) => {
	return order.cancellable === true;
};

/* Annulla un ordine dopo conferma dell'utente. Chiama l'API e poi ricarica la lista */
const cancelOrder = async (order) => {
	const raw = statusRaw(order.status);
	const isPaid = ['completed', 'processing', 'in_transit'].includes(raw);

	const message = isPaid
		? 'Sei sicuro di voler annullare questa spedizione? Verra\' applicata una commissione di annullamento di 2,00 EUR. Il rimborso verra\' accreditato sul metodo di pagamento originale.'
		: 'Sei sicuro di voler annullare questo ordine?';

	if (!confirm(message)) return;

	cancellingOrder.value[order.id] = true;
	try {
		const result = await sanctum(`/api/orders/${order.id}/cancel`, { method: 'POST' });
		// Mostra messaggio di successo se c'e' un rimborso
		if (result?.refund_amount && result.refund_amount !== '0,00') {
			saveError.value[order.id] = null;
		}
		await refresh();
	} catch (e) {
		const data = e?.response?._data || e?.data;
		saveError.value[order.id] = data?.error || data?.message || 'Errore durante l\'annullamento.';
	} finally {
		cancellingOrder.value[order.id] = false;
	}
};

/* Carica le spedizioni gia' salvate per evitare duplicati quando si salva una configurata */
const savedShipmentsList = ref([]);
const loadSavedShipments = async () => {
	try {
		const result = await sanctum("/api/saved-shipments");
		savedShipmentsList.value = result?.data || [];
	} catch (e) { /* ignore */ }
};
onMounted(loadSavedShipments);

/* Controlla se una spedizione e' gia' stata salvata confrontando i dati (citta', peso, misure, ecc.) */
const isAlreadySaved = (order) => {
	if (savedToConfigured.value[order.id]) return true;
	if (!order.packages?.length || !savedShipmentsList.value.length) return false;
	// Compare actual data fields (not IDs) to detect if an order was already saved
	const pkg = order.packages[0];
	return savedShipmentsList.value.some(saved => {
		return saved.package_type === pkg.package_type
			&& String(saved.weight) === String(pkg.weight)
			&& String(saved.first_size) === String(pkg.first_size)
			&& String(saved.second_size) === String(pkg.second_size)
			&& String(saved.third_size) === String(pkg.third_size)
			&& saved.origin_address?.city === pkg.origin_address?.city
			&& saved.origin_address?.postal_code === pkg.origin_address?.postal_code
			&& saved.origin_address?.name === pkg.origin_address?.name
			&& saved.destination_address?.city === pkg.destination_address?.city
			&& saved.destination_address?.postal_code === pkg.destination_address?.postal_code
			&& saved.destination_address?.name === pkg.destination_address?.name;
	});
};

/**
 * Salva un ordine come "spedizione configurata" per poterlo riutilizzare.
 * Copia tutti i dati (indirizzi, colli, servizi) nella tabella delle spedizioni salvate.
 */
const saveToConfigured = async (order) => {
	if (!order.packages?.length) {
		saveError.value[order.id] = "Nessun collo presente in questo ordine.";
		return;
	}
	if (isAlreadySaved(order)) {
		saveError.value[order.id] = "Questa spedizione è già stata salvata nelle spedizioni configurate.";
		return;
	}
	savingToConfigured.value[order.id] = true;
	saveError.value[order.id] = null;
	try {
		const pkg = order.packages[0];
		const svc = pkg.services || pkg.service || {};
		await sanctum("/api/saved-shipments", {
			method: "POST",
			body: {
				origin_address: {
					type: "Partenza",
					name: pkg.origin_address?.name || "N/D",
					additional_information: pkg.origin_address?.additional_information || "",
					address: pkg.origin_address?.address || "N/D",
					number_type: pkg.origin_address?.number_type || "Numero Civico",
					address_number: pkg.origin_address?.address_number || "SNC",
					intercom_code: pkg.origin_address?.intercom_code || "",
					country: pkg.origin_address?.country || "Italia",
					city: pkg.origin_address?.city || "N/D",
					postal_code: pkg.origin_address?.postal_code || "00000",
					province: pkg.origin_address?.province || "N/D",
					telephone_number: pkg.origin_address?.telephone_number || "0000000000",
					email: pkg.origin_address?.email || "",
				},
				destination_address: {
					type: "Destinazione",
					name: pkg.destination_address?.name || "N/D",
					additional_information: pkg.destination_address?.additional_information || "",
					address: pkg.destination_address?.address || "N/D",
					number_type: pkg.destination_address?.number_type || "Numero Civico",
					address_number: pkg.destination_address?.address_number || "SNC",
					intercom_code: pkg.destination_address?.intercom_code || "",
					country: pkg.destination_address?.country || "Italia",
					city: pkg.destination_address?.city || "N/D",
					postal_code: pkg.destination_address?.postal_code || "00000",
					province: pkg.destination_address?.province || "N/D",
					telephone_number: pkg.destination_address?.telephone_number || "0000000000",
					email: pkg.destination_address?.email || "",
				},
				services: {
					service_type: svc.service_type || "Nessuno",
					date: svc.date || "",
					time: svc.time || "",
				},
				packages: order.packages.map(p => ({
					package_type: p.package_type || "Pacco",
					quantity: p.quantity || 1,
					weight: p.weight || 1,
					first_size: p.first_size || 10,
					second_size: p.second_size || 10,
					third_size: p.third_size || 10,
					// single_price from API is in cents — convert to EUR for the store endpoint
					single_price: Number(p.single_price || 0) / 100,
					weight_price: p.weight_price || 0,
					volume_price: p.volume_price || 0,
				})),
			},
		});
		savedToConfigured.value[order.id] = true;
		saveError.value[order.id] = null;
		// Refresh saved list for accurate duplicate detection
		await loadSavedShipments();
	} catch (e) {
		console.error("Errore salvataggio:", e);
		const errorData = e?.response?._data || e?.data;
		saveError.value[order.id] = errorData?.message || "Errore durante il salvataggio. Riprova.";
	} finally {
		savingToConfigured.value[order.id] = false;
	}
};
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[80px]">
		<div class="my-container max-w-[1200px]">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866]">Il tuo account</NuxtLink>
				<span class="mx-[6px]">/</span>
				<span class="font-semibold text-[#252B42]">Spedizioni</span>
			</div>

			<!-- Title -->
			<h1 class="text-[2rem] font-bold text-[#252B42] mb-[24px]">Spedizioni</h1>

			<!-- Filter Tabs -->
			<div class="flex flex-wrap gap-[8px] mb-[20px]">
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

			<!-- Orders list -->
			<div v-else-if="filteredOrders.length > 0" class="space-y-[12px]">
				<div
					v-for="order in filteredOrders"
					:key="order.id"
					class="bg-white rounded-[16px] border border-[#E9EBEC] overflow-hidden">

					<!-- Card header -->
					<div class="bg-[#F8F9FB] px-[20px] py-[12px] border-b border-[#E9EBEC] flex items-center justify-between">
						<div class="flex items-center gap-[10px]">
							<span class="text-[0.75rem] font-mono font-bold text-white bg-[#095866] px-[10px] py-[3px] rounded-[6px]">
								SF-{{ String(order.id).padStart(6, '0') }}
							</span>
							<span class="text-[0.9375rem] font-bold text-[#252B42]">
								{{ order.packages?.length || 0 }} Collo/i
							</span>
							<span class="text-[0.9375rem] text-[#252B42]">
								BRT {{ getServiceLabel(order) }}
							</span>
							<NuxtLink :to="`/account/spedizioni/${order.id}`" class="text-[#095866]" title="Vedi dettagli">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/></svg>
							</NuxtLink>
						</div>
						<div class="flex items-center gap-[8px]">
							<span :class="statusColor(order.status)" class="px-[12px] py-[4px] rounded-full text-[0.75rem] font-semibold inline-block">
								{{ order.status }}
							</span>
							<span class="text-[0.8125rem] text-[#737373]">
								A <span class="font-semibold text-[#252B42]">{{ getRecipientName(order) }}</span>
							</span>
						</div>
					</div>

					<!-- Card body - grid -->
					<div class="px-[20px] py-[16px]">
						<div class="grid grid-cols-2 desktop:grid-cols-6 gap-[16px]">
							<!-- Numero Ordine -->
							<div>
								<p class="text-[0.6875rem] font-bold text-[#737373] uppercase tracking-wider mb-[4px]">Numero Ordine</p>
								<p class="text-[0.875rem] font-semibold text-[#252B42]">#{{ order.id }}</p>
							</div>
							<!-- Data -->
							<div>
								<p class="text-[0.6875rem] font-bold text-[#737373] uppercase tracking-wider mb-[4px]">Data</p>
								<p class="text-[0.875rem] text-[#252B42]">{{ order.created_at }}</p>
							</div>
							<!-- Indirizzo -->
							<div>
								<p class="text-[0.6875rem] font-bold text-[#737373] uppercase tracking-wider mb-[4px]">Indirizzo</p>
								<p class="text-[0.875rem] text-[#252B42]">{{ getRouteLabel(order) }}</p>
							</div>
							<!-- Mittente -->
							<div>
								<p class="text-[0.6875rem] font-bold text-[#737373] uppercase tracking-wider mb-[4px]">Mittente</p>
								<p class="text-[0.875rem] text-[#252B42]">{{ getSenderName(order) }}</p>
							</div>
							<!-- Destinatario -->
							<div>
								<p class="text-[0.6875rem] font-bold text-[#737373] uppercase tracking-wider mb-[4px]">Destinatario</p>
								<p class="text-[0.875rem] text-[#252B42]">{{ getRecipientName(order) }}</p>
							</div>
							<!-- Servizio -->
							<div>
								<p class="text-[0.6875rem] font-bold text-[#737373] uppercase tracking-wider mb-[4px]">Servizio</p>
								<p class="text-[0.875rem] text-[#252B42]">{{ getServiceLabel(order) }}</p>
							</div>
						</div>
					</div>

					<!-- Pending payment alert -->
					<div v-if="isPendingPayment(order)" class="mx-[20px] my-[12px] bg-amber-50 border border-amber-200 rounded-[10px] px-[16px] py-[12px] flex items-center gap-[12px]">
						<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#F59E0B" class="shrink-0"><path d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16"/></svg>
						<p class="text-[0.8125rem] text-amber-800 flex-1">{{ getPendingReason(order) }}</p>
					</div>

					<!-- Save error/success message -->
					<div v-if="saveError[order.id]" class="mx-[20px] my-[8px] bg-red-50 border border-red-200 rounded-[10px] px-[16px] py-[10px] flex items-center gap-[10px]">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#EF4444" class="shrink-0"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
						<p class="text-red-600 text-[0.8125rem] font-medium">{{ saveError[order.id] }}</p>
					</div>

					<!-- Refund info (for refunded orders) -->
					<div v-if="statusRaw(order.status) === 'refunded' && order.refund_amount" class="mx-[20px] my-[8px] bg-orange-50 border border-orange-200 rounded-[10px] px-[16px] py-[10px] flex items-center gap-[10px]">
						<!-- Refund icon SVG -->
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EA580C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
						<p class="text-orange-700 text-[0.8125rem]">
							Rimborso di <span class="font-semibold">{{ order.refund_amount }}</span> effettuato
							<span v-if="order.refunded_at"> il {{ order.refunded_at }}</span>
						</p>
					</div>

					<!-- Card footer - actions -->
					<div class="px-[20px] py-[10px] border-t border-[#E9EBEC] flex items-center justify-between gap-[8px]">
						<div class="flex items-center gap-[8px]">
							<NuxtLink
								v-if="isPendingPayment(order)"
								:to="`/checkout?order_id=${order.id}`"
								class="inline-flex items-center gap-[6px] px-[16px] py-[8px] bg-[#E44203] text-white rounded-[10px] text-[0.8125rem] font-semibold hover:bg-[#c93800] transition-all">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/></svg>
								Paga ora
							</NuxtLink>
							<button
								v-if="isCancellable(order)"
								type="button"
								@click="cancelOrder(order)"
								:disabled="cancellingOrder[order.id]"
								class="inline-flex items-center gap-[4px] px-[10px] py-[6px] text-[#737373] text-[0.75rem] hover:text-red-600 hover:bg-red-50 rounded-[8px] transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M7,10L12,15L17,10H7Z"/></svg>
								{{ cancellingOrder[order.id] ? 'Blocco...' : 'Blocca' }}
							</button>
							<button
								v-if="!isAlreadySaved(order)"
								type="button"
								@click="saveToConfigured(order)"
								:disabled="savingToConfigured[order.id]"
								class="inline-flex items-center gap-[6px] px-[14px] py-[8px] bg-[#095866] text-white rounded-[8px] text-[0.8125rem] font-semibold hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3M19,19H5V5H16.17L19,7.83V19M12,12A3,3 0 0,0 9,15A3,3 0 0,0 12,18A3,3 0 0,0 15,15A3,3 0 0,0 12,12M6,6H15V10H6V6Z"/></svg>
								{{ savingToConfigured[order.id] ? 'Salvataggio...' : 'Salva configurata' }}
							</button>
							<span v-else class="inline-flex items-center gap-[6px] px-[14px] py-[8px] bg-emerald-100 text-emerald-700 rounded-[8px] text-[0.8125rem] font-semibold">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
								Salvata
							</span>
						</div>
						<NuxtLink :to="`/account/spedizioni/${order.id}`" title="Vedi dettagli" class="w-[32px] h-[32px] rounded-[8px] bg-[#095866]/10 flex items-center justify-center hover:bg-[#095866]/20 transition">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#095866"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/></svg>
						</NuxtLink>
					</div>
				</div>
			</div>

			<!-- Empty state -->
			<div v-else class="bg-white rounded-[16px] p-[48px] border border-[#E9EBEC] text-center">
				<div class="w-[72px] h-[72px] mx-auto mb-[20px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#C8CCD0"><path d="M3,4A2,2 0 0,0 1,6V17H3A3,3 0 0,0 6,20A3,3 0 0,0 9,17H15A3,3 0 0,0 18,20A3,3 0 0,0 21,17H23V12L20,8H17V4M10,6L14,10L10,14V11H4V9H10M17,9.5H19.5L21.47,12H17M6,15.5A1.5,1.5 0 0,1 7.5,17A1.5,1.5 0 0,1 6,18.5A1.5,1.5 0 0,1 4.5,17A1.5,1.5 0 0,1 6,15.5M18,15.5A1.5,1.5 0 0,1 19.5,17A1.5,1.5 0 0,1 18,18.5A1.5,1.5 0 0,1 16.5,17A1.5,1.5 0 0,1 18,15.5Z"/></svg>
				</div>
				<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Nessuna spedizione</h2>
				<p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto mb-[24px] leading-[1.6]">
					Non hai ancora effettuato nessun ordine. Configura la tua prima spedizione per iniziare.
				</p>
				<NuxtLink to="/preventivo" class="inline-block px-[24px] py-[12px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[10px] font-semibold text-[0.9375rem] transition-colors">
					Crea nuova spedizione
				</NuxtLink>
			</div>
		</div>
	</section>
</template>
