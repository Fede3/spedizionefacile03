# Moduli - SpediamoFacile

Questo documento definisce i confini di ogni modulo dell'applicazione: quali file ne fanno parte, cosa entra, cosa esce, e cosa NON deve essere mescolato.

---

## 1. Modulo Preventivo

**Scopo:** Calcolare il prezzo di una spedizione in base a peso e volume dei colli.

### File coinvolti

**Backend:**
- `laravel-spedizionefacile-main/app/Http/Controllers/SessionController.php` - Salva dati preventivo in sessione
- `laravel-spedizionefacile-main/app/Http/Controllers/LocationController.php` - Autocompletamento citta/CAP

**Frontend:**
- `nuxt-spedizionefacile-master/components/Homepage/PreventivoRapido.vue` - Form preventivo homepage
- `nuxt-spedizionefacile-master/pages/preventivo.vue` - Pagina preventivo dedicata
- `nuxt-spedizionefacile-master/stores/userStore.js` - Stato globale (shipmentDetails, packages, totalPrice)
- `nuxt-spedizionefacile-master/composables/useSession.js` - Lettura sessione server

### Input

- Citta e CAP di partenza/destinazione
- Tipo pacco, peso, dimensioni, quantita

### Output

- Prezzo calcolato per ogni collo
- Prezzo totale della spedizione
- Dati salvati in sessione server e store frontend

### NON deve contenere

- Logica di pagamento
- Comunicazione con BRT
- Gestione utenti/autenticazione

---

## 2. Modulo Spedizione

**Scopo:** Configurare tutti i dettagli di una spedizione (indirizzi, servizi, colli) e gestire il carrello.

### File coinvolti

**Backend:**
- `laravel-spedizionefacile-main/app/Http/Controllers/CartController.php` - Carrello utente loggato
- `laravel-spedizionefacile-main/app/Http/Controllers/GuestCartController.php` - Carrello ospite (sessione)
- `laravel-spedizionefacile-main/app/Http/Controllers/PackageController.php` - Lista pacchi utente
- `laravel-spedizionefacile-main/app/Http/Controllers/SavedShipmentController.php` - Spedizioni salvate per riuso
- `laravel-spedizionefacile-main/app/Http/Controllers/OrderController.php` - CRUD ordini, ordine diretto
- `laravel-spedizionefacile-main/app/Http/Controllers/AddressController.php` - Indirizzi di spedizione
- `laravel-spedizionefacile-main/app/Models/Package.php` - Modello pacco
- `laravel-spedizionefacile-main/app/Models/PackageAddress.php` - Modello indirizzo pacco
- `laravel-spedizionefacile-main/app/Models/Service.php` - Modello servizio spedizione
- `laravel-spedizionefacile-main/app/Models/Order.php` - Modello ordine
- `laravel-spedizionefacile-main/app/Http/Resources/PackageResource.php` - Formattazione JSON pacco
- `laravel-spedizionefacile-main/app/Http/Resources/OrderResource.php` - Formattazione JSON ordine
- `laravel-spedizionefacile-main/app/Http/Requests/PackageStoreRequest.php` - Validazione dati pacco
- `laravel-spedizionefacile-main/app/Http/Middleware/CheckCart.php` - Verifica carrello non vuoto

**Frontend:**
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue` - Step di configurazione
- `nuxt-spedizionefacile-master/pages/carrello.vue` - Pagina carrello
- `nuxt-spedizionefacile-master/pages/riepilogo.vue` - Riepilogo prima del pagamento
- `nuxt-spedizionefacile-master/pages/checkout.vue` - Checkout
- `nuxt-spedizionefacile-master/composables/useCart.js` - Composable carrello
- `nuxt-spedizionefacile-master/pages/account/spedizioni/index.vue` - Lista spedizioni utente
- `nuxt-spedizionefacile-master/pages/account/spedizioni/[id].vue` - Dettaglio spedizione
- `nuxt-spedizionefacile-master/pages/account/spedizioni-configurate.vue` - Spedizioni salvate
- `nuxt-spedizionefacile-master/middleware/shipment-validation.js` - Validazione step

### Input

- Dati dal modulo Preventivo (pacchi, indirizzi)
- Indirizzi dalla rubrica utente
- Servizi aggiuntivi scelti

### Output

- Ordine creato con stato `pending`
- Pacchi collegati all'ordine tramite `package_order`

### NON deve contenere

- Logica di pagamento Stripe (usa solo `Order.subtotal`)
- Comunicazione diretta con API BRT
- Calcolo commissioni referral

---

## 3. Modulo Pagamento

**Scopo:** Gestire tutti i metodi di pagamento (Stripe, portafoglio, bonifico) e le transazioni.

### File coinvolti

**Backend:**
- `laravel-spedizionefacile-main/app/Http/Controllers/StripeController.php` - Pagamenti Stripe, gestione carte
- `laravel-spedizionefacile-main/app/Http/Controllers/StripeWebhookController.php` - Webhook Stripe
- `laravel-spedizionefacile-main/app/Http/Controllers/StripeConnectController.php` - Stripe Connect (Pro)
- `laravel-spedizionefacile-main/app/Http/Controllers/CouponController.php` - Buoni sconto
- `laravel-spedizionefacile-main/app/Models/Transaction.php` - Modello transazione
- `laravel-spedizionefacile-main/app/Models/Coupon.php` - Modello coupon
- `laravel-spedizionefacile-main/app/Models/Setting.php` - Chiavi API Stripe
- `laravel-spedizionefacile-main/app/Events/OrderPaid.php` - Evento ordine pagato
- `laravel-spedizionefacile-main/app/Events/OrderPaymentFailed.php` - Evento pagamento fallito

**Frontend:**
- `nuxt-spedizionefacile-master/pages/checkout.vue` - Pagina checkout
- `nuxt-spedizionefacile-master/pages/account/carte.vue` - Gestione carte salvate

### Input

- Ordine con subtotale (dal modulo Spedizione)
- Metodo di pagamento scelto dall'utente
- Eventuale coupon o codice referral

### Output

- Transaction creata (succeeded/failed)
- Ordine aggiornato (completed/payment_failed)
- Evento `OrderPaid` lanciato (attiva modulo BRT)
- Carrello svuotato

### NON deve contenere

- Creazione di pacchi o indirizzi
- Logica BRT (gestita dai listener)
- Calcolo prezzi (il subtotale arriva gia calcolato)

---

## 4. Modulo Corriere/BRT

**Scopo:** Comunicare con le API di BRT per creare spedizioni, generare etichette e gestire il tracking.

### File coinvolti

**Backend:**
- `laravel-spedizionefacile-main/app/Http/Controllers/BrtController.php` - Endpoints API BRT
- `laravel-spedizionefacile-main/app/Services/BrtService.php` - Logica comunicazione con API BRT
- `laravel-spedizionefacile-main/app/Listeners/GenerateBrtLabel.php` - Generazione automatica etichetta
- `laravel-spedizionefacile-main/app/Mail/ShipmentLabelMail.php` - Email con etichetta PDF
- `laravel-spedizionefacile-main/app/Models/Location.php` - Risoluzione citta per BRT

**Frontend:**
- `nuxt-spedizionefacile-master/pages/traccia-spedizione.vue` - Tracking pubblico
- `nuxt-spedizionefacile-master/pages/account/spedizioni/[id].vue` - Dettaglio con tracking

### Input

- Ordine pagato (evento `OrderPaid`)
- Dati pacchi (peso, dimensioni, quantita)
- Indirizzi partenza e destinazione
- Opzioni: contrassegno (is_cod, cod_amount), PUDO, note

### Output

- Etichetta PDF in base64 salvata su `Order.brt_label_base64`
- Dati tracking: `brt_parcel_id`, `brt_tracking_number`, `brt_tracking_url`
- Stato ordine aggiornato a `in_transit`
- Email inviata all'utente con etichetta

### NON deve contenere

- Logica di pagamento
- Gestione carrello
- Calcolo prezzi

### Configurazione necessaria (file .env)

```
BRT_API_URL=https://api.brt.it/rest/v1/shipments
BRT_CLIENT_ID=...
BRT_PASSWORD=...
BRT_DEPARTURE_DEPOT=...
BRT_PUDO_API_URL=https://api.brt.it
BRT_PUDO_TOKEN=...
```

---

## 5. Modulo Utente/Auth

**Scopo:** Gestire registrazione, login, verifica email, profilo utente e rubrica indirizzi.

### File coinvolti

**Backend:**
- `laravel-spedizionefacile-main/app/Http/Controllers/CustomRegisterController.php` - Registrazione
- `laravel-spedizionefacile-main/app/Http/Controllers/CustomLoginController.php` - Login + verifica codice
- `laravel-spedizionefacile-main/app/Http/Controllers/VerificationController.php` - Verifica email via link
- `laravel-spedizionefacile-main/app/Http/Controllers/GoogleController.php` - Login con Google
- `laravel-spedizionefacile-main/app/Http/Controllers/UserController.php` - Profilo utente
- `laravel-spedizionefacile-main/app/Http/Controllers/UserAddressController.php` - Rubrica indirizzi
- `laravel-spedizionefacile-main/app/Http/Controllers/BillingAddressController.php` - Indirizzo fatturazione
- `laravel-spedizionefacile-main/app/Http/Controllers/ChangePasswordController.php` - Cambio/recupero password
- `laravel-spedizionefacile-main/app/Http/Controllers/PasswordResetRequestController.php` - Richiesta reset password
- `laravel-spedizionefacile-main/app/Http/Controllers/ContactController.php` - Form contattaci
- `laravel-spedizionefacile-main/app/Jobs/SendVerificationEmailJob.php` - Invio email verifica
- `laravel-spedizionefacile-main/app/Mail/VerificationEmail.php` - Template email verifica
- `laravel-spedizionefacile-main/app/Mail/ResetPasswordEmail.php` - Template email reset password
- `laravel-spedizionefacile-main/app/Models/User.php` - Modello utente
- `laravel-spedizionefacile-main/app/Models/UserAddress.php` - Modello indirizzo rubrica
- `laravel-spedizionefacile-main/app/Models/BillingAddress.php` - Modello indirizzo fatturazione
- `laravel-spedizionefacile-main/app/Models/ContactMessage.php` - Modello messaggio contatto
- `laravel-spedizionefacile-main/app/Http/Requests/RegisterRequest.php` - Validazione registrazione
- `laravel-spedizionefacile-main/app/Http/Middleware/SecurityHeaders.php` - Header sicurezza

**Frontend:**
- `nuxt-spedizionefacile-master/pages/registrazione.vue` - Pagina registrazione
- `nuxt-spedizionefacile-master/pages/autenticazione.vue` - Pagina login
- `nuxt-spedizionefacile-master/pages/login.vue` - Pagina login alternativa
- `nuxt-spedizionefacile-master/pages/verifica-email.vue` - Pagina verifica email
- `nuxt-spedizionefacile-master/pages/recupera-password.vue` - Recupero password
- `nuxt-spedizionefacile-master/pages/aggiorna-password.vue` - Aggiornamento password
- `nuxt-spedizionefacile-master/pages/account/profilo.vue` - Profilo utente
- `nuxt-spedizionefacile-master/pages/account/indirizzi/index.vue` - Rubrica indirizzi
- `nuxt-spedizionefacile-master/pages/contatti.vue` - Pagina contatti
- `nuxt-spedizionefacile-master/middleware/email-verification.js` - Middleware verifica email

### Input

- Dati registrazione (nome, cognome, email, password, telefono)
- Credenziali login (email, password)
- Codice verifica a 6 cifre
- Eventuale codice referral (referred_by)

### Output

- Utente creato e autenticato
- Sessione e token Sanctum
- Carrello ospite trasferito nel database (al login)

### NON deve contenere

- Logica di pagamento
- Comunicazione con BRT
- Calcolo prezzi spedizioni

---

## 6. Modulo Admin

**Scopo:** Pannello di amministrazione per gestire utenti, ordini, spedizioni, portafogli e impostazioni.

### File coinvolti

**Backend:**
- `laravel-spedizionefacile-main/app/Http/Controllers/AdminController.php` - Tutte le funzioni admin
- `laravel-spedizionefacile-main/app/Http/Controllers/ProRequestController.php` - Gestione richieste Pro
- `laravel-spedizionefacile-main/app/Http/Controllers/SettingsController.php` - Impostazioni sito
- `laravel-spedizionefacile-main/app/Http/Middleware/CheckAdmin.php` - Verifica ruolo Admin
- `laravel-spedizionefacile-main/app/Models/Setting.php` - Modello impostazioni

**Frontend:**
- `nuxt-spedizionefacile-master/pages/account/amministrazione/index.vue` - Pannello admin
- `nuxt-spedizionefacile-master/middleware/admin.js` - Middleware accesso admin
- `nuxt-spedizionefacile-master/composables/UseAdminImage.js` - Gestione immagini admin

### Funzionalita

- **Dashboard:** statistiche ordini, utenti, ricavi
- **Ordini:** lista, cambio stato, rigenerazione etichetta BRT
- **Spedizioni:** lista spedizioni BRT, dettagli
- **Utenti:** lista, approvazione, cambio ruolo, eliminazione
- **Portafoglio:** panoramica saldi, movimenti per utente
- **Prelievi:** approvazione/rifiuto richieste Partner Pro
- **Referral:** statistiche codici
- **Richieste Pro:** approvazione/rifiuto
- **Messaggi:** lettura messaggi contatto
- **Impostazioni:** configurazione chiavi Stripe, BRT, ecc.

### Input

- Richieste API autenticate con ruolo Admin (middleware `CheckAdmin`)

### Output

- Dati aggregati e statistiche
- Modifiche a ordini, utenti, impostazioni

### NON deve contenere

- Logica di calcolo prezzi
- Comunicazione diretta con API BRT (delega a `BrtService`)
- Gestione carrello

---

## 7. Modulo Portafoglio/Wallet

**Scopo:** Gestire il portafoglio digitale (ricariche, pagamenti, saldo) e il sistema referral con commissioni.

### File coinvolti

**Backend:**
- `laravel-spedizionefacile-main/app/Http/Controllers/WalletController.php` - Saldo, movimenti, ricarica, pagamento
- `laravel-spedizionefacile-main/app/Http/Controllers/ReferralController.php` - Codici referral e commissioni
- `laravel-spedizionefacile-main/app/Http/Controllers/WithdrawalController.php` - Richieste di prelievo
- `laravel-spedizionefacile-main/app/Http/Controllers/ProRequestController.php` - Richieste Partner Pro
- `laravel-spedizionefacile-main/app/Models/WalletMovement.php` - Modello movimento
- `laravel-spedizionefacile-main/app/Models/ReferralUsage.php` - Modello utilizzo referral
- `laravel-spedizionefacile-main/app/Models/WithdrawalRequest.php` - Modello richiesta prelievo
- `laravel-spedizionefacile-main/app/Models/ProRequest.php` - Modello richiesta Pro

**Frontend:**
- `nuxt-spedizionefacile-master/pages/account/portafoglio.vue` - Pagina portafoglio
- `nuxt-spedizionefacile-master/pages/account/bonus.vue` - Pagina codici referral
- `nuxt-spedizionefacile-master/pages/account/prelievi.vue` - Pagina prelievi
- `nuxt-spedizionefacile-master/pages/account/account-pro.vue` - Pagina account Pro

### Input

- Importo ricarica + carta di pagamento (per top-up)
- Codice referral da validare/applicare
- Richiesta di prelievo commissioni

### Output

- `WalletMovement` creati (credit/debit)
- `ReferralUsage` con sconto e commissione
- `WithdrawalRequest` per approvazione admin
- Saldo portafoglio aggiornato
- Saldo commissioni aggiornato

### NON deve contenere

- Creazione ordini
- Generazione etichette BRT
- Gestione indirizzi
