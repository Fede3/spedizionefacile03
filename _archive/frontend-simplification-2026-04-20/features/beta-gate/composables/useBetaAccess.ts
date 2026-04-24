/**
 * Beta Access Control: whitelist 20 utenti beta privati pre-go-public.
 *
 * Feature flag: NUXT_PUBLIC_BETA_MODE=true|false
 *   - 'true'  -> solo utenti in whitelist possono navigare (redirect a /beta-invite)
 *   - 'false' -> accesso pubblico, gate disattivato
 *
 * Utenti whitelisted via env NUXT_PUBLIC_BETA_EMAILS (CSV, case-insensitive).
 *
 * Nel repo SpedizioneFacile l'auth usa nuxt-auth-sanctum (NON Supabase),
 * quindi l'identita' utente viene letta via useSanctumUser() quando disponibile.
 * Il composable e' SSR-safe: se l'utente non e' ancora idratato restituisce
 * isAllowed=false cosi' il middleware blocca il rendering fino al login.
 */
export const useBetaAccess = () => {
  const config = useRuntimeConfig()

  // useSanctumUser() e' auto-imported dal modulo nuxt-auth-sanctum.
  // Lo wrappiamo in try/catch: se per qualche motivo il modulo non fosse
  // inizializzato (es. build pre-render di pagine statiche) non vogliamo
  // crashare tutta la route.
  let user: { value: { email?: string } | null } | null = null
  try {
    // @ts-ignore - auto-import from nuxt-auth-sanctum
    user = typeof useSanctumUser === 'function' ? useSanctumUser() : null
  }
  catch {
    user = null
  }

  const isBetaMode = computed(() => String(config.public.betaMode) === 'true')

  const whitelistedEmails = computed(() => {
    const raw = String(config.public.betaEmails || '')
    return raw
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)
  })

  const isAllowed = computed(() => {
    if (!isBetaMode.value) return true
    const email = String(user?.value?.email || '').toLowerCase()
    if (!email) return false
    return whitelistedEmails.value.includes(email)
  })

  return { isBetaMode, isAllowed, whitelistedEmails }
}
