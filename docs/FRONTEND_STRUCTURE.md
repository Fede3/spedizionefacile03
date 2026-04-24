# Frontend Structure - Nuxt App

Mappa pratica della struttura `nuxt-spedizionefacile-master/`.

Obiettivo di questo documento:

- capire **dove vive davvero il frontend**
- capire **quali superfici sono canoniche**
- sapere **quali file leggere prima**
- evitare di aggiungere nuova complessita accidentale

## Layout reale del workspace frontend

```text
nuxt-spedizionefacile-master/
|- app.vue
|- app.config.ts
|- nuxt.config.ts
|- error.vue
|- assets/
|  |- css/
|  `- images/
|- components/
|- composables/
|- features/
|- layouts/
|- middleware/
|- pages/
|- plugins/
|- public/
|- stores/
|- utils/
`- package.json
```

Le directory che contano davvero per il codice vivo sono:

- `pages/` -> superfici e routing
- `components/` -> UI riusabile
- `composables/` -> logica stateful e boundary di feature
- `features/` -> sub-boundary canonici quando una feature diventa troppo grande per un solo composable
- `stores/` -> stato condiviso minimo
- `utils/` -> funzioni pure
- `assets/css/` -> design system e skin di feature

## Superfici canoniche

### Pubblico

- `pages/index.vue` -> home e quick quote
- `pages/la-tua-spedizione/[step].vue` -> funnel canonico
- `pages/carrello.vue` -> carrello
- `pages/contatti.vue`, `pages/servizi/**`, `pages/guide/**`, `pages/traccia-spedizione.vue` -> superfici pubbliche

### Compatibilita tecnica

Queste route esistono ancora, ma non sono il funnel canonico:

- `pages/preventivo.vue`
- `pages/checkout.vue`
- `pages/riepilogo.vue`

Devono restare come wrapper/redirect compatibili, non come flussi concorrenti.

### Account cliente

Superfici vive da considerare canoniche:

- `pages/account/index.vue`
- `pages/account/profilo.vue`
- `pages/account/spedizioni/index.vue`
- `pages/account/spedizioni/[id].vue`
- `pages/account/portafoglio.vue`
- `pages/account/fatture.vue`
- `pages/account/carte.vue`
- `pages/account/indirizzi/index.vue`
- `pages/account/assistenza.vue`
- `pages/account/account-pro.vue`

### Admin

Superfici vive da considerare canoniche:

- `pages/account/amministrazione/index.vue`
- `pages/account/amministrazione/ordini.vue`
- `pages/account/amministrazione/spedizioni.vue`
- `pages/account/amministrazione/utenti.vue`
- `pages/account/amministrazione/prezzi.vue`
- `pages/account/amministrazione/bonifici.vue`
- `pages/account/amministrazione/impostazioni.vue`
- `pages/account/amministrazione/servizi/**`

## Feature boundary target

Il frontend va letto e semplificato per feature:

- `auth`
- `shipment-flow`
- `shipment-draft`
- `cart-checkout`
- `wallet-referral`
- `account`
- `admin`
- `tracking-pudo`
- `content-public`

Quando aggiungi codice nuovo, la domanda non e':
"in che cartella generica lo metto?"

La domanda corretta e':
"a quale feature appartiene davvero?"

### Wallet / referral / coupon

Questo boundary oggi va letto cosi':

- checkout/funnel promo preview:
  - `composables/useCart.js`
  - `features/wallet-referral/useCartPromoPreview.js`
  - `features/wallet-referral/useCheckoutPromoPreview.js`
  - `utils/discountPreview.js`
- pagamento ordine:
  - `composables/usePayment.js`
  - `composables/useCheckoutOrderContext.js`
- wallet/account:
  - `pages/account/portafoglio.vue`
  - `components/account/AccountWalletBalanceCards.vue`
- Partner Pro:
  - `pages/account/account-pro.vue`
  - `components/account/AccountProDashboard.vue`

Attenzione:

- checkout e carrello usano ora boundary dedicati distinti:
  - `useCartPromoPreview` per la preview coupon in `/carrello`
  - `useCheckoutPromoPreview` per la preview coupon/referral nel funnel/checkout
- la shape finale promo non e' ancora completamente unificata con reward referral e pricing persistito ordine
- se tocchi coupon/referral/wallet, leggi prima `docs/FEATURE_BOUNDARIES.md`

## File hub da trattare con cautela

Il frontend oggi e' ancora troppo concentrato in alcuni hub molto grandi.

I principali sono:

- `composables/useShipmentStepPageOrchestration.js`
- `composables/useShipmentStepDraftPayload.js`
- `composables/useShipmentStepPaymentEntry.js`
- `composables/usePreventivo.js`
- `composables/usePayment.js`
- `composables/useCheckoutOrderContext.js`
- `composables/useCart.js`
- `features/wallet-referral/useCheckoutPromoPreview.js`
- `utils/discountPreview.js`
- `pages/la-tua-spedizione/[step].vue`
- `components/shipment/ShipmentStepPagamento.vue`

Questi file sono **centrali ma troppo grossi**.  
Prima di spezzarli:

1. fissare il comportamento corretto
2. mappare il boundary
3. estrarre moduli piccoli con ownership chiara

Mai fare il contrario.

Nota aggiornata:

- `composables/useShipmentStepPageOrchestration.js` ora e' il **punto di ingresso canonico**
- i sub-boundary del funnel stanno in `features/shipment-flow/`
- questo evita di riaprire il monolite ogni volta che si tocca flow, validation, page state o submit

## Reading order consigliato

Per capire il prodotto senza perdersi:

1. `pages/index.vue`
2. `components/shipment/Preventivo.vue`
3. `composables/usePreventivo.js`
4. `utils/quickQuoteContract.js`
5. `pages/la-tua-spedizione/[step].vue`
6. `docs/FEATURE_BOUNDARIES.md`
7. `composables/useShipmentStepDraftPayload.js`
8. `features/shipment-flow/`
9. `composables/useShipmentStepPaymentEntry.js`
10. `composables/useShipmentStepPageOrchestration.js`
11. `composables/useCart.js`
12. `utils/discountPreview.js`
13. `composables/useCheckoutOrderContext.js`
14. `composables/usePayment.js`
15. `stores/shipmentFlowStore.ts`
16. `pages/account/index.vue`
17. `pages/account/amministrazione/index.vue`

Questo ordine e' piu' utile di una lettura casuale dell'albero.

## Components

`components/` e' organizzata per area di prodotto:

- `components/shipment/`
- `components/checkout/`
- `components/cart/`
- `components/account/`
- `components/admin/`
- `components/auth/`
- `components/layout/`

Regole:

- un componente deve avere una responsabilita stretta
- se sta diventando una mini-page, probabilmente e' troppo grosso
- niente annidamenti inutili di componenti che esistono solo per passare props

## Composables

`composables/` e' il punto piu' delicato del frontend.

Qui devono vivere:

- stato condiviso di feature
- bridge verso API/session/store
- logica reattiva riusabile

Qui **non** devono vivere:

- pezzi di UI
- funzioni pure banali
- logica duplicata gia presente in un altro boundary canonico

Regola pratica:

- `utils/` = funzioni pure
- `stores/` = stato condiviso minimo
- `composables/` = orchestration di feature

## Store reale

Lo store condiviso che conta davvero oggi e':

- `stores/shipmentFlowStore.ts`

Lo store conserva la bozza (`pendingShipment`), ma il boundary `shipment draft -> ordine pagabile`
non vive solo nello store: oggi passa anche da `useShipmentStepDraftPayload.js`,
`useShipmentStepPaymentEntry.js` e `useCheckoutOrderContext.js`.

Il resto della complessita e' soprattutto nei composables.

Questo e' un segnale utile:
- non aggiungere nuovi store se il problema e' solo di boundary poco chiari

## Plugins reali

I plugin attivi da considerare canonici sono quelli presenti in `plugins/`:

- `00.auth-ui-seed.ts`
- `10.bootstrap.client.ts`
- `20.plausible.client.ts`

Non documentare plugin storici o rimossi come se fossero parte del runtime attuale.

## CSS

I CSS piu' pesanti e piu' rischiosi oggi sono:

- `assets/css/shipment-step.css`
- `assets/css/main.css`
- `assets/css/account-shell.css`
- `assets/css/checkout.css`
- `assets/css/preventivo.css`

Questi file vanno trattati come hub da semplificare in modo progressivo.

Regola:

- prima consolidare le primitive shared
- poi togliere override locali ridondanti
- poi ridurre i monoliti di feature

## Regole operative

- nessuna nuova route concorrente per lo stesso flusso
- nessuna nuova page-controller se la logica puo' stare in composable/feature boundary
- nessun nuovo CSS monolitico senza passare dal design system
- nessuna nuova duplicazione tra funnel, checkout e pagine compat legacy

## Riferimenti

- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`FEATURE_BOUNDARIES.md`](./FEATURE_BOUNDARIES.md)
- [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)
- [`BACKEND_STRUCTURE.md`](./BACKEND_STRUCTURE.md)
