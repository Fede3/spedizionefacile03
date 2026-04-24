const staticPublicRouteRule = {}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: {
    enabled: process.env.NODE_ENV === 'development' && process.env.NUXT_ENABLE_DEVTOOLS === 'true',
  },
  modules: ['@nuxt/ui', '@nuxt/image', '@pinia/nuxt', 'nuxt-auth-sanctum', 'nuxt-security', '@nuxtjs/sitemap', '@nuxtjs/turnstile'],
  // Cloudflare Turnstile (CAPTCHA): sitekey `1x00000000000000000000AA` e'
  // una chiave di TEST che accetta sempre tutti i token (dev only).
  // In prod, sostituire con la sitekey reale via NUXT_PUBLIC_TURNSTILE_SITE_KEY.
  turnstile: {
    siteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
    addValidateEndpoint: false,
  },
  // pathPrefix:false → componenti accessibili con solo il basename del file
  // (es. <ServizioGrid> invece di <ServiziServizioGrid>).
  components: [
    { path: '~/components', pathPrefix: false },
  ],
  ui: {
    fonts: false, // font locali via @fontsource, no fetch esterno
    colors: {
      primary: 'teal',
      neutral: 'slate',
    },
  },

  image: {
    format: ['avif', 'webp'],
    quality: 80,
    screens: {
      mobile: 375,
      tablet: 720,
      desktop: 1024,
      'desktop-xl': 1440,
    },
  },

  icon: {
    localApiEndpoint: '/_nuxt_icon',
    clientBundle: {
      scan: true,
    },
    serverBundle: 'local',
  },

  // CSS globali: le pagine importano i propri CSS specifici in <script setup>
  // per isolare in chunk route-specific.
  css: [
    '~/assets/css/main.css',
    '~/assets/css/admin-theme.css',
    '~/assets/css/print.css',
  ],

  app: {
    pageTransition: false,
    layoutTransition: false,
    head: {
      htmlAttrs: { lang: 'it' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      titleTemplate: '%s | SpediamoFacile',
      title: 'Spedizioni Nazionali e Internazionali a Prezzi Competitivi',
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
        { property: 'og:image', content: 'https://spediamofacile.it/og/default.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:type', content: 'image/png' },
        { property: 'og:image:alt', content: 'SpediamoFacile — Spedizioni BRT al miglior prezzo' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'SpediamoFacile - Spedizioni Nazionali e Internazionali' },
        { name: 'twitter:description', content: 'Confronta e prenota spedizioni ai migliori prezzi.' },
        { name: 'twitter:image', content: 'https://spediamofacile.it/og/default.png' },
        { name: 'twitter:image:alt', content: 'SpediamoFacile — Spedizioni BRT al miglior prezzo' },
        // -- ARCHIVIATO 2026-04-20 -- { name: 'theme-color', content: '#095866' },
        // -- ARCHIVIATO 2026-04-20 -- { name: 'msapplication-TileColor', content: '#095866' },
        // -- ARCHIVIATO 2026-04-20 -- { name: 'apple-mobile-web-app-capable', content: 'yes' },
        // -- ARCHIVIATO 2026-04-20 -- { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        // -- ARCHIVIATO 2026-04-20 -- { name: 'apple-mobile-web-app-title', content: 'SpediamoFacile' },
        // -- ARCHIVIATO 2026-04-20 -- { name: 'mobile-web-app-capable', content: 'yes' },
        // -- ARCHIVIATO 2026-04-20 -- { name: 'application-name', content: 'SpediamoFacile' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            'name': 'SpediamoFacile',
            'url': 'https://spediamofacile.it',
            'description': 'Spedizioni economiche e veloci in tutta Italia',
          }),
        },
      ],
      link: [
        { rel: 'canonical', href: 'https://spediamofacile.it' },
        { rel: 'preconnect', href: 'https://spediamofacile.it', crossorigin: '' },
        { rel: 'dns-prefetch', href: 'https://spediamofacile.it' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/inter-latin-400-normal.woff2', crossorigin: '' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/inter-latin-600-normal.woff2', crossorigin: '' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/inter-latin-700-normal.woff2', crossorigin: '' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/montserrat-latin-600-normal.woff2', crossorigin: '' },
        // Stripe preconnect: aggiunto via useHead() solo nelle pagine checkout/carte/portafoglio.
        // -- ARCHIVIATO 2026-04-20 -- { rel: 'manifest', href: '/manifest.json' },
        // -- ARCHIVIATO 2026-04-20 -- Icone PWA + iOS home screen.
        // -- ARCHIVIATO 2026-04-20 -- { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icons/icon-192.png' },
        // -- ARCHIVIATO 2026-04-20 -- { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/icons/icon-512.png' },
        // -- ARCHIVIATO 2026-04-20 -- { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/apple-touch-icon.png' },
        // -- ARCHIVIATO 2026-04-20 -- { rel: 'mask-icon', href: '/icons/icon-512-maskable.png', color: '#095866' },
      ],
    },
  },

  router: {
    options: {
      scrollBehaviorType: 'auto',
    },
  },

  runtimeConfig: {
    public: {
      apiBase: String(process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:8787').trim(),
      stripeKey: process.env.NUXT_PUBLIC_STRIPE_KEY || '',
      enableDevTools: process.env.NUXT_PUBLIC_ENABLE_DEV_TOOLS === 'true',
      sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN || '',
      sentryEnv: process.env.NUXT_PUBLIC_SENTRY_ENV || 'development',
      sentryRelease: process.env.NUXT_PUBLIC_SENTRY_RELEASE || '',
      plausibleDomain: process.env.NUXT_PUBLIC_PLAUSIBLE_DOMAIN || '',
      gaId: process.env.NUXT_PUBLIC_GA_ID || '',
      // Tawk.to live chat: se vuoto, plugin no-op.
      tawktoId: process.env.NUXT_PUBLIC_TAWKTO_ID || '',
      tawktoWidgetId: process.env.NUXT_PUBLIC_TAWKTO_WIDGET_ID || 'default',
      // Turnstile sitekey pubblica (mirror del config module — usata dal composable).
      turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
      // Beta gate soft-launch. 'true' = solo email in betaEmails.
      betaMode: process.env.NUXT_PUBLIC_BETA_MODE ?? 'false',
      betaEmails: process.env.NUXT_PUBLIC_BETA_EMAILS ?? '',
      siteUrl: String(process.env.NUXT_PUBLIC_SITE_URL || 'https://spediamofacile.it').replace(/\/+$/, ''),
    },
  },

  sourcemap: {
    client: true,
    server: false,
  },

  sanctum: {
    baseUrl: String(process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:8787').trim(),
    // Nessun "origin" fissato: il modulo usa useRequestURL().origin così il
    // tunnel Cloudflare riceve l'Origin reale del browser (non il localhost).
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
      initialRequest: false,
    },
    redirect: {
      keepRequestedRoute: true,
      onLogin: '/',
      onLogout: '/',
      onAuthOnly: '/',
      onGuestOnly: '/',
    },
    // globalMiddleware disabilitato: usiamo middleware specifici sulle pagine.
    globalMiddleware: {
      enabled: false,
    },
    logLevel: 3,
  },

  routeRules: {
    '/chi-siamo': staticPublicRouteRule,
    '/faq': staticPublicRouteRule,
    '/contatti': staticPublicRouteRule,
    '/privacy-policy': staticPublicRouteRule,
    '/cookie-policy': staticPublicRouteRule,
    '/termini-e-condizioni': staticPublicRouteRule,
    '/termini-condizioni': { redirect: { to: '/termini-e-condizioni', statusCode: 301 } },
    '/reclami': staticPublicRouteRule,
    '/servizi': staticPublicRouteRule,
    '/servizi/**': staticPublicRouteRule,
    '/guide': staticPublicRouteRule,
    '/guide/**': staticPublicRouteRule,
    '/account': { prerender: false },
    '/account/**': { prerender: false },
    '/autenticazione': { prerender: false },
    '/login': { prerender: false },
    '/registrazione': { prerender: false },
    '/preventivo': { prerender: false },
    '/carrello': { prerender: false },
    '/checkout': { prerender: false },
    '/riepilogo': { prerender: false },
    '/la-tua-spedizione/**': { prerender: false },
    // Asset hashati da Vite: cache immutable safe.
    '/_nuxt/**': { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
  },

  experimental: {
    // Su Windows/dev payloadExtraction causa ENOENT su .nuxt/cache/nuxt/payload.
    payloadExtraction: false,
    browserDevtoolsTiming: false,
    asyncContext: true,
  },

  debug: {
    hooks: false,
  },

  nitro: {
    // Su Windows la compressPublicAssets genera race condition: disattivato.
    compressPublicAssets: false,
    minify: true,
    prerender: {
      crawlLinks: false,
      routes: [
        '/chi-siamo',
        '/faq',
        '/contatti',
        '/privacy-policy',
        '/cookie-policy',
        '/termini-e-condizioni',
        '/reclami',
      ],
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

  // CSP: in prod NIENTE 'unsafe-inline' su script-src (XSS bypass).
  // In dev mantenuto per HMR Vite. Stripe/Plausible/GTM whitelisted.
  security: {
    headers: {
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        'script-src': process.env.NODE_ENV === 'production'
          ? ["'self'", 'https://js.stripe.com', 'https://m.stripe.network', 'https://plausible.io', 'https://www.googletagmanager.com', 'https://challenges.cloudflare.com', 'https://embed.tawk.to', 'https://*.tawk.to']
          : ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://js.stripe.com', 'https://m.stripe.network', 'https://plausible.io', 'https://www.googletagmanager.com', 'https://challenges.cloudflare.com', 'https://embed.tawk.to', 'https://*.tawk.to'],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'", 'data:'],
        'connect-src': process.env.NODE_ENV === 'production'
          ? ["'self'", 'https://api.stripe.com', 'https://m.stripe.network', 'https://nominatim.openstreetmap.org', 'https://*.ingest.sentry.io', 'https://plausible.io', 'https://www.google-analytics.com', 'https://*.analytics.google.com', 'https://challenges.cloudflare.com', 'https://*.tawk.to', 'wss://*.tawk.to']
          : ["'self'", 'https://api.stripe.com', 'https://m.stripe.network', 'https://*.trycloudflare.com', 'https://nominatim.openstreetmap.org', 'https://*.ingest.sentry.io', 'https://plausible.io', 'https://www.google-analytics.com', 'https://*.analytics.google.com', 'https://challenges.cloudflare.com', 'https://*.tawk.to', 'wss://*.tawk.to', 'ws:', 'wss:'],
        'frame-src': ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com', 'https://challenges.cloudflare.com'],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'self'"],
        'upgrade-insecure-requests': process.env.NODE_ENV === 'production',
      },
      permissionsPolicy: {
        // -- ARCHIVIATO 2026-04-20: Scanner QR (_archive/2026-04-20-features-rimosse/scanner-qr) --
        // camera: consentita solo sul proprio origin per lo scanner QR/barcode nella
        // pagina /traccia-spedizione. Il componente TrackingQrScanner usa
        // getUserMedia + BarcodeDetector nativo del browser.
        // camera: ['self'],
        camera: [],
        // -- END ARCHIVIATO --
        microphone: [],
        geolocation: ['self'],
      },
      crossOriginEmbedderPolicy: false,
      strictTransportSecurity: process.env.NODE_ENV === 'production'
        ? { maxAge: 15552000, includeSubdomains: true }
        : false,
    },
    rateLimiter: false, // gestito lato Laravel/Caddy
  },

  site: {
    url: 'https://spediamofacile.it',
  },
  sitemap: {
    exclude: [
      '/account/**',
      '/checkout',
      '/riepilogo',
      '/carrello',
      '/autenticazione',
      '/login',
      '/registrazione',
      '/recupera-password',
      '/aggiorna-password',
      '/verifica-email',
      '/beta-invite',
      // Tracking user-specific: la pagina dettaglio `/traccia/<code>` è noindex
      // e non deve comparire nelle sitemap (codici tracking sono privati).
      '/traccia/**',
      '/la-tua-spedizione/**',
      '/preview/**',
    ],
    sources: [
      '/__sitemap__/guide',
      '/__sitemap__/servizi',
    ],
    cacheMaxAgeSeconds: 3600,
  },

  devServer: {
    port: Number(process.env.NUXT_DEV_PORT || 8787),
    host: process.env.NUXT_DEV_HOST || '127.0.0.1',
  },

  vite: {
    optimizeDeps: {
      include: ['leaflet'],
    },
    server: {
      allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1'],
      h2: false,
      allowHTTP1: true,
      // HMR off di default: Vite 7 su porta interna 5173 causa WS failed
      // quando Nuxt dev è su 8787. Riabilitare con NUXT_HMR_ENABLED=1.
      hmr: process.env.NUXT_HMR_ENABLED === '1' ? true : false,
    },
    build: {
      cssMinify: 'lightningcss',
      target: 'es2022',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          // Code-splitting vendor pesanti: caricati solo sulle pagine che li usano.
          manualChunks(id) {
            if (id.includes('@stripe/stripe-js')) return 'vendor-stripe';
            if (id.includes('swiper')) return 'vendor-swiper';
            if (id.includes('pinia')) return 'vendor-pinia';
            if (id.includes('leaflet')) return 'vendor-leaflet';
            if (id.includes('@tiptap')) return 'vendor-tiptap';
          },
        },
      },
    },
  },
})
