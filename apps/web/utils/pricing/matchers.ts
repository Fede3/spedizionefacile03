/**
 * Matcher e helper di costruzione item del modulo pricing.
 *
 * Estratti da utils/shipmentServicePricing.ts (Ondata 3 split). Funzioni pure
 * di matching: provincia, isole minori, flag, fuori sagoma, aste/tubi.
 */
import { normalizeList, parseCurrencyAmount, roundCurrency } from './normalize'
import type {
	NormalizedAddress,
	NormalizedPackage,
	PricingTier,
	ServicePricingRule,
	SurchargeItem,
} from './types'

/** Trova la fee in centesimi del primo tier con peso >= weightKg. */
export const findTierPriceCents = (weightKg: number, tiers: PricingTier[] = []): number => {
	for (const tier of tiers) {
		if (tier?.up_to_kg === null || tier?.up_to_kg === undefined || weightKg <= Number(tier.up_to_kg || 0)) {
			return Math.max(0, Math.round(Number(tier?.price_cents || 0)))
		}
	}
	return 0
}

/** True se la provincia normalizzata e' nella whitelist regola. */
export const matchesProvince = (
	address: NormalizedAddress,
	provinceCodes: string[] = [],
): boolean => {
	const province = String(address?.province || '').trim().toUpperCase()
	return province !== '' && normalizeList(provinceCodes, { uppercase: true }).includes(province)
}

/**
 * True se la destinazione corrisponde a un'isola minore (country_codes
 * whitelist + keyword_list keyword match nell'indirizzo).
 */
export const matchesMinorIsland = (
	address: NormalizedAddress,
	rule: ServicePricingRule,
): boolean => {
	const countryCodes = normalizeList(rule?.country_codes || [], { uppercase: true })
	if (countryCodes.length && !countryCodes.includes(String(address?.country || '').trim().toUpperCase())) {
		return false
	}

	const haystack = [address?.city, address?.address, address?.additional_information]
		.filter(Boolean)
		.join(' | ')
		.toLowerCase()

	if (!haystack) return false
	return normalizeList(rule?.keyword_list || []).some((keyword) => keyword && haystack.includes(keyword))
}

/** True se almeno uno dei flag e' truthy nel pacco o nei serviceData. */
export const matchesAnyFlag = (
	pkg: Record<string, unknown> = {},
	serviceData: Record<string, unknown> = {},
	flagKeys: string[] = [],
): boolean => normalizeList(flagKeys).some((flagKey) => {
	if (!flagKey) return false
	return Boolean(pkg?.[flagKey] || serviceData?.[flagKey])
})

/** True se il pacco supera le soglie di fuori sagoma (longest_side / girth). */
export const matchesOutOfGauge = (
	pkg: NormalizedPackage,
	serviceData: Record<string, unknown>,
	rule: ServicePricingRule,
): boolean => {
	if (matchesAnyFlag(pkg.raw, serviceData, rule?.flag_keys || [])) return true
	const longestThreshold = Number(rule?.longest_side_threshold_cm || 0)
	const girthThreshold = Number(rule?.girth_threshold_cm || 0)
	return (longestThreshold > 0 && pkg.max_side_cm > longestThreshold)
		|| (girthThreshold > 0 && pkg.secondary_side_sum_cm > girthThreshold)
}

/** True se il pacco rientra nei limiti aste/tubi (lungo + lato secondario stretto). */
export const matchesRodsAndTubes = (
	pkg: NormalizedPackage,
	serviceData: Record<string, unknown>,
	rule: ServicePricingRule,
): boolean => {
	if (matchesAnyFlag(pkg.raw, serviceData, rule?.flag_keys || [])) return true
	const minLongest = Number(rule?.min_longest_side_cm || 0)
	const maxSecondary = Number(rule?.max_secondary_side_cm || 0)
	return pkg.max_side_cm >= minLongest
		&& pkg.secondary_side_sum_cm > 0
		&& pkg.secondary_side_sum_cm <= (maxSecondary * 2)
}

/** Costruisce un SurchargeItem da una regola + amount in cents. */
export const buildFixedItem = (
	key: string,
	rule: ServicePricingRule | undefined,
	amountCents: number | null | undefined,
	automatic = false,
): SurchargeItem => ({
	key,
	label: String(rule?.label || key),
	type: automatic ? 'automatic_supplement' : 'service',
	automatic,
	application: String(rule?.application || ''),
	amount_cents: Math.max(0, Math.round(Number(amountCents || 0))),
	amount: roundCurrency(Math.max(0, Number(amountCents || 0)) / 100),
})

/**
 * Calcola la fee a soglia percentuale (contrassegno/assicurazione):
 * sotto threshold -> min_fee_cents, sopra -> percentage_rate * amount.
 */
export const calculateThresholdFeeCents = (
	amount: unknown,
	rule: ServicePricingRule,
): number => {
	const normalizedAmount = parseCurrencyAmount(amount)
	if (normalizedAmount <= 0) return 0
	const threshold = Number(rule?.threshold_amount_eur ?? 300)
	const minFee = Math.max(0, Math.round(Number(rule?.min_fee_cents ?? 0)))
	const percentageRate = Number(rule?.percentage_rate ?? 0)
	if (normalizedAmount <= threshold) return minFee
	return Math.round(normalizedAmount * 100 * (percentageRate / 100))
}
