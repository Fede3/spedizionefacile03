/**
 * useLocation.js - Aggregatore ricerca geografica:
 *   useLocationSearch      → città/CAP via /api/locations/*
 *   useAddressAutocomplete → autocomplete + validazione coerenza CAP/città/prov
 *   useAddressPudo         → selezione punto PUDO BRT
 * ARCHIVIATO: _archive/cleanup-features-2026-04-20/composables-consolidati-location-address/
 */
import { ref, watch } from "vue";
import type { Ref } from "vue";
import { dedupeLocations, getProvinceLabel, locationKey, normalizeLocationText } from "~/utils/location";
import type { LocationRecord } from "~/utils/location";

type LocationClient = (url: string) => Promise<unknown>;
type PudoPoint = {
	name?: string;
	address?: string;
	city?: string;
	zip_code?: string;
	province?: string;
};
type AddressPudoArgs = {
	destinationAddress: Ref<Record<string, string>>;
	deliveryMode: Ref<string>;
	session: Ref<{ data?: { shipment_details?: Record<string, string> } } | null>;
	userStore: {
		selectedPudo?: PudoPoint | null;
		shipmentDetails?: Record<string, string>;
	};
	sv: {
		clearError: (field: string) => void;
	};
};

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 1: LocationSearch (ex useLocationSearch)
// Ricerca città/CAP generica via API pubblica /api/locations/*
// ─────────────────────────────────────────────────────────────────────────────
export const useLocationSearch = (client?: LocationClient) => {
	const locationSearchError = ref("");

	const setLocationSearchError = () => {
		locationSearchError.value = "Ricerca località temporaneamente non disponibile. Riprova tra pochi secondi.";
	};

	const clearLocationSearchError = () => {
		locationSearchError.value = "";
	};

	const normalizeCountryCode = (value: unknown = ""): string => {
		const normalized = String(value || "").trim().toUpperCase();
		return normalized.length === 2 ? normalized : "";
	};

	const buildCountryQuery = (countryCode: unknown): string => {
		const normalized = normalizeCountryCode(countryCode);
		return normalized ? `&country=${encodeURIComponent(normalized)}` : "";
	};

	const cityMatchesQuery = (cityValue: unknown, rawQuery: unknown): boolean => {
		const city = normalizeLocationText(cityValue);
		const query = normalizeLocationText(rawQuery);
		if (!query) return true;
		return city.startsWith(query);
	};

	const sortLocations = (a: LocationRecord, b: LocationRecord): number => {
		const aName = normalizeLocationText(a?.place_name || "");
		const bName = normalizeLocationText(b?.place_name || "");
		if (aName !== bName) return aName.localeCompare(bName);
		return String(a?.postal_code || "").localeCompare(String(b?.postal_code || ""));
	};

	const cityRelevanceScore = (location: LocationRecord, rawQuery: unknown): number => {
		const query = normalizeLocationText(rawQuery);
		const city = normalizeLocationText(location?.place_name || "");
		if (!query) return 99;

		if (city === query) return 0;
		if (city.startsWith(`${query} `) || city.startsWith(`${query}'`) || city.startsWith(`${query}-`)) return 1;
		if (city.startsWith(query)) return 2;
		return 99;
	};

	const sortCitySuggestionsByRelevance = (locations: LocationRecord[], query: unknown): LocationRecord[] => {
		return [...locations].sort((a, b) => {
			const scoreA = cityRelevanceScore(a, query);
			const scoreB = cityRelevanceScore(b, query);
			if (scoreA !== scoreB) return scoreA - scoreB;

			const nameA = normalizeLocationText(a?.place_name || "");
			const nameB = normalizeLocationText(b?.place_name || "");
			if (nameA.length !== nameB.length) return nameA.length - nameB.length;
			if (nameA !== nameB) return nameA.localeCompare(nameB);

			return String(a?.postal_code || "").localeCompare(String(b?.postal_code || ""));
		});
	};

	const requestLocations = async (url: string): Promise<unknown[]> => {
		let primaryError: unknown = null;

		if (typeof client === "function") {
			try {
				const payload = await client(url);
				return Array.isArray(payload) ? payload : [];
			} catch (error) {
				primaryError = error;
			}
		}

		try {
			const payload = await $fetch(url, {
				credentials: "include",
			});
			return Array.isArray(payload) ? payload : [];
		} catch (fallbackError) {
			throw primaryError || fallbackError;
		}
	};

	const searchLocations = async (query: unknown, limit = 200, countryCode = ""): Promise<LocationRecord[]> => {
		if (!query || String(query).trim().length < 2) return [];
		try {
			const q = encodeURIComponent(String(query).trim());
			const results = await requestLocations(`/api/locations/search?q=${q}&limit=${limit}${buildCountryQuery(countryCode)}`);
			clearLocationSearchError();
			return dedupeLocations(results || []);
		} catch {
			setLocationSearchError();
			return [];
		}
	};

	const searchLocationsByCap = async (cap: unknown, countryCode = ""): Promise<LocationRecord[]> => {
		if (!cap) return [];
		try {
			const q = encodeURIComponent(String(cap).trim());
			const results = await requestLocations(`/api/locations/by-cap?cap=${q}${buildCountryQuery(countryCode)}`);
			clearLocationSearchError();
			return dedupeLocations(results || []);
		} catch {
			setLocationSearchError();
			return [];
		}
	};

	const searchLocationsByCity = async (city: unknown, limit = 200, countryCode = ""): Promise<LocationRecord[]> => {
		if (!city || String(city).trim().length < 2) return [];
		try {
			const q = encodeURIComponent(String(city).trim());
			const results = await requestLocations(`/api/locations/by-city?city=${q}&limit=${limit}${buildCountryQuery(countryCode)}`);
			clearLocationSearchError();
			return dedupeLocations(results || []);
		} catch {
			setLocationSearchError();
			return [];
		}
	};

	return {
		cityMatchesQuery,
		clearLocationSearchError,
		dedupeLocations,
		getProvinceLabel,
		locationKey,
		locationSearchError,
		normalizeLocationText,
		searchLocations,
		searchLocationsByCap,
		searchLocationsByCity,
		sortCitySuggestionsByRelevance,
		sortLocations,
	};
};

// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 2: AddressAutocomplete (ex useAddressAutocomplete)
// Autocompletamento citta'/CAP/provincia con API locations,
// validazione coerenza CAP-citta'-provincia, formatters, blur/focus handlers.
//
// DIPENDENZE INIETTATE:
//   - originAddress, destinationAddress: ref indirizzi
//   - deliveryMode: computed delivery mode
//   - sv: validation helper (useShipmentFieldValidation)
//   - sanctumClient: API client
// ─────────────────────────────────────────────────────────────────────────────

// useAddressAutocomplete estratto in composables/useAddressAutocomplete.js


// ─────────────────────────────────────────────────────────────────────────────
// SEZIONE 3: AddressPudo (ex useAddressPudo)
// Gestione selezione/deselezione punto PUDO (BRT pickup point),
// aggiornamento indirizzo destinazione da PUDO, watcher delivery mode.
//
// DIPENDENZE INIETTATE:
//   - destinationAddress: ref indirizzo destinazione
//   - deliveryMode: computed delivery mode
//   - session: ref sessione spedizione
//   - userStore: Pinia user store
//   - sv: validation helper (useShipmentFieldValidation)
// ─────────────────────────────────────────────────────────────────────────────
export function useAddressPudo({
  destinationAddress,
  deliveryMode,
  session,
  userStore,
  sv,
}: AddressPudoArgs) {
  // --- NORMALIZE HELPER (local, no external dep needed) ---
  const normalizeText = (value: unknown = ""): string =>
    String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036F]/g, "")
      .toLowerCase()
      .trim();

  // --- PUDO SELECT/DESELECT ---
  const onPudoSelected = (pudo: PudoPoint) => {
    userStore.selectedPudo = pudo;
    destinationAddress.value.address = pudo.address || "";
    destinationAddress.value.address_number = "SNC";
    destinationAddress.value.city = pudo.city || "";
    destinationAddress.value.postal_code = pudo.zip_code || "";
    destinationAddress.value.province = pudo.province || "ND";
    const selectedPudoName = normalizeText(pudo?.name || "");
    const currentDestName = normalizeText(destinationAddress.value.full_name || "");
    if (selectedPudoName && currentDestName && selectedPudoName === currentDestName) {
      destinationAddress.value.full_name = "";
    }
    userStore.shipmentDetails = {
      ...(userStore.shipmentDetails || {}),
      destination_city: pudo.city || destinationAddress.value.city || "",
      destination_postal_code: pudo.zip_code || destinationAddress.value.postal_code || "",
    };
  };

  const onPudoDeselected = () => {
    userStore.selectedPudo = null;
    destinationAddress.value.address = "";
    destinationAddress.value.address_number = "";
    destinationAddress.value.city = session.value?.data?.shipment_details?.destination_city || "";
    destinationAddress.value.postal_code = session.value?.data?.shipment_details?.destination_postal_code || "";
    destinationAddress.value.province = "";
  };

  // --- DELIVERY MODE WATCHER ---
  watch(deliveryMode, (newMode) => {
    if (newMode === "home") {
      userStore.selectedPudo = null;
      return;
    }
    [
      "dest_address",
      "dest_address_number",
      "dest_city",
      "dest_province",
      "dest_postal_code",
    ].forEach((fieldKey) => sv.clearError(fieldKey));
  });

  return {
    onPudoSelected,
    onPudoDeselected,
  };
}
