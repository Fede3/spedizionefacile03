# Struttura del progetto

Questa guida spiega dove si trovano i file e come e' organizzato il codice.

---

## Vista dall'alto

```
spedizionefacile/
├── laravel-spedizionefacile-main/    # Backend (API, database, logica di business)
├── nuxt-spedizionefacile-master/     # Frontend (interfaccia utente, pagine)
├── scripts/                           # Script di utilita' (avvio, diagnosi)
├── Caddyfile                          # Configurazione reverse proxy
├── docs/                              # Documentazione (stai leggendo questa)
└── AGENTS.md                          # Istruzioni per agenti AI
```

---

## Backend Laravel

```
laravel-spedizionefacile-main/
├── app/
│   ├── Console/                # Comandi artisan personalizzati
│   ├── Events/                 # Eventi del sistema (OrderCreated, OrderPaid, ecc.)
│   ├── Http/
│   │   ├── Controllers/        # Controller: gestiscono le richieste HTTP
│   │   ├── Middleware/         # Middleware: controlli prima di ogni richiesta
│   │   ├── Requests/          # Form Request: regole di validazione
│   │   └── Resources/         # API Resource: formattazione risposte JSON
│   ├── Listeners/              # Listener: reagiscono agli eventi
│   ├── Mail/                   # Classi per le email (template + logica)
│   ├── Models/                 # Modelli: rappresentano le tabelle del database
│   ├── Providers/              # Provider: configurazione dei servizi
│   └── Services/               # Servizi: logica di business complessa (BrtService)
├── config/                     # File di configurazione
│   ├── mail.php               # Configurazione email
│   └── services.php           # Credenziali servizi esterni (Stripe, BRT, Google)
├── database/
│   ├── migrations/            # Migrazioni: struttura delle tabelle del database
│   └── database.sqlite        # Il file del database (creato al primo avvio)
├── resources/
│   └── views/                 # Template Blade (email, pagina di benvenuto)
├── routes/
│   ├── api.php                # Rotte API (/api/*): portafoglio, referral, admin
│   └── web.php                # Rotte web: autenticazione, carrello, ordini, BRT
├── storage/
│   └── logs/                  # Log dell'applicazione (errori, debug)
└── .env                       # Variabili d'ambiente (credenziali, configurazione)
```

### File chiave del backend

| File | Cosa fa |
|---|---|
| `routes/web.php` | Definisce TUTTE le rotte principali (autenticazione, carrello, ordini, BRT) |
| `routes/api.php` | Rotte API per portafoglio, referral, admin e logout |
| `app/Models/Order.php` | Modello ordine con stati e relazioni |
| `app/Models/User.php` | Modello utente con ruoli e portafoglio |
| `app/Models/Package.php` | Modello pacco con dimensioni e prezzi |
| `app/Services/BrtService.php` | Tutta la logica di comunicazione con BRT |
| `app/Http/Controllers/StripeController.php` | Gestione pagamenti Stripe |
| `app/Http/Controllers/SessionController.php` | Gestione sessione preventivo |
| `app/Providers/EventServiceProvider.php` | Registrazione eventi e listener |
| `config/services.php` | Credenziali per Stripe, BRT, Google |

---

## Frontend Nuxt

```
nuxt-spedizionefacile-master/
├── assets/
│   └── css/main.css           # Stili CSS globali
├── components/                 # Componenti riutilizzabili
│   ├── Header.vue             # Intestazione del sito
│   ├── Footer.vue             # Piede di pagina
│   ├── Navbar.vue             # Barra di navigazione
│   ├── Preventivo.vue         # Componente preventivo rapido
│   ├── Steps.vue              # Indicatore passi della spedizione
│   └── Homepage/              # Componenti specifici della homepage
│       ├── PreventivoRapido.vue
│       ├── Servizi.vue
│       ├── Recensioni.vue
│       └── LoghiPartner.vue
├── composables/                # Funzioni riutilizzabili (logica condivisa)
│   ├── useCart.js             # Gestione carrello (utente loggato e ospite)
│   ├── useSession.js          # Gestione sessione preventivo
│   └── useSmartValidation.js  # Validazione form intelligente
├── layouts/
│   └── default.vue            # Layout principale (header + contenuto + footer)
├── middleware/                 # Middleware di navigazione
│   ├── admin.js               # Blocca pagine admin per utenti normali
│   ├── email-verification.js  # Verifica che l'email sia confermata
│   └── shipment-validation.js # Valida i dati della spedizione
├── pages/                      # Pagine del sito (routing automatico)
│   ├── index.vue              # Homepage
│   ├── preventivo.vue         # Pagina preventivo
│   ├── carrello.vue           # Carrello
│   ├── checkout.vue           # Pagamento
│   ├── riepilogo.vue          # Riepilogo dopo il pagamento
│   ├── autenticazione.vue     # Login e registrazione
│   ├── la-tua-spedizione/
│   │   └── [step].vue         # Configurazione spedizione step-by-step
│   ├── account/               # Area personale utente
│   │   ├── index.vue          # Dashboard account
│   │   ├── profilo.vue        # Modifica profilo
│   │   ├── spedizioni/        # Lista e dettaglio spedizioni
│   │   ├── indirizzi/         # Rubrica indirizzi
│   │   ├── carte.vue          # Carte di credito salvate
│   │   ├── portafoglio.vue    # Portafoglio virtuale
│   │   └── amministrazione/   # Pannello admin
│   └── servizi/               # Pagine servizi
├── public/                     # File statici (immagini, icone, robots.txt)
├── stores/
│   └── userStore.js           # Store Pinia per i dati utente
├── nuxt.config.ts             # Configurazione principale Nuxt
└── .env                       # Variabili d'ambiente frontend
```

### File chiave del frontend

| File | Cosa fa |
|---|---|
| `nuxt.config.ts` | Configurazione Nuxt: moduli, SEO, autenticazione Sanctum |
| `pages/index.vue` | Homepage con preventivo rapido |
| `pages/la-tua-spedizione/[step].vue` | Configurazione spedizione multi-step |
| `pages/checkout.vue` | Pagina di pagamento |
| `pages/account/amministrazione/index.vue` | Pannello di amministrazione |
| `composables/useCart.js` | Logica del carrello |
| `composables/useSession.js` | Logica della sessione preventivo |
| `layouts/default.vue` | Layout con header e footer |

---

## Come comunicano frontend e backend

Il frontend Nuxt comunica con il backend Laravel tramite chiamate HTTP (API REST).

```
Frontend (browser)           Caddy (porta 8787)           Backend (porta 8000)
     │                            │                              │
     │ GET /api/session           │                              │
     │ ──────────────────────►    │  proxy /api/* ──────────►    │
     │                            │                              │
     │ ◄──────────────────────    │  ◄──────────────────────     │
     │ { data: { packages: [] }}  │                              │
```

L'autenticazione usa **Laravel Sanctum** con cookie di sessione:

1. Il frontend chiama `GET /sanctum/csrf-cookie` per ottenere il token CSRF
2. Il frontend chiama `POST /api/custom-login` con email e password
3. Da quel momento, tutte le richieste includono automaticamente il cookie di sessione

---

## Convenzioni di naming

- **Controller**: `NomeController.php` (PascalCase)
- **Model**: `NomeModello.php` (PascalCase, singolare)
- **Migration**: `2026_02_13_200000_descrizione.php` (data + underscore)
- **Event**: `NomeEvento.php` (PascalCase)
- **Listener**: `NomeListener.php` (PascalCase)
- **Pagine Nuxt**: `nome-pagina.vue` (kebab-case)
- **Componenti**: `NomeComponente.vue` (PascalCase)
- **Composable**: `useNomeFunzione.js` (camelCase con prefisso `use`)

---

## Prossimo passo

Vai a [Primo cambiamento](04-PRIMO-CAMBIAMENTO.md) per fare la prima modifica al codice.
