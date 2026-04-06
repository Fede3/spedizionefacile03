/**
 * useCheckoutValidation — Checkout form and billing validation logic.
 *
 * Extracted from useCheckout to keep each composable focused.
 * Handles: terms acceptance, canPay logic, pay button tooltip,
 * and billing/invoice field validation for payment processing.
 */

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
} = {}) {
	// --- TERMS ---
	const termsAccepted = ref(false);

	// --- CAN PAY ---
	const canPay = computed(() => {
		if (!termsAccepted.value) return false;
		if (isProcessing.value) return false;
		if (paymentMethod.value === 'carta') {
			if (defaultPayment.value?.card && !useNewCard.value) return true;
			return cardComplete.value;
		}
		if (paymentMethod.value === 'bonifico') return true;
		if (paymentMethod.value === 'wallet') return walletSufficient.value;
		return false;
	});

	const payButtonTooltip = computed(() => {
		if (!termsAccepted.value) return 'Accetta i termini e condizioni per procedere.';
		if (paymentMethod.value === 'wallet' && walletLoaded.value && !walletSufficient.value) return 'Saldo wallet insufficiente.';
		if (paymentMethod.value === 'carta' && !defaultPayment.value?.card && !cardComplete.value) return 'Inserisci i dati della carta.';
		return '';
	});

	const paymentActionLabel = computed(() => {
		if (isProcessing.value) return 'Elaborazione...';
		if (paymentMethod.value === 'bonifico') return `Conferma ordine · ${finalTotalFormatted.value}`;
		return `Completa il pagamento · ${finalTotalFormatted.value}`;
	});

	// --- BILLING VALIDATION (used before payment processing) ---

	/**
	 * Validates billing fields. Returns null if valid, or an error message string.
	 */
	const validateBillingFields = () => {
		if (fatturazioneType.value !== 'fattura') return null;

		if (!fatturaData.value.indirizzo?.trim()) {
			return 'Indirizzo di fatturazione obbligatorio.';
		}
		if (!fatturaData.value.city?.trim() || !fatturaData.value.province?.trim() || !fatturaData.value.postal_code?.trim()) {
			return 'Completa città, provincia e CAP del documento fiscale.';
		}
		if (invoiceSubjectType.value === 'azienda') {
			if (!fatturaData.value.ragione_sociale?.trim()) {
				return 'Ragione sociale obbligatoria per fattura azienda.';
			}
			if (!fatturaData.value.p_iva?.trim()) {
				return 'P.IVA obbligatoria per fattura azienda.';
			}
			const pivaClean = fatturaData.value.p_iva.replace(/\s/g, '');
			if (!/^\d{11}$/.test(pivaClean)) {
				return 'P.IVA non valida. Deve contenere 11 cifre.';
			}
		} else {
			if (!fatturaData.value.nome_completo?.trim()) {
				return 'Nome e cognome obbligatori per fattura privato.';
			}
			if (!fatturaData.value.codice_fiscale?.trim()) {
				return 'Codice fiscale obbligatorio per fattura privato.';
			}
		}

		return null;
	};

	/**
	 * Validates minimum amount for card payments. Returns null if valid, or error string.
	 */
	const validateMinimumAmount = () => {
		if (paymentMethod.value === 'carta' && finalTotal.value < 0.5) {
			return 'Importo minimo per pagamento con carta: 0,50€';
		}
		return null;
	};

	return {
		termsAccepted,
		canPay,
		payButtonTooltip,
		paymentActionLabel,
		validateBillingFields,
		validateMinimumAmount,
	};
}
