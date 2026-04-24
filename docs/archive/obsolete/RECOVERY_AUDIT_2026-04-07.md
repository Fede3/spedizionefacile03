# Recovery Audit — 2026-04-07

## Scope
- Preview verificata su `http://127.0.0.1:8787`
- Focus della tranche: funnel pubblico spedizione, step indirizzi, submit verso `/riepilogo`, robustezza del checkout attivo

## Problemi Riprodotti
1. Il CTA finale dello step indirizzi poteva non avviare in modo affidabile il submit del form.
   - Sintomo: click sul bottone finale con focus ancora dentro i campi indirizzo, nessun avanzamento lineare.
   - Causa tecnica: dipendenza dal submit implicito del form in una UI con blur/validazioni/autocomplete molto aggressivi.

2. Il flusso con `provincia` vuota ma derivabile dal `CAP` si bloccava o restava incoerente.
   - Sintomo: utente fermo su `la-tua-spedizione/2?step=ritiro` con comportamento poco chiaro.
   - Causa tecnica: la validazione segnalava errore troppo presto, poi la lookup CAP ripuliva gli errori ma il risultato finale poteva restare falsamente invalidato.

3. Su errori reali il focus non tornava sempre al campo giusto.
   - Sintomo: summary error presente ma card sbagliata aperta oppure focus fermo sul campo precedente.
   - Causa tecnica: mappatura id errata per i campi `origin` e `dest` telefono.

4. I payload indirizzo usavano placeholder sporchi.
   - Sintomo: presenza di fallback tipo `N/D`, `00000`, `0000000000`.
   - Impatto: rischio dati sporchi e comportamento ambiguo in caso di validazione non perfetta.

5. Il percorso attivo del pagamento aveva un `catch` rotto.
   - File attivo: [usePaymentFlow.js](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/composables/usePaymentFlow.js)
   - Impatto: un errore reale nel pagamento poteva degenerare in `ReferenceError` lato frontend.

## Fix Applicati
- [StepNavigation.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/shipment/StepNavigation.vue)
  - submit esplicito via evento `submit-step`
  - bottone finale non dipende più solo dal submit implicito del form
  - submit anticipato su `pointerdown` per evitare che il blur del campo attivo mangi l’azione

- [[step].vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue)
  - `ShipmentStepNavigation` collegata direttamente a `continueToCart`

- [useShipmentFormValidation.js](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/composables/useShipmentFormValidation.js)
  - fix mappatura id reali dei campi per il focus errori
  - risultato finale della validazione riallineato allo stato reale degli errori dopo auto-correzioni CAP/città/provincia

- [useShipmentLocationAutocomplete.js](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/composables/useShipmentLocationAutocomplete.js)
  - se il CAP non identifica in modo univoco la località, il flusso ora può bloccare con errore esplicito invece di “passare nel vuoto”

- [useShipmentStepSubmit.js](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/composables/useShipmentStepSubmit.js)
  - messaggio globale esplicito in caso di campi invalidi
  - focus errore posticipato di un frame logico, così la card corretta si apre davvero prima del focus
  - payload indirizzi ripuliti dai placeholder finti

- [useShipmentStepSessionPersistence.js](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/composables/useShipmentStepSessionPersistence.js)
  - rimossi i fallback sintetici nei payload indirizzo

- [usePaymentFlow.js](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/composables/usePaymentFlow.js)
  - corretto `catch (err)` nel percorso di pagamento attivo

## Verifiche Eseguite
- Replay manuale/Playwright del flusso valido:
  - `preventivo -> la-tua-spedizione/2 -> indirizzi -> riepilogo`
  - esito: passaggio corretto a `/riepilogo`

- Replay manuale/Playwright con province lasciate vuote ma derivabili dal CAP:
  - esito: il sistema completa la coerenza e avanza a `/riepilogo`

- Replay manuale/Playwright con errore realmente bloccante (`numero civico` mancante in partenza):
  - esito: compare messaggio chiaro, si riapre la card `Partenza`, focus su `address_number`

- Build frontend:
  - `npm run build`
  - esito: `0`
  - warning residui: sourcemap Tailwind/Nitro già presenti

## Artefatti
- [diag-step3-before-submit.png](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/output/playwright/diag-step3-before-submit.png)
- [diag-step3-after-submit.png](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/output/playwright/diag-step3-after-submit.png)
- [step3-missing-province-after-fix.png](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/output/playwright/step3-missing-province-after-fix.png)

## Stato Dopo Questa Tranche
- Chiuso:
  - submit finale step indirizzi più affidabile
  - auto-coerenza CAP/città/provincia nel caso derivabile
  - feedback e focus corretti sugli errori bloccanti
  - payload indirizzi più puliti
  - catch rotto nel flusso pagamento attivo

- Ancora aperto:
  - audit auth/navbar flicker post-login
  - lentezza post-pagamento dovuta al post-processing ancora sincrono lato backend/queue
  - pulizia strutturale del codice morto duplicato (`useCheckoutPayment.js` risulta ancora legacy da consolidare o rimuovere dopo verifica finale)
