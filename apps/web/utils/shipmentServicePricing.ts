/**
 * Barrel re-export del modulo pricing.
 *
 * SPLIT Ondata 3: il file precedente (763 LOC) e' stato scomposto in 5
 * sotto-file in `utils/pricing/`:
 *  - types.ts        → interfacce pubbliche (SurchargeResult, ServicePricingRule, ...)
 *  - defaults.ts     → DEFAULT_SERVICE_PRICING + DEFAULT_AUTOMATIC_SUPPLEMENTS frozen
 *  - normalize.ts    → parser e normalizer (parseCurrencyAmount, normalizeServiceKey, ...)
 *  - matchers.ts     → matcher (province, isole minori, fuori sagoma, aste/tubi)
 *  - calculate.ts    → calculateShipmentServiceSurcharge (API pubblica)
 *
 * Questo barrel preserva l'auto-import Nuxt e i 4 caller esistenti
 * ([step].vue, useCart.ts, usePayment.ts, useShipmentStepSummary.ts) senza
 * modifiche al loro path di import.
 *
 * VINCOLO CROSS-STACK: le regole pricing devono restare allineate al backend
 * Laravel. Modifiche qui richiedono refresh dei test parity in
 * tests/Feature/Pricing/PriceEngineTest.php.
 */

export type {
	AddressInput,
	AutomaticSupplementsInput,
	CalculateShipmentSurchargeOptions,
	NormalizedAddress,
	NormalizedPackage,
	PackageInput,
	PricingApplication,
	PricingConfig,
	PricingTier,
	PricingType,
	ServicePricingRule,
	SurchargeItem,
	SurchargeResult,
} from './pricing/types'

export {
	parseCurrencyAmount,
	normalizeServiceKey,
	normalizeSelectedServices,
} from './pricing/normalize'

export { calculateShipmentServiceSurcharge } from './pricing/calculate'
