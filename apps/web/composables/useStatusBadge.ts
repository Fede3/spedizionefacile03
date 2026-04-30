const PALETTE = {
	warning: { color: '#B45309', bg: 'rgba(180,83,9,0.08)' },
	warningSoft: { color: '#C2410C', bg: '#FFF7ED' },
	info: { color: '#095866', bg: 'rgba(9,88,102,0.08)' },
	infoSoft: { color: '#074a56', bg: '#dff0f3' },
	success: { color: '#047857', bg: '#ECFDF3' },
	successAlt: { color: '#059669', bg: 'rgba(5,150,105,0.08)' },
	danger: { color: '#B91C1C', bg: '#FEF2F2' },
	dangerAlt: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
	neutral: { color: '#475569', bg: 'rgba(71,85,105,0.08)' },
	neutralBrand: { color: '#4B5563', bg: 'var(--color-brand-bg-alt, #f3f4f6)' },
} as const

type PaletteKey = keyof typeof PALETTE

const KEY_TO_PALETTE: Record<string, PaletteKey> = {
	pending: 'warning',
	awaiting_bank_transfer: 'warning',
	in_giacenza: 'warningSoft',
	returned: 'warningSoft',
	refunded: 'warningSoft',
	processing: 'info',
	label_generated: 'info',
	in_transit: 'info',
	out_for_delivery: 'infoSoft',
	completed: 'success',
	delivered: 'success',
	paid: 'successAlt',
	payment_failed: 'dangerAlt',
	refused: 'dangerAlt',
	failed: 'danger',
	cancelled: 'neutral',
	canceled: 'neutral',
}

const LABEL_TO_PALETTE: Record<string, PaletteKey> = {
	'In attesa': 'warning',
	'In giacenza': 'warningSoft',
	Reso: 'warningSoft',
	Rimborsato: 'warningSoft',
	'In lavorazione': 'info',
	'Etichetta generata': 'info',
	'In transito': 'info',
	'In consegna': 'infoSoft',
	Completato: 'success',
	Consegnato: 'success',
	Pagato: 'successAlt',
	Fallito: 'danger',
	Rifiutato: 'dangerAlt',
	Annullato: 'neutralBrand',
}

export function useStatusBadgeStyle(status: unknown) {
	const normalized = typeof status === 'string' ? status : ''
	const key = KEY_TO_PALETTE[normalized] || LABEL_TO_PALETTE[normalized] || 'neutral'
	const palette = PALETTE[key]
	return { color: palette.color, background: palette.bg }
}

export function useStatusBadge() {
	return { getStyle: useStatusBadgeStyle }
}
