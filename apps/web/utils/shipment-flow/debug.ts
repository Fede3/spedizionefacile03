/**
 * @file debug — checkpoint runtime opt-in via localStorage.
 *
 * Helper puro usato da ShipmentFlowPage per loggare l'ordine di inizializzazione
 * dei composable (utile per diagnosticare regressioni di ordering). Attivo solo
 * quando `localStorage.sf_debug_shipment === '1'` lato client.
 */

export const createShipmentDebugCheckpoint = () => {
	return (label: string): void => {
		if (!import.meta.client) return;
		if (typeof localStorage === "undefined") return;
		if (localStorage.getItem("sf_debug_shipment") !== "1") return;
		// eslint-disable-next-line no-console -- debug runtime opt-in via localStorage
		console.info(`[shipment-step-debug] ${label}`);
	};
};
