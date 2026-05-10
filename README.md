# SpediamoFacile

Intermediario BRT: preventivo, funnel spedizione, carrello, pagamento (Stripe / bonifico / wallet), account cliente, admin, coupon/referral, PUDO, tracking, fatturazione.

## Stack

- **Backend** — Laravel 11 + Sanctum 4 SPA + Stripe SDK 18 + BRT REST 3.x
- **Frontend** — Nuxt 4 + Vue 3.5 + Pinia + Nuxt UI 4 + Tailwind 4 (in `apps/web/`)
- **Proxy** — Caddy `:8787` → Laravel `:8000` (API) + Nuxt `:3001` (SPA)
- **DB** — SQLite (dev) / Postgres (prod)
- **Test** — PHPUnit (BE) + Vitest (FE unit) + Playwright (E2E)

## Quickstart

```bash
git clone <repo> && cd spedizionefacile

# Backend
composer install
cp .env.example .env && php artisan key:generate
touch database/database.sqlite
php artisan migrate:fresh --seed

# Frontend
npm install --prefix apps/web

# Avvia 3 servizi (1 comando)
./scripts/avvia-locale.sh    # Linux/macOS
.\scripts\avvia-locale.ps1   # Windows PowerShell

# Apri http://127.0.0.1:8787
```

In manuale:
```bash
php artisan serve --port=8000              # API
npm run dev --prefix apps/web              # SPA :3001
caddy run --config infra/caddy/Caddyfile   # Proxy :8787
```

## Account demo (seeded)

| Email | Password | Ruolo |
|---|---|---|
| `admin@spediamofacile.it` | `Password1!` | Admin |
| `cliente@spediamofacile.it` | `Password1!` | Cliente |
| `pro@spediamofacile.it` | `Password1!` | Partner Pro |

## Test & Quality

```bash
php artisan test                            # PHPUnit (333+ test)
vendor/bin/pint --test                      # Code style PHP
vendor/bin/phpstan analyse                  # Static analysis

cd apps/web
npm run lint                                # ESLint
npm run typecheck                           # vue-tsc
npm run test:unit                           # Vitest
npm run build                               # Nitro build
npx playwright test                         # E2E (carta Stripe: 4242 4242 4242 4242 09/30 123)
```

## Convenzioni codice

Vedi **[CLAUDE.md](CLAUDE.md)** per istruzioni complete (palette, design system, naming, file critici Stripe-gated).

In sintesi:
- **Prezzi** in cents lato BE (`MyMoney`); frontend formatta `(cents/100).toFixed(2) + ' €'`
- **Auth Nuxt** via `useSanctumClient()` (mai `$fetch` raw)
- **Stringhe utente** italiano, **identifier** inglese
- **Palette** teal `#095866` + arancione `#E44203` + neutri (mai blu)
- **Design system** — Tailwind utility + componenti `Sf*` + Nuxt UI 4

## Routing

- **API**: `routes/api/*.php` (auth, cart, orders, payments, shipment, admin)
- **Webhook**: `routes/web.php` (Stripe `/stripe/webhook`, BRT `/webhooks/brt/tracking`)
- **Sanctum CSRF**: `/sanctum/csrf-cookie`

## File critici (Stripe / soldi reali)

Modificare solo con E2E gating carta `4242 4242 4242 4242 09/30 123`:

```
app/Http/Controllers/Checkout/StripeCheckoutController.php
app/Http/Controllers/Checkout/StripeWebhookController.php
app/Http/Controllers/Shipping/BrtWebhookController.php
app/Services/StripePaymentService.php
app/Services/OrderCreationService.php
app/Services/WalletOrderPaymentService.php
app/Models/Order.php
bootstrap/app.php
```

## License

Proprietario — vedi [`LICENSE`](LICENSE).
