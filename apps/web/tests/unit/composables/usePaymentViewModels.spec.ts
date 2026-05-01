import { describe, it, expect } from 'vitest'
import { usePaymentViewModels } from '~/composables/usePaymentViewModels'

const noopActions = {
	validateCoupon: () => Promise.resolve(),
	removeCoupon: () => undefined,
	selectPaymentMethod: () => undefined,
	confirmPayment: () => Promise.resolve(),
	proceedWithPayment: () => Promise.resolve(),
	openTermsModal: () => undefined,
	setCheckoutCardRef: () => undefined,
	updateBillingType: () => undefined,
	updateInvoiceSubjectType: () => undefined,
	updateSameAsShipping: () => undefined,
}

describe('usePaymentViewModels', () => {
	it('default fields safe (zero undefined ai consumer)', () => {
		const vm = usePaymentViewModels({
			summary: {},
			methods: {},
			billing: {},
			actions: noopActions,
			stripe: {},
			wallet: {},
		})

		expect(vm.summary.value.subtotalCents).toBe(0)
		expect(vm.summary.value.subtotalLabel).toBe('')
		expect(vm.summary.value.itemCount).toBe(0)
		expect(vm.summary.value.expanded).toBe(false)
		expect(vm.summary.value.successOrderId).toBe(null)

		expect(vm.methods.value.selected).toBe(null)
		expect(vm.methods.value.options).toEqual([])
		expect(vm.methods.value.cardUnavailable).toBe(false)
		expect(vm.methods.value.useNewCard).toBe(false)

		expect(vm.billing.value.fatturazioneType).toBe('ricevuta')
		expect(vm.billing.value.invoiceSubjectType).toBe('privato')
		expect(vm.billing.value.sameAsShipping).toBe(true)
		expect(vm.billing.value.fatturaData).toEqual({ type: 'ricevuta' })

		expect(vm.stripe.value.loading).toBe(false)
		expect(vm.stripe.value.ready).toBe(false)
		expect(vm.stripe.value.cardError).toBe(null)

		expect(vm.wallet.value.canMakePayment).toBe(false)
		expect(typeof vm.wallet.value.paymentRequestRefCallback).toBe('function')
		expect(typeof vm.wallet.value.onPaymentRequestReady).toBe('function')
	})

	it('passa attraverso i valori forniti', () => {
		const vm = usePaymentViewModels({
			summary: {
				subtotalCents: 1234,
				subtotalLabel: '12,34 €',
				totalCents: 1500,
				totalLabel: '15,00 €',
				itemCount: 2,
				trattaLabel: 'Roma → Milano',
			},
			methods: {
				selected: 'stripe',
				cardUnavailable: false,
				options: [
					{ value: 'stripe', label: 'Carta', description: 'Visa/Mastercard' },
					{ value: 'wallet', label: 'Wallet', description: 'Saldo SpediamoFacile' },
				],
			},
			billing: {
				fatturazioneType: 'fattura',
				invoiceSubjectType: 'azienda',
				fatturaData: { type: 'fattura', p_iva: 'IT12345678901', ragione_sociale: 'Test SRL' },
				billingShippingFullAddress: 'Via Roma 1, 00100 Roma',
			},
			actions: noopActions,
			stripe: {
				loading: true,
				ready: true,
				saveCardForFuture: true,
			},
			wallet: {
				canMakePayment: true,
				isAppleAvailable: true,
			},
		})

		expect(vm.summary.value.subtotalCents).toBe(1234)
		expect(vm.summary.value.totalLabel).toBe('15,00 €')
		expect(vm.summary.value.itemCount).toBe(2)
		expect(vm.summary.value.trattaLabel).toBe('Roma → Milano')

		expect(vm.methods.value.selected).toBe('stripe')
		expect(vm.methods.value.options).toHaveLength(2)
		expect(vm.methods.value.options[0]?.value).toBe('stripe')

		expect(vm.billing.value.fatturazioneType).toBe('fattura')
		expect(vm.billing.value.fatturaData.p_iva).toBe('IT12345678901')

		expect(vm.stripe.value.loading).toBe(true)
		expect(vm.stripe.value.ready).toBe(true)
		expect(vm.stripe.value.saveCardForFuture).toBe(true)

		expect(vm.wallet.value.canMakePayment).toBe(true)
		expect(vm.wallet.value.isAppleAvailable).toBe(true)
	})

	it('accetta lazy getter come input (computed-friendly)', () => {
		let countCalls = 0
		const summaryGetter = () => {
			countCalls++
			return { subtotalCents: 999, totalCents: 999 }
		}

		const vm = usePaymentViewModels({
			summary: summaryGetter,
			methods: {},
			billing: {},
			actions: noopActions,
			stripe: {},
			wallet: {},
		})

		// Access vm.summary.value triggers getter once (computed cache)
		expect(vm.summary.value.subtotalCents).toBe(999)
		expect(vm.summary.value.totalCents).toBe(999)
		// Repeated access -> non triggera nuovo getter (cache)
		expect(vm.summary.value.subtotalCents).toBe(999)
		expect(countCalls).toBe(1)
	})

	it('bundle aggrega tutti e 6 i VM', () => {
		const vm = usePaymentViewModels({
			summary: { subtotalCents: 100 },
			methods: { selected: 'wallet' },
			billing: { invoiceSubjectType: 'privato' },
			actions: noopActions,
			stripe: { ready: true },
			wallet: { canMakePayment: false },
		})

		const bundle = vm.bundle.value
		expect(bundle.summary.subtotalCents).toBe(100)
		expect(bundle.methods.selected).toBe('wallet')
		expect(bundle.billing.invoiceSubjectType).toBe('privato')
		expect(bundle.stripe.ready).toBe(true)
		expect(bundle.wallet.canMakePayment).toBe(false)
		expect(bundle.actions).toBe(noopActions)
	})

	it('actions e identita preservata (stesso reference)', () => {
		const myActions = { ...noopActions }
		const vm = usePaymentViewModels({
			summary: {},
			methods: {},
			billing: {},
			actions: myActions,
			stripe: {},
			wallet: {},
		})

		expect(vm.actions.value).toBe(myActions)
	})
})
