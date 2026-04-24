# Riattivazione Sentry frontend (@sentry/vue)

Data archiviazione: 2026-04-20
Agente: O1-A4 (Ondata 1 — semplificazione frontend)

## Perché è stato archiviato

Sentry frontend aggiungeva error tracking lato browser con replay UI opzionale,
ma in un'app relativamente semplice (SPA Nuxt 3 con funnel lineare) la copertura
e' ridondante rispetto a:

- error boundaries nativi Vue 3 / Nuxt 3 (`onErrorCaptured`, `nuxtApp.hook('vue:error')`)
- errori server-side gia' catturati da Sentry Laravel (backend — NON archiviato)
- console errors raccolti via Plausible "outbound link / error" opzionale
- performance/web-vitals: archiviati anch'essi in `../web-vitals-plugin/`

Costo elevato, ROI basso per prodotto pre-launch:
- bundle: `@sentry/vue` v8.55 pesa ~110 KB gzipped (browserTracing + core)
- vendor lock-in: API non trasferibile ad altri provider
- privacy: necessario `beforeSend` custom per sanitizzare `password`, `token`, etc.
- noise: gran parte degli errori erano `ResizeObserver loop`, `AbortError` (gia' filtrati)

Se/quando in futuro serve tracking errori frontend, considerare alternative
piu' leggere (Bugsnag, Rollbar, oppure endpoint custom `/api/error-report`).

## File archiviati in questa cartella

- `sentry.client.ts.original` — plugin Nuxt che inizializzava `@sentry/vue`
  con `beforeSend` sanitizer (PII + header sensibili) e filtri ignoreErrors

## Cosa e' stato rimosso nel codebase

1. `plugins/sentry.client.ts` — rimosso (originale qui)
2. `composables/useFunnelAnalytics.ts` — rimossa funzione `sendToSentryBreadcrumb`
   e chiamata a `nuxtApp.$sentry.addBreadcrumb`. Ora le breadcrumb funnel
   restano solo in console.debug (dev) e su Plausible.
3. `composables/useWebVitals.ts` — rimosso (vedi `../web-vitals-plugin/`).
   Aveva `sendToSentry` che chiamava `nuxtApp.$sentry.setMeasurement`.
4. `package.json` — rimossa dependency `"@sentry/vue": "^8.55.1"`
5. `nuxt.config.ts`:
   - `runtimeConfig.public.sentryDsn|sentryEnv|sentryRelease` commentati
   - CSP `connect-src`: rimossa `https://*.ingest.sentry.io`
6. `tests/e2e/payment-failure.spec.ts` ha un commento `// Log breadcrumb stile Sentry.`
   che e' solo descrittivo (il test non usa realmente Sentry), lasciato invariato.

## Come riattivare

### 1. Reinstallare il pacchetto

```bash
cd nuxt-spedizionefacile-master
npm install @sentry/vue@^8.55.1
```

### 2. Ripristinare plugin

```bash
cp _archive/frontend-simplification-2026-04-20/npm-packages/sentry-frontend/sentry.client.ts.original \
   nuxt-spedizionefacile-master/plugins/sentry.client.ts
```

### 3. Ripristinare `nuxt.config.ts`

In `runtimeConfig.public`:
```ts
sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN || '',
sentryEnv: process.env.NUXT_PUBLIC_SENTRY_ENV || 'development',
sentryRelease: process.env.NUXT_PUBLIC_SENTRY_RELEASE || '',
```

In `security.headers.contentSecurityPolicy.connect-src` (PROD + DEV): aggiungere
`'https://*.ingest.sentry.io'`.

### 4. Ripristinare hook in `useFunnelAnalytics.ts`

Riaggiungere dentro `useFunnelAnalytics`:
```ts
const nuxtApp = import.meta.client ? useNuxtApp() : null

const sendToSentryBreadcrumb = (event: string, props?: FunnelProps): void => {
  if (!nuxtApp) return
  const sentry = nuxtApp.$sentry as {
    addBreadcrumb?: (crumb: { category: string; message: string; data?: FunnelProps; level?: string }) => void
  } | undefined
  if (!sentry?.addBreadcrumb) return
  try {
    sentry.addBreadcrumb({
      category: 'funnel',
      message: event,
      data: props,
      level: 'info',
    })
  } catch { /* no-op */ }
}
```
E chiamarlo dentro `track()`.

### 5. Configurare env var

In `.env`:
```
NUXT_PUBLIC_SENTRY_DSN=https://<key>@<project>.ingest.sentry.io/<id>
NUXT_PUBLIC_SENTRY_ENV=production
NUXT_PUBLIC_SENTRY_RELEASE=<git-sha>
```

Senza `NUXT_PUBLIC_SENTRY_DSN` il plugin e' un no-op completo.

### 6. Verificare

- `npm run build` verde
- DevTools → Network filtrato su `ingest.sentry.io`: deve apparire un request
  POST `/api/.../store/` entro pochi secondi dopo un errore JS forzato
- Dashboard Sentry deve ricevere l'evento (timeout ~30s)
- Verificare sanitizzazione: forzare un errore su form login con password,
  controllare su Sentry che `request.data.password` sia ASSENTE
