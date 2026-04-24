# Plan Compliance + Residual Risk Register

Scope: confronto tra piani rilevanti e stato reale su `HEAD/main`

## 1. Piani considerati
- `peppy-nibbling-canyon.md`
- `humble-tumbling-pumpkin.md`
- `cheerful-kindling-wave.md`
- `lovely-nibbling-harp.md`
- `MEMORY.md` come mappa di intent tecnici e di flusso

## 2. Compliance rispetto al piano principale (`peppy-nibbling-canyon`)

| Macro-obiettivo | Stato | Lettura |
|---|---|---|
| Pulizia codice morto e repo structure | Parziale | molta pulizia fatta, ma root ancora rumorosa e workflow diario incoerente |
| Riduzione monoliti frontend | Fatto ma con rischio | split riusciti, ma debito concentrato in composables e CSS grandi |
| Riduzione monoliti backend | Fatto ma con rischio | backend piu' modulare, ma restano controller/route dense |
| Design system / token / consistenza | Parziale | migliorata la base, ma coerenza UI non ancora chiusa |
| Repo leggibile per junior | Parziale | molto meglio di prima, ancora non al target promesso |
| Integrazione BRT completa | Fatto ma non ancora certificato | copertura forte, runtime da certificare |
| PUDO completo | Fatto ma non ancora certificato | rotte e servizi presenti, serve prova runtime |
| Etichette / invoice / documenti | Fatto ma non ancora certificato | copertura ottima a livello codice |
| Responsive completo | Parziale | molte aree migliorate, ma UI globale non ancora uniforme |
| Stabilizzazione funnel | Parziale | grande miglioramento, ma step 2 resta aperto |
| Cleanup che sostituisce invece di aggiungere | Parziale | molti refactor veri, ma alcune stratificazioni nuove restano |

## 3. Compliance rispetto al piano sicurezza/semplificazione (`humble-tumbling-pumpkin`)

| Tema | Stato | Evidenza |
|---|---|---|
| CSRF su `api/*` | Non fatto | `bootstrap/app.php:63-71` esclude ancora `api/*` |
| Settings Stripe protette solo da admin | Parziale | `routes/api.php:330-333` e' sotto `auth:sanctum`; `SettingsController.php:61-66` fa check admin interno |
| Wallet ownership check robusto | Non certificato | `WalletController.php:180-210` accetta `reference` generica; audit non chiude il rischio end-to-end |
| CheckAdmin con auth check esplicito | Non fatto | `CheckAdmin.php:31-39` usa `auth()->user()?->isAdmin()` senza `auth()->check()` esplicito |
| `brt_label_base64` fuori da fillable | Non fatto | `Order.php:81` lo mantiene nei fillable |
| `unsafe-eval` rimosso da CSP | Non fatto | `SecurityHeaders.php:104-116` lo mantiene |
| eliminazione file oversized | Fatto in larga parte | milestone `3a454ad` e file principali ridotti drasticamente |

## 4. Compliance rispetto al redesign homepage / funnel / UX

### `cheerful-kindling-wave` (hero homepage)
- stato: `parziale`
- lettura: il lavoro sulla hero e sull'header c'e', ma la homepage non e' ancora una superficie completamente chiusa lato gerarchie, CTA e ritmo visivo.

### `lovely-nibbling-harp` (test + audit UX + bug hunting)
- stato: `parziale`
- lettura:
  - le suite test esistono davvero
  - manca certificazione esecutiva completa da questo ambiente
  - l'audit UX completo pagina per pagina e' stato impostato ma non convertito ancora in ciclo completo browser-verified

## 5. Residual Risk Register

| Severita' | Rischio | File / evidenza | Impatto |
|---|---|---|---|
| Medio | conteggio colli errato nelle email | `resources/views/emails/order-confirmation.blade.php:62-70`, `resources/views/emails/shipment-status.blade.php:108-110` | mismatch tra comunicazione al cliente e spedizione reale |
| Medio | drift tra listener reale e documentazione | `EventServiceProvider.php:25-30`, `SendOrderConfirmation.php:5-12,25,50` | confusione manutentiva |
| Medio | API ancora escluse globalmente dal CSRF | `bootstrap/app.php:63-71` | rischio sicurezza non chiuso secondo piano sicurezza |
| Medio | settings Stripe non in gruppo admin dedicato | `routes/api.php:330-333`, `SettingsController.php:61-66` | protezione esiste ma non nel punto piu' corretto |
| Medio | `brt_label_base64` fillable | `Order.php:81` | rischio abuso / payload troppo grandi |
| Medio | `unsafe-eval` in CSP | `SecurityHeaders.php:104-116` | hardening incompleto |
| Medio | duplicazione utilita' di stato/prezzi spedizione | `utils/shipmentFlowState.js`, `utils/utils/shipmentFlowState.js`, `utils/shipmentServicePricing.js`, `utils/utils/shipmentServicePricing.js` | rischio divergenza logica |
| Medio | route account duplicate/ambigue | `pages/account/indirizzi.vue`, `pages/account/indirizzi/index.vue`, `pages/account/spedizioni/[id].vue`, `pages/account/spedizioni/[spedizione].vue` | incoerenza UX e manutenzione |
| Alto | step 2 non ancora coerente al livello target | audit UX statico su `pages/la-tua-spedizione/[step].vue` e CSS collegati | impatta conversione e qualità percepita |
| Medio | build frontend non certificata su ambiente coerente | `package.json:5-7`, node locale `18.19.1` | non possiamo dichiarare build pulita da qui |
| Medio | backend runtime non certificato da questa shell | php Windows visibile, ma esecuzione script non affidabile da questa sessione | test non ancora chiusi |

## 6. Cosa tenere, cosa correggere, cosa rifinire

### Tenere
- la scomposizione dei monoliti gia' fatta
- il dominio BRT/PUDO/documenti ormai modellato
- le suite test gia' presenti
- la documentazione interna architetturale e di riferimento

### Correggere subito
1. bug conteggio colli nelle email
2. drift `OrderPaid` / `OrderCreated` nei listener
3. duplicazioni `shipmentFlowState` e `shipmentServicePricing`
4. route duplicate account
5. rischi sicurezza rimasti aperti dal piano `humble-tumbling-pumpkin`

### Rifinire dopo
1. step 2 funnel
2. coerenza UI account/admin
3. hardening finale CSP/CSRF/admin routing
4. certificazione build e test su ambiente corretto

## 7. Verdetto finale di conformita'

Il progetto ha consegnato molto di piu' di una semplice pulizia. Una parte ampia del piano principale e' stata realizzata davvero.

Pero' la compliance onesta non e' ancora "100% fatto":
- molte milestone sono `fatte ma con rischio`
- diverse altre sono `parziali`
- una parte dei rischi di sicurezza e della coerenza UX/UI e' ancora aperta

Conclusione:
- **piano fortemente avanzato**
- **non ancora completamente chiuso**
