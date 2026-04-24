# Riattivazione Web Vitals (web-vitals v4 + plugin)

Data archiviazione: 2026-04-20
Agente: O1-A4 (Ondata 1 — semplificazione frontend)

## Perché è stato archiviato

Il plugin `web-vitals.client.ts` + composable `useWebVitals.ts` emettevano
LCP, INP, CLS, FCP, TTFB verso due sink:
- Sentry frontend (archiviato contestualmente — vedi `../sentry-frontend/`)
- GA4 custom event "Web Vitals" (archiviato contestualmente — vedi `../ga4-duplicato/`)

Senza Sentry e senza GA4, i sink destinatari non esistono piu'. Tenere il
plugin in vita produrrebbe solo `console.debug` in dev (inutile in prod) e
bundle extra (`web-vitals` v4 pesa ~3.5 KB gzipped).

In alternativa Plausible offre metriche Core Web Vitals nativamente come
add-on ("Web Vitals" plan), senza codice custom lato client.

## File archiviati in questa cartella

- `web-vitals.client.ts.original` — plugin Nuxt che invocava `trackWebVitals()`
  al mount
- `useWebVitals.ts.original` — composable con import dinamico di
  `onLCP/onINP/onCLS/onFCP/onTTFB` da `web-vitals` v4, wrap con sink Sentry+GA4

## Cosa e' stato rimosso nel codebase

1. `plugins/web-vitals.client.ts` — rimosso
2. `composables/useWebVitals.ts` — rimosso
3. `package.json` — rimossa dependency `"web-vitals": "^4.2.4"`

## Come riattivare

### 1. Reinstallare il pacchetto

```bash
cd nuxt-spedizionefacile-master
npm install web-vitals@^4.2.4
```

### 2. Ripristinare plugin + composable

```bash
cp _archive/frontend-simplification-2026-04-20/npm-packages/web-vitals-plugin/web-vitals.client.ts.original \
   nuxt-spedizionefacile-master/plugins/web-vitals.client.ts

cp _archive/frontend-simplification-2026-04-20/npm-packages/web-vitals-plugin/useWebVitals.ts.original \
   nuxt-spedizionefacile-master/composables/useWebVitals.ts
```

### 3. Verificare sink disponibili

Il composable nell'originale usa `nuxtApp.$sentry.setMeasurement(...)` e
`window.gtag(...)`. Se NON si riattiva contestualmente Sentry o GA4, i sink
restano no-op (i guard `typeof !== 'function'` proteggono). In quel caso
considerare:
- aggiungere sink Plausible custom: `window.plausible('WebVitals', { props: { name, value } })`
  (Plausible accetta solo scalari, value va in integer, cap a 50 props)
- oppure inviare a endpoint custom `/api/webvitals` per storage server-side

### 4. Verificare

- `npm run build` verde
- Aprire pagina in Chrome Incognito, naviga qualche link, poi chiudi la tab:
  al `visibilitychange` la libreria flushea LCP+CLS+INP finali
- Se Sentry attivo: dashboard Sentry → Performance → custom measurements
- Se GA4 attivo: GA4 DebugView → event `LCP`, `CLS`, `INP`
- In dev: console mostra `[WebVitals] LCP=1234.56 (good)` etc.
