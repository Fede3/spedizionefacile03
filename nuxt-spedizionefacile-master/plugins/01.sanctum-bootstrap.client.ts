/**
 * Bootstrap auth immediato lato client:
 * in nuova tab (middle click) non passa da page:loading:start, quindi
 * forziamo subito init() per riallineare lo stato utente con la sessione.
 *
 * IMPORTANTE: Questo plugin DEVE completare prima che le pagine protette
 * facciano richieste API, altrimenti otteniamo 401 (CSRF token non pronto).
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  const { init } = useSanctumAuth()
  const { authCookie } = useAuthUiSnapshotPersistence()
  const route = useRoute()
  const bootstrapReady = useState('auth-bootstrap-ready', () => false)
  const bootstrapStatus = useState<'idle' | 'pending' | 'resolved' | 'failed'>('auth-bootstrap-status', () => 'idle')
  const finish = () => {
    bootstrapReady.value = true
    nuxtApp.provide('authReady', bootstrapReady)
  }

  bootstrapReady.value = false
  bootstrapStatus.value = 'pending'

  // Su pagine pubbliche evitiamo /api/user inutili lato guest,
  // ma se abbiamo già uno snapshot auth valido bootstrappiamo subito
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
    // già "risolto": così la UI non continua a fidarsi di snapshot locali
    // stantii che possono far lampeggiare navbar/account al primo render.
    bootstrapStatus.value = 'resolved'
    finish()
    return
  }

  try {
    await init()
    bootstrapStatus.value = 'resolved'
    finish()
  } catch (error) {
    const err = error as { status?: number; response?: { status?: number } }
    const status = Number(err?.status ?? err?.response?.status ?? 0)

    // 401: non autenticato (normale per utenti non loggati)
    // 419: CSRF token scaduto (riprova automaticamente alla prossima richiesta)
    if ([401, 419].includes(status)) {
      bootstrapStatus.value = 'resolved'
      finish() // Anche se non autenticato, il bootstrap è "pronto"
      return
    }

    // Errori inaspettati: loga per debug
    console.error('[sanctum] bootstrap identity failed', error)
    bootstrapStatus.value = 'failed'
    finish() // Marca come pronto anche in caso di errore
  }
})
