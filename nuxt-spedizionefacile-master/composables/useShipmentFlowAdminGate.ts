import type { Ref } from 'vue'

interface AdminGateChallenge {
	targetPath: string
	lastValidRoute: string
	reason: string
	createdAt: number
}

interface AdminGatePayload {
	targetPath?: string
	lastValidRoute?: string
	reason?: string
}

interface AdminGateApi {
	challenge: Ref<AdminGateChallenge | null>
	openGate: (payload?: AdminGatePayload) => void
	closeGate: () => void
}

export const useShipmentFlowAdminGate = (): AdminGateApi => {
	const challenge = useState<AdminGateChallenge | null>('shipment-flow-admin-gate', () => null)

	const openGate = (payload?: AdminGatePayload): void => {
		challenge.value = {
			targetPath: payload?.targetPath || '/',
			lastValidRoute: payload?.lastValidRoute || '/preventivo',
			reason: payload?.reason || 'accesso fuori flusso',
			createdAt: Date.now(),
		}
	}

	const closeGate = (): void => {
		challenge.value = null
	}

	return {
		challenge,
		openGate,
		closeGate,
	}
}
