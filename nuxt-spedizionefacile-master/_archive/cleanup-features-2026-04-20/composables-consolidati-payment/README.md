# Composable pagamento archiviati — 2026-04-20

## Cosa c'è qui
Tre file che formavano un sistema di pagamento **parallelo e non più utilizzato**:

- `useCheckout.js` (240 LOC) — facade che ricomponeva i 3 sotto-composable
- `usePaymentFlow.js` (642 LOC) — Stripe + card element + processing
- `useCheckoutValidation.js` (110 LOC) — termsAccepted + canPay + validazione billing

**Totale archiviato**: 992 LOC.

## Perché archiviati

Il progetto aveva due implementazioni parallele di pagamento:

| Sistema | File | Stato al 20/04/2026 |
|---------|------|---------------------|
| **A (vivo)** | `composables/usePayment.js` (528 LOC) | Usato da `pages/la-tua-spedizione/[step].vue` riga 206 |
| **B (morto)** | Questi 3 file | Orfani — il facade `useCheckout()` non era chiamato da nessun `.vue` |

Grep del 2026-04-20 sulle vue/js/ts attive:
```
useCheckout\(\)  → 0 chiamate
usePaymentFlow   → solo da useCheckout.js (anch'esso orfano)
useCheckoutValidation → solo da useCheckout.js (orfano)
```

Entrambi i sistemi duplicavano la logica Stripe/3DS/wallet/bonifico con piccole
differenze (la mappa errori Stripe era inline in `usePaymentFlow.js` nonostante
esistesse già `translateStripeError` in `utils/checkout.ts`). `usePayment.js`
è quello corretto e in uso.

## Bug nei file archiviati

`usePaymentFlow.js` aveva un bug latente al `catch` della `processPayment`:
```js
} catch {
    paymentError.value = err?.response?._data?.error || ...
```
`err` non era bindato (`catch` senza parametro) quindi avrebbe buttato `ReferenceError`
invece del messaggio utente. Bug mai manifestato perché il code path è morto.

## Riattivazione

Se mai si tornasse al pattern facade + sub-composable (sconsigliato):

1. Spostare i 3 file da qui a `composables/`.
2. Aggiornare i consumer a `const checkout = useCheckout()` (oggi nessuno).
3. Fixare il bug `catch` → `catch (err)`.
4. Dedup la mappa errori inline usando `translateStripeError` da `utils/checkout.ts`.

Oggi non serve: `usePayment.js` copre tutto.

## File correlati ancora vivi

- `composables/usePayment.js` — pagamento canonico
- `composables/useCart.js` — include `useCartOperations` come alias retro-compat (innocuo)
- `utils/checkout.ts` — `translateStripeError`, `buildCheckoutSuccessQuery`, costanti
- `utils/shipment.ts` — `createClientSubmissionId`, `ensureClientSubmissionId`, `readClientSubmissionId`
