/**
 * Tipi location/geocoding: backend search + Nominatim OSM.
 */

/** Risultato ricerca località (backend /api/locations/*). */
export interface LocationSearchResult {
	place_name: string
	postal_code: string
	country_code?: string
	country_name?: string
	province_code?: string
	province_name?: string
	latitude?: number
	longitude?: number
}

/** Risposta search Nominatim (format=jsonv2). */
export interface NominatimSearchResult {
	lat: string
	lon: string
	display_name?: string
	place_id?: number
	osm_id?: number
	osm_type?: string
	class?: string
	type?: string
	importance?: number
}

/** Sezione address di una risposta reverse Nominatim. */
export interface NominatimAddress {
	road?: string
	pedestrian?: string
	path?: string
	house_number?: string
	city?: string
	town?: string
	village?: string
	municipality?: string
	postcode?: string
	country?: string
	country_code?: string
}

/** Risposta reverse Nominatim (format=jsonv2&addressdetails=1). */
export interface NominatimReverseResult {
	display_name?: string
	address?: NominatimAddress
}
