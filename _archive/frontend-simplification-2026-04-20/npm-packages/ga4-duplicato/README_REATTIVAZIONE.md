# Riattivazione GA4 (Google Analytics 4 / gtag)

Data archiviazione: 2026-04-20
Agente: O1-A4 (Ondata 1 — semplificazione frontend)

## Perché è stato archiviato

GA4 era un analytics duplicato rispetto a Plausible: ogni evento funnel
(`preventivo_start`, `auth_login`, `payment_success`, etc.) veniva inoltrato
a entrambi i sink. Plausible copre già il 100% dei bisogni analitici di
SpediamoFacile (funnel, traffico, referrer, device) senza cookie e con
compliance GDPR nativa. GA4 aggiungeva:

- peso di bundle (script gtag.js remoto + Consent Mode v2 logic)
- attriti GDPR (cookie banner, Consent Mode default denied)
- dipendenza da Google Tag Manager (attack surface CSP)
- complessita' in `useFunnelAnalytics` e `useEcommerceAnalytics`

Risultato: zero valore incrementale per la business, duplicazione costante.

## File archiviati in questa cartella

- `gtag.client.ts.original` — plugin Nuxt che inizializzava gtag + Consent Mode v2
- `useEcommerceAnalytics.ts.original` — composable eventi e-commerce standard
  (`view_item`, `add_to_cart`, `begin_checkout`, `add_payment_info`, `purchase`)

## Cosa e' stato rimosso nel codebase

1. `plugins/gtag.client.ts` — rimosso (originale qui)
2. `composables/useEcommerceAnalytics.ts` — sostituito con shim no-op che
   preserva la firma pubblica (per non rompere i chiamanti)
3. `composables/useFunnelAnalytics.ts` — rimossa funzione `sendToGA4` e
   chiamata a `window.gtag`. Ora invia solo a Plausible.
4. `composables/usePayment.js` — rimosse chiamate a `window.gtag('event', 'purchase')`
   in `onPaymentSuccess()` e `window.gtag('event', 'begin_checkout')` in
   `trackBeginCheckout()`. Sostituiti con commento `// GA4 archiviato`.
5. `nuxt.config.ts`:
   - `runtimeConfig.public.gaId` commentato
   - CSP `script-src`: rimossa `https://www.googletagmanager.com`
   - CSP `connect-src`: rimosse `https://www.google-analytics.com`,
     `https://*.analytics.google.com`

## Come riattivare

Se in futuro il marketing richiede GA4 (es. Google Ads conversion tracking,
retargeting audiences):

### 1. Ripristinare plugin e composable

```bash
cp _archive/frontend-simplification-2026-04-20/npm-packages/ga4-duplicato/gtag.client.ts.original \
   nuxt-spedizionefacile-master/plugins/gtag.client.ts

cp _archive/frontend-simplification-2026-04-20/npm-packages/ga4-duplicato/useEcommerceAnalytics.ts.original \
   nuxt-spedizionefacile-master/composables/useEcommerceAnalytics.ts
```

### 2. Ripristinare `nuxt.config.ts`

In `runtimeConfig.public`:
```ts
gaId: process.env.NUXT_PUBLIC_GA_ID || '',
```

In `security.headers.contentSecurityPolicy.script-src` (PROD + DEV): aggiungere
`'https://www.googletagmanager.com'`.

In `security.headers.contentSecurityPolicy.connect-src` (PROD + DEV): aggiungere
`'https://www.google-analytics.com'`, `'https://*.analytics.google.com'`.

### 3. Ripristinare hook in `useFunnelAnalytics.ts`

Riaggiungere dentro `useFunnelAnalytics`:
```ts
const sendToGA4 = (event: string, props?: FunnelProps): void => {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  try {
    window.gtag('event', event, props || {})
  } catch { /* no-op */ }
}
```
E chiamarlo dentro `track()` accanto a `sendToPlausible(event, props)`.

Aggiungere alla dichiarazione `declare global { interface Window { ... } }`:
```ts
gtag?: (...args: unknown[]) => void
```

### 4. Ripristinare hook in `usePayment.js`

Riaggiungere in `onPaymentSuccess()`:
```js
try {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'purchase', {
      transaction_id: String(orderId),
      value: Number(cart.finalTotal?.value ?? 0),
      currency: 'EUR',
      payment_type: method,
    })
  }
} catch { /* analytics non bloccante */ }
```

E in `trackBeginCheckout()`:
```js
try {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'begin_checkout', {
      value: Number(cart.finalTotal?.value ?? 0),
      currency: 'EUR',
    })
  }
} catch { /* analytics non bloccante */ }
```

### 5. Configurare env var

Aggiungere in `.env` (o config deploy):
```
NUXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

Senza la var il plugin e' un no-op completo (hard guard).

### 6. Verificare

- `npm run build` verde
- Aprire DevTools → Network: filtrare `google-analytics.com` + `googletagmanager.com`
- Aprire DevTools → Application → Cookies: verificare che `_ga` e `_ga_*`
  siano droppati SOLO dopo consent "all" nel CookieBanner
- Verificare RealTime report GA4: deve mostrare la sessione entro 1 minuto
