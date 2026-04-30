type DiscountPreviewSource = {
	type?: unknown
	code?: unknown
	referral_code?: unknown
	percentage?: unknown
	discount_percent?: unknown
	discount_amount?: unknown
	new_total_raw?: unknown
	new_total?: unknown
	pro_user_name?: unknown
	pro_name?: unknown
}

type BuildPreviewOptions = {
	result?: DiscountPreviewSource | null
	total?: unknown
	codeFallback?: string
	typeFallback?: string
}

type BuildOrderContextOptions = {
	preview?: DiscountPreviewSource | null
	subtotal?: unknown
	finalTotal?: unknown
}

export function parseEuroAmount(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value

	const normalized = String(value ?? '')
		.replace(/\u20AC/g, '')
		.replace(/EUR/gi, '')
		.replace(/\s/g, '')
		.replace(/\./g, '')
		.replace(',', '.')

	const parsed = Number(normalized)
	return Number.isFinite(parsed) ? parsed : 0
}

export function calculateDiscountAmount(total: unknown, percentage: unknown): number {
	return Math.round(parseEuroAmount(total) * (Number(percentage || 0) / 100) * 100) / 100
}

export function calculateDiscountedTotal(total: unknown, discountAmount: unknown): number {
	return Math.max(0, Math.round((parseEuroAmount(total) - Number(discountAmount || 0)) * 100) / 100)
}

export function formatPreviewEuroAmount(value: unknown): string {
	return `${parseEuroAmount(value).toFixed(2).replace('.', ',')}\u00A0\u20AC`
}

export function buildDiscountPreviewState({
	result = null,
	total,
	codeFallback = '',
	typeFallback = 'coupon',
}: BuildPreviewOptions = {}) {
	const subtotal = parseEuroAmount(total)
	const percentage = Number(result?.percentage ?? result?.discount_percent ?? 0)
	const discountAmountCandidate = Number(result?.discount_amount)
	const discountAmount = Number.isFinite(discountAmountCandidate)
		? discountAmountCandidate
		: calculateDiscountAmount(subtotal, percentage)
	const finalTotalCandidate = Number(result?.new_total_raw)
	const finalTotal = Number.isFinite(finalTotalCandidate)
		? finalTotalCandidate
		: calculateDiscountedTotal(subtotal, discountAmount)

	return {
		type: String(result?.type || typeFallback),
		code: String(result?.referral_code || result?.code || codeFallback || '').trim().toUpperCase(),
		discount_percent: Number.isFinite(percentage) ? percentage : 0,
		discount_amount: discountAmount,
		new_total_raw: finalTotal,
		new_total: String(result?.new_total || formatPreviewEuroAmount(finalTotal)),
		pro_name: String(result?.pro_user_name || result?.pro_name || ''),
	}
}

export function buildCartDiscountPreviewState(options: BuildPreviewOptions = {}) {
	const preview = buildDiscountPreviewState(options)

	return {
		couponApplied: true,
		couponDiscount: preview.discount_percent || null,
		appliedTotal: preview.new_total,
		preview,
	}
}

export function buildDiscountOrderContext({ preview = null, subtotal, finalTotal }: BuildOrderContextOptions = {}) {
	if (!preview || typeof preview !== 'object') return null

	const code = String(preview.code || preview.referral_code || '').trim().toUpperCase()
	const type = String(preview.type || '').trim().toLowerCase()
	if (!code || !type) return null

	const subtotalAmount = parseEuroAmount(subtotal)
	const discountAmount = Number(preview.discount_amount)
	const normalizedDiscountAmount = Number.isFinite(discountAmount)
		? discountAmount
		: calculateDiscountAmount(subtotalAmount, preview.discount_percent ?? preview.percentage ?? 0)
	const explicitFinalTotal = Number(finalTotal)
	const normalizedFinalTotal = Number.isFinite(explicitFinalTotal)
		? explicitFinalTotal
		: calculateDiscountedTotal(subtotalAmount, normalizedDiscountAmount)
	const discountPercent = Number(preview.discount_percent ?? preview.percentage ?? 0)

	return {
		type,
		code,
		discount_percent: Number.isFinite(discountPercent) ? discountPercent : 0,
		discount_amount: normalizedDiscountAmount,
		subtotal_raw: subtotalAmount,
		final_total_raw: normalizedFinalTotal,
		pro_name: String(preview.pro_name || preview.pro_user_name || '').trim(),
	}
}
