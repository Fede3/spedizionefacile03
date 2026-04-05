/**
 * COMPOSABLE: useSession (useSession.js)
 * SCOPO: Gestisce la sessione del preventivo con dati temporanei salvati lato server.
 *
 * DOVE SI USA: components/Preventivo.vue (calcolo prezzo),
 *              pages/la-tua-spedizione/[step].vue (servizi, indirizzi),
 *              pages/riepilogo.vue (conferma dati)
 *
 * COSA RESTITUISCE:
 *   - session: ref reattivo con i dati della sessione (pacchi, prezzi, indirizzi, servizi)
 *   - refresh: funzione per ricaricare la sessione dal server
 *   - status: stato della richiesta ("idle", "pending", "success", "error")
 * ESEMPIO D'USO: const { session, refresh, status } = useSession()
 *
 * VINCOLI: la sessione viene popolata da POST /api/session/first-step (step 1)
 *          e POST /api/session/second-step (step 2). Senza questi, session e' vuoto.
 * ERRORI TIPICI: accedere a session.value.data senza controllare che session.value esista
 * COLLEGAMENTI: laravel-spedizionefacile-main/app/Http/Controllers/SessionController.php
 */
export const useSession = (options = {}) => {
	const enabled = options?.enabled ?? true;
	const server = options?.server ?? false;
	const key = options?.key ?? "session";
	const lazy = options?.lazy ?? false;
	const dedupe = options?.dedupe ?? "defer";

	if (import.meta.prerender) {
		const session = ref(null);
		const status = ref("idle");
		const refresh = async () => session.value;
		return { session, refresh, status };
	}

	if (!enabled) {
		const session = ref(null);
		const status = ref("idle");
		const refresh = async () => session.value;
		return { session, refresh, status };
	}

	const {
		data: session,
		status,
		refresh,
	} = useSanctumFetch(
		"/api/session",
		{
			method: "GET",
			key,
			// Default client-only: nel funnel pubblico evitiamo fetch SSR inutili.
			// Il middleware puo richiedere esplicitamente server:true quando deve
			// risolvere un redirect prima dell'hydration.
			server,
			lazy,
			dedupe,
		},
	);

	return { session, refresh, status };
};
