/**
 * Tipi ordine: status, payment method, billing data.
 */
import type { CartItem } from './cart'

/** Stato di un ordine (stringa italiana dal backend). */
export type OrderStatus =
	| 'In attesa'
	| 'In lavorazione'
	| 'Etichetta generata'
	| 'Completato'
	| 'Fallito'
	| 'Pagato'
	| 'Annullato'
	| 'Rimborsato'
	| 'In transito'
	| 'In consegna'
	| 'Consegnato'
	| 'In giacenza'
	| 'Reso'
	| 'Rifiutato'

/** Stato ordine raw (slug inglese, uso interno). */
export type OrderStatusRaw =
	| 'pending'
	| 'processing'
	| 'label_generated'
	| 'completed'
	| 'payment_failed'
	| 'paid'
	| 'cancelled'
	| 'refunded'
	| 'in_transit'
	| 'out_for_delivery'
	| 'delivered'
	| 'in_giacenza'
	| 'returned'
	| 'refused'

/** Metodo di pagamento. */
export type PaymentMethod = 'stripe' | 'wallet' | 'bonifico' | string

/**
 * Ordine completo come restituito da /api/orders/{id}.
 * Prezzi colli in centesimi; subtotal stringa formattata.
 */
export interface Order {
	id: number
	user_id?: number
	status: OrderStatus
	raw_status?: OrderStatusRaw
	subtotal?: string
	subtotal_cents?: number
	payment_method?: PaymentMethod
	stripe_payment_intent_id?: string
	cancellable?: boolean
	packages: CartItem[]
	billing?: BillingData | null
	coupon_code?: string | null
	coupon_discount?: number | null
	created_at?: string
	updated_at?: string
}

/** Dati per la fatturazione (checkout — sezione "Fattura"). */
export interface BillingData {
	type: 'ricevuta' | 'fattura'
	subject_type?: 'privato' | 'azienda'
	nome_completo?: string
	ragione_sociale?: string
	p_iva?: string
	codice_fiscale?: string
	indirizzo?: string
	city?: string
	province?: string
	postal_code?: string
	pec?: string
	codice_sdi?: string
}
