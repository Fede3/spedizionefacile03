/**
 * PLUGIN: Correzione dinamica dell'URL di Sanctum (solo lato client/browser)
 *
 * PROBLEMA:
 *   In nuxt.config.ts, sanctum.baseUrl e' impostato a "http://127.0.0.1:8787"
 *   per il funzionamento locale. Ma quando il sito e' condiviso tramite tunnel
 *   Cloudflare (es. https://abc123.trycloudflare.com), le chiamate API del browser
 *   andrebbero a http://127.0.0.1:8787 che e':
 *   1. Un'origine DIVERSA dalla pagina → i cookie di sessione NON vengono inviati
 *      dal browser (SameSite=Lax blocca i cookie cross-origin)
 *   2. Irraggiungibile da browser remoti (127.0.0.1 e' il LORO localhost, non il server)
 *
 * SOLUZIONE:
 *   Questo plugin si esegue PRIMA del plugin nuxt-auth-sanctum (enforce: 'pre')
 *   e imposta baseUrl all'origine corrente del browser (window.location.origin).
 *   Cosi' tutte le chiamate API passano dallo stesso dominio della pagina:
 *   - Locale: http://127.0.0.1:8787 → nessun cambiamento
 *   - Cloudflare: https://abc123.trycloudflare.com → le API passano dal tunnel
 *
 * PERCHE' SOLO CLIENT (.client.ts)?
 *   Durante il rendering lato server (SSR), Nuxt gira sullo stesso server di Laravel,
 *   quindi http://127.0.0.1:8787 funziona perfettamente. Il problema esiste SOLO
 *   nel browser dell'utente che potrebbe essere su un dominio diverso.
 */
export default defineNuxtPlugin({
  name: 'sanctum-dynamic-url',
  enforce: 'pre', // Esegui PRIMA di nuxt-auth-sanctum
  setup() {
    const config = useRuntimeConfig()
    const browserOrigin = window.location.origin
    const { hostname, port } = window.location

    // In sviluppo puro Nuxt (3000/3001) NON dobbiamo riscrivere baseUrl verso
    // la stessa origine del frontend, altrimenti tutte le chiamate API finiscono
    // su Nuxt invece che su Laravel/proxy e generano 404.
    const isLocalNuxtDevOrigin =
      ['127.0.0.1', 'localhost'].includes(hostname) &&
      ['3000', '3001'].includes(port)

    if (isLocalNuxtDevOrigin) {
      return
    }

    // Imposta il baseUrl di Sanctum all'origine corrente del browser
    // Questo fa si' che le chiamate di autenticazione (login, logout, csrf, user)
    // passino sempre dallo stesso dominio della pagina
    config.public.sanctum.baseUrl = browserOrigin

    // Imposta anche apiBase, usato da componenti e pagine che fanno fetch dirette
    // e non passano dal client Sanctum.
    config.public.apiBase = browserOrigin
  }
})
