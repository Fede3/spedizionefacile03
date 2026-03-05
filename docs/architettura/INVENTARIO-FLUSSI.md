# INVENTARIO FLUSSI - SpediamoFacile

Inventario completo dei flussi, moduli e dipendenze esterne del progetto.
Basato sulla lettura diretta del codice sorgente.

---

## 1. ELENCO COMPLETO DEI FLUSSI

---

### 1.1 Calcolo Preventivo

Il preventivo calcola il prezzo di una spedizione in base a peso, volume e CAP.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/components/Preventivo.vue` | Form preventivo: calcPriceWithWeight, calcPriceWithVolume, checkPrices |
| Frontend | `nuxt/components/Homepage/PreventivoRapido.vue` | Preventivo rapido in homepage |
| Frontend | `nuxt/composables/usePriceBands.js` | Carica fasce prezzo dal server con fallback hardcoded |
| Frontend | `nuxt/composables/useSession.js` | Legge sessione preventivo dal server |
| Frontend | `nuxt/composables/useSmartValidation.js` | Validazione campi (peso, dimensioni, CAP, provincia) |
| Backend | `laravel/app/Http/Controllers/SessionController.php` | Calcolo prezzo server-side, salvataggio in sessione |
| Backend | `laravel/app/Http/Controllers/PublicPriceBandController.php` | API pubblica fasce di prezzo |
| Backend | `laravel/app/Models/PriceBand.php` | Modello fasce di prezzo (tabella price_bands) |

**Dati in ingresso:**
- Citta' e CAP di partenza e destinazione
- Pacchi: tipo, peso, dimensioni (lunghezza, larghezza, altezza), quantita'

**Dati in uscita:**
- Prezzo per peso, prezzo per volume, prezzo finale = MAX(peso, volume) + supplemento CAP90
- Prezzo totale (single_price = prezzo_unitario x quantita')
- Sessione aggiornata con step=2

**Logica prezzo:**
- 7 fasce peso: 0-2kg=8.90, 2-5=11.90, 5-10=14.90, 10-25=19.90, 25-50=29.90, 50-75=39.90, 75-100=49.90
- 7 fasce volume analoghe
- Supplemento +2.50 EUR per ogni CAP che inizia con "90" (partenza e/o destinazione)
- Le fasce sono dinamiche: prima cerca nel DB (price_bands), poi fallback hardcoded

**Dipendenze esterne:** Nessuna (calcolo locale + DB).

**Rotte API:**
- `GET /api/session` — Legge sessione corrente
- `POST /api/session/first-step` — Calcola e salva il preventivo
- `GET /api/public/price-bands` — Fasce prezzo pubbliche

---

### 1.2 Carrello Ospite (sessione)

Gestisce il carrello per utenti non registrati. Salvato nella sessione PHP.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/carrello.vue` | Pagina carrello |
| Frontend | `nuxt/composables/useCart.js` | Switch automatico carrello autenticato/ospite |
| Backend | `laravel/app/Http/Controllers/GuestCartController.php` | CRUD carrello in sessione |

**Dati in ingresso:**
- Pacchi (tipo, peso, dimensioni, quantita', single_price)
- Indirizzi di partenza e destinazione
- Servizi aggiuntivi

**Dati in uscita:**
- Array pacchi in sessione con meta (empty, subtotal, total)

**Logica:** I duplicati (stesse dimensioni, stessi indirizzi) vengono uniti aumentando la quantita'.
Prezzi salvati in centesimi (single_price = euro x 100).

**Dipendenze esterne:** Nessuna.

**Rotte API:**
- `GET /api/guest-cart` — Contenuto carrello ospite
- `POST /api/guest-cart` — Aggiunge pacco
- `DELETE /api/empty-guest-cart` — Svuota carrello

---

### 1.3 Carrello Utente Autenticato (database)

Gestisce il carrello per utenti registrati. Salvato nel database (tabelle packages, cart_user).

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/carrello.vue` | Pagina carrello |
| Frontend | `nuxt/pages/riepilogo.vue` | Riepilogo/modifica spedizione |
| Frontend | `nuxt/composables/useCart.js` | Switch automatico carrello autenticato/ospite |
| Backend | `laravel/app/Http/Controllers/CartController.php` | CRUD carrello in DB, auto-merge, raggruppamento per indirizzo |
| Backend | `laravel/app/Models/Package.php` | Modello pacco |
| Backend | `laravel/app/Models/PackageAddress.php` | Modello indirizzo pacco |
| Backend | `laravel/app/Models/Service.php` | Modello servizi aggiuntivi |

**Dati in ingresso:**
- PackageStoreRequest: pacchi, indirizzi, servizi, PUDO, delivery_mode

**Dati in uscita:**
- PackageResource collection con meta (empty, subtotal, total, address_groups)

**Logica:**
- Auto-merge automatico: pacchi identici (tipo, dimensioni, indirizzi, servizio) vengono fusi
- Pulizia automatica: rimuove pacchi senza dati validi
- Raggruppamento per coppia indirizzi + servizio (per multi-collo BRT)

**Dipendenze esterne:** Nessuna.

**Rotte API:**
- `GET /api/cart` — Contenuto carrello
- `POST /api/cart` — Aggiunge pacco
- `PUT /api/cart/{id}` — Modifica pacco
- `PATCH /api/cart/{id}/quantity` — Aggiorna quantita'
- `DELETE /api/cart/{id}` — Rimuove pacco
- `DELETE /api/empty-cart` — Svuota carrello
- `POST /api/cart/merge` — Unisci pacchi identici

---

### 1.4 Creazione Ordine

Crea un ordine raggruppando i pacchi per indirizzo e servizio.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/checkout.vue` | Pagina checkout |
| Frontend | `nuxt/pages/riepilogo.vue` | Riepilogo con creazione ordine diretto |
| Backend | `laravel/app/Http/Controllers/StripeController.php` | createOrder: ordine da carrello |
| Backend | `laravel/app/Http/Controllers/OrderController.php` | createDirectOrder: ordine diretto, addPackage, cancel |
| Backend | `laravel/app/Models/Order.php` | Modello ordine con stati e campi BRT |

**Dati in ingresso:**
- Da carrello: package_ids (opzionale), subtotal
- Diretto: PackageStoreRequest completo con indirizzi, servizi, pacchi

**Dati in uscita:**
- order_id, order_number (formato SF-000042)
- Per multi-indirizzo: order_ids[], merged_count

**Logica:**
- I pacchi con stessi indirizzi e stesso servizio vengono raggruppati in un ordine
- Pacchi con stessi indirizzi ma servizi diversi generano ordini separati
- Prezzi ricalcolati lato server in createDirectOrder
- Contrassegno (COD) e PUDO salvati nell'ordine

**Dipendenze esterne:** Nessuna.

**Rotte API:**
- `POST /api/stripe/create-order` — Crea ordine da carrello
- `POST /api/create-direct-order` — Crea ordine diretto
- `GET /api/orders` — Lista ordini
- `GET /api/orders/{order}` — Dettaglio ordine
- `POST /api/orders/{order}/add-package` — Aggiunge collo
- `POST /api/orders/{order}/cancel` — Annulla ordine

---

### 1.5 Pagamento Stripe

Gestisce pagamenti con carta di credito tramite Stripe.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/checkout.vue` | Pagina pagamento con Stripe Elements |
| Frontend | `nuxt/pages/account/carte.vue` | Gestione carte salvate |
| Backend | `laravel/app/Http/Controllers/StripeController.php` | PaymentIntent, SetupIntent, carte salvate |
| Backend | `laravel/app/Http/Controllers/StripeWebhookController.php` | Webhook Stripe asincroni |
| Backend | `laravel/app/Http/Controllers/SettingsController.php` | Configurazione chiavi Stripe |
| Backend | `laravel/app/Models/Transaction.php` | Modello transazione |
| Backend | `laravel/app/Models/Setting.php` | Chiavi Stripe dal DB |
| Backend | `laravel/app/Events/OrderPaid.php` | Evento post-pagamento |

**Dati in ingresso:**
- order_id, payment_method_id, customer_id per pagamento con carta salvata
- order_id per PaymentIntent (checkout con Stripe Elements)
- payment_method per SetupIntent (salvataggio carta)

**Dati in uscita:**
- client_secret per frontend Stripe
- payment_intent_id, status
- Lista carte salvate (brand, last4, exp_month, exp_year, default)

**Flusso pagamento:**
1. `createPaymentIntent` — Prepara il pagamento su Stripe
2. Frontend completa con Stripe Elements
3. `orderPaid` — Conferma pagamento, crea Transaction, lancia evento OrderPaid
4. Webhook `payment_intent.succeeded` — Conferma asincrona di sicurezza

**Evento OrderPaid attiva:**
- `MarkOrderProcessing` — Stato ordine -> processing
- `GenerateBrtLabel` — Generazione automatica etichetta BRT

**Dipendenze esterne:** Stripe API (PaymentIntent, SetupIntent, Customer, PaymentMethod, Refund).

**Rotte API:**
- `POST /api/stripe/create-payment-intent` — Crea PaymentIntent
- `POST /api/stripe/order-paid` — Conferma pagamento
- `POST /api/stripe/create-payment` — Pagamento con carta salvata
- `POST /api/stripe/mark-order-completed` — Pagamento non-Stripe
- `POST /api/stripe/create-setup-intent` — Salva nuova carta
- `GET /api/stripe/payment-methods` — Liste carte
- `POST /api/stripe/set-default-payment-method` — Imposta predefinita
- `DELETE /api/stripe/delete-card` — Elimina carta
- `POST /stripe/webhook` (web.php) — Webhook Stripe

---

### 1.6 Pagamento con Portafoglio Virtuale

Pagamento alternativo usando il saldo del portafoglio digitale.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/account/portafoglio.vue` | Saldo e movimenti |
| Frontend | `nuxt/pages/checkout.vue` | Opzione pagamento wallet |
| Backend | `laravel/app/Http/Controllers/WalletController.php` | Saldo, ricarica, pagamento |
| Backend | `laravel/app/Models/WalletMovement.php` | Modello movimento portafoglio |
| Backend | `laravel/app/Models/User.php` | walletBalance(), commissionBalance() |

**Dati in ingresso:**
- Ricarica: amount, payment_method_id (carta Stripe)
- Pagamento: amount, reference (ID ordine), description

**Dati in uscita:**
- balance, commission_balance (solo Pro), currency
- Lista movimenti (credit/debit, amount, description, source)

**Logica:**
- Ricarica: crea PaymentIntent Stripe, se ok crea WalletMovement tipo credit
- Pagamento: verifica saldo sufficiente, crea WalletMovement tipo debit
- Saldo = somma credit confermati - somma debit confermati

**Dipendenze esterne:** Stripe API (per ricarica).

**Rotte API:**
- `GET /api/wallet/balance` — Saldo
- `GET /api/wallet/movements` — Movimenti
- `POST /api/wallet/top-up` — Ricarica
- `POST /api/wallet/pay` — Pagamento

---

### 1.7 Creazione Spedizione BRT

Crea una spedizione reale su BRT e genera l'etichetta PDF.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/account/spedizioni/[id].vue` | Dettaglio spedizione con etichetta |
| Frontend | `nuxt/pages/account/amministrazione/spedizioni.vue` | Lista spedizioni admin |
| Frontend | `nuxt/pages/account/amministrazione/test-brt.vue` | Test BRT admin |
| Backend | `laravel/app/Http/Controllers/BrtController.php` | Endpoint HTTP per BRT |
| Backend | `laravel/app/Services/BrtService.php` | Comunicazione con API BRT |
| Backend | `laravel/app/Listeners/GenerateBrtLabel.php` | Generazione automatica post-pagamento |
| Backend | `laravel/app/Mail/ShipmentLabelMail.php` | Email con etichetta |

**Dati in ingresso:**
- order_id, is_cod, cod_amount, pudo_id, notes

**Dati in uscita:**
- parcel_id, tracking_number, tracking_url, label_base64 (PDF)
- Dati routing: departure_depot, arrival_depot, delivery_zone, series_number

**Flusso automatico (post-pagamento):**
1. Evento `OrderPaid` scatena `GenerateBrtLabel`
2. BrtService.createShipment() con retry (max 3 tentativi)
3. Se ok: salva dati BRT nell'ordine, stato -> in_transit, invia email con etichetta
4. Se fallisce: salva errore in brt_error per mostrarlo nel frontend

**Flusso manuale:**
- L'utente o admin chiama `POST /api/brt/create-shipment`
- Admin puo' rigenerare: `POST /api/admin/orders/{order}/regenerate-label`

**Normalizzazione indirizzi BRT:**
- Citta' in MAIUSCOLO, espansione abbreviazioni (S. -> SAN, STA. -> SANTA)
- CAP a 5 cifre, zero-padded
- Provincia a 2 lettere (mappa 107 province italiane)
- Risoluzione citta' dal DB locations per corrispondenza con routing BRT

**Dipendenze esterne:** BRT REST API (shipments, PUDO), email SMTP.

**Rotte API:**
- `POST /api/brt/create-shipment` — Crea spedizione
- `POST /api/brt/confirm-shipment` — Conferma spedizione
- `POST /api/brt/delete-shipment` — Elimina spedizione
- `GET /api/brt/label/{order}` — Scarica etichetta PDF
- `GET /api/brt/tracking/{order}` — Info tracking

---

### 1.8 Tracking Spedizione

Ricerca pubblica e privata dello stato di una spedizione.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/traccia-spedizione.vue` | Pagina tracking pubblica |
| Frontend | `nuxt/pages/account/spedizioni/[id].vue` | Tracking privato per ordine |
| Backend | `laravel/app/Http/Controllers/BrtController.php` | publicTracking, tracking |

**Dati in ingresso:**
- Pubblico: code (parcel_id, tracking_number, sender_reference, o ID ordine)
- Privato: order ID (route model binding)

**Dati in uscita:**
- found, status, status_description, brt_parcel_id, brt_tracking_url, created_at

**Logica ricerca pubblica:**
1. Cerca per brt_parcel_id
2. Cerca per brt_tracking_number
3. Cerca per brt_numeric_sender_reference
4. Cerca per ID ordine (con pulizia prefisso SF-/#)

**Dipendenze esterne:** Nessuna (dati da DB locale). URL tracking reindirizza a BRT VAS.

**Rotte API:**
- `GET /api/tracking/search?code=...` — Tracking pubblico (throttle 15/min)
- `GET /api/brt/tracking/{order}` — Tracking privato (auth)

---

### 1.9 Punti PUDO (Pick Up / Drop Off)

Ricerca punti di ritiro/consegna BRT convenzionati.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/components/PudoSelector.vue` | Selettore punto PUDO |
| Backend | `laravel/app/Http/Controllers/BrtController.php` | pudoSearch, pudoNearby, pudoDetails |
| Backend | `laravel/app/Services/BrtService.php` | getPudoByAddress, getPudoByCoordinates, getPudoDetails |

**Dati in ingresso:**
- Per indirizzo: address, zip_code, city, country, max_results
- Per coordinate: latitude, longitude, max_results
- Per dettaglio: pudoId

**Dati in uscita:**
- Lista punti: pudo_id, name, address, city, zip_code, latitude, longitude, distance_meters, opening_hours

**Dipendenze esterne:** BRT PUDO API (`/pudo/v1/open/pickup/`).

**Rotte API:**
- `GET /api/brt/pudo/search` — Cerca per indirizzo
- `GET /api/brt/pudo/nearby` — Cerca per coordinate GPS
- `GET /api/brt/pudo/{pudoId}` — Dettagli punto

---

### 1.10 Rimborso e Annullamento Ordine

Gestisce annullamento con eventuale rimborso (Stripe o portafoglio).

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/account/spedizioni/[id].vue` | Pulsante annulla + info rimborso |
| Frontend | `nuxt/pages/account/spedizioni/index.vue` | Lista ordini con stato |
| Backend | `laravel/app/Http/Controllers/RefundController.php` | Eligibilita', annullamento, rimborso |
| Backend | `laravel/app/Http/Controllers/OrderController.php` | cancel() delega a RefundController |
| Backend | `laravel/app/Services/BrtService.php` | deleteShipment per cancellare etichetta |

**Dati in ingresso:**
- Order (route model binding), reason (opzionale)

**Dati in uscita:**
- Eligibilita': eligible, reason, refund_amount, commission, payment_method, type
- Annullamento: success, message, refund_amount, commission, refund_method, brt_cancelled

**Regole rimborso:**
- pending / payment_failed: annullamento semplice, nessun rimborso
- completed / processing: rimborso con commissione di 2.00 EUR
- in_transit: NON rimborsabile (spedizione partita)
- delivered / in_giacenza: NON rimborsabile

**Flusso annullamento:**
1. Verifica eligibilita'
2. Se etichetta BRT esiste: prova a cancellarla (non bloccante se fallisce)
3. Rimborso Stripe (Refund API, parziale) o wallet (WalletMovement credit)
4. Aggiorna stato ordine: refunded o cancelled
5. Crea Transaction di tipo refund

**Dipendenze esterne:** Stripe Refund API, BRT deleteShipment API.

**Rotte API:**
- `GET /api/orders/{order}/refund-eligibility` — Controlla eligibilita'
- `POST /api/orders/{order}/cancel` — Annulla e rimborsa

---

### 1.11 Autenticazione (Login/Registrazione)

Login con email/password (+ verifica codice 6 cifre) e Google OAuth.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/autenticazione.vue` | Form login |
| Frontend | `nuxt/pages/login.vue` | Pagina login alternativa |
| Frontend | `nuxt/pages/registrazione.vue` | Form registrazione |
| Frontend | `nuxt/pages/verifica-email.vue` | Verifica email |
| Frontend | `nuxt/pages/recupera-password.vue` | Recupero password |
| Frontend | `nuxt/pages/aggiorna-password.vue` | Aggiornamento password |
| Frontend | `nuxt/stores/userStore.js` | Store utente (Pinia) |
| Frontend | `nuxt/middleware/admin.js` | Middleware protezione admin |
| Frontend | `nuxt/middleware/email-verification.js` | Middleware verifica email |
| Backend | `laravel/app/Http/Controllers/CustomLoginController.php` | Login, verifica codice, trasferimento carrello |
| Backend | `laravel/app/Http/Controllers/CustomRegisterController.php` | Registrazione |
| Backend | `laravel/app/Http/Controllers/GoogleController.php` | OAuth Google (Socialite) |
| Backend | `laravel/app/Http/Controllers/VerificationController.php` | Verifica email via link |
| Backend | `laravel/app/Http/Controllers/PasswordResetRequestController.php` | Invio email recupero password |
| Backend | `laravel/app/Http/Controllers/ChangePasswordController.php` | Reset password con token |
| Backend | `laravel/app/Jobs/SendVerificationEmailJob.php` | Job invio email verifica |
| Backend | `laravel/app/Mail/VerificationEmail.php` | Template email codice verifica |
| Backend | `laravel/app/Mail/ResetPasswordEmail.php` | Template email reset password |

**Flusso login email/password:**
1. POST /api/custom-login con email + password
2. Se account non verificato: genera codice 6 cifre, invia email, rispondi 403
3. Utente inserisce codice: POST /api/verify-code
4. Se codice ok: verifica account, login automatico
5. Trasferimento carrello ospite (sessione) -> carrello DB (cart_user)

**Flusso login Google:**
1. GET /api/auth/google/redirect -> redirect a Google OAuth
2. Google rimanda a GET /auth/google/callback (web.php)
3. Se utente esiste: aggiorna google_id/avatar, login
4. Se non esiste: crea utente con password casuale, ruolo User, email verificata

**Dipendenze esterne:** Google OAuth (Socialite), email SMTP.

**Rotte API:**
- `POST /api/custom-login` — Login (throttle 10/min)
- `POST /api/custom-register` — Registrazione (throttle 5/min)
- `POST /api/verify-code` — Verifica codice 6 cifre
- `POST /api/resend-verification-email` — Reinvia codice
- `GET /api/auth/google/redirect` — Redirect a Google
- `GET /auth/google/callback` (web.php) — Callback Google
- `GET /api/user` — Utente corrente (auth:sanctum)
- `POST /api/logout` — Logout
- `POST /api/forgot-password` — Email recupero
- `POST /api/update-password` — Reset password

---

### 1.12 Contrassegno (COD - Cash On Delivery)

Pagamento alla consegna gestito come servizio aggiuntivo.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/servizi/pagamento-alla-consegna.vue` | Pagina info contrassegno |
| Frontend | `nuxt/pages/riepilogo.vue` | Selezione servizio contrassegno |
| Backend | `laravel/app/Http/Controllers/OrderController.php` | Lettura is_cod/cod_amount dal servizio |
| Backend | `laravel/app/Http/Controllers/StripeController.php` | Lettura is_cod dal service_data |
| Backend | `laravel/app/Services/BrtService.php` | isCODMandatory, cashOnDelivery nel payload BRT |

**Logica:**
- L'utente seleziona "Contrassegno" come servizio e inserisce l'importo
- L'importo viene salvato in services.service_data.Contrassegno.importo
- Alla creazione ordine: is_cod=true, cod_amount salvati nell'ordine
- BrtService aggiunge isCODMandatory=1 e cashOnDelivery al payload BRT
- codPaymentType default: BM (Bollettino Postale)

**Dipendenze esterne:** BRT API (campo contrassegno nella spedizione).

---

### 1.13 Sistema Referral (Codici Amico)

I Partner Pro hanno un codice referral. Chi lo usa ottiene 5% di sconto; il Pro guadagna 5% di commissione.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/account/bonus.vue` | Gestione codice referral |
| Frontend | `nuxt/pages/checkout.vue` | Applicazione codice al checkout |
| Frontend | `nuxt/pages/account/amministrazione/referral.vue` | Statistiche referral admin |
| Backend | `laravel/app/Http/Controllers/ReferralController.php` | CRUD referral |
| Backend | `laravel/app/Models/ReferralUsage.php` | Modello utilizzo referral |
| Backend | `laravel/app/Models/WalletMovement.php` | Commissione nel portafoglio Pro |

**Flusso:**
1. Partner Pro condivide codice 8 caratteri (link o WhatsApp)
2. Acquirente inserisce codice al checkout: POST /api/referral/validate
3. Al pagamento: POST /api/referral/apply calcola sconto (5%) e commissione (5%)
4. Crea ReferralUsage + WalletMovement (credit) per il Partner Pro
5. Il codice puo' essere salvato permanentemente: POST /api/referral/store

**Dipendenze esterne:** Nessuna.

**Rotte API:**
- `GET /api/referral/my-code` — Il tuo codice (solo Pro)
- `POST /api/referral/validate` — Verifica codice
- `POST /api/referral/apply` — Applica a ordine
- `POST /api/referral/store` — Salva permanentemente
- `GET /api/referral/my-discount` — Sconto attivo
- `GET /api/referral/earnings` — Guadagni

---

### 1.14 Prelievi Commissioni (Partner Pro)

I Partner Pro richiedono il prelievo delle commissioni guadagnate.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/account/prelievi.vue` | Richiesta prelievo |
| Frontend | `nuxt/pages/account/amministrazione/prelievi.vue` | Gestione admin |
| Backend | `laravel/app/Http/Controllers/WithdrawalController.php` | CRUD prelievi |
| Backend | `laravel/app/Http/Controllers/AdminController.php` | Approvazione/rifiuto |
| Backend | `laravel/app/Models/WithdrawalRequest.php` | Modello richiesta prelievo |

**Flusso:**
1. Pro richiede prelievo: POST /api/withdrawals
2. Admin vede richieste pendenti in dashboard
3. Admin approva: crea WalletMovement debit, status -> approved
4. Oppure rifiuta: status -> rejected

**Dipendenze esterne:** Nessuna (trasferimento manuale).

**Rotte API:**
- `GET /api/withdrawals` — Lista prelievi utente
- `POST /api/withdrawals` — Richiedi prelievo
- `GET /api/admin/withdrawals` — Lista per admin
- `POST /api/admin/withdrawals/{id}/approve` — Approva
- `POST /api/admin/withdrawals/{id}/reject` — Rifiuta

---

### 1.15 Richiesta Partner Pro

Utente richiede di diventare Partner Pro per accedere a sconti e referral.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/account/account-pro.vue` | Form richiesta |
| Backend | `laravel/app/Http/Controllers/ProRequestController.php` | Store, status, approve, reject |
| Backend | `laravel/app/Models/ProRequest.php` | Modello richiesta |

**Flusso:**
1. Utente invia richiesta: POST /api/pro-request
2. Admin vede in dashboard e approva/rifiuta
3. Se approvato: ruolo -> Partner Pro, generazione referral_code

**Dipendenze esterne:** Nessuna.

**Rotte API:**
- `POST /api/pro-request` — Invia richiesta
- `GET /api/pro-request/status` — Stato richiesta
- `PATCH /api/admin/pro-requests/{id}/approve` — Approva
- `PATCH /api/admin/pro-requests/{id}/reject` — Rifiuta

---

### 1.16 Stripe Connect (Partner Pro)

Collegamento account Stripe per i Partner Pro.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/account/account-pro.vue` | Collegamento Stripe |
| Backend | `laravel/app/Http/Controllers/StripeConnectController.php` | Connect, callback, createAccount |
| Backend | `laravel/app/Http/Controllers/StripeWebhookController.php` | account.updated, account.deauthorized |

**Flusso:**
1. GET /api/stripe/connect -> redirect a Stripe Onboarding
2. GET /api/stripe/callback -> salva stripe_account_id
3. Webhook account.updated -> aggiorna charges_enabled, capabilities

**Dipendenze esterne:** Stripe Connect API.

**Rotte API:**
- `GET /api/stripe/connect` — Avvia collegamento
- `GET /api/stripe/callback` — Callback Stripe
- `GET /api/stripe/create-account` — Crea account

---

### 1.17 Contatti (Form Contattaci)

Form pubblico per inviare messaggi all'admin.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/contatti.vue` | Form contatto |
| Frontend | `nuxt/pages/account/amministrazione/messaggi.vue` | Lettura messaggi admin |
| Backend | `laravel/app/Http/Controllers/ContactController.php` | Store, index, markAsRead |
| Backend | `laravel/app/Models/ContactMessage.php` | Modello messaggio |

**Dati in ingresso:** name, surname, email, telephone_number, address, message.

**Dipendenze esterne:** Nessuna.

**Rotte API:**
- `POST /api/contact` — Invia messaggio (throttle 5/min)
- `GET /api/admin/contact-messages` — Lista messaggi
- `PATCH /api/admin/contact-messages/{id}/read` — Segna come letto

---

### 1.18 Coupon (Codici Sconto)

Codici sconto percentuali applicabili al checkout.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/checkout.vue` | Inserimento codice coupon |
| Frontend | `nuxt/pages/account/amministrazione/coupon.vue` | CRUD coupon admin |
| Backend | `laravel/app/Http/Controllers/CouponController.php` | calculateCoupon |
| Backend | `laravel/app/Http/Controllers/AdminController.php` | CRUD coupon |
| Backend | `laravel/app/Models/Coupon.php` | Modello coupon |

**Dipendenze esterne:** Nessuna.

**Rotte API:**
- `POST /api/calculate-coupon` — Calcola sconto
- `GET /api/admin/coupons` — Lista coupon
- `POST /api/admin/coupons` — Crea coupon
- `PUT /api/admin/coupons/{id}` — Modifica
- `DELETE /api/admin/coupons/{id}` — Elimina

---

### 1.19 Spedizioni Configurate (Template)

Modelli di spedizione salvati per riuso rapido.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/account/spedizioni-configurate.vue` | Lista template |
| Backend | `laravel/app/Http/Controllers/SavedShipmentController.php` | CRUD + addToCart |

**Dipendenze esterne:** Nessuna.

**Rotte API:**
- `GET /api/saved-shipments` — Lista
- `POST /api/saved-shipments` — Crea
- `PUT /api/saved-shipments/{id}` — Modifica
- `DELETE /api/saved-shipments/{id}` — Elimina
- `POST /api/saved-shipments/add-to-cart` — Aggiungi al carrello

---

### 1.20 Pannello Amministrazione

Dashboard e gestione completa del sito.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/account/amministrazione/index.vue` | Dashboard |
| Frontend | `nuxt/pages/account/amministrazione/ordini.vue` | Gestione ordini |
| Frontend | `nuxt/pages/account/amministrazione/spedizioni.vue` | Gestione spedizioni |
| Frontend | `nuxt/pages/account/amministrazione/utenti.vue` | Gestione utenti |
| Frontend | `nuxt/pages/account/amministrazione/portafogli.vue` | Portafogli utenti |
| Frontend | `nuxt/pages/account/amministrazione/prelievi.vue` | Prelievi |
| Frontend | `nuxt/pages/account/amministrazione/referral.vue` | Referral |
| Frontend | `nuxt/pages/account/amministrazione/messaggi.vue` | Messaggi contatto |
| Frontend | `nuxt/pages/account/amministrazione/prezzi.vue` | Fasce prezzo |
| Frontend | `nuxt/pages/account/amministrazione/impostazioni.vue` | Impostazioni sito |
| Frontend | `nuxt/pages/account/amministrazione/coupon.vue` | Coupon |
| Frontend | `nuxt/pages/account/amministrazione/servizi/` | Gestione servizi |
| Frontend | `nuxt/pages/account/amministrazione/guide/` | Gestione guide |
| Frontend | `nuxt/pages/account/amministrazione/immagine-homepage.vue` | Immagine homepage |
| Frontend | `nuxt/pages/account/amministrazione/test-brt.vue` | Test BRT |
| Frontend | `nuxt/composables/useAdmin.js` | Utilita' admin (formatCurrency, formatDate, statusConfig) |
| Frontend | `nuxt/composables/UseAdminImage.js` | Gestione immagine admin |
| Backend | `laravel/app/Http/Controllers/AdminController.php` | Dashboard, ordini, utenti, impostazioni |
| Backend | `laravel/app/Http/Controllers/ArticleController.php` | CRUD articoli (guide/servizi) |
| Backend | `laravel/app/Http/Controllers/PriceBandController.php` | CRUD fasce prezzo |
| Backend | `laravel/app/Http/Middleware/CheckAdmin.php` | Middleware protezione admin |

**Dipendenze esterne:** BRT API (rigenerazione etichette), Stripe API (impostazioni).

---

### 1.21 Contenuti Pubblici (Guide, Servizi)

Articoli pubblici: guide e servizi del sito.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/pages/guide/index.vue` | Lista guide |
| Frontend | `nuxt/pages/guide/[slug].vue` | Dettaglio guida |
| Frontend | `nuxt/pages/servizi/index.vue` | Lista servizi |
| Frontend | `nuxt/pages/servizi/[slug].vue` | Dettaglio servizio |
| Backend | `laravel/app/Http/Controllers/PublicArticleController.php` | API pubblica guide/servizi |
| Backend | `laravel/app/Http/Controllers/ArticleController.php` | CRUD admin |
| Backend | `laravel/app/Models/Article.php` | Modello articolo |

**Dipendenze esterne:** Nessuna.

**Rotte API:**
- `GET /api/public/guides` — Lista guide
- `GET /api/public/guides/{slug}` — Dettaglio guida
- `GET /api/public/services` — Lista servizi
- `GET /api/public/services/{slug}` — Dettaglio servizio

---

### 1.22 Autocompletamento Indirizzi (Localita')

Ricerca localita' italiane per citta' o CAP.

**File coinvolti:**

| Lato | File | Ruolo |
|------|------|-------|
| Frontend | `nuxt/components/Preventivo.vue` | Autocompletamento nel form preventivo |
| Backend | `laravel/app/Http/Controllers/LocationController.php` | search, byCap |
| Backend | `laravel/app/Models/Location.php` | Modello localita' (tabella locations) |

**Dipendenze esterne:** Nessuna (DB locale con localita' italiane).

**Rotte API:**
- `GET /api/locations/search?q=...` — Cerca per nome citta'
- `GET /api/locations/by-cap?cap=...` — Cerca per CAP

---

## 2. MAPPA MODULI

Ogni modulo rappresenta un dominio funzionale del sistema.

| Modulo | Descrizione | Controller Backend | Pagine Frontend |
|--------|-------------|-------------------|-----------------|
| **Preventivo** | Calcolo prezzo spedizione | SessionController, PublicPriceBandController | Preventivo.vue, PreventivoRapido.vue |
| **Carrello** | Gestione pacchi pre-ordine | CartController, GuestCartController | carrello.vue, riepilogo.vue |
| **Ordine** | Ciclo vita ordini | OrderController, StripeController | checkout.vue, spedizioni/ |
| **Pagamento** | Stripe + Portafoglio | StripeController, WalletController, StripeWebhookController | checkout.vue, carte.vue, portafoglio.vue |
| **Spedizione BRT** | Creazione, etichette, tracking | BrtController, BrtService | spedizioni/[id].vue, traccia-spedizione.vue |
| **PUDO** | Punti di ritiro/consegna | BrtController (pudo*), BrtService | PudoSelector.vue |
| **Contrassegno** | Pagamento alla consegna | BrtService (COD fields) | riepilogo.vue, pagamento-alla-consegna.vue |
| **Rimborso** | Annullamento e rimborso | RefundController | spedizioni/[id].vue |
| **Autenticazione** | Login, registrazione, verifica | CustomLoginController, CustomRegisterController, GoogleController, VerificationController | autenticazione.vue, registrazione.vue, verifica-email.vue |
| **Referral** | Codici amico, commissioni | ReferralController | bonus.vue, checkout.vue |
| **Portafoglio** | Saldo virtuale, ricarica | WalletController | portafoglio.vue |
| **Prelievi** | Prelievo commissioni Pro | WithdrawalController, AdminController | prelievi.vue |
| **Partner Pro** | Richiesta e gestione Pro | ProRequestController, StripeConnectController | account-pro.vue |
| **Admin** | Pannello amministrazione | AdminController, ArticleController, PriceBandController, SettingsController | amministrazione/ |
| **Contenuti** | Guide, servizi, articoli | PublicArticleController, ArticleController | guide/, servizi/ |
| **Contatti** | Form contattaci | ContactController | contatti.vue |
| **Coupon** | Codici sconto | CouponController, AdminController | checkout.vue, coupon.vue |
| **Indirizzi** | Rubrica utente | UserAddressController, AddressController | indirizzi/ |
| **Localita'** | Autocompletamento citta'/CAP | LocationController | Preventivo.vue |

---

## 3. DIPENDENZE ESTERNE

---

### 3.1 BRT (Bartolini) - Corriere Spedizioni

| Campo | Valore |
|-------|--------|
| **Scopo** | Creazione spedizioni, etichette PDF, tracking, punti PUDO |
| **Tipo API** | REST (JSON) |
| **URL spedizioni** | `https://api.brt.it/rest/v1/shipments` |
| **URL PUDO** | `https://api.brt.it/pudo/v1/open/pickup/` |
| **Configurazione** | `config/services.php` -> brt.* |
| **Variabili .env** | `BRT_CLIENT_ID`, `BRT_PASSWORD`, `BRT_API_URL`, `BRT_PUDO_API_URL`, `BRT_PUDO_TOKEN`, `BRT_DEPARTURE_DEPOT`, `BRT_VERIFY_SSL` |

**File che lo usano:**

| File | Utilizzo |
|------|----------|
| `laravel/app/Services/BrtService.php` | Comunicazione diretta con API BRT |
| `laravel/app/Http/Controllers/BrtController.php` | Endpoint HTTP che delega a BrtService |
| `laravel/app/Listeners/GenerateBrtLabel.php` | Generazione automatica post-pagamento |
| `laravel/app/Http/Controllers/AdminController.php` | Rigenerazione etichetta admin |
| `laravel/app/Http/Controllers/RefundController.php` | Cancellazione spedizione durante rimborso |

---

### 3.2 Stripe - Pagamenti

| Campo | Valore |
|-------|--------|
| **Scopo** | Pagamenti con carta, salvataggio carte, rimborsi, portafoglio, Stripe Connect |
| **Tipo API** | SDK PHP (stripe/stripe-php) |
| **Configurazione** | `config/services.php` -> stripe.* e tabella `settings` (admin) |
| **Variabili .env** | `STRIPE_KEY`, `STRIPE_SECRET`, `STRIPE_CLIENT_ID`, `STRIPE_WEBHOOK_SECRET` |

**File che lo usano:**

| File | Utilizzo |
|------|----------|
| `laravel/app/Http/Controllers/StripeController.php` | PaymentIntent, SetupIntent, Customer, PaymentMethod |
| `laravel/app/Http/Controllers/StripeWebhookController.php` | Webhook asincroni |
| `laravel/app/Http/Controllers/StripeConnectController.php` | Stripe Connect per Partner Pro |
| `laravel/app/Http/Controllers/WalletController.php` | Ricarica portafoglio via Stripe |
| `laravel/app/Http/Controllers/RefundController.php` | Rimborsi via Stripe Refund API |
| `laravel/app/Http/Controllers/SettingsController.php` | Configurazione chiavi Stripe |
| `laravel/app/Models/Setting.php` | Chiavi Stripe salvate nel DB |

---

### 3.3 Google OAuth - Autenticazione

| Campo | Valore |
|-------|--------|
| **Scopo** | Login e registrazione tramite account Google |
| **Tipo API** | OAuth 2.0 via Laravel Socialite |
| **Configurazione** | `config/services.php` -> google.* |
| **Variabili .env** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |

**File che lo usano:**

| File | Utilizzo |
|------|----------|
| `laravel/app/Http/Controllers/GoogleController.php` | Redirect a Google e gestione callback |

---

### 3.4 Email SMTP - Invio Email

| Campo | Valore |
|-------|--------|
| **Scopo** | Invio email: codice verifica, reset password, etichetta BRT |
| **Tipo** | SMTP (o Postmark/SES) |
| **Configurazione** | `config/mail.php`, `.env` |
| **Variabili .env** | `MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS` |

**File che lo usano:**

| File | Utilizzo |
|------|----------|
| `laravel/app/Jobs/SendVerificationEmailJob.php` | Invio codice verifica 6 cifre |
| `laravel/app/Mail/VerificationEmail.php` | Template email verifica |
| `laravel/app/Mail/ResetPasswordEmail.php` | Template email reset password |
| `laravel/app/Mail/ShipmentLabelMail.php` | Email con etichetta BRT allegata |
| `laravel/app/Http/Controllers/BrtController.php` | Invio email post-creazione spedizione |
| `laravel/app/Listeners/GenerateBrtLabel.php` | Invio email post-generazione automatica |
| `laravel/app/Http/Controllers/AdminController.php` | Invio email rigenerazione etichetta |

---

### 3.5 Laravel Sanctum - Autenticazione SPA

| Campo | Valore |
|-------|--------|
| **Scopo** | Autenticazione basata su sessione per SPA (Nuxt frontend) |
| **Tipo** | Middleware Laravel integrato |
| **Configurazione** | `config/sanctum.php`, `config/session.php`, `config/cors.php` |
| **Variabili .env** | `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`, `SESSION_DRIVER` |

**Funzionamento:**
- Le rotte in `api.php` usano il middleware `statefulApi`
- Sanctum aggiunge: EncryptCookies, StartSession, ValidateCsrfToken, AuthenticateSession
- Il frontend Nuxt usa `nuxt-auth-sanctum` per gestire CSRF e sessione automaticamente

---

## 4. EVENTI E LISTENER

| Evento | Listener | Effetto |
|--------|----------|---------|
| `OrderPaid` | `MarkOrderProcessing` | Stato ordine -> processing |
| `OrderPaid` | `GenerateBrtLabel` | Genera etichetta BRT (retry 3x), invia email |
| `UserRegistered` | `SendVerificationEmail` | Invia email con codice verifica |

Registrati in: `laravel/app/Providers/EventServiceProvider.php`

---

## 5. MIDDLEWARE

### Backend (Laravel)

| Middleware | File | Scopo |
|-----------|------|-------|
| `auth:sanctum` | Framework | Verifica autenticazione sessione |
| `CheckAdmin` | `laravel/app/Http/Middleware/CheckAdmin.php` | Verifica ruolo Admin |
| `CheckCart` | `laravel/app/Http/Middleware/CheckCart.php` | Verifica carrello non vuoto |
| `SecurityHeaders` | `laravel/app/Http/Middleware/SecurityHeaders.php` | Header di sicurezza HTTP |
| `throttle` | Framework | Rate limiting (5-15/min a seconda della rotta) |
| `signed` | Framework | Verifica link firmati (email verifica) |

### Frontend (Nuxt)

| Middleware | File | Scopo |
|-----------|------|-------|
| `admin` | `nuxt/middleware/admin.js` | Protezione pagine admin |
| `email-verification` | `nuxt/middleware/email-verification.js` | Redirect se email non verificata |
| `shipment-validation` | `nuxt/middleware/shipment-validation.js` | Verifica dati spedizione validi |
| `update-password` | `nuxt/middleware/update-password.js` | Protezione pagina reset password |

---

## 6. MODELLI DATABASE

| Modello | Tabella | Relazioni principali |
|---------|---------|---------------------|
| User | users | hasMany: orders, packages, walletMovements, referralUsages |
| Order | orders | belongsTo: user. belongsToMany: packages (pivot package_order). hasMany: transactions |
| Package | packages | belongsTo: originAddress, destinationAddress, service, user |
| PackageAddress | package_addresses | hasMany: packages (origin/destination) |
| Service | services | hasMany: packages |
| Transaction | transactions | belongsTo: order |
| PriceBand | price_bands | Fasce prezzo peso/volume |
| Location | locations | Localita' italiane (citta', CAP, provincia) |
| WalletMovement | wallet_movements | belongsTo: user |
| WithdrawalRequest | withdrawal_requests | belongsTo: user |
| ReferralUsage | referral_usages | belongsTo: proUser, buyer |
| ProRequest | pro_requests | belongsTo: user |
| ContactMessage | contact_messages | Messaggi dal form contattaci |
| Article | articles | Guide e servizi del sito |
| Coupon | coupons | Codici sconto |
| Setting | settings | Chiave-valore per configurazioni dinamiche |
| BillingAddress | billing_addresses | Indirizzi di fatturazione |

**Tabelle pivot:**
- `cart_user` — Collega utenti ai pacchi nel carrello
- `package_order` — Collega pacchi agli ordini (con quantita')

---

## 7. COMPOSABLE FRONTEND

| Composable | File | Scopo |
|-----------|------|-------|
| `useSession` | `nuxt/composables/useSession.js` | Sessione preventivo (GET /api/session) |
| `useCart` | `nuxt/composables/useCart.js` | Carrello: switch autenticato/ospite |
| `usePriceBands` | `nuxt/composables/usePriceBands.js` | Fasce prezzo con cache 5min + fallback |
| `useSmartValidation` | `nuxt/composables/useSmartValidation.js` | Validazione campi italiani (telefono, CAP, provincia) |
| `useAdmin` | `nuxt/composables/useAdmin.js` | Utilita' admin (formatCurrency, statusConfig, downloadLabel) |
| `UseAdminImage` | `nuxt/composables/UseAdminImage.js` | Gestione immagine admin |

---

## 8. STORE FRONTEND

| Store | File | Scopo |
|-------|------|-------|
| `userStore` | `nuxt/stores/userStore.js` | Store Pinia per dati utente |

---

> **Nota sui percorsi:** In questo documento, `laravel/` si riferisce a `laravel-spedizionefacile-main/` e `nuxt/` a `nuxt-spedizionefacile-master/`. Tutti i percorsi sono relativi alla root del progetto.
