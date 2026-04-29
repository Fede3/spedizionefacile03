# Mappa moduli — guida junior-friendly

Documento pensato per chi entra **oggi** sul codice senza contesto.
Per ogni modulo: cosa fa, dove vive il codice, qual è l'entry point e quali file evitare di toccare senza E2E.

> **Convenzione**: `apps/web/` è il frontend Nuxt 4. La root del repo è il backend Laravel 11.
> Caddy `:8787` → split routing API/SPA (vedi `infra/caddy/Caddyfile`).

---

## 1. Funnel preventivo (`shipment-flow`)

**Cosa fa**: l'utente compila colli → servizi → indirizzi → riepilogo → pagamento in un'unica pagina con accordion.

**Entry point**:
- Pagina: `apps/web/pages/la-tua-spedizione/[step].vue` (orchestratore)
- Store: `apps/web/stores/shipmentFlowStore.ts` (state condiviso)

**Sotto-componenti step** (`apps/web/components/shipment/`):
- `ShipmentStepColli.vue` — step 1, colli e dimensioni
- `ShipmentStepServizi.vue` — step 2, servizi extra (assicurazione, contrassegno…)
- `ShipmentStepIndirizzi.vue` — step 3, indirizzi mittente/destinatario o PUDO
- `ShipmentStepPagamento.vue` — step 4, riepilogo + Stripe (**CRITICAL**)

**Composables principali** (`apps/web/composables/`):
- `useShipmentStepServices` — servizi extra
- `useShipmentStepAddresses` — indirizzi origin/dest
- `useShipmentStepFlow` — apri/chiudi accordion
- `useShipmentStepValidation` — validazione cross-field
- `useShipmentStepSubmit` — persistenza step + transizione

**Helper puri** (`apps/web/utils/shipmentStepHelpers.ts`): formato data, normalize address, sanitize sentinels.

**Backend route**: `routes/api/shipment.php` → `App\Http\Controllers\Shipment\*`.

**Da NON toccare senza E2E Stripe (`4242 4242 4242 4242 09/30 123`)**:
- `ShipmentStepPagamento.vue`
- `composables/usePayment.ts`
- `app/Http/Controllers/Checkout/StripeCheckoutController.php`

---

## 2. Checkout / pagamenti (`checkout-payment`)

**Cosa fa**: PaymentIntent Stripe + 3DS + idempotency + webhook.

**Entry point frontend**: `apps/web/composables/usePayment.ts` (~400 LOC, **CRITICAL**).

**Backend**:
- `app/Http/Controllers/Checkout/StripeCheckoutController.php` — crea PaymentIntent
- `app/Http/Controllers/Checkout/StripeWebhookController.php` — riceve eventi Stripe (firma + idempotency-key)
- `app/Services/StripePaymentService.php` — client Stripe con idempotency
- `app/Services/OrderCreationService.php` — Cart → Order

**Trait helpers**: `app/Http/Controllers/Checkout/Concerns/{StripeWebhookHelpers, StripeCheckoutHelpers, IdempotencyAndMetadataHelpers}.php`.

**Test E2E**: vedi `tests/e2e/STRIPE_E2E.md`.

---

## 3. Wallet (`wallet`)

**Cosa fa**: saldo virtuale dell'utente, ricaricabile via Stripe, spendibile come metodo di pagamento alternativo.

**Frontend**: `apps/web/components/wallet/*`, `apps/web/pages/account/wallet.vue`.

**Backend**:
- `app/Http/Controllers/Wallet/WalletController.php`
- `app/Services/WalletOrderPaymentService.php` — lock saldo (**CRITICAL**: `lockForUpdate` per concorrenza)
- `app/Models/Wallet.php` + `WalletTransaction.php`

**Convenzione**: saldo in **cents**, formattato lato frontend (`/100 + " €"`).

---

## 4. Coupon e referral (`coupon-referral`)

**Cosa fa**:
- Coupon: codici promozionali con sconto fisso/percentuale, scadenza, soglia minima.
- Referral: utente A invita utente B → entrambi ricevono credito.

**Frontend**: `apps/web/components/cart/CouponInline.vue`, `useCart` per applicazione.

**Backend**:
- `app/Http/Controllers/Coupon/CouponController.php`
- `app/Http/Controllers/Referral/ReferralController.php`
- Models: `Coupon`, `Referral`, `ReferralReward`.

**Endpoint**: `/api/coupon/validate`, `/api/referral/code`.

---

## 5. BRT / PUDO (`brt-pudo`)

**Cosa fa**: integrazione corriere BRT — calcolo prezzi, prenotazione spedizione, tracking, ricerca punti PUDO (Punti BRT consegna alternativa).

**Frontend**:
- Mappa PUDO: `apps/web/components/shipment/PudoMap.vue`
- Selezione: `apps/web/stores/pudoStore.ts`

**Backend**:
- Facade: `App\Services\Brt\BrtClient` (orchestratore di 11 sub-services)
- Sub-services in `app/Services/Brt/`:
  - `BrtAuthService` — token JWT
  - `BrtPriceService` — calcolo tariffe
  - `BrtBookingService` — prenotazione
  - `BrtTrackingService` — eventi spedizione
  - `BrtPudoService` — ricerca punti
  - …e altri 6 specializzati
- Webhook tracking: `app/Http/Controllers/Shipping/BrtWebhookController.php` (**HMAC validation, fail-closed in prod**)

**Comandi**:
- `php artisan brt:import-pudo` — import iniziale punti BRT
- `php artisan brt:activate-pudo` — attiva PUDO per area

---

## 6. Account & admin (`account-admin`)

**Account utente**:
- Pages: `apps/web/pages/account/*` (profilo, ordini, indirizzi, wallet)
- Auth: Sanctum SPA via `useSanctumClient()` + cookie httpOnly

**Admin**:
- Pages: `apps/web/pages/admin/*` (dashboard, ordini, prezzi, coupon, referral)
- Stores: `apps/web/stores/admin/*` (pricingBands, coupons, etc.)
- Backend: `app/Http/Controllers/Admin/*`
- Middleware: `app/Http/Middleware/EnsureAdmin.php`

---

## Cose da sapere prima di toccare il codice

1. **Mai blu**: solo teal `#095866` + arancione `#E44203` + neutri.
2. **Italiano per UX, English per identifier**: label utente in italiano, variabili/funzioni/tabelle in inglese.
3. **Prezzi sempre in cents nel backend**: dividi per 100 prima di mostrare.
4. **`useSanctumClient()`** per chiamate API stateful, mai `$fetch` raw.
5. **File CRITICAL** (vedi `CLAUDE.md`): toccare solo con E2E Stripe + revisione.
6. **Limiti dimensionali**: file runtime ≤ 400 LOC, componente Vue ≤ 500, page Vue ≤ 400, controller ≤ 200, service ≤ 400.

## Test rapidi

```bash
# Backend
php artisan test                                    # tutti i test
php artisan test --filter=StripeCheckoutTest        # singolo test

# Frontend
cd apps/web && npm run typecheck                    # TS
cd apps/web && npm run lint                         # ESLint
cd apps/web && npm run build                        # build prod
cd apps/web && npx playwright test                  # E2E
```

## Server in dev

3 processi paralleli (vedi `.claude/launch.json`):
- `:8000` Laravel API
- `:3001` Nuxt SPA
- `:8787` Caddy (entry point unico)

Apri `http://127.0.0.1:8787` nel browser.
