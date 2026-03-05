<!--
  FILE: pages/riepilogo.vue
  SCOPO: Riepilogo spedizione — revisione dati, modifica inline, invio a carrello/checkout/salvati.

  API: POST /api/cart o /api/guest-cart (aggiungi al carrello),
       PUT /api/cart/{id} (aggiorna pacco esistente), GET /api/cart/{id} (carica pacco per modifica),
       POST /api/saved-shipments (salva configurazione), POST /api/create-direct-order (ordine diretto).
  STORE: userStore.pendingShipment (dati spedizione da confermare), userStore.editingCartItemId.
  COMPONENTI: Steps (indicatore progresso).
  ROUTE: /riepilogo (pubblica, ma i dati arrivano dallo store Pinia).

  DATI IN INGRESSO: ?edit={id} (query param per modalita' modifica pacco dal carrello).
  DATI IN USCITA: navigazione a /carrello?updated=ts, /checkout, /account/spedizioni-configurate.

  VINCOLI: single_price arriva in centesimi dal DB, viene convertito in euro per la visualizzazione.
           In modalita' edit, se i dati non sono nello store, vengono caricati via API.
           IMPORTANTE: preparePayloadForBackend() converte prezzi centesimi→euro prima di inviarli al backend.
  ERRORI TIPICI: non pulire pendingShipment dopo il salvataggio (dati stantii al prossimo accesso).
  PUNTI DI MODIFICA SICURI: layout sezioni, servizi disponibili, stili card.
  COLLEGAMENTI: stores/userStore.js, composables/useCart.js, composables/useSession.js,
                pages/carrello.vue, pages/checkout.vue.

  BUGFIX CRITICI (Agent 5):
  ✅ Conversione euro/centesimi: preparePayloadForBackend() converte prezzi da centesimi a euro
     quando si modifica un pacco dal carrello, evitando prezzi 100x più alti nel DB.
-->
<script setup>
// Meta tag SEO
useSeoMeta({
	title: 'Riepilogo Spedizione | SpediamoFacile',
	ogTitle: 'Riepilogo Spedizione | SpediamoFacile',
});

const userStore = useUserStore();
const { isAuthenticated } = useSanctumAuth();
const sanctumClient = useSanctumClient();
const { endpoint, refresh: refreshCart } = useCart();
const { session } = useSession();
const uiFeedback = useUiFeedback();

// Promo settings per badge
const { loadPriceBands, promoSettings } = usePriceBands();
onMounted(() => { loadPriceBands(); });

const isSubmitting = ref(false);   // Stato di caricamento durante l'invio
const submitError = ref(null);     // Messaggio di errore

// Dati della spedizione in attesa di conferma (salvati nello store Pinia)
const shipment = computed(() => userStore.pendingShipment);

// ID del pacco nel carrello che si sta modificando (null = nuova spedizione)
const editingId = computed(() => userStore.editingCartItemId);

// Caricamento in corso dei dati dal carrello (per edit mode)
const loadingEditData = ref(false);

// Se si arriva con ?edit=ID, carica i dati del pacco dal carrello
const route = useRoute();
const editQueryId = route.query.edit;

if (editQueryId && !shipment.value) {
	// Imposta l'ID di modifica nello store
	userStore.editingCartItemId = editQueryId;
	loadingEditData.value = true;

	// Carica i dati dal carrello in modo asincrono
	sanctumClient(`/api/cart/${editQueryId}`)
		.then((res) => {
			const pkg = res.data || res;
			// single_price e' in centesimi nel DB, manteniamo in centesimi internamente
			const priceInCents = pkg.single_price ? Number(pkg.single_price) : 0;
			// Popola lo store con i dati del pacco per il riepilogo
			userStore.pendingShipment = {
				packages: [{
					package_type: pkg.package_type,
					quantity: pkg.quantity || 1,
					weight: pkg.weight,
					first_size: pkg.first_size,
					second_size: pkg.second_size,
					third_size: pkg.third_size,
					weight_price: pkg.weight_price,
					volume_price: pkg.volume_price,
					single_price: priceInCents,
					content_description: pkg.content_description || '',
				}],
				origin_address: pkg.origin_address || {},
				destination_address: pkg.destination_address || {},
				services: pkg.services || {},
			};
			loadingEditData.value = false;
		})
		.catch((err) => {
			console.error('Errore caricamento pacco per modifica:', err);
			loadingEditData.value = false;
			navigateTo('/carrello');
		});
} else if (!shipment.value && !editQueryId) {
	// Se non c'e' nessuna spedizione e non stiamo modificando, redirect
	navigateTo('/la-tua-spedizione/2');
}

// Formatta il prezzo da centesimi a euro con virgola (es. 950 -> "9,50€")
const formatPrice = (cents) => {
	if (!cents && cents !== 0) return '0,00€';
	const num = Number(cents) / 100;
	return num.toFixed(2).replace('.', ',') + '€';
};

// Converte euro in centesimi (es. 9.50 -> 950)
const toCents = (euros) => Math.round(Number(euros) * 100);

// Flag: arrivo dalla modifica di un pacco nel carrello
const isEditFromCart = computed(() => !!editingId.value || !!editQueryId);

// Prepara il payload per il backend convertendo i prezzi da centesimi a euro
// IMPORTANTE: Il backend si aspetta prezzi in EURO e li moltiplica x100 per salvarli in centesimi
// Quando carichiamo dal carrello (edit mode), i prezzi sono in CENTESIMI → convertiamo in EURO
// Quando carichiamo dalla sessione (new mode), i prezzi sono già in EURO → nessuna conversione
const preparePayloadForBackend = (shipmentData) => {
	if (!shipmentData) return null;

	const payload = { ...shipmentData };

	// Se siamo in edit mode, i prezzi nei packages sono in centesimi → convertiamo in euro
	if (isEditFromCart.value && payload.packages) {
		payload.packages = payload.packages.map(pkg => ({
			...pkg,
			single_price: Number(pkg.single_price) / 100, // Centesimi → Euro
		}));
	}

	return payload;
};

// Prezzo totale: calcolato dai pacchi se disponibili, altrimenti dalla sessione
const totalPrice = computed(() => {
	// Se abbiamo i pacchi nel shipment, calcoliamo da quelli
	if (shipment.value?.packages && shipment.value.packages.length > 0) {
		const total = shipment.value.packages.reduce((sum, pkg) => {
			// In edit mode i prezzi sono in centesimi, altrimenti in euro
			const price = isEditFromCart.value
				? (Number(pkg.single_price) || 0) / 100
				: (Number(pkg.single_price) || 0);
			const qty = Number(pkg.quantity) || 1;
			return sum + (price * qty);
		}, 0);
		return total.toFixed(2).replace('.', ',');
	}
	// Fallback: prova dalla sessione
	const price = session.value?.data?.total_price;
	if (!price && price !== 0) return '0,00';
	return Number(price).toFixed(2).replace('.', ',');
});

// Numero ordine provvisorio (solo visuale, il vero numero viene assegnato al pagamento)
const preOrderNumber = ref(`SF-${Date.now().toString().slice(-6)}`);

// --- MODIFICA INLINE ---
// Indica quale sezione e' in fase di modifica: 'colli', 'origin', 'destination', 'services'
const editingSection = ref(null);

// Copie temporanee dei dati per la modifica inline
const editColli = ref([]);         // Copia dei colli in modifica
const editOrigin = ref({});        // Copia dell'indirizzo di partenza in modifica
const editDestination = ref({});   // Copia dell'indirizzo di destinazione in modifica
const editServices = ref({});      // Copia dei servizi in modifica

// Lista dei servizi disponibili (stessa di [step].vue)
// hasPopup = true significa che il servizio richiede dati aggiuntivi (popup di dettaglio)
const availableServices = [
	{ name: "Spedizione Senza etichetta", hasPopup: false },
	{ name: "Contrassegno", hasPopup: true, popupFields: ['importo', 'incasso', 'rimborso', 'dettaglio'] },
	{ name: "Assicurazione", hasPopup: true, popupFields: ['valore'] },
	{ name: "Ritiro e consegna", hasPopup: false },
	{ name: "Sponda idraulica", hasPopup: true, popupFields: ['pallet'] },
	{ name: "Programmato", hasPopup: true, popupFields: ['giorni'] },
	{ name: "Chiamata", hasPopup: true, popupFields: ['telefono'] },
	{ name: "Casella postale", hasPopup: false },
];

// --- MODALE MODIFICA SERVIZI ---
const showServiceModal = ref(false);          // Mostra/nasconde il popup dettagli servizio
const selectedServiceForEdit = ref(null);     // Servizio attualmente selezionato per la modifica
const servicePopupData = ref({});             // Dati aggiuntivi del servizio (es. importo contrassegno)

// Avvia la modifica inline di una sezione (colli, origin, destination, services)
// Crea una copia dei dati originali per permettere annullamento
const startEdit = (section) => {
	if (section === 'services') {
		// For services, show the service selection panel
		editingSection.value = 'services';
		// Parse current services
		const currentServices = shipment.value?.services?.service_type || '';
		editServices.value = {
			...shipment.value?.services,
			selectedList: currentServices ? currentServices.split(', ').filter(Boolean) : [],
			serviceData: shipment.value?.services?.serviceData || {},
		};
		return;
	}
	editingSection.value = section;
	if (section === 'colli' && shipment.value?.packages) {
		editColli.value = shipment.value.packages.map(p => ({ ...p }));
	}
	if (section === 'origin' && shipment.value?.origin_address) {
		editOrigin.value = { ...shipment.value.origin_address };
	}
	if (section === 'destination' && shipment.value?.destination_address) {
		editDestination.value = { ...shipment.value.destination_address };
	}
};

// Annulla la modifica in corso e chiude eventuali popup
const cancelEdit = () => {
	editingSection.value = null;
	showServiceModal.value = false;
	selectedServiceForEdit.value = null;
};

// Controlla se un servizio e' attualmente selezionato nella lista
const isServiceSelected = (serviceName) => {
	return editServices.value?.selectedList?.includes(serviceName) || false;
};

// Attiva/disattiva un servizio. Se il servizio ha un popup (hasPopup), apre il modale per i dettagli
const toggleService = (service) => {
	if (!editServices.value.selectedList) editServices.value.selectedList = [];
	const idx = editServices.value.selectedList.indexOf(service.name);

	if (idx >= 0) {
		// Deselect
		editServices.value.selectedList.splice(idx, 1);
		// Also remove stored popup data
		if (editServices.value.serviceData) delete editServices.value.serviceData[service.name];
	} else {
		// Select - if has popup, show it first
		if (service.hasPopup) {
			selectedServiceForEdit.value = service;
			// Pre-fill with existing data if available
			const existing = editServices.value.serviceData?.[service.name];
			servicePopupData.value = existing
				? { ...existing }
				: (service.name === 'Programmato' ? { giorni: [] } : {});
			showServiceModal.value = true;
		} else {
			editServices.value.selectedList.push(service.name);
		}
	}
};

// Conferma i dati aggiuntivi del servizio e lo aggiunge alla lista selezionati
const confirmServicePopup = () => {
	if (selectedServiceForEdit.value) {
		const name = selectedServiceForEdit.value.name;
		if (!editServices.value.selectedList.includes(name)) {
			editServices.value.selectedList.push(name);
		}
		// Store popup data keyed by service name
		if (!editServices.value.serviceData) editServices.value.serviceData = {};
		editServices.value.serviceData[name] = { ...servicePopupData.value };
	}
	showServiceModal.value = false;
	selectedServiceForEdit.value = null;
	servicePopupData.value = {};
};

const closeServicePopup = () => {
	showServiceModal.value = false;
	selectedServiceForEdit.value = null;
	servicePopupData.value = {};
};

// Valida un indirizzo prima del salvataggio
const validateAddress = (addr) => {
	if (!addr.name?.trim()) return 'Nome obbligatorio';
	if (!addr.address?.trim()) return 'Indirizzo obbligatorio';
	if (!addr.city?.trim()) return 'Città obbligatoria';
	if (!addr.postal_code?.trim()) return 'CAP obbligatorio';
	if (!addr.province?.trim()) return 'Provincia obbligatoria';
	return null;
};

// Salva le modifiche inline nello store Pinia (pendingShipment)
const saveEdit = (section) => {
	if (section === 'colli' && userStore.pendingShipment) {
		userStore.pendingShipment.packages = editColli.value.map(p => ({ ...p }));
	}
	if (section === 'origin' && userStore.pendingShipment) {
		const error = validateAddress(editOrigin.value);
		if (error) {
			uiFeedback.error('Controlla i dati di partenza', error);
			return;
		}
		userStore.pendingShipment.origin_address = { ...editOrigin.value };
	}
	if (section === 'destination' && userStore.pendingShipment) {
		const error = validateAddress(editDestination.value);
		if (error) {
			uiFeedback.error('Controlla i dati di destinazione', error);
			return;
		}
		userStore.pendingShipment.destination_address = { ...editDestination.value };
	}
	if (section === 'services' && userStore.pendingShipment) {
		userStore.pendingShipment.services = {
			...userStore.pendingShipment.services,
			service_type: editServices.value.selectedList.join(', ') || 'Nessuno',
			date: editServices.value.date || '',
			serviceData: editServices.value.serviceData || {},
		};
	}
	editingSection.value = null;
	uiFeedback.success('Modifiche salvate.');
};

// --- AZIONI PRINCIPALI ---

// Vai direttamente al checkout: crea un ordine "diretto" SENZA passare dal carrello
// Usa l'endpoint /api/create-direct-order che salva pacchi + crea ordine in un colpo solo
// Se in modalita' modifica, prima aggiorna il pacco nel carrello
const proceedToCheckout = async () => {
	if (!shipment.value) return;
	if (!isAuthenticated.value) {
		submitError.value = "Devi effettuare il login per procedere al pagamento.";
		return;
	}
	isSubmitting.value = true;
	submitError.value = null;
	try {
		// Prepara il payload convertendo i prezzi da centesimi a euro per il backend
		const payload = preparePayloadForBackend(shipment.value);

		// Se stiamo modificando un pacco, aggiorniamo prima nel carrello
		if (editingId.value) {
			await sanctumClient(`/api/cart/${editingId.value}`, {
				method: "PUT",
				body: payload,
			});
			userStore.editingCartItemId = null;
			userStore.pendingShipment = null;
			clearNuxtData("cart");
			uiFeedback.success('Dati salvati con successo!');
			// Dopo l'aggiornamento, naviga al checkout normale (dal carrello)
			navigateTo('/checkout');
			return;
		}

		// Create a standalone order directly (saves packages + creates order in one step)
		const result = await sanctumClient("/api/create-direct-order", {
			method: "POST",
			body: payload,
		});

		uiFeedback.success('Ordine creato con successo!');
		// Navigate to checkout with only this order
		navigateTo(`/checkout?order_id=${result.order_id}`);
	} catch (error) {
		console.error('Checkout error:', error);
		const errorData = error?.response?._data || error?.data;
		submitError.value = errorData?.message || "Errore durante la creazione dell'ordine. Riprova.";
	} finally {
		isSubmitting.value = false;
	}
};

// Salva la spedizione nelle "spedizioni configurate" per riutilizzarla in futuro
const goToSavedShipments = async () => {
	if (!shipment.value) return;
	if (!isAuthenticated.value) {
		submitError.value = "Devi effettuare il login per salvare le spedizioni configurate.";
		return;
	}
	isSubmitting.value = true;
	submitError.value = null;
	try {
		const payload = preparePayloadForBackend(shipment.value);
		await sanctumClient("/api/saved-shipments", {
			method: "POST",
			body: payload,
		});
		navigateTo('/account/spedizioni-configurate');
	} catch (error) {
		console.error('Saved shipments error:', error);
		const errorData = error?.response?._data || error?.data;
		submitError.value = errorData?.message || "Errore durante il salvataggio. Riprova.";
	} finally {
		isSubmitting.value = false;
	}
};

// Salva la spedizione corrente e torna al preventivo per configurarne un'altra
const addAnotherShipment = async () => {
	if (!shipment.value) return;
	isSubmitting.value = true;
	if (isAuthenticated.value) {
		try {
			const payload = preparePayloadForBackend(shipment.value);
			await sanctumClient("/api/saved-shipments", {
				method: "POST",
				body: payload,
			});
		} catch (e) {
			console.error('Add another save error:', e);
		}
	}
	isSubmitting.value = false;
	navigateTo('/preventivo');
};

// Aggiunge la spedizione al carrello (o aggiorna se in modalita' modifica) e naviga alla pagina carrello
const goToCart = async () => {
	if (!shipment.value) return;

	// Validazione indirizzi prima del salvataggio
	const originError = validateAddress(shipment.value.origin_address);
	if (originError) {
		uiFeedback.error('Indirizzo partenza', originError, { timeout: 5000 });
		return;
	}

	const destError = validateAddress(shipment.value.destination_address);
	if (destError) {
		uiFeedback.error('Indirizzo destinazione', destError, { timeout: 5000 });
		return;
	}

	isSubmitting.value = true;
	submitError.value = null;
	try {
		const payload = preparePayloadForBackend(shipment.value);

		// DEBUG: Log per verificare endpoint e payload
		console.log('goToCart - endpoint:', endpoint.value);
		console.log('goToCart - payload:', payload);

		if (editingId.value) {
			// Modalita' modifica: aggiorniamo il pacco esistente nel carrello
			await sanctumClient(`/api/cart/${editingId.value}`, {
				method: "PUT",
				body: payload,
			});
			// Puliamo l'ID di modifica dallo store
			userStore.editingCartItemId = null;
			uiFeedback.success('Spedizione aggiornata nel carrello.');
		} else {
			// Nuova spedizione: aggiungiamo al carrello
			const cartEndpoint = endpoint.value || (isAuthenticated.value ? '/api/cart' : '/api/guest-cart');
			console.log('goToCart - using endpoint:', cartEndpoint);

			await sanctumClient(cartEndpoint, {
				method: "POST",
				body: payload,
			});
			uiFeedback.success('Spedizione aggiunta al carrello.');
		}

		// RESET COMPLETO: Puliamo tutti i dati per permettere nuovo preventivo
		userStore.pendingShipment = null;
		userStore.packages = [];
		userStore.servicesArray = [];
		userStore.contentDescription = '';
		userStore.shipmentDetails = null;

		// Invalidiamo la cache del carrello e forziamo il refresh
		clearNuxtData("cart");
		// Navighiamo al carrello con un query param per forzare il refresh
		// (il carrello leggera' questo param e fara' un refresh forzato)
		navigateTo('/carrello?updated=' + Date.now());
	} catch (error) {
		console.error('Cart save error:', error);
		console.error('Error details:', error?.response?._data || error?.data);
		const errorData = error?.response?._data || error?.data;
		submitError.value = errorData?.message || "Errore durante il salvataggio nel carrello. Riprova.";
		uiFeedback.critical('Errore durante il salvataggio', submitError.value, { timeout: 8000 });
	} finally {
		isSubmitting.value = false;
	}
};

// Torna indietro allo step di configurazione ritiro
const goBack = () => {
	if (editingId.value) {
		// In modalita' modifica dal carrello: torna al carrello
		userStore.editingCartItemId = null;
		navigateTo('/carrello');
	} else {
		navigateTo('/la-tua-spedizione/2?step=ritiro');
	}
};
</script>

<template>
	<section class="min-h-[600px]">
		<div class="my-container mt-[40px] tablet:mt-[72px] mb-[60px] tablet:mb-[120px] px-[12px] tablet:px-0 overflow-x-hidden">
			<Steps v-if="!isEditFromCart" :current-step="3" />

			<!-- Loading state per modifica dal carrello -->
			<div v-if="loadingEditData" class="text-center py-[60px]">
				<div class="inline-block w-[40px] h-[40px] border-4 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin mb-[16px]"></div>
				<p class="text-[1rem] text-[#737373]">Caricamento dati spedizione...</p>
			</div>

			<div v-else-if="!shipment" class="text-center py-[60px]">
				<p class="text-[1rem] text-[#737373]">Nessuna spedizione da riepilogare. Torna indietro per configurare la tua spedizione.</p>
				<NuxtLink to="/la-tua-spedizione/2" class="inline-block mt-[20px] px-[24px] py-[12px] bg-[#095866] text-white rounded-[10px] font-semibold hover:bg-[#074a56] transition-colors">
					Torna alla configurazione
				</NuxtLink>
			</div>

			<div v-else class="mx-auto">
				<h1 class="text-[1.375rem] tablet:text-[1.75rem] font-bold text-[#252B42] text-center mb-[12px] font-montserrat">{{ editingId ? 'Modifica spedizione' : 'Riepilogo spedizione' }}</h1>
				<p v-if="!isEditFromCart" class="text-center text-[0.875rem] text-[#737373] mb-[32px]">
					N. ordine provvisorio: <span class="font-mono font-bold text-[#095866] bg-[#095866]/10 px-[10px] py-[3px] rounded-[6px]">{{ preOrderNumber }}</span>
				</p>
				<p v-else class="text-center text-[0.875rem] text-[#737373] mb-[32px]">
					Modifica i dati e salva, oppure torna al carrello senza modificare.
				</p>

				<!-- Colli -->
				<div class="bg-[#E4E4E4] rounded-[8px] p-[16px] tablet:p-[28px_32px] mb-[16px]">
					<div class="flex items-center justify-between mb-[16px]">
						<h2 class="text-[1.125rem] font-bold text-[#252B42]">Colli</h2>
						<button type="button" @click="startEdit('colli')" class="text-[#095866] hover:text-[#074a56] transition cursor-pointer" title="Modifica colli">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
						</button>
					</div>

					<!-- View mode -->
					<div v-if="editingSection !== 'colli'" class="space-y-[10px]">
						<div v-for="(pkg, idx) in shipment.packages" :key="idx" class="bg-white rounded-[12px] p-[12px] tablet:p-[16px] flex items-center justify-between gap-[8px] tablet:gap-[16px]">
							<div class="flex items-center gap-[10px] tablet:gap-[16px] min-w-0">
								<div class="w-[36px] h-[36px] tablet:w-[44px] tablet:h-[44px] rounded-[10px] bg-[#F8F9FB] flex items-center justify-center shrink-0">
									<!-- Ottimizzazione: lazy loading + decoding async -->
									<NuxtImg src="/img/quote/first-step/pack.png" alt="" width="28" height="28" loading="lazy" decoding="async" class="w-[22px] h-[22px] tablet:w-[28px] tablet:h-[28px]" />
								</div>
								<div class="min-w-0">
									<p class="text-[0.875rem] tablet:text-[0.9375rem] font-semibold text-[#252B42] truncate">{{ pkg.package_type || 'Pacco' }} #{{ idx + 1 }}</p>
									<p class="text-[0.75rem] tablet:text-[0.8125rem] text-[#737373]">{{ pkg.quantity || 1 }}x &ndash; {{ pkg.weight }} kg &ndash; {{ pkg.first_size }}x{{ pkg.second_size }}x{{ pkg.third_size }} cm</p>
								</div>
							</div>
							<span class="text-[0.875rem] tablet:text-[0.9375rem] font-bold text-[#252B42] shrink-0">{{ formatPrice(pkg.single_price) }}</span>
						</div>
					</div>

					<!-- Edit mode -->
					<div v-else class="space-y-[12px]">
						<div v-for="(pkg, idx) in editColli" :key="idx" class="bg-white rounded-[12px] p-[16px]">
							<p class="font-semibold text-[#252B42] mb-[10px]">Collo #{{ idx + 1 }}</p>
							<div class="grid grid-cols-2 tablet:grid-cols-4 gap-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Quantità</label>
									<input type="number" v-model="pkg.quantity" min="1" class="w-full bg-[#F1F1F1] rounded-[8px] h-[44px] text-center text-[1rem] px-[8px] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:bg-white focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] border border-transparent" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">Peso (kg)</label>
									<input type="number" v-model="pkg.weight" min="0.1" step="0.1" class="w-full bg-[#F1F1F1] rounded-[8px] h-[44px] text-center text-[1rem] px-[8px] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:bg-white focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] border border-transparent" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">L (cm)</label>
									<input type="number" v-model="pkg.first_size" min="1" class="w-full bg-[#F1F1F1] rounded-[8px] h-[44px] text-center text-[1rem] px-[8px] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:bg-white focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] border border-transparent" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">P (cm)</label>
									<input type="number" v-model="pkg.second_size" min="1" class="w-full bg-[#F1F1F1] rounded-[8px] h-[44px] text-center text-[1rem] px-[8px] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:bg-white focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] border border-transparent" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">H (cm)</label>
									<input type="number" v-model="pkg.third_size" min="1" class="w-full bg-[#F1F1F1] rounded-[8px] h-[44px] text-center text-[1rem] px-[8px] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:bg-white focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] border border-transparent" />
								</div>
							</div>
						</div>
						<div class="flex gap-[10px] justify-end">
							<button type="button" @click="cancelEdit" class="px-[16px] py-[8px] text-[0.875rem] text-[#737373] hover:text-[#252B42] transition cursor-pointer">Annulla</button>
							<button type="button" @click="saveEdit('colli')" class="px-[16px] py-[8px] bg-[#095866] text-white rounded-[8px] text-[0.875rem] font-semibold hover:bg-[#074a56] transition cursor-pointer">Salva</button>
						</div>
					</div>
				</div>

				<!-- Indirizzi -->
				<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[16px] mb-[16px]">
					<!-- Partenza -->
					<div class="bg-[#E4E4E4] rounded-[16px] p-[16px] tablet:p-[28px_32px]">
						<div class="flex items-center justify-between mb-[16px]">
							<h2 class="text-[1.125rem] font-bold text-[#252B42] flex items-center gap-[8px]">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
								Partenza
							</h2>
							<button type="button" @click="startEdit('origin')" class="text-[#095866] hover:text-[#074a56] transition cursor-pointer" title="Modifica partenza">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
							</button>
						</div>

						<!-- View mode -->
						<div v-if="editingSection !== 'origin'" class="text-[0.875rem] text-[#252B42] space-y-[4px]">
							<p class="font-semibold">{{ shipment.origin_address?.name }}</p>
							<p>{{ shipment.origin_address?.address }} {{ shipment.origin_address?.address_number }}</p>
							<p>{{ shipment.origin_address?.postal_code }} {{ shipment.origin_address?.city }} ({{ shipment.origin_address?.province }})</p>
							<p v-if="shipment.origin_address?.telephone_number && shipment.origin_address.telephone_number !== '0000000000'" class="text-[#737373]">Tel: {{ shipment.origin_address.telephone_number }}</p>
							<p v-if="shipment.origin_address?.email" class="text-[#737373]">{{ shipment.origin_address.email }}</p>
						</div>

						<!-- Edit mode -->
						<div v-else class="space-y-[10px]">
							<div>
								<label class="text-[0.75rem] text-[#737373]">Nome e Cognome</label>
								<input type="text" v-model="editOrigin.name" class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
							</div>
							<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Indirizzo</label>
									<input type="text" v-model="editOrigin.address" class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">N. Civico</label>
									<input type="text" v-model="editOrigin.address_number" class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
								</div>
							</div>
							<div class="grid grid-cols-2 tablet:grid-cols-3 gap-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Città</label>
									<input type="text" v-model="editOrigin.city" class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" required />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">CAP</label>
									<input
										type="text"
										v-model="editOrigin.postal_code"
										maxlength="5"
										inputmode="numeric"
										pattern="[0-9]{5}"
										@input="editOrigin.postal_code = editOrigin.postal_code.replace(/\D/g, '')"
										class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]"
										required />
								</div>
								<div class="col-span-2 tablet:col-span-1">
									<label class="text-[0.75rem] text-[#737373]">Provincia</label>
									<input type="text" v-model="editOrigin.province" class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" required />
								</div>
							</div>
							<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Telefono</label>
									<input type="tel" v-model="editOrigin.telephone_number" class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">Email</label>
									<input type="email" v-model="editOrigin.email" class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
								</div>
							</div>
							<div class="flex gap-[10px] justify-end">
								<button type="button" @click="cancelEdit" class="px-[16px] min-h-[44px] text-[0.875rem] text-[#737373] hover:text-[#252B42] transition cursor-pointer">Annulla</button>
								<button type="button" @click="saveEdit('origin')" class="px-[16px] min-h-[44px] bg-[#095866] text-white rounded-[8px] text-[0.875rem] font-semibold hover:bg-[#074a56] transition cursor-pointer">Salva</button>
							</div>
						</div>
					</div>

					<!-- Destinazione -->
					<div class="bg-[#E4E4E4] rounded-[16px] p-[16px] tablet:p-[28px_32px]">
						<div class="flex items-center justify-between mb-[16px]">
							<h2 class="text-[1.125rem] font-bold text-[#252B42] flex items-center gap-[8px]">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
								Destinazione
							</h2>
							<!-- In modalità PUDO il modifica riporta a step 2 per cambiare il punto -->
							<button type="button" @click="shipment.pudo ? goBack() : startEdit('destination')" class="text-[#095866] hover:text-[#074a56] transition cursor-pointer" title="Modifica destinazione">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
							</button>
						</div>

						<!-- View mode -->
						<div v-if="editingSection !== 'destination'" class="text-[0.875rem] text-[#252B42] space-y-[4px]">
							<p class="font-semibold">{{ shipment.destination_address?.name }}</p>
							<template v-if="!shipment.pudo">
								<p>{{ shipment.destination_address?.address }} {{ shipment.destination_address?.address_number }}</p>
								<p>{{ shipment.destination_address?.postal_code }} {{ shipment.destination_address?.city }} ({{ shipment.destination_address?.province }})</p>
							</template>
							<template v-else>
								<div class="my-[8px] p-[10px] bg-[#095866]/10 rounded-[10px] flex items-start gap-[8px]">
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-[2px]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
									<div class="text-[0.8125rem]">
										<span class="font-bold text-[#095866]">Ritiro in Punto BRT</span>
										<p class="text-[#252B42] font-semibold mt-[2px]">{{ shipment.pudo.name }}</p>
										<p class="text-[#737373]">{{ shipment.pudo.address }}, {{ shipment.pudo.zip_code }} {{ shipment.pudo.city }}</p>
									</div>
								</div>
							</template>
							<p v-if="shipment.destination_address?.telephone_number && shipment.destination_address.telephone_number !== '0000000000'" class="text-[#737373]">Tel: {{ shipment.destination_address.telephone_number }}</p>
							<p v-if="shipment.destination_address?.email" class="text-[#737373]">{{ shipment.destination_address.email }}</p>
						</div>

						<!-- Edit mode -->
						<div v-else class="space-y-[10px]">
							<div>
								<label class="text-[0.75rem] text-[#737373]">Nome e Cognome</label>
								<input type="text" v-model="editDestination.name" class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
							</div>
							<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Indirizzo</label>
									<input type="text" v-model="editDestination.address" class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">N. Civico</label>
									<input type="text" v-model="editDestination.address_number" class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
								</div>
							</div>
							<div class="grid grid-cols-2 tablet:grid-cols-3 gap-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Città</label>
									<input type="text" v-model="editDestination.city" class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" required />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">CAP</label>
									<input
										type="text"
										v-model="editDestination.postal_code"
										maxlength="5"
										inputmode="numeric"
										pattern="[0-9]{5}"
										@input="editDestination.postal_code = editDestination.postal_code.replace(/\D/g, '')"
										class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]"
										required />
								</div>
								<div class="col-span-2 tablet:col-span-1">
									<label class="text-[0.75rem] text-[#737373]">Provincia</label>
									<input type="text" v-model="editDestination.province" class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" required />
								</div>
							</div>
							<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Telefono</label>
									<input type="tel" v-model="editDestination.telephone_number" class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">Email</label>
									<input type="email" v-model="editDestination.email" class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
								</div>
							</div>
							<div class="flex gap-[10px] justify-end">
								<button type="button" @click="cancelEdit" class="px-[16px] min-h-[44px] text-[0.875rem] text-[#737373] hover:text-[#252B42] transition cursor-pointer">Annulla</button>
								<button type="button" @click="saveEdit('destination')" class="px-[16px] min-h-[44px] bg-[#095866] text-white rounded-[8px] text-[0.875rem] font-semibold hover:bg-[#074a56] transition cursor-pointer">Salva</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Servizi + Data -->
				<div class="bg-[#E4E4E4] rounded-[16px] p-[16px] tablet:p-[28px_32px] mb-[16px]">
					<div class="flex items-center justify-between mb-[12px]">
						<h2 class="text-[1.125rem] font-bold text-[#252B42]">Servizi e data ritiro</h2>
						<button type="button" @click="startEdit('services')" class="text-[#095866] hover:text-[#074a56] transition cursor-pointer" title="Modifica servizi">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
						</button>
					</div>

					<!-- View mode -->
					<div v-if="editingSection !== 'services'">
						<div class="mb-[8px]">
							<p class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[6px]">Servizi</p>
							<div v-if="shipment.services?.service_type && shipment.services.service_type !== 'Nessuno'" class="flex flex-wrap gap-[6px]">
								<span
									v-for="svc in shipment.services.service_type.split(', ').filter(Boolean)"
									:key="svc"
									class="inline-block px-[12px] py-[4px] bg-[#095866]/10 text-[#095866] rounded-[8px] text-[0.8125rem] font-semibold">
									{{ svc }}
								</span>
							</div>
							<p v-else class="text-[0.9375rem] text-[#737373]">Nessun servizio aggiuntivo</p>
						</div>
						<div v-if="shipment.services?.date" class="mt-[12px]">
							<p class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[4px]">Data ritiro</p>
							<p class="text-[0.9375rem] text-[#252B42] font-semibold">{{ shipment.services.date }}</p>
						</div>
					</div>

					<!-- Edit mode - service selector -->
					<div v-else class="space-y-[12px]">
						<p class="text-[0.75rem] text-[#737373] font-medium">Seleziona i servizi desiderati:</p>
						<div class="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-[8px]">
							<button
								v-for="(svc, svcIdx) in availableServices"
								:key="svcIdx"
								type="button"
								@click="toggleService(svc)"
								:class="isServiceSelected(svc.name)
									? 'bg-[#095866] text-white border-[#095866]'
									: 'bg-white text-[#252B42] border-[#D0D0D0] hover:border-[#095866]'"
								class="px-[12px] py-[12px] min-h-[44px] rounded-[10px] text-[0.875rem] font-medium border transition-[background-color,color,border-color,transform] duration-200 cursor-pointer text-center active:scale-95">
								{{ svc.name }}
							</button>
						</div>

						<!-- Service popup (for services that need extra data) -->
						<div v-if="showServiceModal && selectedServiceForEdit" class="bg-white rounded-[50px] border border-[#D0D0D0] p-[20px] mt-[12px]">
							<div class="flex items-center justify-between mb-[12px]">
								<h3 class="text-[0.9375rem] font-bold text-[#252B42]">{{ selectedServiceForEdit.name }}</h3>
								<button type="button" @click="closeServicePopup" class="text-[#737373] hover:text-[#252B42] cursor-pointer">
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
								</button>
							</div>

							<!-- Contrassegno -->
							<div v-if="selectedServiceForEdit.name === 'Contrassegno'" class="space-y-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Importo</label>
									<input type="text" v-model="servicePopupData.importo" class="w-full bg-[#F8F9FB] rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" placeholder="0.00€" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">Modalità di incasso</label>
									<select v-model="servicePopupData.incasso" class="w-full bg-[#F8F9FB] rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]">
										<option value="">Seleziona</option>
										<option value="contanti">Contanti</option>
										<option value="assegno">Assegno bancario</option>
										<option value="assegno_circolare">Assegno circolare</option>
									</select>
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">Modalità di rimborso</label>
									<select v-model="servicePopupData.rimborso" class="w-full bg-[#F8F9FB] rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]">
										<option value="">Seleziona</option>
										<option value="bonifico">Bonifico bancario</option>
										<option value="assegno">Assegno</option>
									</select>
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">Dettaglio rimborso</label>
									<input type="text" v-model="servicePopupData.dettaglio" class="w-full bg-[#F8F9FB] rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" placeholder="IBAN o dettagli" />
								</div>
							</div>

							<!-- Assicurazione -->
							<div v-if="selectedServiceForEdit.name === 'Assicurazione'" class="space-y-[10px]">
								<div v-for="(pkg, pkgIdx) in shipment.packages" :key="pkgIdx">
									<label class="text-[0.75rem] text-[#737373]">Valore collo #{{ pkgIdx + 1 }} - {{ pkg.weight }}kg</label>
									<input type="text" v-model="servicePopupData['valore_' + pkgIdx]" class="w-full bg-[#F8F9FB] rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" placeholder="0.00€" />
								</div>
							</div>

							<!-- Sponda idraulica -->
							<div v-if="selectedServiceForEdit.name === 'Sponda idraulica'" class="space-y-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Pallet</label>
									<input type="text" v-model="servicePopupData.pallet" class="w-full bg-[#F8F9FB] rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
								</div>
							</div>

							<!-- Chiamata -->
							<div v-if="selectedServiceForEdit.name === 'Chiamata'" class="space-y-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Numero di telefono</label>
									<input type="tel" v-model="servicePopupData.telefono" class="w-full bg-[#F8F9FB] rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" placeholder="Numero di telefono" />
								</div>
							</div>

							<!-- Programmato -->
							<div v-if="selectedServiceForEdit.name === 'Programmato'" class="space-y-[10px]">
								<p class="text-[0.8125rem] text-[#737373]">Seleziona i giorni disponibili per la consegna:</p>
								<div class="flex gap-[8px] flex-wrap">
									<label v-for="day in ['Lun', 'Mar', 'Mer', 'Gio', 'Ven']" :key="day" class="flex items-center gap-[4px] text-[0.8125rem]">
										<input type="checkbox" :value="day" v-model="servicePopupData.giorni" class="accent-[#095866]" />
										{{ day }}
									</label>
								</div>
							</div>

							<button type="button" @click="confirmServicePopup" class="mt-[12px] w-full min-h-[44px] py-[10px] bg-[#095866] text-white rounded-[8px] text-[0.875rem] font-semibold hover:bg-[#074a56] transition-[background-color,transform] duration-200 cursor-pointer active:scale-[0.97]">
								Conferma
							</button>
						</div>

						<div>
							<label class="text-[0.75rem] text-[#737373]">Data ritiro</label>
							<input type="date" v-model="editServices.date" class="w-full bg-white rounded-[8px] h-[44px] px-[10px] text-[1rem] border border-[#D0D0D0] transition-[border-color,box-shadow,background-color] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
						</div>
						<div class="flex gap-[10px] justify-end">
							<button type="button" @click="cancelEdit" class="px-[14px] py-[6px] text-[0.8125rem] text-[#737373] hover:text-[#252B42] transition cursor-pointer">Annulla</button>
							<button type="button" @click="saveEdit('services')" class="px-[14px] py-[6px] bg-[#095866] text-white rounded-[8px] text-[0.8125rem] font-semibold hover:bg-[#074a56] transition cursor-pointer">Salva</button>
						</div>
					</div>
				</div>

				<!-- Totale -->
				<div class="bg-[#252B42] rounded-[16px] p-[16px] tablet:p-[24px_32px] mb-[24px]">
					<div class="flex items-center justify-between gap-[12px]">
						<span class="text-white text-[1rem] tablet:text-[1.125rem] font-semibold">Totale (IVA inclusa)</span>
						<span class="text-white text-[1.5rem] tablet:text-[1.75rem] font-bold">{{ totalPrice }}€</span>
					</div>
					<!-- Promo badge -->
					<div v-if="promoSettings?.active && promoSettings?.label_text" class="flex justify-end mt-[8px]">
						<span
							:style="{ backgroundColor: promoSettings.label_color || '#E44203' }"
							class="inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-[6px] text-white text-[0.75rem] font-bold tracking-wide">
							<!-- Ottimizzazione: lazy loading + decoding async + dimensioni per CLS -->
							<img v-if="promoSettings.label_image" :src="promoSettings.label_image" alt="" loading="lazy" decoding="async" width="30" height="14" class="h-[14px] w-auto" />
							{{ promoSettings.label_text }}
						</span>
					</div>
				</div>

				<!-- Error -->
				<div v-if="submitError" class="ux-alert ux-alert--soft mb-[16px]">
					<Icon name="mdi:alert-circle-outline" class="ux-alert__icon" />
					<span>{{ submitError }}</span>
				</div>

				<!-- Indietro + Procedi al pagamento -->
				<div class="flex flex-col tablet:flex-row items-stretch tablet:items-center justify-between gap-[12px] mb-[24px]">
					<button @click="goBack" class="inline-flex items-center justify-center gap-[8px] px-[24px] min-h-[48px] rounded-[50px] bg-[#095866] text-white font-semibold hover:bg-[#074a56] transition-colors duration-200 cursor-pointer">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
						{{ isEditFromCart ? 'Torna al carrello' : 'Indietro' }}
					</button>
					<button
						v-if="!isEditFromCart"
						@click="proceedToCheckout"
						:disabled="isSubmitting"
						class="inline-flex items-center justify-center gap-[8px] px-[28px] min-h-[48px] rounded-[50px] bg-[#E44203] text-white font-semibold hover:opacity-90 transition-opacity duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
						<span v-if="isSubmitting">Caricamento...</span>
						<span v-else>Procedi al pagamento</span>
						<svg v-if="!isSubmitting" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
					</button>
				</div>

				<!-- Azioni secondarie -->
				<div class="flex flex-col gap-[12px]">
					<!-- In edit mode dal carrello: solo "Salva modifiche" -->
					<button
						v-if="isEditFromCart"
						@click="goToCart"
						:disabled="isSubmitting"
						class="w-full min-h-[82px] flex items-center gap-[14px] p-[16px] rounded-[16px] border border-[#095866] bg-[#f0fafb] hover:bg-[#e0f4f7] transition-[background-color,opacity,border-color] duration-200 cursor-pointer group disabled:opacity-60">
						<div class="w-[44px] h-[44px] rounded-[10px] bg-[#095866]/10 flex items-center justify-center shrink-0">
							<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" class="text-[#095866]"><path fill="currentColor" d="M15 9H5V5h10m-3 14a3 3 0 0 1-3-3a3 3 0 0 1 3-3a3 3 0 0 1 3 3a3 3 0 0 1-3 3m5-16H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7z"/></svg>
						</div>
						<div class="text-left flex-1">
							<p class="text-[0.9375rem] font-semibold text-[#095866]">Salva modifiche</p>
							<p class="text-[0.8125rem] text-[#737373]">Aggiorna la spedizione nel carrello e torna indietro</p>
						</div>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-[#095866] shrink-0"><path fill="currentColor" d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6l-6 6z"/></svg>
					</button>

					<template v-if="!isEditFromCart">
						<button
							@click="goToCart"
							:disabled="isSubmitting"
							class="w-full min-h-[82px] flex items-center gap-[10px] tablet:gap-[14px] p-[12px] tablet:p-[16px] rounded-[16px] border border-[#E9EBEC] bg-white hover:border-[#095866] hover:bg-[#f0fafb] transition-[border-color,background-color,opacity] duration-200 cursor-pointer group disabled:opacity-60">
							<div class="w-[44px] h-[44px] rounded-[10px] bg-[#095866]/10 flex items-center justify-center shrink-0">
								<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" class="text-[#095866]"><path fill="currentColor" d="M17 18a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2c0-1.11.89-2 2-2M1 2h3.27l.94 2H20a1 1 0 0 1 1 1c0 .17-.05.34-.12.5l-3.58 6.47c-.34.61-1 1.03-1.75 1.03H8.1l-.9 1.63l-.03.12a.25.25 0 0 0 .25.25H19v2H7a2 2 0 0 1-2-2c0-.35.09-.68.24-.96l1.36-2.45L3 4H1zm6 16a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2c0-1.11.89-2 2-2"/></svg>
							</div>
							<div class="text-left flex-1">
								<p class="text-[0.9375rem] font-semibold text-[#252B42] group-hover:text-[#095866]">Aggiungi al carrello</p>
								<p class="text-[0.8125rem] text-[#737373]">Aggiungi la spedizione al carrello per pagare dopo</p>
							</div>
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-[#C8CCD0] shrink-0"><path fill="currentColor" d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6l-6 6z"/></svg>
						</button>

						<button
							@click="goToSavedShipments"
							:disabled="isSubmitting || !isAuthenticated"
							class="w-full min-h-[82px] flex items-center gap-[10px] tablet:gap-[14px] p-[12px] tablet:p-[16px] rounded-[16px] border border-[#E9EBEC] bg-white hover:border-[#095866] hover:bg-[#f0fafb] transition-[border-color,background-color,opacity] duration-200 cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed">
							<div class="w-[44px] h-[44px] rounded-[10px] bg-blue-50 flex items-center justify-center shrink-0">
								<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" class="text-blue-600"><path fill="currentColor" d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18c-.21 0-.41-.06-.57-.18l-7.9-4.44A.99.99 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18c.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88zM12 4.15L6.04 7.5L12 10.85l5.96-3.35zM5 15.91l6 3.37v-6.73L5 9.18zm14 0V9.18l-6 3.37v6.73z"/></svg>
							</div>
							<div class="text-left flex-1">
								<p class="text-[0.9375rem] font-semibold text-[#252B42] group-hover:text-[#095866]">Salva nelle spedizioni configurate</p>
								<p class="text-[0.8125rem] text-[#737373]">
									{{ isAuthenticated ? 'Salva la spedizione per riutilizzarla in futuro' : 'Accedi per salvare questa configurazione' }}
								</p>
							</div>
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-[#C8CCD0] shrink-0"><path fill="currentColor" d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6l-6 6z"/></svg>
						</button>

						<button
							@click="addAnotherShipment"
							:disabled="isSubmitting"
							class="w-full min-h-[82px] flex items-center gap-[10px] tablet:gap-[14px] p-[12px] tablet:p-[16px] rounded-[16px] border border-[#E9EBEC] bg-white hover:border-[#095866] hover:bg-[#f0fafb] transition-[border-color,background-color,opacity] duration-200 cursor-pointer group disabled:opacity-60">
							<div class="w-[44px] h-[44px] rounded-[10px] bg-orange-50 flex items-center justify-center shrink-0">
								<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" class="text-orange-600"><path fill="currentColor" d="M17 13h-4v4h-2v-4H7v-2h4V7h2v4h4m-5-9A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2"/></svg>
							</div>
							<div class="text-left flex-1">
								<p class="text-[0.9375rem] font-semibold text-[#252B42] group-hover:text-[#095866]">Aggiungi un'altra spedizione</p>
								<p class="text-[0.8125rem] text-[#737373]">Configura una nuova spedizione</p>
							</div>
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-[#C8CCD0] shrink-0"><path fill="currentColor" d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6l-6 6z"/></svg>
						</button>
					</template>
				</div>
			</div>
		</div>
	</section>
</template>
