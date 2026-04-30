export const formatPrice = (cents: unknown): string => {
	if (!cents && cents !== 0) return '0,00 \u20AC'
	const num = Number(cents) / 100
	return `${num.toFixed(2).replace('.', ',')} \u20AC`
}

export const formatEuro = (euros: unknown): string => {
	if (!euros && euros !== 0) return '0,00'
	return Number(euros).toFixed(2).replace('.', ',')
}

export const euroToCents = (euro: unknown): number | null => {
	if (euro == null || euro === '') return null
	const cleaned = String(euro).replace(/[\u20AC\s]/g, '').replace(',', '.')
	const num = Number.parseFloat(cleaned)
	return Number.isNaN(num) ? null : Math.round(num * 100)
}

export const toCents = (euros: unknown): number => Math.round(Number(euros) * 100)
export const toEuros = (cents: unknown): number => Number(cents) / 100

export const formatPriceIntl = (cents: number): string =>
	new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100)

export const formatPriceSafe = (cents: unknown): string => {
	const value = Number(cents)
	if (!Number.isFinite(value)) return '-'
	return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value / 100)
}

export const parsePrice = (raw: unknown): number | null => {
	if (!raw) return null
	let value = String(raw).replace(/[\u20AC\s]/g, '').replace(/EUR/gi, '')

	if (value.includes(',') && value.includes('.')) {
		value = value.lastIndexOf(',') > value.lastIndexOf('.')
			? value.replace(/\./g, '').replace(',', '.')
			: value.replace(/,/g, '')
	} else {
		value = value.replace(',', '.')
	}

	const num = Number.parseFloat(value)
	return Number.isNaN(num) ? null : Math.round(num * 100)
}
