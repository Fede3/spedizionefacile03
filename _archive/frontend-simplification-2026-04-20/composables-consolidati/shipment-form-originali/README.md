# shipment-form-originali — archivio pre-fusione O6-D (2026-04-20)

Copia integrale dei 4 composable del form "step indirizzi" spedizione
**prima** della fusione in un unico file `useShipmentForm.js`.

## File archiviati

| File | LOC | Responsabilita' |
| --- | --- | --- |
| `useShipmentFormErrorSummary.js` | 171 | Ordine/label/id errori, `softenErrorMessage`, computed summary/grouping/hints |
| `useShipmentFormFieldAssist.js` | 244 | Suggerimenti auto-correzione (nome, telefono, email, split civico, coerenza location) |
| `useShipmentFormValidation.js` | 209 | `validateForm`, `fieldClass`, `fieldErrorText`, focus helpers, composizione summary + assist |
| `useShipmentLocationAutocomplete.js` | 550 | Autocomplete citta'/CAP/provincia via API, input handlers (nome/telefono/CAP/citta'/provincia), focus handlers, smart blur, coerenza indirizzo-location |

Totale originale: ~1.174 LOC su 4 file.

## Motivazione fusione (Ondata 6 / agente O6-D)

I 4 composable sono **fortemente accoppiati** e sempre usati insieme
tramite il facade `useShipmentStepValidation.js`:

- `useShipmentFormValidation` importa staticamente `softenErrorMessage`
  da `useShipmentFormErrorSummary` e internamente compone sia
  `useShipmentFormErrorSummary` sia `useShipmentFormFieldAssist`.
- `useShipmentFormFieldAssist` dipende da diversi ref/helper prodotti
  da `useShipmentLocationAutocomplete` (`applyLocationToSection`,
  `getSectionAddress`, `locationLinkHints`,
  `originCitySuggestions`/`destCitySuggestions`, ecc.).
- `useShipmentStepValidation` (facade) esiste solo per ripassare questi
  stessi ref dall'autocomplete alla validazione.

Non esistono consumer esterni oltre a `useShipmentStepValidation`:
nessuno dei 4 composable e' mai stato chiamato direttamente da pagine,
componenti o store. Tenerli in file separati costringe a 1) far
viaggiare una lista di 10+ parametri tra i moduli e 2) importare
`softenErrorMessage` in modo cross-file nonostante Nuxt avrebbe gia'
autoimportato il composable dalla stessa cartella.

Fondendoli in `useShipmentForm.js`:

- le 4 sezioni diventano vicine (stesso file, stesse closure), ma
  l'organizzazione resta leggibile grazie a separatori `// ====== ... ======`;
- si elimina un `import` statico inter-composable (`softenErrorMessage` e'
  ora nello stesso scope);
- `useShipmentStepValidation` continua a funzionare senza modifiche
  perche' tutte e 4 le funzioni sono ancora esportate con la stessa
  firma (retrocompat totale).

## Retrocompat

`useShipmentForm.js` esporta tutti i simboli originali:

- **Funzioni**
  `useShipmentFormErrorSummary`,
  `useShipmentFormFieldAssist`,
  `useShipmentFormValidation`,
  `useShipmentLocationAutocomplete`
- **Utility** `softenErrorMessage`, `buildEmailSuggestion`,
  `extractAddressAndNumber`
- **Costanti** `FIELD_ERROR_ORDER`, `FIELD_ERROR_LABELS`, `FIELD_ERROR_IDS`

Grazie all'auto-import di Nuxt (cartella `composables/`) i consumer
continuano a invocare queste funzioni come prima, senza import
espliciti. Il facade `useShipmentStepValidation.js` **non** e' stato
toccato.

## Come ripristinare (rollback)

```bash
cp _archive/frontend-simplification-2026-04-20/composables-consolidati/shipment-form-originali/*.js \
   nuxt-spedizionefacile-master/composables/
rm nuxt-spedizionefacile-master/composables/useShipmentForm.js
```

> I 4 file archiviati sono identici al working tree pre-fusione: si
> possono rimettere in `composables/` cosi' come sono.
