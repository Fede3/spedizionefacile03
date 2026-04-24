# Deep Audit Report - SpedizioneFacile

Data: 2026-03-31
Scope: `HEAD/main` stabile (`0db0096`)
Metodo: audit integrato di commit, piani, memory, documentazione interna e codice sorgente.

## 1. Fonti usate

### Fonti canoniche di intent e target
- `C:\Users\Feder\.claude\projects\C--Users-Feder-Desktop-spedizionefacile\memory\MEMORY.md`
- `C:\Users\Feder\.claude\plans\peppy-nibbling-canyon.md`
- `C:\Users\Feder\.claude\plans\humble-tumbling-pumpkin.md`
- `C:\Users\Feder\.claude\plans\cheerful-kindling-wave.md`
- `C:\Users\Feder\.claude\plans\lovely-nibbling-harp.md`

### Fonti canoniche di stato reale
- history commit `main`
- `docs/architettura/AUDIT-LEGGIBILITA.md`
- `docs/architettura/MODULI.md`
- `docs/riferimento/API-ENDPOINTS.md`
- `docs/riferimento/STATI-ORDINE.md`
- `docs/analisi/PUDO_FIX_SUMMARY.md`
- `docs/analisi/MODIFICHE_NUOVO_FLUSSO_UX.md`

## 2. Executive verdict

Il progetto e' migliorato in modo reale e sostanziale rispetto alla baseline del refactor massivo. Non e' un caso di "solo ordine cosmetico": il dominio spedizioni/BRT/PUDO e' piu' coperto, il codice ha meno monoliti nelle aree peggiori, e la repo e' piu' leggibile di prima.

Il punto onesto e' questo:
- architettura e separazione responsabilita': migliorate davvero
- dominio BRT/PUDO/etichette/documenti: molto piu' maturo di prima
- UX/UI: migliorata, ma non ancora abbastanza coerente per dire "chiusa"
- runtime certification: ancora incompleta da questo ambiente

### Valutazione sintetica
| Area | Stato | Lettura sintetica |
|---|---|---|
| Architettura e qualita' codice | Buono | I refactor grossi hanno avuto effetto reale |
| Dominio BRT / PUDO / labels / docs | Buono con rischio | Copertura funzionale ampia, ma non ancora certificata end-to-end |
| UX/UI globale | Medio | Migliorata, ma coerenza sistemica ancora parziale |
| Conformita' ai piani | Medio-buona | Molto consegnato, ma non tutto chiuso |
| Build / test / runtime certainty | Media-bassa | Suite presenti, certificazione locale parziale |

## 3. Baseline tecnica e milestone

| Commit | Obiettivo dichiarato | Miglioramento reale osservato | Rischio residuo |
|---|---|---|---|
| `15f6f1c` | split massivo frontend + backend | prima grande riduzione dei monoliti e nascita dei primi servizi/composables dedicati | parte della complessita' e' stata solo spostata, non eliminata |
| `3a454ad` | split completo file oversized | milestone piu' forte sul frontend/admin; esempi: `[step].vue`, `prezzi.vue`, `account-pro.vue` | alcuni split hanno concentrato debito in composables molto lunghi |
| `3f31edf` | BRT integration, UX consistency, DB features | aggiunta seria di `PickupService`, `FilialeLookup`, `InvoicePdfService`, tracking e campi BRT | integrazione forte ma non ancora certificata runtime da qui |
| `30ff57a` | sicurezza, BRT fix, UX consistency, pagine legali, pulizia | rimozione duplicazioni admin, pulizia diffusa, consolidamento middleware e pagine legali | alcuni rischi del piano sicurezza restano aperti |
| `329ced1` | email flow, GDPR, error page, pulizia | spostato `SendOrderConfirmation` su `OrderPaid`, aggiunti `CookieBanner`, `error.vue`, docs ripulite | commenti e documentazione di alcuni listener non riallineati |
| `0db0096` | template email mancanti | risolto il buco dei template `order-confirmation` e `shipment-status` | bug reale nel conteggio colli quando `quantity > 1` |

## 4. Misure oggettive su HEAD/main

### Struttura frontend
- pagine `.vue`: `64`
- componenti `.vue`: `109`
- composables: `55`
- file CSS dedicati: `22`
- totale frontend (`.vue/.js/.ts/.css`): `55.950` righe

### Struttura backend
- servizi backend: `29`
- controller backend: `49`
- totale backend (`.php/.blade.php`, incluso codice supporto e test): `31.809` righe
- core backend `app + routes + resources`: `20.757` righe

### Segnale importante
Il refactor ha spostato il progetto da pochi file ingestibili a una base molto piu' modulare. La qualita' e' migliorata, ma resta ancora molto peso concentrato in alcuni CSS/composables di sistema.

## 5. Miglioramenti reali piu' forti

### Frontend / orchestrazione
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`: `696 -> 219`
- `nuxt-spedizionefacile-master/pages/account/amministrazione/prezzi.vue`: `2178 -> 266`
- `nuxt-spedizionefacile-master/pages/account/account-pro.vue`: `534 -> 130`
- `nuxt-spedizionefacile-master/pages/riepilogo.vue`: `159` su `HEAD`, molto piu' piccolo del vecchio monolite storico
- `nuxt-spedizionefacile-master/components/Preventivo.vue`: `273`

### Backend / spedizioni e pagamenti
- `laravel-spedizionefacile-main/app/Http/Controllers/StripeController.php`: `213`
- `laravel-spedizionefacile-main/app/Services/Brt/ShipmentService.php`: `257`
- `laravel-spedizionefacile-main/app/Services/Brt/PudoService.php`: `218`
- `laravel-spedizionefacile-main/app/Http/Controllers/BrtController.php`: `285`

### Dominio prodotto
Il salto piu' importante non e' solo sulla pulizia, ma sul fatto che oggi il dominio espone davvero:
- PUDO pubblico
- tracking pubblico e autenticato
- create / confirm / delete shipment
- label download
- invoice PDF
- pickup
- bordero
- send-documents
- update PUDO e regenerate-label da admin

## 6. Problemi principali ancora aperti

### Bug/fallimenti logici reali
1. **Conteggio colli errato nelle email nuove**
   - `order-confirmation.blade.php:62-70`
   - `shipment-status.blade.php:108-110`
   Le view contano i record `packages`, non la quantita' reale dei colli.

2. **Documentazione/listener non riallineati**
   - `EventServiceProvider.php:25-39`
   - `SendOrderConfirmation.php:5-12, 25, 50`
   Il listener e' registrato su `OrderPaid`, ma commenti e type-hint parlano ancora da `OrderCreated`.

3. **Debt spostato, non finito**
   Il progetto ha meno pagine giganti, ma il debito si vede ora in:
   - `assets/css/main.css` (`1479`)
   - `assets/css/shipment-step.css` (`1412`)
   - `composables/useAdminPrezzi.js` (`1163`)
   - `composables/useShipmentStepValidation.js` (`1011`)
   - `composables/useAddressForm.js` (`967`)
   - `composables/useCheckout.js` (`924`)
   - `composables/usePreventivo.js` (`878`)

4. **Duplicazioni residue**
   - doppio file `utils/shipmentServicePricing.js` e `utils/utils/shipmentServicePricing.js`
   - doppio file `utils/shipmentFlowState.js` e `utils/utils/shipmentFlowState.js`
   - naming incoerente `composables/UseAdminImage.js`

## 7. Cosa e' certificato e cosa no

### Verificato staticamente con buona confidenza
- struttura commit e milestone
- copertura route BRT/PUDO/documenti
- stato dei file critici e delle dimensioni residue
- esistenza e distribuzione delle suite test
- presenza di rischi aperti nel codice e nella documentazione

### Non ancora certificato runtime da questo ambiente
- build frontend su toolchain coerente con `Node >=20`
- esecuzione reale test unit/e2e frontend
- esecuzione reale test Laravel da questa shell
- flusso end-to-end BRT/PUDO/etichette/documenti

## 8. Verdetto finale

`HEAD/main` e' una base molto piu' seria di quella storica da cui partiva il piano. Il refactor ha prodotto miglioramenti autentici in architettura, dominio prodotto e leggibilita'.

Pero' il progetto non e' ancora nel punto promesso dal piano piu' ambizioso:
- non e' ancora "super facile" per un junior in tutte le zone
- la UX/UI non e' ancora abbastanza coerente pagina per pagina
- la certificazione runtime completa non c'e' ancora
- restano alcuni bug e rischi strutturali da chiudere

Sintesi netta:
- **refactor promosso**
- **dominio BRT promosso con riserva runtime**
- **UX/UI ancora parziale**
- **cleanup non ancora finito**
