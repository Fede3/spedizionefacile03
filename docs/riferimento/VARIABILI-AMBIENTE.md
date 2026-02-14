# Riferimento: Variabili d'ambiente

Lista completa di tutte le variabili `.env` con descrizione ed esempi.

---

## Backend Laravel

File: `laravel-spedizionefacile-main/.env`

### Applicazione

| Variabile | Descrizione | Esempio |
|---|---|---|
| `APP_NAME` | Nome dell'applicazione | `SpedizioneFacile` |
| `APP_ENV` | Ambiente (local, staging, production) | `local` |
| `APP_KEY` | Chiave di crittografia (generata con `php artisan key:generate`) | `base64:xxxxx` |
| `APP_DEBUG` | Mostra errori dettagliati (true solo in dev) | `true` |
| `APP_TIMEZONE` | Fuso orario | `Europe/Rome` |
| `APP_URL` | URL del backend | `http://127.0.0.1:8000` |
| `APP_FRONTEND_URL` | URL del frontend (per link nelle email) | `http://127.0.0.1:3001` |
| `APP_LOCALE` | Lingua predefinita | `it` |

### Database

| Variabile | Descrizione | Esempio |
|---|---|---|
| `DB_CONNECTION` | Tipo database | `sqlite` |
| `DB_HOST` | Host database (per MySQL/PostgreSQL) | `127.0.0.1` |
| `DB_PORT` | Porta database | `3306` |
| `DB_DATABASE` | Nome database | `laravel` |
| `DB_USERNAME` | Username database | `root` |
| `DB_PASSWORD` | Password database | `` |

Per SQLite non servono host, porta, username e password.

### Sessione

| Variabile | Descrizione | Esempio |
|---|---|---|
| `SESSION_DRIVER` | Dove salvare le sessioni | `file` |
| `SESSION_LIFETIME` | Durata sessione in minuti | `120` |
| `SESSION_DOMAIN` | Dominio per i cookie sessione | `null` |
| `SESSION_SECURE_COOKIE` | Cookie solo su HTTPS | `false` (dev), `true` (prod) |
| `SESSION_SAME_SITE` | Politica SameSite del cookie | `lax` |

### Email

| Variabile | Descrizione | Esempio |
|---|---|---|
| `MAIL_MAILER` | Tipo di mailer | `smtp`, `log`, `resend` |
| `MAIL_HOST` | Server SMTP | `smtp.resend.com` |
| `MAIL_PORT` | Porta SMTP | `465` |
| `MAIL_USERNAME` | Username SMTP | `resend` |
| `MAIL_PASSWORD` | Password o API key | `re_xxxxxxxx` |
| `MAIL_ENCRYPTION` | Crittografia | `ssl`, `tls`, `null` |
| `MAIL_FROM_ADDRESS` | Indirizzo mittente | `noreply@spedizionefacile.it` |
| `MAIL_FROM_NAME` | Nome mittente | `SpedizioneFacile` |

Per lo sviluppo locale usa `MAIL_MAILER=log`.
Vedi [Configurare email](../guide/CONFIGURARE-EMAIL.md) per i dettagli.

### Autenticazione Sanctum / CORS

| Variabile | Descrizione | Esempio |
|---|---|---|
| `SANCTUM_STATEFUL_DOMAINS` | Domini che possono usare cookie di sessione | `127.0.0.1:8787,localhost:8787` |
| `CORS_ALLOWED_ORIGINS` | Origini autorizzate per CORS | `http://127.0.0.1:8787` |

### Google OAuth

| Variabile | Descrizione | Esempio |
|---|---|---|
| `GOOGLE_CLIENT_ID` | ID app Google OAuth | `xxxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Chiave segreta app Google | `GOCSPX-xxxxx` |
| `GOOGLE_REDIRECT_URI` | URL di callback dopo login Google | `http://127.0.0.1:8000/auth/google/callback` |

### Stripe (pagamenti)

| Variabile | Descrizione | Esempio |
|---|---|---|
| `STRIPE_KEY` | Chiave pubblica Stripe | `pk_test_xxxxx` |
| `STRIPE_SECRET` | Chiave segreta Stripe | `sk_test_xxxxx` |
| `STRIPE_CLIENT_ID` | ID client Stripe Connect | `ca_xxxxx` |
| `STRIPE_WEBHOOK_SECRET` | Segreto per verificare webhook | `whsec_xxxxx` |

Vedi [Configurare Stripe](../guide/CONFIGURARE-STRIPE.md) per i dettagli.

### BRT (corriere)

| Variabile | Descrizione | Esempio |
|---|---|---|
| `BRT_CLIENT_ID` | ID cliente BRT | `123456789` |
| `BRT_PASSWORD` | Password API BRT | `password123` |
| `BRT_API_URL` | URL API spedizioni | `https://api.brt.it/rest/v1/shipments` |
| `BRT_PUDO_API_URL` | URL API punti ritiro | `https://api.brt.it` |
| `BRT_PUDO_TOKEN` | Token API PUDO | `token_xxxxx` |
| `BRT_DEPARTURE_DEPOT` | Codice filiale partenza | `53` |
| `BRT_VERIFY_SSL` | Verifica certificato SSL | `true` |

Vedi [Configurare BRT](../guide/CONFIGURARE-BRT.md) per i dettagli.

### Altre variabili

| Variabile | Descrizione | Esempio |
|---|---|---|
| `BCRYPT_ROUNDS` | Complessita' hashing password | `12` |
| `LOG_CHANNEL` | Canale di log | `stack` |
| `LOG_LEVEL` | Livello minimo di log | `debug` |
| `QUEUE_CONNECTION` | Tipo di coda | `sync` |
| `CACHE_STORE` | Tipo di cache | `database` |
| `BROADCAST_CONNECTION` | Connessione broadcast | `log` |
| `FILESYSTEM_DISK` | Disco per i file | `local` |

---

## Frontend Nuxt

File: `nuxt-spedizionefacile-master/.env`

| Variabile | Descrizione | Esempio |
|---|---|---|
| `NUXT_PUBLIC_API_BASE` | URL del backend (per le chiamate API) | `http://127.0.0.1:8787` |
| `NUXT_PUBLIC_STRIPE_KEY` | Chiave pubblica Stripe (per il pagamento nel browser) | `pk_test_xxxxx` |

---

## Configurazione minima per sviluppo locale

### Backend (.env)

```env
APP_NAME=SpedizioneFacile
APP_ENV=local
APP_KEY=          # Generato con php artisan key:generate
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000
APP_FRONTEND_URL=http://127.0.0.1:3001
DB_CONNECTION=sqlite
MAIL_MAILER=log
SANCTUM_STATEFUL_DOMAINS=127.0.0.1:8787,localhost:8787,127.0.0.1:3001,localhost:3001
CORS_ALLOWED_ORIGINS=http://127.0.0.1:8787,http://localhost:8787
```

### Frontend (.env)

```env
NUXT_PUBLIC_API_BASE=http://127.0.0.1:8787
```

Tutto il resto (Stripe, BRT, Google, email) e' opzionale per lo sviluppo locale.
