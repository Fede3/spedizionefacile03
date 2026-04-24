# Bonus / Programma Fedeltà — Istruzioni di Riattivazione

**Archiviato**: 2026-04-20 (Ondata 1 O1-A5 frontend simplification)
**Motivo**: la pagina era un aggregatore statico di CTA verso wallet / account-pro.
Non aggiungeva valore vs. visualizzare quelle viste direttamente. Rimossa per
semplificare la navigazione account.

## Cosa faceva

`pages/account/bonus.vue` — mostrava 3 "bonus" statici (invita amico, ricarica wallet,
diventa Pro) come card che linkavano a `/account/portafoglio` o `/account/account-pro`.
Filtrava in base al ruolo utente (`Partner Pro` vede card invita amico).

Non era un vero programma fedeltà: nessun punteggio, nessuna progressione, nessun
endpoint backend dedicato.

## File archiviati

- `pages/account/bonus.vue` (242 LOC)

## Call site modificati (snippet storici in `call-sites-removed.patch.md`)

- `components/account/AccountDashboardClient.vue` — rimossa CTA "Invita amico, attiva i bonus"
  a fondo dashboard cliente
- `composables/useAccountDashboard.ts` — rimosso `bonusPage` computed e export
- `pages/account/index.vue` — rimosso passaggio prop `bonus-page`
- `utils/accountNavigation.ts` — rimossa entry "Bonus" dalla sezione Partner Pro
- `utils/accountNavigationGroups.ts` — rimosse entry "Bonus" da clientNavGroups e proNavGroups
- `pages/account/wallet.vue` — rimosso link "Dettagli" che puntava a `/account/bonus`
- `tests/e2e/account.spec.ts` — rimossi test T6.8 e T6.8.1
- `tests/e2e/referral.spec.ts` — rimosso test auth-gate `/account/bonus`
- `tests/e2e/pages/AccountPage.ts` — rimosso metodo `gotoBonus()`

## Come riattivare

1. **Ripristinare il file pagina**:
   ```bash
   cp _archive/frontend-simplification-2026-04-20/features/bonus-fedelta/pages/account/bonus.vue \
      nuxt-spedizionefacile-master/pages/account/bonus.vue
   ```

2. **Ripristinare le navigation entries** in `utils/accountNavigationGroups.ts`:
   ```ts
   // In clientNavGroups.items:
   { label: 'Bonus', to: '/account/bonus', iconKey: 'tag-multiple' },

   // In proNavGroups["Strumenti Pro"].items:
   { label: 'Bonus', to: '/account/bonus', iconKey: 'tag-multiple' },
   ```

3. **Ripristinare entry in `utils/accountNavigation.ts`** (sezione Partner Pro):
   ```ts
   { title: 'Bonus', description: 'Inviti, wallet e vantaggi attivi.',
     url: '/bonus', visible: true, iconKey: 'tag-multiple', /* ...tone... */ }
   ```

4. **Ripristinare bonusPage in `useAccountDashboard.ts`**:
   ```ts
   const bonusPage = computed(() => allVisiblePages.value.find((page: any) => page.url === '/bonus') || null);
   // + export + export destructure in pages/account/index.vue
   ```

5. **Ripristinare CTA in `AccountDashboardClient.vue`** (blocco `<NuxtLink v-if="bonusPage">`).

6. **Ripristinare link "Dettagli"** in `pages/account/wallet.vue`:
   ```vue
   <NuxtLink to="/account/bonus" class="btn-secondary btn-sm">Dettagli</NuxtLink>
   ```

## Nota su un vero programma fedeltà

Questa pagina era cosmetica. Se si vuole un programma fedeltà vero serve:
- Backend: tabella `user_bonuses`, endpoint `/api/bonuses`, regole accrual
- Frontend: stato reattivo (`useBonuses` composable), progressione, historique
- Product: decisione su meccanica (punti? cashback? livelli?)
