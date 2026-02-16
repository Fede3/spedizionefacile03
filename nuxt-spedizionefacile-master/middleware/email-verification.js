/**
 * MIDDLEWARE: email-verification (middleware/email-verification.js)
 * SCOPO: Protegge la pagina di verifica email — accessibile solo con parametri dal link email.
 *
 * DOVE SI USA: pages/verifica-email.vue (definePageMeta → middleware: ['email-verification'])
 * REDIRECT: se mancano i parametri query → / (homepage)
 *
 * COME FUNZIONA:
 * Quando l'utente si registra, riceve un'email con un link tipo:
 * /verifica-email?id=123&hash=abc&expires=1234567890&signature=xyz
 * Questo middleware controlla che ci siano parametri nell'URL.
 * Se qualcuno apre /verifica-email direttamente (senza parametri), viene mandato alla homepage.
 *
 * VINCOLI: i parametri query vengono poi inviati al backend per la verifica vera e propria
 * COLLEGAMENTI: pages/verifica-email.vue
 */
export default defineNuxtRouteMiddleware((to, from) => {
	if (!to.query || String(to.query).trim() === "") {
		return navigateTo("/");
	}
});
