/**
 * useCheckoutValidation — Checkout form and billing validation logic.
 *
 * Extracted from useCheckout to keep each composable focused.
 * Handles: terms acceptance, canPay logic, pay button tooltip,
 * and billing/invoice field validation for payment processing.
 */
import type { ComputedRef, Ref } from 'vue'

/**
 * Struttura minima del record di fatturazione usata da questo composable.
 * Volutamente più permissiva di `BillingData` perché il modulo di fatturazione
 * nel cart store popola un subset dei campi con tutte le stringhe vuote di
 * default — tipizzare qui con `BillingData` completo genererebbe errori di
 * assegnazione lato chiamante.
 */
export interface CheckoutBillingShape {
	indirizzo?: string
	city?: string
	province?: string
	postal_code?: string
	ragione_sociale?: string
	p_iva?: string
	nome_completo?: string
	codice_fiscale?: string
	[key: string]: unknown
}

export interface CheckoutValidationDeps {
	// from useCartOperations
	fatturazioneType: Ref<string>
	invoiceSubjectType: Ref<string>
	fatturaData: Ref<CheckoutBillingShape>
	finalTotal: Ref<number | string> | ComputedRef<number | string>
	finalTotalFormatted: Ref<string> | ComputedRef<string>
	walletLoaded: Ref<boolean> | ComputedRef<boolean>
	walletSufficient: Ref<boolean> | ComputedRef<boolean>
	// from usePaymentFlow
	paymentMethod: Ref<string>
	cardComplete: Ref<boolean>
	// defaultPayment arriva da useSanctumFetch come `Ref<unknown>`;
	// il casting a `{ card?: unknown }` avviene a runtime via optional chaining.
	defaultPayment: Ref<unknown>
	useNewCard: Ref<boolean>
	isProcessing: Ref<boolean>
}

export interface CheckoutValidationApi {
	termsAccepted: Ref<boolean>
	canPay: ComputedRef<boolean>
	payButtonTooltip: ComputedRef<string>
	paymentActionLabel: ComputedRef<string>
	validateBillingFields: () => string | null
	validateMinimumAmount: () => string | null
}

export function useCheckoutValidation({
	// from useCartOperations
	fatturazioneType,
	invoiceSubjectType,
	fatturaData,
	finalTotal,
	finalTotalFormatted,
	walletLoaded,
	walletSufficient,
	// from usePaymentFlow
	paymentMethod,
	cardComplete,
	defaultPayment,
	useNewCard,
	isProcessing,
}: CheckoutValidationDeps = {} as CheckoutValidationDeps): CheckoutValidationApi {
	// --- TERMS ---
	const termsAccepted = ref<boolean>(false)

	// Helper: estrai l'eventuale carta di default senza restringere il tipo pubblico.
	const getDefaultCard = (): unknown => (defaultPayment.value as { card?: unknown } | null | undefined)?.card

	// --- CAN PAY ---
	const canPay = computed<boolean>(() => {
		if (!termsAccepted.value) return false
		if (isProcessing.value) return false
		if (paymentMethod.value === 'carta') {
			if (getDefaultCard() && !useNewCard.value) return true
			return cardComplete.value
		}
		if (paymentMethod.value === 'bonifico') return true
		if (paymentMethod.value === 'wallet') return walletSufficient.value
		// PayPal / Google Pay via Stripe confirmPayment — niente card element in loco:
		// il completamento avviene sul provider esterno (redirect/sheet).
		if (paymentMethod.value === 'paypal' || paymentMethod.value === 'google_pay') return true
		return false
	})

	const payButtonTooltip = computed<string>(() => {
		if (!termsAccepted.value) return 'Accetta i termini e condizioni per procedere.'
		if (paymentMethod.value === 'wallet' && walletLoaded.value && !walletSufficient.value) return 'Saldo wallet insufficiente.'
		if (paymentMethod.value === 'carta' && !getDefaultCard() && !cardComplete.value) return 'Inserisci i dati della carta.'
		return ''
	})

	const paymentActionLabel = computed<string>(() => {
		if (isProcessing.value) return 'Elaborazione...'
		if (paymentMethod.value === 'bonifico') return `Conferma ordine · ${finalTotalFormatted.value}`
		return `Completa il pagamento · ${finalTotalFormatted.value}`
	})

	// --- BILLING VALIDATION (used before payment processing) ---

	/**
	 * Validates billing fields. Returns null if valid, or an error message string.
	 */
	const validateBillingFields = (): string | null => {
		if (fatturazioneType.value !== 'fattura') return null

		if (!fatturaData.value.indirizzo?.trim()) {
			return 'Indirizzo di fatturazione obbligatorio.'
		}
		if (!fatturaData.value.city?.trim() || !fatturaData.value.province?.trim() || !fatturaData.value.postal_code?.trim()) {
			return 'Completa città, provincia e CAP del documento fiscale.'
		}
		if (invoiceSubjectType.value === 'azienda') {
			if (!fatturaData.value.ragione_sociale?.trim()) {
				return 'Ragione sociale obbligatoria per fattura azienda.'
			}
			if (!fatturaData.value.p_iva?.trim()) {
				return 'P.IVA obbligatoria per fattura azienda.'
			}
			const pivaClean = fatturaData.value.p_iva.replace(/\s/g, '')
			if (!/^\d{11}$/.test(pivaClean)) {
				return 'P.IVA non valida. Deve contenere 11 cifre.'
			}
		}
		else {
			if (!fatturaData.value.nome_completo?.trim()) {
				return 'Nome e cognome obbligatori per fattura privato.'
			}
			if (!fatturaData.value.codice_fiscale?.trim()) {
				return 'Codice fiscale obbligatorio per fattura privato.'
			}
		}

		return null
	}

	/**
	 * Validates minimum amount for card payments. Returns null if valid, or error string.
	 */
	const validateMinimumAmount = (): string | null => {
		if (paymentMethod.value === 'carta' && Number(finalTotal.value) < 0.5) {
			return 'Importo minimo per pagamento con carta: 0,50€'
		}
		return null
	}

	return {
		termsAccepted,
		canPay,
		payButtonTooltip,
		paymentActionLabel,
		validateBillingFields,
		validateMinimumAmount,
	}
}
