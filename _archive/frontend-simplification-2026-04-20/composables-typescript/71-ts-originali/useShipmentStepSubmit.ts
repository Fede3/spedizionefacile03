import type { Ref } from 'vue'
import { buildSecondStepPayload } from '~/composables/useShipmentStepSessionPersistence'
import { SHIPMENT_FLOW_ROUTES } from '~/utils/shipmentFlowState'
import type { Address, PudoPoint } from '~/types'

interface RawAddressForm {
	type?: string
	full_name?: string
	additional_information?: string
	address?: string
	address_number?: string
	intercom_code?: string
	country?: string
	city?: string
	postal_code?: string
	province?: string
	telephone_number?: string
	email?: string
}

interface AddressPayload {
	type: string
	name: string
	additional_information: string
	address: string
	number_type: string
	address_number: string
	intercom_code: string
	country: string
	city: string
	postal_code: string
	province: string
	telephone_number: string
	email: string
}

interface RouteConsistencyState {
	blocking: boolean
	warning: boolean
	message: string
}

interface ServicesRef {
	value: {
		date?: string
		time?: string
		service_type?: string
	}
}

interface UserStoreLike {
	packages: Array<Record<string, unknown>>
	pickupDate?: string
	serviceData?: Record<string, unknown>
	servicesArray: string[]
	contentDescription?: string
	deliveryMode?: 'home' | 'pudo' | string
	selectedPudo?: PudoPoint | null
	pendingShipment?: unknown
	originAddressData?: Partial<Address> | null
	destinationAddressData?: Partial<Address> | null
	editingCartItemId?: number | string | null
	smsEmailNotification?: boolean
}

interface UiFeedback {
	success: (title: string, message: string, options?: { timeout?: number }) => void
}

interface SubmitArgs {
	destinationAddress: Ref<RawAddressForm>
	editablePackages: Ref<Array<Record<string, unknown>>>
	editCartId?: number | string | null
	focusFirstFormError: () => void
	focusPickupDateSection: () => void
	formRef: Ref<unknown>
	navigateToRiepilogo?: boolean
	normalizeLocationText: (value: string) => string
	originAddress: Ref<RawAddressForm>
	persistSecondStep?: (payload: unknown) => Promise<boolean | undefined> | boolean | undefined
	routeConsistencyState: Ref<RouteConsistencyState>
	smsEmailNotification: Ref<boolean>
	services: ServicesRef
	submitError: Ref<string | null>
	uiFeedback: UiFeedback
	shipmentFlowStore: UserStoreLike
	validateForm: () => Promise<boolean> | boolean
}

export const useShipmentStepSubmit = ({
	destinationAddress,
	editablePackages,
	editCartId,
	focusFirstFormError,
	focusPickupDateSection,
	formRef,
	navigateToRiepilogo = true,
	normalizeLocationText,
	originAddress,
	persistSecondStep,
	routeConsistencyState,
	smsEmailNotification,
	services,
	submitError,
	uiFeedback,
	shipmentFlowStore,
	validateForm,
}: SubmitArgs) => {
	const isSubmitting = ref(false)

	const normalizePostalCode = (addressData: RawAddressForm): string => {
		const country = String(addressData?.country || 'Italia')
			.trim()
			.toLowerCase()
		const rawPostalCode = String(addressData?.postal_code || '')
		if (country === 'italia') {
			return rawPostalCode.replace(/[^0-9]/g, '')
		}

		return (
			rawPostalCode
				.toUpperCase()
				.replace(/[^A-Z0-9-\s]/g, '')
				.trim()
		)
	}

	const toAddressPayload = (addressData: RawAddressForm): AddressPayload => ({
		type: addressData.type || 'Partenza',
		name: String(addressData?.full_name || '').trim(),
		additional_information: addressData.additional_information || '',
		address: String(addressData?.address || '').trim(),
		number_type: 'Numero Civico',
		address_number: String(addressData?.address_number || '').trim(),
		intercom_code: addressData.intercom_code || '',
		country: addressData.country || 'Italia',
		city: String(addressData?.city || '').trim(),
		postal_code: normalizePostalCode(addressData),
		province: String(addressData?.province || '').trim(),
		telephone_number: String(addressData?.telephone_number || '').trim(),
		email: addressData.email || '',
	})

	const continueToCart = async (): Promise<boolean> => {
		if (isSubmitting.value) return false
		isSubmitting.value = true
		submitError.value = null

		try {
			const formValidResult = await validateForm()
			if (!formValidResult) {
				nextTick(() => {
					if (services.value.date) {
						focusFirstFormError()
						return
					}
					focusPickupDateSection()
				})
				return false
			}

			if (!formRef.value) {
				focusFirstFormError()
				return false
			}

			const packages = editablePackages.value
			if (!packages.length) {
				submitError.value = 'Nessun collo disponibile. Torna al preventivo rapido.'
				return false
			}

			if (shipmentFlowStore.deliveryMode === 'pudo' && !shipmentFlowStore.selectedPudo) {
				submitError.value = 'Seleziona un Punto BRT per la consegna prima di procedere.'
				return false
			}

			if (shipmentFlowStore.deliveryMode === 'pudo' && shipmentFlowStore.selectedPudo) {
				const recipientNameNorm = normalizeLocationText(destinationAddress.value.full_name || '')
				const pudoNameNorm = normalizeLocationText(shipmentFlowStore.selectedPudo?.name || '')
				if (recipientNameNorm && pudoNameNorm && recipientNameNorm === pudoNameNorm) {
					submitError.value = 'Nel campo Nome e Cognome inserisci il destinatario (persona), non il nome del Punto BRT.'
					nextTick(() => {
						document.getElementById('dest_name')?.focus()
					})
					return false
				}
			}

			if (routeConsistencyState.value.blocking) {
				submitError.value = routeConsistencyState.value.message
				nextTick(() => {
					const focusId = shipmentFlowStore.deliveryMode === 'pudo' ? 'dest_name' : 'dest_address'
					document.getElementById(focusId)?.focus()
				})
				return false
			}

			const payload = {
				...buildSecondStepPayload({
					shipmentFlowStore,
					services,
					smsEmailNotification,
					originAddress: { value: toAddressPayload(originAddress.value) },
					destinationAddress: { value: toAddressPayload(destinationAddress.value) },
					includeAddresses: true,
				}),
				packages,
			}

			if (typeof persistSecondStep === 'function') {
				const persisted = await persistSecondStep(payload)
				if (persisted === false) {
					return false
				}
			}

			shipmentFlowStore.pendingShipment = payload
			shipmentFlowStore.originAddressData = { ...originAddress.value } as Partial<Address>
			shipmentFlowStore.destinationAddressData = { ...destinationAddress.value } as Partial<Address>
			shipmentFlowStore.pickupDate = services.value.date || ''
			shipmentFlowStore.smsEmailNotification = smsEmailNotification.value

			if (editCartId) {
				shipmentFlowStore.editingCartItemId = editCartId
			}

			// Toast "Dati salvati" SOLO se non stiamo passando al pagamento:
			// il flusso pagamento emette già "Ordine creato" subito dopo,
			// per evitare 2 toast sovrapposti.
			if (navigateToRiepilogo) {
				uiFeedback.success('Dati salvati', 'Apertura della conferma...', { timeout: 1800 })
			}

			if (navigateToRiepilogo) {
				await navigateTo(SHIPMENT_FLOW_ROUTES.summary, { replace: true })
			}
			return true
		} finally {
			isSubmitting.value = false
		}
	}

	return {
		continueToCart,
		isSubmitting,
	}
}
