# Riattivazione Apple Pay / Google Pay (Payment Request Button)

Archiviato il 2026-04-20 per semplificazione codice.

## Per riattivare

1. Sposta `usePaymentRequestButton.ts` da questa cartella a `nuxt-spedizionefacile-master/composables/`
2. In `composables/usePaymentFlow.ts`:
   - Aggiungi `import { usePaymentRequestButton } from '~/composables/usePaymentRequestButton'`
   - Sostituisci il blocco di ref inerti con `const { canMakePayment, isAppleAvailable, isGoogleAvailable, paymentRequestContainer, paymentRequestError, mountPaymentRequestButton } = usePaymentRequestButton({ stripe, finalTotal, billingPayload, ... })`
   - Reintegra `processWalletExpressPayment` (copia la versione salvata qui sotto)
3. In `components/checkout/PaymentMethods.vue`: verificare che il bottone mostri di nuovo (richiede device Apple/Chrome con wallet configurato)
4. Test su iPhone Safari + Android Chrome

## File originali salvati

- `usePaymentRequestButton.ts` (composable Apple/Google Pay)
