# Feature: Sistema Notifiche In-App

Archiviata il 2026-04-20 nell'ambito della semplificazione frontend (Ondata 5 — Agente O5).

## Contenuto archivio

- `pages/account/notifiche.vue` (746 LOC) — pagina elenco notifiche utente con filtri, mark-as-read, preferenze.

## Motivo archiviazione

Feature non-core rispetto al percorso di spedizione. Le notifiche operative
principali (tracking, email transazionali) avvengono via email/webhook BRT.
Il pannello in-app era ridondante e appesantiva la navigation account.

## Stato backend

Le API backend collegate NON sono state rimosse (sono ancora utilizzabili).
Le rotte interessate (controllare `laravel-spedizionefacile-main/routes/api.php`):

- `/api/notifications` — lista
- `/api/notifications/{id}/read` — mark as read
- eventuali preferenze notifiche

## Come riattivare la feature

1. Ripristina `pages/account/notifiche.vue` dal file archiviato:
   ```bash
   cp _archive/frontend-simplification-2026-04-20/features/notifiche-in-app/pages/account/notifiche.vue \
      nuxt-spedizionefacile-master/pages/account/notifiche.vue
   ```

2. Ripristina le voci di menu in `utils/accountNavigationGroups.ts`:
   - In `clientNavGroups`:
     `{ label: 'Notifiche', to: '/account/notifiche', iconKey: 'bell' }`
   - In `proNavGroups` (primo gruppo):
     `{ label: 'Notifiche', to: '/account/notifiche', iconKey: 'bell' }`

3. Ripristina link in `components/account/AccountProfiloView.vue` (se desiderato).

4. Verifica che le API backend siano ancora live (endpoint `/api/notifications*`).

5. Esegui `npm run build` e smoke test sul percorso `/account/notifiche`.

## File modificati per la rimozione

- `nuxt-spedizionefacile-master/utils/accountNavigationGroups.ts`
- `nuxt-spedizionefacile-master/components/account/AccountProfiloView.vue`
- `nuxt-spedizionefacile-master/pages/account/notifiche.vue` (rimosso)
