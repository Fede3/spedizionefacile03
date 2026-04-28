# SpediamoFacile — Repo Status

**Aggiornato**: 2026-04-26 — versione post-refactor 8 round.

Documento unico di onboarding. Da leggere in 30 minuti per orientarsi.

## 1. Cosa fa

Piattaforma di intermediazione spedizioni BRT per PMI e privati italiani.
Tre prodotti coesistono in 1 monorepo:

1. **Sito vetrina + funnel ordine** (preventivo rapido → 4 step checkout → pagamento Stripe/bonifico/wallet)
2. **Area cliente** (account, ordini, indirizzi, wallet, fatture, GDPR)
3. **Console admin** (gestione ordini, utenti, prezzi, supplementi, bonifici, audit)

## 2. Stack

- **Frontend**: Nuxt 4.1 + Vue 3.5 + Pinia 3 + Tailwind CSS 4 + Nuxt UI 4
- **Backend**: Laravel 11 + Sanctum 4 (cookie SPA auth + CSRF) + PostgreSQL/SQLite
- **Pagamenti**: Stripe SDK 18 (PaymentIntent + 3DS + idempotency keys)
- **Spedizioni**: BRT REST 3.x (etichette PDF, tracking webhook HMAC, PUDO)
- **Money**: moneyphp/money (cents storage, conversione frontend con `formatPrice(/100)`)
- **Test**: Playwright (E2E) + Vitest (unit) frontend, Pest/PHPUnit backend

## 3. Struttura repo

```
spedizionefacile/
├── nuxt-spedizionefacile-master/   # Frontend Nuxt
├── laravel-spedizionefacile-main/  # Backend Laravel
├── docs/                           # Documentazione canonical
├── infra/                          # Caddy config
├── scripts/                        # Tooling locale
├── .github/workflows/              # CI/CD
└── .husky/                         # Pre-commit hooks
```

I suffissi `-master`/`-main` sono ereditati da zip GitHub. Una pulizia successiva dovrebbe rinominare in `apps/web/` + `apps/api/` con workspace pnpm.

## 4. Setup locale (5 minuti)

```bash
# 1. Frontend
cd nuxt-spedizionefacile-master
npm install
cp .env.example .env
npm run dev   # http://localhost:3000

# 2. Backend (altro terminale)
cd laravel-spedizionefacile-main
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve   # http://localhost:8000
```

## 5. Architettura frontend (orientarsi in 5 min)

```
nuxt-spedizionefacile-master/
├── pages/              # Routing (1 file = 1 rotta)
│   ├── index.vue                  # Home + form preventivo
│   ├── la-tua-spedizione/[step].vue  # Funnel 4 step
│   ├── carrello.vue               # Cart pre-checkout
│   ├── account/                   # Area cliente
│   └── account/amministrazione/   # Console admin
├── components/         # Vue components (organizzati per dominio)
│   ├── auth/, checkout/, shipment/, account/, admin/, pudo/, tracking/
├── composables/        # Logica riusabile (35 file)
│   ├── useFunnel*      # Helper funnel
│   ├── usePreventivo   # Form home
│   ├── useCart, usePudo, usePayment   # Orchestrazione store
│   └── useAdmin*       # Composables admin
├── stores/             # Pinia state (12 store atomici)
│   ├── shipmentFlowStore.js       # State funnel ordine
│   ├── cartStore.ts, pudoStore.ts, paymentStore.ts
│   ├── preventivoStore.ts         # Form preventivo home
│   ├── admin/                     # 4 admin store (pricing, supplements, services, promos)
│   ├── authModalStore.ts, confirmDialogStore.ts
├── utils/              # Pure functions (cents conversion, date format, helpers)
├── middleware/         # Route guards (admin, shipment-validation)
├── plugins/            # Auto-init (sanctum 401 handler, ecc.)
├── server/             # Nitro server middleware (security headers)
├── assets/css/         # ~43 file CSS (consolidati da 90)
└── tests/              # Playwright E2E + Vitest unit
```

### Pattern store + composable

- **Store Pinia**: state reattivo (refs + computed) + actions pure (CRUD locale, mutations)
- **Composable**: orchestrazione che dipende da Vue context (router, auth, sanctum, side effects, cart-aware logic)

Esempio:
```vue
<script setup>
const cart = useCartStore()                    // state
const { items, total } = storeToRefs(cart)
const { startCheckout } = useCart()            // orchestrazione (auth retry, sanctum)
</script>
```

## 6. Architettura backend (orientarsi in 5 min)

```
laravel-spedizionefacile-main/
├── app/
│   ├── Http/Controllers/    # 47 controller flat (TODO: modular monolith)
│   │   ├── StripeCheckoutController.php   # Pagamento
│   │   ├── StripeWebhookController.php    # Webhook idempotenti
│   │   ├── BrtController.php              # Tracking + PUDO
│   │   ├── OrderController.php
│   │   ├── Admin/                         # Console admin
│   ├── Models/              # 26 Eloquent (Order, User, Cart, Wallet, ecc.)
│   ├── Services/            # Business logic
│   │   ├── Brt/             # BRT API + bordereau PDF
│   │   ├── StripePaymentService.php
│   │   ├── CheckoutSubmissionContextService.php
│   ├── Http/Requests/       # 62 Form Request (validazione)
│   ├── Http/Resources/      # API Resources (OrderResource, UserResource)
│   ├── Policies/            # 20 Policy (ownership + admin checks)
│   ├── Events/Listeners/    # Eventi domain (ordine creato, payment riuscito)
│   ├── Jobs/                # Queue jobs (label PDF, mail)
├── routes/
│   ├── api/                 # 9 file route (auth, cart, orders, stripe, brt, admin, ...)
│   ├── web.php              # Webhook BRT (signed)
├── database/migrations/     # 82 migration storiche
└── tests/                   # PHPUnit + Pest
```

## 7. Boundary del codice (cosa va dove)

| Che cosa | Dove va |
|---|---|
| State condiviso tra pages/components | `stores/<dominio>Store.ts` (Pinia) |
| Orchestrazione che dipende da Vue context | `composables/use<Dominio>.js` |
| Pure utility framework-agnostic | `utils/<dominio>.ts` |
| Component dominio-specifico | `components/<dominio>/<Nome>.vue` |
| Route protette per ruolo | `middleware/<nome>.ts` |
| Route pubbliche/admin separate | `pages/<area>/...` (folder routing Nuxt) |
| Validation backend | `app/Http/Requests/<Nome>Request.php` |
| Authorization backend | `app/Policies/<Modello>Policy.php` |
| Logica business backend | `app/Services/<Nome>Service.php` |

## 8. Sicurezza

- **Auth**: Sanctum cookie SPA + CSRF → cookie HttpOnly + `secure: true` in production
- **Stripe webhook**: signature verification + idempotency via `StripeWebhookEvent::markAsProcessed()`
- **Rate limit**: throttle Laravel su `/api/forgot-password` (5/min), `/api/login` (10/min), `/api/session/reset` (10/min)
- **CSP + security headers**: `server/middleware/security-headers.ts` con HSTS production
- **GDPR**: 5 Policy + endpoint export/delete + GDPR_COMPLETO.md
- **401 handler globale**: `plugins/20.auth-401-handler.client.js` riapre auth modal automaticamente

## 9. Testing

```bash
# Frontend
cd nuxt-spedizionefacile-master
npx vitest run              # 288/288 unit
npx playwright test         # E2E (richiede dev server)

# Backend
cd laravel-spedizionefacile-main
php artisan test            # 95 unit
```

### Stripe sandbox

Carta test: `4242 4242 4242 4242 09/30 123` (sandbox `pk_test_*`).
Iframe Stripe Elements è cross-origin → fillabile solo con click umano. Per test programmatici via API usare `pm_card_visa`.

## 10. Metriche correnti

| Metrica | Valore |
|---|---|
| Build production | ✅ 34.1 MB / 12.3 MB gzip |
| Tests | ✅ 288/288 frontend + 95 backend |
| God file > 1000 LOC | 0 |
| Branch git | 1 (main) |
| Composables | 35 |
| Store Pinia | 12 atomici |
| File CSS | 43 |
| LOC frontend | ~85K |
| LOC backend | ~21K |

## 11. Cosa manca per "100% agency-grade"

1. **Rinaming root** `nuxt-spedizionefacile-master/` → `apps/web/`, `laravel-spedizionefacile-main/` → `apps/api/` (richiede update CI/deploy/scripts in 200+ path)
2. **Modular monolith backend**: `app/Modules/{Cart,Checkout,Brt,Wallet,Admin,Gdpr}/` invece di 47 controller flat
3. **CSS consolidamento finale**: 43 → 12 file (richiede testing visivo per ogni pagina)
4. **Compilazione `app.config.ts.legal`**: P.IVA, REA, sede legale, PEC reali
5. **Push 100+ commit a origin** (bloccato per Figma token storico — richiede rotazione)

## 12. Convenzioni

- **Italiano**: commenti, doc, commit message, lessico business
- **Cents**: prezzi backend in cents (MoneyPhp), frontend `formatPrice()` divide per 100
- **Sanctum cookie**: usa `useSanctumClient()` per chiamate API, no `$fetch` raw
- **Niente blu**: palette teal `#095866` + arancione `#E44203` + neutri (no `blue-*`/`indigo-*`/`sky-*` Tailwind)
- **Token CSS**: `var(--color-brand-*)` invece di hex hardcoded
- **Pre-commit**: husky + lint-staged + pint (PHP) + eslint + prettier

## 13. Per nuovi dev

1. Leggi questo file
2. `docs/QUICKSTART.md` per setup
3. `docs/ARCHITECTURE.md` per dettagli design
4. `docs/adr/` per decisioni storiche (Sanctum, MoneyPhp, BRT direct)
5. `docs/legal/SECURITY.md` + `docs/legal/GDPR_COMPLETO.md` se tocchi auth/dati personali
6. Per modificare il funnel: parti da `pages/la-tua-spedizione/[step].vue` + `stores/shipmentFlowStore.js`
7. Per modificare il pagamento: `composables/usePayment.js` + `stores/paymentStore.ts` + `app/Http/Controllers/StripeCheckoutController.php`
