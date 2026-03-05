# Mappa dei Dati - SpediamoFacile

Questo documento descrive tutti i modelli di dati, i loro campi, le relazioni e i file che li utilizzano.

I file modello si trovano in: `laravel-spedizionefacile-main/app/Models/`

---

## User (Utente)

**File:** `app/Models/User.php`

Rappresenta una persona registrata sul sito.

### Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| name | string | Nome |
| surname | string | Cognome |
| email | string | Email (usata per il login) |
| telephone_number | string | Numero di telefono con prefisso |
| password | hashed | Password (criptata automaticamente) |
| role | string | Ruolo: "User", "Admin", "Partner Pro" |
| referral_code | string | Codice referral univoco di 8 caratteri (solo Pro) |
| referred_by | string | Codice referral di chi ha invitato l'utente |
| identifier | string | Identificativo univoco |
| email_verified_at | datetime | Data/ora verifica email (null = non verificata) |
| stripe_account_id | string | ID account Stripe Connect |
| customer_id | string | ID cliente Stripe (per pagamenti) |
| verification_code | string | Codice verifica a 6 cifre (temporaneo) |
| verification_code_expires_at | datetime | Scadenza del codice di verifica |

### Relazioni

- `addresses()` -> hasMany `UserAddress` (rubrica indirizzi)
- `packages()` -> hasMany `Package` (pacchi configurati)
- `orders()` -> hasMany `Order` (ordini di spedizione)
- `walletMovements()` -> hasMany `WalletMovement` (movimenti portafoglio)
- `referralUsagesAsPro()` -> hasMany `ReferralUsage` (utilizzi del codice referral)
- `withdrawalRequests()` -> hasMany `WithdrawalRequest` (richieste di prelievo)
- `proRequests()` -> hasMany `ProRequest` (richieste di diventare Pro)

### Metodi importanti

- `isAdmin()` -> verifica se ruolo e "Admin"
- `isPro()` -> verifica se ruolo e "Partner Pro"
- `walletBalance()` -> calcola saldo portafoglio (crediti - debiti confermati)
- `commissionBalance()` -> calcola saldo commissioni (guadagnato - prelevato)

### Usato in

- `CustomRegisterController.php` (creazione)
- `CustomLoginController.php` (login e verifica)
- `StripeController.php` (customer Stripe)
- `ReferralController.php` (codici referral)
- `WalletController.php` (saldo)
- `AdminController.php` (gestione utenti)

---

## Order (Ordine)

**File:** `app/Models/Order.php`

Rappresenta un ordine di spedizione.

### Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| status | string | Stato dell'ordine (vedi costanti) |
| user_id | integer | ID dell'utente proprietario |
| subtotal | integer | Totale in centesimi (gestito con MyMoney) |
| brt_parcel_id | string | ID pacco nel sistema BRT |
| brt_numeric_sender_reference | string | Riferimento numerico mittente BRT |
| brt_tracking_url | string | Link per tracking BRT |
| brt_label_base64 | text | Etichetta PDF codificata in base64 |
| brt_pudo_id | string | ID punto di ritiro/consegna PUDO |
| is_cod | boolean | Se pagamento in contrassegno |
| cod_amount | integer | Importo contrassegno in centesimi |
| brt_error | text | Eventuale errore generazione etichetta |
| brt_tracking_number | string | Numero di tracking BRT (parcelNumberFrom) |
| brt_parcel_number_to | string | Ultimo numero collo |
| brt_departure_depot | string | Codice deposito BRT di partenza |
| brt_arrival_terminal | string | Codice terminale BRT di arrivo |
| brt_arrival_depot | string | Codice deposito BRT di arrivo |
| brt_delivery_zone | string | Zona di consegna BRT |
| brt_series_number | string | Numero di serie BRT |
| brt_service_type | string | Tipo di servizio BRT |
| brt_raw_response | json | Risposta JSON completa da BRT |

### Stati possibili

| Costante | Valore | Italiano |
|----------|--------|----------|
| PENDING | pending | In attesa |
| PROCESSING | processing | In lavorazione |
| PAYMENT_FAILED | payment_failed | Fallito |
| IN_TRANSIT | in_transit | In transito |
| COMPLETED | completed | Completato |
| - | cancelled | Annullato |
| - | delivered | Consegnato |
| - | in_giacenza | In giacenza |

### Relazioni

- `user()` -> belongsTo `User`
- `transactions()` -> hasMany `Transaction`
- `packages()` -> belongsToMany `Package` tramite tabella `package_order`

### Usato in

- `StripeController.php` (creazione ordine, pagamento)
- `OrderController.php` (CRUD ordini)
- `BrtController.php` (spedizione BRT)
- `GenerateBrtLabel.php` (generazione etichetta automatica)
- `StripeWebhookController.php` (webhook pagamento)
- `AdminController.php` (gestione admin)

---

## Package (Pacco/Collo)

**File:** `app/Models/Package.php`

Rappresenta un singolo pacco da spedire.

### Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| package_type | string | Tipo: "busta", "scatola", "pallet" |
| quantity | integer | Numero di pacchi identici |
| weight | string | Peso in kg |
| first_size | string | Lunghezza in cm |
| second_size | string | Larghezza in cm |
| third_size | string | Altezza in cm |
| weight_price | numeric | Prezzo calcolato per peso |
| volume_price | numeric | Prezzo calcolato per volume |
| single_price | integer | Prezzo finale in centesimi (per quantita totale) |
| origin_address_id | integer | FK indirizzo di partenza |
| destination_address_id | integer | FK indirizzo di destinazione |
| service_id | integer | FK servizio di spedizione |
| user_id | integer | FK utente proprietario |
| content_description | string | Descrizione del contenuto |

### Relazioni

- `user()` -> belongsTo `User`
- `originAddress()` -> hasOne `PackageAddress`
- `destinationAddress()` -> hasOne `PackageAddress`
- `service()` -> hasOne `Service`

### Usato in

- `CartController.php` (gestione carrello)
- `GuestCartController.php` (carrello ospite)
- `OrderController.php` (creazione ordine diretto)
- `StripeController.php` (creazione ordine da carrello)
- `BrtService.php` (dati spedizione)

---

## PackageAddress (Indirizzo Pacco)

**File:** `app/Models/PackageAddress.php`

Indirizzo specifico per una spedizione (partenza o destinazione).

### Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| type | string | Tipo: "privato", "azienda" |
| name | string | Nome mittente/destinatario |
| additional_information | string | Info extra (es. "piano 3") |
| address | string | Via/piazza/corso |
| number_type | string | Tipo numero civico |
| address_number | string | Numero civico |
| intercom_code | string | Codice citofono |
| country | string | Nazione |
| city | string | Citta |
| postal_code | string | CAP |
| province | string | Sigla provincia (es. "MI") |
| telephone_number | string | Telefono |
| email | string | Email |

### Relazioni

- `packagesAsOrigin()` -> hasMany `Package` (come partenza)
- `packagesAsDestination()` -> hasMany `Package` (come destinazione)

### Usato in

- `CartController.php` (creazione indirizzi con pacchi)
- `OrderController.php` (ordine diretto)
- `BrtService.php` (dati per API BRT)
- `CustomLoginController.php` (trasferimento carrello ospite)

---

## Service (Servizio di Spedizione)

**File:** `app/Models/Service.php`

Tipo di servizio scelto per la spedizione.

### Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| service_type | string | Tipo: "standard", "express", "economy", "Nessuno" |
| time | string | Orario di ritiro scelto |
| date | string | Data di ritiro scelta |

### Relazioni

- `packages()` -> hasMany `Package`

### Usato in

- `CartController.php`, `OrderController.php`, `CustomLoginController.php`
- `BrtService.php` (mappatura servizi -> parametri BRT)

---

## BillingAddress (Indirizzo di Fatturazione)

**File:** `app/Models/BillingAddress.php`

Indirizzo per la fatturazione (separato da quello di spedizione).

### Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| name | string | Nome o ragione sociale |
| address | string | Via |
| city | string | Citta |
| province_name | string | Nome provincia |
| postal_code | string | CAP |

### Usato in

- `BillingAddressController.php`

---

## UserAddress (Indirizzo Utente / Rubrica)

**File:** `app/Models/UserAddress.php`

Indirizzo salvato nella rubrica personale dell'utente.

### Campi

Stessi campi di `PackageAddress` + `default` (boolean) e `user_id`.

### Logica automatica (boot)

- **Creazione:** il primo indirizzo diventa predefinito; se nuovo indirizzo e predefinito, toglie predefinito dagli altri
- **Modifica:** se impostato come predefinito, toglie predefinito dagli altri
- **Cancellazione:** se era predefinito, il piu vecchio diventa il nuovo predefinito

### Relazioni

- `user()` -> belongsTo `User`

### Usato in

- `UserAddressController.php`

---

## Transaction (Transazione di Pagamento)

**File:** `app/Models/Transaction.php`

Singolo tentativo di pagamento per un ordine.

### Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| order_id | integer | FK ordine |
| total | integer | Importo in centesimi (gestito con MyMoney) |
| ext_id | string | ID pagamento su Stripe |
| type | string | Metodo: "card", "bank_transfer", "paypal", "wallet", "bonifico" |
| status | string | Stato: "succeeded", "failed", "pending" |
| provider_status | string | Stato dettagliato dal provider |
| failure_code | string | Codice errore |
| failure_message | string | Messaggio errore leggibile |

### Usato in

- `StripeController.php` (creazione dopo pagamento)
- `StripeWebhookController.php` (aggiornamento da webhook)
- `OrderController.php` (visualizzazione con ordine)

---

## WalletMovement (Movimento Portafoglio)

**File:** `app/Models/WalletMovement.php`

Singolo movimento nel portafoglio virtuale.

### Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| user_id | integer | FK utente |
| type | string | "credit" (entrata) o "debit" (uscita) |
| amount | decimal:2 | Importo in euro |
| currency | string | Valuta (EUR) |
| status | string | "confirmed" o "pending" |
| idempotency_key | string | Chiave per evitare duplicati |
| reference | string | Riferimento (es. ID ordine o ID Stripe) |
| description | string | Descrizione leggibile |
| source | string | Fonte: "stripe", "wallet", "commission", "admin" |

### Relazioni

- `user()` -> belongsTo `User`

### Usato in

- `WalletController.php` (ricarica e pagamento)
- `ReferralController.php` (accredito commissioni)
- `AdminController.php` (panoramica admin)

---

## Coupon (Buono Sconto)

**File:** `app/Models/Coupon.php`

Codice sconto applicabile al pagamento.

### Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| code | string | Codice (es. "SCONTO10") |
| stripe_connected_account_id | string | ID account Stripe collegato |
| percentage | integer | Percentuale di sconto |
| active | boolean | Se attivo e utilizzabile |

### Usato in

- `CouponController.php`

---

## ReferralUsage (Utilizzo Codice Referral)

**File:** `app/Models/ReferralUsage.php`

Registra ogni utilizzo di un codice referral.

### Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| buyer_id | integer | FK acquirente |
| pro_user_id | integer | FK Partner Pro |
| referral_code | string | Codice utilizzato |
| order_id | integer | FK ordine |
| order_amount | decimal:2 | Importo ordine |
| discount_amount | decimal:2 | Sconto applicato (5%) |
| commission_amount | decimal:2 | Commissione al Pro (5%) |
| status | string | "confirmed" o "pending" |

### Relazioni

- `buyer()` -> belongsTo `User`
- `proUser()` -> belongsTo `User`
- `order()` -> belongsTo `Order`

### Usato in

- `ReferralController.php` (creazione e consultazione)
- `User.php` (calcolo saldo commissioni)
- `AdminController.php` (statistiche)

---

## ContactMessage (Messaggio di Contatto)

**File:** `app/Models/ContactMessage.php`

Messaggio inviato dal form "Contattaci".

### Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| name | string | Nome |
| surname | string | Cognome |
| email | string | Email |
| telephone_number | string | Telefono |
| address | string | Indirizzo |
| message | text | Testo del messaggio |
| read_at | datetime | Data lettura da admin (null = non letto) |

### Usato in

- `ContactController.php` (creazione)
- `AdminController.php` (lettura e gestione)

---

## ProRequest (Richiesta Partner Pro)

**File:** `app/Models/ProRequest.php`

Richiesta di un utente di diventare Partner Pro.

### Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| user_id | integer | FK utente |
| company_name | string | Nome azienda |
| vat_number | string | Partita IVA |
| message | text | Motivazione |
| status | string | "pending", "approved", "rejected" |
| reviewed_at | datetime | Data revisione |

### Relazioni

- `user()` -> belongsTo `User`

### Usato in

- `ProRequestController.php` (invio e gestione)

---

## WithdrawalRequest (Richiesta di Prelievo)

**File:** `app/Models/WithdrawalRequest.php`

Richiesta di prelievo commissioni da Partner Pro.

### Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| user_id | integer | FK utente Pro |
| amount | decimal:2 | Importo richiesto |
| currency | string | Valuta (EUR) |
| status | string | "pending", "approved", "rejected", "completed" |
| admin_notes | text | Note admin |
| reviewed_at | datetime | Data revisione |
| reviewed_by | integer | FK admin revisore |

### Relazioni

- `user()` -> belongsTo `User`
- `reviewer()` -> belongsTo `User` (admin)

### Usato in

- `WithdrawalController.php` (creazione e lista)
- `AdminController.php` (approvazione/rifiuto)
- `User.php` (calcolo saldo commissioni)

---

## Setting (Impostazione)

**File:** `app/Models/Setting.php`

Impostazione chiave-valore del sito.

### Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| key | string | Chiave (es. "stripe_secret") |
| value | text | Valore |

### Metodi statici

- `Setting::get('chiave', 'default')` -> legge valore
- `Setting::set('chiave', 'valore')` -> salva/aggiorna

### Usato in

- `StripeController.php` (chiavi Stripe)
- `WalletController.php` (chiavi Stripe)
- `SettingsController.php` (gestione impostazioni)
- `AdminController.php` (impostazioni admin)

---

## Location (Localita)

**File:** `app/Models/Location.php`

Localita italiana per autocompletamento indirizzi.

### Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| postal_code | string | CAP (es. "20121") |
| place_name | string | Nome citta (es. "Milano") |
| province | string | Sigla provincia (es. "MI") |

### Usato in

- `LocationController.php` (ricerca e autocompletamento)
- `BrtService.php` (risoluzione citta per compatibilita BRT)

---

## Tabelle ponte (senza modello dedicato)

### cart_user

Collega utenti ai pacchi nel carrello.

| Campo | Descrizione |
|-------|-------------|
| user_id | FK utente |
| package_id | FK pacco |
| created_at | Data aggiunta |

Usata in: `CartController.php`, `StripeController.php`, `CustomLoginController.php`, `StripeWebhookController.php`

### package_order

Collega ordini ai pacchi (relazione molti-a-molti).

| Campo | Descrizione |
|-------|-------------|
| order_id | FK ordine |
| package_id | FK pacco |
| quantity | Quantita |
| created_at | Data creazione |
| updated_at | Data aggiornamento |

Usata in: `StripeController.php`, `OrderController.php`
