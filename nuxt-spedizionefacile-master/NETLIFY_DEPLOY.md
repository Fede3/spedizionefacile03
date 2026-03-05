# 🚀 GUIDA DEPLOY NETLIFY - SpediamoFacile

## 📋 PREREQUISITI

- Account Netlify (gratuito): https://app.netlify.com
- Account GitHub/GitLab (gratuito)
- Git installato sul PC

---

## ⚙️ CONFIGURAZIONE BACKEND LARAVEL

**IMPORTANTE**: Prima di deployare su Netlify, devi aggiornare Laravel per accettare richieste dal dominio Netlify.

### 1. Aggiorna `.env` Laravel

Quando Netlify ti assegna un dominio (es. `tuosito.netlify.app`), aggiungilo in:

```env
# File: laravel-spedizionefacile-main/.env

SANCTUM_STATEFUL_DOMAINS=127.0.0.1:8787,localhost:8787,tuosito.netlify.app,joins-branches-adipex-rand.trycloudflare.com

CORS_ALLOWED_ORIGINS=http://127.0.0.1:8787,http://localhost:8787,https://tuosito.netlify.app,https://joins-branches-adipex-rand.trycloudflare.com

SESSION_DOMAIN=.netlify.app
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=none
```

### 2. Aggiorna `config/sanctum.php`

```php
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost')),
```

### 3. Aggiorna `config/session.php`

```php
'domain' => env('SESSION_DOMAIN', null),
'secure' => env('SESSION_SECURE_COOKIE', false),
'same_site' => env('SESSION_SAME_SITE', 'lax'),
```

### 4. Pulisci cache Laravel

```bash
php artisan config:cache
php artisan cache:clear
```

---

## 🎯 DEPLOY SU NETLIFY

### METODO 1: Deploy Automatico (Consigliato)

#### 1. Prepara il progetto

**Windows**:
```bash
cd C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master
prepare-netlify.bat
```

**Linux/Mac**:
```bash
cd /path/to/nuxt-spedizionefacile-master
chmod +x prepare-netlify.sh
./prepare-netlify.sh
```

#### 2. Crea repository Git

```bash
git init
git add .
git commit -m "Initial commit for Netlify"
```

#### 3. Pusha su GitHub

```bash
# Crea un nuovo repository su GitHub, poi:
git remote add origin https://github.com/tuousername/spedizionefacile.git
git branch -M main
git push -u origin main
```

#### 4. Connetti a Netlify

1. Vai su https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Scegli **GitHub** e autorizza
4. Seleziona il repository `spedizionefacile`
5. Configura:
   - **Build command**: `npm run build`
   - **Publish directory**: `.output/public`
   - **Node version**: `20`

#### 5. Aggiungi variabili d'ambiente

In Netlify → Site settings → Environment variables:

```
NUXT_PUBLIC_API_BASE = https://joins-branches-adipex-rand.trycloudflare.com
NUXT_PUBLIC_STRIPE_KEY = pk_test_... (la tua chiave Stripe)
NODE_ENV = production
```

#### 6. Deploy!

Click **"Deploy site"** e aspetta 2-3 minuti.

---

### METODO 2: Deploy Manuale (Drag & Drop)

#### 1. Build locale

```bash
npm run build
```

#### 2. Vai su Netlify

https://app.netlify.com → **"Add new site"** → **"Deploy manually"**

#### 3. Trascina la cartella

Trascina la cartella `.output/public` nella finestra di Netlify.

#### 4. Configura variabili d'ambiente

Come nel Metodo 1, step 5.

---

## ✅ VERIFICA FUNZIONAMENTO

### 1. Test Homepage

Vai su `https://tuosito.netlify.app` e verifica che si carica.

### 2. Test API

Apri DevTools (F12) → Network e verifica che le chiamate a:
- `/api/user`
- `/api/public/price-bands`

Vanno verso `joins-branches-adipex-rand.trycloudflare.com` e restituiscono 200 (non 401/403).

### 3. Test Login

Prova a fare login e verifica che:
- Cookie `laravel_session` viene impostato
- Header `X-XSRF-TOKEN` è presente
- Login funziona senza errori

### 4. Test PUDO

Vai su `/la-tua-spedizione/2`, seleziona "Punto BRT" e cerca PUDO per Roma/Milano.

---

## 🔧 TROUBLESHOOTING

### Errore 401 su API

**Causa**: Laravel non accetta il dominio Netlify.

**Fix**:
1. Aggiungi dominio Netlify in `SANCTUM_STATEFUL_DOMAINS`
2. Aggiungi dominio Netlify in `CORS_ALLOWED_ORIGINS`
3. `php artisan config:cache`

### Cookie non funzionano

**Causa**: Cookie cross-domain bloccati.

**Fix** in Laravel `.env`:
```env
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=none
```

### Build fallisce su Netlify

**Causa**: Dipendenze mancanti o Node version sbagliata.

**Fix**:
1. Verifica `netlify.toml` ha `NODE_VERSION = "20"`
2. Aggiungi `NPM_FLAGS = "--legacy-peer-deps"`
3. Verifica che `npm run build` funzioni in locale

### Immagini non si caricano

**Causa**: Path assoluti invece di relativi.

**Fix**: Verifica che le immagini usino `/img/...` (con slash iniziale).

---

## 🎨 DOMINIO PERSONALIZZATO

### 1. Aggiungi dominio su Netlify

Site settings → Domain management → Add custom domain

### 2. Configura DNS

Aggiungi record DNS:
```
Type: CNAME
Name: www
Value: tuosito.netlify.app
```

### 3. Aggiorna Laravel

Aggiungi il tuo dominio in `SANCTUM_STATEFUL_DOMAINS` e `CORS_ALLOWED_ORIGINS`.

---

## 📊 PERFORMANCE

Netlify include automaticamente:
- ✅ CDN globale
- ✅ Compressione Brotli/Gzip
- ✅ HTTP/2
- ✅ SSL gratuito
- ✅ Cache intelligente

---

## 💰 COSTI

**Piano Free Netlify**:
- 100 GB bandwidth/mese
- 300 build minutes/mese
- SSL gratuito
- **Sufficiente per 10.000+ visitatori/mese**

---

## 🔄 AGGIORNAMENTI

Ogni volta che pushai su GitHub, Netlify rebuilda automaticamente il sito.

```bash
git add .
git commit -m "Update"
git push
```

Netlify detecta il push e rebuilda in 2-3 minuti.

---

## 📞 SUPPORTO

- Documentazione Netlify: https://docs.netlify.com
- Documentazione Nuxt: https://nuxt.com/docs/getting-started/deployment#netlify
- Community Netlify: https://answers.netlify.com

---

## ✨ VANTAGGI NETLIFY

✅ Deploy automatico da Git
✅ Preview per ogni PR
✅ Rollback istantaneo
✅ CDN globale
✅ SSL gratuito
✅ Dominio personalizzato
✅ Analytics integrato
✅ Form handling
✅ Serverless functions

---

**Pronto per il deploy!** 🚀
