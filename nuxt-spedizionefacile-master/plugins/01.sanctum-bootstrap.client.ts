/**
 * Bootstrap auth immediato lato client:
 * in nuova tab (middle click) non passa da page:loading:start, quindi
 * forziamo subito init() per riallineare lo stato utente con la sessione.
 */
export default defineNuxtPlugin(async () => {
  const { init } = useSanctumAuth()
  try {
    await init()
  } catch (error) {
    const err = error as { status?: number; response?: { status?: number } }
    const status = Number(err?.status ?? err?.response?.status ?? 0)
    if ([401, 419].includes(status)) {
      return
    }
    console.error('[sanctum] bootstrap identity failed', error)
  }
})
