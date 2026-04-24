# Feature: Sistema Reclami Dedicato

Archiviata il 2026-04-20 nell'ambito della semplificazione frontend (Ondata 5 — Agente O5).

## Contenuto archivio

- `pages/reclami.vue` (383 LOC) — form pubblico apertura reclamo
- `pages/account/reclami.vue` (260 LOC) — elenco reclami utente
- `pages/account/amministrazione/reclami.vue` (407 LOC) — pannello admin reclami

Totale: **1050 LOC** rimosse dal frontend attivo.

## Motivo archiviazione

Il flusso reclami dedicato duplicava la funzione di Assistenza
(`/account/assistenza` e pagina `/contatti`). I reclami ora vanno
gestiti via canale assistenza/email standard, con riferimenti alle
policy legali in `termini-e-condizioni.vue` (supportEmail).

## Stato backend

Le API backend collegate NON sono state rimosse.
Le rotte interessate (controllare `laravel-spedizionefacile-main/routes/api.php`):

- `/api/complaints` (o `/api/reclami`) — CRUD reclami
- endpoint admin per gestione stato reclamo

## Come riattivare la feature

1. Ripristina i 3 file dal backup:
   ```bash
   cp _archive/frontend-simplification-2026-04-20/features/reclami-dedicato/pages/reclami.vue \
      nuxt-spedizionefacile-master/pages/reclami.vue

   cp _archive/frontend-simplification-2026-04-20/features/reclami-dedicato/pages/account/reclami.vue \
      nuxt-spedizionefacile-master/pages/account/reclami.vue

   cp _archive/frontend-simplification-2026-04-20/features/reclami-dedicato/pages/account/amministrazione/reclami.vue \
      nuxt-spedizionefacile-master/pages/account/amministrazione/reclami.vue
   ```

2. Ripristina le voci di menu in `utils/accountNavigationGroups.ts`:
   - In `adminNavGroups` gruppo `clienti`:
     `{ label: 'Reclami', to: '/account/amministrazione/reclami', iconKey: 'email' }`
   - In `clientNavGroups`:
     `{ label: 'Reclami', to: '/account/reclami', iconKey: 'headset' }`
   - In `proNavGroups` (primo gruppo):
     `{ label: 'Reclami', to: '/account/reclami', iconKey: 'headset' }`

3. Ripristina link pubblici:
   - `components/layout/SiteFooter.vue` voce `{ label: 'Reclami', to: '/reclami' }`
   - `pages/termini-e-condizioni.vue` link a `/reclami`
   - `pages/account/ordini/[id].vue` CTA "Apri reclamo"
   - `pages/account/spedizioni/[id].vue` CTA "Apri reclamo"
   - `components/tracking/TrackingActionsBar.vue` link a `/reclami`
   - `components/shipment/ServiceConfigPanel.vue` link a `/reclami`

4. Ripristina rotte nel `nuxt.config.ts` (`routeRules` e `prerender`):
   - `'/reclami': staticPublicRouteRule`
   - prerender: `'/reclami'`

5. Ripristina sitemap in `server/routes/sitemap.xml.ts` (entry `/reclami`).

6. Verifica le API backend siano ancora live.

7. `npm run build` + test E2E `tests/e2e/navigation.spec.ts` (T8.4.7 Reclami).

## File modificati per la rimozione

- `nuxt-spedizionefacile-master/utils/accountNavigationGroups.ts`
- `nuxt-spedizionefacile-master/components/layout/SiteFooter.vue`
- `nuxt-spedizionefacile-master/components/tracking/TrackingActionsBar.vue`
- `nuxt-spedizionefacile-master/components/shipment/ServiceConfigPanel.vue`
- `nuxt-spedizionefacile-master/pages/termini-e-condizioni.vue`
- `nuxt-spedizionefacile-master/pages/account/ordini/[id].vue`
- `nuxt-spedizionefacile-master/pages/account/spedizioni/[id].vue`
- `nuxt-spedizionefacile-master/nuxt.config.ts`
- `nuxt-spedizionefacile-master/server/routes/sitemap.xml.ts`
- I 3 file `.vue` dei reclami (rimossi)
