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
	// Carica lo stato precedente da sessionStorage (se presente, es. dopo refresh)
	const saved = loadFromSession();

	// --- STATO DEL FLUSSO DI SPEDIZIONE ---

	const stepNumber = ref(saved?.stepNumber ?? 1);       // Step corrente del processo (1-5)

	// --- DETTAGLI SPEDIZIONE (Step 1 — Preventivo) ---

	const shipmentDetails = ref(saved?.shipmentDetails ?? {
		origin_city: "",              // Citta' di partenza (es. "Milano")
		origin_postal_code: "",       // CAP di partenza (es. "20100")
		destination_city: "",         // Citta' di destinazione
		destination_postal_code: "",  // CAP di destinazione
		date: "",                     // Data di ritiro (formato YYYY-MM-DD)
	});

	const isQuoteStarted = ref(saved?.isQuoteStarted ?? false);  // true dopo il primo calcolo prezzo

	const totalPrice = ref(saved?.totalPrice ?? 0);   // Prezzo totale in euro (somma di tutti i pacchi)

	const packages = ref(saved?.packages ?? []);       // Array pacchi: [{package_type, weight, first_size, ...}]

	// --- SERVIZI E CONTENUTO (Step 2) ---

	const servicesArray = ref(saved?.servicesArray ?? []);  // Servizi selezionati (es. ["contrassegno"])

	// Descrizione contenuto del pacco (es. "Elettronica", "Abbigliamento")
	const contentDescription = ref(saved?.contentDescription ?? "");

	// --- DATI PER IL RIEPILOGO E NAVIGAZIONE ALL'INDIETRO (Step 3-4) ---

	// Payload completo della spedizione (usato da /riepilogo per mostrare il riepilogo)
	const pendingShipment = ref(saved?.pendingShipment ?? null);

	// Dati indirizzo per pre-compilare i campi quando l'utente torna indietro
	const originAddressData = ref(saved?.originAddressData ?? null);
	const destinationAddressData = ref(saved?.destinationAddressData ?? null);
	const pickupDate = ref(saved?.pickupDate ?? "");

	// --- MODIFICA CARRELLO ---

	// ID del pacco nel carrello che si sta modificando (null = nuova spedizione)
	const editingCartItemId = ref(saved?.editingCartItemId ?? null);

	// --- PUDO (Consegna presso punto BRT) ---

	// Modalita' di consegna: 'home' = domicilio, 'pudo' = punto BRT
	const deliveryMode = ref(saved?.deliveryMode ?? 'home');
	// Punto di ritiro selezionato (oggetto con pudo_id, name, address, ecc.)
	const selectedPudo = ref(saved?.selectedPudo ?? null);

	// Salva in sessionStorage ogni volta che cambia qualcosa.
	// Debounced: accumula le modifiche e scrive una sola volta ogni 300ms
	// per evitare scritture eccessive su sessionStorage durante input rapidi.
	function persist() {
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
			});
		}, DEBOUNCE_MS);
	}

	// Osserva tutti i campi e persisti automaticamente
	watch([stepNumber, shipmentDetails, isQuoteStarted, totalPrice, packages,
		servicesArray, contentDescription, pendingShipment, originAddressData,
		destinationAddressData, pickupDate, editingCartItemId, deliveryMode, selectedPudo], persist, { deep: true });

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
	};
});
