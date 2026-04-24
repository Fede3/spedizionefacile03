/**
 * Snapshot + firma del payload preventivo per confronti di coerenza con la session backend.
 *
 * @typedef {Object} QuoteShipmentDetails
 * @property {string} origin_city
 * @property {string} origin_postal_code
 * @property {string} origin_country_code
 * @property {string} origin_country
 * @property {string} destination_city
 * @property {string} destination_postal_code
 * @property {string} destination_country_code
 * @property {string} destination_country
 * @property {string} date
 *
 * @typedef {Object} QuotePackage
 * @property {string} package_type
 * @property {number} quantity
 * @property {string} weight
 * @property {string} first_size
 * @property {string} second_size
 * @property {string} third_size
 *
 * @typedef {{ shipment_details: QuoteShipmentDetails, packages: QuotePackage[] }} SessionComparable
 * @typedef {{ shipment_details?: Object, packages?: Object[] }} QuotePayload
 */

/** Clona lo shipmentDetails normalizzando stringhe e country code per confronti stabili. */
export const cloneShipmentDetailsForQuote = (details = {}) => ({
	origin_city: String(details.origin_city || ''),
	origin_postal_code: String(details.origin_postal_code || ''),
	origin_country_code: String(details.origin_country_code || 'IT').trim().toUpperCase() || 'IT',
	origin_country: String(details.origin_country || 'Italia').trim() || 'Italia',
	destination_city: String(details.destination_city || ''),
	destination_postal_code: String(details.destination_postal_code || ''),
	destination_country_code: String(details.destination_country_code || 'IT').trim().toUpperCase() || 'IT',
	destination_country: String(details.destination_country || 'Italia').trim() || 'Italia',
	date: String(details.date || ''),
})

/** Clona un singolo pacco normalizzando i campi per il payload preventivo. */
export const clonePackageForQuote = (pack = {}) => ({
	package_type: String(pack?.package_type || ''),
	quantity: Number(pack?.quantity) || 1,
	weight: String(pack?.weight || ''),
	first_size: String(pack?.first_size || ''),
	second_size: String(pack?.second_size || ''),
	third_size: String(pack?.third_size || ''),
})

/** Clona un array di pacchi usando clonePackageForQuote. */
export const clonePackagesForQuote = (packages = []) => (
	Array.isArray(packages)
		? packages.map((pack) => clonePackageForQuote(pack))
		: []
)

/** Firma comparabile (stringa JSON normalizzata) di un payload preventivo. */
export const buildQuoteComparableSignature = (payload = {}) => JSON.stringify({
	shipment_details: cloneShipmentDetailsForQuote(payload.shipment_details || {}),
	packages: clonePackagesForQuote(payload.packages || []).map((pack) => ({
		package_type: String(pack?.package_type || ''),
		quantity: Number(pack?.quantity) || 0,
		weight: String(pack?.weight || ''),
		first_size: String(pack?.first_size || ''),
		second_size: String(pack?.second_size || ''),
		third_size: String(pack?.third_size || ''),
	})),
})

/** Estrae i campi utili della session backend per il confronto di firma. */
export const extractSessionComparablePayload = (sessionData = {}) => ({
	shipment_details: sessionData?.shipment_details || {},
	packages: sessionData?.packages || [],
})

/** Formatta una location risolta come "Citta · CAP" per confronti UI. */
export const formatResolvedLocation = (city = '', cap = '') => {
	const trimmedCity = String(city || '').trim()
	const trimmedCap = String(cap || '').trim()
	if (trimmedCity && trimmedCap) return `${trimmedCity} · ${trimmedCap}`
	return trimmedCity || trimmedCap || ''
}

/** Composable: espone snapshot + firma del preventivo + formattatore location. */
export const usePreventivoQuoteSnapshot = (shipmentFlowStore) => {
	const buildQuotePayloadSnapshot = () => ({
		shipment_details: cloneShipmentDetailsForQuote(shipmentFlowStore.shipmentDetails),
		packages: clonePackagesForQuote(shipmentFlowStore.packages),
	})

	const quoteSignature = computed(() => buildQuoteComparableSignature(buildQuotePayloadSnapshot()))

	return {
		buildQuotePayloadSnapshot,
		buildQuoteComparableSignature,
		extractSessionComparablePayload,
		formatResolvedLocation,
		quoteSignature,
	}
}
