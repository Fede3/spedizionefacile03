/**
 * MIDDLEWARE VERIFICA EMAIL (email-verification.js)
 *
 * I middleware sono "controlli automatici" che vengono eseguiti PRIMA di mostrare una pagina.
 * Funzionano come un guardiano all'ingresso: controllano se l'utente ha il permesso
 * di entrare in quella pagina, e se non ce l'ha, lo mandano da un'altra parte.
 *
 * Questo middleware protegge la pagina di verifica email.
 * Controlla che nell'indirizzo della pagina ci siano dei parametri (query).
 * Se l'indirizzo non contiene parametri (cioe' qualcuno ha aperto la pagina
 * direttamente senza il link di verifica ricevuto via email),
 * l'utente viene mandato alla homepage.
 *
 * In pratica: la pagina di verifica email funziona solo se si arriva
 * cliccando il link inviato via email, che contiene parametri speciali.
 */
export default defineNuxtRouteMiddleware((to, from) => {
	if (!to.query || String(to.query).trim() === "") {
		return navigateTo("/");
	}
});
