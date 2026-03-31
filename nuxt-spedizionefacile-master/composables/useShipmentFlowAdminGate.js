export const useShipmentFlowAdminGate = () => {
	const challenge = useState('shipment-flow-admin-gate', () => null);

	const openGate = (payload) => {
		challenge.value = {
			targetPath: payload?.targetPath || '/',
			lastValidRoute: payload?.lastValidRoute || '/preventivo',
			reason: payload?.reason || 'accesso fuori flusso',
			createdAt: Date.now(),
		};
	};

	const closeGate = () => {
		challenge.value = null;
	};

	return {
		challenge,
		openGate,
		closeGate,
	};
};
