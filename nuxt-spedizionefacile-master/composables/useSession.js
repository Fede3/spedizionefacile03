/**
 * FILE: composables/useSession.js
 * SCOPO: Composable per la sessione del preventivo (dati temporanei server-side).
 * API: GET /api/session (SessionController::show).
 * RESTITUISCE: session (dati sessione), refresh (ricarica dal server), status.
 * USATO DA: pages/la-tua-spedizione/[step].vue, pages/riepilogo.vue,
 *           middleware/shipment-validation.js.
 */
export const useSession = () => {
	const {
		data: session,
		status,
		refresh,
	} = useSanctumFetch(
		"/api/session",
		{
			method: "GET",
			key: "session",
			lazy: true,
			dedupe: "defer",
		},
	);

	return { session, refresh, status };
};
