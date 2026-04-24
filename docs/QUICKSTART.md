# Quickstart — Setup locale in 15 minuti

Guida lampo per avviare SpediamoFacile in locale. Target: dev junior alla prima clone.

> Tempo stimato: 15 minuti con connessione buona e prerequisiti gia' installati.

## Prerequisiti

Verifica di avere installato:

| Strumento      | Versione minima | Verifica                  |
|----------------|-----------------|---------------------------|
| PHP            | 8.3+            | `php -v`                  |
| Composer       | 2+              | `composer --version`      |
| Node.js        | 22+             | `node -v`                 |
| npm            | 10+             | `npm -v`                  |
| PostgreSQL     | 15+             | `psql --version`          |
| Redis          | 7+              | `redis-cli ping` -> PONG  |
| Git            | 2.40+           | `git --version`           |

Estensioni PHP richieste (su Debian/Ubuntu: `sudo apt install php8.3-<ext>`):

`pdo_pgsql`, `gd`, `redis`, `intl`, `mbstring`, `zip`, `curl`, `bcmath`.

Opzionali ma consigliati:

- **Caddy** (reverse proxy locale, domini HTTPS senza certificati self-signed)
- **Docker** (se preferisci PostgreSQL e Redis via container invece che installati)

## Setup passo-passo

### 1. Clone repository

```bash
git clone https://github.com/Boop91/spedizionefacile.git
cd spedizionefacile

# Installa hook Git root (lint-staged, commitlint)
npm install
```

### 2. Backend Laravel

```bash
cd laravel-spedizionefacile-main

# Copia template env -> .env
cp .env.example .env

# Genera APP_KEY
php artisan key:generate

# Installa dipendenze PHP
composer install

# Crea database (se PostgreSQL locale):
# createdb spedizionefacile

# Esegui migrazioni + seed (utenti test, coupon, articoli demo)
php artisan migrate:fresh --seed

# Avvia il server (porta 8000)
php artisan serve --port=8000

# Alternativa: in un altro terminale lancia anche la coda
php artisan queue:work --queue=default,emails,webhooks
```

Tienilo in esecuzione in un terminale dedicato.

### 3. Frontend Nuxt

In un nuovo terminale:

```bash
cd nuxt-spedizionefacile-master

# Copia template env
cp .env.example .env

# Installa dipendenze Node
npm ci

# Dev server (porta 8787, hot reload)
npm run dev
```

Apri il browser: [http://localhost:8787](http://localhost:8787).

### 4. Account di test

Lo `DatabaseSeeder` crea tre utenti pronti:

| Ruolo        | Email                          | Password        |
|--------------|--------------------------------|-----------------|
| Admin        | admin@spediamofacile.it        | `Admin2026!`    |
| Cliente base | cliente@spediamofacile.it      | `Cliente2026!`  |
| Partner Pro  | pro@spediamofacile.it          | `Partner2026!`  |

Login via overlay `/autenticazione` o dal pulsante "Accedi" in navbar.

## Verifica rapida (smoke)

```bash
# Backend health
curl http://localhost:8000/api/health
# -> {"status":"ok","checks":{"db":"ok","redis":"ok"}}

# Frontend
curl -I http://localhost:8787
# -> HTTP/1.1 200 OK

# Test Playwright smoke (opzionale)
cd nuxt-spedizionefacile-master
npm run test:e2e -- --grep @smoke
```

## Troubleshooting

### `SQLSTATE[08006] connection refused`
Postgres non sta girando. Avvia `pg_ctl start` o `docker start pg` e riprova `php artisan migrate`.

### `Redis connection refused`
Controlla `redis-cli ping`. In Windows avvia Redis come servizio o usa Docker: `docker run -d -p 6379:6379 redis:7`.

### `EMFILE: too many open files` (Nuxt)
Aumenta il limite: `ulimit -n 8192` (macOS/Linux). Su Windows non applicabile.

### `Nuxt error: module not found` dopo pull
```bash
cd nuxt-spedizionefacile-master
rm -rf node_modules .nuxt
npm ci
```

### Stripe webhook non ricevuto in locale
Usa Stripe CLI:
```bash
stripe listen --forward-to localhost:8000/api/stripe/webhook
# Copia il "whsec_..." in laravel-spedizionefacile-main/.env come STRIPE_WEBHOOK_SECRET
```

### Porta 8787 / 8000 occupata
Scegli porta diversa:
- Nuxt: `npm run dev -- --port 8788`
- Laravel: `php artisan serve --port=8001` (aggiorna `apiBase` in `nuxt-spedizionefacile-master/.env`)

## Prossimi passi

- Leggi [`ARCHITECTURE.md`](./ARCHITECTURE.md) — 20 minuti, capisci il flusso dati.
- Leggi [`FRONTEND_STRUCTURE.md`](./FRONTEND_STRUCTURE.md) e [`BACKEND_STRUCTURE.md`](./BACKEND_STRUCTURE.md) — 15 minuti totali.
- Segui [`ONBOARDING.md`](./ONBOARDING.md) — checklist per il tuo primo PR.
- Se qualcosa non torna: [`DEBUGGING.md`](./DEBUGGING.md).

Setup completato. Benvenuto in SpediamoFacile.
