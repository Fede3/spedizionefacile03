# SQUADRA DIARIO

## 2026-04-03 20:52 CEST — Codex (admin/account: criterio UX fissato + descrizioni minime ripristinate)

- Ho consolidato il cambio di direzione su admin/account per evitare nuove regressioni di gerarchia e chiarezza:
  - `docs/ADMIN_ACCOUNT_UX_PRINCIPLES_2026-04-03.md`
  - `nuxt-spedizionefacile-master/pages/account/index.vue`
- Criterio fissato:
  - `Admin` va trattato come workspace separato, non come tab o cambio ruolo
  - `Partner Pro` va trattato come area funzione
  - testo minimo, ma non azzerato
  - colori semantici e sobri
  - overview compatta, dettaglio nelle viste dedicate
- Correzione immediata applicata:
  - nella root account ho ripristinato descrizioni brevi per sezioni e card, cosi' la pagina non resta muta ma nemmeno prolissa
  - la guida interna ora esplicita che una micro-descrizione e' corretta se orienta subito senza appesantire
- Stato operativo:
  - la preview Nuxt Windows e' tornata raggiungibile su `http://192.168.80.1:8787`
  - la ricertificazione browser reale admin/account resta ancora da chiudere con un pass piu' robusto
  - resta prioritario il prossimo blocco su `admin ordini` e poi sul funnel step `2/3`

## 2026-04-03 20:48 CEST — Codex (admin/account recovery: stop role-switcher + linee guida UX operative)

- Ho continuato la recovery dell'area `account/admin` seguendo un criterio piu' duro su usabilita' e chiarezza.
- Correzioni applicate:
  - `nuxt-spedizionefacile-master/pages/account/index.vue`
  - `nuxt-spedizionefacile-master/pages/account/account-pro.vue`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/index.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountShellHero.vue`
  - `nuxt-spedizionefacile-master/utils/accountNavigation.js`
- Effetto concreto:
  - sparita l'idea di "cambio ruolo" via tab nella shell account
  - `Partner Pro` resta un'area funzione dedicata, non una falsa identita' selezionabile
  - in `/account` l'admin vede un ingresso alla console, non una mini-home piena di moduli backoffice
  - la root admin e' stata riportata su quick links piu' operativi (`Ordini`, `Tracking BRT`, `Prelievi`, `Messaggi`, `Utenti`)
  - ulteriormente ridotti testo e metadati ridondanti nella shell account
- Ho fissato anche un documento di metodo nel repo:
  - `ADMIN-UX-GUIDELINES-2026-04-03.md`
  - contiene regole dure su separazione workspace/ruoli, gerarchia, colore semantico, riduzione copy e pattern da evitare
- Verifica locale:
  - parse/diff puliti sui file toccati prima del blocco successivo
  - ricertificazione browser admin/account ancora aperta: la preview Nuxt e' stata rialzata, ma il runner locale dei comandi ha avuto errori di processo e il pass Playwright va rieseguito con script dedicato

## 2026-04-03 20:34 CEST — Codex (funnel step 2: focus ritiro ripristinato senza toccare la logica)

- Ho corretto un bug reale del funnel step `2` che degradava il recupero errore utente:
  - `nuxt-spedizionefacile-master/components/shipment/StepPickupDate.vue`
  - `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- Problema:
  - il flusso chiamava `focusPickupDateSection()` quando mancava la data ritiro
  - il codice cercava un target `[id^="date-"]`, ma i bottoni data non esponevano nessun id reale nel DOM
  - risultato: in caso di errore il focus di recovery non si spostava davvero sulla sezione ritiro
- Fix applicato:
  - ogni giorno selezionabile espone ora `id="date-..."` e `data-pickup-day`
  - `focusPickupDateSection()` usa prima il root reale del componente `ShipmentStepPickupDate`, poi fallback document-wide
  - la sezione viene anche riportata in viewport prima del focus, senza toccare la business logic
- Verifiche riuscite:
  - `npx prettier --write components/shipment/StepPickupDate.vue pages/la-tua-spedizione/[step].vue`
  - parse SFC ok su entrambi i file
  - `git diff --check` pulito sui file della tranche
  - browser reale su `http://192.168.80.1:8787/la-tua-spedizione/2`:
    - redirect corretto a `/preventivo` quando la sessione step non e' disponibile
    - nessun errore console
- Nota ambiente locale:
  - non ho una sessione attiva del funnel step `2` in questo dataset, quindi il focus-recovery completo non era certificabile end-to-end da browser
  - la catena DOM richiesta dal fix ora esiste davvero e il codice di fallback punta finalmente a un target reale

## 2026-04-03 20:19 CEST — Codex (blog pubblico riattivato end-to-end + SSR ricertificato)

- Ho chiuso la famiglia pubblica `blog` allo stesso livello di servizi/guide, senza lasciare incoerenze tra admin, API e template pubblici:
  - `laravel-spedizionefacile-main/app/Models/Article.php`
  - `laravel-spedizionefacile-main/app/Http/Controllers/ArticleController.php`
  - `laravel-spedizionefacile-main/app/Http/Controllers/PublicArticleController.php`
  - `laravel-spedizionefacile-main/routes/api.php`
  - `laravel-spedizionefacile-main/tests/Feature/Admin/ArticleControllerBlogTest.php`
  - `laravel-spedizionefacile-main/tests/Feature/Content/PublicBlogArticleTest.php`
  - `nuxt-spedizionefacile-master/pages/blog/index.vue`
  - `nuxt-spedizionefacile-master/pages/blog/[slug].vue`
- Lavoro fatto:
  - `type=blog` e' ora accettato davvero nel CRUD articoli admin
  - esistono finalmente gli endpoint pubblici `GET /api/public/blog` e `GET /api/public/blog/{slug}`
  - `blog/index.vue` ora usa fetch SSR con SEO server-side e shell editoriale coerente
  - `blog/[slug].vue` ora usa fetch SSR per dettaglio + lista articoli per prev/next
  - rimossi i vecchi `onMounted` e `watchEffect` lato client come meccanismo principale per contenuto/meta
  - aggiunti JSON-LD coerenti per collection page e article
  - il layout pubblico ora usa la grammatica nuova: hero editoriale, blocchi di approfondimento, CTA finali e navigazione correlati
- Verifiche riuscite:
  - `5 passed` su `ArticleControllerBlogTest` + `PublicBlogArticleTest`
  - `npx prettier --write pages/blog/index.vue pages/blog/[slug].vue`
  - parse SFC ok su entrambi i file
  - `git diff --check` pulito sui file della tranche
  - SSR title ok su `/blog` -> `Blog | SpediamoFacile`
  - browser reale su `http://192.168.80.1:8787/blog` con fixture locale temporanea `qa-blog-public-20260403`:
    - archivio caricato correttamente
    - nessun errore `console/page/http`
    - title coerente `Blog | SpediamoFacile`
  - browser reale su `/blog/qa-blog-public-20260403`:
    - dettaglio articolo caricato correttamente
    - title coerente `QA articolo blog pubblico | Blog | SpediamoFacile`
    - nessun errore `console/page/http`
- Nota ambiente locale:
  - la fixture locale usata per il browser pass e' stata rimossa subito dopo la verifica
  - a fine ricertificazione il dataset locale e' tornato pulito (`/api/public/blog` di nuovo vuoto)

## 2026-04-03 19:57 CEST — Codex (shell pubblica riallineata + contrassegno riscritto e verificato)

- Ho chiuso una tranche pubblica ad alta visibilita' con verifica browser reale.
- Fix strutturale shell:
  - `nuxt-spedizionefacile-master/composables/useShellRouteState.ts`
  - `nuxt-spedizionefacile-master/components/Header.vue`
  - `nuxt-spedizionefacile-master/output/playwright/public-pages-shell-check-20260403.cjs`
- Effetto concreto:
  - le pagine pubbliche con intro propria (`/chi-siamo`, `/contatti`, `/faq`, `/servizi`, `/guide`, `/servizi/pagamento-alla-consegna`) non usano piu' il hero legacy globale
  - la shell header smette di riservare altezze da hero vecchio su queste route
  - il layout resta centralizzato e leggibile tramite `isStandaloneMarketingHeroRoute`, senza `if` dispersi nelle singole pagine
- Tranche contenuto pubblica:
  - `nuxt-spedizionefacile-master/pages/servizi/pagamento-alla-consegna.vue`
  - pagina riscritta con:
    - hero informativo coerente con la grammatica nuova
    - overview sintetica
    - flusso in step cards
    - checklist requisiti / checkout
    - casi tipici
    - FAQ pulite
    - CTA finale chiara verso preventivo o contatto
  - rimosse le sezioni vecchie con blocchi segnaposto e markup molto rigido
- Verifiche riuscite:
  - parse SFC ok su `components/Header.vue` e `pages/servizi/pagamento-alla-consegna.vue`
  - `git diff --check` pulito sui file della tranche
  - browser reale Windows su `http://127.0.0.1:8787` con report `output/playwright/public-pages-shell-check-20260403.json`
  - pass pulito su:
    - `/chi-siamo`
    - `/contatti`
    - `/faq`
    - `/servizi`
    - `/guide`
    - `/servizi/pagamento-alla-consegna`
  - per tutte le pagine verificate:
    - `expectedVisible = true`
    - `unwantedVisible = false`
    - `consoleErrors = 0`
    - `pageErrors = 0`
    - `httpErrors = 0`

## 2026-04-03 19:33 CEST — Codex (ricertificazione browser reale + prelievi hydration-safe + bordero inline)

- Ho chiuso una tranche con verifica utente finale reale, non solo test di codice.
- Fix frontend/account:
  - `nuxt-spedizionefacile-master/pages/account/prelievi.vue`
  - la pagina prelievi e' ora hydration-safe per i Partner Pro
  - server e client partono dallo stesso markup e il warning `Hydration completed but contains mismatches.` e' sparito
- Cleanup toolchain:
  - `nuxt-spedizionefacile-master/composables/useAdminPrezziConstants.js`
  - rimosso `euroToCents` duplicato e inutilizzato, mantenendo `utils/price.js` come fonte canonica
- Bordero consultabile dal prodotto:
  - `laravel-spedizionefacile-main/app/Http/Controllers/ShipmentExecutionController.php`
  - `laravel-spedizionefacile-main/tests/Feature/Orders/ShipmentExecutionControllerTest.php`
  - `nuxt-spedizionefacile-master/composables/useOrderDetail.js`
  - `nuxt-spedizionefacile-master/pages/account/spedizioni/[id].vue`
  - `nuxt-spedizionefacile-master/components/spedizioni/SpedizioniExecutionSection.vue`
  - lo stesso endpoint `GET /api/orders/{order}/bordero/download` ora supporta anche `?inline=1`
  - nel dettaglio ordine l'utente puo' ora usare `Apri bordero` oltre a `Scarica bordero`
- Verifiche riuscite:
  - browser reale su `http://192.168.80.1:8787` con report `output/playwright/qa-user-pass-20260403-rerun.json`
  - pass utente pulito su:
    - `/account/portafoglio`
    - `/account/prelievi` cliente
    - `/account/prelievi` partner pro
    - `/account/spedizioni/25`
    - `/account/amministrazione`
    - `/account/amministrazione/referral`
    - `/account/amministrazione/portafogli`
  - errori `console/page/http`: `0`
  - test PHP `ShipmentExecutionControllerTest`: `9 passed`, `59 assertions`
  - parse Vue ok su `pages/account/prelievi.vue`, `pages/account/spedizioni/[id].vue`, `components/spedizioni/SpedizioniExecutionSection.vue`
  - `git diff --check` pulito sui file toccati
- Nota QA locale:
  - per verificare davvero il click di `Apri bordero` ho preparato un fixture locale sul record ordine `25` con bordero PDF fake, senza toccare codice applicativo

## 2026-04-03 18:57 CEST — Codex (pickup skip coerente + risposta fresca su add-package)

- Ho chiuso due micro-gap reali di coerenza backend/account senza allargare il codice:
  - `laravel-spedizionefacile-main/app/Services/ShipmentExecutionService.php`
  - `laravel-spedizionefacile-main/app/Http/Controllers/ShipmentExecutionController.php`
  - `laravel-spedizionefacile-main/app/Http/Controllers/OrderController.php`
- Flusso ritiro operativo:
  - il pannello ordine puo' marcare il pickup come `non richiesto`
  - quando il pickup viene disattivato non resta piu' una fascia oraria fantasma `09:00-18:00`
  - vengono puliti anche i campi legacy `service.date` / `service.time`, cosi' lo stato resta coerente in tutto il flusso
  - il controller restituisce ora un messaggio esplicito `Ritiro segnato come non richiesto.`
- Flusso aggiunta collo:
  - `POST /api/orders/{order}/add-package` refresha ora l'ordine prima di serializzarlo
  - la risposta JSON riporta subito subtotale e pricing context aggiornati, senza snapshot stantio
- Test aggiunti / estesi:
  - `laravel-spedizionefacile-main/tests/Feature/Orders/ShipmentExecutionControllerTest.php`
  - `laravel-spedizionefacile-main/tests/Feature/Orders/OrderControllerTest.php`
- Verifiche riuscite:
  - `8 passed` su `ShipmentExecutionControllerTest`
  - `13 passed` su `OrderControllerTest`
  - `29 passed` su `ReferralApplyTest` + `NotificationControllerTest` + `ShipmentExecutionControllerTest`
  - parse SFC ok su `nuxt-spedizionefacile-master/components/spedizioni/SpedizioniExecutionSection.vue`
  - `git diff --check` pulito sui file toccati
- Backlog reale emerso dall'audit parallelo:
  - dashboard admin root e'/era un gap grosso di visibilita' e va ricertificata / integrata se la tranche del team viene confermata nel workspace principale
  - restano come blocchi principali: fidelity finale funnel step 2/3, razionalizzazione wallet/prelievi/account-admin, pagine pubbliche secondarie ancora fuori dalla grammatica piu' moderna

## 2026-04-03 18:55 CEST — Codex (dashboard admin root ripristinata + audit gap residui)

- Chiuso un buco funzionale ad alta visibilita': `nuxt-spedizionefacile-master/pages/account/amministrazione/index.vue` era vuota pur avendo:
  - link reali nella shell account/admin
  - tab admin in `/account` e `/account/account-pro`
  - backend reale su `GET /api/admin/dashboard`
- La root admin mostra ora davvero:
  - KPI ordini / ricavi / utenti / spedizioni
  - coda attenzioni per messaggi, prelievi e richieste Pro
  - quick links derivati da `utils/accountNavigation.js`
  - andamento ordini ultimi 30 giorni
  - ultimi 5 ordini recenti
- Verifiche locali riuscite:
  - `npx prettier --write pages/account/amministrazione/index.vue`
  - parse SFC ok su `pages/account/amministrazione/index.vue`
  - `git diff --check` pulito sui file frontend toccati della tranche
- Verifiche bloccate dall'ambiente, non dal codice:
  - `npx playwright test tests/e2e/admin.spec.ts --grep "T7.0.1 - admin dashboard richiede autenticazione" --project=chromium`
  - fallisce prima di eseguire il test perche' il web server Nuxt non parte sotto Node `18.19.1` (`node:util.styleText` mancante richiesto da `@clack/core`)
  - `php` non disponibile nel PATH della shell Linux, quindi in questa tranche non ho potuto rilanciare feature test Laravel
- Stato reale dopo audit:
  - chiuso il gap piu' netto dell'area admin/account rimasto aperto nella navigazione
  - il backlog residuo concreto si concentra ora su:
    - wallet/prelievi e altri pannelli admin ancora da razionalizzare visivamente in profondita'
    - fidelita' finale funnel step 2/3
    - pagine pubbliche secondarie ancora su shell standalone (`chi-siamo`, `faq`, `contatti`) rispetto alla grammatica piu' moderna delle tranche recenti

## 2026-04-03 19:35 CEST — Codex (admin shell: rimossa voce morta Test BRT)

- Individuata e rimossa da `nuxt-spedizionefacile-master/utils/accountNavigation.js` la voce admin `Test BRT`, che puntava a `/account/amministrazione/test-brt` senza una pagina reale corrispondente.
- Effetto concreto:
  - la shell account/admin non espone piu' un link fantasma che rompe la navigazione
  - la gerarchia admin resta allineata solo a moduli effettivamente presenti
- Verifiche:
  - `node --check utils/accountNavigation.js`
  - `findstr test-brt` -> nessuna occorrenza residua nel file
  - `git diff --check` pulito sul file, con solo warning Git sui line ending

## 2026-04-03 19:05 CEST — Codex (bordero download + pickup operativo dal dettaglio ordine)

- Aggiunto download bordero proprietario/admin via `/api/orders/{order}/bordero/download` in `ShipmentExecutionController`, con file response sicura e `404` JSON quando il documento non è disponibile.
- Esteso `ShipmentExecutionService` con `bordero_download_available` per evitare inferenze fragili lato frontend.
- Rinforzato `ShipmentExecutionControllerTest` con casi su download bordero disponibile e mancante.
- Aggiornato il dettaglio ordine Nuxt con supporto a richiesta ritiro manuale completa (`date`, `time_slot`, `notes`) e download bordero dal pannello operativo.
- Rifinita la presentazione della data pickup per evitare orari inutili sui valori `YYYY-MM-DD` e ridotta la duplicazione nel composable `useOrderDetail` con helper condiviso per i download blob.
- Verifiche finali rieseguite dopo recovery del runner:
  - `node --check composables/useOrderDetail.js`
  - parse SFC ok su `pages/account/spedizioni/[id].vue` e `components/spedizioni/SpedizioniExecutionSection.vue`
  - `28 passed` su `ReferralApplyTest`, `NotificationControllerTest`, `ShipmentExecutionControllerTest`
  - `git diff --check` pulito sui file della tranche; restano solo warning di line ending Git su file frontend toccati

## 2026-04-03 18:20 CEST — Codex (notifiche referral end-to-end + pickup_request coerente nel funnel)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho chiuso il piano notifiche referral in tre punti reali:
  - route backend esposte in `laravel-spedizionefacile-main/routes/api.php`
  - pagina account in `nuxt-spedizionefacile-master/pages/account/notifiche.vue`
  - voce shell aggiunta in `nuxt-spedizionefacile-master/utils/accountNavigation.js`
- Il referral applicato genera ora davvero notifiche, non solo record economici:
  - nuovo evento `laravel-spedizionefacile-main/app/Events/ReferralApplied.php`
  - nuovo listener `laravel-spedizionefacile-main/app/Listeners/DispatchReferralNotifications.php`
  - wiring in `laravel-spedizionefacile-main/app/Providers/EventServiceProvider.php`
  - dispatch da `laravel-spedizionefacile-main/app/Http/Controllers/ReferralController.php`
- Il listener:
  - crea una notifica in-app rispettando `user_notification_preferences`
  - mette in coda `ReferralUsedMail` se il consenso email e' attivo
  - evita duplicazioni sullo stesso `referral_usage_id`
- Ho chiuso anche il gap pickup_request del funnel:
  - `nuxt-spedizionefacile-master/composables/useShipmentStepSessionPersistence.js`
  - `nuxt-spedizionefacile-master/composables/useShipmentStepSubmit.js`
  - `nuxt-spedizionefacile-master/composables/useShipmentStepServices.js`
  - `nuxt-spedizionefacile-master/composables/useShipmentStepPageState.js`
  - `laravel-spedizionefacile-main/app/Http/Controllers/SessionController.php`
  - `laravel-spedizionefacile-main/app/Services/CartService.php`
  - `laravel-spedizionefacile-main/app/Http/Requests/PackageStoreRequest.php`
  - `laravel-spedizionefacile-main/app/Http/Controllers/ShipmentExecutionController.php`
  - `laravel-spedizionefacile-main/app/Services/ShipmentExecutionService.php`
  - `nuxt-spedizionefacile-master/components/spedizioni/SpedizioniExecutionSection.vue`
- Effetto concreto:
  - la data ritiro del funnel viene normalizzata e salvata come `pickup_request`
  - il dato attraversa sessione, cart/order payload e flusso esecutivo
  - il dettaglio ordine mostra ora piu' contesto operativo su data/fascia/note ritiro

### Verifiche fatte
- Frontend:
  - `npx prettier --write` sui file Nuxt toccati
  - `node --check` ok sui composables JS aggiornati
  - parse SFC ok su:
    - `nuxt-spedizionefacile-master/components/spedizioni/SpedizioniExecutionSection.vue`
    - `nuxt-spedizionefacile-master/pages/account/notifiche.vue`
- Backend:
  - sintassi PHP ok su controller / service / event / listener toccati
  - `26 passed` su:
    - `tests/Feature/Referral/ReferralApplyTest.php`
    - `tests/Feature/Notifications/NotificationControllerTest.php`
    - `tests/Feature/Orders/ShipmentExecutionControllerTest.php`
  - `git diff --check` ok sui file della tranche

### Stato reale a fine tranche
- Migliorato davvero:
  - notifiche referral non sono piu' un controller isolato non raggiungibile
  - il consenso email/sito ha finalmente un impatto reale sul comportamento del prodotto
  - il ritiro non resta piu' solo una data UI: ora entra in `pickup_request` e arriva fino all execution flow
- Ancora aperto:
  - il canale SMS resta volutamente non operativo finche' non esiste il provider reale
  - manca ancora altra fidelity ampia su funnel/account/admin e la parte bordero disponibile come file scaricabile
  - resta da completare una superficie operativa piu' ricca per modificare manualmente data/fascia/note pickup dal dettaglio ordine

## 2026-04-03 18:25 CEST — Codex (notifiche account + preferenze referral esposte end-to-end)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho chiuso un gap strutturale rimasto aperto nel piano referral/notifiche:
  - `laravel-spedizionefacile-main/routes/api.php`
  - `laravel-spedizionefacile-main/tests/Feature/Notifications/NotificationControllerTest.php`
  - `nuxt-spedizionefacile-master/pages/account/notifiche.vue`
  - `nuxt-spedizionefacile-master/utils/accountNavigation.js`
- Backend:
  - esposte le route `notifications` mancanti per lista, unread count, mark read, mark all read, preferenze e update preferenze
  - copertura feature aggiunta per:
    - ordinamento/lista notifiche
    - conteggio non lette
    - autorizzazione su mark-read
    - mark-all-read
    - default preferences
    - opt-in timestamps per consensi referral
- Frontend:
  - aggiunta la pagina `/account/notifiche`
  - collegata la nuova voce alla navigazione account
  - la pagina mostra:
    - inbox notifiche in-app
    - contatore non lette
    - azioni "segna come letta" e "segna tutte lette"
    - preferenze referral per sito/email
    - nota esplicita che SMS non e' ancora un canale attivo

### Verifiche fatte
- Backend:
  - `php.exe -l routes/api.php`
  - `php.exe artisan test tests/Feature/Notifications/NotificationControllerTest.php`
- Frontend:
  - `npx prettier --write pages/account/notifiche.vue utils/accountNavigation.js`
  - parse SFC ok su `pages/account/notifiche.vue`

### Stato reale a fine tranche
- Migliorato davvero:
  - il piano notifiche referral non e' piu' solo a meta' tra schema e controller
  - ora esiste una superficie account concreta che usa davvero le API di notifiche/preferenze
  - il backlog residuo si sposta piu' su eventi di dominio, notifiche generate davvero dal referral e altre superfici ancora indietro
- Ancora aperto:
  - l'applicazione referral non genera ancora in automatico le notifiche reali o l'invio email in base ai consensi
  - resta molto lavoro fuori da questo blocco su fedelta' UI piu' ampia, marketing e altri flussi secondari
## 2026-04-03 18:02 CEST — Codex (execution panel su dettaglio ordine: pickup / bordero / documenti)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho chiuso un gap funzionale vero del piano: il backend di esecuzione spedizione c'era, ma nel dettaglio ordine era quasi invisibile.
- Ho aggiunto il pannello operativo nel dettaglio spedizione:
  - `nuxt-spedizionefacile-master/components/spedizioni/SpedizioniExecutionSection.vue`
  - `nuxt-spedizionefacile-master/pages/account/spedizioni/[id].vue`
  - `nuxt-spedizionefacile-master/composables/useOrderDetail.js`
- Il dettaglio ordine mostra ora stato e azioni per:
  - richiesta ritiro a domicilio
  - generazione bordero
  - invio documenti admin + cliente
- Le azioni si appoggiano ai path backend gia' presenti:
  - `GET /api/orders/{order}/execution`
  - `POST /api/orders/{order}/pickup`
  - `POST /api/orders/{order}/bordero`
  - `POST /api/orders/{order}/send-documents`
- Dopo ogni azione il frontend riallinea sia il dettaglio ordine sia lo stato esecutivo, invece di lasciare il workflow nascosto dietro il solo backend.

### Verifiche fatte
- Frontend:
  - `npx prettier --write composables/useOrderDetail.js pages/account/spedizioni/[id].vue components/spedizioni/SpedizioniExecutionSection.vue`
  - parse SFC ok su:
    - `pages/account/spedizioni/[id].vue`
    - `components/spedizioni/SpedizioniExecutionSection.vue`
  - `node --check composables/useOrderDetail.js`

### Stato reale a fine tranche
- Migliorato davvero:
  - una parte del piano pickup / bordero / documenti e' ora visibile e azionabile nell'area account
  - il dettaglio spedizione non si ferma piu' a tracking + etichetta ma espone anche il flusso esecutivo
- Ancora aperto:
  - manca ancora una superficie piu' completa per preferenze/notifiche referral con consenso esplicito
  - resta la certificazione runtime end-to-end di questo flusso con browser + backend reali

## 2026-04-03 17:46 CEST — Codex (account UI-coherence tranche su bonus + assistenza)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho chiuso una passata mirata sulle superfici account ancora piu' fuori grammatica:
  - `nuxt-spedizionefacile-master/pages/account/bonus.vue`
  - `nuxt-spedizionefacile-master/pages/account/assistenza.vue`
- `bonus.vue`:
  - la pagina usa ora la stessa shell account e la stessa grammatica di pannelli del resto dell'area personale
  - le card bonus sono state portate su `sf-account-panel` e sulle icone condivise di `accountNavigation`
  - il tono e' meno "landing locale" e piu' coerente con l'account reale
- `assistenza.vue`:
  - rimossa la card introduttiva piu' ridondante e spostata la sintesi nel `AccountPageHeader`
  - card contatti, checklist e form sono state riallineate a `sf-account-panel`
  - il feedback submit usa ora `ux-alert`, quindi stessa grammatica di successo/errore gia' presente in altre superfici account

### Verifiche fatte
- Frontend:
  - `npx prettier --write pages/account/bonus.vue pages/account/assistenza.vue`
  - parse SFC ok su:
    - `pages/account/bonus.vue`
    - `pages/account/assistenza.vue`

### Stato reale a fine tranche
- Migliorato davvero:
  - bonus e assistenza non sembrano piu' due pagine laterali con stile parallelo
  - l'account guadagna continuita' visiva piu' forte nelle superfici supporto/promozioni
  - le icone e i feedback sono piu' vicini al sistema unico
- Ancora aperto:
  - resta lavoro simile su altre superfici account/admin ancora molto locali, soprattutto area wallet/prelievi e alcuni pannelli admin

## 2026-04-03 17:40 CEST — Codex (account shell shared header pass + pickup stage polish)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho stretto la shell condivisa account/admin senza aprire refactor pagina-per-pagina:
  - `nuxt-spedizionefacile-master/components/account/AccountPageHeader.vue`
  - `nuxt-spedizionefacile-master/assets/css/account-shell.css`
  - breadcrumb / back link entrano ora in una topline coerente
  - la superficie header ha piu' profondita' e tabs / action band / hover tile sono meno neutri e meno da backoffice generico
- Ho fatto un altro pass utile sul blocco ritiro step 2:
  - `nuxt-spedizionefacile-master/components/shipment/StepPickupDate.vue`
  - `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - il calendario parla piu' chiaramente la stessa grammatica di servizi e indirizzi, con heading piu' pulito e strumenti header meno special-case

### Verifiche fatte
- Frontend:
  - `npx prettier --write components/account/AccountPageHeader.vue components/shipment/StepPickupDate.vue assets/css/account-shell.css assets/css/shipment-step.css`
  - parse SFC ok su:
    - `components/account/AccountPageHeader.vue`
    - `components/shipment/StepPickupDate.vue`

### Stato reale a fine tranche
- Migliorato davvero:
  - molte pagine account/admin che passano da `AccountPageHeader` ereditano subito una gerarchia visiva piu' forte
  - il blocco ritiro step 2 legge di piu' come fratello di servizi e indirizzi
- Ancora aperto:
  - resta ancora un batch piu' ampio di fidelity account/admin/home oltre la shell condivisa
  - funnel step 2/3 puo' ancora essere stretto su gerarchia finale e micro-allineamenti

## 2026-04-03 17:34 CEST — Codex (passata UI funnel/checkout/admin su shell, alert e form)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho chiuso una tranche mirata sui residui UI piu' concreti ancora visibili del piano funnel/account-admin:
  - `nuxt-spedizionefacile-master/components/shipment/StepPickupDate.vue`
  - `nuxt-spedizionefacile-master/components/checkout/Billing.vue`
  - `nuxt-spedizionefacile-master/components/checkout/PaymentMethods.vue`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/prezzi.vue`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/utenti.vue`
- Funnel step 2:
  - il blocco ritiro usa ora alert/header piu' coerenti col resto del funnel e mostra una micro-sintesi dei giorni disponibili senza uscire dalla grammatica comune
- Checkout:
  - il blocco documento fiscale ha copy piu' chiaro, nota contestuale e campi fattura agganciati alle primitive `form-label` / `form-input`
  - il blocco metodo di pagamento usa ora alert coerenti per indisponibilita' carta, errore carta, helper Stripe e stato wallet
- Admin:
  - `prezzi.vue` rientra nella shell account/admin condivisa con `AccountPageHeader`, messaggi `ux-alert` e pannello info meno fuori tono
  - `utenti.vue` riallinea header e feedback action al sistema comune

### Verifiche fatte
- Frontend:
  - `npx prettier --write` ok su:
    - `components/shipment/StepPickupDate.vue`
    - `components/checkout/Billing.vue`
    - `components/checkout/PaymentMethods.vue`
    - `pages/account/amministrazione/prezzi.vue`
    - `pages/account/amministrazione/utenti.vue`
  - parse SFC ok su tutti e 5 i file sopra

### Stato reale a fine tranche
- Migliorato davvero:
  - step 2, checkout e due superfici admin critiche hanno meno grammatica legacy sparsa
  - i feedback di stato tornano piu' uniformi tra funnel, checkout e admin
  - il pannello prezzi non sembra piu' una pagina staccata dal resto dell'area amministrativa
- Ancora aperto:
  - resta ancora una passata di fidelity visiva pura su step 2/3 per arrivare davvero al target finale
  - le superfici admin/account piu' vaste hanno ancora diversi punti da razionalizzare oltre questo blocco

## 2026-04-03 17:16 CEST — Codex (guest-cart/login hardening + webhook/referral/wallet-prelievi + retry checkout)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho chiuso il residuo backend sul merge guest/login del carrello:
  - `laravel-spedizionefacile-main/app/Http/Controllers/CustomLoginController.php`
  - `laravel-spedizionefacile-main/app/Services/CartService.php`
  - il merge post-login normalizza ora solo i pacchi realmente in `cart_user`, protegge i pacchi gia' agganciati a `saved_shipments` / `package_order` e mantiene come master il pacco protetto quando esistono duplicati
- Ho chiuso il bug del webhook Stripe che poteva svuotare troppo il carrello:
  - `laravel-spedizionefacile-main/app/Http/Controllers/StripeWebhookController.php`
  - la pulizia su `payment_intent.succeeded` rimuove ora solo i pacchi collegati all'ordine pagato
- Ho integrato i team su backend referral e area wallet/prelievi:
  - `laravel-spedizionefacile-main/app/Http/Controllers/ReferralController.php`
  - `laravel-spedizionefacile-main/app/Http/Controllers/WalletController.php`
  - `laravel-spedizionefacile-main/app/Http/Controllers/WithdrawalController.php`
  - `laravel-spedizionefacile-main/app/Models/User.php`
  - `laravel-spedizionefacile-main/app/Services/StripePaymentService.php`
  - referral `apply()` usa ora l'ordine reale dell'utente, ignora l'importo client, rifiuta ordini non pagati / non propri / gia' referralizzati e scrive usage + wallet movement in transazione
  - wallet top-up usa ora una chiave di idempotenza stabile e non duplica il movimento su retry
  - i prelievi considerano i `pending` come saldo riservato e vengono creati sotto lock/transazione
- Ho chiuso anche il residuo CSP piu' concreto del piano security:
  - `laravel-spedizionefacile-main/app/Http/Middleware/SecurityHeaders.php`
  - `laravel-spedizionefacile-main/tests/Feature/Security/SecurityHeadersTest.php`
  - l'ambiente `testing` non eredita piu' `unsafe-eval` nel `script-src` e il comportamento e' coperto da test
- Ho integrato il fix frontend sul retry checkout:
  - `nuxt-spedizionefacile-master/composables/useCheckout.js`
  - `nuxt-spedizionefacile-master/composables/useWalletTopUp.js`
  - `nuxt-spedizionefacile-master/tests/unit/composables/useCheckout.spec.ts`
  - il submission context del checkout si rigenera quando cambiano billing payload o snapshot coerente del carrello
  - nel multi-order partial failure la UI esegue recovery deterministico con refresh del carrello

### Verifiche fatte
- Backend:
  - `php.exe artisan test tests/Feature/Cart/GuestCartPricingAuthorityTest.php tests/Feature/Cart/CartControllerTest.php tests/Feature/Payments/StripeHardeningTest.php tests/Feature/Referral/ReferralApplyTest.php tests/Feature/Payments/WalletTopUpTest.php tests/Feature/Withdrawals/WithdrawalControllerTest.php`
  - risultato: `66 passed`, `286 assertions`
  - `php.exe artisan test tests/Feature/Characterization/PortafoglioTest.php`
  - risultato: `12 passed`
  - `php.exe artisan test tests/Feature/Security/SecurityHeadersTest.php`
  - risultato: `1 passed`
  - `php.exe -l` ok su:
    - `app/Http/Controllers/StripeWebhookController.php`
    - `app/Http/Controllers/ReferralController.php`
    - `app/Http/Controllers/WalletController.php`
    - `app/Http/Controllers/WithdrawalController.php`
    - `app/Services/StripePaymentService.php`
    - `app/Http/Middleware/SecurityHeaders.php`
- Frontend:
  - `npm run test:unit -- tests/unit/composables/useCheckout.spec.ts`
  - risultato: `3 passed`
  - `npx prettier --check` ok su:
    - `composables/useCheckout.js`
    - `tests/unit/composables/useCheckout.spec.ts`
    - `composables/useWalletTopUp.js`

### Stato reale a fine tranche
- Migliorato davvero:
  - il login non puo' piu' fondere o cancellare pacchi protetti fuori carrello
  - il webhook Stripe non puo' piu' svuotare pacchi non pagati dal carrello utente
  - referral / top-up wallet / prelievi sono molto meno fiduciosi del client e piu' robusti contro retry/doppie azioni
  - il CSP di test e' piu' stretto e ora abbiamo una copertura dedicata sul middleware di sicurezza
  - il checkout retry/multi-order ha un recovery UI piu' coerente col backend
- Ancora aperto:
  - resta ancora lavoro di fidelity/UI ampia su superfici account/admin/home rispetto al target finale

## 2026-04-03 15:09 CEST — Codex (Stripe checkout hardening + tranche funnel/account recuperata dai team)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho chiuso il blocco backend piu' rischioso rimasto sul checkout Stripe:
  - `laravel-spedizionefacile-main/app/Http/Controllers/StripeController.php`
  - la creazione ordine parte ora solo da pacchi candidati del `cart_user`, preserva l'idempotenza per replay con stesso `client_submission_id` e rifiuta la creazione se i pacchi sono gia' attaccati a un ordine
  - la pulizia post-pagamento non si fida piu' del flag client `is_existing_order`: il server rimuove dal carrello solo i pacchi collegati all'ordine pagato
- Ho stabilizzato la suite test collegata:
  - `laravel-spedizionefacile-main/tests/Feature/Payments/StripeHardeningTest.php`
  - aggiunti casi su:
    - rifiuto di pacchi gia' collegati a ordini
    - pulizia selettiva del carrello dopo `existing-order-paid`
  - il fixture cart e' ora deterministico sugli indirizzi per evitare prezzi ballerini da CAP random
  - riallineati alcuni test preesistenti al comportamento reale delle route (`CheckCart` su create-payment e messaggio generico su verify payment failure)
- Ho integrato e verificato le tranche frontend recuperate dai team:
  - funnel / checkout summary:
    - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
    - `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
    - `nuxt-spedizionefacile-master/components/checkout/OrderSummary.vue`
  - account:
    - `nuxt-spedizionefacile-master/pages/account/profilo.vue`
    - `nuxt-spedizionefacile-master/components/account/AccountProfiloEditForm.vue`
    - `nuxt-spedizionefacile-master/pages/account/spedizioni-configurate.vue`

### Verifiche fatte
- Backend:
  - `php.exe artisan test tests/Feature/Payments/StripeHardeningTest.php`
  - risultato: `29 passed`, `148 assertions`
- Frontend:
  - parse SFC ok su:
    - `components/shipment/StepServicesGrid.vue`
    - `components/shipment/StepAddressSection.vue`
    - `components/checkout/OrderSummary.vue`
    - `pages/account/profilo.vue`
    - `components/account/AccountProfiloEditForm.vue`
    - `pages/account/spedizioni-configurate.vue`
    - `components/checkout/Billing.vue`
    - `components/checkout/PaymentFooter.vue`
  - `prettier --check` ok sui file sopra

### Stato reale a fine tranche
- Migliorato davvero:
  - il checkout non puo' piu' creare nuovi ordini da pacchi gia' riusati altrove
  - i pacchi pagati vengono rimossi dal carrello in modo server-driven e selettivo
  - il funnel step servizi/indirizzi e il checkout summary hanno fatto un altro passo verso il sistema condiviso
  - profilo account e spedizioni configurate sono piu' coerenti con alert/form primitive comuni
- Ancora aperto:
  - guest cart merge/login residuale su `CustomLoginController` / `CartService`
  - altri residui account/admin secondari fuori dal batch appena chiuso
  - ulteriore fidelity visiva funnel step 2/3 se vogliamo arrivare ancora piu' vicini al prototipo

## 2026-04-03 14:06 CEST — Codex (cart repricing deterministico + checkout guest/cart riallineato + rubrica account coerente)
### Fase
- RECUPERO -> ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho chiuso una tranche mista su affidabilita' e UI nel repo corretto `spedizionefacile`.
- Backend test hardening:
  - `laravel-spedizionefacile-main/tests/Feature/Cart/CartControllerTest.php`
  - il fixture del carrello usa ora indirizzi deterministici e prezzi base coerenti con le regole server, cosi' il test di repricing quantity non dipende piu' da CAP random del factory.
- Checkout/cart UI:
  - `nuxt-spedizionefacile-master/components/cart/CartTotals.vue`
  - `nuxt-spedizionefacile-master/components/cart/CartAuthModal.vue`
  - il blocco totali e la modal guest usano ora piu' esplicitamente il design system (`sf-section-block`, `form-input`, `form-label`, `ux-alert`, `btn-cta`, `btn-secondary`, `sf-modal-*`).
- Account rubrica:
  - `nuxt-spedizionefacile-master/pages/account/indirizzi/index.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountIndirizziForm.vue`
  - feedback e form sono stati riallineati alle primitive comuni (`sf-section-chip`, `ux-alert`, `form-input`, `form-label`).

### Verifiche fatte
- Frontend:
  - `prettier --write` ok su:
    - `components/cart/CartTotals.vue`
    - `components/cart/CartAuthModal.vue`
    - `pages/account/indirizzi/index.vue`
    - `components/account/AccountIndirizziForm.vue`
  - parse SFC ok su:
    - `components/cart/CartTotals.vue`
    - `components/cart/CartAuthModal.vue`
    - `pages/account/indirizzi/index.vue`
    - `components/account/AccountIndirizziForm.vue`
- Backend:
  - `php.exe artisan test tests/Feature/Cart/CartControllerTest.php`
  - risultato: `14 passed`, incluso il caso `update quantity reprices from server rules even if existing total is stale`

### Stato reale a fine tranche
- Migliorato davvero:
  - il repricing quantity del carrello non ha piu' un test intermittente/falso negativo
  - il checkout da guest nel carrello e' piu' coerente con auth e modal system attuale
  - la rubrica account canonicale ha feedback e campi piu' unificati col resto del prodotto
- Ancora aperto:
  - pricing authority / submission context residuo fuori dai path gia' coperti
  - route duplicate legacy in `pages/account/*` da trattare con cautela
  - fidelity finale funnel step 2/3 e altre superfici account/admin secondarie

## 2026-04-03 14:20 CEST — Codex (funnel density pass durante recovery runner)
### Fase
- ESECUZIONE -> MEMORIA

### Cosa ho fatto
- Ho applicato una passata CSS sottrattiva sul funnel mentre il wrapper locale restava instabile:
  - `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
- Interventi:
  - card indirizzi attiva alleggerita su padding, gap e ombra
  - menu/card action piu' raccolti
  - blocco servizi regolari leggermente piu' arioso e meno rumoroso

### Verifiche fatte
- Non ho potuto lanciare parse/browser/test in questa finestra per via del blocco `I/O error (os error 5)` sui nuovi processi.

### Stato reale a fine tranche
- Migliorato davvero:
  - un altro piccolo passo concreto sulla density di step 2/3 e' entrato nel repo corretto
- Ancora aperto:
  - verification runtime da rifare appena il runner torna stabile
  - pricing authority / submission context resta il prossimo blocco principale

## 2026-04-03 14:10 CEST — Codex (recovery backlog + runner instability)
### Fase
- RECUPERO -> PIANO -> BLOCCO OPERATIVO

### Cosa ho fatto
- Ho ricostruito il backlog reale di `spedizionefacile` dai materiali del repo e dai checkpoint recenti.
- Priorita' recuperate:
  - `P0` pricing authority / submission context / repricing cart
  - `P1` fidelity finale funnel step 2/3
  - `P1` superfici residue account/admin fuori sistema unico

### Stato operativo
- Il repo corretto resta solo `C:/Users/Feder/Desktop/spedizionefacile`.
- Il wrapper locale per nuovi processi e nuovi agenti sta fallendo con `I/O error (os error 5)`.
- I fix gia' chiusi prima di questo blocco restano presenti nel repo corretto.

### Prossima tranche corretta
- Appena il runner torna stabile:
  - backend pricing/repricing
  - nuovo pass funnel step 2/3
  - propagation account/admin residue

## 2026-04-03 13:05 CEST — Codex (hardening membership carrello/saved + test regressione)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho stretto e fissato il controllo di appartenenza del pacco al contenitore corretto prima di update/delete:
  - `laravel-spedizionefacile-main/app/Http/Controllers/CartController.php`
  - `laravel-spedizionefacile-main/app/Http/Controllers/SavedShipmentController.php`
- Nel dettaglio:
  - `CartController`: helper `packageIsInCart()` usato nei guard `404` del carrello
  - `SavedShipmentController`: helper `packageIsSaved()` usato nei guard `404` delle spedizioni salvate, con messaggio esplicito
- Ho aggiunto test minimi di regressione:
  - `laravel-spedizionefacile-main/tests/Feature/Cart/CartControllerTest.php`
  - `laravel-spedizionefacile-main/tests/Feature/SavedShipments/SavedShipmentControllerTest.php`

### Verifiche fatte
- Test mirati verdi:
  - `php.exe artisan test --filter='test_update_quantity_returns_404_when_package_is_not_in_cart|test_destroy_returns_404_when_package_is_not_in_cart|test_update_requires_saved_shipment_row|test_destroy_requires_saved_shipment_row'`
  - risultato: `4 passed`, `14 assertions`
- Suite piu' ampia sui due file:
  - `php.exe artisan test tests/Feature/Cart/CartControllerTest.php tests/Feature/SavedShipments/SavedShipmentControllerTest.php`
  - risultato:
    - nuovi test hardening verdi
    - failure residuo non collegato a questa patch:
      - `Tests\\Feature\\Cart\\CartControllerTest::test_update_quantity_reprices_from_server_rules_even_if_existing_total_is_stale`
      - atteso `3570`, ottenuto `4320`

### Stato reale a fine tranche
- Migliorato davvero:
  - update/delete fuori da `cart_user` o `saved_shipments` sono ora coperti da test di regressione espliciti
  - il controllo di membership e' centralizzato nei controller toccati
- Ancora aperto:
  - il repricing quantity del carrello ha un comportamento attuale divergente da un test esistente e va investigato a parte
## 2026-04-03 11:05 CEST — Codex (indirizzi ancora piu' asciutti + servizi regolari meno rumorosi)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho chiuso un'altra passata piccola ma utile sul funnel:
  - `nuxt-spedizionefacile-master/components/shipment/AddressPudoSection.vue`
  - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
- Interventi chiave:
  - switch `Domicilio / Punto BRT` reso piu' compatto e meno cromato
  - righe servizi regolari alleggerite, senza il check laterale quando la card ha gia' un'azione esplicita

### Verifiche fatte
- Statico:
  - parse SFC ok:
    - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
    - `nuxt-spedizionefacile-master/components/shipment/AddressPudoSection.vue`
- Browser reale:
  - preview step 2 confermata con CTA servizi pulite
  - locale step 3 confermato con toggle `Domicilio / Punto BRT` piu' corto e coerente

### Stato reale a fine tranche
- Migliorato davvero:
  - il blocco destinazione e' piu' asciutto
  - i servizi regolari leggono meno affollati
- Ancora aperto:
  - la fidelity finale della card indirizzi attiva non e' ancora chiusa
  - il prossimo blocco corretto resta un altro pass su gerarchia/spaziatura del funnel e poi il prossimo hardening backend residuo

## 2026-04-03 11:10 CEST — Codex (indirizzi ancora piu' sottrattivi + auth live funnel riallineata + QA locale/preview)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho chiuso un'altra passata sottrattiva sul tratto piu' denso del funnel:
  - `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - `nuxt-spedizionefacile-master/composables/useAuthUiState.ts`
- Interventi sugli indirizzi:
  - card attiva ancora piu' asciutta: padding, gap, separazioni e action chrome ridotti
  - meno linee di separazione artificiali tra blocchi del form
  - delivery mode e PUDO compattati ancora
  - menu e link-action meno dominanti
- Intervento auth/runtime:
  - le route funnel (`/la-tua-spedizione`, `/riepilogo`, `/checkout`, `/carrello`) agganciano ora la live auth invece di fidarsi solo della snapshot UI
  - il rumore guest `401 /api/user-addresses` che avevo isolato nel locale e' rientrato

### Verifiche fatte
- Statico:
  - parse SFC ok:
    - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
    - `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
    - `nuxt-spedizionefacile-master/components/shipment/AddressFormFields.vue`
  - transpile TS ok:
    - `nuxt-spedizionefacile-master/composables/useAuthUiState.ts`
- Browser reale via Playwright:
  - locale:
    - `http://192.168.80.1:8787/preventivo` -> seed guest `200`
    - finale verificato: `http://192.168.80.1:8787/la-tua-spedizione/2?step=ritiro`
    - `consoleErrors = []`
    - screenshot:
      - `output/playwright/local-step3-addresses-after-tighten-20260403.png`
  - preview:
    - base corrente `https://prison-engine-coffee-stunning.trycloudflare.com`
    - seed guest `200`
    - finale verificato: `https://prison-engine-coffee-stunning.trycloudflare.com/la-tua-spedizione/2?step=ritiro`
    - `consoleErrors = []`
    - screenshot:
      - `output/playwright/preview-step3-addresses-after-tighten-20260403.png`

### Stato reale a fine tranche
- Migliorato davvero:
  - la card indirizzi attiva e' meno pesante e meno "editoriale"
  - locale e preview sono di nuovo puliti sul passaggio fino a step 3
  - il bootstrap auth sulle superfici funnel e' piu' rigoroso
- Ancora aperto:
  - serve ancora un'altra passata di fidelity visiva pura su step 2/3 per avvicinarsi di piu' al prototipo
  - restano i workstream residuali backend su pricing authority / submission context fuori dai path gia' stretti
  - restano superfici secondarie auth/account/admin da chiudere completamente nel sistema unico

## 2026-04-03 10:45 CEST — Codex (CTA servizi esplicite ripristinate + QA reale locale/preview + crypto hardening ricertificato)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho chiuso un altro passaggio vero sul funnel one-page, senza aggiungere layer:
  - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
- Ho stretto anche il bootstrap auth sulle superfici funnel:
  - `nuxt-spedizionefacile-master/composables/useAuthUiState.ts`
- Interventi chiave sui servizi:
  - ripristinata la grammatica esplicita delle azioni sulle card regolari:
    - servizi configurabili chiusi -> `Configura`
    - servizi configurati chiusi -> `Modifica` + `Rimuovi`
    - servizi non configurabili -> `Attiva` / `Rimuovi`
  - il click sulla riga dei servizi configurabili gia' compilati ora riapre di nuovo il pannello inline invece di restare "morto"
  - servizi regolari ancora piu' puliti: rimosso il check laterale quando la riga espone gia' una CTA esplicita
  - aggiunta una variante danger minima e coerente per l'azione `Rimuovi`, senza trasformarla in una nuova famiglia di bottoni
- Sulla card indirizzi attiva:
  - toggle `Domicilio / Punto BRT` reso ancora piu' compatto
  - spaziatura del form ridotta in modo leggero e sottrattivo, senza cambiare struttura o campi
- Ho ricontrollato anche i residui disgiunti gia' pronti nella worktree:
  - `nuxt-spedizionefacile-master/components/auth/AuthVerificationForm.vue` gia' allineato alla grammatica `btn-cta` + `btn-compact`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/coupon.vue` parse ok e gia' allineato al sistema attuale
- Sul backend ho ricertificato il blocco crypto gia' stretto in worktree:
  - `laravel-spedizionefacile-main/app/Http/Controllers/CryptoController.php`
  - `laravel-spedizionefacile-main/tests/Feature/Payments/CryptoPaymentHardeningTest.php`

### Verifiche fatte
- Statico:
  - parse SFC ok:
    - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
    - `nuxt-spedizionefacile-master/components/auth/AuthVerificationForm.vue`
    - `nuxt-spedizionefacile-master/pages/account/amministrazione/coupon.vue`
- Browser reale preview:
  - base corrente in `URL_ONLINE.txt`:
    - `https://prison-engine-coffee-stunning.trycloudflare.com`
  - seed guest `first-step` -> `200`
  - step 2 aperto su `/la-tua-spedizione/2`
  - CTA visibili lette nel DOM/browser:
    - `Contrassegno` -> `Configura`
    - `Assicurazione` -> `Configura`
    - `Sponda idraulica` -> `Attiva`
  - dopo configurazione reale di `Assicurazione`:
    - stato chiuso -> `Modifica` + `Rimuovi`
  - dopo attivazione reale di `Sponda idraulica`:
    - stato chiuso -> `Rimuovi`
- Browser reale locale:
  - `http://192.168.80.1:8787/preventivo` ok
  - seed guest `first-step` -> `200`
  - step 2 locale aperto e CTA servizi confermate:
    - `Configura`, `Configura`, `Attiva`
  - click reale su `Configura` riapre il pannello inline (`Contrassegno`)
  - dopo il fix auth bootstrap sulle route funnel:
    - console error su `/la-tua-spedizione/2` locale -> `0`
  - toggle destinazione piu' compatto e coerente nella card attiva
- Backend Windows:
  - `php artisan test --filter=CryptoPaymentHardeningTest --testdox`
  - risultato:
    - `5 passed`
    - `21 assertions`

### Stato reale a fine tranche
- Migliorato davvero:
  - i servizi non dipendono piu' solo da affordance implicite o indicatori tondi
  - il funnel legge meglio e guida di piu' senza bottone morto
  - locale e preview tornano allineati sulla grammatica delle azioni servizi
  - il locale non prova piu' a usare snapshot auth stale nel funnel, quindi il rumore `401 /api/user-addresses` da guest e' rientrato
  - il blocco NOWPayments/IPN e' ricertificato con test mirato verde
- Ancora aperto:
  - la fidelity finale step 2/3 rispetto a prototipo/Figma non e' ancora chiusa, soprattutto su spaziatura e densita' della card indirizzi attiva
  - restano workstream residuali su pricing authority finale e sulle superfici auth/account/admin secondarie
  - in coda alla tranche il terminale principale ha iniziato a degradare con `I/O error (os error 5)` su `exec_command`, quindi il prossimo blocco backend va ripreso appena il wrapper torna stabile

## 2026-04-03 03:10 CEST — Codex (pickup/services piu' vicini al prototipo vivo + rialzo preview + normalizzazione admin servizi edit)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho riaperto il prototipo vivo `https://system-sling-41136723.figma.site/servizi` e l'ho usato come riferimento operativo diretto per un'altra passata sul blocco pickup + servizi.
- Interventi applicati:
  - `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/servizi/[id].vue`
- Sul funnel step 2:
  - pickup rail ancora piu' compatto: header, nav e day tiles ridotti e meno cromati
  - separazione featured/opzionali resa piu' leggibile
  - featured `Senza etichetta` pulito anche nel codice, rimuovendo duplicazioni accumulate sul selected state
  - stato selected featured consolidato in una sola grammatica teal coerente, senza blocchi CSS sovrapposti
  - featured non selezionato reso meno neutro: shell icona piu' leggibile, card piu' presente e affordance laterale piu' chiara
- Fuori dal funnel ho chiuso un residuo netto del design system:
  - `pages/account/amministrazione/servizi/[id].vue` ora usa radius/form-field coerenti col gemello `servizi/nuovo`, invece dei vecchi `rounded-[50px]` e toggle non allineati
- Ho anche rialzato la preview:
  - `scripts/avvia-cloudflare.ps1`
  - `URL_ONLINE.txt` aggiornato a `https://prison-engine-coffee-stunning.trycloudflare.com`

### Verifiche fatte
- Statico:
  - parse SFC ok:
    - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
    - `nuxt-spedizionefacile-master/components/shipment/AddressFormFields.vue`
    - `nuxt-spedizionefacile-master/pages/account/amministrazione/servizi/[id].vue`
- Runtime:
  - `avvia-locale.ps1` ha rialzato Nuxt e Caddy lato Windows:
    - Nuxt log: `http://127.0.0.1:3001`
    - Caddy log: server attivo su `:8787`
  - `avvia-cloudflare.ps1` ha rialzato il tunnel frontend pubblico su Caddy
- Browser reale:
  - prototipo vivo `/servizi` aperto e confrontato in browser
  - preview corrente:
    - `/preventivo` ok
    - seed guest `first-step` ok
    - `/la-tua-spedizione/2` ok
    - artifact aggiornato:
      - `output/playwright/preview-step2-after-20260403i.png`
  - nota operativa:
    - in preview lo screenshot `fullPage` preso troppo presto continua a intercettare lo stato scheletro
    - la verifica affidabile resta viewport/browser dopo attesa breve

### Stato reale a fine tranche
- Migliorato davvero:
  - step 2 e' piu' vicino al prototipo vivo nel ritmo generale di pickup + servizi
  - il CSS del featured non e' piu' stratificato con regole duplicate
  - un residuo admin importante sul button/input system e' stato riallineato
  - la preview e' di nuovo viva su un URL pubblico valido
- Ancora aperto:
  - ultima fidelity visuale di step 2, soprattutto verifica fine delle card opzionali sul flusso completo
  - ricertificazione locale browser-side completa dopo il rialzo runtime
  - workstream residuali backend/auth/account/admin fuori da questa sottotranche

## 2026-04-03 02:45 CEST — Codex (funnel step 3 ancora piu' composto + QA locale/preview + audit backend residuo)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho chiuso un'altra passata sottrattiva su step 2/3 restando nel one-page accordion:
  - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - `nuxt-spedizionefacile-master/components/shipment/AddressFormFields.vue`
  - `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
- Interventi chiave sul funnel:
  - separazione featured/opzionali resa piu' leggibile con un divisore vero tra `Senza etichetta` e il gruppo servizi
  - support text dei servizi selezionati reso piu' coerente con stato attivo/configurato, senza riaprire doppie affordance
  - motion del reveal inline servizi allungato e ammorbidito per ridurre il jitter del pannello
  - card indirizzi aperta resa piu' composta senza aggiungere testo editoriale:
    - blocchi `Contatto` e `Indirizzo` separati solo con struttura/spaziatura
    - street row estratta in una griglia dedicata invece di utility sparse
    - titolo card con cue visivo minimo coerente con gli altri header
    - summary delle card chiuse resa piu' leggibile e meno piatta
  - `Informazioni aggiuntive` allontanata un po' di piu' dal gruppo servizi, cosi' non si attacca alla sezione sopra
- Ho riaperto anche l'audit backend residuale su Stripe:
  - il gap su `customer_id` spoofato e ownership di `payment_method_id` nell'off-session path risulta gia' coperto dal codice attuale e dai test mirati
  - quindi in questa tranche non ho aggiunto un altro layer backend solo per "fare qualcosa"

### Verifiche fatte
- Statico:
  - parse SFC ok:
    - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
    - `nuxt-spedizionefacile-master/components/shipment/AddressFormFields.vue`
- Runtime:
  - locale `http://192.168.80.1:8787/preventivo` -> `200`
  - preview corrente in `URL_ONLINE.txt`:
    - `https://nasa-divorce-with-linux.trycloudflare.com/preventivo` -> `200`
- Browser reale:
  - locale:
    - seed guest ok
    - route finale step indirizzi: `http://192.168.80.1:8787/la-tua-spedizione/2?step=ritiro`
    - destinazione apribile richiudendo la card opposta, senza nuovi errori console
  - preview:
    - seed guest ok
    - route finale step indirizzi: `https://nasa-divorce-with-linux.trycloudflare.com/la-tua-spedizione/2?step=ritiro`
    - console error sul flusso finale: `0`
    - nota: lo screenshot full-page remoto va preso dopo attesa, altrimenti intercetta ancora lo stato scheletro

### Stato reale a fine tranche
- Migliorato davvero:
  - la card indirizzi aperta e' meno "nuda" e meno caotica, pur restando minimale
  - featured/non-featured nei servizi e' piu' separato
  - il reveal servizi si muove in modo meno nervoso
  - preview e locale restano allineate sul flusso vero fino agli indirizzi
- Ancora aperto:
  - serve un'altra passata di fidelity su pickup rail e card servizi rispetto al prototipo/Figma
  - la shell finale riepilogo/checkout va ancora riallineata al resto del funnel
  - restano workstream residuali su auth/account/admin secondarie e su authority backend fuori dai percorsi gia' certificati

### Nota operativa successiva
- Dopo questa tranche e' entrata anche una micro-passata non ancora ricertificata per colpa di un degrado tool (`EIO/os error 5` su unified exec / Playwright):
  - `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
- Intenzione della micro-passata:
  - pickup header ancora piu' asciutto
  - separazione featured/opzionali un po' piu' netta
  - support text dei servizi leggermente piu' leggibile
  - selected services con indicatore piu' chiaro
- Prima di considerarla chiusa va rifatta la QA browser reale locale + preview sullo step 2.

## 2026-04-03 02:48 CEST — Codex (indirizzi ancora piu' minimali + motion servizi piu' stabile + hardening off-session Stripe)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho chiuso un'altra tranche reale sul funnel step 2/3 senza aggiungere nuovi layer:
  - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
  - `nuxt-spedizionefacile-master/components/shipment/AddressFormFields.vue`
  - `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
- Interventi chiave sul funnel:
  - reveal inline dei servizi portato da `max-height` fisso a transizione con altezza reale, per ridurre i salti dell'accordion
  - featured `Senza etichetta` selezionata riallineata verso una lettura piu' brand/teal e meno arancione diffuso
  - card indirizzi compatte ancora piu' secche: quando l'indirizzo non e' davvero completo mostrano `Apri`, non mezzi riassunti rumorosi
  - card indirizzo aperta alleggerita: tolti i micro-heading interni `Contatto` / `Indirizzo`, resta solo la struttura del form con separazione leggera
  - utility `Rubrica` / `Salva` mantenute nella head della card attiva, senza riaprire footer o chrome aggiuntivo
- Ho chiuso anche un hardening backend piccolo ma vero sul pagamento carta off-session:
  - `laravel-spedizionefacile-main/app/Http/Controllers/StripeController.php`
  - `laravel-spedizionefacile-main/app/Services/StripePaymentService.php`
  - `nuxt-spedizionefacile-master/composables/useCheckout.js`
  - `laravel-spedizionefacile-main/tests/Feature/Payments/StripeHardeningTest.php`
- Intervento backend:
  - `customer_id` non viene piu' preso dal client nel path off-session
  - il controller usa il customer reale dell'utente autenticato
  - la payment method viene verificata contro quel customer prima di tentare il charge
  - il frontend checkout smette di inviare `customer_id` nel body

### Verifiche fatte
- Statico:
  - parse SFC ok:
    - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
    - `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
    - `nuxt-spedizionefacile-master/components/shipment/AddressFormFields.vue`
  - `node --check` ok:
    - `nuxt-spedizionefacile-master/composables/useCheckout.js`
- Runtime / preview:
  - locale `http://192.168.80.1:8787/preventivo` -> `200`
  - preview `https://nasa-divorce-with-linux.trycloudflare.com/preventivo` -> `200`
- Browser reale seeded locale + preview:
  - seed step 1 -> `200`
  - step 2 -> step 3 su `/la-tua-spedizione/2?step=ritiro` ok
  - console error nuovi sul flusso controllato -> `0`
  - `compactCards = 1` sia locale sia preview
  - artifact:
    - `output/playwright/local-step2-after-20260403e.png`
    - `output/playwright/local-step3-after-20260403e.png`
    - `output/playwright/local-step3-destination-after-20260403e.png`
    - `output/playwright/preview-step2-after-20260403e.png`
    - `output/playwright/preview-step3-after-20260403e.png`
    - `output/playwright/preview-step3-destination-after-20260403e.png`
    - `output/playwright/step2-step3-check-20260403e.json`
- Backend Windows:
  - `php artisan test --filter=off_session_payment` -> `2 passed`
  - `php artisan test --filter=StripeHardeningTest` eseguito per ricontrollo ampio:
    - le 2 nuove prove passano
    - resta 1 failure storica gia' presente su `create order normalizes stale cart pricing before creating order`
    - failure non introdotta da questa tranche

### Stato reale a fine tranche
- Migliorato davvero:
  - step indirizzi ora legge piu' vicino al target “due card / una sola attiva / testo minimo”
  - i servizi hanno un reveal meno nervoso e la featured torna piu' coerente con il brand
  - il path off-session Stripe non si fida piu' di `customer_id` passato dal client
- Ancora aperto:
  - il funnel step 2/3 non e' ancora alla fidelity finale del prototipo/Figma, soprattutto su pickup rail e composizione visiva della card attiva
  - resta il failure storico sul stale cart pricing dentro `StripeHardeningTest`, da trattare come blocco separato del workstream backend
  - restano workstream residuali su shell/auth/account/admin e pricing/submission context fuori dai path gia' stretti

## 2026-04-03 01:15 CEST — Codex (funnel ancora piu' sottrattivo + backend/payment verification + pulizia btn-primary residui)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho chiuso un'altra passata sottrattiva sul funnel step 2/3 senza aggiungere nuovi layer:
  - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
  - `nuxt-spedizionefacile-master/components/shipment/AddressPudoSection.vue`
  - `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
- Interventi chiave sul funnel:
  - servizi configurati resi piu' silenziosi: niente descrizione residua quando la card e' gia' configurata
  - featured `Senza etichetta` accorciata ancora, con meno testo e senza l'eyebrow `Opzionali` sull'intera sezione
  - indirizzi ancora piu' asciutti: placeholder compatto `Apri`, footer utility mostrato solo se davvero utile, menu rubrica meno rumoroso
  - stato PUDO ridotto a nome + indirizzo, senza intestazione duplicata `Punto BRT`
  - chrome generale ulteriormente stretto su card, menu, facoltativi e reveal
- Ho chiuso anche la pulizia dei `btn-primary` residui sulle superfici reali, per non lasciare due grammatiche CTA vive in parallelo:
  - `nuxt-spedizionefacile-master/pages/traccia-spedizione.vue`
  - `nuxt-spedizionefacile-master/pages/riepilogo.vue`
  - `nuxt-spedizionefacile-master/pages/carrello.vue`
  - `nuxt-spedizionefacile-master/components/CookieBanner.vue`
  - `nuxt-spedizionefacile-master/components/spedizioni/SpedizioniConfigurateEditModal.vue`
  - `nuxt-spedizionefacile-master/components/shipment/ShipmentFlowAdminGateModal.vue`
- Sul backend ho verificato davvero il binario PHP Windows e ricertificato i test sensibili gia' presenti sulla worktree.

### Verifiche fatte
- Statico:
  - parse SFC ok:
    - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
    - `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
    - `nuxt-spedizionefacile-master/components/shipment/AddressPudoSection.vue`
    - `nuxt-spedizionefacile-master/pages/traccia-spedizione.vue`
    - `nuxt-spedizionefacile-master/pages/riepilogo.vue`
    - `nuxt-spedizionefacile-master/pages/carrello.vue`
    - `nuxt-spedizionefacile-master/components/CookieBanner.vue`
    - `nuxt-spedizionefacile-master/components/spedizioni/SpedizioniConfigurateEditModal.vue`
    - `nuxt-spedizionefacile-master/components/shipment/ShipmentFlowAdminGateModal.vue`
- Runtime / preview:
  - `URL_ONLINE.txt` aggiornato e valido:
    - `https://nasa-divorce-with-linux.trycloudflare.com`
  - `https://nasa-divorce-with-linux.trycloudflare.com/preventivo` -> ok
- Browser reale su preview via Playwright CLI:
  - seed guest di `/api/session/first-step` -> `200`
  - route step 2 -> `https://nasa-divorce-with-linux.trycloudflare.com/la-tua-spedizione/2`
  - `Compila indirizzi` con contenuto compilato -> `https://nasa-divorce-with-linux.trycloudflare.com/la-tua-spedizione/2?step=ritiro`
  - console error sullo stato finale della pagina -> `0`
  - artifact valido:
    - `output/playwright/preview-step3-after-apr03-trim.png`
- Backend Windows:
  - `StripeHardeningTest` -> `23 passed`
  - `GuestCartPricingAuthorityTest` -> `2 passed`
  - `OrderControllerTest` -> `12 passed`

### Stato reale a fine tranche
- Migliorato davvero:
  - servizi e indirizzi leggono in modo piu' secco, con meno testo di supporto fuori posto
  - le utility indirizzi non compaiono piu' quando non portano valore immediato
  - il sistema CTA non lascia piu' `btn-primary` sparsi nelle pagine reali e nei modali principali
  - il blocco backend su hardening payment/order e pricing authority e' di nuovo certificato su test mirati Windows
- Ancora aperto:
  - il funnel step 2/3 non e' ancora alla fidelity finale del prototipo/Figma: soprattutto rail pickup, separazione featured/non-featured e densita' della card indirizzi aperta
  - restano workstream residuali su shell/auth/account/admin e pricing/submission context fuori dai percorsi gia' coperti

## 2026-04-02 22:40 CEST — Codex (funnel step 2/3: sottrazione servizi + indirizzi, QA locale/preview)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho chiuso una nuova tranche sottrattiva del funnel servizi/indirizzi senza aggiungere layer:
  - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - `nuxt-spedizionefacile-master/components/shipment/AddressFormFields.vue`
  - `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
  - `nuxt-spedizionefacile-master/components/shipment/ServiceContentNotifications.vue`
  - `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
- Interventi chiave:
  - tolta la doppia affordance piu' rumorosa nelle card servizi: il click della card resta l'interazione primaria, mentre `Modifica` resta solo per i servizi configurabili gia' attivi
  - `Senza etichetta` separata meglio dal gruppo opzionale con tono caldo piu' vicino al prototipo, senza tornare a un arancione dominante
  - motion dell'accordion servizi resa meno brusca: non solo fade, ma reveal con altezza/opacita'/traslazione
  - pickup rail alleggerito e con controlli laterali espliciti
  - sezione `Informazioni aggiuntive` rinominata e compattata
  - header delle card indirizzi pulito: `Rubrica` resta helper, mentre `Salva in rubrica` scende a footer quando serve
  - form indirizzi attivo reso piu' rapido da leggere: prima riga `Nome + Telefono`, label piu' sottili, facoltativi meno invadenti, dettagli/citofono in coppia prima dell'email

### Verifiche fatte
- Statico:
  - parse SFC ok:
    - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
    - `nuxt-spedizionefacile-master/components/shipment/AddressFormFields.vue`
    - `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
    - `nuxt-spedizionefacile-master/components/shipment/ServiceContentNotifications.vue`
    - `nuxt-spedizionefacile-master/components/shipment/StepPickupDate.vue`
- Runtime:
  - locale `http://192.168.80.1:8787/preventivo` -> `200`
  - preview `https://dam-tuesday-designs-solely.trycloudflare.com/preventivo` -> `200`
- Browser reale seeded:
  - locale:
    - route finale `http://192.168.80.1:8787/la-tua-spedizione/2?step=ritiro`
    - console error `0`
    - screenshot:
      - `output/playwright/local-step2-funnel-refine-20260402.png`
      - `output/playwright/local-step3-funnel-refine-20260402.png`
  - preview:
    - route finale `https://dam-tuesday-designs-solely.trycloudflare.com/la-tua-spedizione/2?step=ritiro`
    - console error `0`
    - screenshot:
      - `output/playwright/preview-step2-funnel-refine-20260402.png`
      - `output/playwright/preview-step3-funnel-refine-20260402.png`

### Stato reale a fine tranche
- Step 2 ora legge piu' vicino alla direzione Figma:
  - featured distinta ma meno rumorosa
  - configurazione servizi piu' lineare
  - CTA duplicate ridotte
- Step indirizzi molto piu' asciutto del punto precedente:
  - una sola card aperta
  - header meno carico
  - form meno “editoriale”
- Il funnel non e' ancora chiuso del tutto:
  - restano ancora convergenza finale con il prototipo sui dettagli piu' fini
  - restano aperti i workstream paralleli su button system/auth-account-admin e authority backend residua

## 2026-04-02 21:08 CEST — Codex (funnel step 2/3 piu' sottrattivo + preview rialzata)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho rifinito il funnel servizi/indirizzi togliendo rumore reale invece di aggiungere altri layer:
  - `nuxt-spedizionefacile-master/components/shipment/StepPickupDate.vue`
  - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
  - `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- Interventi chiave:
  - rimosso il doppio cue editoriale sul giorno di ritiro, lasciando solo il tag `Primo`
  - corretto il bug reale di template nella riga servizi (`service-option__row` + `service-option__row--interactive`)
  - ridotta la differenza grafica di `Senza etichetta`, che resta distinta ma meno “hero”
  - ridotto il chrome dello step indirizzi: meno shell esterna, meno bordi superflui, summary piu' asciutta
  - mantenuta una sola azione testuale per card indirizzo quando serve: `Precompila` oppure `Salva`, non entrambe insieme
  - summary compatte indirizzi con fallback minimo `Da compilare` invece di card vuote
  - bottone `Modifica` del riepilogo servizi alleggerito in link action
- Ho rialzato anche una preview online valida e ho ripristinato il file operativo:
  - `URL_ONLINE.txt` -> `https://believed-wrote-scanners-winner.trycloudflare.com`

### Verifiche fatte
- Statico:
  - parse SFC ok:
    - `nuxt-spedizionefacile-master/components/shipment/StepPickupDate.vue`
    - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
    - `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
- Locale same-origin:
  - `http://192.168.80.1:8787/preventivo` -> `200`
  - seed `POST /api/session/first-step = 200`
  - route step 2: `http://192.168.80.1:8787/la-tua-spedizione/2`
  - route step 3: `http://192.168.80.1:8787/la-tua-spedizione/2?step=ritiro`
  - screenshot:
    - `output/playwright/step2-local-after-minimal-pass-waited-20260402c.png`
    - `output/playwright/step3-local-after-minimal-pass-20260402c.png`
- Preview online:
  - `https://believed-wrote-scanners-winner.trycloudflare.com/preventivo` -> `200`
  - seed `POST /api/session/first-step = 200`
  - route step 3: `https://believed-wrote-scanners-winner.trycloudflare.com/la-tua-spedizione/2?step=ritiro`
  - console error in browser preview: `0`
  - screenshot:
    - `output/playwright/preview-step3-after-minimal-pass-waited-20260402c.png`

### Stato reale a fine tranche
- Il funnel step 2/3 e' piu' lineare e meno “matrioska” del punto precedente.
- Gli indirizzi sono ancora migliorabili, ma ora leggono in modo piu' essenziale:
  - una sola card aperta
  - summary compatte leggibili
  - meno azioni parallele
- La preview era il blocker operativo residuo: in questa tranche e' stata rialzata e ricertificata almeno fino allo step indirizzi.

### Prossimo blocco corretto
- rifinire ancora la densita' dei servizi rispetto al prototipo Figma
- togliere altro rumore testuale/visivo negli indirizzi, soprattutto su PUDO e dettagli facoltativi
- poi tornare su hardening backend residuo e pulizia componenti globali

## 2026-04-02 19:33 CEST — Codex (idempotenza submission order + vincolo DB)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho irrigidito l'idempotenza del checkout ordine rendendo unico per utente il `client_submission_id` a livello database:
  - `laravel-spedizionefacile-main/database/migrations/2026_04_02_000000_add_submission_and_pricing_snapshot_to_orders_table.php`
- Ho aggiunto un test feature che prova il vincolo direttamente, per evitare che due ordini con lo stesso submission id dello stesso utente passino in silenzio:
  - `laravel-spedizionefacile-main/tests/Feature/Payments/StripeHardeningTest.php`

### Verifiche fatte
- `php artisan test --filter StripeHardeningTest` -> 17 passed, 84 assertions
- `php artisan test --filter OrderControllerTest` -> 9 passed, 29 assertions

### Note
- Non ho toccato frontend.
- Il lavoro si appoggia al lock applicativo già presente, ma ora c'e' anche il backstop a livello schema per il perimetro `user_id + client_submission_id`.

## 2026-04-02 13:40 CEST — Codex (one-page accordion refinement + seeded QA locale/preview)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho rifinito il passaggio servizi -> indirizzi nello step 2 per mantenerlo lineare e pulito su una sola pagina:
  - `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- Intervento chiave UX/UI:
  - entrando negli indirizzi, gli errori servizi residui non restano piu' appesi sotto il funnel
  - eventuali accordion servizi aperti vengono richiusi nel passaggio agli indirizzi
  - il riepilogo compatto `Base spedizione pronta` resta la sola sintesi visibile sopra gli indirizzi
- Ho aperto anche una prima tranche reale di unificazione bottoni nell'account, sostituendo capsule hardcoded nella rubrica con primitive del design system:
  - `nuxt-spedizionefacile-master/components/account/AccountIndirizziForm.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountIndirizziList.vue`
- Ho rimosso la sonda temporanea usata per il browser pass:
  - `tmp-diagnostica/verify-accordion.mjs`

### Verifiche fatte
- Statico:
  - `git diff --check -- pages/la-tua-spedizione/[step].vue`: ok
  - parse SFC di `pages/la-tua-spedizione/[step].vue`: ok
- Browser reale seeded:
  - script riusato: `output/playwright/step2-browser-check.cjs`
  - risultato salvato in:
    - `output/playwright/step2-browser-check.json`
  - locale:
    - `seedStatus = 200`
    - route finale: `http://192.168.80.1:8787/la-tua-spedizione/2?step=ritiro`
    - `localHasAddresses = true`
    - `localHasAccordionSummary = true`
    - `localServicesStageCount = 0`
    - screenshot:
      - `output/playwright/step2-accordion-local-initial.png`
      - `output/playwright/step2-guidance-after-continue-click.png`
      - `output/playwright/step2-service-validation-local.png`
      - `output/playwright/step2-address-accordion-open-local.png`
  - preview online:
    - URL corrente in `URL_ONLINE.txt`: `https://beneficial-participant-forget-obvious.trycloudflare.com`
    - `previewSeedStatus = 200`
    - `previewHasStep2 = true`
    - route finale: `https://beneficial-participant-forget-obvious.trycloudflare.com/la-tua-spedizione/2`
    - screenshot:
      - `output/playwright/step2-preview-seeded.png`
- Account locale:
  - parse SFC ok:
    - `components/account/AccountIndirizziForm.vue`
    - `components/account/AccountIndirizziList.vue`
  - browser reale:
    - `output/playwright/account-button-check.cjs`
    - screenshot aggiornato:
      - `output/playwright/account-indirizzi-local.png`

### Stato reale a fine tranche
- Locale:
  - step 2 one-page accordion certificato meglio del punto precedente
  - gli indirizzi si aprono sotto senza lasciare la sezione servizi ancora visibile
  - il riepilogo compatto sopra gli indirizzi e' presente
- Preview online:
  - seed step 2 riuscito
  - il pass browser arriva alla route corretta
  - resta da rifinire una verifica visiva piu' lenta della preview, perche' lo screenshot seeded lato preview mostra ancora uno stato molto scheletrico nei blocchi shell pur senza errori console nuovi

### Prossimo blocco corretto
- chiudere le ultime differenze visive del funnel rispetto a Figma sui servizi
- poi tornare su shell account/admin e coerenza bottoni
- poi proseguire con l'hardening backend residuo

## 2026-04-02 13:05 CEST — Codex (step 3 indirizzi + authority request + runtime preview)
### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho ricostruito una tranche sottrattiva dello step indirizzi in:
  - `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
  - `nuxt-spedizionefacile-master/components/shipment/AddressFormFields.vue`
  - `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
- Intervento chiave UX/UI:
  - rimossa la toolbar separata di rubrica sotto le card
  - le utility `Rubrica` sono state spostate dentro le card `Partenza` e `Destinazione`
  - banner indirizzi accorciato e meno rumoroso
  - card alleggerite: meno ombra, meno padding inutile, stessa grammatica della sezione
  - griglia `Paese / Citta / Provincia / CAP` resa piu compatta e leggibile senza tornare a un layout lungo e dispersivo
- Ho stretto il contratto server-authoritative rimuovendo i price fields client legacy da:
  - `laravel-spedizionefacile-main/app/Http/Requests/PackageStoreRequest.php`
  - `laravel-spedizionefacile-main/app/Http/Controllers/CartController.php`
- Ho corretto il bootstrap PowerShell del tunnel in:
  - `scripts/avvia-cloudflare.ps1`
  - rimossi caratteri non ASCII dai log finali per evitare parser issue su Windows PowerShell

### Verifiche fatte
- Statico:
  - `git diff --check` ok sui file toccati
  - parse SFC ok:
    - `StepAddressSection.vue`
    - `AddressFormFields.vue`
- Browser reale locale:
  - seed reale via `POST /api/session/first-step` e `POST /api/session/second-step`
  - route verificata: `http://192.168.80.1:8787/la-tua-spedizione/2?step=ritiro`
  - screenshot:
    - `output/playwright/step3-local-after-address-refactor-20260402.png`
    - `output/playwright/step3-local-desktop-after-address-refactor-20260402b.png`
  - console locale:
    - resta un `401 /api/user-addresses` in guest, rumore preesistente non introdotto da questa patch
- Backend test reali:
  - `GuestCartPricingAuthorityTest`: 2 test verdi
  - `CartControllerTest`: 9 test verdi
  - `OrderControllerTest`: 8 test verdi
- Runtime / preview:
  - `scripts/avvia-cloudflare.ps1` ora parte di nuovo correttamente
  - nuovo URL scritto in `URL_ONLINE.txt`:
    - `https://seventh-clips-champions-legends.trycloudflare.com`

### Stato runtime reale a fine tranche
- Locale: certificato sul flusso step 3 appena toccato
- Preview online: NON ancora certificata
  - il quick tunnel nuovo sale e il processo `cloudflared` resta vivo
  - ma il dominio cade subito in `530 / 1033`, anche su:
    - `/preventivo`
    - `/api/public/price-bands`
    - `POST /api/session/first-step`
  - quindi in questa tranche la preview non e' stata usata come giudizio UI finale, perche' il problema attivo e' runtime/tunnel, non layout

### Prossimo blocco corretto
- chiudere la preview same-origin davvero stabile, senza `530`
- poi proseguire con:
  - shell account / pro / admin contro Figma `32:5016`
  - authority backend successiva: quote context / signature / snapshot piu forti

## 2026-03-31 - Audit meticoloso integrato su HEAD/main

Fase: REVISIONE
Coordinatore: Codex
Scope: audit basato su `HEAD/main` stabile (`0db0096`), non sul worktree locale sporco.

### Nota iniziale
Il file `_SQUADRA_DIARIO.md` mancava nella root della repo nonostante sia richiesto da `AGENTS.md`. E' stato ricreato per ripristinare il workflow squadra.

### Cosa e' stato fatto
- raccolte e lette le fonti canoniche dell'audit:
  - history commit `main`
  - `MEMORY.md`
  - `peppy-nibbling-canyon.md`
  - altri piani rilevanti in `.claude/plans/`
  - documentazione interna `docs/architettura`, `docs/riferimento`, `docs/analisi`
- verificata la baseline tecnica dei commit chiave:
  - `15f6f1c`
  - `3a454ad`
  - `3f31edf`
  - `30ff57a`
  - `329ced1`
  - `0db0096`
- raccolte metriche su `HEAD/main` per frontend e backend
- verificata la copertura statica del dominio BRT/PUDO/etichette/documenti
- verificati limiti reali di build/test dell'ambiente
- scritti i 5 deliverable finali dell'audit integrato

### File toccati
- `_SQUADRA_DIARIO.md`
- `docs/analisi/audit-integrato-2026-03-31/01-DEEP-AUDIT-REPORT.md`
- `docs/analisi/audit-integrato-2026-03-31/02-ARCHITECTURE-CODE-QUALITY-MATRIX.md`
- `docs/analisi/audit-integrato-2026-03-31/03-PRODUCT-DOMAIN-COVERAGE-REPORT.md`
- `docs/analisi/audit-integrato-2026-03-31/04-UX-UI-CONSISTENCY-MATRIX.md`
- `docs/analisi/audit-integrato-2026-03-31/05-PLAN-COMPLIANCE-RESIDUAL-RISK.md`

### Come verificare
- aprire i 5 report sotto `docs/analisi/audit-integrato-2026-03-31/`
- controllare che i riferimenti principali coincidano con `HEAD`:
  - `git log --oneline -n 6`
  - `git show 0db0096 --stat`
  - `git show 30ff57a --stat`
  - `git show 3f31edf --stat`
- verificare i riferimenti citati nei report:
  - `laravel-spedizionefacile-main/routes/api.php`
  - `laravel-spedizionefacile-main/app/Providers/EventServiceProvider.php`
  - `laravel-spedizionefacile-main/resources/views/emails/order-confirmation.blade.php`
  - `laravel-spedizionefacile-main/resources/views/emails/shipment-status.blade.php`
  - `nuxt-spedizionefacile-master/package.json`

### Stato finale di questa tranche
- audit documentale completato
- report pronti per revisione CAPO
- build/test runtime non completamente certificati da questo ambiente:
  - frontend bloccato da Node locale `18.x` contro requisito `>=20`
  - backend non certificato runtime da questa shell, anche se il binario PHP Windows e' presente

## 2026-03-31 23:13 CEST — Codex (hardening shell/auth + step 2 + locale)
### Cosa ho fatto
- Ho corretto un bug reale su `/autenticazione` ripristinando `authCookie` in `useAuthUiState.ts`, che prima causava `500` sulla preview online.
- Ho ridotto i mismatch SSR/client della shell pubblica sostituendo i `NuxtLink` con slot `custom` in navbar e footer, cosi lo stato attivo non dipende piu' dalle classi automatiche client-only.
- Ho spostato il toast del middleware `shipment-validation` fuori dalla fase di hydration con scheduling client-side differito.
- Ho riallineato la shell auth/account/preventivo in `Header.vue` e corretto il disallineamento dei radius dei tab auth aggiungendo `overflow: hidden` alla shell in `auth-overlay.css`.
- Ho corretto l'allineamento del connettore freccia nel preventivo in `assets/css/preventivo.css`.
- Ho sostituito l'uso errato di `async setup` nel preventivo: `usePreventivo` non usa piu' `await loadPriceBands()` in setup e `Preventivo.vue` non lo attende piu'.
- Ho introdotto una hydration esplicita dello store utente post-mount:
  - `stores/userStore.js` ora parte da default SSR-safe
  - nuova `plugins/01.user-store-hydrate.client.ts`
  - la persistenza su `sessionStorage` non sporca piu' il render iniziale del server.
- Ho ricostruito una tranche dello step 2 con semantica piu' coerente:
  - `StepPickupDate.vue`: scelta data come radio singola, non checkbox
  - `StepServicesGrid.vue`: footer card meno rumoroso, stato mostrato solo quando serve, CTA piu' coerenti
  - `ServiceFeaturedCard.vue`: featured service piu' vicino alle altre card, senza pill ridondante quando non attivo
  - `ServiceContentNotifications.vue`: tolto lo switch isolato, ora usa stato + bottone `Attiva/Rimuovi` coerente col resto
  - `useShipmentStepServiceCards.js`: etichette di stato semplificate (`Configurazione aperta`, `Attivo`, `Da configurare`)
  - `StepAddressSection.vue` + `assets/css/shipment-step.css`: anche `Indirizzi` ora usa una shell di sezione coerente con `Giorno di ritiro` e `Servizi`
- Ho gia' mantenuto attivi anche i fix backend di sicurezza/funzionalita' aperti in questa tranche:
  - `bootstrap/app.php`
  - `CheckAdmin.php`
  - `SecurityHeaders.php`
  - `Order.php`
  - template email ordine/stato spedizione
  - listener `SendOrderConfirmation`
  - protezione admin per `settings/stripe` in `routes/api.php`

### File toccati
- `nuxt-spedizionefacile-master/composables/useAuthUiState.ts`
- `nuxt-spedizionefacile-master/components/Navbar.vue`
- `nuxt-spedizionefacile-master/components/Footer.vue`
- `nuxt-spedizionefacile-master/middleware/shipment-validation.js`
- `nuxt-spedizionefacile-master/components/Header.vue`
- `nuxt-spedizionefacile-master/assets/css/auth-overlay.css`
- `nuxt-spedizionefacile-master/assets/css/preventivo.css`
- `nuxt-spedizionefacile-master/composables/usePreventivo.js`
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `nuxt-spedizionefacile-master/stores/userStore.js`
- `nuxt-spedizionefacile-master/plugins/01.user-store-hydrate.client.ts`
- `nuxt-spedizionefacile-master/components/shipment/StepPickupDate.vue`
- `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
- `nuxt-spedizionefacile-master/components/shipment/ServiceFeaturedCard.vue`
- `nuxt-spedizionefacile-master/components/shipment/ServiceContentNotifications.vue`
- `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
- `nuxt-spedizionefacile-master/composables/useShipmentStepServiceCards.js`
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
- `laravel-spedizionefacile-main/bootstrap/app.php`
- `laravel-spedizionefacile-main/app/Http/Middleware/CheckAdmin.php`
- `laravel-spedizionefacile-main/app/Http/Middleware/SecurityHeaders.php`
- `laravel-spedizionefacile-main/app/Models/Order.php`
- `laravel-spedizionefacile-main/resources/views/emails/order-confirmation.blade.php`
- `laravel-spedizionefacile-main/resources/views/emails/shipment-status.blade.php`
- `laravel-spedizionefacile-main/app/Listeners/SendOrderConfirmation.php`
- `laravel-spedizionefacile-main/routes/api.php`

### Come verificare
- Statico Vue SFC:
  - `cd nuxt-spedizionefacile-master && node - <<'NODE' ... parse(@vue/compiler-sfc) ... NODE`
  - file verificati: `components/Preventivo.vue`, `components/shipment/StepServicesGrid.vue`, `components/shipment/ServiceFeaturedCard.vue`, `components/shipment/ServiceContentNotifications.vue`, `components/shipment/StepAddressSection.vue`, `components/shipment/StepPickupDate.vue`, `pages/la-tua-spedizione/[step].vue`
- Preview online attuale:
  - `https://placed-diy-operators-protein.trycloudflare.com/autenticazione?redirect=/account`
  - `https://placed-diy-operators-protein.trycloudflare.com/preventivo`
- Verifiche browser fatte:
  - `/autenticazione`: non va piu' in `500`
  - `/preventivo`: non mostra piu' errori `_nuxt_icon`; shell pubblica coerente; resta ancora un mismatch di hydration nel componente `Preventivo` da chiudere
- Verifiche locali lato Windows:
  - `cmd.exe /c curl -I http://127.0.0.1:3001`
  - `cmd.exe /c curl -I http://127.0.0.1:8787`
  - `netstat -ano | Select-String ':3001|:8787|:8000'`

### Stato finale di questa tranche
- auth shell riportata operativa e branded
- locale rialzato via toolchain Windows (`3001`, `8787`, `8000` in ascolto)
- step 2 piu' coerente sul piano semantico e visivo
- backend piu' protetto dei punti critici emersi dall'audit
- problema ancora aperto da chiudere nella prossima tranche: mismatch SSR/client residuo su `Preventivo` online

## 2026-03-31 23:31 CEST — Codex (preventivo SSR fix + pulizia step 2 + squadra analisi)
### Fase
- CAPO -> LOGICA -> REVISIONE
- Coordinatore unico: Codex
- Supporto parallelo coordinato:
  - Beauvoir: audit mirato step 2 servizi/indirizzi
  - Harvey: audit shell/brand pubblico-auth-account-admin

### Cosa ho fatto
- Ho chiuso il mismatch SSR/client reale del `Preventivo` senza aggiungere layer nuovi:
  - `usePreventivo.js`: il caricamento dinamico dei listini ora parte `onMounted`, non piu' durante il setup client
  - `usePriceBands.js`: in SSR il modulo riparte sempre dal fallback, cosi il server non riusa stato vecchio tra richieste e non sporca l'hydration
- Ho iniziato una pulizia strutturale dello step 2 sui servizi, sostituendo contratti fragili basati sul testo:
  - `useShipmentStepServices.js`: aggiunti `key` stabili ai servizi (`senza_etichetta`, `contrassegno`, `assicurazione`, `sponda_idraulica`), `expandedServiceName` sostituito con `expandedServiceKey`, e `loadPriceBands()` spostato `onMounted`
  - `useShipmentStepServiceCards.js`: la semantica dei servizi configurabili usa ora `service.key`, ho rimosso helper/prop ridondanti (`shouldShowServiceToggle`, `shouldShowConfigureButton`) e centralizzato il reset UI con `clearInlineState()`
  - `StepServicesGrid.vue`: la griglia usa `service.key` per accordion, CTA e pannelli inline; rimosse prop inutili e ridotta la dipendenza dal copy visibile
  - `pages/la-tua-spedizione/[step].vue`: API della griglia alleggerita e riallineata alle nuove primitive (`expandedServiceKey`, niente helper pass-through inutili)
- Ho verificato la preview online e il locale dopo la sostituzione dei pezzi critici.
- Ho raccolto e integrato due handoff di analisi parallela:
  - step 2: restano da consolidare card base/featured, address section e CSS orfani
  - shell brand: restano da riallineare auth overlay vs pagina auth, footer marketing nelle aree account/admin e alcuni drift cromatici dell'admin

### File toccati
- `nuxt-spedizionefacile-master/composables/usePreventivo.js`
- `nuxt-spedizionefacile-master/composables/usePriceBands.js`
- `nuxt-spedizionefacile-master/composables/useShipmentStepServices.js`
- `nuxt-spedizionefacile-master/composables/useShipmentStepServiceCards.js`
- `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `_SQUADRA_DIARIO.md`

### Come verificare
- Verifica sintassi JS:
  - `node --check nuxt-spedizionefacile-master/composables/usePreventivo.js`
  - `node --check nuxt-spedizionefacile-master/composables/usePriceBands.js`
  - `node --check nuxt-spedizionefacile-master/composables/useShipmentStepServices.js`
  - `node --check nuxt-spedizionefacile-master/composables/useShipmentStepServiceCards.js`
- Verifica parse Vue SFC:
  - `node - <<'NODE' ... parse('components/shipment/StepServicesGrid.vue') ... parse('pages/la-tua-spedizione/[step].vue') ... NODE`
- Verifica locale lato Windows:
  - `cmd.exe /c curl -I http://127.0.0.1:3001`
  - `cmd.exe /c curl -I http://127.0.0.1:8787`
- Verifica preview online:
  - `https://placed-diy-operators-protein.trycloudflare.com/preventivo?ts=1743456100`
  - `https://placed-diy-operators-protein.trycloudflare.com/autenticazione?redirect=/account&ts=1743456500`
- Verifiche browser fatte in questa tranche:
  - `/preventivo`: `0` warning console, `0` errori hydration, nessuna richiesta fallita `_nuxt_icon`
  - `/autenticazione`: `0` warning console, nessuna richiesta fallita `_nuxt_icon`

### Stato finale di questa tranche
- mismatch SSR/client su `Preventivo` chiuso
- step 2 con contratto servizi piu' stabile e meno legato al testo
- squadra di analisi avviata e handoff raccolti
- prossimi blocchi da chiudere:
  - consolidare la grammatica card/featured/notifiche/indirizzi nello step 2
  - riallineare auth/account/admin a una shell brand coerente senza footer/CTA marketing fuori luogo


## 2026-04-01 - STEP2 worker: pickup calendar width explosion

### Cosa ho cambiato
- Sostituito il calendario pickup basato su Swiper con una track orizzontale nativa e leggera.
- Allineate le card data a una grammatica più semplice: bottone selezionabile, nav prev/next separata, stato selected/disabled coerente.
- Pulito il CSS step2 rimuovendo i residui Swiper e i selettori morti collegati.

### File toccati
- `nuxt-spedizionefacile-master/components/shipment/StepPickupDate.vue`
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`

### Root cause
- Lo Swiper del pickup calendar generava una width explosion enorme su track/slides, rendendo il calendario quasi invisibile e sballando la resa mobile.
- Il problema era di layout/track, non di dati mancanti.

### Come verificare
- Parse Vue SFC:
  - `node - <<'NODE' ... @vue/compiler-sfc ... components/shipment/StepPickupDate.vue ... NODE` -> `parse ok`
- Controllo diff:
  - `git diff --check -- nuxt-spedizionefacile-master/components/shipment/StepPickupDate.vue nuxt-spedizionefacile-master/assets/css/shipment-step.css` -> `OK`
- Controllo residui Swiper:
  - `rg -n 'swiper|Swiper' ...` -> nessun risultato nei due file STEP2

### Nota di verifica runtime
- Tentativo di avvio Nuxt locale bloccato dal tooling dell'ambiente (`Node 18` con Nuxt CLI che richiede `node:util.styleText`).

## 2026-04-02 12:57 CEST — Codex (step 3 mobile cleanup + admin shell tabs + authority verification)

### Fase
- ESECUZIONE -> QA -> MEMORIA

### Cosa ho fatto
- Ho rifinito il blocco indirizzi senza aggiungere nuovi layer:
  - `assets/css/shipment-step.css`: i gruppi azione locali ora hanno `min-width: 0` e su mobile le azioni della card indirizzo vanno in colonna piena, cosi la rubrica non resta mezza spezzata accanto ai pulsanti di salvataggio.
  - ho verificato anche che i residui `address-stage-toolbar` non sono piu' presenti nel template/CSS vivo.
- Ho riallineato la shell admin al riferimento Figma `32:5016` in modo sottrattivo:
  - `pages/account/amministrazione/index.vue`: tabs shell in ordine `Admin -> Pro -> Base`, coerenti con la vista admin del prototipo.
  - `assets/css/account-shell.css`: tabs account/admin compattati e meno “capsula”: padding, radius, altezza e shadow piu' sobri.
- Ho ricontrollato il fronte authority backend senza inventare altro:
  - `app/Http/Requests/PackageStoreRequest.php` nella worktree attuale e' gia' pulito dai price fields client legacy
  - `app/Http/Controllers/CartController.php` nella worktree attuale e' gia' pulito dagli stessi campi nel validate update
  - ho chiuso anche il residuo `saved shipments`:
    - `app/Http/Controllers/SavedShipmentController.php` ora repricing server-side sia in `store` sia in `addToCart`, usando `CartService::pricePackageData()`
    - in `update` i price fields client non vengono piu' accettati ne' rimessi nel model
  - quindi in questa tranche il lavoro backend e' stato di certificazione piu' hardening mirato sui percorsi ancora sporchi.

### File toccati
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
- `nuxt-spedizionefacile-master/assets/css/account-shell.css`
- `nuxt-spedizionefacile-master/pages/account/amministrazione/index.vue`
- `laravel-spedizionefacile-main/app/Http/Controllers/SavedShipmentController.php`
- `laravel-spedizionefacile-main/tests/Feature/SavedShipments/SavedShipmentControllerTest.php`
- `_SQUADRA_DIARIO.md`

### Come verificare
- Runtime HTTP da questa shell:
  - `http://192.168.80.1:8000` -> `200`
  - `http://192.168.80.1:8787` -> `200`
  - nota: `127.0.0.1` in questa sessione non e' la bind utile
- Preview corrente:
  - `https://folder-across-carroll-writers.trycloudflare.com` -> `200` via HTTP
- Verifiche statiche:
  - parse SFC ok:
    - `pages/account/amministrazione/index.vue`
    - `components/shipment/StepAddressSection.vue`
  - `rg -n "address-stage-toolbar" ...` -> nessun risultato
- Verifiche backend:
  - `php -l app/Http/Controllers/CartController.php` -> ok
  - `php -l app/Http/Controllers/SavedShipmentController.php` -> ok
  - `artisan test --filter=GuestCartPricingAuthorityTest` -> 2 test verdi
  - `artisan test --filter=OrderControllerTest` -> 8 test verdi
  - `artisan test --filter=CartControllerTest` -> 9 test verdi
  - `artisan test --filter=SavedShipmentControllerTest` -> 2 test verdi

### Nota QA browser
- Ho tentato QA reale con Playwright sia su preview sia su same-origin locale, ma in questa sessione il lane browser ha risposto con:
  - preview -> `chrome-error://chromewebdata/`
  - locale/preview navigate -> `ERR_HTTP_RESPONSE_CODE_FAILURE`
- Gli endpoint rispondono comunque `200` via HTTP/curl, quindi il blocker attuale e' nel trasporto/browser della sessione di test, non nella reachability base degli origin.
- La certificazione visiva finale di questa tranche va quindi rifatta appena il browser lane torna sano, partendo da:
  - `/account/amministrazione`
  - step indirizzi locale/proxy
  - preview same-origin del funnel

### Stato finale di questa tranche
- step 3 piu' pulito sul punto critico delle azioni locali mobile
- shell admin piu' vicina al Figma sul controllo tabs
- authority cart/order certificata sui test mirati gia' presenti
- resta aperta la ricertificazione browser visiva della tranche e poi il blocco successivo:
  - step indirizzi contro `33:6174`
  - shell base/pro/admin piu' profonda
  - authority pricing/signature/snapshot finale end-to-end

## 2026-04-02 02:45 CEST — Codex (step 2 hard cleanup + UX pass + runtime/preview ricertificati)
### Fase
- ESECUZIONE
- Workstream primario: funnel step 2
- Focus: semplificare, togliere attrito, riallineare la grammatica servizi al prototipo senza aggiungere layer

### Cosa ho fatto
- Ho ricertificato il runtime locale sulla worktree attuale:
  - `http://127.0.0.1:8787` -> `200`
  - `http://127.0.0.1:8000/api/public/price-bands` -> `200`
- Ho ricertificato la preview same-origin corrente in `URL_ONLINE.txt`:
  - root preview -> `200`
  - `/api/public/price-bands` -> `200`
- Ho studiato di nuovo il node Figma servizi `32:2897` e il prototipo canonico per riallineare il comportamento dello step 2.
- Ho semplificato lo step 2 lato servizi con logica replacement-first:
  - rimosso il controllo `cod_payment_method` dal contrassegno
  - rimosso il relativo blocco UI `Tipo pagamento corriere`
  - eliminata la dipendenza UX da un campo non usato dal backend
  - badge di stato servizi resi piu' prevedibili (`Da configurare`, `Configurato`, `Configurazione aperta`, `Attivo`)
  - stato badge spostato vicino al titolo invece di duplicarlo nel price stack
  - calendario ritiro riallineato meglio al pattern mini-calendario rettangolare con marker di selezione piu' leggibile e tag `Primo`
- Ho fatto pulizia vera del codice morto/duplicato che creava drift:
  - eliminato il vecchio composable orfano `useShipmentServices.js`
  - eliminati i duplicati sotto `utils/utils/`:
    - `accountNavigation.js`
    - `authUiState.ts`
    - `shipmentFlowState.js`
    - `shipmentServicePricing.js`

### File toccati
- `nuxt-spedizionefacile-master/components/shipment/StepPickupDate.vue`
- `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
- `nuxt-spedizionefacile-master/composables/useShipmentStepServiceCards.js`
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
- `nuxt-spedizionefacile-master/composables/useShipmentServices.js` (rimosso)
- `nuxt-spedizionefacile-master/utils/utils/accountNavigation.js` (rimosso)
- `nuxt-spedizionefacile-master/utils/utils/authUiState.ts` (rimosso)
- `nuxt-spedizionefacile-master/utils/utils/shipmentFlowState.js` (rimosso)
- `nuxt-spedizionefacile-master/utils/utils/shipmentServicePricing.js` (rimosso)

### Come verificare
- Statico JS:
  - `node --check nuxt-spedizionefacile-master/composables/useShipmentStepServiceCards.js`
  - `node --check nuxt-spedizionefacile-master/composables/useShipmentStepServices.js`
  - `node --check nuxt-spedizionefacile-master/composables/useCheckoutState.js`
  - `node --check nuxt-spedizionefacile-master/composables/useCheckout.js`
  - `node --check nuxt-spedizionefacile-master/composables/useRiepilogo.js`
- Parse Vue SFC:
  - `StepPickupDate.vue`
  - `StepServicesGrid.vue`
  - `pages/la-tua-spedizione/[step].vue`
- Runtime locale:
  - `cmd.exe /c "curl -I --max-time 10 http://127.0.0.1:8787"`
  - `cmd.exe /c "curl -I --max-time 10 http://127.0.0.1:8000/api/public/price-bands"`
- Preview online:
  - `cmd.exe /c "curl -I --max-time 15 $(cat URL_ONLINE.txt)"`
  - `cmd.exe /c "curl -I --max-time 15 $(cat URL_ONLINE.txt)/api/public/price-bands"`
- Browser reale locale:
  - verifica step 2 con stato iniettato dentro il contesto Nuxt e screenshot salvato in:
    - `output/playwright/step2-after-refactor.png`
  - nel render verificati:
    - blocco `Quando ritiriamo?`
    - blocco `Servizi aggiuntivi`
    - badge di stato servizi presenti

### Stato finale di questa tranche
- step 2 piu' leggero e meno ambiguo lato servizi
- rimosso un pezzo di complessita' falsa (`cod_payment_method`) che il backend non consumava
- eliminato un nucleo di file duplicati/orfani che mantenevano due sorgenti di verita'
- preview e locale ricertificati sane sul piano runtime
- residuo ancora aperto:
  - console/hydration noise storico su `/preventivo`
  - serve un altro passaggio UX/UI per affinare ancora layout account/admin e il resto del funnel

## 2026-04-01 23:50 CEST — Codex (runtime/preview hardening + verifica reale funnel)
### Fase
- CAPO -> RUNTIME -> QA

### Cosa ho fatto
- Ho letto e riallineato le fonti canoniche prima di toccare il codice:
  - `_SQUADRA_DIARIO.md`
  - `docs/analisi/UX-UI-SYSTEM-STUDIO-2026-04-01.md`
  - `docs/analisi/audit-integrato-2026-03-31/01-DEEP-AUDIT-REPORT.md`
  - `docs/analisi/audit-integrato-2026-03-31/04-UX-UI-CONSISTENCY-MATRIX.md`
  - `docs/analisi/audit-integrato-2026-03-31/05-PLAN-COMPLIANCE-RESIDUAL-RISK.md`
  - `scripts/avvia-cloudflare.ps1`
  - `URL_ONLINE.txt`
- Ho verificato lo stato runtime reale e distinto i problemi di bootstrap dai problemi UI:
  - `3001`, `8000`, `8787` inizialmente spenti
  - runtime rialzato con toolchain Windows reale (`node 24`, `php 8.4`, `caddy`, `cloudflared`)
  - `8000`, `3001`, `8787` ora rispondono
- Ho corretto il bootstrap Cloudflare per la preview:
  - il tunnel "frontend" passa ora per `8787` (Caddy), non piu' per `3001`
  - questo riallinea la preview alla logica same-origin usata da `00.sanctum-dynamic-url.client.ts`
  - `URL_ONLINE.txt` viene aggiornato con l'URL pubblico corretto
- Ho hardenizzato gli script PowerShell di avvio per non dipendere ciecamente dal `PATH`:
  - `scripts/avvia-locale.ps1`
  - `scripts/avvia-cloudflare.ps1`
- Ho riallineato i diagnostici alle porte reali del progetto:
  - `scripts/raccogli-stato.ps1`
  - `scripts/raccogli-stato.sh`
  - porta frontend corretta: `3001` (non `3000`)
- Ho verificato la preview nel browser reale con Playwright:
  - homepage pubblica: ok
  - `/autenticazione?redirect=/account`: ok
  - login reale con redirect a `/account`: ok
  - `/preventivo`: ok
  - step 2 raggiungibile e funzionante dalla preview: ok
  - step 3 indirizzi raggiungibile dalla preview: ok

### File toccati
- `scripts/avvia-cloudflare.ps1`
- `scripts/avvia-cloudflare.sh`
- `scripts/avvia-locale.ps1`
- `scripts/raccogli-stato.ps1`
- `scripts/raccogli-stato.sh`
- `URL_ONLINE.txt`
- `_SQUADRA_DIARIO.md`

### Verifiche fatte
- `cmd.exe /c curl -I http://127.0.0.1:8000`
- `cmd.exe /c curl -I http://127.0.0.1:3001`
- `cmd.exe /c curl -I http://127.0.0.1:8787`
- `cmd.exe /c curl -I https://barrier-illustration-sorry-seeing.trycloudflare.com/account`
- Playwright preview:
  - `/`
  - `/autenticazione?redirect=/account`
  - login -> `/account`
  - `/preventivo`
  - `/la-tua-spedizione/2`
  - `/la-tua-spedizione/2?step=ritiro`
- Static check script:
  - `git diff --check -- scripts/avvia-cloudflare.ps1 scripts/avvia-cloudflare.sh scripts/avvia-locale.ps1 scripts/raccogli-stato.ps1 scripts/raccogli-stato.sh URL_ONLINE.txt`

### Residui aperti dopo questa tranche
- `scripts/raccogli-stato.ps1` da questa sessione WSL->PowerShell continua a essere rumoroso sul capture output dei binari Windows: crea il report ma non restituisce ancora le versioni/porte in modo pulito. Non blocca l'avvio reale, ma va rifinito se vogliamo una diagnostica totalmente affidabile da questa shell.
- Il lavoro non e' ancora passato alla chiusura UX/UI: ora che runtime e preview sono stabili, il prossimo blocco resta:
  - shell auth/account/admin
  - step 2 servizi + indirizzi contro prototipo
  - hardening backend finale (pricing authority / idempotenza / cart merge)

### Stato finale di questa tranche
- preview online e locale riportati in uno stato verificabile
- login/redirect certificati sulla preview reale
- funnel certificato sulla preview fino allo step 3
- bootstrap Cloudflare riallineato all'architettura same-origin
- prossimo step non e' piu' "rialzare tutto", ma rifinire UI e hardening applicativo
- Quindi la verifica visuale mobile/desktop in preview locale resta da rifare in un ambiente Node 20 compatibile o su preview già attiva.

## 2026-04-01 01:18 UTC+2 — Audit UX/UI totale e grammatica di sistema

### Capo squadra
- Ho eseguito uno studio profondo UX/UI dell'intero sito usando:
  - preview online corrente `https://spy-milan-insight-gate.trycloudflare.com`
  - prototipo aggiornato `https://sort-zaffre-77538165.figma.site/`
  - screenshot locali già catturati (`proto-new-desktop.png`, `preventivo-desktop-current.png`, `auth-page-current.png`, `step2-current-fast.png`, ecc.)
  - memoria progetto e piani `.claude`
  - riferimenti esterni Baymard / GOV.UK / NN su gerarchia CTA, prossimità, consistenza dei controlli
- Ho scritto il documento base di sistema in `docs/analisi/UX-UI-SYSTEM-STUDIO-2026-04-01.md`.

### File toccati
- `docs/analisi/UX-UI-SYSTEM-STUDIO-2026-04-01.md`
- `_SQUADRA_DIARIO.md`

### Output prodotto
- regole non negoziabili per shell, colori, gerarchia CTA, spacing e semantica dei controlli
- elenco delle incoerenze sistemiche più importanti tra pubblico/auth/account/admin/funnel
- primitive UI condivise da standardizzare davvero (`sf-section-block`, `sf-card`, `sf-choice-tile`, `sf-action-pill`, `sf-input`, `sf-modal-surface`)
- matrice pagina per pagina e ordine di implementazione per tranche

### Verifica
- documento creato e salvato in repo
- preview corrente viva (`URL_ONLINE.txt`)
- locale Windows già verificato vivo nelle tranche precedenti (`3001`, `8787`)

### Prossima tranche esecutiva
1. shell e auth (radius, shell unica, parity pagina/overlay)
2. preventivo (allineamento freccia + rigore asse input)
3. step 2 (calendario, card servizi, indirizzi) usando solo primitive condivise
4. account/pro/admin riallineati alla stessa shell brand

## 2026-04-01 01:28 UTC+2 — Tranche UX/UI: auth radius, asse preventivo, card servizi

### Cosa ho cambiato
- Ho applicato il nuovo studio UX/UI di sistema a tre punti immediatamente visibili e coerenti con le regole fissate.
- `autenticazione.css`:
  - segmented `Accedi / Registrati` e `Privato / Azienda` resi più rettangolari e meno "capsula"
  - shell e segmento interno allineati meglio con il radius del sistema
- `auth-overlay.css`:
  - stessa famiglia di radius della pagina auth, così overlay e pagina non usano due grammatiche diverse
- `preventivo.css`:
  - freccia centrale spostata più in alto per allinearla all'asse ottico dei campi input, non al blocco intero
- `shipment-step.css`:
  - action/state pill delle card servizi rese meno tonde e più coerenti con i control radius del sito
  - mantenuto il calendario in grammatica rettangolare morbida, non tonda

### File toccati
- `nuxt-spedizionefacile-master/assets/css/autenticazione.css`
- `nuxt-spedizionefacile-master/assets/css/auth-overlay.css`
- `nuxt-spedizionefacile-master/assets/css/preventivo.css`
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`

### Verifiche fatte
- backend login via preview online verificato con seed user:
  - `POST /api/custom-login` -> `200`
  - `GET /api/user` con stessa sessione -> `200`
- raggiungibilità preview:
  - `/autenticazione` -> `200`
  - `/preventivo` -> `200`
  - `/la-tua-spedizione/2` -> `200`
- `node --check nuxt-spedizionefacile-master/composables/useAutenticazione.js` -> `OK`

### Nota importante
- `git diff --check` sul solo `preventivo.css` continua a segnalare trailing whitespace diffusi su tutto il file per via del formato già sporco della risorsa; non è un nuovo bug introdotto da questa tranche, ma un problema storico del file da ripulire in una passata dedicata.

### Prossimo blocco
1. test browser reale del login/redirect sulla preview
2. riallineamento completo shell auth/account/admin al brand pubblico
3. ricostruzione step 2 con grammatica unica (calendario, featured card, servizi regolari, indirizzi)

## 2026-04-01 03:01 CEST — Verifica browser reale + correzioni mirate auth/preventivo/step2

### Cosa ho verificato davvero
- Ho aperto in browser reale il prototipo aggiornato `https://sort-zaffre-77538165.figma.site/` per fissare la direzione visiva desktop/mobile.
- Ho verificato la preview attuale `https://spy-milan-insight-gate.trycloudflare.com` su:
  - `/autenticazione`
  - `/preventivo`
  - `/la-tua-spedizione/2`
  - `/account`
- Ho controllato il login in sessione pulita cancellando cookie e storage lato browser, poi ho eseguito davvero il login da `/autenticazione`.

### Problemi reali confermati
- Il login email/password sulla preview ora funziona, quindi il blocco non era il core auth backend ma il flusso browser/sessione.
- Il segmento `Privato / Azienda` era ancora fuori scala rispetto a `Accedi / Registrati`.
- La freccia del preventivo era ancora leggermente troppo bassa rispetto all'asse dei campi input.
- La featured card `Senza Etichetta` era ancora impaginata male: il layout a due colonne lasciava uno spazio vuoto sbagliato e spingeva l'azione troppo a destra.
- È emerso un bug aggiuntivo reale: login Google in preview fallisce con `redirect_uri_mismatch`.

### Correzioni applicate
- `nuxt-spedizionefacile-master/assets/css/autenticazione.css`
  - riallineato il segmented `Privato / Azienda` alla stessa famiglia geometrica di `Accedi / Registrati`
- `nuxt-spedizionefacile-master/assets/css/auth-overlay.css`
  - stesso riallineamento per il segmented dell'overlay auth
- `nuxt-spedizionefacile-master/assets/css/preventivo.css`
  - freccia centrale rialzata ancora per centrarla sui box di testo, non sul blocco intero
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - tile calendario ancora più rettangolari (`radius` ridotto)
  - frecce calendario meno tonde
  - `Senza Etichetta` convertita da layout a due colonne a layout verticale coerente con le altre card

### Verifiche dopo il fix
- `/autenticazione` mobile e desktop ricontrollata in browser reale
- login email/password in sessione pulita: redirect a `/account` riuscito
- `/preventivo` desktop ricontrollata in browser reale
- `/la-tua-spedizione/2` desktop ricontrollata in browser reale
- `/account` desktop ricontrollata in browser reale
- console warning su `/la-tua-spedizione/2`: `0`

### Rischi e blocchi ancora aperti
- Lo step 2 non è ancora rifatto fino al livello del prototipo: ora non è più rotto nei punti appena corretti, ma serve ancora una tranche più grossa su gerarchia, caratterizzazione e coerenza dei servizi.
- `Google OAuth` su preview è rotto per `redirect_uri_mismatch` e va corretto a livello config/callback.
- Shell account/admin ancora troppo neutra rispetto al brand pubblico.

## 2026-04-01 04:10 CEST — STEP2 follow-up: icon filter, calendar radius, address controls, dead CSS cleanup

### Cosa ho cambiato
- `pages/la-tua-spedizione/[step].vue`:
  - introdotto `SERVICE_ICON_FILTER_ACTIVE` separato da `SERVICE_ICON_FILTER_IDLE`
  - passato il filtro attivo corretto a `StepServicesGrid`
- `components/shipment/StepPickupDate.vue`:
  - resa più rettangolare delle frecce calendario
  - mantenuto il calendario su track nativa orizzontale, senza Swiper
- `components/shipment/AddressToolbar.vue`:
  - radius dei dropdown e dei mini prompt portato alla stessa famiglia dei controlli del funnel
- `components/shipment/AddressPudoSection.vue`:
  - toggle consegna meno tondo
  - pannello PUDO e card selezione con radius più coerente
- `assets/css/shipment-step.css`:
  - compattata la verticale di `services-stage-shell` e delle service card
  - trasformato `service-card-tile__body-hit` in grid con gap unico
  - rimosse regole CSS morte per vecchi switch/configure/footer non più usati nel funnel attuale
  - radius dei controlli step2 allineato alla variabile `--sf-radius-control`

### Root cause affrontate
- filtro icona attiva non distinto nello step, con rischio di icone selezionate poco leggibili
- calendario e controlli troppo pill-like rispetto alla grammatica generale del sito
- spaziature verticali sommate in più wrapper, che generavano percezione di card “vuote” o disallineate
- CSS morto dei vecchi switch/configure che aumentava il rumore del componente

### Verifiche fatte
- `git diff --check` sui file di ownership coinvolti: `OK`
- parse Vue SFC: `OK` su:
  - `pages/la-tua-spedizione/[step].vue`
  - `components/shipment/StepPickupDate.vue`
  - `components/shipment/AddressToolbar.vue`
  - `components/shipment/AddressPudoSection.vue`
- ricerca residui:
  - nessun riferimento rimasto a `service-card-tile__switch`, `service-support-field__switch` o `service-card-tile__configure` nei file step2 toccati

### Nota runtime
- la verifica visuale browser del nuovo layout non è stata eseguibile qui perché il Nuxt locale richiede Node 20+, mentre l'ambiente disponibile resta bloccato su Node 18.

### Micro-update indirizzi
- `components/shipment/AddressFormFields.vue`:
  - dropdown city / provincia / CAP riallineati a `rounded-[16px]` per stare nella stessa famiglia di radius di step2

## 2026-04-02 03:00 CEST — STEP2 services shell polish + verifica reale locale e preview

### Cosa ho cambiato
- `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - featured card resa meno “seconda hero” e più sorella delle altre card
  - rimosso l’arancione improprio dal micro-pulsante `Attiva` della featured
  - copy featured riallineato al prototipo: `Niente stampante? Il corriere pensa a tutto lui.`
  - eliminata la duplicazione del meta stato quando coincide col badge calcolato
  - aggiunto helper inline esplicito sotto `Salva e attiva` quando la configurazione non è ancora completa
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - `services-stage-shell` promossa a vera sezione con shell bianca, bordo e accento superiore teal
  - `service-group-shell` convertita da wrapper trasparente a contenitore interno leggibile
  - card servizi alleggerite: più bianche, meno gradient full-card, meno teal dominante
  - featured service riportata nella stessa grammatica delle altre card, con solo badge/prezzo come accento
  - mobile step2 più leggibile:
    - aside servizi in riga invece che stack forzato
    - bottoni non più full-width inutilmente aggressivi
    - azioni del pannello inline in colonna piena solo dove serve davvero
  - rimosse definizioni duplicate vecchie di `services-stage-shell`

### Root cause affrontate
- step 2 ancora troppo lontano dal prototipo nel blocco servizi: sezione senza shell chiara, card troppo “galleggianti”, featured troppo enfatizzata
- stato dei servizi comunicato in modo ridondante e poco prevedibile
- teal usato troppo come dominante nei selected/expanded, contro la regola fissata
- `Salva e attiva` disabilitato senza spiegazione sufficiente

### Verifiche reali fatte
- Locale browser reale:
  - `/preventivo` compilata con flusso vero
  - avanzamento reale a `/la-tua-spedizione/2`
  - apertura `Contrassegno` inline: `OK`
  - apertura `Assicurazione` dopo `Contrassegno`: una sola card configurabile aperta alla volta `OK`
  - inserimento `Contenuto del pacco`: `Compila indirizzi` si abilita `OK`
  - avanzamento reale a `/la-tua-spedizione/2?step=ritiro`: `OK`
  - console locale step2/step3: `0 error`, `0 warning`
- Preview online browser reale:
  - `URL_ONLINE.txt` vivo e runtime `200`
  - `/preventivo` caricata correttamente
  - autocomplete origine/destinazione verificato su preview
  - avanzamento reale a `https://die-sharing-scsi-mechanism.trycloudflare.com/la-tua-spedizione/2`: `OK`

### Artifact utili generati
- `output/playwright/step2-after-services-polish-20260402.png`
- `output/playwright/step2-contrassegno-open-20260402.png`
- `output/playwright/step2-after-content-20260402.png`
- `output/playwright/step3-after-step2-20260402.png`
- `output/playwright/preview-step2-after-services-polish-20260402.png`

### Rischi e blocchi ancora aperti
- Lo step 2 è più coerente e leggibile, ma non è ancora finito al livello del prototipo: serve una tranche dedicata su pickup-date fine tuning, densità desktop e shell indirizzi.
- `Assicurazione` aperta su mobile è ancora funzionale ma visivamente comprimibile meglio rispetto al prototipo.
- account/admin restano da riallineare in una tranche separata più grossa.

## 2026-04-02 03:58 CEST — Step indirizzi alleggerito + auth riallineata + verifica runtime/preview

### Cosa ho cambiato
- `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
  - tolto il chip duplicato della modalita in header per ridurre rumore e doppioni con la card destinazione
  - accorciata la CTA di riuso in `Spedizione configurata`
- `nuxt-spedizionefacile-master/components/shipment/AddressPudoSection.vue`
  - sezione consegna alleggerita nel copy
  - rimossa l'intro ridondante a blocco e lasciato un testo singolo piu asciutto
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - sezione consegna trasformata da “card dentro card” a sottosezione interna piu piatta
  - tolto il chip header non piu usato
  - ridotto l'effetto matrioska nel blocco PUDO
- `nuxt-spedizionefacile-master/pages/autenticazione.vue`
  - shell auth ripulita: title/copy piu vicini al prototipo, rimossi kicker/pills superflui
- `nuxt-spedizionefacile-master/assets/css/autenticazione.css`
  - frame auth piu compatto
  - gerarchia dell'hero ripulita e meno decorativa
- `nuxt-spedizionefacile-master/assets/css/auth-overlay.css`
  - tab attiva resa chiara/neutra invece che teal pieno
  - CTA primaria auth resa arancione coerente con la regola di conversione primaria

### Verifiche reali fatte
- Runtime locale ricertificato:
  - `3001`: `200`
  - `8000`: `200`
  - `8787`: `200`
- Preview online ricertificata:
  - `URL_ONLINE.txt` aggiornato a `https://democrat-shanghai-census-disposal.trycloudflare.com`
- Browser reale / smoke browser:
  - locale auth aggiornata visivamente: `OK`
  - login locale demo `Cliente` -> redirect `/account`: `OK`
  - locale `/preventivo`: `OK`
  - preview auth: HTML/DOM corretto e titolo corretto `OK`
  - preview auth login form con attesa lunga di idratazione:
    - `POST /api/custom-login`: `200`
    - `GET /api/user`: `200`
    - redirect finale a `/account`: `OK`
  - preview headless continua a mostrare testo/paint anomali nei PNG durante l'idratazione dev: da trattare come anomalia di rendering della preview, non come login rotto

### Artifact utili generati
- `output/playwright/auth-local-after-20260402.png`
- `output/playwright/auth-login-local-20260402.png`
- `output/playwright/preventivo-local-after-20260402.png`
- `output/playwright/preview-auth-after-20260402.png`
- `output/playwright/preview-auth-stable-20260402.png`
- `output/playwright/auth-login-preview-20260402.png`
- `output/playwright/auth-login-preview-form-20260402.png`

### Root cause importanti emerse
- Il locale e la preview non stanno degradando nello stesso modo:
  - locale auth idrata e logga correttamente
  - preview auth su headless carica HTML/DOM corretti ma mostra paint placeholder molto piu a lungo
- nei log Nuxt durante i test preview e' comparso anche `IPC connection closed` mentre i CSS andavano in HMR:
  - questo ha generato almeno un falso `500` temporaneo su `/autenticazione`
  - non va confuso con un bug stabile di template

### Rischi e blocchi ancora aperti
- `account / pro / admin` restano il workstream successivo prioritario: stessa shell, stessa grammatica del pubblico, meno pulsanti legacy, nav admin da pulire
- lo step indirizzi e' piu ordinato, ma va ancora rifinito con una verifica locale step-3 piena dopo compilazione completa del flusso
- la preview auth e' funzionale, ma i PNG headless restano poco affidabili per valutazione visuale fine durante l'idratazione dev

## 2026-04-02 04:07 CEST — Shell account/admin unificata + verifica locale/preview

### Cosa ho cambiato
- `nuxt-spedizionefacile-master/components/account/AccountPageHeader.vue`
  - esteso l'header condiviso per supportare `identity` slot e content slot sotto il blocco hero
  - eliminata la necessità di hero separati nelle pagine account/admin
- `nuxt-spedizionefacile-master/pages/account/amministrazione/index.vue`
  - rimosso l'hero admin duplicato con tab `Admin / Pro / Base` che confondeva navigazione e ruolo
  - riallineata la pagina al prototipo con header unico branded, summary strip compatta e band primaria `Spedisci ora`
  - ridotta la superficie admin a una gerarchia più chiara: hero -> CTA band -> sezione `Amministrazione`
- `nuxt-spedizionefacile-master/pages/account/index.vue`
  - dashboard account resa più coerente con la shell admin
  - mantenuta la panoramica come header stabile e spostata l'identità ricca nel blocco overview sottostante
  - corretti fallback nome/initials senza reintrodurre mismatch SSR/client
- `nuxt-spedizionefacile-master/assets/css/account-shell.css`
  - introdotte primitive condivise per identity avatar e summary strip
  - rimossi gli stili dedicati al vecchio hero admin (`sf-admin-dashboard-hero*`, `sf-admin-dashboard-tab*`)
  - ridotta duplicazione visiva tra account e admin

### Verifiche reali fatte
- Runtime locale ricertificato dopo il refactor:
  - `8000`: `200`
  - `8787`: `200`
- Preview online ricertificata:
  - `URL_ONLINE.txt` aggiornato a `https://democrat-shanghai-census-disposal.trycloudflare.com`
- Browser reale headless locale:
  - login admin su `/autenticazione?redirect=/account/amministrazione`: `POST /api/custom-login = 200`
  - redirect finale a `/account/amministrazione`: `OK`
  - navigazione successiva a `/account`: `OK`
- Browser reale headless preview:
  - login admin preview: `OK`
  - `/account/amministrazione`: `OK`
  - `/account`: `OK`
- Console dopo restart locale + preview:
  - rimossi i mismatch di hydration introdotti dalla tranche account/admin
  - resta un `401` iniziale su `GET /api/user` prima del login nella pagina auth, non bloccante per il flusso autenticato

### Artifact utili generati
- `output/playwright/local-admin-dashboard-final-20260402.png`
- `output/playwright/local-account-dashboard-after-shell-hydration-fix-restart-20260402.png`
- `output/playwright/preview-admin-dashboard-final-20260402.png`
- `output/playwright/preview-account-dashboard-after-shell-hydration-fix-restart-20260402.png`

### Rischi e blocchi ancora aperti
- la shell account/admin è più coerente, ma le sottopagine profonde admin contengono ancora molti controlli legacy (`rounded-[50px]`, pulsanti teal hardcoded, form pills incoerenti) da rifare come tranche successiva del design system
- resta da attaccare il workstream auth/header per il `401` guest iniziale su `/api/user` e per la pulizia definitiva del bootstrap guest/auth
- il workstream backend hardening resta aperto su pricing authority, idempotenza e snapshot pricing

## 2026-04-02 09:58 CEST — Ripartenza pulita dopo blocco: hydration auth/account chiusa + hygiene minima + densità step indirizzi ridotta

### Cosa ho cambiato
- `nuxt-spedizionefacile-master/layouts/default.vue`
  - l'`AuthOverlayModal` globale ora viene renderizzato dentro `ClientOnly`
  - chiuso il mismatch hydration del modale auth shared nel layout pubblico
- `laravel-spedizionefacile-main/app/Support/AuthUiCookie.php`
  - il cookie SSR-safe `sf_auth_ui` ora include anche `surname`, `email`, `createdAt`, `userType`
  - la shell `/account` non dipende più da un cookie troncato che mostrava `L`, `Ciao, Luca`, `Oggi` e poi cambiava dopo hydration
- `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
  - copy step indirizzi semplificato
  - CTA secondaria di riuso resa più chiara: `Usa spedizione salvata`
- `nuxt-spedizionefacile-master/components/shipment/AddressFormFields.vue`
  - blocco contatto reso a colonna singola per ridurre scansione laterale e rumore
  - dettagli facoltativi non più su doppia colonna
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - optional grid indirizzi appiattita a una sola colonna
- `nuxt-spedizionefacile-master/components/CookieBanner.vue`
  - banner cookie trasformato da barra full-width a pannello flottante compatto
  - non copre più in modo aggressivo CTA e sezione finale del funnel
- `.gitignore`
  - aggiunti ignore per `.playwright-*`, `output/`, `test-results/`, `playwright-report/`, `NUL` e file cookies malformato locale
  - ripuliti i dump tool-generated più rumorosi già presenti in root/repo

### Verifiche reali fatte
- Runtime locale ricertificato:
  - `3001`: `200`
  - `8000`: `200`
  - `8787`: `200`
- Preview online corrente riletta da `URL_ONLINE.txt`:
  - `https://folder-across-carroll-writers.trycloudflare.com`
- Browser reale locale:
  - `/autenticazione?redirect=/account`: `OK`
  - nessun warning filtrato su `hydration|mismatch|401|unauthorized` nella pagina auth dopo il fix `ClientOnly`
  - login demo `Cliente`: `POST /api/custom-login = 200`
  - redirect finale a `/account`: `OK`
  - mismatch hydration account dopo login: `RISOLTO`
- Browser reale preview:
  - pagina auth/account raggiungibile sul tunnel corrente
  - nessun warning filtrato su `hydration|mismatch|401|unauthorized|failed to load resource` nel check effettuato sul dominio preview corrente

### Artifact utili generati
- `output/playwright/auth-fresh-20260402.png`
- `output/playwright/account-after-cookie-fix-20260402.png`
- `output/playwright/preview-auth-after-modal-fix-20260402.png`
- `output/playwright/auth-cookie-banner-floating-20260402.png`

### Root cause importante chiusa
- Il mismatch account non era più nel template ma nel cookie backend `sf_auth_ui`:
  - il backend emetteva solo `name` e `role`
  - SSR renderizzava una versione povera della shell account
  - il client poi la completava con `surname/email/created_at`, generando mismatch reali

### Rischi e blocchi ancora aperti
- step indirizzi: migliorato nel copy e nella densità, ma va ancora rifinito strutturalmente contro prototipo/Figma con verifica completa del flusso fino a riepilogo
- preview Cloudflare resta volatile: usare sempre `URL_ONLINE.txt` come fonte di verità prima dei test
- backend hardening ancora aperto su pricing authority, `client_submission_id`, `pricing_signature`/snapshot, idempotenza pagamento/checkout e coerenza BRT

## 2026-04-02 10:20 CEST — Checklist step 2 e hardening wallet completion

### Cosa ho cambiato
- `nuxt-spedizionefacile-master/composables/useShipmentStepFlow.js`
  - aggiunta `addressReadinessItems` come source of truth per il passaggio servizi -> indirizzi
  - lo stato del bottone non è più una condizione opaca ma una checklist esplicita
- `nuxt-spedizionefacile-master/components/shipment/StepNavigation.vue`
  - aggiunta checklist visiva desktop/mobile con:
    - `Giorno di ritiro`
    - `Contenuto del pacco`
  - il bottone `Compila indirizzi` resta l'unica primary, ma ora spiega perché non è ancora disponibile
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
  - passaggio dei nuovi indicatori di readiness alla navigation
- `laravel-spedizionefacile-main/app/Http/Controllers/StripeController.php`
  - `mark-order-completed` per `wallet` ora verifica davvero un `WalletMovement` confermato e coerente con:
    - utente proprietario
    - riferimento `order-{id}`
    - importo ordine
    - `source=wallet`
    - `type=debit`
    - `status=confirmed`
  - senza movimento verificato l'ordine non viene più chiuso come pagato
- `nuxt-spedizionefacile-master/composables/useCheckout.js`
  - il frontend non accetta più fallback sporchi tipo `Date.now()` per l'`ext_id` wallet
  - se manca l'ID del movimento wallet mostra errore e interrompe la chiusura ordine
- `laravel-spedizionefacile-main/tests/Feature/Payments/StripeHardeningTest.php`
  - aggiunti test per:
    - rifiuto di `mark-order-completed` wallet senza movimento verificato
    - accettazione del caso wallet con movimento confermato coerente

### Verifiche reali fatte
- parse/sintassi:
  - `StepNavigation.vue`: `OK`
  - `StripeController.php`: `php -l OK`
  - `StripeHardeningTest.php`: `php -l OK`
- browser reale locale:
  - auth/account ancora `OK` dopo le modifiche
  - il route direct a `/la-tua-spedizione/2` senza stato valido continua a ricadere su `/preventivo`, quindi la nuova checklist step-2 va ricertificata nel flusso completo seeded e non tramite deep-link vuoto

### Rischi e blocchi ancora aperti
- step 2 e step 3 restano da ricertificare in browser sul flusso completo con dati validi fino a riepilogo
- backend hardening wallet è chiuso come bypass principale, ma restano aperti:
  - pricing authority finale server-side
  - `client_submission_id` con serializzazione reale
  - snapshot/signature realmente autorevoli

## 2026-04-02 11:35 CEST — Submission context ridotto, lock transazionali e pulizia step indirizzi

### Cosa ho cambiato
- `nuxt-spedizionefacile-master/composables/useRiepilogo.js`
  - il frontend non genera più due contesti diversi per la stessa submission
  - lato client nasce solo `client_submission_id`
  - `pricing_signature` e `pricing_snapshot` non vengono più costruiti in `riepilogo`
- `nuxt-spedizionefacile-master/utils/shipmentSubmissionContext.js`
  - rimosso del tutto perché rimasto orfano dopo il refactor
- `laravel-spedizionefacile-main/app/Http/Controllers/StripeController.php`
  - `createOrder()` ora gira dentro `DB::transaction(...)` con `lockForUpdate()` sul record utente
  - lookup ordini esistenti e creazione ordini sono nello stesso blocco serializzato
- `laravel-spedizionefacile-main/app/Http/Controllers/OrderController.php`
  - stessa serializzazione applicata a `createDirectOrder()`
  - check `client_submission_id` e creazione ordine ora stanno nello stesso blocco transazionale
- `nuxt-spedizionefacile-master/components/shipment/AddressFormFields.vue`
  - nel caso PUDO destinazione non renderizza più il blocco indirizzo readonly duplicato
- `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
  - rimossi modifier morti
  - note contestuali non si sommano più all’alert errori globale
  - hint partenza/destinazione spostati nella gerarchia naturale della card
- `nuxt-spedizionefacile-master/components/shipment/StepNavigation.vue`
  - copy primary/secondary reso coerente tra desktop e mobile
  - checklist incomplete resa neutra, meno arancione
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - `field-assist-chip` portato su tono neutro/teal invece che arancione
  - rimossa regola morta `.title-popup::after`
  - fusa la doppia dichiarazione `.address-stage-actions__group`
  - aggiunta sola utility minima per gli hint inline delle card

### Verifiche reali fatte
- parse/sintassi:
  - `node --check nuxt-spedizionefacile-master/composables/useRiepilogo.js`: `OK`
  - parse SFC con `@vue/compiler-sfc`:
    - `StepNavigation.vue`: `OK`
    - `StepAddressSection.vue`: `OK`
    - `AddressFormFields.vue`: `OK`
- backend:
  - `php -l`:
    - `StripeController.php`: `OK`
    - `OrderController.php`: `OK`
    - `StripeHardeningTest.php`: `OK`
    - `OrderControllerTest.php`: `OK`
  - `php artisan test --filter=StripeHardeningTest`: `13 passed`
  - `php artisan test --filter=OrderControllerTest`: `8 passed`
- runtime:
  - bind locale reale rilevato su `192.168.80.1`
  - da questa sessione `127.0.0.1:3001/8000/8787` non rispondono, mentre `192.168.80.1:3001/8000/8787` sì
- browser reale:
  - screenshot locale generato: `output/playwright/step3-local-after-cleanup-20260402.png`
  - il test browser seeded per step indirizzi/riepilogo non è ancora chiuso end-to-end:
    - una parte dei tentativi viene ributtata su `/preventivo`
    - un’altra parte non espone il submit atteso nel DOM montato
  - quindi la certificazione visuale di step 3 dopo questa tranche è `PARZIALE`, non ancora finale

### Stato vero dopo questa tranche
- chiuso un pezzo importante di pulizia:
  - un solo `client_submission_id` lato frontend
  - helper duplicato eliminato
  - doppio readonly PUDO rimosso
  - step navigation più coerente e meno rumorosa
- chiuso un pezzo importante di hardening:
  - `create-order` e `create-direct-order` non sono più split tra lookup e create fuori transazione
- ancora aperto:
  - ricertificazione browser reale locale + preview di step 3 fino a riepilogo
  - riduzione finale di `pricing_signature` / `pricing_snapshot` a sola authority server-side
  - account/admin shell unificata fino a target Figma

## 2026-04-02 12:40 CEST — Shell account/admin riallineata al brand pubblico

### Cosa ho cambiato
- `nuxt-spedizionefacile-master/assets/css/account-shell.css`
  - background della shell reso più vicino al prototipo: grigio chiaro, meno rumore decorativo
  - header card resa più pulita e coerente con il brand pubblico
  - summary strip trasformata in card vere, con spacing e gerarchia più leggibili
  - avatar identità portato più vicino alla dimensione del nodo Figma
  - admin feature grid portata a 3 colonne su desktop per far andare a capo la quarta card come nel layout di riferimento
- `nuxt-spedizionefacile-master/pages/account/index.vue`
  - rimossa la CTA secondaria ridondante dalla banda spedizione
  - mantenuta una sola primary action visibile nella superficie
- `nuxt-spedizionefacile-master/pages/account/account-pro.vue`
  - header reso meno rumoroso: niente breadcrumb visibile, solo back link all'account
- `nuxt-spedizionefacile-master/pages/account/amministrazione/index.vue`
  - rimossi i breadcrumb dalla home admin per avvicinare la pagina al dashboard Figma
  - shell e CTA mantenute più coerenti con il pubblico

### Verifiche reali fatte
- parse SFC con `@vue/compiler-sfc`:
  - `AccountPageHeader.vue`: `OK`
  - `pages/account/index.vue`: `OK`
  - `pages/account/account-pro.vue`: `OK`
  - `pages/account/amministrazione/index.vue`: `OK`
- diff check:
  - `git diff --check --ignore-space-at-eol` sui file toccati: `OK`

### Blocco residuo
- browser reale e preview online non sono stati recertificati in questa sottotrance perché il browser del tool risultava già occupato da un'altra istanza e non accettava una sessione nuova in WSL
- appena si libera il browser, il prossimo controllo giusto è:
  - `/account`
  - `/account/account-pro`
  - `/account/amministrazione`
  - confronto visivo rapido con Figma 32:5016

## 2026-04-02 11:40 CEST — Pricing e submission piu server-authoritative

### Cosa ho cambiato
- `laravel-spedizionefacile-main/app/Services/CheckoutSubmissionContextService.php`
  - il client non passa più `pricing_signature` o `pricing_snapshot` nel contesto submission
  - la signature ora viene sempre derivata dallo snapshot server-side normalizzato
- `laravel-spedizionefacile-main/app/Http/Controllers/StripeController.php`
  - rimosso il sync del contesto preventivo dai flussi di pagamento
  - `createPayment` e `createPaymentIntent` non riscrivono più l'ordine con dati del payload
  - l'idempotency key ora può usare `client_submission_id` direttamente dalla request senza mutare l'ordine
  - request contract ripulito da snapshot/signature inutili
- `laravel-spedizionefacile-main/app/Http/Requests/PackageStoreRequest.php`
  - tolti i campi pricing/snapshot duplicati e obsoleti
- `laravel-spedizionefacile-main/tests/Feature/Payments/StripeHardeningTest.php`
  - aggiornati i test per verificare che signature/snapshot siano server-generated e che i payment intent non mutino il contesto ordine
- `laravel-spedizionefacile-main/tests/Feature/Orders/OrderControllerTest.php`
  - aggiornato il test sul direct order per verificare che il snapshot finale non dipenda dal payload client

### Verifiche reali fatte
- `php -l` su file PHP toccati: `OK`
- `php artisan test --filter=StripeHardeningTest`: `13 passed`
- `php artisan test --filter=OrderControllerTest`: `8 passed`

### Stato vero dopo questa tranche
- il backend si fida meno del payload e di più del proprio calcolo
- restano aperti:
  - certificazione browser end-to-end del funnel step 3
  - shell account/admin
  - hardening finale pricing/quote snapshot se ci sono residui legacy da eliminare

## 2026-04-02 13:50 CEST — Auth shell riallineata al prototipo e alla grammatica del sito

### Cosa ho cambiato
- `nuxt-spedizionefacile-master/pages/autenticazione.vue`
  - rimosso il vecchio stack basato su `UTabs`/social auth
  - introdotto un auth shell unico con hero, tabs, form e demo access cards nello stesso linguaggio visivo del prototipo
  - eliminati gli assignment inline nei template e sostituiti con helper espliciti per il ritorno al login
- `nuxt-spedizionefacile-master/pages/recupera-password.vue`
  - portata nella stessa shell auth con card, hero e feedback coerenti
- `nuxt-spedizionefacile-master/pages/aggiorna-password.vue`
  - portata nella stessa shell auth
  - sostituito il width inline con una classe condivisa
- `nuxt-spedizionefacile-master/pages/verifica-email.vue`
  - resa coerente con la stessa grammatica auth/feedback
- `nuxt-spedizionefacile-master/components/auth/AuthLoginForm.vue`
  - rimosso il submit duplicato e il form adesso usa un solo canale di submit
- `nuxt-spedizionefacile-master/components/auth/AuthRegisterForm.vue`
  - rimossi handler duplicati su campi password
  - CTA allineata alla grammatica "Registrati e continua"
- `nuxt-spedizionefacile-master/components/auth/AuthVerificationForm.vue`
  - allineata alla shell auth condivisa
- `nuxt-spedizionefacile-master/components/CookieBanner.vue`
  - banner reso meno invasivo sul desktop, così non copre più la CTA auth
- `nuxt-spedizionefacile-master/assets/css/autenticazione.css`
  - consolidata la shell auth, i card demo, la gerarchia hero, gli stati feedback e la variante wide
- `nuxt-spedizionefacile-master/assets/css/auth-overlay.css`
  - normalizzati tab, input, primary button e verifiche per riusare la stessa grammatica tra overlay e pagine

### Verifiche reali fatte
- browser locale su `http://192.168.80.1:8787/autenticazione`
  - login: OK
  - registrazione: OK
  - cookie banner: non invade più la CTA principale
- screenshot e snapshot Playwright aggiornati dopo i fix

### Stato vero dopo questa tranche
- auth/login/register è molto più vicino al prototipo `32:3884` e alla grammatica generale del sito
- restano ancora aperti:
  - verifica finale su recupero password e verifica email con gli stessi screenshot/refs
  - shell account/admin
  - hardening backend finale e certificazione end-to-end step 3 / riepilogo / checkout

## 2026-04-02 12:12 CEST — Preventivo senza mismatch, step 3 ripulito e preview riallineata

### Cosa ho cambiato
- `nuxt-spedizionefacile-master/composables/useQuickQuotePackages.js`
  - rimossi gli ID collo basati su `Date.now()`
  - la generazione `_qid` ora è monotona e riallineabile allo stato reale dei pacchi
  - tolta una fonte concreta di divergenza SSR/client nel preventivo
- `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
  - spostate le utility di rubrica sotto le card principali
  - il primo viewport dello step indirizzi mostra subito il task principale: `Partenza` e `Destinazione`
- `scripts/avvia-cloudflare.ps1`
  - il tunnel non assume più ciecamente `127.0.0.1`
  - ora risolve l'origin più raggiungibile prima di avviare Cloudflare
- `scripts/avvia-cloudflare.sh`
  - stesso riallineamento del target origin lato shell/Linux

### Verifiche reali fatte
- locale same-origin `http://192.168.80.1:8787/preventivo`
  - console Playwright dopo la patch: `0 warning`, `0 error`
  - title corretto: `Preventivo Spedizione Gratuito | SpediamoFacile`
- preview online corrente da `URL_ONLINE.txt`
  - `https://folder-across-carroll-writers.trycloudflare.com/preventivo`
  - `HTTP 200`
  - snapshot Playwright aperta correttamente
  - console Playwright: `0 warning`, `0 error`
- step 3 seedato in browser reale same-origin
  - `POST /api/session/first-step = 200`
  - `POST /api/session/second-step = 200`
  - route finale: `/la-tua-spedizione/2?step=ritiro`
  - title corretto e page load regolare dopo il refactor
- auth/account/admin in browser reale same-origin
  - login demo cliente -> `/account`: OK
  - login demo admin -> `/account/amministrazione`: OK
  - console Playwright su entrambe le superfici: `0 warning`, `0 error`

### Stato vero dopo questa tranche
- il vecchio mismatch hydration del `Preventivo` non risulta più riprodotto nella certificazione browser locale né sulla preview online corrente
- il task principale dello step indirizzi è più leggibile perché le utility non precedono più le due card principali
- preview e runtime sono meno fragili perché i tunnel Cloudflare possono puntare all'origin realmente raggiungibile da questa macchina
- restano aperti i blocchi grossi già noti:
  - semplificazione decisionale dello step 2 servizi rispetto al nodo `32:2897`
  - convergenza finale shell account/pro/admin verso il reference `32:5016`
  - hardening backend finale su authority del pricing e riduzione dei residui legacy

## 2026-04-02 12:20 CEST — Step 2 più asciutto e redirect guard meno rumoroso

### Cosa ho cambiato
- `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - tolti i badge di stato ridondanti dalle card servizi normali
  - una sola support line per card invece di badge + meta + descrizione contemporanei
  - featured `Senza etichetta` ripulito dall'ulteriore pill `Attivo`
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - rimossi gli stili morti collegati alle pill stato dei servizi
  - aggiunta una variante più sobria per le support line di stato
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
  - tolto il wiring dei badge servizi non più usati dal grid
- `nuxt-spedizionefacile-master/middleware/shipment-validation.js`
  - ridotto il rumore del redirect guard: niente toast durante la hydration iniziale

### Verifiche reali fatte
- parse SFC:
  - `components/shipment/StepServicesGrid.vue`: `OK`
  - `pages/la-tua-spedizione/[step].vue`: `OK`
- browser locale same-origin:
  - seed step 1 -> apertura `/la-tua-spedizione/2`: `OK`
  - console step 2 dopo apertura: `0 warning`, `0 error`
- preview online:
  - deep-link `/la-tua-spedizione/2` continua a rimbalzare correttamente verso `/preventivo`
  - il toast di redirect non è più il problema principale

### Stato vero dopo questa tranche
- lo step 2 servizi è meno rumoroso e più vicino alla grammatica “una decisione, una riga, una CTA”
- resta però un residuo preview-specifico:
  - il `Preventivo` continua a produrre un hydration mismatch quando viene raggiunto tramite redirect da una route protetta sul dominio Cloudflare
  - lo stesso mismatch non risulta nella certificazione locale same-origin né nell'apertura diretta di `/preventivo`
- prossimo nodo giusto:
  - isolare perché il redirect remoto verso `/preventivo` genera ancora mismatch mentre il preventivo diretto è pulito

## 2026-04-02 12:38 CEST — Redirect preview ripulito lato SSR e step 2 meno matrioska

### Cosa ho cambiato
- `nuxt-spedizionefacile-master/nuxt.config.ts`
  - le route del funnel che dipendono dalla sessione browser (`/la-tua-spedizione/**`, `/riepilogo`, `/checkout`) ora sono `ssr: false`
  - il server non prova più a renderizzare uno step del funnel che poi il client corregge subito verso `/preventivo`
- `nuxt-spedizionefacile-master/components/shipment/StepNavigation.vue`
  - rimossa la checklist a pill duplicate sotto la CTA di passaggio
  - sostituita con una sola riga di readiness, più prevedibile e meno rumorosa su desktop/mobile
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - alleggerito il gruppo servizi: niente box interno aggiuntivo
  - card servizi compatte con shadow più sobria
  - `Senza Etichetta` selezionato torna su accento caldo coerente col prototipo, senza deriva teal dominante
- `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - riallineato il copy della card featured a `Senza Etichetta`

### Verifiche reali fatte
- preview online corrente da `URL_ONLINE.txt`
  - `https://folder-across-carroll-writers.trycloudflare.com/la-tua-spedizione/2`
  - console Playwright dopo il deep-link: `0 warning`, `0 error`
  - il residuo di hydration mismatch sul redirect verso `/preventivo` non risulta più nel caso critico che ci bloccava
- preview online `/preventivo`
  - `HTTP 200` confermato
- controlli tecnici locali
  - `middleware/shipment-validation.js`: `node --check OK`
  - `components/shipment/StepNavigation.vue`: parse SFC `OK`
  - `components/shipment/StepServicesGrid.vue`: parse SFC `OK`

### Stato vero dopo questa tranche
- il blocco runtime/preview che falsava parte del QA funnel è rientrato: la preview non sta più SSRizzando uno step che il client rimpiazza subito
- lo step 2 è più vicino al reference Figma `32:2897` in due punti chiave:
  - meno box dentro box
  - featured service con accento arancione più controllato
- restano aperti i workstream grossi:
  - convergenza finale step 3 indirizzi sul node `33:6174`
  - shell account/pro/admin sul node `32:5016`
  - authority/idempotenza pricing backend fino a chiusura reale

## 2026-04-02 12:57 CEST — Step 2 ricertificato su locale + preview con copy/prezzi più puliti

### Cosa ho cambiato
- `nuxt-spedizionefacile-master/composables/useShipmentStepServices.js`
  - copy servizi accorciato e riallineato al prototipo
  - `Senza etichetta` mostra il prezzo diretto senza prefisso `+`
  - `Contrassegno` e `Assicurazione` usano una sintassi prezzo più leggibile (`da X + Y%` invece di `da X / Y%`)
- `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - le card configurabili in stato chiuso mostrano prima il support text utile (`Da configurare`, `Copertura completa`) e non il testo lungo descrittivo
- `nuxt-spedizionefacile-master/components/shipment/StepNavigation.vue`
  - la readiness sotto la CTA è diventata una nota singola e meno invasiva
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - aggiunto stile leggero per la readiness note
  - ritmo tipografico del prezzo servizi leggermente ripulito

### Verifiche reali fatte
- runtime locale rialzato via `scripts/avvia-locale.ps1`
  - `3001 = 200`
  - `8000 = 200`
  - `8787 = 200`
- browser reale locale seedato su step 2
  - screenshot aggiornato: `output/playwright/step2-local-current-20260402b.png`
  - la nota di readiness nuova è presente (`Completa contenuto del pacco per passare agli indirizzi.`)
- browser reale preview online seedato su step 2
  - screenshot aggiornato: `output/playwright/step2-preview-current-20260402.png`
  - nessun warning/error console raccolto nel flusso seedato
- baseline step 3 indirizzi raccolta per la prossima tranche
  - locale: `output/playwright/step3-local-current-20260402b.png`
  - preview: `output/playwright/step3-preview-current-20260402.png`
  - entrambe senza warning/error console nel seed attuale
- deep-link preview non valido
  - `https://folder-across-carroll-writers.trycloudflare.com/la-tua-spedizione/2`
  - atterra su `/preventivo`
  - `warnings = []`

### Stato vero dopo questa tranche
- locale e preview sono di nuovo allineati sullo step 2 attuale
- il funnel è meno rumoroso e più leggibile, ma non è ancora al target finale Figma:
  - indirizzi step 3 ancora troppo indietro
  - shell account/admin ancora da chiudere davvero
  - authority backend finale ancora aperta

## 2026-04-02 13:42 CEST — Accordion one-page ricertificato su locale + preview e guidance servizi completata

### Cosa ho cambiato
- `nuxt-spedizionefacile-master/composables/useShipmentStepServiceCards.js`
  - quando `Salva e attiva` fallisce su un servizio configurabile, la card resta aperta e il focus viene portato subito sul primo campo mancante
  - il comportamento ora e' coerente con la guidance attiva gia' usata per `Continua agli indirizzi`
- confermata la struttura one-page accordion gia' presente in:
  - `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
  - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - `nuxt-spedizionefacile-master/components/shipment/StepNavigation.vue`
  - `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - quando si aprono gli indirizzi, servizi + info aggiuntive si comprimono nel riepilogo compatto `Servizi e dettagli` con CTA `Modifica`

### Verifiche reali fatte
- runtime rialzato via `scripts/avvia-locale.ps1`
  - `3001 = 200`
  - `8000 = 200`
  - `8787 = 200`
- preview online corrente da `URL_ONLINE.txt`
  - `https://beneficial-participant-forget-obvious.trycloudflare.com`
  - `HTTP 200` confermato
- browser reale locale su `http://192.168.80.1:8787`
  - click su `Continua agli indirizzi` con contenuto mancante: scroll + focus sul campo `Contenuto del pacco`
  - click diretto sulla card `Contrassegno`: apre inline la configurazione
  - click su `Salva e attiva` senza dati: errore inline + focus su `Importo`
  - salvataggio valido `Contrassegno`: stato finale `Configurato`, CTA `Modifica`, support text corretto
  - apertura indirizzi: passo 3 attivo e riepilogo compatto servizi/dettagli visibile sopra il blocco indirizzi
- browser reale preview online
  - seed sessione `first-step` riuscito con `200`
  - apertura `/la-tua-spedizione/2?step=ritiro` riuscita
  - riepilogo compatto `Base spedizione pronta` visibile anche in preview

### Artifact utili
- `output/playwright/step2-accordion-before-guidance-20260402.png`
- `output/playwright/step2-after-guidance-click-20260402.png`
- `output/playwright/step3-accordion-open-20260402.png`
- `output/playwright/preview-step3-accordion-20260402.png`

### Stato vero dopo questa tranche
- il requisito UX piu' critico dello step 2 e' chiuso:
  - CTA non morta
  - guidance attiva
  - una sola pagina
  - indirizzi che si aprono sotto e poi comprimono il resto
- resta aperto il lavoro piu' ampio fuori da questa tranche:
  - shell account/pro/admin e coerenza totale bottoni
  - rifinitura strutturale step 3 contro Figma `33:6174`
  - authority backend finale su pricing snapshot/signature e request contract

## 2026-04-02 13:43 CEST — Tranche coerente bottoni account/admin + ricertifica preview funnel

### Cosa ho cambiato
- `nuxt-spedizionefacile-master/composables/useShipmentStepServiceCards.js`
  - `Salva e attiva` sui servizi configurabili non puo' piu' attivare il servizio vuoto al primo salvataggio
  - la validazione inline ora forza davvero il controllo dei campi su `Contrassegno` e `Assicurazione`
- `nuxt-spedizionefacile-master/pages/account/indirizzi.vue`
  - sostituiti i bottoni capsule hardcoded con il canone `btn-primary` / `btn-secondary`
  - punti toccati: CTA `Nuovo indirizzo`, form `Annulla`, submit, empty state
- `nuxt-spedizionefacile-master/pages/account/amministrazione/guide/index.vue`
- `nuxt-spedizionefacile-master/pages/account/amministrazione/blog/index.vue`
- `nuxt-spedizionefacile-master/pages/account/amministrazione/servizi/index.vue`
- `nuxt-spedizionefacile-master/pages/account/amministrazione/ordini.vue`
  - riallineati i CTA principali fuori shell al canone rounded-rectangle gia' usato dal pubblico
  - eliminati i pulsanti teal/orange custom piu' visibili nelle liste admin

### Verifiche reali fatte
- browser reale locale, funnel step 2
  - artifact: `output/playwright/step2-accordion-local-initial.png`
  - artifact: `output/playwright/step2-guidance-after-continue-click.png`
  - artifact: `output/playwright/step2-service-validation-local.png`
  - artifact: `output/playwright/step2-address-accordion-open-local.png`
  - risultato:
    - `Salva e attiva` senza dati mostra errori inline veri
    - apertura indirizzi comprime correttamente il blocco servizi nel riepilogo compatto
- browser reale preview online, funnel step 2
  - artifact: `output/playwright/preview-preventivo-smoke.png`
  - artifact: `output/playwright/step2-preview-seeded.png`
  - risultato:
    - preview seedata con `first-step = 200`
    - `/la-tua-spedizione/2` raggiunta correttamente anche online
- browser reale locale, account/admin dopo cleanup CTA
  - artifact: `output/playwright/account-indirizzi-local.png`
  - artifact: `output/playwright/account-admin-guide-local.png`
  - artifact: `output/playwright/account-admin-blog-local.png`
  - artifact: `output/playwright/account-admin-servizi-local.png`
  - artifact: `output/playwright/account-admin-ordini-local.png`
- browser reale preview online, account/admin
  - artifact: `output/playwright/account-indirizzi-preview.png`
  - artifact: `output/playwright/account-admin-guide-preview.png`
  - risultato:
    - `account/indirizzi` preview coerente con il locale
    - `account/amministrazione/guide` preview resta sospetto nella capture remota e va ricertificato separatamente: il locale e' corretto, ma la resa preview e' ancora da distinguere tra ritardo di rendering e bug reale

### Stato vero dopo questa tranche
- step 2 adesso e' molto piu' vicino alla direzione richiesta:
  - one-page accordion reale
  - guidance attiva
  - servizi configurabili che non passano piu' vuoti
  - indirizzi che assorbono il resto in un riepilogo compatto
- i bottoni piu' incoerenti e ad alta visibilita' di account/indirizzi e delle liste admin principali sono rientrati nel canone comune
- restano aperti i blocchi ancora grossi:
  - shell account/admin completa e non solo singoli CTA
  - pulizia profonda delle pagine admin CRUD con molti input/bottoni capsule legacy
  - validazione finale preview su admin guide
  - hardening backend finale su pricing authority e request contract

## 2026-04-02 14:01 CEST — Funnel pulito nel passaggio agli indirizzi + hardening client_submission_id sui payment endpoint

### Cosa ho cambiato
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
  - quando si apre l'accordion indirizzi ora vengono anche ripuliti gli errori inline residui dei servizi
  - il passaggio servizi -> indirizzi non lascia piu' pannelli configurazione o messaggi sporchi dietro il riepilogo compatto
- `laravel-spedizionefacile-main/app/Http/Controllers/StripeController.php`
  - `createPayment`, `createPaymentIntent`, `markOrderCompleted` e `orderPaid` ora usano davvero `client_submission_id`
  - se l'ordine ha gia' un `client_submission_id` diverso, la richiesta viene rifiutata con `422`
  - se l'ordine e' legacy e il submission context manca, viene sincronizzato sul record ordine in modo coerente
- `laravel-spedizionefacile-main/tests/Feature/Payments/StripeHardeningTest.php`
  - aggiunti casi espliciti per mismatch `client_submission_id`
  - riallineati i test storici al contratto hardening corrente

### Verifiche reali fatte
- runtime Windows locale
  - `3001 = 200`
  - `8000 = 200`
  - `8787 = 200`
- browser reale locale, same-origin `192.168.80.1:8787`
  - seed step 1 riuscito
  - su step 2 `Contrassegno` mostra errore inline reale su `Salva e attiva`
  - dopo apertura indirizzi:
    - `remainingServiceErrors = 0`
    - `remainingExpandedCards = 0`
    - `summaryVisible = 1`
    - route finale `.../la-tua-spedizione/2?step=ritiro`
- browser reale preview online
  - seed `first-step = 200`
  - con attesa `networkidle` e value-check esplicito il passaggio servizi -> indirizzi si conferma anche online
  - risultato finale:
    - route `https://beneficial-participant-forget-obvious.trycloudflare.com/la-tua-spedizione/2?step=ritiro`
    - `summaryVisible = 1`
    - `openAddressHint = 2`
- backend hardening
  - `git diff --check` pulito sui file toccati
  - `php artisan test --filter=StripeHardeningTest --colors=never`
    - `16 passed (83 assertions)`

### Stato vero dopo questa tranche
- il micro-gap UX del funnel e' chiuso in modo pulito:
  - guidance locale + preview
  - errori servizi ripuliti quando il flow passa agli indirizzi
  - riepilogo compatto e accordion coerenti
- il payment flow e' piu' server-authoritative:
  - `client_submission_id` non e' piu' solo validato ma anche verificato/sincronizzato sui payment endpoint
- restano aperti i blocchi piu' grandi:
  - shell account/pro/admin ancora da uniformare in profondita'
  - pulizia delle pagine CRUD admin con controlli legacy ancora fuori canone
  - backend authority residua su pricing snapshot/signature oltre al solo payment path

## 2026-04-02 14:18 CEST — Shell account condivisa, bottoni account riallineati, cookie banner meno invasivo

### Cosa ho cambiato
- `nuxt-spedizionefacile-master/components/account/AccountShellHero.vue`
  - nuovo hero condiviso per `Base`, `Pro`, `Admin`
  - centralizza tabs shell, logout, summary strip e action band
- `nuxt-spedizionefacile-master/pages/account/index.vue`
- `nuxt-spedizionefacile-master/pages/account/account-pro.vue`
- `nuxt-spedizionefacile-master/pages/account/amministrazione/index.vue`
  - ora usano la stessa grammatica branded del hero condiviso
  - il `Pro` non e' piu' una shell piu' povera rispetto a `Base` e `Admin`
- `nuxt-spedizionefacile-master/components/account/AccountProfiloEditForm.vue`
- `nuxt-spedizionefacile-master/components/account/AccountProfiloView.vue`
- `nuxt-spedizionefacile-master/components/account/AccountWalletTopUp.vue`
- `nuxt-spedizionefacile-master/components/account/AccountWalletMovements.vue`
- `nuxt-spedizionefacile-master/components/account/AccountWalletBalanceCards.vue`
  - rimossi altri bottoni capsule hardcoded ad alta visibilita'
  - riallineati a `btn-primary`, `btn-secondary`, `btn-cta`, `btn-compact`
  - il toggle tipo account e' passato a shape piu' rettangolare
- `nuxt-spedizionefacile-master/components/CookieBanner.vue`
  - banner ridotto di larghezza e altezza
  - azioni su una sola riga
  - meno invasivo sulle shell account/mobile

### Verifiche reali fatte
- parse Vue ok
  - `AccountShellHero.vue`
  - `account/index.vue`
  - `account/account-pro.vue`
  - `account/amministrazione/index.vue`
  - componenti account toccati in questa tranche
- `git diff --check` pulito sui file shell condivisi
- browser reale locale `192.168.80.1:8787`
  - `account` shell base ok
  - `account/account-pro` ok
  - `account/amministrazione` con login demo admin ok
  - `account/profilo` edit ok
  - `account/portafoglio` ok
  - console senza errori sulle shell certificate
- browser reale preview online
  - `account/portafoglio` ok dopo login demo cliente e reload
  - `account` shell base ok dopo attesa piu' lunga del tunnel
  - cookie banner ridotto verificato in preview
- backend reale su ambiente Windows
  - `php artisan test --filter=StripeHardeningTest`
    - `16 passed (83 assertions)`
  - `php artisan test --filter=OrderControllerTest`
    - `8 passed (23 assertions)`

### Artifact utili
- `output/playwright/account-wallet-buttons-20260402.png`
- `output/playwright/account-profile-buttons-20260402.png`
- `output/playwright/account-profile-edit-buttons-20260402.png`
- `output/playwright/account-shell-base-after-hero-20260402.png`
- `output/playwright/account-shell-pro-after-hero-20260402.png`
- `output/playwright/account-shell-admin-after-hero-20260402.png`
- `output/playwright/preview-account-wallet-after-demo-20260402.png`
- `output/playwright/preview-account-wallet-reload-waited-20260402.png`
- `output/playwright/preview-account-shell-base-after-hero-waited-20260402.png`
- `output/playwright/preview-account-shell-cookie-reduced-20260402.png`

### Stato vero dopo questa tranche
- il workstream shell/account e' molto piu' pulito:
  - stessa struttura hero su `Base`, `Pro`, `Admin`
  - bottoni account piu' coerenti e meno capsule legacy
  - brand pubblico mantenuto anche nelle aree account/admin
- il replay incoerente di `create-order` con stesso `client_submission_id` e cart mutato risulta coperto dai test hardening gia' presenti e verdi
- resta aperto soprattutto:
  - pulizia profonda delle pagine CRUD admin ancora piene di controlli legacy fuori canone
  - convergenza finale del design system bottoni/input nelle pagine account/admin secondarie
  - hardening residuo oltre il payment path gia' certificato

## 2026-04-02 14:34 CEST — Accordion inline vero sul funnel, admin secondarie riallineate, replay servizi chiuso

### Cosa ho cambiato
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
  - tolto lo `stage swap` a blocchi tra servizi e indirizzi
  - servizi/data/contenuto ora restano nello stesso punto della pagina e si comprimono in un riepilogo compatto quando si aprono gli indirizzi
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - rimosse le animazioni `shipment-stage-swap`
  - aggiunte transizioni inline piu' lineari per summary/details del blocco servizi
- `nuxt-spedizionefacile-master/components/shipment/StepNavigation.vue`
  - CTA piu' esplicite: `Apri indirizzi` e `Vai al riepilogo`
  - guidance attiva confermata: il bottone resta cliccabile e porta al campo mancante
- `nuxt-spedizionefacile-master/pages/account/spedizioni/[id].vue`
- `nuxt-spedizionefacile-master/pages/account/amministrazione/referral.vue`
- `nuxt-spedizionefacile-master/pages/account/amministrazione/utenti.vue`
  - meta pill legacy sostituite con la famiglia condivisa `sf-account-meta-pill`
  - `utenti` riportata sulla grammatica `sf-account-shell-tabs`
  - toolbar ricerca/ruolo riallineata a `form-input`
- `nuxt-spedizionefacile-master/assets/css/auth-overlay.css`
- `nuxt-spedizionefacile-master/components/auth/AuthLoginForm.vue`
- `nuxt-spedizionefacile-master/components/auth/AuthRegisterForm.vue`
- `nuxt-spedizionefacile-master/components/auth/AuthVerificationForm.vue`
- `nuxt-spedizionefacile-master/components/auth/AuthOverlayModal.vue`
- `nuxt-spedizionefacile-master/pages/autenticazione.vue`
- `nuxt-spedizionefacile-master/pages/recupera-password.vue`
- `nuxt-spedizionefacile-master/pages/aggiorna-password.vue`
- `nuxt-spedizionefacile-master/pages/verifica-email.vue`
  - deduplica minima auth: `auth-primary-submit` sostituito dalle primitive condivise e `auth-field-input` ridotto a soli modifier locali
- `laravel-spedizionefacile-main/app/Services/CheckoutSubmissionContextService.php`
- `laravel-spedizionefacile-main/tests/Feature/Orders/OrderControllerTest.php`
  - il fingerprint idempotente ora include un `service_payload` compatto e normalizzato
  - replay con stesso `client_submission_id` ma payload servizi materialmente diverso ora viene respinto con `422`

### Verifiche reali fatte
- parse Vue ok
  - `[step].vue`
  - `StepNavigation.vue`
  - `spedizioni/[id].vue`
  - `referral.vue`
  - `utenti.vue`
  - file auth toccati nella deduplica
- `git diff --check` pulito sui file funnel toccati in questa tranche
- backend reale su ambiente Windows
  - `php -l app/Services/CheckoutSubmissionContextService.php`
  - `php -l tests/Feature/Orders/OrderControllerTest.php`
  - `php artisan test --filter=OrderControllerTest`
    - `9 passed (29 assertions)`
- browser reale locale `192.168.80.1:8787`
  - `/preventivo` -> `/la-tua-spedizione/2` ok
  - guidance attiva ok: `Completa contenuto del pacco` porta focus su `#content_description`
  - apertura accordion ok: `/la-tua-spedizione/2?step=ritiro`
  - riepilogo compatto sopra, indirizzi aperti sotto, niente console error
- browser reale preview online `URL_ONLINE.txt`
  - `/autenticazione?redirect=/account/amministrazione/utenti` ok
  - login demo admin -> `/account/amministrazione/utenti` ok
  - `/preventivo` -> `/la-tua-spedizione/2` ok
  - apertura accordion preview ok: `/la-tua-spedizione/2?step=ritiro`
  - console `error`: `0`

### Artifact utili
- `output/playwright/step2-inline-accordion-local-20260402.png`
- `output/playwright/preview-step2-inline-accordion-20260402.png`
- `output/playwright/preview-admin-utenti-20260402.png`
- `auth-after-primitive-dedup-20260402.png`
- `recupera-password-after-primitive-dedup-20260402.png`

### Stato vero dopo questa tranche
- il funnel e' finalmente piu' vicino al comportamento richiesto:
  - niente swap pagina percepito
  - indirizzi aperti nello stesso flusso
  - CTA meno ambigue
  - guidance attiva invece del blocco passivo
- auth e admin secondarie hanno meno primitive duplicate e meno capsule legacy
- l'idempotenza backend copre anche un cambio materiale del payload servizi
- restano aperti soprattutto:
  - convergenza piu' profonda di step 2/3 verso il prototipo Figma sul piano visivo fine
  - ulteriore pulizia dei duplicati CSS/globali ancora vivi fuori canone
  - hardening residuo su authority pricing/snapshot in altri percorsi oltre il direct-order gia' coperto

## 2026-04-02 15:43 CEST — Motion sottratto, indirizzi asciugati, preview ricertificata su step 2

### Cosa ho cambiato
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
  - tolte le ultime chiamate locali a `scrollIntoView()` nel passaggio servizi -> indirizzi
  - il blocco servizi non resta piu' montato con `v-show`: ora c'e' un solo ramo visibile alla volta
- `nuxt-spedizionefacile-master/composables/useShipmentStepServiceCards.js`
  - rimosso lo scroll automatico `smooth` quando un servizio configurabile ha errori inline
- `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
  - heading indirizzi resa piu' secca
  - menu `Spedizioni salvate` accorciato a `Precompila`
  - tolte duplicazioni testuali nei menu e copy accessori
- `nuxt-spedizionefacile-master/components/shipment/AddressFormFields.vue`
  - labels e placeholder ridotti:
    - `Nome`, `Via`, `N.`, `Prov.`, `Dettagli`
  - niente descrizioni editoriali in testa ai form
- `nuxt-spedizionefacile-master/components/shipment/AddressPudoSection.vue`
  - sezione consegna ridotta a due opzioni nette con `aria-pressed`
  - riepilogo punto BRT selezionato piu' compatto
- `nuxt-spedizionefacile-master/components/shipment/StepPickupDate.vue`
  - slider giorni meno aggressivo e alert alleggerito
- `nuxt-spedizionefacile-master/components/shipment/StepNavigation.vue`
  - CTA piu' corte e piu' esplicite sul dato mancante:
    - `Scegli ritiro`
    - `Completa contenuto`
    - `Compila indirizzi`
    - `Continua`
- `nuxt-spedizionefacile-master/components/shipment/ServiceContentNotifications.vue`
  - sezione ridotta a `Dettagli`
  - placeholder contenuto accorciato
  - niente style inline residui
- `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - featured piu' asciutto
  - separatore opzionali piu' secco
  - servizi selezionati senza sottotesto ridondante
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - tolto altro rumore di movimento:
    - mobile action bar da `fixed` a `sticky`
    - hover lift locale secondari rimosso
    - transizione `transform` rimossa dalle date
  - spaziatura servizi/indirizzi compressa e piu' ordinata
  - `Dettagli` tenuto a distanza piu' corretta dalla sezione sopra
- `nuxt-spedizionefacile-master/assets/css/main.css`
  - rimosso il `translateY(-1px)` dalle primitive condivise:
    - `btn-secondary`
    - `btn-cta`
    - `btn-tertiary`
    - `btn-danger`
    - `sf-action-pill`
  - i bottoni restano coerenti, ma senza micro-salti globali

### Verifiche reali fatte
- parse Vue ok:
  - `[step].vue`
  - `StepAddressSection.vue`
  - `AddressFormFields.vue`
  - `AddressPudoSection.vue`
  - `StepPickupDate.vue`
  - `StepNavigation.vue`
  - `ServiceContentNotifications.vue`
  - `StepServicesGrid.vue`
- `node --check`
  - `useShipmentStepServiceCards.js` ok
- `git diff --check` pulito sui file della tranche
- browser reale via Playwright CLI
  - locale:
    - `/preventivo` -> `/la-tua-spedizione/2` ok nel flusso vero
    - lo step 2 attuale riflette le nuove CTA/guidance
    - nota aperta: un nuovo `goto /la-tua-spedizione/2` in sessione separata puo' ancora rimbalzare a `/preventivo`
  - preview online:
    - `/preventivo` compilato nel flusso vero -> `/la-tua-spedizione/2` ok
    - il bug percepito non era il passaggio a step 2, ma la modalita' di test con input non stabili
    - console `error`: `0`

### Stato vero dopo questa tranche
- migliorati davvero:
  - meno movimento gratuito
  - bottoni meno nervosi
  - servizi piu' leggibili
  - indirizzi meno editoriali e meno pesanti
- aperto ancora:
  - certificazione visiva completa dello stato `indirizzi aperti` in preview con sessione stabile
  - ulteriore sottrazione del chrome negli indirizzi se il browser reale conferma ancora densita' eccessiva
  - convergenza finale step 2/3 sul piano della fedelta' visiva al prototipo

## 2026-04-02 — Tranche funnel lineare + preview ricertificata

### Runtime / preview
- verificato di nuovo il proxy same-origin:
  - locale `http://192.168.80.1:8787` raggiungibile e usabile nel flusso vero
  - preview corrente da `URL_ONLINE.txt`:
    - `https://revised-bouquet-black-helps.trycloudflare.com`
- ricontrollato il percorso completo in browser reale:
  - `/preventivo` -> `/la-tua-spedizione/2`
  - click `Compila indirizzi` con guidance attiva
  - apertura `/la-tua-spedizione/2?step=ritiro`
- preview ricertificata dopo wait aggiuntivo:
  - il primo screenshot remoto era arrivato in stato transitorio/skeleton
  - dopo stabilizzazione il rendering e' risultato coerente
  - console `error`: `0`

### UI / UX sottrattiva chiusa ora
- `nuxt-spedizionefacile-master/components/shipment/StepNavigation.vue`
  - rimossa la nota generica quando mancano piu' cose
  - tolta la duplicazione mobile della readiness note
- `nuxt-spedizionefacile-master/components/shipment/StepPickupDate.vue`
  - rimosse le frecce laterali del calendario
  - resta selezione diretta con scroll naturale, meno chrome e meno motion superfluo
- `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - tolto il divider `Servizi opzionali`
  - servizi configurabili richiusi senza sottotesto generico tipo `Da configurare` / `Configurato`
- `nuxt-spedizionefacile-master/components/shipment/ServiceContentNotifications.vue`
  - notifiche ridotte a riga utilitaria, senza icona-card separata
- `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
  - riepiloghi compatti senza copy editoriale di fallback
  - rimaste solo headline essenziali nelle card chiuse
- `nuxt-spedizionefacile-master/components/shipment/AddressFormFields.vue`
  - blocco iniziale del form reso piu' lineare
  - toggle opzionali rinominato in `Altri dettagli`
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - servizi ulteriormente compressi in gap/padding
  - featured neutralizzato: meno enfasi cromatica sul prezzo e sugli shell selezionati
  - indirizzi resi piu' lineari con griglia a una colonna
  - shell dettagli piu' compatta
  - rimosso altro CSS ormai morto del pickup

### Verifiche tecniche
- parse Vue ok su:
  - `StepAddressSection.vue`
  - `AddressFormFields.vue`
  - `StepServicesGrid.vue`
  - `StepNavigation.vue`
  - `StepPickupDate.vue`
  - `ServiceContentNotifications.vue`
- `node --check`
  - `useShipmentStepServiceCards.js` ok
- `git diff --check` pulito sui file toccati in questa tranche
- nota ambiente:
  - `php` non e' disponibile ne' in bash ne' nel PowerShell di questa sessione, quindi il lint PHP locale qui non e' eseguibile

### Artifact
- locale:
  - `output/playwright/step2-local-after-minimal-pass-20260402.png`
  - `output/playwright/step3-local-after-linear-pass-20260402.png`
- preview:
  - `output/playwright/step3-preview-after-linear-pass-20260402.png`
  - `output/playwright/step3-preview-after-linear-pass-waited-20260402.png`

### Stato vero dopo questa tranche
- chiuso davvero:
  - preview step 3 ricertificata nel flusso vero, non solo da deep-link
  - servizi piu' compatti e meno rumorosi
  - indirizzi piu' secchi, con meno testo accessorio
- aperto ancora:
  - step indirizzi ancora migliorabile sul piano della densita' visiva pura
  - rifinitura finale di coerenza tra step 2 e prototipo/Figma
  - workstream backend/hardening finale ancora da riprendere dopo questa tranche UI

## 2026-04-02 — Tranche sottrattiva funnel + riallineamento E2E

### UI / UX chiusa ora
- `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - corretto bug reale del template: la riga dei servizi regolari aveva due attributi `class`
  - click surface dei servizi regolari mantenuto, ma senza bug di perdita classi
- `nuxt-spedizionefacile-master/components/shipment/StepPickupDate.vue`
  - tolta la frase duplicata sul primo giorno utile
  - resta solo il cue visivo `Primo`, piu' vicino al prototipo
- `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
  - riepiloghi compatti con fallback minimo `Da compilare`
  - azioni secondarie ridotte: `Precompila` non compete piu' con `Salva` nella stessa card attiva
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
  - il riepilogo collassato `Ritiro e servizi` e' stato alleggerito
  - niente piu' heading separato, resta solo una riga compatta con `Modifica`
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - summary accordion reso trasparente e meno “card dentro card”
  - `address-stage-shell` sgonfiato: tolti bordo esterno, gradiente top e padding superflui
  - `address-delivery-shell` alleggerito
  - `Senza etichetta` calmato ancora: meno promo effect e badge piu' sobrio
  - stato selezionato del pickup riportato verso card bianca + bordo teal, piu' vicino al mini-calendario Figma

### Verifiche tecniche
- parse Vue ok su:
  - `StepServicesGrid.vue`
  - `StepPickupDate.vue`
  - `StepAddressSection.vue`
  - `pages/la-tua-spedizione/[step].vue`
- `node --check`
  - `useShipmentStepServiceCards.js` ok
- runtime locale:
  - `curl http://192.168.80.1:8787/preventivo` -> `200 OK`

### Test E2E riallineati
- `nuxt-spedizionefacile-master/tests/e2e/shipment-flow.spec.ts`
  - i test del funnel usavano ancora contratti vecchi:
    - CAP visibili
    - selector `.package-card`
  - aggiunto helper `fillLocationField()` che usa il campo visibile con autocomplete
  - T3.2/T3.5/T3.6 aggiornati al markup reale attuale
- eseguito con server gia' vivo:
  - `TEST_BASE_URL=http://192.168.80.1:8787 npx playwright test tests/e2e/shipment-flow.spec.ts --grep "T3.5|T3.6" --project=chromium`
  - esito: `2 passed`

### Verifica backend reale nella stessa tranche
- eseguiti con PHP Windows esplicito:
  - `artisan test --filter=StripeHardeningTest --testdox`
    - esito finale: `19 passed`
  - `artisan test --filter=OrderControllerTest --testdox`
    - esito finale: `12 passed`
- fix di supporto ai test:
  - `laravel-spedizionefacile-main/tests/Feature/Payments/StripeHardeningTest.php`
    - rimosso hardcode stantio sul `total_cents`, ora confronto con lo snapshot autorevole calcolato dal service
  - `laravel-spedizionefacile-main/tests/Feature/Orders/OrderControllerTest.php`
    - rimossa aspettativa hardcoded sul subtotale cart, ora si verifica coerenza con `pricing_snapshot.total_cents`

### Stato vero dopo questa tranche
- chiuso davvero:
  - bug template reale sui servizi eliminato
  - pickup meno editoriale e meno rumoroso
  - indirizzi un po' piu' minimali e con meno azioni concorrenti
  - suite E2E del flusso riportata in sync con il form attuale per step 1 -> step 2
  - suite backend mirata su hardening/order green nei test principali
- aperto ancora:
  - step 2 -> step 3 non ancora coperto da un test stabile
  - indirizzi ancora troppo densi rispetto al target Figma `33:6174`
  - workstream backend/hardening finale ancora da riprendere

## 2026-04-02 — Micro-tranche funnel: meno chrome, meno testo, meno duplicazioni

### UI / UX chiusa ora
- `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
  - tolto del tutto l'header separato `Indirizzi`
  - la sezione indirizzi ora appare direttamente con:
    - scelta `Domicilio / Punto BRT`
    - card `Partenza / Destinazione`
  - fallback destinazione PUDO reso piu' esplicito: `Punto BRT da scegliere`
- `nuxt-spedizionefacile-master/components/shipment/StepNavigation.vue`
  - la nota di readiness in basso non resta piu' visibile quando l'errore e' gia' mostrato inline sul campo mancante
  - questo elimina la duplicazione tra:
    - messaggio sotto al campo `Contenuto`
    - nota riassuntiva in basso
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
  - aggiunto gate minimale per sopprimere la readiness note quando esiste gia' guidance inline
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - ulteriore pulizia sottrattiva:
    - rimossi residui CSS morti su `address-stage-banner`
    - rimossi residui CSS morti su pseudo-elementi non piu' usati
  - featured badge dei servizi ancora calmato
  - shell indirizzi lasciata piu' nuda e meno “box dentro box”

### Verifiche reali
- parse Vue ok su:
  - `StepPickupDate.vue`
  - `StepServicesGrid.vue`
  - `StepAddressSection.vue`
  - `StepNavigation.vue`
  - `pages/la-tua-spedizione/[step].vue`
- browser reale locale su `http://192.168.80.1:8787`:
  - screenshot:
    - `output/playwright/step2-local-after-subtractive-pass-20260402.png`
    - `output/playwright/step3-local-after-subtractive-pass-20260402.png`
    - `output/playwright/step2-guidance-after-continue-click.png`
  - stato osservato:
    - step 2 piu' pulito e senza hero eccessivo su `Senza etichetta`
    - step 3 senza header `Indirizzi` separato
    - card indirizzi piu' vicine al target minimal
- preview:
  - artifact disponibile:
    - `output/playwright/preview-step3-after-minimal-pass-waited-20260402c.png`

### Stato vero dopo questa micro-tranche
- chiuso davvero:
  - sezione indirizzi piu' lineare e meno editoriale
  - guidance step 2 meno duplicata
  - residui CSS morti rimossi dai blocchi appena semplificati
- aperto ancora:
  - la parte attiva dei form indirizzi e' ancora un po' densa rispetto al target
  - il riepilogo compresso sopra gli indirizzi puo' essere ancora asciugato
  - va ripreso il workstream backend/hardening finale dopo questa passata UI

## 2026-04-02 — Micro-tranche backend: pricing context e suite hardening riallineati

### Fix chiusi ora
- `laravel-spedizionefacile-main/app/Services/CheckoutSubmissionContextService.php`
  - bug reale corretto:
    - `baseSnapshot()` leggeva solo `service_data`
    - quando i caller passavano `service_payload`, il payload servizi veniva di fatto ignorato nel fingerprint
  - effetto del bug:
    - replay con stesso `client_submission_id` ma servizi cambiati poteva restituire `200` invece di `422`
  - fix:
    - `baseSnapshot()` ora accetta `service_payload` come source of truth
    - usa `service_data` solo come fallback e lo compatta solo quando serve
- `laravel-spedizionefacile-main/tests/Feature/Cart/CartControllerTest.php`
  - rimosso test duplicato `test_cart_store_rejects_pudo_without_pickup_point()`
  - la suite Laravel tornava in fatal prima ancora di eseguire i test
- `laravel-spedizionefacile-main/tests/Feature/Orders/OrderControllerTest.php`
  - riallineati i test alla route canonica `POST /api/orders/{order}/add-package`
  - il replay test ora cambia davvero il payload servizi (`contrassegno.importo`) senza inciampare nella validazione PUDO
- `laravel-spedizionefacile-main/tests/Feature/Payments/StripeHardeningTest.php`
  - riallineato anche qui il percorso `add-package` canonico

### Verifiche reali
- Windows PHP:
  - `artisan test --filter=CartControllerTest` -> `10 passed`
  - `artisan test --filter=OrderControllerTest` -> `12 passed`
  - `artisan test --filter=StripeHardeningTest` -> `19 passed`

### Stato vero dopo questa micro-tranche
- chiuso davvero:
  - il pricing context torna a cambiare quando cambia davvero il payload servizi
  - replay mismatch e rotazione submission context sono ora coperti da test verdi
  - la suite hardening non e' piu' bloccata da fatal di test duplicati
- aperto ancora:
  - il workstream pricing authority finale va ancora esteso agli altri percorsi legacy/cart dove restano tracce storiche di prezzo salvato
  - la UI indirizzi puo' ancora essere asciugata nel form attivo

## 2026-04-02 — Tranche funnel certificata locale + preview

### UI / UX chiusa ora
- `nuxt-spedizionefacile-master/components/shipment/StepPickupDate.vue`
  - lasciato solo il cue minimo `Primo` sulla prima data utile
  - rimossa la duplicazione testuale sotto al titolo
- `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - corretto il bug reale del template sulla riga servizi regolari:
    - niente piu' doppio attributo `class`
  - la card `Senza etichetta` resta distinta ma non piu' promozionale come prima
- `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
  - la sezione indirizzi viene renderizzata solo quando aperta
  - nessun header separato `Indirizzi`
  - azioni concorrenti ridotte:
    - `Precompila` compare solo quando `Salva` non e' l'azione rilevante
  - card compatte con fallback minimo:
    - `Da compilare`
    - `Punto BRT da scegliere`
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
  - riepilogo compresso sopra gli indirizzi ancora piu' asciutto:
    - solo stringa compatta + `Modifica`
    - niente titolo ulteriore
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - summary accordion reso piu' leggero
  - indirizzi ancora piu' piatti:
    - meno gap
    - meno chrome
    - summary su una sola riga
  - transizione servizi ridotta a sola opacita'
  - tag pickup `Primo` piu' discreto

### Verifiche reali
- runtime locale:
  - `http://192.168.80.1:8787/preventivo` -> `200`
- preview corrente da log tunnel:
  - `https://dam-tuesday-designs-solely.trycloudflare.com/preventivo` -> `200`
- parse Vue ok su:
  - `StepPickupDate.vue`
  - `StepServicesGrid.vue`
  - `StepAddressSection.vue`
  - `pages/la-tua-spedizione/[step].vue`
- browser reale locale con Playwright diretto:
  - flusso vero:
    - `/preventivo`
    - compilazione step 1
    - avanzamento a `/la-tua-spedizione/2`
    - compilazione `Contenuto`
    - apertura indirizzi su `?step=ritiro`
  - console sospetta: `0`
  - screenshot:
    - `output/playwright/step2-local-current-pass.png`
    - `output/playwright/step3-local-current-pass.png`
- browser reale preview con Playwright diretto:
  - stesso flusso completato fino a `/la-tua-spedizione/2?step=ritiro`
  - console sospetta: `0`
  - screenshot:
    - `output/playwright/step2-preview-current-pass.png`
    - `output/playwright/step3-preview-current-pass.png`

### Backend / test
- `powershell` ora trova PHP corretto in:
  - `C:\\Users\\Feder\\AppData\\Local\\Microsoft\\WinGet\\Packages\\PHP.PHP.8.4_Microsoft.Winget.Source_8wekyb3d8bbwe\\php.exe`
- test Laravel rilanciati con quel binario:
  - `OrderControllerTest` exit `0`
  - `StripeHardeningTest` exit `0`
  - `CartControllerTest` exit `0`

### Stato vero dopo questa tranche
- chiuso davvero:
  - il funnel locale e preview arriva agli indirizzi senza mismatch/errori console nuovi
  - pickup e servizi sono meno rumorosi
  - gli indirizzi sono piu' lineari e meno “box dentro box”
- aperto ancora:
  - i form indirizzi aperti sono ancora piu' densi del target Figma `33:6174`
  - si puo' ancora asciugare il riepilogo compresso e la toolbar azioni degli indirizzi
  - resta da riprendere il blocco backend/hardening finale oltre questa tranche UI

## 2026-04-02 — Tranche hydration + preview continuity

### UI / runtime chiusi ora
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - `input-preventivo-step-2` ora forza `width: 100%`
  - corretto il grande vuoto bianco nel form indirizzi aperto: i campi tornano a occupare davvero la loro colonna
- `nuxt-spedizionefacile-master/composables/useShipmentStepPageState.js`
  - reidrata da sessione server `servicesArray`, `contentDescription`, `pickupDate`, `serviceData`, `deliveryMode`, `selectedPudo` solo quando il client e' ancora vuoto
- `nuxt-spedizionefacile-master/composables/useShipmentStepSummary.js`
  - il riepilogo servizi usa fallback SSR-safe dalla sessione, non solo dal `userStore`
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
  - `useSession({ server: true })`
  - il summary compresso usa fallback sessione per data, servizi e contenuto
- `scripts/avvia-cloudflare.ps1`
  - non cancella piu' `URL_ONLINE.txt` prima che il nuovo tunnel sia davvero certificato
- `scripts/avvia-cloudflare.sh`
  - preserva `URL_ONLINE.txt` anche se il bootstrap del tunnel fallisce

### Verifiche reali
- preview rialzata e scritta di nuovo in `URL_ONLINE.txt`:
  - `https://dam-tuesday-designs-solely.trycloudflare.com`
- `curl` preview:
  - `/preventivo` -> `200`
- browser Playwright pulito su preview:
  - seed step 1 -> `200`
  - seed step 2 -> `200`
  - apertura diretta `https://dam-tuesday-designs-solely.trycloudflare.com/la-tua-spedizione/2?step=ritiro`
  - console error: `0`
- conferma del fix hydration:
  - il riepilogo compresso ora renderizza coerentemente `03/04/2026 · 1 servizi attivi · Abbigliamento`
  - niente piu' mismatch nuovo su browser pulito per quel percorso

### Stato vero dopo questa tranche
- chiuso davvero:
  - il summary compresso step 3 non perde piu' contenuto/servizi al reload
  - la preview ha di nuovo una URL canonica persistente
  - il form indirizzi aperto non ha piu' il layout spezzato per i campi a larghezza ridotta
- aperto ancora:
  - il form indirizzi attivo puo' essere ancora reso piu' vicino al target Figma `33:6174`
  - resta il blocco finale su convergenza account/auth/button system e pricing authority residua

## 2026-04-02 — Tranche funnel minimal + ricertificazione locale/preview

### UI / UX chiusi ora
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
  - il riepilogo compatto sopra gli indirizzi e' stato asciugato a sola data ritiro + contenuto
  - aggiunta transizione unica piu' sobria tra blocco servizi e blocco indirizzi
- `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - azioni inline configurabili riallineate a bottoni di sistema:
    - `Rimuovi` secondario
    - `Salva e attiva` primary coerente
- `nuxt-spedizionefacile-master/components/shipment/ServiceContentNotifications.vue`
  - toggle notifiche riallineato al bottone secondario del sistema
- `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
  - rimosso il wrapper shell superfluo del blocco indirizzi
  - eliminati i fallback rumorosi `Da compilare` nelle card compatte
  - le card compatte mostrano testo solo quando esiste un riepilogo davvero utile
- `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - ridotto chrome su pickup, servizi e indirizzi
  - card indirizzi piu' compatte, label piu' leggere, griglie piu' serrate
  - services stage e support panels meno pesanti
  - motion piu' breve e meno vistosa

### Verifiche reali
- runtime:
  - `http://192.168.80.1:8787/preventivo` -> `200`
  - `https://dam-tuesday-designs-solely.trycloudflare.com/preventivo` -> `200`
- browser reale Playwright locale:
  - seed sessione step 1 reale via API
  - apertura `/la-tua-spedizione/2`
  - configurazione `Contrassegno`
  - compilazione contenuto
  - apertura indirizzi
  - click su `Destinazione`
  - console error: `0`
  - screenshot:
    - `output/playwright/local-step2-after-refine-20260402.png`
    - `output/playwright/local-step3-after-refine-20260402.png`
- browser reale Playwright preview:
  - stesso flusso completato fino a `/la-tua-spedizione/2?step=ritiro`
  - console error: `0`
  - screenshot:
    - `output/playwright/preview-step3-after-refine-waited-20260402.png`

### Backend / test
- `php.exe artisan test tests/Feature/Payments/StripeHardeningTest.php --filter='test_create_order_is_idempotent_for_the_same_client_submission_id|test_create_order_normalizes_stale_cart_pricing_before_creating_order|test_create_order_rejects_replay_when_secondary_cart_group_changes'`
  - `3 passed`
- `php.exe artisan test tests/Feature/Cart/GuestCartPricingAuthorityTest.php`
  - `2 passed`
- `php.exe artisan test tests/Feature/Orders/OrderControllerTest.php`
  - `12 passed`

### Stato vero dopo questa tranche
- chiuso davvero:
  - il passaggio servizi -> indirizzi e' piu' lineare, con meno testo e meno superfici intermedie
  - la card indirizzi non apre piu' con il vuoto/fascia superflua sopra le due card operative
  - locale e preview reggono il flusso reale fino agli indirizzi con console pulita
  - i test piu' sensibili su idempotenza ordine e pricing authority guest/cart sono verdi
- aperto ancora:
  - servizi e indirizzi possono ancora essere rifiniti sul piano della fedelta' piena a Figma
  - shell account/admin e auth vanno ancora stretti nel sistema bottoni/gerarchia finale
  - resta da chiudere il backend residuale fuori dai percorsi gia' coperti dai test mirati

## 2026-04-02 — Tranche button system auth/account/admin + pulizia codice morto

### UI / UX chiusi ora
- convergenza forte del button system su auth/account/admin/riepilogo/checkout:
  - `nuxt-spedizionefacile-master/assets/css/main.css`
  - `nuxt-spedizionefacile-master/assets/css/auth-overlay.css`
  - `nuxt-spedizionefacile-master/assets/css/autenticazione.css`
  - `nuxt-spedizionefacile-master/assets/css/account-shell.css`
- seconda passata sulle primary account/admin:
  - nelle superfici account utente la primary visibile usa ora `btn-cta` invece di `btn-primary`
  - stesso riallineamento applicato alle primary residue su dialog e superfici admin gia' toccate
- sostituiti i residui `sf-action-pill` con primitive coerenti `btn-secondary btn-compact` / `btn-cta btn-compact` in:
  - `nuxt-spedizionefacile-master/components/Navbar.vue`
  - `nuxt-spedizionefacile-master/components/navbar/NavbarMobileMenu.vue`
  - `nuxt-spedizionefacile-master/components/Footer.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountConfirmDialog.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountCarteForm.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountCarteList.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountIndirizziList.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountProDashboard.vue`
  - `nuxt-spedizionefacile-master/pages/account/spedizioni/[id].vue`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/portafogli.vue`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/servizi/nuovo.vue`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/utenti.vue`
  - `nuxt-spedizionefacile-master/components/riepilogo/RiepilogoColliSection.vue`
  - `nuxt-spedizionefacile-master/components/riepilogo/RiepilogoAddressCard.vue`
  - `nuxt-spedizionefacile-master/components/riepilogo/RiepilogoServicesSection.vue`
  - `nuxt-spedizionefacile-master/components/checkout/OrderSummary.vue`
- pulizia sottrattiva:
  - eliminate del tutto le definizioni legacy `sf-action-pill*` da `assets/css/main.css`
  - eliminati gli override morti `sf-action-pill*` da `assets/css/account-shell.css`
  - nel perimetro `pages/account` + `components/account` non restano piu' occorrenze di `btn-primary`

### Verifiche reali
- check statici:
  - parse SFC ok sui componenti/pagine toccati
  - grep pulito: nessuna occorrenza residua di `sf-action-pill` nei template o CSS applicativi
- runtime:
  - `http://192.168.80.1:8787/autenticazione?redirect=/account` -> `200`
  - `https://dam-tuesday-designs-solely.trycloudflare.com/autenticazione?redirect=/account` -> `200`
- browser reale Playwright locale:
  - login demo `Cliente` -> `/account/carte`
  - login demo `Cliente Pro` -> `/account/account-pro`
  - login demo `Admin` -> `/account/amministrazione/servizi/nuovo`
  - console error: `0`
  - screenshot:
    - `output/playwright/local-account-home-20260402c.png`
    - `output/playwright/local-account-indirizzi-20260402c.png`
    - `output/playwright/local-account-carte-20260402c.png`
    - `output/playwright/local-account-pro-20260402c.png`
    - `output/playwright/local-admin-home-20260402c.png`
    - `output/playwright/local-admin-portafogli-20260402c.png`
    - `output/playwright/local-admin-servizi-nuovo-20260402c.png`
- browser reale Playwright preview:
  - stessi flussi verificati con wait estesi sulle pagine piu' lente
  - console error: `0`
  - screenshot:
    - `output/playwright/preview-account-carte-waited-20260402c.png`
    - `output/playwright/preview-account-pro-waited-20260402c.png`
    - `output/playwright/preview-admin-servizi-nuovo-waited-20260402c.png`
- check statici addizionali:
  - grep pulito: nessuna occorrenza di `btn-primary` sotto `components/account` e `pages/account`

### Stato vero dopo questa tranche
- chiuso davvero:
  - auth, account, pro, admin, riepilogo e checkout non usano piu' il vecchio microsistema `sf-action-pill`
  - la preview conferma la stessa grammatica visiva del locale anche dopo login demo e navigazione interna
  - il codice e' piu' leggero: rimossa una famiglia CSS intera ormai non piu' usata
- aperto ancora:
  - restano rifiniture di gerarchia/spacing nel funnel step 2/3 per avvicinarsi di piu' al target Figma
  - resta il backend residuale fuori dai percorsi gia' hardenizzati e testati

## 2026-04-02 — Seconda passata CTA account/admin

### UI / UX chiusi ora
- normalizzazione della primary account/admin su `btn-cta`:
  - non resta piu' `btn-primary` sotto `pages/account`, `components/account`, `components/riepilogo`, `components/checkout`
- allineate anche le superfici secondarie che erano rimaste a meta' strada tra vecchio e nuovo sistema:
  - `nuxt-spedizionefacile-master/components/account/AccountConfirmDialog.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountIndirizziList.vue`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/ordini.vue`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/impostazioni.vue`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/servizi/nuovo.vue`
  - `nuxt-spedizionefacile-master/pages/account/indirizzi/index.vue`
  - piu' la tranche account utente su profilo, indirizzi, carte, assistenza, spedizioni, top-up, richiesta Pro
  - piu' la tranche admin content/editor su blog, guide e lista servizi

### Verifiche reali
- statiche:
  - grep pulito: nessun `btn-primary` residuo sotto account/riepilogo/checkout
  - parse SFC ok sui file toccati in questa seconda passata
- browser reale gia' confermato dalla tranche precedente su locale + preview per:
  - `Cliente`
  - `Cliente Pro`
  - `Admin`
  - con screenshot stabili e `console error: 0`
- nota:
  - durante il re-run smoke successivo il browser locale ha ricominciato a essere intermittente su `/autenticazione` per timeout di caricamento, ma il problema non ha evidenziato nuovi errori JS o regressioni di markup nelle superfici gia' verificate

### Stato vero dopo questa tranche
- chiuso davvero:
  - dentro account/admin non esiste piu' la doppia grammatica teal/orange per le CTA primarie visibili
  - la regola "arancione = primary action" e' molto piu' coerente nelle shell interne
- aperto ancora:
  - il gap UX/UI principale resta il funnel step 2/3 rispetto al target Figma
  - resta il backend residuale su pricing authority/submission context fuori dai percorsi gia' coperti

## 2026-04-02 — Tranche primary CTA unificata in account/admin

### UI / UX chiusi ora
- eliminato il doppio linguaggio `btn-primary` vs `btn-cta` nelle superfici account/admin piu' visibili:
  - `nuxt-spedizionefacile-master/components/account/AccountConfirmDialog.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountWalletTopUp.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountIndirizziForm.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountIndirizziList.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountProfiloEditForm.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountProRequestForm.vue`
  - `nuxt-spedizionefacile-master/pages/account/assistenza.vue`
  - `nuxt-spedizionefacile-master/pages/account/carte.vue`
  - `nuxt-spedizionefacile-master/pages/account/indirizzi.vue`
  - `nuxt-spedizionefacile-master/pages/account/indirizzi/index.vue`
  - `nuxt-spedizionefacile-master/pages/account/profilo.vue`
  - `nuxt-spedizionefacile-master/pages/account/spedizioni/index.vue`
  - `nuxt-spedizionefacile-master/pages/account/spedizioni-configurate.vue`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/ordini.vue`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/impostazioni.vue`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/servizi/nuovo.vue`
- regola applicata:
  - arancione `btn-cta` = unica primary action di superficie
  - `btn-secondary` = appoggio/annulla/modifica
  - nessun `btn-primary` residuo in account/admin

### Verifiche reali / strutturali
- parse SFC ok sui file toccati in questa tranche
- grep pulito:
  - nessuna occorrenza residua di `btn-primary` in `pages/account`, `components/account`, `pages/account/amministrazione`
- prove visuali gia' disponibili e coerenti con la tranche precedente:
  - `output/playwright/preview-account-carte-waited-20260402c.png`
  - `output/playwright/preview-account-pro-waited-20260402c.png`
  - `output/playwright/preview-admin-servizi-nuovo-waited-20260402c.png`

### Stato vero dopo questa tranche
- chiuso davvero:
  - account/admin non hanno piu' due famiglie diverse di primary button in conflitto
  - la grammatica primaria ora e' allineata con la regola di brand: arancione per la primary di conversione/azione chiave
- aperto ancora:
  - funnel step 2/3: spacing, gerarchia, motion e fedelta' piena a Figma
  - backend residuale su authority/idempotenza fuori dai percorsi gia' coperti

## 2026-04-02 — Tranche bottoni system su account/admin/checkout/riepilogo

### UI / UX chiusi ora
- sostituiti i `sf-action-pill` residui nelle superfici account/admin/checkout/riepilogo dove il pattern corretto era gia' un bottone secondario o d'azione:
  - `nuxt-spedizionefacile-master/components/account/AccountProDashboard.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountCarteList.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountIndirizziList.vue`
  - `nuxt-spedizionefacile-master/pages/account/spedizioni/[id].vue`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/utenti.vue`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/portafogli.vue`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/servizi/nuovo.vue`
  - `nuxt-spedizionefacile-master/components/checkout/OrderSummary.vue`
- convergenza applicata:
  - azioni secondarie reali -> `btn-secondary btn-compact`
  - azioni distruttive/di rimozione -> `btn-danger btn-compact`
  - nessun nuovo layer o nuovo componente introdotto
- controllo di hygiene:
  - rimossi subito gli script diagnostici temporanei usati per la verifica, senza lasciarli in repo

### Verifiche reali
- parse SFC ok per tutti i file toccati:
  - `AccountProDashboard.vue`
  - `AccountCarteList.vue`
  - `AccountIndirizziList.vue`
  - `pages/account/spedizioni/[id].vue`
  - `pages/account/amministrazione/utenti.vue`
  - `pages/account/amministrazione/portafogli.vue`
  - `pages/account/amministrazione/servizi/nuovo.vue`
  - `components/checkout/OrderSummary.vue`
- verifica browser reale locale completata con screenshot:
  - `output/playwright/local-account-indirizzi-button-pass-20260402.png`
  - `output/playwright/local-account-carte-button-pass-20260402.png`
  - `output/playwright/local-account-pro-button-pass-20260402.png`
  - `output/playwright/local-admin-utenti-button-pass-20260402.png`
  - `output/playwright/local-admin-portafogli-button-pass-20260402.png`
  - `output/playwright/local-admin-servizi-nuovo-button-pass-20260402.png`
- verifica preview:
  - gli screenshot online sono stati rigenerati sulle stesse route
  - funzionalmente le route rispondono e gli artifact vengono generati
  - resta pero' un drift visivo della preview su shell/header/footer account-admin, che in screenshot remoti appare ancora in stato quasi skeleton

### Stato vero dopo questa tranche
- chiuso davvero:
  - dentro account/admin/checkout/riepilogo non restano piu' `sf-action-pill` residui
  - la grammatica secondario / distruttivo e' piu' coerente con il sistema gia' presente in auth e funnel
  - il codice e' stato alleggerito per sostituzione, non per stratificazione
- aperto ancora:
  - la preview va ricertificata visivamente sulla shell account/admin, perche' il rendering remoto non e' ancora affidabile come il locale
  - navbar/footer pubblici usano ancora pill proprie e vanno decisi nell'ultima convergenza globale del design system
  - resta il backend residuale su pricing/submission/idempotenza fuori dai percorsi gia' coperti

## 2026-04-02 — Tranche convergenza bottoni system su shell pubblica + account/admin

### UI / UX chiusi ora
- convergenza applicata anche fuori dal solo account core:
  - `nuxt-spedizionefacile-master/components/Navbar.vue`
  - `nuxt-spedizionefacile-master/components/navbar/NavbarMobileMenu.vue`
  - `nuxt-spedizionefacile-master/components/Footer.vue`
  - `nuxt-spedizionefacile-master/components/checkout/OrderSummary.vue`
  - `nuxt-spedizionefacile-master/components/riepilogo/RiepilogoColliSection.vue`
  - `nuxt-spedizionefacile-master/components/riepilogo/RiepilogoAddressCard.vue`
  - `nuxt-spedizionefacile-master/components/riepilogo/RiepilogoServicesSection.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountIndirizziList.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountCarteList.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountProDashboard.vue`
  - `nuxt-spedizionefacile-master/pages/account/spedizioni/[id].vue`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/portafogli.vue`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/utenti.vue`
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/servizi/nuovo.vue`
- sostituzione fatta in modo sottrattivo:
  - edit / utility / toggle -> `btn-secondary btn-compact`
  - CTA conversione pubblica -> `btn-cta`
  - distruttive confermate -> `btn-danger btn-compact`
- pulizia aggiuntiva:
  - la navbar desktop non appoggia piu' il link di navigazione a `sf-action-pill`; ora usa solo `navbar-link-pill` con stile proprio e meno layering
  - nel menu mobile l'accesso non usa piu' arancione come se fosse conversione primaria
  - nel checkout i link/controlli convertiti a bottoni coerenti non ereditano piu' sottolineature o affordance spurie da link

### Verifiche reali
- parse SFC ok per:
  - `Navbar.vue`
  - `NavbarMobileMenu.vue`
  - `Footer.vue`
  - `OrderSummary.vue`
  - `RiepilogoColliSection.vue`
  - `RiepilogoAddressCard.vue`
  - `RiepilogoServicesSection.vue`
  - `AccountIndirizziList.vue`
  - `AccountCarteList.vue`
  - `AccountProDashboard.vue`
  - `pages/account/spedizioni/[id].vue`
  - `pages/account/amministrazione/portafogli.vue`
  - `pages/account/amministrazione/utenti.vue`
  - `pages/account/amministrazione/servizi/nuovo.vue`
- runtime / preview ancora verdi:
  - `http://192.168.80.1:8787/` -> `HTTP/1.1 200 OK`
  - `https://dam-tuesday-designs-solely.trycloudflare.com/` -> `HTTP/2 200`
- screenshot visuali rigenerati per la convergenza pubblica e shell:
  - `output/playwright/local-home-button-system-20260402.png`
  - `output/playwright/local-auth-shell-button-system-20260402.png`
  - `output/playwright/local-account-shell-button-pass-20260402b.png`
  - `output/playwright/local-account-carte-button-pass-20260402.png`
  - `output/playwright/preview-home-button-system-20260402.png`
  - `output/playwright/preview-auth-shell-button-system-20260402b.png`
- nota importante di certificazione:
  - i check browser interattivi precedenti su login / redirect cliente e admin restano la baseline affidabile
  - in questa tranche l'automazione headless su login demo/form non e' risultata stabile come il browser interattivo, quindi non va considerata prova di regressione prodotto da sola

### Stato vero dopo questa tranche
- chiuso davvero:
  - la grammatica primaria/secondaria e' piu' coerente tra pubblico, auth, account, admin, checkout e riepilogo
  - l'arancione e' stato ristretto meglio alle CTA di conversione, senza usarlo come colore generico di utility
  - sono stati tolti altri punti in cui vecchio e nuovo sistema convivevano sulla stessa superficie
- aperto ancora:
  - manca ancora una ricertificazione visiva finale piu' forte su auth/account/admin con browser interattivo end-to-end dopo questa ultima passata
  - restano da chiudere i residui del piano su fidelity finale funnel step 2/3 e backend residuale pricing/submission/idempotenza

## 2026-04-03 — Tranche preview restart + recertificazione funnel + hardening test

### Runtime / preview chiusi ora
- la preview riportata nel diario precedente non era piu' affidabile: `https://educational-able-train-focal.trycloudflare.com/preventivo` rispondeva `HTTP/2 530`
- rilanciato il tunnel pubblico con:
  - `scripts/avvia-cloudflare.ps1`
- nuova preview valida scritta in `URL_ONLINE.txt`:
  - `https://nasa-divorce-with-linux.trycloudflare.com`
- check runtime riallineati:
  - `http://192.168.80.1:8787/preventivo` -> `HTTP/1.1 200 OK`
  - `https://nasa-divorce-with-linux.trycloudflare.com/preventivo` -> `HTTP/2 200`

### Funnel / UX verificati ora
- ricertificazione browser reale sulla nuova preview:
  - apertura `preventivo` ok
  - seed same-origin di `first-step` via `/api/session/first-step` ok
  - apertura `step 2` su `/la-tua-spedizione/2` ok
  - seed same-origin di `second-step` via `/api/session/second-step` ok
  - apertura `step 3` su `/la-tua-spedizione/2?step=ritiro` ok
- console browser sulla preview corrente:
  - `0` errori su `step 2`
  - `0` errori su `step 3`
- artifact affidabili rigenerati:
  - `output/playwright/preview-step2-after-preview-restart-20260403.png`
  - `output/playwright/preview-step3-after-preview-restart-20260403.png`
  - `output/playwright/preview-step2-after-hydration-fix-20260403.png`
  - `output/playwright/preview-step3-after-subtractive-cleanup-20260403.png`
- nota di lettura importante:
  - questi due screenshot sono viewport di ricertificazione tecnica del funnel sulla preview rialzata
  - non sostituiscono la verifica visuale finale di fidelity su spacing/gerarchia contro Figma, che resta ancora aperta

### Funnel / UX chiusi ancora in coda alla tranche
- ultimo taglio sottrattivo su step 2/3:
  - rimossi badge di stato ridondanti nei servizi (`Attivo`, `Configurato`) quando la card gia' comunica lo stato con struttura, selezione e CTA
  - descrizioni servizi ancora accorciate per ridurre rumore verticale
  - card indirizzi compatte senza placeholder `Apri`: se non c'e' ancora un riepilogo, resta solo il titolo della card
- fix reale di hydration sulla preview corrente:
  - lo step 2 mostrava ancora mismatch SSR/client su `content_description`
  - causa: il campo `ServiceContentNotifications` riceveva solo `userStore.contentDescription`, mentre il server stava gia' renderizzando dalla sessione
  - risolto in `pages/la-tua-spedizione/[step].vue` usando un `resolvedContentDescription` con fallback esplicito alla sessione
  - ricertificazione browser sulla preview dopo il fix:
    - `0` errori
    - `0` warning

### Backend / hardening chiusi ora
- ricertificato davvero `StripeHardeningTest` su PHP Windows reale, non via shell Linux senza `php`
- stato finale del test:
  - `23 passed`
  - `120 assertions`
- aggiunto e confermato il caso di regressione su `mark-order-completed` per `bonifico` con retry a `ext_id` diverso:
  - il flusso riusa una sola transaction `pending`
  - non crea una seconda `pending` sullo stesso ordine
- corretta anche un'aspettativa di test ormai troppo rigida:
  - il test del `submission context` non confronta piu' un totale hardcoded rimasto indietro rispetto al ricalcolo server-authoritative
  - ora verifica il totale atteso ricostruito da `CheckoutSubmissionContextService`

### Stato vero dopo questa tranche
- chiuso davvero:
  - la preview online e' di nuovo viva e puntata a un URL verificato
  - il percorso tecnico `preventivo -> step 2 -> step 3` e' di nuovo ricertificato sulla preview corrente
  - `StripeHardeningTest` e' verde anche dopo l'ultimo caso su `bonifico` e l'adeguamento dell'aspettativa snapshot
- aperto ancora:
  - funnel step 2/3: resta da stringere la fidelity finale a Figma su servizi, indirizzi, gerarchia e motion
  - design system: restano residui su convergenza piena di bottoni/radius/shell fuori dalle superfici gia' passate
  - backend: restano da chiudere altri gap residuali su pricing authority / submission context / idempotenza fuori dai percorsi gia' coperti da `StripeHardeningTest`

### Tranche successiva - passata sottrattiva funnel + ricertificazione preview/runtime
- preview corrente rialzata e verificata:
  - `https://nasa-divorce-with-linux.trycloudflare.com`
  - file aggiornato: `URL_ONLINE.txt`
- file toccati:
  - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
- taglio UI fatto senza aggiungere layer:
  - servizi selezionati non mostrano piu' descrizioni riempitive non necessarie
  - featured `Senza etichetta` e servizi opzionali hanno meno fill e meno contrasto decorativo
  - reveal inline servizi ancora piu' sobrio: solo `max-height`, senza fade extra
  - summary sopra gli indirizzi ancora piu' compatta
  - pickup rail ancora alleggerito: header piu' stretto, tiles piu' compatte, nav buttons piu' piccole
  - indirizzi compatti ancora piu' secchi su spacing e summary line
- verifiche statiche:
  - parse SFC ok:
    - `StepServicesGrid.vue`
    - `StepAddressSection.vue`
    - `AddressPudoSection.vue`
    - `StepPickupDate.vue`
- verifiche runtime locali:
  - `http://127.0.0.1:3001` -> `HTTP/1.1 200 OK`
  - `http://127.0.0.1:8000` -> `HTTP/1.1 200 OK`
  - `http://127.0.0.1:8787/preventivo` -> `HTTP/1.1 200 OK`
- verifiche browser sulla preview corrente:
  - seed reale del funnel via `POST /api/session/first-step` e `POST /api/session/second-step` nello stesso contesto browser
  - `step 2` aperto su `/la-tua-spedizione/2` con:
    - `Quando ritiriamo?` presente
    - `Servizi aggiuntivi` presente
    - `0` errori console
  - `step 3` aperto su `/la-tua-spedizione/2?step=ritiro` con:
    - `Partenza` presente
    - `Destinazione` presente
    - `0` errori console
- artifact affidabili di questa tranche:
  - `output/playwright/preview-step2-after-subtractive-pass-20260403b.png`
  - `output/playwright/preview-step3-after-subtractive-pass-20260403g.png`
- nota backend:
  - il comando Windows per `StripeHardeningTest` continua a uscire `0` dal bridge WSL/PowerShell, ma l'output testuale non viene riversato correttamente sullo stdout del terminale Linux; non e' un failure del test, ma un limite del bridge di esecuzione

### Tranche successiva - summary rail piu' leggera + indirizzi ancora piu' secchi
- preview corrente confermata ancora su:
  - `https://nasa-divorce-with-linux.trycloudflare.com`
  - file: `URL_ONLINE.txt`
- file toccati:
  - `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
  - `nuxt-spedizionefacile-master/components/shipment/ShipmentStepSummaryCard.vue`
  - `nuxt-spedizionefacile-master/assets/css/summary-card.css`
  - `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
- taglio UI fatto in modo sottrattivo:
  - summary sticky del funnel alleggerita:
    - tolta la label `Riepilogo` nella fascia alta
    - meno padding, meno shadow, piu' vicina alla rail sintetica del prototipo/Figma
    - mini-step alti meno e meno dominanti
  - card indirizzi compatte ancora piu' minimali:
    - summary line piu' corta
    - se troppo lunga, mostra solo il dato piu' utile invece di forzare una stringa lunga
    - PUDO compatto mostra nome oppure indirizzo, non entrambi concatenati in modo rumoroso
  - blocco indirizzi aperto ancora piu' asciutto:
    - piu' respiro tra i due blocchi card
    - dettagli facoltativi separati meglio dal blocco principale
    - toggle domicilio / punto BRT piu' compatto
  - servizi e blocco informazioni aggiuntive piu' ordinati:
    - piu' separazione verticale tra sezioni
    - shell supporto leggermente meno cromata e meno alta
- verifiche statiche:
  - parse SFC ok:
    - `StepAddressSection.vue`
    - `AddressPudoSection.vue`
    - `StepServicesGrid.vue`
    - `ShipmentStepSummaryCard.vue`
- verifiche browser / preview:
  - preview `preventivo` raggiungibile e seed same-origin riuscito
  - navigazione reale confermata fino a:
    - `/la-tua-spedizione/2`
    - `/la-tua-spedizione/2?step=ritiro`
  - sul check del flusso corrente non sono emersi nuovi errori console
- verifiche backend Windows:
  - `php artisan test --filter=StripeHardeningTest --testdox`
  - risultato confermato: `23 passed`, `120 assertions`
  - log salvato in:
    - `laravel-spedizionefacile-main/stripe-hardening-testdox.txt`
- nota artifact:
  - lo screenshot full-page `output/playwright/preview-step2-after-summary-tighten-20260403.png` e' uscito in stato skeleton e non va usato come prova visuale finale
  - per la prova visuale affidabile continuano a valere gli artifact viewport della tranche precedente:
    - `output/playwright/preview-step2-after-subtractive-pass-20260403b.png`
    - `output/playwright/preview-step3-after-subtractive-pass-20260403g.png`

### Tranche successiva - hygiene root senza toccare i file canonici
- obiettivo:
  - ridurre il rumore in root senza perdere evidence o memoria di lavoro
- azione fatta:
  - spostati `83` artifact manuali sparsi in root dentro:
    - `docs/qa/artifacts/root-evidence-2026-04-03/`
- tipologie archiviate:
  - screenshot e snapshot manuali di auth
  - screenshot e snapshot manuali di account
  - screenshot e snapshot manuali di preventivo / step 2
  - immagini e note prototipo/proto
- file lasciati in root volutamente:
  - `_SQUADRA_DIARIO.md`
  - `URL_ONLINE.txt`
  - `README.md`
  - `README_TUTTOINSIEME.txt`
  - file script/pannello e file canonici operativi
- criterio:
  - nessun file di codice o documentazione canonica spostato
  - nessun artifact Playwright gia' ordinato sotto `output/` toccato

### Tranche successiva - fix reale card indirizzi compatte + ricertificazione preview
- file toccati:
  - `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
- fix reale chiuso:
  - una card indirizzo compatta senza summary non deve piu' cadere nel ramo del form aperto
  - ora la card chiusa resta sempre compatta e mostra solo placeholder minimo `Apri`
  - il bug era presente sia su `Partenza` sia su `Destinazione` ed era una causa diretta del senso di caos nello step indirizzi
- verifiche statiche:
  - parse SFC ok:
    - `StepAddressSection.vue`
- verifiche browser / preview correnti:
  - preview attiva ancora su `https://nasa-divorce-with-linux.trycloudflare.com`
  - `GET /preventivo` -> `HTTP/2 200`
  - seed same-origin confermato con payload corretto su `POST /api/session/first-step` -> `200`
  - navigazione browser reale confermata fino a:
    - `/la-tua-spedizione/2`
    - compilazione `Contenuto`
    - click `Compila indirizzi`
    - `/la-tua-spedizione/2?step=ritiro`
  - errori console sullo stato finale del flusso corrente:
    - `0`
- artifact affidabili aggiornati:
  - `output/playwright/preview-step2-after-summary-tighten-20260403.png`
  - `output/playwright/preview-step3-after-summary-tighten-top-20260403.png`
  - `output/playwright/preview-step3-cards-after-summary-tighten-20260403.png`
- nota operativa:
  - il bridge Playwright same-origin richiede l'header `X-XSRF-TOKEN` letto dal cookie per seedare il funnel via `fetch`; senza quello ritorna `419`, ma non e' una regressione applicativa del flusso utente

### Tranche successiva - hardening NOWPayments IPN binding + test mirato
- data:
  - `2026-04-03 10:37 CEST`
- file toccati:
  - `laravel-spedizionefacile-main/app/Http/Controllers/CryptoController.php`
  - `laravel-spedizionefacile-main/tests/Feature/Payments/CryptoPaymentHardeningTest.php`
- fix reale chiuso:
  - ora l'IPN NOWPayments rifiuta i casi non coerenti prima di creare effetti:
    - `payment_method` deve essere `crypto`
    - `payment_id` non puo' essere vuoto
    - `nowpayments_invoice_id` dell'ordine non puo' essere vuoto
    - `payment_id` deve combaciare con `nowpayments_invoice_id`
  - il binding viene ricontrollato dentro una transazione con `lockForUpdate()`
  - le transazioni `succeeded` vengono deduplicate usando `ext_id = nowpayments_<paymentId>`
- verifiche statiche:
  - `php -l` ok su controller e test
- verifiche runtime:
  - `php artisan test --filter=CryptoPaymentHardeningTest --testdox`
  - esito: `5 passed`, `21 assertions`
- rischio residuo noto:
  - il wiring delle rotte crypto non e' stato toccato in questa tranche; l'hardening riguarda il controller e la copertura di test

### Tranche successiva - bootstrap Playwright auth riagganciato ai demo state + blocker reale auth runtime
- data:
  - `2026-04-04 00:xx CEST`
- file toccati:
  - `nuxt-spedizionefacile-master/tests/e2e/utils/authState.ts`
  - `nuxt-spedizionefacile-master/tests/e2e/auth.setup.spec.ts`
  - `nuxt-spedizionefacile-master/tests/e2e/account.spec.ts`
  - `nuxt-spedizionefacile-master/tests/e2e/admin.spec.ts`
  - `nuxt-spedizionefacile-master/tests/e2e/wallet.spec.ts`
- fix reale chiuso:
  - introdotto helper condiviso per gli auth state demo Playwright sotto `output/playwright/auth/`
  - `account`, `admin` e `wallet` riusano automaticamente gli state file generati da `auth.setup.spec.ts` se presenti, senza dipendere solo da `PLAYWRIGHT_STORAGE_STATE` / `TEST_STORAGE_STATE`
  - `auth.setup.spec.ts` ora legge lo stesso mapping profili/output usato dalle suite downstream, cosi' il bootstrap non diverge piu' dai consumer
  - aggiornate anche le note operative nei test autenticati: il bootstrap corretto e' `tests/e2e/auth.setup.spec.ts`, non un generico file da creare a mano
- verifiche statiche:
  - `git diff --check` pulito sui file toccati
  - Playwright CLI avviato con `node.exe` Windows diretto su `node_modules/playwright/cli.js`
  - `playwright test --list` riuscito:
    - esito: `561 tests in 14 files`
- verifiche runtime:
  - Nuxt dev avviato davvero con `node.exe` Windows su `http://127.0.0.1:8787`
  - run reale eseguito:
    - `playwright test tests/e2e/auth.setup.spec.ts --project=chromium`
  - esito:
    - `3 failed`
  - causa reale identificata:
    - il fallimento non e' sui selector demo
    - `/autenticazione` in dev risponde con `500` e pagina errore Nuxt
    - snapshot errore: `IPC connection closed`
- residuo aperto:
  - la ricertificazione profonda `account/admin/wallet` resta ora bloccata da un problema runtime piu' a monte su `/autenticazione`, non dal wiring dei test
  - prossima tranche naturale: isolare quale import/composable della route auth fa collassare il worker Vite/Nuxt in ambiente dev Windows

### Tranche successiva - runtime auth sbloccato + preview online ricertificata
- data:
  - `2026-04-04 02:18 CEST`
- file toccati:
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/ordini.vue`
  - `_SQUADRA_DIARIO.md`
- fix reale chiuso:
  - individuata e corretta una causa concreta del collasso runtime Nuxt:
    - `pages/account/amministrazione/ordini.vue` era rimasto vuoto e rompeva il tree pages lato dev/build
    - il file e' stato ripristinato dal contenuto valido gia' presente nella history recente
  - dopo il ripristino:
    - `nuxi build` con `node.exe` Windows ha superato il punto che prima cadeva
    - il bootstrap `scripts/avvia-cloudflare.ps1` ha rialzato locale + Caddy + tunnel pubblico
    - `URL_ONLINE.txt` e' stato aggiornato alla preview corrente:
      - `https://car-privilege-anniversary-productivity.trycloudflare.com`
- verifiche statiche:
  - `git diff --check` pulito sui file della tranche auth/e2e e sul ripristino `ordini.vue`
- verifiche runtime:
  - locale same-origin raggiungibile via host Windows:
    - `http://192.168.80.1:8787/` -> `200`
    - `http://192.168.80.1:8787/autenticazione?redirect=/account` -> `200`
  - preview pubblica raggiungibile:
    - `https://car-privilege-anniversary-productivity.trycloudflare.com/` -> `200`
    - `https://car-privilege-anniversary-productivity.trycloudflare.com/autenticazione?redirect=/account` -> `200`
    - `https://car-privilege-anniversary-productivity.trycloudflare.com/preventivo` -> `200`
  - Playwright reale:
    - `playwright test tests/e2e/auth.setup.spec.ts --project=chromium`
    - esito: `3 passed`
  - browser reale su preview pubblica:
    - pagina `autenticazione` caricata con titolo corretto `Accedi o Registrati | SpediamoFacile`
    - console: `0` errori / `0` warning
    - richiesta client osservata su same-origin preview:
      - `GET /api/auth/providers` -> `200`
    - pagina `preventivo` caricata con titolo corretto `Preventivo Spedizione Gratuito | SpediamoFacile`
    - console: `0` errori / `0` warning
    - richiesta client osservata su same-origin preview:
      - `GET /api/public/price-bands` -> `200`
- nota tecnica importante:
  - l'HTML SSR continua a serializzare il valore locale `http://127.0.0.1:8787` nel runtime config iniziale, ma il plugin `00.sanctum-dynamic-url.client.ts` sta facendo il lavoro corretto lato browser sulla preview:
    - le chiamate client verificate in browser reale passano davvero dal dominio `trycloudflare.com`
    - quindi login/fetch pubblici sulla preview sono tornati coerenti con la stessa origine

### Tranche successiva - auth meno anonima + primitive shared piu' brand + account root ricertificata
- data:
  - `2026-04-04 02:39 CEST`
- file toccati:
  - `nuxt-spedizionefacile-master/pages/autenticazione.vue`
  - `nuxt-spedizionefacile-master/components/auth/AuthRegisterForm.vue`
  - `nuxt-spedizionefacile-master/assets/css/auth-overlay.css`
  - `nuxt-spedizionefacile-master/assets/css/autenticazione.css`
  - `nuxt-spedizionefacile-master/assets/css/main.css`
  - `nuxt-spedizionefacile-master/assets/css/account-shell.css`
  - `_SQUADRA_DIARIO.md`
- fix reale chiuso:
  - pagina `autenticazione` resa piu' chiara e meno anonima:
    - hero piu' leggibile e copy piu' diretto
    - tab `Accedi / Registrati` meno capsule e piu' controlli di sistema
    - blocco demo retrocesso a supporto, non piu' quasi seconda hero
    - naming demo piu' pulito (`Console completa`, `Area partner`, `Account standard`)
  - registrazione resa piu' comprensibile:
    - introdotte label visibili di gruppo `Profilo` e `Tipo account`
    - segmenti piu' leggibili e meno ambigui
    - CTA finale riallineata a un'azione unica
    - aggiunti `autocomplete` ai campi principali per ridurre attrito e warning browser
  - fix sistemico di leggibilita':
    - `font-display` cambiato a `swap` per Inter e Montserrat, cosi' il testo non resta bloccato durante il caricamento font
  - pass shared brand sulle primitive che davano effetto troppo bianco/generico:
    - `sf-section-block` ora ha accento brand alto + profondita' piu' chiara
    - `sf-action-card` ora ha identita' piu' riconoscibile con accento laterale e shell meno piatta
    - superfici account (`sf-account-panel`, `sf-account-nav-tile`, `sf-admin-quick-link` e derivate) riallineate con una grammatica piu' caratterizzata ma ancora sobria
    - freccia delle tile account trasformata in micro-chip piu' leggibile e meno anonima
- verifiche statiche:
  - `git diff --check` pulito sui file toccati
- verifiche runtime:
  - preview pubblica auth ancora sana:
    - `https://car-privilege-anniversary-productivity.trycloudflare.com/autenticazione?redirect=/account` -> `200`
  - browser reale su auth preview:
    - console: `0` errori / `0` warning
    - screenshot affidabili:
      - `output/playwright/auth-page-after-ux-pass-20260404b.png`
      - `output/playwright/auth-register-after-ux-pass-20260404.png`
      - `output/playwright/auth-page-after-shared-brand-pass-20260404.png`
  - login reale eseguito in browser sulla preview con profilo cliente demo:
    - `POST /api/custom-login` -> `200`
    - `GET /api/user` -> `200`
    - redirect confermato a `/account`
  - browser reale su account preview:
    - pagina caricata con titolo corretto `Il tuo account | SpediamoFacile`
    - heading confermato: `Ciao, Luca Bianchi`
    - sezioni confermate: `Spedizioni`, `Pagamenti`, `Partner Pro`, `Profilo`
    - console: `0` errori / `0` warning
    - screenshot affidabile:
      - `output/playwright/account-after-brand-pass-20260404.png`
- residuo aperto:
  - il problema di anonimato non e' esaurito su tutto il sito:
    - funnel `step 2/3` resta la superficie piu' importante ancora da chiudere a fidelity alta
    - diverse sottopagine account/admin profonde mantengono ancora shell corrette ma troppo conservative
    - dopo questa tranche il prossimo pass naturale e' portare la stessa grammatica brand/gerarchia sulle superfici operative del funnel e sui moduli admin ancora piu' piatti

### Tranche successiva - funnel step 2/3 meno anonimo + mismatch hydration chiuso
- data:
  - `2026-04-04 02:55 CEST`
- file toccati:
  - `nuxt-spedizionefacile-master/components/shipment/StepServicesGrid.vue`
  - `nuxt-spedizionefacile-master/components/shipment/ServiceContentNotifications.vue`
  - `nuxt-spedizionefacile-master/components/shipment/StepAddressSection.vue`
  - `nuxt-spedizionefacile-master/composables/useShipmentStepFlow.js`
  - `nuxt-spedizionefacile-master/assets/css/shipment-step.css`
  - `_SQUADRA_DIARIO.md`
- fix reale chiuso:
  - pass UX/UI sul funnel `step 2/3` con obiettivo esplicito: meno card generiche, meno etichette duplicate, gerarchia piu' chiara
  - blocco servizi:
    - tolta la ripetizione inutile `Opzionali` dentro la lista servizi
    - copy header reso piu' specifico e meno generico
    - featured card e card servizi regular riallineate a una grammatica piu' riconoscibile con accento verticale, piu' profondita' e CTA compatte piu' leggibili
    - inline panel e blocco `Contenuto e notifiche` resi meno “box bianchi appoggiati”
  - blocco indirizzi:
    - header interno rinominato da `Indirizzi` a `Partenza e destinazione` per evitare il doppione quasi identico con l'accordion
    - copy interno reso piu' operativo
    - card partenza/destinazione rese piu' leggibili con accento brand, summary compatti piu' chiari e shell di consegna piu' riconoscibile
    - placeholder compatto aggiornato da `Apri` a `Apri e completa`
  - chiuso anche un problema reale non visivo emerso durante la ricertificazione:
    - `useShipmentStepFlow.js` ora usa anche il fallback sessione per `content_description` e `pickup_date`
    - eliminato il mismatch hydration SSR/client che generava warning Vue + errore console su `/la-tua-spedizione/2`
- verifiche statiche:
  - `git diff --check` pulito sui file toccati
- verifiche runtime:
  - browser reale su preview online:
    - `https://car-privilege-anniversary-productivity.trycloudflare.com/la-tua-spedizione/2`
    - `https://car-privilege-anniversary-productivity.trycloudflare.com/la-tua-spedizione/2?step=ritiro`
  - dopo il fix hydration:
    - console `0` errori / `0` warning su step 2
  - ricertificazione visuale desktop:
    - `output/playwright/step2-desktop-after-brand-pass-20260404b.png`
    - `output/playwright/step3-desktop-after-brand-pass-20260404.png`
  - ricertificazione visuale mobile:
    - `output/playwright/step2-mobile-after-brand-pass-20260404.png`
    - `output/playwright/step3-mobile-after-brand-pass-20260404.png`
- residuo aperto:
  - il funnel ora e' meno piatto e piu' coerente, ma il lavoro non e' finito:
    - restano da ripulire alcune sottopagine account/admin ancora troppo conservative
    - resta da chiudere il tratto backend finale `pricing authority / submission context / idempotenza`
    - resta utile un ultimo pass sul funnel per dettagli fini di densita', motion e stati completati

### Tranche successiva - admin servizi nuovo trasformato da form generico a editor guidato
- data:
  - `2026-04-04 03:20 CEST`
- file toccati:
  - `nuxt-spedizionefacile-master/pages/account/amministrazione/servizi/nuovo.vue`
  - `_SQUADRA_DIARIO.md`
- fix reale chiuso:
  - la pagina `/account/amministrazione/servizi/nuovo` non e' piu' una sequenza di box bianchi quasi indistinguibili
  - introdotto un overview iniziale utile, non decorativo:
    - stato bozza/pubblicazione
    - conteggio sezioni
    - conteggio FAQ
  - il contenuto e' stato riorganizzato come editor:
    - `Informazioni base` con griglia piu' leggibile e hint sullo slug
    - `Sezioni` e `FAQ` con header piu' espliciti e stack card interne piu' riconoscibili
    - CTA `Crea servizio` spostata dentro un summary laterale con checklist reale, cosi' la pagina comunica meglio quando il contenuto e' pronto
  - aggiunte checklist e note operative concrete:
    - `Titolo e URL pronti`
    - `Introduzione compilata`
    - `Almeno una sezione completa`
    - `Almeno una FAQ completa`
  - pulizia tecnica:
    - corretti anche i line ending del file (`git diff --check` era rumoroso per CRLF/trailing whitespace)
- verifiche statiche:
  - `git diff --check` pulito su `pages/account/amministrazione/servizi/nuovo.vue`
- verifiche runtime:
  - login demo admin eseguito in browser reale sulla preview
  - pagina ricertificata davvero su:
    - `https://car-privilege-anniversary-productivity.trycloudflare.com/account/amministrazione/servizi/nuovo`
  - console browser:
    - `0` errori / `0` warning
  - artifact affidabili:
    - `output/playwright/admin-servizi-nuovo-desktop-clean-20260404.png`
    - `output/playwright/admin-servizi-nuovo-mobile-clean-20260404.png`
- residuo aperto:
  - questa pagina ora e' molto piu' forte, ma il problema non e' chiuso sull'intera area admin:
    - restano altre sottopagine profonde con shell corrette ma ancora troppo conservative
    - prossimo pass naturale: scegliere una pagina admin/account ad alta densita' e ripetere lo stesso metodo sottrattivo

### Tranche successiva - admin ordini reso piu' operativo e meno dump tabellare
- data:
  - `2026-04-04 03:26 CEST`
- file toccati:
  - `nuxt-spedizionefacile-master/components/admin/AdminOrdiniToolbar.vue`
  - `nuxt-spedizionefacile-master/components/admin/AdminOrdiniFlatView.vue`
  - `_SQUADRA_DIARIO.md`
- fix reale chiuso:
  - toolbar `ordini` trasformata da fascia di pill e input in console piu' leggibile:
    - titolo e testo di orientamento piu' chiari
    - tre stat card operative (`ordini visibili`, `filtro/utenti`, `valore visibile`)
    - campi `Ricerca` e `Stato` con label vere e shell piu' solide
  - vista flat degli ordini resa meno generica:
    - mobile card con accento laterale e action bar piu' leggibile
    - chip `BRT` e `PUDO` piu' riconoscibili
    - desktop table con header piu' leggibile, celle utente piu' pulite, hover piu' morbido e action button/select piu' coerenti
  - pulizia tecnica:
    - corretti anche qui i line ending CRLF che falsavano `git diff --check`
- verifiche statiche:
  - `git diff --check` pulito su:
    - `components/admin/AdminOrdiniToolbar.vue`
    - `components/admin/AdminOrdiniFlatView.vue`
- verifiche runtime:
  - pagina ricertificata in browser reale su preview:
    - `https://car-privilege-anniversary-productivity.trycloudflare.com/account/amministrazione/ordini`
  - console browser:
    - `0` errori / `0` warning
  - artifact affidabili:
    - `output/playwright/admin-ordini-after-20260404.png`
    - `output/playwright/admin-ordini-mobile-after-20260404.png`
- residuo aperto:
  - `ordini` ora legge meglio, ma il piano account/admin non e' ancora chiuso:
    - restano altre pagine profonde con shell piu' corrette che distintive
    - vale la pena proseguire su una pagina account con form o pannelli ancora troppo piatti per completare la convergenza

### Tranche successiva - prelievi non-Pro trasformato da blocco secco a upsell utile
- data:
  - `2026-04-04 03:29 CEST`
- file toccati:
  - `nuxt-spedizionefacile-master/pages/account/prelievi.vue`
  - `_SQUADRA_DIARIO.md`
- fix reale chiuso:
  - la pagina `prelievi` per utenti non-Pro non mostra piu' solo un blocco generico con una CTA
  - migliorato header:
    - description ora spiega chiaramente cosa sblocca Partner Pro sul flusso prelievi
  - migliorato stato upsell non-Pro:
    - intro piu' chiara su valore e non solo su blocco
    - tre benefit card concrete (`Saldo prelevabile`, `Storico richieste`, `Flusso Pro`)
    - footer con nota esplicita su cosa appare appena si attiva Pro
  - risultato:
    - la pagina comunica meglio il passaggio da commissioni a saldo prelevabile
    - meno sensazione di “pagina vuota / accesso negato”, piu' sensazione di percorso prodotto coerente
- verifiche statiche:
  - `git diff --check` pulito su `pages/account/prelievi.vue`
- verifiche runtime:
  - pagina ricertificata in browser reale su preview:
    - `https://car-privilege-anniversary-productivity.trycloudflare.com/account/prelievi`
  - console browser:
    - `0` errori / `0` warning
  - artifact affidabile:
    - `output/playwright/account-prelievi-after-20260404.png`
- residuo aperto:
  - il lavoro account/admin continua a essere ampio:
    - restano altre superfici profonde da riallineare
    - lato backend restano ancora aperti i residui `pricing authority / submission context / idempotenza`

### Tranche successiva - root account ricompattata in hub operativo e non piu' in billboard card
- data:
  - `2026-04-04 10:05 CEST`
- file toccati:
  - `nuxt-spedizionefacile-master/pages/account/index.vue`
  - `nuxt-spedizionefacile-master/components/account/AccountShellHero.vue`
  - `nuxt-spedizionefacile-master/assets/css/account-shell.css`
  - `URL_ONLINE.txt`
  - `_SQUADRA_DIARIO.md`
- ricerca e criterio usato:
  - riallineato il pass alla regola interna `Account Personale`:
    - la root account deve mostrare aree personali reali
    - un ingresso chiaro a `Partner Pro`
    - un solo ingresso a `Console admin`
    - niente collage di elementi tutti allo stesso peso
  - direzione presa anche dal system study interno:
    - la dashboard account aveva primitive corrette ma gerarchia ancora troppo neutra
    - la correzione giusta non era aggiungere decorazione, ma rendere le azioni piu' essenziali e meno da backoffice generico
- fix reale chiuso:
  - la root `/account` non usa piu' scorciatoie trattate come card promozionali troppo larghe
  - il blocco hero e' stato reso piu' compatto:
    - surface piu' corta
    - avatar ridotto
    - banda azione meno dispersiva
    - copy CTA piu' diretto
  - le sezioni account ora leggono come hub operativo:
    - aggiunte micro-descrizioni di sezione per orientamento rapido
    - badge conteggio mostrato solo quando ha senso
    - `Amministrazione` resta con un solo ingresso a `Console admin`
  - le tile azione sono state ricostruite:
    - misura piu' contenuta
    - layout orizzontale piu' scansionabile
    - meno spazio morto
    - griglia desktop con larghezza controllata e non piu' card che si allargano a billboard
  - risultato pratico:
    - desktop largo piu' credibile per un sito di spedizioni self-service
    - mobile piu' ordinato e meno “muro di box”
- verifiche statiche:
  - `git diff --check` pulito su:
    - `pages/account/index.vue`
    - `components/account/AccountShellHero.vue`
    - `assets/css/account-shell.css`
- verifiche runtime:
  - stack locale rialzato davvero:
    - Laravel in ascolto su `127.0.0.1:8000`
    - Nuxt dev in ascolto su `127.0.0.1:3001`
    - Caddy proxy in ascolto su `127.0.0.1:8787`
  - verifica browser reale su account demo admin:
    - login demo da `/autenticazione?redirect=/account`
    - pagina ricertificata su `http://192.168.80.1:8787/account`
  - console browser:
    - `0` errori
    - `0` warning
  - artifact affidabili:
    - `output/playwright/account-root-after-density-pass-20260404.png`
    - `output/playwright/account-root-after-density-pass-wide-20260404.png`
    - `output/playwright/account-root-after-density-pass-mobile-20260404.png`
  - preview pubblica rialzata:
    - `https://filter-revolution-academics-sunrise.trycloudflare.com`
    - check HTTP eseguito davvero: `200`
- residuo aperto:
  - la root account ora e' molto piu' corretta, ma il piano UX/UI resta ancora ampio:
    - restano altre pagine account/admin con densita' e gerarchia da riallineare
    - il funnel `step 2/3` merita ancora un ultimo pass di fino
    - lato backend restano ancora aperti i residui `pricing authority / submission context / idempotenza`
