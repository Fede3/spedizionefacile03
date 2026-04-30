/**
 * Tipi carrello: item, response API, raggruppamento per indirizzo.
 */
import type { Address } from './address'
import type { PudoPoint } from './pudo'
import type { PackageServices } from './shipment'

/**
 * Elemento del carrello come restituito da /api/cart o /api/guest-cart.
 * Tutti i prezzi in centesimi (single_price intero in centesimi).
 */
export interface CartItem {
	id: number
	package_type: string
	quantity: number
	weight: number
	first_size: number
	second_size: number
	third_size: number
	/** Prezzo totale del collo in centesimi (include tutti i colli della quantita) */
	single_price: number
	weight_price?: number
	volume_price?: number
	content_description?: string
	origin_address: Address
	destination_address: Address
	services: PackageServices
	delivery_mode?: 'home' | 'pudo'
	selected_pudo?: PudoPoint | null
	sms_email_notification?: boolean
	created_at?: string
	updated_at?: string
}

/**
 * Risposta completa del carrello (data + meta).
 */
export interface CartResponse {
	data: CartItem[]
	meta: {
		/** Totale formattato (es. "45,90€" con non-breaking space) */
		total: string | number
		address_groups: AddressGroup[]
	}
}

/**
 * Gruppo di colli con stesso indirizzo (UI raggruppamento carrello).
 */
export interface AddressGroup {
	package_ids: number[]
	count: number
	origin_city?: string
	destination_city?: string
}
