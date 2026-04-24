/**
 * usePudoMap.ts
 */
import { ref } from 'vue'
import type { Ref } from 'vue'

interface PudoLike {
	ui_key?: string
	pudo_id?: string | number
	distance_meters?: number
	opening_hours?: unknown
	enabled?: boolean
	[key: string]: unknown
}

interface PudoDetails {
	enabled?: boolean
	opening_hours?: unknown
	[key: string]: unknown
}

interface UsePudoMapDeps {
	selectedPudoKey: Ref<string | null>
	expandedPudoKey: Ref<string | null>
	pudoDetails: Ref<Record<string, PudoDetails>>
	detailsErrors: Ref<Record<string, string>>
	loadingDetailsKey: Ref<string | null>
	fetchPudoDetails: (pudo: PudoLike, detailKey: string) => Promise<void>
}

type EmitFn = (event: string, ...args: unknown[]) => void

interface PudoStatus {
	label: string
	className: string
}

export function usePudoMap(deps: UsePudoMapDeps, emit: EmitFn) {
	const {
		selectedPudoKey,
		expandedPudoKey,
		pudoDetails,
		fetchPudoDetails,
	} = deps

	const nowTick = ref<number>(Date.now())
	let nowTimer: number | null = null

	const startNowTimer = (): void => { nowTimer = window.setInterval(() => { nowTick.value = Date.now() }, 60000) }
	const stopNowTimer = (): void => { if (nowTimer) { window.clearInterval(nowTimer); nowTimer = null } }

	const selectPudo = (pudo: PudoLike): void => {
		if (selectedPudoKey.value === pudo.ui_key) { selectedPudoKey.value = null; emit('deselect'); return }
		selectedPudoKey.value = pudo.ui_key || null
		emit('select', pudo)
	}

	const toggleDetails = async (pudo: PudoLike): Promise<void> => {
		const detailKey = String(pudo.pudo_id || pudo.ui_key)
		if (expandedPudoKey.value === detailKey) { expandedPudoKey.value = null; return }
		expandedPudoKey.value = detailKey
		if (pudoDetails.value[detailKey]) return
		await fetchPudoDetails(pudo, detailKey)
	}

	const formatDistance = (meters: unknown): string => {
		const v = Number(meters)
		if (!Number.isFinite(v)) return ''
		return v >= 1000 ? `${(v / 1000).toFixed(1)} km` : `${Math.round(v)} m`
	}

	const hasDistance = (pudo: PudoLike): boolean => Number.isFinite(Number(pudo?.distance_meters))
	const distanceLabel = (pudo: PudoLike): string => hasDistance(pudo) ? formatDistance(pudo.distance_meters) : 'n/d'

	const splitHoursParts = (rawHours: unknown): string[] => {
		if (!rawHours) return []
		if (Array.isArray(rawHours)) return rawHours.map((i) => String(i || '').trim()).filter(Boolean)
		if (typeof rawHours === 'object') return Object.entries(rawHours as Record<string, unknown>).map(([k, v]) => `${k}: ${v}`).filter(Boolean)
		return String(rawHours).split(/\n|\||;/g).map((i) => i.trim()).filter(Boolean)
	}

	const dayTokenMap: Record<number, string[]> = {
		0: ['dom', 'domenica', 'sun', 'sunday'], 1: ['lun', 'lunedi', 'mon', 'monday'],
		2: ['mar', 'martedi', 'tue', 'tuesday'], 3: ['mer', 'mercoledi', 'wed', 'wednesday'],
		4: ['gio', 'giovedi', 'thu', 'thursday'], 5: ['ven', 'venerdi', 'fri', 'friday'],
		6: ['sab', 'sabato', 'sat', 'saturday'],
	}

	const extractTodayHours = (rawHours: unknown): string => {
		const dayTokens = dayTokenMap[new Date(nowTick.value).getDay()] || []
		const parts = splitHoursParts(rawHours)
		if (!parts.length) return ''
		const matches = parts.filter((p) => dayTokens.some((t) => p.toLowerCase().includes(t)))
		if (matches.length) return matches.join(' | ')
		return parts.length === 1 ? parts[0] : ''
	}

	const parseHourToMinutes = (hourText: string): number | null => {
		const normalized = String(hourText || '').trim().replace('.', ':')
		const match = normalized.match(/^(\d{1,2}):(\d{2})$/)
		if (!match) return null
		const h = Number(match[1])
		const m = Number(match[2])
		return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
	}

	const isCurrentlyOpen = (hoursText: string): boolean | null => {
		if (!hoursText) return null
		if (hoursText.toLowerCase().includes('chiuso')) return false
		const ranges = [...hoursText.matchAll(/(\d{1,2}[:.]\d{2})\s*[-\u2013]\s*(\d{1,2}[:.]\d{2})/g)]
		if (!ranges.length) return null
		const nowMinutes = new Date(nowTick.value).getHours() * 60 + new Date(nowTick.value).getMinutes()
		return ranges.some((r) => { const s = parseHourToMinutes(r[1] || ''); const e = parseHourToMinutes(r[2] || ''); return s !== null && e !== null && nowMinutes >= s && nowMinutes <= e })
	}

	const getRawOpeningHours = (pudo: PudoLike): unknown => {
		const dk = String(pudo.pudo_id || pudo.ui_key)
		return (pudoDetails.value[dk] || {}).opening_hours ?? pudo.opening_hours
	}

	const getTodayHoursText = (pudo: PudoLike): string => extractTodayHours(getRawOpeningHours(pudo)) || 'Orari di oggi non disponibili'

	const getPudoStatus = (pudo: PudoLike): PudoStatus => {
		const dk = String(pudo.pudo_id || pudo.ui_key)
		const details = pudoDetails.value[dk] || {}
		const enabled = typeof details.enabled === 'boolean' ? details.enabled : pudo.enabled
		const open = isCurrentlyOpen(getTodayHoursText(pudo))
		if (enabled === false) return { label: 'Chiuso', className: 'text-rose-700 bg-rose-50 border-rose-200' }
		if (open === true) return { label: 'Aperto ora', className: 'text-[#0a8a7a] bg-[#f0fdf4] border-[#d1fae5]' }
		if (open === false) return { label: 'Chiuso ora', className: 'text-rose-700 bg-rose-50 border-rose-200' }
		return { label: 'Da verificare', className: 'text-gray-700 bg-gray-100 border-gray-200' }
	}

	const formatOpeningHours = (hours: unknown): string => {
		if (!hours) return ''
		if (typeof hours === 'string') return hours
		if (Array.isArray(hours)) return hours.join(' | ')
		if (typeof hours === 'object') return Object.entries(hours as Record<string, unknown>).map(([d, v]) => `${d}: ${v}`).join(' | ')
		return ''
	}

	return {
		selectPudo, toggleDetails,
		distanceLabel, getTodayHoursText, getPudoStatus, formatOpeningHours,
		startNowTimer, stopNowTimer,
	}
}
