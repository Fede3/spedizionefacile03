// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxt/image', '@pinia/nuxt', 'nuxt-auth-sanctum'],

  css: ['~/assets/css/main.css'],

  app: {
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
      onLogin: '/account',
      onLogout: '/',
      onAuthOnly: '/autenticazione',
      onGuestOnly: '/account',
    },
    globalMiddleware: {
      enabled: false,
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
  },
})
