/**
 * FILE: stores/userStore.js
 * SCOPO: Store Pinia — stato globale condiviso tra pagine (preventivo, spedizione, indirizzi).
 * STATO: stepNumber, shipmentDetails, isQuoteStarted, totalPrice, packages, servicesArray,
 *        pendingShipment, originAddressData, destinationAddressData, pickupDate.
 * USATO DA: pages/preventivo.vue, pages/la-tua-spedizione/[step].vue, pages/riepilogo.vue,
 *           components/Homepage/PreventivoRapido.vue, components/Preventivo.vue.
 * NOTE: pendingShipment contiene i dati completi per la pagina /riepilogo
 *       (pacchi, indirizzi, servizi, prezzo) prima dell'invio al carrello o checkout.
 *       Lo stato viene salvato in sessionStorage per non perderlo al refresh della pagina.
 */
import { defineStore } from "pinia";

// Chiave per sessionStorage
const STORAGE_KEY = "spedizionefacile_user_store";

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
	const saved = loadFromSession();

	const stepNumber = ref(saved?.stepNumber ?? 1);

	const shipmentDetails = ref(saved?.shipmentDetails ?? {
		origin_city: "",
		origin_postal_code: "",
		destination_city: "",
		destination_postal_code: "",
		date: "",
	});

	const isQuoteStarted = ref(saved?.isQuoteStarted ?? false);

	const totalPrice = ref(saved?.totalPrice ?? 0);

	const packages = ref(saved?.packages ?? []);

	const servicesArray = ref(saved?.servicesArray ?? []);

	// Content description for the package (e.g. "Elettronica", "Abbigliamento")
	const contentDescription = ref(saved?.contentDescription ?? "");

	// Pending shipment payload (used for riepilogo and backward navigation)
	const pendingShipment = ref(saved?.pendingShipment ?? null);

	// Address data for pre-filling when navigating back
	const originAddressData = ref(saved?.originAddressData ?? null);
	const destinationAddressData = ref(saved?.destinationAddressData ?? null);
	const pickupDate = ref(saved?.pickupDate ?? "");

	// ID del pacco nel carrello che si sta modificando (null = nuova spedizione)
	const editingCartItemId = ref(saved?.editingCartItemId ?? null);

	// Salva in sessionStorage ogni volta che cambia qualcosa
	function persist() {
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
		});
	}

	// Osserva tutti i campi e persisti automaticamente
	watch([stepNumber, shipmentDetails, isQuoteStarted, totalPrice, packages,
		servicesArray, contentDescription, pendingShipment, originAddressData,
		destinationAddressData, pickupDate, editingCartItemId], persist, { deep: true });

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
	};
});
