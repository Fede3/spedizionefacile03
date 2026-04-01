/**
 * STORE: userStore (stores/userStore.js)
 * SCOPO: Store Pinia — stato globale condiviso tra pagine durante il flusso di spedizione.
 *
 * DOVE SI USA: components/Preventivo.vue (step 1 — misure e calcolo prezzo),
 *              pages/la-tua-spedizione/[step].vue (step 2-3 — servizi e indirizzi),
 *              pages/riepilogo.vue (step 4 — conferma e carrello)
 *
 * STATO PRINCIPALE:
 *   - stepNumber: numero dello step corrente (1-5)
 *   - shipmentDetails: citta'/CAP di partenza e destinazione + data
 *   - packages: array dei pacchi con tipo, peso, dimensioni, prezzo
 *   - totalPrice: prezzo totale calcolato (somma di tutti i pacchi)
 *   - servicesArray: servizi aggiuntivi selezionati (es. "contrassegno")
 *   - isQuoteStarted: true dopo il primo calcolo prezzo
 *   - pendingShipment: dati completi per /riepilogo (pacchi, indirizzi, servizi, prezzo)
 *   - originAddressData / destinationAddressData: indirizzi per navigazione all'indietro
 *   - pickupDate: data di ritiro selezionata
 *   - editingCartItemId: ID del pacco nel carrello in modifica (null = nuova spedizione)
 *   - deliveryMode: 'home' (domicilio) o 'pudo' (punto BRT)
 *   - selectedPudo: punto PUDO selezionato (oggetto con pudo_id, name, address, ecc.)
 *   - contentDescription: descrizione del contenuto del pacco
 *   - smsEmailNotification: toggle notifiche stato spedizione
 *   - serviceData: dati aggiuntivi dei servizi (contrassegno, assicurazione, ecc.)
 *
 * PERSISTENZA: lo stato viene salvato in sessionStorage ad ogni modifica (debounced 300ms)
 *              per non perderlo al refresh della pagina.
 *
 * VINCOLI: non aggiungere troppi campi senza aggiornare anche la funzione persist()
 * ERRORI TIPICI: dimenticare di aggiungere un nuovo campo nel watch e in persist()
 * COLLEGAMENTI: composables/useSession.js (sessione server — dati diversi),
 *               docs/architettura/MAPPA-DATI.md
 */
import { defineStore } from "pinia";

// Chiave per sessionStorage
const STORAGE_KEY = "spedizionefacile_user_store";

const DEFAULT_SHIPMENT_DETAILS = {
	origin_city: "",
	origin_postal_code: "",
	origin_country_code: "IT",
	origin_country: "Italia",
	destination_city: "",
	destination_postal_code: "",
	destination_country_code: "IT",
	destination_country: "Italia",
	date: "",
};

// Debounce: evita troppe scritture consecutive su sessionStorage.
// Il deep watcher su 14 ref scatta spesso; con debounce scriviamo max 1 volta ogni 300ms.
let debounceTimer = null;
const DEBOUNCE_MS = 300;

// Carica lo stato salvato da sessionStorage (se presente)
function loadFromSession() {
	if (import.meta.server) return null;
	try {
		const saved = sessionStorage.getItem(STORAGE_KEY);
		return saved ? JSON.parse(saved) : null;
	} catch {
		return null;
	}
}

// Salva lo stato corrente in sessionStorage
function saveToSession(state) {
	if (import.meta.server) return;
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		// sessionStorage pieno o non disponibile: ignoriamo
	}
}

export const useUserStore = defineStore("user", () => {
	// --- STATO DEL FLUSSO DI SPEDIZIONE ---

	const stepNumber = ref(1);       // Step corrente del processo (1-5)
	const hasPersistedHydration = ref(import.meta.server);

	// --- DETTAGLI SPEDIZIONE (Step 1 — Preventivo) ---

	const shipmentDetails = ref({ ...DEFAULT_SHIPMENT_DETAILS });

	if (!shipmentDetails.value.origin_country_code) shipmentDetails.value.origin_country_code = "IT";
	if (!shipmentDetails.value.origin_country) shipmentDetails.value.origin_country = "Italia";
	if (!shipmentDetails.value.destination_country_code) shipmentDetails.value.destination_country_code = "IT";
	if (!shipmentDetails.value.destination_country) shipmentDetails.value.destination_country = "Italia";

	const isQuoteStarted = ref(false);  // true dopo il primo calcolo prezzo

	const totalPrice = ref(0);   // Prezzo totale in euro (somma di tutti i pacchi)

	const packages = ref([]);       // Array pacchi: [{package_type, weight, first_size, ...}]

	// --- SERVIZI E CONTENUTO (Step 2) ---

	const servicesArray = ref([]);  // Servizi selezionati (es. ["contrassegno"])

	// Descrizione contenuto del pacco (es. "Elettronica", "Abbigliamento")
	const contentDescription = ref("");

	// --- DATI PER IL RIEPILOGO E NAVIGAZIONE ALL'INDIETRO (Step 3-4) ---

	// Payload completo della spedizione (usato da /riepilogo per mostrare il riepilogo)
	const pendingShipment = ref(null);

	// Dati indirizzo per pre-compilare i campi quando l'utente torna indietro
	const originAddressData = ref(null);
	const destinationAddressData = ref(null);
	const pickupDate = ref("");

	// --- MODIFICA CARRELLO ---

	// ID del pacco nel carrello che si sta modificando (null = nuova spedizione)
	const editingCartItemId = ref(null);

	// --- PUDO (Consegna presso punto BRT) ---

	// Modalita' di consegna: 'home' = domicilio, 'pudo' = punto BRT
	const deliveryMode = ref('home');
	// Punto di ritiro selezionato (oggetto con pudo_id, name, address, ecc.)
	const selectedPudo = ref(null);
	const smsEmailNotification = ref(false);
	const serviceData = ref({});

	function applyPersistedState(saved) {
		if (!saved || typeof saved !== "object") return;

		stepNumber.value = saved.stepNumber ?? 1;
		shipmentDetails.value = {
			...DEFAULT_SHIPMENT_DETAILS,
			...(saved.shipmentDetails || {}),
		};
		isQuoteStarted.value = saved.isQuoteStarted ?? false;
		totalPrice.value = saved.totalPrice ?? 0;
		packages.value = Array.isArray(saved.packages) ? saved.packages : [];
		servicesArray.value = Array.isArray(saved.servicesArray) ? saved.servicesArray : [];
		contentDescription.value = saved.contentDescription ?? "";
		pendingShipment.value = saved.pendingShipment ?? null;
		originAddressData.value = saved.originAddressData ?? null;
		destinationAddressData.value = saved.destinationAddressData ?? null;
		pickupDate.value = saved.pickupDate ?? "";
		editingCartItemId.value = saved.editingCartItemId ?? null;
		deliveryMode.value = saved.deliveryMode ?? "home";
		selectedPudo.value = saved.selectedPudo ?? null;
		smsEmailNotification.value = saved.smsEmailNotification ?? false;
		serviceData.value = saved.serviceData ?? {};
	}

	function hydrateFromSession() {
		if (hasPersistedHydration.value) return;
		applyPersistedState(loadFromSession());
		hasPersistedHydration.value = true;
	}

	// Salva in sessionStorage ogni volta che cambia qualcosa.
	// Debounced: accumula le modifiche e scrive una sola volta ogni 300ms
	// per evitare scritture eccessive su sessionStorage durante input rapidi.
	function persist() {
		if (!hasPersistedHydration.value) return;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			saveToSession({
				stepNumber: stepNumber.value,
				shipmentDetails: shipmentDetails.value,
				isQuoteStarted: isQuoteStarted.value,
				totalPrice: totalPrice.value,
				packages: packages.value,
				servicesArray: servicesArray.value,
				contentDescription: contentDescription.value,
				pendingShipment: pendingShipment.value,
				originAddressData: originAddressData.value,
				destinationAddressData: destinationAddressData.value,
				pickupDate: pickupDate.value,
				editingCartItemId: editingCartItemId.value,
				deliveryMode: deliveryMode.value,
				selectedPudo: selectedPudo.value,
				smsEmailNotification: smsEmailNotification.value,
				serviceData: serviceData.value,
			});
		}, DEBOUNCE_MS);
	}

	// Osserva tutti i campi e persisti automaticamente
	watch([stepNumber, shipmentDetails, isQuoteStarted, totalPrice, packages,
		servicesArray, contentDescription, pendingShipment, originAddressData,
		destinationAddressData, pickupDate, editingCartItemId, deliveryMode, selectedPudo,
		smsEmailNotification, serviceData], persist, { deep: true });

	return {
		stepNumber,
		isQuoteStarted,
		shipmentDetails,
		packages,
		totalPrice,
		servicesArray,
		contentDescription,
		pendingShipment,
		originAddressData,
		destinationAddressData,
		pickupDate,
		editingCartItemId,
		deliveryMode,
		selectedPudo,
		smsEmailNotification,
		serviceData,
		hasPersistedHydration,
		hydrateFromSession,
	};
});
