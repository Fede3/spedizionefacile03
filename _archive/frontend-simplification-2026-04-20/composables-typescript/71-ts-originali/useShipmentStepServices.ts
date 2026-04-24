import type { Ref } from 'vue'
import { DEFAULT_PICKUP_TIME_SLOT, normalizePickupRequestDate } from '~/composables/useShipmentStepSessionPersistence'
import type { PudoPoint, ShipmentDetails } from '~/types'

interface ShipmentServiceDefinition {
	key: string
	img: string
	width: number
	height: number
	name: string
	description: string
	isSelected: boolean
	featured?: boolean
	priceLabel?: string
	statusLabel?: string
	hasDetails?: boolean
	currentPriceLabel?: string
}

interface ContrassegnoData {
	importo: string
	modalita_incasso: string
	modalita_rimborso: string
	dettaglio_rimborso: string
}

interface SpondaData {
	note: string
}

interface PickupRequestData {
	enabled: boolean
	date: string
	time_slot: string
	notes: string
}

interface ServiceDataShape {
	contrassegno: ContrassegnoData
	assicurazione: Record<string, unknown>
	sponda_idraulica: SpondaData
	pickup_request: PickupRequestData
	telefono_notifica: string
	flags: string[]
}

interface ServicesValue {
	service_type: string
	date: string
	time: string
}

interface UserStoreLike {
	servicesArray: string[]
	serviceData: Partial<ServiceDataShape> & Record<string, unknown>
	pickupDate?: string
	smsEmailNotification?: boolean
	shipmentDetails?: ShipmentDetails
	deliveryMode?: string
	selectedPudo?: PudoPoint | null
}

interface DayEntry {
	date: Date
	weekday: string
	dayNumber: number
	monthAbbr: string
	formattedDate: string
}

interface ShipmentStepServicesArgs {
	shipmentFlowStore: UserStoreLike
	dateError: Ref<string | null>
}

const DEFAULT_SHIPMENT_SERVICES: ShipmentServiceDefinition[] = [
	{
		key: 'senza_etichetta',
		img: 'no-label.png',
		width: 26,
		height: 17,
		name: 'Senza etichetta',
		description: 'Niente stampante? Il corriere pensa a tutto lui.',
		isSelected: false,
		featured: true,
	},
	{
		key: 'contrassegno',
		img: 'cash-on-delivery.png',
		width: 28,
		height: 24,
		name: 'Contrassegno',
		description: 'Incasso alla consegna.',
		priceLabel: '',
		statusLabel: 'Da configurare',
		isSelected: false,
		hasDetails: true,
	},
	{
		key: 'assicurazione',
		img: 'insurance.png',
		width: 24,
		height: 24,
		name: 'Assicurazione',
		description: 'Copertura completa.',
		priceLabel: '',
		statusLabel: 'Copertura completa',
		isSelected: false,
		hasDetails: true,
	},
	{
		key: 'sponda_idraulica',
		img: 'tail-lift.png',
		width: 24,
		height: 24,
		name: 'Sponda idraulica',
		description: 'Per colli pesanti.',
		priceLabel: '',
		statusLabel: 'Per colli pesanti',
		isSelected: false,
	},
]

const createDefaultServiceData = (): ServiceDataShape => ({
	contrassegno: {
		importo: '',
		modalita_incasso: '',
		modalita_rimborso: '',
		dettaglio_rimborso: '',
	},
	assicurazione: {},
	sponda_idraulica: {
		note: '',
	},
	pickup_request: {
		enabled: false,
		date: '',
		time_slot: DEFAULT_PICKUP_TIME_SLOT,
		notes: '',
	},
	telefono_notifica: '',
	flags: [],
})

const createMergedServiceData = (storedData: Partial<ServiceDataShape> & Record<string, unknown> = {}): ServiceDataShape => {
	const base = createDefaultServiceData()

	return {
		contrassegno: {
			...base.contrassegno,
			...((storedData.contrassegno as Partial<ContrassegnoData>) || {}),
		},
		assicurazione: {
			...base.assicurazione,
			...((storedData.assicurazione as Record<string, unknown>) || {}),
		},
		sponda_idraulica: {
			...base.sponda_idraulica,
			...((storedData.sponda_idraulica as Partial<SpondaData>) || {}),
		},
		pickup_request: {
			...base.pickup_request,
			...((storedData.pickup_request as Partial<PickupRequestData>) || {}),
		},
		telefono_notifica: (storedData.telefono_notifica as string | undefined) || '',
		flags: Array.isArray(storedData.flags) ? [...(storedData.flags as string[])] : [],
	}
}

const EURO_FORMATTER = new Intl.NumberFormat('it-IT', {
	style: 'currency',
	currency: 'EUR',
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
})

const formatCurrencyCents = (cents: number | string | null | undefined, { withPlus = false }: { withPlus?: boolean } = {}): string => {
	const normalizedCents = Math.max(0, Math.round(Number(cents || 0)))
	const formatted = EURO_FORMATTER.format(normalizedCents / 100)
	return withPlus ? `+${formatted}` : formatted
}

const formatPercentageLabel = (value: number | string | null | undefined): string => {
	const number = Number(value || 0)
	return Number.isInteger(number) ? String(number) : number.toLocaleString('it-IT')
}

export const useShipmentStepServices = ({ shipmentFlowStore, dateError }: ShipmentStepServicesArgs) => {
	const pickupCalendarAnchor = useState<string>('shipment-pickup-calendar-anchor', () => new Date().toISOString().slice(0, 10))
	const { priceBands, loadPriceBands } = usePriceBands()
	const services = ref<ServicesValue>({
		service_type: '',
		date: '',
		time: '',
	})

	const servicesList = ref<ShipmentServiceDefinition[]>(DEFAULT_SHIPMENT_SERVICES.map((service) => ({ ...service })))
	const expandedServiceKey = ref<string>('')
	const serviceData = ref<ServiceDataShape>(createMergedServiceData(shipmentFlowStore.serviceData || {}))
	const smsEmailNotification = ref<boolean>(false)

	const servicePricing = computed<Record<string, Record<string, unknown>>>(
		() => (priceBands.value?.service_pricing as Record<string, Record<string, unknown>>) || {},
	)

	const featuredCurrentPriceCents = computed<number>(() => {
		return Math.max(0, Math.round(Number((servicePricing.value?.senza_etichetta?.price_cents as number | undefined) ?? 99)))
	})

	const featuredCurrentPriceLabel = computed<string>(() => formatCurrencyCents(featuredCurrentPriceCents.value))

	const notificationPriceLabel = computed<string>(() => {
		return formatCurrencyCents((servicePricing.value?.notifications?.price_cents as number | undefined) ?? 50, { withPlus: true })
	})

	const getServicePriceLabel = (service: ShipmentServiceDefinition): string => {
		if (service?.key === 'contrassegno') {
			const rule = (servicePricing.value?.contrassegno as Record<string, unknown>) || {}
			return `da ${formatCurrencyCents((rule.min_fee_cents as number | undefined) ?? 700)} + ${formatPercentageLabel((rule.percentage_rate as number | undefined) ?? 2)}%`
		}
		if (service?.key === 'assicurazione') {
			const rule = (servicePricing.value?.assicurazione as Record<string, unknown>) || {}
			return `da ${formatCurrencyCents((rule.min_fee_cents as number | undefined) ?? 700)} + ${formatPercentageLabel((rule.percentage_rate as number | undefined) ?? 2)}%`
		}
		if (service?.key === 'sponda_idraulica') {
			return formatCurrencyCents((servicePricing.value?.sponda_idraulica?.price_cents as number | undefined) ?? 1500, { withPlus: true })
		}
		return service.priceLabel || ''
	}

	const findServiceByKey = (serviceKey: string): ShipmentServiceDefinition | null =>
		servicesList.value.find((service) => service.key === serviceKey) || null

	const syncSelectedServicesVisual = (): void => {
		servicesList.value.forEach((service) => {
			service.isSelected = shipmentFlowStore.servicesArray.includes(service.name)
		})
	}

	const removeService = (service: ShipmentServiceDefinition): void => {
		const index = shipmentFlowStore.servicesArray.indexOf(service.name)
		if (index !== -1) {
			shipmentFlowStore.servicesArray.splice(index, 1)
		}

		const visual = findServiceByKey(service.key)
		if (visual) {
			visual.isSelected = false
		}

		if (expandedServiceKey.value === service.key) {
			expandedServiceKey.value = ''
		}

		// Rimuovi eventuale flag associato
		// NB: definito piu' sotto via FLAG_KEYS_FOR_SERVICE; se servizio non gestito
		// a flag, la funzione esce silenziosamente.
		services.value.service_type = shipmentFlowStore.servicesArray.join(', ')
	}

	const ensureServiceSelected = (service: ShipmentServiceDefinition, serviceIndex: number): void => {
		const visual = servicesList.value[serviceIndex]
		if (visual) {
			visual.isSelected = true
		}

		if (!shipmentFlowStore.servicesArray.includes(service.name)) {
			shipmentFlowStore.servicesArray.push(service.name)
		}

		services.value.service_type = shipmentFlowStore.servicesArray.join(', ')
	}

	const FLAG_KEYS_FOR_SERVICE: Record<string, string> = {
		sponda_idraulica: 'sponda_idraulica',
	}

	const addFlagForService = (serviceKey: string): void => {
		const flag = FLAG_KEYS_FOR_SERVICE[serviceKey]
		if (!flag) return
		const current = Array.isArray(serviceData.value.flags) ? serviceData.value.flags : []
		if (!current.includes(flag)) {
			serviceData.value.flags = [...current, flag]
		}
	}

	const removeFlagForService = (serviceKey: string): void => {
		const flag = FLAG_KEYS_FOR_SERVICE[serviceKey]
		if (!flag) return
		const current = Array.isArray(serviceData.value.flags) ? serviceData.value.flags : []
		if (current.includes(flag)) {
			serviceData.value.flags = current.filter((entry) => entry !== flag)
		}
	}

	const chooseService = (service: ShipmentServiceDefinition, serviceIndex: number): void => {
		const visual = servicesList.value[serviceIndex]
		if (!visual) return

		const isCurrentlySelected = Boolean(visual.isSelected)
		visual.isSelected = !isCurrentlySelected

		if (!isCurrentlySelected) {
			if (!shipmentFlowStore.servicesArray.includes(service.name)) {
				shipmentFlowStore.servicesArray.push(service.name)
			}

			if (service.key === 'sponda_idraulica') {
				shipmentFlowStore.serviceData = shipmentFlowStore.serviceData || {}
				shipmentFlowStore.serviceData.sponda_idraulica = { ...serviceData.value.sponda_idraulica }
			}

			// Audit F16: persisti flag per servizi gestiti come toggle on/off
			addFlagForService(service.key)
		} else {
			const index = shipmentFlowStore.servicesArray.indexOf(service.name)
			if (index !== -1) {
				shipmentFlowStore.servicesArray.splice(index, 1)
			}
			if (expandedServiceKey.value === service.key) {
				expandedServiceKey.value = ''
			}

			removeFlagForService(service.key)
		}

		services.value.service_type = shipmentFlowStore.servicesArray.join(', ')
	}

	const toggleServiceDetails = (service: ShipmentServiceDefinition): void => {
		if (!service?.hasDetails) return
		expandedServiceKey.value = expandedServiceKey.value === service.key ? '' : service.key
	}

	const toggleServiceSelection = (service: ShipmentServiceDefinition, serviceIndex: number): void => {
		const visual = servicesList.value[serviceIndex]
		const isSelected = Boolean(visual?.isSelected)
		const shouldToggleDirectly = service.featured || !service.hasDetails

		if (shouldToggleDirectly) {
			chooseService(service, serviceIndex)
			return
		}

		if (isSelected) {
			removeService(service)
			return
		}

		ensureServiceSelected(service, serviceIndex)
		if (!service.hasDetails) {
			expandedServiceKey.value = ''
		}
	}

	const chooseDate = (day: DayEntry): void => {
		const nextDate = day.formattedDate || day.date.toLocaleDateString('it-IT')
		services.value.date = nextDate
		dateError.value = null
	}

	const daysInMonth = computed<DayEntry[]>(() => {
		const result: DayEntry[] = []
		const today = new Date(`${pickupCalendarAnchor.value}T12:00:00`)
		const year = today.getFullYear()
		const month = today.getMonth()
		const day = today.getDate() + 1

		const appendWorkingDays = (targetYear: number, targetMonth: number, startDay: number, endDay: number): void => {
			for (let index = startDay; index <= endDay; index++) {
				const date = new Date(targetYear, targetMonth, index)
				const weekdayIndex = date.getDay()
				const isWeekend = weekdayIndex === 0 || weekdayIndex === 6
				const weekday = date.toLocaleString('it-IT', { weekday: 'short' })
				const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
				const monthAbbr = date.toLocaleString('it-IT', { month: 'short' })
				const formattedMonthAbbr = monthAbbr.charAt(0).toUpperCase() + monthAbbr.slice(1)
				const formattedDate = date.toLocaleDateString('it-IT')

				if (isWeekend) continue

				result.push({
					date,
					weekday: formattedWeekday,
					dayNumber: date.getDate(),
					monthAbbr: formattedMonthAbbr,
					formattedDate,
				})
			}
		}

		appendWorkingDays(year, month, day, new Date(year, month + 1, 0).getDate())

		const nextMonth = month + 1
		appendWorkingDays(year, nextMonth, 1, new Date(year, nextMonth + 1, 0).getDate())

		return result
	})

	const featuredService = computed<ShipmentServiceDefinition | null>(() => {
		const service = servicesList.value.find((entry) => entry.featured)
		if (!service) return null

		return {
			...service,
			currentPriceLabel: featuredCurrentPriceLabel.value,
		}
	})

	const regularServices = computed<ShipmentServiceDefinition[]>(() =>
		servicesList.value
			.filter((service) => !service.featured)
			.map((service) => ({
				...service,
				priceLabel: getServicePriceLabel(service),
			})),
	)

	const resetServicesState = (): void => {
		shipmentFlowStore.servicesArray = []
		services.value.service_type = ''
		smsEmailNotification.value = false
		serviceData.value = createMergedServiceData()
		shipmentFlowStore.serviceData = createMergedServiceData() as Partial<ServiceDataShape> & Record<string, unknown>
		expandedServiceKey.value = ''
		syncSelectedServicesVisual()
	}

	if (shipmentFlowStore.pickupDate) {
		services.value.date = shipmentFlowStore.pickupDate
	}

	const initialPickupRequest = shipmentFlowStore.serviceData?.pickup_request as PickupRequestData | undefined
	if (!services.value.time && initialPickupRequest?.time_slot) {
		services.value.time = initialPickupRequest.time_slot
	}

	if (shipmentFlowStore.servicesArray.length > 0) {
		services.value.service_type = shipmentFlowStore.servicesArray.join(', ')
		syncSelectedServicesVisual()
	}

	if (shipmentFlowStore.smsEmailNotification !== undefined) {
		smsEmailNotification.value = shipmentFlowStore.smsEmailNotification
	}

	watch(
		daysInMonth,
		(availableDays) => {
			if (!Array.isArray(availableDays) || availableDays.length === 0) return

			const hasSelectedDay = availableDays.some((day) => day.formattedDate === services.value.date)
			if (hasSelectedDay) return

			const firstDay = availableDays[0]
			if (firstDay) chooseDate(firstDay)
		},
		{ immediate: true },
	)

	onMounted(() => {
		loadPriceBands().catch(() => {
			// Warning already logged inside usePriceBands
		})
	})

	const syncPickupRequestState = (): void => {
		const pickupRequestDate = normalizePickupRequestDate(services.value.date || shipmentFlowStore.pickupDate || '')
		const pickupTimeSlot =
			String(services.value.time || serviceData.value?.pickup_request?.time_slot || DEFAULT_PICKUP_TIME_SLOT).trim() ||
			DEFAULT_PICKUP_TIME_SLOT
		const currentPickupRequest = serviceData.value?.pickup_request || ({} as PickupRequestData)
		const nextPickupRequest: PickupRequestData = {
			enabled: Boolean(pickupRequestDate),
			date: pickupRequestDate,
			time_slot: pickupTimeSlot,
			notes: String(currentPickupRequest.notes || '').trim(),
		}

		if (
			currentPickupRequest.enabled !== nextPickupRequest.enabled ||
			currentPickupRequest.date !== nextPickupRequest.date ||
			currentPickupRequest.time_slot !== nextPickupRequest.time_slot ||
			String(currentPickupRequest.notes || '') !== nextPickupRequest.notes
		) {
			serviceData.value.pickup_request = nextPickupRequest
		}

		if (services.value.time !== pickupTimeSlot) {
			services.value.time = pickupTimeSlot
		}
	}

	watch(
		() => [services.value.date, services.value.time],
		([newDate]) => {
			const selectedDate = newDate || ''
			if (shipmentFlowStore.pickupDate !== selectedDate) {
				shipmentFlowStore.pickupDate = selectedDate
			}

			const currentDetails = shipmentFlowStore.shipmentDetails || ({} as ShipmentDetails)
			if ((currentDetails.date || '') !== selectedDate) {
				shipmentFlowStore.shipmentDetails = {
					...currentDetails,
					date: selectedDate,
				}
			}

			syncPickupRequestState()
		},
		{ immediate: true },
	)

	watch(
		smsEmailNotification,
		(enabled) => {
			shipmentFlowStore.smsEmailNotification = Boolean(enabled)
		},
		{ immediate: true },
	)

	watch(
		serviceData,
		(nextValue) => {
			shipmentFlowStore.serviceData = {
				contrassegno: { ...(nextValue?.contrassegno || {}) },
				assicurazione: { ...(nextValue?.assicurazione || {}) },
				sponda_idraulica: { ...(nextValue?.sponda_idraulica || {}) },
				pickup_request: { ...(nextValue?.pickup_request || {}) },
				telefono_notifica: nextValue?.telefono_notifica || '',
				flags: Array.isArray(nextValue?.flags) ? [...nextValue.flags] : [],
			} as Partial<ServiceDataShape> & Record<string, unknown>
		},
		{ immediate: true, deep: true },
	)

	watch(
		() => [...shipmentFlowStore.servicesArray],
		() => {
			syncSelectedServicesVisual()
			services.value.service_type = shipmentFlowStore.servicesArray.join(', ')
			if (!expandedServiceKey.value) return
			const expandedService = findServiceByKey(expandedServiceKey.value)
			if (!expandedService) {
				expandedServiceKey.value = ''
			}
			if (expandedService?.isSelected === false) return
		},
		{ immediate: true },
	)

	return {
		chooseDate,
		chooseService,
		daysInMonth,
		ensureServiceSelected,
		expandedServiceKey,
		featuredService,
		regularServices,
		removeService,
		resetServicesState,
		serviceData,
		services,
		servicesList,
		smsEmailNotification,
		notificationPriceLabel,
		syncSelectedServicesVisual,
		toggleServiceDetails,
		toggleServiceSelection,
	}
}
