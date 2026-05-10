# CLAUDE.md

Istruzioni per Claude Code in questo repo.

## Stack

- **Backend** (root) — Laravel 11 + Sanctum 4 + Stripe SDK 18 + BRT REST 3.x
- **Frontend** (`apps/web/`) — Nuxt 4 + Vue 3.5 + Pinia 3 + Nuxt UI 4 + Tailwind 4
- **Proxy** — Caddy `:8787` → `:8000` (Laravel API) + `:3001` (Nuxt SPA)
- **DB** — SQLite dev / Postgres prod
- **Auth** — Sanctum SPA cookie httpOnly stessa origin (via Caddy, no CORS)

## Routing Caddy

```
/api/*  /sanctum/*  /storage/*  /auth/*  /webhooks/*  /stripe/*  → Laravel :8000
tutto il resto                                                    → Nuxt :3001
```

## Convenzioni

- **Prezzi** — backend in cents (`MyMoney`); frontend `(cents/100).toFixed(2) + ' €'`
- **Auth** — `useSanctumClient()` (mai `$fetch` raw senza credenziali)
- **Routes** — API in `routes/api/*.php`; `web.php` solo webhook + Sanctum CSRF + OAuth
- **Stringhe** — italiano per utente, english per identifier
- **Palette** — teal `#095866` + arancione `#E44203` + neutri (mai blu)
- **TypeScript** — TS in `composables/utils/stores/*.ts`; JS in `components/**/*.vue` + `pages/**/*.vue`

## Design system

**UNA sola strada per styling**: Tailwind utility + `Sf*` proprietari + Nuxt UI 4 primitive.

- CSS custom solo in `assets/css/main.css :root` token e `funnel-*.css` (Stripe-critical, intoccabili senza E2E)
- Token brand: `bg-brand-primary`, `bg-brand-accent`, `text-brand-text`, `bg-brand-card`, `border-brand-border`, `rounded-{button,control,card,pill}`, `shadow-sf-{sm,_,lg}`
- 25 componenti `Sf*` in `apps/web/components/sf/` (showcase live in `pages/__design-system.vue`)
- **MAI** `<style scoped>` con classi page-specific (`.account-*`, `.admin-*`, etc.)

## File critici (Stripe / soldi reali)

Modificare solo con E2E gating carta `4242 4242 4242 4242 09/30 123`:

```
app/Http/Controllers/Checkout/StripeCheckoutController.php   # PaymentIntent + 3DS
app/Http/Controllers/Checkout/StripeWebhookController.php    # firma + idempotency
app/Http/Controllers/Shipping/BrtWebhookController.php       # HMAC tracking
app/Services/StripePaymentService.php                        # idempotency-key
app/Services/OrderCreationService.php                        # Carrello → Order
app/Services/WalletOrderPaymentService.php                   # lock saldo
app/Models/Order.php                                         # payableTotalCents()
bootstrap/app.php                                            # CSRF excl + statefulApi
```

## Limiti

- File runtime ≤ 400 LOC, Componente Vue ≤ 500, Page ≤ 400, Controller ≤ 200, Service ≤ 400
- Eccezioni inline con `// CRITICAL:` + motivazione

## DB::table() autorizzati

Solo per: pivot puri, Laravel internals (sessions/cache/jobs), bulk import (locations), lock pessimistici espliciti (`users` su Stripe/wallet), cleanup massivo (comandi console). Tutto il resto usa Eloquent.

## Test

```bash
php artisan test                            # 333+ test (--parallel richiede paratest 7.x)
cd apps/web && npm run build && npm run test
npx playwright test                         # E2E Stripe
```

## Regole AI

- Mai `git commit` senza permesso esplicito
- Italiano per commenti/docs/output utente
- Verifica con preview MCP dopo modifiche visibili
- Max 3 agent paralleli
- Standard UX: Awwwards / Baymard / NN Group
