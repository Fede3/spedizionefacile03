/**
 * @file adminPricingNormalize — normalizzatori puri per il pannello admin pricing.
 *
 * Estratto da composables/useAdminPricing.js. Pure functions:
 * normalizeStringList, normalizeTiers, normalizePricingGroup, normalizeEuropePricing,
 * buildPricingRulesPayload.
 */
import { DEFAULT_EUROPE_PRICING } from '~/utils/priceBandsConstants';
import type { EuropeBand, EuropePricing, EuropeRate, PricingRule, PricingRuleGroup } from '~/types/pricing';

type UnknownRecord = Record<string, unknown>;
type AdminTier = { up_to_kg: number | null; price_cents: number };

const isRecord = (value: unknown): value is UnknownRecord => value !== null && typeof value === 'object' && !Array.isArray(value);

const numberOrNull = (value: unknown, fallback: number | null = null): number | null => {
	if (value === null || value === undefined || value === '') return fallback;
	return Number(value || 0);
};

const arrayFrom = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

export const normalizeStringListForAdmin = (values: unknown[] = [], { uppercase = false }: { uppercase?: boolean } = {}): string[] => {
	if (!Array.isArray(values)) return [];
	return [...new Set(values
		.map((value) => String(value || '').trim())
		.filter(Boolean)
		.map((value) => uppercase ? value.toUpperCase() : value.toLowerCase()))];
};

export const normalizeTiersForAdmin = (tiers: unknown[] = []): AdminTier[] => {
	if (!Array.isArray(tiers)) return [];
	return [...tiers]
		.map((tier) => ({
			up_to_kg: isRecord(tier) && (tier.up_to_kg === null || tier.up_to_kg === undefined || tier.up_to_kg === '')
				? null
				: Number(isRecord(tier) ? tier.up_to_kg : 0),
			price_cents: Number(isRecord(tier) ? tier.price_cents || 0 : 0),
		}))
		.sort((a, b) => {
			const left = a.up_to_kg ?? Number.POSITIVE_INFINITY;
			const right = b.up_to_kg ?? Number.POSITIVE_INFINITY;
			return left - right;
		});
};

export const normalizePricingGroupForAdmin = (
	config: Record<string, unknown> = {},
	defaults: PricingRuleGroup = {},
): PricingRuleGroup => Object.fromEntries(
	Object.entries(defaults).map(([key, fallback]) => {
		const fallbackRule = fallback;
		const source = isRecord(config[key]) ? config[key] : {};
		return [key, {
			...fallbackRule,
			...source,
			enabled: source.enabled !== false && fallbackRule.enabled !== false,
			price_cents: numberOrNull(source.price_cents, fallbackRule.price_cents ?? null),
			min_fee_cents: numberOrNull(source.min_fee_cents, fallbackRule.min_fee_cents ?? null),
			percentage_rate: numberOrNull(source.percentage_rate, fallbackRule.percentage_rate ?? null),
			threshold_amount_eur: numberOrNull(source.threshold_amount_eur, fallbackRule.threshold_amount_eur ?? null),
			max_weight_kg: numberOrNull(source.max_weight_kg, fallbackRule.max_weight_kg ?? null),
			threshold_cm: numberOrNull(source.threshold_cm, fallbackRule.threshold_cm ?? null),
			longest_side_threshold_cm: numberOrNull(source.longest_side_threshold_cm, fallbackRule.longest_side_threshold_cm ?? null),
			girth_threshold_cm: numberOrNull(source.girth_threshold_cm, fallbackRule.girth_threshold_cm ?? null),
			min_longest_side_cm: numberOrNull(source.min_longest_side_cm, fallbackRule.min_longest_side_cm ?? null),
			max_secondary_side_cm: numberOrNull(source.max_secondary_side_cm, fallbackRule.max_secondary_side_cm ?? null),
			province_codes: Array.isArray(source?.province_codes)
				? normalizeStringListForAdmin(arrayFrom(source.province_codes), { uppercase: true })
				: [...(fallbackRule.province_codes || [])],
			country_codes: Array.isArray(source?.country_codes)
				? normalizeStringListForAdmin(arrayFrom(source.country_codes), { uppercase: true })
				: [...(fallbackRule.country_codes || [])],
			keyword_list: Array.isArray(source?.keyword_list)
				? normalizeStringListForAdmin(arrayFrom(source.keyword_list))
				: [...(fallbackRule.keyword_list || [])],
			flag_keys: Array.isArray(source?.flag_keys)
				? normalizeStringListForAdmin(arrayFrom(source.flag_keys))
				: [...(fallbackRule.flag_keys || [])],
			delivery_modes: Array.isArray(source?.delivery_modes)
				? normalizeStringListForAdmin(arrayFrom(source.delivery_modes))
				: [...(fallbackRule.delivery_modes || [])],
			tiers: Array.isArray(source?.tiers)
				? normalizeTiersForAdmin(arrayFrom(source.tiers))
				: normalizeTiersForAdmin(fallbackRule.tiers || []),
		} satisfies PricingRule];
	}),
);

export const normalizeEuropePricingForAdmin = (config: Partial<EuropePricing> | UnknownRecord = {}): EuropePricing => {
	const source = isRecord(config) ? config : {};
	const bands: EuropeBand[] = Array.isArray(source.bands)
		? source.bands.map((rawBand, bandIndex) => {
			const band = isRecord(rawBand) ? rawBand : {};
			return {
				id: String(band.id ?? `eu-band-${bandIndex + 1}`),
				label: String(band.label ?? '').trim(),
				max_weight_kg: Number(band.max_weight_kg ?? 0),
				max_volume_m3: Number(band.max_volume_m3 ?? 0),
				volumetric_factor: Number(band.volumetric_factor ?? 250),
				rates: Array.isArray(band.rates)
					? band.rates.map((rawRate): EuropeRate => {
						const rate = isRecord(rawRate) ? rawRate : {};
						return {
							country_code: String(rate.country_code ?? '').trim().toUpperCase(),
							country_name: String(rate.country_name ?? '').trim(),
							price_cents: rate.price_cents === null || rate.price_cents === '' || rate.price_cents === undefined
						? null
						: Number(rate.price_cents),
							quote_required: rate.quote_required === true,
						};
					})
					: [],
			};
		})
		: [];

	return {
		...DEFAULT_EUROPE_PRICING,
		enabled: source.enabled !== false,
		origin_country_code: String(source.origin_country_code ?? 'IT').trim().toUpperCase() || 'IT',
		max_packages: 1,
		max_quantity_per_package: 1,
		bands,
		supported_country_codes: Array.isArray(source.supported_country_codes)
			? source.supported_country_codes.map((code) => String(code).trim().toUpperCase()).filter(Boolean)
			: [...new Set(bands.flatMap((band) => band.rates.map((rate) => rate.country_code)))].sort(),
		version: typeof source.version === 'string' || typeof source.version === 'number' ? source.version : null,
	};
};

export const buildPricingRulesPayload = <T extends Record<string, unknown>>(group: T = {} as T): T =>
	JSON.parse(JSON.stringify(group)) as T;
