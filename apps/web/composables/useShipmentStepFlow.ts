import type { Ref } from 'vue'
import { computed, nextTick, ref, watch } from 'vue'

type AccordionStep = 'packages' | 'services' | 'addresses' | 'payment'
type DestinationAddress = {
	full_name?: string
	address: string
	address_number: string
	city: string
	postal_code: string
	province: string
}
type SelectedPudo = {
	name?: string
	address?: string
	city?: string
	zip_code?: string
	province?: string
	[key: string]: unknown
}
type ShipmentSession = {
	data?: {
		content_description?: string
		pickup_date?: string
		services?: { date?: string }
		shipment_details?: {
			destination_city?: string
			destination_postal_code?: string
		}
	} | null
}
type ShipmentFlowStoreLike = {
	contentDescription: string
	selectedPudo: SelectedPudo | null
	shipmentDetails: Record<string, unknown>
}
type SmartValidation = {
	clearError: (fieldKey: string) => void
}
type StepFlowOptions = {
	contentError: Ref<string | null>
	dateError: Ref<string | null>
	deliveryMode: Ref<string>
	destinationAddress: Ref<DestinationAddress>
	focusContentDescriptionField: () => void
	focusPickupDateSection: () => void
	normalizeLocationText: (value: unknown) => string
	persistServicesStep?: () => Promise<boolean | undefined>
	session: Ref<ShipmentSession | null | undefined>
	services: Ref<{ date?: string }>
	shouldAutoShowAddressFields: boolean
	sv: SmartValidation
	shipmentFlowStore: ShipmentFlowStoreLike
}

const stepToQuery: Record<AccordionStep, string> = {
	packages: 'colli',
	services: 'servizi',
	addresses: 'indirizzi',
	payment: 'pagamento',
}
const validSteps = new Set<AccordionStep>(['packages', 'services', 'addresses', 'payment'])

const normalizeAccordionStep = (value: unknown, fallback: AccordionStep): AccordionStep => {
	const raw = String(Array.isArray(value) ? value[0] : value || '').trim().toLowerCase()
	if (raw === 'colli' || raw === 'packages') return 'packages'
	if (raw === 'servizi' || raw === 'services') return 'services'
	if (raw === 'indirizzi' || raw === 'ritiro' || raw === 'addresses') return 'addresses'
	if (raw === 'pagamento' || raw === 'payment') return 'payment'
	return fallback
}
const isAccordionStep = (value: unknown): value is AccordionStep =>
	typeof value === 'string' && validSteps.has(value as AccordionStep)

export const useShipmentStepFlow = ({
	contentError,
	dateError,
	deliveryMode,
	destinationAddress,
	focusContentDescriptionField,
	focusPickupDateSection,
	normalizeLocationText,
	persistServicesStep,
	session,
	services,
	shouldAutoShowAddressFields,
	sv,
	shipmentFlowStore,
}: StepFlowOptions) => {
	const router = useRouter()
	const route = useRoute()
	const initialFallback = shouldAutoShowAddressFields ? 'addresses' : 'packages'
	const activeAccordionStep = ref<AccordionStep>(normalizeAccordionStep(route.query.step, initialFallback))
	const showAddressFields = computed({
		get: () => activeAccordionStep.value === 'addresses',
		set: (value: boolean) => {
			activeAccordionStep.value = value ? 'addresses' : 'services'
		},
	})
	const addressReadinessItems = computed(() => {
		const hasContentDescription = Boolean(
			String(shipmentFlowStore.contentDescription || session.value?.data?.content_description || '').trim(),
		)
		const hasPickupDate = Boolean(services.value.date || session.value?.data?.pickup_date || session.value?.data?.services?.date)

		return [
			{ key: 'pickup-date', label: 'Giorno di ritiro', done: hasPickupDate },
			{ key: 'content-description', label: 'Contenuto del pacco', done: hasContentDescription },
		]
	})

	const syncStepInUrl = async (accordionStep: AccordionStep) => {
		const nextQuery = { ...route.query }
		const nextStepQuery = stepToQuery[accordionStep]
		nextQuery.step = nextStepQuery

		const currentStepQuery = Array.isArray(route.query.step) ? route.query.step[0] : route.query.step
		if ((currentStepQuery || '') === nextStepQuery) return

		await router.replace({ path: route.path, query: nextQuery, hash: route.hash })
	}
	const setActiveAccordionStep = async (stepKey: unknown) => {
		const normalizedStep = isAccordionStep(stepKey) ? stepKey : 'services'
		activeAccordionStep.value = normalizedStep
		await syncStepInUrl(normalizedStep)
		return true
	}
	const onPudoSelected = (pudo: SelectedPudo) => {
		shipmentFlowStore.selectedPudo = pudo
		destinationAddress.value.address = String(pudo.address || '')
		destinationAddress.value.address_number = 'SNC'
		destinationAddress.value.city = String(pudo.city || '')
		destinationAddress.value.postal_code = String(pudo.zip_code || '')
		destinationAddress.value.province = String(pudo.province || 'ND')

		const selectedPudoName = normalizeLocationText(pudo.name || '')
		const currentDestName = normalizeLocationText(destinationAddress.value.full_name || '')
		if (selectedPudoName && currentDestName && selectedPudoName === currentDestName) {
			destinationAddress.value.full_name = ''
		}

		shipmentFlowStore.shipmentDetails = {
			...shipmentFlowStore.shipmentDetails,
			destination_city: pudo.city || destinationAddress.value.city || '',
			destination_postal_code: pudo.zip_code || destinationAddress.value.postal_code || '',
		}
	}
	const onPudoDeselected = () => {
		shipmentFlowStore.selectedPudo = null
		destinationAddress.value.address = ''
		destinationAddress.value.address_number = ''
		destinationAddress.value.city = session.value?.data?.shipment_details?.destination_city || ''
		destinationAddress.value.postal_code = session.value?.data?.shipment_details?.destination_postal_code || ''
		destinationAddress.value.province = ''
	}

	watch(deliveryMode, (newMode) => {
		if (newMode === 'home') {
			shipmentFlowStore.selectedPudo = null
			return
		}

		;['dest_address', 'dest_address_number', 'dest_city', 'dest_province', 'dest_postal_code'].forEach((fieldKey) =>
			sv.clearError(fieldKey),
		)
	})

	const openAddressFields = async () => {
		if (!String(shipmentFlowStore.contentDescription || '').trim()) {
			contentError.value = 'Il contenuto del pacco \u00E8 obbligatorio'
			nextTick(focusContentDescriptionField)
			return
		}

		if (!services.value.date) {
			dateError.value = 'Seleziona un giorno di ritiro prima di procedere.'
			focusPickupDateSection()
			return
		}

		contentError.value = null
		dateError.value = null

		if (persistServicesStep) {
			const persisted = await persistServicesStep()
			if (persisted === false) return
		}

		await setActiveAccordionStep('addresses')
		return true
	}
	const goBackToServices = () => setActiveAccordionStep('services')
	const goBackToAddresses = () => setActiveAccordionStep('addresses')
	const openPackagesStage = () => setActiveAccordionStep('packages')
	const openPaymentStage = () => setActiveAccordionStep('payment')

	return {
		activeAccordionStep,
		addressReadinessItems,
		goBackToAddresses,
		goBackToServices,
		onPudoDeselected,
		onPudoSelected,
		openAddressFields,
		openPackagesStage,
		openPaymentStage,
		showAddressFields,
	}
}
