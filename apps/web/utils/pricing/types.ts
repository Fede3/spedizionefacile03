/**
 * Tipi pubblici del modulo pricing.
 * Estratti da utils/shipmentServicePricing.ts (Ondata 3 split god file).
 *
 * Vincolo cross-stack: le interfacce devono restare allineate al backend
 * Laravel (App\Services\PriceEngineService). Prezzi in centesimi int.
 */

export type PricingApplication = string
export type PricingType = string

export type PricingTier = {
	up_to_kg: number | null
	price_cents: number
}

export type ServicePricingRule = {
	label: string
	description?: string
	pricing_type: PricingType
	enabled: boolean
	application: PricingApplication
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
	tiers?: PricingTier[]
}

export type PricingConfig = {
	service_pricing: Record<string, ServicePricingRule>
	automatic_supplements: Record<string, ServicePricingRule>
}

export type PackageInput = {
	package_type?: string | null
	quantity?: number | string | null
	weight?: number | string | null
	first_size?: number | string | null
	second_size?: number | string | null
	third_size?: number | string | null
	length?: number | string | null
	width?: number | string | null
	height?: number | string | null
	[key: string]: unknown
}

export type NormalizedPackage = {
	package_type: string
	weight_kg: number
	quantity: number
	first_size_cm: number
	second_size_cm: number
	third_size_cm: number
	max_side_cm: number
	secondary_side_sum_cm: number
	raw: PackageInput
}

export type AddressInput = {
	country?: string | null
	country_code?: string | null
	province?: string | null
	city?: string | null
	address?: string | null
	additional_information?: string | null
	postal_code?: string | null
	address_number?: string | null
	pudo_id?: string | null
	name?: string | null
	latitude?: number | null
	longitude?: number | null
	[key: string]: unknown
}

export type NormalizedAddress = {
	country: string
	province: string
	city: string
	address: string
	additional_information: string
}

export type SurchargeItem = {
	key: string
	label: string
	type: 'service' | 'automatic_supplement'
	automatic: boolean
	application: string
	amount_cents: number
	amount: number
}

export type SurchargeResult = {
	total: number
	total_cents: number
	items: SurchargeItem[]
}

export type CalculateShipmentSurchargeOptions = {
	selectedServices?: string[] | string
	serviceType?: string
	serviceData?: Record<string, unknown>
	smsEmailNotification?: boolean
	pricingConfig?: Partial<PricingConfig> | null
	packages?: PackageInput[]
	originAddress?: AddressInput
	destinationAddress?: AddressInput
	deliveryMode?: string
	selectedPudo?: AddressInput | null
	requiresManualQuote?: boolean
}

export type AutomaticSupplementsInput = {
	automaticConfig: Record<string, ServicePricingRule>
	serviceData: Record<string, unknown>
	packages: NormalizedPackage[]
	destinationAddress: AddressInput
	deliveryMode: string
	requiresManualQuote: boolean
	originAddress?: AddressInput
}
