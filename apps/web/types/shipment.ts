/**
 * Tipi flusso spedizione: collo, servizi extra, dettagli geografici, store.
 */
import type { Address } from './address'
import type { PudoPoint } from './pudo'

/**
 * Servizio aggiuntivo di spedizione (Contrassegno, Assicurazione, Senza Etichetta).
 */
export interface Service {
	key: string
	label: string
	/** Costo in centesimi */
	price_cents: number
	active: boolean
	/** Dati specifici del servizio */
	data?: Record<string, unknown>
}

/**
 * Servizi allegati a ogni collo (DB e sessione).
 * service_type: stringa CSV dei servizi attivi (es. "Contrassegno,Assicurazione").
 */
export interface PackageServices {
	service_type?: string
	date?: string
	time?: string
	serviceData?: {
		contrassegno_amount?: number
		assicurazione_value?: number
		delivery_mode?: 'home' | 'pudo'
		pudo?: PudoPoint | null
		sms_email_notification?: boolean
		[key: string]: unknown
	}
	sms_email_notification?: boolean
}

/**
 * Singolo collo nel flusso preventivo (shipmentFlowStore.packages[]).
 * I prezzi sono in euro (float) durante il calcolo client,
 * convertiti in centesimi prima di inviare al backend.
 */
export interface Package {
	id?: number
	package_type: 'Pacco' | 'Pallet' | 'Valigia' | 'Busta' | string
	quantity: number
	weight: number | string
	first_size: number | string
	second_size: number | string
	third_size: number | string
	weight_price?: number | null
	volume_price?: number | null
	/**
	 * Prezzo unitario del collo.
	 * - In shipmentFlowStore / flusso nuovo: euro (es. 15.50).
	 * - In CartItem da DB / edit: centesimi (es. 1550).
	 */
	single_price?: number
	content_description?: string
}

/**
 * Dettagli geografici della spedizione (step 1 — preventivo).
 * Corrisponde a shipmentStore.shipmentDetails.
 */
export interface ShipmentDetails {
	origin_city: string
	origin_postal_code: string
	origin_province: string
	origin_country_code: string
	origin_country: string
	destination_city: string
	destination_postal_code: string
	destination_province: string
	destination_country_code: string
	destination_country: string
	date: string
}

/**
 * Spedizione completa pronta per il riepilogo/checkout.
 */
export interface PendingShipment {
	packages: Package[]
	origin_address: Partial<Address>
	destination_address: Partial<Address>
	services: PackageServices
	delivery_mode?: 'home' | 'pudo'
	selected_pudo?: PudoPoint | null
	sms_email_notification?: boolean
}

/**
 * Risposta del backend al calcolo preventivo (/api/session/first-step).
 * Tutti i prezzi in euro (float).
 */
export interface PriceQuote {
	base_price: number
	services_total: number
	total_price: number
	step: number
	shipment_details?: ShipmentDetails
	packages?: Package[]
}

/**
 * Forma dello stato del shipmentFlowStore.
 */
export interface ShipmentFlowStoreState {
	stepNumber: number
	isQuoteStarted: boolean
	shipmentDetails: ShipmentDetails
	packages: Package[]
	totalPrice: number
	servicesArray: string[]
	contentDescription: string
	pendingShipment: PendingShipment | null
	originAddressData: Partial<Address> | null
	destinationAddressData: Partial<Address> | null
	pickupDate: string
	editingCartItemId: number | string | null
	deliveryMode: 'home' | 'pudo'
	selectedPudo: PudoPoint | null
	smsEmailNotification: boolean
	serviceData: Record<string, unknown>
}
