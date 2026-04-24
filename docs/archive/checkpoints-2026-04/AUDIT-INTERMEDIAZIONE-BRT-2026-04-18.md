# AUDIT ARCHITETTURALE — SpediamoFacile come intermediario BRT

**Data**: 2026-04-18
**Repo**: `C:\Users\Feder\Desktop\spedizionefacile`
**Scope**: Valutare la readiness del sito come intermediario BRT (peer di Spedire.com, Packlink, MBE, SpedireAdesso).
**Metodo**: esplorazione statica del codice (frontend Nuxt 3 + backend Laravel 12), mappatura controller/servizi/route, cross-check su checklist feature core.

---

## EXECUTIVE SUMMARY

**Readiness complessivo: ~72%** per lancio come intermediario BRT nazionale Italia + UE monocollo.

Il progetto è sorprendentemente maturo. Il cuore operativo (preventivo, flusso 5-step, creazione spedizione BRT, tracking con webhook push + polling, listino fasce peso/volume editabile, supplementi automatici zona/dimensione, checkout Stripe, ritiro a domicilio, bordero, etichette BRT multi-collo, PUDO, wallet, referral, Partner Pro) **c'è già ed è funzionante**. La parte pubblica (blog/guide/servizi/FAQ/legal) è completa con schema.org, sitemap dinamica, CSP stretta, Sentry, Plausible.

Ciò che manca per essere "un vero intermediario BRT" è soprattutto:
1. **Feature di post-vendita**: apertura reclamo in-app con foto, richiesta nuova consegna / cambio data ritiro, annullamento ordine post-pickup.
2. **Servizi aggiuntivi monetizzabili**: contrassegno come opzione acquistabile (il codice c'è ma non è esposto nel flusso utente), assicurazione a valore dichiarato, sponda idraulica e consegna al piano come line item separato.
3. **Fatturazione**: fattura PDF esiste (`InvoicePdfService.php`) ma è una ricevuta — nessuna integrazione SDI / fatturazione elettronica, nessuna conservazione sostitutiva.
4. **Account Pro avanzato**: registrazione Pro esiste (`ProRequest`), ma mancano bulk upload CSV, API key, white-label, statistiche dedicate.
5. **PayPal** (dichiarato in `TODO_PAYPAL.md`), **SMS** (zero), **Push PWA** (manifest sì, service worker no), **2FA** (colonne DB presenti, zero UI), **bonifico** (solo label "Bonifico" in UI, nessun backend).
6. **Admin**: reclami e rimborsi hanno controller ma non c'è una console admin dedicata per gestirli end-to-end.

---

## SEZIONE 1 — FEATURE PRESENTI (verificate)

### Preventivo & pricing
- Calcolo tariffa peso + dimensioni: `app/Services/PriceEngineService.php` (fasce peso + volume, extra rules, supplementi CAP).
- Listino EU monocollo: `app/Services/EuropePriceEngineService.php`.
- Supplementi automatici zona+dimensione: `app/Services/Pricing/AutomaticSupplementCalculator.php` (Calabria/Sardegna/Sicilia, isole minori IT/EU, CSI, fuori sagoma, lato >130cm, aste/tubi).
- Preventivo multi-collo: sì, carrello con N package (tabella `cart_user` + `packages`).
- Frontend: `components/Preventivo.vue`, `usePreventivoCalc.js`, `usePriceBandsCalc.ts`.
- Editor listino admin: `pages/account/amministrazione/prezzi.vue` + `AdminPrezziNazionale`, `AdminPrezziEuropa`, `AdminPrezziPromo`, `AdminPrezziServizi`.

### Servizi aggiuntivi BRT
- Consegna al piano, ritiro al piano, sponda idraulica, giacenza, express/priority/10:30/economy: mappati in `Brt/BrtPayloadBuilder.php:10-22`.
- Contrassegno (COD): `is_cod`, `cod_amount`, `cod_payment_type` (BM/CC/AS) su `Order` — payload BRT pronto.
- Assicurazione merce: campo `insurance_amount` in options (`BrtPayloadBuilder.php:64-68`).
- Appuntamento consegna (`isAlertRequired` + `AP`): `BrtPayloadBuilder.php:70-76`.
- PUDO (ritiro/consegna): `Brt/PudoService.php`, `PudoPointMapper.php`, modello `PudoPoint`, componente `MapPudo.client.vue`, `PudoSelector.vue`.

### Indirizzi
- Rubrica utente (max 5, default): `UserAddressController.php` + modello `UserAddress` con boot predefinito.
- Autocomplete CAP/città/provincia: `LocationController.php` (3 endpoint: search/by-cap/by-city).
- Tabella `locations` con `country_code` — dati importati via `ImportLocations.php` (IT, GB, DE, PL presenti in `database/*.txt`).
- Validazione indirizzi BRT: normalizzazione sigla provincia in `AddressNormalizer.php`.

### Pagamenti
- Stripe card + Payment Intent + SetupIntent per carte salvate: `StripeCheckoutController.php`, `StripeCustomerController.php`, `usePaymentStripe.ts`.
- Apple Pay + Google Pay via Stripe PaymentRequestButton: `composables/usePaymentRequestButton.ts` (aggiunto 2026-04-18).
- Wallet prepagato: `WalletController.php` + tabella `wallet_movements` + `usePaymentFlow.ts` metodo `wallet`.
- Coupon: `CouponController.php` + `AdminCouponController.php`.
- Referral: `ReferralCodeController.php`, `ReferralRewardController.php`, tabella `referral_usages`.
- Fattura PDF (ricevuta): `InvoicePdfService.php` generata con FPDF-like ops, endpoint `GET /api/orders/{order}/invoice`.

### Tracking
- Webhook push BRT: `routes/web.php:78` → `BrtWebhookController.php` con HMAC + IP whitelist + tabella `brt_webhook_events`.
- Polling scheduled: `app/Console/Commands/SyncBrtTracking.php` (orario, da `routes/console.php`).
- Tracking pubblico (no login): `GET /api/tracking/search` (throttle 15/min).
- Timeline stati + mapping italiano↔inglese: `TrackingService.php:141-208`.
- Email stato spedizione: `ShipmentStatusUpdateMail.php` + listener `SendShipmentStatusEmail.php`.
- Tracking URL BRT: `https://vas.brt.it/vas/sped_det_show.hsm?refnr=...`.

### Ordine & post-vendita (parziale)
- Annullamento + rimborso: `RefundService.php` con Stripe refund, cancellation_fee 2€, lock pessimistico, tabella `transactions`.
- Endpoint `refund-eligibility`: `RefundController.php`.
- Ritiro a domicilio: `app/Services/Brt/PickupService.php` con time_slot, date, notes → endpoint `POST /api/orders/{order}/pickup`.
- Bordero PDF: `BorderoPdfBuilder.php` + `ShipmentExecutionController.php`.
- Documenti email (etichetta + bordero): `ShipmentDocumentDispatcher.php`, `ShipmentLabelMail.php`, `ShipmentDocumentsMail.php`.
- "Spedizioni configurate" (template riutilizzabili): `SavedShipmentController.php`.

### Account
- Login/registrazione email + verifica codice: `CustomRegisterController.php`, `VerificationController.php`.
- OAuth Google/Facebook/Apple: `GoogleController.php`, `FacebookController.php`, `AppleController.php` (+ JWT Apple generato).
- Password reset: `PasswordResetRequestController.php`.
- Colonne 2FA su `users`: `2025_05_10_152026_add_two_factor_columns_to_users_table.php` (Fortify) — **NON esposto in UI**.
- Partner Pro request: `ProRequestController.php` + `vat_number` in migration pro_requests.
- Wallet + prelievi: `WalletController.php`, `WithdrawalController.php`.
- Notifiche in-app: `NotificationController.php` + preferenze per canale.

### Admin
- Dashboard: `Admin/DashboardController.php` + `AdminConsoleAnalytics.vue`, `AdminChartOrders.vue` ecc.
- Ordini + cambio stato + rigenera etichetta + cambio PUDO: `Admin/OrderManagementController.php`.
- Utenti + approvazione + ruoli: `Admin/UserManagementController.php`.
- Wallet overview + withdrawals approve/reject: `Admin/WalletManagementController.php`.
- Pro requests approve/reject: `ProRequestController.php`.
- Contact messages + settings + articles + price bands + promo + coupon + homepage image: tutto coperto.
- Pagina test BRT: `pages/account/amministrazione/test-brt.vue` (gated da `NUXT_PUBLIC_ENABLE_DEV_TOOLS`).

### Legal/Compliance
- Privacy: `pages/privacy-policy.vue`.
- Cookie: `pages/cookie-policy.vue` + `CookieBanner.vue` + `POST /api/cookie-consent` + tabella `cookie_consents`.
- Termini: `pages/termini-condizioni.vue`.
- Reclami (solo pagina informativa): `pages/reclami.vue`.
- GDPR export + delete account: `GdprController.php` (`/user/account` DELETE, `/user/data-export` GET).
- Privacy accepted_at: migration `2026_04_11_000001_add_privacy_accepted_at_to_users_table`.
- Soft delete users + orders.

### SEO & performance
- Sitemap dinamica: `@nuxtjs/sitemap` con sources `/__sitemap__/blog`, `/__sitemap__/guide`, `/__sitemap__/servizi` (server endpoints in `server/`).
- Robots.txt: `public/robots.txt`.
- Schema.org Organization in head + `useSchemaOrg.ts`.
- Meta og + twitter: `nuxt.config.ts:133-153`.
- Image optimization: `@nuxt/image` con avif+webp, quality 80.
- Code splitting vendor (Stripe/Swiper/Pinia/Leaflet/Tiptap): `nuxt.config.ts:516-529`.
- Preload font + dns-prefetch.
- Core Web Vitals monitoring: `useWebVitals.ts`.

### Sicurezza
- Sanctum SPA cookie + CSRF.
- Rate limiting granulare (login 30/min, coupon 5/min, BRT create 5/min, webhook 60/min, pudo 30/min).
- CheckAdmin middleware + CheckCart.
- CSP stretta (no unsafe-inline in prod script-src): `nuxt.config.ts:415-441`.
- Security headers via `nuxt-security`.
- Revoca token Sanctum al logout: `routes/api/auth.php:35-36`.
- Coupon anti-abuse: `2026_04_11_100000_add_coupon_anti_abuse_fields`.
- Stripe webhook idempotency: tabella `stripe_webhook_events`.
- BRT webhook HMAC + IP whitelist.

### Integrazioni esterne confermate
- BRT SOAP/REST: 4 servizi (ShipmentService, PickupService, TrackingService, PudoService).
- Stripe full (card, intent, customer, connect, webhook).
- Google/Facebook/Apple OAuth.
- Nominatim OpenStreetMap (geocoding PUDO).
- Sentry (DSN configurabile).
- Plausible / GA4 (domini e misurazione ID configurabili).
- Mail: config generico Laravel Mail (SMTP/Mailgun/SES settabile via env, nessun lock-in).

---

## SEZIONE 2 — FEATURE MANCANTI (prioritizzate)

### P0 — Blocker go-live come intermediario BRT

#### F01. Servizio "Contrassegno" acquistabile dall'utente
- **Descrizione**: i campi `is_cod`, `cod_amount`, `cod_payment_type` esistono su `Order` e il payload BRT li invia, ma il flusso utente (`la-tua-spedizione/[step].vue`) **non espone un servizio "Pagamento alla consegna"** da abilitare con importo. Esiste `pages/servizi/pagamento-alla-consegna.vue` solo come pagina informativa.
- **Impatto**: feature commerciale fondamentale — un intermediario BRT senza COD perde C2C e small business.
- **Stima**: 6-8h
- **File da toccare**:
  - FE: `components/shipment/ShipmentStepServizi.vue`, `StepServicesGrid.vue`, `useShipmentStepServices.ts` (aggiungere card COD con input importo).
  - BE: `Service` model già esiste con `service_data` JSON — aggiungere servizio tipo `cod` con campo `amount_cents` dinamico.
  - Propagazione: `CartService.php`, `CheckoutSubmissionContextService.php`, creazione Order deve settare `is_cod=true` + `cod_amount`.

#### F02. Servizio "Assicurazione a valore dichiarato" acquistabile
- **Descrizione**: `BrtPayloadBuilder.php:64-68` invia `insuranceAmount` ma in `options` — non c'è flusso utente che imposta il valore.
- **Impatto**: in italiano è obbligatorio per merce >500€ secondo Convenzione CMR; commercialmente è il 2° upsell più monetizzabile dopo COD.
- **Stima**: 4-6h
- **File da toccare**: stessi di F01 + tariffa % sul valore dichiarato (da aggiungere a `pricing_national_supplements`).

#### F03. Apertura reclamo in-app con upload foto
- **Descrizione**: `pages/reclami.vue` è statica informativa. Nessun form, nessun upload, nessuna tabella `claims`. L'assistenza esiste (`POST /api/support-tickets`) ma non accetta allegati.
- **Impatto**: senza reclami in-app l'utente deve scrivere email manualmente → conversion post-vendita ridotta, SLA non tracciabile.
- **Stima**: 8-12h
- **File da toccare**: nuovo `Claim` model + migration + `ClaimController` + endpoint + `pages/account/spedizioni/[id].vue` aggiungere tab reclami + upload S3/storage + admin `pages/account/amministrazione/reclami.vue`.

#### F04. Richiesta cambio data ritiro
- **Descrizione**: una volta richiesto il pickup via `POST /orders/{id}/pickup`, non c'è endpoint per modificare la data. L'utente deve annullare+rifare (ma `delete-shipment` è admin-only).
- **Impatto**: 20-30% dei ritiri cambia data la prima volta (benchmark settoriale) — senza questa funzione si generano tante tickets manuali.
- **Stima**: 3-4h
- **File da toccare**: `ShipmentExecutionController.php` (nuovo `reschedulePickup`), `PickupService.php` (API BRT endpoint PUT).

#### F05. Pagamento via bonifico (flusso reale)
- **Descrizione**: `usePaymentFlow.ts:75` espone "Bonifico" come opzione ma l'ordine non passa mai da uno stato `awaiting_bank_transfer`. `OrderAwaitingBankTransferMail.php` esiste ma non viene chiamata da alcun listener.
- **Impatto**: essenziale per utenti Pro B2B che non usano carta.
- **Stima**: 4-6h
- **File da toccare**: `StripeCheckoutController.php` (biforcare su `payment_method_type`), nuovo `BankTransferController`, admin conferma manuale, listener che chiama `OrderAwaitingBankTransferMail`.

#### F06. Fatturazione elettronica SDI (obbligatoria in IT per B2B)
- **Descrizione**: `InvoicePdfService.php` genera PDF ma non produce il file XML SDI (FPR/FPA) né invia ad Agenzia delle Entrate/provider (Fatture in Cloud, Aruba, Fattura24).
- **Impatto**: obbligatorio di legge per emissione fatture da P.IVA a P.IVA. Senza non si può fatturare clienti Pro legalmente.
- **Stima**: 12-20h (integrazione provider + test)
- **File da toccare**: nuovo `SdiService`, integrazione SDK (es. `weble/laravel-einvoicing` o API Fatture in Cloud), campi `sdi_code`, `pec_email` in `billing_addresses`, cron invio XML.

#### F07. Campi P.IVA + codice fiscale + codice SDI + PEC in fatturazione
- **Descrizione**: `BillingAddress` ha solo `name, address, city, province_name, postal_code` — nessun campo `vat_number`, `fiscal_code`, `sdi_code`, `pec_email`. Verificato in `BillingAddress.php:41-47`.
- **Impatto**: preliminare a F06. Senza questi campi non si emette fattura a privato con CF o azienda con P.IVA.
- **Stima**: 2-3h
- **File da toccare**: migration alter table `billing_addresses`, `BillingAddressStoreRequest.php`, `checkout/Billing.vue`, `useCheckoutBilling.js`.

### P1 — Essenziale per competere

#### F08. Notifica SMS per destinatario (tracking + giacenza)
- **Descrizione**: zero integrazione Twilio/MessageBird/Vonage. Tutte le comunicazioni sono email (`Mail/*.php`).
- **Impatto**: 40% dei destinatari non apre email — SMS riduce giacenze del 15-25% (dato corriere settoriale).
- **Stima**: 6-8h
- **File da toccare**: `composer require twilio/sdk`, `config/services.php` (credenziali), nuovo `SmsService`, listener `SendShipmentSmsNotification`, toggle in `UserNotificationPreference`.

#### F09. PWA service worker + push notification
- **Descrizione**: `public/manifest.json` presente ma non c'è service worker registrato. Nessun VAPID key. `push-notif` risultato 0 file (solo docs).
- **Impatto**: engagement mobile + tracking in tempo reale senza aprire email.
- **Stima**: 8-10h
- **File da toccare**: aggiungere `@vite-pwa/nuxt` o modulo PWA, `plugins/pwa.client.ts`, endpoint `POST /api/push/subscribe`, libreria `web-push` lato Laravel.

#### F10. 2FA opzionale TOTP
- **Descrizione**: colonne `two_factor_secret`, `two_factor_recovery_codes`, `two_factor_confirmed_at` già esistono (`2025_05_10_152026`), `Fortify` è `require` in composer, `config/fortify.php` presente, ma UI zero e routes Fortify non montate.
- **Impatto**: richiesto da best practice security e da utenti Pro che maneggiano dati sensibili.
- **Stima**: 4-6h
- **File da toccare**: abilitare Fortify features, nuova pagina `pages/account/sicurezza.vue` con QR code + recovery codes + `pages/account/profilo.vue` card 2FA.

#### F11. Bulk upload CSV/XLSX per utenti Pro
- **Descrizione**: nessun import spedizioni da CSV. Solo "Spedizioni configurate" manuali (`SavedShipmentController`). Memoria utente conferma "CSV upload rimosso (era stub non funzionante)".
- **Impatto**: deal-breaker per clienti Pro con >50 spedizioni/settimana.
- **Stima**: 12-16h
- **File da toccare**: nuovo `BulkImportController`, `BulkImportJob` (Laravel queue), template CSV, validazione riga-per-riga, pagina admin Pro + UX mapping colonne.

#### F12. API key per integrazione Pro (public REST API)
- **Descrizione**: Sanctum ha `HasApiTokens` sul User (vedi `User.php:64`) ma non c'è endpoint per generare/revocare token + nessuna OpenAPI spec.
- **Impatto**: integrazione eCommerce (Shopify, WooCommerce, Prestashop) — gating per tier Pro Advanced.
- **Stima**: 10-14h
- **File da toccare**: `ApiKeyController` (generate/revoke/list), middleware `ApiKeyRateLimit`, nuovo route file `routes/api/external.php`, documentazione OpenAPI via Scramble o L5-Swagger.

#### F13. Admin reclami + rimborsi console
- **Descrizione**: `RefundController.php` esiste ma la lista rimborsi + approva/rifiuta non è esposta in admin (`pages/account/amministrazione/` non ha pagina rimborsi).
- **Impatto**: operator team non può gestire rimborsi/reclami da UI.
- **Stima**: 6-8h
- **File da toccare**: `pages/account/amministrazione/rimborsi.vue`, `pages/account/amministrazione/reclami.vue`, `Admin/RefundManagementController`, `Admin/ClaimManagementController`.

#### F14. Audit log accessi + azioni admin
- **Descrizione**: `grep` per `AuditLog`/`activity_log` = 0 risultati. Nessun log su chi ha cambiato stato ordine, chi ha approvato utente, quando.
- **Impatto**: richiesto GDPR art. 32 (tracciabilità) + forense.
- **Stima**: 6-8h
- **File da toccare**: `composer require spatie/laravel-activitylog`, trait `LogsActivity` su `Order`, `User`, `Coupon`, `PriceBand`.

#### F15. Statistiche dashboard Partner Pro
- **Descrizione**: `AccountProDashboard.vue` esiste come componente ma serve aggregazione spedizioni/mese, spesa totale, risparmio vs listino base.
- **Impatto**: retention + upsell tier avanzato.
- **Stima**: 4-6h
- **File da toccare**: nuovo `ProStatsController`, endpoint aggregati, chart in `AccountProDashboard.vue`.

#### F16. Sponda idraulica / consegna al piano come line item acquistabile
- **Descrizione**: mapping BRT esiste (`SU`, `CP`, `RP`) ma non ho trovato servizio Pro "acquistabile" con prezzo separato in `Service` seeder. Vengono applicati automaticamente se il pacco li richiede, non selezionabili a pagamento.
- **Impatto**: upsell 5-15€/spedizione.
- **Stima**: 3-4h
- **File da toccare**: `ArticleSeeder` (servizi), `components/shipment/StepServicesGrid.vue`.

#### F17. Annullamento post-pickup con logica BRT
- **Descrizione**: `orders/{order}/cancel` esiste, ma non blocca se BRT ha già ritirato. `RefundService` dovrebbe verificare `isCancellable()`.
- **Impatto**: evita refund illegittimi.
- **Stima**: 2-3h
- **File da toccare**: `OrderDetailController::cancel`, `RefundService`, controllo stato BRT real-time.

### P2 — Nice-to-have

#### F18. Carbon offset opzionale
- **Descrizione**: zero riferimenti. Può essere partnership con Treedom o flat 0.20€/spedizione versato a fondazione.
- **Impatto**: marketing green.
- **Stima**: 3h + business.

#### F19. Live chat (Intercom/Crisp/Tawk)
- **Descrizione**: zero integrazione chat widget verificata. Solo ticket email e contact form.
- **Impatto**: -30% tempo risposta customer care.
- **Stima**: 2h (script tag + CSP connect-src).

#### F20. Firma obbligatoria / identificata (BRT)
- **Descrizione**: BRT supporta `FF`, `FI` (firma/firma identificata) ma mapping in `BrtPayloadBuilder.php` non presente.
- **Stima**: 2h.

#### F21. Pacco fragile (servizio acquistabile)
- **Descrizione**: BRT codice `FR` non mappato, non esposto in UI.
- **Stima**: 2h.

#### F22. Bonifico automatico riconciliazione (PayPal integration Open Banking)
- Alternativa al F05 manuale.
- **Stima**: 20-30h.

#### F23. Reso (etichetta di ritorno)
- **Descrizione**: BRT API supporta generazione etichetta return; zero implementazione.
- **Stima**: 8h.

#### F24. Multi-mittente Pro (diverse sedi)
- **Descrizione**: `UserAddress` ha max 5 indirizzi con default, ma non distingue "indirizzi mittente Pro" con filiali.
- **Stima**: 6h.

#### F25. Consegna fissata (data/ora specifica)
- **Descrizione**: BRT ha servizio appuntamento consegna (`AP`) + `deliveryDateAndHour`. Mapping AP presente, ma ora specifica no.
- **Stima**: 3h.

#### F26. White-label (dominio cliente Pro Advanced)
- **Descrizione**: zero. Richiede multi-tenancy e routing dinamico.
- **Stima**: 40-60h.

#### F27. Conservazione sostitutiva fatture
- **Descrizione**: servizio esterno (Aruba DocFly, Namirial). Dipende da F06.
- **Stima**: 8h integrazione provider.

#### F28. Google Analytics 4 full event tracking
- **Descrizione**: infrastruttura CSP + env c'è (`gaId`), ma nessun `gtag_event` custom in funnel. Solo Plausible ha eventi.
- **Stima**: 4h.

#### F29. Schema.org JSON-LD per-pagina (Product, Service, BreadcrumbList)
- **Descrizione**: solo Organization global. Servizi e guide potrebbero avere schema specifico.
- **Stima**: 3h.

---

## SEZIONE 3 — TOP 10 QUICK WINS (< 2h ciascuno)

| # | Feature | Stima | Beneficio |
|---|---------|-------|-----------|
| Q1 | Mappare BRT codici `FF`/`FI` firma in `BrtPayloadBuilder::SERVICE_MAPPING` | 30min | servizi acquistabili in più |
| Q2 | Mappare BRT `FR` pacco fragile | 30min | idem |
| Q3 | Aggiungere `vat_number`, `fiscal_code`, `sdi_code`, `pec_email` in `BillingAddress` (solo migration + model + request) | 1h | prerequisito fatturazione SDI |
| Q4 | Aggiungere `gtag` custom events (`begin_checkout`, `purchase`, `add_to_cart`) in `useFunnelAnalytics.ts` | 1.5h | funnel tracking completo |
| Q5 | Aggiungere schema.org BreadcrumbList automatico in layout default | 1h | SEO |
| Q6 | Esporre endpoint Fortify 2FA (setup + challenge + recovery) senza UI completa | 2h | preparare F10 |
| Q7 | Admin: aggiungere filtri stato+data su `pages/account/amministrazione/ordini.vue` (se mancanti) | 1h | operations |
| Q8 | Schedulare `php artisan model:prune` + `orders:cleanup` | 30min | igiene DB |
| Q9 | Aggiungere `prefers-reduced-motion` CSS globale | 30min | accessibilità |
| Q10 | Aggiungere `<link rel="alternate" hreflang>` per versioni linguistiche (prep internazionale) | 1h | SEO future |

---

## SEZIONE 4 — BLOCKER CRITICI (impediscono go-live commerciale)

1. **F01 — Contrassegno non selezionabile**: senza COD il sito non copre un caso d'uso mainstream.
2. **F02 — Assicurazione non selezionabile**: richiesto di fatto per spedizioni >100€ valore.
3. **F06+F07 — Fatturazione elettronica SDI + campi fatturazione**: **illegale fatturare P.IVA B2B in Italia senza SDI**. Questo è un blocker giuridico se c'è intenzione di fatturare (non solo emettere ricevute).
4. **F05 — Bonifico non funzionante in pratica**: il label esiste in UI ma il flusso non atterra mai su `awaiting_bank_transfer` → utente confuso, credibilità compromessa. Meglio rimuovere dalla UI o implementarlo.
5. **F03 — Reclami in-app assenti**: riduce drasticamente capacità di gestione del post-vendita e diventa un moltiplicatore di recensioni negative dopo il go-live.
6. **F14 — Audit log assente**: compliance GDPR art. 32 + difesa da dispute.

---

## SEZIONE 5 — ROADMAP 2 SETTIMANE

### Sprint 1 (giorni 1-5) — Blocker commerciali
| Giorno | Task | Owner |
|--------|------|-------|
| 1 (AM) | Q3 (campi fatturazione) + Q1/Q2 (mapping BRT firma/fragile) | BE |
| 1 (PM) | F07 (UI campi fatturazione in `checkout/Billing.vue`) | FE |
| 2 | F01 — Contrassegno acquistabile (BE service + seeder + tariffa) | BE+FE |
| 3 | F01 completamento UI + test E2E | FE |
| 4 | F02 — Assicurazione acquistabile (tariffa % + UI + propagazione) | BE+FE |
| 5 | F17 (annullamento post-pickup sicuro) + F16 (sponda/consegna piano line item) | BE |

### Sprint 2 (giorni 6-10) — Post-vendita + fattura
| Giorno | Task | Owner |
|--------|------|-------|
| 6-7 | F03 — Reclami in-app (model + upload storage + form + admin list) | full-stack |
| 8 | F04 — Cambio data ritiro | BE+FE |
| 9 | F05 — Bonifico funzionante (stato + mail + admin conferma) | BE |
| 10 | F06 + F07 completo — integrazione SDI (provider Fatture in Cloud consigliato) | BE |

### Sprint 3 (giorni 11-14) — Maturità operativa
| Giorno | Task | Owner |
|--------|------|-------|
| 11 | F13 — Admin reclami/rimborsi console | FE |
| 12 | F14 — Audit log (spatie/activitylog) | BE |
| 13 | F10 — 2FA UI (setup + challenge) | full-stack |
| 14 | F08 — SMS base (solo "in consegna" + "giacenza") + hardening test | BE |

### Post-sprint (se tempo)
- F09 PWA push (1-2 giorni).
- F11 Bulk CSV (2-3 giorni).
- F12 API key Pro (2 giorni) + documentazione Stoplight/Scramble.
- F15 dashboard Pro stats (1 giorno).

---

## APPENDICE — Stack & metriche osservate

- **Migrations**: 62 file, DB schema maturo (`orders` ha 30+ campi BRT, wallet, refund, billing).
- **Controllers**: 47 nel backend (di cui 9 admin).
- **Componenti Nuxt**: 200+ (incluse cartelle account, admin, shipment, servizi, homepage).
- **Composables**: ~100 in `composables/`.
- **Routes API**: 8 file modulari (auth, shipment, cart, orders, payments, community, admin, public).
- **Test**: E2E Playwright 28 specs, backend PHPUnit 52 file.
- **Linguaggi**: tutto in italiano per utente + commenti didattici estesi.
- **Husky hooks**: pre-commit, commit-msg, pre-push attivi (`.husky/`).
- **CI/CD**: `render.yaml` + `render.staging.yaml` per Render.com.

---

*Fine audit. Report generato 2026-04-18.*
