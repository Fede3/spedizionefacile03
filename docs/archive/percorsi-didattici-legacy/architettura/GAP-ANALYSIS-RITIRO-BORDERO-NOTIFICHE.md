# Gap Analysis Architettura - Ritiro, Bordero, Documenti, Referral

## Obiettivo
Valutare lo stato tecnico attuale e definire una proposta architetturale per:
1. ritiro a domicilio via API;
2. creazione bordero;
3. invio automatico documenti ad admin + cliente;
4. notifiche referral per utente Pro con consenso esplicito.

## Mappa Repository e Flussi Attuali

### Frontend (Nuxt)
- Wizard spedizione: `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- Riepilogo spedizione: `nuxt-spedizionefacile-master/pages/riepilogo.vue`
- Checkout/pagamento/referral: `nuxt-spedizionefacile-master/pages/checkout.vue`
- Area Pro/referral: `nuxt-spedizionefacile-master/pages/account/account-pro.vue`

### Backend (Laravel)
- API principali: `laravel-spedizionefacile-main/routes/api.php`
- Orchestrazione pagamento ordine: `laravel-spedizionefacile-main/app/Http/Controllers/StripeController.php`
- Integrazione BRT: `laravel-spedizionefacile-main/app/Http/Controllers/BrtController.php`
- Servizio API BRT: `laravel-spedizionefacile-main/app/Services/BrtService.php`
- Listener post pagamento: `laravel-spedizionefacile-main/app/Listeners/GenerateBrtLabel.php`
- Referral business logic: `laravel-spedizionefacile-main/app/Http/Controllers/ReferralController.php`
- Modello ordine: `laravel-spedizionefacile-main/app/Models/Order.php`

### Flusso E2E attivo oggi
1. Checkout crea ordine (`StripeController::createOrder`).
2. Pagamento confermato (`StripeController::orderPaid` o `markOrderCompleted`) lancia `OrderPaid`.
3. Listener `GenerateBrtLabel` genera etichetta BRT (`BrtService::createShipment`) e aggiorna `orders.brt_*`.
4. Email etichetta inviata solo al cliente (`ShipmentLabelMail`).
5. Referral: `ReferralController::apply` crea `referral_usages` e accredita commissione in `wallet_movements`.

## Gap Analysis

### 1) Ritiro a domicilio via API
Stato attuale:
- Data/orario ritiro vengono salvati su `services` (`date`, `time`), ma non sono orchestrati come richiesta ritiro con stato dedicato.
- `BrtService` mappa alcuni servizi, ma non gestisce un workflow di prenotazione ritiro separato con riferimento esterno.

Gap:
- Assenza di stato dominio del ritiro (requested/confirmed/failed).
- Assenza di riferimento esterno ritiro e audit trail.
- Assenza di endpoint dedicato a gestione ritiro (request/retry/status).

### 2) Bordero
Stato attuale:
- Non esiste modello, migrazione, endpoint o servizio per bordero.
- Nessun campo `bordero_*` su ordine o su entita dedicata.

Gap:
- Feature completamente assente lato dominio, persistenza e integrazione.

### 3) Invio documenti automatico admin + cliente
Stato attuale:
- Esiste solo `ShipmentLabelMail`, inviata al cliente in `GenerateBrtLabel`.
- Non esiste bundle documentale (etichetta + bordero + ricevute) e non esiste canale admin dedicato.

Gap:
- Nessun repository documenti con tipologia/versione/stato.
- Nessun invio multi-destinatario robusto con retry e log per audit.

### 4) Notifiche referral Pro con consenso esplicito
Stato attuale:
- Esiste tracciamento utilizzo referral (`referral_usages`) e accredito commissione.
- Non esiste modello preferenze notifiche referral per canale (email/sms/on-site).
- Non esiste inbox notifiche nel dominio utente.

Gap:
- Manca consenso esplicito persistito per canale.
- Manca pipeline di notifica asincrona e idempotente.

## Proposta Architetturale

### A. Separazione responsabilita (dominio applicativo)
Introdurre 3 sottodomini applicativi:
1. `ShippingExecution` (etichetta, ritiro, bordero, stati tecnici).
2. `DocumentCenter` (generazione, storage, invio documenti).
3. `ReferralNotification` (preferenze, inbox sito, dispatch email/sms).

### B. Nuovi elementi dati (minimo consigliato)
1. Tabella `shipment_executions`
- `order_id` (unique), `carrier` (brt), `shipment_status`, `pickup_status`, `bordero_status`
- `carrier_shipment_ref`, `carrier_pickup_ref`, `carrier_bordero_ref`
- `last_error`, `meta` (json)

2. Tabella `shipment_documents`
- `order_id`, `document_type` (`label`,`bordero`,`pickup_receipt`,`summary`)
- `storage_path`, `mime_type`, `checksum`, `created_by_flow`, `sent_to_customer_at`, `sent_to_admin_at`

3. Tabella `user_notification_preferences`
- `user_id` (unique), `referral_site_enabled` (default true),
  `referral_email_enabled` (default false), `referral_sms_enabled` (default false),
  `email_opt_in_at`, `sms_opt_in_at`

4. Tabella `user_notifications`
- `user_id`, `type` (`referral_used`), `title`, `body`, `payload`, `read_at`

### C. Eventi e orchestrazione
1. `OrderPaid` -> `StartShipmentExecution`
2. Job chain:
- `CreateCarrierShipmentJob`
- `RequestHomePickupJob` (se applicabile)
- `CreateBorderoJob`
- `GenerateShipmentDocumentBundleJob`
- `DispatchShipmentDocumentsJob` (admin + cliente)

3. `ReferralUsed` (emesso in `ReferralController::apply`)
- `CreateOnSiteReferralNotificationJob`
- `DispatchReferralEmailJob` (solo se opt-in email)
- `DispatchReferralSmsJob` (solo se opt-in sms)

Nota: tutti i job devono essere idempotenti (chiave per `order_id` o `referral_usage_id`).

### D. Contratti API consigliati
1. Spedizione/ritiro/bordero
- `GET /api/orders/{order}/execution`
- `POST /api/orders/{order}/pickup/request`
- `POST /api/orders/{order}/bordero/create`
- `POST /api/orders/{order}/documents/send`

2. Notifiche referral
- `GET /api/referral/notifications`
- `PATCH /api/referral/notification-preferences`
- `POST /api/referral/notifications/{id}/read`

### E. Coerenza tecnica e rischi da mitigare
1. Doppia esecuzione oggi possibile tra callback sincrona e webhook pagamento -> usare lock/idempotency.
2. `brt_label_base64` su `orders` scala male -> spostare documenti su storage + metadata DB.
3. Flussi esterni in listener sincroni -> spostare su queue per resilienza.
4. Referral potenzialmente duplicabile per ordine senza vincolo DB esplicito -> introdurre unique su `referral_usages.order_id` (se confermato business rule).

## Impatto sui turni successivi
1. `INTERFACCIA`: UI stato esecuzione (ritiro/bordero/documenti) + preferenze notifiche referral.
2. `LOGICA`: migrazioni nuove, job/eventi, endpoint API, provider canali notifiche.
3. `REVISIONE`: test E2E su idempotenza, retry, consenso canali, invio admin+cliente.

## Verifica Architettura (manuale)
1. Aprire questo documento e verificare che copra i 4 obiettivi richiesti con stato attuale + gap + proposta.
2. Verificare che i file citati nel documento esistano e siano coerenti con i flussi descritti.
3. Confermare che la proposta non introduce modifiche funzionali immediate ma una traccia implementativa per i turni successivi.
