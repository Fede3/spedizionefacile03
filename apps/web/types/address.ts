/**
 * Indirizzi spedizione (mittente / destinatario / fatturazione).
 * Usato in CartItem, Order package, SavedShipment.
 */

export interface Address {
	type?: 'Partenza' | 'Destinazione' | string
	name: string
	surname?: string
	additional_information?: string
	address: string
	number_type?: 'Numero Civico' | 'SNC' | string
	address_number?: string
	intercom_code?: string
	country?: string
	city: string
	postal_code: string
	province: string
	telephone_number?: string
	email?: string
}
