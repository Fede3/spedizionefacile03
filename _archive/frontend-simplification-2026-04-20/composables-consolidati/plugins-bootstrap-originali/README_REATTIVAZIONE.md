# Plugin bootstrap originali — archivio 2026-04-20

Questa cartella contiene i **4 plugin di bootstrap originali** sostituiti dal
plugin consolidato `plugins/00.bootstrap.client.ts` (ondata 2 refactor O2a).

## File archiviati

| File originale | Scopo |
|---|---|
| `00.auth-ui-seed.ts` | Seed dello snapshot UI auth (cookie + localStorage) lato render universale |
| `00.sanctum-dynamic-url.client.ts` | Allineamento dinamico di `sanctum.baseUrl` e `apiBase` all'origine del browser (client) |
| `01.sanctum-bootstrap.client.ts` | Bootstrap immediato sessione Sanctum su pagine `/account/**` o quando snapshot auth presente |
| `01.shipment-flow-store-hydrate.client.ts` | Idratazione del Pinia store `shipmentFlowStore` da `sessionStorage` a `app:mounted` |

## Come ripristinare (rollback)

Se il plugin consolidato dovesse introdurre regressioni:

1. Elimina `nuxt-spedizionefacile-master/plugins/00.bootstrap.client.ts`.
2. Copia questi 4 file in `nuxt-spedizionefacile-master/plugins/`:
   ```bash
   cp 00.auth-ui-seed.ts                     ../../../nuxt-spedizionefacile-master/plugins/
   cp 00.sanctum-dynamic-url.client.ts       ../../../nuxt-spedizionefacile-master/plugins/
   cp 01.sanctum-bootstrap.client.ts         ../../../nuxt-spedizionefacile-master/plugins/
   cp 01.shipment-flow-store-hydrate.client.ts ../../../nuxt-spedizionefacile-master/plugins/
   ```
3. Esegui `npm run build` per verificare.
4. Riavvia il dev server (porta 8787).

## Ordine di esecuzione originale

I prefissi `00.` / `01.` imponevano l'ordine alfabetico caricato da Nuxt:

1. `00.auth-ui-seed.ts` — universale (server + client)
2. `00.sanctum-dynamic-url.client.ts` — **solo client**, con `enforce: 'pre'` per girare prima del modulo `nuxt-auth-sanctum`
3. `01.sanctum-bootstrap.client.ts` — solo client, async, dipende da snapshot auth seminato da (1)
4. `01.shipment-flow-store-hydrate.client.ts` — solo client, si aggancia all'hook `app:mounted`

Il plugin consolidato rispetta lo stesso ordine interno:

1. Dynamic URL Sanctum (solo client, non-dev-nuxt)
2. Seed auth UI (universale)
3. Bootstrap Sanctum (solo client, async)
4. Hydrate shipment flow store (via hook `app:mounted`)

## Motivazione dell'unificazione

- **Riduzione boilerplate**: 4 file → 1 file, meno filesystem I/O al boot.
- **Leggibilità**: l'intero ciclo di bootstrap è visibile in un solo posto, con commenti in italiano.
- **Ordine esplicito**: niente più dipendenza dal naming `00./01.`; l'ordine è codificato dalle chiamate in sequenza nel `setup`.
- **Preservazione semantica**: l'`enforce: 'pre'` di sanctum-dynamic-url è mantenuto sul plugin consolidato tramite option bag di `defineNuxtPlugin`.

## Note tecniche

- `00.auth-ui-seed.ts` è **universale**: originariamente girava anche in SSR. Nel consolidato, il blocco specifico-client è protetto da `import.meta.client`.
- `00.sanctum-dynamic-url.client.ts` è **solo client** e l'`enforce: 'pre'` è critico: garantisce che `useRuntimeConfig().public.sanctum.baseUrl` sia riscritto prima che il modulo `nuxt-auth-sanctum` crei il client $fetch.
- Il plugin consolidato usa il filename `.client.ts` + `enforce: 'pre'`: in ambiente SSR i blocchi client-only vengono eseguiti solo in browser, ma il seed auth UI continua a funzionare perché la parte universale non ha guardie client.
