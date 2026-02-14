# Riferimento: Modelli e Database

Lista completa di tutti i modelli con campi, tipi e relazioni.

---

## User (Utente)

**File**: `laravel-spedizionefacile-main/app/Models/User.php`
**Tabella**: `users`

### Campi

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | integer (auto) | ID univoco |
| `name` | string | Nome |
| `surname` | string | Cognome |
| `email` | string | Email (usata per il login) |
| `telephone_number` | string | Numero di telefono |
| `password` | string (hashed) | Password criptata |
| `referral_code` | string | Codice referral (solo Partner Pro) |
| `referred_by` | string | Codice referral di chi lo ha invitato |
| `identifier` | string | Identificativo univoco |
| `email_verified_at` | datetime | Data verifica email |
| `stripe_account_id` | string | ID account Stripe |
| `customer_id` | string | ID cliente Stripe |
| `verification_code` | string (hidden) | Codice di verifica temporaneo |
| `verification_code_expires_at` | datetime (hidden) | Scadenza codice |
| `role` | string | Ruolo: "User", "Admin", "Partner Pro" |
| `created_at` | timestamp | Data creazione |
| `updated_at` | timestamp (hidden) | Data ultimo aggiornamento |

### Relazioni

| Relazione | Tipo | Modello correlato | Descrizione |
|---|---|---|---|
| `addresses()` | hasMany | UserAddress | Rubrica indirizzi |
| `packages()` | hasMany | Package | Pacchi configurati |
| `orders()` | hasMany | Order | Ordini di spedizione |
| `walletMovements()` | hasMany | WalletMovement | Movimenti portafoglio |
| `referralUsagesAsPro()` | hasMany | ReferralUsage | Utilizzi codice referral |
| `withdrawalRequests()` | hasMany | WithdrawalRequest | Richieste prelievo |
| `proRequests()` | hasMany | ProRequest | Richieste Partner Pro |

### Metodi utili

- `isAdmin(): bool` - Controlla se e' admin
- `isPro(): bool` - Controlla se e' Partner Pro
- `walletBalance(): float` - Calcola saldo portafoglio
- `commissionBalance(): float` - Calcola saldo commissioni

---

## Order (Ordine)

**File**: `laravel-spedizionefacile-main/app/Models/Order.php`
**Tabella**: `orders`

### Campi

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | integer (auto) | ID univoco |
| `status` | string | Stato ordine (vedi [Stati Ordine](STATI-ORDINE.md)) |
| `user_id` | integer (FK) | ID utente proprietario |
| `subtotal` | integer | Totale in centesimi |
| `brt_parcel_id` | string | ID pacco BRT |
| `brt_numeric_sender_reference` | integer | Riferimento numerico mittente BRT |
| `brt_tracking_url` | string | URL tracking BRT |
| `brt_label_base64` | text | Etichetta PDF (base64) |
| `brt_pudo_id` | string | ID punto ritiro/consegna |
| `is_cod` | boolean | Contrassegno attivo |
| `cod_amount` | integer | Importo contrassegno (centesimi) |
| `brt_error` | text | Errore generazione etichetta |
| `brt_tracking_number` | string | Numero tracking BRT |
| `brt_parcel_number_to` | string | Ultimo numero collo |
| `brt_departure_depot` | string | Deposito BRT partenza |
| `brt_arrival_terminal` | string | Terminale BRT arrivo |
| `brt_arrival_depot` | string | Deposito BRT arrivo |
| `brt_delivery_zone` | string | Zona consegna BRT |
| `brt_series_number` | string | Numero serie BRT |
| `brt_service_type` | string | Tipo servizio BRT |
| `brt_raw_response` | json | Risposta completa BRT |
| `created_at` | timestamp | Data creazione |
| `updated_at` | timestamp | Data aggiornamento |

### Relazioni

| Relazione | Tipo | Modello correlato | Descrizione |
|---|---|---|---|
| `user()` | belongsTo | User | Utente proprietario |
| `transactions()` | hasMany | Transaction | Transazioni di pagamento |
| `packages()` | belongsToMany | Package | Pacchi (pivot: `package_order`) |

---

## Package (Pacco)

**File**: `laravel-spedizionefacile-main/app/Models/Package.php`
**Tabella**: `packages`

### Campi

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | integer (auto) | ID univoco |
| `package_type` | string | Tipo pacco (busta, scatola, pallet) |
| `quantity` | integer | Quantita' pacchi uguali |
| `weight` | string | Peso in kg |
| `first_size` | string | Lunghezza (cm) |
| `second_size` | string | Larghezza (cm) |
| `third_size` | string | Altezza (cm) |
| `weight_price` | decimal | Prezzo calcolato per peso |
| `volume_price` | decimal | Prezzo calcolato per volume |
| `single_price` | decimal | Prezzo finale unitario |
| `origin_address_id` | integer (FK) | ID indirizzo partenza |
| `destination_address_id` | integer (FK) | ID indirizzo destinazione |
| `service_id` | integer (FK) | ID servizio scelto |
| `user_id` | integer (FK) | ID utente proprietario |
| `content_description` | string | Descrizione contenuto |
| `created_at` | timestamp | Data creazione |
| `updated_at` | timestamp | Data aggiornamento |

### Relazioni

| Relazione | Tipo | Modello correlato | Descrizione |
|---|---|---|---|
| `user()` | belongsTo | User | Utente proprietario |
| `originAddress()` | hasOne | PackageAddress | Indirizzo partenza |
| `destinationAddress()` | hasOne | PackageAddress | Indirizzo destinazione |
| `service()` | hasOne | Service | Servizio di spedizione |

---

## PackageAddress (Indirizzo pacco)

**File**: `laravel-spedizionefacile-main/app/Models/PackageAddress.php`
**Tabella**: `package_addresses`

### Campi

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | integer (auto) | ID univoco |
| `type` | string | Tipo (privato, azienda) |
| `name` | string | Nome mittente/destinatario |
| `additional_information` | string | Info aggiuntive |
| `address` | string | Via/piazza/corso |
| `number_type` | string | Tipo numero civico |
| `address_number` | string | Numero civico |
| `intercom_code` | string | Codice citofono |
| `country` | string | Nazione |
| `city` | string | Citta' |
| `postal_code` | string | CAP |
| `province` | string | Sigla provincia |
| `telephone_number` | string | Telefono |
| `email` | string | Email |

---

## UserAddress (Indirizzo rubrica)

**File**: `laravel-spedizionefacile-main/app/Models/UserAddress.php`
**Tabella**: `user_addresses`

Stessi campi di PackageAddress, piu':

| Campo | Tipo | Descrizione |
|---|---|---|
| `default` | boolean | Se e' l'indirizzo predefinito |
| `user_id` | integer (FK) | ID utente proprietario |

Ha una logica automatica per gestire l'indirizzo predefinito (vedi `boot()` nel modello).

---

## Service (Servizio)

**File**: `laravel-spedizionefacile-main/app/Models/Service.php`
**Tabella**: `services`

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | integer (auto) | ID univoco |
| `service_type` | string | Tipo servizio (standard, express, ecc.) |
| `time` | string | Orario ritiro |
| `date` | string | Data ritiro |

---

## Transaction (Transazione)

**File**: `laravel-spedizionefacile-main/app/Models/Transaction.php`
**Tabella**: `transactions`

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | integer (auto) | ID univoco |
| `order_id` | integer (FK) | ID ordine associato |
| `total` | integer | Importo in centesimi |
| `ext_id` | string | ID esterno Stripe |
| `type` | string | Metodo: card, bank_transfer, wallet |
| `status` | string | Stato: succeeded, failed, pending |
| `provider_status` | string | Stato dettagliato provider |
| `failure_code` | string | Codice errore |
| `failure_message` | string | Messaggio errore |

---

## WalletMovement (Movimento portafoglio)

**File**: `laravel-spedizionefacile-main/app/Models/WalletMovement.php`
**Tabella**: `wallet_movements`

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | integer (auto) | ID univoco |
| `user_id` | integer (FK) | ID utente |
| `type` | string | credit (entrata) o debit (uscita) |
| `amount` | decimal(2) | Importo |
| `currency` | string | Valuta (EUR) |
| `status` | string | confirmed o pending |
| `idempotency_key` | string | Chiave anti-duplicati |
| `reference` | string | Riferimento (es. ID ordine) |
| `description` | string | Descrizione leggibile |
| `source` | string | Fonte (stripe, referral, admin) |

---

## Coupon

**File**: `laravel-spedizionefacile-main/app/Models/Coupon.php`
**Tabella**: `coupons`

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | integer (auto) | ID univoco |
| `code` | string | Codice coupon (es. SCONTO10) |
| `stripe_connected_account_id` | string | ID account Stripe |
| `percentage` | decimal | Percentuale sconto |
| `active` | boolean | Se il coupon e' attivo |

---

## Location (Localita')

**File**: `laravel-spedizionefacile-main/app/Models/Location.php`
**Tabella**: `locations`

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | integer (auto) | ID univoco |
| `postal_code` | string | CAP (es. 20121) |
| `place_name` | string | Nome citta'/localita' |
| `province` | string | Sigla provincia (es. MI) |

---

## ReferralUsage (Utilizzo referral)

**File**: `laravel-spedizionefacile-main/app/Models/ReferralUsage.php`
**Tabella**: `referral_usages`

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | integer (auto) | ID univoco |
| `buyer_id` | integer (FK) | ID acquirente |
| `pro_user_id` | integer (FK) | ID Partner Pro |
| `referral_code` | string | Codice utilizzato |
| `order_id` | integer (FK) | ID ordine |
| `order_amount` | decimal(2) | Importo ordine |
| `discount_amount` | decimal(2) | Sconto acquirente |
| `commission_amount` | decimal(2) | Commissione Pro |
| `status` | string | confirmed o pending |

---

## WithdrawalRequest (Richiesta prelievo)

**File**: `laravel-spedizionefacile-main/app/Models/WithdrawalRequest.php`
**Tabella**: `withdrawal_requests`

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | integer (auto) | ID univoco |
| `user_id` | integer (FK) | ID utente Pro |
| `amount` | decimal(2) | Importo richiesto |
| `currency` | string | Valuta (EUR) |
| `status` | string | pending, approved, rejected, completed |
| `admin_notes` | text | Note admin |
| `reviewed_at` | datetime | Data revisione |
| `reviewed_by` | integer (FK) | ID admin revisore |

---

## ProRequest (Richiesta Partner Pro)

**File**: `laravel-spedizionefacile-main/app/Models/ProRequest.php`
**Tabella**: `pro_requests`

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | integer (auto) | ID univoco |
| `user_id` | integer (FK) | ID utente |
| `company_name` | string | Nome azienda |
| `vat_number` | string | Partita IVA |
| `message` | text | Motivazione |
| `status` | string | pending, approved, rejected |
| `reviewed_at` | datetime | Data revisione |

---

## BillingAddress (Indirizzo fatturazione)

**File**: `laravel-spedizionefacile-main/app/Models/BillingAddress.php`
**Tabella**: `billing_addresses`

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | integer (auto) | ID univoco |
| `name` | string | Nome/ragione sociale |
| `address` | string | Via |
| `city` | string | Citta' |
| `province_name` | string | Nome provincia |
| `postal_code` | string | CAP |

---

## Setting (Impostazione)

**File**: `laravel-spedizionefacile-main/app/Models/Setting.php`
**Tabella**: `settings`

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | integer (auto) | ID univoco |
| `key` | string | Nome impostazione |
| `value` | text | Valore impostazione |

Metodi statici: `Setting::get('key', 'default')` e `Setting::set('key', 'value')`.

---

## ContactMessage (Messaggio contatto)

**File**: `laravel-spedizionefacile-main/app/Models/ContactMessage.php`
**Tabella**: `contact_messages`

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | integer (auto) | ID univoco |
| `name` | string | Nome mittente |
| `surname` | string | Cognome mittente |
| `email` | string | Email mittente |
| `telephone_number` | string | Telefono |
| `address` | string | Indirizzo |
| `message` | text | Testo messaggio |
| `read_at` | datetime | Data lettura admin |

---

## Tabella pivot: package_order

Collega ordini e pacchi (relazione molti-a-molti).

| Campo | Tipo | Descrizione |
|---|---|---|
| `order_id` | integer (FK) | ID ordine |
| `package_id` | integer (FK) | ID pacco |
