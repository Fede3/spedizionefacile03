/**
 * TYPES — Interfacce TypeScript principali
 *
 * Riflettono la struttura REALE dei dati dal backend Laravel e dal frontend Nuxt.
 *
 * CONVENZIONE PREZZI:
 *   - I campi *_cents (es. single_price, subtotal_cents) sono in centesimi di euro (intero).
 *   - I campi senza _cents (es. subtotal, total) sono stringhe formattate "20,00€" o float euro.
 *   - Per la visualizzazione: dividere per 100.
 *   - Per inviare al backend: inviare in euro (diviso per 100).
 *
 * DOVE SI USANO:
 *   - composables/ — hint di tipo per le strutture dati ritornate dalle API
 *   - stores/userStore.js — tipi di packages, shipmentDetails, pendingShipment
 *   - pages/ e components/ — accesso tipizzato ai dati di ordini, carrello, utente
 */

// ---------------------------------------------------------------------------
// INDIRIZZO
// ---------------------------------------------------------------------------

/**
 * Indirizzo fisico: sia mittente (origin_address) che destinatario (destination_address).
 * Usato in: CartItem, Order package, SavedShipment.
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

// ---------------------------------------------------------------------------
// UTENTE
// ---------------------------------------------------------------------------

/**
 * Utente autenticato — dati restituiti da /api/user e /api/custom-login.
 * Rispecchia il modello Laravel User.
 */
export interface User {
  id: number
  name: string
  surname: string
  email: string
  role: 'Admin' | 'Cliente' | string
  user_type?: 'privato' | 'azienda' | string
  telephone_number?: string
  prefix?: string
  referred_by?: string
  email_verified_at?: string | null
  created_at?: string
  updated_at?: string
  /** Saldo portafoglio in centesimi */
  wallet_balance?: number
}

// ---------------------------------------------------------------------------
// SERVIZI
// ---------------------------------------------------------------------------

/**
 * Servizio aggiuntivo di spedizione (es. Contrassegno, Assicurazione, Senza Etichetta).
 * Usato sia in fase di configurazione (step 2) che in CartItem/Order.
 */
export interface Service {
  key: string
  label: string
  /** Costo del servizio in centesimi */
  price_cents: number
  active: boolean
  /** Dati specifici del servizio (es. importo contrassegno, valore assicurato) */
  data?: Record<string, unknown>
}

/**
 * Struttura servizi allegata a ogni collo (come salvato nel DB e nella sessione).
 * service_type: stringa CSV dei servizi attivi (es. "Contrassegno,Assicurazione").
 */
export interface PackageServices {
  service_type?: string
  date?: string
  time?: string
  /** Dati aggiuntivi per servizi specifici: contrassegno, assicurazione, ecc. */
  serviceData?: {
    contrassegno_amount?: number
    assicurazione_value?: number
    delivery_mode?: 'home' | 'pudo'
    pudo?: PudoPoint | null
    sms_email_notification?: boolean
    [key: string]: unknown
  }
  /** Notifiche SMS/email per aggiornamenti stato */
  sms_email_notification?: boolean
}

// ---------------------------------------------------------------------------
// PUNTO PUDO (Consegna presso punto BRT)
// ---------------------------------------------------------------------------

/**
 * Punto di ritiro/consegna BRT (PUDO = Pick Up Drop Off).
 * Selezionato durante lo step 2 del flusso spedizione.
 */
export interface PudoPoint {
  pudo_id: string
  name: string
  address: string
  city: string
  postal_code?: string
  province?: string
  country?: string
  latitude?: number
  longitude?: number
  opening_hours?: string
}

// ---------------------------------------------------------------------------
// COLLO / PACKAGE (unità base della spedizione)
// ---------------------------------------------------------------------------

/**
 * Singolo collo nel flusso preventivo (userStore.packages[]).
 * I prezzi sono in euro (float) durante il calcolo lato client,
 * poi convertiti in centesimi prima di inviare al backend.
 */
export interface Package {
  /** Identificatore univoco del collo (assegnato dal backend dopo salvataggio) */
  id?: number
  package_type: 'Pacco' | 'Pallet' | 'Valigia' | 'Busta' | string
  quantity: number
  weight: number | string
  /** Prima dimensione in cm */
  first_size: number | string
  /** Seconda dimensione in cm */
  second_size: number | string
  /** Terza dimensione in cm */
  third_size: number | string
  /** Prezzo da peso (euro, calcolato lato client) */
  weight_price?: number | null
  /** Prezzo da volume (euro, calcolato lato client) */
  volume_price?: number | null
  /**
   * Prezzo unitario del collo.
   * - In userStore / flusso nuovo: euro (es. 15.50).
   * - In CartItem da DB / edit: centesimi (es. 1550).
   * Usare isEditFromCart per distinguere.
   */
  single_price?: number
  content_description?: string
}

// ---------------------------------------------------------------------------
// SPEDIZIONE (ShipmentDetails — dati di partenza/arrivo del preventivo)
// ---------------------------------------------------------------------------

/**
 * Dettagli geografici della spedizione (step 1 — preventivo).
 * Corrisponde a userStore.shipmentDetails.
 */
export interface ShipmentDetails {
  origin_city: string
  origin_postal_code: string
  origin_country_code: string
  origin_country: string
  destination_city: string
  destination_postal_code: string
  destination_country_code: string
  destination_country: string
  /** Data di ritiro desiderata (ISO string o stringa vuota) */
  date: string
}

/**
 * Spedizione completa pronta per il riepilogo/checkout.
 * Corrisponde a userStore.pendingShipment.
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

// ---------------------------------------------------------------------------
// PREVENTIVO / PRICE QUOTE
// ---------------------------------------------------------------------------

/**
 * Risposta del backend al calcolo preventivo (/api/session/first-step).
 * Tutti i prezzi sono in euro (float).
 */
export interface PriceQuote {
  /** Prezzo base (somma colli) in euro */
  base_price: number
  /** Totale servizi aggiuntivi in euro */
  services_total: number
  /** Totale finale in euro */
  total_price: number
  /** Identificativo step corrente */
  step: number
  shipment_details?: ShipmentDetails
  packages?: Package[]
}

// ---------------------------------------------------------------------------
// ELEMENTO CARRELLO (CartItem)
// ---------------------------------------------------------------------------

/**
 * Elemento del carrello come restituito da /api/cart o /api/guest-cart.
 * Tutti i prezzi sono in centesimi (single_price è intero in centesimi).
 */
export interface CartItem {
  id: number
  package_type: string
  quantity: number
  weight: number
  first_size: number
  second_size: number
  third_size: number
  /** Prezzo totale del collo in centesimi (include tutti i colli della quantità) */
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
 * cart.value da useCart().
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
 * Gruppo di colli con stesso indirizzo (per UI raggruppamento nel carrello).
 */
export interface AddressGroup {
  package_ids: number[]
  count: number
  origin_city?: string
  destination_city?: string
}

// ---------------------------------------------------------------------------
// ORDINE
// ---------------------------------------------------------------------------

/**
 * Stato di un ordine (come arriva dal backend — stringa italiana).
 */
export type OrderStatus =
  | 'In attesa'
  | 'In lavorazione'
  | 'Completato'
  | 'Fallito'
  | 'Pagato'
  | 'Annullato'
  | 'Rimborsato'
  | 'In transito'
  | 'Consegnato'
  | 'In giacenza'

/**
 * Stato ordine raw (slug inglese, usato internamente).
 */
export type OrderStatusRaw =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'payment_failed'
  | 'payed'
  | 'cancelled'
  | 'refunded'
  | 'in_transit'
  | 'delivered'
  | 'in_giacenza'

/**
 * Metodo di pagamento.
 */
export type PaymentMethod = 'stripe' | 'wallet' | 'bonifico' | string

/**
 * Ordine completo come restituito da /api/orders/{id}.
 * I prezzi dei colli sono in centesimi; subtotal è stringa formattata.
 */
export interface Order {
  id: number
  user_id?: number
  /** Stato leggibile in italiano */
  status: OrderStatus
  /** Stato raw in inglese (per logica UI) */
  raw_status?: OrderStatusRaw
  /** Totale formattato (es. "45,90 EUR" o "45,90€") */
  subtotal?: string
  /** Totale in centesimi */
  subtotal_cents?: number
  payment_method?: PaymentMethod
  /** Stripe payment intent ID */
  stripe_payment_intent_id?: string
  /** L'ordine può essere annullato dall'utente */
  cancellable?: boolean
  packages: CartItem[]
  /** Dati fatturazione (se richiesta fattura) */
  billing?: BillingData | null
  /** Coupon applicato */
  coupon_code?: string | null
  /** Sconto coupon percentuale */
  coupon_discount?: number | null
  created_at?: string
  updated_at?: string
}

// ---------------------------------------------------------------------------
// FATTURAZIONE
// ---------------------------------------------------------------------------

/**
 * Dati per la fatturazione (checkout — sezione "Fattura").
 */
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

// ---------------------------------------------------------------------------
// SPEDIZIONE CONFIGURATA (Saved Shipment)
// ---------------------------------------------------------------------------

/**
 * Spedizione salvata dall'utente per uso ripetuto.
 * Restituita da /api/saved-shipments.
 */
export interface SavedShipment {
  id: number
  user_id?: number
  package_type: string
  quantity: number
  weight: number
  first_size: number
  second_size: number
  third_size: number
  /** Prezzo in euro (float, non centesimi) */
  single_price?: number
  weight_price?: number
  volume_price?: number
  origin_address: Address
  destination_address: Address
  services?: PackageServices
  created_at?: string
  updated_at?: string
}

// ---------------------------------------------------------------------------
// PINIA STORE — userStore
// ---------------------------------------------------------------------------

/**
 * Forma dello stato del userStore (stores/userStore.js).
 * Usato per riferimento e futuri refactor TypeScript.
 */
export interface UserStoreState {
  stepNumber: number
  isQuoteStarted: boolean
  shipmentDetails: ShipmentDetails
  packages: Package[]
  /** Prezzo totale in euro (somma di tutti i colli calcolata lato client) */
  totalPrice: number
  /** Chiavi dei servizi selezionati (es. ["contrassegno"]) */
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
