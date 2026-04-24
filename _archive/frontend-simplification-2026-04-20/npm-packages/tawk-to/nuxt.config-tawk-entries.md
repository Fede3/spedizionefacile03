# nuxt.config.ts — entries Tawk.to archiviate

Estratto delle porzioni di `nuxt-spedizionefacile-master/nuxt.config.ts` rimosse
in data **2026-04-20** durante l'archiviazione di Tawk.to (Ondata 1, agente O1-A3).

Le righe qui sotto sono il contenuto **originale**. Nel file live sono state
commentate con marker `ARCHIVIATO 2026-04-20` (runtimeConfig) o sostituite
con varianti prive dei domini `*.tawk.to` (CSP).

---

## 1. `runtimeConfig.public` — variabili runtime

```ts
runtimeConfig: {
  public: {
    // ...altri token...
    plausibleDomain: process.env.NUXT_PUBLIC_PLAUSIBLE_DOMAIN || '',
    gaId: process.env.NUXT_PUBLIC_GA_ID || '',
    // Tawk.to live chat: se vuoto, plugin no-op.
    tawktoId: process.env.NUXT_PUBLIC_TAWKTO_ID || '',
    tawktoWidgetId: process.env.NUXT_PUBLIC_TAWKTO_WIDGET_ID || 'default',
    // Turnstile sitekey pubblica...
  },
},
```

## 2. `security.headers.contentSecurityPolicy.script-src`

Prima (con Tawk):

```ts
'script-src': process.env.NODE_ENV === 'production'
  ? ["'self'", 'https://js.stripe.com', 'https://m.stripe.network', 'https://plausible.io', 'https://www.googletagmanager.com', 'https://challenges.cloudflare.com', 'https://embed.tawk.to', 'https://*.tawk.to']
  : ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://js.stripe.com', 'https://m.stripe.network', 'https://plausible.io', 'https://www.googletagmanager.com', 'https://challenges.cloudflare.com', 'https://embed.tawk.to', 'https://*.tawk.to'],
```

Voci rimosse: `'https://embed.tawk.to'`, `'https://*.tawk.to'`.

## 3. `security.headers.contentSecurityPolicy.connect-src`

Prima (con Tawk):

```ts
'connect-src': process.env.NODE_ENV === 'production'
  ? ["'self'", 'https://api.stripe.com', 'https://m.stripe.network', 'https://nominatim.openstreetmap.org', 'https://*.ingest.sentry.io', 'https://plausible.io', 'https://www.google-analytics.com', 'https://*.analytics.google.com', 'https://challenges.cloudflare.com', 'https://*.tawk.to', 'wss://*.tawk.to']
  : ["'self'", 'https://api.stripe.com', 'https://m.stripe.network', 'https://*.trycloudflare.com', 'https://nominatim.openstreetmap.org', 'https://*.ingest.sentry.io', 'https://plausible.io', 'https://www.google-analytics.com', 'https://*.analytics.google.com', 'https://challenges.cloudflare.com', 'https://*.tawk.to', 'wss://*.tawk.to', 'ws:', 'wss:'],
```

Voci rimosse: `'https://*.tawk.to'`, `'wss://*.tawk.to'` (sia prod sia dev).

---

## 4. `.env.example` — variabili ambiente

Blocco rimosso dal file `nuxt-spedizionefacile-master/.env.example`:

```bash
# ── Tawk.to live chat ─────────────────────────────────────────────────────────
# Se vuoto il plugin e' no-op (dev locale: niente widget).
# NUXT_PUBLIC_TAWKTO_ID = property_id (es. 65f0abcd...)
# NUXT_PUBLIC_TAWKTO_WIDGET_ID = widget_id (default = "default")
NUXT_PUBLIC_TAWKTO_ID=
NUXT_PUBLIC_TAWKTO_WIDGET_ID=default
```

---

## 5. Plugin client archiviato

- **Path originale**: `nuxt-spedizionefacile-master/plugins/tawkto.client.ts`
- **Copia archivio**: `./tawkto.client.ts.original`
- Il file caricava lo script `https://embed.tawk.to/<tawktoId>/<widgetId>`
  solo in produzione e solo fuori dalle rotte `/account/amministrazione/**`.

## 6. File attivi con riferimenti Tawk (nessuno)

Un grep su `Tawk_API|tawk|tawkto` nella sorgente (`nuxt-spedizionefacile-master`)
dopo l'archiviazione restituisce:
- `nuxt.config.ts` → solo commento `ARCHIVIATO 2026-04-20` nel runtimeConfig
- `.env.example` → solo blocco commentato

Nessun componente Vue importava il plugin o usava `window.Tawk_API` in modo
diretto: il widget era completamente auto-contenuto nel plugin client-only.
