/**
 * COMPOSABLE: useApiError (useApiError.ts)
 * SCOPO: Trasforma gli errori HTTP in messaggi user-friendly in italiano.
 *
 * DOVE SI USA: checkout.vue, riepilogo.vue, carrello.vue, Preventivo.vue, ecc.
 * ESEMPIO: const { getErrorMessage } = useApiError();
 *          catch (err) { toast.add({ title: getErrorMessage(err) }) }
 */

interface ApiErrorData {
	message?: string
	errors?: Record<string, string[]>
	status?: number
}

interface ApiError {
	message?: string
	name?: string
	status?: number
	statusCode?: number
	data?: ApiErrorData
	response?: {
		status?: number
		_data?: ApiErrorData
	}
}

export const useApiError = () => {
	const statusMessages: Record<number, string | null> = {
		401: 'Sessione scaduta. Effettua nuovamente il login.',
		403: 'Non hai i permessi per eseguire questa azione.',
		404: 'La risorsa richiesta non esiste.',
		409: 'Conflitto: l\'operazione non può essere completata.',
		422: null, // gestito separatamente con messaggi di validazione
		429: 'Troppi tentativi. Attendi qualche secondo e riprova.',
		500: 'Errore del server. Riprova tra qualche istante.',
		502: 'Servizio temporaneamente non disponibile. Riprova.',
		503: 'Servizio in manutenzione. Riprova tra qualche minuto.',
	};

	/**
	 * Estrae un messaggio leggibile da un errore API.
	 */
	const getErrorMessage = (error: ApiError | Error | null | undefined): string => {
		if (!error) return 'Si è verificato un errore. Riprova.';

		// Errore di rete (nessuna risposta dal server)
		if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
			return 'Errore di connessione. Verifica la tua rete e riprova.';
		}

		const apiErr = error as ApiError;
		const status = apiErr?.status || apiErr?.statusCode || apiErr?.response?.status || apiErr?.data?.status;
		const data: ApiErrorData = apiErr?.data || apiErr?.response?._data || {};

		// Errori di validazione (422): mostra il primo messaggio dal backend
		if (status === 422) {
			const errors = data.errors || {};
			const firstKey = Object.keys(errors)[0];
			if (firstKey && Array.isArray(errors[firstKey]) && errors[firstKey][0]) {
				return errors[firstKey][0];
			}
			return data.message || 'Dati non validi. Controlla i campi e riprova.';
		}

		// Messaggio esplicito dal backend
		if (data.message) return data.message;

		// Mappa status code
		if (status && statusMessages[status]) {
			return statusMessages[status]!;
		}

		return 'Si è verificato un errore. Riprova.';
	};

	return { getErrorMessage };
};
