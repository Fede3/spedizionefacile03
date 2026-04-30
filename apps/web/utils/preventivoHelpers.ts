import {
	clonePackagesForQuote,
	cloneShipmentDetailsForQuote,
} from '~/utils/quickQuoteContract'

type QuoteStoreLike = {
	shipmentDetails?: Parameters<typeof cloneShipmentDetailsForQuote>[0]
	packages?: Parameters<typeof clonePackagesForQuote>[0]
}
type PackageLike = {
	weight?: unknown
	first_size?: unknown
	second_size?: unknown
	third_size?: unknown
}

export function buildQuotePayloadSnapshotFor(shipmentFlowStore: QuoteStoreLike) {
	return {
		shipment_details: cloneShipmentDetailsForQuote(shipmentFlowStore?.shipmentDetails),
		packages: clonePackagesForQuote(shipmentFlowStore?.packages),
	}
}

export function formatLivePrice(amount: unknown): string {
	return new Intl.NumberFormat('it-IT', {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(Number(amount) || 0).replace(/\s/g, '')
}

export function packageMissingMeasurements(pack: PackageLike): boolean {
	return !pack?.weight || !pack?.first_size || !pack?.second_size || !pack?.third_size
}
