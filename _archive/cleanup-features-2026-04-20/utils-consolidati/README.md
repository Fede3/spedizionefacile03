# Utils consolidati — 2026-04-20

Consolidamento di 12 file `utils/*.ts` in 5 file più logici. I 11 file qui archiviati
sono stati unificati **senza modifiche di logica**: ogni export originale è
preservato identico nei nuovi file e i consumatori sono stati aggiornati ai
nuovi path di import.

## Nuovo layout in `nuxt-spedizionefacile-master/utils/`

| Nuovo file | LOC | File consolidati |
|---|---|---|
| `account.ts` | 383 | `accountNavigation.ts` (260) + `accountNavigationGroups.ts` (121) |
| `auth.ts` | 432 | `authUiState.ts` (79) + `authHelpers.ts` (56) + `authRouting.ts` (79) + `authBootstrap.ts` (192) + `postAuthSync.ts` (22) |
| `shipment.ts` | 499 | `shipmentFlowState.ts` (466) + `clientSubmissionId.ts` (33) |
| `checkout.ts` | 160 | `checkoutSuccess.ts` (108) + `stripeErrors.ts` (52) |
| `shipmentServicePricing.ts` | 718 | **INVARIATO** (non archiviato — resta nel repo) |

Totale file utils: 12 → 5 (−7 file).

## File archiviati qui (11)

1. `accountNavigation.ts`
2. `accountNavigationGroups.ts`
3. `authBootstrap.ts`
4. `authHelpers.ts`
5. `authRouting.ts`
6. `authUiState.ts`
7. `postAuthSync.ts`
8. `checkoutSuccess.ts`
9. `clientSubmissionId.ts`
10. `shipmentFlowState.ts`
11. `stripeErrors.ts`

## Mapping import per ripristino

Se serve tornare indietro, ripristinare i file e sostituire i nuovi import
con i vecchi:

| Nuovo import | Vecchi import |
|---|---|
| `from '~/utils/account'` | `'~/utils/accountNavigation'` / `'~/utils/accountNavigationGroups'` |
| `from '~/utils/auth'` | `'~/utils/authUiState'` / `'~/utils/authHelpers'` / `'~/utils/authRouting'` / `'~/utils/authBootstrap'` / `'~/utils/postAuthSync'` |
| `from '~/utils/shipment'` | `'~/utils/shipmentFlowState'` / `'~/utils/clientSubmissionId'` |
| `from '~/utils/checkout'` | `'~/utils/checkoutSuccess'` / `'~/utils/stripeErrors'` |

## Note sui conflitti di nome

- `accountNavigationGroups.ts` importava `AccountIconKey` da `./accountNavigation`.
  Dopo merge in `account.ts` l'import è eliminato (tutto nel file stesso).
- `shipmentFlowState.ts` aveva un helper **privato** `getRouteQueryValue`
  (`(unknown) => string | undefined`).
  `authRouting.ts` aveva un helper **esportato** `getRouteQueryValue`
  (`<T>(T | T[]) => T | undefined`).
  Firme diverse ma convivono in file diversi (`shipment.ts` e `auth.ts`):
  la versione privata resta locale a `shipment.ts`, quella pubblica è
  esportata da `auth.ts`. Nessun cambio di logica.

## Consumatori aggiornati (imports modificati)

- `app.vue`, `layouts/default.vue`
- `middleware/app-auth.ts`, `middleware/admin.ts`, `middleware/guest-auth.ts`, `middleware/shipment-validation.ts`
- `composables/useAuth.js`, `composables/useAutenticazione.js`, `composables/useAccountDashboard.js`,
  `composables/useCartOperations.js`, `composables/usePaymentFlow.js`, `composables/usePayment.js`
- `components/cart/CartGroupEntry.vue`, `components/cart/CartSingleEntry.vue`
- `components/account/AccountSidebar.vue`, `components/account/AccountRouteShell.vue`,
  `components/account/AccountMobileDrawer.vue`, `components/account/AccountDashboardAdmin.vue`,
  `components/account/AccountDashboardClient.vue`
- `components/shipment/ShipmentFlowAdminGateModal.vue`
- `pages/recupera-password.vue`, `pages/verifica-email.vue`, `pages/preventivo.vue`,
  `pages/login.vue`, `pages/checkout.vue`, `pages/autenticazione.vue`,
  `pages/riepilogo.vue`, `pages/registrazione.vue`, `pages/aggiorna-password.vue`,
  `pages/account/assistenza.vue`
- `plugins/10.bootstrap.client.ts`, `plugins/00.auth-ui-seed.ts`
- `tests/unit/utils/authUiState.spec.ts`, `tests/unit/utils/checkoutSuccess.spec.ts`,
  `tests/unit/utils/shipmentFlowState.spec.ts`

Totale: 31 file consumatori aggiornati.
