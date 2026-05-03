import type { Ref } from 'vue'

type ShipmentSubStep = 'colli' | 'servizi' | 'indirizzi' | 'pagamento'
type ShipmentServicesState = {
	date?: string
	time?: string
	service_type?: string
	serviceData?: ShipmentServiceData
	sms_email_notification?: boolean
}
type ShipmentServiceData = Record<string, unknown> & {
	pickup_request?: {
		time_slot?: string | null
	} | null
}
type ShipmentSessionData = {
	shipment_details?: Record<string, unknown>
	packages?: Record<string, unknown>[]
	services?: ShipmentServicesState
	service_data?: ShipmentServiceData
	content_description?: string
	pickup_date?: string
	delivery_mode?: string
	selected_pudo?: unknown
	sms_email_notification?: boolean
}
type ShipmentSession = {
	data?: ShipmentSessionData | null
}
type ShipmentFlowStoreLike = {
	packages: Record<string, unknown>[]
	servicesArray: string[]
	contentDescription: string
	pickupDate: string
	serviceData: Record<string, unknown>
	deliveryMode: string
	selectedPudo: unknown | null
	pendingShipment?: unknown
	editingCartItemId?: string | number | null
}
type LoadCartItemContext = {
	originAddress: Ref<Record<string, unknown>>
	destinationAddress: Ref<Record<string, unknown>>
	services: Ref<ShipmentServicesState>
	showAddressFields: Ref<boolean>
}
type PageStateOptions = LoadCartItemContext & {
	editCartId: string | number | null | undefined
	ensurePackagesIdentity?: () => void
	isAuthenticated: Ref<boolean>
	loadCartItemForEdit: (context: LoadCartItemContext) => void
	loadingEditData: Ref<boolean>
	refresh: () => Promise<unknown>
	resetServicesState: () => void
	session: Ref<ShipmentSession | null | undefined>
	smsEmailNotification: Ref<boolean>
	status: Ref<string>
	shipmentFlowStore: ShipmentFlowStoreLike
}

const SUB_STEP_TO_NUMBER: Record<ShipmentSubStep, number> = {
	colli: 1,
	servizi: 2,
	indirizzi: 3,
	pagamento: 4,
}

const parsePersistedServices = (serviceType: unknown): string[] =>
	String(serviceType || '')
		.split(',')
		.map((service) => service.trim())
		.filter(Boolean)

const getRouteSubStep = (value: unknown): ShipmentSubStep | null => {
	const raw = String(Array.isArray(value) ? value[0] : value || '').trim().toLowerCase()
	return raw in SUB_STEP_TO_NUMBER ? raw as ShipmentSubStep : null
}

const getPickupTimeSlot = (...sources: Array<ShipmentServiceData | undefined>): string => {
	for (const source of sources) {
		const value = String(source?.pickup_request?.time_slot || '').trim()
		if (value) return value
	}
	return ''
}

export const useShipmentStepPageState = ({
	destinationAddress,
	editCartId,
	ensurePackagesIdentity,
	isAuthenticated,
	loadCartItemForEdit,
	loadingEditData,
	originAddress,
	refresh,
	resetServicesState,
	services,
	session,
	showAddressFields,
	smsEmailNotification,
	status,
	shipmentFlowStore,
}: PageStateOptions) => {
	const route = useRoute()
	const currentStep = computed(() => {
		const querySubStep = getRouteSubStep(route.query.step)
		return querySubStep ? SUB_STEP_TO_NUMBER[querySubStep] : Number(route.params.step) || 1
	})
	const quoteTransitionLock = useState('shipment-flow-quote-transition-lock', () => false)

	const hydratePersistedStepState = () => {
		const sessionData = session.value?.data
		if (!sessionData) return

		const persistedPackages = Array.isArray(sessionData.packages)
			? sessionData.packages.map((pack) => ({ ...pack }))
			: []
		if (!shipmentFlowStore.packages.length && persistedPackages.length) {
			shipmentFlowStore.packages = persistedPackages
			ensurePackagesIdentity?.()
		}

		const persistedServices = parsePersistedServices(sessionData.services?.service_type)
		if (!shipmentFlowStore.servicesArray.length && persistedServices.length) {
			shipmentFlowStore.servicesArray = [...persistedServices]
		}

		const persistedContent = String(sessionData.content_description || '').trim()
		if (!shipmentFlowStore.contentDescription.trim() && persistedContent) {
			shipmentFlowStore.contentDescription = persistedContent
		}

		const persistedPickupDate = String(sessionData.pickup_date || sessionData.services?.date || '').trim()
		if (!shipmentFlowStore.pickupDate.trim() && persistedPickupDate) {
			shipmentFlowStore.pickupDate = persistedPickupDate
		}
		if (!String(services.value.date || '').trim() && persistedPickupDate) {
			services.value.date = persistedPickupDate
		}

		const persistedServiceType = String(sessionData.services?.service_type || '').trim()
		if (!String(services.value.service_type || '').trim() && persistedServiceType) {
			services.value.service_type = persistedServiceType
		}

		const persistedPickupTime = String(sessionData.services?.time || getPickupTimeSlot(sessionData.service_data, sessionData.services?.serviceData)).trim()
		if (!String(services.value.time || '').trim() && persistedPickupTime) {
			services.value.time = persistedPickupTime
		}

		const persistedSmsNotification = Boolean(sessionData.sms_email_notification ?? sessionData.services?.sms_email_notification ?? false)
		if (!smsEmailNotification.value && persistedSmsNotification) {
			smsEmailNotification.value = true
		}

		const persistedServiceData = sessionData.service_data || sessionData.services?.serviceData || {}
		if (Object.keys(persistedServiceData).length && !Object.keys(shipmentFlowStore.serviceData).length) {
			shipmentFlowStore.serviceData = { ...persistedServiceData }
		}

		const persistedDeliveryMode = String(sessionData.delivery_mode || '').trim()
		if (persistedDeliveryMode && shipmentFlowStore.deliveryMode !== persistedDeliveryMode) {
			shipmentFlowStore.deliveryMode = persistedDeliveryMode
		}

		if (!shipmentFlowStore.selectedPudo && sessionData.selected_pudo) {
			shipmentFlowStore.selectedPudo = sessionData.selected_pudo
		}
	}

	const hasPersistedServiceSelection = computed(() => {
		const serviceType = String(session.value?.data?.services?.service_type || '').trim()
		const notificationsEnabled = Boolean(
			session.value?.data?.sms_email_notification ?? session.value?.data?.services?.sms_email_notification ?? false,
		)
		return Boolean(serviceType) || notificationsEnabled
	})
	const showInitialStepLoading = computed(() => loadingEditData.value)

	watch(
		() => [currentStep.value, status.value, shipmentFlowStore.editingCartItemId, hasPersistedServiceSelection.value] as const,
		([step, sessionStatus, editingCartItemId, persistedSelection]) => {
			if (step !== 2) return
			if (sessionStatus === 'pending') return
			if (editingCartItemId) return
			if (persistedSelection) return
			if (!shipmentFlowStore.servicesArray.length && !smsEmailNotification.value) return

			resetServicesState()
		},
		{ immediate: true },
	)

	watch(
		() => [currentStep.value, status.value, session.value?.data] as const,
		([step, sessionStatus]) => {
			if (step !== 2) return
			if (sessionStatus === 'pending') return
			hydratePersistedStepState()
		},
		{ immediate: true, deep: true },
	)

	const initOnMounted = () => {
		const data = session.value?.data
		const hasSessionSnapshot =
			Boolean(data?.shipment_details) ||
			(Array.isArray(data?.packages) && data.packages.length > 0)
		const hasLocalSnapshot = Boolean(shipmentFlowStore.pendingShipment) || shipmentFlowStore.packages.length > 0

		if (status.value === 'idle' && !quoteTransitionLock.value && !hasSessionSnapshot && !hasLocalSnapshot) {
			refresh().catch(() => {})
		}

		hydratePersistedStepState()

		if (editCartId && isAuthenticated.value) {
			loadCartItemForEdit({ originAddress, destinationAddress, services, showAddressFields })
		} else if (editCartId && !isAuthenticated.value) {
			loadingEditData.value = false
		}
	}

	return {
		currentStep,
		hasPersistedServiceSelection,
		initOnMounted,
		showInitialStepLoading,
	}
}
