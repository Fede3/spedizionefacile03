/**
 * Factory dei 6 ViewModel pagamento.
 *
 * Aggrega lo stato sparso (cart, payment, checkout, billing) in oggetti
 * coerenti consumabili come props singole da `ShipmentStepPagamento.vue` —
 * sostituisce progressivamente il pattern "70 props atomiche" (Ondata 5
 * piano refactor 64->88).
 *
 * Pattern uso (in [step].vue):
 *
 *   const { summary, methods, billing, actions, stripe, wallet } =
 *     usePaymentViewModels({ cart, payment, checkout, billingState, actionsBundle, stripeState, walletState })
 *
 *   <ShipmentStepPagamento :summary-vm="summary" :methods-vm="methods" ... />
 *
 * Il componente legge prima dal VM (props.summaryVm), fallback su props
 * legacy. Migrazione progressiva: una sezione alla volta.
 */
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type {
	PaymentActionsViewModel,
	PaymentBillingViewModel,
	PaymentMethodsViewModel,
	PaymentStripeStateViewModel,
	PaymentSummaryViewModel,
	PaymentViewModelBundle,
	PaymentWalletStateViewModel,
} from '~/types/payment'
import type { BillingData, PaymentMethod } from '~/types/order'

// ── Input shape (parziale, accetta solo i campi rilevanti) ────────────────
type SummaryInput = {
	subtotalCents?: number
	subtotalLabel?: string
	discountCents?: number
	discountLabel?: string
	totalCents?: number
	totalLabel?: string
	vatCents?: number
	vatLabel?: string
	itemCount?: number
	trattaLabel?: string
	colloLabel?: string
	contentDescription?: string
	expanded?: boolean
	successOrderId?: number | null
}

type MethodsInput = {
	selected?: PaymentMethod | null
	options?: PaymentMethodsViewModel['options']
	cardUnavailable?: boolean
	cardNotice?: string
	hasSavedCard?: boolean
	useNewCard?: boolean
	defaultPayment?: PaymentMethod | null
	walletFormatted?: string
	walletSufficient?: boolean
	walletLoaded?: boolean
}

type BillingInput = {
	fatturazioneType?: 'ricevuta' | 'fattura'
	invoiceSubjectType?: 'privato' | 'azienda'
	fatturaData?: BillingData
	billingShippingFullAddress?: string
	sameAsShipping?: boolean
}

type ActionsInput = PaymentActionsViewModel

type StripeInput = {
	loading?: boolean
	ready?: boolean
	cardError?: string | null
	saveCardForFuture?: boolean
	shouldShowCardForm?: boolean
}

type WalletInput = {
	canMakePayment?: boolean
	isAppleAvailable?: boolean
	isGoogleAvailable?: boolean
	paymentRequestError?: string | null
	paymentRequestRefCallback?: (el: unknown) => void
	onPaymentRequestReady?: (event: unknown) => void
}

export type PaymentViewModelsInput = {
	summary: SummaryInput | (() => SummaryInput)
	methods: MethodsInput | (() => MethodsInput)
	billing: BillingInput | (() => BillingInput)
	actions: ActionsInput
	stripe: StripeInput | (() => StripeInput)
	wallet: WalletInput | (() => WalletInput)
}

export type PaymentViewModelsResult = {
	summary: ComputedRef<PaymentSummaryViewModel>
	methods: ComputedRef<PaymentMethodsViewModel>
	billing: ComputedRef<PaymentBillingViewModel>
	actions: ComputedRef<PaymentActionsViewModel>
	stripe: ComputedRef<PaymentStripeStateViewModel>
	wallet: ComputedRef<PaymentWalletStateViewModel>
	bundle: ComputedRef<PaymentViewModelBundle>
}

const resolve = <T>(value: T | (() => T)): T =>
	(typeof value === 'function' ? (value as () => T)() : value)

const emptyBilling = (): BillingData => ({ type: 'ricevuta' })

/**
 * Costruisce i 6 VM normalizzati con default sicuri (zero undefined ai consumer).
 */
export function usePaymentViewModels(input: PaymentViewModelsInput): PaymentViewModelsResult {
	const summary = computed<PaymentSummaryViewModel>(() => {
		const src = resolve(input.summary)
		return {
			subtotalCents: src.subtotalCents ?? 0,
			subtotalLabel: src.subtotalLabel ?? '',
			discountCents: src.discountCents ?? 0,
			discountLabel: src.discountLabel ?? '',
			totalCents: src.totalCents ?? 0,
			totalLabel: src.totalLabel ?? '',
			vatCents: src.vatCents ?? 0,
			vatLabel: src.vatLabel ?? '',
			itemCount: src.itemCount ?? 0,
			trattaLabel: src.trattaLabel ?? '',
			colloLabel: src.colloLabel ?? '',
			contentDescription: src.contentDescription ?? '',
			expanded: src.expanded ?? false,
			successOrderId: src.successOrderId ?? null,
		}
	})

	const methods = computed<PaymentMethodsViewModel>(() => {
		const src = resolve(input.methods)
		return {
			selected: src.selected ?? null,
			options: src.options ?? [],
			cardUnavailable: src.cardUnavailable ?? false,
			cardNotice: src.cardNotice ?? '',
			hasSavedCard: src.hasSavedCard ?? false,
			useNewCard: src.useNewCard ?? false,
			defaultPayment: src.defaultPayment ?? null,
			walletFormatted: src.walletFormatted ?? '',
			walletSufficient: src.walletSufficient ?? false,
			walletLoaded: src.walletLoaded ?? false,
		}
	})

	const billing = computed<PaymentBillingViewModel>(() => {
		const src = resolve(input.billing)
		return {
			fatturazioneType: src.fatturazioneType ?? 'ricevuta',
			invoiceSubjectType: src.invoiceSubjectType ?? 'privato',
			fatturaData: src.fatturaData ?? emptyBilling(),
			billingShippingFullAddress: src.billingShippingFullAddress ?? '',
			sameAsShipping: src.sameAsShipping ?? true,
		}
	})

	const actions = computed<PaymentActionsViewModel>(() => input.actions)

	const stripe = computed<PaymentStripeStateViewModel>(() => {
		const src = resolve(input.stripe)
		return {
			loading: src.loading ?? false,
			ready: src.ready ?? false,
			cardError: src.cardError ?? null,
			saveCardForFuture: src.saveCardForFuture ?? false,
			shouldShowCardForm: src.shouldShowCardForm ?? false,
		}
	})

	const wallet = computed<PaymentWalletStateViewModel>(() => {
		const src = resolve(input.wallet)
		return {
			canMakePayment: src.canMakePayment ?? false,
			isAppleAvailable: src.isAppleAvailable ?? false,
			isGoogleAvailable: src.isGoogleAvailable ?? false,
			paymentRequestError: src.paymentRequestError ?? null,
			paymentRequestRefCallback: src.paymentRequestRefCallback ?? (() => undefined),
			onPaymentRequestReady: src.onPaymentRequestReady ?? (() => undefined),
		}
	})

	const bundle = computed<PaymentViewModelBundle>(() => ({
		summary: summary.value,
		methods: methods.value,
		billing: billing.value,
		actions: actions.value,
		stripe: stripe.value,
		wallet: wallet.value,
	}))

	return { summary, methods, billing, actions, stripe, wallet, bundle }
}
