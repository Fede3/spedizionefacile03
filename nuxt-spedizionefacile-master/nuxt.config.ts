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
const staticPublicRouteRule = {}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  // Devtools sempre spenti fuori dal vero ambiente di sviluppo:
  // la preview condivisa deve restare pulita, senza hook runtime extra
  // che introducono rumore in console o micro-flicker percepibili.
  devtools: {
    enabled: process.env.NODE_ENV === 'development' && process.env.NUXT_ENABLE_DEVTOOLS === 'true',
  },
  modules: ['@nuxt/ui', '@nuxt/image', '@pinia/nuxt', 'nuxt-auth-sanctum', 'nuxt-security', '@nuxtjs/sitemap'],
  ui: {
    // Usiamo font locali via @fontsource in assets/css/main.css:
    // questo evita fetch esterni in build e mantiene il sistema tipografico
    // limitato a Inter + Montserrat.
    fonts: false,
    // Colore primario: teal (coerente con --color-brand-primary #095866).
    // Il default di Nuxt UI e' green — lo sovrascriviamo.
    colors: {
      primary: 'teal',
      neutral: 'slate',
    },
  },

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

  // Ottimizzazione icone: include solo le icone MDI nel bundle (nessuna richiesta API runtime).
  // clientBundle.scan scansiona i .vue per trovare quali icone servono e le include direttamente.
  icon: {
    localApiEndpoint: '/_nuxt_icon',
    clientBundle: {
      scan: true,
    },
    serverBundle: 'local',
  },

  css: [
    '~/assets/css/main.css',           // base + tokens + contenuto-header (checkout.css imported via @import)
    '~/assets/css/preventivo.css',      // quote form
    '~/assets/css/shipment-step.css',   // shipment flow + PUDO map markers
    '~/assets/css/autenticazione.css',  // auth full-page + overlay
    '~/assets/css/summary-card.css',    // shipment summary card
    '~/assets/css/footer.css',          // site footer
    '~/assets/css/recensioni.css',      // homepage reviews
    '~/assets/css/faq.css',             // FAQ page
    '~/assets/css/servizi.css',         // services + chi-siamo pages
    '~/assets/css/navbar.css',          // site navbar
    '~/assets/css/contatti.css',        // contacts page
    '~/assets/css/steps.css',           // step navigation
    '~/assets/css/homepage-servizi.css', // homepage services + step timeline
    '~/assets/css/admin-prezzi.css',    // admin price panel
    '~/assets/css/legal.css',           // legal/informative pages (privacy, cookie, termini, reclami)
  ],

  app: {
    // Nessuna transizione globale di pagina/layout:
    // l'utente deve percepire il cambio route come stabile, non come fade/flash.
    pageTransition: false,
    layoutTransition: false,
    head: {
      htmlAttrs: { lang: 'it' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'SpediamoFacile - Spedizioni Nazionali e Internazionali a Prezzi Competitivi',
      meta: [
        { name: 'description', content: 'SpediamoFacile: confronta e prenota spedizioni nazionali e internazionali ai migliori prezzi. Ritiro a domicilio, tracking in tempo reale e assistenza dedicata.' },
        { name: 'keywords', content: 'spedizioni, corriere, pacco, spedizione economica, spedire pacco, corriere espresso, spedizioni Italia, spedizioni internazionali, confronta spedizioni' },
        { name: 'author', content: 'SpediamoFacile' },
        { name: 'robots', content: 'index, follow' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'SpediamoFacile' },
        { property: 'og:locale', content: 'it_IT' },
        { property: 'og:title', content: 'SpediamoFacile - Spedizioni Nazionali e Internazionali' },
        { property: 'og:description', content: 'Confronta e prenota spedizioni ai migliori prezzi. Ritiro a domicilio, tracking in tempo reale e assistenza dedicata.' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'SpediamoFacile - Spedizioni Nazionali e Internazionali' },
        { name: 'twitter:description', content: 'Confronta e prenota spedizioni ai migliori prezzi.' },
        { name: 'theme-color', content: '#095866' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        { rel: 'canonical', href: 'https://spediamofacile.it' },
        // Preconnect to API origin for faster first API call
        { rel: 'preconnect', href: 'https://spediamofacile.it', crossorigin: '' },
        // DNS-prefetch as fallback for browsers that don't support preconnect
        { rel: 'dns-prefetch', href: 'https://spediamofacile.it' },
        // Preload font principali per ridurre il salto metrico al primo paint.
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/inter-latin-400-normal.woff2', crossorigin: '' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/inter-latin-600-normal.woff2', crossorigin: '' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/inter-latin-700-normal.woff2', crossorigin: '' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/montserrat-latin-600-normal.woff2', crossorigin: '' },
        // Stripe preconnect is NOT here on purpose: it is added only on pages
        // that actually use Stripe (checkout, carte, portafoglio) via useHead()
        // to avoid wasting a connection on every page load.
        // PWA manifest for installability and mobile home screen
        { rel: 'manifest', href: '/manifest.json' },
      ],
    },
  },

  router: {
    options: {
      // Niente smooth globale sui cambi route: sui flussi operativi generava
      // scroll intermedi percepiti come scatti o "pagine in mezzo".
      scrollBehaviorType: 'auto',
    },
  },

  runtimeConfig: {
    public: {
      apiBase: String(process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:8787').trim(),
      stripeKey: process.env.NUXT_PUBLIC_STRIPE_KEY || '',
    },
  },

  sanctum: {
    // baseUrl: indirizzo base per TUTTE le chiamate API del modulo sanctum.
    // Tutte le richieste (login, logout, csrf, user) partono da questo indirizzo.
    // In locale: http://127.0.0.1:8787 (Caddy proxy che smista a Laravel e Nuxt)
    baseUrl: String(process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:8787').trim(),

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
      // Non fare fetch automatico dell'identita' su ogni bootstrap SSR/build:
      // usiamo il plugin client dedicato per inizializzare auth solo dove serve.
      initialRequest: false,
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
    // Usiamo warn anche in sviluppo per evitare spam debug su flussi guest.
    logLevel: 3,
  },

  // Regole per pagine statiche: caching SWR di 1 ora.
  // Le pagine puramente statiche vengono servite dalla cache,
  // riducendo il carico server e velocizzando la navigazione.
  routeRules: {
    '/chi-siamo': staticPublicRouteRule,
    '/faq': staticPublicRouteRule,
    '/contatti': staticPublicRouteRule,
    '/privacy-policy': staticPublicRouteRule,
    '/cookie-policy': staticPublicRouteRule,
    '/termini-condizioni': staticPublicRouteRule,
    '/reclami': staticPublicRouteRule,
    '/servizi': staticPublicRouteRule,
    '/servizi/**': staticPublicRouteRule,
    '/guide': staticPublicRouteRule,
    '/guide/**': staticPublicRouteRule,
    // Flussi autenticati o interattivi: mai pre-renderarli in build.
    // Dipendono da sessione, carrello o API runtime e altrimenti generano
    // fetch falliti verso il backend locale durante la compilazione.
    '/account': { prerender: false },
    '/account/**': { prerender: false },
    '/autenticazione': { prerender: false },
    '/login': { prerender: false },
    '/registrazione': { prerender: false },
    '/preventivo': { prerender: false },
    '/carrello': { prerender: false },
    // I passi del funnel restano dinamici e non vanno prerenderati,
    // ma il render server-side ora e' di nuovo affidabile:
    // il middleware legge la sessione prima del mount e puo' correggere
    // subito i deep-link invalidi senza mostrare shell vuote sulla preview.
    '/checkout': { prerender: false },
    '/riepilogo': { prerender: false },
    '/la-tua-spedizione/**': { prerender: false },
    // Cache aggressiva per asset statici (immagini, font, JS/CSS con hash).
    // max-age=1 anno perche' Vite aggiunge hash al nome dei file:
    // quando il contenuto cambia, cambia anche il nome → cache automaticamente invalidata.
    '/_nuxt/**': { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
  },

  experimental: {
    // Disabilitato: su Windows/dev ha generato errori ENOENT sui file
    // .nuxt/cache/nuxt/payload/* e 500 su rotte statiche.
    // Qui privilegiamo stabilita' e prevedibilita' del runtime.
    payloadExtraction: false,
    // Disattiva i timer/hooks di timing nel browser della preview condivisa:
    // riduce rumore in console e i micro-flash percepiti in dev tunnel.
    browserDevtoolsTiming: false,
    // Ottimizzazione: rendering asincrono dei componenti per ridurre il blocking
    asyncContext: true,
  },

  debug: {
    // La preview condivisa non deve includere il plugin Nuxt `debug-hooks`:
    // genera timer duplicati in console (`[nuxt-app] ... already exists`) e
    // sporca il QA live senza dare valore nel tunnel pubblico.
    hooks: false,
  },

  // Nitro (server engine) optimizations
  nitro: {
    // Enable gzip + brotli compression for all static assets
    compressPublicAssets: { gzip: true, brotli: true },
    // Minify server bundle
    minify: true,
    // Pre-rendering: genera HTML statico per pagine che non cambiano mai
    prerender: {
      // Non crawlare l'intera app: molte pagine dipendono da sessione/API e
      // in build porterebbero a redirect ricorsivi o fetch verso backend locale.
      // Qui pre-renderizziamo solo le rotte statiche dichiarate sotto.
      crawlLinks: false,
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
      // Difesa aggiuntiva: blocca il prerender dei flussi che richiedono
      // sessione, autenticazione o stato carrello anche se vengono trovati
      // nei link del layout o della homepage.
      ignore: [
        '/account',
        '/account/**',
        '/autenticazione',
        '/login',
        '/registrazione',
        '/preventivo',
        '/carrello',
        '/checkout',
        '/riepilogo',
        '/la-tua-spedizione/**',
      ],
    },
  },

  // nuxt-security: headers OWASP automatici per produzione.
  // CSP con 'unsafe-inline' necessario per Nuxt UI + Tailwind inline styles.
  security: {
    headers: {
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'"],
        'connect-src': ["'self'", 'https://api.stripe.com', 'https://*.trycloudflare.com'],
        'frame-src': ["'self'", 'https://js.stripe.com'],
      },
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: ['self'],
      },
      crossOriginEmbedderPolicy: false,
    },
    // Rate limiting non necessario qui — gestito lato Laravel/Caddy
    rateLimiter: false,
  },

  // @nuxtjs/sitemap: generazione automatica sitemap.xml
  site: {
    url: 'https://spediamofacile.it',
  },
  sitemap: {
    exclude: ['/account/**', '/checkout', '/riepilogo', '/carrello', '/autenticazione', '/login', '/registrazione', '/la-tua-spedizione/**'],
  },

  devServer: {
    port: 3001,
    host: '0.0.0.0',
  },

  vite: {
    server: {
      allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1'],
      // Vite 7 abilita HTTP/2 di default — forza compatibilità HTTP/1.1
      // per proxy, tunnel e tool di preview che non supportano H2
      h2: false,
      allowHTTP1: true,
    },
    build: {
      // lightningcss minifier produces smaller CSS than default esbuild
      cssMinify: 'lightningcss',
      // Target modern browsers for smaller output (no legacy polyfills)
      target: 'es2022',
      // PERF-04: abilita code-splitting CSS — i <style> dei componenti
      // vengono estratti in chunk separati e caricati solo sulle pagine
      // che li usano, invece di un singolo bundle monolitico (~218 KB)
      // servito su OGNI route.
      // I CSS globali (css[] in nuxt.config) restano nell'entry chunk e
      // non sono affetti da questo flag, quindi nessun rischio FOUC reale.
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
