export type LocationRecord = {
	place_name?: string
	postal_code?: string
	province?: string
	province_name?: string
	country_name?: string
	[key: string]: unknown
}

/**
 * Utility condivise per normalizzazione e gestione località.
 * Usato da useLocationAutocomplete, useLocationSearch, useAddressForm,
 * useCityCapAutocomplete, useShipmentStepValidation, useQuickQuoteLocations,
 * [step].vue, Preventivo.
 *
 * Le località italiane hanno: place_name (città), postal_code (CAP), province/province_name (sigla provincia).
 */

/**
 * Normalizza testo località per confronti case/accent-insensitive.
 * Rimuove accenti, converte in lowercase, collassa spazi multipli.
 */
export const normalizeLocationText = (value: unknown = ""): string =>
	String(value)
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036F]/g, "")
		.replace(/\s+/g, " ")
		.trim();

/**
 * Restituisce la sigla provincia in uppercase da un oggetto località.
 * Supporta sia `province` che `province_name` come campo sorgente.
 */
export const getProvinceLabel = (location: LocationRecord | null | undefined): string =>
	String(location?.province ?? location?.province_name ?? "")
		.toUpperCase()
		.trim();

/**
 * Genera una chiave univoca per una località (CAP|città|provincia).
 * Usata per deduplicazione e confronti.
 */
export const locationKey = (location: LocationRecord | null | undefined): string => [
	String(location?.postal_code || "").trim(),
	normalizeLocationText(location?.place_name),
	getProvinceLabel(location),
].join("|");

/**
 * Rimuove località duplicate da un array, basandosi su locationKey.
 * Ignora entries senza place_name o postal_code.
 */
export const dedupeLocations = (locations: unknown[] = []): LocationRecord[] => {
	const map = new Map<string, LocationRecord>();
	for (const location of locations) {
		const candidate = location && typeof location === "object" ? location as LocationRecord : null;
		if (!candidate?.place_name || !candidate?.postal_code) continue;
		const key = locationKey(candidate);
		if (!map.has(key)) map.set(key, candidate);
	}
	return Array.from(map.values());
};
