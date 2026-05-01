# ADR 005 — Stripe Elements + idempotency-key + webhook firmato

Data: 2026-05-01
Status: Accepted

## Contesto

I pagamenti SpediamoFacile sono soldi reali: Stripe Visa/Mastercard, Bonifico bancario manual-confirm, Wallet interno (saldo cliente). Doppi-submit (utente impaziente, retry rete, doppio click), webhook duplicati di Stripe, e race condition fra confermare un PaymentIntent e creare un Order sono i tre rischi principali.

Opzioni valutate:
1. **Stripe Checkout hosted**: redirect su pagina Stripe, semplice, perde branding.
2. **Stripe Elements + PaymentIntent confirm su backend**: branded, customizable, richiede gestione idempotency.
3. **Custom payment form + Stripe API directly**: max controllo, max rischio (PCI scope ampio).

## Decisione

**Stripe Elements client-side + PaymentIntent confirm server-side + idempotency-key client-generato + webhook firmato HMAC**.

Architettura:
- Frontend Nuxt: `@stripe/stripe-js` + `@stripe/elements` per montare il form carta (PCI scope ridotto: il client non vede mai il PAN).
- Frontend genera `client_submission_id` (`sub-<base36-ts>-<random>`) che funge da idempotency-key per Stripe.
- Backend Laravel `StripePaymentService`: chiama `paymentIntents->confirm()` passando `idempotencyKey: $clientSubmissionId`. Stripe deduplica automaticamente.
- `OrderCreationService`: crea l'Order DOPO conferma payment intent, mai prima. Order in stato `pending` fino al `payment_intent.succeeded` webhook.
- `StripeWebhookController`: verifica firma HMAC `Stripe-Signature`, idempotency su `event.id`, transizione stato Order in transaction.

## Motivazioni

- **PCI compliance leggero**: client non tocca mai PAN, solo token Stripe (PCI SAQ A invece di SAQ D-Merchant).
- **Idempotency-key client**: stesso `sub-...` su retry rete = Stripe ritorna lo stesso PaymentIntent senza doppio addebito.
- **Webhook firmato**: protegge contro replay/forge, l'unica fonte verità per "pagamento riuscito" è il webhook firmato.
- **Order pending → paid**: stato consistente, mai un Order paid senza webhook conferma.

## File critici (Stripe-critical)

Modificare solo con E2E gating con carta test `4242 4242 4242 4242 09/30 123`:

- `app/Http/Controllers/Checkout/StripeCheckoutController.php` — endpoint POST `/api/checkout/stripe`
- `app/Http/Controllers/Checkout/StripeWebhookController.php` — endpoint POST `/stripe/webhook` (CSRF escluso)
- `app/Services/StripePaymentService.php` — client wrapper + idempotency
- `app/Services/OrderCreationService.php` — Carrello → Order in transaction
- `app/Services/WalletOrderPaymentService.php` — lock saldo wallet su acquisto
- `app/Models/Order.php` — `payableTotalCents()` autorità fatturazione
- `apps/web/composables/usePaymentStripe.ts` — orchestrazione client Stripe Elements
- `apps/web/utils/clientSubmissionId.ts` — generatore + reader idempotency key

## Conseguenze

- Webhook `/stripe/webhook` esposto pubblico, escluso da CSRF (`bootstrap/app.php`), HMAC obbligatorio.
- 3DS challenge gestita inline tramite Stripe Elements (no redirect): handler dedicato `handleAction()`.
- Test E2E Playwright con carta test (`4242…`) + mock 3DS challenge per CI.
- Ordini in stato `pending` durano max 30 min, poi cancellati da scheduled job.
- Wallet: `lockForUpdate()` su `users.wallet_balance_cents` durante checkout per evitare double-spend.

## Riferimenti

- `apps/web/composables/payment/usePaymentStripe.ts`
- `apps/web/utils/clientSubmissionId.ts`
- `app/Services/StripePaymentService.php`
- `tests/Feature/Checkout/StripeCheckoutTest.php`
- Stripe doc: <https://stripe.com/docs/payments/payment-intents>
