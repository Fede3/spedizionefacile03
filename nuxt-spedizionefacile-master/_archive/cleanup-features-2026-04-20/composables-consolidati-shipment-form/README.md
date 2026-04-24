# Composables consolidati — Shipment form (2026-04-20)

## Cosa è stato fatto

I 3 composables che coprivano validazione + error summary + field assist del
form spedizione sono stati consolidati in **un singolo file**
`composables/useShipmentForm.js` per ridurre il numero di file da navigare e
rendere più lineare la relazione tra le 3 parti (`useShipmentFormValidation`
importava internamente le altre due).

## File originali archiviati qui

| File originale                        | LOC  | Ruolo                                                                 |
| ------------------------------------- | ---- | --------------------------------------------------------------------- |
| `useShipmentFormValidation.js`        | 208  | `validateForm()`, focus helpers, orchestrazione                       |
| `useShipmentFormErrorSummary.js`      | 170  | `softenErrorMessage`, `FIELD_ERROR_*`, computed summary/grouping      |
| `useShipmentFormFieldAssist.js`       | 243  | `buildEmailSuggestion`, `extractAddressAndNumber`, suggerimenti field |
| **Totale**                            | **621** |                                                                   |

## File consolidato

`composables/useShipmentForm.js` (~622 LOC).

Struttura:
- SEZIONE 1 — Error Summary: `FIELD_ERROR_ORDER`, `FIELD_ERROR_LABELS`,
  `FIELD_ERROR_IDS`, `softenErrorMessage`, `useShipmentFormErrorSummary`.
- SEZIONE 2 — Field Assist: `buildEmailSuggestion`, `extractAddressAndNumber`,
  `useShipmentFormFieldAssist`.
- SEZIONE 3 — Validation: `useShipmentFormValidation` (usa SEZIONE 1 + 2
  direttamente, senza import incrociati).

## API pubblica

Identica agli originali. I 3 export principali mantengono **firma e
comportamento invariati**:

- `useShipmentFormValidation(deps)` → oggetto con `validateForm`,
  `showValidation`, `formErrorSummary`, `getFieldAssist`, ecc.
- `useShipmentFormErrorSummary({ sv, contentError })` → computed di sintesi
  errori.
- `useShipmentFormFieldAssist(deps)` → `{ getFieldAssist, applyFieldAssist }`.

Tutti gli helper/costanti (`softenErrorMessage`, `buildEmailSuggestion`,
`extractAddressAndNumber`, `FIELD_ERROR_ORDER`, `FIELD_ERROR_LABELS`,
`FIELD_ERROR_IDS`) sono esportati come prima.

## Consumatori aggiornati

Nessun consumer cambia. L'unico consumatore esplicito
(`composables/useShipmentStepValidation.js`) usa auto-import Nuxt — il nome
`useShipmentFormValidation` viene ora risolto da `useShipmentForm.js`.

## Ripristino

Se serve tornare indietro:

```bash
mv _archive/cleanup-features-2026-04-20/composables-consolidati-shipment-form/useShipmentForm*.js composables/
rm composables/useShipmentForm.js
```
