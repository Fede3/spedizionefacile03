# Architecture — SpediamoFacile v2

## Sistema (1 process Laravel + 1 build Vite)

```
 +--------+        +--------------+        +-------------+
 |        |--HTTPS-|              |        |             |
 |Browser |        | Laravel :8000|--SQL-->| Postgres/   |
 |  Vue   |<--JSON-|   Inertia    |        | SQLite      |
 |  SPA   |        |   + Vite     |        |             |
 +--------+        |              |        +-------------+
                   |              |
                   |              |--HTTPS->+-----------+
                   |              |         | Stripe    |
                   |              |         | (Checkout |
                   |              |         |  hosted)  |
                   |              |         +-----------+
                   |              |
                   |              |--HTTPS->+-----------+
                   |              |         | BRT REST  |
                   +--------------+         | (3.x)     |
                                            +-----------+
```

## Stack tecnologico

- **Laravel 11** + Inertia 2 + Sanctum (Stripe Customer)
- **Vue 3.5** + Tailwind 4 (`@theme` tokens brand) + Vite 5
- **DB**: SQLite locale, Postgres 15 produzione (parity Eloquent)
- **Cache/Queue**: Redis 7 (file driver in dev)
- **Pagamenti**: Stripe Checkout Session (hosted, PCI scope ridotto)
- **Email**: SMTP via Laravel Mail
- **Tracking errori**: Sentry PHP SDK (DSN opzionale)

## Flusso utente

```
Browser GET / -> InertiaResponse Home.vue (props da PagesController)
Browser GET /preventivo -> Preventivo.vue (form inline POST /preventivo/calcola)
Browser POST /la-tua-spedizione/inizia -> Funnel.vue (4 step: colli, servizi, indirizzi, pagamento)
Browser POST /checkout/stripe -> Stripe Checkout hosted (redirect)
Stripe -> POST /stripe/webhook (firma + idempotency)
Browser GET /checkout/return?session_id=cs_... -> Success.vue
```

## Struttura cartelle

```
apps/api/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Inertia*.php        # Auth, Account, Admin, Checkout, Shipment
│   │   │   ├── PagesController     # static
│   │   │   ├── ServiziController   # /servizi + /servizi/{slug}
│   │   │   ├── Auth/               # API legacy (Sanctum mobile, SDK futuri)
│   │   │   ├── Cart/, Checkout/, Catalog/, Communication/  # API legacy
│   │   │   └── Shipping/           # BRT webhooks + endpoint
│   │   ├── Middleware/HandleInertiaRequests.php
│   │   └── Requests/               # FormRequest validation
│   ├── Models/                     # Eloquent (Order, User, Package, ...)
│   └── Services/                   # business logic (Stripe, BRT, Order, Wallet)
├── resources/
│   ├── css/app.css                 # Tailwind 4 + @theme tokens
│   ├── js/
│   │   ├── app.js                  # Inertia bootstrap
│   │   ├── Layouts/AppLayout.vue   # header/footer
│   │   ├── Pages/                  # 25 pages Inertia
│   │   └── Components/
│   └── views/app.blade.php         # root Inertia
├── routes/
│   ├── web.php                     # 100% Inertia
│   └── api.php                     # API legacy + webhook
└── database/
    ├── schema/sqlite-schema.sql    # baseline
    └── migrations/                 # post-MVP delta
```

## File critici (NON toccare senza E2E gating Stripe)

```
+--------------------------------------+    +-----------------------------------+
|  CHECKOUT                            |    |  PAYMENT/ORDER                    |
|  StripeCheckoutController.php        |    |  StripePaymentService.php         |
|  StripeWebhookController.php         |    |  OrderCreationService.php         |
|  StripeCheckoutSession.php (hosted)  |    |  WalletOrderPaymentService.php    |
|                                      |    |  Models/Order::payableTotalCents  |
|  TOCCARE SOLO CON:                   |    +-----------------------------------+
|  - carta test 4242 4242 4242 4242    |    +-----------------------------------+
|  - DB snapshot pre/post              |    |  BRT                              |
|  - rollback se diff                  |    |  BrtWebhookController (HMAC)      |
+--------------------------------------+    |  BrtController (etichette)        |
                                            +-----------------------------------+
```

## Riferimenti

- [`ONBOARDING.md`](./ONBOARDING.md) — primo giorno dev
- [`reference/API_CONTRACT.md`](./reference/API_CONTRACT.md) — endpoint webhook + API legacy
- [`operations/DEPLOY.md`](./operations/DEPLOY.md) — pipeline prod
- [`legal/SECURITY.md`](./legal/SECURITY.md) — OWASP baseline
- [`legal/GDPR_COMPLETO.md`](./legal/GDPR_COMPLETO.md) — compliance
- [`adr/`](./adr/) — decisioni tecniche storiche
