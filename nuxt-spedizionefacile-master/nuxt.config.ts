// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxt/image', '@pinia/nuxt', 'nuxt-auth-sanctum'],

  css: ['~/assets/css/main.css'],

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
