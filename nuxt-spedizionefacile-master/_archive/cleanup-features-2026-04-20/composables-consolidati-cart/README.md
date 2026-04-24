# Composables carrello consolidati (20/04/2026)

Tre composable del carrello fusi in un unico file `composables/useCart.js`
per rimuovere logica duplicata e chiarire la catena di dipendenze.

## File archiviati qui

- `useCarrello.js` (402 LOC) — state pagina `/carrello`: filtri, raggruppamento
  indirizzi, quantita inline, auth gate checkout, coupon UI (semantica boolean).
- `useCartOperations.js` (359 LOC) — state checkout: cart, billing, wallet,
  coupon/referral. Duplicava ~95% di `useCart.js` (version attiva).

## File attivo dopo la fusione

`composables/useCart.js` (~700 LOC) esporta tre funzioni con API pubblica
identica agli originali:

- `useCart()` — stato/checkout (ShipmentStepPagamento.vue + useCheckout.js)
- `useCartOperations()` — alias retro-compat di useCart (usato dal facade useCheckout)
- `useCarrello()` — logica pagina /carrello (pages/carrello.vue)

## Duplicazioni rimosse

- billing/fatturazione (fatturaData, watcher, billingPayload) — era duplicato
  tra useCart e useCartOperations
- wallet (walletBalance, loadWalletBalance, walletFormatted) — duplicato
- totali/pacchi (displayPackages, getTotal, getNumberTotal, totalPackages,
  contentDescription, addressGroups, hasMultipleGroups, mergeGroupsCount,
  finalTotal, finalTotalFormatted, walletSufficient) — duplicati
- coupon/referral (validateCoupon, autoApplyReferral, removeCoupon) — duplicati
- `initCheckoutPage`, `refreshCart` — due versioni: la versione `useCart`
  (niente navigateTo hardcoded, gestione try/catch piu' pulita) e' stata tenuta.

## Aggiornamenti consumer

- `composables/useCheckout.js` riga 13: import path aggiornato da
  `~/composables/useCartOperations` a `~/composables/useCart` (export nominale
  preservato).
- Tutti gli altri consumer (`pages/carrello.vue`, `pages/la-tua-spedizione/[step].vue`,
  `components/Navbar.vue`) usano auto-import Nuxt per nome — nessuna modifica.

## Ripristino (se necessario)

1. Spostare i due file di nuovo in `composables/`
2. Ripristinare l'import in `useCheckout.js` a `~/composables/useCartOperations`
3. Rimuovere `export function useCartOperations`/`useCarrello` da `useCart.js`
