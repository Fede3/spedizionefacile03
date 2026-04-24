/**
 * stripeErrors.ts — messaggi errore Stripe unificati in italiano.
 *
 * Prima di questo file, le mappe erano duplicate in usePaymentFlow,
 * usePaymentProcess e useWalletTopUp con testi leggermente diversi.
 * Ora una sola fonte di verità: modifica QUI le traduzioni.
 *
 * Stripe restituisce `err.code` (API error) o `err.decline_code`
 * (carta rifiutata). I codici non mappati ricadono sul message
 * originale (che può essere in EN).
 */

export const STRIPE_ERRORS_IT: Record<string, string> = {
	card_declined: "Carta rifiutata. Verifica i dati o usa un'altra carta.",
	insufficient_funds: 'Fondi insufficienti sulla carta.',
	expired_card: 'Carta scaduta.',
	incorrect_cvc: 'Codice CVC non corretto.',
	incorrect_number: 'Numero carta non valido.',
	invalid_number: 'Numero carta non valido. Verifica il numero inserito.',
	invalid_cvc: 'Codice CVC non valido.',
	invalid_expiry_month: 'Mese di scadenza non valido.',
	invalid_expiry_year: 'Anno di scadenza non valido.',
	incomplete_number: 'Numero carta incompleto.',
	incomplete_expiry: 'Data di scadenza incompleta.',
	incomplete_cvc: 'Codice CVC incompleto.',
	processing_error: 'Errore di elaborazione. Riprova tra qualche istante.',
	authentication_required: 'La banca richiede una verifica aggiuntiva (3D Secure).',
	payment_intent_authentication_failure: 'Autenticazione 3D Secure non riuscita.',
	generic_decline: 'Pagamento rifiutato. Contatta la tua banca.',
	rate_limit: 'Troppe richieste in poco tempo. Attendi un istante e riprova.',
	card_not_supported: "Tipo di carta non supportato. Prova con un'altra carta.",
	lost_card: 'Carta segnalata come smarrita. Contatta la tua banca.',
	stolen_card: 'Carta segnalata come rubata. Contatta la tua banca.',
};

/**
 * Traduce un errore Stripe nel messaggio italiano corrispondente.
 * Fallback sul message originale o generico se il codice non è mappato.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function translateStripeError(err: any, fallback = 'Errore durante il pagamento. Riprova.'): string {
	if (!err) return fallback;
	const code = err?.code || err?.decline_code;
	if (code && STRIPE_ERRORS_IT[code]) return STRIPE_ERRORS_IT[code];
	return (
		err?.response?._data?.error ||
		err?.response?._data?.message ||
		err?.data?.error ||
		err?.message ||
		fallback
	);
}
