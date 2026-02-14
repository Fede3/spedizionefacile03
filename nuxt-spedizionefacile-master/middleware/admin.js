/**
 * MIDDLEWARE ADMIN (admin.js)
 *
 * I middleware sono "controlli automatici" che vengono eseguiti PRIMA di mostrare una pagina.
 * Funzionano come un guardiano all'ingresso: controllano se l'utente ha il permesso
 * di entrare in quella pagina, e se non ce l'ha, lo mandano da un'altra parte.
 *
 * Questo middleware controlla che l'utente sia un AMMINISTRATORE del sito.
 * Se l'utente non ha il ruolo "Admin", viene automaticamente mandato
 * alla pagina del suo account (/account) invece di vedere la pagina richiesta.
 *
 * Viene usato per proteggere le pagine del pannello di amministrazione,
 * in modo che solo gli admin possano accedervi.
 */
export default defineNuxtRouteMiddleware((to, from) => {
	const { user } = useSanctumAuth();

	if (user.value?.role !== "Admin") {
		return navigateTo("/account");
	}
});
