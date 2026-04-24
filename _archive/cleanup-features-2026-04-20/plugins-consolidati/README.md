# Plugin Nuxt consolidati — 2026-04-20

## Contesto

Cleanup di riduzione file: da 6 plugin a 3 nella cartella
`nuxt-spedizionefacile-master/plugins/`. I 4 plugin in questo archivio sono
stati uniti in un unico file `10.bootstrap.client.ts`.

## File archiviati

| File originale | LOC | Enforce | Descrizione |
|---|---|---|---|
| `00.sanctum-dynamic-url.client.ts` | 53 | `pre` | Riscrive `sanctum.baseUrl` e `apiBase` all'origine corrente del browser per far funzionare il tunnel Cloudflare (evita cookie cross-origin e 127.0.0.1 irraggiungibile da remoto). |
| `01.sanctum-bootstrap.client.ts` | 40 | default | Bootstrap auth iniziale: su pagine `/account` forza `runAuthBootstrap({ force: true })` per riallineare lo stato utente con la sessione. Espone `$authReady`. |
| `01.shipment-flow-store-hydrate.client.ts` | 7 | default | Hook `app:mounted`: chiama `shipmentFlowStore.hydrateFromSession()` per ripristinare il flusso spedizione da sessione. |
| `02.hydrated-class.client.ts` | 17 | `pre` | Aggiunge classe `.is-hydrated` a `<html>` per sbloccare transizioni CSS dopo il primo paint. |

Totale: **117 LOC** distribuite su 4 file.

## File nuovo di destinazione

- `nuxt-spedizionefacile-master/plugins/10.bootstrap.client.ts` (~135 LOC)
  - Un unico `defineNuxtPlugin` con `enforce: 'pre'` e `async setup()`.
  - Esegue le 4 logiche nello stesso ordine critico:
    1. `.is-hydrated` su `<html>` (subito, blocca transitions CSS).
    2. Fix `sanctum.baseUrl` + `apiBase` (PRE-sanctum init).
    3. `runAuthBootstrap` se pagina `/account` (o `/carrello`/`/checkout` con snapshot valido).
    4. Hook `app:mounted` con `shipmentFlowStore.hydrateFromSession()`.

## Perche' funziona il merge

Nuxt rispetta l'ordine di esecuzione interno di un plugin: `setup()` gira
riga-per-riga in modo sequenziale. Chiamare 4 blocchi uno dopo l'altro e'
equivalente a 4 plugin separati con `enforce: 'pre'`, con il vantaggio di:
- Meno file da registrare al boot.
- Meno overhead di microtasks fra plugin.
- Nessun cambio di comportamento osservabile.

## Cosa NON e' stato toccato

- `00.auth-ui-seed.ts` (universal, gira anche in SSR — non mergeabile con i client-only).
- `plausible.client.ts` → rinominato `20.plausible.client.ts` per chiarire
  l'ordine (analytics dopo bootstrap, nessun cambio di codice).

## Rollback

Se emergono bug:
1. Spostare indietro i 4 file in `nuxt-spedizionefacile-master/plugins/`.
2. Eliminare `plugins/10.bootstrap.client.ts`.
3. Rinominare `20.plausible.client.ts` → `plausible.client.ts` (opzionale).
4. `rm -rf .nuxt && npx nuxi prepare`.
