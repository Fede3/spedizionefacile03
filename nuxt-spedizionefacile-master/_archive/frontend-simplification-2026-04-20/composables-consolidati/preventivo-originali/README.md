# Preventivo composables — originali pre-consolidamento (Ondata 6, 2026-04-20)

Questa cartella conserva i 6 file originali che sono stati fusi nel singolo
file `nuxt-spedizionefacile-master/composables/usePreventivo.js` durante la
semplificazione frontend del 20 aprile 2026.

## File archiviati

| File                              | LOC | Ruolo                                               |
| --------------------------------- | --- | --------------------------------------------------- |
| `usePreventivo.ts`                | 358 | Orchestratore / facade principale (TypeScript)      |
| `usePreventivoCalc.js`            | 303 | Calcolo tariffa, richieste backend, sync session    |
| `usePreventivoForm.js`            | 323 | Form handlers, country switch, reset, flush bozze   |
| `usePreventivoQuoteSnapshot.js`   |  67 | Snapshot + firma payload preventivo                 |
| `usePreventivoResults.js`         | 287 | Computed display + navigazione step + watcher       |
| `usePriceBands.js`                | 228 | Caricamento fasce prezzo + helper di calcolo        |
| **TOTALE**                        | **~1566** |                                                |

I file `usePriceBandsDefaults.js` (~430 LOC di costanti tariffarie e
funzioni pure di normalizzazione) e `usePriceBandsCalc.js` (~215 LOC di
logica pura di calcolo prezzo/CAP/Europa) sono **rimasti separati** perché
contengono solo dati statici o funzioni pure senza reattività: tenerli fuori
migliora la leggibilità del file consolidato e la separazione di responsabilità.

## Perché consolidare

I 6 file erano stati separati come sub-composable di supporto a
`usePreventivo()`. In pratica il "facade" era l'unico chiamante di 4 su
6 (Calc, Form, Results erano usati solo da usePreventivo; Snapshot era
usato anche da `useQuickQuoteLocations` per `formatResolvedLocation`;
PriceBands invece è auto-importato in tutto il frontend). Il consolidamento:

- elimina il giro di passaggi di `deps` tra file adiacenti;
- mette insieme logica che si legge e si modifica sempre in sequenza
  (snapshot → calc → results → form);
- riduce la superficie di auto-import Nuxt da 6 nomi a 1;
- mantiene `usePriceBands` come named export, quindi chiamanti esterni
  (cart, shipment step, admin, header) continuano a funzionare identici.

Inoltre il file è stato convertito da TypeScript (`usePreventivo.ts`) a
JavaScript (`usePreventivo.js`) per allinearsi agli altri composable
della cartella — il typing era puramente superficiale (poche annotation
su `_timerBox` e sui parametri di `publicApiFetchForLocation`).

## Backward compatibility preservata

Il nuovo file `composables/usePreventivo.js` esporta come named export:

- `usePreventivo()` — orchestratore principale (consumato da `Preventivo.vue`)
- `usePriceBands()` — caricamento fasce prezzo (consumato ovunque)
- `usePreventivoCalc(deps)` — sub-composable calcolo
- `usePreventivoForm(deps)` — sub-composable form
- `usePreventivoQuoteSnapshot(store)` — sub-composable snapshot
- `usePreventivoResults(deps)` — sub-composable results
- `formatResolvedLocation(city, cap)` — helper puro
- `buildQuoteComparableSignature(payload)` — helper puro
- `cloneShipmentDetailsForQuote(details)` — helper puro
- `clonePackageForQuote(pack)` — helper puro
- `clonePackagesForQuote(packages)` — helper puro
- `extractSessionComparablePayload(sessionData)` — helper puro

L'unico consumatore esplicito esterno era `useQuickQuoteLocations.js`
che importava `formatResolvedLocation` da `./usePreventivoQuoteSnapshot`;
l'import è stato aggiornato a `./usePreventivo`.

## Come splittare di nuovo (se serve)

Se in futuro il file cresce troppo o vuoi separare la logica:

1. Copia la sezione desiderata (es. tutto quello sotto
   `// ====== CALCOLO PREZZO ======`) in un nuovo file
   `composables/usePreventivoCalc.js` (o altro nome).
2. Nel nuovo file esporta il sub-composable: `export const usePreventivoCalc = (deps) => { ... }`.
3. Nel file `usePreventivo.js` consolidato, rimuovi la sezione spostata
   (il `import` Nuxt auto-risolve il nuovo file dalla cartella `composables/`).
4. Aggiorna eventualmente `useQuickQuoteLocations.js` se hai spostato
   `formatResolvedLocation` — in tal caso deve puntare al file nuovo.

## Verifiche eseguite al momento del consolidamento

- `node --check composables/usePreventivo.js` → OK
- `npm run build` → verde (vedi report agent O6-A)
- `curl -s -o /dev/null -w "HOME:%{http_code}\n" http://127.0.0.1:8787/` → 200 (su server esistente)

## Agent

- Agent ID: **O6-A** (Ondata 6 — consolidamento composable preventivo)
- Data: 2026-04-20
