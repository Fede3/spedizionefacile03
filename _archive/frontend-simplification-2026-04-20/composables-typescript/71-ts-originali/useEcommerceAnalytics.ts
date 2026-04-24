/**
 * useEcommerceAnalytics — SHIM no-op (GA4 archiviato il 2026-04-20).
 *
 * Originale: _archive/frontend-simplification-2026-04-20/npm-packages/
 *            ga4-duplicato/useEcommerceAnalytics.ts.original
 *
 * GA4 (window.gtag) è stato rimosso dalla codebase: Plausible è ora l'unico
 * sink analytics. Questo shim conserva la firma pubblica del composable per
 * non rompere i chiamanti (`usePreventivoCalc`, `useShipmentStepPageOrchestration`,
 * `pages/la-tua-spedizione/[step].vue`). Tutti i metodi sono no-op silenziosi.
 *
 * Se serve re-implementare eventi e-commerce:
 *   1. Ripristinare il plugin GA4 da `_archive/.../ga4-duplicato/gtag.client.ts.original`
 *   2. Ripristinare il codice originale di questo file dall'archivio
 *   3. OPPURE mappare questi metodi su `useFunnelAnalytics().track(...)` verso Plausible
 */

export type EcommerceItem = {
	item_id: string | number
	item_name: string
	price: number
	quantity: number
	item_category?: string
	item_variant?: string
	[extra: string]: string | number | undefined
}

export const useEcommerceAnalytics = () => {
	// GA4 archiviato — tutti i metodi sono no-op.

	const viewItem = (_payload: {
		quoteType?: string
		priceCents?: number
		weightKg?: number
		packageType?: string
	}): void => {
		// no-op
	}

	const addToCart = (_payload: {
		services: Array<{ id?: string | number; name: string; priceCents?: number }>
	}): void => {
		// no-op
	}

	const beginCheckout = (_payload: {
		totalCents: number
		items?: EcommerceItem[]
	}): void => {
		// no-op
	}

	const addPaymentInfo = (_payload: {
		paymentType: string
		totalCents: number
	}): void => {
		// no-op
	}

	const purchase = (_payload: {
		transactionId: string | number
		totalCents: number
		items?: EcommerceItem[]
		coupon?: string
		paymentType?: string
		shippingCents?: number
		taxCents?: number
	}): void => {
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
