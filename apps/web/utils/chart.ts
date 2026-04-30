type ChartPoint = {
	date?: unknown
	count?: unknown
	value?: unknown
	orders?: unknown
	amount?: unknown
	revenue?: unknown
}
type SegmentSource = {
	status?: unknown
	key?: unknown
	label?: unknown
	count?: unknown
	value?: unknown
}

export const chartToNumber = (value: unknown): number => {
	const n = Number(value ?? 0)
	return Number.isFinite(n) ? n : 0
}

export const formatCurrency = (cents: unknown): string => new Intl.NumberFormat('it-IT', {
	style: 'currency',
	currency: 'EUR',
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
}).format(chartToNumber(cents) / 100)

export const formatCurrencyShort = (cents: unknown): string => {
	const euros = chartToNumber(cents) / 100
	if (euros < 1000) return formatCurrency(cents)

	return new Intl.NumberFormat('it-IT', {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(euros)
}

export const formatPercentage = (value: unknown): string => new Intl.NumberFormat('it-IT', {
	style: 'percent',
	maximumFractionDigits: 0,
}).format(Math.max(0, Math.min(1, chartToNumber(value))))

export const formatInteger = (value: unknown): string => new Intl.NumberFormat('it-IT', {
	maximumFractionDigits: 0,
}).format(Math.round(chartToNumber(value)))

export const formatDateShort = (value: unknown, fallbackIndex = 0): string => {
	if (!value) return `${fallbackIndex + 1}/4`
	const date = new Date(String(value))
	return Number.isNaN(date.getTime())
		? `${fallbackIndex + 1}/4`
		: new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'numeric' }).format(date)
}

export const formatDate = (value: unknown, fallbackIndex = 0): string => {
	if (!value) return `Giorno ${fallbackIndex + 1}`
	const date = new Date(String(value))
	return Number.isNaN(date.getTime())
		? `Giorno ${fallbackIndex + 1}`
		: new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(date)
}

export const normalizeChartData = (data: unknown) => {
	const series = Array.isArray(data) ? data as ChartPoint[] : []
	return series.slice(-30).map((item, index) => ({
		key: item.date ? String(item.date) : `day-${index}`,
		label: formatDateShort(item.date, index),
		fullLabel: formatDate(item.date, index),
		value: chartToNumber(item.count ?? item.value ?? item.orders ?? item.amount ?? item.revenue),
		date: item.date ? String(item.date) : null,
	}))
}

export const computeSegments = (items: unknown) => {
	const raw = Array.isArray(items) ? items as SegmentSource[] : []
	const normalized = raw.map((item, index) => {
		const key = String(item.status || item.key || item.label || `status-${index}`)
			.toLowerCase()
			.replace(/\s+/g, '_')
		return {
			key,
			label: String(item.label || item.status || key),
			count: chartToNumber(item.count ?? item.value ?? 0),
			share: 0,
		}
	})
	const total = normalized.reduce((sum, item) => sum + item.count, 0)
	return total <= 0 ? normalized : normalized.map((item) => ({ ...item, share: item.count / total }))
}
