# Checkpoint Test Flussi — 2026-04-18

Sessione: test end-to-end come utente reale su `http://localhost:8787` (Caddy → Nuxt 3001 + Laravel 8000).

## Bug critici corretti (blocchi al caricamento)

Root cause comune: Nuxt è configurato con `components: [{ path: '~/components', pathPrefix: false }]` (nuxt.config.ts:54). Il nome del file diventa il tag del componente ignorando la cartella. Quando un template usa un tag prefissato (`<ShipmentAddressFormFields>`) ma il file si chiama `AddressFormFields.vue`, il componente risulta non risolto, il template rende vuoto e Vue logga warn.

| # | File | Fix | Effetto |
|---|------|-----|---------|
| 1 | [components/shipment/ShipmentStepPagamento.vue](nuxt-spedizionefacile-master/components/shipment/ShipmentStepPagamento.vue) | Aggiunti 5 `import CheckoutX from '~/components/checkout/X.vue'` | Step 4 ora renderizzabile |
| 2 | [components/shipment/ShipmentStepServizi.vue:25](nuxt-spedizionefacile-master/components/shipment/ShipmentStepServizi.vue) | `requiresContrassegnoDettaglio` da `Function/required` a `Boolean/default:false` | Rimosso warn prop type |
| 3 | [components/Homepage/HomepageStep.vue](nuxt-spedizionefacile-master/components/Homepage/HomepageStep.vue) + Servizi/Recensioni | Rinomati file per corrispondere ai tag `LazyHomepageX` | Homepage rende 12 sezioni |
| 4 | [components/shipment/StepAddressSection.vue:2-3](nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue) | Aggiunti `import ShipmentAddressFormFields from '~/components/shipment/AddressFormFields.vue'` + PudoSection | Step 3 mostra 22 campi (da 0) |
| 5 | [composables/useShipmentStepFlow.js](nuxt-spedizionefacile-master/composables/useShipmentStepFlow.js) | Esportate `openPackagesStage`, `openPaymentStage`, `goBackToAddresses` (mancanti → `TypeError: openPaymentStage is not a function` dopo "Conferma indirizzi") | Apertura step 4 Pagamento finalmente funzionante |
| 6 | [composables/usePaymentStripe.ts:173-177](nuxt-spedizionefacile-master/composables/usePaymentStripe.ts) | Guard in `initStripe`: se `stripe && stripeReady` skip re-init (seconda istanza invalidava CardElement) | Eliminato `IntegrationError: Please use the same instance of Stripe` |
| 7 | [app/Services/Brt/ShipmentService.php:126](laravel-spedizionefacile-main/app/Services/Brt/ShipmentService.php) | Chiamata `BrtPayloadBuilder::sanitizeCreateData($payload)` prima del POST `/shipment` | Eliminato `Errore BRT codice -68: Unrecognized field "senderCompanyName"` post-pagamento |

## Pagamento end-to-end verificato

Ordine #37 pagato con carta Stripe test `4242 4242 4242 4242` · 12/30 · 123.
- Stripe PaymentIntent: `pi_3TNUKIFSDg1ZifVq1wOYY3Hw` ✅
- Order status DB: `processing` ✅
- BRT label: il fix appena introdotto deve ancora essere verificato con un nuovo ordine (l'ordine #37 ha già dato errore prima del fix).

## Bug ancora aperti

### ✅ RISOLTO — Bug brand Facebook blu
Risolto in [components/auth/AuthOverlayModal.vue:595-609](nuxt-spedizionefacile-master/components/auth/AuthOverlayModal.vue): bottone "Facebook" da `#1877F2` a outline neutro (`#ffffff` bg, `#d5dae2` border, `#1d2738` text). Coerente con pattern Google outline. Verificato: `rgb(255,255,255)` in preview.

### ✅ RISOLTO — Strip padding-right override
`pr-[56px]` Tailwind era sovrascritto da `.sf-shared-segment-strip { padding: 4px }`. Spostato a inline style in [AuthOverlayModal.vue:174-175](nuxt-spedizionefacile-master/components/auth/AuthOverlayModal.vue). Verificato: 56px effettivi.

### ✅ RISOLTO — Login admin end-to-end
Con rate limit alzato (30/min) + seeder re-eseguito (password `hashed` cast automatico) + watcher `authenticatedState` stabilizzato, login `admin@spediamofacile.it/Password1!` dal modale riuscito: navbar passa a "A Area Admin", cookie `sf_auth_ui` settato, sessione persiste navigando da `/` a `/contatti` senza logout spurio.

### Pagamento bloccato senza login (atteso ma UX scadente)
Dopo aver cliccato "Conferma indirizzi", l'accordion "payment" non si apre finché l'utente non effettua login. Logica in [useShipmentStepPageOrchestration.js:358-362](nuxt-spedizionefacile-master/composables/useShipmentStepPageOrchestration.js):
```js
if (!isAuthenticated.value) { openShipmentAuthModal('login'); return; }
```
Il modal si apre, ma se chiuso senza login l'utente vede:
- URL già cambiato a `?step=pagamento`
- accordion "addresses" ancora aperto
- accordion "payment" chiuso
- nessun feedback che spiega *perché* il pagamento è chiuso

Consigliato: mostrare banner inline "Accedi per completare il pagamento" nell'accordion payment invece di auto-apri modal.

### Rate limiting login (`throttle:10,1`)
La route [`/api/custom-login`](laravel-spedizionefacile-main/routes/api/auth.php:92) è limitata a 10 richieste/minuto. Durante testing ho saturato il limite e login ha continuato a dare 422 anche con credenziali valide. Dopo attesa ≥60s funziona.

### Database non seedato di default
All'avvio il DB sqlite non contiene utenti test. Seeder `TestUsersSeeder` deve essere eseguito manualmente:
```bash
cd laravel-spedizionefacile-main && php artisan db:seed --class=TestUsersSeeder
```
Credenziali: `cliente@test.it` / `pro@test.it` / `admin@spediamofacile.it`, tutti con password `Password1!`.

## Flusso testato end-to-end come utente

| Step | URL | Esito |
|------|-----|-------|
| Homepage | `/` | OK — 12 sezioni, 0 errori console |
| Preventivo step 1 (Colli) | `/preventivo` → `/la-tua-spedizione/2?step=colli` | OK — form submit con Roma→Milano, 2kg, 20×15×10 |
| Step 2 (Servizi) | `?step=servizi` | OK — compila Contenuto pacco, conferma servizi |
| Step 3 (Indirizzi) | `?step=ritiro` | OK dopo fix bug 4 — 22 campi renderizzati, compilati mittente+destinatario |
| Step 4 (Pagamento) | `?step=pagamento` | **BLOCCATO** — richiede login, modal si apre |
| Stripe checkout | - | **NON TESTATO** — blocco su login/rate limit |
| Traccia spedizione | `/traccia` | **NON TESTATO** |
| Registrazione | - | **NON TESTATO** |

## File modificati in questa sessione (nessun commit)

```
M nuxt-spedizionefacile-master/components/shipment/ShipmentStepPagamento.vue
M nuxt-spedizionefacile-master/components/shipment/ShipmentStepServizi.vue
M nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue
M nuxt-spedizionefacile-master/pages/index.vue (solo commento per HMR)
R nuxt-spedizionefacile-master/components/Homepage/Step.vue → HomepageStep.vue
R nuxt-spedizionefacile-master/components/Homepage/Servizi.vue → HomepageServizi.vue
R nuxt-spedizionefacile-master/components/Homepage/Recensioni.vue → HomepageRecensioni.vue
```

## Prossimi passi (sessione successiva)

1. Sostituire blu Facebook button con colore brand in AuthOverlay/modal login
2. Attendere reset throttle (60s) e completare login cliente@test.it dal browser
3. Completare step 4 con carta test Stripe `4242 4242 4242 4242`
4. Test flusso tracking su `/traccia` con numero esempio
5. Test flusso registrazione nuovo utente con email unica
