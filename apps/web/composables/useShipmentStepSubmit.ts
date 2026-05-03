import type { Ref } from 'vue'
import { buildSecondStepPayload, toStepAddressPayload } from '~/utils/shipmentDraftPayload'

// Tipi per la sezione persistShipmentFlowState (ex useShipmentStepSessionPersistence)
type ValueRef<T> = { value: T }
type BuildSecondStepArgs = NonNullable<Parameters<typeof buildSecondStepPayload>[0]>
type PersistOptions = {
	includeAddresses?: boolean
	payload?: unknown
}
type ShipmentStepPersistenceOptions = BuildSecondStepArgs & {
	sanctumClient: (url: string, options?: Record<string, unknown>) => Promise<unknown>
	refresh: () => Promise<unknown>
	session: ValueRef<unknown>
	submitError: ValueRef<string | null>
}

const getApiErrorMessage = (error: unknown): string => {
	if (!error || typeof error !== 'object') return ''
	const source = error as { data?: { message?: string }; message?: string }
	return source.data?.message || source.message || ''
}

/**
 * useShipmentStepSessionPersistence — persistenza intermedia step funnel (ex composable separato).
 *
 * Salva lo stato corrente del flow in /api/session/second-step e refreshes la session.
 */
export const useShipmentStepSessionPersistence = ({
	sanctumClient,
	refresh,
	session,
	submitError,
	shipmentFlowStore,
	services,
	smsEmailNotification,
	originAddress,
	destinationAddress,
}: ShipmentStepPersistenceOptions) => {
	const persistShipmentFlowState = async ({ includeAddresses = false, payload = null }: PersistOptions = {}) => {
		try {
			await sanctumClient('/api/session/second-step', {
				method: 'POST',
				body: buildSecondStepPayload({
					shipmentFlowStore,
					services,
					smsEmailNotification,
					originAddress,
					destinationAddress,
					includeAddresses,
					payload,
				}),
			})
			await refresh().catch(() => session.value)
			return true
		} catch (error) {
			submitError.value = getApiErrorMessage(error) || 'Errore nel salvataggio del flusso spedizione. Riprova.'
			return false
		}
	}

	return { persistShipmentFlowState }
}

type StepAddress = {
	full_name?: string
	address?: string
	address_number?: string
	city?: string
	postal_code?: string
	province?: string
	[key: string]: unknown
}
type ShipmentPackage = Record<string, unknown>
type SelectedPudo = {
	name?: string
	[key: string]: unknown
}
type ShipmentFlowStoreLike = {
	deliveryMode: string
	selectedPudo: SelectedPudo | null
	servicesArray?: string[]
	serviceData?: Record<string, unknown>
	contentDescription?: string
	pendingShipment: { client_submission_id?: string } | Record<string, unknown> | null
	originAddressData: StepAddress | null
	destinationAddressData: StepAddress | null
	pickupDate: string
	smsEmailNotification: boolean
	editingCartItemId?: string | number | null
	[key: string]: unknown
}
type RouteConsistencyState = {
	blocking: boolean
	message: string
}
type UiFeedback = {
	success: (title: string, message?: string, options?: { timeout?: number }) => void
}
type ShipmentStepSubmitOptions = {
	destinationAddress: Ref<StepAddress>
	editablePackages: Ref<ShipmentPackage[]>
	editCartId?: string | number | null
	focusFirstFormError: () => void
	focusPickupDateSection: () => void
	formRef: Ref<HTMLFormElement | null>
	navigateToRiepilogo?: boolean
	normalizeLocationText: (value: unknown) => string
	originAddress: Ref<StepAddress>
	persistSecondStep?: (payload: Record<string, unknown>) => Promise<boolean | undefined>
	routeConsistencyState: Ref<RouteConsistencyState>
	smsEmailNotification: Ref<boolean>
	services: Ref<{ date?: string }>
	submitError: Ref<string | null>
	uiFeedback: UiFeedback
	shipmentFlowStore: ShipmentFlowStoreLike
	validateForm: () => Promise<boolean>
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
}: ShipmentStepSubmitOptions) => {
	const isSubmitting = ref(false)

	const continueToCart = async () => {
		if (isSubmitting.value) return
		isSubmitting.value = true
		submitError.value = null

		try {
			if (!(await validateForm())) {
				nextTick(() => {
					if (services.value.date) focusFirstFormError()
					else focusPickupDateSection()
				})
				return
			}

			if (!formRef.value || !formRef.value.checkValidity()) {
				formRef.value?.reportValidity()
				return
			}

			const packages = editablePackages.value
			if (!packages.length) {
				submitError.value = 'Nessun collo disponibile. Torna al preventivo rapido.'
				return
			}

			if (shipmentFlowStore.deliveryMode === 'pudo' && !shipmentFlowStore.selectedPudo) {
				submitError.value = 'Seleziona un Punto BRT per la consegna prima di procedere.'
				return
			}

			if (shipmentFlowStore.deliveryMode === 'pudo' && shipmentFlowStore.selectedPudo) {
				const recipientNameNorm = normalizeLocationText(destinationAddress.value.full_name || '')
				const pudoNameNorm = normalizeLocationText(shipmentFlowStore.selectedPudo.name || '')
				if (recipientNameNorm && pudoNameNorm && recipientNameNorm === pudoNameNorm) {
					submitError.value = 'Nel campo Nome e Cognome inserisci il destinatario (persona), non il nome del Punto BRT.'
					nextTick(() => document.getElementById('dest_name')?.focus())
					return
				}
			}

			if (routeConsistencyState.value.blocking) {
				submitError.value = routeConsistencyState.value.message
				nextTick(() => {
					const focusId = shipmentFlowStore.deliveryMode === 'pudo' ? 'dest_name' : 'dest_address'
					document.getElementById(focusId)?.focus()
				})
				return
			}

			const payload = {
				...(buildSecondStepPayload({
					shipmentFlowStore: shipmentFlowStore as BuildSecondStepArgs['shipmentFlowStore'],
					services,
					smsEmailNotification,
					originAddress: { value: toStepAddressPayload(originAddress.value) },
					destinationAddress: { value: toStepAddressPayload(destinationAddress.value) },
					includeAddresses: true,
				}) as Record<string, unknown>),
				packages,
			}

			if (persistSecondStep) {
				const persisted = await persistSecondStep(payload)
				if (persisted === false) return
			}

			shipmentFlowStore.pendingShipment = payload
			shipmentFlowStore.originAddressData = { ...originAddress.value }
			shipmentFlowStore.destinationAddressData = { ...destinationAddress.value }
			shipmentFlowStore.pickupDate = services.value.date || ''
			shipmentFlowStore.smsEmailNotification = smsEmailNotification.value

			if (editCartId) {
				shipmentFlowStore.editingCartItemId = editCartId
			}

			uiFeedback.success('Dati salvati', 'Apertura del riepilogo...', { timeout: 1800 })

			if (navigateToRiepilogo) {
				await navigateTo('/riepilogo', { replace: true })
			}
		} finally {
			isSubmitting.value = false
		}
	}

	return {
		continueToCart,
		isSubmitting,
	}
}
