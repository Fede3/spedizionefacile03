import type { Ref } from 'vue'

type OpeningHours = unknown
export type PudoMapPoint = {
	pudo_id?: string
	ui_key?: string
	distance_meters?: number | string | null
	opening_hours?: OpeningHours
	enabled?: boolean
	[key: string]: unknown
}
type PudoDetailsMap<TPudo extends PudoMapPoint> = Record<string, Partial<TPudo>>
type PudoMapDeps<TPudo extends PudoMapPoint> = {
	selectedPudoKey: Ref<string | null>
	expandedPudoKey: Ref<string | null>
	pudoDetails: Ref<PudoDetailsMap<TPudo>>
	fetchPudoDetails: (pudo: TPudo, detailKey: string) => Promise<unknown>
}
type PudoMapEmit<TPudo extends PudoMapPoint> = (event: 'select' | 'deselect', pudo?: TPudo) => void
type PudoStatus = {
	label: string
	className: string
}

const dayTokenMap: Record<number, string[]> = {
	0: ['dom', 'domenica', 'sun', 'sunday'],
	1: ['lun', 'lunedi', 'mon', 'monday'],
	2: ['mar', 'martedi', 'tue', 'tuesday'],
	3: ['mer', 'mercoledi', 'wed', 'wednesday'],
	4: ['gio', 'giovedi', 'thu', 'thursday'],
	5: ['ven', 'venerdi', 'fri', 'friday'],
	6: ['sab', 'sabato', 'sat', 'saturday'],
}

const getPudoKey = (pudo: PudoMapPoint): string => String(pudo.pudo_id || pudo.ui_key || '')
const splitHoursParts = (rawHours: OpeningHours): string[] => {
	if (!rawHours) return []
	if (Array.isArray(rawHours)) return rawHours.map((item) => String(item || '').trim()).filter(Boolean)
	if (typeof rawHours === 'object') return Object.entries(rawHours).map(([key, value]) => `${key}: ${value}`).filter(Boolean)
	return String(rawHours).split(/[\n|;]/).map((item) => item.trim()).filter(Boolean)
}
const parseHourToMinutes = (hourText: unknown): number | null => {
	const match = String(hourText || '').trim().replace('.', ':').match(/^(\d{1,2}):(\d{2})$/)
	if (!match) return null

	const hours = Number(match[1])
	const minutes = Number(match[2])
	return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null
}

export function usePudoMap<TPudo extends PudoMapPoint>(deps: PudoMapDeps<TPudo>, emit: PudoMapEmit<TPudo>) {
	const { selectedPudoKey, expandedPudoKey, pudoDetails, fetchPudoDetails } = deps
	const nowTick = ref(Date.now())
	let nowTimer: number | null = null

	const startNowTimer = () => {
		nowTimer = window.setInterval(() => {
			nowTick.value = Date.now()
		}, 60000)
	}
	const stopNowTimer = () => {
		if (nowTimer) {
			window.clearInterval(nowTimer)
			nowTimer = null
		}
	}

	onScopeDispose(stopNowTimer)

	const selectPudo = (pudo: TPudo) => {
		if (selectedPudoKey.value === pudo.ui_key) {
			selectedPudoKey.value = null
			emit('deselect')
			return
		}

		selectedPudoKey.value = pudo.ui_key || null
		emit('select', pudo)
	}
	const toggleDetails = async (pudo: TPudo) => {
		const detailKey = getPudoKey(pudo)
		if (expandedPudoKey.value === detailKey) {
			expandedPudoKey.value = null
			return
		}

		expandedPudoKey.value = detailKey
		if (!pudoDetails.value[detailKey]) {
			await fetchPudoDetails(pudo, detailKey)
		}
	}
	const formatDistance = (meters: unknown): string => {
		const value = Number(meters)
		if (!Number.isFinite(value)) return ''
		return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`
	}
	const hasDistance = (pudo: TPudo): boolean => Number.isFinite(Number(pudo.distance_meters))
	const distanceLabel = (pudo: TPudo): string =>
		hasDistance(pudo) ? formatDistance(pudo.distance_meters) : 'n/d'
	const extractTodayHours = (rawHours: OpeningHours): string => {
		const dayTokens = dayTokenMap[new Date(nowTick.value).getDay()] || []
		const parts = splitHoursParts(rawHours)
		if (!parts.length) return ''

		const matches = parts.filter((part) => dayTokens.some((token) => part.toLowerCase().includes(token)))
		if (matches.length) return matches.join(' | ')
		return parts.length === 1 ? parts[0] || '' : ''
	}
	const isCurrentlyOpen = (hoursText: string): boolean | null => {
		if (!hoursText) return null
		if (hoursText.toLowerCase().includes('chiuso')) return false

		const ranges = [...hoursText.matchAll(/(\d{1,2}[:.]\d{2})\s*[-\u2013]\s*(\d{1,2}[:.]\d{2})/g)]
		if (!ranges.length) return null

		const now = new Date(nowTick.value)
		const nowMinutes = now.getHours() * 60 + now.getMinutes()
		return ranges.some((range) => {
			const start = parseHourToMinutes(range[1])
			const end = parseHourToMinutes(range[2])
			return start !== null && end !== null && nowMinutes >= start && nowMinutes <= end
		})
	}
	const getRawOpeningHours = (pudo: TPudo): OpeningHours =>
		pudoDetails.value[getPudoKey(pudo)]?.opening_hours ?? pudo.opening_hours
	const getTodayHoursText = (pudo: TPudo): string =>
		extractTodayHours(getRawOpeningHours(pudo)) || 'Orari di oggi non disponibili'
	const getPudoStatus = (pudo: TPudo): PudoStatus => {
		const details = pudoDetails.value[getPudoKey(pudo)]
		const enabled = typeof details?.enabled === 'boolean' ? details.enabled : pudo.enabled
		const open = isCurrentlyOpen(getTodayHoursText(pudo))
		if (enabled === false) return { label: 'Chiuso', className: 'text-rose-700 bg-rose-50 border-rose-200' }
		if (open === true) return { label: 'Aperto ora', className: 'text-[#0a8a7a] bg-[#f0fdf4] border-[#d1fae5]' }
		if (open === false) return { label: 'Chiuso ora', className: 'text-rose-700 bg-rose-50 border-rose-200' }
		return { label: 'Da verificare', className: 'text-gray-700 bg-gray-100 border-gray-200' }
	}
	const formatOpeningHours = (hours: OpeningHours): string => {
		if (!hours) return ''
		if (typeof hours === 'string') return hours
		if (Array.isArray(hours)) return hours.join(' | ')
		if (typeof hours === 'object') return Object.entries(hours).map(([day, value]) => `${day}: ${value}`).join(' | ')
		return ''
	}

	return {
		selectPudo,
		toggleDetails,
		distanceLabel,
		getTodayHoursText,
		getPudoStatus,
		formatOpeningHours,
		startNowTimer,
		stopNowTimer,
	}
}
