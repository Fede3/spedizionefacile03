# PUDO composables — originali pre-consolidamento

Data archiviazione: 2026-04-20
Agente: O6-C (Ondata 6 refactor SpediamoFacile)

## Cosa c'era qui

Tre composables Vue/Nuxt che gestivano separatamente l'integrazione PUDO BRT:

| File | LOC | Responsabilita |
|------|-----|----------------|
| `usePudoSearchApi.js` | 594 | Fetch BRT backend, geocoding (Nominatim), normalizzazione PUDO, distanza Haversine, reference point management, gestione errori. |
| `usePudoSearch.js` | 262 | Dispatcher con doppia interfaccia: `(props, emit)` per il selector funnel legacy, `()` per la pagina pubblica `/pudo` (query debounce, filtri locali). |
| `usePudoMap.js` | 122 | Helper mappa Leaflet: selezione/deselezione PUDO, toggle dettagli on-demand, orari di oggi, stato aperto/chiuso, formattazione distanza. |

Totale: ~978 LOC divise in 3 file.

## Perche sono stati consolidati

- Forte accoppiamento circolare: `usePudoSearch` importava sia `usePudoSearchApi` sia `usePudoMap` per costruire entrambe le API (legacy + pagina).
- I 3 file erano sempre co-editati insieme nei changeset (git log conferma).
- Nessuno dei 3 era realmente riutilizzabile stand-alone al di fuori del dominio PUDO: `usePudoMap` dipende da shape specifici forniti da `usePudoSearchApi`, e `usePudoSearch` e un dispatcher che li compone entrambi.

## Dove sono andati

Fusi in `nuxt-spedizionefacile-master/composables/usePudo.js` (920 LOC) con 3 named export:

```js
export function usePudoSearchApi(props, emit) { /* API (fetch PUDO from BRT backend) */ }
export function usePudoMap(deps, emit) { /* MAP (Leaflet map state) */ }
export function usePudoSearch(props, emit) { /* SEARCH (filtering + sorting + debouncing) */ }
```

Le firme pubbliche, i tipi di ritorno e i comportamenti sono identici agli originali. I consumer (`pages/pudo.vue`, `components/PudoSelector.vue`) continuano a funzionare senza modifiche semantiche — e stato aggiornato solo il path di import esplicito in `pages/pudo.vue` da `~/composables/usePudoSearch` a `~/composables/usePudo`.

## Come ripristinare (se serve)

```bash
# Dalla root del repo
mv _archive/frontend-simplification-2026-04-20/composables-consolidati/pudo-originali/*.js \
   nuxt-spedizionefacile-master/composables/
rm nuxt-spedizionefacile-master/composables/usePudo.js
# poi ripristinare in pages/pudo.vue:
#   import { usePudoSearch } from '~/composables/usePudoSearch'
```
