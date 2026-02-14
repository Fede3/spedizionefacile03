/**
 * MIDDLEWARE VALIDAZIONE SPEDIZIONE (shipment-validation.js)
 *
 * I middleware sono "controlli automatici" che vengono eseguiti PRIMA di mostrare una pagina.
 * Funzionano come un guardiano all'ingresso: controllano se l'utente ha il permesso
 * di entrare in quella pagina, e se non ce l'ha, lo mandano da un'altra parte.
 *
 * Questo middleware protegge le pagine del flusso di spedizione.
 * Controlla che l'utente non provi ad accedere a step non validi:
 * - Se l'indirizzo finisce con "1" (step 1) -> manda alla homepage
 *   (lo step 1 e' gestito dalla homepage stessa con il componente Preventivo)
 * - Se l'indirizzo finisce con "5" (step 5) -> manda alla homepage
 *   (lo step 5 non esiste come pagina separata)
 *
 * In futuro potrebbe anche controllare che l'utente abbia completato
 * gli step precedenti prima di accedere a quelli successivi.
 */
export default defineNuxtRouteMiddleware((to, from) => {
	/* const { session } = useSession(); */

	// Permetti l'accesso allo step 1 se c'e' il parametro edit (modifica carrello)
	if (to.query.edit) {
		return;
	}

	if (to.fullPath.endsWith("1") || to.fullPath.endsWith("5")) {
		return navigateTo("/");
	}

	/* if (!to.fullPath.endsWith("1") && !to.fullPath.endsWith("5") && !session.value?.data?.services) {
		return navigateTo("/la-tua-spedizione-2");
	} */
});
