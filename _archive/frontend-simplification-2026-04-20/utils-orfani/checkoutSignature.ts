type CheckoutNormalized = string | number | boolean | null | CheckoutNormalized[] | { [key: string]: CheckoutNormalized }

const normalizeCheckoutValue = (value: unknown): CheckoutNormalized => {
	if (Array.isArray(value)) {
		return value.map(item => normalizeCheckoutValue(item))
	}

	if (value && typeof value === 'object') {
		const source = value as Record<string, unknown>
		return Object.keys(source)
			.sort()
			.reduce<Record<string, CheckoutNormalized>>((acc, key) => {
				const normalized = normalizeCheckoutValue(source[key])
				if (normalized !== undefined) {
					acc[key] = normalized
				}
				return acc
			}, {})
	}

	if (value === undefined) return null
	return value as CheckoutNormalized
}

export interface CheckoutPackageInput {
	id?: number | string | null
	package_id?: number | string | null
	package_type?: string
	quantity?: number | string
	weight?: number | string
	first_size?: number | string
	second_size?: number | string
	third_size?: number | string
	single_price?: number | string
	content_description?: string
	origin_address?: unknown
	destination_address?: unknown
	services?: {
		sms_email_notification?: boolean
		serviceData?: {
			delivery_mode?: 'home' | 'pudo' | string | null
			pudo?: unknown
			sms_email_notification?: boolean
			[key: string]: unknown
		}
		[key: string]: unknown
	}
	delivery_mode?: 'home' | 'pudo' | string | null
	selected_pudo?: unknown
	pudo?: unknown
	sms_email_notification?: boolean
}

interface NormalizedCheckoutPackage {
	id: number | string | null
	package_type: string | null
	quantity: number
	weight: number
	first_size: number
	second_size: number
	third_size: number
	single_price: number
	content_description: string | null
	origin_address: CheckoutNormalized
	destination_address: CheckoutNormalized
	services: CheckoutNormalized
	delivery_mode: string | null
	selected_pudo: CheckoutNormalized
	sms_email_notification: boolean
}

const normalizeCheckoutPackageSnapshot = (pkg: CheckoutPackageInput = {}): NormalizedCheckoutPackage => ({
	id: pkg.id ?? pkg.package_id ?? null,
	package_type: String(pkg.package_type ?? '').trim() || null,
	quantity: Number(pkg.quantity) || 1,
	weight: Number(pkg.weight) || 0,
	first_size: Number(pkg.first_size) || 0,
	second_size: Number(pkg.second_size) || 0,
	third_size: Number(pkg.third_size) || 0,
	single_price: Number(pkg.single_price) || 0,
	content_description: String(pkg.content_description ?? '').trim() || null,
	origin_address: normalizeCheckoutValue(pkg.origin_address || {}),
	destination_address: normalizeCheckoutValue(pkg.destination_address || {}),
	services: normalizeCheckoutValue(pkg.services || {}),
	delivery_mode: pkg.delivery_mode ?? pkg.services?.serviceData?.delivery_mode ?? null,
	selected_pudo: normalizeCheckoutValue(pkg.selected_pudo ?? pkg.pudo ?? pkg.services?.serviceData?.pudo ?? null),
	sms_email_notification: Boolean(
		pkg.sms_email_notification
		|| pkg.services?.sms_email_notification
		|| pkg.services?.serviceData?.sms_email_notification,
	),
})

export interface BuildCheckoutSubmissionSignatureParams {
	existingOrderId?: number | string | null
	cartPackages?: CheckoutPackageInput[]
	billingPayload?: unknown
}

export const buildCheckoutSubmissionSignature = ({
	existingOrderId = null,
	cartPackages = [],
	billingPayload = null,
}: BuildCheckoutSubmissionSignatureParams = {}): string => {
	const normalizedPackages = Array.isArray(cartPackages)
		? cartPackages.map(pkg => normalizeCheckoutPackageSnapshot(pkg))
		: []

	normalizedPackages.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))

	return JSON.stringify(
		normalizeCheckoutValue({
			existingOrderId: existingOrderId ?? null,
			cartPackages: normalizedPackages,
			billingPayload: billingPayload ?? null,
		}),
	)
}

export interface RecoverCheckoutCartStateParams {
	clearCartData?: ((key: string) => void) | null
	refreshCartState?: (() => unknown | Promise<unknown>) | null
	refreshCartCache?: ((key: string) => unknown | Promise<unknown>) | null
	cartKey?: string
}

export const recoverCheckoutCartState = async ({
	clearCartData = null,
	refreshCartState = null,
	refreshCartCache = null,
	cartKey = 'cart',
}: RecoverCheckoutCartStateParams = {}): Promise<void> => {
	const globalClear = (globalThis as { clearNuxtData?: (key: string) => void }).clearNuxtData
	const clearFn = clearCartData || globalClear
	clearFn?.(cartKey)

	await Promise.allSettled([
		typeof refreshCartState === 'function' ? Promise.resolve(refreshCartState()) : Promise.resolve(),
		typeof refreshCartCache === 'function' ? Promise.resolve(refreshCartCache(cartKey)) : Promise.resolve(),
	])
}
