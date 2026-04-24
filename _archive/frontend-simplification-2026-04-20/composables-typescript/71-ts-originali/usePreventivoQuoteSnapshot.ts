import type { ComputedRef } from 'vue'

interface ShipmentDetails {
	origin_city?: string
	origin_postal_code?: string
	origin_country_code?: string
	origin_country?: string
	destination_city?: string
	destination_postal_code?: string
	destination_country_code?: string
	destination_country?: string
	date?: string
	[key: string]: unknown
}

interface ShipmentPackage {
	package_type?: string
	quantity?: number | string
	weight?: string | number
	first_size?: string | number
	second_size?: string | number
	third_size?: string | number
	[key: string]: unknown
}

interface QuoteShipmentDetails {
	origin_city: string
	origin_postal_code: string
	origin_country_code: string
	origin_country: string
	destination_city: string
	destination_postal_code: string
	destination_country_code: string
	destination_country: string
	date: string
}

interface QuotePackage {
	package_type: string
	quantity: number
	weight: string
	first_size: string
	second_size: string
	third_size: string
}

interface QuotePayload {
	shipment_details?: ShipmentDetails
	packages?: ShipmentPackage[]
}

interface SessionComparable {
	shipment_details: QuoteShipmentDetails
	packages: QuotePackage[]
}

interface UserStore {
	shipmentDetails: ShipmentDetails
	packages: ShipmentPackage[]
}

export const cloneShipmentDetailsForQuote = (details: ShipmentDetails = {}): QuoteShipmentDetails => ({
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

export const clonePackageForQuote = (pack: ShipmentPackage = {}): QuotePackage => ({
	package_type: String(pack?.package_type || ''),
	quantity: Number(pack?.quantity) || 1,
	weight: String(pack?.weight || ''),
	first_size: String(pack?.first_size || ''),
	second_size: String(pack?.second_size || ''),
	third_size: String(pack?.third_size || ''),
})

export const clonePackagesForQuote = (packages: ShipmentPackage[] = []): QuotePackage[] => (
	Array.isArray(packages)
		? packages.map((pack) => clonePackageForQuote(pack))
		: []
)

export const buildQuoteComparableSignature = (payload: QuotePayload = {}): string => JSON.stringify({
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

export const extractSessionComparablePayload = (sessionData: { shipment_details?: ShipmentDetails; packages?: ShipmentPackage[] } = {}): { shipment_details: ShipmentDetails; packages: ShipmentPackage[] } => ({
	shipment_details: sessionData?.shipment_details || {},
	packages: sessionData?.packages || [],
})

export const formatResolvedLocation = (city: string = '', cap: string = ''): string => {
	const trimmedCity = String(city || '').trim()
	const trimmedCap = String(cap || '').trim()
	if (trimmedCity && trimmedCap) return `${trimmedCity} · ${trimmedCap}`
	return trimmedCity || trimmedCap || ''
}

interface UsePreventivoQuoteSnapshotReturn {
	buildQuotePayloadSnapshot: () => SessionComparable
	buildQuoteComparableSignature: typeof buildQuoteComparableSignature
	extractSessionComparablePayload: typeof extractSessionComparablePayload
	formatResolvedLocation: typeof formatResolvedLocation
	quoteSignature: ComputedRef<string>
}

export const usePreventivoQuoteSnapshot = (shipmentFlowStore: UserStore): UsePreventivoQuoteSnapshotReturn => {
	const buildQuotePayloadSnapshot = (): SessionComparable => ({
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
