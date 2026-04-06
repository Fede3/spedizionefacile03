import { runAuthBootstrap, useAuthBootstrapState } from '~/utils/authBootstrap'

/**
 * Bootstrap auth immediato lato client:
 * in nuova tab (middle click) non passa da page:loading:start, quindi
 * forziamo subito init() per riallineare lo stato utente con la sessione.
 *
 * IMPORTANTE: Questo plugin DEVE completare prima che le pagine protette
 * facciano richieste API, altrimenti otteniamo 401 (CSRF token non pronto).
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  const { authCookie } = useAuthUiSnapshotPersistence()
  const route = useRoute()
  const { bootstrapReady, bootstrapStatus } = useAuthBootstrapState()

  // Su pagine pubbliche evitiamo /api/user inutili lato guest,
  // ma se abbiamo gia' uno snapshot auth valido bootstrappiamo subito
  // per evitare il flash "Accedi" -> "Ciao Nome" su reload o nuova tab.
  const requiresImmediateAuthBootstrap =
    route.path.startsWith('/account')
  const canSoftBootstrapAuth =
    route.path.startsWith('/carrello')
    || route.path.startsWith('/checkout')

  const shouldBootstrapFromSnapshot = Boolean(authCookie.value?.authenticated)
  const shouldRunInit = requiresImmediateAuthBootstrap || (canSoftBootstrapAuth && shouldBootstrapFromSnapshot)

  if (!shouldRunInit) {
    // Su pagine pubbliche senza sessione auth nota consideriamo il bootstrap
    // gia' "risolto": cosi' la UI non continua a fidarsi di snapshot locali
    // stantii che possono far lampeggiare navbar/account al primo render.
    bootstrapStatus.value = 'resolved'
    bootstrapReady.value = true
    nuxtApp.provide('authReady', bootstrapReady)
    return
  }

  await runAuthBootstrap({ force: true })
  nuxtApp.provide('authReady', bootstrapReady)
})
