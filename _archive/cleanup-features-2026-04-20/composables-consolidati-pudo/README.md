# Composables PUDO consolidati — archivio 2026-04-20

## Cosa contiene

I 3 file originali che gestivano i PUDO nel frontend Nuxt, prima del
consolidamento in un unico `composables/usePudo.js`:

- `usePudoMap.js` (122 LOC) — helper mappa Leaflet: selezione PUDO, dettagli
  on-demand, orari del giorno corrente, stato aperto/chiuso, formattazione
  distanza. Esportava `usePudoMap(deps, emit)`.
- `usePudoSearch.js` (262 LOC) — orchestrator con DOPPIA interfaccia:
  `usePudoSearch(props, emit)` (legacy per `<PudoSelector />`) e
  `usePudoSearch()` (pagina `/pudo`). Componeva gli altri due composables.
- `usePudoSearchApi.js` (526 LOC) — fetch API BRT (`/api/brt/pudo/*`),
  geocoding Nominatim, normalizzazione PUDO, calcolo distanza Haversine,
  gestione reference point (fields | geo | manual | results).

Totale archiviato: **910 LOC in 3 file**.

## Perche' il consolidamento

- I 3 file erano strettamente accoppiati: `usePudoSearch` importava entrambi
  gli altri; `usePudoSearchApi` e `usePudoMap` non erano mai usati direttamente
  dai consumatori (solo internamente da `usePudoSearch`).
- Consumatori del dominio PUDO in totale: **2** (`pages/pudo.vue` e
  `components/PudoSelector.vue`). Tenere la logica sparsa su 3 file senza
  benefici di riuso peggiorava la navigabilita'.
- `pages/pudo.vue` gia' importava da `~/composables/usePudo` (path che NON
  esisteva prima del consolidamento) — il file nuovo chiude questo bug latente.

## Nuovo file

`nuxt-spedizionefacile-master/composables/usePudo.js` (~900 LOC) organizzato
in 3 sezioni con commenti di sezione:

1. **SEZIONE 1** — API fetch, geocoding, normalizzazione, distanze (ex
   `usePudoSearchApi.js`). Export: `usePudoSearchApi(props, emit)`.
2. **SEZIONE 2** — Helper mappa: selezione, dettagli, orari (ex
   `usePudoMap.js`). Export: `usePudoMap(deps, emit)`.
3. **SEZIONE 3** — Orchestrator pubblico a doppia interfaccia (ex
   `usePudoSearch.js`). Export: `usePudoSearch(props?, emit?)`.

L'API pubblica dei 3 composables e' mantenuta **identica** (stessi nomi di
campi nel `return`, stessi parametri). Nessun consumatore richiede modifiche.

## Consumatori (verificati al 2026-04-20)

- `pages/pudo.vue:9` → `import { usePudoSearch } from '~/composables/usePudo'`
  (API pagina)
- `components/PudoSelector.vue:23` → `usePudoSearch(props, emit)` (API legacy
  funnel; import auto da `~/composables/` via Nuxt)

`usePudoSearchApi` e `usePudoMap` non sono usati direttamente da nessun
componente/pagina (ma restano esportati per retrocompat/test).

## Come riattivare i file originali (improbabile, ma documentato)

1. Spostare i 3 file da qui a `nuxt-spedizionefacile-master/composables/`.
2. Cancellare (o rinominare) `nuxt-spedizionefacile-master/composables/usePudo.js`.
3. In `pages/pudo.vue` cambiare l'import:
   ```js
   import { usePudoSearch } from '~/composables/usePudoSearch'
   ```
4. Eseguire `npm run dev` e verificare che `/pudo` e il funnel
   `/la-tua-spedizione/2?step=ritiro` carichino senza errori `import`.

## Regola

Questi file **non vanno ripristinati senza motivo**. Il consolidamento
riduce 3 file a 1 mantenendo la stessa API pubblica e chiude un bug di
import path latente sulla pagina `/pudo`.
