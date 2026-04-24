# Debugging — Troubleshooting dev

Manuale per quando qualcosa non funziona. Organizzato per sintomo, con causa probabile e fix.

## Log reading

### Laravel (backend)

- **Dove**: `laravel-spedizionefacile-main/storage/logs/laravel.log` in locale, stderr drain su Render in prod.
- **Formato**: timestamp + livello + messaggio + context JSON.
- **Follow live**: `tail -f storage/logs/laravel.log`
- **Grep errori recenti**: `grep ERROR storage/logs/laravel.log | tail -50`
- **Tinker** (REPL Laravel): `php artisan tinker` -> ispeziona modelli, `User::find(1)`, ecc.

### Nuxt (frontend)

- **Client**: DevTools -> Console. Sentry breadcrumbs mostrano la sequenza richieste.
- **Server SSR**: terminale in cui gira `npm run dev`. Errori SSR precedono "hydration mismatch".
- **Build**: `nuxt-spedizionefacile-master/build-*.log` (artifact CI).
- **Ispezionare runtime config**: `console.log(useRuntimeConfig())` in `app.vue`.

### Queue (Horizon)

- **Dev**: `http://localhost:8000/horizon` (richiede admin).
- **Failed jobs**: `php artisan queue:failed` -> `php artisan queue:retry <id>`.

## Sentry dashboard

Accesso: chiedi admin se non hai invito.

- **Issues** — tutti gli errori non gestiti. Filtri per env (prod/staging), progetto (backend/frontend), assignee.
- **Performance** — transazioni lente (P95/P99). Cerca `GET /api/cart`, `POST /api/stripe/create-payment-intent`.
- **Replays** — se abilitato, vedi la sessione utente dove si e' rotto.
- **Releases** — tagging automatico da CI. Errori vengono associati al release -> sai subito quale deploy li ha introdotti.
- **Alerts** — canale Slack `#alerts-prod`, trigger su nuovi issue o volumi anomali.

Trigger locale (per test): aggiungi `throw new \Exception('test sentry')` in un endpoint, chiamalo, verifica che compaia entro 30s in Sentry.

## Errori comuni

### Nuxt: CSP violation (Content Security Policy)

**Sintomo**: console `Refused to load <url> because it violates the following Content Security Policy directive...`.

**Causa**: `nuxt-security` blocca asset da host non in whitelist.

**Fix**:
1. Identifica la directive violata nel messaggio (`script-src`, `connect-src`, `img-src`).
2. Apri `nuxt-spedizionefacile-master/nuxt.config.ts` -> sezione `security.headers.contentSecurityPolicy`.
3. Aggiungi l'host a quella directive.
4. Riavvia dev server.

Evita `'unsafe-inline'` / `'unsafe-eval'` in produzione.

### 401 Unauthorized su endpoint Sanctum

**Sintomo**: `GET /api/user` o altro endpoint protetto restituisce 401 anche dopo login.

**Cause comuni**:
- Cookie `XSRF-TOKEN` / `laravel_session` non settati (CORS block).
- `SANCTUM_STATEFUL_DOMAINS` in backend non include il tuo frontend host.
- `SESSION_DOMAIN` mismatch tra back e front.

**Fix**:
1. DevTools -> Application -> Cookies: verifica presenza `XSRF-TOKEN` e `spediamofacile_session`.
2. Controlla `laravel-spedizionefacile-main/config/sanctum.php` -> `stateful` domains.
3. Controlla `laravel-spedizionefacile-main/.env`:
   ```
   SANCTUM_STATEFUL_DOMAINS=localhost:8787,127.0.0.1:8787
   SESSION_DOMAIN=localhost
   SESSION_SECURE_COOKIE=false  # true solo in HTTPS
   ```
4. Riavvia `php artisan config:clear` + `php artisan serve`.

### 419 Page Expired (CSRF token mismatch)

**Sintomo**: `POST /api/...` risponde 419.

**Causa**: header `X-XSRF-TOKEN` mancante o obsoleto.

**Fix**:
- `useSanctumClient()` legge il cookie automaticamente. Se usi `$fetch` raw, aggiungi tu:
  ```ts
  import { useCookie } from '#imports'
  const csrf = useCookie('XSRF-TOKEN').value
  await $fetch('/api/...', { headers: { 'X-XSRF-TOKEN': decodeURIComponent(csrf) } })
  ```
- Oppure chiama prima `GET /sanctum/csrf-cookie` per refresh.

### 422 Validation error

**Sintomo**: risposta JSON `{ "message": "...", "errors": { "field": ["error"] } }`.

**Causa**: FormRequest lato Laravel ha bocciato input.

**Fix**:
1. Apri il controller corrispondente -> trova il parametro FormRequest tipato.
2. Apri `app/Http/Requests/*Request.php` -> leggi `rules()`.
3. Compara con il body inviato (DevTools -> Network -> Request Payload).
4. Correggi payload o aggiusta rule se l'intent ha cambiato.

### Stripe webhook signature fail

**Sintomo**: Laravel log `Stripe\Exception\SignatureVerificationException`.

**Causa**: `STRIPE_WEBHOOK_SECRET` non combacia con il secret generato da Stripe CLI / dashboard.

**Fix locale**:
```bash
stripe listen --forward-to localhost:8000/api/stripe/webhook
# output: "Ready! Your webhook signing secret is whsec_..."
# copia in laravel-spedizionefacile-main/.env
STRIPE_WEBHOOK_SECRET=whsec_...
# riavvia php artisan serve
```

**Fix prod**:
- Stripe Dashboard -> Developers -> Webhooks -> endpoint -> "Reveal signing secret".
- Aggiorna env var in Render.

Se il body viene modificato (proxy, middleware, trailing slash), la firma fallisce anche col secret giusto. Verifica che raw body arrivi intatto.

### BRT HMAC signature fail

**Sintomo**: `BrtWebhookController` logga `Invalid HMAC signature`.

**Causa**: `BRT_WEBHOOK_SECRET` diverso da quello configurato in portale BRT.

**Fix**:
- Controlla `.env`: `BRT_WEBHOOK_SECRET=...`.
- Verifica che BRT sta usando lo stesso secret in [portale dev BRT -> Webhooks].
- L'algoritmo e' SHA256 su raw body -> base64 encoded (vedi `app/Services/Security/BrtHmacVerifier.php`).

### T3.6.5 route-state: shipment context perso al refresh

**Sintomo**: sei a step 4 (checkout), refreshi, torni a step 1 con preventivo vuoto.

**Causa**: `syncPaymentRouteContext` non ha persistito lo stato su storage sessione/localStorage.

**Fix**:
1. Apri `composables/useShipmentWizard.ts` (o `usePreventivo.ts`) -> cerca `syncPaymentRouteContext`.
2. Verifica che `sessionStorage.setItem('shipment:step', ...)` venga chiamato in ogni step.
3. Verifica hydrate dal plugin `01.user-store-hydrate.client.ts` -> deve ripristinare da sessionStorage prima di mount.

Workaround: togli cache browser + refresh -> `sessionStorage.clear()` in console.

## Performance troubleshooting

### Lighthouse low score

**Target**: LCP < 2.5s, INP < 200ms, CLS < 0.1, score mobile > 90.

**Strategie**:
1. `npm run build` + `npm run preview` -> misura con Lighthouse in Chrome DevTools.
2. Identifica critical rendering path. Split vendor chunk, lazy load immagini (`NuxtImg` con `loading="lazy"`).
3. Font loading: `@fontsource/*` gia' usa `font-display: swap`.
4. Verifica CSP non blocchi preload font/image.

### Web Vitals alerts

Dashboard Plausible -> Core Web Vitals. Trigger Sentry alert se P75 INP > 300ms sostenuto.

**Cause tipiche INP alta**:
- Main thread bloccato da JSON parsing grosso (dashboard admin con 1000 ordini).
- Reattivita' Vue su oggetti deep-nested -> passare a `shallowRef` / `markRaw`.
- CSS contain missing -> layout trashing.

### Backend slow queries

- `php artisan telescope` se installato mostra query N+1.
- Log Sentry: transazioni con `db.*` > 500ms.
- Fix tipici: `with()` eager load, indici mancanti (`EXPLAIN ANALYZE`), cache con Redis (`Cache::remember`).

## Redis / Queue non processa

**Sintomo**: job in queue ma workers fermi.

**Fix**:
1. `redis-cli ping` -> PONG. Se ko, riavvia Redis.
2. `php artisan queue:work --queue=default,emails,webhooks` in terminale dedicato.
3. Check `storage/logs/worker.log`.
4. Se i job finiscono in `failed_jobs` -> ispeziona errore: `php artisan queue:failed`.

## Database connection refused

**Sintomo**: `SQLSTATE[08006]` all'avvio.

**Fix**:
- `pg_isready -h 127.0.0.1 -p 5432` -> deve rispondere `accepting connections`.
- Controlla `.env`:
  ```
  DB_CONNECTION=pgsql
  DB_HOST=127.0.0.1
  DB_PORT=5432
  DB_DATABASE=spedizionefacile
  DB_USERNAME=postgres
  DB_PASSWORD=...
  ```
- Se usi Docker: `docker ps` + `docker logs <pg_container>`.

## Nuxt hot reload stuck

Riavvia con cache clear:
```bash
cd nuxt-spedizionefacile-master
rm -rf .nuxt .output node_modules/.vite
npm run dev
```

## Cookie non inviato cross-origin

**Sintomo**: in ambiente dove front e back sono su domini diversi.

**Fix**:
- Backend cookie deve essere `SameSite=None; Secure` (richiede HTTPS).
- Frontend `useFetch` / `useSanctumClient` usa `credentials: 'include'`.
- Verifica `Access-Control-Allow-Credentials: true` header.

## Monitoring in produzione

- **Render dashboard** -> Logs tab per tail stderr del service.
- **Sentry Issues** filtra `env:production`.
- **UptimeRobot** fa poll su `/api/health` ogni 60s — notifica se down.
- **Plausible** goals configurati (Purchase, Signup) -> alert se crollo vs baseline.

## Playwright E2E fallisce

**Debug locale**:
```bash
npm run test:e2e -- --headed --debug --grep "<test name>"
```
Si apre il browser. Puoi ispezionare DOM, tempo real.

Se test flake: aggiungi `await page.waitForLoadState('networkidle')` o selettore piu' specifico. Evita `setTimeout` arbitrari.

## Ultima risorsa

1. Verifica di essere su branch giusto: `git status`.
2. Pulisci tutto: `git stash`, `git clean -fdx`, reinstalla deps.
3. Compara `.env` con `.env.example` -> manca una chiave?
4. Ripristina DB: `php artisan migrate:fresh --seed`.
5. Se ancora ko, apri issue con:
   - Sistema operativo, versioni strumenti
   - Comando eseguito
   - Output completo errore
   - Cosa hai gia' provato

## Riferimenti

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — comprensione sistema
- [`API_CONTRACT.md`](./API_CONTRACT.md) — schema endpoint
- [`DEPLOY.md`](../DEPLOY.md) — pipeline prod e env vars
- [`QUICKSTART.md`](./QUICKSTART.md) — setup base
