# Report qualità repo/frontend - 2026-05-01

## Sintesi onesta

La repo non è più in stato rotto: i gate principali sono verdi. Però il frontend è ancora troppo grande e poco junior-friendly nei punti core. Il problema non è più la sintassi bloccante, ma la complessità accidentale: file-hub, CSS monolitico, props enormi, primitive UI non ancora pienamente vincolanti e boundary business ancora troppo larghi.

Stato misurato:

- Frontend prod: 332 file, 73.402 righe.
- Vue prod: 175 file, 30.566 righe.
- TypeScript prod: 138 file, 24.885 righe.
- CSS prod: 19 file, 17.951 righe.
- ESLint: 0 errori, 90 warning.
- Gate verificati: typecheck, eslint --quiet, unit test, build Nuxt, composer validate, composer lint.

Voto attuale:

- Stabilità tecnica: 86/100.
- Pulizia frontend: 58/100.
- Junior-friendly: 56/100.
- CSS/design architecture: 50/100.
- Complessità complessiva: 55/100.
- Stato globale repo/frontend: 64/100.

## Prove principali

### 1. Funnel ancora troppo concentrato

File: `apps/web/pages/la-tua-spedizione/[step].vue`

Prove:

- riga 2: commento dichiara "Eccezione documentata 1207 LOC".
- righe 3-8: lo stesso file dice di contenere orchestrazione 5 step, Stripe checkout, 14 composable, 35+ computed, 3 provide e handler ventaglio.
- riga 47: `definePageMeta` e middleware convivono nella stessa pagina.
- righe 84-95: stato profilo/account.
- righe 341-366: `useShipmentStepFlow`.
- righe 369-385: `useShipmentStepPageState`.
- righe 388-406: `useShipmentStepSummary`.
- righe 428-448: `useFunnelValidation`.
- righe 464-496: `useCart` + `usePayment` + destructuring checkout/coupon/wallet.
- righe 745-775: `provide('shipmentFormHandlers')` e `provide('shipmentSuggestions')`.
- righe 780-806: `continueToCart` contiene validazione, persistenza, analytics e apertura pagamento.
- righe 811-824: handler ventaglio add-to-cart/save-configured.
- righe 829-899: `useShipmentStepPageOrchestration` riceve una lista molto ampia di dipendenze.
- righe 972-1145: template passa decine di props ai 4 step.

Perché non va bene:

Una pagina route dovrebbe essere un orchestratore sottile. Qui invece la route conosce troppi dettagli di business, UI, analytics, pagamento, sessione, summary e validazione. È stabile oggi, ma fragile da modificare: un junior non capisce subito dove finisce il flusso e dove inizia il pagamento.

Cambio consigliato:

- Creare `components/shipment/ShipmentFlowPage.vue` come contenitore visuale.
- Creare composable/adapter più stretti:
  - `useShipmentPackagesStepController`
  - `useShipmentServicesStepController`
  - `useShipmentAddressesStepController`
  - `useShipmentPaymentStepController`
- La pagina `[step].vue` deve restare sotto 250-300 righe: route, SEO, middleware, current step, render shell.
- Non cambiare logica business prima di avere E2E verde sul funnel.

Impatto:

- Meno rischio di rompere tutto toccando un solo step.
- Più facile fare review.
- Più facile affidare una parte a un junior.

### 2. CSS funnel ancora monolitico

File: `apps/web/assets/css/shipment-flow.css`

Prove:

- 5.172 righe.
- righe 1-49: indice interno lunghissimo, con 29 sezioni.
- righe 2-3: il file dichiara di contenere funnel preventivo + checkout pagamento.
- righe 7-44: nello stesso file convivono quick quote homepage, account carte Stripe, payment summary, checkout, billing, ventaglio funnel, address section, date picker, servizi, PUDO, mobile fixes, animazioni, media query.
- righe 46-48: commento avvisa che spostare regole rischia di rompere specificity ordering.

Perché non va bene:

Un CSS che deve spiegare "non splittare perché la specificity è critica" è il segnale che il design system non è ancora abbastanza forte. La UI funziona, ma è fragile: ogni fix grafico può avere effetti collaterali su colli, servizi, indirizzi o pagamento.

Cambio consigliato:

- Non cancellare a caso.
- Prima creare import tree unico:
  - `assets/css/main.css`
  - `assets/css/funnel/shipment-shell.css`
  - `assets/css/funnel/shipment-packages.css`
  - `assets/css/funnel/shipment-services.css`
  - `assets/css/funnel/shipment-addresses.css`
  - `assets/css/funnel/shipment-payment.css`
  - `assets/css/funnel/shipment-summary.css`
- Estrarre solo blocchi con selettori già isolati.
- A ogni estrazione: build + screenshot/manual QA del relativo step.

Impatto:

- Meno regressioni visuali.
- Più controllo sulle UI.
- Riduzione progressiva del file monolite.

### 3. Pagamento ancora troppo accoppiato tramite props

File: `apps/web/components/shipment/ShipmentStepPagamento.vue`

Prove:

- 674 righe.
- 70 props dichiarate tra righe 17-89.
- righe 2-3: commento indica file critico con Stripe/wallet/bonifico + 3DS + idempotency.
- props includono insieme riepilogo, coupon, metodo pagamento, Stripe, wallet, fatturazione, termini, modal, auth e azioni.

Perché non va bene:

70 props sono troppe. Significa che il componente non riceve un modello coerente, ma un fascio di fili separati. Questo rende difficile capire quali dati sono realmente necessari per mostrare il pagamento e quali sono solo dettagli di implementazione.

Cambio consigliato:

- Introdurre tipi aggregati:
  - `PaymentSummaryViewModel`
  - `PaymentMethodsViewModel`
  - `PaymentBillingViewModel`
  - `PaymentActions`
- Passare 4-6 oggetti coerenti invece di 70 props atomiche.
- Poi spezzare il template in sottocomponenti già presenti (`CheckoutPaymentMethods`, `CheckoutBilling`, `CheckoutPaymentFooter`) con contratti typed.

Impatto:

- Molto più leggibile.
- Meno props dimenticate o incoerenti.
- Più semplice testare una singola sezione del pagamento.

### 4. `usePayment.ts` resta un boundary critico troppo grande

File: `apps/web/composables/usePayment.ts`

Prove:

- 672 righe.
- righe 1-24: commento dichiara boundary pagamento e avvisa di non splittare senza E2E Stripe.
- righe 150, 186, 229, 301, 368, 391, 509, 529, 597, 641: nello stesso composable convivono auth retry, Stripe init, metodo pagamento, carta, wallet, bonifico, mark order paid e success handling.

Perché non va bene:

È corretto trattarlo come zona critica, ma resta troppo largo. Se devo modificare wallet rischio di toccare Stripe. Se devo modificare bonifico rischio di leggere logica 3DS. Questo non è ideale per un sito che deve essere stabile in produzione.

Cambio consigliato:

- Prima non splittare la reattività.
- Estrarre helper puri e client API:
  - `paymentApi.ts`
  - `paymentDraft.ts`
  - `stripePaymentFlow.ts`
  - `walletPaymentFlow.ts`
  - `bankTransferPaymentFlow.ts`
- `usePayment.ts` deve diventare orchestratore e stato UI, non contenere tutte le chiamate.

Impatto:

- Migliore sicurezza del refactor.
- Più facile testare carta/wallet/bonifico separatamente.

### 5. Form indirizzi ancora troppo denso e con injection non typed

File: `apps/web/components/shipment/AddressFormFields.vue`

Prove:

- 573 righe.
- righe 4-12: props generiche con `Object`, `Array`, `String`.
- righe 14-21: usa `inject('shipmentFormHandlers')`.
- righe 56-80: parsing nome/cognome vive nel componente visuale.

File: `apps/web/pages/la-tua-spedizione/[step].vue`

Prove:

- righe 745-775: fornisce handler e suggerimenti tramite string keys.

Perché non va bene:

L'injection con string key e senza contratto forte rende difficile capire cosa serve al form. Inoltre il componente visuale contiene anche normalizzazione dati. Questo abbassa la leggibilità e aumenta il rischio di bug sui campi indirizzo/PUDO.

Cambio consigliato:

- Creare `types/shipmentAddressForm.ts`.
- Creare injection key typed:
  - `shipmentFormHandlersKey`
  - `shipmentSuggestionsKey`
- Estrarre sottocomponenti markup-only:
  - `AddressNameFields`
  - `AddressStreetFields`
  - `AddressLocationFields`
  - `AddressContactFields`
  - `AddressBusinessFields`
  - `AddressFieldFeedback`

Impatto:

- Junior può modificare una riga del form senza leggere 573 righe.
- TypeScript aiuta davvero.

### 6. Pricing servizi troppo importante per stare in un solo file lungo

File: `apps/web/utils/shipmentServicePricing.ts`

Prove:

- 695 righe.
- righe 1-2: commento dice che deve restare allineato al backend.
- righe 157-210: default pricing e automatic supplements.
- righe 318-584: parsing/normalizzazione/matching.
- righe 598-756: calcolo supplementi automatici + totale.

Perché non va bene:

Il pricing è core business. Se resta in un file unico, è più facile sbagliare una regola e più difficile verificare parità con backend/BRT. Il commento "deve restare allineato al backend" è corretto, ma serve una struttura che lo renda verificabile.

Cambio consigliato:

- Separare:
  - `pricingTypes.ts`
  - `pricingDefaults.ts`
  - `pricingNormalize.ts`
  - `pricingMatchers.ts`
  - `pricingCalculate.ts`
- Aggiungere test unit mirati per contrassegno, assicurazione, PUDO, isole, fuori sagoma, aste/tubi.

Impatto:

- Meno rischio economico.
- Più facile capire una regola.
- Migliore tracciabilità frontend/backend.

### 7. Troppi componenti usano props generiche

Prove:

- Search su `defineProps`, `type: Object`, `type: Array`, `type: Function` mostra molte occorrenze in account/admin/shipment.
- Esempi:
  - `components/account/AccountSidebar.vue`: `navGroups: Array`, funzioni obbligatorie.
  - `components/account/AddressCard.vue`: `address: Object`.
  - `components/admin/user-detail/*`: molte props `Object`/`Array`/`Function`.
  - `components/shipment/ShipmentStepPagamento.vue`: molte props `Object`, `Array`, `Function`.

Perché non va bene:

Vue runtime props generiche funzionano, ma non aiutano abbastanza TypeScript. Per una repo junior-friendly servono contratti leggibili: che cos'è un ordine? che cos'è un address? che cos'è un nav item?

Cambio consigliato:

- Migrare progressivamente a `defineProps<Type>()`.
- Creare tipi piccoli in `types/account.ts`, `types/admin.ts`, `types/shipment.ts`, `types/payment.ts`.
- Partire dai componenti più riusati e dai core step.

Impatto:

- Meno errori nascosti.
- Autocomplete migliore.
- Review più veloce.

### 8. Warning ESLint indicano ancora file/funzioni troppo lunghi

Prove:

- 0 errori, ma 90 warning.
- Regole:
  - `max-lines-per-function`: 62.
  - `max-lines`: 18.
  - `no-console`: 8.
  - `vue/no-v-html`: 2.

File principali:

- `components/shipment/AddressFormFields.vue`
- `components/shipment/Preventivo.vue`
- `components/shipment/ShipmentStepPagamento.vue`
- `composables/usePayment.ts`
- `composables/usePudoSearchApi.ts`
- `composables/useQuickQuoteLocations.ts`
- `composables/useShipmentStepSummary.ts`
- `pages/la-tua-spedizione/[step].vue`
- `utils/shipment.ts`
- `utils/shipmentServicePricing.ts`

Perché non va bene:

Il lint non blocca, ma sta dicendo dove il progetto è ancora difficile da mantenere. Questi warning vanno trattati come mappa di refactor, non come rumore.

Cambio consigliato:

- Non alzare le soglie.
- Convertire warning in backlog prioritizzato.
- Chiudere prima i warning dei file core.

### 9. UI tokens non ancora completamente vincolanti

Prove:

- Search su colori/classes trova molte occorrenze:
  - `shipment-flow.css`: 400.
  - `admin.css`: 272.
  - `main.css`: 231.
  - `account.css`: 184.
  - `pages/traccia/index.vue`: 59.
  - vari componenti admin/account con molte utility hardcoded.

Perché non va bene:

Il design system esiste, ma non è ancora abbastanza vincolante. Se ogni pagina usa combinazioni proprie di colori, shadow e border, la UI può divergere di nuovo.

Cambio consigliato:

- Stabilire primitive obbligatorie:
  - `SfButton`
  - `SfInput`
  - `SfSurface`
  - `SfSegmentedControl`
  - `SfPageHeader`
  - `SfEmptyState`
  - `SfStatusPill`
- Ogni nuova pagina/account/admin deve usare primitive o token, non colori raw.

Impatto:

- UI più coerente.
- Meno CSS ripetuto.
- Meno regressioni.

## Cosa fare per arrivare vicino al 100

### Blocco A - Zero regressioni come baseline

1. Tenere verdi:
   - `cd apps/web && npm run typecheck`
   - `cd apps/web && npx eslint . --quiet`
   - `cd apps/web && npm run test:unit`
   - `cd apps/web && npm run build`
   - `composer validate --strict`
   - `composer lint`
   - `php artisan test`
2. Aggiungere E2E minimo sul funnel:
   - home quick quote -> colli
   - colli -> servizi
   - servizi -> indirizzi
   - indirizzi domicilio -> pagamento
   - pagamento bonifico/wallet mocked
   - PUDO mocked

### Blocco B - Semplificare route funnel

Target:

- `[step].vue` sotto 300 righe.
- Nessuna logica di pricing/pagamento nel template route.
- Props verso step ridotte tramite view-model.

Ordine:

1. Estrarre `ShipmentFlowPage.vue`.
2. Creare view-model per step.
3. Spostare summary existing-order fuori dalla route.
4. Spostare handler analytics in `useShipmentFunnelAnalyticsBridge`.

### Blocco C - Spezzare CSS funnel

Target:

- `shipment-flow.css` sotto 1.000 righe o archiviato come import aggregatore temporaneo.
- Ogni step ha CSS proprio.
- Primitive condivise in `funnel-shared.css` o `components.css`.

Ordine:

1. Estrarre blocchi già isolati e senza override incrociati.
2. Mantenere ordine import identico.
3. QA visuale dopo ogni estrazione.

### Blocco D - Rendere pagamento leggibile

Target:

- `ShipmentStepPagamento.vue` sotto 350 righe.
- Props ridotte da 70 a 4-6 oggetti typed.
- `usePayment.ts` diviso in API/helper puri ma con orchestrazione centrale stabile.

Ordine:

1. Creare tipi view-model.
2. Raggruppare props senza cambiare template.
3. Estrarre helper API.
4. Solo dopo E2E, dividere flussi carta/wallet/bonifico.

### Blocco E - Indirizzi/PUDO typed e componentizzati

Target:

- `AddressFormFields.vue` sotto 250 righe.
- Injection typed.
- Sottocomponenti piccoli.
- PUDO isolato come boundary con tipo chiaro.

Ordine:

1. Creare `types/shipmentAddress.ts`.
2. Creare injection keys typed.
3. Estrarre sezioni markup.
4. Testare domicilio + PUDO.

### Blocco F - Pricing business verificabile

Target:

- `shipmentServicePricing.ts` spezzato.
- Test unit per ogni supplemento.
- Regole frontend/backend documentate.

Ordine:

1. Estrarre tipi e defaults.
2. Estrarre normalizzatori.
3. Estrarre matcher.
4. Mantenere `calculateShipmentServiceSurcharge` come API pubblica.
5. Aggiungere test.

## Score target realistico

Per arrivare a un 90+/100 reale:

- Gate tutti verdi: già quasi ok.
- E2E core presente: manca.
- File core sotto soglie gestibili: manca.
- CSS monolite ridotto: manca.
- Props typed e meno generiche: manca.
- UI primitive obbligatorie: parziale.
- Documentazione vera: migliorata, da mantenere.

Il 100/100 assoluto è irrealistico per un prodotto vivo, ma un 88-92/100 professionale è raggiungibile con i blocchi sopra senza togliere funzioni core.
