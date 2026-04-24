// Alias legacy `summary` deve puntare al payment route: il vecchio step Conferma è stato unificato nel Pagamento, e i deep-link esistenti devono continuare a funzionare.
export const SHIPMENT_FLOW_ROUTES = {
	quote: '/preventivo',
	packages: '/la-tua-spedizione/2?step=colli',
	services: '/la-tua-spedizione/2',
	addresses: '/la-tua-spedizione/2?step=ritiro',
	summary: '/la-tua-spedizione/2?step=pagamento',
	payment: '/la-tua-spedizione/2?step=pagamento',
} as const

export type ShipmentFlowStage = 'quote' | 'packages' | 'services' | 'addresses' | 'summary' | 'payment'

export interface ShipmentFlowState {
	quote_ready: boolean
	services_ready: boolean
	addresses_ready: boolean
	summary_ready: boolean
	last_valid_route: string
}

export interface RouteLike {
	path?: string
	fullPath?: string
	query?: Record<string, string | string[] | undefined | null>
	hash?: string
}

interface AddressDraft {
	name?: string
	full_name?: string
	address?: string
	address_number?: string
	intercom_code?: string
	city?: string
	postal_code?: string
	province?: string
	country?: string
	additional_information?: string
	telephone_number?: string
	email?: string
	type?: string
}

interface PackageDraft {
	package_type?: string
	quantity?: number | string
	weight?: number | string
	first_size?: number | string
	second_size?: number | string
	third_size?: number | string
	[key: string]: unknown
}

export interface StepAddressState {
	full_name: string
	additional_information: string
	address: string
	address_number: string
	intercom_code: string
	country: string
	city: string
	postal_code: string
	province: string
	telephone_number: string
	email: string
	type: string
}

export interface ShipmentFlowDeriveInput {
	packages?: PackageDraft[]
	pickup_date?: string
	content_description?: string
	origin_address?: AddressDraft | null
	destination_address?: AddressDraft | null
	services?: {
		service_type?: string
		date?: string
		serviceData?: Record<string, unknown>
		sms_email_notification?: boolean
	}
	service_data?: Record<string, unknown>
	sms_email_notification?: boolean
	delivery_mode?: string
	selected_pudo?: unknown
	flow_state?: Partial<ShipmentFlowState>
	[key: string]: unknown
}

interface UserStoreLikeInput {
	shipmentDetails?: {
		origin_city?: string
		destination_city?: string
		date?: string
		[key: string]: unknown
	}
	packages?: PackageDraft[]
	pendingShipment?: {
		packages?: PackageDraft[]
		origin_address?: AddressDraft | null
		destination_address?: AddressDraft | null
		content_description?: string
		pickup_date?: string
		delivery_mode?: string
		pudo?: unknown
		services?: { date?: string, [key: string]: unknown }
		[key: string]: unknown
	} | null
	deliveryMode?: string
	selectedPudo?: unknown
	pickupDate?: string
	contentDescription?: string
	originAddressData?: AddressDraft | null
	destinationAddressData?: AddressDraft | null
	[key: string]: unknown
}

const getRouteQueryValue = (value: unknown): string | undefined => {
	if (Array.isArray(value)) return value[0] as string | undefined
	return value as string | undefined
}

const normalizeShipmentStep = (value: unknown, fallback = 'colli'): string => {
	const normalized = String(getRouteQueryValue(value) || '').trim()
	return normalized || fallback
}

export const buildShipmentFlowLocation = (routeLike: RouteLike = {}, step: string = 'colli') => ({
	path: '/la-tua-spedizione/2',
	query: {
		...(routeLike?.query || {}),
		step: normalizeShipmentStep(step),
	},
	hash: routeLike?.hash,
})

export const buildShipmentFlowEditLocation = (editId: number | string, step = 'pagamento') => ({
	path: '/la-tua-spedizione/2',
	query: {
		step: normalizeShipmentStep(step, 'pagamento'),
		edit: String(editId),
	},
})

const hasMeaningfulText = (value: unknown): boolean => String(value || '').trim().length > 0

const hasPositiveQueryId = (value: unknown): boolean => {
	const raw = Array.isArray(value) ? value[0] : value
	if (raw === undefined || raw === null || raw === '') return false
	const parsed = Number(raw)
	return Number.isFinite(parsed) ? parsed > 0 : hasMeaningfulText(raw)
}

const normalizeServiceTypeList = (serviceType: unknown): string[] => String(serviceType || '')
	.split(',')
	.map((value) => value.trim())
	.filter(Boolean)

const hasPackages = (packages: unknown): packages is PackageDraft[] => Array.isArray(packages) && packages.length > 0

const toPositiveNumber = (value: unknown): number => {
	const normalized = String(value ?? '')
		.replace(',', '.')
		.replace(/[^0-9.]/g, '')
	const parsed = Number(normalized)
	return Number.isFinite(parsed) ? parsed : 0
}

const hasCompletePackageDetails = (pack: PackageDraft = {}): boolean => (
	hasMeaningfulText(pack?.package_type)
	&& toPositiveNumber(pack?.quantity) >= 1
	&& toPositiveNumber(pack?.weight) > 0
	&& toPositiveNumber(pack?.first_size) > 0
	&& toPositiveNumber(pack?.second_size) > 0
	&& toPositiveNumber(pack?.third_size) > 0
)

const hasPackagesReady = (packages: unknown): boolean => hasPackages(packages) && packages.every((pack) => hasCompletePackageDetails(pack))

const hasAddressDraft = (address: AddressDraft | null | undefined = {}): boolean => {
	const a = address || {}
	return (
		hasMeaningfulText(a.name || a.full_name)
		&& hasMeaningfulText(a.address)
		&& hasMeaningfulText(a.city)
		&& hasMeaningfulText(a.postal_code)
	)
}

export const deriveShipmentFlowState = (data: ShipmentFlowDeriveInput = {}): ShipmentFlowState => {
	const quoteReady = hasPackagesReady(data?.packages)
	const pickupDate = data?.pickup_date || data?.services?.date || ''
	const contentDescription = data?.content_description || ''
	const servicesReady = quoteReady && hasMeaningfulText(contentDescription) && hasMeaningfulText(pickupDate)
	const addressesReady = servicesReady
		&& hasAddressDraft(data?.origin_address)
		&& hasAddressDraft(data?.destination_address)
	const summaryReady = addressesReady

	let lastValidRoute: string = SHIPMENT_FLOW_ROUTES.packages
	if (summaryReady) {
		lastValidRoute = SHIPMENT_FLOW_ROUTES.summary
	}
	else if (servicesReady) {
		lastValidRoute = SHIPMENT_FLOW_ROUTES.addresses
	}
	else if (quoteReady) {
		lastValidRoute = SHIPMENT_FLOW_ROUTES.services
	}

	return {
		quote_ready: quoteReady,
		services_ready: servicesReady,
		addresses_ready: addressesReady,
		summary_ready: summaryReady,
		last_valid_route: lastValidRoute,
	}
}

export const resolveShipmentFlowState = (data: ShipmentFlowDeriveInput = {}): ShipmentFlowState => {
	const raw = data?.flow_state
	const fallback = deriveShipmentFlowState(data)
	if (!raw || typeof raw !== 'object') return fallback

	return {
		quote_ready: Boolean(raw.quote_ready ?? fallback.quote_ready),
		services_ready: Boolean(raw.services_ready ?? fallback.services_ready),
		addresses_ready: Boolean(raw.addresses_ready ?? fallback.addresses_ready),
		summary_ready: Boolean(raw.summary_ready ?? fallback.summary_ready),
		last_valid_route: hasMeaningfulText(raw.last_valid_route)
			? String(raw.last_valid_route)
			: fallback.last_valid_route,
	}
}

const getFlowStateRank = (flowState: Partial<ShipmentFlowState> = {}): number => {
	if (flowState?.summary_ready) return 4
	if (flowState?.addresses_ready) return 3
	if (flowState?.services_ready) return 2
	if (flowState?.quote_ready) return 1
	return 0
}

export const pickMostAdvancedShipmentFlowState = (...states: Array<Partial<ShipmentFlowState> | null | undefined>): ShipmentFlowState => states
	.filter((state): state is Partial<ShipmentFlowState> => !!state && typeof state === 'object')
	.reduce<Partial<ShipmentFlowState> | null>((best, candidate) => {
		if (!best) return candidate
		return getFlowStateRank(candidate) > getFlowStateRank(best) ? candidate : best
	}, null) as ShipmentFlowState || deriveShipmentFlowState({})

export const getShipmentFlowStage = (routeLike: RouteLike): ShipmentFlowStage | null => {
	const path = String(routeLike?.path || routeLike?.fullPath || '')
	const query = routeLike?.query || {}
	const stepQuery = getRouteQueryValue(query.step)

	if (path === SHIPMENT_FLOW_ROUTES.quote || path === '/' || path === '/#preventivo') return 'quote'
	if (path.startsWith('/la-tua-spedizione')) {
		if (stepQuery === 'colli') return 'packages'
		// Alias storico: step=conferma e' stato unificato nel payment step.
		if (stepQuery === 'pagamento' || stepQuery === 'conferma') return 'payment'
		return stepQuery === 'ritiro' ? 'addresses' : 'services'
	}
	// Trampolini legacy: /riepilogo reindirizza a pagamento via riepilogo.vue.
	if (path.startsWith('/riepilogo')) return 'payment'
	if (path.startsWith('/checkout')) return 'payment'
	return null
}

export const isShipmentFlowResumeException = (routeLike: RouteLike): boolean => {
	const path = String(routeLike?.path || routeLike?.fullPath || '')
	const query = routeLike?.query || {}

	if (path.startsWith('/la-tua-spedizione') && hasPositiveQueryId(query.edit)) return true
	return false
}

export const canAccessShipmentFlowRoute = (routeLike: RouteLike, flowState: Partial<ShipmentFlowState> | null | undefined): boolean => {
	if (isShipmentFlowResumeException(routeLike)) return true

	const stage = getShipmentFlowStage(routeLike)
	if (!stage || stage === 'quote' || stage === 'packages') return true
	if (stage === 'services') return Boolean(flowState?.quote_ready)
	if (stage === 'addresses') return Boolean(flowState?.services_ready)
	// stage === 'summary' e' un alias storico di 'payment' (unificati in Sprint 2.1).
	if (stage === 'summary' || stage === 'payment') return Boolean(flowState?.addresses_ready)
	return true
}

export const getShipmentFlowStepNumber = (flowState: Partial<ShipmentFlowState> | null | undefined): 1 | 2 | 3 | 4 => {
	if (flowState?.summary_ready) return 4
	if (flowState?.services_ready) return 3
	if (flowState?.quote_ready) return 2
	return 1
}

export const extractShipmentServicesArray = (data: ShipmentFlowDeriveInput = {}): string[] => normalizeServiceTypeList(data?.services?.service_type || '')

export const toStepAddressState = (address: AddressDraft | null = null): StepAddressState | null => {
	if (!address || typeof address !== 'object') return null

	return {
		full_name: address.name || '',
		additional_information: address.additional_information || '',
		address: address.address || '',
		address_number: address.address_number || '',
		intercom_code: address.intercom_code || '',
		country: address.country || 'Italia',
		city: address.city || '',
		postal_code: address.postal_code || '',
		province: address.province || '',
		telephone_number: address.telephone_number || '',
		email: address.email || '',
		type: address.type || '',
	}
}

export interface BuiltPendingShipment {
	origin_address: AddressDraft
	destination_address: AddressDraft
	services: {
		service_type?: string
		date?: string
		serviceData: Record<string, unknown>
		sms_email_notification: boolean
		[key: string]: unknown
	}
	packages: PackageDraft[]
	content_description: string
	delivery_mode: string
	pudo: unknown
	sms_email_notification: boolean
}

export const buildPendingShipmentFromSession = (data: ShipmentFlowDeriveInput = {}): BuiltPendingShipment | null => {
	const flowState = resolveShipmentFlowState(data)
	if (!flowState.summary_ready) return null
	if (!hasPackages(data?.packages)) return null
	if (!data?.origin_address || !data?.destination_address) return null

	return {
		origin_address: data.origin_address,
		destination_address: data.destination_address,
		services: {
			...(data.services || {}),
			serviceData: {
				...((data.service_data || data?.services?.serviceData || {}) as Record<string, unknown>),
				sms_email_notification: Boolean(
					data?.sms_email_notification
					?? data?.services?.sms_email_notification
					?? (data?.service_data as { sms_email_notification?: boolean } | undefined)?.sms_email_notification,
				),
			},
			sms_email_notification: Boolean(
				data?.sms_email_notification
				?? data?.services?.sms_email_notification
				?? (data?.service_data as { sms_email_notification?: boolean } | undefined)?.sms_email_notification,
			),
		},
		packages: Array.isArray(data.packages) ? [...data.packages] : [],
		content_description: data.content_description || '',
		delivery_mode: data.delivery_mode || 'home',
		pudo: data.selected_pudo || null,
		sms_email_notification: Boolean(
			data?.sms_email_notification
			?? data?.services?.sms_email_notification
			?? (data?.service_data as { sms_email_notification?: boolean } | undefined)?.sms_email_notification,
		),
	}
}

export const deriveShipmentFlowStateFromUserStore = (shipmentFlowStore: UserStoreLikeInput = {}): ShipmentFlowState => {
	const shipmentDetails = shipmentFlowStore?.shipmentDetails || {}
	const packages = Array.isArray(shipmentFlowStore?.packages) ? shipmentFlowStore.packages : []
	const pendingShipment = shipmentFlowStore?.pendingShipment || {}
	const pendingPackages = Array.isArray(pendingShipment?.packages) ? pendingShipment.packages : []
	const deliveryMode = shipmentFlowStore?.deliveryMode || pendingShipment?.delivery_mode || 'home'
	const selectedPudo = shipmentFlowStore?.selectedPudo || pendingShipment?.pudo || null

	const quoteReady = hasPackagesReady(packages)
	const pickupDate = shipmentFlowStore?.pickupDate || shipmentDetails?.date || (pendingShipment as { pickup_date?: string })?.pickup_date || ''
	const contentDescription = shipmentFlowStore?.contentDescription || pendingShipment?.content_description || ''
	const servicesReady = quoteReady && hasMeaningfulText(contentDescription) && hasMeaningfulText(pickupDate)

	const originAddress = shipmentFlowStore?.originAddressData || pendingShipment?.origin_address || null
	const destinationAddress = shipmentFlowStore?.destinationAddressData || pendingShipment?.destination_address || null
	const hasDestinationReady = deliveryMode === 'pudo'
		? Boolean(selectedPudo) || hasAddressDraft(destinationAddress)
		: hasAddressDraft(destinationAddress)
	const addressesReady = servicesReady
		&& hasAddressDraft(originAddress)
		&& hasDestinationReady
	const pendingServicesReady = hasMeaningfulText(pendingShipment?.content_description || '')
		&& hasMeaningfulText((pendingShipment as { pickup_date?: string })?.pickup_date || pendingShipment?.services?.date || '')
	const pendingDestinationReady = deliveryMode === 'pudo'
		? Boolean(selectedPudo) || hasAddressDraft(pendingShipment?.destination_address || null)
		: hasAddressDraft(pendingShipment?.destination_address || null)
	const pendingSummaryReady = hasPackagesReady(pendingPackages)
		&& pendingServicesReady
		&& hasAddressDraft(pendingShipment?.origin_address || null)
		&& pendingDestinationReady
	const summaryReady = addressesReady || pendingSummaryReady

	let lastValidRoute: string = SHIPMENT_FLOW_ROUTES.packages
	if (summaryReady) {
		lastValidRoute = SHIPMENT_FLOW_ROUTES.summary
	}
	else if (servicesReady) {
		lastValidRoute = SHIPMENT_FLOW_ROUTES.addresses
	}
	else if (quoteReady) {
		lastValidRoute = SHIPMENT_FLOW_ROUTES.services
	}

	return {
		quote_ready: quoteReady,
		services_ready: servicesReady,
		addresses_ready: addressesReady,
		summary_ready: summaryReady,
		last_valid_route: lastValidRoute,
	}
}

interface TrimmableUserStore {
	pendingShipment?: unknown
	originAddressData?: unknown
	destinationAddressData?: unknown
	selectedPudo?: unknown
	servicesArray?: unknown
	contentDescription?: unknown
	pickupDate?: unknown
	smsEmailNotification?: unknown
	serviceData?: unknown
	packages?: unknown
	totalPrice?: unknown
	isQuoteStarted?: unknown
	stepNumber?: unknown
}

export const trimUserStoreToFlowState = (shipmentFlowStore: TrimmableUserStore | null | undefined, flowState: Partial<ShipmentFlowState> | null | undefined): void => {
	if (!shipmentFlowStore || !flowState) return

	if (!flowState.summary_ready) {
		shipmentFlowStore.pendingShipment = null
	}

	if (!flowState.addresses_ready) {
		shipmentFlowStore.originAddressData = null
		shipmentFlowStore.destinationAddressData = null
		shipmentFlowStore.selectedPudo = null
	}

	if (!flowState.services_ready) {
		shipmentFlowStore.servicesArray = []
		shipmentFlowStore.contentDescription = ''
		shipmentFlowStore.pickupDate = ''
		shipmentFlowStore.smsEmailNotification = false
		shipmentFlowStore.serviceData = {}
	}

	if (!flowState.quote_ready) {
		shipmentFlowStore.packages = []
		shipmentFlowStore.totalPrice = 0
		shipmentFlowStore.isQuoteStarted = false
	}

	shipmentFlowStore.stepNumber = getShipmentFlowStepNumber(flowState)
}
