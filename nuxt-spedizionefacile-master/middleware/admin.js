/**
 * MIDDLEWARE: admin (middleware/admin.js)
 * SCOPO: Protegge le pagine admin — solo utenti con ruolo "Admin" possono accedervi.
 *
 * DOVE SI USA: pages/account/amministrazione/*.vue (definePageMeta → middleware: ['admin'])
 * REDIRECT: se l'utente non e' admin → /account
 *
 * COME FUNZIONA:
 * I middleware sono "controlli automatici" eseguiti PRIMA di mostrare una pagina.
 * Questo controlla il campo user.role: se non e' "Admin", l'utente viene
 * reindirizzato alla pagina del suo account.
 *
 * VINCOLI: richiede che l'utente sia gia' autenticato (usare insieme a sanctum:auth)
 * COLLEGAMENTI: laravel-spedizionefacile-main/app/Models/User.php (campo role)
 */
export default defineNuxtRouteMiddleware((to, from) => {
	const { user } = useSanctumAuth();

	if (user.value?.role !== "Admin") {
		return navigateTo("/account");
	}
});
