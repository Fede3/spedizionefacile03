/**
 * Middleware beta-gate: blocca accesso a utenti non-whitelist durante soft-launch.
 *
 * Attivo solo quando NUXT_PUBLIC_BETA_MODE=true.
 * Le rotte di login, invito beta e API restano sempre accessibili per permettere
 * l'autenticazione e i callback Sanctum/Stripe/BRT webhooks.
 *
 * Registrato come middleware globale via app.config o per-page; in W6.3
 * consigliato registrarlo in `nuxt.config.ts` -> `router.middleware`
 * (o via plugin) solo quando la build e' per produzione beta.
 */
export default defineNuxtRouteMiddleware((to) => {
  const { isBetaMode, isAllowed } = useBetaAccess()

  // Gate disattivato: nessun controllo.
  if (!isBetaMode.value) return

  // Utente whitelisted: passa.
  if (isAllowed.value) return

  // Rotte escluse dal gate (necessarie per loggarsi, richiedere invito, o servire API).
  if (
    to.path === '/beta-invite'
    || to.path === '/login'
    || to.path === '/autenticazione'
    || to.path === '/registrazione'
    || to.path.startsWith('/api/')
    || to.path.startsWith('/sanctum/')
  ) {
    return
  }

  return navigateTo('/beta-invite')
})
