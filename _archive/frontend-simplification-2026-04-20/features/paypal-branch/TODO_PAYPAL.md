# TODO: Integrazione PayPal

**Stato**: non implementato.
**Contesto**: Google Pay + Apple Pay OK via Stripe PaymentRequestButton (vedi
`composables/usePaymentRequestButton.ts`). PayPal e' stato escluso da questa
fase perche' richiede SDK server-side, account business separato e un flusso
approve/capture distinto da quello Stripe.

## Passi necessari

### 1. Account Business PayPal
- Creare account PayPal Business (Sandbox + Live).
- Generare API credentials: `client_id` + `client_secret` per entrambi gli ambienti.
- Configurare webhook endpoint su portale PayPal: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`.

### 2. Backend Laravel
- **Dipendenza**: `composer require srmklive/paypal` (mantenuto, REST v2) oppure SDK ufficiale `paypal/paypal-server-sdk`.
  - Evitare `paypal/rest-api-sdk-php` (legacy, deprecato).
- **Config**: `config/paypal.php` con client_id + secret letti da env (`PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_MODE=sandbox|live`).
- **Controller**: `app/Http/Controllers/PaypalController.php` con endpoint:
  - `POST /api/paypal/create-order` → crea ordine PayPal, ritorna `order_id` PayPal + link approve.
  - `POST /api/paypal/capture/{paypal_order_id}` → cattura pagamento, marca `Order` locale come `pagato`.
  - Riusare `order_paid` logic di `StripeController` (mark-order-completed con `ext_id = paypal_order_id`, `payment_type = 'paypal'`).
- **Webhook**: `POST /webhooks/paypal/capture` in `routes/web.php` (no CSRF). Idempotenza via `ext_id`.

### 3. Frontend Nuxt
- **Composable**: `composables/usePaypal.ts` che:
  - Carica SDK `https://www.paypal.com/sdk/js?client-id=...&currency=EUR&intent=capture` una sola volta.
  - Espone `initPaypal()`, `mountPaypalButtons(container)`, `onApprove(handler)`.
- **Render**: `<div ref="paypalButtonContainer">` con `paypal.Buttons({ createOrder, onApprove }).render()`.
- **Handler onApprove**: chiama backend `POST /api/paypal/capture/{order_id}` e finalizza ordine.

### 4. UI
- Aggiungere opzione `paypal` in `paymentMethodOptions` di `usePaymentFlow.ts`:
  ```ts
  { key: 'paypal', title: 'PayPal', description: 'Paga con account PayPal' }
  ```
- In `components/checkout/PaymentMethods.vue` aggiungere il panel `v-else-if="paymentMethod === 'paypal'"`
  con il container per il bottone PayPal (stesso pattern `paymentRequestRefCallback`).
- Integrare in `usePaymentProcess.ts` il branch `paypal`:
  ```ts
  if (paymentMethod.value === 'paypal') { /* orchestrazione create + capture */ }
  ```

### 5. Test
- Sandbox business + personal account (buyer test).
- Flow completo: `createOrder` → approve nella finestra PayPal → `capture` → webhook.
- Edge case: utente chiude la sheet PayPal (onCancel), pagamento rifiutato (onError), webhook duplicato.
- Test idempotenza con `client_submission_id` (gia' in uso per Stripe).

## Stime
- Backend: ~2-3 ore
- Frontend: ~2 ore
- Test + QA: ~1 ora
- **Totale: 4-6 ore**

## Riferimenti
- PayPal Server SDK: https://developer.paypal.com/docs/api/orders/v2/
- srmklive/paypal wrapper Laravel: https://github.com/srmklive/laravel-paypal
- Stripe vs PayPal flow (per capire perche' PayPal richiede SDK dedicato): https://stripe.com/docs/payments/paypal
