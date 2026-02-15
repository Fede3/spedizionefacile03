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
  // Devtools: attivo solo in sviluppo, disabilitato in produzione per ridurre il bundle
  devtools: { enabled: process.env.NODE_ENV === 'development' },
  modules: ['@nuxt/ui', '@nuxt/image', '@pinia/nuxt', 'nuxt-auth-sanctum', '@nuxt/fonts'],

  // @nuxt/image: abilita formato WebP automatico, qualita' 80%,
  // e definisce le dimensioni responsive per i breakpoint del sito.
  image: {
    format: ['webp'],
    quality: 80,
    screens: {
      mobile: 375,
      tablet: 720,
      desktop: 1024,
      'desktop-xl': 1440,
    },
  },

  // @nuxt/fonts: auto-downloads Inter & Montserrat, injects font-display: swap,
  // and self-hosts them for faster loading (no render-blocking Google Fonts request).
  fonts: {
    defaults: {
      weights: [400, 500, 600, 700],
      styles: ['normal'],
    },
  },

  // Ottimizzazione icone: include solo le icone MDI nel bundle (nessuna richiesta API runtime).
  // clientBundle.scan scansiona i .vue per trovare quali icone servono e le include direttamente.
  icon: {
    clientBundle: {
      scan: true,
    },
    serverBundle: 'local',
  },

  css: ['~/assets/css/main.css'],

  app: {
    // pageTransition: { name: 'page', mode: 'out-in' },
    // layoutTransition: { name: 'layout', mode: 'out-in' },
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
        // Preconnect to API origin for faster first API call
        { rel: 'preconnect', href: 'https://spedizionefacile.it', crossorigin: '' },
        // DNS-prefetch as fallback for browsers that don't support preconnect
        { rel: 'dns-prefetch', href: 'https://spedizionefacile.it' },
        // Stripe preconnect is NOT here on purpose: it is added only on pages
        // that actually use Stripe (checkout, carte, portafoglio) via useHead()
        // to avoid wasting a connection on every page load.
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
    // baseUrl: indirizzo base per TUTTE le chiamate API del modulo sanctum.
    // Tutte le richieste (login, logout, csrf, user) partono da questo indirizzo.
    // In locale: http://127.0.0.1:8787 (Caddy proxy che smista a Laravel e Nuxt)
    baseUrl: process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:8787',

    // IMPORTANTE: "origin" NON e' impostata di proposito.
    // Se la impostassimo a un valore fisso (es. 'http://127.0.0.1:8787'),
    // il modulo invierebbe sempre quell'indirizzo come header Origin e Referer.
    // Problema: quando si accede via tunnel Cloudflare (es. xyz.trycloudflare.com),
    // Laravel riceverebbe Origin='http://127.0.0.1:8787' invece del dominio reale,
    // e rifiuterebbe la richiesta come "Unauthenticated" (mismatch CORS/sessione).
    // Senza "origin", il modulo usa automaticamente useRequestURL().origin,
    // cioe' l'indirizzo reale del browser — funziona ovunque.

    // endpoints: gli indirizzi delle API di autenticazione sul backend Laravel.
    // Il modulo chiama automaticamente questi endpoint quando serve.
    endpoints: {
      csrf: '/sanctum/csrf-cookie',   // GET: ottiene il cookie XSRF-TOKEN (protezione CSRF)
      login: '/api/custom-login',      // POST: login con email e password
      logout: '/api/logout',           // POST: logout e distruzione sessione
      user: '/api/user',               // GET: recupera i dati dell'utente autenticato
    },

    // csrf: configurazione della protezione CSRF (Cross-Site Request Forgery).
    // COME FUNZIONA: Laravel imposta un cookie "XSRF-TOKEN" nel browser.
    // Il modulo sanctum legge quel cookie e lo invia come header "X-XSRF-TOKEN"
    // in ogni richiesta POST/PUT/DELETE/PATCH. Laravel confronta i due valori:
    // se corrispondono, la richiesta e' legittima.
    csrf: {
      cookie: 'XSRF-TOKEN',       // Nome del cookie impostato da Laravel
      header: 'X-XSRF-TOKEN',     // Nome dell'header inviato dal frontend
    },

    // client: configurazione del client HTTP usato dal modulo.
    // retry: false = non riprovare automaticamente le richieste fallite.
    // La gestione dei retry la facciamo noi in autenticazione.vue (retry manuale su 419).
    client: {
      retry: false,
    },

    // redirect: dove mandare l'utente dopo le azioni di autenticazione.
    // keepRequestedRoute: se l'utente voleva andare a /account/spedizioni ma non era loggato,
    // dopo il login viene rimandato li' invece che alla homepage.
    redirect: {
      keepRequestedRoute: true,        // Ricorda la pagina richiesta prima del login
      onLogin: '/',                     // Dopo login: vai alla homepage
      onLogout: '/',                    // Dopo logout: vai alla homepage
      onAuthOnly: '/autenticazione',    // Pagina protetta senza login: vai al form di accesso
      onGuestOnly: '/',                 // Pagina solo-ospiti ma sei loggato: vai alla homepage
    },

    // globalMiddleware: se abilitato, TUTTE le pagine richiederebbero autenticazione.
    // Noi lo teniamo disabilitato perche' molte pagine sono pubbliche (homepage, servizi, ecc.)
    // e usiamo middleware specifici (sanctum:auth, sanctum:guest) sulle singole pagine.
    globalMiddleware: {
      enabled: false,
    },

    // logLevel: livello di log del modulo sanctum nella console del browser.
    // 5 = debug (mostra tutto: richieste CSRF, header, cookie) — utile per sviluppo
    // 3 = warn (mostra solo avvisi ed errori) — usato in produzione per non inquinare i log
    logLevel: process.env.NODE_ENV === 'development' ? 5 : 3,
  },

  // Regole per pagine statiche: caching SWR di 1 ora.
  // Le pagine puramente statiche vengono servite dalla cache,
  // riducendo il carico server e velocizzando la navigazione.
  routeRules: {
    '/chi-siamo': { swr: 3600 },
    '/faq': { swr: 3600 },
    '/contatti': { swr: 3600 },
    '/privacy-policy': { swr: 3600 },
    '/cookie-policy': { swr: 3600 },
    '/termini-condizioni': { swr: 3600 },
    '/reclami': { swr: 3600 },
    '/servizi': { swr: 3600 },
    '/servizi/**': { swr: 3600 },
    '/guide': { swr: 3600 },
    '/guide/**': { swr: 3600 },
    // Cache aggressiva per asset statici (immagini, font, JS/CSS con hash).
    // max-age=1 anno perche' Vite aggiunge hash al nome dei file:
    // quando il contenuto cambia, cambia anche il nome → cache automaticamente invalidata.
    '/_nuxt/**': { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
  },

  experimental: {
    // Extract page payloads to separate files for smaller initial JS
    payloadExtraction: true,
    // Tree-shake client-only composables from server bundle and vice versa
    treeshakeClientOnly: true,
    // Ottimizzazione: rendering asincrono dei componenti per ridurre il blocking
    asyncContext: true,
  },

  // Nitro (server engine) optimizations
  nitro: {
    // Enable gzip + brotli compression for all static assets
    compressPublicAssets: { gzip: true, brotli: true },
    // Minify server bundle
    minify: true,
    // Pre-rendering: genera HTML statico per pagine che non cambiano mai
    prerender: {
      // Crawla i link interni per pre-renderizzare automaticamente
      crawlLinks: true,
      // Pagine statiche da pre-renderizzare al build time (niente SSR a runtime)
      routes: [
        '/chi-siamo',
        '/faq',
        '/contatti',
        '/privacy-policy',
        '/cookie-policy',
        '/termini-condizioni',
        '/reclami',
      ],
    },
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
      // lightningcss minifier produces smaller CSS than default esbuild
      cssMinify: 'lightningcss',
      // Target modern browsers for smaller output (no legacy polyfills)
      target: 'es2022',
      // Enable CSS code splitting so each route loads only its own styles
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          // Separate heavy vendor libraries into their own chunks.
          // These are loaded only when the pages that need them are visited,
          // keeping the initial bundle small.
          manualChunks(id) {
            // Stripe (~50KB): only loaded on checkout, carte, portafoglio pages
            if (id.includes('@stripe/stripe-js')) return 'vendor-stripe';
            // Swiper (~40KB): only loaded on pages with carousels
            if (id.includes('swiper')) return 'vendor-swiper';
            // Pinia: separate for better long-term caching
            if (id.includes('pinia')) return 'vendor-pinia';
          },
        },
      },
    },
  },
})
