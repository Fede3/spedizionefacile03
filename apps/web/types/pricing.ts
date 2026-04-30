export type BandType = 'weight' | 'volume'

export interface PriceBand {
	id: string
	type: BandType | string
	min_value: number
	max_value: number
	base_price: number
	discount_price: number | null
	show_discount: boolean
	sort_order: number
}

export interface IncrementLadderRow {
	from_step: number
	to_step: number | null
	increment_cents: number
}

export interface ExtraRules {
	enabled: boolean
	weight_start: number
	weight_step: number
	volume_start: number
	volume_step: number
	increment_cents: number
	increment_mode: string
	weight_increment_ladder: IncrementLadderRow[]
	volume_increment_ladder: IncrementLadderRow[]
	base_price_cents_mode: 'last_band_effective' | 'manual' | string
	base_price_cents_manual: number | null
	weight_resolution: number
	volume_resolution: number
}

export interface SupplementRule {
	id: string
	prefix: string
	amount_cents: number
	apply_to: 'origin' | 'destination' | 'both' | string
	enabled: boolean
}

export interface EuropeRate {
	country_code: string
	country_name: string
	price_cents: number | null
	quote_required: boolean
}

export interface EuropeBand {
	id: string
	label: string
	max_weight_kg: number
	max_volume_m3: number
	volumetric_factor: number
	rates: EuropeRate[]
}

export interface EuropePricing {
	enabled: boolean
	scope: string
	origin_country_code: string
	max_packages: number
	max_quantity_per_package: number
	supported_country_codes: string[]
	bands: EuropeBand[]
	version: string | number | null
}

export interface PricingRule {
	label: string
	description?: string
	pricing_type: string
	enabled: boolean
	application: string
	note?: string
	price_cents?: number | null
	min_fee_cents?: number | null
	percentage_rate?: number | null
	threshold_amount_eur?: number | null
	max_weight_kg?: number | null
	threshold_cm?: number | null
	longest_side_threshold_cm?: number | null
	girth_threshold_cm?: number | null
	min_longest_side_cm?: number | null
	max_secondary_side_cm?: number | null
	province_codes?: string[]
	country_codes?: string[]
	keyword_list?: string[]
	flag_keys?: string[]
	delivery_modes?: string[]
	tiers?: Array<{ up_to_kg: number | null; price_cents: number }>
}

export type PricingRuleGroup = Record<string, PricingRule>

export interface PromoSettings {
	active: boolean
	label_text: string
	label_color: string
	label_image: string | null
	show_badges: boolean
	description: string
}

export interface PriceBandsState {
	weight: PriceBand[]
	volume: PriceBand[]
	extra_rules: ExtraRules
	supplements: SupplementRule[]
	europe: EuropePricing
	service_pricing: PricingRuleGroup
	automatic_supplements: PricingRuleGroup
	operational_fees: PricingRuleGroup
	version: string | number | null
}
