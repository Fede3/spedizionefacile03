import { defineStore } from 'pinia'

type AdminGatePayload = {
	targetPath?: string
	lastValidRoute?: string
	reason?: string
}
type AdminGateChallenge = Required<AdminGatePayload> & {
	createdAt: number
}

export const useShipmentFlowAdminGateStore = defineStore('shipmentFlowAdminGate', () => {
	const challenge = ref<AdminGateChallenge | null>(null)

	function openGate(payload: AdminGatePayload = {}) {
		challenge.value = {
			targetPath: payload.targetPath || '/',
			lastValidRoute: payload.lastValidRoute || '/preventivo',
			reason: payload.reason || 'accesso fuori flusso',
			createdAt: Date.now(),
		}
	}
	function closeGate() {
		challenge.value = null
	}

	return { challenge, openGate, closeGate }
})
