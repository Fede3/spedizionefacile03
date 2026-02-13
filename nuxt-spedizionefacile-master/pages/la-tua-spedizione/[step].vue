<script setup>
const userStore = useUserStore();

import { Swiper, SwiperSlide } from "swiper/vue";

import "swiper/css";
import "swiper/css/navigation";

// import required modules
import { Navigation } from "swiper/modules";

definePageMeta({
	middleware: ["shipment-validation"],
});

/* Servizi */
const services = ref({
	service_type: "",
	date: "",
	time: "",
});

const servicesList = ref([
	{
		img: "no-label.png",
		width: 78,
		height: 51,
		name: "Spedizione Senza etichetta",
		description: "Non stampare nulla: mostrare un codice sul telefono, etichetta applicata al ritiro.",
		isSelected: false,
	},
	{
		img: "cash-on-delivery.png",
		width: 60,
		height: 51,
		name: "Contrassegno",
		description: "Pagare alla consegna: il corriere incassare dal destinatario per conto del mittente.",
		isSelected: false,
		popupDescription:
			"Fare pagare il destinatario al momento della consegna. Il corriere incassa l'importo e lo accredita al mittente secondo la modalità scelta. Se il destinatario non paga o rifiuta, la consegna non viene completata.",
	},
	{
		img: "insurance.png",
		width: 64,
		height: 64,
		name: "Assicurazione",
		description: "Coprire il valore: rimborso in caso di smarrimento, furto o danneggiamento.",
		isSelected: false,
		popupIcon: "insurance-icon.png",
		popupDescription: "Indicare il valore del contenuto. In caso di smarrimento o danneggiamento durante il trasporto, è possibile richiedere un rimborso secondo le condizioni del servizio.",
	},
	{
		img: "pickup-and-delivery.png",
		width: 60,
		height: 60,
		name: "Ritiro e consegna",
		description: "Ritiro a domicilio e consegna allindirizzo indicato.",
		isSelected: false,
	},
	{
		img: "tail-lift.png",
		width: 58,
		height: 55,
		name: "Sponda idraulica",
		description: "Camion con pedana di sollevamento per carico e scarico di colli pesanti.",
		isSelected: false,
		popupDescription:
			"Richiedere il mezzo con sponda per caricare o scaricare quando non è disponibile banchina, muletto o personale di movimentazione. La disponibilità dipende dal corriere e dalla tratta.",
	},
	{
		img: "scheduled.png",
		width: 52,
		height: 51,
		name: "Programmato",
		description: "Scegliere in anticipo il giorno (e, se disponibile, la fascia) di ritiro o consegna.",
		isSelected: false,
		popupDescription: "Se disponibile per questa spedizione, permettere di indicare i giorni in cui il destinatario è reperibile. La consegna verrà tentata solo nei giorni selezionati.",
	},
	{
		img: "call.png",
		width: 64,
		height: 61,
		name: "Chiamata",
		description: "Ricevere un avviso (messaggio o chiamata) quando il pacco è in consegna.",
		isSelected: false,
		popupDescription: "Inserire un numero di telefono per concordare la consegna. Il servizio può richiedere fino a 5 giorni lavorativi aggiuntivi.",
	},
	{
		img: "post-office-box.png",
		width: 50,
		height: 67,
		name: "Casella postale",
		description: "Recapito in ufficio postale, dentro una casella dedicata al destinatario.",
		isSelected: false,
	},
	{
		img: "prova.png",
		width: 74,
		height: 55,
		name: "Prova",
		description: "Prova",
		isSelected: false,
	},
]);

const open = ref(false);

const { session, status, refresh } = useSession();

const route = useRoute();

const middleware = () => {
	if (!session.value?.data?.services && route.fullPath.endsWith("3")) {
		return navigateTo("/la-tua-spedizione/2");
	}
};

middleware();

const isServiceChecked = ref(false);

const selectedService = ref({
	index: "",
	name: "",
	description: "",
	icon: "",
});

const myService = ref(null);
const myServiceIndex = ref(null);

const chooseService = (service, serviceIndex) => {
	open.value = true;

	selectedService.value.name = service.name;
	selectedService.value.description = service.popupDescription;
	selectedService.value.index = serviceIndex;
	selectedService.value.icon = service.popupIcon;

	servicesList.value[serviceIndex].isSelected = true;
	myService.value = service;
	myServiceIndex.value = serviceIndex;
};

const addService = (service = myService.value) => {
	if (!service?.name) {
		open.value = false;
		return;
	}

	if (!userStore.servicesArray.includes(service.name)) {
		userStore.servicesArray.push(service.name);
	} else {
		const index = userStore.servicesArray.indexOf(service.name);
		if (index !== -1) {
			userStore.servicesArray.splice(index, 1); // rimuove 1 elemento all'indice trovato
		}
	}

	services.value.service_type = userStore.servicesArray.join(", ");
	open.value = false;
};

const removeServiceFromSidebar = (idx) => {
	const removed = userStore.servicesArray[idx];
	userStore.servicesArray.splice(idx, 1);
	services.value.service_type = userStore.servicesArray.join(", ");
	// Deselect visually
	const svc = servicesList.value.find(s => s.name === removed);
	if (svc) svc.isSelected = false;
};

const chooseDate = (day) => {
	const lastDay = day.date.toLocaleDateString();
	if (!services.value.date || services.value.date != lastDay) {
		services.value.date = day.date.toLocaleDateString();
	} else {
		services.value.date = "";
	}
};

const daysInMonth = computed(() => {
	const arr = [];

	const today = new Date();
	const year = today.getFullYear();
	const month = today.getMonth();
	const day = today.getDate() + 1;

	// Giorni rimanenti del mese corrente
	const daysCurrentMonth = new Date(year, month + 1, 0).getDate();
	for (let i = day; i <= daysCurrentMonth; i++) {
		const date = new Date(year, month, i);

		const weekday = date.toLocaleString("default", { weekday: "short" });
		const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

		const monthAbbr = date.toLocaleString("default", { month: "short" });
		const formattedMonthAbbr = monthAbbr.charAt(0).toUpperCase() + monthAbbr.slice(1);

		if (formattedWeekday !== "Sab" && formattedWeekday !== "Dom") {
			arr.push({
				date,
				weekday: formattedWeekday,
				dayNumber: date.getDate(),
				monthAbbr: formattedMonthAbbr,
			});
		}
	}

	// Tutti i giorni del mese successivo
	const nextMonth = month + 1;
	const daysNextMonth = new Date(year, nextMonth + 1, 0).getDate();
	for (let i = 1; i <= daysNextMonth; i++) {
		const date = new Date(year, nextMonth, i);

		const weekday = date.toLocaleString("default", { weekday: "short" });
		const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

		const monthAbbr = date.toLocaleString("default", { month: "short" });
		const formattedMonthAbbr = monthAbbr.charAt(0).toUpperCase() + monthAbbr.slice(1);

		if (formattedWeekday !== "Sab" && formattedWeekday !== "Dom") {
			arr.push({
				date,
				weekday: formattedWeekday,
				dayNumber: date.getDate(),
				monthAbbr: formattedMonthAbbr,
			});
		}
	}

	return arr;
});

const isOriginDetailsEdited = ref(false);
const isDestinationDetailsEdited = ref(false);

const temporaryShipmentDetails = ref({});

const editOriginDetails = () => {
	temporaryShipmentDetails.value = { ...userStore.shipmentDetails };

	isOriginDetailsEdited.value = !isOriginDetailsEdited.value;
};

const editDestinationDetails = () => {
	temporaryShipmentDetails.value = { ...userStore.shipmentDetails };

	isDestinationDetailsEdited.value = !isDestinationDetailsEdited.value;
};

const myClose = () => {
	if (selectedService.value.index !== "" && servicesList.value[selectedService.value.index]) {
		servicesList.value[selectedService.value.index].isSelected = false;
	}
	open.value = false;
};

// Quando il modal viene chiuso dall'esterno (click fuori), deseleziona il servizio
watch(open, (newVal) => {
	if (!newVal && selectedService.value.index !== "" && servicesList.value[selectedService.value.index]) {
		servicesList.value[selectedService.value.index].isSelected = false;
	}
});

/* Dati indirizzo generico */
const address = {
	full_name: "",
	additional_information: "",
	address: "",
	address_number: "",
	intercom_code: "",
	country: "Italia",
	province: "",
	telephone_number: "",
	email: "",
};

/* Pre-fill from userStore if navigating back from riepilogo */
const storedOrigin = userStore.originAddressData;
const storedDest = userStore.destinationAddressData;

/* Dati indirizzo di partenza */
const originAddress = ref(storedOrigin ? { ...storedOrigin } : {
	...address,
	type: "Partenza",
	city: session.value?.data?.shipment_details?.origin_city || "",
	postal_code: session.value?.data?.shipment_details?.origin_postal_code || "",
});

/* Dati indirizzo di destinazione */
const destinationAddress = ref(storedDest ? { ...storedDest } : {
	...address,
	type: "Destinazione",
	city: session.value?.data?.shipment_details?.destination_city || "",
	postal_code: session.value?.data?.shipment_details?.destination_postal_code || "",
});

/* Auto-show address fields if coming back from riepilogo */
if (route.query.step === 'ritiro' || storedOrigin) {
	// Will be used after showAddressFields ref is created
	nextTick(() => {
		showAddressFields.value = true;
	});
}

/* Restore pickup date from store */
if (userStore.pickupDate) {
	services.value.date = userStore.pickupDate;
}

/* Restore services selection from store */
if (userStore.servicesArray.length > 0) {
	services.value.service_type = userStore.servicesArray.join(", ");
	// Mark selected services visually
	servicesList.value.forEach(svc => {
		if (userStore.servicesArray.includes(svc.name)) {
			svc.isSelected = true;
		}
	});
}

/* Saved addresses selector */
const savedAddresses = ref([]);
const loadingSavedAddresses = ref(false);
const showOriginAddressSelector = ref(false);
const showDestAddressSelector = ref(false);

const loadSavedAddresses = async () => {
	if (!isAuthenticated.value) return;
	if (savedAddresses.value.length > 0) return;
	loadingSavedAddresses.value = true;
	try {
		const result = await sanctumClient("/api/user-addresses");
		savedAddresses.value = result?.data || [];
	} catch (e) {
		console.error("Errore caricamento indirizzi:", e);
	} finally {
		loadingSavedAddresses.value = false;
	}
};

const applySavedAddress = (addr, target) => {
	const addrRef = target === 'origin' ? originAddress : destinationAddress;
	addrRef.value.full_name = addr.name || "";
	addrRef.value.address = addr.address || "";
	addrRef.value.address_number = addr.address_number || "";
	addrRef.value.city = addr.city || "";
	addrRef.value.postal_code = addr.postal_code || "";
	addrRef.value.province = addr.province || "";
	addrRef.value.telephone_number = addr.telephone_number || "";
	addrRef.value.email = addr.email || "";
	addrRef.value.additional_information = addr.additional_information || "";
	addrRef.value.intercom_code = addr.intercom_code || "";
	if (target === 'origin') {
		showOriginAddressSelector.value = false;
	} else {
		showDestAddressSelector.value = false;
	}
};

const toggleAddressSelector = (target) => {
	loadSavedAddresses();
	if (target === 'origin') {
		showOriginAddressSelector.value = !showOriginAddressSelector.value;
		showDestAddressSelector.value = false;
	} else {
		showDestAddressSelector.value = !showDestAddressSelector.value;
		showOriginAddressSelector.value = false;
	}
};

/* Pre-fill address data when session loads */
watch(() => session.value?.data?.shipment_details, (details) => {
	if (details) {
		if (!originAddress.value.city) originAddress.value.city = details.origin_city;
		if (!originAddress.value.postal_code) originAddress.value.postal_code = details.origin_postal_code;
		if (!destinationAddress.value.city) destinationAddress.value.city = details.destination_city;
		if (!destinationAddress.value.postal_code) destinationAddress.value.postal_code = details.destination_postal_code;
	}
}, { immediate: true });

/* Validazione campi */
const validationErrors = ref({});
const showValidation = ref(false);

const validateField = (section, field, value, label) => {
	const key = `${section}_${field}`;
	if (!value || !String(value).trim()) {
		validationErrors.value[key] = `${label} è obbligatorio`;
		return false;
	}
	// Validazione specifica per telefono
	if (field === 'telephone_number') {
		const cleaned = String(value).replace(/\s/g, '');
		if (cleaned.length < 6 || !/^[+\d][\d\s-]{5,}$/.test(cleaned)) {
			validationErrors.value[key] = 'Inserisci un numero di telefono valido';
			return false;
		}
	}
	// Validazione CAP
	if (field === 'postal_code') {
		const cleaned = String(value).replace(/[^0-9]/g, '');
		if (cleaned.length < 4 || cleaned.length > 5) {
			validationErrors.value[key] = 'Inserisci un CAP valido (5 cifre)';
			return false;
		}
	}
	// Validazione email (solo se compilata)
	if (field === 'email' && value && String(value).trim()) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(String(value).trim())) {
			validationErrors.value[key] = 'Inserisci un indirizzo email valido';
			return false;
		}
	}
	delete validationErrors.value[key];
	return true;
};

const validateForm = () => {
	validationErrors.value = {};
	showValidation.value = true;
	let isValid = true;

	// Campi obbligatori partenza
	const originFields = [
		['full_name', originAddress.value.full_name, 'Nome e Cognome'],
		['address', originAddress.value.address, 'Indirizzo'],
		['address_number', originAddress.value.address_number, 'Numero civico'],
		['city', originAddress.value.city, 'Città'],
		['province', originAddress.value.province, 'Provincia'],
		['postal_code', originAddress.value.postal_code, 'CAP'],
		['telephone_number', originAddress.value.telephone_number, 'Telefono'],
	];

	for (const [field, value, label] of originFields) {
		if (!validateField('origin', field, value, label)) isValid = false;
	}

	// Email partenza (opzionale ma se presente deve essere valida)
	if (originAddress.value.email) {
		validateField('origin', 'email', originAddress.value.email, 'Email');
	}

	// Campi obbligatori destinazione
	const destFields = [
		['full_name', destinationAddress.value.full_name, 'Nome e Cognome'],
		['address', destinationAddress.value.address, 'Indirizzo'],
		['address_number', destinationAddress.value.address_number, 'Numero civico'],
		['city', destinationAddress.value.city, 'Città'],
		['province', destinationAddress.value.province, 'Provincia'],
		['postal_code', destinationAddress.value.postal_code, 'CAP'],
		['telephone_number', destinationAddress.value.telephone_number, 'Telefono'],
	];

	for (const [field, value, label] of destFields) {
		if (!validateField('dest', field, value, label)) isValid = false;
	}

	// Email destinazione (opzionale ma se presente deve essere valida)
	if (destinationAddress.value.email) {
		validateField('dest', 'email', destinationAddress.value.email, 'Email');
	}

	return isValid;
};

const getFieldError = (section, field) => {
	if (!showValidation.value) return null;
	return validationErrors.value[`${section}_${field}`] || null;
};

const fieldClass = (section, field) => {
	const hasError = getFieldError(section, field);
	return hasError ? 'input-preventivo-step-2 !border-red-400 !bg-red-50/30' : 'input-preventivo-step-2';
};

const days = ["Lun", "Mar", "Mer", "Gio", "Ven"];

const formRef = ref(null);
const showSummary = ref(false);
const showAddressFields = ref(false);
const showSavedPopup = ref(false);
const editingSidebarColli = ref(false);
const dateError = ref(null);

const editablePackages = computed(() => session.value?.data?.packages || []);

/* Watch route query for backward navigation (Ritiro -> Servizi) */
watch(() => route.query.step, (newStep, oldStep) => {
	if (oldStep === 'ritiro' && !newStep) {
		showAddressFields.value = false;
	} else if (newStep === 'ritiro') {
		showAddressFields.value = true;
	}
});

const openAddressFields = () => {
	if (!services.value.date) {
		dateError.value = 'Seleziona un giorno di ritiro prima di procedere.';
		return;
	}
	dateError.value = null;
	showAddressFields.value = true;
};

const goBackToServices = () => {
	showAddressFields.value = false;
};

const pendingPayload = ref(null);

const goToCart = async () => {
	if (!pendingPayload.value) return;
	isSubmitting.value = true;
	submitError.value = null;
	try {
		await sanctumClient(isAuthenticated.value ? "/api/empty-cart" : "/api/empty-guest-cart", {
			method: "DELETE",
		});
		const result = await sanctumClient(endpoint.value, {
			method: "POST",
			body: pendingPayload.value,
		});
		console.log('Cart saved successfully:', result);
		showSavedPopup.value = false;
		// Clear stale cart cache so carrello.vue fetches fresh data
		clearNuxtData("cart");
		await refreshCart();
		navigateTo('/carrello');
	} catch (error) {
		console.error('Cart save error:', error);
		const errorData = error?.response?._data || error?.data;
		const errorMsg = errorData?.message || errorData?.errors
			? JSON.stringify(errorData.errors || errorData.message)
			: "Errore durante il salvataggio nel carrello. Riprova.";
		submitError.value = errorMsg;
		showSavedPopup.value = false;
	} finally {
		isSubmitting.value = false;
	}
};

const goToSavedShipments = async () => {
	if (!pendingPayload.value) return;
	isSubmitting.value = true;
	submitError.value = null;
	try {
		const result = await sanctumClient("/api/saved-shipments", {
			method: "POST",
			body: pendingPayload.value,
		});
		console.log('Saved shipment successfully:', result);
		showSavedPopup.value = false;
		navigateTo('/account/spedizioni-configurate');
	} catch (error) {
		console.error('Saved shipments error:', error);
		const errorData = error?.response?._data || error?.data;
		submitError.value = errorData?.message || "Errore durante il salvataggio. Riprova.";
		showSavedPopup.value = false;
	} finally {
		isSubmitting.value = false;
	}
};

const addAnotherShipment = async () => {
	if (!pendingPayload.value) return;
	isSubmitting.value = true;
	try {
		await sanctumClient("/api/saved-shipments", {
			method: "POST",
			body: pendingPayload.value,
		});
	} catch (e) {
		console.error('Add another error:', e);
	}
	isSubmitting.value = false;
	showSavedPopup.value = false;
	navigateTo('/preventivo');
};

const { endpoint, refresh: refreshCart } = useCart();
const { isAuthenticated } = useSanctumAuth();
const sanctumClient = useSanctumClient();

// Default data from saved configured shipments
const showDefaultDropdown = ref(false);
const savedConfigs = ref([]);
const loadingConfigs = ref(false);

const loadSavedConfigs = async () => {
	if (!isAuthenticated.value) return;
	if (savedConfigs.value.length > 0) {
		showDefaultDropdown.value = !showDefaultDropdown.value;
		return;
	}
	loadingConfigs.value = true;
	try {
		const result = await sanctumClient("/api/saved-shipments");
		savedConfigs.value = result?.data || [];
		showDefaultDropdown.value = true;
	} catch (e) {
		console.error("Errore caricamento configurazioni:", e);
	} finally {
		loadingConfigs.value = false;
	}
};

const applyConfig = (item) => {
	if (item.origin_address) {
		originAddress.value.full_name = item.origin_address.name || "";
		originAddress.value.address = item.origin_address.address || "";
		originAddress.value.address_number = item.origin_address.address_number || "";
		originAddress.value.city = item.origin_address.city || "";
		originAddress.value.postal_code = item.origin_address.postal_code || "";
		originAddress.value.province = item.origin_address.province || "";
		originAddress.value.telephone_number = item.origin_address.telephone_number || "";
		originAddress.value.email = item.origin_address.email || "";
		originAddress.value.additional_information = item.origin_address.additional_information || "";
		originAddress.value.intercom_code = item.origin_address.intercom_code || "";
	}
	if (item.destination_address) {
		destinationAddress.value.full_name = item.destination_address.name || "";
		destinationAddress.value.address = item.destination_address.address || "";
		destinationAddress.value.address_number = item.destination_address.address_number || "";
		destinationAddress.value.city = item.destination_address.city || "";
		destinationAddress.value.postal_code = item.destination_address.postal_code || "";
		destinationAddress.value.province = item.destination_address.province || "";
		destinationAddress.value.telephone_number = item.destination_address.telephone_number || "";
		destinationAddress.value.email = item.destination_address.email || "";
		destinationAddress.value.additional_information = item.destination_address.additional_information || "";
		destinationAddress.value.intercom_code = item.destination_address.intercom_code || "";
	}
	showDefaultDropdown.value = false;
};
const router = useRouter();

const isSubmitting = ref(false);
const submitError = ref(null);

const toAddressPayload = (addressData) => ({
	type: addressData.type || "Partenza",
	name: (addressData.full_name || "N/D").trim(),
	additional_information: addressData.additional_information || "",
	address: (addressData.address || "N/D").trim(),
	number_type: "Numero Civico",
	address_number: (addressData.address_number || "SNC").trim(),
	intercom_code: addressData.intercom_code || "",
	country: addressData.country || "Italia",
	city: (addressData.city || "N/D").trim(),
	postal_code: String(addressData.postal_code || "00000").replace(/[^0-9]/g, "") || "00000",
	province: (addressData.province || "N/D").trim(),
	telephone_number: String(addressData.telephone_number || "0000000000").trim(),
	email: addressData.email || "",
});

const continueToCart = async () => {
	submitError.value = null;
	if (!formRef.value || !formRef.value.checkValidity()) {
		formRef.value?.reportValidity();
		return;
	}

	const packages = session.value?.data?.packages?.length
		? session.value.data.packages
		: userStore.packages || [];
	if (!packages.length) {
		submitError.value = "Nessun collo disponibile. Torna al preventivo rapido.";
		return;
	}

	const payload = {
		origin_address: toAddressPayload(originAddress.value),
		destination_address: toAddressPayload(destinationAddress.value),
		services: {
			service_type: userStore.servicesArray.join(", "),
			date: services.value.date || "",
			time: services.value.time || "",
		},
		packages,
	};

	// Store in userStore for riepilogo page and backward navigation
	userStore.pendingShipment = payload;
	userStore.originAddressData = { ...originAddress.value };
	userStore.destinationAddressData = { ...destinationAddress.value };
	userStore.pickupDate = services.value.date || "";

	navigateTo('/riepilogo');
};

</script>

<template>
	<section>
		<div class="my-container mt-[72px] mb-[120px]">
			<div v-if="status === 'pending'" class="min-h-[720px] bg-[#E4E4E4] rounded-[20px] animate-pulse"></div>
			<form v-else ref="formRef" @submit.prevent="continueToCart">
				<Steps :current-step="showAddressFields ? 2 : 1" />

				<!-- Popup servizi (sempre disponibile, anche dal riepilogo) -->
				<UModal
					:dismissible="true"
					v-model:open="open"
					:title="selectedService?.name"
					:description="selectedService?.description"
					aria-describedby="undefined"
					:close="false"
					:class="{
						'max-w-[900px]': selectedService?.index === 1,
						'max-w-[690px]': selectedService?.index === 2,
						'max-w-[860px]': selectedService?.index === 5,
						'max-w-[645px]': selectedService?.index === 6 || selectedService?.index === 4,
					}">
					<template #title>
						<div class="flex justify-between">
							<h3 class="text-[#252B42] font-bold text-[1.8125rem] tracking-[0.1px]">
								{{ selectedService?.name }}
							</h3>

							<UButton label="" class="active:bg-transparent bg-transparent cursor-pointer hover:bg-transparent w-[47px] h-[37px] bg-[url(/img/quote/second-step/close.png)]" @click="myClose" />
						</div>
					</template>

					<!-- <template #description>
						<p class="text-[#252B42] mt-[20px] text-[0.9375rem] leading-[24px] tracking-[0.1px] text-center">{{ myService?.popupDescription }}</p>
					</template> -->

					<!-- <template #title>
						<span class="sr-only">{{ myService?.name }}</span>
					</template>

					<template #description>
						<span class="sr-only">{{ myService?.popupDescription }}</span>
					</template> -->
					<!-- <template #header>
						<div class="flex items-start justify-between">
							<h3 class="text-[#252B42] font-bold text-[1.8125rem] tracking-[0.1px] bg-[url(/img/quote/second-step/insurance-icon.png)] bg-left bg-no-repeat pl-[60px]">
								{{ myService?.name }}
							</h3>

							<UButton label="" class="active:bg-transparent bg-transparent cursor-pointer hover:bg-transparent w-[47px] h-[37px] bg-[url(/img/quote/second-step/close.png)]" @click="myClose" />
						</div>

						<p class="text-[#252B42] mt-[21px] text-[0.9375rem] leading-[24px] tracking-[0.1px] text-center w-full">
							{{ myService?.popupDescription }}
						</p>
					</template> -->
					<template #body>
						<p v-if="selectedService?.description" class="text-[#252B42] text-[0.9375rem] leading-[24px] tracking-[0.1px] text-center mb-[20px]">{{ selectedService.description }}</p>

						<!-- Contrassegno -->
						<div v-if="selectedService?.index === 1" class="space-y-[20px]">
							<div>
								<label for="contrassegno_importo" class="label-popup">Importo</label>
								<input type="text" id="contrassegno_importo" class="input-popup bg-white" placeholder="0.00€" />
							</div>
							<div>
								<label for="contrassegno_incasso" class="label-popup">Modalità di incasso</label>
								<select id="contrassegno_incasso" class="input-popup bg-white">
									<option value="">Seleziona modalità</option>
									<option value="contanti">Contanti</option>
									<option value="assegno">Assegno bancario</option>
									<option value="assegno_circolare">Assegno circolare</option>
								</select>
							</div>
							<div>
								<label for="contrassegno_rimborso" class="label-popup">Modalità di rimborso</label>
								<select id="contrassegno_rimborso" class="input-popup bg-white">
									<option value="">Seleziona modalità</option>
									<option value="bonifico">Bonifico bancario</option>
									<option value="assegno">Assegno</option>
								</select>
							</div>
							<div>
								<label for="contrassegno_dettaglio" class="label-popup">Dettaglio modalità rimborso</label>
								<input type="text" id="contrassegno_dettaglio" class="input-popup bg-white" placeholder="IBAN o dettagli rimborso" />
							</div>
						</div>

						<!-- Assicurazione -->
						<div v-if="selectedService?.index === 2">
							<ul>
								<li v-for="(pack, indexPopup) in session?.data?.packages" :key="indexPopup" class="mt-[20px] first:mt-0">
									<label :for="'pack_value_'+indexPopup" class="label-popup">
										Valore collo #{{ indexPopup + 1 }} - {{ pack.weight }} Kg - ({{ pack.first_size }} x {{ pack.second_size }} x {{ pack.third_size }} ) cm
									</label>
									<input type="text" :id="'pack_value_'+indexPopup" class="input-popup bg-white" placeholder="0.00" />
								</li>
							</ul>
						</div>

						<div v-if="selectedService?.index === 4" class="">
							<label for="pallet" class="label-popup">Pallet</label>
							<input type="text" name="" id="pallet" class="input-popup bg-white" />
						</div>

						<div v-if="selectedService?.index === 5" class="flex items-start justify-between pb-[20px]">
							<div v-for="(day, dayIndex) in days" :key="dayIndex" class="w-[94px]">
								<label :for="'day_'+dayIndex" class="block text-black text-[1.25rem] tracking-[-0.48px] font-medium text-center">{{ day }}</label>
								<select :id="'day_'+dayIndex" class="border-[0.2px] border-[#ABABAB] rounded-[30px] h-[36px] leading-[36px] pl-[18px] w-full mt-[10px] text-[0.875rem] font-medium text-[#767676] bg-white">
									<option value="">No</option>
									<option value="">Si</option>
								</select>
							</div>
						</div>

						<div v-if="selectedService?.index === 6" class="">
							<label for="telephone_number_popup" class="label-popup">Telefono</label>
							<input type="tel" id="telephone_number_popup" class="input-popup bg-white" />
						</div>
					</template>

					<template #footer>
						<div class="mx-auto mt-[27px]">
							<UButton
								label="Annulla"
								class="active:bg-[#996D47] bg-[#996D47] text-white cursor-pointer font-normal text-[1.125rem] rounded-[15px] hover:bg-[#996D47] h-[39px] leading-[39px] px-[25px] justify-center"
								@click="myClose" />

							<button type="button" class="bg-[#203A72] text-white px-[25px] cursor-pointer ml-[125px] font-normal text-[1.125rem] rounded-[15px] h-[39px] leading-[39px]" @click="addService()">
								Aggiungi
							</button>
						</div>
					</template>
				</UModal>

				<!-- STEP FORM: Servizi + Indirizzi -->
				<div v-if="!showSummary">

				<ClientOnly>
					<div class="bg-[#E6E6E6] rounded-[20px] pt-[13px]">
						<h2 class="ml-[78px] text-[1.8125rem] text-[#252B42] font-bold font-montserrat tracking-[0.1px]">Imposta giorno di ritiro</h2>

						<div class="py-[38px]">
							<div class="relative px-[35px]">
								<Swiper
									class="my-swiper h-[108px]"
									:modules="[Navigation]"
									:slides-per-view="7"
									space-between="30"
									:navigation="{
										nextEl: '.custom-next',
										prevEl: '.custom-prev',
									}">
									<SwiperSlide v-for="(day, index) in daysInMonth" :key="index">
										<label
											:key="day.date.toISOString()"
											class="size-full block rounded-[10px] cursor-pointer select-none border-[1px] border-t-0"
											:class="{
												'border-[#2B2D52]': services.date == day.date.toLocaleDateString(),
												'border-[#C0C0C0]': services.date != day.date.toLocaleDateString(),
											}">
											<span
												class="w-full text-center block font-medium h-[35px] leading-[35px] rounded-[10px_10px_0_0] border-t-0"
												:class="{
													'bg-[#2B2D52] text-white': services.date == day.date.toLocaleDateString(),
													'bg-[#C0C0C0] text-black': services.date != day.date.toLocaleDateString(),
												}">
												{{ day.weekday }}
											</span>
											<div class="flex flex-col justify-center items-center text-[#767676] leading-[30px] mt-[10px]">
												<span class="font-bold text-[2.5rem]">{{ day.dayNumber }}</span>

												<span class="">{{ day.monthAbbr }}</span>
											</div>

											<input
												type="checkbox"
												v-if="day.weekday !== 'Sab' && day.weekday !== 'Dom'"
												@input="chooseDate(day)"
												class="opacity-0 pointer-events-none absolute bottom-0"
												:id="`date-${day.dayNumber}-${day.monthAbbr}`"
												:checked="services.date == day.date.toLocaleDateString()"
												 />
										</label>
									</SwiperSlide>
								</Swiper>

								<button class="custom-prev absolute bottom-[35px] left-[10px] cursor-pointer"><NuxtImg src="/img/quote/second-step/arrow-left.png" alt="" width="11" height="19" /></button>
								<button class="custom-next absolute bottom-[35px] right-[10px] cursor-pointer"><NuxtImg src="/img/quote/second-step/arrow-right.png" alt="" width="11" height="19" /></button>
							</div>
						</div>
					</div>
				</ClientOnly>

				<div class="flex items-start font-montserrat mt-[60px] justify-center gap-x-[40px]">
					<div class="flex-1 max-w-[850px]">
						<!-- #f0ffff  group hover:bg-[#727272]-->
						<div class="w-full">
							<div class="flex items-start justify-between flex-wrap gap-[96px_50px]">
								<label
									v-for="(service, serviceIndex) in servicesList"
									:key="serviceIndex"
									class="flex flex-col items-center justify-center min-h-[250px] w-[calc(100%/3-34px)] text-center cursor-pointer rounded-[20px]"
									:class="{ 'bg-[rgba(89,89,89,.8)]': service.isSelected, 'bg-[#E6E6E6]': !service.isSelected }">
									<h3
										class="text-[1.125rem] font-bold text-[#252B42] service-list before:content-[''] before:block before:mx-auto before:mb-[20px] leading-[24px] tracking-[0.1px]"
										:class="{ 'text-[#F0F3FF] before:brightness-0 before:invert-100': service.isSelected }"
										:style="{ '--before-service-bg': `url(/img/quote/second-step/${service.img})`, '--before-service-width': `${service.width}px`, '--before-service-height': `${service.height}px` }">
										{{ service.name }}
									</h3>
									<p class="text-[#737373] mt-[20px] text-[0.875rem] leading-[20px] px-[20px] tracking-[0.2px]" :class="{ 'text-white': service.isSelected, 'text-[#737373]': !service.isSelected }">
										{{ service.description }}
									</p>
									<input
										type="checkbox"
										@click="chooseService(service, serviceIndex)"
										class="opacity-0 pointer-events-none absolute"
										:id="service.name"
										:checked="service.isSelected"
										 />
								</label>
							</div>

							<!-- Date error (shown when no date selected) -->
							<p v-if="!showAddressFields && dateError" class="text-red-500 text-[0.9375rem] mt-[16px] font-medium text-right">{{ dateError }}</p>

							<!-- PARTENZA -->
							<template v-if="showAddressFields">
							<div class="bg-[#E4E4E4] rounded-[20px] text-[#252B42] mt-[20px] pl-[40px] pr-[40px] pt-[35px] pb-[43px]">
								<div class="flex items-center justify-between mb-[39px] flex-wrap gap-[10px]">
									<h2 class="font-bold text-[1.125rem] tracking-[0.1px]">
										Partenza
									</h2>
									<div v-if="isAuthenticated" class="flex items-center gap-[10px]">
										<!-- Immetti dati default -->
										<div class="relative">
											<button type="button" @click="loadSavedConfigs" :disabled="loadingConfigs" class="inline-flex items-center gap-[6px] px-[14px] py-[8px] bg-[#996D47] text-white rounded-[8px] text-[0.8125rem] font-semibold hover:bg-[#7d5939] transition cursor-pointer disabled:opacity-60">
												<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
												{{ loadingConfigs ? '...' : 'Dati default' }}
											</button>
											<div v-if="showDefaultDropdown && savedConfigs.length > 0" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl max-h-[300px] overflow-y-auto w-[400px]">
												<div class="p-[12px] border-b border-[#F0F0F0] text-[0.8125rem] font-bold text-[#252B42]">Seleziona una spedizione configurata</div>
												<div v-for="item in savedConfigs" :key="item.id" @click="applyConfig(item)" class="px-[14px] py-[12px] cursor-pointer hover:bg-[#f0fafb] border-b border-[#F0F0F0] last:border-0 transition-colors">
													<div class="flex items-center gap-[8px]">
														<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#996D47" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
														<span class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.origin_address?.city || 'Partenza' }}</span>
														<span class="text-[#737373]">&rarr;</span>
														<span class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.destination_address?.city || 'Destinazione' }}</span>
													</div>
													<p class="text-[0.75rem] text-[#737373] mt-[2px]">{{ item.origin_address?.name || '' }} - {{ item.destination_address?.name || '' }}</p>
												</div>
											</div>
											<div v-if="showDefaultDropdown && savedConfigs.length === 0 && !loadingConfigs" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl p-[20px] w-[300px]">
												<p class="text-[0.875rem] text-[#737373]">Nessuna spedizione configurata salvata.</p>
												<NuxtLink to="/account/spedizioni-configurate" class="text-[0.8125rem] text-[#095866] hover:underline font-semibold mt-[8px] inline-block">Vai a spedizioni configurate</NuxtLink>
											</div>
										</div>
										<!-- Indirizzi salvati -->
										<div class="relative">
											<button type="button" @click="toggleAddressSelector('origin')" class="inline-flex items-center gap-[6px] px-[14px] py-[8px] bg-[#095866] text-white rounded-[8px] text-[0.8125rem] font-semibold hover:bg-[#0a7a8c] transition cursor-pointer">
												<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
												Indirizzi salvati
											</button>
											<div v-if="showOriginAddressSelector" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl max-h-[250px] overflow-y-auto w-[320px]">
												<div v-if="loadingSavedAddresses" class="p-[16px] text-center text-[0.8125rem] text-[#737373]">Caricamento...</div>
												<template v-else-if="savedAddresses.length > 0">
													<div v-for="addr in savedAddresses" :key="addr.id" @click="applySavedAddress(addr, 'origin')" class="px-[14px] py-[10px] cursor-pointer hover:bg-[#f0fafb] border-b border-[#F0F0F0] last:border-0 transition-colors">
														<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ addr.name }}</p>
														<p class="text-[0.75rem] text-[#737373]">{{ addr.address }} {{ addr.address_number }}, {{ addr.postal_code }} {{ addr.city }}</p>
													</div>
												</template>
												<div v-else class="p-[16px]">
													<p class="text-[0.8125rem] text-[#737373]">Nessun indirizzo salvato.</p>
													<NuxtLink to="/account/indirizzi" class="text-[0.8125rem] text-[#095866] hover:underline font-semibold mt-[4px] inline-block">Aggiungi indirizzo</NuxtLink>
												</div>
											</div>
										</div>
									</div>
								</div>

								<div class="flex items-start gap-x-[30px]">
									<div class="desktop:w-[324px]">
										<label for="name" class="block text-[0.875rem] sr-only">Nome e Cognome*</label>
										<input type="text" placeholder="Nome e Cognome*" v-model="originAddress.full_name" id="name" class="input-preventivo-step-2" />
									</div>

									<div class="desktop:w-[324px]">
										<label for="origin_additional_info" class="block text-[0.875rem] sr-only">Informazioni aggiuntive</label>
										<input type="text" placeholder="Informazioni aggiuntive" v-model="originAddress.additional_information" id="origin_additional_info" class="input-preventivo-step-2" />
									</div>
								</div>

								<div class="mt-[39px] flex items-start gap-x-[25px]">
									<div class="desktop:w-[285px]">
										<label for="address" class="block text-[0.875rem] sr-only">Indirizzo*</label>
										<input type="text" placeholder="Indirizzo*" v-model="originAddress.address" id="address" class="input-preventivo-step-2" />
									</div>

									<div class="desktop:w-[213px]">
										<label for="address_number" class="block text-[0.875rem] sr-only">Numero civico*</label>
										<input type="text" placeholder="Numero civico*" v-model="originAddress.address_number" id="address_number" class="input-preventivo-step-2" />
									</div>

									<div class="desktop:w-[213px]">
										<label for="origin_intercom" class="block text-[0.875rem] sr-only">Citofono</label>
										<input type="text" placeholder="Citofono" v-model="originAddress.intercom_code" id="origin_intercom" class="input-preventivo-step-2" />
									</div>
								</div>

								<div class="mt-[39px] flex items-start gap-x-[25px]">
									<div class="desktop:w-[174px]">
										<label for="origin_country" class="block text-[0.875rem] sr-only">Paese*</label>
										<input type="text" placeholder="Paese*" value="Italia" id="origin_country" class="input-preventivo-step-2" disabled />
									</div>

									<div class="desktop:w-[171px]">
										<label for="city" class="block text-[0.875rem] sr-only">Città*</label>
										<input type="text" placeholder="Città*" v-model="originAddress.city" id="city" class="input-preventivo-step-2" />
									</div>

									<div class="desktop:w-[170px]">
										<label for="province" class="block text-[0.875rem] sr-only">Provincia*</label>
										<input type="text" placeholder="Provincia*" v-model="originAddress.province" id="province" class="input-preventivo-step-2" />
									</div>

									<div class="desktop:w-[174px]">
										<label for="postal_code" class="block text-[0.875rem] sr-only">CAP*</label>
										<input type="text" placeholder="CAP*" v-model="originAddress.postal_code" id="postal_code" class="input-preventivo-step-2" />
									</div>
								</div>

								<div class="mt-[39px] flex items-start gap-x-[30px]">
									<div class="desktop:w-[324px]">
										<label for="telephone_number" class="block text-[0.875rem] sr-only">Telefono*</label>
										<input type="tel" placeholder="Telefono*" v-model="originAddress.telephone_number" id="telephone_number" class="input-preventivo-step-2" />
									</div>

									<div class="desktop:w-[324px]">
										<label for="origin_email" class="block text-[0.875rem] sr-only">Email</label>
										<input type="email" placeholder="Email" v-model="originAddress.email" id="origin_email" :class="fieldClass('origin', 'email')" />
										<p v-if="getFieldError('origin', 'email')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('origin', 'email') }}</p>
									</div>
								</div>
							</div>

							<!-- DESTINAZIONE -->
							<div class="bg-[#E4E4E4] rounded-[20px] text-[#252B42] mt-[20px] pl-[40px] pr-[40px] pt-[35px] pb-[43px]">
								<div class="flex items-center justify-between mb-[39px]">
									<h2 class="font-bold text-[1.125rem] tracking-[0.1px]">
										Destinazione
									</h2>
									<div v-if="isAuthenticated" class="relative">
										<button type="button" @click="toggleAddressSelector('dest')" class="inline-flex items-center gap-[6px] px-[14px] py-[8px] bg-[#095866] text-white rounded-[8px] text-[0.8125rem] font-semibold hover:bg-[#0a7a8c] transition cursor-pointer">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
											Indirizzi salvati
										</button>
										<div v-if="showDestAddressSelector" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl max-h-[250px] overflow-y-auto w-[320px]">
											<div v-if="loadingSavedAddresses" class="p-[16px] text-center text-[0.8125rem] text-[#737373]">Caricamento...</div>
											<template v-else-if="savedAddresses.length > 0">
												<div v-for="addr in savedAddresses" :key="addr.id" @click="applySavedAddress(addr, 'dest')" class="px-[14px] py-[10px] cursor-pointer hover:bg-[#f0fafb] border-b border-[#F0F0F0] last:border-0 transition-colors">
													<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ addr.name }}</p>
													<p class="text-[0.75rem] text-[#737373]">{{ addr.address }} {{ addr.address_number }}, {{ addr.postal_code }} {{ addr.city }}</p>
												</div>
											</template>
											<div v-else class="p-[16px]">
												<p class="text-[0.8125rem] text-[#737373]">Nessun indirizzo salvato.</p>
												<NuxtLink to="/account/indirizzi" class="text-[0.8125rem] text-[#095866] hover:underline font-semibold mt-[4px] inline-block">Aggiungi indirizzo</NuxtLink>
											</div>
										</div>
									</div>
								</div>

								<div class="flex items-start gap-x-[30px]">
									<div class="desktop:w-[324px]">
										<label for="dest_name" class="block text-[0.875rem] sr-only">Nome e Cognome*</label>
										<input type="text" placeholder="Nome e Cognome*" v-model="destinationAddress.full_name" id="dest_name" :class="fieldClass('dest', 'full_name')" required />
										<p v-if="getFieldError('dest', 'full_name')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('dest', 'full_name') }}</p>
									</div>

									<div class="desktop:w-[324px]">
										<label for="dest_additional_info" class="block text-[0.875rem] sr-only">Informazioni aggiuntive</label>
										<input type="text" placeholder="Informazioni aggiuntive" v-model="destinationAddress.additional_information" id="dest_additional_info" class="input-preventivo-step-2" />
									</div>
								</div>

								<div class="mt-[39px] flex items-start gap-x-[25px]">
									<div class="desktop:w-[285px]">
										<label for="address" class="block text-[0.875rem] sr-only">Indirizzo*</label>
										<input type="text" placeholder="Indirizzo*" v-model="destinationAddress.address" id="address" class="input-preventivo-step-2" />
									</div>

									<div class="desktop:w-[213px]">
										<label for="address_number" class="block text-[0.875rem] sr-only">Numero civico*</label>
										<input type="text" placeholder="Numero civico*" v-model="destinationAddress.address_number" id="address_number" class="input-preventivo-step-2" />
									</div>

									<div class="desktop:w-[213px]">
										<label for="dest_intercom" class="block text-[0.875rem] sr-only">Citofono</label>
										<input type="text" placeholder="Citofono" v-model="destinationAddress.intercom_code" id="dest_intercom" class="input-preventivo-step-2" />
									</div>
								</div>

								<div class="mt-[39px] flex items-start gap-x-[25px]">
									<div class="desktop:w-[174px]">
										<label for="dest_country" class="block text-[0.875rem] sr-only">Paese*</label>
										<input type="text" placeholder="Paese*" value="Italia" id="dest_country" class="input-preventivo-step-2" disabled />
									</div>

									<div class="desktop:w-[171px]">
										<label for="city" class="block text-[0.875rem] sr-only">Città*</label>
										<input type="text" placeholder="Città*" v-model="destinationAddress.city" id="city" class="input-preventivo-step-2" />
									</div>

									<div class="desktop:w-[170px]">
										<label for="province" class="block text-[0.875rem] sr-only">Provincia*</label>
										<input type="text" placeholder="Provincia*" v-model="destinationAddress.province" id="province" class="input-preventivo-step-2" />
									</div>

									<div class="desktop:w-[174px]">
										<label for="postal_code" class="block text-[0.875rem] sr-only">CAP*</label>
										<input type="text" placeholder="CAP*" v-model="destinationAddress.postal_code" id="postal_code" class="input-preventivo-step-2" />
									</div>
								</div>

								<div class="mt-[39px] flex items-start gap-x-[30px]">
									<div class="desktop:w-[324px]">
										<label for="telephone_number" class="block text-[0.875rem] sr-only">Telefono*</label>
										<input type="tel" placeholder="Telefono*" v-model="destinationAddress.telephone_number" id="telephone_number" class="input-preventivo-step-2" />
									</div>

									<div class="desktop:w-[324px]">
										<label for="dest_email" class="block text-[0.875rem] sr-only">Email</label>
										<input type="email" placeholder="Email" v-model="destinationAddress.email" id="dest_email" :class="fieldClass('dest', 'email')" />
										<p v-if="getFieldError('dest', 'email')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('dest', 'email') }}</p>
									</div>
								</div>
							</div>

						</template>
						</div>

						<div class="mt-[28px] flex flex-wrap gap-[12px] items-center justify-between">
							<template v-if="showAddressFields">
								<button
									type="button"
									@click="goBackToServices"
									class="inline-flex items-center justify-center h-[52px] px-[24px] rounded-[30px] bg-[#095866] text-white font-semibold hover:bg-[#0a7a8c] transition cursor-pointer">
									Indietro
								</button>
								<button
									type="submit"
									:disabled="isSubmitting"
									class="bg-[#E44203] text-white font-semibold text-[1rem] px-[28px] h-[52px] rounded-[30px] hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed">
									{{ isSubmitting ? 'Salvataggio in corso...' : 'Continua al riepilogo' }}
								</button>
							</template>
							<template v-else>
								<NuxtLink :to="{ path: '/', hash: '#preventivo' }" class="inline-flex items-center justify-center h-[52px] px-[24px] rounded-[30px] bg-[#095866] text-white font-semibold hover:bg-[#0a7a8c] transition">
									Indietro
								</NuxtLink>
								<button
									type="button"
									@click="openAddressFields"
									class="bg-[#E44203] text-white font-semibold text-[1rem] px-[32px] h-[52px] rounded-[30px] hover:opacity-90 transition cursor-pointer">
									Compila dati ritiro e destinazione
								</button>
							</template>
						</div>
						<div v-if="submitError" class="mt-[16px] p-[14px] bg-red-50 border border-red-200 rounded-[12px] flex items-center gap-[10px]">
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-red-500 shrink-0"><path fill="currentColor" d="M13 13h-2V7h2m0 10h-2v-2h2M12 2a10 10 0 0 1 10 10a10 10 0 0 1-10 10A10 10 0 0 1 2 12A10 10 0 0 1 12 2"/></svg>
							<p class="text-red-600 text-[0.9375rem] font-medium">{{ submitError }}</p>
						</div>
					</div>

					<div class="border-l-[0.5px] border-[rgba(0,0,0,0.1)] min-h-[600px] mt-[30px] pl-[30px] pt-[50px] shrink-0">
						<div class="w-[250px] flex flex-col gap-y-[30px]">
							<div class="bg-[#E4E4E4] rounded-[20px] p-[35px_21px] text-[#252B42] font-bold text-[0.6875rem] tracking-[0.1px]">
								<h4 class="text-center font-bold mb-[12px]">Indirizzi</h4>
								<div>
									<div class="before:content-[''] before:inline-block before:bg-[url(/img/quote/second-step/origin.png)] before:w-[16px] before:h-[14px] before:mr-[10px] flex items-center">
										<div v-if="!isOriginDetailsEdited">{{ session?.data?.shipment_details?.origin_city }} - {{ session?.data?.shipment_details?.origin_postal_code }} - Italia</div>

										<div v-else>
											<input type="text" v-model="temporaryShipmentDetails.origin_city" id="" class="bg-white font-montserrat w-[45px]" />
											-
											<input type="text" v-model="temporaryShipmentDetails.origin_postal_code" id="" class="bg-white font-montserrat w-[45px]" />
											-
											<input type="text" value="Italia" id="" class="bg-white font-montserrat w-[45px]" />
										</div>

										<button type="button" @click="editOriginDetails" title="Modifica" class="ml-auto">
											<NuxtImg src="/img/quote/second-step/edit.png" alt="Modifica" width="13" height="13" />
										</button>
									</div>

									<div
										class="mt-[12px] before:content-[''] before:inline-block before:bg-[url(/img/quote/second-step/destination.png)] before:w-[16px] before:h-[14px] before:mr-[10px] flex items-center">
										<div v-if="!isDestinationDetailsEdited">{{ session?.data?.shipment_details?.destination_city }} - {{ session?.data?.shipment_details?.destination_postal_code }} - Italia</div>

										<div v-else>
											<input type="text" v-model="temporaryShipmentDetails.destination_city" id="" class="bg-white font-montserrat w-[45px]" />
											-
											<input type="text" v-model="temporaryShipmentDetails.destination_postal_code" id="" class="bg-white font-montserrat w-[45px]" />
											-
											<input type="text" value="Italia" id="" class="bg-white font-montserrat w-[45px]" />
										</div>

										<button type="button" @click="editDestinationDetails" title="Modifica" class="ml-auto">
											<NuxtImg src="/img/quote/second-step/edit.png" alt="Modifica" width="13" height="13" />
										</button>
									</div>
								</div>
							</div>

							<div class="bg-[#E4E4E4] rounded-[20px] p-[35px_21px] text-[#252B42] text-[0.6875rem] tracking-[0.1px]">
								<div class="flex items-center justify-between mb-[12px]">
									<h4 class="text-center font-bold flex-1">Colli</h4>
									<button type="button" @click="editingSidebarColli = !editingSidebarColli" class="ml-auto">
										<NuxtImg src="/img/quote/second-step/edit.png" alt="Modifica" width="13" height="13" />
									</button>
								</div>

								<!-- Vista lettura -->
								<ul v-if="!editingSidebarColli" class="font-semibold">
									<li v-for="(pack, packIndex) in editablePackages" :key="packIndex" class="mt-[10px] first:mt-0">
										<p>{{ pack.quantity }} x - {{ pack.weight }} kg</p>
										<p>({{ pack.first_size }} x {{ pack.second_size }} x {{ pack.third_size }}) cm</p>
									</li>
								</ul>

								<!-- Vista modifica -->
								<div v-else class="space-y-[10px]">
									<div v-for="(pack, pi) in editablePackages" :key="pi" class="bg-white rounded-[10px] p-[10px]">
										<p class="font-bold mb-[6px]">Collo #{{ pi + 1 }}</p>
										<div class="grid grid-cols-2 gap-[6px]">
											<div>
												<label class="text-[0.6rem] text-[#737373]">Qtà</label>
												<input type="number" v-model="pack.quantity" min="1" class="w-full bg-[#F1F1F1] rounded-[6px] h-[26px] text-center text-[0.75rem] px-[4px]" />
											</div>
											<div>
												<label class="text-[0.6rem] text-[#737373]">Peso kg</label>
												<input type="number" v-model="pack.weight" min="0.1" step="0.1" class="w-full bg-[#F1F1F1] rounded-[6px] h-[26px] text-center text-[0.75rem] px-[4px]" />
											</div>
											<div>
												<label class="text-[0.6rem] text-[#737373]">L cm</label>
												<input type="number" v-model="pack.first_size" min="1" class="w-full bg-[#F1F1F1] rounded-[6px] h-[26px] text-center text-[0.75rem] px-[4px]" />
											</div>
											<div>
												<label class="text-[0.6rem] text-[#737373]">P cm</label>
												<input type="number" v-model="pack.second_size" min="1" class="w-full bg-[#F1F1F1] rounded-[6px] h-[26px] text-center text-[0.75rem] px-[4px]" />
											</div>
											<div class="col-span-2">
												<label class="text-[0.6rem] text-[#737373]">H cm</label>
												<input type="number" v-model="pack.third_size" min="1" class="w-full bg-[#F1F1F1] rounded-[6px] h-[26px] text-center text-[0.75rem] px-[4px]" />
											</div>
										</div>
									</div>
									<button type="button" @click="editingSidebarColli = false" class="w-full bg-[#095866] text-white text-[0.6875rem] font-semibold h-[28px] rounded-[8px] hover:bg-[#0a7a8c] transition cursor-pointer">Salva</button>
								</div>
							</div>

							<div class="bg-[#E4E4E4] rounded-[20px] p-[35px_21px] text-[#252B42] text-[0.6875rem] tracking-[0.1px]">
								<h4 class="text-center font-bold mb-[12px]">Servizi</h4>

								<div>
									<ul class="font-semibold" v-if="userStore.servicesArray.length > 0">
										<li v-for="(service, sIdx) in userStore.servicesArray" :key="service" class="mt-[5px] first:mt-0 flex items-center justify-between">
											<span>{{ service }}</span>
											<button type="button" @click="removeServiceFromSidebar(sIdx)" class="text-red-400 hover:text-red-600 ml-[8px] cursor-pointer text-[0.75rem] font-bold" title="Rimuovi">X</button>
										</li>
									</ul>
									<p class="text-center" v-else>Non hai ancora scelto un servizio</p>
								</div>
							</div>

							<div class="bg-[#E4E4E4] rounded-[20px] p-[35px_21px] text-[#252B42] text-[0.6875rem] tracking-[0.1px] font-semibold">
								<h4 class="text-center font-bold mb-[12px]">Importo</h4>

								<p>IVA Inclusa</p>

								<p class="text-[2rem]">{{ session?.data?.total_price }}€</p>
							</div>
						</div>
					</div>
				</div>


				</div>
			</form>
		</div>

		<!-- Popup rimosso - la logica è ora nella pagina /riepilogo -->
	</section>
</template>

<style scoped>
.swiper-slide {
	background: #f1f1f1;
	border-radius: 10px;
}

.input-preventivo-step-2 {
	font-family: "Montserrat", sans-serif;
	background: #ffffff !important;
	box-shadow: 0 1px 0 rgba(0,0,0,0.03) inset;
	border: 1px solid #d9dde3;
	border-radius: 8px;
	padding: 12px 10px;
	color: #252b42;
}

.title-popup::after {
	background-image: var(--before-bg);
	width: 26px;
	height: 28px;
}
</style>
