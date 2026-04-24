# PayPal Branch — Istruzioni di Riattivazione

**Archiviato**: 2026-04-20 (Ondata 1 O1-A5 frontend simplification)
**Motivo**: PayPal non è mai stato implementato. Il codice live prevede solo
carta+3DS, bonifico, wallet. Il `TODO_PAYPAL.md` era un documento di piano
per integrazione futura (mai partita) che rumoreggiava nella root del progetto.

## Stato al momento dell'archiviazione

**Codice frontend PayPal funzionale**: **ZERO**.
- `components/checkout/PaymentMethods.vue`: nessun riferimento
- `composables/usePayment.js`: solo un **commento** storico menzionante "PayPal (piano F-Pay-3)"
  in header
- `composables/useEcommerceAnalytics.ts`: un **commento** nel JSDoc elenca
  'paypal' fra le opzioni di tracking possibili
- `composables/useFaqs.ts`: un'**FAQ** spiega "Non gestiamo PayPal per ora"
- `paymentMethodOptions` in `usePayment.js` ha solo `carta | bonifico | wallet`

Nessun branch `paymentMethod === 'paypal'` attivo, nessun file `usePaypal.ts`,
nessuna UI card. Non c'è nulla da rimuovere dal runtime.

## File archiviati

- `TODO_PAYPAL.md` — piano completo per integrazione (backend srmklive/paypal, frontend SDK PayPal, UI card)

## Modifiche al codice frontend

Le menzioni "PayPal" nei commenti/FAQ sono **mantenute** nel codice live perché:
1. Sono commenti/testi utente che non influenzano build o runtime
2. Rimuoverle richiederebbe riscrivere una FAQ utente ("Non gestiamo PayPal per ora")
   e pulire un JSDoc che elenca valid values storici
3. Non c'è zero rischio di confusione UI per l'utente: non vede nessuna opzione PayPal

L'unico "rumore" rimosso è **`TODO_PAYPAL.md`** dalla root del repo.

## Come riattivare (seguire piano originale)

Il file archiviato `TODO_PAYPAL.md` contiene il piano completo in 5 sezioni:
1. Account Business PayPal (sandbox + live)
2. Backend Laravel (srmklive/paypal + controller + webhook)
3. Frontend Nuxt (composable `usePaypal.ts` + SDK loader)
4. UI (entry in `paymentMethodOptions` + panel in `PaymentMethods.vue` + branch in processo pagamento)
5. Test (sandbox accounts + edge cases)

Stima totale: 4-6 ore.

Vedere `TODO_PAYPAL.md` per i riferimenti:
- PayPal Server SDK: https://developer.paypal.com/docs/api/orders/v2/
- srmklive/paypal wrapper Laravel: https://github.com/srmklive/laravel-paypal
