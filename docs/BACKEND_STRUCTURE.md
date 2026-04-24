# Backend Structure - Laravel App

Mappa pratica di `laravel-spedizionefacile-main/`.

Questo documento non vuole elencare tutto: vuole chiarire **dove vive davvero il business** e quali sono i boundary canonici.

## Layout reale

```text
laravel-spedizionefacile-main/
|- app/
|  |- Events/
|  |- Http/
|  |  |- Controllers/
|  |  |- Middleware/
|  |  |- Requests/
|  |  `- Resources/
|  |- Jobs/
|  |- Listeners/
|  |- Mail/
|  |- Models/
|  |- Notifications/
|  |- Policies/
|  |- Services/
|  `- Support/
|- config/
|- database/
|- resources/views/
|- routes/
|  |- api.php
|  `- api/
`- tests/
```

## Regola architetturale

Il backend deve essere letto per domini, non per cartelle generiche.

I domini core sono:

- auth/session
- shipment / quote / address / PUDO
- cart / checkout / order creation
- payment / Stripe / wallet
- coupon / referral
- account / notifications / withdrawals
- BRT / documenti / tracking
- admin operations

## Boundary core da conoscere

### Shipment / order lifecycle

Il lifecycle reale e':

1. preventivo / sessione
2. carrello / package selection
3. creazione ordine
4. pagamento
5. post-pagamento
6. BRT / documenti / tracking

I punti backend piu' importanti di questo flusso sono:

- `CheckoutSubmissionContextService`
- `OrderCreationService`
- `StripeCheckoutController`
- `OrderBrtFulfillmentService`
- `OrderBrtTrackingLifecycleService`
- `ShipmentExecutionService`
- `Brt/*`

`CheckoutSubmissionContextService` e' il counterpart backend del boundary
`shipment draft -> ordine pagabile`: arricchisce `client_submission_id`,
signature e pricing snapshot, ma non possiede la draft frontend.

### Payment

Il pagamento ordine non vive in un solo posto:

- `StripeCheckoutController` gestisce creazione ordine, payment intent e completion
- `StripePaymentService` gestisce Stripe
- `WalletController` espone il boundary HTTP del wallet
- `WalletOrderPaymentService` possiede il primo step del pagamento ordine via wallet
- `WalletOrderLinkService` possiede il contratto canonico `order-{id}` / `wallet-{id}`

Questo e' un boundary importante da documentare bene perche' oggi e' uno dei punti piu' complessi del sistema.

### Wallet

Il wallet ha due concetti distinti che oggi si toccano:

- `wallet_movements` -> saldo spendibile
- `referral_usages` + `withdrawal_requests` -> reporting e prelievi commissione

In piu', il pagamento ordine via wallet oggi e' un flusso in 2 step:

1. `POST /api/wallet/pay` -> `WalletOrderPaymentService`
2. `POST /api/stripe/mark-order-completed`

Questa e' complessita reale da spiegare apertamente, non da nascondere.

`wallet_movements` non ha un solo owner:

- `ReferralRewardController` scrive i crediti commissione referral
- `WalletController` scrive top-up e movimenti wallet diretti
- `WalletOrderPaymentService` crea il debit iniziale del pagamento ordine
- `WalletOrderLinkService` collega quel debit all'ordine canonico

### Coupon / referral

Questa feature oggi e' spezzata in piu' boundary:

- `CouponController` -> validazione/preview sconto
- `ReferralCodeController` -> ownership e validazione dei codici Partner Pro
- `ReferralRewardController` -> accredito reale della commissione al Partner Pro
- `DiscountPreviewService` -> regola unica della preview coupon/referral

Quindi il concetto utente e' unico, ma il codice e' ancora distribuito.

Nota di stato attuale:

- `DiscountPreviewService` ha unificato lookup Partner Pro, percentuale referral e shape preview
- il checkout oggi usa una preview coerente, ma non e' ancora lo stesso boundary che accredita la reward reale
- `ReferralRewardController` resta il punto economico post-ordine della commissione Pro

### BRT

BRT e' una feature core, non un'integrazione marginale.

I domini da considerare insieme sono:

- label
- pickup
- tracking
- bordero/documenti
- PUDO
- contrassegno
- multi-collo

Ownership target del boundary:

- `BrtController` / controller admin = entry HTTP
- `OrderBrtFulfillmentService` = owner canonico order-centric del fulfillment
- `OrderBrtTrackingLifecycleService` = owner canonico order-centric del tracking lifecycle
- `OrderBrtTrackingReadService` = owner canonico read-side del tracking/order state
- `OrderBrtTrackingLookupService` = lookup condiviso per riferimenti tracking/order
- `ShipmentExecutionService` = execution dopo la label (pickup/bordero/documenti)
- `Brt/*` = adapter carrier-specific verso le API BRT

Tutti i percorsi principali devono convergere su `OrderBrtFulfillmentService`:

- automatico via listener `GenerateBrtLabel`
- manuale via `BrtController`
- rigenerazione admin via `Admin/OrderManagementController`

Questo serve a evitare scritture duplicate o divergenti di:

- `brt_*`
- `brt_error`
- `execution_error`
- `status` + `brt_last_tracking_check` tra webhook e sync command

Il punto chiave di progetto e':

- BRT deve leggere dall'ordine persistito canonico
- non da override sparsi tra frontend e controller

## Controllers

`app/Http/Controllers/` contiene i boundary HTTP.

I controller piu' importanti da conoscere all'inizio sono:

- `SessionDataController`
- `LocationController`
- `CouponController`
- `OrderListController`
- `OrderDetailController`
- `ShipmentExecutionController`
- `StripeCheckoutController`
- `WalletController`
- `ReferralCodeController`
- `ReferralRewardController`
- `Admin/OrderManagementController`

Regola:

- controller = boundary HTTP
- service = business logic
- model = persistence + relazioni + scope leggeri

## Services

`app/Services/` e' il cuore del business.

I servizi che contano di piu' oggi sono:

- `OrderCreationService`
- `CheckoutSubmissionContextService` = counterpart backend del boundary `shipment draft -> order`
- `CartService`
- `StripePaymentService`
- `DiscountPreviewService`
- `WalletOrderPaymentService`
- `WalletOrderLinkService`
- `OrderBrtFulfillmentService` = canonical writer dello stato fulfillment order-centric
- `OrderBrtTrackingLifecycleService` = canonical writer del tracking lifecycle order-centric
- `OrderBrtTrackingReadService` = canonical read model del tracking order-centric
- `OrderBrtTrackingLookupService` = canonical lookup per tracking refs e order refs pubblici
- `ShipmentExecutionService`
- `Brt/*`
- `Pricing/*`

Regole:

- no business pesante nei controller
- no HTTP client logic sparsa fuori dai service boundary
- transazioni multi-step dentro service o controller boundary molto espliciti
- `ShipmentExecutionService` possiede il post-label flow, non la scrittura canonica iniziale del fulfillment

## Models

I modelli che spiegano il dominio core sono:

- `User`
- `Package`
- `PackageAddress`
- `BillingAddress`
- `Order`
- `Transaction`
- `WalletMovement`
- `ReferralUsage`
- `WithdrawalRequest`
- `Coupon`
- `PudoPoint`
- `Setting`

Leggere prima questi modelli aiuta piu' di un inventario completo.

## Route modules

`routes/api/` e' gia' separata per domini.  
Questo e' un punto buono del backend da preservare.

I moduli principali da trattare come canonici sono:

- `auth.php`
- `shipment.php`
- `cart.php`
- `orders.php`
- `payments.php`
- `community.php`
- `admin.php`
- `public.php`

## File da leggere prima

Per capire il backend senza perdersi:

1. `routes/api.php`
2. `routes/api/orders.php`
3. `routes/api/payments.php`
4. `app/Services/CheckoutSubmissionContextService.php`
5. `app/Services/OrderCreationService.php`
6. `app/Http/Controllers/StripeCheckoutController.php`
7. `app/Http/Controllers/WalletController.php`
8. `app/Services/WalletOrderPaymentService.php`
9. `app/Services/WalletOrderLinkService.php`
10. `app/Services/OrderBrtFulfillmentService.php`
11. `app/Http/Controllers/CouponController.php`
12. `app/Http/Controllers/ReferralRewardController.php`
13. `app/Services/Brt/*`

## Test

Prima di toccare i boundary core, i test minimi da conoscere sono:

- order / payment flow
- shipment execution
- BRT integration
- wallet
- referral / coupon

Quando una modifica tocca uno di questi domini, la verifica non puo' limitarsi al codice: va controllato anche il flusso reale.

## Riferimenti

- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`FEATURE_BOUNDARIES.md`](./FEATURE_BOUNDARIES.md)
- [`FRONTEND_STRUCTURE.md`](./FRONTEND_STRUCTURE.md)
- [`API_CONTRACT.md`](./API_CONTRACT.md)
- [`DEBUGGING.md`](./DEBUGGING.md)
