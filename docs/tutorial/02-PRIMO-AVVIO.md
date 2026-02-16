# Primo avvio

Questa guida spiega come configurare e avviare il progetto SpedizioneFacile da zero.

---

## Prerequisiti

Prima di iniziare, assicurati di avere installato:

- **PHP 8.2+** con estensioni: `sqlite3`, `mbstring`, `openssl`, `curl`, `xml`
- **Composer** (gestore dipendenze PHP)
- **Node.js 18+** e **npm**
- **Caddy** (reverse proxy, opzionale ma consigliato)

---

## 1. Configurare il backend Laravel

### Installare le dipendenze PHP

```bash
cd laravel-spedizionefacile-main
composer install
```

### Creare il file .env

Copia il file di esempio e genera la chiave dell'applicazione:

```bash
cp .env.example .env
php artisan key:generate
```

### Configurare il database

Il progetto usa SQLite di default. Crea il file del database:

```bash
touch database/database.sqlite
php artisan migrate
```

Il file `.env.example` contiene gia' la configurazione per SQLite:

```env
DB_CONNECTION=sqlite
```

### Configurare le email (opzionale per lo sviluppo)

Per lo sviluppo locale, puoi usare il mailer `log` che scrive le email nei log invece di inviarle:

```env
MAIL_MAILER=log
```

Le email saranno visibili in `laravel-spedizionefacile-main/storage/logs/laravel.log`.

Per la produzione, vedi la guida [Configurare email](../guide/CONFIGURARE-EMAIL.md).

### Avviare il backend

```bash
php artisan serve
```

Il backend sara' disponibile su `http://127.0.0.1:8000`.

---

## 2. Configurare il frontend Nuxt

### Installare le dipendenze JavaScript

```bash
cd nuxt-spedizionefacile-master
npm install
```

### Creare il file .env

```bash
cp .env.example .env
```

Il file `.env.example` del frontend contiene:

```env
NUXT_PUBLIC_API_BASE=http://127.0.0.1:8787
NUXT_PUBLIC_STRIPE_KEY=
```

Se non usi Caddy, cambia `NUXT_PUBLIC_API_BASE` a `http://127.0.0.1:8000`.

### Avviare il frontend

```bash
npm run dev
```

Il frontend sara' disponibile su `http://127.0.0.1:3001`.

---

## 3. Configurare Caddy (consigliato)

Caddy unifica frontend e backend sulla stessa porta (8787), evitando problemi di CORS e cookie.

Il `Caddyfile` nella root del progetto e' gia' configurato:

```
:8787 {
    # Le richieste /api/* vanno al backend Laravel
    # Tutto il resto va al frontend Nuxt
}
```

Avvia Caddy:

```bash
caddy run
```

Il sito completo sara' disponibile su `http://127.0.0.1:8787`.

---

## 4. Configurazione CORS e Sanctum

Nel file `laravel-spedizionefacile-main/.env`, le variabili importanti per l'autenticazione sono:

```env
# Domini che possono usare l'autenticazione basata su cookie
SANCTUM_STATEFUL_DOMAINS=127.0.0.1:8787,localhost:8787,127.0.0.1:3001,localhost:3001

# Origini ammesse per le richieste CORS
CORS_ALLOWED_ORIGINS=http://127.0.0.1:8787,http://localhost:8787

# URL del frontend (per i link nelle email)
APP_FRONTEND_URL=http://127.0.0.1:3001
```

---

## 5. Script di avvio rapido

Il progetto include degli script che avviano tutto automaticamente.

### Windows

- `AVVIA_LOCALE.bat` - Avvia backend, frontend e Caddy insieme
- `CHIUDI_TUTTO.bat` - Chiude tutti i processi
- `PANNELLO.bat` / `PANNELLO.ps1` - Pannello di controllo interattivo

### Linux/Mac

- `scripts/avvia-locale.sh` - Avvia tutto in un colpo

---

## 6. Verifica che funzioni

1. Apri `http://127.0.0.1:8787` nel browser
2. Dovresti vedere la homepage di SpedizioneFacile
3. Prova a registrare un nuovo utente
4. Se usi `MAIL_MAILER=log`, controlla il codice di verifica nei log:
   ```bash
   tail -f laravel-spedizionefacile-main/storage/logs/laravel.log
   ```

---

## Configurazioni opzionali

Per un ambiente completo, configura anche:

- **Stripe** (pagamenti) - Vedi [Configurare Stripe](../guide/CONFIGURARE-STRIPE.md)
- **BRT** (spedizioni) - Vedi [Configurare BRT](../guide/CONFIGURARE-BRT.md)
- **Email** (Resend) - Vedi [Configurare email](../guide/CONFIGURARE-EMAIL.md)
- **Google OAuth** (login con Google) - Richiede credenziali OAuth da Google Console

---

## Prossimo passo

Vai a [Struttura del progetto](03-STRUTTURA-PROGETTO.md) per capire dove si trovano le cose.
