/**
 * Tipi ViewModel pagamento — aggregazioni client-side per ridurre prop-drilling.
 *
 * Sostituiscono il pattern "70 props atomiche" in ShipmentStepPagamento.vue
 * con 6 oggetti coerenti per dominio (summary, methods, billing, actions,
 * stripe state, wallet state). Costruiti dal composable usePaymentViewModels.
 *
 * Convenzione prezzi: cents (intero) per tutti i campi *_cents; euro
 * formattato (string "12,34 €") per label utente.
 */
import type { BillingData, PaymentMethod } from './order'

/** Riepilogo importi e dati spedizione (sezione "Riepilogo ordine"). */
export interface PaymentSummaryViewModel {
	subtotalCents: number
	subtotalLabel: string
	discountCents: number
	discountLabel: string
	totalCents: number
	totalLabel: string
	vatCents: number
	vatLabel: string
	itemCount: number
	trattaLabel: string
	colloLabel: string
	contentDescription: string
	expanded: boolean
	successOrderId: number | null
}

/** Stato selezione metodo pagamento (carta / wallet / bonifico). */
export interface PaymentMethodsViewModel {
	selected: PaymentMethod | null
	options: ReadonlyArray<{
		value: PaymentMethod
		label: string
		description?: string
		disabled?: boolean
		disabledReason?: string
	}>
	cardUnavailable: boolean
	cardNotice: string
	hasSavedCard: boolean
	useNewCard: boolean
	defaultPayment: PaymentMethod | null
	walletFormatted: string
	walletSufficient: boolean
	walletLoaded: boolean
}

/** Form fatturazione (ricevuta / fattura B2B con SDI/PEC). */
export interface PaymentBillingViewModel {
	fatturazioneType: 'ricevuta' | 'fattura'
	invoiceSubjectType: 'privato' | 'azienda'
	fatturaData: BillingData
	billingShippingFullAddress: string
	sameAsShipping: boolean
}

/** Callback handler usati dal componente Pagamento. */
export interface PaymentActionsViewModel {
	validateCoupon: (code: string) => Promise<unknown>
	removeCoupon: () => Promise<unknown> | undefined
	selectPaymentMethod: (method: PaymentMethod) => unknown
	confirmPayment: () => Promise<unknown>
	proceedWithPayment: () => Promise<unknown>
	openTermsModal: () => unknown
	setCheckoutCardRef: (el: unknown) => unknown
	updateBillingType: (type: 'ricevuta' | 'fattura') => unknown
	updateInvoiceSubjectType: (type: 'privato' | 'azienda') => unknown
	updateSameAsShipping: (value: boolean) => unknown
}

/** Stato Stripe Elements (caricamento, errori, 3DS). */
export interface PaymentStripeStateViewModel {
	loading: boolean
	ready: boolean
	cardError: string | null
	saveCardForFuture: boolean
	shouldShowCardForm: boolean
}

/** Stato wallet rapido (Apple/Google Pay) tramite PaymentRequest API. */
export interface PaymentWalletStateViewModel {
	canMakePayment: boolean
	isAppleAvailable: boolean
	isGoogleAvailable: boolean
	paymentRequestError: string | null
	paymentRequestRefCallback: (el: unknown) => void
	onPaymentRequestReady: (event: unknown) => void
}

/** Bundle di tutti i 6 ViewModel — comodo per type test/factory. */
export interface PaymentViewModelBundle {
	summary: PaymentSummaryViewModel
	methods: PaymentMethodsViewModel
	billing: PaymentBillingViewModel
	actions: PaymentActionsViewModel
	stripe: PaymentStripeStateViewModel
	wallet: PaymentWalletStateViewModel
}
