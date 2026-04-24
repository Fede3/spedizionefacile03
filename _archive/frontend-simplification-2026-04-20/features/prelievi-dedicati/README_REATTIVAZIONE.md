# Feature: Prelievi Wallet Pagine Dedicate

Archiviata il 2026-04-20 nell'ambito della semplificazione frontend (Ondata 5 — Agente O5).

## Contenuto archivio

- `pages/account/prelievi.vue` (444 LOC) — pagina prelievi lato Partner Pro
- `pages/account/amministrazione/prelievi.vue` (398 LOC) — pannello admin gestione richieste prelievo
- `components/account/AccountPrelieviBalance.vue` (139 LOC) — card saldo commissioni
- `components/account/AccountPrelieviHistory.vue` (106 LOC) — storico richieste

Totale: **1087 LOC** rimosse dal frontend attivo.

## Motivo archiviazione

La feature Prelievi era un flusso dedicato separato dal portafoglio.
Il saldo commissioni è già visibile in `/account/portafoglio` tramite
`AccountWalletBalanceCards.vue`. Le richieste di prelievo effettive
verranno gestite via canale admin/email fino a re-design dedicato.

Il composable `useWalletTopUp` (ricariche) RIMANE attivo e non fa parte
di questa archiviazione.

## Stato backend

Le API backend collegate NON sono state rimosse.
Le rotte interessate (controllare `laravel-spedizionefacile-main/routes/api.php`):

- `/api/withdrawals` — lista/creazione richieste prelievo
- `/api/wallet/balance` (include `commission_balance`) — RIMANE usata dal portafoglio
- endpoint admin `/api/admin/withdrawals*`

## Come riattivare la feature

1. Ripristina i 4 file dal backup:
   ```bash
   cp _archive/frontend-simplification-2026-04-20/features/prelievi-dedicati/pages/account/prelievi.vue \
      nuxt-spedizionefacile-master/pages/account/prelievi.vue

   cp _archive/frontend-simplification-2026-04-20/features/prelievi-dedicati/pages/account/amministrazione/prelievi.vue \
      nuxt-spedizionefacile-master/pages/account/amministrazione/prelievi.vue

   cp _archive/frontend-simplification-2026-04-20/features/prelievi-dedicati/components/account/AccountPrelieviBalance.vue \
      nuxt-spedizionefacile-master/components/account/AccountPrelieviBalance.vue

   cp _archive/frontend-simplification-2026-04-20/features/prelievi-dedicati/components/account/AccountPrelieviHistory.vue \
      nuxt-spedizionefacile-master/components/account/AccountPrelieviHistory.vue
   ```

2. Ripristina le voci di menu in `utils/accountNavigationGroups.ts`:
   - In `adminNavGroups` gruppo `finanza`:
     `{ label: 'Prelievi', to: '/account/amministrazione/prelievi', iconKey: 'bank-transfer' }`
   - In `proNavGroups` secondo gruppo (Strumenti Pro):
     `{ label: 'Prelievi', to: '/account/prelievi', iconKey: 'bank-transfer' }`
   - In `utils/accountNavigation.ts` `createAccountSections` sezione Pagamenti (voce "Prelievi" con `visible: isPro`).

3. Ripristina link/navigateTo:
   - `pages/account/wallet.vue` — `await navigateTo('/account/prelievi')`
   - `pages/account/portafoglio.vue` — NuxtLink `to="/account/prelievi"` (card hero)
   - `components/account/AccountProDashboard.vue` — `to="/account/prelievi"`
   - `components/account/AccountWalletBalanceCards.vue` — `to: '/account/prelievi'`

4. Ripristina test E2E:
   - `tests/e2e/account.spec.ts` — T6.10 `/account/prelievi`
   - `tests/e2e/referral.spec.ts` — `page.goto('/account/prelievi')`

5. Verifica le API backend siano ancora live (`/api/withdrawals*`).

6. `npm run build` + test E2E account.

## File modificati per la rimozione

- `nuxt-spedizionefacile-master/utils/accountNavigationGroups.ts`
- `nuxt-spedizionefacile-master/utils/accountNavigation.ts`
- `nuxt-spedizionefacile-master/pages/account/wallet.vue`
- `nuxt-spedizionefacile-master/pages/account/portafoglio.vue`
- `nuxt-spedizionefacile-master/components/account/AccountProDashboard.vue`
- `nuxt-spedizionefacile-master/components/account/AccountWalletBalanceCards.vue`
- I 4 file `.vue` dei prelievi (rimossi)
