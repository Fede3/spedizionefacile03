<!--
  FILE: pages/account/spedizioni/[id].vue
  SCOPO: Dettaglio ordine — stato, colli, indirizzi, etichetta BRT, link tracking, annullamento e rimborso.

  API: GET /api/orders/{id} (dettaglio ordine), GET /api/brt/label/{orderId} (download PDF etichetta),
       POST /api/brt/create-shipment (rigenera etichetta), POST /api/orders/{id}/cancel (annulla),
       GET /api/orders/{id}/refund-eligibility (verifica idoneita' rimborso),
       POST /api/orders/{id}/add-package (aggiungi collo a ordine in attesa).
  COMPONENTI: Teleport (modale annullamento nativo Vue).
  ROUTE: /account/spedizioni/:id (middleware sanctum:auth).

  DATI IN INGRESSO: route.params.id (ID ordine dalla URL).
  DATI IN USCITA: download PDF etichetta, navigazione a /traccia-spedizione?code=XXX.

  VINCOLI: l'etichetta BRT si scarica come blob PDF. La rigenerazione chiama l'API BRT.
           Il rimborso ha una commissione di 2 EUR per ordini gia' in lavorazione.
           Ordini in_transit NON sono rimborsabili.
  ERRORI TIPICI: non gestire lo stato "in_giacenza" nei colori stato.
  PUNTI DI MODIFICA SICURI: colori stato (statusColor), layout colli, testi modale.
  COLLEGAMENTI: pages/account/spedizioni/index.vue, pages/traccia-spedizione.vue,
                controllers/OrderController.php, controllers/BrtController.php.
-->
<script setup>
/* Richiede che l'utente sia autenticato */
definePageMeta({
	middleware: ["app-auth"],
});

/* Prende l'ID dell'ordine dall'URL (es. /account/spedizioni/123) */
const route = useRoute();
const orderId = route.params.id;

/* Carica i dati dell'ordine dal server. "refresh" permette di ricaricarli */
// lazy: true — i dati ordine si caricano dopo il render iniziale (mostra skeleton nel frattempo)
const { data: order, status: orderStatus, refresh } = useSanctumFetch(`/api/orders/${orderId}`, { lazy: true });

/* Formatta una data nel formato italiano con ora (es. "13/02/2026, 14:30") */
const formatDate = (dateStr) => {
	if (!dateStr) return '\u2014';
	try {
		return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	} catch (e) {
		return dateStr;
	}
};

/* Restituisce i colori CSS in base allo stato dell'ordine */
const statusColor = (status) => {
	const map = {
		'In attesa': 'bg-yellow-100 text-yellow-700',
		'In lavorazione': 'bg-blue-100 text-blue-700',
		'Completato': 'bg-emerald-100 text-emerald-700',
		'Fallito': 'bg-red-100 text-red-700',
		'Pagato': 'bg-emerald-100 text-emerald-700',
		'Annullato': 'bg-gray-200 text-gray-600',
		'Rimborsato': 'bg-orange-100 text-orange-700',
		'In transito': 'bg-blue-100 text-blue-700',
		'Consegnato': 'bg-emerald-100 text-emerald-700',
		'In giacenza': 'bg-orange-100 text-orange-700',
	};
	return map[status] || 'bg-gray-100 text-gray-700';
};

/* Converte il prezzo da centesimi a euro con virgola (es. 1500 -> "15,00\u20AC") */
const formatPrice = (cents) => {
	if (!cents && cents !== 0) return '0,00\u20AC';
	const euros = Number(cents) / 100;
	return euros.toFixed(2).replace('.', ',') + '\u20AC';
};

/* Estrae i dati dell'ordine dalla risposta API (puo' essere in .data o direttamente) */
const orderData = computed(() => order.value?.data || order.value || null);
const orderSubtotalLabel = computed(() => {
	const subtotal = orderData.value?.subtotal;
	if (typeof subtotal === 'string' && subtotal.trim()) {
		return subtotal.replace(/\s*EUR$/i, '€');
	}

	return formatPrice(orderData.value?.subtotal_cents || 0);
});
const orderRouteLabel = computed(() => {
	const firstPackage = orderData.value?.packages?.[0];
	if (!firstPackage) return '—';
	const originCity = firstPackage.origin_address?.city || '';
	const originProv = firstPackage.origin_address?.province || '';
	const destinationCity = firstPackage.destination_address?.city || '';
	const destinationProv = firstPackage.destination_address?.province || '';
	return `${originCity}${originProv ? ` (${originProv})` : ''} → ${destinationCity}${destinationProv ? ` (${destinationProv})` : ''}`;
});
const orderPackageCountLabel = computed(() => {
	const count = Number(orderData.value?.packages?.length || 0);
	if (!count) return 'Nessun collo';
	return count === 1 ? '1 collo' : `${count} colli`;
});

const sanctum = useSanctumClient();

/* --- Aggiungi collo --- */
const isPendingPayment = computed(() => {
	const raw = orderData.value?.raw_status;
	return raw === 'pending' || raw === 'payment_failed';
});

const showAddPackageForm = ref(false);
const addingPackage = ref(false);
const addPackageError = ref(null);
const addPackageSuccess = ref(false);
const newPackage = ref({
	package_type: 'Pacco',
	quantity: 1,
	weight: '',
	first_size: '',
	second_size: '',
	third_size: '',
	content_description: '',
});

const submitAddPackage = async () => {
	addPackageError.value = null;
	addPackageSuccess.value = false;
	addingPackage.value = true;
	try {
		await sanctum(`/api/orders/${orderId}/add-package`, {
			method: 'POST',
			body: newPackage.value,
		});
		addPackageSuccess.value = true;
		showAddPackageForm.value = false;
		newPackage.value = { package_type: 'Pacco', quantity: 1, weight: '', first_size: '', second_size: '', third_size: '', content_description: '' };
		await refresh();
	} catch (e) {
		const data = e?.response?._data || e?.data;
		addPackageError.value = data?.error || data?.message || 'Errore durante l\'aggiunta del collo.';
	} finally {
		addingPackage.value = false;
	}
};

/* Indica se l'etichetta e' in fase di rigenerazione */
const regenerating = ref(false);
/* Eventuale errore durante la rigenerazione dell'etichetta */
const regenerateError = ref(null);
/* Indica se la rigenerazione e' andata a buon fine */
const regenerateSuccess = ref(false);

/**
 * Scarica l'etichetta BRT come file PDF.
 * Crea un link temporaneo e lo clicca automaticamente per avviare il download.
 */
const downloadLabel = async () => {
	if (!orderData.value?.id) return;
	try {
		const blob = await sanctum(`/api/brt/label/${orderData.value.id}`, {
			method: 'GET',
			responseType: 'blob',
		});
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `etichetta-brt-${orderData.value.id}.pdf`;
		document.body.appendChild(a);
		a.click();
		window.URL.revokeObjectURL(url);
		a.remove();
	} catch (e) {
	}
};

/**
 * Rigenera l'etichetta BRT se non e' disponibile.
 * Chiama l'API di creazione spedizione BRT e poi ricarica l'ordine.
 */
const regenerateLabel = async () => {
	if (!orderData.value?.id) return;
	regenerating.value = true;
	regenerateError.value = null;
	regenerateSuccess.value = false;
	try {
		await sanctum('/api/brt/create-shipment', {
			method: 'POST',
			body: { order_id: orderData.value.id },
		});
		regenerateSuccess.value = true;
		await refresh();
	} catch (e) {
		const data = e?.response?._data || e?.data;
		regenerateError.value = data?.error || 'Errore durante la rigenerazione dell\'etichetta.';
	} finally {
		regenerating.value = false;
	}
};

/* === ANNULLAMENTO E RIMBORSO === */

/* Mostra/nasconde il modale di conferma annullamento */
const showCancelModal = ref(false);
/* Dati di idoneita' al rimborso caricati dall'API */
const refundEligibility = ref(null);
/* Stato di caricamento del controllo idoneita' */
const loadingEligibility = ref(false);
/* Stato di caricamento dell'annullamento */
const cancelling = ref(false);
/* Messaggio di errore dell'annullamento */
const cancelError = ref(null);
/* Messaggio di successo dell'annullamento */
const cancelSuccess = ref(null);
/* Motivo dell'annullamento inserito dall'utente */
const cancelReason = ref('');

/* Controlla se l'ordine e' annullabile */
const isCancellable = computed(() => {
	return orderData.value?.cancellable === true;
});

/* Controlla se l'ordine e' stato gia' annullato o rimborsato */
const isCancelledOrRefunded = computed(() => {
	const raw = orderData.value?.raw_status;
	return raw === 'cancelled' || raw === 'refunded';
});

/**
 * Apre il modale di annullamento.
 * Prima carica i dati di idoneita' al rimborso dall'API per mostrare
 * all'utente l'importo del rimborso e la commissione.
 */
const openCancelModal = async () => {
	cancelError.value = null;
	cancelSuccess.value = null;
	loadingEligibility.value = true;
	showCancelModal.value = true;

	try {
		const result = await sanctum(`/api/orders/${orderId}/refund-eligibility`, {
			method: 'GET',
		});
		refundEligibility.value = result;
	} catch (e) {
		const data = e?.response?._data || e?.data;
		cancelError.value = data?.error || 'Errore nel controllo dell\'idoneita\' al rimborso.';
	} finally {
		loadingEligibility.value = false;
	}
};

/**
 * Conferma l'annullamento dell'ordine.
 * Chiama l'API POST /api/orders/{id}/cancel e poi ricarica l'ordine.
 */
const confirmCancellation = async () => {
	cancelling.value = true;
	cancelError.value = null;

	try {
		const result = await sanctum(`/api/orders/${orderId}/cancel`, {
			method: 'POST',
			body: {
				reason: cancelReason.value || undefined,
			},
		});
		cancelSuccess.value = result?.message || 'Ordine annullato con successo.';
		showCancelModal.value = false;
		cancelReason.value = '';
		await refresh();
	} catch (e) {
		const data = e?.response?._data || e?.data;
		cancelError.value = data?.error || data?.message || 'Errore durante l\'annullamento dell\'ordine.';
	} finally {
		cancelling.value = false;
	}
};

/* Traduce il metodo di pagamento in italiano */
const paymentMethodLabel = (method) => {
	const map = {
		stripe: 'Carta di credito (Stripe)',
		wallet: 'Portafoglio',
		bonifico: 'Bonifico',
	};
	return map[method] || method || 'Non specificato';
};
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[80px]">
		<div class="my-container">
			<!-- Loading -->
			<div v-if="orderStatus === 'pending'" class="space-y-[16px]">
				<div class="bg-white rounded-[16px] p-[32px] border border-[#E9EBEC] animate-pulse">
					<div class="h-[24px] bg-gray-200 rounded w-[40%] mb-[16px]"></div>
					<div class="h-[16px] bg-gray-200 rounded w-[60%] mb-[8px]"></div>
					<div class="h-[16px] bg-gray-200 rounded w-[50%]"></div>
				</div>
			</div>

			<template v-else-if="orderData">
				<AccountPageHeader
					eyebrow="Dettaglio spedizione"
					:title="`Ordine #${orderData.id}`"
					:description="'Controlla stato, colli, tracking BRT ed eventuali azioni ancora disponibili per questa spedizione.'"
					:crumbs="[
						{ label: 'Account', to: '/account' },
						{ label: 'Spedizioni', to: '/account/spedizioni' },
						{ label: `Ordine #${orderData.id}` },
					]"
					back-to="/account/spedizioni"
					back-label="Torna alle spedizioni"
				>
					<template #meta>
						<div class="flex flex-wrap gap-[8px]">
							<span :class="statusColor(orderData.status)" class="inline-flex items-center rounded-full px-[12px] py-[5px] text-[0.75rem] font-semibold">
								{{ orderData.status }}
							</span>
							<span class="inline-flex items-center rounded-full bg-[#F0F6F7] px-[12px] py-[5px] text-[0.75rem] font-semibold text-[#095866]">
								{{ orderPackageCountLabel }}
							</span>
							<span class="inline-flex items-center rounded-full bg-[#FFF5EB] px-[12px] py-[5px] text-[0.75rem] font-semibold text-[#E44203]">
								{{ orderSubtotalLabel }}
							</span>
						</div>
					</template>
				</AccountPageHeader>

				<!-- Cancellation success message -->
				<div v-if="cancelSuccess" class="bg-emerald-50 border border-emerald-200 rounded-[12px] px-[16px] py-[14px] flex items-start gap-[12px] mb-[16px]">
					<!-- Check circle icon SVG -->
					<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-[1px]"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
					<p class="text-[0.875rem] text-emerald-700 flex-1">{{ cancelSuccess }}</p>
				</div>

				<!-- Cancellation error message (outside modal) -->
				<div v-if="cancelError && !showCancelModal" class="bg-red-50 border border-red-200 rounded-[12px] px-[16px] py-[14px] flex items-start gap-[12px] mb-[16px]">
					<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-[1px]"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
					<p class="text-[0.875rem] text-red-700 flex-1">{{ cancelError }}</p>
				</div>

				<!-- Refund info banner (for refunded orders) -->
				<div v-if="isCancelledOrRefunded && orderData.refund_status === 'completed'" class="bg-orange-50 border border-orange-200 rounded-[12px] px-[16px] py-[14px] mb-[16px]">
					<div class="flex items-start gap-[12px]">
						<!-- Refund icon SVG -->
						<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EA580C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-[1px]"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
						<div class="flex-1">
							<p class="text-[0.875rem] font-semibold text-orange-800 mb-[6px]">Ordine rimborsato</p>
							<div class="grid grid-cols-2 gap-[8px] text-[0.8125rem] text-orange-700">
								<div>
									<span class="font-medium">Importo rimborsato:</span> {{ orderData.refund_amount }}
								</div>
								<div v-if="orderData.cancellation_fee">
									<span class="font-medium">Commissione:</span> {{ orderData.cancellation_fee }}
								</div>
								<div>
									<span class="font-medium">Metodo rimborso:</span> {{ paymentMethodLabel(orderData.refund_method) }}
								</div>
								<div v-if="orderData.refunded_at">
									<span class="font-medium">Data rimborso:</span> {{ orderData.refunded_at }}
								</div>
							</div>
							<p v-if="orderData.refund_reason" class="mt-[6px] text-[0.8125rem] text-orange-600">
								<span class="font-medium">Motivo:</span> {{ orderData.refund_reason }}
							</p>
						</div>
					</div>
				</div>

				<!-- Status & Summary -->
				<div class="mb-[16px] rounded-[18px] border border-[#E9EBEC] bg-white p-[18px] tablet:p-[22px]">
					<div class="grid grid-cols-1 gap-[12px] tablet:grid-cols-2 desktop:grid-cols-4">
						<div class="rounded-[14px] border border-[#E9EEF2] bg-[#FBFCFD] px-[14px] py-[12px]">
							<p class="mb-[4px] text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[#7A8695]">Tratta</p>
							<p class="text-[0.9375rem] font-semibold leading-[1.35] text-[#252B42]">{{ orderRouteLabel }}</p>
						</div>
						<div class="rounded-[14px] border border-[#E9EEF2] bg-white px-[14px] py-[12px]">
							<p class="mb-[4px] text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[#7A8695]">Creato il</p>
							<p class="text-[0.9375rem] font-semibold leading-[1.35] text-[#252B42]">{{ formatDate(orderData.created_at) }}</p>
						</div>
						<div class="rounded-[14px] border border-[#E9EEF2] bg-white px-[14px] py-[12px]">
							<p class="mb-[4px] text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[#7A8695]">Totale</p>
							<p class="text-[1rem] font-bold leading-[1.2] text-[#095866]">{{ orderSubtotalLabel }}</p>
						</div>
						<div class="rounded-[14px] border border-[#E9EEF2] bg-white px-[14px] py-[12px]">
							<p class="mb-[4px] text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[#7A8695]">Pagamento</p>
							<p class="text-[0.9375rem] font-semibold leading-[1.35] text-[#252B42]">{{ paymentMethodLabel(orderData.payment_method) }}</p>
						</div>
					</div>

					<!-- Blocca pacco (visibile solo per ordini bloccabili, meno invasivo) -->
					<div v-if="isCancellable && !isCancelledOrRefunded" class="mt-[16px] flex flex-col gap-[10px] border-t border-[#E9EBEC] pt-[16px] desktop:flex-row desktop:items-center desktop:justify-between">
						<p class="text-[0.75rem] text-[#737373]">Per richiedere un rimborso, contatta l'<NuxtLink to="/account/assistenza" class="text-[#095866] font-semibold underline">assistenza</NuxtLink>.</p>
						<button
							type="button"
							@click="openCancelModal"
							class="inline-flex items-center gap-[4px] px-[12px] py-[6px] text-[#737373] text-[0.75rem] hover:text-red-600 hover:bg-red-50 rounded-[8px] transition cursor-pointer">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M7,10L12,15L17,10H7Z"/></svg>
							Blocca il pacco
						</button>
					</div>
				</div>

				<!-- Packages -->
				<div v-if="orderData.packages?.length" class="space-y-[12px]">
					<div v-for="(pkg, pkgIdx) in orderData.packages" :key="pkg.id || pkgIdx" class="bg-white rounded-[16px] p-[24px] border border-[#E9EBEC]">
						<h3 class="text-[1rem] font-bold text-[#252B42] mb-[16px]">Collo #{{ pkgIdx + 1 }}</h3>

						<div class="grid grid-cols-2 desktop:grid-cols-4 gap-[14px] mb-[16px]">
							<div>
								<p class="text-[0.6875rem] text-[#737373] uppercase font-medium mb-[2px]">Tipo</p>
								<p class="text-[0.875rem] text-[#252B42]">{{ pkg.package_type || 'Pacco' }}</p>
							</div>
							<div>
								<p class="text-[0.6875rem] text-[#737373] uppercase font-medium mb-[2px]">Peso</p>
								<p class="text-[0.875rem] text-[#252B42]">{{ pkg.weight }} kg</p>
							</div>
							<div>
								<p class="text-[0.6875rem] text-[#737373] uppercase font-medium mb-[2px]">Dimensioni</p>
								<p class="text-[0.875rem] text-[#252B42]">{{ pkg.first_size }} x {{ pkg.second_size }} x {{ pkg.third_size }} cm</p>
							</div>
							<div>
								<p class="text-[0.6875rem] text-[#737373] uppercase font-medium mb-[2px]">Prezzo</p>
								<p class="text-[0.875rem] text-[#252B42]">{{ formatPrice(pkg.single_price) }}</p>
							</div>
						</div>

						<!-- Origin Address -->
						<div v-if="pkg.origin_address" class="bg-[#F8F9FB] rounded-[50px] p-[16px] mb-[10px]">
							<p class="text-[0.75rem] text-[#737373] uppercase font-medium mb-[6px]">Mittente</p>
							<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ pkg.origin_address.name }}</p>
							<p class="text-[0.8125rem] text-[#737373]">{{ pkg.origin_address.address }} {{ pkg.origin_address.address_number }}</p>
							<p class="text-[0.8125rem] text-[#737373]">{{ pkg.origin_address.postal_code }} {{ pkg.origin_address.city }} ({{ pkg.origin_address.province }})</p>
							<p v-if="pkg.origin_address.telephone_number" class="text-[0.8125rem] text-[#737373]">Tel: {{ pkg.origin_address.telephone_number }}</p>
						</div>

						<!-- Badge PUDO: visibile se l'ordine prevede ritiro in un punto BRT convenzionato -->
						<!-- Il campo brt_pudo_id viene impostato quando l'utente sceglie "Ritira in Punto BRT" -->
						<div v-if="order?.data?.brt_pudo_id" class="bg-[#095866]/10 rounded-[50px] p-[12px] flex items-center gap-[8px]">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
							<span class="text-[0.8125rem] font-bold text-[#095866]">Consegna presso Punto BRT</span>
						</div>

						<!-- Destination Address -->
						<div v-if="pkg.destination_address" class="bg-[#F8F9FB] rounded-[50px] p-[16px]">
							<p class="text-[0.75rem] text-[#737373] uppercase font-medium mb-[6px]">Destinatario</p>
							<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ pkg.destination_address.name }}</p>
							<p class="text-[0.8125rem] text-[#737373]">{{ pkg.destination_address.address }} {{ pkg.destination_address.address_number }}</p>
							<p class="text-[0.8125rem] text-[#737373]">{{ pkg.destination_address.postal_code }} {{ pkg.destination_address.city }} ({{ pkg.destination_address.province }})</p>
							<p v-if="pkg.destination_address.telephone_number" class="text-[0.8125rem] text-[#737373]">Tel: {{ pkg.destination_address.telephone_number }}</p>
						</div>

						<!-- Service -->
						<div v-if="pkg.services" class="mt-[10px] bg-[#F8F9FB] rounded-[50px] p-[16px]">
							<p class="text-[0.75rem] text-[#737373] uppercase font-medium mb-[6px]">Servizio</p>
							<p class="text-[0.875rem] text-[#252B42]">{{ pkg.services.service_type || 'Standard' }}</p>
							<p v-if="pkg.services.date" class="text-[0.8125rem] text-[#737373]">Data: {{ pkg.services.date }}</p>
						</div>
					</div>
				</div>

				<!-- Aggiungi collo (solo ordini in attesa di pagamento) -->
				<div v-if="isPendingPayment" class="mt-[16px]">
					<div v-if="addPackageSuccess" class="bg-emerald-50 border border-emerald-200 rounded-[50px] px-[14px] py-[10px] text-emerald-700 text-[0.8125rem] mb-[12px]">
						Collo aggiunto con successo!
					</div>

					<button
						v-if="!showAddPackageForm"
						type="button"
						@click="showAddPackageForm = true; addPackageSuccess = false"
						class="inline-flex items-center gap-[6px] px-[16px] py-[10px] bg-[#095866] text-white rounded-[50px] text-[0.875rem] font-semibold hover:bg-[#074a56] transition cursor-pointer">
						<!-- Plus icon SVG -->
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
						Aggiungi collo
					</button>

					<div v-if="showAddPackageForm" class="bg-white rounded-[16px] p-[24px] border border-[#E9EBEC]">
						<h3 class="text-[1rem] font-bold text-[#252B42] mb-[16px]">Nuovo collo</h3>
						<div class="grid grid-cols-2 desktop:grid-cols-4 gap-[12px]">
							<div>
								<label class="block text-[0.75rem] text-[#737373] mb-[4px]">Tipo</label>
								<select v-model="newPackage.package_type" class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] p-[8px] text-[0.875rem]">
									<option value="Pacco">Pacco</option>
									<option value="Busta">Busta</option>
									<option value="Pallet">Pallet</option>
									<option value="Valigia">Valigia</option>
								</select>
							</div>
							<div>
								<label class="block text-[0.75rem] text-[#737373] mb-[4px]">Quantita</label>
								<input type="number" v-model="newPackage.quantity" min="1" max="999" class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] p-[8px] text-[0.875rem]" />
							</div>
							<div>
								<label class="block text-[0.75rem] text-[#737373] mb-[4px]">Peso (kg)</label>
								<input type="number" v-model="newPackage.weight" min="0.1" max="1000" step="0.1" class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] p-[8px] text-[0.875rem]" required />
							</div>
							<div>
								<label class="block text-[0.75rem] text-[#737373] mb-[4px]">Lunghezza (cm)</label>
								<input type="number" v-model="newPackage.first_size" min="0.1" max="1000" step="0.1" class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] p-[8px] text-[0.875rem]" required />
							</div>
							<div>
								<label class="block text-[0.75rem] text-[#737373] mb-[4px]">Larghezza (cm)</label>
								<input type="number" v-model="newPackage.second_size" min="0.1" max="1000" step="0.1" class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] p-[8px] text-[0.875rem]" required />
							</div>
							<div>
								<label class="block text-[0.75rem] text-[#737373] mb-[4px]">Altezza (cm)</label>
								<input type="number" v-model="newPackage.third_size" min="0.1" max="1000" step="0.1" class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] p-[8px] text-[0.875rem]" required />
							</div>
							<div class="col-span-2">
								<label class="block text-[0.75rem] text-[#737373] mb-[4px]">Contenuto</label>
								<input type="text" v-model="newPackage.content_description" placeholder="es. Elettronica" maxlength="255" class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] p-[8px] text-[0.875rem]" />
							</div>
						</div>
						<div v-if="addPackageError" class="mt-[10px] text-red-500 text-[0.8125rem]">{{ addPackageError }}</div>
						<div class="mt-[16px] flex gap-[10px]">
							<button
								type="button"
								@click="submitAddPackage"
								:disabled="addingPackage"
								class="inline-flex items-center gap-[6px] px-[16px] py-[10px] bg-[#E44203] text-white rounded-[50px] text-[0.875rem] font-semibold hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
								<!-- Plus icon SVG -->
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
								{{ addingPackage ? 'Aggiunta...' : 'Aggiungi' }}
							</button>
							<button
								type="button"
								@click="showAddPackageForm = false"
								class="inline-flex items-center gap-[6px] px-[16px] py-[10px] bg-[#E9EBEC] text-[#252B42] rounded-[50px] text-[0.875rem] font-semibold hover:bg-[#D0D0D0] transition cursor-pointer">
								<!-- Close icon SVG -->
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
								Annulla
							</button>
						</div>
					</div>
				</div>

				<!-- BRT Etichette e Tracking (nascosto per ordini annullati/rimborsati) -->
				<div v-if="!isCancelledOrRefunded" class="bg-white rounded-[16px] p-[24px] border border-[#E9EBEC] mt-[16px]">
					<h3 class="text-[1rem] font-bold text-[#252B42] mb-[16px]">Spedizione BRT</h3>

					<!-- Tracking number e link prominente -->
					<div v-if="orderData.brt_parcel_id" class="bg-[#F0F7F8] border border-[#C5DFE3] rounded-[12px] p-[16px] mb-[16px]">
						<div class="flex items-start gap-[12px]">
							<!-- Truck icon SVG -->
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-[2px]"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
							<div class="flex-1">
								<p class="text-[0.75rem] text-[#095866] uppercase font-medium mb-[4px]">Codice Tracking BRT</p>
								<p class="text-[1.125rem] font-bold text-[#252B42] font-mono tracking-wide mb-[8px]">{{ orderData.brt_parcel_id }}</p>
								<div class="flex flex-wrap items-center gap-[10px]">
									<NuxtLink
										:to="`/traccia-spedizione?code=${encodeURIComponent(orderData.brt_parcel_id)}`"
										class="inline-flex items-center gap-[6px] px-[14px] py-[8px] bg-[#095866] text-white rounded-[8px] font-semibold text-[0.8125rem] hover:bg-[#074a56] transition">
										<!-- Search icon SVG -->
										<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
										Traccia spedizione
									</NuxtLink>
									<a
										v-if="orderData.brt_tracking_url"
										:href="orderData.brt_tracking_url"
										target="_blank"
										rel="noopener noreferrer"
										class="inline-flex items-center gap-[6px] px-[14px] py-[8px] border border-[#095866] text-[#095866] rounded-[8px] font-semibold text-[0.8125rem] hover:bg-[#095866] hover:text-white transition">
										<!-- External link icon SVG -->
										<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
										Vedi su BRT
									</a>
								</div>
							</div>
						</div>
					</div>

					<!-- Label available -->
					<template v-if="orderData.has_label">
						<div class="flex flex-wrap items-center gap-[10px] mb-[12px]">
							<button
								@click="downloadLabel"
								type="button"
								class="inline-flex items-center gap-[6px] px-[16px] py-[10px] bg-[#095866] text-white rounded-[50px] text-[0.875rem] font-semibold hover:bg-[#074a56] transition cursor-pointer">
								<!-- Download icon SVG -->
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
								Scarica Etichetta Spedizione
							</button>
						</div>
					</template>

					<!-- Label NOT available -->
					<template v-else>
						<!-- Se c'e' un errore BRT, mostra il messaggio di errore -->
						<div v-if="orderData.brt_error" class="bg-red-50 border border-red-200 rounded-[50px] px-[16px] py-[12px] flex items-start gap-[12px] mb-[12px]">
							<!-- Alert circle icon SVG -->
							<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-[1px]"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
							<div class="flex-1">
								<p class="text-[0.875rem] font-semibold text-red-700 mb-[4px]">Generazione etichetta fallita</p>
								<p class="text-[0.8125rem] text-red-600">{{ orderData.brt_error }}</p>
							</div>
						</div>
						<!-- Se non c'e' errore, mostra "in generazione" -->
						<div v-else class="bg-amber-50 border border-amber-200 rounded-[50px] px-[16px] py-[12px] flex items-center gap-[12px] mb-[12px]">
							<!-- Alert triangle icon SVG -->
							<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
							<p class="text-[0.8125rem] text-amber-800 flex-1">Etichetta in generazione...</p>
						</div>
						<button
							@click="regenerateLabel"
							:disabled="regenerating"
							type="button"
							class="inline-flex items-center gap-[6px] px-[16px] py-[10px] bg-[#E44203] text-white rounded-[50px] text-[0.875rem] font-semibold hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
							<!-- Refresh icon SVG -->
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
							{{ regenerating ? 'Rigenerazione...' : 'Rigenera Etichetta' }}
						</button>
					</template>

					<!-- Regenerate messages -->
					<div v-if="regenerateError" class="mt-[10px] bg-red-50 border border-red-200 rounded-[50px] px-[14px] py-[10px] text-red-600 text-[0.8125rem]">
						{{ regenerateError }}
					</div>
					<div v-if="regenerateSuccess" class="mt-[10px] bg-emerald-50 border border-emerald-200 rounded-[50px] px-[14px] py-[10px] text-emerald-700 text-[0.8125rem]">
						Etichetta generata con successo!
					</div>
				</div>

				<!-- Back -->
				<div class="mt-[24px]">
					<NuxtLink to="/account/spedizioni" class="inline-flex items-center gap-[6px] px-[20px] py-[10px] bg-[#095866] text-white rounded-[50px] font-semibold text-[0.875rem] hover:bg-[#074a56] transition">
						<!-- Arrow left icon SVG -->
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
						Torna alle spedizioni
					</NuxtLink>
				</div>
			</template>

			<!-- Not found -->
			<div v-else class="bg-white rounded-[16px] p-[48px] border border-[#E9EBEC] text-center">
				<p class="text-[1rem] text-[#737373]">Ordine non trovato.</p>
				<NuxtLink to="/account/spedizioni" class="inline-flex items-center gap-[6px] mt-[16px] px-[20px] py-[10px] bg-[#095866] text-white rounded-[50px] font-semibold text-[0.875rem] hover:bg-[#074a56] transition">
					<!-- Arrow left icon SVG -->
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
					Torna alle spedizioni
				</NuxtLink>
			</div>

			<!-- ========================================= -->
			<!-- MODALE CONFERMA ANNULLAMENTO              -->
			<!-- ========================================= -->
			<Teleport to="body">
				<div v-if="showCancelModal" class="fixed inset-0 z-[9999] flex items-center justify-center">
					<!-- Overlay scuro -->
					<div class="absolute inset-0 bg-black/50" @click="showCancelModal = false"></div>

					<!-- Contenuto modale -->
					<div class="relative bg-white rounded-[20px] shadow-xl max-w-[520px] w-full mx-[16px] p-[32px] z-[1]">
						<!-- Header modale -->
						<div class="flex items-center gap-[12px] mb-[20px]">
							<!-- Warning icon SVG -->
							<div class="w-[44px] h-[44px] rounded-full bg-red-100 flex items-center justify-center shrink-0">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
							</div>
							<div>
								<h2 class="text-[1.125rem] font-bold text-[#252B42]">Bloccare questo pacco?</h2>
								<p class="text-[0.8125rem] text-[#737373]">Il pacco verrà bloccato e non potrà più essere consegnato.</p>
							</div>
						</div>

						<!-- Loading eligibility -->
						<div v-if="loadingEligibility" class="py-[20px] text-center">
							<div class="inline-block w-[24px] h-[24px] border-[3px] border-[#095866] border-t-transparent rounded-full animate-spin"></div>
							<p class="mt-[10px] text-[0.8125rem] text-[#737373]">Controllo in corso...</p>
						</div>

						<!-- Eligibility loaded -->
						<template v-else-if="refundEligibility">
							<!-- Not eligible -->
							<div v-if="!refundEligibility.eligible" class="bg-red-50 border border-red-200 rounded-[50px] px-[16px] py-[12px] mb-[16px]">
								<p class="text-[0.875rem] text-red-700">{{ refundEligibility.reason }}</p>
							</div>

							<!-- Eligible -->
							<template v-else>
								<!-- Refund details -->
								<div class="bg-[#F8F9FB] rounded-[12px] p-[16px] mb-[16px]">
									<p class="text-[0.8125rem] text-[#737373] mb-[10px]">{{ refundEligibility.reason }}</p>

									<div v-if="refundEligibility.refund_amount_cents > 0" class="space-y-[8px]">
										<div class="flex items-center justify-between text-[0.875rem]">
											<span class="text-[#737373]">Totale ordine:</span>
											<span class="font-semibold text-[#252B42]">{{ orderData.subtotal }}</span>
										</div>
										<div class="flex items-center justify-between text-[0.875rem]">
											<span class="text-[#737373]">Commissione annullamento:</span>
											<span class="font-semibold text-red-600">- {{ refundEligibility.commission_eur }} EUR</span>
										</div>
										<div class="border-t border-[#E9EBEC] pt-[8px] flex items-center justify-between text-[0.9375rem]">
											<span class="font-semibold text-[#252B42]">Rimborso:</span>
											<span class="font-bold text-emerald-600">{{ refundEligibility.refund_amount_eur }} EUR</span>
										</div>
										<div class="flex items-center justify-between text-[0.8125rem]">
											<span class="text-[#737373]">Metodo rimborso:</span>
											<span class="font-medium text-[#252B42]">{{ paymentMethodLabel(refundEligibility.payment_method) }}</span>
										</div>
									</div>
								</div>

								<!-- Motivo annullamento (opzionale) -->
								<div class="mb-[16px]">
									<label class="block text-[0.75rem] text-[#737373] uppercase font-medium mb-[4px]">Motivo (opzionale)</label>
									<textarea
										v-model="cancelReason"
										placeholder="Perche' vuoi annullare questa spedizione?"
										maxlength="500"
										rows="2"
										class="w-full bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] p-[10px] text-[0.875rem] resize-none"
									></textarea>
								</div>

								<!-- Errore annullamento nel modale -->
								<div v-if="cancelError" class="bg-red-50 border border-red-200 rounded-[50px] px-[14px] py-[10px] text-red-600 text-[0.8125rem] mb-[12px]">
									{{ cancelError }}
								</div>

								<!-- Bottoni azione -->
								<div class="flex gap-[10px]">
									<button
										type="button"
										@click="confirmCancellation"
										:disabled="cancelling"
										class="flex-1 inline-flex items-center justify-center gap-[6px] px-[16px] py-[12px] bg-red-600 text-white rounded-[50px] text-[0.875rem] font-semibold hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
										<!-- X icon SVG -->
										<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
										{{ cancelling ? 'Blocco in corso...' : 'Conferma blocco pacco' }}
									</button>
									<button
										type="button"
										@click="showCancelModal = false"
										:disabled="cancelling"
										class="px-[20px] py-[12px] bg-[#E9EBEC] text-[#252B42] rounded-[50px] text-[0.875rem] font-semibold hover:bg-[#D0D0D0] transition disabled:opacity-60 cursor-pointer">
										Indietro
									</button>
								</div>
							</template>
						</template>

						<!-- Error loading eligibility -->
						<template v-else>
							<div v-if="cancelError" class="bg-red-50 border border-red-200 rounded-[50px] px-[14px] py-[10px] text-red-600 text-[0.8125rem] mb-[12px]">
								{{ cancelError }}
							</div>
							<button
								type="button"
								@click="showCancelModal = false"
								class="w-full px-[16px] py-[12px] bg-[#E9EBEC] text-[#252B42] rounded-[50px] text-[0.875rem] font-semibold hover:bg-[#D0D0D0] transition cursor-pointer">
								Chiudi
							</button>
						</template>
					</div>
				</div>
			</Teleport>
		</div>
	</section>
</template>
