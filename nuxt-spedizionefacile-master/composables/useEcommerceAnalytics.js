/**
 * useEcommerceAnalytics — SHIM no-op. ARCHIVIATO GA4 (2026-04-20).
 * Firma preservata per usePreventivoCalc / useShipmentStepPageOrchestration / [step].vue.
 * Per re-implementare: ripristina da _archive/frontend-simplification-2026-04-20/npm-packages/ga4-duplicato/
 * oppure mappa su useFunnelAnalytics().track(...) (Plausible).
 *
 * @typedef {Object} EcommerceItem
 * @property {string|number} item_id
 * @property {string} item_name
 * @property {number} price
 * @property {number} quantity
 * @property {string} [item_category]
 * @property {string} [item_variant]
 */

/** Composable e-commerce analytics (shim no-op post-rimozione GA4). */
export const useEcommerceAnalytics = () => {
	// GA4 archiviato — tutti i metodi sono no-op.

	const viewItem = (_payload) => {
		// no-op
	}

	const addToCart = (_payload) => {
		// no-op
	}

	const beginCheckout = (_payload) => {
		// no-op
	}

	const addPaymentInfo = (_payload) => {
		// no-op
	}

	const purchase = (_payload) => {
		// no-op
	}

	return {
		viewItem,
		addToCart,
		beginCheckout,
		addPaymentInfo,
		purchase,
	}
}
