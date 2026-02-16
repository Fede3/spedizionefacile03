# Mappa dei Flussi - SpedizioneFacile

Questo documento descrive passo per passo tutti i flussi principali dell'applicazione, con riferimenti ai file sorgente.

I percorsi sono relativi alla root del progetto.

---

## 1. Preventivo (Calcolo prezzo spedizione)

Il preventivo calcola il prezzo di una spedizione in base a peso e volume dei colli.

**Trigger:** L'utente compila il form "Preventivo Rapido" sulla homepage o sulla pagina `/preventivo`.

1. Il frontend raccoglie citta/CAP partenza, citta/CAP destinazione, e dati dei colli (peso, dimensioni)
   - `nuxt-spedizionefacile-master/components/Homepage/PreventivoRapido.vue`
   - `nuxt-spedizionefacile-master/pages/preventivo.vue`
2. Il calcolo del prezzo avviene **lato frontend** con fasce di prezzo per peso e volume:
   - Peso: <2kg = 9 EUR, 2-5kg = 12 EUR, 5-10kg = 18 EUR, >10kg = 20 EUR
   - Volume: <0.008 m3 = 9 EUR, 0.008-0.02 = 12 EUR, 0.02-0.04 = 18 EUR, >0.04 = 20 EUR
   - Prezzo finale = MAX(prezzo_peso, prezzo_volume) * quantita
3. I dati vengono salvati nello store Pinia
   - `nuxt-spedizionefacile-master/stores/userStore.js` (riga 26-73)
4. In parallelo, i dati vengono salvati nella sessione server via POST `/api/session/first-step`
   - `laravel-spedizionefacile-main/app/Http/Controllers/SessionController.php` (riga 39-123)
5. Il backend ricalcola i prezzi con la stessa logica e li salva in sessione
   - `SessionController.php` (riga 64-100)

**Risultato:** L'utente vede il prezzo stimato e puo procedere alla configurazione della spedizione.

---

## 2. Configurazione Spedizione (step multipli)

L'utente configura i dettagli completi della spedizione attraverso step successivi.

**Trigger:** L'utente clicca "Continua" dopo il preventivo.

1. L'utente naviga attraverso gli step
   - `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
2. Step 1: Dettagli colli (tipo, peso, dimensioni, quantita) - gia compilato dal preventivo
3. Step 2: Indirizzo di partenza (mittente) con autocompletamento localita
   - Autocompletamento CAP/citta: GET `/api/locations/search` e `/api/locations/by-cap`
   - `laravel-spedizionefacile-main/app/Http/Controllers/LocationController.php`
   - Dati da: `laravel-spedizionefacile-main/app/Models/Location.php`
4. Step 3: Indirizzo di destinazione (destinatario)
5. Step 4: Servizi aggiuntivi (tipo servizio, data ritiro, orario)
6. I dati vengono mantenuti nello store Pinia durante la navigazione
   - `nuxt-spedizionefacile-master/stores/userStore.js`

**Risultato:** L'utente ha configurato completamente la spedizione e puo procedere al riepilogo.

---

## 3. Carrello e Checkout

Il carrello gestisce le spedizioni configurate in attesa di pagamento.

**Trigger:** L'utente clicca "Aggiungi al carrello" dalla pagina di riepilogo.

### Aggiunta al carrello

1. **Utente loggato:** POST `/api/cart` (salva nel database)
   - `laravel-spedizionefacile-main/app/Http/Controllers/CartController.php` (riga 184-295)
   - Crea `PackageAddress` (partenza + destinazione), `Service`, `Package`
   - Collega il pacco al carrello tramite tabella `cart_user`
   - Gestisce duplicati: se pacco identico esiste, aumenta la quantita
2. **Utente ospite:** POST `/api/guest-cart` (salva in sessione)
   - `laravel-spedizionefacile-main/app/Http/Controllers/GuestCartController.php` (riga 66-148)
   - Salva i dati come array nella sessione con chiave `cart`
3. Il composable `useCart` sceglie automaticamente l'endpoint giusto
   - `nuxt-spedizionefacile-master/composables/useCart.js` (riga 21-40)

### Visualizzazione carrello

1. La pagina carrello mostra i pacchi con prezzi e totale
   - `nuxt-spedizionefacile-master/pages/carrello.vue`
2. GET `/api/cart` o `/api/guest-cart` restituisce pacchi + meta (subtotal, total)
   - `CartController.php` (riga 34-76) oppure `GuestCartController.php` (riga 31-37)

### Checkout

1. L'utente procede al checkout
   - `nuxt-spedizionefacile-master/pages/checkout.vue`
2. Creazione ordine: POST `/api/stripe/create-order`
   - `laravel-spedizionefacile-main/app/Http/Controllers/StripeController.php` (riga 98-156)
   - Ricalcola il subtotale lato server
   - Crea `Order` con stato `pending`
   - Collega i pacchi all'ordine tramite tabella `package_order`
3. Scelta del metodo di pagamento (carta, portafoglio, bonifico)

**Risultato:** Ordine creato in stato `pending`, pronto per il pagamento.

---

## 4. Pagamento (Stripe + Portafoglio)

### 4a. Pagamento con carta (Stripe)

**Trigger:** L'utente sceglie "Paga con carta" nel checkout.

1. Creazione PaymentIntent: POST `/api/stripe/create-payment-intent`
   - `StripeController.php` (riga 195-241)
   - Crea un `PaymentIntent` su Stripe con importo in centesimi
   - Restituisce `client_secret` al frontend
2. Il frontend usa Stripe.js per completare il pagamento con il `client_secret`
   - `nuxt-spedizionefacile-master/pages/checkout.vue`
3. Conferma pagamento: POST `/api/stripe/order-paid`
   - `StripeController.php` (riga 245-304)
   - Verifica il pagamento con Stripe (importo, order_id nei metadata)
   - Aggiorna stato ordine a `completed` o `payment_failed`
   - Crea record `Transaction`
   - Lancia evento `OrderPaid`
   - Svuota il carrello
4. **In parallelo**, Stripe invia webhook POST `/stripe/webhook`
   - `laravel-spedizionefacile-main/app/Http/Controllers/StripeWebhookController.php` (riga 36-55)
   - `paymentSucceeded()` (riga 83-118): aggiorna Transaction, svuota carrello, lancia `OrderPaid`
   - `paymentFailed()` (riga 122-158): segna ordine come `payment_failed`

### 4b. Pagamento con portafoglio

**Trigger:** L'utente sceglie "Paga con portafoglio" nel checkout.

1. Detrazione saldo: POST `/api/wallet/pay`
   - `laravel-spedizionefacile-main/app/Http/Controllers/WalletController.php` (riga 153-189)
   - Verifica saldo sufficiente
   - Crea `WalletMovement` di tipo `debit`
2. Segna ordine come completato: POST `/api/stripe/mark-order-completed`
   - `StripeController.php` (riga 51-94)
   - Stato ordine diventa `completed`
   - Crea record `Transaction` con tipo `wallet`
   - Lancia evento `OrderPaid`
   - Svuota carrello

### 4c. Pagamento con bonifico

1. POST `/api/stripe/mark-order-completed` con `payment_type=bonifico`
   - `StripeController.php` (riga 51-94)
   - Stato ordine resta `pending` (in attesa di conferma admin)
   - Crea `Transaction` con stato `pending`
   - NON lancia `OrderPaid` (finche l'admin non conferma)

**Risultato:** Ordine pagato, evento `OrderPaid` lanciato (tranne per bonifico).

---

## 5. Generazione Etichetta BRT

**Trigger:** Evento `OrderPaid` (dopo pagamento riuscito).

1. L'evento `OrderPaid` viene lanciato
   - `laravel-spedizionefacile-main/app/Events/OrderPaid.php`
2. I listener registrati in `EventServiceProvider` vengono eseguiti in ordine:
   - `laravel-spedizionefacile-main/app/Providers/EventServiceProvider.php` (riga 29-32)
3. **Listener 1:** `MarkOrderProcessing` cambia stato ordine a `processing`
   - `laravel-spedizionefacile-main/app/Listeners/MarkOrderProcessing.php` (riga 34-39)
4. **Listener 2:** `GenerateBrtLabel` genera l'etichetta BRT
   - `laravel-spedizionefacile-main/app/Listeners/GenerateBrtLabel.php` (riga 41-160)
   - Controlla che BRT sia configurato (`services.brt.client_id`)
   - Prepara opzioni (contrassegno, PUDO)
   - Chiama `BrtService::createShipment()` con retry fino a 3 tentativi
5. `BrtService::createShipment()` comunica con l'API BRT
   - `laravel-spedizionefacile-main/app/Services/BrtService.php` (riga 61-305)
   - Normalizza indirizzo destinatario (maiuscolo, CAP 5 cifre, provincia 2 lettere)
   - Risolve citta da tabella `locations` per compatibilita BRT
   - Invia POST a `https://api.brt.it/rest/v1/shipments/shipment`
   - Riceve etichetta PDF in base64 e dati di tracking
6. Se successo: salva su `Order` i campi `brt_*` e stato diventa `in_transit`
   - `GenerateBrtLabel.php` (riga 109-125)
7. Invio email con etichetta PDF all'utente
   - `GenerateBrtLabel.php` (riga 128-139)
   - `laravel-spedizionefacile-main/app/Mail/ShipmentLabelMail.php`
8. Se fallisce: salva errore in `Order.brt_error`
   - `GenerateBrtLabel.php` (riga 153-154)

### Generazione manuale (da admin o utente)

POST `/api/brt/create-shipment`
- `laravel-spedizionefacile-main/app/Http/Controllers/BrtController.php` (riga 48-124)
- Stessa logica ma senza retry automatico

**Risultato:** Etichetta PDF generata, tracking URL disponibile, stato ordine `in_transit`.

---

## 6. Tracciamento Spedizione

### Tracking autenticato

**Trigger:** L'utente va nella sezione "Le mie spedizioni".

1. GET `/api/brt/tracking/{order}`
   - `BrtController.php` (riga 231-250)
   - Restituisce: `brt_parcel_id`, `brt_tracking_number`, `brt_tracking_url`, stato

### Tracking pubblico

**Trigger:** Qualsiasi visitatore cerca una spedizione per codice.

1. La pagina pubblica di tracking
   - `nuxt-spedizionefacile-master/pages/traccia-spedizione.vue`
2. GET `/api/tracking/search?code=XXXXX`
   - `BrtController.php` (riga 257-328)
   - Cerca per: `brt_parcel_id`, `brt_tracking_number`, `brt_numeric_sender_reference`, ID ordine
   - Restituisce stato in italiano con descrizione

**Risultato:** L'utente vede lo stato della spedizione e puo cliccare il link BRT per dettagli.

---

## 7. Contrassegno (Cash On Delivery)

Il contrassegno permette al destinatario di pagare alla consegna.

**Trigger:** L'utente seleziona "Contrassegno" durante la configurazione.

1. I flag `is_cod` e `cod_amount` vengono passati alla creazione della spedizione BRT
   - POST `/api/brt/create-shipment` con `is_cod=true` e `cod_amount` (in centesimi)
   - `BrtController.php` (riga 50-53)
2. `BrtService::createShipment()` aggiunge i parametri al payload BRT:
   - `BrtService.php` (riga 152-157)
   - `isCODMandatory = 1`
   - `cashOnDelivery = importo in euro`
   - `codPaymentType = BM` (Bollettino Postale)
3. I dati vengono salvati nell'ordine: `Order.is_cod` e `Order.cod_amount`
   - `BrtController.php` (riga 108-109)

**Risultato:** BRT incassera l'importo dal destinatario alla consegna.

---

## 8. Registrazione e Verifica Email

**Trigger:** L'utente compila il form di registrazione.

1. Pagina di registrazione
   - `nuxt-spedizionefacile-master/pages/registrazione.vue`
2. POST `/api/custom-register` (throttle: 5/min)
   - `laravel-spedizionefacile-main/app/Http/Controllers/CustomRegisterController.php` (riga 32-101)
   - Valida i dati tramite `RegisterRequest`
   - Crea `User` con ruolo `User`
   - Genera codice di verifica a 6 cifre (scadenza 30 min)
   - Invia email con codice via `SendVerificationEmailJob`
3. L'utente riceve l'email con il codice
   - `laravel-spedizionefacile-main/app/Mail/VerificationEmail.php`
   - `laravel-spedizionefacile-main/resources/views/emails/verificationEmail.blade.php`
4. L'utente inserisce il codice nella pagina di login
   - `nuxt-spedizionefacile-master/pages/autenticazione.vue`
5. POST `/api/verify-code`
   - `laravel-spedizionefacile-main/app/Http/Controllers/CustomLoginController.php` (riga 122-180)
   - Verifica credenziali + codice
   - Se codice scaduto: genera nuovo codice e lo reinvia
   - Se codice corretto: imposta `email_verified_at`, fa login automatico

### Reinvio codice

POST `/api/resend-verification-email`
- `CustomLoginController.php` (riga 186-218)
- Genera nuovo codice e lo invia via email

### Verifica via link (alternativa)

GET `/api/verify-email/{id}` (link firmato)
- `laravel-spedizionefacile-main/app/Http/Controllers/VerificationController.php` (riga 30-54)
- Imposta `email_verified_at` e reindirizza al frontend

**Risultato:** Account attivato, utente loggato.

---

## 9. Sistema Referral

### Flusso Partner Pro

1. Un utente richiede di diventare Partner Pro
   - POST `/api/pro-request`
   - `laravel-spedizionefacile-main/app/Http/Controllers/ProRequestController.php`
   - Crea `ProRequest` con stato `pending`
2. L'admin approva la richiesta
   - PATCH `/api/admin/pro-requests/{id}/approve`
   - Cambia ruolo utente a `Partner Pro`
   - Genera codice referral di 8 caratteri
   - `laravel-spedizionefacile-main/app/Models/User.php` (riga 198-205)
3. Il Partner Pro vede il suo codice e link di condivisione
   - GET `/api/referral/my-code`
   - `laravel-spedizionefacile-main/app/Http/Controllers/ReferralController.php` (riga 30-63)
   - Include link diretto e link WhatsApp

### Flusso Acquirente

1. L'acquirente inserisce il codice referral
   - POST `/api/referral/validate` per verificare validita
   - `ReferralController.php` (riga 67-92)
2. Dopo il pagamento, il codice viene applicato
   - POST `/api/referral/apply`
   - `ReferralController.php` (riga 96-155)
   - Calcola sconto 5% per acquirente
   - Calcola commissione 5% per Partner Pro
   - Crea `ReferralUsage` confermato
   - Crea `WalletMovement` credit per il Partner Pro (commissione)
3. In alternativa, il codice viene salvato permanentemente sull'utente
   - POST `/api/referral/store`
   - `ReferralController.php` (riga 163-196)
   - Salva in `User.referred_by` per sconto su tutti gli ordini futuri

**Risultato:** Acquirente riceve 5% sconto, Partner Pro riceve 5% commissione nel portafoglio.

---

## 10. Prelievi Commissioni

**Trigger:** Il Partner Pro vuole incassare le commissioni guadagnate.

1. Il Partner Pro visualizza il saldo commissioni
   - GET `/api/wallet/balance` (mostra `commission_balance`)
   - `WalletController.php` (riga 36-45)
   - Calcolo: `User::commissionBalance()` in `User.php` (riga 183-191)
2. Il Partner Pro crea una richiesta di prelievo
   - POST `/api/withdrawals`
   - `laravel-spedizionefacile-main/app/Http/Controllers/WithdrawalController.php` (riga 35-80)
   - Verifica: utente e Pro, saldo >= 1 EUR, nessuna richiesta pending
   - Crea `WithdrawalRequest` con stato `pending`
3. L'admin vede le richieste di prelievo
   - GET `/api/admin/withdrawals`
   - `AdminController.php`
4. L'admin approva o rifiuta
   - POST `/api/admin/withdrawals/{id}/approve`
   - POST `/api/admin/withdrawals/{id}/reject`
   - Stato diventa `approved`, `completed`, o `rejected`

**Risultato:** Commissioni prelevate (il trasferimento reale avviene fuori dal sistema).

---

## Flusso Login (con trasferimento carrello)

**Trigger:** L'utente inserisce email e password.

1. POST `/api/custom-login`
   - `CustomLoginController.php` (riga 39-116)
2. Se email non verificata: risponde `requires_verification` e reinvia codice
3. Se credenziali OK e email verificata: `Auth::login()`
4. Trasferimento carrello ospite -> database:
   - Legge pacchi da `session('cart')`
   - Crea `PackageAddress`, `Service`, `Package` nel database
   - Collega a `cart_user`
   - Svuota sessione

---

## Ricarica Portafoglio

**Trigger:** L'utente vuole aggiungere fondi al portafoglio.

1. POST `/api/wallet/top-up`
   - `WalletController.php` (riga 64-149)
   - Crea PaymentIntent Stripe con `confirm=true` e `off_session=true`
   - Se pagamento riuscito: crea `WalletMovement` credit confermato
   - Restituisce nuovo saldo
