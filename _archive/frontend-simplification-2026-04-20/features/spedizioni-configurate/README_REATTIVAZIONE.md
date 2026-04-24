# Spedizioni Configurate (template salvati) — Istruzioni di Riattivazione

**Archiviato**: 2026-04-20 (Ondata 1 O1-A5 frontend simplification)
**Motivo**: feature poco utilizzata in produzione, il flusso principale
(preventivo → checkout) copre il 95% dei casi. La UI era una tabella complessa
con filtri, selezione multipla, edit modal — eccessivo per template riutilizzati.

## Cosa faceva

Permetteva all'utente autenticato di:
- salvare la configurazione corrente (mittente/destinatario/collo/servizio) come "modello"
- riaprire `/account/spedizioni-configurate` per vedere lista template
- filtrare per provenienza/riferimento/data
- modificare, eliminare, aggiungere selezione multipla al carrello

Backend: endpoints `/api/saved-shipments` (GET, POST, PUT, DELETE) +
`/api/saved-shipments/add-to-cart`.

## File archiviati

- `pages/account/spedizioni-configurate.vue` (451 LOC) — UI tabella + filtri
- `composables/useSavedShipments.ts` (333 LOC) — stato e logica
- `components/spedizioni/SpedizioniConfigurateDesktopRow.vue`
- `components/spedizioni/SpedizioniConfigurateEditModal.vue`
- `components/spedizioni/SpedizioniConfigurateMobileCard.vue`

## Call site modificati (snippet storici in `call-sites-removed.patch.md`)

- `pages/la-tua-spedizione/[step].vue` — rimosso handler `handleSaveConfiguredFromVentaglio`
  che chiamava `POST /api/saved-shipments` e poi `navigateTo('/account/spedizioni-configurate')`
- `composables/useOrdersList.ts` — rimosso `savedShipmentsList`, `loadSavedShipments`,
  `isAlreadySaved`, `saveToConfigured` (che usavano `/api/saved-shipments`)
- `utils/accountNavigationGroups.ts` — rimosse entries "Modelli" / "Modelli spedizione"
  da adminNavGroups, clientNavGroups, proNavGroups
- `utils/accountNavigation.ts` — rimossa entry "Configurate" dalla sezione Spedizioni
- `pages/account/spedizioni/index.vue` — rimosso CTA "Vedi modelli salvati" in empty state
- `types/index.ts` — rimosso riferimento a `/api/saved-shipments` nel JSDoc di `SavedShipment` (il tipo resta)
- `tests/e2e/account.spec.ts` — rimossi test T6.7 per `/account/spedizioni-configurate`

## Come riattivare

1. **Ripristinare i file**:
   ```bash
   cp _archive/frontend-simplification-2026-04-20/features/spedizioni-configurate/pages/account/spedizioni-configurate.vue \
      nuxt-spedizionefacile-master/pages/account/spedizioni-configurate.vue
   cp _archive/frontend-simplification-2026-04-20/features/spedizioni-configurate/composables/useSavedShipments.ts \
      nuxt-spedizionefacile-master/composables/useSavedShipments.ts
   cp -r _archive/frontend-simplification-2026-04-20/features/spedizioni-configurate/components/spedizioni/* \
      nuxt-spedizionefacile-master/components/spedizioni/
   ```

2. **Ripristinare le navigation entries** (vedi README Bonus per pattern):
   - `utils/accountNavigationGroups.ts`: entry `Modelli spedizione`/`Modelli` nei 3 gruppi
   - `utils/accountNavigation.ts`: entry `Configurate` in sezione Spedizioni
   - `pages/account/spedizioni/index.vue`: CTA `Vedi modelli salvati` in empty state

3. **Ripristinare call sites frontend** (vedi `call-sites-removed.patch.md`):
   - `useOrdersList.ts` — ripristinare i metodi per "Salva come configurata" dal dettaglio ordine
   - `pages/la-tua-spedizione/[step].vue` — ripristinare `handleSaveConfiguredFromVentaglio`

4. **Verificare backend**: il controller `SavedShipmentController` e la tabella `saved_shipments`
   restano lato Laravel. Se sono stati archiviati anche quelli, ripristinarli dallo stesso archive.

## Note sul tipo `SavedShipment`

Il tipo TS in `types/index.ts` è stato lasciato perché potrebbe essere referenziato
altrove anche in futuro. Nessun impatto se non usato.
