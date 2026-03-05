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
const route = useRoute();

// Step corrente dalla route
const currentStep = computed(() => Number(route.params.step));

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
		description: "Non stampare nulla: mostra un codice sul telefono, etichetta applicata al ritiro.",
		isSelected: false,
		featured: true, // Servizio in evidenza (centrato sopra)
	},
	{
		img: "cash-on-delivery.png",
		width: 60,
		height: 51,
		name: "Contrassegno",
		description: "Paga alla consegna: il corriere incassa dal destinatario per conto del mittente.",
		isSelected: false,
		popupDescription:
			"Fai pagare il destinatario al momento della consegna. Il corriere incassa l'importo e lo accredita al mittente secondo la modalità scelta. Se il destinatario non paga o rifiuta, la consegna non viene completata.",
	},
	{
		img: "insurance.png",
		width: 52,
		height: 52,
		name: "Assicurazione",
		description: "Copri il valore: rimborso in caso di smarrimento, furto o danneggiamento.",
		isSelected: false,
		popupIcon: "insurance-icon.png",
		popupDescription: "Indica il valore del contenuto. In caso di smarrimento o danneggiamento durante il trasporto, è possibile richiedere un rimborso secondo le condizioni del servizio.",
	},
	{
		img: "tail-lift.png",
		width: 58,
		height: 55,
		name: "Sponda idraulica",
		description: "Camion con pedana di sollevamento per carico e scarico di colli pesanti.",
		isSelected: false,
		popupDescription:
			"Richiedi il mezzo con sponda per caricare o scaricare quando non è disponibile banchina, muletto o personale di movimentazione. La disponibilità dipende dal corriere e dalla tratta.",
	},
]);

const open = ref(false);

const { session, status, refresh } = useSession();

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

// Dati servizi popup (Contrassegno, Assicurazione, etc.)
const serviceData = ref({
	contrassegno: {
		importo: '',
		modalita_incasso: '',
		modalita_rimborso: '',
		dettaglio_rimborso: ''
	},
	assicurazione: {},
	sponda_idraulica: {
		note: ''
	},
	telefono_notifica: ''
});

// Apre il popup di dettaglio per un servizio e lo segna come selezionato
const chooseService = (service, serviceIndex) => {
	// Servizio "Senza etichetta" (featured) - selezione diretta senza popup
	if (service.featured) {
		const isCurrentlySelected = servicesList.value[serviceIndex].isSelected;

		// Toggle selezione
		servicesList.value[serviceIndex].isSelected = !isCurrentlySelected;

		if (!isCurrentlySelected) {
			// Aggiungi servizio
			if (!userStore.servicesArray.includes(service.name)) {
				userStore.servicesArray.push(service.name);
			}
		} else {
			// Rimuovi servizio
			const index = userStore.servicesArray.indexOf(service.name);
			if (index !== -1) {
				userStore.servicesArray.splice(index, 1);
			}
		}

		services.value.service_type = userStore.servicesArray.join(", ");
		return;
	}

	// Per i servizi standard: click su card gia' selezionata = deseleziona subito.
	if (userStore.servicesArray.includes(service.name)) {
		const index = userStore.servicesArray.indexOf(service.name);
		if (index !== -1) userStore.servicesArray.splice(index, 1);
		servicesList.value[serviceIndex].isSelected = false;
		services.value.service_type = userStore.servicesArray.join(", ");
		return;
	}

	// Altri servizi - apri popup
	open.value = true;

	selectedService.value.name = service.name;
	selectedService.value.description = service.popupDescription;
	selectedService.value.index = serviceIndex;
	selectedService.value.icon = service.popupIcon;

	myService.value = service;
	myServiceIndex.value = serviceIndex;
};

// Aggiunge o rimuove un servizio dalla lista dei servizi selezionati (toggle)
const addService = (service = myService.value) => {
	if (!service?.name) {
		open.value = false;
		return;
	}

	const alreadySelected = userStore.servicesArray.includes(service.name);
	if (!alreadySelected) {
		userStore.servicesArray.push(service.name);

		// Salva i dati del servizio nello store per persistenza
		if (service.name === 'Contrassegno') {
			userStore.serviceData = userStore.serviceData || {};
			userStore.serviceData.contrassegno = { ...serviceData.value.contrassegno };
		} else if (service.name === 'Assicurazione') {
			userStore.serviceData = userStore.serviceData || {};
			userStore.serviceData.assicurazione = { ...serviceData.value.assicurazione };
		} else if (service.name === 'Sponda idraulica') {
			userStore.serviceData = userStore.serviceData || {};
			userStore.serviceData.sponda_idraulica = { ...serviceData.value.sponda_idraulica };
		}
	} else {
		const index = userStore.servicesArray.indexOf(service.name);
		if (index !== -1) {
			userStore.servicesArray.splice(index, 1); // rimuove 1 elemento all'indice trovato
		}
	}

	const serviceVisual = servicesList.value.find((s) => s.name === service.name);
	if (serviceVisual) serviceVisual.isSelected = !alreadySelected;

	services.value.service_type = userStore.servicesArray.join(", ");
	open.value = false;
	selectedService.value.index = "";
};

const removeServiceFromSidebar = (idx) => {
	const removed = userStore.servicesArray[idx];
	userStore.servicesArray.splice(idx, 1);
	services.value.service_type = userStore.servicesArray.join(", ");
	// Deselect visually
	const svc = servicesList.value.find(s => s.name === removed);
	if (svc) svc.isSelected = false;
};

// Computed per separare servizio in evidenza dagli altri
const featuredService = computed(() => servicesList.value.find(s => s.featured));
const regularServices = computed(() => servicesList.value.filter(s => !s.featured));

// --- SERVIZIO SMS/EMAIL NOTIFICHE ---
const smsEmailNotification = ref(false);
const pickupDateSectionRef = ref(null);

// Seleziona/deseleziona un giorno di ritiro dal carosello
const chooseDate = (day) => {
	const lastDay = day.date.toLocaleDateString();
	if (!services.value.date || services.value.date != lastDay) {
		services.value.date = day.date.toLocaleDateString();
		dateError.value = null;
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
		const service = servicesList.value[selectedService.value.index];
		if (!userStore.servicesArray.includes(service.name)) {
			service.isSelected = false;
		}
	}
	open.value = false;
};

// Quando il modal viene chiuso dall'esterno (click fuori), deseleziona il servizio
watch(open, (newVal) => {
	if (!newVal && selectedService.value.index !== "" && servicesList.value[selectedService.value.index]) {
		const service = servicesList.value[selectedService.value.index];
		if (!userStore.servicesArray.includes(service.name)) {
			service.isSelected = false;
		}
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

/* Restore SMS/Email notification from store */
if (userStore.smsEmailNotification !== undefined) {
	smsEmailNotification.value = userStore.smsEmailNotification;
}

// --- SELETTORE INDIRIZZI SALVATI ---
// Permette all'utente autenticato di scegliere un indirizzo dalla rubrica
const savedAddresses = ref([]);
const loadingSavedAddresses = ref(false);
const showOriginAddressSelector = ref(false);
const showDestAddressSelector = ref(false);
const showOriginGuestPrompt = ref(false);
const showDestGuestPrompt = ref(false);
const showOriginConfigGuestPrompt = ref(false);
const showDestConfigGuestPrompt = ref(false);
const originSelectorRef = ref(null);
const destSelectorRef = ref(null);
const defaultDropdownRef = ref(null);
const destDefaultDropdownRef = ref(null);
const authRedirectPath = computed(() => `/autenticazione?redirect=${encodeURIComponent(route.fullPath)}`);
const authRegisterRedirectPath = computed(() => `/autenticazione?mode=register&redirect=${encodeURIComponent(route.fullPath)}`);

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
	const isDestPudoContactOnly = target === 'dest' && deliveryMode.value === 'pudo';

	addrRef.value.full_name = addr.name || "";
	addrRef.value.telephone_number = addr.telephone_number || "";
	addrRef.value.email = addr.email || "";
	addrRef.value.additional_information = addr.additional_information || "";

	if (!isDestPudoContactOnly) {
		addrRef.value.address = addr.address || "";
		addrRef.value.address_number = addr.address_number || "";
		addrRef.value.city = addr.city || "";
		addrRef.value.postal_code = addr.postal_code || "";
		addrRef.value.province = addr.province || "";
		addrRef.value.intercom_code = addr.intercom_code || "";
	}
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
	showDefaultDropdown.value = false;

	if (!isAuthenticated.value) {
		if (target === 'origin') {
			showOriginGuestPrompt.value = !showOriginGuestPrompt.value;
			showDestGuestPrompt.value = false;
			showOriginAddressSelector.value = false;
			showDestAddressSelector.value = false;
		} else {
			showDestGuestPrompt.value = !showDestGuestPrompt.value;
			showOriginGuestPrompt.value = false;
			showOriginAddressSelector.value = false;
			showDestAddressSelector.value = false;
		}
		return;
	}

	loadSavedAddresses();
	showOriginGuestPrompt.value = false;
	showDestGuestPrompt.value = false;

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
const sanctumClient = useSanctumClient();

// Province autocomplete
const originProvinceSuggestions = ref([]);
const destProvinceSuggestions = ref([]);

// City/CAP autocomplete
const originCitySuggestions = ref([]);
const destCitySuggestions = ref([]);
const originCapSuggestions = ref([]);
const destCapSuggestions = ref([]);
const citySearchTimeout = { origin: null, dest: null };
const capSearchTimeout = { origin: null, dest: null };
const citySearchSeq = reactive({ origin: 0, dest: 0 });
const capSearchSeq = reactive({ origin: 0, dest: 0 });
const locationLinkHints = reactive({ origin: [], dest: [] });

const normalizeLocationText = (value = "") =>
	String(value)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();

const getSectionAddress = (section) => (section === "origin" ? originAddress.value : destinationAddress.value);

const setSectionCitySuggestions = (section, suggestions) => {
	if (section === "origin") originCitySuggestions.value = suggestions;
	else destCitySuggestions.value = suggestions;
};

const setSectionCapSuggestions = (section, suggestions) => {
	if (section === "origin") originCapSuggestions.value = suggestions;
	else destCapSuggestions.value = suggestions;
};

const setSectionProvinceSuggestions = (section, suggestions) => {
	if (section === "origin") originProvinceSuggestions.value = suggestions;
	else destProvinceSuggestions.value = suggestions;
};

const getProvinceLabel = (location) =>
	String(location?.province || location?.province_name || "")
		.toUpperCase()
		.trim();

const formatCitySuggestionLabel = (location) => {
	const province = getProvinceLabel(location);
	if (province) return `${location.place_name} (${province}) - ${location.postal_code}`;
	return `${location.place_name} - ${location.postal_code}`;
};

const formatCapSuggestionLabel = (location) => {
	const province = getProvinceLabel(location);
	if (province) return `${location.postal_code} - ${location.place_name} (${province})`;
	return `${location.postal_code} - ${location.place_name}`;
};

const dedupeLocations = (locations) => {
	if (!Array.isArray(locations)) return [];
	const seen = new Set();
	const result = [];
	for (const loc of locations) {
		const key = `${String(loc?.postal_code || "").trim()}|${normalizeLocationText(loc?.place_name)}|${getProvinceLabel(loc)}`;
		if (!key || seen.has(key)) continue;
		seen.add(key);
		result.push(loc);
	}
	return result;
};

const setProvinceSuggestionsFromLocations = (section, locations) => {
	const provinces = [...new Set(
		dedupeLocations(locations)
			.map((loc) => getProvinceLabel(loc))
			.filter(Boolean)
	)].sort();
	setSectionProvinceSuggestions(section, provinces.slice(0, 20));
};

const isLocationCoherent = (location, city, province) => {
	const cityNorm = normalizeLocationText(city);
	const provinceNorm = normalizeLocationText(province);
	const locCityNorm = normalizeLocationText(location?.place_name);
	const locProvinceNorm = normalizeLocationText(getProvinceLabel(location));

	if (cityNorm && locCityNorm !== cityNorm) return false;
	if (provinceNorm && locProvinceNorm !== provinceNorm) return false;
	return true;
};

const onProvinciaInput = (section, value) => {
	const filtered = sv.filterProvincia(value);
	const contextualLocations = dedupeLocations([
		...(section === "origin" ? originCitySuggestions.value : destCitySuggestions.value),
		...(section === "origin" ? originCapSuggestions.value : destCapSuggestions.value),
	]);
	const contextualProvinces = [...new Set(
		contextualLocations
			.map((loc) => getProvinceLabel(loc))
			.filter(Boolean)
	)].filter((prov) => prov.startsWith(filtered));
	const provinceSuggestions = contextualProvinces.length > 0
		? contextualProvinces.slice(0, 20)
		: sv.getProvinceSuggestions(filtered);

	if (section === 'origin') {
		originAddress.value.province = filtered;
		originProvinceSuggestions.value = provinceSuggestions;
	} else {
		destinationAddress.value.province = filtered;
		destProvinceSuggestions.value = provinceSuggestions;
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
	void validateAddressLocationLink(section);
};

const loadCapSuggestionsFromCity = async (section, cityValue) => {
	const city = String(cityValue || "").trim();
	if (city.length < 2) return;
	try {
		const results = await sanctumClient(`/api/locations/by-city?city=${encodeURIComponent(city)}&limit=300`);
		const cityNorm = normalizeLocationText(city);
		const filtered = dedupeLocations(results)
			.filter((loc) => normalizeLocationText(loc.place_name).startsWith(cityNorm))
			.sort((a, b) => String(a.postal_code).localeCompare(String(b.postal_code)));
		setSectionCapSuggestions(section, filtered.slice(0, 40));
		setProvinceSuggestionsFromLocations(section, filtered);
	} catch (error) {
		console.error("CAP suggestions by city error:", error);
	}
};

const onCityFocus = (section) => {
	const addr = getSectionAddress(section);
	if (addr.city && String(addr.city).trim().length >= 2) {
		void onCityInput(section, addr.city, { immediate: true });
	}
};

const onCapFocus = (section) => {
	const addr = getSectionAddress(section);
	const cap = String(addr.postal_code || "");
	if (cap.length >= 3) {
		void onCapInput(section, cap, { immediate: true });
		return;
	}
	if (String(addr.city || "").trim().length >= 2) {
		void loadCapSuggestionsFromCity(section, addr.city);
	}
};

const onProvinceFocus = (section) => {
	const addr = getSectionAddress(section);
	const filtered = sv.filterProvincia(addr.province || "");
	onProvinciaInput(section, filtered);
	if (!filtered && String(addr.postal_code || "").length >= 3) {
		void onCapInput(section, addr.postal_code, { immediate: true });
	}
	if (!filtered && String(addr.city || "").trim().length >= 2) {
		void onCityInput(section, addr.city, { immediate: true });
	}
};

// City autocomplete with API
const onCityInput = async (section, value, options = {}) => {
	clearTimeout(citySearchTimeout[section]);

	// Valida anche il campo città
	sv.onInput(`${section}_city`, () => {
		if (!value || !String(value).trim()) {
			sv.setError(`${section}_city`, 'Città è obbligatoria');
		} else {
			sv.clearError(`${section}_city`);
		}
	});

	if (!value || value.length < 2) {
		setSectionCitySuggestions(section, []);
		return;
	}

	const delay = options.immediate ? 0 : 260;
	citySearchTimeout[section] = setTimeout(async () => {
		const seq = ++citySearchSeq[section];
		try {
			const results = await sanctumClient(`/api/locations/by-city?city=${encodeURIComponent(value)}&limit=300`);
			if (seq !== citySearchSeq[section]) return;

			const queryNorm = normalizeLocationText(value);
			const address = getSectionAddress(section);
			const capPrefix = String(address.postal_code || "");
			const provincePrefix = normalizeLocationText(address.province || "");

			let suggestions = dedupeLocations(results).filter((loc) =>
				normalizeLocationText(loc.place_name).startsWith(queryNorm)
			);

			if (capPrefix.length >= 3) {
				suggestions = suggestions.filter((loc) =>
					String(loc.postal_code || "").startsWith(capPrefix)
				);
			}

			if (provincePrefix.length === 2) {
				suggestions = suggestions.filter((loc) =>
					normalizeLocationText(getProvinceLabel(loc)) === provincePrefix
				);
			}

			suggestions.sort((a, b) => {
				const aName = normalizeLocationText(a.place_name);
				const bName = normalizeLocationText(b.place_name);
				const aExact = aName === queryNorm ? 0 : 1;
				const bExact = bName === queryNorm ? 0 : 1;
				if (aExact !== bExact) return aExact - bExact;
				if (aName.length !== bName.length) return aName.length - bName.length;
				if (aName !== bName) return aName.localeCompare(bName);
				return String(a.postal_code || "").localeCompare(String(b.postal_code || ""));
			});

			setSectionCitySuggestions(section, suggestions.slice(0, 25));
			setProvinceSuggestionsFromLocations(section, suggestions);

			if (capPrefix.length >= 3) {
				setSectionCapSuggestions(
					section,
					suggestions
						.filter((loc) => String(loc.postal_code || "").startsWith(capPrefix))
						.slice(0, 40)
				);
			}
		} catch (error) {
			console.error('City autocomplete error:', error);
			setSectionCitySuggestions(section, []);
		}
	}, delay);
};

const applyLocationToSection = (section, location) => {
	const address = getSectionAddress(section);
	address.city = location.place_name || address.city;
	address.postal_code = String(location.postal_code || address.postal_code || "");
	const province = getProvinceLabel(location);
	if (province) address.province = province;
	setSectionCitySuggestions(section, []);
	setSectionCapSuggestions(section, []);
	setSectionProvinceSuggestions(section, []);
	sv.clearError(`${section}_city`);
	sv.clearError(`${section}_postal_code`);
	sv.clearError(`${section}_province`);
};

const selectCity = (section, location) => {
	applyLocationToSection(section, location);
};

const selectCap = (section, location) => {
	applyLocationToSection(section, location);
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
const onCapInput = async (section, value, options = {}) => {
	clearTimeout(capSearchTimeout[section]);
	const filtered = sv.filterCAP(value);
	if (section === 'origin') {
		originAddress.value.postal_code = filtered;
	} else {
		destinationAddress.value.postal_code = filtered;
	}
	sv.onInput(`${section}_postal_code`, () => sv.validateCAP(`${section}_postal_code`, filtered));

	if (!filtered || filtered.length < 3) {
		setSectionCapSuggestions(section, []);
		return;
	}

	const delay = options.immediate ? 0 : 220;
	capSearchTimeout[section] = setTimeout(async () => {
		const seq = ++capSearchSeq[section];
		const address = getSectionAddress(section);
		const cityNorm = normalizeLocationText(address.city);
		const provinceNorm = normalizeLocationText(address.province);

		try {
			let results = [];
			if (filtered.length === 5) {
				results = await sanctumClient(`/api/locations/by-cap?cap=${encodeURIComponent(filtered)}`);
			} else {
				results = await sanctumClient(`/api/locations/search?q=${encodeURIComponent(filtered)}&limit=300`);
			}
			if (seq !== capSearchSeq[section]) return;

			let suggestions = dedupeLocations(results).filter((loc) =>
				String(loc.postal_code || "").startsWith(filtered)
			);

			if (cityNorm.length >= 2) {
				suggestions = suggestions.filter((loc) =>
					normalizeLocationText(loc.place_name).startsWith(cityNorm)
				);
			}

			if (provinceNorm.length === 2) {
				suggestions = suggestions.filter((loc) =>
					normalizeLocationText(getProvinceLabel(loc)) === provinceNorm
				);
			}

			suggestions.sort((a, b) => {
				const aCap = String(a.postal_code || "");
				const bCap = String(b.postal_code || "");
				if (aCap !== bCap) return aCap.localeCompare(bCap);
				return normalizeLocationText(a.place_name).localeCompare(normalizeLocationText(b.place_name));
			});

			setSectionCapSuggestions(section, suggestions.slice(0, 40));
			setProvinceSuggestionsFromLocations(section, suggestions);

			if (filtered.length === 5) {
				const exactCoherent = suggestions.find((loc) =>
					isLocationCoherent(loc, address.city, address.province)
				);
				if (exactCoherent) {
					applyLocationToSection(section, exactCoherent);
				} else if (!address.city && suggestions.length === 1) {
					applyLocationToSection(section, suggestions[0]);
				}
			}
		} catch (error) {
			console.error("CAP autocomplete error:", error);
			setSectionCapSuggestions(section, []);
		}
	}, delay);
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
	} else if (field === 'city') {
		sv.onBlur(key, () => {
			if (!value || !String(value).trim()) sv.setError(key, 'Città è obbligatoria');
			else sv.clearError(key);
		});
		setTimeout(() => setSectionCitySuggestions(section, []), 200);
		void validateAddressLocationLink(section);
	} else if (field === 'postal_code') {
		sv.onBlur(key, () => sv.validateCAP(key, value));
		setTimeout(() => setSectionCapSuggestions(section, []), 200);
		void validateAddressLocationLink(section);
	} else if (field === 'telephone_number') {
		sv.onBlur(key, () => sv.validateTelefono(key, value));
	} else if (field === 'email') {
		sv.onBlur(key, () => sv.validateEmail(key, value));
	} else if (field === 'province') {
		sv.onBlur(key, () => sv.validateProvincia(key, value));
		// Hide autocomplete on blur
		setTimeout(() => {
			setSectionProvinceSuggestions(section, []);
		}, 200);
		void validateAddressLocationLink(section);
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

const validateAddressLocationLink = async (section) => {
	// In modalita' PUDO la destinazione e' gestita dal punto selezionato.
	if (section === "dest" && deliveryMode.value === "pudo") return true;

	const address = getSectionAddress(section);
	const city = String(address.city || "").trim();
	const province = sv.filterProvincia(address.province || "");
	const cap = sv.filterCAP(address.postal_code || "");
	if (!city || !province || cap.length !== 5) return true;

	try {
		const results = dedupeLocations(await sanctumClient(`/api/locations/by-cap?cap=${encodeURIComponent(cap)}`));
		locationLinkHints[section] = results;
		if (!results.length) {
			sv.setError(`${section}_postal_code`, `CAP ${cap} non trovato.`);
			return false;
		}

		const cityNorm = normalizeLocationText(city);
		const provinceNorm = normalizeLocationText(province);
		const exact = results.find((loc) =>
			normalizeLocationText(loc.place_name) === cityNorm &&
			normalizeLocationText(getProvinceLabel(loc)) === provinceNorm
		);

		if (!exact) {
			const cityMatch = results.find((loc) => normalizeLocationText(loc.place_name) === cityNorm);
			const provinceMatch = results.find((loc) => normalizeLocationText(getProvinceLabel(loc)) === provinceNorm);
			const hint = results[0];
			const hintProvince = getProvinceLabel(hint);
			const hintText = hintProvince ? `${hint.place_name} (${hintProvince})` : hint.place_name;

			sv.setError(`${section}_postal_code`, `CAP ${cap} non coerente con città/provincia.`);
			if (!cityMatch) sv.setError(`${section}_city`, `Per CAP ${cap} la città corretta è ${hintText}.`);
			if (!provinceMatch) sv.setError(`${section}_province`, `Provincia non coerente con CAP ${cap}.`);
			return false;
		}

		address.city = exact.place_name || address.city;
		address.province = getProvinceLabel(exact) || address.province;
		sv.clearError(`${section}_city`);
		sv.clearError(`${section}_province`);
		sv.clearError(`${section}_postal_code`);
		locationLinkHints[section] = [];
		return true;
	} catch (error) {
		console.error("Location consistency validation error:", error);
		locationLinkHints[section] = [];
		return true;
	}
};

const validateForm = async () => {
	showValidation.value = true;
	let isValid = true;

	if (!services.value.date) {
		dateError.value = 'Seleziona un giorno di ritiro prima di procedere.';
		isValid = false;
	} else {
		dateError.value = null;
	}

	// Validazione contenuto del pacco
	if (!userStore.contentDescription || !userStore.contentDescription.trim()) {
		contentError.value = 'Il contenuto del pacco è obbligatorio';
		isValid = false;
	} else {
		contentError.value = null;
	}

	// Mark all fields as touched and validate
	const validateRequiredField = (key, value, message) => {
		if (!value || !String(value).trim()) {
			sv.setError(key, message);
			return false;
		}
		sv.clearError(key);
		return true;
	};

	const validateAddr = (section, addr) => {
		const isDestPudoContactOnly = section === 'dest' && deliveryMode.value === 'pudo';
		const commonFields = [
			['full_name', addr.full_name, () => sv.validateNomeCognome(`${section}_full_name`, addr.full_name)],
			['telephone_number', addr.telephone_number, () => sv.validateTelefono(`${section}_telephone_number`, addr.telephone_number)],
		];
		const fullAddressFields = [
			['address', addr.address, () => validateRequiredField(`${section}_address`, addr.address, 'Indirizzo è obbligatorio')],
			['address_number', addr.address_number, () => validateRequiredField(`${section}_address_number`, addr.address_number, 'Numero civico è obbligatorio')],
			['city', addr.city, () => validateRequiredField(`${section}_city`, addr.city, 'Città è obbligatoria')],
			['province', addr.province, () => sv.validateProvincia(`${section}_province`, addr.province)],
			['postal_code', addr.postal_code, () => sv.validateCAP(`${section}_postal_code`, addr.postal_code)],
		];
		const fields = isDestPudoContactOnly ? commonFields : [...commonFields, ...fullAddressFields];

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

	const originLinkOk = await validateAddressLocationLink("origin");
	if (!originLinkOk) isValid = false;

	if (deliveryMode.value !== "pudo") {
		const destLinkOk = await validateAddressLocationLink("dest");
		if (!destLinkOk) isValid = false;
	}

	return isValid;
};

const FIELD_ERROR_ORDER = [
	'origin_full_name',
	'origin_address',
	'origin_address_number',
	'origin_city',
	'origin_province',
	'origin_postal_code',
	'origin_telephone_number',
	'origin_email',
	'dest_full_name',
	'dest_address',
	'dest_address_number',
	'dest_city',
	'dest_province',
	'dest_postal_code',
	'dest_telephone_number',
	'dest_email',
];

const FIELD_ERROR_LABELS = {
	origin_full_name: 'Nome e Cognome partenza',
	origin_address: 'Indirizzo partenza',
	origin_address_number: 'Numero civico partenza',
	origin_city: 'Città partenza',
	origin_province: 'Provincia partenza',
	origin_postal_code: 'CAP partenza',
	origin_telephone_number: 'Telefono partenza',
	origin_email: 'Email partenza',
	dest_full_name: 'Nome e Cognome destinazione',
	dest_address: 'Indirizzo destinazione',
	dest_address_number: 'Numero civico destinazione',
	dest_city: 'Città destinazione',
	dest_province: 'Provincia destinazione',
	dest_postal_code: 'CAP destinazione',
	dest_telephone_number: 'Telefono destinazione',
	dest_email: 'Email destinazione',
};

const FIELD_ERROR_IDS = {
	origin_full_name: 'name',
	origin_address: 'origin_address',
	origin_address_number: 'origin_address_number',
	origin_city: 'origin_city',
	origin_province: 'origin_province',
	origin_postal_code: 'origin_postal_code',
	origin_telephone_number: 'origin_telephone',
	origin_email: 'origin_email',
	dest_full_name: 'dest_name',
	dest_address: 'dest_address',
	dest_address_number: 'dest_address_number',
	dest_city: 'dest_city',
	dest_province: 'dest_province',
	dest_postal_code: 'dest_postal_code',
	dest_telephone_number: 'dest_telephone_number',
	dest_email: 'dest_email',
};

const formErrorSummary = computed(() => {
	const errors = sv.errors?.value || {};
	const keys = Object.keys(errors || {}).sort((a, b) => {
		const aIndex = FIELD_ERROR_ORDER.indexOf(a);
		const bIndex = FIELD_ERROR_ORDER.indexOf(b);
		return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
	});

	return keys
		.filter((key) => Boolean(errors[key]))
		.map((key) => ({
			key,
			message: softenErrorMessage(errors[key]),
			label: FIELD_ERROR_LABELS[key] || key,
			targetId: FIELD_ERROR_IDS[key] || '',
		}));
});

const groupedFormErrors = computed(() => {
	const groups = { origin: [], dest: [], generic: [] };
	for (const item of formErrorSummary.value) {
		if (item.key.startsWith('origin_')) groups.origin.push(item);
		else if (item.key.startsWith('dest_')) groups.dest.push(item);
		else groups.generic.push(item);
	}
	return groups;
});

const sectionsWithErrorsCount = computed(() => {
	let count = 0;
	if (groupedFormErrors.value.origin.length) count += 1;
	if (groupedFormErrors.value.dest.length) count += 1;
	if (groupedFormErrors.value.generic.length) count += 1;
	return count;
});

const showGlobalFormSummary = computed(() => formErrorSummary.value.length > 1 && sectionsWithErrorsCount.value > 1);

const originSectionHint = computed(() => {
	const errors = groupedFormErrors.value.origin;
	if (!errors.length) return '';
	if (errors.length === 1) return `${errors[0].label}: ${errors[0].message}`;
	return `Controlla ${errors.length} campi nella sezione Partenza.`;
});

const destinationSectionHint = computed(() => {
	const errors = groupedFormErrors.value.dest;
	if (!errors.length) return '';
	if (errors.length === 1) return `${errors[0].label}: ${errors[0].message}`;
	return `Controlla ${errors.length} campi nella sezione Destinazione.`;
});

const focusFormError = (errorItem) => {
	const targetId = errorItem?.targetId;
	if (!targetId) return;
	const field = document.getElementById(targetId);
	if (!field) return;
	field.scrollIntoView({ behavior: 'smooth', block: 'center' });
	window.setTimeout(() => {
		field.focus?.();
	}, 120);
};

const focusContentDescriptionField = () => {
	const field = document.getElementById('content_description');
	if (!field) return;
	field.scrollIntoView({ behavior: 'smooth', block: 'center' });
	window.setTimeout(() => {
		field.focus?.();
	}, 120);
};

const focusFirstFormError = () => {
	if (contentError.value) {
		focusContentDescriptionField();
		return;
	}
	const firstError = formErrorSummary.value[0];
	if (!firstError) return;
	focusFormError(firstError);
};

const getFieldError = (section, field) => {
	return sv.getError(`${section}_${field}`);
};

const fieldClass = (section, field) => {
	const key = `${section}_${field}`;
	return sv.hasError(key)
		? 'input-preventivo-step-2 input-preventivo-step-2--warning'
		: 'input-preventivo-step-2';
};

const softenErrorMessage = (message) => {
	const raw = String(message || '').trim();
	if (!raw) return '';

	const exactMap = {
		'Telefono è obbligatorio': 'Inserisci il numero di telefono per continuare.',
		'Solo numeri consentiti': 'Usa solo cifre nel numero di telefono.',
		'Numero troppo corto': 'Il numero sembra incompleto: aggiungi qualche cifra.',
		'Numero troppo lungo': 'Il numero sembra troppo lungo: controlla le cifre.',
		'CAP è obbligatorio': 'Inserisci il CAP per continuare.',
		'Il CAP deve essere di 5 cifre': 'Il CAP deve contenere 5 cifre.',
		'CAP non valido': 'Controlla il CAP inserito.',
		'Inserisci un indirizzo email valido': 'Controlla il formato email (es. nome@email.it).',
		'Nome e Cognome è obbligatorio': 'Inserisci nome e cognome.',
		'Il nome non può contenere numeri': 'Nel nome evita numeri e simboli.',
		'Provincia è obbligatoria': 'Inserisci la sigla della provincia (es. RM, MI).',
		'Inserisci la sigla (2 lettere)': 'Usa la sigla provincia con 2 lettere (es. RM).',
		'Provincia non valida': 'Controlla la sigla provincia inserita.',
		'Città è obbligatoria': 'Inserisci la città.',
		'Campo obbligatorio': 'Completa questo campo per continuare.',
	};

	if (exactMap[raw]) return exactMap[raw];

	if (/^CAP\s+\d{5}\s+non trovato/i.test(raw)) {
		return `${raw}. Verifica il CAP oppure scegli un suggerimento qui sotto.`;
	}
	if (/non coerente con città\/provincia/i.test(raw)) {
		return `${raw}. Ti proponiamo una correzione veloce.`;
	}
	if (/Per CAP\s+\d{5}\s+la città corretta è/i.test(raw)) {
		return raw.replace(/^Per CAP/i, 'Per questo CAP');
	}

	return raw;
};

const fieldErrorText = (section, field) => softenErrorMessage(getFieldError(section, field));

const contentFieldHint = computed(() => {
	if (!contentError.value) return '';
	return 'Ti ho portato qui perché manca il contenuto del pacco. Inseriscilo per continuare.';
});

const normalizeSimpleText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const buildEmailSuggestion = (email) => {
	const raw = String(email || '').trim().toLowerCase();
	if (!raw.includes('@')) return null;
	const [local, domain] = raw.split('@');
	if (!local || !domain) return null;

	const commonFixes = {
		'gmial.com': 'gmail.com',
		'gamil.com': 'gmail.com',
		'gnail.com': 'gmail.com',
		'gmai.com': 'gmail.com',
		'hotnail.com': 'hotmail.com',
		'hotmai.com': 'hotmail.com',
		'outlok.com': 'outlook.com',
		'outllok.com': 'outlook.com',
		'icloud.con': 'icloud.com',
		'yaho.com': 'yahoo.com',
	};

	const fixedDomain = commonFixes[domain];
	if (!fixedDomain) return null;
	return `${local}@${fixedDomain}`;
};

const extractAddressAndNumber = (value) => {
	const raw = normalizeSimpleText(value);
	if (!raw) return null;
	const match = raw.match(/^(.*?)[,\s]+(\d+[a-zA-Z0-9\-\/]*)$/);
	if (!match) return null;
	const street = normalizeSimpleText(match[1]).replace(/[,\s]+$/g, '');
	const number = normalizeSimpleText(match[2]);
	if (!street || !number) return null;
	return { street, number };
};

const getBestLocationCandidate = (section) => {
	const addr = getSectionAddress(section);
	const cap = String(addr.postal_code || '').trim();
	const cityNorm = normalizeLocationText(addr.city || '');
	const provinceNorm = normalizeLocationText(addr.province || '');
	const cityList = section === 'origin' ? originCitySuggestions.value : destCitySuggestions.value;
	const capList = section === 'origin' ? originCapSuggestions.value : destCapSuggestions.value;
	const hintList = locationLinkHints[section] || [];

	let pool = dedupeLocations([...(capList || []), ...(cityList || []), ...(hintList || [])]);
	if (!pool.length) return null;

	if (cap.length === 5) {
		const capMatches = pool.filter((loc) => String(loc.postal_code || '') === cap);
		if (capMatches.length) pool = capMatches;
	}

	pool.sort((a, b) => {
		const aCity = normalizeLocationText(a.place_name);
		const bCity = normalizeLocationText(b.place_name);
		const aProv = normalizeLocationText(getProvinceLabel(a));
		const bProv = normalizeLocationText(getProvinceLabel(b));
		const aScore =
			(aCity === cityNorm ? 3 : 0) +
			(aProv === provinceNorm ? 2 : 0) +
			(cap && String(a.postal_code || '') === cap ? 2 : 0);
		const bScore =
			(bCity === cityNorm ? 3 : 0) +
			(bProv === provinceNorm ? 2 : 0) +
			(cap && String(b.postal_code || '') === cap ? 2 : 0);
		if (aScore !== bScore) return bScore - aScore;
		return String(a.postal_code || '').localeCompare(String(b.postal_code || ''));
	});

	return pool[0] || null;
};

const buildFieldAssist = (section, field) => {
	const error = getFieldError(section, field);
	if (!error) return null;

	const addr = getSectionAddress(section);
	const key = `${section}_${field}`;
	const isDestPudoAddress = section === 'dest' && deliveryMode.value === 'pudo' && ['address', 'address_number', 'city', 'province', 'postal_code'].includes(field);
	if (isDestPudoAddress) return null;

	if (field === 'full_name') {
		const current = String(addr.full_name || '');
		const cleaned = sv.autoCapitalize(current.replace(/[0-9]/g, '').replace(/\s+/g, ' ').trim());
		if (cleaned && cleaned !== current) {
			return {
				label: `Usa "${cleaned}"`,
				apply: () => {
					addr.full_name = cleaned;
					sv.markTouched(key);
					sv.validateNomeCognome(key, cleaned);
				},
			};
		}
	}

	if (field === 'telephone_number') {
		const current = String(addr.telephone_number || '');
		const onlyDigits = current.replace(/[^\d]/g, '').replace(/^39/, '');
		const candidateDigits = onlyDigits.length > 10 ? onlyDigits.slice(0, 10) : onlyDigits;
		if (candidateDigits.length >= 6 && candidateDigits !== onlyDigits) {
			return {
				label: `Correggi numero in ${candidateDigits}`,
				apply: () => {
					addr.telephone_number = candidateDigits;
					sv.markTouched(key);
					sv.validateTelefono(key, candidateDigits);
				},
			};
		}
	}

	if (field === 'email') {
		const current = String(addr.email || '');
		const suggestion = buildEmailSuggestion(current);
		if (suggestion && suggestion !== current.toLowerCase()) {
			return {
				label: `Usa "${suggestion}"`,
				apply: () => {
					addr.email = suggestion;
					sv.markTouched(key);
					sv.validateEmail(key, suggestion);
				},
			};
		}
	}

	if (field === 'address') {
		const parsed = extractAddressAndNumber(addr.address);
		if (parsed && !normalizeSimpleText(addr.address_number)) {
			return {
				label: `Separa civico: ${parsed.street}, ${parsed.number}`,
				apply: () => {
					addr.address = parsed.street;
					addr.address_number = parsed.number;
					sv.markTouched(`${section}_address`);
					sv.markTouched(`${section}_address_number`);
					sv.clearError(`${section}_address`);
					sv.clearError(`${section}_address_number`);
				},
			};
		}
	}

	if (field === 'address_number') {
		const parsed = extractAddressAndNumber(addr.address);
		if (parsed && !normalizeSimpleText(addr.address_number)) {
			return {
				label: `Imposta civico ${parsed.number}`,
				apply: () => {
					addr.address = parsed.street;
					addr.address_number = parsed.number;
					sv.markTouched(`${section}_address`);
					sv.markTouched(`${section}_address_number`);
					sv.clearError(`${section}_address`);
					sv.clearError(`${section}_address_number`);
				},
			};
		}
	}

	if (['city', 'province', 'postal_code'].includes(field)) {
		const candidate = getBestLocationCandidate(section);
		if (!candidate) return null;
		const city = String(candidate.place_name || '').trim();
		const province = getProvinceLabel(candidate);
		const cap = String(candidate.postal_code || '').trim();

		const cityDiff = city && normalizeLocationText(city) !== normalizeLocationText(addr.city || '');
		const provinceDiff = province && normalizeLocationText(province) !== normalizeLocationText(addr.province || '');
		const capDiff = cap && cap !== String(addr.postal_code || '').trim();

		if (cityDiff || provinceDiff || capDiff) {
			const labelParts = [];
			if (cityDiff) labelParts.push(city);
			if (provinceDiff) labelParts.push(province);
			if (capDiff) labelParts.push(cap);

			return {
				label: `Applica correzione: ${labelParts.join(' · ')}`,
				apply: () => {
					applyLocationToSection(section, candidate);
					sv.markTouched(`${section}_city`);
					sv.markTouched(`${section}_province`);
					sv.markTouched(`${section}_postal_code`);
				},
			};
		}
	}

	return null;
};

const fieldAssistMap = computed(() => {
	const map = {};
	const fields = ['full_name', 'address', 'address_number', 'city', 'province', 'postal_code', 'telephone_number', 'email'];
	['origin', 'dest'].forEach((section) => {
		fields.forEach((field) => {
			map[`${section}_${field}`] = buildFieldAssist(section, field);
		});
	});
	return map;
});

const getFieldAssist = (section, field) => fieldAssistMap.value[`${section}_${field}`] || null;

const applyFieldAssist = (section, field) => {
	const suggestion = getFieldAssist(section, field);
	if (!suggestion?.apply) return;
	suggestion.apply();
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
	// In modalita' PUDO aggiorniamo solo i campi indirizzo readonly.
	// I campi contatto restano modificabili dall'utente.
	destinationAddress.value.address = pudo.address || '';
	destinationAddress.value.address_number = 'SNC';
	destinationAddress.value.city = pudo.city || '';
	destinationAddress.value.postal_code = pudo.zip_code || '';
	destinationAddress.value.province = pudo.province || 'ND';
	const selectedPudoName = normalizeLocationText(pudo?.name || '');
	const currentDestName = normalizeLocationText(destinationAddress.value.full_name || '');
	// Evita che il nome del punto BRT finisca nel campo destinatario persona.
	if (selectedPudoName && currentDestName && selectedPudoName === currentDestName) {
		destinationAddress.value.full_name = '';
	}
	userStore.shipmentDetails = {
		...(userStore.shipmentDetails || {}),
		destination_city: pudo.city || destinationAddress.value.city || "",
		destination_postal_code: pudo.zip_code || destinationAddress.value.postal_code || "",
	};
};

// Quando l'utente deseleziona il punto PUDO, puliamo lo store
// e svuotiamo i campi destinazione per permettere l'inserimento manuale
const onPudoDeselected = () => {
	userStore.selectedPudo = null;
	// Ripristiniamo solo il blocco indirizzo.
	destinationAddress.value.address = '';
	destinationAddress.value.address_number = '';
	destinationAddress.value.city = session.value?.data?.shipment_details?.destination_city || '';
	destinationAddress.value.postal_code = session.value?.data?.shipment_details?.destination_postal_code || '';
	destinationAddress.value.province = '';
};

// Quando si cambia modalità consegna, resettiamo il PUDO se si torna a domicilio
watch(deliveryMode, (newMode) => {
	if (newMode === 'home') {
		userStore.selectedPudo = null;
		return;
	}
	[
		'dest_address',
		'dest_address_number',
		'dest_city',
		'dest_province',
		'dest_postal_code',
	].forEach((fieldKey) => sv.clearError(fieldKey));
});
const dateError = ref(null);
const contentError = ref(null);
const focusPickupDateSection = () => {
	nextTick(() => {
		const sectionEl = pickupDateSectionRef.value;
		if (sectionEl && typeof sectionEl.scrollIntoView === 'function') {
			sectionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
		const firstDateInput = document.querySelector('[id^="date-"]');
		if (firstDateInput && typeof firstDateInput.focus === 'function') {
			firstDateInput.focus({ preventScroll: true });
		}
	});
};

const editablePackages = computed(() => {
	// In modalita' modifica carrello, usa i pacchi dallo store se la sessione non li ha
	if (editCartId && userStore.packages?.length > 0 && !session.value?.data?.packages?.length) {
		return userStore.packages;
	}

	// Prova prima la sessione
	if (session.value?.data?.packages?.length) {
		return session.value.data.packages;
	}

	// Poi lo store
	if (userStore.packages?.length) {
		return userStore.packages;
	}

	// FALLBACK: localStorage (salvato dal preventivo)
	try {
		const saved = localStorage.getItem('spedizionefacile_packages');
		if (saved) {
			const packages = JSON.parse(saved);
			if (packages?.length) {
				return packages;
			}
		}
	} catch (e) {
		console.error('Errore lettura localStorage:', e);
	}

	return [];
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
	if (!userStore.contentDescription || !String(userStore.contentDescription).trim()) {
		contentError.value = 'Il contenuto del pacco è obbligatorio';
		nextTick(() => {
			focusContentDescriptionField();
		});
		return;
	}

	if (!services.value.date) {
		dateError.value = 'Seleziona un giorno di ritiro prima di procedere.';
		focusPickupDateSection();
		return;
	}
	contentError.value = null;
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

// Action handlers moved to /riepilogo page

const { endpoint, refresh: refreshCart } = useCart();
const { isAuthenticated } = useSanctumAuth();

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

const stepsRef = ref(null);
const stepsVisible = ref(true);
let stepsObserver = null;
let stepsVisibilityRaf = null;

const parsePriceAmount = (value) => {
	if (value === null || value === undefined) return null;
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : null;
	}

	const raw = String(value).trim();
	if (!raw) return null;

	let normalized = raw.replace(/[€\s]/g, "");
	if (normalized.includes(",") && normalized.includes(".")) {
		if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
			normalized = normalized.replace(/\./g, "").replace(",", ".");
		} else {
			normalized = normalized.replace(/,/g, "");
		}
	} else if (normalized.includes(",")) {
		normalized = normalized.replace(",", ".");
	}

	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
};

const formatPriceAmount = (amount) => Number(amount).toFixed(2).replace(".", ",");

const pickBestPriceAmount = (candidates) => {
	const valid = candidates.filter((v) => v !== null && Number.isFinite(v));
	const positive = valid.find((v) => v > 0);
	if (positive !== undefined) return positive;
	return valid.length ? valid[0] : 0;
};

const normalizePackagePrice = (rawAmount) => {
	const amount = Number(rawAmount) || 0;
	if (!amount) return 0;
	// Nei payload legacy single_price puo' essere in centesimi.
	return amount > 1000 ? amount / 100 : amount;
};

const getPersistedStoreTotalPrice = () => {
	if (!process.client) return null;
	try {
		const raw = sessionStorage.getItem("spedizionefacile_user_store");
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return parsePriceAmount(parsed?.totalPrice);
	} catch {
		return null;
	}
};

const getPackageLineAmount = (pack) => {
	const single = parsePriceAmount(pack?.single_price);
	if (single !== null && single > 0) return normalizePackagePrice(single);

	const singleOrig = parsePriceAmount(pack?.single_priceOrig);
	if (singleOrig !== null && singleOrig > 0) return normalizePackagePrice(singleOrig);

	const weightPrice = parsePriceAmount(pack?.weight_price) || 0;
	const volumePrice = parsePriceAmount(pack?.volume_price) || 0;
	const base = Math.max(weightPrice, volumePrice);
	if (base <= 0) return 0;

	const qty = Number(pack?.quantity) || 1;
	return base * qty;
};

const getPackagesTotal = (packages) => {
	if (!Array.isArray(packages) || !packages.length) return null;
	const total = packages.reduce((sum, pack) => sum + getPackageLineAmount(pack), 0);
	return total > 0 ? total : null;
};

// Prezzo totale dal pacco in modifica.
const editCartTotalPrice = computed(() => {
	if (!editCartId || !userStore.packages?.length) return null;
	const rawTotal = userStore.packages.reduce((sum, p) => sum + (Number(p.single_price) || 0), 0);
	if (!rawTotal) return null;
	return formatPriceAmount(normalizePackagePrice(rawTotal));
});

const summaryPackageLabel = computed(() => {
	const count = editablePackages.value.length;
	return `${count} ${count === 1 ? "collo" : "colli"}`;
});

const normalizePackageTypeLabel = (value) => {
	if (!value) return "pacco";
	return String(value).trim().toLowerCase();
};

const packageTypeVisualMap = {
	pacco: { label: "Pacco", icon: "/img/quote/first-step/pack.png" },
	pallet: { label: "Pallet", icon: "/img/quote/first-step/pallet.png" },
	valigia: { label: "Valigia", icon: "/img/quote/first-step/suitcase.png" },
	busta: { label: "Busta", icon: "/img/quote/first-step/envelope.png" },
	wallet: { label: "Wallet", icon: "/img/quote/first-step/suitcase.png" },
};

const getPackageTypeLabel = (pack) => {
	const normalized = normalizePackageTypeLabel(pack?.package_type || "Pacco");
	const mapped = packageTypeVisualMap[normalized];
	if (mapped?.label) return mapped.label;
	return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Pacco";
};

const getPackageTypeIcon = (pack) => {
	const normalized = normalizePackageTypeLabel(pack?.package_type || "Pacco");
	const mapped = packageTypeVisualMap[normalized];
	return mapped?.icon || packageTypeVisualMap.pacco.icon;
};

const summaryPackageTypeInfo = computed(() => {
	const types = (editablePackages.value || [])
		.map((pack) => normalizePackageTypeLabel(pack?.package_type || "Pacco"))
		.filter(Boolean);

	if (!types.length) {
		return packageTypeVisualMap.pacco;
	}

	const uniqueTypes = [...new Set(types)];
	if (uniqueTypes.length === 1) {
		const match = packageTypeVisualMap[uniqueTypes[0]];
		if (match) return match;

		const normalized = uniqueTypes[0];
		const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);
		return { label, icon: packageTypeVisualMap.pacco.icon };
	}

	return { label: "Misto", icon: packageTypeVisualMap.pacco.icon };
});

const summaryOriginCity = computed(() => {
	const liveCity = String(originAddress.value?.city || '').trim();
	if (liveCity) return liveCity;
	if (showAddressFields.value || route.query.step === 'ritiro') return '—';
	return (
		userStore.originAddressData?.city
		|| userStore.shipmentDetails?.origin_city
		|| session.value?.data?.shipment_details?.origin_city
		|| '—'
	);
});

const summaryDestinationCity = computed(() => {
	const pudoCity = String(userStore.selectedPudo?.city || '').trim();
	if (pudoCity) return pudoCity;

	const liveCity = String(destinationAddress.value?.city || '').trim();
	if (liveCity) return liveCity;
	if (showAddressFields.value || route.query.step === 'ritiro') return '—';
	return (
		userStore.destinationAddressData?.city
		|| userStore.shipmentDetails?.destination_city
		|| session.value?.data?.shipment_details?.destination_city
		|| '—'
	);
});

const summaryRouteLabel = computed(() => `${summaryOriginCity.value} → ${summaryDestinationCity.value}`);
const normalizeRouteText = (value) => normalizeLocationText(String(value || '').replace(/\s+/g, ' '));
const normalizeRouteNumber = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '');
const routeConsistencyState = computed(() => {
	const originCity = normalizeRouteText(originAddress.value?.city);
	const destinationCity = normalizeRouteText(
		userStore.selectedPudo?.city
		|| destinationAddress.value?.city
		|| userStore.shipmentDetails?.destination_city
	);
	if (!originCity || !destinationCity) {
		return { blocking: false, warning: false, message: '' };
	}

	const originCap = String(originAddress.value?.postal_code || '').trim();
	const destinationCap = String(
		userStore.selectedPudo?.zip_code
		|| destinationAddress.value?.postal_code
		|| userStore.shipmentDetails?.destination_postal_code
		|| ''
	).trim();
	const sameCity = originCity === destinationCity;
	const sameCap = !!originCap && !!destinationCap && originCap === destinationCap;

	const originStreet = normalizeRouteText(originAddress.value?.address);
	const destinationStreet = normalizeRouteText(
		userStore.selectedPudo?.address
		|| destinationAddress.value?.address
	);
	const originNumber = normalizeRouteNumber(originAddress.value?.address_number);
	const destinationNumber = normalizeRouteNumber(
		userStore.selectedPudo ? 'SNC' : destinationAddress.value?.address_number
	);
	const sameAddress =
		sameCity
		&& sameCap
		&& !!originStreet
		&& !!destinationStreet
		&& originStreet === destinationStreet
		&& !!originNumber
		&& !!destinationNumber
		&& originNumber === destinationNumber;

	if (sameAddress) {
		return {
			blocking: true,
			warning: true,
			message: 'Partenza e destinazione coincidono. Inserisci una destinazione diversa prima di continuare.',
		};
	}

	if (sameCity && sameCap) {
		return {
			blocking: false,
			warning: true,
			message: 'Tratta locale: verifica disponibilità del servizio BRT per questa combinazione di indirizzi.',
		};
	}

	return { blocking: false, warning: false, message: '' };
});
const routeWarningMessage = computed(() => (routeConsistencyState.value.warning ? routeConsistencyState.value.message : ''));
const summaryServicesLabel = computed(() => {
	const selected = Array.isArray(userStore.servicesArray) ? userStore.servicesArray.filter(Boolean) : [];
	return selected.length ? selected.join(", ") : "Nessun servizio";
});
const summaryServicesItems = computed(() => {
	const selected = Array.isArray(userStore.servicesArray) ? userStore.servicesArray.filter(Boolean) : [];
	return selected.length ? selected : ["Nessun servizio selezionato"];
});

const normalizeDimensionValue = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getPackageDimensionLabel = (pack) => {
	const side1 = normalizeDimensionValue(pack?.first_size ?? pack?.length);
	const side2 = normalizeDimensionValue(pack?.second_size ?? pack?.width);
	const side3 = normalizeDimensionValue(pack?.third_size ?? pack?.height);
	if (!side1 || !side2 || !side3) return null;
	return `${side1}×${side2}×${side3} cm`;
};

const summaryDimensionsLabel = computed(() => {
	const dimensionRows = [];
	for (const pack of editablePackages.value || []) {
		const label = getPackageDimensionLabel(pack);
		if (!label) continue;
		const qty = Math.max(1, Number(pack?.quantity) || 1);
		dimensionRows.push({ label, qty });
	}

	if (!dimensionRows.length) return "—";

	const totalQty = dimensionRows.reduce((sum, item) => sum + item.qty, 0);
	const primary = dimensionRows[0].label;

	if (dimensionRows.length === 1 && totalQty === 1) return primary;
	if (dimensionRows.length === 1) return `${primary} × ${totalQty}`;
	return `${primary} +${Math.max(totalQty - 1, 1)}`;
});
const summaryDimensionsItems = computed(() => {
	const grouped = new Map();
	for (const pack of (editablePackages.value || [])) {
		const dimensionLabel = getPackageDimensionLabel(pack) || "Misure non definite";
		const qty = Math.max(1, Number(pack?.quantity) || 1);
		const typeLabel = getPackageTypeLabel(pack);
		const groupKey = `${normalizePackageTypeLabel(typeLabel)}|${dimensionLabel}`;
		if (!grouped.has(groupKey)) {
			grouped.set(groupKey, {
				type: typeLabel,
				dimension: dimensionLabel,
				icon: getPackageTypeIcon(pack),
				count: 0,
			});
		}
		const current = grouped.get(groupKey);
		current.count += qty;
	}

	const rows = Array.from(grouped.values()).map((item) => ({
		label: item.count > 1 ? `${item.count}x ${item.type}: ${item.dimension}` : `${item.type}: ${item.dimension}`,
		icon: item.icon,
		type: item.type,
	}));

	return rows.length
		? rows
		: [{ label: "Misure non disponibili", icon: packageTypeVisualMap.pacco.icon, type: "Pacco" }];
});

const canExpandSummaryServices = computed(() =>
	summaryServicesItems.value.length > 1 || summaryServicesLabel.value.length > 26
);
const canExpandSummaryDimensions = computed(() =>
	summaryDimensionsItems.value.length > 1 || summaryDimensionsLabel.value.length > 20
);

const summaryTotalPrice = computed(() => {
	const sessionAmount = parsePriceAmount(session.value?.data?.total_price);
	const storeAmount = parsePriceAmount(userStore.totalPrice);
	const persistedStoreAmount = getPersistedStoreTotalPrice();
	const editAmount = parsePriceAmount(editCartTotalPrice.value);
	const pendingAmount = getPackagesTotal(userStore.pendingShipment?.packages);
	const editableAmount = getPackagesTotal(editablePackages.value);
	const storePackagesAmount = getPackagesTotal(userStore.packages);

	const bestAmount = pickBestPriceAmount([
		sessionAmount,
		storeAmount,
		persistedStoreAmount,
		pendingAmount,
		storePackagesAmount,
		editAmount,
		editableAmount,
	]);

	return formatPriceAmount(bestAmount);
});

const currentShipmentStep = computed(() => (
	showAddressFields.value || route.query.step === "ritiro" ? 3 : 2
));

const summaryMiniSteps = computed(() => {
	const defs = [
		{ id: 1, label: "Misure", to: "/#preventivo" },
		{ id: 2, label: "Servizi", to: "/la-tua-spedizione/2" },
		{ id: 3, label: "Indirizzi", to: "/la-tua-spedizione/2?step=ritiro" },
		{ id: 4, label: "Conferma", to: "/riepilogo" },
		{ id: 5, label: "Pagamento", to: "/checkout" },
	];

	return defs.map((step) => {
		const isActive = step.id === currentShipmentStep.value;
		const isCompleted = step.id < currentShipmentStep.value;
		return {
			...step,
			isActive,
			isCompleted,
			isClickable: isCompleted,
		};
	});
});

const showSummaryMiniSteps = computed(() => currentStep.value === 2 && !stepsVisible.value);

const goToSummaryMiniStep = async (step) => {
	if (!step?.isClickable) return;
	await navigateTo(step.to);
};

const updateStepsVisibility = () => {
	if (!process.client || !stepsRef.value) return;
	const rect = stepsRef.value.getBoundingClientRect();
	const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
	const stickyOffset = 92;
	const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, stickyOffset);
	stepsVisible.value = visibleHeight > 22 && rect.bottom > stickyOffset;
};

const scheduleStepsVisibilityUpdate = () => {
	if (!process.client) return;
	if (stepsVisibilityRaf) cancelAnimationFrame(stepsVisibilityRaf);
	stepsVisibilityRaf = requestAnimationFrame(() => {
		updateStepsVisibility();
		stepsVisibilityRaf = null;
	});
};

const teardownStepsVisibilityObserver = () => {
	if (!process.client) return;
	window.removeEventListener("scroll", scheduleStepsVisibilityUpdate);
	window.removeEventListener("resize", scheduleStepsVisibilityUpdate);
	if (stepsVisibilityRaf) {
		cancelAnimationFrame(stepsVisibilityRaf);
		stepsVisibilityRaf = null;
	}
	if (stepsObserver) {
		stepsObserver.disconnect();
		stepsObserver = null;
	}
};

const initStepsVisibilityObserver = () => {
	if (!process.client || !stepsRef.value) return;
	teardownStepsVisibilityObserver();

	if ("IntersectionObserver" in window) {
		stepsObserver = new IntersectionObserver(
			() => {
				scheduleStepsVisibilityUpdate();
			},
			{
				root: null,
				threshold: [0, 0.01, 0.05],
				rootMargin: "-92px 0px 0px 0px",
			}
		);
		stepsObserver.observe(stepsRef.value);
	}

	window.addEventListener("scroll", scheduleStepsVisibilityUpdate, { passive: true });
	window.addEventListener("resize", scheduleStepsVisibilityUpdate);
	scheduleStepsVisibilityUpdate();
};

onMounted(() => {
	document.addEventListener("click", handleTopDropdownClickOutside, true);
	document.addEventListener("keydown", handleTopDropdownEsc);
	nextTick(() => initStepsVisibilityObserver());
	// Non bloccare il rendering iniziale del riepilogo con una chiamata rete.
	refresh().catch((err) => {
		console.error("Errore refresh sessione step 2:", err);
	});

	if (editCartId) {
		loadCartItemForEdit();
	}
});

onBeforeUnmount(() => {
	document.removeEventListener("click", handleTopDropdownClickOutside, true);
	document.removeEventListener("keydown", handleTopDropdownEsc);
	teardownStepsVisibilityObserver();
});

// --- SPEDIZIONI CONFIGURATE (DATI DEFAULT) ---
// Permette di caricare indirizzi da spedizioni precedentemente salvate
const showDefaultDropdown = ref(false);
const showDefaultDropdownTarget = ref("origin");
const savedConfigs = ref([]);
const loadingConfigs = ref(false);
const savedConfigsLoaded = ref(false);

const closeTopDropdowns = () => {
	showDefaultDropdown.value = false;
	showDefaultDropdownTarget.value = "origin";
	showOriginAddressSelector.value = false;
	showDestAddressSelector.value = false;
	showOriginGuestPrompt.value = false;
	showDestGuestPrompt.value = false;
	showOriginConfigGuestPrompt.value = false;
	showDestConfigGuestPrompt.value = false;
};

const handleTopDropdownClickOutside = (event) => {
	const target = event?.target;
	const insideDefaultOrigin = defaultDropdownRef.value?.contains?.(target);
	const insideDefaultDest = destDefaultDropdownRef.value?.contains?.(target);
	const insideOrigin = originSelectorRef.value?.contains?.(target);
	const insideDest = destSelectorRef.value?.contains?.(target);
	if (!insideDefaultOrigin && !insideDefaultDest && !insideOrigin && !insideDest) {
		closeTopDropdowns();
	}
};

const handleTopDropdownEsc = (event) => {
	if (event.key === "Escape") {
		closeTopDropdowns();
	}
};

const loadSavedConfigs = async (targetSection = "origin") => {
	if (!isAuthenticated.value) {
		if (targetSection === "origin") {
			showOriginConfigGuestPrompt.value = !showOriginConfigGuestPrompt.value;
			showDestConfigGuestPrompt.value = false;
		} else {
			showDestConfigGuestPrompt.value = !showDestConfigGuestPrompt.value;
			showOriginConfigGuestPrompt.value = false;
		}
		showOriginAddressSelector.value = false;
		showDestAddressSelector.value = false;
		showOriginGuestPrompt.value = false;
		showDestGuestPrompt.value = false;
		return;
	}

	showOriginConfigGuestPrompt.value = false;
	showDestConfigGuestPrompt.value = false;
	if (showDefaultDropdown.value && showDefaultDropdownTarget.value === targetSection) {
		showDefaultDropdown.value = false;
		return;
	}
	showOriginAddressSelector.value = false;
	showDestAddressSelector.value = false;
	showOriginGuestPrompt.value = false;
	showDestGuestPrompt.value = false;
	showDefaultDropdownTarget.value = targetSection;

	if (savedConfigsLoaded.value) {
		showDefaultDropdown.value = true;
		return;
	}
	loadingConfigs.value = true;
	try {
		const result = await sanctumClient("/api/saved-shipments");
		savedConfigs.value = result?.data || [];
		savedConfigsLoaded.value = true;
		showDefaultDropdown.value = true;
	} catch (e) {
		console.error("Errore caricamento configurazioni:", e);
	} finally {
		loadingConfigs.value = false;
	}
};

const applyConfigToOrigin = (configAddress) => {
	if (!configAddress) return;
	originAddress.value.full_name = configAddress.name || "";
	originAddress.value.address = configAddress.address || "";
	originAddress.value.address_number = configAddress.address_number || "";
	originAddress.value.city = configAddress.city || "";
	originAddress.value.postal_code = configAddress.postal_code || "";
	originAddress.value.province = configAddress.province || "";
	originAddress.value.telephone_number = configAddress.telephone_number || "";
	originAddress.value.email = configAddress.email || "";
	originAddress.value.additional_information = configAddress.additional_information || "";
	originAddress.value.intercom_code = configAddress.intercom_code || "";
	originFromSaved.value = true;
	originSaveSuccess.value = false;
	originSavedSnapshot.value = JSON.stringify(originAddress.value);
};

const applyConfigToDestination = (configAddress) => {
	if (!configAddress) return;
	// In modalita' PUDO aggiorniamo solo il blocco contatto.
	const contactOnly = deliveryMode.value === "pudo";
	destinationAddress.value.full_name = configAddress.name || destinationAddress.value.full_name || "";
	destinationAddress.value.telephone_number = configAddress.telephone_number || destinationAddress.value.telephone_number || "";
	destinationAddress.value.email = configAddress.email || destinationAddress.value.email || "";
	destinationAddress.value.additional_information = configAddress.additional_information || destinationAddress.value.additional_information || "";

	if (!contactOnly) {
		destinationAddress.value.address = configAddress.address || "";
		destinationAddress.value.address_number = configAddress.address_number || "";
		destinationAddress.value.city = configAddress.city || "";
		destinationAddress.value.postal_code = configAddress.postal_code || "";
		destinationAddress.value.province = configAddress.province || "";
		destinationAddress.value.intercom_code = configAddress.intercom_code || "";
	}

	destFromSaved.value = true;
	destSaveSuccess.value = false;
	destSavedSnapshot.value = JSON.stringify(destinationAddress.value);
};

const applyConfig = (item, targetSection = "origin") => {
	if (item.origin_address && (targetSection === "origin" || targetSection === "both")) {
		applyConfigToOrigin(item.origin_address);
	}
	if (item.destination_address && (targetSection === "dest" || targetSection === "both")) {
		applyConfigToDestination(item.destination_address);
	}
	showDefaultDropdown.value = false;
	showOriginConfigGuestPrompt.value = false;
	showDestConfigGuestPrompt.value = false;
};
const router = useRouter();
const uiFeedback = useUiFeedback();

const isSubmitting = ref(false);
const submitError = ref(null);

// Summary box collapsabile
const summaryExpanded = ref(false); // Chiuso di default per UX pulita
const summaryDetailPanel = ref(null);

const toggleSummaryDetailPanel = (panel) => {
	summaryDetailPanel.value = summaryDetailPanel.value === panel ? null : panel;
};

watch(summaryExpanded, (isOpen) => {
	if (!isOpen) summaryDetailPanel.value = null;
	scheduleStepsVisibilityUpdate();
});

watch(
	() => stepsRef.value,
	(el) => {
		if (!process.client || !el) return;
		nextTick(() => initStepsVisibilityObserver());
	},
	{ flush: "post" }
);

watch(
	() => status.value,
	(newStatus) => {
		if (!process.client || newStatus === "pending") return;
		nextTick(() => initStepsVisibilityObserver());
	}
);

// Funzioni per animazione accordion
const onAccordionEnter = (el) => {
	el.style.height = '0';
	el.style.overflow = 'hidden';
};

const onAccordionAfterEnter = (el) => {
	el.style.height = 'auto';
	el.style.overflow = 'visible';
};

const onAccordionLeave = (el) => {
	el.style.height = el.scrollHeight + 'px';
	el.style.overflow = 'hidden';
	requestAnimationFrame(() => {
		el.style.height = '0';
	});
};

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
	if (!(await validateForm())) {
		nextTick(() => {
			if (dateError.value && !services.value.date) {
				focusPickupDateSection();
				return;
			}
			focusFirstFormError();
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

	if (userStore.deliveryMode === 'pudo' && userStore.selectedPudo) {
		const recipientNameNorm = normalizeLocationText(destinationAddress.value.full_name || '');
		const pudoNameNorm = normalizeLocationText(userStore.selectedPudo?.name || '');
		if (recipientNameNorm && pudoNameNorm && recipientNameNorm === pudoNameNorm) {
			submitError.value = "Nel campo Nome e Cognome inserisci il destinatario (persona), non il nome del Punto BRT.";
			nextTick(() => {
				document.getElementById('dest_name')?.focus();
			});
			return;
		}
	}

	if (routeConsistencyState.value.blocking) {
		submitError.value = routeConsistencyState.value.message;
		nextTick(() => {
			document.getElementById('dest_address')?.focus();
		});
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
		sms_email_notification: smsEmailNotification.value,
	};

	// Store in userStore for riepilogo page and backward navigation
	userStore.pendingShipment = payload;
	userStore.originAddressData = { ...originAddress.value };
	userStore.destinationAddressData = { ...destinationAddress.value };
	userStore.pickupDate = services.value.date || "";
	userStore.smsEmailNotification = smsEmailNotification.value;

	// Se stiamo modificando un pacco dal carrello, manteniamo l'ID
	if (editCartId) {
		userStore.editingCartItemId = editCartId;
	}

	// Feedback unificato prima della navigazione
	uiFeedback.success('Dati salvati', 'Reindirizzamento al riepilogo...', { timeout: 2000 });

	// Piccolo delay per permettere al toast di essere visibile
	await new Promise(resolve => setTimeout(resolve, 300));

	navigateTo('/riepilogo');
};

</script>

<template>
	<section>
		<div class="my-container mt-[72px] mb-[120px]">
			<div v-if="status === 'pending' || loadingEditData" class="min-h-[720px] bg-[#E4E4E4] rounded-[16px] animate-pulse"></div>
			<form v-else ref="formRef" @submit.prevent="continueToCart">
				<div ref="stepsRef">
					<Steps :current-step="currentShipmentStep - 1" />
				</div>

				<!-- Popup servizi (sempre disponibile, anche dal riepilogo) -->
				<UModal
					:dismissible="true"
					v-model:open="open"
					:title="selectedService?.name"
					:description="selectedService?.description"
					:aria-describedby="undefined"
					:close="false"
					:class="{
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
								<input type="text" id="contrassegno_importo" v-model="serviceData.contrassegno.importo" class="input-popup bg-white" placeholder="0.00€" />
							</div>
							<div>
								<label for="contrassegno_incasso" class="label-popup">Modalità di incasso</label>
								<select id="contrassegno_incasso" v-model="serviceData.contrassegno.modalita_incasso" class="input-popup bg-white">
									<option value="">Seleziona modalità</option>
									<option value="contanti">Contanti</option>
									<option value="assegno">Assegno bancario</option>
									<option value="assegno_circolare">Assegno circolare</option>
								</select>
							</div>
							<div>
								<label for="contrassegno_rimborso" class="label-popup">Modalità di rimborso</label>
								<select id="contrassegno_rimborso" v-model="serviceData.contrassegno.modalita_rimborso" class="input-popup bg-white">
									<option value="">Seleziona modalità</option>
									<option value="bonifico">Bonifico bancario</option>
									<option value="assegno">Assegno</option>
								</select>
							</div>
							<div>
								<label for="contrassegno_dettaglio" class="label-popup">Dettaglio modalità rimborso</label>
								<input type="text" id="contrassegno_dettaglio" v-model="serviceData.contrassegno.dettaglio_rimborso" class="input-popup bg-white" placeholder="IBAN o dettagli rimborso" />
							</div>
						</div>

						<!-- Assicurazione -->
						<div v-if="selectedService?.index === 2">
							<ul>
								<li v-for="(pack, indexPopup) in session?.data?.packages" :key="indexPopup" class="mt-[20px] first:mt-0">
									<label :for="'pack_value_'+indexPopup" class="label-popup">
										Valore collo #{{ indexPopup + 1 }} - {{ pack.weight }} Kg - ({{ pack.first_size }} x {{ pack.second_size }} x {{ pack.third_size }} ) cm
									</label>
									<input type="text" :id="'pack_value_'+indexPopup" v-model="serviceData.assicurazione[indexPopup]" class="input-popup bg-white" placeholder="0.00" />
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
								<select :id="'day_'+dayIndex" class="border-[0.2px] border-[#ABABAB] rounded-[8px] h-[36px] leading-[36px] pl-[18px] w-full mt-[10px] text-[0.875rem] font-medium text-[#767676] bg-white">
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

				<!-- Summary Box Collapsabile STICKY -->
				<div v-if="currentStep === 2" class="sticky top-0 z-30 mb-[20px] font-montserrat">
					<div class="summary-sticky-card bg-white rounded-[16px] shadow-lg overflow-hidden border border-[#D0D0D0]">
								<div class="summary-header-main">
									<div class="summary-top-row">
										<span class="summary-top-label">Riepilogo</span>
										<div v-if="showSummaryMiniSteps" class="summary-mini-steps-row">
											<button
												v-for="stepItem in summaryMiniSteps"
												:key="stepItem.id"
												type="button"
												class="summary-mini-step"
												:class="{
													'is-active': stepItem.isActive,
													'is-completed': stepItem.isCompleted && !stepItem.isActive,
													'is-disabled': !stepItem.isClickable && !stepItem.isActive
												}"
												:disabled="!stepItem.isClickable && !stepItem.isActive"
												:aria-disabled="(!stepItem.isClickable && !stepItem.isActive) ? 'true' : 'false'"
												:aria-current="stepItem.isActive ? 'step' : undefined"
												@click.stop="goToSummaryMiniStep(stepItem)">
												{{ stepItem.id }}. {{ stepItem.label }}
											</button>
										</div>
									</div>

									<button
										type="button"
										@click="summaryExpanded = !summaryExpanded"
										class="summary-toggle-button w-full cursor-pointer"
										:aria-expanded="summaryExpanded ? 'true' : 'false'">
										<div class="summary-overview-grid">
											<div class="summary-overview-item">
												<span class="summary-overview-label">Colli</span>
												<span class="summary-overview-value summary-overview-packages-value">
													<NuxtImg
														:src="summaryPackageTypeInfo.icon"
														:alt="summaryPackageTypeInfo.label"
														:title="`Tipologia collo: ${summaryPackageTypeInfo.label}`"
														width="16"
														height="16"
														loading="lazy"
														decoding="async"
														class="summary-package-type-icon" />
													<span class="summary-overview-packages-text">{{ summaryPackageLabel }}</span>
													<span class="summary-overview-packages-separator">·</span>
													<span class="summary-overview-packages-type">{{ summaryPackageTypeInfo.label }}</span>
												</span>
											</div>

											<div class="summary-overview-item">
												<span class="summary-overview-label">Misure</span>
												<span class="summary-overview-value summary-overview-truncate">{{ summaryDimensionsLabel }}</span>
											</div>

											<div class="summary-overview-route">
												<span class="summary-overview-label">Tratta</span>
												<span class="summary-overview-value summary-overview-truncate">{{ summaryRouteLabel }}</span>
											</div>

											<div class="summary-overview-total">
												<span class="summary-overview-total-label">Totale</span>
												<span class="summary-overview-total-value">{{ summaryTotalPrice }}€</span>
											</div>
										</div>

										<span class="summary-chevron-wrap">
											<svg
												width="20"
												height="20"
												viewBox="0 0 24 24"
												fill="none"
												stroke="#095866"
												stroke-width="2.5"
												stroke-linecap="round"
												stroke-linejoin="round"
												class="summary-chevron-icon flex-shrink-0"
												:class="{ 'is-open': summaryExpanded }">
												<polyline points="6 9 12 15 18 9"/>
											</svg>
										</span>
									</button>
									<div v-if="routeWarningMessage" class="summary-route-warning ux-alert ux-alert--soft">
										<svg xmlns="http://www.w3.org/2000/svg" class="ux-alert__icon" viewBox="0 0 24 24"><path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2z"/><path fill="currentColor" d="M1 21h22L12 2z"/></svg>
										<span>{{ routeWarningMessage }}</span>
									</div>
								</div>

								<!-- Contenuto espandibile -->
								<Transition
									name="accordion"
									@enter="onAccordionEnter"
									@after-enter="onAccordionAfterEnter"
									@leave="onAccordionLeave">
									<div v-show="summaryExpanded" class="accordion-content">
										<div class="summary-details-row">
											<div class="summary-detail-item">
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2">
													<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
													<circle cx="12" cy="10" r="3"/>
												</svg>
												<span class="summary-detail-label">Da</span>
												<span class="summary-detail-value summary-detail-truncate">{{ summaryOriginCity }} → {{ summaryDestinationCity }}</span>
											</div>

											<div class="summary-detail-item">
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2">
													<path d="M4 20h16M6 20V8m12 12V8M6 8h12M10 8v4m4-4v4"/>
												</svg>
												<span class="summary-detail-label">Misure</span>
												<span class="summary-detail-value summary-detail-truncate">{{ summaryDimensionsLabel }}</span>
												<button
													v-if="canExpandSummaryDimensions"
													type="button"
													class="summary-detail-more"
													@click.stop="toggleSummaryDetailPanel('dimensions')">
													{{ summaryDetailPanel === 'dimensions' ? 'Chiudi' : 'Vedi' }}
												</button>
											</div>

											<div class="summary-detail-item">
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2">
													<path d="M8 6h12M8 12h12M8 18h12"/>
													<circle cx="4" cy="6" r="1"/>
													<circle cx="4" cy="12" r="1"/>
													<circle cx="4" cy="18" r="1"/>
												</svg>
												<span class="summary-detail-label">Servizi</span>
												<span class="summary-detail-value summary-detail-truncate">{{ summaryServicesLabel }}</span>
												<button
													v-if="canExpandSummaryServices"
													type="button"
													class="summary-detail-more"
													@click.stop="toggleSummaryDetailPanel('services')">
													{{ summaryDetailPanel === 'services' ? 'Chiudi' : 'Vedi' }}
												</button>
											</div>
										</div>

										<div v-if="summaryDetailPanel" class="summary-detail-expand">
											<div v-if="summaryDetailPanel === 'dimensions'" class="summary-detail-expand-block">
												<p class="summary-detail-expand-title">Tutte le misure collo</p>
													<div class="summary-detail-pill-wrap">
														<span
															v-for="(item, idx) in summaryDimensionsItems"
															:key="`summary-dim-${idx}`"
															class="summary-detail-pill">
															<NuxtImg
																v-if="item.icon"
																:src="item.icon"
																:alt="item.type || 'Tipo collo'"
																width="14"
																height="14"
																loading="lazy"
																decoding="async"
																class="summary-detail-pill-icon" />
															<span class="summary-detail-pill-text">
																{{ item.label }}
															</span>
														</span>
													</div>
												</div>

											<div v-else-if="summaryDetailPanel === 'services'" class="summary-detail-expand-block">
												<p class="summary-detail-expand-title">Servizi selezionati</p>
												<div class="summary-detail-pill-wrap">
													<span
														v-for="(item, idx) in summaryServicesItems"
														:key="`summary-service-${idx}`"
														class="summary-detail-pill">
														{{ item }}
													</span>
												</div>
											</div>
										</div>
									</div>
								</Transition>
					</div>
				</div>

				<ClientOnly>
					<div ref="pickupDateSectionRef" class="bg-gradient-to-br from-[#E6E6E6] to-[#D8D8D8] rounded-[16px] pt-[16px] pb-[16px] shadow-md">
						<h2 class="ml-[16px] tablet:ml-[78px] text-[1.25rem] tablet:text-[1.8125rem] text-[#252B42] font-bold font-montserrat tracking-[0.1px] mb-[12px]">Imposta giorno di ritiro</h2>

						<div class="py-[12px]">
							<div class="relative px-[20px] tablet:px-[35px]">
								<Swiper
									class="my-swiper h-[90px] tablet:h-[108px]"
									:modules="[Navigation]"
									:slides-per-view="3"
									:breakpoints="{
										375: { slidesPerView: 3, spaceBetween: 12 },
										720: { slidesPerView: 5, spaceBetween: 20 },
										1024: { slidesPerView: 7, spaceBetween: 30 }
									}"
									space-between="10"
									:navigation="{
										nextEl: '.custom-next',
										prevEl: '.custom-prev',
									}">
									<SwiperSlide v-for="(day, index) in daysInMonth" :key="index">
										<label
											:key="day.date.toISOString()"
											class="size-full flex flex-col rounded-[12px] overflow-hidden cursor-pointer select-none border-[2px] transition-all duration-300"
											:class="{
												'border-[#095866] shadow-lg': services.date == day.date.toLocaleDateString(),
												'border-[#C0C0C0] hover:border-[#095866] hover:shadow-md': services.date != day.date.toLocaleDateString() && day.weekday !== 'Sab' && day.weekday !== 'Dom',
												'opacity-50 cursor-not-allowed pointer-events-none': day.weekday === 'Sab' || day.weekday === 'Dom'
											}">
											<span
												class="w-full text-center block font-semibold h-[35px] leading-[35px] transition-colors duration-300"
												:class="{
													'bg-gradient-to-r from-[#095866] to-[#074a56] text-white': services.date == day.date.toLocaleDateString(),
													'bg-[#C0C0C0] text-[#252B42]': services.date != day.date.toLocaleDateString(),
												}">
												{{ day.weekday }}
											</span>
											<div class="flex flex-col justify-center items-center text-[#767676] leading-[30px] bg-white flex-1">
												<span class="font-bold text-[2.5rem]" :class="{ 'text-[#095866]': services.date == day.date.toLocaleDateString() }">{{ day.dayNumber }}</span>
												<span class="text-[0.875rem]">{{ day.monthAbbr }}</span>
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

								<!-- Frecce navigazione con touch target 48x48px -->
								<button class="custom-prev absolute bottom-[35px] left-[10px] cursor-pointer bg-white rounded-[50px] px-[16px] py-[12px] flex items-center justify-center shadow-sm hover:shadow-md transition-shadow duration-300 z-10 border border-[#D0D0D0] hover:border-[#095866]">
									<NuxtImg src="/img/quote/second-step/arrow-left.png" alt="Precedente" width="11" height="19" loading="lazy" decoding="async" />
								</button>
								<button class="custom-next absolute bottom-[35px] right-[10px] cursor-pointer bg-white rounded-[50px] px-[16px] py-[12px] flex items-center justify-center shadow-sm hover:shadow-md transition-shadow duration-300 z-10 border border-[#D0D0D0] hover:border-[#095866]">
									<NuxtImg src="/img/quote/second-step/arrow-right.png" alt="Successivo" width="11" height="19" loading="lazy" decoding="async" />
								</button>
							</div>
						</div>
					</div>
				</ClientOnly>

				<div class="flex flex-col desktop:flex-row desktop:items-start font-montserrat mt-[30px] tablet:mt-[60px] justify-center gap-[30px] desktop:gap-x-[40px]">
					<div class="w-full mx-auto">
						<!-- Layout servizi: Senza etichetta hero + 3 sotto -->
						<div class="w-full">
							<!-- Servizio "Senza etichetta" — card orizzontale premium -->
							<div v-if="featuredService" class="mb-[16px]">
								<label
									class="senza-etichetta-card"
									:class="{ 'is-selected': featuredService.isSelected }">

									<!-- Sinistra: radio button + info -->
									<div class="se-left">
										<div class="se-check"></div>
										<div class="se-info">
											<div class="se-title-row">
												<h3 class="se-title">Senza Etichetta</h3>
												<span class="se-badge">Consigliato</span>
											</div>
											<p class="se-desc">Il corriere stampa l'etichetta per te — niente stampante</p>
										</div>
									</div>

									<!-- Destra: prezzo -->
									<div class="se-price">+1,00€</div>

									<input
										type="checkbox"
										@click="chooseService(featuredService, servicesList.findIndex(s => s.featured))"
										:checked="featuredService.isSelected"
										class="hidden" />
								</label>
							</div>

							<!-- Servizi regolari (3 in riga) - padding ridotto -->
							<div class="grid grid-cols-1 tablet:grid-cols-3 gap-[16px] tablet:gap-[18px] desktop:gap-[24px]">
								<label
									v-for="(service, serviceIndex) in regularServices"
									:key="serviceIndex"
									class="flex flex-col items-center justify-center min-h-[160px] tablet:min-h-[180px] text-center cursor-pointer rounded-[16px] transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-[2px] p-[12px] tablet:p-[14px]"
									:class="{
										'bg-[#095866] text-white': service.isSelected,
										'bg-[#E6E6E6] hover:bg-[#DADADA]': !service.isSelected
									}">
									<h3
										class="text-[1.0625rem] tablet:text-[1.125rem] font-bold service-list before:content-[''] before:block before:mx-auto before:mb-[12px] leading-[24px] tracking-[0.1px]"
										:class="{ 'text-white before:brightness-0 before:invert': service.isSelected, 'text-[#252B42]': !service.isSelected }"
										:style="{ '--before-service-bg': `url(/img/quote/second-step/${service.img})`, '--before-service-width': `${service.width}px`, '--before-service-height': `${service.height}px` }">
										{{ service.name }}
									</h3>
									<p class="mt-[8px] text-[0.8125rem] tablet:text-[0.875rem] leading-[20px] px-[16px] tracking-[0.2px]"
										:class="{ 'text-white': service.isSelected, 'text-[#737373]': !service.isSelected }">
										{{ service.description }}
									</p>
									<input
										type="checkbox"
										@click="chooseService(service, servicesList.findIndex(s => s.name === service.name))"
										class="opacity-0 pointer-events-none absolute"
										:id="service.name"
										:checked="service.isSelected" />
								</label>
							</div>

							<!-- Contenuto del pacco -->
								<div class="mt-[40px] max-w-[500px]">
									<div class="flex items-center gap-[8px] mb-[8px]">
										<label for="content_description" class="block text-[0.9375rem] font-bold text-[#252B42]">
											Contenuto del pacco<span class="text-red-500 ml-[2px]">*</span>
										</label>
									<!-- Tooltip con esempi -->
									<div class="relative group">
										<button type="button" class="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#095866] text-white text-[0.75rem] font-bold cursor-help">
											?
										</button>
										<div class="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-[8px] hidden group-hover:block w-[280px] bg-[#252B42] text-white text-[0.8125rem] rounded-[8px] px-[14px] py-[10px] shadow-lg">
											<p class="font-semibold mb-[6px]">Esempi di contenuto:</p>
											<ul class="list-disc list-inside space-y-[2px] text-[0.75rem]">
												<li>Elettronica (smartphone, laptop)</li>
												<li>Abbigliamento e accessori</li>
												<li>Documenti e libri</li>
												<li>Articoli per la casa</li>
												<li>Prodotti alimentari confezionati</li>
											</ul>
											<div class="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#252B42]"></div>
											</div>
										</div>
									</div>
									<p v-if="contentError" class="field-gentle-error mb-[8px]">
										{{ contentFieldHint }}
									</p>
									<input
										type="text"
										id="content_description"
										v-model="userStore.contentDescription"
									placeholder="Descrivi il contenuto (es. Elettronica, Abbigliamento, Documenti, Libri...)"
									maxlength="255"
									required
									@input="contentError = null"
											:class="[
												'input-preventivo-step-2 w-full',
												contentError ? 'input-preventivo-step-2--warning border-2' : ''
											]" />
								</div>

							<!-- SMS/Email Notifiche -->
							<div class="mt-[30px] max-w-[500px]">
								<div class="bg-gradient-to-br from-[#F5F5F5] to-[#E8E8E8] rounded-[16px] px-[20px] py-[16px] shadow-sm hover:shadow-md transition-shadow duration-300">
									<div class="flex items-center justify-between gap-[12px]">
										<div class="flex items-center gap-[12px] flex-1">
											<!-- Icona campanella -->
											<div class="flex-shrink-0 w-[32px] h-[32px] flex items-center justify-center rounded-[10px] transition-colors duration-300"
												:class="smsEmailNotification ? 'bg-[#095866]' : 'bg-[#C0C0C0]'">
												<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
													<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
													<path d="M13.73 21a2 2 0 0 1-3.46 0"/>
												</svg>
											</div>
											<!-- Testo con copy migliorato -->
											<div class="flex-1">
												<p class="text-[0.9375rem] font-semibold text-[#252B42] leading-tight">
													Ricevi SMS/Email dal corriere
												</p>
												<p class="text-[0.75rem] text-[#737373] mt-[2px]">
													Notifiche al ritiro, in transito e alla consegna
												</p>
											</div>
										</div>
										<!-- Toggle switch iOS style con focus state -->
										<div class="flex items-center gap-[10px]">
											<span class="text-[0.875rem] font-bold transition-colors duration-300"
												:class="smsEmailNotification ? 'text-[#22C55E]' : 'text-[#999]'">
												+0.50€
											</span>
											<label class="relative inline-block w-[52px] h-[28px] cursor-pointer">
												<input
													type="checkbox"
													v-model="smsEmailNotification"
													class="opacity-0 w-0 h-0 peer"
													aria-label="Attiva notifiche SMS/Email" />
												<span class="absolute inset-0 bg-[#C0C0C0] rounded-[28px] transition-all duration-300 peer-checked:bg-[#095866] peer-focus-visible:ring-2 peer-focus-visible:ring-[#095866] peer-focus-visible:ring-offset-2 shadow-inner"></span>
												<span class="absolute left-[3px] top-[3px] w-[22px] h-[22px] bg-white rounded-full transition-all duration-300 shadow-md peer-checked:translate-x-[24px]"></span>
											</label>
										</div>
									</div>
								</div>
							</div>

							<!-- PARTENZA -->
							<template v-if="showAddressFields">
								<div
									v-if="showGlobalFormSummary"
									class="ux-alert ux-alert--soft mt-[18px]">
									<svg xmlns="http://www.w3.org/2000/svg" class="ux-alert__icon" viewBox="0 0 24 24"><path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2z"/><path fill="currentColor" d="M1 21h22L12 2zm12-3h-2v-2h2zm0-4h-2V8h2z"/></svg>
									<div class="min-w-0">
										<span class="ux-alert__title">Controlliamo insieme questi campi</span>
										<ul class="mt-[6px] space-y-[4px]">
										<li v-for="errorItem in formErrorSummary" :key="errorItem.key">
											<button
												type="button"
												class="text-left text-[0.8125rem] text-[#7A5A2C] underline decoration-[#D7B078] hover:decoration-[#B8823B] cursor-pointer"
												@click="focusFormError(errorItem)">
												{{ errorItem.label }}: {{ errorItem.message }}
											</button>
									</li>
								</ul>
									</div>
							</div>
							<div class="bg-[#E4E4E4] rounded-[16px] text-[#252B42] mt-[20px] px-[16px] tablet:px-[40px] pt-[24px] tablet:pt-[35px] pb-[24px] tablet:pb-[43px]">
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
								<div class="flex items-center gap-[10px] flex-wrap">
									<!-- Spedizioni configurate (visibile anche ai guest) -->
									<div ref="defaultDropdownRef" class="relative">
										<button
											type="button"
											@click="loadSavedConfigs('origin')"
											:aria-expanded="((isAuthenticated && showDefaultDropdown && showDefaultDropdownTarget === 'origin') || (!isAuthenticated && showOriginConfigGuestPrompt)) ? 'true' : 'false'"
											aria-controls="origin-config-dropdown"
											:disabled="isAuthenticated && loadingConfigs"
											class="inline-flex items-center gap-[6px] px-[14px] py-[8px] bg-[#996D47] text-white rounded-[8px] text-[0.8125rem] font-semibold hover:bg-[#7d5939] transition cursor-pointer disabled:opacity-60">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
											{{ isAuthenticated && loadingConfigs ? '...' : 'Spedizioni configurate' }}
										</button>
										<div v-if="showDefaultDropdown && showDefaultDropdownTarget === 'origin' && savedConfigs.length > 0" id="origin-config-dropdown" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl max-h-[300px] overflow-y-auto w-[280px] tablet:w-[400px]">
											<div class="p-[12px] border-b border-[#F0F0F0] text-[0.8125rem] font-bold text-[#252B42]">Seleziona una spedizione configurata</div>
											<div v-for="item in savedConfigs" :key="item.id" @click="applyConfig(item, 'origin')" class="px-[14px] py-[12px] cursor-pointer hover:bg-[#f0fafb] border-b border-[#F0F0F0] last:border-0 transition-colors">
												<div class="flex items-center gap-[8px]">
													<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#996D47" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
													<span class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.origin_address?.city || 'Partenza' }}</span>
													<span class="text-[#737373]">&rarr;</span>
													<span class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.destination_address?.city || 'Destinazione' }}</span>
												</div>
												<p class="text-[0.75rem] text-[#737373] mt-[2px]">{{ item.origin_address?.name || '' }} - {{ item.destination_address?.name || '' }}</p>
											</div>
										</div>
										<div v-if="showDefaultDropdown && showDefaultDropdownTarget === 'origin' && savedConfigs.length === 0 && !loadingConfigs" id="origin-config-dropdown" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl p-[20px] w-[300px]">
											<p class="text-[0.875rem] text-[#737373]">Nessuna spedizione configurata salvata.</p>
											<NuxtLink to="/account/spedizioni-configurate" class="text-[0.8125rem] text-[#095866] hover:underline font-semibold mt-[8px] inline-block">Vai a spedizioni configurate</NuxtLink>
										</div>
										<div v-if="showOriginConfigGuestPrompt && !isAuthenticated" id="origin-config-dropdown" role="dialog" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl p-[14px] w-[300px]">
											<p class="text-[0.8125rem] text-[#4B5563] leading-[1.45]">Per usare le spedizioni configurate devi accedere.</p>
											<div class="mt-[10px] flex items-center gap-[8px]">
												<NuxtLink :to="authRedirectPath" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[8px] bg-[#095866] text-white text-[0.75rem] font-semibold hover:bg-[#074a56] transition">Accedi</NuxtLink>
												<NuxtLink :to="authRegisterRedirectPath" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[8px] border border-[#C8D2D6] text-[#095866] text-[0.75rem] font-semibold hover:bg-[#F3F7F8] transition">Registrati</NuxtLink>
											</div>
										</div>
									</div>

									<!-- Indirizzi salvati (visibile anche ai guest) -->
									<div ref="originSelectorRef" class="relative">
										<button
											type="button"
											@click="toggleAddressSelector('origin')"
											:aria-expanded="(isAuthenticated ? showOriginAddressSelector : showOriginGuestPrompt) ? 'true' : 'false'"
											aria-controls="origin-addresses-dropdown"
											class="inline-flex items-center gap-[6px] px-[14px] py-[8px] bg-[#095866] text-white rounded-[8px] text-[0.8125rem] font-semibold hover:bg-[#074a56] transition cursor-pointer">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
											Indirizzi salvati
										</button>
										<div v-if="showOriginAddressSelector && isAuthenticated" id="origin-addresses-dropdown" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl max-h-[250px] overflow-y-auto w-[260px] tablet:w-[320px]">
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
										<div v-if="showOriginGuestPrompt && !isAuthenticated" id="origin-addresses-dropdown" role="dialog" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl p-[14px] w-[280px]">
											<p class="text-[0.8125rem] text-[#4B5563] leading-[1.45]">Per usare la rubrica indirizzi devi accedere.</p>
											<div class="mt-[10px] flex items-center gap-[8px]">
												<NuxtLink :to="authRedirectPath" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[8px] bg-[#095866] text-white text-[0.75rem] font-semibold hover:bg-[#074a56] transition">Accedi</NuxtLink>
												<NuxtLink :to="authRegisterRedirectPath" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[8px] border border-[#C8D2D6] text-[#095866] text-[0.75rem] font-semibold hover:bg-[#F3F7F8] transition">Registrati</NuxtLink>
											</div>
										</div>
									</div>
								</div>
								</div>

								<div v-if="originSectionHint" class="ux-alert ux-alert--soft mb-[12px]">
									<svg xmlns="http://www.w3.org/2000/svg" class="ux-alert__icon" viewBox="0 0 24 24"><path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2z"/><path fill="currentColor" d="M1 21h22L12 2z"/></svg>
									<span>{{ originSectionHint }}</span>
								</div>

								<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[16px] tablet:gap-x-[30px]">
									<div>
										<label for="name" class="block text-[0.875rem] sr-only">Nome e Cognome*</label>
										<input type="text" placeholder="Nome e Cognome*" v-model="originAddress.full_name" id="name" :class="fieldClass('origin', 'full_name')" required @blur="smartBlur('origin', 'full_name')" @input="onNameInput('origin', originAddress.full_name)" style="font-size: 16px;" />
										<p v-if="getFieldError('origin', 'full_name')" class="field-gentle-error">{{ fieldErrorText('origin', 'full_name') }}</p>
										<button
											v-if="getFieldAssist('origin', 'full_name')"
											type="button"
											class="field-assist-chip"
											@click="applyFieldAssist('origin', 'full_name')">
											<Icon name="mdi:lightbulb-on-outline" class="text-[0.95rem]" />
											{{ getFieldAssist('origin', 'full_name')?.label }}
										</button>
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
										<p v-if="getFieldError('origin', 'address')" class="field-gentle-error">{{ fieldErrorText('origin', 'address') }}</p>
										<button
											v-if="getFieldAssist('origin', 'address')"
											type="button"
											class="field-assist-chip"
											@click="applyFieldAssist('origin', 'address')">
											<Icon name="mdi:lightbulb-on-outline" class="text-[0.95rem]" />
											{{ getFieldAssist('origin', 'address')?.label }}
										</button>
									</div>

									<div>
										<label for="origin_address_number" class="block text-[0.875rem] sr-only">Numero civico*</label>
										<input type="text" placeholder="Numero civico*" v-model="originAddress.address_number" id="origin_address_number" :class="fieldClass('origin', 'address_number')" required style="font-size: 16px;" />
										<p v-if="getFieldError('origin', 'address_number')" class="field-gentle-error">{{ fieldErrorText('origin', 'address_number') }}</p>
										<button
											v-if="getFieldAssist('origin', 'address_number')"
											type="button"
											class="field-assist-chip"
											@click="applyFieldAssist('origin', 'address_number')">
											<Icon name="mdi:lightbulb-on-outline" class="text-[0.95rem]" />
											{{ getFieldAssist('origin', 'address_number')?.label }}
										</button>
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

									<div class="relative">
										<label for="origin_city" class="block text-[0.875rem] sr-only">Citta*</label>
										<input type="text" placeholder="Citta*" v-model="originAddress.city" id="origin_city" :class="fieldClass('origin', 'city')" required @input="onCityInput('origin', originAddress.city)" @focus="onCityFocus('origin')" @blur="smartBlur('origin', 'city')" style="font-size: 16px;" />
										<p v-if="getFieldError('origin', 'city')" class="field-gentle-error">{{ fieldErrorText('origin', 'city') }}</p>
										<button
											v-if="getFieldAssist('origin', 'city')"
											type="button"
											class="field-assist-chip"
											@click="applyFieldAssist('origin', 'city')">
											<Icon name="mdi:lightbulb-on-outline" class="text-[0.95rem]" />
											{{ getFieldAssist('origin', 'city')?.label }}
										</button>
										<ul v-if="originCitySuggestions.length > 0" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#D0D0D0] rounded-[8px] mt-[2px] shadow-lg max-h-[200px] overflow-y-auto">
											<li v-for="loc in originCitySuggestions" :key="`${loc.postal_code}-${loc.place_name}`" @mousedown.prevent="selectCity('origin', loc)" class="px-[12px] py-[8px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42]">
												<span class="font-semibold">{{ formatCitySuggestionLabel(loc) }}</span>
											</li>
										</ul>
									</div>

									<div class="relative">
										<label for="origin_province" class="block text-[0.875rem] sr-only">Provincia*</label>
										<input type="text" placeholder="Provincia* (es. MI)" v-model="originAddress.province" id="origin_province" :class="fieldClass('origin', 'province')" required maxlength="2" @input="onProvinciaInput('origin', originAddress.province)" @focus="onProvinceFocus('origin')" @blur="smartBlur('origin', 'province')" style="font-size: 16px;" />
										<p v-if="getFieldError('origin', 'province')" class="field-gentle-error">{{ fieldErrorText('origin', 'province') }}</p>
										<button
											v-if="getFieldAssist('origin', 'province')"
											type="button"
											class="field-assist-chip"
											@click="applyFieldAssist('origin', 'province')">
											<Icon name="mdi:lightbulb-on-outline" class="text-[0.95rem]" />
											{{ getFieldAssist('origin', 'province')?.label }}
										</button>
										<ul v-if="originProvinceSuggestions.length > 0" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#D0D0D0] rounded-[8px] mt-[2px] shadow-lg">
											<li v-for="prov in originProvinceSuggestions" :key="prov" @mousedown.prevent="selectProvincia('origin', prov)" class="px-[12px] py-[8px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42]">{{ prov }}</li>
										</ul>
									</div>

									<div class="relative">
										<label for="origin_postal_code" class="block text-[0.875rem] sr-only">CAP*</label>
										<input type="text" placeholder="CAP*" v-model="originAddress.postal_code" id="origin_postal_code" :class="fieldClass('origin', 'postal_code')" required maxlength="5" @input="onCapInput('origin', originAddress.postal_code)" @focus="onCapFocus('origin')" @blur="smartBlur('origin', 'postal_code')" style="font-size: 16px;" />
										<p v-if="getFieldError('origin', 'postal_code')" class="field-gentle-error">{{ fieldErrorText('origin', 'postal_code') }}</p>
										<button
											v-if="getFieldAssist('origin', 'postal_code')"
											type="button"
											class="field-assist-chip"
											@click="applyFieldAssist('origin', 'postal_code')">
											<Icon name="mdi:lightbulb-on-outline" class="text-[0.95rem]" />
											{{ getFieldAssist('origin', 'postal_code')?.label }}
										</button>
										<ul v-if="originCapSuggestions.length > 0" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#D0D0D0] rounded-[8px] mt-[2px] shadow-lg max-h-[220px] overflow-y-auto">
											<li v-for="loc in originCapSuggestions" :key="`origin-cap-${loc.postal_code}-${loc.place_name}-${loc.province || ''}`" @mousedown.prevent="selectCap('origin', loc)" class="px-[12px] py-[8px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42]">
												<span class="font-semibold">{{ formatCapSuggestionLabel(loc) }}</span>
											</li>
										</ul>
									</div>
								</div>

								<div class="mt-[16px] tablet:mt-[39px] grid grid-cols-1 tablet:grid-cols-2 gap-[16px] tablet:gap-x-[30px]">
									<div>
										<label for="origin_telephone" class="block text-[0.875rem] sr-only">Telefono*</label>
										<input type="tel" placeholder="Telefono*" v-model="originAddress.telephone_number" id="origin_telephone" :class="fieldClass('origin', 'telephone_number')" required @input="onTelefonoInput('origin', originAddress.telephone_number)" @blur="smartBlur('origin', 'telephone_number')" style="font-size: 16px;" />
										<p v-if="getFieldError('origin', 'telephone_number')" class="field-gentle-error">{{ fieldErrorText('origin', 'telephone_number') }}</p>
										<button
											v-if="getFieldAssist('origin', 'telephone_number')"
											type="button"
											class="field-assist-chip"
											@click="applyFieldAssist('origin', 'telephone_number')">
											<Icon name="mdi:lightbulb-on-outline" class="text-[0.95rem]" />
											{{ getFieldAssist('origin', 'telephone_number')?.label }}
										</button>
									</div>

									<div>
										<label for="origin_email" class="block text-[0.875rem] sr-only">Email</label>
										<input type="email" placeholder="Email" v-model="originAddress.email" id="origin_email" :class="fieldClass('origin', 'email')" @blur="smartBlur('origin', 'email')" @input="sv.onInput('origin_email', () => sv.validateEmail('origin_email', originAddress.email))" style="font-size: 16px;" />
										<p v-if="getFieldError('origin', 'email')" class="field-gentle-error">{{ fieldErrorText('origin', 'email') }}</p>
										<button
											v-if="getFieldAssist('origin', 'email')"
											type="button"
											class="field-assist-chip"
											@click="applyFieldAssist('origin', 'email')">
											<Icon name="mdi:lightbulb-on-outline" class="text-[0.95rem]" />
											{{ getFieldAssist('origin', 'email')?.label }}
										</button>
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
										class="inline-flex items-center gap-[8px] px-[18px] py-[12px] rounded-[50px] text-[0.875rem] font-semibold border-2 transition-[background-color,color,border-color] duration-200 cursor-pointer"
										:class="deliveryMode === 'home' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#252B42] border-[#D0D0D0] hover:border-[#095866]'">
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
										Consegna a domicilio
									</button>
									<!-- Bottone "Ritira in un Punto BRT" — consegna presso punto PUDO -->
									<button
										type="button"
										@click="deliveryMode = 'pudo'"
										class="inline-flex items-center gap-[8px] px-[18px] py-[12px] rounded-[50px] text-[0.875rem] font-semibold border-2 transition-[background-color,color,border-color] duration-200 cursor-pointer"
										:class="deliveryMode === 'pudo' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#252B42] border-[#D0D0D0] hover:border-[#095866]'">
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
										Ritira in un Punto BRT
									</button>
								</div>
							</div>

							<!-- SELETTORE PUDO — visibile solo se l'utente ha scelto "Ritira in un Punto BRT" -->
							<!-- Permette di cercare punti PUDO per città/CAP e selezionarne uno -->
							<div v-if="deliveryMode === 'pudo'" class="bg-[#E4E4E4] rounded-[16px] text-[#252B42] mt-[16px] px-[16px] tablet:px-[40px] pt-[24px] tablet:pt-[35px] pb-[24px] tablet:pb-[43px]">
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
							<div class="bg-[#E4E4E4] rounded-[16px] text-[#252B42] mt-[20px] px-[16px] tablet:px-[40px] pt-[24px] tablet:pt-[35px] pb-[24px] tablet:pb-[43px]">
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
									<div class="flex items-center gap-[10px] flex-wrap justify-end">
									<div ref="destDefaultDropdownRef" class="relative">
										<button
											type="button"
											@click="loadSavedConfigs('dest')"
											:aria-expanded="((isAuthenticated && showDefaultDropdown && showDefaultDropdownTarget === 'dest') || (!isAuthenticated && showDestConfigGuestPrompt)) ? 'true' : 'false'"
											aria-controls="dest-config-dropdown"
											:disabled="isAuthenticated && loadingConfigs"
											class="inline-flex items-center gap-[6px] px-[14px] py-[8px] bg-[#996D47] text-white rounded-[8px] text-[0.8125rem] font-semibold hover:bg-[#7d5939] transition cursor-pointer disabled:opacity-60">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
											{{ isAuthenticated && loadingConfigs ? '...' : 'Spedizioni configurate' }}
										</button>
										<div v-if="showDefaultDropdown && showDefaultDropdownTarget === 'dest' && savedConfigs.length > 0" id="dest-config-dropdown" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl max-h-[300px] overflow-y-auto w-[280px] tablet:w-[400px]">
											<div class="p-[12px] border-b border-[#F0F0F0] text-[0.8125rem] font-bold text-[#252B42]">Seleziona una spedizione configurata</div>
											<div v-for="item in savedConfigs" :key="`dest-config-${item.id}`" @click="applyConfig(item, 'dest')" class="px-[14px] py-[12px] cursor-pointer hover:bg-[#f0fafb] border-b border-[#F0F0F0] last:border-0 transition-colors">
												<div class="flex items-center gap-[8px]">
													<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#996D47" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
													<span class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.destination_address?.city || 'Destinazione' }}</span>
												</div>
												<p class="text-[0.75rem] text-[#737373] mt-[2px]">{{ item.destination_address?.name || '' }}</p>
											</div>
										</div>
										<div v-if="showDefaultDropdown && showDefaultDropdownTarget === 'dest' && savedConfigs.length === 0 && !loadingConfigs" id="dest-config-dropdown" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl p-[20px] w-[300px]">
											<p class="text-[0.875rem] text-[#737373]">Nessuna spedizione configurata salvata.</p>
											<NuxtLink to="/account/spedizioni-configurate" class="text-[0.8125rem] text-[#095866] hover:underline font-semibold mt-[8px] inline-block">Vai a spedizioni configurate</NuxtLink>
										</div>
										<div v-if="showDestConfigGuestPrompt && !isAuthenticated" id="dest-config-dropdown" role="dialog" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl p-[14px] w-[300px]">
											<p class="text-[0.8125rem] text-[#4B5563] leading-[1.45]">Per usare le spedizioni configurate devi accedere.</p>
											<div class="mt-[10px] flex items-center gap-[8px]">
												<NuxtLink :to="authRedirectPath" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[8px] bg-[#095866] text-white text-[0.75rem] font-semibold hover:bg-[#074a56] transition">Accedi</NuxtLink>
												<NuxtLink :to="authRegisterRedirectPath" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[8px] border border-[#C8D2D6] text-[#095866] text-[0.75rem] font-semibold hover:bg-[#F3F7F8] transition">Registrati</NuxtLink>
											</div>
										</div>
									</div>
									<div ref="destSelectorRef" class="relative">
										<button
											type="button"
											@click="toggleAddressSelector('dest')"
											:aria-expanded="(isAuthenticated ? showDestAddressSelector : showDestGuestPrompt) ? 'true' : 'false'"
											aria-controls="dest-addresses-dropdown"
											class="inline-flex items-center gap-[6px] px-[14px] py-[8px] bg-[#095866] text-white rounded-[8px] text-[0.8125rem] font-semibold hover:bg-[#074a56] transition cursor-pointer">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
											Indirizzi salvati
										</button>
										<div v-if="showDestAddressSelector && isAuthenticated" id="dest-addresses-dropdown" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl max-h-[250px] overflow-y-auto w-[260px] tablet:w-[320px]">
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
										<div v-if="showDestGuestPrompt && !isAuthenticated" id="dest-addresses-dropdown" role="dialog" class="absolute z-50 top-full right-0 mt-[4px] bg-white border border-[#D0D0D0] rounded-[12px] shadow-xl p-[14px] w-[280px]">
											<p class="text-[0.8125rem] text-[#4B5563] leading-[1.45]">Per usare la rubrica indirizzi devi accedere.</p>
											<div class="mt-[10px] flex items-center gap-[8px]">
												<NuxtLink :to="authRedirectPath" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[8px] bg-[#095866] text-white text-[0.75rem] font-semibold hover:bg-[#074a56] transition">Accedi</NuxtLink>
												<NuxtLink :to="authRegisterRedirectPath" class="inline-flex items-center justify-center h-[34px] px-[12px] rounded-[8px] border border-[#C8D2D6] text-[#095866] text-[0.75rem] font-semibold hover:bg-[#F3F7F8] transition">Registrati</NuxtLink>
											</div>
										</div>
									</div>
								</div>
								</div>

								<div v-if="destinationSectionHint" class="ux-alert ux-alert--soft mb-[12px]">
									<svg xmlns="http://www.w3.org/2000/svg" class="ux-alert__icon" viewBox="0 0 24 24"><path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2z"/><path fill="currentColor" d="M1 21h22L12 2z"/></svg>
									<span>{{ destinationSectionHint }}</span>
								</div>

								<!-- In modalità PUDO: banner informativo + campi auto-compilati e non editabili -->
								<div v-if="deliveryMode === 'pudo' && userStore.selectedPudo" class="ux-alert ux-alert--info mb-[16px]">
									<svg width="16" height="16" viewBox="0 0 24 24" class="ux-alert__icon" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
									<span>Indirizzo compilato automaticamente dal Punto BRT selezionato.</span>
								</div>
								<div v-if="deliveryMode === 'pudo' && !userStore.selectedPudo" class="ux-alert ux-alert--soft mb-[16px]">
									<svg width="16" height="16" viewBox="0 0 24 24" class="ux-alert__icon" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
									<span>Seleziona un Punto BRT qui sopra per procedere.</span>
								</div>
								<div v-if="routeWarningMessage" class="ux-alert ux-alert--soft mb-[16px]">
									<svg width="16" height="16" viewBox="0 0 24 24" class="ux-alert__icon" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>
									<span>{{ routeWarningMessage }}</span>
								</div>

								<!-- Bloccco contatto: sempre editabile anche in modalità PUDO -->
								<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[16px] tablet:gap-x-[30px]">
									<div>
										<label for="dest_name" class="block text-[0.875rem] sr-only">Nome e Cognome*</label>
										<input type="text" placeholder="Nome e Cognome*" v-model="destinationAddress.full_name" id="dest_name" :class="fieldClass('dest', 'full_name')" required @blur="smartBlur('dest', 'full_name')" @input="onNameInput('dest', destinationAddress.full_name)" style="font-size: 16px;" />
										<p v-if="getFieldError('dest', 'full_name')" class="field-gentle-error">{{ fieldErrorText('dest', 'full_name') }}</p>
										<button
											v-if="getFieldAssist('dest', 'full_name')"
											type="button"
											class="field-assist-chip"
											@click="applyFieldAssist('dest', 'full_name')">
											<Icon name="mdi:lightbulb-on-outline" class="text-[0.95rem]" />
											{{ getFieldAssist('dest', 'full_name')?.label }}
										</button>
										<p v-if="deliveryMode === 'pudo'" class="text-[0.75rem] text-[#667789] mt-[6px]">
											Inserisci il nome della persona che ritira il pacco, non il nome del Punto BRT.
										</p>
									</div>

									<div>
										<label for="dest_additional_info" class="block text-[0.875rem] sr-only">Informazioni aggiuntive</label>
										<input type="text" placeholder="Informazioni aggiuntive" v-model="destinationAddress.additional_information" id="dest_additional_info" class="input-preventivo-step-2" style="font-size: 16px;" />
									</div>
								</div>

								<div class="mt-[16px] tablet:mt-[20px] grid grid-cols-1 tablet:grid-cols-2 gap-[16px] tablet:gap-x-[30px]">
									<div>
										<label for="dest_telephone_number" class="block text-[0.875rem] sr-only">Telefono*</label>
										<input type="tel" placeholder="Telefono*" v-model="destinationAddress.telephone_number" id="dest_telephone_number" :class="fieldClass('dest', 'telephone_number')" required @input="onTelefonoInput('dest', destinationAddress.telephone_number)" @blur="smartBlur('dest', 'telephone_number')" style="font-size: 16px;" />
										<p v-if="getFieldError('dest', 'telephone_number')" class="field-gentle-error">{{ fieldErrorText('dest', 'telephone_number') }}</p>
										<button
											v-if="getFieldAssist('dest', 'telephone_number')"
											type="button"
											class="field-assist-chip"
											@click="applyFieldAssist('dest', 'telephone_number')">
											<Icon name="mdi:lightbulb-on-outline" class="text-[0.95rem]" />
											{{ getFieldAssist('dest', 'telephone_number')?.label }}
										</button>
									</div>

									<div>
										<label for="dest_email" class="block text-[0.875rem] sr-only">Email</label>
										<input type="email" placeholder="Email" v-model="destinationAddress.email" id="dest_email" :class="fieldClass('dest', 'email')" @blur="smartBlur('dest', 'email')" @input="sv.onInput('dest_email', () => sv.validateEmail('dest_email', destinationAddress.email))" style="font-size: 16px;" />
										<p v-if="getFieldError('dest', 'email')" class="field-gentle-error">{{ fieldErrorText('dest', 'email') }}</p>
										<button
											v-if="getFieldAssist('dest', 'email')"
											type="button"
											class="field-assist-chip"
											@click="applyFieldAssist('dest', 'email')">
											<Icon name="mdi:lightbulb-on-outline" class="text-[0.95rem]" />
											{{ getFieldAssist('dest', 'email')?.label }}
										</button>
									</div>
								</div>

								<!-- Blocco indirizzo: readonly in modalità PUDO -->
								<div class="mt-[16px] tablet:mt-[24px]">
									<p
										v-if="deliveryMode === 'pudo'"
										class="text-[0.8125rem] text-[#4B5563] font-semibold mb-[10px]">
										Indirizzo di consegna bloccato dal Punto BRT selezionato
									</p>

								<div class="grid grid-cols-1 tablet:grid-cols-3 gap-[16px] tablet:gap-x-[25px]" :class="deliveryMode === 'pudo' ? 'mt-[10px] tablet:mt-[14px]' : 'mt-[16px] tablet:mt-[39px]'">
									<div>
										<label for="dest_address" class="block text-[0.875rem] sr-only">Indirizzo*</label>
										<input
											type="text"
											placeholder="Indirizzo*"
											v-model="destinationAddress.address"
											id="dest_address"
											:class="[fieldClass('dest', 'address'), deliveryMode === 'pudo' ? '!bg-white !border-[#CBD5DF] !text-[#4B5563] cursor-not-allowed' : '']"
											:readonly="deliveryMode === 'pudo'"
											required
											style="font-size: 16px;" />
										<p v-if="getFieldError('dest', 'address')" class="field-gentle-error">{{ fieldErrorText('dest', 'address') }}</p>
										<button
											v-if="getFieldAssist('dest', 'address')"
											type="button"
											class="field-assist-chip"
											@click="applyFieldAssist('dest', 'address')">
											<Icon name="mdi:lightbulb-on-outline" class="text-[0.95rem]" />
											{{ getFieldAssist('dest', 'address')?.label }}
										</button>
									</div>

									<div>
										<label for="dest_address_number" class="block text-[0.875rem] sr-only">Numero civico*</label>
										<input
											type="text"
											placeholder="Numero civico*"
											v-model="destinationAddress.address_number"
											id="dest_address_number"
											:class="[fieldClass('dest', 'address_number'), deliveryMode === 'pudo' ? '!bg-white !border-[#CBD5DF] !text-[#4B5563] cursor-not-allowed' : '']"
											:readonly="deliveryMode === 'pudo'"
											required
											style="font-size: 16px;" />
										<p v-if="getFieldError('dest', 'address_number')" class="field-gentle-error">{{ fieldErrorText('dest', 'address_number') }}</p>
										<button
											v-if="getFieldAssist('dest', 'address_number')"
											type="button"
											class="field-assist-chip"
											@click="applyFieldAssist('dest', 'address_number')">
											<Icon name="mdi:lightbulb-on-outline" class="text-[0.95rem]" />
											{{ getFieldAssist('dest', 'address_number')?.label }}
										</button>
									</div>

									<div>
										<label for="dest_intercom" class="block text-[0.875rem] sr-only">Citofono</label>
										<input type="text" placeholder="Citofono" v-model="destinationAddress.intercom_code" id="dest_intercom" :class="['input-preventivo-step-2', deliveryMode === 'pudo' ? '!bg-white !border-[#CBD5DF] !text-[#4B5563] cursor-not-allowed' : '']" :readonly="deliveryMode === 'pudo'" style="font-size: 16px;" />
									</div>
								</div>

								<div class="mt-[16px] tablet:mt-[39px] grid grid-cols-2 tablet:grid-cols-4 gap-[16px] tablet:gap-x-[25px]">
									<div>
										<label for="dest_country" class="block text-[0.875rem] sr-only">Paese*</label>
										<input type="text" placeholder="Paese*" value="Italia" id="dest_country" class="input-preventivo-step-2" disabled style="font-size: 16px;" />
									</div>

									<div class="relative">
										<label for="dest_city" class="block text-[0.875rem] sr-only">Citta*</label>
										<input type="text" placeholder="Citta*" v-model="destinationAddress.city" id="dest_city" :class="[fieldClass('dest', 'city'), deliveryMode === 'pudo' ? '!bg-white !border-[#CBD5DF] !text-[#4B5563] cursor-not-allowed' : '']" :readonly="deliveryMode === 'pudo'" required @input="onCityInput('dest', destinationAddress.city)" @focus="onCityFocus('dest')" @blur="smartBlur('dest', 'city')" style="font-size: 16px;" />
										<p v-if="getFieldError('dest', 'city')" class="field-gentle-error">{{ fieldErrorText('dest', 'city') }}</p>
										<button
											v-if="getFieldAssist('dest', 'city')"
											type="button"
											class="field-assist-chip"
											@click="applyFieldAssist('dest', 'city')">
											<Icon name="mdi:lightbulb-on-outline" class="text-[0.95rem]" />
											{{ getFieldAssist('dest', 'city')?.label }}
										</button>
										<ul v-if="deliveryMode !== 'pudo' && destCitySuggestions.length > 0" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#D0D0D0] rounded-[8px] mt-[2px] shadow-lg max-h-[200px] overflow-y-auto">
											<li v-for="loc in destCitySuggestions" :key="`${loc.postal_code}-${loc.place_name}`" @mousedown.prevent="selectCity('dest', loc)" class="px-[12px] py-[8px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42]">
												<span class="font-semibold">{{ formatCitySuggestionLabel(loc) }}</span>
											</li>
										</ul>
									</div>

									<div class="relative">
										<label for="dest_province" class="block text-[0.875rem] sr-only">Provincia*</label>
										<input type="text" placeholder="Provincia* (es. MI)" v-model="destinationAddress.province" id="dest_province" :class="[fieldClass('dest', 'province'), deliveryMode === 'pudo' ? '!bg-white !border-[#CBD5DF] !text-[#4B5563] cursor-not-allowed' : '']" :readonly="deliveryMode === 'pudo'" required maxlength="2" @input="onProvinciaInput('dest', destinationAddress.province)" @focus="onProvinceFocus('dest')" @blur="smartBlur('dest', 'province')" style="font-size: 16px;" />
										<p v-if="getFieldError('dest', 'province')" class="field-gentle-error">{{ fieldErrorText('dest', 'province') }}</p>
										<button
											v-if="getFieldAssist('dest', 'province')"
											type="button"
											class="field-assist-chip"
											@click="applyFieldAssist('dest', 'province')">
											<Icon name="mdi:lightbulb-on-outline" class="text-[0.95rem]" />
											{{ getFieldAssist('dest', 'province')?.label }}
										</button>
										<ul v-if="deliveryMode !== 'pudo' && destProvinceSuggestions.length > 0" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#D0D0D0] rounded-[8px] mt-[2px] shadow-lg">
											<li v-for="prov in destProvinceSuggestions" :key="prov" @mousedown.prevent="selectProvincia('dest', prov)" class="px-[12px] py-[8px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42]">{{ prov }}</li>
										</ul>
									</div>

									<div class="relative">
										<label for="dest_postal_code" class="block text-[0.875rem] sr-only">CAP*</label>
										<input type="text" placeholder="CAP*" v-model="destinationAddress.postal_code" id="dest_postal_code" :class="[fieldClass('dest', 'postal_code'), deliveryMode === 'pudo' ? '!bg-white !border-[#CBD5DF] !text-[#4B5563] cursor-not-allowed' : '']" :readonly="deliveryMode === 'pudo'" required maxlength="5" @input="onCapInput('dest', destinationAddress.postal_code)" @focus="onCapFocus('dest')" @blur="smartBlur('dest', 'postal_code')" style="font-size: 16px;" />
										<p v-if="getFieldError('dest', 'postal_code')" class="field-gentle-error">{{ fieldErrorText('dest', 'postal_code') }}</p>
										<button
											v-if="getFieldAssist('dest', 'postal_code')"
											type="button"
											class="field-assist-chip"
											@click="applyFieldAssist('dest', 'postal_code')">
											<Icon name="mdi:lightbulb-on-outline" class="text-[0.95rem]" />
											{{ getFieldAssist('dest', 'postal_code')?.label }}
										</button>
										<ul v-if="deliveryMode !== 'pudo' && destCapSuggestions.length > 0" class="absolute z-50 top-full left-0 right-0 bg-white border border-[#D0D0D0] rounded-[8px] mt-[2px] shadow-lg max-h-[220px] overflow-y-auto">
											<li v-for="loc in destCapSuggestions" :key="`dest-cap-${loc.postal_code}-${loc.place_name}-${loc.province || ''}`" @mousedown.prevent="selectCap('dest', loc)" class="px-[12px] py-[8px] cursor-pointer hover:bg-[#f0fafb] text-[0.875rem] text-[#252B42]">
												<span class="font-semibold">{{ formatCapSuggestionLabel(loc) }}</span>
											</li>
										</ul>
									</div>
								</div>
								</div>
							</div>

						</template>
						</div>

						<div v-if="dateError" class="ux-alert ux-alert--soft mt-[16px]">
							<svg xmlns="http://www.w3.org/2000/svg" class="ux-alert__icon" viewBox="0 0 24 24"><path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2z"/><path fill="currentColor" d="M1 21h22L12 2z"/></svg>
							<span>{{ softenErrorMessage(dateError) }}</span>
						</div>

						<div class="mt-[28px] flex flex-col tablet:flex-row flex-wrap gap-[12px] items-stretch tablet:items-center justify-between">
							<template v-if="showAddressFields">
								<button
									type="button"
									@click="goBackToServices"
									class="inline-flex items-center justify-center gap-[8px] h-[52px] px-[24px] rounded-[50px] bg-[#095866] text-white font-semibold hover:bg-[#074a56] transition cursor-pointer">
									<Icon name="mdi:arrow-left" class="text-[18px]" />
									Indietro
								</button>
									<button
										type="submit"
										:disabled="isSubmitting"
										class="inline-flex items-center gap-[8px] bg-[#E44203] text-white font-semibold text-[1rem] px-[28px] h-[52px] rounded-[50px] hover:opacity-90 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
										{{ isSubmitting ? 'Salvataggio in corso...' : (editCartId ? 'Continua al riepilogo modifica' : 'Continua al riepilogo') }}
										<Icon v-if="!isSubmitting" name="mdi:arrow-right" class="text-[18px]" />
									</button>
							</template>
							<template v-else>
								<NuxtLink :to="editCartId ? '/carrello' : { path: '/', hash: '#preventivo' }" class="inline-flex items-center justify-center gap-[8px] h-[52px] px-[24px] rounded-[50px] bg-[#095866] text-white font-semibold hover:bg-[#074a56] transition">
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
						<div v-if="submitError" class="ux-alert ux-alert--soft mt-[16px]">
							<svg xmlns="http://www.w3.org/2000/svg" class="ux-alert__icon" viewBox="0 0 24 24"><path fill="currentColor" d="M13 13h-2V7h2m0 10h-2v-2h2M12 2a10 10 0 0 1 10 10a10 10 0 0 1-10 10A10 10 0 0 1 2 12A10 10 0 0 1 12 2"/></svg>
							<span>{{ softenErrorMessage(submitError) }}</span>
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
	background: transparent;
	border-radius: 12px;
	overflow: hidden;
}

/* Miglioramento UX: aggiunto focus state per accessibilita' e feedback visivo */
.input-preventivo-step-2 {
	font-family: "Montserrat", sans-serif;
	background: #ffffff !important;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	border: 1px solid #d9dde3;
	border-radius: 12px;
	padding: 12px 16px;
	color: #252B42;
	transition: border-color 0.2s;
}

.input-preventivo-step-2:focus {
	border-color: #095866;
	outline: none;
}

.input-preventivo-step-2--warning {
	border-color: #f2b66e !important;
	background: #fffaf4 !important;
}

.field-gentle-error {
	margin-top: 6px;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-size: 0.8125rem;
	font-weight: 500;
	color: #8a5e2e;
	line-height: 1.35;
}

.field-gentle-error::before {
	content: "";
	width: 14px;
	height: 14px;
	flex-shrink: 0;
	border-radius: 999px;
	background: radial-gradient(circle at center, #d8862f 36%, #fbe2c3 38%);
}

.field-assist-chip {
	margin-top: 6px;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 6px 10px;
	border-radius: 999px;
	border: 1px solid #e8c79a;
	background: #fff4e6;
	color: #7a5425;
	font-size: 0.75rem;
	font-weight: 600;
	line-height: 1;
	cursor: pointer;
	transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.field-assist-chip:hover {
	background: #ffebd1;
	border-color: #d9a96c;
	color: #68441c;
}

.title-popup::after {
	background-image: var(--before-bg);
	width: 26px;
	height: 28px;
}

/* Box riepilogo fisso in alto */
.summary-box-fixed {
	position: sticky;
	top: 80px;
	z-index: 100;
	background: white;
	border-radius: 16px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
	padding: 20px;
	margin-bottom: 32px;
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 20px;
	will-change: transform;
}

@media (max-width: 1023px) {
	.summary-box-fixed {
		grid-template-columns: repeat(2, 1fr);
		top: 70px;
		padding: 16px;
		gap: 16px;
	}
}

@media (max-width: 719px) {
	.summary-box-fixed {
		grid-template-columns: 1fr;
		top: 60px;
		padding: 16px;
		gap: 12px;
	}
}

/* Animazione leggera sticky summary (senza spostamenti orizzontali) */
.summary-slide-enter-active,
.summary-slide-leave-active {
	transition: opacity 0.24s ease;
}

.summary-slide-enter-from {
	opacity: 0;
}

.summary-slide-enter-to {
	opacity: 1;
}

.summary-slide-leave-from {
	opacity: 1;
}

.summary-slide-leave-to {
	opacity: 0;
}

.summary-sticky-card {
	border-radius: 16px;
}

.summary-toggle-button {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: center;
	gap: 14px;
	padding: 10px 22px 14px;
	border-top: none;
	border: 0;
	background: #ffffff;
	text-align: left;
	transform: none !important;
	will-change: auto !important;
	transition-property: background-color, border-color, color;
	transition-duration: 0.2s;
	transition-timing-function: ease;
}

.summary-toggle-button:hover {
	background: #f8fbfc;
}

.summary-header-main {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
}

.summary-top-row {
	display: flex;
	align-items: center;
	gap: 12px;
	flex-wrap: wrap;
	min-height: 28px;
	padding: 12px 22px 0;
}

.summary-top-label {
	font-size: 0.9375rem;
	line-height: 1;
	font-weight: 700;
	color: #252b42;
	flex-shrink: 0;
}

.summary-mini-steps-row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.summary-mini-step {
	font-size: 0.75rem;
	line-height: 1;
	color: #737373;
	padding: 6px 10px;
	border-radius: 999px;
	border: 1px solid transparent;
	background: transparent;
	font-weight: 500;
	white-space: nowrap;
	transform: none !important;
	will-change: auto !important;
	transition-property: background-color, color, border-color;
	transition-duration: 0.2s;
	transition-timing-function: ease;
}

.summary-mini-step.is-active {
	background: #e44203;
	color: #ffffff;
	font-weight: 700;
	padding-inline: 12px;
}

.summary-mini-step.is-completed {
	color: #252b42;
	cursor: pointer;
}

.summary-mini-step.is-completed:hover {
	color: #095866;
}

.summary-mini-step.is-disabled {
	opacity: 0.45;
	cursor: default;
}

.summary-overview-grid {
	display: grid;
	grid-template-columns: max-content max-content minmax(0, 1fr) max-content;
	gap: 10px;
	align-items: stretch;
	min-width: 0;
	width: 100%;
}

.summary-overview-item,
.summary-overview-route {
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 2px;
	min-height: 44px;
	padding: 8px 12px;
	border-radius: 12px;
	background: #f6f9fb;
	border: 1px solid #dce8ee;
	min-width: 0;
}

.summary-overview-route {
	background: #f4f8fb;
}

.summary-overview-label {
	font-size: 0.6875rem;
	font-weight: 700;
	letter-spacing: 0.02em;
	text-transform: uppercase;
	color: #738295;
	line-height: 1.1;
}

.summary-overview-value {
	font-size: 0.9375rem;
	font-weight: 700;
	line-height: 1.2;
	color: #1f2a3c;
}

.summary-overview-packages-value {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
}

.summary-package-type-icon {
	width: 16px;
	height: 16px;
	flex-shrink: 0;
	object-fit: contain;
}

.summary-overview-packages-text {
	white-space: nowrap;
}

.summary-overview-packages-separator {
	color: #7c8ba0;
}

.summary-overview-packages-type {
	color: #3b4c62;
	white-space: nowrap;
}

.summary-overview-total {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: flex-end;
	gap: 1px;
	padding: 8px 12px;
	border-radius: 12px;
	background: #e9f5f7;
	border: 1px solid #bdd9dd;
	min-width: 128px;
}

.summary-overview-total-label {
	font-size: 0.6875rem;
	font-weight: 700;
	letter-spacing: 0.02em;
	text-transform: uppercase;
	color: #5f7f89;
}

.summary-overview-total-value {
	font-size: 1.25rem;
	font-weight: 800;
	line-height: 1;
	color: #095866;
	white-space: nowrap;
}

.summary-overview-truncate {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.summary-chevron-wrap {
	flex-shrink: 0;
	width: 38px;
	height: 38px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 12px;
	border: 1px solid #c7d8dc;
	background: #edf5f7;
}

.summary-chevron-icon {
	transition: transform 0.2s ease;
	transform-origin: center;
}

.summary-chevron-icon.is-open {
	transform: rotate(180deg);
}

.summary-toggle-button:hover,
.summary-toggle-button:focus-visible,
.summary-mini-step:hover,
.summary-mini-step:focus-visible {
	transform: none !important;
}

.summary-route-warning {
	margin: 0 22px 10px;
	font-size: 0.75rem;
}

.summary-details-row {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 10px;
	padding: 10px 22px 14px;
	border-top: 1px solid #e8eef2;
	background: #fbfdfe;
}

.summary-detail-item {
	display: flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
	padding: 8px 10px;
	border-radius: 10px;
	background: #ffffff;
	border: 1px solid #e3ebef;
}

.summary-detail-label {
	font-size: 0.75rem;
	font-weight: 600;
	color: #738295;
}

.summary-detail-value {
	font-size: 0.875rem;
	font-weight: 700;
	color: #253247;
	min-width: 0;
}

.summary-detail-more {
	margin-left: auto;
	height: 24px;
	padding: 0 9px;
	border-radius: 999px;
	border: 1px solid #c9d8df;
	background: #f4f9fb;
	color: #095866;
	font-size: 0.6875rem;
	font-weight: 700;
	line-height: 1;
	white-space: nowrap;
	cursor: pointer;
	transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.summary-detail-more:hover {
	background: #eaf6f8;
	border-color: #95c4cc;
}

.summary-detail-expand {
	padding: 0 22px 14px;
	border-top: 1px solid #eef3f6;
	background: #fbfdfe;
}

.summary-detail-expand-block {
	padding-top: 10px;
}

.summary-detail-expand-title {
	font-size: 0.75rem;
	font-weight: 700;
	color: #667589;
	text-transform: uppercase;
	letter-spacing: 0.02em;
	margin-bottom: 8px;
}

.summary-detail-pill-wrap {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.summary-detail-pill {
	display: inline-flex;
	align-items: center;
	min-height: 28px;
	padding: 5px 10px;
	border-radius: 10px;
	background: #ffffff;
	border: 1px solid #d9e4ea;
	color: #253247;
	font-size: 0.8125rem;
	font-weight: 600;
	max-width: 100%;
}

.summary-detail-pill-icon {
	width: 14px;
	height: 14px;
	flex-shrink: 0;
	object-fit: contain;
	margin-right: 6px;
}

.summary-detail-pill-text {
	display: inline-block;
	min-width: 0;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.summary-detail-truncate {
	display: inline-block;
	min-width: 0;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

@media (max-width: 1024px) {
	.summary-toggle-button {
		padding: 12px 16px;
	}

	.summary-top-row {
		padding: 10px 16px 0;
	}

	.summary-overview-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.summary-overview-total {
		align-items: flex-start;
		min-width: 0;
	}

	.summary-details-row {
		grid-template-columns: 1fr;
		padding-inline: 16px;
	}

	.summary-route-warning {
		margin-inline: 16px;
	}

	.summary-detail-expand {
		padding-inline: 16px;
	}
}

@media (max-width: 720px) {
	.summary-toggle-button {
		padding: 8px 14px 12px;
		grid-template-columns: minmax(0, 1fr) 38px;
	}

	.summary-top-row {
		gap: 8px;
		min-height: 0;
		padding: 10px 14px 0;
	}

	.summary-mini-steps-row {
		gap: 8px;
	}

	.summary-mini-step {
		font-size: 0.75rem;
		padding: 5px 8px;
	}

	.summary-overview-grid {
		grid-template-columns: 1fr;
		gap: 8px;
	}

	.summary-overview-item,
	.summary-overview-route,
	.summary-overview-total {
		min-height: 40px;
		padding: 7px 10px;
	}

	.summary-overview-total {
		align-items: flex-start;
	}

	.summary-overview-total-value {
		font-size: 1.08rem;
	}

	.summary-details-row {
		padding: 8px 14px 12px;
	}

	.summary-route-warning {
		margin: 0 14px 10px;
	}

	.summary-detail-expand {
		padding: 0 14px 12px;
	}

	.summary-detail-pill {
		width: 100%;
	}
}

/* Card riepilogo */
.summary-card {
	background: #F8F9FA;
	border-radius: 12px;
	padding: 16px;
	border: 1px solid #E0E0E0;
	transition: all 0.3s ease;
}

.summary-card:hover {
	border-color: #095866;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.summary-card-title {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 0.875rem;
	font-weight: 700;
	color: #095866;
	margin-bottom: 12px;
}

.summary-card-content {
	font-size: 0.8125rem;
	color: #252B42;
}

/* Card prezzo con gradiente */
.summary-card-price {
	background: linear-gradient(135deg, #E44203 0%, #095866 100%);
	color: white;
}

.summary-card-price .summary-card-title {
	color: white;
}

.summary-card-price .summary-card-content {
	color: white;
}

.summary-card-price:hover {
	border-color: #E44203;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

/* Swiper navigation buttons disabled state */
.swiper-button-disabled {
	opacity: 0.3;
	cursor: not-allowed;
}

/* Smooth transitions for all interactive elements */
button, a, input, select, label {
	transition: color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
		background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
		border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
		box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
		opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Focus states for accessibility */
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible {
	outline: 2px solid #095866;
	outline-offset: 2px;
}

/* Improved service cards */
.service-list {
	transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.service-list::before {
	content: '';
	background-image: var(--before-service-bg);
	background-size: contain;
	background-repeat: no-repeat;
	background-position: center;
	width: var(--before-service-width);
	height: var(--before-service-height);
	display: block;
	margin: 0 auto;
}

/* Date picker improvements */
.my-swiper .swiper-slide {
	height: auto;
}

/* Fix bottoni navigazione date picker - DEVONO essere circolari perfetti */
/* Bottoni navigazione date picker - pill-shaped come tutti gli altri */
.custom-prev,
.custom-next {
	/* Rimosso border-radius: 50% - ora usano rounded-[50px] dal template */
}

/* Assicura che le immagini dentro i bottoni siano centrate */
.custom-prev img,
.custom-next img {
	margin: 0 auto;
}

/* Summary box scroll behavior */
.summary-card-content::-webkit-scrollbar {
	width: 4px;
}

.summary-card-content::-webkit-scrollbar-track {
	background: rgba(0, 0, 0, 0.05);
	border-radius: 2px;
}

.summary-card-content::-webkit-scrollbar-thumb {
	background: #095866;
	border-radius: 2px;
}

.summary-card-content::-webkit-scrollbar-thumb:hover {
	background: #074a56;
}

/* Animazione accordion per summary box collapsabile */
.accordion-content {
	transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	overflow: hidden;
}

.accordion-enter-active,
.accordion-leave-active {
	transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ========================================
   HERO CARD "SENZA ETICHETTA" - Full Width Verticale
   Design: Gradiente Teal/Arancione brand
   ======================================== */

.labelless-service-hero {
	position: relative;
	background: linear-gradient(135deg, #095866 0%, #0a6b7a 30%, #E44203 100%);
	background-size: 200% 200%;
	border-radius: 24px;
	padding: 32px 28px;
	overflow: hidden;
	box-shadow:
		0 20px 60px rgba(9, 88, 102, 0.4),
		0 0 0 1px rgba(255, 255, 255, 0.1) inset;
	animation: gradientShift 8s ease infinite;
	transition: transform 0.3s ease, box-shadow 0.3s ease;
	will-change: transform;
	transform: translateZ(0);
}

.labelless-service-hero:hover {
	transform: translateY(-4px) translateZ(0);
	box-shadow:
		0 30px 80px rgba(9, 88, 102, 0.5),
		0 0 0 1px rgba(255, 255, 255, 0.2) inset;
}

.labelless-service-hero.is-selected {
	box-shadow:
		0 30px 80px rgba(228, 66, 3, 0.5),
		0 0 0 4px #4ade80;
}

/* Checkmark quando selezionato */
.checkmark-container {
	position: absolute;
	top: 16px;
	left: 16px;
	width: 36px;
	height: 36px;
	background: #4ade80;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4px 12px rgba(74, 222, 128, 0.4);
	z-index: 10;
	animation: checkmarkPop 0.3s ease;
}

@keyframes checkmarkPop {
	0% { transform: scale(0); }
	50% { transform: scale(1.2); }
	100% { transform: scale(1); }
}

.checkmark-icon {
	width: 22px;
	height: 22px;
	color: white;
	stroke-width: 3;
}

/* Animazioni */
@keyframes gradientShift {
	0%, 100% { background-position: 0% 50%; }
	50% { background-position: 100% 50%; }
}

@keyframes badgePulse {
	0%, 100% { transform: scale(1); }
	50% { transform: scale(1.08); }
}

@keyframes sparkle {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.6; }
}

@keyframes shimmerSlide {
	0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
	100% { transform: translateX(200%) translateY(200%) rotate(45deg); }
}

@keyframes iconGlow {
	0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
	50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.2); }
}

/* Shimmer Effect */
.shimmer {
	position: absolute;
	top: -50%;
	left: -50%;
	width: 200%;
	height: 200%;
	background: linear-gradient(
		45deg,
		transparent 30%,
		rgba(255, 255, 255, 0.15) 50%,
		transparent 70%
	);
	animation: shimmerSlide 4s ease-in-out infinite;
	pointer-events: none;
	z-index: 1;
}

/* Badge Container */
.badge-container {
	position: absolute;
	top: 16px;
	right: 16px;
	z-index: 10;
}

.badge-popular {
	background: linear-gradient(135deg, #fbbf24, #f59e0b);
	color: white;
	padding: 8px 16px;
	border-radius: 20px;
	font-size: 0.75rem;
	font-weight: 800;
	letter-spacing: 0.5px;
	display: flex;
	align-items: center;
	gap: 5px;
	animation: badgePulse 2s ease-in-out infinite;
	box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
}

.badge-icon {
	font-size: 0.8125rem;
	animation: sparkle 2s ease-in-out infinite;
}

/* Icona grande centrata */
.icon-wrapper {
	position: relative;
	width: 80px;
	height: 80px;
	margin: 0 auto 20px;
}

.service-icon {
	width: 80px;
	height: 80px;
	color: white;
	filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
	position: relative;
	z-index: 2;
}

.icon-glow {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 110px;
	height: 110px;
	background: radial-gradient(circle, rgba(255, 255, 255, 0.5) 0%, transparent 70%);
	border-radius: 50%;
	animation: iconGlow 3s ease-in-out infinite;
	z-index: 1;
}

/* Titolo */
.service-title {
	color: white;
	font-size: 1.625rem;
	font-weight: 800;
	text-align: center;
	margin: 0 0 12px;
	text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	line-height: 1.2;
	position: relative;
	z-index: 2;
}

.sparkle {
	display: inline-block;
	animation: sparkle 3s ease-in-out infinite;
}

/* Descrizione */
.service-description {
	color: rgba(255, 255, 255, 0.95);
	font-size: 0.9375rem;
	text-align: center;
	margin: 0 0 24px;
	line-height: 1.5;
	position: relative;
	z-index: 2;
}

.service-description strong {
	color: white;
	font-weight: 700;
}

/* Sezione Prezzo */
.price-section {
	background: rgba(255, 255, 255, 0.15);
	border-radius: 16px;
	padding: 20px;
	backdrop-filter: blur(10px);
	border: 1px solid rgba(255, 255, 255, 0.2);
	position: relative;
	z-index: 2;
}

.price-badge {
	text-align: center;
	margin-bottom: 16px;
}

.price-label {
	display: block;
	color: rgba(255, 255, 255, 0.85);
	font-size: 0.875rem;
	font-weight: 600;
	margin-bottom: 4px;
}

.price-value {
	display: block;
	color: white;
	font-size: 2.625rem;
	font-weight: 900;
	text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	letter-spacing: -1px;
}

.value-props {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.prop {
	display: flex;
	align-items: center;
	gap: 10px;
	color: white;
	font-size: 0.875rem;
	font-weight: 600;
}

.check-icon {
	width: 20px;
	height: 20px;
	color: #4ade80;
	filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
	flex-shrink: 0;
}

/* Responsive Hero */
@media (max-width: 768px) {
	.labelless-service-hero {
		padding: 24px 20px;
		border-radius: 20px;
	}

	.icon-wrapper {
		width: 64px;
		height: 64px;
		margin-bottom: 16px;
	}

	.service-icon {
		width: 64px;
		height: 64px;
	}

	.icon-glow {
		width: 90px;
		height: 90px;
	}

	.service-title {
		font-size: 1.375rem;
	}

	.service-description {
		font-size: 0.875rem;
		margin-bottom: 20px;
	}

	.price-value {
		font-size: 2.25rem;
	}

	.prop {
		font-size: 0.8125rem;
	}

	.badge-popular {
		font-size: 0.6875rem;
		padding: 6px 12px;
	}
}

/* ============================================================
   SENZA ETICHETTA PREMIUM CARD
   ============================================================ */
.senza-etichetta-card {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;

	/* Gradient & Depth */
	background: linear-gradient(135deg, #095866 0%, #0a7a8a 50%, #E44203 100%);
	background-size: 150% 150%;
	border-radius: 20px;
	padding: 24px 20px;

	/* Shadows */
	box-shadow:
		0 16px 40px rgba(9, 88, 102, 0.35),
		0 4px 12px rgba(228, 66, 3, 0.15),
		0 0 0 1px rgba(255,255,255,0.15) inset;

	/* Animations */
	animation: premiumSlideIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards,
			subtleGradientShift 6s ease infinite;

	/* Transitions */
	transition:
		transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
		box-shadow 0.3s ease;

	cursor: pointer;
	overflow: hidden;
	will-change: transform;
	transform: translateZ(0);
}

.senza-etichetta-card:hover {
	transform: translateY(-4px) translateZ(0);
	box-shadow:
		0 24px 56px rgba(9, 88, 102, 0.4),
		0 8px 20px rgba(228, 66, 3, 0.2),
		0 0 0 1px rgba(255,255,255,0.2) inset;
}

.senza-etichetta-card.is-selected {
	box-shadow:
		0 24px 64px rgba(228, 66, 3, 0.4),
		0 0 0 3px rgba(228, 66, 3, 0.5),
		inset 0 0 0 1px rgba(255,255,255,0.2);
}

.se-left {
	display: flex;
	align-items: center;
	gap: 12px;
	flex: 1;
	min-width: 0;
}

.se-check {
	width: 28px;
	height: 28px;
	min-width: 28px;
	border-radius: 50%;
	background: transparent;
	border: 2px solid rgba(255,255,255,0.6);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.3s ease;
	position: relative;
}

.senza-etichetta-card.is-selected .se-check {
	background: transparent;
	border-color: rgba(255,255,255,0.9);
}

.senza-etichetta-card.is-selected .se-check::after {
	content: '';
	width: 14px;
	height: 14px;
	border-radius: 50%;
	background: #ffffff;
	position: absolute;
	animation: radioDotPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.se-info {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.se-title-row {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}

.se-title {
	font-size: 1.25rem;
	font-weight: 800;
	color: #ffffff;
	letter-spacing: -0.5px;
	margin: 0;
	line-height: 1.2;
	text-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.se-badge {
	font-size: 0.75rem;
	font-weight: 700;
	color: #ffffff;
	background: rgba(255,255,255,0.3);
	padding: 5px 14px;
	border-radius: 20px;
	letter-spacing: 0.5px;
	backdrop-filter: blur(10px);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	animation: badgePulse 2s ease-in-out infinite;
	white-space: nowrap;
}

.se-desc {
	font-size: 0.9375rem;
	font-weight: 500;
	color: rgba(255,255,255,0.95);
	line-height: 1.5;
	letter-spacing: 0.2px;
	margin: 0;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.se-price {
	font-size: 1.25rem;
	font-weight: 800;
	color: #ffffff;
	letter-spacing: -0.5px;
	white-space: nowrap;
	flex-shrink: 0;
	text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* Animations */
@keyframes premiumSlideIn {
	from {
		opacity: 0;
		transform: translateY(12px) scale(0.98);
	}
	to {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
}

@keyframes subtleGradientShift {
	0%, 100% { background-position: 0% 50%; }
	50% { background-position: 100% 50%; }
}

@keyframes radioDotPop {
	0% { transform: scale(0); opacity: 0; }
	50% { transform: scale(1.2); }
	100% { transform: scale(1); opacity: 1; }
}

/* Responsive - Tablet */
@media (min-width: 45rem) {
	.senza-etichetta-card {
		padding: 28px 26px;
	}

	.se-title {
		font-size: 1.375rem;
	}

	.se-desc {
		font-size: 0.9375rem;
	}

	.se-price {
		font-size: 1.375rem;
	}
}

/* Responsive - Desktop */
@media (min-width: 64rem) {
	.senza-etichetta-card {
		padding: 32px 36px;
	}

	.se-title {
		font-size: 1.5rem;
	}

	.se-desc {
		font-size: 1rem;
	}

	.se-price {
		font-size: 1.5rem;
	}
}
</style>
