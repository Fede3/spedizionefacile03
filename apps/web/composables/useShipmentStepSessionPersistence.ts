import { buildSecondStepPayload } from '~/utils/shipmentDraftPayload'

type ValueRef<T> = { value: T }
type BuildSecondStepArgs = NonNullable<Parameters<typeof buildSecondStepPayload>[0]>
type PersistenceOptions = BuildSecondStepArgs & {
	sanctumClient: (url: string, options?: Record<string, unknown>) => Promise<unknown>
	refresh: () => Promise<unknown>
	session: ValueRef<unknown>
	submitError: ValueRef<string | null>
}
type PersistOptions = {
	includeAddresses?: boolean
	payload?: unknown
}

const getErrorMessage = (error: unknown): string => {
	if (!error || typeof error !== 'object') return ''
	const source = error as { data?: { message?: string }; message?: string }
	return source.data?.message || source.message || ''
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
}: PersistenceOptions) => {
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
			submitError.value = getErrorMessage(error) || 'Errore nel salvataggio del flusso spedizione. Riprova.'
			return false
		}
	}

	return { persistShipmentFlowState }
}
