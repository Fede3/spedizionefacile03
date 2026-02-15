<!--
  FILE: pages/la-tua-spedizione/[step].vue
  SCOPO: Configurazione multi-step — Step 1: servizi/data ritiro; Step 2: indirizzi mittente/destinatario.
  API: GET /api/session (dati sessione), GET /api/user-addresses (rubrica),
       GET /api/locations/search (autocompletamento citta'), GET /api/saved-shipments (configurazioni).
  STORE: userStore.pendingShipment (salva dati per riepilogo).
  ROUTE: /la-tua-spedizione/1 e /la-tua-spedizione/2 (middleware shipment-validation).
-->
<script setup>
const userStore = useUserStore();

// Importa Swiper per il carosello delle date di ritiro
import { Swiper, SwiperSlide } from "swiper/vue";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";

// Protegge la pagina: deve esserci una sessione con i dati dei pacchi
definePageMeta({
	middleware: ["shipment-validation"],
});

// --- SERVIZI AGGIUNTIVI ---
// Stato dei servizi selezionati (tipo, data ritiro, orario)
const services = ref({
	service_type: "",
	date: "",
	time: "",
});

// Lista completa dei servizi disponibili con icona, nome, descrizione e flag per popup dettagli
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

// Apre il popup di dettaglio per un servizio e lo segna come selezionato
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

// Aggiunge o rimuove un servizio dalla lista dei servizi selezionati (toggle)
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

// Seleziona/deseleziona un giorno di ritiro dal carosello
const chooseDate = (day) => {
	const lastDay = day.date.toLocaleDateString();
	if (!services.value.date || services.value.date != lastDay) {
		services.value.date = day.date.toLocaleDateString();
	} else {
		services.value.date = "";
	}
};

// Genera la lista dei giorni lavorativi (Lun-Ven) del mese corrente e successivo
// per il carosello di selezione data ritiro
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

// --- INDIRIZZI ---
// Struttura base di un indirizzo (usata come template per partenza e destinazione)
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

// --- SELETTORE INDIRIZZI SALVATI ---
// Permette all'utente autenticato di scegliere un indirizzo dalla rubrica
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

// --- TRACCIAMENTO INDIRIZZI DA RUBRICA vs MANUALI ---
// Tiene traccia se l'indirizzo corrente proviene dalla rubrica salvata
const originFromSaved = ref(false);
const destFromSaved = ref(false);
const savingOriginAddress = ref(false);
const savingDestAddress = ref(false);
const originSaveSuccess = ref(false);
const destSaveSuccess = ref(false);
// Snapshot dell'indirizzo salvato per confronto (deep watch non basta da solo)
const originSavedSnapshot = ref(null);
const destSavedSnapshot = ref(null);

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
		originFromSaved.value = true;
		originSaveSuccess.value = false;
		originSavedSnapshot.value = JSON.stringify(addrRef.value);
	} else {
		showDestAddressSelector.value = false;
		destFromSaved.value = true;
		destSaveSuccess.value = false;
		destSavedSnapshot.value = JSON.stringify(addrRef.value);
	}
};

// Reset saved flag when user manually edits address fields (compare with snapshot)
watch(originAddress, (newVal) => {
	if (originFromSaved.value && originSavedSnapshot.value) {
		if (JSON.stringify(newVal) !== originSavedSnapshot.value) {
			originFromSaved.value = false;
			originSaveSuccess.value = false;
			originSavedSnapshot.value = null;
		}
	}
}, { deep: true });

watch(destinationAddress, (newVal) => {
	if (destFromSaved.value && destSavedSnapshot.value) {
		if (JSON.stringify(newVal) !== destSavedSnapshot.value) {
			destFromSaved.value = false;
			destSaveSuccess.value = false;
			destSavedSnapshot.value = null;
		}
	}
}, { deep: true });

// Computed: mostra icona salva solo se i campi minimi sono compilati e non proviene da rubrica
const canSaveOriginAddress = computed(() => {
	if (!isAuthenticated.value) return false;
	if (originFromSaved.value) return false;
	if (originSaveSuccess.value) return false;
	const a = originAddress.value;
	return !!(a.full_name?.trim() && a.address?.trim() && a.city?.trim() && a.postal_code?.trim());
});

const canSaveDestAddress = computed(() => {
	if (!isAuthenticated.value) return false;
	if (destFromSaved.value) return false;
	if (destSaveSuccess.value) return false;
	const a = destinationAddress.value;
	return !!(a.full_name?.trim() && a.address?.trim() && a.city?.trim() && a.postal_code?.trim());
});

// Salva indirizzo nella rubrica utente
const saveAddressToBook = async (target) => {
	const addr = target === 'origin' ? originAddress.value : destinationAddress.value;
	const savingRef = target === 'origin' ? savingOriginAddress : savingDestAddress;
	const successRef = target === 'origin' ? originSaveSuccess : destSaveSuccess;

	savingRef.value = true;
	try {
		await sanctumClient("/api/user-addresses", {
			method: "POST",
			body: {
				name: addr.full_name?.trim() || "",
				additional_information: addr.additional_information || "",
				address: addr.address?.trim() || "",
				number_type: "Numero Civico",
				address_number: addr.address_number?.trim() || "",
				intercom_code: addr.intercom_code || "",
				country: addr.country || "Italia",
				city: addr.city?.trim() || "",
				postal_code: String(addr.postal_code || "").replace(/[^0-9]/g, ""),
				province: addr.province?.trim() || "",
				telephone_number: addr.telephone_number?.trim() || "",
				email: addr.email || "",
			},
		});
		successRef.value = true;
		// Forza ricaricamento indirizzi salvati alla prossima apertura
		savedAddresses.value = [];
	} catch (e) {
		console.error("Errore salvataggio indirizzo:", e);
		const msg = e?.data?.message || "Errore nel salvataggio dell'indirizzo.";
		submitError.value = msg;
	} finally {
		savingRef.value = false;
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

/* Pre-fill address CAP/city from userStore quote data (Preventivo Rapido) */
watch(() => userStore.shipmentDetails, (sd) => {
	if (sd) {
		if (sd.origin_city && !originAddress.value.city) originAddress.value.city = sd.origin_city;
		if (sd.origin_postal_code && !originAddress.value.postal_code) originAddress.value.postal_code = sd.origin_postal_code;
		if (sd.destination_city && !destinationAddress.value.city) destinationAddress.value.city = sd.destination_city;
		if (sd.destination_postal_code && !destinationAddress.value.postal_code) destinationAddress.value.postal_code = sd.destination_postal_code;
	}
}, { immediate: true, deep: true });

// --- VALIDAZIONE CAMPI (Smart Validation) ---
const sv = useSmartValidation();
const showValidation = ref(false);

// Province autocomplete
const originProvinceSuggestions = ref([]);
const destProvinceSuggestions = ref([]);

const onProvinciaInput = (section, value) => {
	const filtered = sv.filterProvincia(value);
	if (section === 'origin') {
		originAddress.value.province = filtered;
		originProvinceSuggestions.value = sv.getProvinceSuggestions(filtered);
	} else {
		destinationAddress.value.province = filtered;
		destProvinceSuggestions.value = sv.getProvinceSuggestions(filtered);
	}
	sv.onInput(`${section}_province`, () => sv.validateProvincia(`${section}_province`, filtered));
};

const selectProvincia = (section, prov) => {
	if (section === 'origin') {
		originAddress.value.province = prov;
		originProvinceSuggestions.value = [];
	} else {
		destinationAddress.value.province = prov;
		destProvinceSuggestions.value = [];
	}
	sv.clearError(`${section}_province`);
};

// Auto-capitalize and filter for nome/cognome
const onNameInput = (section, value) => {
	const capitalized = sv.autoCapitalize(value);
	if (section === 'origin') {
		originAddress.value.full_name = capitalized;
	} else {
		destinationAddress.value.full_name = capitalized;
	}
	sv.onInput(`${section}_full_name`, () => sv.validateNomeCognome(`${section}_full_name`, capitalized));
};

// Filter CAP input
const onCapInput = (section, value) => {
	const filtered = sv.filterCAP(value);
	if (section === 'origin') {
		originAddress.value.postal_code = filtered;
	} else {
		destinationAddress.value.postal_code = filtered;
	}
	sv.onInput(`${section}_postal_code`, () => sv.validateCAP(`${section}_postal_code`, filtered));
};

// Format telefono input
const onTelefonoInput = (section, value) => {
	const formatted = sv.formatTelefono(value);
	if (section === 'origin') {
		originAddress.value.telephone_number = formatted;
	} else {
		destinationAddress.value.telephone_number = formatted;
	}
	sv.onInput(`${section}_telephone_number`, () => sv.validateTelefono(`${section}_telephone_number`, formatted));
};

// Smart field-level blur handlers
const smartBlur = (section, field) => {
	const key = `${section}_${field}`;
	const addr = section === 'origin' ? originAddress.value : destinationAddress.value;
	const value = addr[field];

	if (field === 'full_name') {
		sv.onBlur(key, () => sv.validateNomeCognome(key, value));
	} else if (field === 'postal_code') {
		sv.onBlur(key, () => sv.validateCAP(key, value));
	} else if (field === 'telephone_number') {
		sv.onBlur(key, () => sv.validateTelefono(key, value));
	} else if (field === 'email') {
		sv.onBlur(key, () => sv.validateEmail(key, value));
	} else if (field === 'province') {
		sv.onBlur(key, () => sv.validateProvincia(key, value));
		// Hide autocomplete on blur
		setTimeout(() => {
			if (section === 'origin') originProvinceSuggestions.value = [];
			else destProvinceSuggestions.value = [];
		}, 200);
	} else {
		// Generic required field
		sv.onBlur(key, () => {
			if (!value || !String(value).trim()) {
				sv.setError(key, 'Campo obbligatorio');
			} else {
				sv.clearError(key);
			}
		});
	}
};

const validateForm = () => {
	showValidation.value = true;
	let isValid = true;

	// Mark all fields as touched and validate
	const validateAddr = (section, addr) => {
		const fields = [
			['full_name', addr.full_name, () => sv.validateNomeCognome(`${section}_full_name`, addr.full_name)],
			['address', addr.address, () => { if (!addr.address?.trim()) { sv.setError(`${section}_address`, 'Indirizzo è obbligatorio'); return false; } sv.clearError(`${section}_address`); return true; }],
			['address_number', addr.address_number, () => { if (!addr.address_number?.trim()) { sv.setError(`${section}_address_number`, 'Numero civico è obbligatorio'); return false; } sv.clearError(`${section}_address_number`); return true; }],
			['city', addr.city, () => { if (!addr.city?.trim()) { sv.setError(`${section}_city`, 'Città è obbligatoria'); return false; } sv.clearError(`${section}_city`); return true; }],
			['province', addr.province, () => sv.validateProvincia(`${section}_province`, addr.province)],
			['postal_code', addr.postal_code, () => sv.validateCAP(`${section}_postal_code`, addr.postal_code)],
			['telephone_number', addr.telephone_number, () => sv.validateTelefono(`${section}_telephone_number`, addr.telephone_number)],
		];

		for (const [field, , validateFn] of fields) {
			sv.markTouched(`${section}_${field}`);
			if (!validateFn()) isValid = false;
		}

		// Email optional
		if (addr.email) {
			sv.markTouched(`${section}_email`);
			if (!sv.validateEmail(`${section}_email`, addr.email)) isValid = false;
		}
	};

	validateAddr('origin', originAddress.value);
	validateAddr('dest', destinationAddress.value);

	return isValid;
};

const getFieldError = (section, field) => {
	return sv.getError(`${section}_${field}`);
};

const fieldClass = (section, field) => {
	return sv.errorClass(`${section}_${field}`, 'input-preventivo-step-2');
};

const days = ["Lun", "Mar", "Mer", "Gio", "Ven"];

const formRef = ref(null);
const showAddressFields = ref(false);
const editingSidebarColli = ref(false);

// --- PUDO (Punto di ritiro BRT) ---
// deliveryMode: 'home' = consegna a domicilio classica, 'pudo' = ritiro in un punto BRT convenzionato
// Quando l'utente sceglie 'pudo', i campi indirizzo destinazione vengono auto-compilati (read-only)
// con l'indirizzo del punto PUDO selezionato.
const deliveryMode = computed({
	get: () => userStore.deliveryMode,
	set: (v) => { userStore.deliveryMode = v; },
});

// Quando l'utente seleziona un punto PUDO dalla lista, salviamo l'oggetto completo nello store
// e auto-compiliamo i campi indirizzo destinazione con i dati del punto.
const onPudoSelected = (pudo) => {
	userStore.selectedPudo = pudo;
	// Auto-compiliamo i campi destinazione con l'indirizzo del punto PUDO
	// cosi' il backend riceve un indirizzo valido anche per la spedizione PUDO.
	// Il campo "province" non arriva dal PUDO, quindi usiamo 'ND' (Non Disponibile)
	// perché BRT conosce gia' l'indirizzo esatto del punto tramite il pudo_id.
	destinationAddress.value.full_name = pudo.name || '';
	destinationAddress.value.address = pudo.address || '';
	destinationAddress.value.address_number = 'SNC';
	destinationAddress.value.city = pudo.city || '';
	destinationAddress.value.postal_code = pudo.zip_code || '';
	destinationAddress.value.province = pudo.province || 'ND';
	destinationAddress.value.telephone_number = '0000000000';
};

// Quando l'utente deseleziona il punto PUDO, puliamo lo store
// e svuotiamo i campi destinazione per permettere l'inserimento manuale
const onPudoDeselected = () => {
	userStore.selectedPudo = null;
	// Ripristiniamo i campi destinazione ai valori originali (dalla sessione del preventivo)
	destinationAddress.value.full_name = '';
	destinationAddress.value.address = '';
	destinationAddress.value.address_number = '';
	destinationAddress.value.city = session.value?.data?.shipment_details?.destination_city || '';
	destinationAddress.value.postal_code = session.value?.data?.shipment_details?.destination_postal_code || '';
	destinationAddress.value.province = '';
	destinationAddress.value.telephone_number = '';
};

// Quando si cambia modalità consegna, resettiamo il PUDO se si torna a domicilio
watch(deliveryMode, (newMode) => {
	if (newMode === 'home') {
		userStore.selectedPudo = null;
	}
});
const dateError = ref(null);

const editablePackages = computed(() => {
	// In modalita' modifica carrello, usa i pacchi dallo store se la sessione non li ha
	if (editCartId && userStore.packages?.length > 0 && !session.value?.data?.packages?.length) {
		return userStore.packages;
	}
	return session.value?.data?.packages || userStore.packages || [];
});

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
	// Aggiorna la query URL per sincronizzare Steps.vue
	router.replace({ query: { ...route.query, step: 'ritiro' } });
};

const goBackToServices = () => {
	showAddressFields.value = false;
	// Rimuovi la query step=ritiro per tornare allo step Servizi
	const { step: _step, ...rest } = route.query;
	router.replace({ query: rest });
};

const onStepNavigate = (stepIndex) => {
	if (stepIndex <= 1) {
		showAddressFields.value = false;
		const { step: _step, ...rest } = route.query;
		router.replace({ query: rest });
	}
};

// Action handlers moved to /riepilogo page

const { endpoint, refresh: refreshCart } = useCart();
const { isAuthenticated } = useSanctumAuth();
const sanctumClient = useSanctumClient();

// --- MODIFICA DA CARRELLO ---
// Se la URL contiene ?edit=123, carichiamo i dati del pacco dal carrello e pre-compiliamo tutto
const editCartId = route.query.edit ? Number(route.query.edit) : null;
const loadingEditData = ref(!!editCartId);

const loadCartItemForEdit = async () => {
	if (!editCartId) return;
	try {
		const result = await sanctumClient(`/api/cart/${editCartId}`);
		const item = result?.data || result;

		// Salviamo l'ID del pacco che stiamo modificando nello store
		userStore.editingCartItemId = editCartId;

		// Pre-fill indirizzo di partenza
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

		// Pre-fill indirizzo di destinazione
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

		// Pre-fill servizi
		if (item.services) {
			services.value.date = item.services.date || "";
			services.value.time = item.services.time || "";
			services.value.service_type = item.services.service_type || "";

			// Aggiorna la lista dei servizi selezionati nello store
			const serviceTypes = (item.services.service_type || "").split(", ").filter(s => s && s !== "Nessuno");
			userStore.servicesArray = serviceTypes;

			// Segna i servizi come selezionati visivamente
			servicesList.value.forEach(svc => {
				svc.isSelected = serviceTypes.includes(svc.name);
			});
		}

		// Pre-fill contenuto del pacco
		if (item.content_description) {
			userStore.contentDescription = item.content_description;
		}

		// Pre-fill dati dei pacchi nella sessione (peso, dimensioni, ecc.)
		// single_price arriva dal backend in centesimi, convertiamo in euro
		// perche' il frontend lavora in euro e il backend ri-moltiplica *100 al salvataggio
		const priceInEuro = item.single_price ? (Number(item.single_price) / 100) : 0;
		userStore.packages = [{
			package_type: item.package_type || "Pacco",
			quantity: item.quantity || 1,
			weight: item.weight,
			first_size: item.first_size,
			second_size: item.second_size,
			third_size: item.third_size,
			weight_price: item.weight_price,
			volume_price: item.volume_price,
			single_price: priceInEuro,
		}];

		// Pre-fill anche i dati di spedizione nello store (citta/CAP)
		userStore.shipmentDetails = {
			origin_city: item.origin_address?.city || "",
			origin_postal_code: item.origin_address?.postal_code || "",
			destination_city: item.destination_address?.city || "",
			destination_postal_code: item.destination_address?.postal_code || "",
			date: item.services?.date || "",
		};

		// Mostra direttamente i campi degli indirizzi (siamo in modalita' modifica)
		showAddressFields.value = true;

	} catch (e) {
		console.error("Errore caricamento pacco per modifica:", e);
	} finally {
		loadingEditData.value = false;
	}
};

// Prezzo totale dal pacco in modifica (convertito da centesimi a euro)
const editCartTotalPrice = computed(() => {
	if (!editCartId || !userStore.packages?.length) return '';
	const totalCents = userStore.packages.reduce((sum, p) => sum + (Number(p.single_price) || 0), 0);
	return (totalCents / 100).toFixed(2).replace('.', ',');
});

onMounted(() => {
	if (editCartId) {
		loadCartItemForEdit();
	}
});

// --- SPEDIZIONI CONFIGURATE (DATI DEFAULT) ---
// Permette di caricare indirizzi da spedizioni precedentemente salvate
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
		originFromSaved.value = true;
		originSaveSuccess.value = false;
		originSavedSnapshot.value = JSON.stringify(originAddress.value);
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
		destFromSaved.value = true;
		destSaveSuccess.value = false;
		destSavedSnapshot.value = JSON.stringify(destinationAddress.value);
	}
	showDefaultDropdown.value = false;
};
const router = useRouter();

const isSubmitting = ref(false);
const submitError = ref(null);

// Converte i dati dell'indirizzo dal form nel formato atteso dal backend
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

// Valida il form e naviga alla pagina di riepilogo (/riepilogo)
// Salva tutti i dati (indirizzi, servizi, pacchi) nello userStore per la pagina successiva
const continueToCart = async () => {
	submitError.value = null;

	// Run custom field validation
	if (!validateForm()) {
		nextTick(() => {
			const errorEl = document.querySelector('.text-red-500');
			if (errorEl) errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
		});
		return;
	}

	if (!formRef.value || !formRef.value.checkValidity()) {
		formRef.value?.reportValidity();
		return;
	}

	const packages = editablePackages.value;
	if (!packages.length) {
		submitError.value = "Nessun collo disponibile. Torna al preventivo rapido.";
		return;
	}

	// Se l'utente ha scelto ritiro in un Punto BRT, deve averne selezionato uno
	if (userStore.deliveryMode === 'pudo' && !userStore.selectedPudo) {
		submitError.value = "Seleziona un Punto BRT per la consegna prima di procedere.";
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
		content_description: userStore.contentDescription || "",
		// PUDO: se l'utente ha scelto ritiro in punto BRT, includiamo i dati del punto
		// Il backend usera' pudo.pudo_id per salvare brt_pudo_id nell'ordine
		delivery_mode: userStore.deliveryMode,
		pudo: userStore.deliveryMode === 'pudo' ? userStore.selectedPudo : null,
	};

	// Store in userStore for riepilogo page and backward navigation
	userStore.pendingShipment = payload;
	userStore.originAddressData = { ...originAddress.value };
	userStore.destinationAddressData = { ...destinationAddress.value };
	userStore.pickupDate = services.value.date || "";

	// Se stiamo modificando un pacco dal carrello, manteniamo l'ID
	if (editCartId) {
		userStore.editingCartItemId = editCartId;
	}

	navigateTo('/riepilogo');
};

</script>

<template>
	<section>
		<div class="my-container mt-[72px] mb-[120px]">
			<div v-if="status === 'pending' || loadingEditData" class="min-h-[720px] bg-[#E4E4E4] rounded-[20px] animate-pulse"></div>
			<form v-else ref="formRef" @submit.prevent="continueToCart">
				<Steps :current-step="showAddressFields ? 2 : 1" @navigate="onStepNavigate" />

				<!-- Popup servizi (sempre disponibile, anche dal riepilogo) -->
				<UModal
					:dismissible="true"
					v-model:open="open"
					:title="selectedService?.name"
					:description="selectedService?.description"
					:aria-describedby="undefined"
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

						<div v-if="selectedService?.index === 5" class="flex flex-wrap items-start justify-between gap-[10px] pb-[20px]">
							<div v-for="(day, dayIndex) in days" :key="dayIndex" class="w-[60px] tablet:w-[94px]">
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
				<div>

				<ClientOnly>
					<div class="bg-[#E6E6E6] rounded-[20px] pt-[13px]">
						<h2 class="ml-[16px] tablet:ml-[78px] text-[1.25rem] tablet:text-[1.8125rem] text-[#252B42] font-bold font-montserrat tracking-[0.1px]">Imposta giorno di ritiro</h2>

						<div class="py-[38px]">
							<div class="relative px-[20px] tablet:px-[35px]">
								<Swiper
									class="my-swiper h-[108px]"
									:modules="[Navigation]"
									:slides-per-view="3"
									:breakpoints="{ 720: { slidesPerView: 5, spaceBetween: 20 }, 1024: { slidesPerView: 7, spaceBetween: 30 } }"
									space-between="12"
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

								<!-- Ottimizzazione: decoding async per frecce navigazione -->
								<button class="custom-prev absolute bottom-[35px] left-[10px] cursor-pointer"><NuxtImg src="/img/quote/second-step/arrow-left.png" alt="" width="11" height="19" loading="lazy" decoding="async" /></button>
								<button class="custom-next absolute bottom-[35px] right-[10px] cursor-pointer"><NuxtImg src="/img/quote/second-step/arrow-right.png" alt="" width="11" height="19" loading="lazy" decoding="async" /></button>
							</div>
						</div>
					</div>
				</ClientOnly>

				<div class="flex flex-col desktop:flex-row desktop:items-start font-montserrat mt-[30px] tablet:mt-[60px] justify-center gap-[30px] desktop:gap-x-[40px]">
					<div class="flex-1 max-w-[850px]">
						<!-- #f0ffff  group hover:bg-[#727272]-->
						<div class="w-full">
							<div class="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-[20px] tablet:gap-[30px] desktop:gap-[50px_50px]">
								<label
									v-for="(service, serviceIndex) in servicesList"
									:key="serviceIndex"
									class="flex flex-col items-center justify-center min-h-[200px] tablet:min-h-[250px] text-center cursor-pointer rounded-[20px]"
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

							<!-- Contenuto del pacco -->
							<div class="mt-[40px] max-w-[500px]">
								<label for="content_description" class="block text-[0.9375rem] font-bold text-[#252B42] mb-[8px]">Contenuto del pacco</label>
								<input
									type="text"
									id="content_description"
									v-model="userStore.contentDescription"
									placeholder="es. Elettronica, Abbigliamento, Documenti"
									maxlength="255"
									class="input-preventivo-step-2 w-full" />
							</div>

							<!-- Date error (shown when no date selected) -->
							<p v-if="!showAddressFields && dateError" class="text-red-500 text-[0.9375rem] mt-[16px] font-medium text-right">{{ dateError }}</p>

							<!-- PARTENZA -->
							<template v-if="showAddressFields">
							<div class="bg-[#E4E4E4] rounded-[20px] text-[#252B42] mt-[20px] px-[16px] tablet:px-[40px] pt-[24px] tablet:pt-[35px] pb-[24px] tablet:pb-[43px]">
								<div class="flex items-center justify-between mb-[20px] tablet:mb-[39px] flex-wrap gap-[10px]">
									<div class="flex items-center gap-[10px]">
									<h2 class="font-bold text-[1.125rem] tracking-[0.1px]">
										Partenza
									</h2>
									<!-- Icona salva indirizzo partenza -->
									<button
										v-if="canSaveOriginAddress"
										type="button"
										@click="saveAddressToBook('origin')"
										:disabled="savingOriginAddress"
										class="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[6px] bg-[#095866] text-white hover:bg-[#074a56] transition cursor-pointer disabled:opacity-60"
										title="Salva indirizzo">
										<svg v-if="!savingOriginAddress" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
										<Icon v-else name="eos-icons:bubble-loading" class="text-[14px]" />
									</button>
									<span v-if="originSaveSuccess" class="inline-flex items-center gap-[4px] text-[0.75rem] text-green-600 font-semibold">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
										Salvato
									</span>
								</div>
								<div v-if="isAuthenticated" class="flex items-center gap-[10px]">
									<!-- Immetti dati default -->
										<div class="relative">
											<button type="button" @click="loadSavedConfigs" :disabled="loadingConfigs" class="inline-flex items-center gap-[6px] px-[14px] py-[8px] bg-[#996D47] text-white rounded-[8px] text-[0.8125rem] font-semibold hover:bg-[#7d5939] transition cursor-pointer disabled:opacity-60">
												<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
												{{ loadingConfigs ? '...' : 'Dati default' }}
											</button>
											<div v-if="showDefaultDropdown && savedConfigs.length > 0" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl max-h-[300px] overflow-y-auto w-[280px] tablet:w-[400px]">
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
											<button type="button" @click="toggleAddressSelector('origin')" class="inline-flex items-center gap-[6px] px-[14px] py-[8px] bg-[#095866] text-white rounded-[8px] text-[0.8125rem] font-semibold hover:bg-[#074a56] transition cursor-pointer">
												<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
												Indirizzi salvati
											</button>
											<div v-if="showOriginAddressSelector" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl max-h-[250px] overflow-y-auto w-[260px] tablet:w-[320px]">
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

								<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[16px] tablet:gap-x-[30px]">
									<div>
										<label for="name" class="block text-[0.875rem] sr-only">Nome e Cognome*</label>
										<input type="text" placeholder="Nome e Cognome*" v-model="originAddress.full_name" id="name" :class="fieldClass('origin', 'full_name')" required @blur="smartBlur('origin', 'full_name')" @input="onNameInput('origin', originAddress.full_name)" style="font-size: 16px;" />
										<p v-if="getFieldError('origin', 'full_name')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('origin', 'full_name') }}</p>
									</div>

									<div>
										<label for="origin_additional_info" class="block text-[0.875rem] sr-only">Informazioni aggiuntive</label>
										<input type="text" placeholder="Informazioni aggiuntive" v-model="originAddress.additional_information" id="origin_additional_info" class="input-preventivo-step-2" style="font-size: 16px;" />
									</div>
								</div>

								<div class="mt-[16px] tablet:mt-[39px] grid grid-cols-1 tablet:grid-cols-3 gap-[16px] tablet:gap-x-[25px]">
									<div>
										<label for="origin_address" class="block text-[0.875rem] sr-only">Indirizzo*</label>
										<input type="text" placeholder="Indirizzo*" v-model="originAddress.address" id="origin_address" :class="fieldClass('origin', 'address')" required style="font-size: 16px;" />
										<p v-if="getFieldError('origin', 'address')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('origin', 'address') }}</p>
									</div>

									<div>
										<label for="origin_address_number" class="block text-[0.875rem] sr-only">Numero civico*</label>
										<input type="text" placeholder="Numero civico*" v-model="originAddress.address_number" id="origin_address_number" :class="fieldClass('origin', 'address_number')" required style="font-size: 16px;" />
										<p v-if="getFieldError('origin', 'address_number')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('origin', 'address_number') }}</p>
									</div>

									<div>
										<label for="origin_intercom" class="block text-[0.875rem] sr-only">Citofono</label>
										<input type="text" placeholder="Citofono" v-model="originAddress.intercom_code" id="origin_intercom" class="input-preventivo-step-2" style="font-size: 16px;" />
									</div>
								</div>

								<div class="mt-[16px] tablet:mt-[39px] grid grid-cols-2 tablet:grid-cols-4 gap-[16px] tablet:gap-x-[25px]">
									<div>
										<label for="origin_country" class="block text-[0.875rem] sr-only">Paese*</label>
										<input type="text" placeholder="Paese*" value="Italia" id="origin_country" class="input-preventivo-step-2" disabled style="font-size: 16px;" />
									</div>

									<div>
										<label for="origin_city" class="block text-[0.875rem] sr-only">Citta*</label>
										<input type="text" placeholder="Citta*" v-model="originAddress.city" id="origin_city" :class="fieldClass('origin', 'city')" required style="font-size: 16px;" />
										<p v-if="getFieldError('origin', 'city')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('origin', 'city') }}</p>
									</div>

									<div class="relative">
										<label for="origin_province" class="block text-[0.875rem] sr-only">Provincia*</label>
										<input type="text" placeholder="Provincia* (es. MI)" v-model="originAddress.province" id="origin_province" :class="fieldClass('origin', 'province')" required maxlength="2" @input="onProvinciaInput('origin', originAddress.province)" @blur="smartBlur('origin', 'province')" style="font-size: 16px;" />
										<p v-if="getFieldError('origin', 'province')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('origin', 'province') }}</p>
										<ul v-if="originProvinceSuggestions.length > 0" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#D0D0D0] rounded-[8px] mt-[2px] shadow-lg">
											<li v-for="prov in originProvinceSuggestions" :key="prov" @mousedown.prevent="selectProvincia('origin', prov)" class="px-[12px] py-[8px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42]">{{ prov }}</li>
										</ul>
									</div>

									<div>
										<label for="origin_postal_code" class="block text-[0.875rem] sr-only">CAP*</label>
										<input type="text" placeholder="CAP*" v-model="originAddress.postal_code" id="origin_postal_code" :class="fieldClass('origin', 'postal_code')" required maxlength="5" @input="onCapInput('origin', originAddress.postal_code)" @blur="smartBlur('origin', 'postal_code')" style="font-size: 16px;" />
										<p v-if="getFieldError('origin', 'postal_code')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('origin', 'postal_code') }}</p>
									</div>
								</div>

								<div class="mt-[16px] tablet:mt-[39px] grid grid-cols-1 tablet:grid-cols-2 gap-[16px] tablet:gap-x-[30px]">
									<div>
										<label for="origin_telephone" class="block text-[0.875rem] sr-only">Telefono*</label>
										<input type="tel" placeholder="Telefono*" v-model="originAddress.telephone_number" id="origin_telephone" :class="fieldClass('origin', 'telephone_number')" required @input="onTelefonoInput('origin', originAddress.telephone_number)" @blur="smartBlur('origin', 'telephone_number')" style="font-size: 16px;" />
										<p v-if="getFieldError('origin', 'telephone_number')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('origin', 'telephone_number') }}</p>
									</div>

									<div>
										<label for="origin_email" class="block text-[0.875rem] sr-only">Email</label>
										<input type="email" placeholder="Email" v-model="originAddress.email" id="origin_email" :class="fieldClass('origin', 'email')" @blur="smartBlur('origin', 'email')" @input="sv.onInput('origin_email', () => sv.validateEmail('origin_email', originAddress.email))" style="font-size: 16px;" />
										<p v-if="getFieldError('origin', 'email')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('origin', 'email') }}</p>
									</div>
								</div>
							</div>

							<!-- TOGGLE MODALITA' CONSEGNA -->
							<!-- L'utente sceglie tra consegna classica a domicilio oppure ritiro
							     in un punto BRT convenzionato (tabaccaio, edicola, negozio) -->
							<div class="mt-[20px] mb-[4px]">
								<p class="text-[0.875rem] font-bold text-[#252B42] mb-[10px]">Modalità di consegna</p>
								<div class="flex flex-col tablet:flex-row gap-[10px]">
									<!-- Bottone "Consegna a domicilio" — modalità classica -->
									<button
										type="button"
										@click="deliveryMode = 'home'"
										class="inline-flex items-center gap-[8px] px-[18px] py-[12px] rounded-[30px] text-[0.875rem] font-semibold border-2 transition-[background-color,color,border-color] duration-200 cursor-pointer"
										:class="deliveryMode === 'home' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#252B42] border-[#D0D0D0] hover:border-[#095866]'">
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
										Consegna a domicilio
									</button>
									<!-- Bottone "Ritira in un Punto BRT" — consegna presso punto PUDO -->
									<button
										type="button"
										@click="deliveryMode = 'pudo'"
										class="inline-flex items-center gap-[8px] px-[18px] py-[12px] rounded-[30px] text-[0.875rem] font-semibold border-2 transition-[background-color,color,border-color] duration-200 cursor-pointer"
										:class="deliveryMode === 'pudo' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#252B42] border-[#D0D0D0] hover:border-[#095866]'">
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
										Ritira in un Punto BRT
									</button>
								</div>
							</div>

							<!-- SELETTORE PUDO — visibile solo se l'utente ha scelto "Ritira in un Punto BRT" -->
							<!-- Permette di cercare punti PUDO per città/CAP e selezionarne uno -->
							<div v-if="deliveryMode === 'pudo'" class="bg-[#E4E4E4] rounded-[20px] text-[#252B42] mt-[16px] px-[16px] tablet:px-[40px] pt-[24px] tablet:pt-[35px] pb-[24px] tablet:pb-[43px]">
								<h2 class="font-bold text-[1.125rem] tracking-[0.1px] flex items-center gap-[8px] mb-[4px]">
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
									Cerca un Punto BRT
								</h2>
								<p class="text-[0.8125rem] text-[#737373] mb-[8px]">Cerca un tabaccaio, edicola o negozio convenzionato BRT vicino alla destinazione.</p>
								<!-- PudoSelector: componente riutilizzabile che gestisce ricerca e selezione -->
								<!-- Riceve città e CAP di destinazione come valori iniziali per la ricerca -->
								<PudoSelector
									:initial-city="destinationAddress.city"
									:initial-zip="destinationAddress.postal_code"
									@select="onPudoSelected"
									@deselect="onPudoDeselected" />
								<!-- Riepilogo PUDO selezionato -->
								<div v-if="userStore.selectedPudo" class="mt-[16px] p-[12px] bg-white rounded-[10px] border-2 border-[#095866] text-[0.875rem]">
									<div class="flex items-center gap-[6px] text-[#095866] font-bold mb-[4px]">
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
										Punto selezionato
									</div>
									<p class="font-semibold text-[#252B42]">{{ userStore.selectedPudo.name }}</p>
									<p class="text-[#737373]">{{ userStore.selectedPudo.address }}, {{ userStore.selectedPudo.zip_code }} {{ userStore.selectedPudo.city }}</p>
								</div>
							</div>

							<!-- DESTINAZIONE -->
							<!-- Se modalità PUDO: i campi destinazione sono auto-compilati e read-only -->
							<!-- Se modalità domicilio: i campi sono editabili normalmente -->
							<div class="bg-[#E4E4E4] rounded-[20px] text-[#252B42] mt-[20px] px-[16px] tablet:px-[40px] pt-[24px] tablet:pt-[35px] pb-[24px] tablet:pb-[43px]">
								<div class="flex items-center justify-between mb-[20px] tablet:mb-[39px]">
									<div class="flex items-center gap-[10px]">
									<h2 class="font-bold text-[1.125rem] tracking-[0.1px]">
										{{ deliveryMode === 'pudo' ? 'Destinazione (Punto BRT)' : 'Destinazione' }}
									</h2>
									<!-- Icona salva indirizzo destinazione (nascosta in modalità PUDO perché l'indirizzo è del punto BRT) -->
									<button
										v-if="canSaveDestAddress && deliveryMode !== 'pudo'"
										type="button"
										@click="saveAddressToBook('dest')"
										:disabled="savingDestAddress"
										class="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[6px] bg-[#095866] text-white hover:bg-[#074a56] transition cursor-pointer disabled:opacity-60"
										title="Salva indirizzo">
										<svg v-if="!savingDestAddress" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
										<Icon v-else name="eos-icons:bubble-loading" class="text-[14px]" />
									</button>
									<span v-if="destSaveSuccess" class="inline-flex items-center gap-[4px] text-[0.75rem] text-green-600 font-semibold">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
										Salvato
									</span>
								</div>
									<!-- In modalità PUDO non mostriamo "Indirizzi salvati" perché l'indirizzo è quello del punto BRT -->
									<div v-if="isAuthenticated && deliveryMode !== 'pudo'" class="relative">
										<button type="button" @click="toggleAddressSelector('dest')" class="inline-flex items-center gap-[6px] px-[14px] py-[8px] bg-[#095866] text-white rounded-[8px] text-[0.8125rem] font-semibold hover:bg-[#074a56] transition cursor-pointer">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
											Indirizzi salvati
										</button>
										<div v-if="showDestAddressSelector" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl max-h-[250px] overflow-y-auto w-[260px] tablet:w-[320px]">
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

								<!-- In modalità PUDO: banner informativo + campi auto-compilati e non editabili -->
								<div v-if="deliveryMode === 'pudo' && userStore.selectedPudo" class="mb-[16px] p-[12px] bg-[#095866]/10 rounded-[10px] flex items-center gap-[8px] text-[0.8125rem] text-[#095866]">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
									Indirizzo compilato automaticamente dal Punto BRT selezionato.
								</div>
								<div v-if="deliveryMode === 'pudo' && !userStore.selectedPudo" class="mb-[16px] p-[12px] bg-orange-50 rounded-[10px] flex items-center gap-[8px] text-[0.8125rem] text-orange-700">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
									Seleziona un Punto BRT qui sopra per procedere.
								</div>

								<!-- Wrapper: in modalità PUDO i campi sono disabilitati visivamente (compilati automaticamente) -->
								<div :class="{ 'opacity-60 pointer-events-none': deliveryMode === 'pudo' }">
								<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[16px] tablet:gap-x-[30px]">
									<div>
										<label for="dest_name" class="block text-[0.875rem] sr-only">Nome e Cognome*</label>
										<input type="text" placeholder="Nome e Cognome*" v-model="destinationAddress.full_name" id="dest_name" :class="fieldClass('dest', 'full_name')" required @blur="smartBlur('dest', 'full_name')" @input="onNameInput('dest', destinationAddress.full_name)" style="font-size: 16px;" />
										<p v-if="getFieldError('dest', 'full_name')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('dest', 'full_name') }}</p>
									</div>

									<div>
										<label for="dest_additional_info" class="block text-[0.875rem] sr-only">Informazioni aggiuntive</label>
										<input type="text" placeholder="Informazioni aggiuntive" v-model="destinationAddress.additional_information" id="dest_additional_info" class="input-preventivo-step-2" style="font-size: 16px;" />
									</div>
								</div>

								<div class="mt-[16px] tablet:mt-[39px] grid grid-cols-1 tablet:grid-cols-3 gap-[16px] tablet:gap-x-[25px]">
									<div>
										<label for="dest_address" class="block text-[0.875rem] sr-only">Indirizzo*</label>
										<input type="text" placeholder="Indirizzo*" v-model="destinationAddress.address" id="dest_address" :class="fieldClass('dest', 'address')" required style="font-size: 16px;" />
										<p v-if="getFieldError('dest', 'address')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('dest', 'address') }}</p>
									</div>

									<div>
										<label for="dest_address_number" class="block text-[0.875rem] sr-only">Numero civico*</label>
										<input type="text" placeholder="Numero civico*" v-model="destinationAddress.address_number" id="dest_address_number" :class="fieldClass('dest', 'address_number')" required style="font-size: 16px;" />
										<p v-if="getFieldError('dest', 'address_number')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('dest', 'address_number') }}</p>
									</div>

									<div>
										<label for="dest_intercom" class="block text-[0.875rem] sr-only">Citofono</label>
										<input type="text" placeholder="Citofono" v-model="destinationAddress.intercom_code" id="dest_intercom" class="input-preventivo-step-2" style="font-size: 16px;" />
									</div>
								</div>

								<div class="mt-[16px] tablet:mt-[39px] grid grid-cols-2 tablet:grid-cols-4 gap-[16px] tablet:gap-x-[25px]">
									<div>
										<label for="dest_country" class="block text-[0.875rem] sr-only">Paese*</label>
										<input type="text" placeholder="Paese*" value="Italia" id="dest_country" class="input-preventivo-step-2" disabled style="font-size: 16px;" />
									</div>

									<div>
										<label for="dest_city" class="block text-[0.875rem] sr-only">Citta*</label>
										<input type="text" placeholder="Citta*" v-model="destinationAddress.city" id="dest_city" :class="fieldClass('dest', 'city')" required style="font-size: 16px;" />
										<p v-if="getFieldError('dest', 'city')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('dest', 'city') }}</p>
									</div>

									<div class="relative">
										<label for="dest_province" class="block text-[0.875rem] sr-only">Provincia*</label>
										<input type="text" placeholder="Provincia* (es. MI)" v-model="destinationAddress.province" id="dest_province" :class="fieldClass('dest', 'province')" required maxlength="2" @input="onProvinciaInput('dest', destinationAddress.province)" @blur="smartBlur('dest', 'province')" style="font-size: 16px;" />
										<p v-if="getFieldError('dest', 'province')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('dest', 'province') }}</p>
										<ul v-if="destProvinceSuggestions.length > 0" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#D0D0D0] rounded-[8px] mt-[2px] shadow-lg">
											<li v-for="prov in destProvinceSuggestions" :key="prov" @mousedown.prevent="selectProvincia('dest', prov)" class="px-[12px] py-[8px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42]">{{ prov }}</li>
										</ul>
									</div>

									<div>
										<label for="dest_postal_code" class="block text-[0.875rem] sr-only">CAP*</label>
										<input type="text" placeholder="CAP*" v-model="destinationAddress.postal_code" id="dest_postal_code" :class="fieldClass('dest', 'postal_code')" required maxlength="5" @input="onCapInput('dest', destinationAddress.postal_code)" @blur="smartBlur('dest', 'postal_code')" style="font-size: 16px;" />
										<p v-if="getFieldError('dest', 'postal_code')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('dest', 'postal_code') }}</p>
									</div>
								</div>

								<div class="mt-[16px] tablet:mt-[39px] grid grid-cols-1 tablet:grid-cols-2 gap-[16px] tablet:gap-x-[30px]">
									<div>
										<label for="dest_telephone_number" class="block text-[0.875rem] sr-only">Telefono*</label>
										<input type="tel" placeholder="Telefono*" v-model="destinationAddress.telephone_number" id="dest_telephone_number" :class="fieldClass('dest', 'telephone_number')" required @input="onTelefonoInput('dest', destinationAddress.telephone_number)" @blur="smartBlur('dest', 'telephone_number')" style="font-size: 16px;" />
										<p v-if="getFieldError('dest', 'telephone_number')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('dest', 'telephone_number') }}</p>
									</div>

									<div>
										<label for="dest_email" class="block text-[0.875rem] sr-only">Email</label>
										<input type="email" placeholder="Email" v-model="destinationAddress.email" id="dest_email" :class="fieldClass('dest', 'email')" @blur="smartBlur('dest', 'email')" @input="sv.onInput('dest_email', () => sv.validateEmail('dest_email', destinationAddress.email))" style="font-size: 16px;" />
										<p v-if="getFieldError('dest', 'email')" class="text-red-500 text-[0.75rem] mt-[4px]">{{ getFieldError('dest', 'email') }}</p>
									</div>
								</div>
								</div><!-- Fine wrapper PUDO readonly -->
							</div>

						</template>
						</div>

						<div class="mt-[28px] flex flex-col tablet:flex-row flex-wrap gap-[12px] items-stretch tablet:items-center justify-between">
							<template v-if="showAddressFields">
								<button
									type="button"
									@click="goBackToServices"
									class="inline-flex items-center justify-center gap-[8px] h-[52px] px-[24px] rounded-[30px] bg-[#095866] text-white font-semibold hover:bg-[#074a56] transition cursor-pointer">
									<Icon name="mdi:arrow-left" class="text-[18px]" />
									Indietro
								</button>
								<button
									type="submit"
									:disabled="isSubmitting"
									class="inline-flex items-center gap-[8px] bg-[#E44203] text-white font-semibold text-[1rem] px-[28px] h-[52px] rounded-[30px] hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed">
									{{ isSubmitting ? 'Salvataggio in corso...' : (editCartId ? 'Continua al riepilogo modifica' : 'Continua al riepilogo') }}
									<Icon v-if="!isSubmitting" name="mdi:arrow-right" class="text-[18px]" />
								</button>
							</template>
							<template v-else>
								<NuxtLink :to="editCartId ? '/carrello' : { path: '/', hash: '#preventivo' }" class="inline-flex items-center justify-center gap-[8px] h-[52px] px-[24px] rounded-[30px] bg-[#095866] text-white font-semibold hover:bg-[#074a56] transition">
									<Icon name="mdi:arrow-left" class="text-[18px]" />
									{{ editCartId ? 'Torna al carrello' : 'Indietro' }}
								</NuxtLink>
								<button
									type="button"
									@click="openAddressFields"
									class="inline-flex items-center gap-[8px] bg-[#E44203] text-white font-semibold text-[1rem] px-[32px] h-[52px] rounded-[30px] hover:opacity-90 transition cursor-pointer">
									<Icon name="mdi:pencil-outline" class="text-[18px]" />
									Compila dati ritiro e destinazione
								</button>
							</template>
						</div>
						<div v-if="submitError" class="mt-[16px] p-[14px] bg-red-50 border border-red-200 rounded-[12px] flex items-center gap-[10px]">
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-red-500 shrink-0"><path fill="currentColor" d="M13 13h-2V7h2m0 10h-2v-2h2M12 2a10 10 0 0 1 10 10a10 10 0 0 1-10 10A10 10 0 0 1 2 12A10 10 0 0 1 12 2"/></svg>
							<p class="text-red-600 text-[0.9375rem] font-medium">{{ submitError }}</p>
						</div>
					</div>

					<div class="hidden desktop:block border-l-[0.5px] border-[rgba(0,0,0,0.1)] min-h-[600px] mt-[30px] pl-[30px] pt-[50px] shrink-0">
						<div class="w-[250px] flex flex-col gap-y-[30px]">
							<div class="bg-[#E4E4E4] rounded-[20px] p-[35px_21px] text-[#252B42] font-bold text-[0.6875rem] tracking-[0.1px]">
								<h4 class="text-center font-bold mb-[12px]">Indirizzi</h4>
								<div>
									<div class="before:content-[''] before:inline-block before:bg-[url(/img/quote/second-step/origin.png)] before:w-[16px] before:h-[14px] before:mr-[10px] flex items-center">
										<div v-if="!isOriginDetailsEdited">{{ session?.data?.shipment_details?.origin_city || userStore.shipmentDetails?.origin_city }} - {{ session?.data?.shipment_details?.origin_postal_code || userStore.shipmentDetails?.origin_postal_code }} - Italia</div>

										<div v-else>
											<input type="text" v-model="temporaryShipmentDetails.origin_city" id="" class="bg-white font-montserrat w-[45px]" />
											-
											<input type="text" v-model="temporaryShipmentDetails.origin_postal_code" id="" class="bg-white font-montserrat w-[45px]" />
											-
											<input type="text" value="Italia" id="" class="bg-white font-montserrat w-[45px]" />
										</div>

										<button type="button" @click="editOriginDetails" title="Modifica" class="ml-auto">
											<NuxtImg src="/img/quote/second-step/edit.png" alt="Modifica" width="13" height="13" loading="lazy" decoding="async" />
										</button>
									</div>

									<div
										class="mt-[12px] before:content-[''] before:inline-block before:bg-[url(/img/quote/second-step/destination.png)] before:w-[16px] before:h-[14px] before:mr-[10px] flex items-center">
										<div v-if="!isDestinationDetailsEdited">{{ session?.data?.shipment_details?.destination_city || userStore.shipmentDetails?.destination_city }} - {{ session?.data?.shipment_details?.destination_postal_code || userStore.shipmentDetails?.destination_postal_code }} - Italia</div>

										<div v-else>
											<input type="text" v-model="temporaryShipmentDetails.destination_city" id="" class="bg-white font-montserrat w-[45px]" />
											-
											<input type="text" v-model="temporaryShipmentDetails.destination_postal_code" id="" class="bg-white font-montserrat w-[45px]" />
											-
											<input type="text" value="Italia" id="" class="bg-white font-montserrat w-[45px]" />
										</div>

										<button type="button" @click="editDestinationDetails" title="Modifica" class="ml-auto">
											<NuxtImg src="/img/quote/second-step/edit.png" alt="Modifica" width="13" height="13" loading="lazy" decoding="async" />
										</button>
									</div>
								</div>
							</div>

							<div class="bg-[#E4E4E4] rounded-[20px] p-[35px_21px] text-[#252B42] text-[0.6875rem] tracking-[0.1px]">
								<div class="flex items-center justify-between mb-[12px]">
									<h4 class="text-center font-bold flex-1">Colli</h4>
									<button type="button" @click="editingSidebarColli = !editingSidebarColli" class="ml-auto">
										<NuxtImg src="/img/quote/second-step/edit.png" alt="Modifica" width="13" height="13" loading="lazy" decoding="async" />
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
									<button type="button" @click="editingSidebarColli = false" class="w-full inline-flex items-center justify-center gap-[4px] bg-[#095866] text-white text-[0.6875rem] font-semibold h-[28px] rounded-[8px] hover:bg-[#074a56] transition cursor-pointer"><Icon name="mdi:content-save" class="text-[14px]" />Salva</button>
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

								<p class="text-[2rem]">{{ session?.data?.total_price || editCartTotalPrice }}€</p>
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

/* Miglioramento UX: aggiunto focus state per accessibilita' e feedback visivo */
.input-preventivo-step-2 {
	font-family: "Montserrat", sans-serif;
	background: #ffffff !important;
	box-shadow: 0 1px 0 rgba(0,0,0,0.03) inset;
	border: 1px solid #d9dde3;
	border-radius: 8px;
	padding: 12px 10px;
	color: #252b42;
	transition: border-color 0.2s;
}

.input-preventivo-step-2:focus {
	border-color: #095866;
	outline: none;
}

.title-popup::after {
	background-image: var(--before-bg);
	width: 26px;
	height: 28px;
}
</style>
