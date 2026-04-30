import { DEFAULT_PICKUP_TIME_SLOT } from '~/utils/shipmentDraftPayload'

type PickupRequestData = {
	enabled: boolean
	date: string
	time_slot: string
	notes: string
}
type ServiceData = {
	contrassegno: Record<string, unknown>
	assicurazione: Record<string, unknown>
	sponda_idraulica: Record<string, unknown>
	pickup_request: PickupRequestData
	telefono_notifica: string
}
type PartialServiceData = Partial<{
	contrassegno: Record<string, unknown>
	assicurazione: Record<string, unknown>
	sponda_idraulica: Record<string, unknown>
	pickup_request: Partial<PickupRequestData>
	telefono_notifica: string
}>
export type ShipmentService = {
	key: string
	img: string
	width: number
	height: number
	name: string
	description: string
	isSelected: boolean
	featured?: boolean
	hasDetails?: boolean
	priceLabel?: string
	statusLabel?: string
	currentPriceLabel?: string
}

export const DEFAULT_SHIPMENT_SERVICES: ShipmentService[] = [
	{
		key: 'senza_etichetta',
		img: 'no-label.png',
		width: 26,
		height: 17,
		name: 'Senza etichetta',
		description: 'Niente stampante? Il corriere pensa a tutto lui.',
		isSelected: false,
		featured: true,
	},
	{
		key: 'contrassegno',
		img: 'cash-on-delivery.png',
		width: 28,
		height: 24,
		name: 'Contrassegno',
		description: 'Incasso alla consegna.',
		priceLabel: '',
		statusLabel: 'Da configurare',
		isSelected: false,
		hasDetails: true,
	},
	{
		key: 'assicurazione',
		img: 'insurance.png',
		width: 24,
		height: 24,
		name: 'Assicurazione',
		description: 'Copertura completa.',
		priceLabel: '',
		statusLabel: 'Copertura completa',
		isSelected: false,
		hasDetails: true,
	},
	{
		key: 'sponda_idraulica',
		img: 'tail-lift.png',
		width: 24,
		height: 24,
		name: 'Sponda idraulica',
		description: 'Per colli pesanti.',
		priceLabel: '',
		statusLabel: 'Per colli pesanti',
		isSelected: false,
	},
]

export const createDefaultServiceData = (): ServiceData => ({
	contrassegno: {
		importo: '',
		modalita_incasso: '',
		modalita_rimborso: '',
		dettaglio_rimborso: '',
	},
	assicurazione: {},
	sponda_idraulica: { note: '' },
	pickup_request: {
		enabled: false,
		date: '',
		time_slot: DEFAULT_PICKUP_TIME_SLOT,
		notes: '',
	},
	telefono_notifica: '',
})

export const createMergedServiceData = (storedData: PartialServiceData = {}): ServiceData => {
	const base = createDefaultServiceData()
	return {
		contrassegno: { ...base.contrassegno, ...(storedData.contrassegno || {}) },
		assicurazione: { ...base.assicurazione, ...(storedData.assicurazione || {}) },
		sponda_idraulica: { ...base.sponda_idraulica, ...(storedData.sponda_idraulica || {}) },
		pickup_request: { ...base.pickup_request, ...(storedData.pickup_request || {}) },
		telefono_notifica: storedData.telefono_notifica || '',
	}
}

export const EURO_FORMATTER = new Intl.NumberFormat('it-IT', {
	style: 'currency',
	currency: 'EUR',
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
})

export const formatCurrencyCents = (cents: unknown, { withPlus = false }: { withPlus?: boolean } = {}) => {
	const normalizedCents = Math.max(0, Math.round(Number(cents || 0)))
	const formatted = EURO_FORMATTER.format(normalizedCents / 100)
	return withPlus ? `+${formatted}` : formatted
}

export const formatPercentageLabel = (value: unknown) => {
	const number = Number(value || 0)
	return Number.isInteger(number) ? String(number) : number.toLocaleString('it-IT')
}
