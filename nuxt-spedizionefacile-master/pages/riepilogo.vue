<script setup>
const userStore = useUserStore();
const { isAuthenticated } = useSanctumAuth();
const sanctumClient = useSanctumClient();
const { endpoint, refresh: refreshCart } = useCart();
const { session } = useSession();

const isSubmitting = ref(false);
const submitError = ref(null);

const shipment = computed(() => userStore.pendingShipment);

// If no pending shipment, redirect back
if (!shipment.value) {
	navigateTo('/la-tua-spedizione/2');
}

const formatPrice = (price) => {
	if (!price && price !== 0) return '0,00€';
	const num = Number(price);
	return num.toFixed(2).replace('.', ',') + '€';
};

const totalPrice = computed(() => {
	const price = session.value?.data?.total_price;
	if (!price && price !== 0) return '0,00';
	return Number(price).toFixed(2).replace('.', ',');
});

// Pre-generated order number (visual only, real number assigned on payment)
const preOrderNumber = ref(`SF-${Date.now().toString().slice(-6)}`);

// Inline editing state
const editingSection = ref(null); // 'colli', 'origin', 'destination', 'services'

const editColli = ref([]);
const editOrigin = ref({});
const editDestination = ref({});
const editServices = ref({});

// Available services list (same as [step].vue)
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

// Service editing modal
const showServiceModal = ref(false);
const selectedServiceForEdit = ref(null);
const servicePopupData = ref({});

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

const cancelEdit = () => {
	editingSection.value = null;
	showServiceModal.value = false;
	selectedServiceForEdit.value = null;
};

const isServiceSelected = (serviceName) => {
	return editServices.value?.selectedList?.includes(serviceName) || false;
};

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

const saveEdit = (section) => {
	if (section === 'colli' && userStore.pendingShipment) {
		userStore.pendingShipment.packages = editColli.value.map(p => ({ ...p }));
	}
	if (section === 'origin' && userStore.pendingShipment) {
		userStore.pendingShipment.origin_address = { ...editOrigin.value };
	}
	if (section === 'destination' && userStore.pendingShipment) {
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
};

// Direct to checkout - create standalone order WITHOUT touching the cart
const proceedToCheckout = async () => {
	if (!shipment.value) return;
	if (!isAuthenticated.value) {
		submitError.value = "Devi effettuare il login per procedere al pagamento.";
		return;
	}
	isSubmitting.value = true;
	submitError.value = null;
	try {
		// Create a standalone order directly (saves packages + creates order in one step)
		const result = await sanctumClient("/api/create-direct-order", {
			method: "POST",
			body: shipment.value,
		});

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

const goToSavedShipments = async () => {
	if (!shipment.value) return;
	if (!isAuthenticated.value) {
		submitError.value = "Devi effettuare il login per salvare le spedizioni configurate.";
		return;
	}
	isSubmitting.value = true;
	submitError.value = null;
	try {
		await sanctumClient("/api/saved-shipments", {
			method: "POST",
			body: shipment.value,
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

const addAnotherShipment = async () => {
	if (!shipment.value) return;
	isSubmitting.value = true;
	if (isAuthenticated.value) {
		try {
			await sanctumClient("/api/saved-shipments", {
				method: "POST",
				body: shipment.value,
			});
		} catch (e) {
			console.error('Add another save error:', e);
		}
	}
	isSubmitting.value = false;
	navigateTo('/preventivo');
};

const goToCart = async () => {
	if (!shipment.value) return;
	isSubmitting.value = true;
	submitError.value = null;
	try {
		await sanctumClient(endpoint.value, {
			method: "POST",
			body: shipment.value,
		});
		clearNuxtData("cart");
		await refreshCart();
		navigateTo('/carrello');
	} catch (error) {
		console.error('Cart save error:', error);
		const errorData = error?.response?._data || error?.data;
		submitError.value = errorData?.message || "Errore durante il salvataggio nel carrello. Riprova.";
	} finally {
		isSubmitting.value = false;
	}
};

const goBack = () => {
	navigateTo('/la-tua-spedizione/2?step=ritiro');
};
</script>

<template>
	<section class="min-h-[600px]">
		<div class="my-container mt-[72px] mb-[120px]">
			<Steps :current-step="3" />

			<div v-if="!shipment" class="text-center py-[60px]">
				<p class="text-[1rem] text-[#737373]">Nessuna spedizione da riepilogare. Torna indietro per configurare la tua spedizione.</p>
				<NuxtLink to="/la-tua-spedizione/2" class="inline-block mt-[20px] px-[24px] py-[12px] bg-[#095866] text-white rounded-[10px] font-semibold hover:bg-[#0a7a8c] transition-colors">
					Torna alla configurazione
				</NuxtLink>
			</div>

			<div v-else class="max-w-[900px] mx-auto">
				<h1 class="text-[1.75rem] font-bold text-[#252B42] text-center mb-[12px] font-montserrat">Riepilogo spedizione</h1>
				<p class="text-center text-[0.875rem] text-[#737373] mb-[32px]">
					N. ordine provvisorio: <span class="font-mono font-bold text-[#095866] bg-[#095866]/10 px-[10px] py-[3px] rounded-[6px]">{{ preOrderNumber }}</span>
				</p>

				<!-- Colli -->
				<div class="bg-[#E4E4E4] rounded-[20px] p-[28px_32px] mb-[16px]">
					<div class="flex items-center justify-between mb-[16px]">
						<h2 class="text-[1.125rem] font-bold text-[#252B42]">Colli</h2>
						<button type="button" @click="startEdit('colli')" class="text-[#095866] hover:text-[#0a7a8c] transition cursor-pointer" title="Modifica colli">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
						</button>
					</div>

					<!-- View mode -->
					<div v-if="editingSection !== 'colli'" class="space-y-[10px]">
						<div v-for="(pkg, idx) in shipment.packages" :key="idx" class="bg-white rounded-[12px] p-[16px] flex items-center justify-between">
							<div class="flex items-center gap-[16px]">
								<div class="w-[44px] h-[44px] rounded-[10px] bg-[#F8F9FB] flex items-center justify-center">
									<NuxtImg src="/img/quote/first-step/pack.png" alt="" width="28" height="28" />
								</div>
								<div>
									<p class="text-[0.9375rem] font-semibold text-[#252B42]">{{ pkg.package_type || 'Pacco' }} #{{ idx + 1 }}</p>
									<p class="text-[0.8125rem] text-[#737373]">{{ pkg.quantity || 1 }}x &ndash; {{ pkg.weight }} kg &ndash; {{ pkg.first_size }}x{{ pkg.second_size }}x{{ pkg.third_size }} cm</p>
								</div>
							</div>
							<span class="text-[0.9375rem] font-bold text-[#252B42]">{{ formatPrice(pkg.single_price) }}</span>
						</div>
					</div>

					<!-- Edit mode -->
					<div v-else class="space-y-[12px]">
						<div v-for="(pkg, idx) in editColli" :key="idx" class="bg-white rounded-[12px] p-[16px]">
							<p class="font-semibold text-[#252B42] mb-[10px]">Collo #{{ idx + 1 }}</p>
							<div class="grid grid-cols-2 desktop:grid-cols-4 gap-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Quantità</label>
									<input type="number" v-model="pkg.quantity" min="1" class="w-full bg-[#F1F1F1] rounded-[8px] h-[36px] text-center text-[0.875rem] px-[8px]" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">Peso (kg)</label>
									<input type="number" v-model="pkg.weight" min="0.1" step="0.1" class="w-full bg-[#F1F1F1] rounded-[8px] h-[36px] text-center text-[0.875rem] px-[8px]" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">L (cm)</label>
									<input type="number" v-model="pkg.first_size" min="1" class="w-full bg-[#F1F1F1] rounded-[8px] h-[36px] text-center text-[0.875rem] px-[8px]" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">P (cm)</label>
									<input type="number" v-model="pkg.second_size" min="1" class="w-full bg-[#F1F1F1] rounded-[8px] h-[36px] text-center text-[0.875rem] px-[8px]" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">H (cm)</label>
									<input type="number" v-model="pkg.third_size" min="1" class="w-full bg-[#F1F1F1] rounded-[8px] h-[36px] text-center text-[0.875rem] px-[8px]" />
								</div>
							</div>
						</div>
						<div class="flex gap-[10px] justify-end">
							<button type="button" @click="cancelEdit" class="px-[16px] py-[8px] text-[0.875rem] text-[#737373] hover:text-[#252B42] transition cursor-pointer">Annulla</button>
							<button type="button" @click="saveEdit('colli')" class="px-[16px] py-[8px] bg-[#095866] text-white rounded-[8px] text-[0.875rem] font-semibold hover:bg-[#0a7a8c] transition cursor-pointer">Salva</button>
						</div>
					</div>
				</div>

				<!-- Indirizzi -->
				<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[16px] mb-[16px]">
					<!-- Partenza -->
					<div class="bg-[#E4E4E4] rounded-[20px] p-[28px_32px]">
						<div class="flex items-center justify-between mb-[16px]">
							<h2 class="text-[1.125rem] font-bold text-[#252B42] flex items-center gap-[8px]">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
								Partenza
							</h2>
							<button type="button" @click="startEdit('origin')" class="text-[#095866] hover:text-[#0a7a8c] transition cursor-pointer" title="Modifica partenza">
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
								<input type="text" v-model="editOrigin.name" class="w-full bg-white rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" />
							</div>
							<div class="grid grid-cols-2 gap-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Indirizzo</label>
									<input type="text" v-model="editOrigin.address" class="w-full bg-white rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">N. Civico</label>
									<input type="text" v-model="editOrigin.address_number" class="w-full bg-white rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" />
								</div>
							</div>
							<div class="grid grid-cols-3 gap-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Città</label>
									<input type="text" v-model="editOrigin.city" class="w-full bg-white rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">CAP</label>
									<input type="text" v-model="editOrigin.postal_code" class="w-full bg-white rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">Provincia</label>
									<input type="text" v-model="editOrigin.province" class="w-full bg-white rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" />
								</div>
							</div>
							<div class="grid grid-cols-2 gap-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Telefono</label>
									<input type="tel" v-model="editOrigin.telephone_number" class="w-full bg-white rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">Email</label>
									<input type="email" v-model="editOrigin.email" class="w-full bg-white rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" />
								</div>
							</div>
							<div class="flex gap-[10px] justify-end">
								<button type="button" @click="cancelEdit" class="px-[14px] py-[6px] text-[0.8125rem] text-[#737373] hover:text-[#252B42] transition cursor-pointer">Annulla</button>
								<button type="button" @click="saveEdit('origin')" class="px-[14px] py-[6px] bg-[#095866] text-white rounded-[8px] text-[0.8125rem] font-semibold hover:bg-[#0a7a8c] transition cursor-pointer">Salva</button>
							</div>
						</div>
					</div>

					<!-- Destinazione -->
					<div class="bg-[#E4E4E4] rounded-[20px] p-[28px_32px]">
						<div class="flex items-center justify-between mb-[16px]">
							<h2 class="text-[1.125rem] font-bold text-[#252B42] flex items-center gap-[8px]">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
								Destinazione
							</h2>
							<button type="button" @click="startEdit('destination')" class="text-[#095866] hover:text-[#0a7a8c] transition cursor-pointer" title="Modifica destinazione">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
							</button>
						</div>

						<!-- View mode -->
						<div v-if="editingSection !== 'destination'" class="text-[0.875rem] text-[#252B42] space-y-[4px]">
							<p class="font-semibold">{{ shipment.destination_address?.name }}</p>
							<p>{{ shipment.destination_address?.address }} {{ shipment.destination_address?.address_number }}</p>
							<p>{{ shipment.destination_address?.postal_code }} {{ shipment.destination_address?.city }} ({{ shipment.destination_address?.province }})</p>
							<p v-if="shipment.destination_address?.telephone_number && shipment.destination_address.telephone_number !== '0000000000'" class="text-[#737373]">Tel: {{ shipment.destination_address.telephone_number }}</p>
							<p v-if="shipment.destination_address?.email" class="text-[#737373]">{{ shipment.destination_address.email }}</p>
						</div>

						<!-- Edit mode -->
						<div v-else class="space-y-[10px]">
							<div>
								<label class="text-[0.75rem] text-[#737373]">Nome e Cognome</label>
								<input type="text" v-model="editDestination.name" class="w-full bg-white rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" />
							</div>
							<div class="grid grid-cols-2 gap-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Indirizzo</label>
									<input type="text" v-model="editDestination.address" class="w-full bg-white rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">N. Civico</label>
									<input type="text" v-model="editDestination.address_number" class="w-full bg-white rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" />
								</div>
							</div>
							<div class="grid grid-cols-3 gap-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Città</label>
									<input type="text" v-model="editDestination.city" class="w-full bg-white rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">CAP</label>
									<input type="text" v-model="editDestination.postal_code" class="w-full bg-white rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">Provincia</label>
									<input type="text" v-model="editDestination.province" class="w-full bg-white rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" />
								</div>
							</div>
							<div class="grid grid-cols-2 gap-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Telefono</label>
									<input type="tel" v-model="editDestination.telephone_number" class="w-full bg-white rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">Email</label>
									<input type="email" v-model="editDestination.email" class="w-full bg-white rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" />
								</div>
							</div>
							<div class="flex gap-[10px] justify-end">
								<button type="button" @click="cancelEdit" class="px-[14px] py-[6px] text-[0.8125rem] text-[#737373] hover:text-[#252B42] transition cursor-pointer">Annulla</button>
								<button type="button" @click="saveEdit('destination')" class="px-[14px] py-[6px] bg-[#095866] text-white rounded-[8px] text-[0.8125rem] font-semibold hover:bg-[#0a7a8c] transition cursor-pointer">Salva</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Servizi + Data -->
				<div class="bg-[#E4E4E4] rounded-[20px] p-[28px_32px] mb-[16px]">
					<div class="flex items-center justify-between mb-[12px]">
						<h2 class="text-[1.125rem] font-bold text-[#252B42]">Servizi e data ritiro</h2>
						<button type="button" @click="startEdit('services')" class="text-[#095866] hover:text-[#0a7a8c] transition cursor-pointer" title="Modifica servizi">
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
									class="inline-block px-[12px] py-[4px] bg-[#095866]/10 text-[#095866] rounded-[20px] text-[0.8125rem] font-semibold">
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
						<div class="grid grid-cols-2 desktop:grid-cols-4 gap-[8px]">
							<button
								v-for="(svc, svcIdx) in availableServices"
								:key="svcIdx"
								type="button"
								@click="toggleService(svc)"
								:class="isServiceSelected(svc.name)
									? 'bg-[#095866] text-white border-[#095866]'
									: 'bg-white text-[#252B42] border-[#D0D0D0] hover:border-[#095866]'"
								class="px-[12px] py-[10px] rounded-[10px] text-[0.8125rem] font-medium border transition-all cursor-pointer text-center">
								{{ svc.name }}
							</button>
						</div>

						<!-- Service popup (for services that need extra data) -->
						<div v-if="showServiceModal && selectedServiceForEdit" class="bg-white rounded-[12px] border border-[#D0D0D0] p-[20px] mt-[12px]">
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
									<input type="text" v-model="servicePopupData.importo" class="w-full bg-[#F8F9FB] rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" placeholder="0.00€" />
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">Modalità di incasso</label>
									<select v-model="servicePopupData.incasso" class="w-full bg-[#F8F9FB] rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]">
										<option value="">Seleziona</option>
										<option value="contanti">Contanti</option>
										<option value="assegno">Assegno bancario</option>
										<option value="assegno_circolare">Assegno circolare</option>
									</select>
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">Modalità di rimborso</label>
									<select v-model="servicePopupData.rimborso" class="w-full bg-[#F8F9FB] rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]">
										<option value="">Seleziona</option>
										<option value="bonifico">Bonifico bancario</option>
										<option value="assegno">Assegno</option>
									</select>
								</div>
								<div>
									<label class="text-[0.75rem] text-[#737373]">Dettaglio rimborso</label>
									<input type="text" v-model="servicePopupData.dettaglio" class="w-full bg-[#F8F9FB] rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" placeholder="IBAN o dettagli" />
								</div>
							</div>

							<!-- Assicurazione -->
							<div v-if="selectedServiceForEdit.name === 'Assicurazione'" class="space-y-[10px]">
								<div v-for="(pkg, pkgIdx) in shipment.packages" :key="pkgIdx">
									<label class="text-[0.75rem] text-[#737373]">Valore collo #{{ pkgIdx + 1 }} - {{ pkg.weight }}kg</label>
									<input type="text" v-model="servicePopupData['valore_' + pkgIdx]" class="w-full bg-[#F8F9FB] rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" placeholder="0.00€" />
								</div>
							</div>

							<!-- Sponda idraulica -->
							<div v-if="selectedServiceForEdit.name === 'Sponda idraulica'" class="space-y-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Pallet</label>
									<input type="text" v-model="servicePopupData.pallet" class="w-full bg-[#F8F9FB] rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" />
								</div>
							</div>

							<!-- Chiamata -->
							<div v-if="selectedServiceForEdit.name === 'Chiamata'" class="space-y-[10px]">
								<div>
									<label class="text-[0.75rem] text-[#737373]">Numero di telefono</label>
									<input type="tel" v-model="servicePopupData.telefono" class="w-full bg-[#F8F9FB] rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" placeholder="Numero di telefono" />
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

							<button type="button" @click="confirmServicePopup" class="mt-[12px] w-full py-[10px] bg-[#095866] text-white rounded-[8px] text-[0.875rem] font-semibold hover:bg-[#0a7a8c] transition cursor-pointer">
								Conferma
							</button>
						</div>

						<div>
							<label class="text-[0.75rem] text-[#737373]">Data ritiro</label>
							<input type="date" v-model="editServices.date" class="w-full bg-white rounded-[8px] h-[36px] px-[10px] text-[0.875rem] border border-[#D0D0D0]" />
						</div>
						<div class="flex gap-[10px] justify-end">
							<button type="button" @click="cancelEdit" class="px-[14px] py-[6px] text-[0.8125rem] text-[#737373] hover:text-[#252B42] transition cursor-pointer">Annulla</button>
							<button type="button" @click="saveEdit('services')" class="px-[14px] py-[6px] bg-[#095866] text-white rounded-[8px] text-[0.8125rem] font-semibold hover:bg-[#0a7a8c] transition cursor-pointer">Salva</button>
						</div>
					</div>
				</div>

				<!-- Totale -->
				<div class="bg-[#252B42] rounded-[20px] p-[24px_32px] mb-[24px] flex items-center justify-between">
					<span class="text-white text-[1.125rem] font-semibold">Totale (IVA inclusa)</span>
					<span class="text-white text-[1.75rem] font-bold">{{ totalPrice }}€</span>
				</div>

				<!-- Error -->
				<div v-if="submitError" class="mb-[16px] p-[14px] bg-red-50 border border-red-200 rounded-[12px] flex items-center gap-[10px]">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-red-500 shrink-0"><path fill="currentColor" d="M13 13h-2V7h2m0 10h-2v-2h2M12 2a10 10 0 0 1 10 10a10 10 0 0 1-10 10A10 10 0 0 1 2 12A10 10 0 0 1 12 2"/></svg>
					<p class="text-red-600 text-[0.9375rem] font-medium">{{ submitError }}</p>
				</div>

				<!-- Indietro + Procedi al pagamento -->
				<div class="flex items-center justify-between mb-[24px]">
					<button @click="goBack" class="inline-flex items-center gap-[8px] px-[24px] h-[48px] rounded-[30px] bg-[#095866] text-white font-semibold hover:bg-[#0a7a8c] transition cursor-pointer">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
						Indietro
					</button>
					<button
						@click="proceedToCheckout"
						:disabled="isSubmitting"
						class="inline-flex items-center gap-[8px] px-[28px] h-[48px] rounded-[30px] bg-[#E44203] text-white font-semibold hover:opacity-90 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
						<span v-if="isSubmitting">Caricamento...</span>
						<span v-else>Procedi al pagamento</span>
						<svg v-if="!isSubmitting" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
					</button>
				</div>

				<!-- Azioni secondarie -->
				<div class="flex flex-col gap-[12px]">
					<button
						@click="goToCart"
						:disabled="isSubmitting"
						class="w-full flex items-center gap-[14px] p-[16px] rounded-[12px] border border-[#E9EBEC] bg-white hover:border-[#095866] hover:bg-[#f0fafb] transition-all cursor-pointer group disabled:opacity-60">
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
						v-if="isAuthenticated"
						@click="goToSavedShipments"
						:disabled="isSubmitting"
						class="w-full flex items-center gap-[14px] p-[16px] rounded-[12px] border border-[#E9EBEC] bg-white hover:border-[#095866] hover:bg-[#f0fafb] transition-all cursor-pointer group disabled:opacity-60">
						<div class="w-[44px] h-[44px] rounded-[10px] bg-blue-50 flex items-center justify-center shrink-0">
							<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" class="text-blue-600"><path fill="currentColor" d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18c-.21 0-.41-.06-.57-.18l-7.9-4.44A.99.99 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18c.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88zM12 4.15L6.04 7.5L12 10.85l5.96-3.35zM5 15.91l6 3.37v-6.73L5 9.18zm14 0V9.18l-6 3.37v6.73z"/></svg>
						</div>
						<div class="text-left flex-1">
							<p class="text-[0.9375rem] font-semibold text-[#252B42] group-hover:text-[#095866]">Salva nelle spedizioni configurate</p>
							<p class="text-[0.8125rem] text-[#737373]">Salva la spedizione per riutilizzarla in futuro</p>
						</div>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-[#C8CCD0] shrink-0"><path fill="currentColor" d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6l-6 6z"/></svg>
					</button>

					<button
						@click="addAnotherShipment"
						:disabled="isSubmitting"
						class="w-full flex items-center gap-[14px] p-[16px] rounded-[12px] border border-[#E9EBEC] bg-white hover:border-[#095866] hover:bg-[#f0fafb] transition-all cursor-pointer group disabled:opacity-60">
						<div class="w-[44px] h-[44px] rounded-[10px] bg-orange-50 flex items-center justify-center shrink-0">
							<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" class="text-orange-600"><path fill="currentColor" d="M17 13h-4v4h-2v-4H7v-2h4V7h2v4h4m-5-9A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2"/></svg>
						</div>
						<div class="text-left flex-1">
							<p class="text-[0.9375rem] font-semibold text-[#252B42] group-hover:text-[#095866]">Aggiungi un'altra spedizione</p>
							<p class="text-[0.8125rem] text-[#737373]">Configura una nuova spedizione</p>
						</div>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-[#C8CCD0] shrink-0"><path fill="currentColor" d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6l-6 6z"/></svg>
					</button>
				</div>
			</div>
		</div>
	</section>
</template>
