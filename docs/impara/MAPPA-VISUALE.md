# Mappa visuale del sistema

## Cosa imparerai

- Come e' strutturato il progetto nel suo insieme
- Il percorso dell'utente dalla homepage al pagamento
- Come i dati fluiscono tra frontend, backend e database
- Come i moduli del progetto dipendono l'uno dall'altro


---


## 1. Struttura delle cartelle

```
spedizionefacile/
|
|-- nuxt-spedizionefacile-master/       <-- FRONTEND (cosa vede l'utente)
|   |-- pages/                          <-- Le pagine del sito
|   |-- components/                     <-- Pezzi riutilizzabili di pagina
|   |-- composables/                    <-- Funzioni riutilizzabili
|   |-- stores/                         <-- Memoria condivisa (dati globali)
|   |-- assets/css/                     <-- Stili e colori
|   |-- public/img/                     <-- Immagini
|   |-- nuxt.config.ts                  <-- Configurazione del frontend
|
|-- laravel-spedizionefacile-main/      <-- BACKEND (la logica nascosta)
|   |-- app/
|   |   |-- Http/
|   |   |   |-- Controllers/            <-- Gestiscono le richieste
|   |   |   |-- Middleware/             <-- Guardiani (controlli di accesso)
|   |   |   |-- Requests/              <-- Regole di validazione
|   |   |   |-- Resources/             <-- Formato dei dati in uscita
|   |   |-- Models/                     <-- Descrivono le tabelle del database
|   |   |-- Events/                     <-- Segnali ("e' successo qualcosa")
|   |   |-- Listeners/                  <-- Reazioni ai segnali
|   |   |-- Mail/                       <-- Template delle email
|   |   |-- Services/                   <-- Logica di servizio (es. BRT)
|   |-- routes/
|   |   |-- web.php                     <-- Lista delle rotte principali
|   |   |-- api.php                     <-- Lista delle rotte API aggiuntive
|   |-- database/
|   |   |-- migrations/                 <-- Modifiche alla struttura del database
|
|-- docs/                               <-- Documentazione (questa guida)
|-- scripts/                            <-- Script di utilita'
```


---


## 2. Le pagine del sito (mappa del frontend)

```
                            HOMEPAGE
                          (index.vue)
                               |
           +-------------------+-------------------+
           |                   |                   |
      PREVENTIVO           CHI SIAMO           CONTATTI
    (preventivo.vue)    (chi-siamo.vue)     (contatti.vue)
           |
           v
    LA TUA SPEDIZIONE
    ([step].vue)
     Step 2: Indirizzi
     Step 3: Servizi
           |
           v
       RIEPILOGO
    (riepilogo.vue)
           |
    +------+------+
    |             |
  LOGIN?       GIA' LOGGATO
    |             |
    v             v
AUTENTICAZIONE   CARRELLO
(autenticazione) (carrello.vue)
    |             |
    v             v
  LOGIN        CHECKOUT
(login.vue)  (checkout.vue)
    |             |
    v             v
  VERIFICA     PAGAMENTO
  EMAIL          |
(verifica-       v
 email.vue)  ACCOUNT
             (account/)
                |
    +-----------+-----------+-----------+
    |           |           |           |
 SPEDIZIONI  PROFILO    INDIRIZZI  PORTAFOGLIO
 (spedizioni/) (profilo)  (indirizzi/)  (portafoglio)
    |
    v
 DETTAGLIO SPEDIZIONE
 ([id].vue)
```

### Altre pagine

```
+-- FAQ (faq.vue)
+-- Servizi (servizi/index.vue)
+-- Traccia spedizione (traccia-spedizione.vue)
+-- Recupera password (recupera-password.vue)
+-- Cookie Policy (cookie-policy.vue)
+-- Privacy Policy (privacy-policy.vue)
+-- Termini e Condizioni (termini-condizioni.vue)
+-- Reclami (reclami.vue)
```


---


## 3. Il percorso dell'utente (user journey)

### Flusso principale: dalla homepage al pacco spedito

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|  1. HOMEPAGE     |---->|  2. PREVENTIVO   |---->|  3. INDIRIZZI    |
|                  |     |                  |     |                  |
|  L'utente vede   |     |  Sceglie il tipo |     |  Inserisce       |
|  il form di      |     |  di collo, peso, |     |  indirizzo       |
|  preventivo      |     |  dimensioni,     |     |  partenza e      |
|  rapido          |     |  citta' e CAP    |     |  destinazione    |
+------------------+     +------------------+     +------------------+
                                                         |
                                                         v
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|  6. ORDINE       |<----|  5. PAGAMENTO    |<----|  4. RIEPILOGO    |
|  CREATO          |     |                  |     |                  |
|                  |     |  Paga con carta  |     |  Vede il prezzo  |
|  Stato: pending  |     |  (Stripe) o      |     |  totale e i      |
|  (in attesa)     |     |  portafoglio     |     |  dettagli        |
+------------------+     +------------------+     +------------------+
         |
         v
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|  7. PAGAMENTO    |---->|  8. ETICHETTA    |---->|  9. IN TRANSITO  |
|  CONFERMATO      |     |  BRT GENERATA    |     |                  |
|                  |     |                  |     |  L'utente puo'   |
|  Stato:          |     |  Il sistema crea |     |  tracciare il    |
|  processing      |     |  l'etichetta     |     |  pacco con il    |
|                  |     |  automaticamente |     |  link BRT        |
+------------------+     +------------------+     +------------------+
```


---


## 4. Il flusso dei dati (data flow)

### Dall'utente al database e ritorno

```
+------------+          +------------+          +------------+          +------------+
|            |  click   |            |  HTTP    |            |  SQL     |            |
|  UTENTE    |--------->|  FRONTEND  |--------->|  BACKEND   |--------->|  DATABASE  |
|  (browser) |          |  (Nuxt)    |          |  (Laravel) |          |  (MySQL)   |
|            |<---------|            |<---------|            |<---------|            |
|            |  render  |            |  JSON    |            |  dati    |            |
+------------+          +------------+          +------------+          +------------+

Esempio concreto:

1. L'utente clicca "Invia" nel form contatti
2. Il frontend (contatti.vue) manda una richiesta POST a /api/contact
3. Il backend (ContactController) valida i dati
4. Il backend salva nel database (tabella contact_messages)
5. Il database conferma il salvataggio
6. Il backend risponde con JSON {"message": "Messaggio inviato"}
7. Il frontend mostra "Messaggio inviato!" sullo schermo
```


---


## 5. Il backend: controller e modelli

### Mappa dei controller

```
Controllers/
|
|-- ContactController        --> Messaggi di contatto
|-- CustomLoginController    --> Login con email e password
|-- CustomRegisterController --> Registrazione nuovo utente
|-- GoogleController         --> Login con Google
|-- VerificationController   --> Verifica email
|
|-- PackageController        --> Gestione pacchi
|-- CartController           --> Carrello (utente loggato)
|-- GuestCartController      --> Carrello (utente ospite)
|-- SessionController        --> Sessione del preventivo
|
|-- OrderController          --> Ordini di spedizione
|-- StripeController         --> Pagamenti con Stripe
|-- StripeWebhookController  --> Notifiche da Stripe
|-- StripeConnectController  --> Account Stripe per Partner Pro
|
|-- BrtController            --> Spedizioni BRT (etichette, tracking)
|
|-- UserController           --> Profilo utente
|-- UserAddressController    --> Rubrica indirizzi
|-- AddressController        --> Indirizzi partenza/destinazione
|-- BillingAddressController --> Indirizzo di fatturazione
|
|-- WalletController         --> Portafoglio virtuale
|-- ReferralController       --> Codici sconto referral
|-- WithdrawalController     --> Prelievi commissioni
|-- ProRequestController     --> Richieste Partner Pro
|-- CouponController         --> Codici sconto coupon
|
|-- AdminController          --> Pannello amministrazione
|-- SettingsController       --> Impostazioni del sito
|-- LocationController       --> Ricerca citta' e CAP
|-- ChangePasswordController --> Cambio password
|-- PasswordResetController  --> Recupero password
|-- SavedShipmentController  --> Spedizioni configurate
```

### Mappa dei modelli e relazioni

```
User (Utente)
 |
 |-- hasMany --> Order (Ordine)
 |                |
 |                |-- belongsToMany --> Package (Pacco)
 |                |                      |
 |                |                      |-- hasOne --> PackageAddress (Partenza)
 |                |                      |-- hasOne --> PackageAddress (Destinazione)
 |                |                      |-- hasOne --> Service (Servizio)
 |                |
 |                |-- hasMany --> Transaction (Pagamento)
 |
 |-- hasMany --> UserAddress (Rubrica indirizzi)
 |
 |-- hasMany --> WalletMovement (Movimenti portafoglio)
 |
 |-- hasMany --> ReferralUsage (Utilizzi codice referral)
 |
 |-- hasMany --> WithdrawalRequest (Richieste prelievo)
 |
 |-- hasMany --> ProRequest (Richieste Partner Pro)


ContactMessage (Messaggio contatto)  -- indipendente

Coupon (Codice sconto)               -- indipendente

Location (Citta'/CAP)                -- indipendente

Setting (Impostazione sito)          -- indipendente

BillingAddress (Fatturazione)        -- collegato a User
```


---


## 6. Gli eventi del sistema

```
Quando succede QUESTO...          ...succede QUEST'ALTRO automaticamente

+-------------------------+       +--------------------------------+
| OrderPaid               |------>| MarkOrderProcessing            |
| (Ordine pagato)         |       | (Segna l'ordine come           |
|                         |       |  "in lavorazione")             |
+-------------------------+       +--------------------------------+
                                           |
                                           v
                                  +--------------------------------+
                                  | GenerateBrtLabel               |
                                  | (Genera l'etichetta BRT        |
                                  |  per la spedizione)            |
                                  +--------------------------------+
```

Gli eventi sono definiti in:
```
laravel-spedizionefacile-main/app/Providers/EventServiceProvider.php
```


---


## 7. Il sistema di pagamento

```
                      L'utente sceglie come pagare
                               |
                 +-------------+-------------+
                 |                           |
          CARTA DI CREDITO             PORTAFOGLIO
          (Stripe)                     VIRTUALE
                 |                           |
                 v                           v
    StripeController              WalletController
    createPaymentIntent()         payWithWallet()
                 |                           |
                 v                           |
    Stripe (servizio esterno)                |
                 |                           |
                 v                           v
    StripeWebhookController       Ordine: status = processing
    handle()                                 |
                 |                           v
                 v                  Evento: OrderPaid
    Ordine: status = processing              |
                 |                           v
                 v                  Listener: GenerateBrtLabel
    Evento: OrderPaid                        |
                 |                           v
                 v                  Etichetta BRT creata
    Listener: GenerateBrtLabel
                 |
                 v
    Etichetta BRT creata
```


---


## 8. Struttura di sicurezza

```
                        Richiesta dell'utente
                               |
                               v
                    +---------------------+
                    | CSRF Protection     |   Protegge da attacchi
                    | (Cookie XSRF-TOKEN) |   cross-site
                    +---------------------+
                               |
                               v
                    +---------------------+
                    | auth:sanctum        |   Controlla se l'utente
                    | (Autenticazione)    |   e' loggato
                    +---------------------+
                               |
                               v
                    +---------------------+
                    | CheckAdmin          |   Controlla se l'utente
                    | (Solo per admin)    |   e' amministratore
                    +---------------------+
                               |
                               v
                    +---------------------+
                    | CheckCart            |   Controlla se il
                    | (Solo per checkout) |   carrello non e' vuoto
                    +---------------------+
                               |
                               v
                    +---------------------+
                    | Throttle            |   Limita il numero di
                    | (Limite richieste)  |   richieste al minuto
                    +---------------------+
                               |
                               v
                         CONTROLLER
                    (Esegue la logica)
```


---


## 9. Riepilogo rotte principali

### Rotte pubbliche (senza login)

```
GET  /                               Homepage
POST /api/custom-register            Registrazione
POST /api/custom-login               Login
GET  /api/locations/search           Cerca citta'
GET  /api/locations/by-cap           Cerca per CAP
POST /api/contact                    Invia messaggio contatto
GET  /api/session                    Dati sessione
POST /api/session/first-step         Salva primo step preventivo
GET  /api/tracking/search            Traccia spedizione (pubblico)
```

### Rotte protette (serve login)

```
GET  /api/orders                     Lista ordini
POST /api/create-direct-order        Crea ordine diretto
POST /api/stripe/create-payment      Crea pagamento Stripe
GET  /api/cart                       Mostra carrello
POST /api/cart                       Aggiungi al carrello
POST /api/brt/create-shipment        Crea spedizione BRT
GET  /api/wallet/balance             Saldo portafoglio
POST /api/wallet/top-up              Ricarica portafoglio
```

### Rotte admin (serve ruolo admin)

```
GET  /api/admin/dashboard            Statistiche
GET  /api/admin/orders               Tutti gli ordini
GET  /api/admin/users                Tutti gli utenti
GET  /api/admin/contact-messages     Messaggi di contatto
```


---


## Cosa hai imparato

- La struttura del progetto e' divisa in frontend e backend
- Il percorso dell'utente va dalla homepage al pacco spedito
- I dati passano da utente, a frontend, a backend, a database e ritorno
- I controller gestiscono le richieste, i modelli descrivono i dati
- Gli eventi automatizzano azioni (pagamento, etichetta BRT)
- La sicurezza e' a livelli: CSRF, autenticazione, ruolo admin


---


## Prossimo passo

Consulta il **[Glossario](../GLOSSARIO-SEMPLICE.md)** per i termini che non conosci.

Oppure torna al **[Percorso principiante](./PERCORSO-PRINCIPIANTE.md)** per rivedere le basi.
