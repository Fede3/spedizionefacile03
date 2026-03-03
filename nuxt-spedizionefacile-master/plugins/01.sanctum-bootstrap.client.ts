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

  // Flag per indicare che il bootstrap è completato
  const authReady = ref(false)

  try {
    await init()
    authReady.value = true
  } catch (error) {
    const err = error as { status?: number; response?: { status?: number } }
    const status = Number(err?.status ?? err?.response?.status ?? 0)

    // 401: non autenticato (normale per utenti non loggati)
    // 419: CSRF token scaduto (riprova automaticamente alla prossima richiesta)
    if ([401, 419].includes(status)) {
      authReady.value = true // Anche se non autenticato, il bootstrap è "pronto"
      return
    }

    // Errori inaspettati: loga per debug
    console.error('[sanctum] bootstrap identity failed', error)
    authReady.value = true // Marca come pronto anche in caso di errore
  }

  // Rendi disponibile globalmente per le composables
  nuxtApp.provide('authReady', authReady)
})
