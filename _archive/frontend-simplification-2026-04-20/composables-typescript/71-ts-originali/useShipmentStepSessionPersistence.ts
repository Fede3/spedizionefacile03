import type { Ref } from 'vue'
import type { Address, PendingShipment, PudoPoint } from '~/types'

interface RawAddressInput {
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

interface StepAddressPayload {
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

interface PickupRequestPayload {
	enabled: boolean
	date: string
	time_slot: string
	notes: string
}

interface ServicesRef {
	value: {
		date?: string
		time?: string
		service_type?: string
		serviceData?: Record<string, unknown>
		sms_email_notification?: boolean
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
}

interface SecondStepPayload {
	services: {
		service_type: string
		date: string
		time: string
		serviceData: Record<string, unknown>
		sms_email_notification: boolean
	}
	content_description: string
	pickup_date: string
	sms_email_notification: boolean
	packages: Array<Record<string, unknown>>
	origin_address: StepAddressPayload | null
	destination_address: StepAddressPayload | null
	delivery_mode: string | undefined
	selected_pudo: PudoPoint | null | undefined
}

interface BuildSecondStepArgs {
	shipmentFlowStore: UserStoreLike
	services: ServicesRef
	smsEmailNotification: Ref<boolean>
	originAddress?: { value: Partial<Address> | RawAddressInput | StepAddressPayload }
	destinationAddress?: { value: Partial<Address> | RawAddressInput | StepAddressPayload }
	includeAddresses?: boolean
	payload?: SecondStepPayload | null
}

export const normalizePostalCodeForStep = (addressData: RawAddressInput = {}): string => {
	const country = String(addressData?.country || 'Italia')
		.trim()
		.toLowerCase()
	const rawPostalCode = String(addressData?.postal_code || '')

	if (country === 'italia') {
		return rawPostalCode.replace(/[^0-9]/g, '') || '00000'
	}

	return (
		rawPostalCode
			.toUpperCase()
			.replace(/[^A-Z0-9-\s]/g, '')
			.trim() || 'N/D'
	)
}

export const toStepAddressPayload = (addressData: RawAddressInput = {}): StepAddressPayload => ({
	type: addressData.type || 'Partenza',
	name: (addressData.full_name || 'N/D').trim(),
	additional_information: addressData.additional_information || '',
	address: (addressData.address || 'N/D').trim(),
	number_type: 'Numero Civico',
	address_number: (addressData.address_number || 'SNC').trim(),
	intercom_code: addressData.intercom_code || '',
	country: addressData.country || 'Italia',
	city: (addressData.city || 'N/D').trim(),
	postal_code: normalizePostalCodeForStep(addressData),
	province: (addressData.province || 'N/D').trim(),
	telephone_number: String(addressData.telephone_number || '0000000000').trim(),
	email: addressData.email || '',
})

export const DEFAULT_PICKUP_TIME_SLOT = '09:00-18:00'

export const normalizePickupRequestDate = (value: string = ''): string => {
	const rawValue = String(value || '').trim()
	if (!rawValue) return ''

	if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
		return rawValue
	}

	const localMatch = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
	if (localMatch) {
		const day = localMatch[1] ?? ''
		const month = localMatch[2] ?? ''
		const year = localMatch[3] ?? ''
		return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
	}

	const parsed = new Date(rawValue)
	if (!Number.isNaN(parsed.getTime())) {
		return parsed.toISOString().slice(0, 10)
	}

	return rawValue
}

export const buildPickupRequestPayload = (
	{ shipmentFlowStore, services }: { shipmentFlowStore?: UserStoreLike; services?: ServicesRef } = {},
): PickupRequestPayload => {
	const pickupRequestStored = (shipmentFlowStore?.serviceData?.pickup_request as PickupRequestPayload | undefined) || undefined
	const rawPickupDate = String(
		services?.value?.date || shipmentFlowStore?.pickupDate || pickupRequestStored?.date || '',
	).trim()

	const normalizedPickupDate = normalizePickupRequestDate(rawPickupDate)
	const pickupTimeSlot =
		String(services?.value?.time || pickupRequestStored?.time_slot || DEFAULT_PICKUP_TIME_SLOT).trim() ||
		DEFAULT_PICKUP_TIME_SLOT

	return {
		enabled: Boolean(normalizedPickupDate),
		date: normalizedPickupDate,
		time_slot: pickupTimeSlot,
		notes: String(pickupRequestStored?.notes || '').trim(),
	}
}

export const buildSecondStepPayload = (
	{
		shipmentFlowStore,
		services,
		smsEmailNotification,
		originAddress,
		destinationAddress,
		includeAddresses = false,
		payload = null,
	}: BuildSecondStepArgs,
): SecondStepPayload => {
	if (payload) return payload

	// Filtra i pacchi con campi chiave vuoti/mancanti prima di inviarli al backend.
	// La validazione server (required_with:packages) scatterebbe su weight/first_size/
	// second_size/third_size anche per un singolo record incompleto, bloccando l'intero
	// submit con errori criptici ("packages.0.weight field is required... and 3 more").
	const isPackageComplete = (pack: Record<string, unknown>): boolean => {
		const hasValue = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== ''
		return Boolean(
			hasValue(pack.package_type)
			&& hasValue(pack.quantity)
			&& hasValue(pack.weight)
			&& hasValue(pack.first_size)
			&& hasValue(pack.second_size)
			&& hasValue(pack.third_size),
		)
	}

	const persistedPackages = Array.isArray(shipmentFlowStore?.packages)
		? shipmentFlowStore.packages
			.map((pack) => ({ ...pack }))
			.filter((pack) => isPackageComplete(pack as Record<string, unknown>))
		: []

	const pickupRequest = buildPickupRequestPayload({
		shipmentFlowStore,
		services,
	})

	return {
		services: {
			service_type: shipmentFlowStore.servicesArray.join(', '),
			date: services.value.date || '',
			time: pickupRequest.time_slot,
			serviceData: {
				...(shipmentFlowStore.serviceData || {}),
				pickup_request: pickupRequest,
				sms_email_notification: Boolean(smsEmailNotification.value),
			},
			sms_email_notification: Boolean(smsEmailNotification.value),
		},
		content_description: shipmentFlowStore.contentDescription || '',
		pickup_date: services.value.date || '',
		sms_email_notification: Boolean(smsEmailNotification.value),
		packages: persistedPackages,
		origin_address: includeAddresses && originAddress
			? toStepAddressPayload(originAddress.value as RawAddressInput)
			: null,
		destination_address: includeAddresses && destinationAddress
			? toStepAddressPayload(destinationAddress.value as RawAddressInput)
			: null,
		delivery_mode: shipmentFlowStore.deliveryMode,
		selected_pudo: shipmentFlowStore.deliveryMode === 'pudo' ? shipmentFlowStore.selectedPudo : null,
	}
}

interface PersistenceArgs {
	sanctumClient: (url: string, options?: Record<string, unknown>) => Promise<unknown>
	refresh: () => Promise<unknown>
	session: Ref<unknown>
	submitError: Ref<string | null>
	shipmentFlowStore: UserStoreLike
	services: ServicesRef
	smsEmailNotification: Ref<boolean>
	originAddress: { value: Partial<Address> | RawAddressInput }
	destinationAddress: { value: Partial<Address> | RawAddressInput }
}

interface PersistCallOptions {
	includeAddresses?: boolean
	payload?: SecondStepPayload | null
}

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
}: PersistenceArgs) => {
	const persistShipmentFlowState = async (
		{ includeAddresses = false, payload = null }: PersistCallOptions = {},
	): Promise<boolean> => {
		// Prima di costruire il payload, se shipmentFlowStore.packages è incompleto ma
		// la session backend ha pacchi validi, idrata shipmentFlowStore dai pacchi session.
		// Fix bug "Devi aggiungere almeno 1 collo": il form preventivo homepage
		// salva i pacchi in una rappresentazione senza weight/first_size, e il
		// sync via syncQuoteStateFromSession non sempre li propaga.
		try {
			const sessionData = (session.value as { data?: Record<string, unknown> } | null)?.data
			const sessionPackages = Array.isArray(sessionData?.packages) ? sessionData.packages : []
			const localPackages = Array.isArray(shipmentFlowStore.packages) ? shipmentFlowStore.packages : []
			const isPackageComplete = (pack: Record<string, unknown>): boolean => {
				const hasValue = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== ''
				return Boolean(
					hasValue(pack?.package_type) &&
					hasValue(pack?.weight) &&
					hasValue(pack?.first_size) &&
					hasValue(pack?.second_size) &&
					hasValue(pack?.third_size),
				)
			}
			const localValid = localPackages.some((p) => isPackageComplete(p as Record<string, unknown>))
			const sessionHasValid = sessionPackages.some((p) => isPackageComplete(p as Record<string, unknown>))
			if (!localValid && sessionHasValid) {
				const merged = sessionPackages.map((pack: Record<string, unknown>) => ({ ...pack }))
				shipmentFlowStore.packages.splice(0, shipmentFlowStore.packages.length, ...merged)
			}
		} catch {}

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
			const err = error as { data?: { message?: string } } | undefined
			submitError.value = err?.data?.message || 'Errore nel salvataggio del flusso spedizione. Riprova.'
			return false
		}
	}

	return {
		persistShipmentFlowState,
	}
}
