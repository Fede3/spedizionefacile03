/**
 * CONFIGURAZIONE NUXT (nuxt.config.ts)
 *
 * Questo file e' il "centro di controllo" dell'applicazione frontend.
 * Qui si configurano tutte le impostazioni principali del sito.
 *
 * Sezioni di configurazione:
 *
 * - compatibilityDate: la data di riferimento per la compatibilita' con Nuxt
 * - devtools: attiva gli strumenti per gli sviluppatori nel browser
 * - modules: i "moduli aggiuntivi" installati:
 *   * @nuxt/ui: libreria di componenti grafici pronti (pulsanti, modali, ecc.)
 *   * @nuxt/image: ottimizzazione automatica delle immagini
 *   * @pinia/nuxt: gestione dello stato globale (lo "store" / memoria condivisa)
 *   * nuxt-auth-sanctum: autenticazione utenti con Laravel Sanctum
 *
 * - css: il file CSS principale con gli stili globali del sito
 * - app.head: le impostazioni SEO della pagina (titolo, descrizione, parole chiave, ecc.)
 *   che aiutano Google a capire e indicizzare il sito
 *
 * - router: configurazione della navigazione (scorrimento fluido tra le pagine)
 *
 * - runtimeConfig: variabili di configurazione accessibili a runtime:
 *   * apiBase: indirizzo del server backend (Laravel)
 *   * stripeKey: chiave pubblica di Stripe per i pagamenti online
 *
 * - sanctum: configurazione dell'autenticazione con il backend Laravel:
 *   * baseUrl: indirizzo del server backend
 *   * endpoints: gli indirizzi per login, logout, csrf e dati utente
 *   * csrf: nome del cookie e header per la protezione CSRF (anti-attacco)
 *   * redirect: dove mandare l'utente dopo login, logout, ecc.
 *
 * - devServer: il server di sviluppo locale (porta 3001, accessibile da qualsiasi IP)
 *
 * - vite: configurazione del "motore" che compila il codice:
 *   * allowedHosts: domini autorizzati (per tunnel Cloudflare e localhost)
 *   * manualChunks: divide Stripe e Swiper in file separati per caricare piu' veloce
 */
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxt/image', '@pinia/nuxt', 'nuxt-auth-sanctum'],

  css: ['~/assets/css/main.css'],

  app: {
    /* Transizioni disabilitate: causavano schermo bianco durante la navigazione
       perche' il mode 'out-in' fa svanire la pagina vecchia PRIMA che la nuova sia pronta */
    head: {
      htmlAttrs: { lang: 'it' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'SpedizioneFacile - Spedizioni Nazionali e Internazionali a Prezzi Competitivi',
      meta: [
        { name: 'description', content: 'SpedizioneFacile: confronta e prenota spedizioni nazionali e internazionali ai migliori prezzi. Ritiro a domicilio, tracking in tempo reale e assistenza dedicata.' },
        { name: 'keywords', content: 'spedizioni, corriere, pacco, spedizione economica, spedire pacco, corriere espresso, spedizioni Italia, spedizioni internazionali, confronta spedizioni' },
        { name: 'author', content: 'SpedizioneFacile' },
        { name: 'robots', content: 'index, follow' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'SpedizioneFacile' },
        { property: 'og:locale', content: 'it_IT' },
        { property: 'og:title', content: 'SpedizioneFacile - Spedizioni Nazionali e Internazionali' },
        { property: 'og:description', content: 'Confronta e prenota spedizioni ai migliori prezzi. Ritiro a domicilio, tracking in tempo reale e assistenza dedicata.' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'SpedizioneFacile - Spedizioni Nazionali e Internazionali' },
        { name: 'twitter:description', content: 'Confronta e prenota spedizioni ai migliori prezzi.' },
        { name: 'theme-color', content: '#095866' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        { rel: 'canonical', href: 'https://spedizionefacile.it' },
      ],
    },
  },

  router: {
    options: {
      scrollBehaviorType: 'smooth',
    },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:8787',
      stripeKey: process.env.NUXT_PUBLIC_STRIPE_KEY || 'pk_test_placeholder',
    },
  },

  sanctum: {
    baseUrl: process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:8787',
    origin: process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:8787',
    endpoints: {
      csrf: '/sanctum/csrf-cookie',
      login: '/api/custom-login',
      logout: '/api/logout',
      user: '/api/user',
    },
    csrf: {
      cookie: 'XSRF-TOKEN',
      header: 'X-XSRF-TOKEN',
    },
    client: {
      retry: false,
    },
    redirect: {
      keepRequestedRoute: true,
      onLogin: '/',
      onLogout: '/',
      onAuthOnly: '/autenticazione',
      onGuestOnly: '/',
    },
    globalMiddleware: {
      enabled: false,
    },
  },

  experimental: {
    payloadExtraction: true,
  },

  devServer: {
    port: 3001,
    host: '0.0.0.0',
  },

  vite: {
    server: {
      allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            stripe: ['@stripe/stripe-js'],
            swiper: ['swiper'],
          },
        },
      },
    },
  },
})
