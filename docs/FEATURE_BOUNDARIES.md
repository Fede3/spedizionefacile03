# Feature Boundaries

Mappa pratica delle feature core di SpediamoFacile.

Questo documento serve a rispondere rapidamente a 4 domande:

1. dove entra una feature
2. chi decide davvero il business
3. dove viene persistita
4. dove si riflette in UI

Se stai entrando ora nel progetto, parti da qui prima di leggere i file grandi.

## Regola generale

Per ogni feature:

- **entry point** = route/page o API che la fa partire
- **source of truth** = file o servizio che possiede davvero il comportamento
- **persistence** = dove il dato viene salvato
- **UI surface** = dove l'utente la vede

## Superfici canoniche

### Funnel

- entry pubblica: `/#preventivo`
- route canonica: `/la-tua-spedizione/[step]`
- compat legacy: `/preventivo`, `/checkout`, `/riepilogo`

Step reali:

- `colli`
- `servizi`
- `indirizzi`
- `pagamento`

Il vecchio `riepilogo` non e' piu' una superficie separata: vive dentro `pagamento`.

### Account cliente

Canoniche:

- `/account`
- `/account/profilo`
- `/account/spedizioni`
- `/account/spedizioni/:id`
- `/account/portafoglio`
- `/account/carte`
- `/account/fatture`
- `/account/indirizzi`
- `/account/assistenza`
- `/account/account-pro`

### Admin

Canoniche:

- `/account/amministrazione`
- `/account/amministrazione/ordini`
- `/account/amministrazione/spedizioni`
- `/account/amministrazione/utenti`
- `/account/amministrazione/prezzi`
- `/account/amministrazione/bonifici`
- `/account/amministrazione/impostazioni`
- `/account/amministrazione/servizi/**`

## UI primitive mapping

Quando la scelta e' compatta e mutuamente esclusiva, la primitive canonica e':

- `.sf-segmented-control--step`

Esempi:

- `A domicilio / Punto BRT`
- `Ricevuta / Fattura`
- `Azienda / Privato`

Quando la scelta e' una card con titolo, testo, prezzo o meta, la primitive canonica e':

- `.sf-step-choice`
- `.sf-step-choice--selected`

Esempi:

- metodo di pagamento
- card servizi del funnel

I dettagli visivi e i token restano definiti solo in `docs/DESIGN_SYSTEM.md`.

## Shipment flow

### Dove entra

- `pages/index.vue`
- `pages/la-tua-spedizione/[step].vue`

### Chi decide davvero

Frontend:

- `composables/useShipmentStepPageOrchestration.js`
- `features/shipment-flow/**`
- `composables/useShipmentStepDraftPayload.js`
- `composables/useShipmentStepPaymentEntry.js`
- `stores/shipmentFlowStore.ts`
- `composables/useCart.js`
- `composables/usePayment.js`

Backend:

- `SessionDataController`
- `CheckoutSubmissionContextService`
- `OrderCreationService`

### Dove persiste

- sessione backend
- `shipmentFlowStore.pendingShipment`
- `shipmentFlowStore.pendingShipment` = shipment draft frontend canonico
- `client_submission_id` + signature = checkout submission context canonico
- ordine persistito nel backend quando il checkout genera o recupera l'ordine

### File canonici da leggere per primi

- `pages/la-tua-spedizione/[step].vue`
- `composables/useShipmentStepPageOrchestration.js`
- `features/shipment-flow/flow.js`
- `features/shipment-flow/pageState.js`
- `features/shipment-flow/submit.js`
- `features/shipment-flow/validation.js`
- `composables/useShipmentStepDraftPayload.js`
- `composables/useShipmentStepPaymentEntry.js`
- `stores/shipmentFlowStore.ts`

### Dove si vede

- funnel `colli / servizi / indirizzi / pagamento`
- carrello
- account cliente
- admin ordini/spedizioni

## Quick quote / preventivo

### Dove entra

- `/#preventivo`
- `components/shipment/Preventivo.vue`
- compat legacy: `/preventivo`

### Chi decide davvero

Frontend:

- `components/shipment/Preventivo.vue` = surface UI canonica
- `composables/usePreventivo.js` = orchestrazione canonica del quick quote
- `utils/quickQuoteContract.js` = boundary puro di payload/signature/formatter
- `stores/shipmentFlowStore.ts` = state owner della draft

Backend:

- `SessionDataController::firstStep`

### Dove persiste

- `shipmentFlowStore.pendingShipment`
- sessione backend `first-step`

### Dove finisce

- handoff al funnel canonico `/la-tua-spedizione/[step]`

### Nota importante

Il quick quote / preventivo non e' il funnel canonico completo.
E' la porta pubblica della `shipment draft`: possiede tratta, pacchi, live quote e validazione del primo step,
ma non possiede servizi, indirizzi, pagamento o ordine persistito.

## Payment

### Dove entra

- step `pagamento` del funnel

### Chi decide davvero

Frontend:

- `composables/useShipmentStepPaymentEntry.js`
- `composables/useCheckoutOrderContext.js`
- `composables/useCart.js`
- `composables/usePayment.js`

Backend:

- `StripeCheckoutController`
- `StripePaymentService`
- `WalletOrderPaymentService`
- `WalletOrderLinkService` per il contratto canonico `order-{id}` / `wallet-{id}`

### Dove persiste

- `orders`
- `transactions`
- eventuali `wallet_movements`

### Nota importante

Il pagamento ordine non e' ancora un boundary singolo e perfettamente semplice, ma il contesto
`ordine pagabile` non vive piu' tutto dentro `usePayment.js`.

Oggi il boundary frontend e' diviso cosi':

- `useShipmentStepPaymentEntry.js`:
  - draft spedizione -> step pagamento
  - sync route `step=pagamento`
  - bootstrap auth prima del checkout
- `useCheckoutOrderContext.js`:
  - riuso / generazione `client_submission_id`
  - restore ordine esistente
  - creazione ordine nuova se il checkout non ha ancora un `order_id`
  - invio `single_order_only=true` quando la UI puo' pagare un solo ordine
- `usePayment.js`:
  - scelta metodo pagamento
  - bootstrap auth/Stripe
  - submit finale carta / bonifico / wallet

- carta e bonifico passano da Stripe checkout/order completion
- wallet usa un flusso a due step:
  - `/api/wallet/pay` -> `WalletOrderPaymentService`
  - `/api/stripe/mark-order-completed`

La grammatica canonica del passaggio wallet <-> ordine ora vive in:

- `WalletOrderLinkService`

Questa e' una delle zone prioritarie da semplificare.

## Wallet

### Dove entra

- `/account/portafoglio`
- metodo pagamento `wallet` nel checkout

### Chi decide davvero

Frontend:

- `pages/account/portafoglio.vue`
- `composables/useWalletTopUp.js`
- `composables/usePayment.js`

Backend:

- `WalletController`
- `WalletOrderPaymentService`
- `StripeCheckoutController::markOrderCompleted`
- `WalletOrderLinkService`

### Dove persiste

- `wallet_movements`
- in parte `referral_usages` e `withdrawal_requests` per il lato commissioni/prelievi

### Dove si vede

- saldo wallet
- movimenti wallet
- checkout pagamento
- dashboard Partner Pro

### Nota importante

Oggi esistono due letture economiche diverse:

- saldo spendibile wallet
- saldo commissioni/prelievi

Vanno rese piu' chiare e piu' coerenti in dominio e UI.

Il boundary tecnico canonico del pagamento ordine wallet e' ora:

- `reference = order-{id}`
- `ext_id = wallet-{movementId}`
- verifica movimento/order match in `WalletOrderLinkService`

Ownership del flusso:

- `WalletController` = boundary HTTP, saldo, movimenti, top-up
- `WalletOrderPaymentService` = primo step del pagamento ordine via wallet
- `StripeCheckoutController::markOrderCompleted` = completion ordine e transaction
- `WalletOrderLinkService` = contratto canonico tra ordine e movimento wallet

Questo boundary vale **solo** per il debit wallet che paga un ordine.

`wallet_movements` ospita anche altri tipi di movimento, ma con owner diversi:

- accredito commissione referral -> `ReferralRewardController`
- bonus/top-up -> `WalletController`
- debit pagamento ordine -> `WalletOrderPaymentService` + `WalletOrderLinkService`

Non va esteso automaticamente ad altri movimenti wallet, ad esempio:

- refund
- bonus top-up
- accrediti referral

## BRT / fulfillment

### Dove entra

- pagamento ordine riuscito
- listener `GenerateBrtLabel`
- endpoint manuali BRT / admin
- execution endpoints pickup / bordero / documenti

### Chi decide davvero

Backend:

- `OrderBrtFulfillmentService`
- `OrderBrtTrackingLifecycleService`
- `OrderBrtTrackingReadService`
- `OrderBrtTrackingLookupService`
- `ShipmentExecutionService`
- `BrtController`
- `ShipmentExecutionController`
- `Admin/OrderManagementController`

### Dove persiste

- `orders.brt_*`
- `orders.pickup_*`
- `orders.bordero_*`
- `orders.documents_*`
- `orders.execution_error`

### Nota importante

Il boundary corretto e' `order-centric`:

- `OrderBrtFulfillmentService` e' owner della fase `ordine persistito -> label BRT -> post-label flow`
- `OrderBrtTrackingLifecycleService` e' owner della fase `carrier tracking -> status transition ordine`
- `OrderBrtTrackingReadService` e' owner della fase `tracking lookup + payload read-side`
- `OrderBrtTrackingLookupService` e' il lookup condiviso per riferimenti BRT / tracking / SF-order-code
- `ShipmentExecutionService` e' owner della fase `ordine etichettato -> pickup / bordero / documenti`

Questo implica una separazione piu' netta:

- `TrackingService` = adapter carrier-specific per fetch tracking + mapping carrier status
- `OrderBrtTrackingLifecycleService` = convergenza order-centric di webhook + sync command
- `OrderBrtTrackingReadService` = convergenza order-centric di `/api/tracking/search` e `/api/brt/tracking/{order}`
- `ShipmentExecutionService` = execution operativa dopo la label, non owner del tracking lifecycle

Il controller non deve piu' possedere direttamente la scrittura dello stato pickup.

Guardrail pickup:

- `pickup_request.enabled + pickup_request.date` e' la fonte primaria per prenotare un ritiro
- token legacy ammessi: `ritiro`, `ritiro a domicilio`, `pickup`, `home pickup`
- extra come `ritiro_al_piano` restano particolarita' BRT del collo, ma non prenotano un pickup

## Coupon / referral

### Dove entra

- codice promozionale nel checkout
- area Partner Pro / referral
- admin per configurazione percentuali e controllo

### Chi decide davvero

Preview e validazione:

- `CouponController`
- `ReferralCodeController`
- `DiscountPreviewService`

Frontend preview/UI:

- `composables/useCart.js`
- `features/wallet-referral/useCartPromoPreview.js`
- `features/wallet-referral/useCheckoutPromoPreview.js`
- `utils/discountPreview.js`

Accredito reale commissione:

- `ReferralRewardController`

### Dove persiste

- `coupons`
- `users.referral_code`
- `referral_usages`
- `wallet_movements`
- pricing finale ordine quando il flusso viene applicato davvero

### Dove si vede

- checkout
- wallet / commissioni
- area Partner Pro
- admin

### Nota importante

Per l'utente il concetto e' unico: `codice invito / coupon`.  
Nel codice oggi e' ancora spezzato tra preview, ownership codice e reward reale.

Boundary pratici da leggere:

- `DiscountPreviewService` = percentuale referral e shape preview canonica
- `CouponController` = preview checkout
- `ReferralCodeController` = ownership del codice e discount profile
- `ReferralRewardController` = commissione reale post-ordine
- `features/wallet-referral/useCartPromoPreview.js` = boundary canonico preview coupon nella pagina `/carrello`
- `features/wallet-referral/useCheckoutPromoPreview.js` = boundary canonico preview coupon/referral nel funnel/checkout
- `useCart.js` + `utils/discountPreview.js` = wiring UI e normalizzazione shape promo

Questa e' una feature che va unificata.

Nota di stato attuale:

- `preview checkout` e `reward reale` non coincidono ancora in un unico boundary
- il checkout oggi mostra e calcola un'anteprima coerente di sconto/referral
- la commissione Partner Pro nasce invece nel flusso post-ordine di `ReferralRewardController`
- finche' il pricing finale ordine non viene agganciato allo stesso contratto, preview e reward restano due sotto-flussi distinti

## Account/Admin order lifecycle

### Dove entra

- ordine creato dal funnel
- account cliente
- console admin

### Chi decide davvero

Backend:

- `OrderCreationService`
- `OrderDetailController`
- `OrderListController`
- `OrderBrtFulfillmentService`
- `ShipmentExecutionController`
- `Admin/OrderManagementController`

Frontend:

- `pages/account/spedizioni/**`
- `pages/account/amministrazione/ordini.vue`
- `pages/account/amministrazione/spedizioni.vue`

### Dove persiste

- `orders`
- `transactions`
- dati BRT/documenti collegati

### Dove si vede

- account cliente
- admin
- documenti, tracking, dettaglio spedizione

## BRT integration model

### Domini da tenere insieme

- label
- pickup
- tracking
- bordero/documenti
- PUDO
- contrassegno
- multi-collo

### Boundary backend

- entry HTTP:
  - `BrtController`
  - `ShipmentExecutionController`
  - `Admin/OrderManagementController`
- entry automatico non HTTP:
  - `GenerateBrtLabel` listener su `OrderPaid`
- owner canonico order-centric:
  - `OrderBrtFulfillmentService`
- execution post-label:
  - `ShipmentExecutionService`
- adapter carrier-specific:
  - `Brt/*`

### Cosa possiede davvero `OrderBrtFulfillmentService`

- derivazione opzioni BRT dall'ordine persistito
- persistenza canonica dei campi `brt_*`
- transizione ordine a `label_generated`
- handoff al post-label flow
- marcatura `failed / skipped` del fulfillment

### Regola

BRT deve leggere dall'ordine persistito canonico.

Se una modifica richiede di ricostruire i dati lato frontend o in un controller secondario,
probabilmente il boundary non e' ancora abbastanza pulito.

### Cosa non possiede questo boundary

- non possiede pricing
- non possiede order creation
- non possiede payment completion
- non possiede listing/query admin

## Reading order per chi entra nuovo

1. `README.md`
2. `docs/ARCHITECTURE.md`
3. `docs/FEATURE_BOUNDARIES.md`
4. `docs/FRONTEND_STRUCTURE.md`
5. `docs/BACKEND_STRUCTURE.md`
6. `pages/la-tua-spedizione/[step].vue`
7. `composables/useCart.js`
8. `composables/usePayment.js`
9. `StripeCheckoutController.php`
10. `WalletController.php`
