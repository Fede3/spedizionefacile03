# composables-consolidati-admin

**Data**: 2026-04-20
**Azione**: Consolidamento composables admin in un unico file.

## File archiviati

I seguenti file originali sono stati consolidati in
`nuxt-spedizionefacile-master/composables/useAdminPages.js`:

- `useAdminOrdini.js` (228 LOC) — logica pagina `/account/amministrazione/ordini`
- `useAdminSpedizioni.js` (168 LOC) — logica pagina `/account/amministrazione/spedizioni`
- `useAdminUtenti.js` (154 LOC) — logica pagina `/account/amministrazione/utenti`

Totale: 550 LOC confluite in `useAdminPages.js` (~560 LOC con header e separatori).

## Cosa NON è stato consolidato (intenzionalmente)

Restano file separati nella repo:

- `composables/useAdmin.js` — utility admin condivise (`formatCents`, `statusConfig`, toast). Usato da tutti i composables admin.
- `composables/useAdminPrezzi.js` — facade della pagina prezzi che compone i 4 sub-composables qui sotto.
- `composables/useAdminPrezziForm.js` — form prezzi (sub).
- `composables/useAdminPrezziImport.js` — import CSV prezzi (sub).
- `composables/useAdminPrezziList.js` — lista prezzi (sub).
- `composables/useAdminPrezziState.js` — state prezzi (sub).

Il pattern facade + sub di `useAdminPrezzi` funziona già come target del
consolidamento, quindi lasciato intatto.

## Risultato

Composables admin: 9 file → 6 file (-3).

## Consumatori aggiornati

Nessun aggiornamento di import necessario: i tre composables erano usati tramite
auto-import Nuxt. Gli export `useAdminOrdini`, `useAdminSpedizioni`,
`useAdminUtenti` mantengono lo stesso nome nel nuovo file, quindi auto-import
risolve correttamente.

File consumatori (nessuna modifica applicata):

- `pages/account/amministrazione/ordini.vue` — usa `useAdmin()` direttamente
  (commento in codice cita `useAdminOrdini` ma non lo invoca);
  `useAdminOrdini` resta esportato per retrocompatibilità.
- `pages/account/amministrazione/spedizioni.vue` — chiama `useAdminSpedizioni()`.
- `pages/account/amministrazione/utenti.vue` — chiama `useAdminUtenti()`.

## Ripristino

Per ripristinare (rollback):

```bash
mv useAdminOrdini.js     ../../../nuxt-spedizionefacile-master/composables/
mv useAdminSpedizioni.js ../../../nuxt-spedizionefacile-master/composables/
mv useAdminUtenti.js     ../../../nuxt-spedizionefacile-master/composables/
rm ../../../nuxt-spedizionefacile-master/composables/useAdminPages.js
```
