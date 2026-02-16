# Come configurare Stripe (pagamenti)

Questa guida spiega come configurare Stripe per accettare pagamenti con carta di credito.

---

## Prerequisiti

1. Registrati su [stripe.com](https://stripe.com)
2. Completa la verifica dell'account per la produzione
3. Recupera le chiavi API dalla dashboard Stripe

---

## Chiavi necessarie

Stripe fornisce due set di chiavi: **test** e **live**.

| Chiave | Inizia con | Dove si usa |
|---|---|---|
| Publishable Key (pubblica) | `pk_test_` o `pk_live_` | Frontend (browser) |
| Secret Key (segreta) | `sk_test_` o `sk_live_` | Backend (solo server) |
| Webhook Secret | `whsec_` | Backend (verifica webhook) |

---

## Configurazione backend (.env Laravel)

Nel file `laravel-spedizionefacile-main/.env`:

```env
# Chiave pubblica (visibile nel frontend)
STRIPE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx

# Chiave segreta (solo backend, MAI condividere)
STRIPE_SECRET=sk_test_xxxxxxxxxxxxxxxxxxxx

# ID client per Stripe Connect (opzionale, per marketplace)
STRIPE_CLIENT_ID=ca_xxxxxxxxxxxxxxxxxxxx

# Segreto webhook (per verificare i pagamenti ricevuti)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
```

Le chiavi vengono lette in `laravel-spedizionefacile-main/config/services.php`:

```php
'stripe' => [
    'key' => env('STRIPE_KEY'),
    'secret' => env('STRIPE_SECRET'),
    'client_id' => env('STRIPE_CLIENT_ID'),
    'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
],
```

---

## Configurazione frontend (.env Nuxt)

Nel file `nuxt-spedizionefacile-master/.env`:

```env
NUXT_PUBLIC_STRIPE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
```

Questa chiave viene usata per caricare Stripe.js nel browser.

---

## Impostazioni da pannello admin

Il sistema supporta anche la configurazione Stripe dal pannello di amministrazione.
Le impostazioni salvate nel database hanno la **priorita'** rispetto al file `.env`.

Endpoint per admin:
- `GET /api/settings/stripe` - Legge la configurazione
- `POST /api/settings/stripe` - Salva la configurazione

Le impostazioni vengono salvate nella tabella `settings` con il modello `Setting`.

---

## Configurare il webhook

Il webhook di Stripe notifica il backend quando un pagamento viene completato.

### 1. Creare il webhook su Stripe

Nella dashboard Stripe:
1. Vai su **Developers > Webhooks**
2. Clicca **Add endpoint**
3. URL: `https://tuodominio.com/stripe/webhook`
4. Seleziona gli eventi:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copia il **Signing secret** (`whsec_...`)

### 2. Configurare nel .env

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
```

### 3. Rotta del webhook

La rotta e' definita in `laravel-spedizionefacile-main/routes/web.php`:

```php
Route::post('/stripe/webhook', [StripeWebhookController::class, 'handle']);
```

Il webhook e' **pubblico** (senza autenticazione) perche' Stripe lo chiama direttamente.
La sicurezza e' garantita dalla verifica della firma con `STRIPE_WEBHOOK_SECRET`.

---

## Modalita' test

Con le chiavi `pk_test_` e `sk_test_`, Stripe funziona in modalita' test.

Carte di test:
- `4242 4242 4242 4242` - Pagamento riuscito
- `4000 0000 0000 0002` - Pagamento rifiutato
- `4000 0025 0000 3155` - Richiede autenticazione 3D Secure

Data di scadenza: qualsiasi data futura (es. 12/34).
CVC: qualsiasi 3 cifre (es. 123).

---

## Flusso di pagamento

1. Il frontend crea un ordine: `POST /api/stripe/create-order`
2. Il frontend crea un PaymentIntent: `POST /api/stripe/create-payment-intent`
3. L'utente inserisce i dati della carta (componente Stripe Elements)
4. Stripe processa il pagamento
5. Il frontend conferma: `POST /api/stripe/order-paid`
6. Il backend lancia l'evento `OrderPaid`
7. I listener generano l'etichetta BRT e aggiornano lo stato

---

## Gestione carte salvate

Gli utenti possono salvare le carte di credito per pagamenti futuri:

| Endpoint | Descrizione |
|---|---|
| `POST /api/stripe/create-setup-intent` | Prepara il salvataggio di una nuova carta |
| `GET /api/stripe/payment-methods` | Lista le carte salvate |
| `POST /api/stripe/set-default-payment-method` | Imposta la carta predefinita |
| `DELETE /api/stripe/delete-card` | Elimina una carta salvata |

---

## Troubleshooting

| Problema | Soluzione |
|---|---|
| Stripe non carica nel browser | Verifica `NUXT_PUBLIC_STRIPE_KEY` nel `.env` del frontend |
| Pagamento fallisce lato server | Verifica `STRIPE_SECRET` nel `.env` del backend |
| Webhook non ricevuto | Verifica URL del webhook e `STRIPE_WEBHOOK_SECRET` |
| Errore "No such customer" | L'utente non ha un customer_id su Stripe |
| Pagamento riuscito ma ordine resta "pending" | Controlla che il webhook funzioni correttamente |
