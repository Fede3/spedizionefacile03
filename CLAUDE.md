# CLAUDE.md — Istruzioni per Claude Code in questo repo

> SpediamoFacile v2.0 — monolite Laravel 11 + Inertia 2 + Vue 3.5 + Tailwind 4.
> Letto automaticamente da Claude Code all'apertura del progetto.

## Stack (post rewrite 2026-04-28)

- **Backend + Frontend in 1 repo**: `apps/api/` (Laravel 11 + Inertia 2 + Vue 3.5 + Tailwind 4)
- **Auth**: Laravel Auth standard + Sanctum (carte salvate Stripe)
- **DB**: SQLite dev / Postgres prod (parity via Eloquent)
- **Build**: Vite 5 (1 bundle, no Nitro, no Nuxt)
- **Pagamenti**: Stripe SDK 18 (Elements per Payment Intent + idempotency)
- **Corriere**: BRT REST 3.x via `App\Services\Brt\*`
- **Docs**: `docs/` (4 doc canonici + ADR + operations + reference + legal)

## Quickstart

```bash
cd apps/api
composer install
npm install
cp .env.example .env && php artisan key:generate
php artisan migrate:fresh --seed
npm run dev          # terminale 1 (Vite HMR)
php artisan serve    # terminale 2 (Laravel :8000)
# apri http://localhost:8000
```

Onboarding completo: `docs/ONBOARDING.md` (~20 minuti).

## Convenzioni codice

- **Prezzi**: backend in cents (`MyMoney` / moneyphp). Frontend mostra `(cents/100).toFixed(2) + ' €'`.
- **Auth Inertia**: utente in `usePage().props.auth.user`. Niente `$fetch` raw, niente fetch axios per dati pagina (Inertia li passa via props).
- **Form**: `useForm()` di `@inertiajs/vue3`, errori in `form.errors.<field>`.
- **Routes**: tutte in `routes/web.php` (Inertia). API legacy in `routes/api.php` per webhook + integrazioni esterne.
- **Components**: in `resources/js/Components/`, importati esplicitamente nei Pages (no auto-import magici).
- **Pages**: in `resources/js/Pages/`, una per route, layout default `AppLayout.vue`.
- **Palette**: teal `#095866` + arancione `#E44203` + neutri. **Mai blu** (no `blue-*`, `indigo-*`, `sky-*`, `slate-*`).
- **CSS**: solo Tailwind 4 utility + tokens `@theme` in `resources/css/app.css`. No file CSS custom per pagina.
- **Italiano** per stringhe utente (commenti, label, errori). **English** per identifier (variabili, funzioni, tabelle).

## File critici (idempotency / soldi reali)

Modificare solo con E2E gating Stripe (`4242 4242 4242 4242 09/30 123`):

- `app/Http/Controllers/Checkout/StripeCheckoutController.php` — PaymentIntent + 3DS
- `app/Http/Controllers/Checkout/StripeWebhookController.php` — firma + idempotency
- `app/Services/StripePaymentService.php` — client Stripe + idempotency-key
- `app/Services/OrderCreationService.php` — Carrello → Order
- `app/Services/WalletOrderPaymentService.php` — lock saldo wallet
- `app/Models/Order.php` — `payableTotalCents()` autorità fatturazione
- `app/Http/Controllers/Shipping/BrtWebhookController.php` — HMAC tracking
- `bootstrap/app.php` — esclusioni CSRF webhook, trustProxies

## Limiti dimensionali

- File runtime ≤ 400 LOC.
- Componente Vue ≤ 500 LOC.
- Page Vue ≤ 400 LOC.
- Controller ≤ 200 LOC.
- Service ≤ 400 LOC.

Eccezioni documentate inline con `// CRITICAL:` + motivazione.

## DB::table() autorizzati

Pivot pure (`cart_user`, `package_order`, `saved_shipments`), Laravel internals
(`password_reset_tokens`, `sessions`, `cache`, `jobs`), bulk import (`locations`),
lock esplicito Stripe (`users` con `lockForUpdate`).

## Test

- Backend: `cd apps/api && php artisan test`
- Frontend: build verifica via `npm run build`
- E2E: Playwright in `apps/api/tests/e2e/` (in fase di port da Nuxt → Inertia)

## Regole AI

- **Mai `git commit` senza permesso esplicito utente** (eccezione: rewrite session 2026-04-28 con autorizzazione blanket).
- **Italiano** per commenti, doc, output.
- **Verifica con preview MCP** dopo ogni modifica visibile.
- **Max 3 agent paralleli**.
- **Standard UX**: Awwwards / Baymard / NN Group.
