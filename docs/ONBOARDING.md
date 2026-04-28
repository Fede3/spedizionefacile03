# Onboarding — SpediamoFacile v2

Tempo stimato: **20 minuti** dal clone al primo render.

## Cosa fa il sito (1 min)

Intermediario BRT per spedizioni Italia/EU. Utente fa preventivo (CAP partenza
+ destinazione + peso + dimensioni), aggiunge servizi extra, paga (Stripe /
bonifico / wallet), BRT ritira a domicilio e consegna. Wallet, fatture,
admin panel completo.

## Stack (1 min)

```
Browser ─→ Laravel :8000 (root: resources/views/app.blade.php Inertia)
              │
              ├─→ Inertia 2 + Vue 3.5 + Tailwind 4 (resources/js/Pages/)
              ├─→ SQLite dev / Postgres prod
              ├─→ Stripe API (idempotency + 3DS)
              └─→ BRT REST 3.x (PUDO + tracking + label)
```

Niente Nuxt, niente SSR esterno, niente monorepo: **1 process Laravel + 1 build Vite**.

## Setup (10 min)

```bash
git clone <repo> spediamofacile && cd spediamofacile
cd apps/api

# Backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed

# Frontend (stesso project root!)
npm install
npm run build              # production build
# OPPURE in dev:
npm run dev &              # Vite HMR su :5173
php artisan serve &        # Laravel su :8000

# Apri browser
open http://localhost:8000
```

## Flow del codice (5 min)

```
1. Browser GET /preventivo
2. Laravel routes/web.php → InertiaShipmentController@preventivo
3. Inertia::render('Shipment/Preventivo', [...props])
4. Inertia restituisce HTML iniziale + JSON props
5. Vue mounta Pages/Shipment/Preventivo.vue con props
6. Layout default: Layouts/AppLayout.vue (header/footer)
7. Form usa useForm() Inertia → POST → controller → redirect
```

## I 5 errori che farai

1. **Cercare composables/stores Pinia frontend**: non esistono più. Stato
   passa via Inertia props o `useForm()`. Pagine sono "dumb".
2. **`$fetch` o axios per dati pagina**: usa `Inertia::render(...)`. axios
   solo per chiamate AJAX puntuali (es. calcolo prezzo).
3. **Toccare i file critici Stripe** senza E2E gating con carta test
   `4242 4242 4242 4242 09/30 123`. Vedi CLAUDE.md "File critici".
4. **`blue-*` Tailwind**: la palette è teal `#095866` + arancione `#E44203`.
5. **Dimenticare cents**: backend ritorna `payable_total_cents`, mostra
   `(value/100).toFixed(2).replace('.', ',') + ' €'`.

## Struttura cartelle

```
apps/api/
├── app/
│   ├── Http/
│   │   ├── Controllers/        ← Inertia + API legacy
│   │   │   ├── Inertia*.php    ← Auth, Account, Admin, Checkout, Shipment
│   │   │   ├── Pages/          ← static pages
│   │   │   └── ...             ← domain controllers (Auth, Cart, Stripe...)
│   │   ├── Middleware/HandleInertiaRequests.php  ← shared props
│   │   └── Requests/           ← FormRequest validation
│   ├── Models/                 ← Eloquent
│   └── Services/               ← business logic (Stripe, BRT, Order)
├── resources/
│   ├── css/app.css             ← Tailwind 4 + tokens brand
│   ├── js/
│   │   ├── app.js              ← Inertia bootstrap
│   │   ├── Layouts/AppLayout.vue
│   │   ├── Pages/              ← una page per route
│   │   │   ├── Home.vue
│   │   │   ├── Auth/           ← Login, Register, ForgotPassword, ResetPassword, VerifyEmail
│   │   │   ├── Account/        ← Dashboard, Spedizioni, Profilo, Indirizzi, Fatture, Portafoglio, Assistenza
│   │   │   ├── Account/Admin/  ← Dashboard, Ordini, Utenti, Bonifici, Prezzi, Impostazioni
│   │   │   ├── Shipment/       ← Preventivo, Funnel
│   │   │   ├── Checkout/       ← Carrello, Success
│   │   │   └── Static/         ← ChiSiamo, Contatti, Faq, Privacy, Cookie, Termini, Servizi, Traccia, Guide
│   │   └── Components/         ← componenti riusabili
│   └── views/app.blade.php     ← root Inertia
└── routes/
    ├── web.php                 ← rotte Inertia (tutto il sito)
    └── api.php                 ← API legacy (webhook + integrazioni)
```

## Comandi utili

```bash
php artisan route:list           # tutte le rotte
php artisan tinker               # REPL Eloquent
php artisan test --filter=...    # test backend specifici
npm run build                    # build production frontend
composer dump-autoload           # ricarica classmap dopo nuovi file
```

## File da leggere PRIMA di scrivere codice

1. `CLAUDE.md` — convenzioni
2. `routes/web.php` — capire mapping route → controller → page
3. `resources/js/Layouts/AppLayout.vue` — header/footer comuni
4. `app/Http/Controllers/InertiaShipmentController.php` — esempio controller Inertia
5. `resources/js/Pages/Shipment/Funnel.vue` — esempio page complessa con stepper

Buon lavoro.
