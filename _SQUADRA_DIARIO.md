
==============================
OBIETTIVO: Volgio che voi 4 agenti risuciate prima a capire di cosa parla il sito ee tutte le fuznioni e tutte le cos eche fa ogni minima cosa per capire  tutto, e poi  coglio creare  oltre che lérichetta in ogni spedizione la possibilità di creare il ritiro presso il domicilio  tramite   le api inserite  e anche creare il bordero  e tutto questo dopo che è stato generato spedire tutto all'email dell admin e del cliente che ha effetuato la spedizioneper l'utente pro ogni volta che qualcuno usa il suo codice refferal gli arriva una notifica sia sul sito visibile d a qualche parte si a una notifica mail  e in messaggio pero deve spintare prima la richiesta di notifiche tramite messaggio e mail ogni volta che qualcuno usa il suo codice
DATA: Mon Feb 16 20:25:47 CET 2026
CARTELLA: /mnt/c/Users/Feder/Desktop/spedizionefacile
MODELLO: gpt-5.3-codex
==============================

 M nuxt-spedizionefacile-master/package-lock.json
?? .codex/
?? AGENTS.md
?? TODO_SQUADRA.md
?? _SQUADRA_DIARIO.md

---

## TURNO: CAPO
DATA: 2026-02-16

### Decisioni
- Confermato lavoro strettamente sequenziale a turni: `CAPO → ARCHITETTURA → INTERFACCIA → LOGICA → REVISIONE → CAPO`.
- Definito piano operativo in `TODO_SQUADRA.md` con passi ordinati e responsabilita` per turno.
- Definiti criteri di accettazione verificabili per: ritiro a domicilio, bordero, invio email admin/cliente, notifiche referral con consenso.

### Vincoli
- Vietato lavorare in parallelo tra ruoli/turni.
- Ogni intervento deve aggiornare questo diario con: cosa fatto, file toccati, come verificare.
- Le notifiche referral (email/messaggio) sono consentite solo con consenso esplicito dell'utente Pro.

### File toccati in questo turno
- `TODO_SQUADRA.md`
- `_SQUADRA_DIARIO.md`

### Verifica
- Aprire `TODO_SQUADRA.md` e confermare presenza di:
  - sequenza turni completa;
  - criteri di accettazione numerati e testabili.
- Aprire `_SQUADRA_DIARIO.md` e confermare registrazione del turno CAPO con decisioni, vincoli, file toccati e verifica.

---

## TURNO: ARCHITETTURA
DATA: 2026-02-16

### Attivita' svolte
- Letti `TODO_SQUADRA.md` e `_SQUADRA_DIARIO.md` prima di intervenire.
- Eseguita mappatura repository e flussi correnti su frontend Nuxt e backend Laravel (checkout, ordine, evento `OrderPaid`, creazione etichetta BRT, referral).
- Prodotto documento tecnico di gap analysis e proposta implementativa per:
  - ritiro a domicilio via API;
  - bordero;
  - invio documenti admin+cliente;
  - notifiche referral con consenso esplicito per canale.

### File toccati in questo turno
- `docs/architettura/GAP-ANALYSIS-RITIRO-BORDERO-NOTIFICHE.md`
- `_SQUADRA_DIARIO.md`

### Motivazioni tecniche
- Serviva una base architetturale unica e verificabile prima dei turni INTERFACCIA/LOGICA.
- Nel codice attuale i 4 obiettivi non sono coperti in modo completo e coerente (es. bordero assente, consenso notifiche referral non modellato, invio documenti solo cliente).
- La proposta separa responsabilita' (ShippingExecution, DocumentCenter, ReferralNotification) per evitare accoppiamenti fragili tra checkout, integrazioni esterne e notifiche.

### Rischi identificati
- Rischio doppia esecuzione flussi post-pagamento (callback sincrona + webhook) senza idempotenza robusta.
- Rischio scalabilita' e manutenzione mantenendo documenti binari in campi DB (`brt_label_base64`).
- Rischio regressioni introducendo bordero/ritiro senza stato dominio esplicito e senza code asincrone.
- Rischio notifiche referral duplicate o non governate per consenso senza preferenze persistite e vincoli DB.

### Verifica
1. Aprire `docs/architettura/GAP-ANALYSIS-RITIRO-BORDERO-NOTIFICHE.md`.
2. Confermare presenza sezioni: mappa flussi attuali, gap per 4 obiettivi, proposta implementativa, rischi, impatto turni successivi.
3. Verificare che i file citati nel documento esistano e corrispondano ai flussi descritti.

---

## TURNO: INTERFACCIA
DATA: 2026-02-16

### Attivita' svolte
- Letti `TODO_SQUADRA.md` e `_SQUADRA_DIARIO.md` prima di intervenire.
- Aggiornata UI del wizard spedizione con blocco esplicito "Richiesta ritiro a domicilio" (toggle, fascia oraria, note operative) e salvataggio nel payload frontend `services.pickup_request`.
- Aggiornato riepilogo spedizione per mostrare/modificare inline lo stato della richiesta ritiro a domicilio prima del checkout.
- Aggiornata area dettaglio ordine utente con pannello di visibilita' stato per: ritiro, bordero, documenti/invio email (con fallback visuale quando i campi backend non sono ancora presenti).
- Aggiornata area Partner Pro con:
  - consenso notifiche referral per canale (sito/email/messaggio) via UI;
  - area notifiche referral sul sito (lista notifiche, badge non lette, azione "segna come letta");
  - fallback UX non bloccante se endpoint non ancora disponibili.
- Aggiunto accesso rapido da dashboard account alla pagina referral/notifiche Pro.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `nuxt-spedizionefacile-master/pages/riepilogo.vue`
- `nuxt-spedizionefacile-master/pages/account/spedizioni/[id].vue`
- `nuxt-spedizionefacile-master/pages/account/account-pro.vue`
- `nuxt-spedizionefacile-master/pages/account/index.vue`
- `_SQUADRA_DIARIO.md`

### Motivazioni tecniche
- Rendere esplicita e comprensibile la richiesta di ritiro a domicilio lato UX prima dell'implementazione backend del workflow dedicato.
- Anticipare la visibilita' utente su stati operativi (ritiro/bordero/documenti) per ridurre incertezza post-pagamento.
- Introdurre consenso esplicito per canali referral in interfaccia (vincolo richiesto) e predisporre inbox on-site coerente con il flusso referral.
- Mantenere compatibilita' con lo stato attuale: UI resilienti a campi/API non ancora disponibili, senza bloccare il flusso esistente.

### Verifica
1. Aprire `/la-tua-spedizione/2?step=ritiro` e verificare:
   - card "Richiesta ritiro a domicilio" visibile;
   - toggle attiva/disattiva richiesta;
   - selezione fascia oraria e note;
   - in modalita' "Ritira in un Punto BRT" il ritiro domicilio risulta non applicabile.
2. Completare il flusso fino a `/riepilogo` e verificare nel blocco "Servizi e data ritiro":
   - visualizzazione stato richiesta ritiro, fascia e note;
   - modifica inline e salvataggio dei campi.
3. Aprire `/account/spedizioni/{id}` e verificare presenza pannello "Stato ritiro e documenti" con tre card:
   - ritiro a domicilio;
   - bordero;
   - documenti e invio email.
4. Aprire `/account/account-pro` come utente Partner Pro e verificare:
   - sezione consenso canali referral (sito/email/messaggio);
   - sezione notifiche referral con badge non lette e azione "Segna come letta";
   - messaggi fallback se endpoint referral notifiche/preferenze non disponibili.
5. Aprire `/account` e verificare card "Referral e notifiche" visibile per ruolo Pro/Admin.

---

## TURNO: LOGICA
DATA: 2026-02-16

### Attivita' svolte
- Letti `TODO_SQUADRA.md` e `_SQUADRA_DIARIO.md` prima di intervenire.
- Implementata logica backend per flusso esecuzione spedizione post-etichetta:
  - richiesta ritiro domicilio;
  - creazione bordero;
  - invio documenti a cliente + admin.
- Introdotto orchestratore applicativo `ShipmentExecutionService` e dispatcher email documenti `ShipmentDocumentDispatcher`.
- Estesa API con endpoint dedicati per stato/azioni esecuzione:
  - `GET /api/orders/{order}/execution`
  - `POST /api/orders/{order}/pickup/request`
  - `POST /api/orders/{order}/bordero/create`
  - `POST /api/orders/{order}/documents/send`
- Integrato listener `GenerateBrtLabel` (e flusso manuale `BrtController::createShipment`) per avvio automatico della catena logica ritiro+bordero+dispatch documenti.
- Implementata persistenza stato esecuzione su `orders` (pickup/bordero/documents + errori) con nuova migrazione.
- Implementate preferenze consenso notifiche referral e inbox onsite:
  - nuove tabelle `user_notification_preferences` e `user_notifications`;
  - endpoint referral preferenze/notifiche:
    - `GET/PATCH /api/referral/notification-preferences`
    - `GET /api/referral/notifications`
    - `POST /api/referral/notifications/{id}/read`
- Esteso `ReferralController::apply` con dispatch condizionato da consenso:
  - onsite notification (DB);
  - email al Pro (opt-in);
  - integrazione messaggio/SMS tracciata via log (opt-in).
- Rafforzata normalizzazione dati servizi per non perdere `pickup_request` (spostato in `service_data`) e allineata validazione request.

### File toccati in questo turno
- `laravel-spedizionefacile-main/app/Http/Controllers/BrtController.php`
- `laravel-spedizionefacile-main/app/Http/Controllers/ReferralController.php`
- `laravel-spedizionefacile-main/app/Http/Controllers/SavedShipmentController.php`
- `laravel-spedizionefacile-main/app/Http/Controllers/ShipmentExecutionController.php`
- `laravel-spedizionefacile-main/app/Http/Controllers/Traits/NormalizesServiceData.php`
- `laravel-spedizionefacile-main/app/Http/Requests/PackageStoreRequest.php`
- `laravel-spedizionefacile-main/app/Http/Resources/OrderResource.php`
- `laravel-spedizionefacile-main/app/Listeners/GenerateBrtLabel.php`
- `laravel-spedizionefacile-main/app/Mail/ReferralUsedMail.php`
- `laravel-spedizionefacile-main/app/Mail/ShipmentDocumentsMail.php`
- `laravel-spedizionefacile-main/app/Models/Order.php`
- `laravel-spedizionefacile-main/app/Models/User.php`
- `laravel-spedizionefacile-main/app/Models/UserNotification.php`
- `laravel-spedizionefacile-main/app/Models/UserNotificationPreference.php`
- `laravel-spedizionefacile-main/app/Services/BrtService.php`
- `laravel-spedizionefacile-main/app/Services/ShipmentDocumentDispatcher.php`
- `laravel-spedizionefacile-main/app/Services/ShipmentExecutionService.php`
- `laravel-spedizionefacile-main/database/migrations/2026_02_16_210000_add_execution_fields_to_orders_table.php`
- `laravel-spedizionefacile-main/database/migrations/2026_02_16_210100_create_user_notification_preferences_table.php`
- `laravel-spedizionefacile-main/database/migrations/2026_02_16_210200_create_user_notifications_table.php`
- `laravel-spedizionefacile-main/resources/views/emails/referral-used.blade.php`
- `laravel-spedizionefacile-main/resources/views/emails/shipment-documents.blade.php`
- `laravel-spedizionefacile-main/routes/api.php`
- `_SQUADRA_DIARIO.md`

### Motivazioni tecniche
- La UI INTERFACCIA mostrava gia' stato ritiro/bordero/documenti e consenso referral, ma mancava persistenza + API backend coerenti.
- Serviva una catena unica e idempotente lato logica dopo creazione etichetta per rispettare il requisito “genera e poi invia tutto ad admin+cliente”.
- Le preferenze referral dovevano essere persistenti e vincolanti per canale (email/messaggio solo con consenso esplicito).
- Il payload frontend includeva `services.pickup_request` ma veniva perso: normalizzato ora in `service_data` per usarlo nel workflow ritiro.

### Verifica
1. Backend migration:
   - eseguire `cd laravel-spedizionefacile-main && php artisan migrate`.
2. Flusso spedizione (ordine pagato):
   - completare un pagamento ordine;
   - verificare su `orders` valorizzazione campi:
     - `pickup_status`, `pickup_reference`;
     - `bordero_status`, `bordero_reference`;
     - `documents_status`, `documents_sent_customer_at`, `documents_sent_admin_at`.
3. API stato esecuzione:
   - chiamare `GET /api/orders/{id}/execution` autenticati e verificare payload aggiornato.
4. Azioni manuali:
   - `POST /api/orders/{id}/pickup/request`;
   - `POST /api/orders/{id}/bordero/create`;
   - `POST /api/orders/{id}/documents/send`;
   - verificare risposta `success` e aggiornamento campi ordine.
5. Referral consenso notifiche:
   - come utente Pro, chiamare `PATCH /api/referral/notification-preferences` con vari combinazioni;
   - usare `POST /api/referral/apply` da altro utente;
   - verificare:
     - record `user_notifications` creati solo se `referral_site_enabled=true`;
     - invio email solo se `referral_email_enabled=true`;
     - log SMS solo se `referral_sms_enabled=true`.
6. Inbox referral:
   - `GET /api/referral/notifications` restituisce lista;
   - `POST /api/referral/notifications/{id}/read` imposta `read_at`.

### Nota ambiente
- Tentata verifica sintattica via CLI (`php -l`), ma in questo ambiente il comando `php` non e' disponibile (`php: command not found`).

---

## TURNO: REVISIONE
DATA: 2026-02-16

### Attivita' svolte
- Letti `TODO_SQUADRA.md` e `_SQUADRA_DIARIO.md` prima di intervenire.
- Eseguiti avvio e controlli disponibili nel progetto:
  - `bash scripts/avvia-locale.sh`
  - `bash scripts/raccogli-stato.sh`
  - `cd nuxt-spedizionefacile-master && npm run build`
  - `cd nuxt-spedizionefacile-master && timeout 25s npm run dev -- --host 127.0.0.1 --port 3001`
- Eseguiti controlli script:
  - `bash -n scripts/avvia-tutto.sh`
  - `bash -n scripts/raccogli-stato.sh`
- Correzioni minime applicate a script di progetto emerse in revisione.

### Bug list (severita')
1. `ALTA` - Avvio locale non robusto con `php` assente: lo script tentava comunque comandi `php artisan`, producendo log fuorviante e backend non avviato.
2. `MEDIA` - Diagnostica incompleta: `scripts/raccogli-stato.sh` verificava porta frontend `3000` ma non `3001`, che e' la porta usata da `scripts/avvia-locale.sh`/`scripts/avvia-tutto.sh`.
3. `MEDIA` - Ambiente corrente non compatibile con build Nuxt: `npm run build` fallisce con Node `v18.19.1` (errori su `styleText`/`crypto.hash`, compatibilita' richiesta piu' recente).

### Correzioni minime applicate
- `scripts/avvia-tutto.sh`
  - aggiunta rilevazione `php` (`HAS_PHP`) con degradazione pulita: se `php` manca, salta keygen/migrate/seed/start Laravel invece di tentare comandi invalidi.
- `scripts/raccogli-stato.sh`
  - estese verifiche porte/endpoints includendo anche `3001`.

### File toccati in questo turno
- `scripts/avvia-tutto.sh`
- `scripts/raccogli-stato.sh`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Avvio:
   - `bash scripts/avvia-locale.sh`
   - risultato: messaggio esplicito `PHP non disponibile...`; nessun crash dello script.
2. Diagnostica:
   - `bash scripts/raccogli-stato.sh`
   - risultato: report aggiornato in `tmp-diagnostica/report.txt` con check sia `3000` sia `3001`.
3. Sintassi script:
   - `bash -n scripts/avvia-tutto.sh`
   - `bash -n scripts/raccogli-stato.sh`
   - risultato: nessun errore sintattico.
4. Build frontend:
   - `cd nuxt-spedizionefacile-master && npm run build`
   - risultato: KO in questo ambiente con Node `v18.19.1` (`styleText`/`crypto.hash`).

### Nota ambiente revisione
- In questo ambiente risultano assenti `php` e `cloudflared`; quindi non e' stato possibile validare end-to-end backend/API.

---

## TURNO: CAPO (CHIUSURA)
DATA: 2026-02-16

### Completato
- Eseguiti tutti i turni previsti in sequenza: `CAPO → ARCHITETTURA → INTERFACCIA → LOGICA → REVISIONE`.
- Definita architettura target e implementate modifiche UI + backend per:
  - richiesta ritiro a domicilio;
  - stato/creazione bordero;
  - invio documenti spedizione a cliente e admin;
  - preferenze consenso notifiche referral e inbox onsite.
- Effettuata revisione tecnica con correzioni agli script operativi (`avvia-tutto`, `raccogli-stato`) e diagnosi ambiente.

### Manca
- Validazione end-to-end completa backend/API in ambiente con `php` disponibile.
- Esecuzione migrazioni Laravel reali e test funzionali su flusso pagamento → etichetta → ritiro → bordero → invio documenti.
- Verifica produzione/integrazione canale messaggistica referral (ora tracciato via log, non gateway reale in questo ambiente).
- Build frontend da confermare in runtime Node compatibile (attuale `v18.19.1` non sufficiente per la build rilevata).

### Come verificare
1. Ambiente:
   - usare macchina/container con `php` installato e Node versione compatibile con Nuxt del progetto.
2. Backend:
   - `cd laravel-spedizionefacile-main && php artisan migrate`
   - testare endpoint esecuzione ordine:
     - `GET /api/orders/{id}/execution`
     - `POST /api/orders/{id}/pickup/request`
     - `POST /api/orders/{id}/bordero/create`
     - `POST /api/orders/{id}/documents/send`
3. Frontend:
   - verificare wizard/riepilogo/account come indicato nei turni INTERFACCIA e LOGICA.
4. Referral:
   - aggiornare preferenze con `PATCH /api/referral/notification-preferences`
   - applicare referral e controllare coerenza per canale (onsite/email/messaggio) in base al consenso.
5. Script operativi:
   - `bash scripts/avvia-locale.sh`
   - `bash scripts/raccogli-stato.sh`
   - controllare `tmp-diagnostica/report.txt`.

### Come proseguire
1. Preparare ambiente di collaudo compatibile (`php`, Node aggiornato) e rieseguire la verifica completa.
2. Aggiungere test automatici Laravel/Nuxt per i nuovi flussi (esecuzione spedizione, consenso referral, inbox).
3. Collegare provider reale per notifiche messaggio referral (SMS/WhatsApp) e introdurre metriche/alert su fallimenti.
4. Solo dopo esito positivo dei test E2E, pianificare rilascio controllato.

### File toccati in questo turno
- `_SQUADRA_DIARIO.md`

---

## TURNO: ARCHITETTURA
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Analizzato il sintomo "pagina senza stile dopo F5": comportamento compatibile con mancato caricamento asset `/_nuxt/*` (JS/CSS) in ambiente dev/proxy.
- Applicato hotfix configurazione Nuxt + reverse proxy per ridurre i casi di mancato bootstrap client:
  - `vite.server.allowedHosts` aperto in dev (`true`) per evitare blocchi host su asset;
  - caching `/_nuxt/**` reso solo produzione (niente `immutable` in dev);
  - fallback anti-FOUC in `app.head.style` reso esplicito con `innerHTML`;
  - rimosso override `Host: localhost:3001` nei Caddyfile per mantenere host originale ed evitare mismatch proxy/tunnel.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/nuxt.config.ts`
- `Caddyfile`
- `Caddyfile.trycloudflare`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Riavvio stack locale:
   - `bash scripts/avvia-locale.sh`
2. Hard refresh browser:
   - aprire il sito e fare `Ctrl+F5` (o svuotare cache del sito), poi riprovare `F5`.
3. Check asset frontend:
   - in DevTools Network verificare che `/_nuxt/*` JS/CSS rispondano `200` e non `403/404`.
4. Check comportamento:
   - confermare che al refresh non compare piu' HTML "grezzo" non stilizzato.

### Nota ambiente
- In questo ambiente non e' stato possibile validare run end-to-end Nuxt: `npm run dev` fallisce per dipendenza opzionale mancante (`@oxc-parser/binding-linux-x64-gnu`).

---

## TURNO: INTERFACCIA
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Corretto il comportamento regressivo del preventivo rapido su campi citta'/CAP:
  - stabilizzato autocomplete con debounce separato per ogni campo (niente conflitti tra city/cap/origin/dest);
  - sincronizzati i suggerimenti citta' e CAP nella stessa sezione (se scrivi citta' trovi anche i CAP corrispondenti e viceversa);
  - mantenuta validazione CAP live senza doppio trigger fragile nel template.
- Corretto possibile overwrite dei campi mentre l'utente digita:
  - in `app.vue` il ripristino sessione asincrono ora avviene solo se il form preventivo e' realmente vuoto, evitando blocchi/sovrascritture durante digitazione.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `nuxt-spedizionefacile-master/app.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage `/` e nel blocco "Preventivo Rapido":
   - digitare una citta' lunga (es. `Iglesias`) nei campi citta' origine/destinazione;
   - verificare che la digitazione arrivi a fine stringa senza blocchi/sovrascritture.
2. Verificare suggerimenti incrociati:
   - scrivere citta', poi cliccare campo CAP corrispondente;
   - la tendina CAP deve mostrare risultati coerenti con la citta';
   - scrivere CAP, poi cliccare campo citta' corrispondente;
   - la tendina citta' deve mostrare risultati coerenti con il CAP.
3. Hard refresh:
   - fare `Ctrl+F5`, riscrivere i campi e confermare che non vengano sovrascritti da valori sessione durante la digitazione.

### Nota ambiente
- Anche in questo turno non e' stato possibile eseguire `npm run dev` in questa sandbox (manca binding opzionale `@oxc-parser/binding-linux-x64-gnu`), quindi la verifica e' descritta come checklist manuale runtime.

---

## TURNO: LOGICA
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Eseguito rollback controllato della sola logica autocomplete in `Preventivo.vue` per ripristinare comportamento stabile precedente:
  - ripristinati stati e timer condivisi per sezione (`originSuggestions`/`destSuggestions`, `showOriginSuggestions`/`showDestSuggestions`, timeout separati origine/destinazione);
  - ripristinati handler stabili (`onOriginCityInput`, `onOriginCapInput`, `selectOriginLocation`, `onDestCityInput`, `onDestCapInput`, `selectDestLocation`);
  - rimossa logica del refactor non richiesta (`debouncedSearch` multi-campo, focus/blur dedicati, conferme/mismatch city-cap, `validateCityCapMatch` e blocco in `calculateRate`).
- Ripristinato template input Citta'/CAP alla versione stabile:
  - eventi `@input`/`@blur` con chiusura dropdown tramite `setTimeout(..., 200)`;
  - dropdown condivisi per sezione (origine e destinazione);
  - resa tollerante visualizzazione provincia: `loc.province || loc.province_name`.
- `app.vue` lasciato invariato, senza rollback della protezione anti-overwrite sessione.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. `Città di Ritiro` e `Città Consegna`:
   - digitare `Iglesias` e verificare che il testo non si blocchi/tronchi.
2. `CAP di Ritiro` / `CAP Consegna`:
   - digitare un CAP valido (es. `09016`) e verificare apertura tendina con città corrispondenti.
3. Flusso inverso:
   - digitare città e verificare tendina CAP corrispondenti nella stessa sezione.
4. Selezione da tendina:
   - clic su una riga suggerita deve compilare automaticamente città+CAP.
5. Hard refresh:
   - `Ctrl+F5` e ripetere i test 1-4.
6. Smoke test:
   - compilare campi + almeno un collo e premere `Continua` per confermare assenza regressioni bloccanti nel calcolo.

### Nota ambiente
- In questa sandbox non è stato possibile avviare un test runtime automatico Nuxt (`npm run dev` KO per binding opzionale `@oxc-parser/binding-linux-x64-gnu`); verifica da eseguire in ambiente locale del progetto.

---

## TURNO: LOGICA
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Implementata stabilizzazione Step 1 su doppia causa radice di prefill indesiderato:
  - persistenza locale `sessionStorage` dello store Pinia;
  - ripristino server sessione preventivo (`/api/session`) al bootstrap app.
- Aggiunto clear esplicito della sessione preventivo lato backend:
  - nuovo metodo `SessionController::clear()`;
  - nuova route `DELETE /api/session`.
- Esteso store `userStore` con action dedicate al draft preventivo:
  - `resetQuoteDraft()` per azzerare solo campi/collo/prezzo Step 1;
  - `clearPersistedStore()` per rimuovere `spedizionefacile_user_store` da `sessionStorage`.
- Corretto `app.vue`:
  - rimosso restore incondizionato;
  - introdotta detection hard reload (`performance navigation type === reload`);
  - su route Step 1 (`/`, `/preventivo`) in hard reload: reset locale immediato + clear server best effort + skip restore.
- Corretto `Preventivo.vue`:
  - `resetForm` reso `async` e allineato con reset completo locale + clear server;
  - autocomplete CAP reso affidabile:
    - CAP 5 cifre -> `GET /api/locations/by-cap`;
    - CAP 3-4 cifre -> fallback `GET /api/locations/search`.

### File toccati in questo turno
- `laravel-spedizionefacile-main/app/Http/Controllers/SessionController.php`
- `laravel-spedizionefacile-main/routes/api.php`
- `nuxt-spedizionefacile-master/stores/userStore.js`
- `nuxt-spedizionefacile-master/app.vue`
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. F5 Step 1:
   - aprire `/`, compilare citta/CAP + almeno un collo, premere `F5`;
   - atteso: campi vuoti, nessun collo precompilato.
2. Navigazione senza refresh:
   - completare Step 1, passare avanti nel wizard, tornare indietro senza `F5`;
   - atteso: dati mantenuti.
3. CAP -> citta:
   - digitare CAP completo (es. `09016`) in origine/destinazione;
   - atteso: dropdown con citta corrispondenti e selezione che compila citta+CAP.
4. Citta -> CAP:
   - digitare citta (es. `Iglesias`) in origine/destinazione;
   - atteso: dropdown visibile, nessun blocco digitazione, selezione coerente.
5. Pulsante "Azzera":
   - compilare Step 1, cliccare `Azzera`, poi `F5`;
   - atteso: nessun ritorno di dati vecchi.
6. Smoke test:
   - compilare campi + collo e cliccare `Continua`;
   - atteso: calcolo preventivo senza errori JS introdotti.

### Nota ambiente
- In questa sandbox non e' stato possibile avviare test runtime end-to-end (servizi locali non attivi e `npm run dev` non eseguibile per binding opzionale mancante), quindi verifica da completare su ambiente locale progetto (`http://127.0.0.1:8787`).

---

## TURNO: LOGICA
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Completato ripristino definitivo Step 1 su tre punti critici:
  - digitazione citta' protetta da overwrite durante editing (`isOriginCityEditing` / `isDestCityEditing` + focus/blur gestiti);
  - dropdown CAP adiacente focus-driven (se clicco CAP con citta' valorizzata, apre suggerimenti coerenti);
  - completezza CAP da citta' tramite nuovo endpoint dedicato backend.
- Backend localita':
  - aggiunto `LocationController::byCity(Request $request)` con match esatto case-insensitive su `place_name`, `distinct`, ordinamento per CAP;
  - fallback `city%` con ordinamento `place_name`, `postal_code`;
  - aggiunta route pubblica `GET /api/locations/by-city`.
- Frontend `Preventivo.vue`:
  - aggiunto helper `searchLocationsByCity(city)`;
  - aggiunti handler `onOriginCapFocus` / `onDestCapFocus` per aprire la lista CAP coerente alla citta' senza digitare numeri;
  - introdotta chiusura dropdown robusta con timer separati sezione origine/destinazione per evitare chiusura aggressiva nel passaggio tra campi citta' e CAP;
  - reset form aggiornato per azzerare anche timer/flag editing.
- Hero homepage:
  - in `ContenutoHeader.vue` aumentata immagine hero di circa +35% su tablet/desktop/desktop-xl mantenendo mobile invariato.

### File toccati in questo turno
- `laravel-spedizionefacile-main/app/Http/Controllers/LocationController.php`
- `laravel-spedizionefacile-main/routes/api.php`
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Digitazione citta' Step 1:
   - in `Città di Ritiro` digitare `Iglesias`;
   - atteso: nessun blocco/troncamento a `Igles`.
2. Citta' -> CAP adiacente su focus:
   - digitare citta' valida, cliccare campo CAP adiacente senza digitare numeri;
   - atteso: tendina aperta con CAP/citta' coerenti.
3. Completezza CAP:
   - testare citta' con molti CAP;
   - atteso: lista completa da endpoint `by-city`, non limitata ai 20 risultati di `search`.
4. CAP -> citta':
   - digitare CAP completo (es. `09016`);
   - atteso: suggerimenti coerenti via `/api/locations/by-cap`.
5. Cross-field continuity:
   - passare velocemente da citta' a CAP nella stessa sezione;
   - atteso: nessuna chiusura improvvisa della tendina.
6. Hero dimensione:
   - su homepage tablet/desktop verificare immagine hero sensibilmente piu' grande (~+35%) senza overlap con card prezzo/titolo.
7. Regressione F5:
   - confermare che policy precedente resti invariata (`F5` su Step 1 pulisce, navigazione normale mantiene dati).

### Nota ambiente
- In questa sandbox non e' stato possibile eseguire test runtime browser end-to-end; verifica manuale richiesta in ambiente locale su `http://127.0.0.1:8787`.

---

## TURNO: LOGICA
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Rifinita la stabilizzazione Step 1 con fix anti-race sull'autocomplete (causa residua: risposte async vecchie che potevano sovrascrivere suggerimenti piu' recenti nel passaggio citta' -> CAP).
- In `Preventivo.vue` aggiunte guardie di sequenza richiesta (`originSuggestionSeq` / `destSuggestionSeq`) per ignorare risposte stale:
  - digitazione citta': i risultati vengono applicati solo se la richiesta e' ancora l'ultima e il campo citta' e' in editing;
  - digitazione/focus CAP: i risultati piu' recenti hanno priorita' e non vengono sovrascritti da ricerche citta' pendenti.
- Migliorato focus CAP adiacente:
  - su focus CAP vengono annullati timeout pendenti della ricerca citta';
  - se CAP >= 3 usa ricerca CAP coerente (5 cifre -> `/by-cap`, 3-4 -> `/search`), altrimenti usa `/by-city` partendo dalla citta' gia' digitata.
- Backend `LocationController::byCity` reso coerente anche nel fallback prefisso con confronto case-insensitive (`LOWER(place_name) LIKE city%`).
- Hero homepage mantenuta con ingrandimento netto gia' applicato (+35% circa su tablet/desktop/desktop-xl).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `laravel-spedizionefacile-main/app/Http/Controllers/LocationController.php`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Digitazione citta' lunga (es. `Iglesias`) su origine/destinazione:
   - atteso: nessun blocco/troncamento durante typing.
2. Passaggio rapido citta' -> CAP stessa sezione:
   - atteso: nessuna sovrascrittura della tendina da ricerche vecchie.
3. Focus CAP con citta' compilata e CAP vuoto:
   - atteso: tendina CAP coerente via `/api/locations/by-city`.
4. CAP completo (5 cifre):
   - atteso: tendina coerente via `/api/locations/by-cap`.
5. Hero homepage:
   - atteso: immagine sensibilmente piu' grande su tablet/desktop/desktop-xl, mobile invariato.

### Nota ambiente
- Verifica runtime automatica non eseguita in questa sandbox: `nuxt build` bloccato da dipendenza opzionale mancante (`@oxc-parser/binding-linux-x64-gnu`) e browser Playwright non disponibile in ambiente corrente.

### Aggiornamento rapido (stesso turno)
- Rifinito `Preventivo.vue`: `onOriginCityInput` e `onDestCityInput` rimettono sempre `is*CityEditing = true` all'inizio input.
- Motivo: dopo selezione da dropdown (che porta `is*CityEditing = false`), una nuova digitazione nello stesso campo ora riattiva correttamente i suggerimenti senza richiedere blur/focus aggiuntivo.

---

## TURNO: INTERFACCIA
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Corretto esclusivamente il blocco hero homepage in `ContenutoHeader.vue`, senza toccare `Preventivo.vue`.
- Ripristinata la geometria originale dell'immagine nei breakpoint tablet/desktop/desktop-xl per evitare alterazioni di composizione su testo/card prezzo.
- Applicato ingrandimento immagine via `transform: scale(1.35)` (con `transform-origin` per breakpoint) cosi' da aumentare la presenza visiva senza modificare il box model/layout.
- Eliminato il "riquadro bianco" sotto immagine cambiando:
  - `background-size: contain` -> `background-size: cover`
  - `background-position: center top` -> `background-position: center center`

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Homepage desktop:
   - `Spedisci in Italia` + card prezzo non devono risultare spostati verso il basso.
2. Hero immagine:
   - su tablet/desktop/desktop-xl deve risultare visivamente piu' grande (~+35%).
3. Riquadro bianco:
   - con immagine admin corrente e fallback default non deve comparire fascia bianca sotto.
4. Blocco preventivo:
   - il box `Preventivo Rapido` non deve coprire in modo anomalo titolo/card.
5. Responsive smoke:
   - check rapido a 768 / 1280 / 1536 senza salti di layout su testo/card.

### Nota ambiente
- In questa sandbox non e' stato possibile validare runtime browser automatico; verifica UI da completare in locale su `http://127.0.0.1:8787`.

---

## TURNO: LOGICA
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Analizzato i `500` riportati su `/api/locations/search`, `/api/locations/by-cap`, `/api/locations/by-city`.
- Root cause confermata da `laravel.log`:
  - configurazione SQLite puntata a path non portabile (`/mnt/...`) mentre il runtime attivo usa percorso diverso;
  - in alcune esecuzioni DB non disponibile / tabella `locations` non raggiungibile -> eccezioni SQL e status 500.
- Correzioni applicate:
  1. `laravel-spedizionefacile-main/.env`
     - `DB_DATABASE=database/database.sqlite` (path relativo portabile tra ambienti).
  2. `laravel-spedizionefacile-main/app/Http/Controllers/LocationController.php`
     - aggiunta guardia `hasLocationsTable()` con `Schema::hasTable('locations')`;
     - `try/catch` su `getLocations`, `search`, `byCap`, `byCity`;
     - in errore DB ritorno JSON vuoto invece di 500, con log diagnostico.

### File toccati in questo turno
- `laravel-spedizionefacile-main/app/Http/Controllers/LocationController.php`
- `laravel-spedizionefacile-main/.env`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Chiamate autocomplete non devono piu' restituire 500:
   - `GET /api/locations/search?q=igle`
   - `GET /api/locations/by-cap?cap=09016`
   - `GET /api/locations/by-city?city=Iglesias`
2. In browser (Step 1):
   - digitazione citta' non genera errori 500 in console;
   - focus CAP adiacente non genera errori 500 in console.
3. Se DB non inizializzato:
   - endpoint locations rispondono con array vuoto (no crash backend).

### Nota ambiente
- In questa sandbox non e' disponibile `php` CLI, quindi non e' stato possibile eseguire `artisan`/test runtime qui; verifica finale da completare in locale dopo riavvio backend.

### Aggiornamento rapido (stesso turno)
- Aggiunto hardening cross-OS in `laravel-spedizionefacile-main/config/database.php` per connessione SQLite:
  - converte automaticamente path Linux `/mnt/<drive>/...` quando il runtime e' Windows;
  - converte path Windows `C:\...` quando il runtime e' Linux/WSL;
  - risolve path relativi con `base_path(...)`.
- Obiettivo: evitare recidive dei `500` locations quando `.env` viene scritto da script di avvio diversi (bash vs powershell).
- Prevenzione recidiva: aggiornati script di avvio per scrivere sempre `DB_DATABASE=database/database.sqlite` (path relativo portabile) invece di path assoluti OS-specifici:
  - `scripts/avvia-tutto.sh`
  - `scripts/avvia-locale.ps1`

---

## TURNO: INTERFACCIA
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Aggiornata la sezione homepage servizi (`Spedisci senza pensieri`) con una nuova card coerente con il contesto spedizioni:
  - nuova card: **Tracking in tempo reale**;
  - CTA: `Traccia`;
  - link: `/traccia-spedizione`.
- Aggiornata la griglia card per passare da 5 a 6 elementi senza layout forzato della seconda riga:
  - rimossa logica di centratura dedicata a soli 5 elementi;
  - desktop ora risulta naturalmente in 2 righe da 3 card.
- Aggiunta icona dedicata nella stessa famiglia grafica servizi.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Homepage/Servizi.vue`
- `nuxt-spedizionefacile-master/public/img/homepage/services/tracking-live.svg`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Homepage sezione servizi:
   - attese 6 card visibili, con la nuova `Tracking in tempo reale`.
2. CTA nuova card:
   - click su `Traccia` porta a `/traccia-spedizione`.
3. Layout responsive:
   - mobile: 1 colonna;
   - tablet: 2 colonne;
   - desktop: 3 colonne x 2 righe senza buchi/centrature anomale.
4. Coerenza stile:
   - stessa card UI (icone, spacing, ombre, hover) delle altre card esistenti.

### Nota ambiente
- In questa sandbox non e' stato possibile verificare visualmente il rendering browser; verifica finale UI da fare in locale.

---

## TURNO: INTERFACCIA
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Ripristinata l'icona aiuto pinnata in basso a destra nel layout globale.
- Root cause: in `layouts/default.vue` il bottone era visibile solo con `v-if="isAuthenticated"`, quindi da guest spariva completamente.
- Correzione:
  - icona resa sempre visibile;
  - destinazione dinamica in base allo stato auth:
    - utente loggato -> `/account/assistenza`
    - utente guest -> `/contatti`
  - titolo dinamico coerente (`Assistenza` / `Contattaci`).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/layouts/default.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Da guest (non loggato):
   - icona presente in basso a destra;
   - click apre `/contatti`.
2. Da utente loggato:
   - icona presente in basso a destra;
   - click apre `/account/assistenza`.
3. Verifica posizione/z-index:
   - icona resta fissata in basso a destra su homepage e pagine interne.

---

## TURNO: INTERFACCIA
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Corretto problema di visibilita' nella sezione recensioni homepage.
- Root cause: animazione reveal impostava elementi a `opacity: 0`; in alcuni casi (timing mount/ClientOnly) la classe `revealed` non veniva applicata in tempo e i blocchi restavano nascosti.
- Correzione in `components/Homepage/Recensioni.vue`:
  - introdotta classe tecnica `reveal-init` aggiunta via JS solo agli elementi osservati;
  - CSS reveal applicato solo a `.reveal-review.reveal-init`;
  - fallback `setTimeout` che forza `revealed` dopo 1200ms per evitare invisibilita' persistente;
  - gestione safe per `prefers-reduced-motion` e assenza `IntersectionObserver`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Homepage/Recensioni.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Homepage:
   - sezione `Recensioni` visibile (titolo + carosello card).
2. Scroll nella zona recensioni:
   - le card non devono restare invisibili.
3. Test hard refresh (`Ctrl+F5`):
   - sezione recensioni continua a comparire correttamente.
4. Accessibilita' motion:
   - con `prefers-reduced-motion` attivo, contenuti recensioni comunque visibili.

---

## TURNO: INTERFACCIA
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Corretto il blocco hero della pagina `/servizi` in `ContenutoHeader.vue` per eliminare il testo attaccato alla navbar e al bordo inferiore del box grigio.
- Modificata la struttura del blocco servizi da `justify-center` a `justify-between` con offset verticali espliciti:
  - top spacing tramite wrapper interno con `mt` responsive;
  - bottom spacing tramite `mb` del bottone `Scendi`.
- Allineato il titolo principale del blocco servizi al contesto della pagina (rimossa dicitura non coerente con Servizi).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/servizi` desktop/tablet/mobile.
2. Verificare che la label in alto (`I nostri servizi`) non sia attaccata alla navbar.
3. Verificare che il bottone `Scendi` non sia attaccato al bordo inferiore del blocco grigio.
4. Verificare che il testo hero sia coerente con la pagina Servizi (non testo Guide).

---

## TURNO: INTERFACCIA
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Ripristinate immagini nella pagina `/servizi` usando fallback internet coerenti al contenuto, mantenendo priorita' alle immagini API/admin quando presenti.
- In `pages/servizi/index.vue` aggiunto mapping `serviceImageFallbacks` (URL Unsplash per slug servizio) e helper `getServiceImage(service, index)`.
- Aggiornato binding stile della card servizio per usare sempre una immagine valida:
  - prima `featured_image`/`image` da backend,
  - altrimenti fallback internet per slug,
  - fallback finale generico logistica.
- Migliorato resa visuale con `before:bg-center` e `before:bg-no-repeat` per evitare crop sbilanciati.
- Layout alternato sinistra/destra mantenuto invariato (classi even/odd gia' presenti).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/servizi/index.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/servizi` e fare hard refresh (`Ctrl+F5`).
2. Verificare che ogni servizio mostri una foto (anche se l'API non fornisce immagini).
3. Verificare alternanza immagine/testo:
   - servizi dispari immagine a sinistra,
   - servizi pari immagine a destra (desktop/mid-desktop).
4. Verificare che titolo/descrizione/bottone restino invariati e leggibili.

---

## TURNO: LOGICA
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Analizzato il problema login con errori `GET /api/user 401` su URL `/autenticazione?redirect=/account/portafoglio`.
- Root cause individuata: i domini dinamici Cloudflare (`*.trycloudflare.com`) non erano inclusi tra i domini stateful di Sanctum. In questa condizione Sanctum tratta le richieste SPA come stateless, quindi non aggancia la sessione cookie e `/api/user` risponde 401.
- Correzione applicata in `config/sanctum.php`:
  - costruzione lista `stateful` piu' robusta;
  - aggiunta wildcard `*.trycloudflare.com` e `*.trycloudflare.com:443` alla whitelist stateful, mantenendo i domini locali esistenti.

### File toccati in questo turno
- `laravel-spedizionefacile-main/config/sanctum.php`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Riavviare backend Laravel (e Caddy/tunnel se in uso) per ricaricare la config.
2. Aprire `.../autenticazione?redirect=/account/portafoglio` dal dominio tunnel corrente.
3. Eseguire login con credenziali valide.
4. Atteso: redirect su `/account/portafoglio` senza loop, `/api/user` non resta 401 dopo login.

### Nota tecnica
- L'errore console "A listener indicated an asynchronous response..." e' tipico di estensioni browser (non del codice app).

---

## TURNO: REVISIONE
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Applicata revisione UX/validazione sui campi citta' per impedire inserimento di cifre.
- Aggiunto filtro condiviso `filterCity` in `useSmartValidation` (rimuove numeri, normalizza spazi multipli, mantiene lettere accentate/apostrofi/trattini).
- Integrato il filtro in:
  - `components/Preventivo.vue` (citta' ritiro/consegna nello Step 1 rapido),
  - `pages/la-tua-spedizione/[step].vue` (citta' mittente/destinatario nello step indirizzi).
- Mantenuta invariata la logica autocomplete: vengono solo sanitizzati gli input citta' prima della ricerca.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/composables/useSmartValidation.js`
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. In `Preventivo Rapido`, digitare `Milano2` in citta' ritiro/consegna.
2. Atteso: il `2` viene rimosso automaticamente, restano solo lettere/spazi.
3. Ripetere nello step indirizzi (`/la-tua-spedizione/2`) su citta' mittente/destinatario.
4. Atteso: numeri non inseribili anche li'; dropdown suggerimenti continua a funzionare.

---

## TURNO: CAPO
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Corretto il posizionamento della schermata di successo pagamento in `pages/checkout.vue`.
- Root cause UX: al passaggio a `paymentSuccess=true` la pagina manteneva la posizione di scroll precedente (spesso in basso vicino al bottone "Paga"), facendo percepire la schermata successo "spostata in basso".
- Correzione applicata:
  - aggiunto watcher su `paymentSuccess` che fa `window.scrollTo({ top: 0, behavior: 'smooth' })` dopo `nextTick`;
  - nascosta la barra `Steps` nella vista successo (`v-if="!paymentSuccess"`) per ridurre offset verticale non necessario;
  - ridotti i padding verticali della sezione nella vista successo.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/checkout.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire checkout e scendere in fondo fino al bottone pagamento.
2. Completare un pagamento (carta/wallet/bonifico).
3. Atteso: al successo la viewport torna in alto automaticamente.
4. Atteso: card "Pagamento completato" visibile in alto senza spostamento verso il basso.

## TURNO: ARCHITETTURA
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Rifatto il bordero operativo in formato PDF per invio email a cliente e admin, con layout A4 orizzontale piu' leggibile e vicino al modello condiviso:
  - intestazione "Bordero per BRT" con numero/data/riferimento;
  - tabella principale strutturata per colonne operative (localita', provincia, LNA, riferimenti mittente, cod bolla, incasso, importi, colli);
  - intestazioni colonna su piu' righe e sfondo leggero per migliorare la lettura;
  - riepilogo mittente/destinatario e footer con totali colli.
- Integrata la generazione PDF nella creazione bordero (`BrtService::createBordero`) con output standardizzato:
  - `document_mime = application/pdf`
  - `document_filename = bordero-{id}.pdf`
  - fallback automatico a TXT se la generazione PDF fallisce.
- Allineato l'attachment mail bordero a mime/filename dinamici e aggiornato il template email per mostrare correttamente il tipo allegato (PDF/TXT).
- Resa la costruzione payload bordero piu' robusta con accessi null-safe su indirizzi mittente/destinatario.

### File toccati in questo turno
- `laravel-spedizionefacile-main/app/Services/BorderoPdfBuilder.php`
- `laravel-spedizionefacile-main/app/Services/BrtService.php`
- `laravel-spedizionefacile-main/app/Mail/ShipmentDocumentsMail.php`
- `laravel-spedizionefacile-main/resources/views/emails/shipment-documents.blade.php`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Generare una spedizione pagata con etichetta BRT disponibile.
2. Eseguire creazione bordero (`POST /api/orders/{id}/bordero/create` oppure flusso automatico post-etichetta).
3. Verificare su ordine:
   - `bordero_document_mime = application/pdf`;
   - `bordero_document_filename` termina in `.pdf`;
   - `bordero_document_base64` valorizzato.
4. Inviare documenti (`POST /api/orders/{id}/documents/send`) e controllare email cliente/admin:
   - allegato etichetta PDF;
   - allegato bordero PDF leggibile.
5. In caso eccezione generazione PDF, verificare fallback TXT senza bloccare il flusso.

### Nota ambiente
- In questa sandbox non e' disponibile `php` CLI (`php: command not found`), quindi non e' stato possibile eseguire lint/test runtime Laravel.

## TURNO: INTERFACCIA
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Corretto comportamento pagamento crypto in checkout: ora il click su `Completa il pagamento` con metodo crypto apre NOWPayments in **nuova scheda** senza sostituire la pagina corrente del sito.
- Implementazione tecnica in `processPayment`:
  - apertura tab immediata (`window.open('', '_blank')`) prima della chiamata async, per ridurre blocchi popup;
  - dopo risposta backend, navigazione della nuova tab verso `invoice_url`;
  - fallback su `window.open(invoiceUrl, '_blank', 'noopener,noreferrer')` se la tab iniziale non e' disponibile;
  - gestione errore con chiusura tab vuota e messaggio utente.
- Aggiornato testo UI metodo crypto per riflettere il nuovo comportamento (nuova scheda, non redirect pagina corrente).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/checkout.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/checkout` con ordine pagabile.
2. Selezionare metodo `Crypto` e una valuta (es. BTC).
3. Cliccare `Completa il pagamento`.
4. Atteso:
   - si apre una nuova scheda NOWPayments;
   - la scheda originale resta su `/checkout` senza refresh/redirect.
5. Con popup bloccati dal browser:
   - atteso messaggio errore esplicito su popup bloccato.

## TURNO: LOGICA
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Rivista la logica di creazione ordini da carrello per rispettare il criterio richiesto: unione per **stesso indirizzo** (origine+destinazione), non piu' per `indirizzo + servizio`.
- Backend `StripeController::createOrder` aggiornato:
  - nuovo input opzionale `apply_no_label_to_grouped_shipments` (boolean);
  - raggruppamento ordini per soli indirizzi;
  - aggiunta armonizzazione opzionale servizio `Spedizione Senza etichetta` nei gruppi misti (alcuni colli con servizio, altri senza).
- Backend `CartController::buildAddressGroups` aggiornato in coerenza con il nuovo criterio:
  - gruppi indirizzo senza separazione per servizio;
  - aggiunta metadati gruppo (`key`, `service_types`, `has_no_label`, `has_mixed_no_label`);
  - `service_type` di riepilogo impostato a `Servizi misti` quando necessario.
- Frontend checkout aggiornato:
  - aggiunta card/checkbox in riepilogo quando esistono gruppi misti `Senza etichetta`;
  - il valore checkbox viene inviato a `POST /api/stripe/create-order` come `apply_no_label_to_grouped_shipments`.
- Frontend carrello aggiornato:
  - nei gruppi multi-collo il badge servizio ora usa `entry.group.service_type` (quindi mostra anche `Servizi misti` correttamente).

### File toccati in questo turno
- `laravel-spedizionefacile-main/app/Http/Controllers/StripeController.php`
- `laravel-spedizionefacile-main/app/Http/Controllers/CartController.php`
- `nuxt-spedizionefacile-master/pages/checkout.vue`
- `nuxt-spedizionefacile-master/pages/carrello.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Caso A - stessi indirizzi, servizi diversi:
   - inserire 2 colli con stessa origine/destinazione ma servizi differenti;
   - andare in checkout;
   - atteso: banner indica unione per indirizzo (non ordini separati per servizio).
2. Caso B - mismatch "Senza etichetta":
   - nel gruppo stesso indirizzo, un collo con `Spedizione Senza etichetta` e uno senza;
   - atteso: compare checkbox "Applica automaticamente Spedizione Senza etichetta...".
3. Caso C - checkbox attiva:
   - attivare la checkbox e completare `create-order`;
   - atteso: l'ordine viene creato unico per indirizzo e i servizi del gruppo vengono armonizzati con `Senza etichetta`.
4. Caso D - checkbox non attiva:
   - lasciare checkbox disattivata e creare ordine;
   - atteso: ordine comunque unico per indirizzo, senza riscrittura automatica del servizio.
5. Caso E - indirizzi diversi:
   - colli con indirizzi diversi;
   - atteso: ordini separati come prima.

### Nota ambiente
- Non e' stato possibile eseguire test runtime Laravel/Nuxt in questa sandbox (assenza tool runtime avviati nel turno).

### Aggiornamento turno LOGICA (stesso intervento)
- Allineata propagazione checkbox `apply_no_label_to_grouped_shipments` anche nei flussi pagamento `Crypto` e `Google Pay` in `checkout.vue`, non solo nel flusso carta/wallet/bonifico.
- Esteso anche l'auto-merge carrello dei pacchi identici: ora i colli uguali vengono uniti in quantita' (`x2`, `x3`, ...) anche quando la differenza e' solo il flag/servizio `Senza etichetta`; in questo caso il servizio viene preservato sul collo risultante.

## TURNO: REVISIONE
DATA: 2026-02-21

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Corretto il box sticky riepilogo in `pages/la-tua-spedizione/[step].vue` come richiesto:
  - servizi non piu' sotto `Partenza`, ma allineati nella stessa riga del dettaglio (colonna a destra);
  - servizi mostrati in forma compatta su una sola linea (`summaryServicesInline`);
  - rimosso il totale duplicato nella parte bassa del box espanso;
  - aggiunta etichetta `Totale IVA incl.` direttamente accanto/al di sopra del prezzo nella barra alta.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/la-tua-spedizione/2` con riepilogo sticky visibile.
2. Espandere il box riepilogo.
3. Atteso:
   - `Partenza`, `Destinazione`, `Colli`, `Servizi` stanno sulla stessa riga su tablet/desktop;
   - `Servizi` e' nella colonna destra e non compare piu' sotto `Partenza`.
4. Atteso: non compare piu' in basso il blocco `Totale IVA incl. 29,9€`.
5. Atteso: in alto a destra resta il prezzo con label `Totale IVA incl.`.

## TURNO: INTERFACCIA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Corretto il comportamento immagine hero homepage in `ContenutoHeader.vue` per richiesta "fit dentro il riquadro".
- Aggiornata la resa della hero image:
  - `background-size` impostato a `contain` (immagine intera sempre visibile nel box);
  - aggiunto `overflow: hidden` al contenitore `.hero__image`;
  - aggiunto `background-color: #E6E6E6` su `.hero__image-bg` per evitare il riquadro bianco visivo;
  - rimossa la scala forzata (`transform: scale(1.35)`) nei breakpoint tablet/desktop/desktop-xl per evitare tagli/uscite dal riquadro.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage (`/`) su desktop/tablet/mobile.
2. Verificare che l'immagine della hero resti interamente dentro il suo contenitore (nessun taglio laterale/superiore/inferiore).
3. Verificare assenza di riquadro bianco sotto l'immagine.
4. Verificare che il layout generale hero resti stabile (titolo e card prezzo non sovrapposti).

### Aggiornamento turno INTERFACCIA (stesso giorno)
- Richiesta utente successiva: immagine hero in modalita' `fill` anche su mobile, con riduzione effetto zoom mobile.
- Modifiche applicate in `ContenutoHeader.vue`:
  - ripristinato `background-size: cover` su `.hero__image-bg`;
  - ripristinato scaling desktop/tablet `transform: scale(1.35)`;
  - ridimensionata la geometria mobile della hero image (`width`, `max-width`, `height`, `top/right`) per ridurre l'effetto troppo ingrandito su smartphone.

#### Verifica aggiuntiva
1. Su mobile (es. 390x844), aprire homepage: immagine riempie il riquadro (`fill`) ma appare meno zoomata rispetto a prima.
2. Su tablet/desktop, immagine resta in `fill` con presenza visiva ampia come configurazione precedente.

### Aggiornamento turno INTERFACCIA (stesso giorno, fix angolino hero)
- Segnalato "angolino" visibile vicino ai bordi dell'immagine hero su mobile.
- Root cause: layer decorativo `.hero__teal-accent` visibile dietro la foto.
- Fix applicato in `ContenutoHeader.vue`:
  - `.hero__teal-accent` nascosto su mobile (`display: none`);
  - riattivato da tablet in su (`@media (min-width: 45rem) { display: block; }`).

#### Verifica aggiuntiva
1. Aprire homepage su mobile: l'angolino decorativo non deve piu' comparire accanto/sopra l'immagine.
2. Aprire homepage su tablet/desktop: decorazione teal presente come prima.

### Aggiornamento turno INTERFACCIA (stesso giorno, rifiniture hero+preventivo)
- Richieste utente:
  - angolino decorativo ancora visibile su desktop;
  - alzare leggermente il box Preventivo su mobile;
  - ingrandire la freccia solo nello stato CTA "Spedisci da ..." (non nello stato iniziale "Continua").
- Modifiche applicate:
  - `ContenutoHeader.vue`: rimosso il `display: block` della decorazione `.hero__teal-accent` nel breakpoint tablet+, quindi la decorazione resta nascosta anche su desktop;
  - `Preventivo.vue`: offset homepage mobile aumentato (`mt-[-118px]`) per alzare leggermente il box;
  - `Preventivo.vue`: freccia CTA resa condizionale con dimensione maggiore solo quando `isRateCalculated === true`.

#### Verifica aggiuntiva
1. Homepage desktop: nessun angolino decorativo visibile vicino all'immagine hero.
2. Homepage mobile: box `Preventivo Rapido` leggermente piu' in alto rispetto a prima.
3. Bottone CTA preventivo:
   - stato iniziale `Continua`: freccia dimensione normale;
   - stato `Spedisci da ...`: freccia visibilmente piu' grande.

### Aggiornamento turno INTERFACCIA (stesso giorno, obliqua ripristinata + bordo pulito)
- Chiarimento utente: la forma obliqua dietro la hero deve restare; il problema era un altro elemento visivo che sembrava una seconda immagine ai bordi.
- Intervento in `ContenutoHeader.vue`:
  - ripristinata la forma obliqua da tablet/desktop (`.hero__teal-accent` con `display: block` nel breakpoint `min-width: 45rem`);
  - rimosso l'alone/effetto dietro gli angoli dell'immagine principale eliminando l'ombra colorata (`box-shadow: none` su `.hero__image-bg` desktop).

#### Verifica aggiuntiva
1. Desktop/tablet: la forma obliqua dietro la foto e' visibile.
2. Desktop: non deve piu' apparire l'effetto "seconda immagine" dietro gli angoli della foto principale.
3. Mobile: il comportamento resta invariato (niente forma obliqua invasiva).

### Aggiornamento turno INTERFACCIA (stesso giorno, micro-regolazione desktop preventivo)
- Richiesta utente: alzare ancora leggermente il box `Preventivo` su desktop.
- Modifica applicata in `Preventivo.vue`:
  - offset homepage desktop portato da `desktop:mt-[-60px]` a `desktop:mt-[-64px]`.
- Nessuna modifica su mobile/tablet in questo intervento.

#### Verifica aggiuntiva
1. Aprire homepage desktop e confrontare: il box `Preventivo Rapido` risulta leggermente piu' alto.
2. Verificare che mobile/tablet mantengano il comportamento precedente.

### Aggiornamento turno INTERFACCIA (stesso giorno, obliqua mobile + micro shift titolo/card)
- Richiesta utente:
  - mantenere anche su mobile il riquadro/forma obliqua dietro l'immagine;
  - abbassare leggermente, solo su mobile, il blocco `Spedisci in Italia` + card `8,90`.
- Modifiche in `ContenutoHeader.vue`:
  - `.hero__teal-accent` ripristinata anche su mobile (`display: block` nel base style);
  - aggiunta regola mobile-only `@media (max-width: 44.999rem)` con `margin-top: 10px` su `.hero__content`.

#### Verifica aggiuntiva
1. Homepage mobile: la forma obliqua dietro la hero e' visibile.
2. Homepage mobile: titolo `Spedisci in Italia` e card prezzo risultano leggermente piu' in basso.
3. Tablet/desktop: composizione hero invariata rispetto al fix precedente.

### Aggiornamento turno INTERFACCIA (stesso giorno, fix taglio immagine mobile)
- Richiesta utente: su mobile l'immagine hero risultava tagliata a destra; deve occupare tutta la larghezza orizzontale e, se necessario, essere tagliata solo sotto.
- Modifiche in `ContenutoHeader.vue` (solo `@media (max-width: 44.999rem)`):
  - `.hero__image` portata a larghezza piena (`left: 0`, `right: 0`, `width/max-width: 100vw`) con altezza mobile controllata;
  - `.hero__image-bg` impostata a `background-size: 100% auto` e `background-position: top center`.

#### Verifica aggiuntiva
1. Homepage mobile: l'immagine non deve risultare tagliata sul lato destro/sinistro.
2. Homepage mobile: la larghezza foto deve coprire tutto lo schermo in orizzontale.
3. Tablet/desktop: comportamento immagine invariato.

### Aggiornamento turno INTERFACCIA (stesso giorno, hero mobile + unificazione frecce bottoni)
- Richiesta utente:
  - hero mobile: non spostare l'immagine a sinistra, mantenerla in posizione ma piu' piccola;
  - frecce dei bottoni: usare un solo stile coerente in tutto il sito (stile freccia del preventivo).
- Modifiche applicate:
  - creato componente condiviso `ButtonArrow.vue` con stessa geometria freccia usata nel CTA preventivo (supporto direzione `right/down/left/up`);
  - `ContenutoHeader.vue`: pulsanti `Scendi` convertiti a `ButtonArrow direction="down"`; mobile hero mantenuta ancorata a destra (stessa posizione) ma ridotta in dimensione (`width/max-width/height` piu' contenute);
  - `contatti.vue`: bottone `Invia il messaggio` convertito a freccia `ButtonArrow` (niente piu' asset freccia legacy);
  - `components/Homepage/PreventivoRapido.vue`: bottone `Continua` aggiornato con `ButtonArrow`;
  - `pages/servizi/index.vue`: bottone `Leggi di piu'` aggiornato con `ButtonArrow`;
  - `pages/carrello.vue`: bottone `Procedi con l'ordine` aggiornato con `ButtonArrow`;
  - `pages/la-tua-spedizione/[step].vue`: bottone `Continua al riepilogo` aggiornato con `ButtonArrow`;
  - `pages/account/account-pro.vue`, `pages/account/bonus.vue`, `pages/account/portafoglio.vue`: frecce CTA/azione aggiornate a `ButtonArrow`.

### File toccati in questo aggiornamento
- `nuxt-spedizionefacile-master/components/ButtonArrow.vue`
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `nuxt-spedizionefacile-master/pages/contatti.vue`
- `nuxt-spedizionefacile-master/components/Homepage/PreventivoRapido.vue`
- `nuxt-spedizionefacile-master/pages/servizi/index.vue`
- `nuxt-spedizionefacile-master/pages/carrello.vue`
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `nuxt-spedizionefacile-master/pages/account/account-pro.vue`
- `nuxt-spedizionefacile-master/pages/account/bonus.vue`
- `nuxt-spedizionefacile-master/pages/account/portafoglio.vue`
- `_SQUADRA_DIARIO.md`

#### Verifica aggiuntiva
1. Homepage mobile: immagine hero resta nella stessa posizione (ancorata a destra) ma piu' piccola, senza spostamento a sinistra.
2. Pulsanti principali (Contatti, Carrello, Servizi, Step spedizione, Account Pro/Bonus/Portafoglio): stessa freccia coerente.
3. Pulsanti `Scendi` header: stessa famiglia di freccia, orientata verso il basso.

## TURNO: LOGICA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Estesa API `homepage-image` per supportare inquadratura separata desktop/mobile (stile editor Figma):
  - `crop_zoom_desktop`, `crop_x_desktop`, `crop_y_desktop`
  - `crop_zoom_mobile`, `crop_x_mobile`, `crop_y_mobile`
- `POST /api/admin/homepage-image` ora valida e salva i parametri crop in `settings` insieme all'immagine.
- `GET /api/admin/homepage-image` e `GET /api/public/homepage-image` ora restituiscono anche i parametri crop, non solo `image_url`.
- Inserita normalizzazione/clamp server-side per evitare valori fuori range.

### File toccati in questo turno
- `laravel-spedizionefacile-main/app/Http/Controllers/AdminController.php`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Chiamare `GET /api/admin/homepage-image` e verificare presenza campi `crop_*_desktop` e `crop_*_mobile`.
2. Eseguire `POST /api/admin/homepage-image` con immagine + crop params e verificare risposta con gli stessi campi valorizzati.
3. Verificare che `GET /api/public/homepage-image` restituisca gli stessi parametri crop.

## TURNO: INTERFACCIA
DATA: 2026-02-22

### Attivita' svolte
- Rifatta la pagina admin `immagine-homepage` con editor visuale pre-upload, stile Figma-like:
  - preview interattiva separata Desktop e Mobile;
  - drag diretto nel riquadro per spostare il punto focale;
  - slider Zoom/X/Y per ciascun profilo;
  - salvataggio in un solo click di immagine + inquadrature desktop/mobile.
- Aggiornato `ContenutoHeader.vue` per usare i parametri crop ricevuti dall'API pubblica:
  - rendering hero con `<img>` e `object-position + scale` separati per mobile/desktop;
  - risultato frontend coerente con quanto impostato nell'editor admin.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Selezionare una nuova immagine e verificare comparsa editor con due riquadri (Desktop/Mobile).
3. Trascinare la foto nei riquadri e regolare zoom/X/Y nei tab Desktop e Mobile.
4. Salvare e verificare in homepage:
   - resa desktop conforme al profilo desktop;
   - resa mobile conforme al profilo mobile.
5. Eseguire refresh pagina admin e verificare persistenza dei valori crop caricati dal backend.

### Aggiornamento turno INTERFACCIA (stesso giorno, adattamento dimensioni hero desktop/mobile)
- Richiesta utente: allineare meglio la grandezza immagine homepage tra desktop e mobile, adattandola allo spazio reale del dispositivo.
- Modifiche applicate:
  - `ContenutoHeader.vue`:
    - resa hero image mobile resa piu' adattiva con dimensioni `clamp/min` (no overflow aggressivo);
    - mantenuta ancora a destra ma con limiti di larghezza/altezza coerenti allo schermo;
    - aggiunto `border-radius` direttamente su `.hero__image` + `border-radius: inherit` su `.hero__image-bg` per clipping piu' pulito;
    - desktop/tablet aggiornati con `clamp` su dimensioni immagine per risposta piu' stabile al viewport.
  - `immagine-homepage.vue`:
    - rapporto preview editor aggiornato per riflettere meglio i box reali hero:
      - Desktop `aspect-ratio: 6/5`
      - Mobile `aspect-ratio: 16/11`
- Effetto atteso: desktop e mobile risultano gestiti in modo separato ma coerente, con anteprima admin piu' fedele allo spazio reale della homepage.

### File toccati in questo aggiornamento
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica aggiuntiva
1. Aprire homepage su mobile: immagine hero deve restare nel box, con dimensione proporzionata allo schermo e senza angoli sporchi.
2. Aprire homepage su desktop/tablet: immagine hero resta dominante ma con scala piu' stabile al cambiare larghezza viewport.
3. Aprire `/account/amministrazione/immagine-homepage`:
   - verificare preview Desktop/Mobile con proporzioni aggiornate;
   - verificare che drag + zoom influenzino separatamente i due profili.

### Aggiornamento turno INTERFACCIA (stesso giorno, fix sovrapposizione hero desktop + standard CTA)
- Segnalazione utente: in desktop `Spedisci in Italia` + box prezzo risultavano troppo in basso, finendo sotto il box `Preventivo Rapido`.
- Correzioni layout applicate:
  - `ContenutoHeader.vue` (breakpoint desktop): `hero__layout` portato a `align-items: flex-start` e `hero__content` alzato (`margin-top: -40px`) per evitare discesa del blocco testo/prezzo.
  - `Preventivo.vue`: ridotto offset negativo in homepage (`desktop:mt-[-38px]`, `tablet:mt-[-56px]`) per abbassare leggermente il box preventivo e rimuovere overlap.
- Uniformazione CTA (dimensioni testo/pulsante/freccia) al riferimento del tasto `Continua`:
  - aggiunte classi globali in `assets/css/main.css`:
    - `.btn-continue-cta`
    - `.btn-continue-cta-arrow`
  - applicate alle CTA primarie con freccia in:
    - `pages/contatti.vue` (`Invia il messaggio`)
    - `pages/carrello.vue` (`Procedi con l'ordine`)
    - `pages/la-tua-spedizione/[step].vue` (`Continua al riepilogo` e CTA compilazione dati)

### File toccati in questo aggiornamento
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `nuxt-spedizionefacile-master/pages/contatti.vue`
- `nuxt-spedizionefacile-master/pages/carrello.vue`
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `_SQUADRA_DIARIO.md`

### Verifica aggiuntiva
1. Homepage desktop: il titolo `Spedisci in Italia` e la card `8,90` devono restare sopra il box `Preventivo Rapido`, senza essere coperti.
2. Homepage desktop/tablet: il box `Preventivo` non deve invadere visivamente la hero.
3. Verificare CTA principali (`Contatti`, `Carrello`, `Step spedizione`): stessa scala visiva di pulsante, testo e freccia del riferimento `Continua`.

### Aggiornamento turno LOGICA (stesso giorno, editor homepage \"replica reale\" desktop+mobile)
- Richiesta utente: pannello admin immagine homepage con comportamento tipo Figma:
  - riproduzione fedele desktop/mobile di come appare in homepage;
  - visibilita' di tagli/coperture da layout (incluso box Preventivo);
  - modalita' selezionabili `Fit` / `Fill` / `Manuale`;
  - drag \"con manina\" in manuale e movimento ampio anche fuori riquadro.
- Intervento backend (`AdminController.php`):
  - `POST /api/admin/homepage-image` esteso con nuovi campi:
    - `crop_mode_desktop`, `crop_mode_mobile` (`manual|fill|fit`)
    - range estesi: zoom `0.5..4`, offset `-220..220`
  - upload immagine reso opzionale per consentire salvataggio solo impostazioni crop su immagine gia' esistente;
  - `GET /api/admin/homepage-image` e `GET /api/public/homepage-image` ora includono anche i campi `crop_mode_*`.
- Intervento frontend hero runtime (`ContenutoHeader.vue`):
  - supporto modalita' `fit/fill/manual` per desktop e mobile;
  - in `manual` applica zoom/offset salvati, in `fit/fill` usa preset coerenti.
- Intervento frontend admin (`immagine-homepage.vue`):
  - editor completo con:
    - switch profilo `Desktop/Mobile`,
    - switch modalita' `Fit/Fill/Manuale`,
    - drag a mano nel frame (solo manuale),
    - slider Zoom/X/Y con range esteso,
    - salvataggio unificato immagine + impostazioni.
  - aggiunta sezione \"Riproduzione homepage\" (desktop e mobile) con sovrapposizioni/aree coperte visualizzate.
- Coerenza icone freccia: aggiornata la freccia nelle card servizi homepage al componente condiviso `ButtonArrow`.

### File toccati in questo aggiornamento
- `laravel-spedizionefacile-main/app/Http/Controllers/AdminController.php`
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `nuxt-spedizionefacile-master/components/Homepage/Servizi.vue`
- `_SQUADRA_DIARIO.md`

### Verifica aggiuntiva
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Caricare (o lasciare corrente) un'immagine e verificare:
   - tab Desktop/Mobile indipendenti;
   - modalita' `Fit`, `Fill`, `Manuale` funzionanti;
   - in `Manuale` drag con manina e movimento molto ampio.
3. Controllare la sezione \"Riproduzione homepage\":
   - desktop e mobile mostrano box Preventivo sovrapposto e aree coperte/tagliate.
4. Salvare e aprire homepage:
   - resa desktop segue il profilo desktop;
   - resa mobile segue il profilo mobile.

### Aggiornamento turno INTERFACCIA (stesso giorno, correzione posizione titolo hero desktop)
- Segnalazione utente: `Spedisci in Italia` risultava troppo in alto (vicino/sopra area menu).
- Correzione applicata in `ContenutoHeader.vue` (solo desktop `@media min-width: 64rem`):
  - `hero__layout` riportato a `align-items: center`;
  - `hero__content` riportato a `margin-top: -15px` (da `-40px`).
- Obiettivo: riportare il blocco titolo/prezzo piu' in basso, in posizione coerente con il layout precedente.

### File toccati in questo aggiornamento
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica aggiuntiva
1. Aprire homepage desktop e verificare che `Spedisci in Italia` sia tornato piu' in basso rispetto al menu.
2. Verificare che il box `Preventivo Rapido` non copra il titolo/card prezzo.

## TURNO: LOGICA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Corretto il comportamento drag "manina" nell'editor admin immagine homepage:
  - il drag parte solo con click sinistro mantenuto;
  - al rilascio del click/tocco il controllo si ferma subito;
  - aggiunti stop di sicurezza anche su `mouseleave`, `touchcancel` e perdita focus finestra (`blur`).
- Inserita guardia runtime in movimento mouse:
  - se arriva `mousemove` con `event.buttons === 0`, il drag viene interrotto immediatamente.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. In modalita' `Manuale`, trascinare l'immagine con la manina:
   - atteso: si muove solo mentre il click/touch e' tenuto premuto.
3. Rilasciare mouse/touch:
   - atteso: movimento fermo immediato, nessuna inerzia.
4. Durante il drag uscire dal riquadro o cambiare focus finestra:
   - atteso: il drag si interrompe e non resta "agganciato".

## TURNO: INTERFACCIA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Migliorato il drag "manina" nell'editor admin:
  - durante il trascinamento ora viene attivato automaticamente il profilo corretto (`Desktop`/`Mobile`);
  - il movimento aggiorna insieme asse X e asse Y (drag diagonale continuo), non solo un asse per volta.
- Sostituita la vecchia simulazione grafica custom della homepage con una riproduzione reale:
  - in `immagine-homepage.vue` la sezione "Riproduzione homepage" ora usa due iframe live della vera pagina `/` (desktop e mobile);
  - i parametri crop correnti vengono inviati in tempo reale via `postMessage` agli iframe.
- Esteso `ContenutoHeader.vue` per supportare preview live:
  - se la homepage e' aperta in modalita' `home_preview=1`, riceve payload crop via `postMessage`;
  - applica subito immagine/crop ricevuti all'hero senza usare mock paralleli.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. In `Manuale`, trascinare l'immagine in diagonale:
   - atteso: si muove su X e Y contemporaneamente con una sola azione drag.
3. Guardare "Riproduzione homepage reale":
   - atteso: preview desktop e mobile renderizzate dalla homepage vera (iframe), non da box mock.
4. Muovere/zoomare crop senza salvare:
   - atteso: entrambe le preview reali si aggiornano in tempo reale con tagli/coperture coerenti alla homepage.
5. Salvare e aprire `/`:
   - atteso: resa hero coerente con quanto visto nelle preview reali.

## TURNO: LOGICA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Corretto mismatch tra preview account e homepage reale su desktop:
  - la preview desktop non usa piu' viewport fissa (1440x920), ma la dimensione reale della finestra corrente (`window.innerWidth/innerHeight`) con scala adattiva nel frame admin;
  - questo allinea i breakpoint/`clamp` del CSS hero tra preview e homepage, riducendo il divario di zoom/taglio percepito a destra.
- Micro-rifinitura layout hero desktop:
  - alzato leggermente il blocco testo+card prezzo (`Spedisci in Italia` + `8,90`) per evitare effetto troppo basso rispetto al box `Preventivo`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage` su desktop.
2. Controllare "Desktop reale":
   - atteso: la composizione (zoom/taglio immagine) e' molto piu' coerente con la homepage aperta nella stessa finestra.
3. In homepage (`/`) verificare blocco sinistro:
   - atteso: `Spedisci in Italia` + card `8,90` risultano leggermente piu' in alto.
4. Verificare che il drag manuale continui a muovere X e Y insieme.

## TURNO: INTERFACCIA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Potenziato il drag "manina" nell'editor immagine con Pointer Events:
  - avvio con `pointerdown` (mouse/touch/pen), con blocco selezione/scroll durante drag;
  - tracking continuo con `pointermove` + `pointercapture`, quindi movimento libero completo su X e Y anche in diagonale;
  - stop pulito su `pointerup`/`pointercancel`/`blur`.
- Spostata la sezione "Riproduzione homepage reale" in un box separato centrato sotto i due box principali, come richiesto.
- Aumentata la leggibilita' della preview live:
  - frame desktop separato piu' grande (altezza minima aumentata);
  - frame mobile separato con spazio dedicato.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. In modalita' `Manuale`, trascinare con la manina in diagonale e in traiettorie libere:
   - atteso: l'immagine segue il movimento su entrambi gli assi contemporaneamente.
3. Controllare layout pagina admin:
   - atteso: la "Riproduzione homepage reale" e' in un box separato sotto i due box iniziali.
4. Verificare dimensione preview:
   - atteso: area desktop live sensibilmente piu' grande e leggibile rispetto a prima.

## TURNO: INTERFACCIA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Rifinito il pannello "Riproduzione homepage reale" dopo feedback visivo:
  - desktop reso dominante nella griglia (colonna piu' ampia rispetto al mobile);
  - frame desktop con altezza minima piu' grande per occupare meglio lo spazio;
  - frame mobile fissato a larghezza coerente (`390px` max) per eliminare aree grigie laterali e migliorare allineamento.
- Migliorata l'interazione drag con manina:
  - aggiunto `preventDefault` in `pointerdown` per evitare comportamenti browser indesiderati durante il trascinamento.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Controllare il box "Riproduzione homepage reale":
   - atteso: desktop occupa piu' spazio del mobile.
3. Verificare mobile preview:
   - atteso: niente banda grigia laterale nel frame.
4. Trascinare immagine in `Manuale`:
   - atteso: movimento libero completo con manina, senza "strappi".

## TURNO: INTERFACCIA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Uniformata la resa dei due riquadri preview live:
  - `Desktop reale` e `Mobile reale` ora usano **la stessa altezza visiva** (allineamento sullo stesso punto inferiore).
  - entrambe le preview riempiono completamente il riquadro usando una scala tipo "cover" con centratura (no spazi vuoti interni).
- Rafforzata la predominanza desktop nella sezione separata:
  - griglia desktop resa piu' sbilanciata a favore del riquadro desktop (`2.8fr` vs `1fr`).
- Rimosse limitazioni di larghezza residuali nel frame mobile separato che causavano riempimento incompleto.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Nel box "Riproduzione homepage reale":
   - atteso: desktop e mobile terminano alla stessa altezza.
3. Controllare ogni riquadro:
   - atteso: contenuto pieno senza aree vuote/grigie interne.
4. Su desktop largo:
   - atteso: il riquadro desktop occupa visivamente piu' spazio del mobile.

## TURNO: INTERFACCIA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Corretto il problema della fascia grigia nel riquadro `Desktop reale`:
  - anteprima live ancorata in alto (offset Y forzato a `0`) invece che centrata verticalmente;
  - ridotta leggermente l'altezza condivisa dei frame live per evitare porzione inferiore vuota/non significativa;
  - sfondo frame live portato a bianco.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Nel box `Riproduzione homepage reale` controllare `Desktop reale`:
   - atteso: non compare piu' banda grigia in basso.
3. Verificare che desktop/mobile restino allineati in altezza.

## TURNO: LOGICA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Corretto il problema della preview admin "Riproduzione homepage reale" con area vuota nel frame desktop.
- In `immagine-homepage.vue` rimossa la query extra `home_preview_clean` dagli iframe (`desktopPreviewSrc` / `mobilePreviewSrc`) per usare lo stesso path homepage della preview reale.
- Stabilizzata la scala del frame desktop:
  - viewport desktop ora clampata (`width 1024..1920`, `height 640..920`) per evitare catture troppo alte che introducevano banda vuota sotto;
  - altezza condivisa frame live ritarata (`0.34`, clamp `280..520`);
  - ridotta altezza minima CSS del frame desktop separato (`300`, desktop `clamp(360px, 33vw, 580px)`).
- Ripristinata coerenza layout base in `layouts/default.vue` durante la preview, evitando regole dedicate che alteravano la resa rispetto alla homepage reale.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `nuxt-spedizionefacile-master/layouts/default.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Nel box `Riproduzione homepage reale` verificare `Desktop reale`:
   - non deve comparire la grossa fascia vuota/grigia inferiore vista prima;
   - il contenuto deve riempire il riquadro in modo piu' coerente.
3. Verificare `Desktop reale` e `Mobile reale`:
   - stessa altezza visiva;
   - frame desktop resta dominante in larghezza.
4. Muovere zoom/X/Y o drag manuale:
   - entrambe le preview continuano ad aggiornarsi live.

### Nota ambiente
- Verifica runtime automatica non completabile in questa sandbox: `nuxt dev` si interrompe su Node `v18` (`styleText`/`crypto.hash`). Controllo finale UI da fare nel runtime locale gia' usato dal progetto.

## TURNO: INTERFACCIA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: accorciare il box `Desktop reale` nella sezione `Riproduzione homepage reale`.
- In `immagine-homepage.vue` ridotta l'altezza effettiva del frame desktop:
  - `desktopLiveViewportHeight` ora e' l'80% dell'altezza condivisa (con clamp `220..420`);
  - scala iframe desktop aggiornata usando la nuova altezza desktop dedicata.
- Ridotti anche i vincoli CSS minimi del solo box desktop:
  - base da `300px` a `220px`;
  - desktop da `clamp(360px, 33vw, 580px)` a `clamp(260px, 24vw, 440px)`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Nella sezione `Riproduzione homepage reale`, controllare il riquadro `Desktop reale`:
   - atteso: box visivamente piu' basso/corto rispetto a prima.
3. Verificare che il riquadro `Mobile reale` resti invariato.
4. Verificare che aggiornamenti live (drag/zoom/X/Y) continuino a funzionare.

## TURNO: INTERFACCIA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: ingrandire il box `Mobile reale` nella sezione `Riproduzione homepage reale` e proporzionare il resto.
- In `immagine-homepage.vue` aumentata l'altezza effettiva del mobile live frame:
  - `mobileLiveViewportHeight` ora usa un fattore `1.14` della shared height (clamp `320..620`).
- Aggiornata la scala iframe mobile per usare la nuova altezza mobile dedicata (non la shared generale).
- Riequilibrata la griglia desktop in viewport larghi:
  - da `3.2fr / 1fr` a `2.8fr / 1.2fr` con colonna mobile minima piu' ampia (`300px`).
- Rafforzato il box mobile separato con min-height dedicata:
  - base `300px`;
  - desktop `clamp(340px, 29vw, 560px)`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Nel box `Riproduzione homepage reale` verificare `Mobile reale`:
   - atteso: riquadro visivamente piu' grande (altezza e presenza).
3. Verificare proporzione generale:
   - atteso: desktop resta principale ma meno schiacciamento del mobile.
4. Muovere crop/drag/zoom:
   - atteso: preview mobile continua ad aggiornarsi live correttamente.

## TURNO: INTERFACCIA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: nel box `Desktop reale` il contenuto risultava troppo ristretto con ampi spazi vuoti laterali.
- In `immagine-homepage.vue` aggiunto boost di riempimento per il solo frame desktop live:
  - nuova costante `DESKTOP_PREVIEW_FILL_BOOST = 1.14`;
  - la scala desktop live ora usa `Math.max(scaleX, scaleY) * DESKTOP_PREVIEW_FILL_BOOST`.
- Effetto: contenuto desktop della preview piu' espanso nel riquadro, con riduzione visibile delle bande laterali.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Nel box `Riproduzione homepage reale` -> `Desktop reale`:
   - atteso: contenuto piu' largo nel frame;
   - atteso: spazi vuoti laterali nettamente ridotti.
3. Verificare che il box `Mobile reale` resti invariato.

## TURNO: LOGICA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Fix mirato sul comportamento zoom immagine homepage (mismatch tra editor/admin preview e homepage reale).
- In `ContenutoHeader.vue` rimossi i `transform: scale(1.35)` del contenitore hero image nei breakpoint tablet/desktop/desktop-xl.
  - Motivo: quello zoom extra non controllato dallo slider rendeva la homepage percepita "sempre zoomata" anche quando in admin si faceva zoom-out.
- In `immagine-homepage.vue` rimossa la forzatura `DESKTOP_PREVIEW_FILL_BOOST` nel frame live desktop.
  - Ora la scala preview desktop e' solo `Math.max(scaleX, scaleY)`, senza moltiplicatori nascosti.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. In modalita' `Manuale`, usare lo slider Zoom Desktop:
   - atteso: zoom-out riduce davvero l'inquadratura in modo lineare (senza zoom residuo nascosto).
3. Salvare e aprire homepage `/` desktop:
   - atteso: immagine non risulta piu' "iper-zoomata" da scala extra non controllata.
4. Confrontare homepage reale e preview live desktop:
   - atteso: comportamento piu' coerente tra editor/preview/home reale.

## TURNO: LOGICA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Corretto il problema di percezione zoom nel pannello admin immagine homepage:
  - prima il pannello mostrava solo `zoom slider` (es. 100%), ma non il crop implicito dovuto a `cover/fill`.
- In `immagine-homepage.vue` aggiunta misura intrinseca immagine caricata (`naturalWidth/naturalHeight`) e calcolo rapporto `cover-to-fit` per profilo desktop/mobile.
- Introdotto `getEffectiveZoomPercent(profile)`:
  - `Zoom effettivo = zoom slider * fattore crop implicito (cover/fill)`;
  - in `fit` il fattore implicito e' 1.
- UI aggiornata:
  - valore principale della riga Zoom ora mostra lo **zoom effettivo reale**;
  - aggiunta riga informativa: `Zoom slider` + `Zoom effettivo` contemporaneamente.
- Aggiornata nota descrittiva nel pannello per chiarire che lo zoom effettivo include il crop implicito della modalita' Fill/Cover.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Caricare/selezionare immagine e andare su profilo Desktop in `Manuale`.
3. Controllare riga Zoom:
   - atteso: il numero mostrato puo' essere >100 anche con slider a 100 quando c'e' crop implicito.
4. Controllare testo sotto slider:
   - atteso: differenza esplicita tra `Zoom slider` e `Zoom effettivo`.
5. Ripetere su profilo Mobile e verificare aggiornamento coerente.

## TURNO: LOGICA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Risolto il comportamento "zoom-out che rimpicciolisce il ritaglio" su editor e homepage reale.
- Root cause: in manuale si usava `object-fit: cover` + `transform: scale(...)`; questo taglia prima e scala dopo, quindi lo zoom-out non recupera davvero area fuori inquadratura.
- Correzione implementata (modello camera coerente):
  - in manuale ora si usa `object-fit: contain` + scala composta con `coverToFitRatio` (`zoom_manual * cover_ratio`);
  - in `fill` resta `object-fit: cover`; in `fit` resta `object-fit: contain`.
- Applicato sia a:
  - editor admin (`pages/account/amministrazione/immagine-homepage.vue`);
  - rendering reale hero homepage (`components/ContenutoHeader.vue`) con calcolo ratio dinamico basato su dimensione frame reale + dimensione intrinseca immagine.
- Aggiunti probe e resize observer in `ContenutoHeader.vue` per mantenere allineato il rapporto quando cambia viewport/frame.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. In `Manuale` con slider a 100:
   - atteso: inquadratura equivalente al fill/cover base (con eventuale crop implicito).
3. Ridurre slider zoom in manuale (es. da 100 a 90, 80):
   - atteso: si vede progressivamente piu' area dell'immagine, non solo miniatura del ritaglio precedente.
4. Salvare e aprire homepage `/` desktop/mobile:
   - atteso: comportamento zoom coerente con quanto visto in editor/live preview.
5. Verificare modalita' preset:
   - `Fill` continua a riempire (cover),
   - `Fit` continua a mostrare tutto (contain).

## TURNO: INTERFACCIA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: alzare in homepage reale il blocco `Spedisci in Italia` insieme alla card `8,90€`.
- Intervento mirato in `ContenutoHeader.vue` (solo desktop `@media min-width: 64rem`):
  - `hero__content margin-top` da `-34px` a `-52px`.
- Nessuna modifica su mobile/tablet e nessun intervento sul box `Preventivo`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage `/` su desktop.
2. Controllare blocco sinistro hero:
   - atteso: `Spedisci in Italia` + card `8,90€` visivamente piu' in alto.
3. Verificare che il box `Preventivo Rapido` non copra titolo/card.

## TURNO: INTERFACCIA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: alzare ancora il blocco hero sinistro (`Spedisci in Italia` + card `8,90€`) in homepage desktop.
- In `ContenutoHeader.vue` (breakpoint desktop `min-width: 64rem`) aumentato ulteriormente l'offset verticale:
  - `hero__content margin-top` da `-52px` a `-64px`.
- Nessuna altra modifica a mobile/tablet o al box `Preventivo`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage `/` su desktop.
2. Atteso: blocco `Spedisci in Italia` + `8,90€` ancora piu' in alto rispetto al fix precedente.
3. Atteso: nessuna sovrapposizione col box `Preventivo Rapido`.

## TURNO: INTERFACCIA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: alzare ancora il blocco hero sinistro desktop (`Spedisci in Italia` + card `8,90€`).
- In `ContenutoHeader.vue` (desktop `min-width: 64rem`) aumentato ancora l'offset verticale:
  - `hero__content margin-top` da `-64px` a `-74px`.
- Nessuna modifica su mobile/tablet e nessun impatto sul box `Preventivo`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage `/` su desktop.
2. Atteso: blocco sinistro hero ulteriormente piu' in alto.
3. Atteso: nessuna sovrapposizione con `Preventivo Rapido`.

## TURNO: INTERFACCIA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: alzare ancora il blocco sinistro hero (`Spedisci in Italia` + card `8,90€`) su desktop.
- In `ContenutoHeader.vue` (breakpoint desktop `@media (min-width: 64rem)`) aumentato ancora l'offset verticale:
  - `hero__content margin-top` da `-120px` a `-136px`.
- Nessuna modifica su mobile/tablet, nessuna modifica alla struttura del box `Preventivo`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage `/` su desktop.
2. Atteso: blocco `Spedisci in Italia` + card prezzo visibilmente piu' in alto rispetto al fix precedente.
3. Atteso: nessuna sovrapposizione problematica con il box `Preventivo Rapido`.

## TURNO: INTERFACCIA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: alzare ancora il blocco sinistro hero (`Spedisci in Italia` + card `8,90€`) su desktop.
- In `ContenutoHeader.vue` (breakpoint desktop `@media (min-width: 64rem)`) aumentato ulteriormente l'offset verticale:
  - `hero__content margin-top` da `-136px` a `-152px`.
- Nessuna modifica su mobile/tablet e nessuna modifica al box `Preventivo`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage `/` su desktop.
2. Atteso: blocco `Spedisci in Italia` + card `8,90€` ancora piu' in alto rispetto al passaggio precedente.
3. Atteso: nessuna sovrapposizione distruttiva con `Preventivo Rapido`.

## TURNO: INTERFACCIA
DATA: 2026-02-22

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: alzare ancora il blocco sinistro hero (`Spedisci in Italia` + card `8,90€`) su desktop.
- In `ContenutoHeader.vue` (breakpoint desktop `@media (min-width: 64rem)`) aumentato ulteriormente l'offset verticale:
  - `hero__content margin-top` da `-152px` a `-168px`.
- Nessuna modifica su mobile/tablet e nessuna modifica al box `Preventivo`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage `/` su desktop.
2. Atteso: blocco `Spedisci in Italia` + card `8,90€` ancora piu' in alto rispetto al passaggio precedente.
3. Atteso: nessuna sovrapposizione distruttiva con `Preventivo Rapido`.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: proporzionamento coerente dei bottoni rispetto al contenitore/importanza, con stessa logica di calcolo responsive (non stesse misure fisse).
- Implementato un sistema globale in `assets/css/main.css` basato su unita' fluida + rapporto aureo (`--btn-fluid-*`) per derivare in modo coerente:
  - altezza,
  - padding,
  - raggio,
  - font-size,
  - dimensione icone.
- Aggiornate classi globali bottoni (`.btn-primary`, `.btn-secondary`, `.btn-cta`, `.btn-continue-cta`, `.btn-danger`, `.services-button`) per usare la stessa formula proporzionale.
- Aggiunte nuove utility riusabili:
  - `.btn-fluid-base`, `.btn-fluid-sm`, `.btn-fluid-icon`,
  - `.btn-fluid-primary`, `.btn-fluid-accent`, `.btn-fluid-ghost`, `.btn-fluid-danger`.
- Allineata la pagina carrello (`pages/carrello.vue`) alla nuova logica proporzionale sostituendo stili hardcoded nei bottoni principali/secondari:
  - `Applica Coupon`,
  - `Svuota carrello`,
  - `Crea nuova spedizione`,
  - bottoni dei modali (`Annulla`, `Elimina`, `Svuota tutto`).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `nuxt-spedizionefacile-master/pages/carrello.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/carrello` desktop/mobile.
2. Verificare che `Applica Coupon`, `Svuota carrello` e `Procedi con l'ordine` risultino coerenti come proporzioni (stessa formula, taglie diverse per importanza).
3. Aprire modali eliminazione/svuotamento: i bottoni devono mantenere la stessa logica proporzionale in versione compatta.
4. Aprire pagine con CTA `Continua` (wizard/contatti/carrello) e verificare coerenza dimensionale dell'icona freccia.
5. Verificare che i bottoni servizi usino la stessa metrica (raggio/altezza/font da formula condivisa).

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Estesa la stessa logica proporzionale anche ai controlli piccoli quantita' nel carrello (`+` / `-`) per evitare mismatch dimensionali rispetto ai CTA.
- Aggiunta classe condivisa `.btn-qty-control` in `assets/css/main.css` (dimensioni/typography/hover/disabled derivate da `--btn-fluid-*`).
- Sostituiti i vecchi stili hardcoded dei pulsanti quantita' in `pages/carrello.vue` con la nuova classe condivisa.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `nuxt-spedizionefacile-master/pages/carrello.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/carrello` desktop/tablet/mobile.
2. Verificare che i pulsanti quantita' `+/-` risultino coerenti fra righe singole e gruppi.
3. Verificare stato disabled (quantita' minima) con opacita' e senza salti di layout.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Segnalazione utente: colori bottoni errati (testo scuro su sfondo pieno, es. `Crea nuova spedizione`).
- Fix mirato in `assets/css/main.css`:
  - forzato colore testo bianco e nessuna sottolineatura per bottoni pieni anche quando renderizzati come link (`NuxtLink`).
  - coperti stati `:link`, `:visited`, `:hover`, `:active`, `:focus-visible` per:
    - `.btn-fluid-primary`
    - `.btn-fluid-accent`
    - `.btn-fluid-danger`
    - `.btn-continue-cta`
- Scopo: evitare override da regole globali degli anchor che portavano testo scuro nei pulsanti.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/carrello` (stato vuoto e pieno).
2. Verificare che i pulsanti pieni (`Crea nuova spedizione`, `Applica Coupon`, `Procedi con l'ordine`) abbiano testo bianco in tutti gli stati.
3. Verificare nei modali che i bottoni rossi mantengano testo bianco e nessuna sottolineatura.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: ripristino totale dei bottoni "come prima" per eliminare regressioni di colore/dimensione.
- Rollback completo delle modifiche introdotte sul sistema bottoni in `assets/css/main.css`:
  - rimosse classi/variabili `btn-fluid*` e `btn-qty-control`.
  - ripristinate le definizioni originali di `.btn-primary`, `.btn-secondary`, `.btn-cta`, `.btn-danger`, `.services-button`.
  - ripristinata anche la transizione originale di `.card-hover` (con `transform`).
- Rollback completo in `pages/carrello.vue` dei pulsanti alla versione precedente:
  - `Applica Coupon`, `Svuota carrello`, `Procedi con l'ordine`, `Crea nuova spedizione`, bottoni modali, controlli quantita' `+/-`.
  - ripristinata anche la freccia del CTA checkout alla versione precedente (`mdi:arrow-right`).
- Confermato che NON restano riferimenti `btn-fluid` o `btn-qty-control`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `nuxt-spedizionefacile-master/pages/carrello.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/carrello` con e senza elementi.
2. Verificare che i bottoni abbiano aspetto/colore precedente (nessun testo bianco su sfondo bianco, nessun layout alterato).
3. Verificare i bottoni dei modali (`Annulla`, `Elimina`, `Svuota tutto`) e i controlli quantita' `+/-`.
4. Verificare CTA `Procedi con l'ordine` con icona freccia `mdi:arrow-right` come prima.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Segnalazione utente: bottoni carrello ancora errati (font percepito troppo grande, bottoni "squadrati", colore/sfondo non affidabile su `Applica Coupon` e CTA checkout).
- Applicato fix mirato SOLO per pagina carrello con classi dedicate in `assets/css/main.css`:
  - `.cart-btn-base`
  - `.cart-btn-coupon`
  - `.cart-btn-clear`
  - `.cart-btn-checkout`
  - `.cart-btn-modal-secondary`
  - `.cart-btn-modal-danger`
  - `.cart-btn-icon`
- Queste classi impostano in modo esplicito e stabile:
  - border-radius,
  - padding/altezza,
  - font-size,
  - colori testo/sfondo (con priorita' alta nei casi critici),
  - stati hover/active/disabled,
  - comportamento link (`NuxtLink`) senza perdita di stile.
- Agganciati i bottoni di `pages/carrello.vue` alle nuove classi dedicate:
  - `Applica Coupon`,
  - `Svuota carrello`,
  - `Procedi con l'ordine`,
  - `Crea nuova spedizione` (carrello vuoto),
  - bottoni dei modali (`Annulla`, `Elimina`, `Svuota tutto`).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `nuxt-spedizionefacile-master/pages/carrello.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/carrello` con almeno una spedizione.
2. Verificare che `Applica Coupon` sia sempre pill teal con testo bianco leggibile.
3. Verificare che `Procedi con l'ordine` sia pill arancione con font proporzionato (non oversize).
4. Verificare che `Svuota carrello` resti secondario grigio/bordo e non squadrato.
5. Aprire i modali conferma e verificare stile coerente di `Annulla`/`Elimina`/`Svuota tutto`.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Rifinitura richiesta su CTA carrello: ridotta ulteriormente la gerarchia visiva del bottone `Procedi con l'ordine`.
- In `assets/css/main.css` (`.cart-btn-checkout`):
  - `min-height` da `52px` a `50px`,
  - `padding-inline` da `40px` a `36px`,
  - `font-size` da `1rem` a `0.9375rem`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/carrello` desktop.
2. Verificare che `Procedi con l'ordine` risulti meno dominante e piu' proporzionato rispetto ai testi della card.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: nella pagina admin `Immagine Homepage` spostare `Riproduzione homepage reale` in alto al posto di `Anteprima attuale`.
- In `pages/account/amministrazione/immagine-homepage.vue`:
  - sostituita la card sinistra con il blocco live `Riproduzione homepage reale` (desktop + mobile),
  - rimossa la sezione duplicata in basso per evitare doppia preview,
  - mantenuta la card editor nella colonna destra.
- Richiesta utente: il rialzo di `Spedisci in Italia` + box `8,90€` doveva valere solo desktop; mobile da ripristinare.
- In `components/ContenutoHeader.vue` rimosso il blocco mobile dedicato che applicava offset verticali (`@media (max-width: 44.999rem)`), ripristinando il comportamento precedente su mobile.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Verificare che in alto, al posto di `Anteprima attuale`, sia presente la card `Riproduzione homepage reale`.
3. Verificare che non esista piu' una seconda sezione `Riproduzione homepage reale` sotto i due box principali.
4. Aprire homepage su viewport mobile (es. 390x844) e verificare che `Spedisci in Italia` e card `8,90€` non risultino rialzati come in desktop.
5. Aprire homepage desktop e verificare che il comportamento desktop resti invariato.

### Note
- Tentativo di build eseguito (`npm run build` in Nuxt) ma bloccato da incompatibilita' ambiente Node (`node:util styleText`), errore non legato ai file modificati in questo turno.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Segnalazione utente: bottoni ancora rotti su piu' pagine (carrello + contatti) con freccia gigante.
- Individuata root cause principale: classi globali mancanti `btn-continue-cta` e `btn-continue-cta-arrow` usate in:
  - `pages/contatti.vue`
  - `pages/la-tua-spedizione/[step].vue`
  senza definizione CSS attiva.
- In `assets/css/main.css` aggiunte/ripristinate regole globali robuste:
  - `.btn-continue-cta` (stile pill arancione coerente),
  - `.btn-continue-cta-arrow` (dimensione esplicita 18x18 per bloccare il bug freccia enorme).
- In `assets/css/main.css` rinforzate classi carrello per evitare fallback non voluti:
  - `.cart-btn-base` con `border-radius: 9999px`, font Montserrat e no-wrap,
  - `.cart-btn-coupon` con radius/padding/min-height espliciti,
  - `.cart-btn-checkout` con altezza/font/peso coerenti.
- In `pages/carrello.vue` uniformata la freccia del CTA checkout:
  - sostituito `Icon mdi:arrow-right` con `ButtonArrow` (`w-[18px] h-[18px]`) per coerenza grafica.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `nuxt-spedizionefacile-master/pages/carrello.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/contatti` e verificare bottone `Invia il messaggio`:
   - pill arancione,
   - testo leggibile,
   - freccia dimensione corretta (non gigante).
2. Aprire `/la-tua-spedizione/1` e verificare bottoni `Continua...` con stessa resa visiva (pill + freccia corretta).
3. Aprire `/carrello` e verificare:
   - `Applica Coupon` pill piena (non squadrata),
   - `Procedi con l'ordine` con dimensione/font coerenti e freccia uniforme.
4. Verificare anche stato carrello vuoto: `Crea nuova spedizione` mantiene shape/color coerenti.

### Note
- Build Nuxt non rieseguibile in questo ambiente per incompatibilita' Node gia' nota (`node:util styleText`).

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: nella card `Riproduzione homepage reale` mostrare le preview una sotto l'altra (prima Desktop, poi Mobile), non affiancate.
- In `pages/account/amministrazione/immagine-homepage.vue` aggiornato il CSS della griglia preview:
  - rimosso layout a 2 colonne su tablet,
  - rimosso layout affiancato su desktop per `live-preview-grid--separate`,
  - mantenuto ordine del template invariato (Desktop sopra, Mobile sotto).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Nella sezione `Riproduzione homepage reale` verificare che `Desktop reale` sia in alto.
3. Verificare che `Mobile reale` sia sotto al desktop.
4. Ridimensionare viewport (mobile/tablet/desktop): layout deve restare verticale, mai affiancato.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: nella sezione `Riproduzione homepage reale` la preview desktop risultava troppo piccola; richiesta resa piu' "fill".
- In `pages/account/amministrazione/immagine-homepage.vue` aggiornato il calcolo scala del solo iframe desktop:
  - introdotto boost di fill (`DESKTOP_LIVE_FILL_BOOST = 1.14`) sul fattore scala,
  - centratura anche su asse Y (`desktopLiveOffset.y`) invece di ancoraggio top fisso.
- Mobile invariato.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. In `Riproduzione homepage reale` verificare che `Desktop reale` appaia piu' pieno (meno ridotto) nel box.
3. Verificare che non compaiano bande vuote e che il contenuto resti centrato.
4. Verificare che `Mobile reale` non sia alterato.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Segnalazione utente: nel box `Desktop reale` il menu risultava tagliato in alto, troppo spazio bianco sotto e contenuto troppo lontano dai lati.
- In `pages/account/amministrazione/immagine-homepage.vue` regolata la preview desktop:
  - viewport desktop fissata a `1280x760` (meno margini laterali percepiti rispetto al viewport troppo grande),
  - ridotto `DESKTOP_LIVE_FILL_BOOST` a `1.1`,
  - ancoraggio verticale in alto (`desktopLiveOffset.y = 0`) per non tagliare il menu.
- Ridotta anche l'altezza minima del frame desktop su breakpoint desktop:
  - `min-height` da `clamp(260px, 24vw, 440px)` a `clamp(240px, 20vw, 360px)` per diminuire il vuoto bianco inferiore.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Verificare in `Desktop reale` che la navbar superiore sia completamente visibile (non tagliata).
3. Verificare riduzione dello spazio bianco in basso nel riquadro desktop.
4. Verificare che il contenuto desktop sia piu' vicino ai lati (meno margine laterale percepito).
5. Verificare che il riquadro `Mobile reale` resti invariato.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Feedback utente: la preview `Desktop reale` non corrispondeva piu' al desktop effettivo (composizione alterata), richiesta solo di avvicinare leggermente senza "riempire".
- In `pages/account/amministrazione/immagine-homepage.vue` applicato rollback di fedelta' desktop:
  - ripristinato viewport desktop dinamico basato su `window.innerWidth/innerHeight` (clamp),
  - ridotto il boost fill desktop da `1.1` a `1.03` (avvicinamento leggero, non aggressivo),
  - mantenuto ancoraggio top (`desktopLiveOffset.y = 0`) per non tagliare la navbar.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Controllare `Desktop reale`: composizione deve corrispondere al desktop reale (menu/titolo/card nello stesso ordine visivo).
3. Verificare che l'avvicinamento sia leggero (non zoom eccessivo) e senza tagli aggressivi.
4. Verificare che `Mobile reale` rimanga invariato.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: drag con manina nell'`Editor Desktop` piu' libero e fluido in ogni direzione (anche diagonale/circolare).
- In `pages/account/amministrazione/immagine-homepage.vue` migliorata la logica di trascinamento:
  - aumentato range di movimento (`MAX_SHIFT`) da `220` a `400`,
  - drag isotropo su assi X/Y usando un riferimento unico (`min(width,height)`) per avere stessa sensibilita' in tutte le direzioni,
  - aggiornamento posizione con `requestAnimationFrame` per maggiore fluidita' durante il movimento continuo,
  - pulizia completa stato drag (`start/origin/pending/raf`) a fine interazione.
- Ottimizzata resa grafica durante drag:
  - aggiunto `will-change: transform, object-position` a `.editor-image`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage` e mettere `Desktop` in modalita' `Manuale`.
2. Trascinare con la manina tenendo premuto:
   - in diagonale (alto-destra, basso-sinistra),
   - con movimenti circolari.
3. Verificare movimento continuo su X+Y insieme, senza scatti evidenti.
4. Verificare che al rilascio del click il drag si fermi immediatamente.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: accorciare solo l'altezza del riquadro `Desktop reale` nella sezione `Riproduzione homepage reale`.
- In `pages/account/amministrazione/immagine-homepage.vue` ridotta altezza preview desktop:
  - `desktopLiveViewportHeight` da `0.8` a `0.66` del riferimento,
  - clamp da `220..420` a `190..300`.
- Ridotti anche i vincoli CSS desktop per evitare che `min-height` annulli la riduzione:
  - base desktop `min-height` da `220px` a `190px`,
  - su desktop `min-height` da `clamp(240px, 20vw, 360px)` a `clamp(200px, 16vw, 300px)`.
- Nessuna modifica al riquadro mobile.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Verificare che il riquadro `Desktop reale` sia piu' basso (meno spazio sotto).
3. Verificare che `Mobile reale` resti invariato.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: alzare ancora leggermente il riquadro `Desktop reale` (accorciare ancora da sotto).
- In `pages/account/amministrazione/immagine-homepage.vue` ulteriore riduzione mirata dell'altezza desktop:
  - `desktopLiveViewportHeight` da `0.66` a `0.62`,
  - clamp da `190..300` a `176..276`.
- Aggiornati anche i min-height CSS desktop per mantenere coerenza:
  - base `176px`,
  - desktop `clamp(188px, 14vw, 276px)`.
- Mobile invariato.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Verificare che `Desktop reale` risulti ancora piu' alto (meno spazio bianco sotto).
3. Verificare che `Mobile reale` resti invariato.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: ridurre un po' i margini laterali nella preview `Desktop reale` restando fedele.
- In `pages/account/amministrazione/immagine-homepage.vue` applicato micro-zoom solo sulla live preview desktop:
  - `DESKTOP_LIVE_FILL_BOOST` da `1.03` a `1.07`.
- Nessuna modifica a mobile e nessun cambio di layout/struttura.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. In `Desktop reale` verificare margini laterali piu' stretti (contenuto leggermente piu' vicino ai lati).
3. Verificare che menu superiore resti visibile e che il mobile non cambi.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: avvicinare ancora leggermente la preview desktop.
- In `pages/account/amministrazione/immagine-homepage.vue` ritocco incrementale:
  - `DESKTOP_LIVE_FILL_BOOST` da `1.07` a `1.09`.
- Nessuna altra modifica.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. In `Desktop reale` verificare ulteriore riduzione dei margini laterali.
3. Verificare che il menu superiore resti completamente visibile.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Segnalazione utente: bottoni ancora sproporzionati/incoerenti in `carrello` e `contatti` (testo attaccato ai bordi, `Svuota carrello` poco visibile, `Invia il messaggio` lungo/bianco).
- In `assets/css/main.css` ritoccato il sistema bottoni:
  - `.btn-continue-cta`: piu' padding, altezza leggermente maggiore, bordo esplicito e background arancione forzato.
  - `.cart-btn-base`: piu' spazio interno (gap/padding) per evitare testo attaccato ai bordi.
  - `.cart-btn-coupon`: padding e peso font aumentati.
  - `.cart-btn-checkout`: padding maggiore, altezza leggermente maggiore, tracking leggero.
  - `.cart-btn-clear`: ora e' un vero bottone visibile (sfondo grigio chiaro + bordo), non solo testo.
- In `pages/contatti.vue` bottone `Invia il messaggio` reso non full-width su tablet/desktop:
  - `w-full tablet:w-auto mx-auto` per proporzioni corrette.
- In `pages/carrello.vue` rimosso override `rounded-[10px]` dal bottone `Crea nuova spedizione` per mantenere shape coerente pill.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `nuxt-spedizionefacile-master/pages/contatti.vue`
- `nuxt-spedizionefacile-master/pages/carrello.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/carrello`:
   - `Applica Coupon` e `Procedi con l'ordine` con testo centrato e margini interni corretti.
   - `Svuota carrello` visualizzato come bottone grigio (non solo testo).
2. Aprire `/carrello` vuoto:
   - `Crea nuova spedizione` con forma pill coerente.
3. Aprire `/contatti`:
   - `Invia il messaggio` arancione visibile, proporzionato, non barra lunga full-width su desktop.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Nuovo fix urgente richiesto dall'utente: bottoni ancora errati su `carrello` e `contatti`.
- Correzione resa "blindata" a livello markup (classi Tailwind dirette) per evitare conflitti di cascade/global CSS:
  - `pages/carrello.vue`
    - `Applica Coupon`: padding orizzontale aumentato, altezza e pill shape esplicite.
    - `Svuota carrello`: ora bottone visibile con sfondo + bordo + hover, non testo nudo.
    - `Procedi con l'ordine`: pill arancione con padding interno ampio, testo non attaccato ai bordi.
    - `Crea nuova spedizione`: stessa grammatica visiva del bottone coupon.
  - `pages/contatti.vue`
    - `Invia il messaggio`: stile arancione esplicito direttamente nel bottone (bordo/fondo/testo), proporzionato.
    - freccia con size esplicita `w-[18px] h-[18px]`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/carrello.vue`
- `nuxt-spedizionefacile-master/pages/contatti.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/carrello`:
   - `Applica Coupon` con testo centrato e spazio interno a destra/sinistra.
   - `Svuota carrello` visibile come bottone grigio.
   - `Procedi con l'ordine` con testo/freccia non attaccati ai bordi.
2. Aprire `/contatti`:
   - `Invia il messaggio` arancione, leggibile, non bianco/piatto.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Nuova correzione richiesta utente: bottoni ancora con testo vicino ai bordi e resa non affidabile.
- Applicato fix "hard override" direttamente nel markup dei bottoni principali (carrello + contatti):
  - aggiunti `style` inline per forzare background/border/color (evita effetti da cascade/global override),
  - aumentati `min-width`, `padding` e `gap` per separare testo/icona dai bordi.
- Bottoni interessati:
  - `/carrello`: `Applica Coupon`, `Svuota carrello`, `Procedi con l'ordine`, `Crea nuova spedizione`.
  - `/contatti`: `Invia il messaggio`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/carrello.vue`
- `nuxt-spedizionefacile-master/pages/contatti.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/carrello`:
   - `Applica Coupon` teal pieno con testo non attaccato ai bordi.
   - `Svuota carrello` bottone grigio pieno visibile.
   - `Procedi con l'ordine` arancione con spaziatura interna ampia.
2. Aprire `/contatti`:
   - `Invia il messaggio` arancione pieno, dimensione proporzionata, testo/freccia distanziati.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Segnalazione utente: in `/la-tua-spedizione/2` alcuni CTA risultavano ancora quadrati; in `/contatti` bottone da mantenere centrato.
- Corretto `pages/la-tua-spedizione/[step].vue` sui due pulsanti CTA finali:
  - rimosso uso della sola classe globale `btn-continue-cta`,
  - applicato stile pill esplicito direttamente nel markup (background/border arancione, padding, radius, gap),
  - dimensione freccia resa esplicita (`w-[18px] h-[18px]`).
- Corretto `pages/contatti.vue`:
  - bottone submit avvolto in container `flex justify-center` per centratura stabile,
  - mantenuto stile pill arancione con spaziatura coerente.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `nuxt-spedizionefacile-master/pages/contatti.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/la-tua-spedizione/2`:
   - verificare che i CTA `Continua...` e `Compila dati ritiro e destinazione` siano pill arrotondati (non quadrati),
   - verificare testo/freccia non attaccati ai bordi.
2. Aprire `/contatti`:
   - verificare bottone `Invia il messaggio` centrato,
   - verificare stile arancione pieno con padding corretto.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Segnalazione utente: nel form step spedizione i CTA affiancati (`Indietro` e arancione) avevano dimensioni incoerenti.
- In `pages/la-tua-spedizione/[step].vue` allineati i 4 pulsanti finali dei due stati (`showAddressFields` true/false) con regola unica:
  - stessa altezza (`min-h-[54px]`),
  - stesso font/peso/tracking/gap,
  - stessa larghezza desktop (`desktop:w-[330px]`),
  - stessa spaziatura interna (`px-[38px]`),
  - pill coerenti (`rounded-[999px]`).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/la-tua-spedizione/2`.
2. Verificare che `Indietro` e bottone arancione abbiano stessa altezza e stessa larghezza in desktop.
3. Verificare che testo/icona abbiano identica gerarchia tipografica e spaziatura interna coerente.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Segnalazione utente: i bottoni devono mantenere coerenza visiva ma con larghezza proporzionata alla lunghezza del testo (no pill eccessivamente lunghe).
- Aggiornati i CTA principali in 3 aree:
  - `assets/css/main.css`
    - allineata classe riusata `.btn-continue-cta` a dimensioni testuali/padding coerenti con la nuova regola di proporzione (font `1rem`, padding orizzontale ridotto).
  - `pages/la-tua-spedizione/[step].vue`
    - rimossa larghezza fissa desktop dei CTA finali (`desktop:w-[330px]`);
    - impostata larghezza adattiva (`w-full tablet:w-auto`) con stesso padding/font/gap sui pulsanti affiancati;
    - testo CTA uniformato a `text-[1rem]`.
  - `pages/carrello.vue`
    - rimossi `min-w` dai pulsanti principali (`Applica Coupon`, `Svuota carrello`, `Procedi con l'ordine`);
    - CTA con padding ridotto e larghezza adattiva al contenuto;
    - `Svuota carrello` reso visivamente non bianco (sfondo grigio/azzurro piu' evidente).
  - `pages/contatti.vue`
    - bottone `Invia il messaggio` mantenuto centrato e reso a larghezza contenuto (`w-auto`) con padding coerente.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `nuxt-spedizionefacile-master/pages/carrello.vue`
- `nuxt-spedizionefacile-master/pages/contatti.vue`
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/la-tua-spedizione/2`:
   - verificare che `Indietro` e `Continua al riepilogo` abbiano stessa altezza/font ma larghezza adattiva al testo.
2. Aprire `/carrello`:
   - verificare `Procedi con l'ordine` con testo centrato e padding interno corretto;
   - verificare `Svuota carrello` con sfondo non bianco.
3. Aprire `/contatti`:
   - verificare `Invia il messaggio` centrato e proporzionato al testo.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: il font di `Invia il messaggio` deve essere identico a `Continua al riepilogo`.
- In `pages/contatti.vue` il bottone submit ora usa direttamente la classe condivisa `btn-continue-cta` (stessa tipografia/padding del CTA preventivo), mantenendo `w-auto`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/contatti.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/contatti` e `/la-tua-spedizione/2`.
2. Confrontare `Invia il messaggio` con `Continua al riepilogo`: stessa dimensione font e stessa gerarchia tipografica.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: coerenza altezze bottoni nel sito e allineamento visivo nella riga coupon del carrello.
- Aggiornata base stile condivisa in `assets/css/main.css`:
  - introdotta variabile `--button-cta-height: 54px`;
  - applicata a `.btn-continue-cta`, `.cart-btn-base`, `.cart-btn-coupon`, `.cart-btn-checkout`.
- In `pages/carrello.vue` allineata riga coupon:
  - input coupon e stato coupon applicato portati a `h-[54px]`;
  - bottone `Svuota carrello` allineato anche come dimensione testo (`text-[1rem]`).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `nuxt-spedizionefacile-master/pages/carrello.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/carrello`:
   - input coupon e bottone `Applica Coupon` devono risultare allineati in altezza;
   - `Svuota carrello` e `Procedi con l'ordine` devono avere altezza CTA coerente.
2. Aprire `/la-tua-spedizione/2` e `/contatti`:
   - verificare che i CTA principali restino sulla stessa altezza base (54px).

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Correzione richiesta utente: non alzare i box input alla quota dei bottoni; riportare il box coupon com'era e portare i bottoni a quell'altezza.
- Applicato adeguamento:
  - `pages/carrello.vue`: campo coupon ripristinato a `h-[48px] tablet:h-[44px]` (anche stato coupon applicato).
  - `pages/carrello.vue`: bottoni principali della pagina portati a `min-h-[48px] tablet:min-h-[44px]`.
  - `pages/la-tua-spedizione/[step].vue`: CTA finali portati a `min-h-[48px] tablet:min-h-[44px]`.
  - `assets/css/main.css`: variabile shared `--button-cta-height` riportata a `48px` con override tablet+ a `44px`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `nuxt-spedizionefacile-master/pages/carrello.vue`
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/carrello`:
   - box input coupon deve essere come prima (piu' basso dei 54px, `48/44`);
   - bottone `Applica Coupon` stessa altezza del box input.
2. Verificare nella stessa pagina che `Svuota carrello` e `Procedi con l'ordine` abbiano la stessa altezza base (`48/44`).
3. Aprire `/la-tua-spedizione/2`:
   - `Indietro` e `Continua al riepilogo` con altezza allineata alla nuova regola (`48/44`).

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: hover animation visibile sui bottoni del carrello (`Svuota carrello`, `Applica Coupon`, `Procedi con l'ordine`), fix bottone `Invia il messaggio` su contatti, coerenza altezza per i pulsanti di `Modalità di consegna`.
- In `pages/carrello.vue` aggiunte animazioni hover esplicite ai 3 bottoni principali:
  - transizioni su background/border/ombra/transform,
  - lift leggero (`hover:-translate-y-[1px]`) e shadow dedicata per ciascun bottone.
- In `pages/contatti.vue` rafforzato stile del submit:
  - mantenuta classe shared `btn-continue-cta`,
  - aggiunti `rounded-[999px]`, altezza `48/44` e hover animation esplicita (evita resa "quadrata").
- In `pages/la-tua-spedizione/[step].vue` sui due bottoni `Modalità di consegna`:
  - altezza coerente `min-h-[48px] tablet:min-h-[44px]`,
  - aggiunta animazione hover uniforme con lift+shadow.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/carrello.vue`
- `nuxt-spedizionefacile-master/pages/contatti.vue`
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/carrello`:
   - su `Applica Coupon`, `Svuota carrello`, `Procedi con l'ordine` verificare effetto hover (lift + ombra + transizione colore).
2. Aprire `/contatti`:
   - `Invia il messaggio` deve risultare pill, non quadrato, con hover animato.
3. Aprire `/la-tua-spedizione/2`:
   - `Consegna a domicilio` e `Ritira in un Punto BRT` devono avere altezza coerente con la griglia bottoni (48/44) e hover animato.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: hover su tutti i bottoni, allineamento dimensioni bottoni ai CTA corretti del riepilogo, fix flicker step `Servizi -> Ritiro`, fix popup carrello.
- Interventi applicati:
  - `pages/la-tua-spedizione/[step].vue`
    - eliminato flicker step: `showAddressFields` ora inizializzato direttamente da query/store (`shouldStartOnRitiro`), rimosso set con `nextTick` che causava highlight intermedio su `Servizi`;
    - bottoni finali sezione servizi/ritiro allineati alla grammatica del riepilogo (`min-h 48/44`, `font-semibold`, spacing coerente);
  - `pages/carrello.vue`
    - popup `Svuota carrello`/`Elimina` rifatto con bottoni leggibili, arrotondati, distanziati e coerenti;
  - `pages/contatti.vue`
    - bottone `Invia il messaggio` allineato a dimensioni/weight dei CTA del riepilogo (pill coerente, no resa quadrata);
  - `assets/css/main.css`
    - aggiunto hover base globale per bottoni/CTA (`button` e `a.inline-flex`) con lift leggero al passaggio mouse.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `nuxt-spedizionefacile-master/pages/carrello.vue`
- `nuxt-spedizionefacile-master/pages/contatti.vue`
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/riepilogo` e cliccare step `Ritiro` nella barra:
   - non deve piu' lampeggiare `Servizi` prima di `Ritiro`.
2. Aprire `/la-tua-spedizione/2`:
   - bottoni in fondo (indietro/continua) coerenti con i CTA del riepilogo;
   - bottoni `Consegna a domicilio` e `Ritira in un Punto BRT` coerenti e con hover.
3. Aprire `/carrello` e popup `Svuota carrello`:
   - bottoni del popup leggibili, non compressi, con hover.
4. Aprire `/contatti`:
   - `Invia il messaggio` non quadrato, con stesse proporzioni dei CTA del riepilogo.

## TURNO: INTERFACCIA
DATA: 2026-02-24

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: usare come riferimento assoluto i bottoni della pagina `/riepilogo` (`Indietro` e `Procedi al pagamento`) e replicarne le dimensioni su:
  - bottone `Invia il messaggio` in `/contatti`;
  - bottoni della sezione form preventivo in `/la-tua-spedizione/2` (servizi/ritiro).
- Interventi:
  - `pages/contatti.vue`: submit convertito a classi 1:1 del bottone arancione del riepilogo (gap/padding/font/min-height/radius/hover).
  - `pages/la-tua-spedizione/[step].vue`:
    - bottoni finali `Indietro`/`Continua...` allineati 1:1 alle classi del riepilogo;
    - bottoni `Consegna a domicilio` e `Ritira in un Punto BRT` portati alla stessa griglia dimensionale (`min-h 48`, `text 1rem`, `font-semibold`, `rounded 30`).
  - rimosse differenze residue `tablet:min-h-[44px]` in queste aree per mantenere match diretto col riepilogo.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/contatti.vue`
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/riepilogo` e annotare visivamente bottoni `Indietro` e `Procedi al pagamento`.
2. Aprire `/contatti`:
   - verificare che `Invia il messaggio` abbia stessa altezza/font/padding/raggio del `Procedi al pagamento` di riepilogo.
3. Aprire `/la-tua-spedizione/2`:
   - verificare che i bottoni finali (`Indietro`, `Continua...`) abbiano stessa dimensione dei bottoni del riepilogo;
   - verificare che `Consegna a domicilio` e `Ritira in un Punto BRT` rispettino la stessa griglia dimensionale.

## TURNO: LOGICA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Risolto bug navigazione step segnalato (`Servizi`/`Ritiro`) nella pagina `la-tua-spedizione`:
  - rimosso il forcing a `Ritiro` basato su dati salvati (`storedOrigin`) che causava apertura errata dello step indirizzi anche quando la route era `/la-tua-spedizione/2` (Servizi);
  - mantenuto `Ritiro` solo quando la query URL e' esplicita (`?step=ritiro`).
- Eliminato conflitto di navigazione doppia:
  - `onStepNavigate` non modifica piu' la query via `router.replace` durante il click sugli step;
  - la route target resta gestita da `Steps.vue` con `navigateTo`, evitando rimbalzi visuali.
- Corretto il flash "quadrato" nella barra step:
  - in `Steps.vue` il `rounded-[38px]` e' ora nel base class dell'item, cosi' durante la transizione colore non compare il bordo squadrato temporaneo.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `nuxt-spedizionefacile-master/components/Steps.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/la-tua-spedizione/2?step=ritiro` e cliccare `2. Servizi`:
   - non deve comparire piu' il riquadro quadrato temporaneo su `3. Ritiro`;
   - deve passare pulito a `Servizi`.
2. Aprire `/riepilogo` e cliccare `2. Servizi` nella barra step:
   - deve aprire direttamente `Servizi` (non `Ritiro`).
3. Aprire `/riepilogo` e cliccare `3. Ritiro`:
   - deve aprire `Ritiro` con query `?step=ritiro` coerente.

## TURNO: REVISIONE
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Correzione UX sulla barra sticky di riepilogo in `/la-tua-spedizione/2` quando i campi non sono ancora compilati:
  - aggiunto titolo fisso `Riepilogo spedizione`;
  - rimossi i `v-if` che nascondevano i blocchi compatti a dati vuoti;
  - introdotti placeholder testuali persistenti per i campi principali, poi sostituiti automaticamente dai valori reali.
- Placeholder introdotti:
  - `Partenza`: `Da compilare`
  - `Destinazione`: `Da compilare`
  - `Colli`: `Da definire`
  - `Servizi`: `Da selezionare`
  - `Totale IVA incl.`: `—`

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/la-tua-spedizione/2` con form ancora vuoto:
   - la barra sticky non deve risultare vuota;
   - deve mostrare titolo `Riepilogo spedizione` e i campi placeholder.
2. Compilare progressivamente i dati (partenza, destinazione, colli, servizi):
   - i placeholder devono essere sostituiti dai dati effettivi senza refresh.
3. Verificare che il dettaglio espanso della barra continui a funzionare con click sul chevron.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: rendere i bottoni di `/la-tua-spedizione/2?step=ritiro` identici al riferimento corretto di `/riepilogo`.
- Allineati i CTA principali (`Indietro`, `Continua al riepilogo`, `Compila dati ritiro e destinazione`) alle stesse classi di `/riepilogo`:
  - stessa altezza (`min-h-[48px]`), stesso `font-semibold`, stesso padding (`px-[24]/px-[28]`), stesso radius (`rounded-[30px]`), stessa interazione hover/active.
- Rimosse differenze residue che rompevano la coerenza:
  - tolto `text-[1rem]` forzato;
  - tolti `style` inline su bottoni arancioni;
  - tolto `w-full tablet:w-auto` dai CTA di fondo per avere geometria coerente al riferimento.
- Uniformata anche la coppia `Consegna a domicilio` / `Ritira in un Punto BRT` alla stessa base dimensionale/typography dei CTA di riferimento (manteniendo solo la differenza cromatica di stato selected/unselected).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/riepilogo` e usare i bottoni `Indietro` e `Procedi al pagamento` come baseline.
2. Aprire `/la-tua-spedizione/2?step=ritiro`:
   - verificare che `Indietro` e `Continua al riepilogo` abbiano la stessa altezza/font/padding/radius del baseline.
3. Nella stessa pagina verificare `Compila dati ritiro e destinazione` con stessa metrica del bottone arancione di baseline.
4. Verificare che `Consegna a domicilio` / `Ritira in un Punto BRT` risultino coerenti per altezza/font/radius con la stessa grammatica del baseline.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: rendere `Invia il messaggio` in `/contatti` identico ai bottoni corretti di `/riepilogo`.
- Allineato il bottone submit di `contatti` alla classe CTA arancione di `/riepilogo` in modo 1:1:
  - stessa altezza (`min-h-[48px]`), stesso radius (`rounded-[30px]`), stesso peso font (`font-semibold`), stesso padding (`px-[28px]`), stessa animazione hover/active/disabled.
- Rimossi elementi che introducevano differenze:
  - rimosso `text-[1rem]` forzato;
  - rimosso `style` inline su background/border;
  - rimossa `:class` condizionale separata per cursor/opacita' (gestita ora da utility `disabled:*` come in riepilogo).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/contatti.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/riepilogo` e usare `Procedi al pagamento` come baseline.
2. Aprire `/contatti`:
   - verificare che `Invia il messaggio` abbia la stessa metrica visiva (altezza, peso font, padding, radius, hover).
3. Verificare stato disabilitato durante invio:
   - opacita' ridotta e `cursor-not-allowed` coerenti.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: coerenza completa bottoni nel carrello, mantenendo il colore in base al significato del bottone.
- Aggiornati i CTA principali in `pages/carrello.vue` al pattern metrico di `/riepilogo` (stessa grammatica: `min-h-[48px]`, `rounded-[30px]`, `font-semibold`, `gap/padding` coerenti, hover/active coerenti).
- Rimossi stili inline e mismatch visivi su:
  - `Applica Coupon`
  - `Svuota carrello`
  - `Procedi con l'ordine`
  - `Crea nuova spedizione` (empty cart)
  - bottoni popup (`Annulla`, `Elimina`, `Svuota tutto`)
- Coerenza semantica colori mantenuta:
  - azioni primarie positive: blu/teal (`#095866`);
  - azione principale checkout: arancione brand (`#E44203`);
  - azioni distruttive confermate: rosso (`#ef4444`/`#dc2626`);
  - annulla/neutral: grigio.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/carrello.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/carrello`:
   - `Applica Coupon`, `Svuota carrello`, `Procedi con l'ordine` con metrica coerente al baseline `/riepilogo`.
2. Verificare semantica colore:
   - coupon (teal), checkout (arancione), svuota/azioni distruttive (rosso nei popup), annulla (grigio).
3. Aprire popup `Elimina` e `Svuota carrello`:
   - bottoni leggibili, allineati, con hover coerente e stato disabled corretto.

## TURNO: LOGICA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Identificato che `nuxt-auth-sanctum` popolava `useSanctumAuth().user` solamente quando scattava l'hook `page:loading:start`, evento assente nelle nuove schede/aperture middle-click: la navbar quindi ricadeva in stato guest pur con cookie validi.
- Aggiunto `plugins/01.sanctum-bootstrap.ts` per chiamare `useSanctumAuth().init()` immediatamente all'avvio client/SSR, ignorando silenziosamente 401/419 e lasciando emergere solo errori inattesi.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/plugins/01.sanctum-bootstrap.ts`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Autenticarsi, poi middle-clickare un link di navigazione (es. `Servizi`) in modo da aprire una nuova scheda; verificare che il nome utente compare subito nella navbar del nuovo tab e che `GET /api/user` venga eseguita prima di qualsiasi click.
2. Confermare che il nuovo tab non mostra più \"Accedi!\" e che il log di rete non riporta `Unauthenticated` in risposta a `/api/user` quando la tab viene caricata da zero.

## TURNO: LOGICA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Risolto bug sessione in nuova scheda (middle-click): tab aperta come guest anche con sessione valida.
- Aggiunto bootstrap auth client-side immediato per Sanctum, senza attendere hook di navigazione pagina.

### Root cause
- Il plugin `nuxt-auth-sanctum` carica l'identita' iniziale agganciandosi a `page:loading:start`.
- In apertura nuova scheda (hard load da middle-click) questo hook non e' affidabile per il bootstrap iniziale, quindi `user` resta `null` e UI mostra stato non autenticato.

### Fix applicato
- Nuovo plugin client `plugins/01.sanctum-bootstrap.client.ts`:
  - chiama `useSanctumAuth().init()` subito all'avvio client;
  - ignora in modo silenzioso solo `401/419` (utente realmente guest/sessione scaduta);
  - logga errori inattesi.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/plugins/01.sanctum-bootstrap.client.ts`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Eseguire login su una tab principale.
2. Aprire una pagina interna con click rotellina (nuova scheda).
3. Atteso: la nuova scheda mantiene utente autenticato (nome/account visibile, non `Accedi`).
4. DevTools Network: in avvio nuova scheda compare richiesta `GET /api/user` con esito coerente con sessione.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: rendere i riquadri input (sezione Citta'/CAP del preventivo) coerenti con gli arrotondamenti del box contenitore.
- Aggiornata la classe globale `input-preventivo-rapido` per allineare il raggio ai container (`rounded-[20px]` mobile, `tablet:rounded-[30px]`).
- Corretto l'effetto selezione/focus che risultava visivamente squadrato: aggiunto `outline: none` su `:focus-visible` per questi input, mantenendo il focus ring tramite border+shadow gia' presenti.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage e andare al box `Preventivo Rapido`.
2. Cliccare su `Citta' di Ritiro`, `CAP di Ritiro`, `Citta' Consegna`, `CAP Consegna`.
3. Atteso: i campi hanno arrotondamento coerente col box ospitante e il focus non mostra piu' riquadro squadrato.
4. Verificare sia su desktop che mobile/tablet (raggio 20 su mobile, 30 da tablet in su).

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Feedback utente: il focus dei campi Citta'/CAP mostrava ancora un rettangolo netto durante la digitazione.
- Applicata patch mirata solo ai 4 campi localita' del `Preventivo`:
  - aggiunta classe dedicata `location-input-preventivo` agli input di Citta' e CAP (origine + destinazione);
  - per questa classe, focus senza bordo/outline/shadow (`border-color: transparent`, `box-shadow: none`, `outline: none`) e radius forzato pill (`9999px`) per evitare qualsiasi effetto squadrato.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage, sezione `Preventivo Rapido`.
2. Cliccare nei 4 campi: `Citta' di Ritiro`, `CAP di Ritiro`, `Citta' Consegna`, `CAP Consegna`.
3. Atteso: non compare piu' il rettangolo di focus con bordi netti; i campi restano arrotondati in modo uniforme durante selezione/digitazione.

## TURNO: LOGICA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: in step `Ritiro` bloccare i dati incoerenti tra `Citta' / Provincia / CAP` (partenza e destinazione), e rimuovere il "bollino" arancione sbiadito nel passaggio da `Ritiro` a `Servizi`.

### Fix 1 — Coerenza geografica obbligatoria su Ritiro
- In `pages/la-tua-spedizione/[step].vue` aggiunta validazione incrociata reale (`validateAddressLocationConsistency`) basata su lookup backend `GET /api/locations/by-cap?cap=...`.
- La verifica ora controlla che per lo stesso CAP esista una combinazione coerente di citta' e provincia (match tollerante per citta', per gestire varianti tipo "Cervia Milano Marittima").
- Se incoerente:
  - errore su citta' (`...non coerente con CAP...`),
  - errore su provincia (`...non coerente con CAP...`),
  - blocco del bottone `Continua al riepilogo`.
- Integrata in `continueToCart` con blocco hard prima della navigazione.
- Aggiunto trigger anche su blur di `city/province/postal_code` per feedback immediato durante compilazione.

### Fix 2 — Cerchio arancione sbiadito negli step
- In `components/Steps.vue` rimossa la classe animata `step-active-pulse` dallo step attivo e tolta transizione `background-color` dal `li`.
- Risultato: cliccando `Servizi` da `Ritiro` non compare piu' il cerchio arancione intermedio prima del cambio step.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `nuxt-spedizionefacile-master/components/Steps.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/la-tua-spedizione/2?step=ritiro`.
2. Inserire una destinazione incoerente (es. citta' non compatibile con CAP o provincia non compatibile con CAP).
3. Premere `Continua al riepilogo`.
   - Atteso: blocco navigazione + errori sotto i campi incoerenti.
4. Correggere i dati con una combinazione coerente e ripremere `Continua al riepilogo`.
   - Atteso: avanzamento consentito.
5. Restando su `Ritiro`, cliccare step `2. Servizi` nella barra.
   - Atteso: nessun bollino arancione sbiadito sullo step `3. Ritiro` durante il passaggio.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente:
  1) in `Ritiro` mostrare suggerimenti provincia corretti/possibili in entrambi i blocchi (partenza/destinazione);
  2) eliminare lo spostamento orizzontale della label step quando passa da selezionato a non selezionato.

### Fix 1 — Provincia con tendina contestuale (partenza + destinazione)
- In `pages/la-tua-spedizione/[step].vue` implementato calcolo suggerimenti provincia con priorita' dati reali:
  - se CAP completo (5 cifre) -> lookup `/api/locations/by-cap`;
  - altrimenti se citta' valorizzata -> lookup `/api/locations/by-city`;
  - fallback -> lista province italiana completa.
- Aggiunto comportamento su `focus` del campo provincia per aprire la tendina anche senza digitazione.
- Se l'utente digita una sigla non coerente (es. `MI`) ma il CAP impone altra provincia, la tendina mostra comunque la/le province contestuali corrette per guidare la correzione.
- Dropdown provincia reso scrollabile (`max-h` + `overflow-y-auto`) per evitare clipping.

### Fix 2 — Allineamento stabile label Steps
- In `components/Steps.vue` uniformato il padding orizzontale del `li` tra stato attivo e inattivo (`px` uguale su entrambi gli stati).
- Rimosso padding condizionale nello stato attivo che causava lo "scatto" della scritta (es. `3. Ritiro`) quando non selezionata.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `nuxt-spedizionefacile-master/components/Steps.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/la-tua-spedizione/2?step=ritiro`.
2. In `Partenza` e `Destinazione`, cliccare nel campo `Provincia`:
   - atteso: dropdown visibile con suggerimenti (contestuali a CAP/Citta' se disponibili).
3. Scenario incoerente (es. CAP 48015 + provincia `MI`):
   - atteso: errore coerenza e dropdown che propone la provincia corretta.
4. Cliccare step `2. Servizi` da `3. Ritiro`:
   - atteso: la label `3. Ritiro` non cambia posizione orizzontale tra stato attivo/non attivo.

## TURNO: LOGICA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente coperta su due punti:
  1) in checkout, se non esiste carta salvata, permettere aggiunta carta direttamente nel flusso;
  2) icona "occhio" in riepilogo che risultava non funzionante.
- In `pages/checkout.vue` aggiunta gestione esplicita "salva carta in account" durante pagamento con nuova carta:
  - checkbox UI nel blocco `Dati carta`;
  - salvataggio post-pagamento via endpoint esistente `POST /api/stripe/set-default-payment-method` usando `paymentIntent.payment_method`;
  - refresh della carta predefinita con `refreshDefaultPayment`.
- In `pages/riepilogo.vue` sostituita azione del bottone occhio:
  - prima eseguiva uno `scrollTo` poco percepibile;
  - ora apre in modo deterministico `/account/spedizioni-configurate`.

### Root cause
- Checkout: il flusso "nuova carta" consentiva il pagamento ma non offriva un passaggio esplicito per salvare la carta nel profilo utente.
- Riepilogo: il bottone occhio era collegato a un comportamento ambiguo (scroll pagina) che all'utente appariva come "nessuna azione".

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/checkout.vue`
- `nuxt-spedizionefacile-master/pages/riepilogo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/checkout` con utente senza carta salvata.
2. Selezionare `Carta di credito/debito`:
   - atteso: campo Stripe + checkbox "Salva questa carta nel tuo account...".
3. Completare pagamento carta con checkbox attiva:
   - atteso: pagamento riuscito;
   - atteso: alla prossima apertura checkout compare la carta salvata come predefinita.
4. Aprire `/riepilogo` e cliccare icona occhio accanto a "Salva nelle spedizioni configurate":
   - atteso: navigazione a `/account/spedizioni-configurate`.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: preview "Riproduzione homepage reale" troppo lenta e banda bianca laterale nel frame mobile.

### Fix 1 — Preview piu' veloce in admin
- In `pages/index.vue` aggiunta modalita' `home_preview=1`:
  - quando attiva, la homepage in iframe renderizza solo il blocco necessario alla composizione (`Preventivo`/hero) e non carica sezioni pesanti sotto (step, recensioni, servizi, CTA finale).
- In `layouts/default.vue` per `home_preview=1` disattivati elementi non utili alla preview:
  - `Footer`, pulsante "torna su", pulsante aiuto floating.
- In `pages/account/amministrazione/immagine-homepage.vue` aggiunto `loading="lazy"` agli iframe desktop/mobile della riproduzione.

### Fix 2 — Fill mobile senza barra bianca laterale
- In `pages/account/amministrazione/immagine-homepage.vue` aggiornato il calcolo scala frame mobile:
  - scala agganciata al fill orizzontale (`scaleX`) e `offset.x = 0`.
- Sempre nello stesso file, migliorata resa del frame:
  - `live-preview-iframe` impostato `display: block` e background neutro della preview (`#eef1f3`) per evitare artefatti bianchi durante il rendering.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/index.vue`
- `nuxt-spedizionefacile-master/layouts/default.vue`
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. In blocco `Riproduzione homepage reale`, verificare che desktop/mobile si popolino piu' rapidamente rispetto a prima.
3. Verificare nel frame mobile che non compaia piu' la banda bianca laterale sinistra.
4. Muovere zoom/X/Y nell'editor e verificare che la preview aggiorni correttamente sia desktop che mobile.

## TURNO: LOGICA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: in `Editor Desktop/Mobile (drag con manina)` la movimentazione doveva essere realmente libera su 2 assi nello stesso gesto (anche diagonale/circolare).
- In `pages/account/amministrazione/immagine-homepage.vue` aggiornata la logica `onDragMove`:
  - rimosso il calcolo con asse unico (`axisReference`);
  - introdotta mappatura 2D indipendente:
    - `X` in base a `dx / width`;
    - `Y` in base a `dy / height`.
- Aumentato il range massimo di traslazione da `MAX_SHIFT = 400` a `MAX_SHIFT = 800` per evitare stop prematuro durante il drag libero.

### Root cause
- La sensibilita' drag era normalizzata su un asse unico (min(width,height)); questo rendeva il movimento meno naturale quando si trascinava in traiettorie oblique/circolari.
- Il limite `MAX_SHIFT` troppo basso poteva far percepire un blocco anticipato.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Selezionare modalita' `Manuale` sia Desktop sia Mobile.
3. Trascinare con manina in diagonale e in movimenti circolari.
   - Atteso: aggiornamento simultaneo continuo di X e Y senza comportamento “a scatti” su un solo asse.
4. Trascinare verso estremi del frame.
   - Atteso: range piu' ampio prima del clamp rispetto alla versione precedente.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima di intervenire.
- Richiesta utente: "rimetti tutto come prima" dopo regressione percepita nella preview homepage (contenuti tolti).
- Eseguito rollback mirato delle ottimizzazioni che nascondevano parti della pagina in modalita' preview.

### Fix applicato (rollback)
- In `pages/index.vue` rimosso il gating `isHomePreviewMode`:
  - ripristinato render completo della homepage anche in preview iframe (step, recensioni, servizi, CTA finale).
- In `layouts/default.vue` rimosso gating `isHomePreviewMode`:
  - ripristinati sempre `Footer`, bottone `torna su` e bottone aiuto nella struttura standard.
- Non toccata la fix drag 2D della manina nell'editor immagine (resta attiva).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/index.vue`
- `nuxt-spedizionefacile-master/layouts/default.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Verificare che nella sezione `Riproduzione homepage reale` non risultino piu' sezioni "tolte" rispetto al comportamento precedente.
3. Aprire homepage `/` e verificare presenza completa delle sezioni (step, recensioni, servizi, CTA finale) e footer.
4. Verificare che il drag manina nell'editor resti fluido su diagonali/circolare.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Segnalazione utente: nella pagina admin immagine homepage era percepita come "tolta" la modifica/preview realtime.
- Fix mirato in `pages/account/amministrazione/immagine-homepage.vue`:
  - cambiato il caricamento degli iframe live da `loading="lazy"` a `loading="eager"` sia per desktop che per mobile.

### Root cause
- Con caricamento lazy delle anteprime live, la sezione poteva risultare vuota/non pronta in apertura pagina e dare l'impressione che editor/preview fossero spariti.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Verificare che in `Riproduzione homepage reale` compaiano subito entrambe le anteprime (desktop/mobile).
3. Muovere zoom/X/Y e drag con manina nell'editor:
   - atteso: aggiornamento realtime della preview live senza dover attendere o scrollare.

## TURNO: LOGICA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: drag con manina realmente libero su 2 assi contemporanei (anche diagonale/circolare), senza percezione di blocco X/Y tra editor e homepage reale.

### Fix 1 — Drag 2D incrementale reale nell'editor
- In `pages/account/amministrazione/immagine-homepage.vue` aggiornato il drag:
  - aggiunti `dragState.lastX/lastY`;
  - passaggio da delta "dall'inizio drag" a delta incrementale ad ogni evento;
  - aggiornamento simultaneo `X` e `Y` nello stesso gesto, mantenendo fluido il movimento in diagonale/circolare.

### Fix 2 — Coerenza editor <-> homepage reale
- In `components/ContenutoHeader.vue` allineato range crop alla stessa scala usata in editor:
  - clamp `crop_x/crop_y` portato a `±800` (prima `±220`).
- Applicato stesso boost base in modalita' manuale sia in editor che in rendering hero reale:
  - `MANUAL_CROP_BASE_BOOST / HERO_MANUAL_CROP_BASE_BOOST = 1.08`.
- Obiettivo: evitare asse percepito come "bloccato" quando un lato era esattamente a filo nel manuale base.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Impostare `Manuale` su Desktop e trascinare l'immagine con click premuto in traiettoria diagonale/circolare.
   - Atteso: X e Y cambiano insieme senza lock di asse.
3. Ripetere su Mobile.
4. Controllare `Riproduzione homepage reale`:
   - Atteso: comportamento coerente con l'editor (nessun blocco anticipato su un asse).

## TURNO: LOGICA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Nuova segnalazione utente: drag con manina ancora percepito come mono-asse; in desktop reale i numeri cambiano ma immagine non segue coerentemente.

### Fix aggiuntivo — anti-lock asse X/Y
- In `pages/account/amministrazione/immagine-homepage.vue` corretto accumulo del drag:
  - durante il throttle `requestAnimationFrame`, la base di calcolo ora usa `pendingX/pendingY` (non piu' sempre il valore gia' renderizzato), evitando perdita di delta su uno degli assi.
  - mantenuta mappatura 2D simultanea per diagonali/circolari.

### Fix aggiuntivo — coerenza visuale manuale editor/reale
- In `pages/account/amministrazione/immagine-homepage.vue` (editor) e `components/ContenutoHeader.vue` (hero reale):
  - modalita' `manual` resa `cover` (fit resta `contain`) per rendere visibile lo spostamento su entrambe le coordinate;
  - zoom manuale allineato tra editor e hero reale con stesso boost base.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage` e fare `Ctrl+F5`.
2. In `Manuale` trascinare in diagonale (es. alto-destra -> basso-sinistra) su editor Desktop.
   - Atteso: X e Y cambiano insieme, nessun blocco asse.
3. Ripetere su editor Mobile.
4. Controllare `Riproduzione homepage reale` Desktop:
   - Atteso: l'immagine si muove in coerenza con i valori, non solo i numeri.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Segnalazione utente: in `Riproduzione homepage reale` compariva per un attimo una immagine vecchia prima della corrente.

### Root cause
- Gli iframe preview desktop/mobile usavano un `src` fisso (`/?home_preview=1...`) e ricevevano l'immagine corretta solo dopo il `postMessage` asincrono.
- Nel primo paint poteva quindi apparire stato precedente/stale.

### Fix applicato
- In `pages/account/amministrazione/immagine-homepage.vue` resi `desktopPreviewSrc` e `mobilePreviewSrc` computati con `home_preview_img` valorizzato subito da `editorSourceUrl`.
- In `components/ContenutoHeader.vue` aggiunta lettura robusta query immagine (`decodeQueryValue`) per evitare mismatch di URL encodati.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage`.
2. Ricaricare la pagina (`Ctrl+F5`).
3. Osservare `Riproduzione homepage reale` desktop/mobile:
   - atteso: niente flash iniziale di immagine vecchia, rendering diretto dell'immagine corrente.
4. Selezionare una nuova immagine locale:
   - atteso: preview coerente senza passaggio visibile dalla vecchia alla nuova.

## TURNO: LOGICA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Segnalazione utente: trascinamento percepito ancora a un asse, con blocco alternato X/Y e assenza movimento reale in diagonale.

### Root cause
- Movimento immagine basato su `object-position` + `scale`: su certi rapporti frame/immagine e livelli di zoom puo' sembrare che un asse non reagisca visivamente anche se i valori numerici cambiano.

### Fix applicato
- Passaggio a trasformazione esplicita 2D per il crop manuale:
  - editor admin: `translate(X,Y) + scale` in `getImageStyle`;
  - homepage reale/preview iframe: stesso modello `translate(X,Y) + scale` su `.hero__image-photo`.
- `object-position` fissato a centro in questa logica, per evitare lock percettivo dell'asse dovuto a cover/contain positioning.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/immagine-homepage` e fare `Ctrl+F5`.
2. In `Manuale` trascinare su Desktop in diagonale e traiettorie curve:
   - atteso: movimento continuo su X e Y contemporaneamente.
3. Ripetere su Mobile.
4. Osservare `Riproduzione homepage reale`:
   - atteso: l'immagine segue il drag in diagonale in modo coerente con l'editor.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: alzare il box `Preventivo` nella versione mobile reale homepage.
- In `components/Preventivo.vue` aumentato l'offset solo mobile su homepage:
  - da `mt-[-118px]` a `mt-[-134px]`;
  - lasciati invariati `tablet` e `desktop`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage `/` su viewport mobile.
2. Verificare che il box `Preventivo Rapido` sia piu' alto rispetto a prima.
3. Verificare che tablet/desktop non cambino (offset invariati).

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: alzare ancora il box `Preventivo` su homepage mobile.
- In `components/Preventivo.vue` aumentato ulteriormente offset mobile:
  - da `mt-[-134px]` a `mt-[-150px]`.
- Tablet/Desktop invariati.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su viewport mobile e fare `Ctrl+F5`.
2. Controllare che `Preventivo Rapido` sia ancora piu' in alto.
3. Verificare che tablet/desktop non siano cambiati.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: ridurre il rettangolo diagonale sotto/retro immagine nella homepage mobile.
- In `components/ContenutoHeader.vue` ridotta solo la geometria mobile di `.hero__teal-accent`:
  - `width`: 200px -> 164px
  - `height`: 220px -> 182px
  - lieve riallineamento: `right -20px -> -14px`, `top 35px -> 42px`
- Breakpoint tablet/desktop invariati.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage `/` su viewport mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale dietro l'immagine sia visibilmente piu' piccolo.
3. Verificare che su tablet/desktop non cambi (stili in media query invariati).

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: mostrare tutto il riquadro immagine in mobile, dentro la sezione visibile, senza alterare desktop/tablet.
- In `components/ContenutoHeader.vue` aggiornato solo stile base mobile di `.hero__image`:
  - `right: -58px` -> `right: 0`
  - `width: min(66vw, calc(100vw - 20px))` -> `min(58vw, calc(100vw - 16px))`
  - `height: clamp(170px, 46vw, 230px)` -> `clamp(154px, 42vw, 206px)`
  - `border-radius: 20px 0 0 0` -> `20px`

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su viewport mobile e fare `Ctrl+F5`.
2. Verificare che il riquadro immagine sia interamente visibile (nessun taglio esterno a destra).
3. Verificare che tablet/desktop restino invariati (regole in media query non toccate).

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: rimpicciolire leggermente la card prezzo `a partire da 8,90€` nella homepage mobile per rendere piu' visibile l'immagine.
- In `components/ContenutoHeader.vue` ridotta solo la card mobile (`.hero__card`):
  - `max-width`: 200px -> 184px
  - padding interno ridotto (`.hero__card-body`)
  - testi prezzo/label/includes leggermente ridotti (`.hero__card-label`, `.hero__card-price`, `.hero__card-eur`, `.hero__card-includes`)
- Breakpoint tablet/desktop invariati (restano sovrascritti dalle media query esistenti).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage `/` su viewport mobile e fare `Ctrl+F5`.
2. Verificare che la card `a partire da 8,90€` sia leggermente piu' piccola.
3. Verificare maggiore visibilita' dell'immagine hero dietro/accanto.
4. Verificare che tablet/desktop non siano cambiati.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: ridurre ancora la card prezzo mobile e abbassarla leggermente.
- In `components/ContenutoHeader.vue` (solo stile base mobile):
  - `.hero__card` `max-width`: 184px -> 174px
  - `.hero__card` `margin-top`: 12px -> 18px (card piu' bassa)
  - `.hero__card-body` padding ridotto (12/15 -> 11/14)
  - `.hero__card-price` 2.7rem -> 2.55rem
  - `.hero__card-eur` 1.35rem -> 1.28rem
- Tablet/Desktop invariati.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su viewport mobile e fare `Ctrl+F5`.
2. Verificare card prezzo ancora piu' piccola.
3. Verificare card leggermente piu' in basso.
4. Verificare che tablet/desktop non cambino.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: ulteriore riduzione/abbassamento card prezzo mobile.
- In `components/ContenutoHeader.vue` (solo mobile):
  - `.hero__card` `max-width`: 174px -> 166px
  - `.hero__card` `margin-top`: 18px -> 22px
  - `.hero__card-body` padding: `11px 14px` -> `10px 13px`
  - `.hero__card-price`: `2.55rem` -> `2.4rem`
  - `.hero__card-eur`: `1.28rem` -> `1.2rem`
- Tablet/Desktop invariati.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare card prezzo ancora piu' piccola e leggermente piu' in basso.
3. Verificare che tablet/desktop non cambino.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: ridurre ancora la card `8,90€` e abbassare leggermente il box in mobile.
- In `components/ContenutoHeader.vue` (solo mobile):
  - `.hero__card` `max-width`: 166px -> 158px
  - `.hero__card` `margin-top`: 22px -> 26px
  - `.hero__card-body` padding: `10px 13px` -> `9px 12px`
  - `.hero__card-label`: `0.75rem` -> `0.6875rem`
  - `.hero__card-price`: `2.4rem` -> `2.25rem`
  - `.hero__card-eur`: `1.2rem` -> `1.12rem`
- Tablet/Desktop invariati.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare card ancora piu' piccola.
3. Verificare card leggermente piu' in basso.
4. Verificare che tablet/desktop non cambino.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: abbassare ancora il box prezzo mobile con uno step piu' evidente.
- In `components/ContenutoHeader.vue` (solo mobile) aumentato offset verticale card prezzo:
  - `.hero__card` `margin-top`: 26px -> 36px.
- Nessun'altra modifica (tablet/desktop invariati).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che la card `8,90€` sia visibilmente piu' in basso rispetto a prima.
3. Verificare che tablet/desktop non cambino.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: abbassare la scritta `Spedisci in Italia` su mobile e ridurre il font.
- In `components/ContenutoHeader.vue` (solo mobile):
  - `.hero__heading` `font-size`: 2.25rem -> 2rem
  - `.hero__heading` `margin`: 0 -> `10px 0 0` (piu' in basso)
- In media query tablet aggiunto reset `margin-top: 0` per non alterare layout desktop/tablet.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su viewport mobile e fare `Ctrl+F5`.
2. Verificare che `Spedisci in Italia` sia leggermente piu' in basso.
3. Verificare font heading mobile leggermente piu' piccolo.
4. Verificare che tablet/desktop restino invariati.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: non abbassare l'immagine; alzare il box immagine mobile e allineare la base con la base del box `8,90€`.
- In `components/ContenutoHeader.vue` aggiornato solo mobile:
  - `.hero__image` `top`: 56px -> 34px.
- Nessuna modifica a heading/card in questo turno.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage `/` in mobile e fare `Ctrl+F5`.
2. Verificare che il box immagine sia piu' alto rispetto a prima.
3. Verificare che la base immagine risulti in linea (o quasi in linea) con la base del box `8,90€`.
4. Verificare che tablet/desktop non cambino.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: abbassare solo il box immagine mobile.
- In `components/ContenutoHeader.vue` (solo mobile):
  - `.hero__image` `top`: 34px -> 40px.
- Nessun'altra modifica.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage `/` in mobile e fare `Ctrl+F5`.
2. Verificare che solo il box immagine sia leggermente piu' in basso.
3. Verificare che testo e card prezzo restino invariati.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: alzare pochissimo il solo box immagine mobile.
- In `components/ContenutoHeader.vue` (solo mobile):
  - `.hero__image` `top`: 40px -> 38px.
- Nessun'altra modifica.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il box immagine sia appena piu' alto (micro-step).
3. Verificare che testo/card prezzo restino invariati.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: rendere piu' piccolo il rettangolo diagonale mobile e spostarlo a sinistra, mantenendolo dentro l'inquadratura.
- In `components/ContenutoHeader.vue` (solo mobile) aggiornato `.hero__teal-accent`:
  - `right`: `-14px` -> `8px` (spostato verso sinistra/interno)
  - `width`: `164px` -> `146px`
  - `height`: `182px` -> `162px`
- Tablet/Desktop invariati.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale sia piu' piccolo.
3. Verificare che il rettangolo sia spostato piu' a sinistra e resti dentro il frame visibile.
4. Verificare che tablet/desktop non cambino.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: spostare molto piu' a sinistra il rettangolo diagonale mobile per evitare taglio.
- In `components/ContenutoHeader.vue` (solo mobile):
  - `.hero__teal-accent` `right`: `8px` -> `44px`.
- Nessun'altra modifica.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale sia molto piu' a sinistra.
3. Verificare che non sia tagliato dal bordo destro.
4. Verificare che tablet/desktop non cambino.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: rettangolo diagonale mobile non tagliato.
- In `components/ContenutoHeader.vue` (solo mobile) rafforzato containment di `.hero__teal-accent`:
  - `right`: `44px` -> `56px`
  - `width`: `146px` -> `138px`
  - `height`: `162px` -> `154px`
  - `transform`: `rotate(6deg)` -> `rotate(4deg)`
- Tablet/Desktop invariati.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale non sia tagliato a destra.
3. Verificare che resti dentro il frame anche su width stretti (es. 360px).
4. Verificare che tablet/desktop non cambino.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Segnalazione utente: rettangolo diagonale mobile ancora tagliato a destra.
- In `components/ContenutoHeader.vue` (solo mobile) ulteriore rientro verso sinistra + riduzione:
  - `right`: `56px` -> `92px`
  - `width`: `138px` -> `132px`
  - `height`: `154px` -> `148px`
- Nessun'altra modifica (tablet/desktop invariati).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale non tocchi il bordo destro.
3. Verificare che non sia tagliato a destra.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Segnalazione utente: rettangolo diagonale mobile ancora percepito come tagliato.
- In `components/ContenutoHeader.vue` (solo mobile) applicata correzione piu' netta su `.hero__teal-accent`:
  - `right`: `92px` -> `132px` (molto piu' a sinistra/interno)
  - `width`: `132px` -> `124px`
  - `height`: `148px` -> `138px`
  - `border-radius`: `24px 0 0 24px` -> `22px` (angoli completi, meno effetto "tagliato")
  - `rotate(4deg)` -> `rotate(3deg)`
- Tablet/Desktop invariati.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale non risulti tagliato a destra.
3. Verificare che resti completamente dentro l'inquadratura visibile.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: spostare a destra il rettangolo diagonale mobile dopo il rientro eccessivo.
- In `components/ContenutoHeader.vue` (solo mobile):
  - `.hero__teal-accent` `right`: `132px` -> `112px`.
- Dimensioni/rotazione del rettangolo mantenute invariate.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale sia piu' a destra rispetto a prima.
3. Verificare che non torni tagliato dal bordo destro.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: spostare molto a destra il rettangolo diagonale mobile.
- In `components/ContenutoHeader.vue` (solo mobile):
  - `.hero__teal-accent` `right`: `112px` -> `72px` (spostamento deciso verso destra).
- Dimensioni/rotazione mantenute invariate.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale sia molto piu' a destra.
3. Verificare che non sia tagliato dal bordo destro; se lo e', micro-step successivo (es. `76px`/`80px`).

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: allungare il rettangolo diagonale mobile.
- In `components/ContenutoHeader.vue` (solo mobile) allungato orizzontalmente `.hero__teal-accent`:
  - `width`: `124px` -> `152px`
- Posizione (`right: 72px`), altezza, rotazione e resto invariati.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale sia piu' lungo/orizzontale.
3. Verificare che non risulti tagliato a destra.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: allungare ancora il rettangolo diagonale mobile.
- In `components/ContenutoHeader.vue` (solo mobile) allungato ancora `.hero__teal-accent`:
  - `width`: `152px` -> `172px`
- Posizione (`right: 72px`), altezza, rotazione e resto invariati.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale sia ancora piu' lungo rispetto allo step precedente.
3. Verificare che resti dentro l'inquadratura e non torni tagliato a destra.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: spostare a destra il rettangolo diagonale mobile.
- In `components/ContenutoHeader.vue` (solo mobile) spostato `.hero__teal-accent` verso destra:
  - `right`: `72px` -> `56px`
- Larghezza (`172px`), altezza e rotazione lasciate invariate.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale sia piu' a destra rispetto allo step precedente.
3. Verificare che non torni tagliato sul bordo destro.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: aumentare ulteriormente l'inclinazione del rettangolo diagonale mobile.
- In `components/ContenutoHeader.vue` (solo mobile) aumentata la rotazione di `.hero__teal-accent`:
  - `transform`: `rotate(4deg)` -> `rotate(6deg)`
- Posizione (`right: 20px`) e dimensioni (`192x138`) lasciate invariate.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale sia visibilmente piu' inclinato.
3. Verificare che non torni tagliato sul bordo destro.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: aumentare ancora l'inclinazione del rettangolo diagonale mobile.
- In `components/ContenutoHeader.vue` (solo mobile) aumentata ancora la rotazione di `.hero__teal-accent`:
  - `transform`: `rotate(6deg)` -> `rotate(7deg)`
- Posizione (`right: 20px`) e dimensioni (`192x138`) lasciate invariate.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale sia ancora piu' inclinato rispetto allo step precedente.
3. Verificare che non torni tagliato sul bordo destro.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: correggere il verso dell'inclinazione del rettangolo diagonale mobile (alto-sinistra piu' su, alto-destra piu' giu').
- In `components/ContenutoHeader.vue` (solo mobile) invertita la rotazione di `.hero__teal-accent`:
  - `transform`: `rotate(7deg)` -> `rotate(-6deg)`
- Posizione (`right: 20px`) e dimensioni (`192x138`) lasciate invariate.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il bordo alto del rettangolo salga verso sinistra e scenda verso destra.
3. Verificare che non risulti tagliato sul bordo destro dopo l'inversione.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: aumentare molto di piu' l'inclinazione del rettangolo diagonale mobile, mantenendo il verso corretto.
- In `components/ContenutoHeader.vue` (solo mobile) aumentata nettamente la rotazione di `.hero__teal-accent`:
  - `transform`: `rotate(-6deg)` -> `rotate(-12deg)`
- Posizione (`right: 20px`) e dimensioni (`192x138`) lasciate invariate.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che l'angolo alto sinistro salga chiaramente e l'angolo alto destro scenda di piu'.
3. Verificare che non torni tagliato sul bordo destro (in caso, micro-rientro del `right`).

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Trovata causa del "non cambia nulla": l'animazione `.anim-accent` usava `@keyframes accentIn` con `rotate(6deg)` hardcoded e sovrascriveva `transform` del rettangolo mobile.
- In `components/ContenutoHeader.vue` resa la rotazione del rettangolo diagonale parametrica con variabile CSS `--hero-accent-rotate`.
- Mobile:
  - `.hero__teal-accent` ora usa `--hero-accent-rotate: 12deg` e `transform: rotate(var(--hero-accent-rotate))`
  - questo inclina il rettangolo nel verso richiesto (alto-sinistra piu' su, alto-destra piu' giu').
- Aggiornati anche i `@keyframes accentIn` (mobile e desktop) per usare la stessa variabile, evitando future discrepanze tra valore CSS e animazione.
- Aggiunti valori espliciti per tablet (`6deg`) e desktop (`8deg`) per mantenere la resa precedente fuori dal mobile.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale dietro l'immagine sia davvero piu' inclinato e nel verso corretto.
3. Verificare che tablet/desktop non cambino impostazione estetica rispetto a prima.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: avvicinare `Spedisci in Italia` al box `8,90€` su mobile senza sovrapporsi all'immagine.
- In `components/ContenutoHeader.vue` (solo mobile) ridotto il gap titolo/card:
  - `.hero__card` `margin-top`: `36px` -> `20px`
- In `components/ContenutoHeader.vue` (solo mobile) limitata l'estensione del titolo per evitare ingresso nella zona immagine:
  - `.hero__heading` `max-width: 150px`
- Aggiunto reset da tablet in su per evitare regressioni:
  - nel breakpoint tablet `.hero__heading { max-width: none; }`
- Nessuna modifica a immagine hero o rettangolo diagonale (geometria/posizione invariate).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare a `360px`, `375px`, `390px`, `430px` che `Spedisci in Italia` sia piu' vicino al box `8,90€`.
3. Verificare che il titolo non entri sopra l'immagine in modo invasivo.
4. Verificare che immagine hero e rettangolo diagonale mantengano l'assetto approvato.
5. Verificare tablet/desktop: nessuna variazione visiva non richiesta.

## TURNO: LOGICA
DATA: 2026-02-26

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Obiettivo: stabilizzare auth (registrazione, recupero password, Google OAuth) in presenza di errori SMTP e mismatch callback/error-code.
- `PasswordResetRequestController.php`:
  - aggiunto `try/catch` sull'invio mail di recupero password;
  - log errore SMTP e risposta JSON controllata `503` (no 500 raw).
- `CustomRegisterController.php`:
  - registrazione resa fail-closed se invio email verifica fallisce;
  - rollback transazione DB e risposta `503` con messaggio esplicito;
  - eliminato comportamento che creava utente senza email di verifica consegnata.
- `CustomLoginController.php`:
  - corretti 3 flussi di invio codice (login utente non verificato, codice scaduto in verify, resend codice):
    - se invio mail fallisce -> risposta `503`;
    - non viene piu' restituito un messaggio "email/codice inviato" falso.
- `GoogleController.php`:
  - callback OAuth Google resa dinamica sul dominio corrente (locale o tunnel) con fallback alla config;
  - whitelist host callback: `127.0.0.1`, `localhost`, `*.trycloudflare.com`;
  - redirect errore allineato a `?error=google_auth_failed`.
- `pages/autenticazione.vue`:
  - errore Google compatibile sia con `google_auth_failed` sia con `google_failed` (retrocompatibilita');
  - login/registrazione mostrano il `message` backend anche per errori `5xx` (utile per SMTP/verification mail).
- Nota operativa: **non** modificato `laravel-spedizionefacile-main/.env` con credenziali Resend reali perche' il secret/API key e dominio verificato non sono disponibili nel repo.

### File toccati in questo turno
- `laravel-spedizionefacile-main/app/Http/Controllers/PasswordResetRequestController.php`
- `laravel-spedizionefacile-main/app/Http/Controllers/CustomRegisterController.php`
- `laravel-spedizionefacile-main/app/Http/Controllers/CustomLoginController.php`
- `laravel-spedizionefacile-main/app/Http/Controllers/GoogleController.php`
- `nuxt-spedizionefacile-master/pages/autenticazione.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Revisione diff mirata dei file modificati (backend auth + frontend auth) per coerenza logica e sintassi strutturale.
2. Verifica statica dei punti corretti:
   - `google_auth_failed` allineato backend/frontend
   - callback Google dinamica con fallback
   - ritorni `503` presenti nei flussi mail critici.
3. Limite ambiente:
   - impossibile eseguire `php -l` / `artisan` in questa sessione (`php` non installato nel PATH del sandbox/host disponibile a Codex).
4. Passi manuali obbligatori per chiudere il fix end-to-end:
   - configurare Resend SMTP reale in `.env`;
   - `php artisan config:clear && php artisan cache:clear`;
   - autorizzare in Google Console anche la callback del tunnel corrente.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: mantenere il verso corretto ma ridurre l'inclinazione del rettangolo diagonale mobile.
- In `components/ContenutoHeader.vue` (solo mobile) ridotta la rotazione:
  - `--hero-accent-rotate`: `12deg` -> `9deg`
- Posizione e dimensioni invariati (`right: 20px`, `192x138`).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo resti inclinato nel verso corretto ma meno aggressivo.
3. Verificare che non cambi nulla su tablet/desktop.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: inclinare leggermente ancora il rettangolo diagonale mobile.
- In `components/ContenutoHeader.vue` (solo mobile) aumentata leggermente la rotazione di `.hero__teal-accent`:
  - `transform`: `rotate(3deg)` -> `rotate(4deg)`
- Posizione (`right: 20px`) e dimensioni (`192x138`) lasciate invariate.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale sia leggermente piu' inclinato.
3. Verificare che non torni tagliato sul bordo destro.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: spostare ancora a destra il rettangolo diagonale mobile.
- In `components/ContenutoHeader.vue` (solo mobile) spostato ancora `.hero__teal-accent` verso destra:
  - `right`: `28px` -> `20px`
- Larghezza (`192px`), altezza e rotazione lasciate invariate.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale sia ancora piu' a destra.
3. Verificare che non risulti tagliato sul bordo destro.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: spostare ancora a destra il rettangolo diagonale mobile.
- In `components/ContenutoHeader.vue` (solo mobile) spostato ancora `.hero__teal-accent` verso destra:
  - `right`: `56px` -> `44px`
- Larghezza (`172px`), altezza e rotazione lasciate invariate.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale sia ancora piu' a destra.
3. Verificare che non risulti tagliato sul bordo destro.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: spostare ancora a destra il rettangolo diagonale mobile.
- In `components/ContenutoHeader.vue` (solo mobile) spostato ancora `.hero__teal-accent` verso destra:
  - `right`: `44px` -> `36px`
- Larghezza (`172px`), altezza e rotazione lasciate invariate.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale sia ancora piu' a destra rispetto allo step precedente.
3. Verificare che non risulti tagliato sul bordo destro.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: allungare il rettangolo diagonale mobile dopo lo spostamento a destra.
- In `components/ContenutoHeader.vue` (solo mobile) allungato ancora `.hero__teal-accent`:
  - `width`: `172px` -> `192px`
- Posizione (`right: 36px`), altezza e rotazione lasciate invariate.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale sia piu' lungo mantenendo la posizione a destra.
3. Verificare che non torni tagliato sul bordo destro.

## TURNO: INTERFACCIA
DATA: 2026-02-25

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Richiesta utente: spostare a destra il rettangolo diagonale mobile dopo l'allungamento.
- In `components/ContenutoHeader.vue` (solo mobile) spostato `.hero__teal-accent` verso destra:
  - `right`: `36px` -> `28px`
- Larghezza (`192px`), altezza e rotazione lasciate invariate.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` su mobile e fare `Ctrl+F5`.
2. Verificare che il rettangolo diagonale sia piu' a destra rispetto allo step precedente.
3. Verificare che non torni tagliato sul bordo destro.

## TURNO: LOGICA
DATA: 2026-02-27

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Stabilizzato lo step `la-tua-spedizione/2` su quattro aree:
  1. **PUDO + campo nome**: rimossa la disabilitazione totale dei campi destinazione in modalita' PUDO.
     - In PUDO ora restano editabili solo `Nome e Cognome`, `Telefono`, `Email`.
     - I campi logistici (`indirizzo`, `civico`, `citta'`, `provincia`, `CAP`, `informazioni aggiuntive`, `citofono`) sono readonly con stile coerente.
     - In `onPudoSelected` non viene piu' sovrascritto il nome destinatario e non viene piu' impostato un telefono fittizio.
     - Il controllo `PUDO selezionato` e' stato spostato all'inizio di `continueToCart()` prima della validazione form, per evitare errori fuorvianti.
  2. **Cleanup ritiro duplicato**: rimossi dal box ritiro i blocchi duplicati:
     - `Filiale BRT competente`
     - `Giorno ritiro`
     e rimossa anche la logica JS correlata (`brtFiliale`, `loadingFiliale`, `capPartenza`, `fetchFilialeByCap`, watcher relativi).
  3. **Data ritiro unica**: aggiunta sincronizzazione `pickupRequest.pickup_date` <- `services.date` con watcher dedicato (single source of truth = data selezionata nel carosello superiore).
  4. **Evidenza continua "Senza etichetta"**:
     - sostituita la vecchia utility animation con classi CSS globali dedicate:
       - `.no-label-attention`
       - `.no-label-attention--selected`
     - aggiunta gestione accessibilita' `prefers-reduced-motion: reduce`.
- Unificata la sticky area in alto nello step:
  - ora `Steps` (modalita' compatta) + barra riepilogo stanno nello stesso blocco sticky.
  - rimossa la gestione locale `@navigate` che mutava stato prima della route.
- Aggiornato `Steps.vue`:
  - aggiunta prop `compact` (default `false`), applicata solo in `[step].vue`.
  - convertito ogni step in bottone con larghezza minima coerente e label sempre stabile (`N. NomeStep`) per ridurre salti visivi e glitch di selezione.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `nuxt-spedizionefacile-master/components/Steps.vue`
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/la-tua-spedizione/2?step=ritiro`.
2. Selezionare `Ritira in un Punto BRT`, scegliere un punto:
   - `Nome e Cognome` deve essere editabile;
   - `Telefono` e `Email` editabili;
   - `Citta'/CAP/Provincia/indirizzo` readonly.
3. In PUDO senza punto selezionato, premere continua:
   - deve comparire il messaggio "Seleziona un Punto BRT..." senza cascata di errori sui campi readonly.
4. Nel box ritiro verificare che non compaiano piu':
   - "Filiale BRT competente"
   - "Giorno ritiro"
5. Cambiare la data nel carosello superiore e verificare che il payload mantenga data coerente (pickup_request sincronizzato).
6. Verificare che la card `Spedizione Senza etichetta` abbia animazione continua sia selezionata che non selezionata (piu' lieve quando selezionata).
7. Verificare sticky unificata (Steps + riepilogo) su mobile/tablet/desktop.
8. Verificare navigazione step da `Ritiro` a `Servizi` e da `Conferma` a `Servizi` senza flash/arancione spurio.

### Note tecniche
- Verifica formattazione eseguita con:
  - `npx prettier --check components/Steps.vue pages/la-tua-spedizione/[step].vue assets/css/main.css` (OK).
- Lint ESLint non eseguibile in questo ambiente per dipendenza nativa opzionale non disponibile offline (`unrs-resolver` / `@unrs/resolver-binding-linux-x64-gnu`).

## TURNO: REVISIONE
DATA: 2026-02-27

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Corretto il flusso `Cerca Punto BRT` per usare anche la **via/civico** come riferimento distanza, non solo citta'/CAP.
- `PudoSelector.vue`:
  - aggiunto campo ricerca `Via / Piazza (opzionale)`;
  - supporto prop `initialAddress` per precompilare la via dalla destinazione corrente;
  - ricerca PUDO aggiornata con query `address + city + zip_code`;
  - aggiunta gestione `referencePoint` restituito API (riferimento reale per distanza);
  - geolocalizzazione: auto-compila via/citta'/CAP quando disponibili dalla risposta;
  - distanza nei risultati resa piu' visibile (`font` piu' grande e in grassetto).
- `MapPudo.client.vue`:
  - aggiunta prop `referencePoint`;
  - aggiunto marker dedicato e distinto per "punto di riferimento" (geolocalizzato o indirizzo inserito);
  - fit mappa aggiornato su `riferimento + punti PUDO` per mostrare chiaramente dove sei e dove sono i punti.
- `pages/la-tua-spedizione/[step].vue`:
  - collegato `PudoSelector` con `initial-address` derivato da `destinationAddress.address + address_number`.
- Backend BRT:
  - `BrtController.php`:
    - `pudoSearch`: validazione resa flessibile (`address/city/zip` opzionali ma almeno uno obbligatorio);
    - `pudoNearby`: aggiunto reverse geocoding del punto geolocalizzato e passaggio riferimento al service.
  - `BrtService.php`:
    - `getPudoByAddress`: ora prova geocoding preciso via/civico con Nominatim, fallback su dataset locations;
    - `getPudoByCoordinates`: ora restituisce anche `reference` normalizzato;
    - aggiunti metodi `reverseGeocodeCoordinates`, `geocodeAddressWithNominatim`, `nominatimHeaders`, `normalizeReferencePoint`, `buildReferenceLabel`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/PudoSelector.vue`
- `nuxt-spedizionefacile-master/components/MapPudo.client.vue`
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `laravel-spedizionefacile-main/app/Http/Controllers/BrtController.php`
- `laravel-spedizionefacile-main/app/Services/BrtService.php`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/la-tua-spedizione/2?step=ritiro`.
2. Selezionare `Ritira in un Punto BRT`.
3. In `Cerca un Punto BRT` verificare presenza campo `Via / Piazza`.
4. Inserire via + citta'/CAP e cercare:
   - in elenco la distanza deve essere piu' evidente (grassetto/grande);
   - deve comparire il box `Riferimento distanza`.
5. Verificare in mappa:
   - marker separato arancione per il punto di riferimento;
   - marker PUDO separati dal riferimento.
6. Cliccare `Usa posizione`:
   - quando disponibile, via/citta'/CAP devono popolarsi dal punto geolocalizzato;
   - la mappa deve mostrare il marker riferimento e i PUDO con distanze coerenti.
7. Verificare che la selezione punto PUDO continui a compilare i campi destinazione come prima.

### Note tecniche
- In questo ambiente non e' disponibile `php` (`php: command not found`), quindi non e' stato possibile eseguire `php -l`.
- `prettier --check` segnala stile non allineato su file Vue toccati; non applicato `--write` per evitare churn massivo fuori scope.

## TURNO: INTERFACCIA
DATA: 2026-02-27

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Ripristinati i controlli in alto a destra nei box `Partenza` e `Destinazione` dello step indirizzi:
  - `Spedizioni salvate`
  - `Indirizzi salvati`
- Ripristinata la visibilita' dell'icona salva indirizzo (nuovo indirizzo) in entrambi i box:
  - ora l'icona non sparisce; resta visibile e viene semplicemente disabilitata finché i campi minimi non sono compilati.
- Estesa anche al box `Destinazione` la tendina `Spedizioni salvate` (prima presente solo su `Partenza`).
- Separata la gestione dropdown configurazioni in due stati distinti per evitare aperture sovrapposte:
  - `showDefaultDropdownOrigin`
  - `showDefaultDropdownDest`
- Migliorata la coesistenza dropdown:
  - aprendo `Spedizioni salvate` si chiudono i dropdown `Indirizzi salvati`;
  - aprendo `Indirizzi salvati` si chiudono i dropdown `Spedizioni salvate`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/la-tua-spedizione/2?step=ritiro`.
2. Nel box `Partenza` verificare in alto a destra:
   - pulsante `Spedizioni salvate` visibile;
   - pulsante `Indirizzi salvati` visibile;
   - icona salva indirizzo visibile (si abilita quando compili nome+indirizzo+citta'+CAP).
3. Nel box `Destinazione` (modalita' domicilio) verificare in alto a destra:
   - pulsante `Spedizioni salvate` visibile;
   - pulsante `Indirizzi salvati` visibile;
   - icona salva indirizzo visibile (abilitazione come sopra).
4. Verificare che aprendo una tendina l'altra si chiuda (no sovrapposizioni).
5. Selezionare una spedizione salvata e confermare che popoli sia partenza che destinazione.

### Note tecniche
- `prettier --check` del file segnala stile non allineato preesistente; non eseguito `--write` per evitare churn fuori scope.

## TURNO: LOGICA
DATA: 2026-02-27

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Corretto il flusso carta in checkout quando non esiste una carta salvata:
  - mount/unmount Stripe Element reso robusto nel cambio stato/metodo (evita campo carta vuoto/non interattivo);
  - aggiunto fallback di errore chiaro se il modulo carta non si inizializza.
- Aggiunto supporto esplicito al salvataggio carta direttamente da checkout:
  - frontend invia `save_payment_method` a `create-payment-intent`;
  - backend `createPaymentIntent` gestisce il flag e imposta `setup_future_usage='off_session'`.
- Corretto salvataggio carta predefinita backend:
  - `setDefaultPaymentMethod` ora non forza sempre `attach`;
  - se la carta e' gia' associata allo stesso customer, aggiorna solo default;
  - se e' associata a customer diverso, blocca con errore `403` coerente;
  - aggiunto controllo `Stripe non configurato` (`503`) nel setter default.
- Migliorata UX in checkout:
  - warning non bloccante visibile se il pagamento riesce ma il salvataggio carta fallisce.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/checkout.vue`
- `laravel-spedizionefacile-main/app/Http/Controllers/StripeController.php`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/checkout` con utente senza carta predefinita.
2. Selezionare `Carta di credito/debito`:
   - il campo `Dati carta` deve essere interattivo (no box vuoto bloccato).
3. Inserire carta valida, lasciare attivo `Salva questa carta nel tuo account...`, accettare termini, pagare:
   - pagamento completato;
   - carta salvata come predefinita (`/api/stripe/default-payment-method` restituisce `card` non null).
4. Tornare su `/checkout`:
   - deve comparire la carta salvata (brand + ultime 4 cifre).
5. Ripetere pagamento con checkbox salvataggio disattivato:
   - pagamento ok;
   - nessuna modifica della carta predefinita.

### Note tecniche
- In questo ambiente `php` non e' disponibile (`php: command not found`), quindi non e' stato possibile eseguire `php -l`.
- Il comando lint frontend fallisce per dipendenza ESLint opzionale nativa mancante in ambiente locale (`Unexpected token 'with'` + resolver binding).

## TURNO: REVISIONE
DATA: 2026-02-27

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Analizzata anomalia checkout Stripe con errori:
  - `POST /api/stripe/existing-order-payment-intent` -> `503`
  - log browser Google Pay `merchant-ui-api...wallet-config 401`.
- Root cause principale individuata: mismatch naming chiavi Stripe in DB.
  - alcune schermate admin salvano `stripe_public_key` / `stripe_secret_key`;
  - `StripeController` leggeva solo `stripe_secret`.
- Correzioni applicate:
  1. `StripeController::getStripeSecret()` ora usa fallback compatibile:
     - `stripe_secret` -> `stripe_secret_key` -> `.env STRIPE_SECRET`.
  2. `SettingsController::getStripeConfig()` ora legge entrambe le varianti:
     - chiave pubblica: `stripe_key` o `stripe_public_key`;
     - segreta: `stripe_secret` o `stripe_secret_key`.
  3. `SettingsController::saveStripeConfig()` salva entrambe le coppie di chiavi per retrocompatibilita'.
  4. `checkout.vue` ora risolve la publishable key da API `/api/settings/stripe` (fallback a runtime config),
     cosi' Stripe si inizializza anche quando la key e' salvata solo nel DB.
  5. `checkout.vue`: su host `*.trycloudflare.com` disabilita inizializzazione Google Pay
     (evita spam 401 wallet-config su domini tunnel non registrati Google Pay).

### File toccati in questo turno
- `laravel-spedizionefacile-main/app/Http/Controllers/StripeController.php`
- `laravel-spedizionefacile-main/app/Http/Controllers/SettingsController.php`
- `nuxt-spedizionefacile-master/pages/checkout.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/checkout?order_id=...` su dominio corrente.
2. Selezionare `Carta di credito/debito`:
   - il modulo Stripe deve comparire normalmente;
   - `POST /api/stripe/existing-order-payment-intent` non deve piu' restituire 503 se le chiavi sono presenti in admin.
3. Verificare su admin che le chiavi salvate in impostazioni Stripe siano valorizzate.
4. Su dominio `trycloudflare`:
   - non deve comparire il bottone Google Pay;
   - spariscono gli errori ripetuti `wallet-config 401` dovuti al tunnel.

### Note tecniche
- In questo ambiente non e' stato possibile eseguire test PHP runtime (`php` non disponibile).

## TURNO: CAPO
DATA: 2026-02-27

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Eseguito hotfix richieste utente su step indirizzi/checkout:
  1. **Indirizzi preferiti piu' rapidi negli ordini** (`/la-tua-spedizione/2`):
     - caricamento automatico rubrica indirizzi all'apertura pagina (utente autenticato);
     - pulsante `Usa preferito` in `Partenza` e `Destinazione`;
     - voce rapida `Usa indirizzo preferito` in cima ai dropdown indirizzi;
     - badge `Preferito` sugli indirizzi `default`.
  2. **Sovrapprezzo SMS/chiamata +0,50€**:
     - mantenuta logica prezzo gia' introdotta;
     - resa esplicita in UI con badge `+0,50€` e stato `Sovrapprezzo attivo` quando toggle ON.
  3. **Note corriere piu' brevi**:
     - ridotto limite note da `200` a `80` caratteri con contatore aggiornato.
  4. **Stripe stabilizzazione UX/permessi**:
     - autorizzazione ruolo admin resa robusta (match case-insensitive e trim) in `User::isAdmin()`;
     - stesso allineamento su `User::isPro()`;
     - errore Stripe config migliorato: risposta backend 403 include `message` esplicito;
     - pannello `/account/carte` mostra errore chiaro se utente non admin.
  5. **Carte preferite in checkout**:
     - card `Preferita` evidenziata;
     - azione rapida `Usa preferita`;
     - azione `Imposta preferita` per ogni carta non default direttamente dal checkout.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `nuxt-spedizionefacile-master/pages/checkout.vue`
- `nuxt-spedizionefacile-master/pages/account/carte.vue`
- `laravel-spedizionefacile-main/app/Models/User.php`
- `laravel-spedizionefacile-main/app/Http/Controllers/SettingsController.php`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/la-tua-spedizione/2?step=ritiro` con utente loggato:
   - nei box `Partenza`/`Destinazione` verificare pulsante `Usa preferito`;
   - nel dropdown `Indirizzi salvati` verificare `Usa indirizzo preferito` e badge `Preferito`.
2. Nello stesso step, attivare `Avvisami tramite SMS/chiamata`:
   - verificare badge `+0,50€` e testo `Sovrapprezzo attivo`.
3. Nel box `Note per il corriere`:
   - verificare contatore `0/80` e blocco input oltre 80 caratteri.
4. Aprire `/checkout` -> `Carta di credito/debito` con carte salvate:
   - verificare sezione `Carta preferita`, bottone `Usa preferita`, azione `Imposta preferita`.
5. Aprire `/account/carte` e tentare salvataggio chiavi Stripe:
   - se non admin: errore esplicito `Solo un account Admin...`;
   - se admin: salvataggio consentito.

### Note tecniche
- `npx prettier --check` su file Vue toccati segnala stile non allineato preesistente; non applicato `--write` per evitare churn massivo fuori scope.
- In questo ambiente `php` non e' disponibile (`php: command not found`), quindi non e' stato possibile eseguire test runtime Laravel/Stripe da CLI.

## TURNO: INTERFACCIA
DATA: 2026-02-27

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Corretto overflow mobile della barra step (`Misure/Servizi/Indirizzi/Conferma/Pagamento`) nel `Preventivo Rapido`.
- Root cause: in `Steps.vue` le pill avevano `min-width` troppo ampia su mobile, causando uscita dal contenitore e scroll orizzontale.
- Fix applicato:
  - layout mobile con distribuzione fluida (`flex-1 min-w-0`) per ogni step;
  - riduzione dimensioni mobile (`font`, `padding`, `height`) senza toccare tablet/desktop;
  - testo step reso `truncate` per evitare fuoriuscite;
  - mantenuto comportamento desktop invariato con classi `tablet:*`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Steps.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage su mobile e scorrere al box `Preventivo Rapido`.
2. Verificare che la riga step (1..5) resti dentro il box, senza uscire a sinistra/destra.
3. Verificare che lo step attivo resti evidenziato arancione.
4. Verificare che su tablet/desktop la barra step mantenga il layout precedente.

### Note tecniche
- Intervento mirato solo su `Steps.vue` (nessun impatto su logica preventivo/calcolo).

## TURNO: LOGICA
DATA: 2026-02-27

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Corretto box `Avvisami tramite SMS/chiamata` nello step servizi/ritiro:
  - rimosso testo duplicato (`Sovrapprezzo attivo...`);
  - mantenuto un solo indicatore prezzo con formato richiesto `+0.50€`.
- Corretto flusso `Salva nelle spedizioni configurate` in `/riepilogo`:
  - dopo salvataggio riuscito ora pulisce `pendingShipment`, mostra toast successo,
    e naviga immediatamente a `/account/spedizioni-configurate`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `nuxt-spedizionefacile-master/pages/riepilogo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/la-tua-spedizione/2` e controllare il box `Avvisami tramite SMS/chiamata`:
   - deve comparire una sola volta `+0.50€`;
   - non deve comparire la riga `Sovrapprezzo attivo`.
2. Aprire `/riepilogo` e cliccare `Salva nelle spedizioni configurate`:
   - deve apparire toast verde;
   - deve reindirizzare subito a `/account/spedizioni-configurate`.

## TURNO: LOGICA
DATA: 2026-02-27

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Corretto il blocco infinito della pagina admin `Spedizioni BRT` (`/account/amministrazione/spedizioni`).
- Root cause: nel template tabella la riga dettagli usava `s.id` fuori scope `v-for`, causando errore runtime (`Cannot read properties of undefined (reading 'id')`) e render bloccato con spinner.
- Fix applicato:
  - introdotto `shipmentRows` computed sicuro;
  - sostituito controllo empty state con `!shipmentRows.length`;
  - racchiuse riga principale + riga espandibile dentro unico `<template v-for>` per mantenere `s` nello scope corretto.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/spedizioni.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/spedizioni`.
2. Verificare che la lista non resti piu' in caricamento infinito.
3. Aprire console browser: non deve piu' comparire `Cannot read properties of undefined (reading 'id')` da `spedizioni.vue`.
4. Cliccare `Dettagli` su una riga: la riga espansa deve aprirsi/chiudersi senza errori.
5. Da questa sezione navigare su `Guide` e `Servizi` e cliccare `Modifica` su un elemento: la route deve aprirsi regolarmente senza blocchi render residui.

## TURNO: LOGICA
DATA: 2026-02-27

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Corretto il flusso `Modifica` nelle pagine admin Guide/Servizi per evitare salvataggi che non andavano a buon fine con contenuti legacy.
- Root cause: payload inviava blocchi vuoti (`sections` / `faqs`) che potevano attivare validazione `required_with` lato backend e far fallire il `PUT`.
- Fix applicato:
  - aggiunte funzioni di normalizzazione in frontend (`normalizeSections`, `normalizeFaqs`);
  - in salvataggio vengono rimossi blocchi vuoti prima del `PUT`;
  - se non ci sono blocchi validi, vengono inviati `null` (non array con elementi vuoti);
  - inviato anche `featured_image` allineato al campo backend da `image_url` per coerenza update.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/amministrazione/guide/[id].vue`
- `nuxt-spedizionefacile-master/pages/account/amministrazione/servizi/[id].vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/amministrazione/guide`, cliccare `Modifica` su una guida e salvare anche senza compilare sezioni vuote aggiuntive.
2. Aprire `/account/amministrazione/servizi`, cliccare `Modifica` su un servizio e salvare anche con FAQ/sezioni vuote rimosse automaticamente.
3. Verificare che il messaggio finale sia di successo e che ricaricando la pagina i dati aggiornati restino persistenti.

## TURNO: INTERFACCIA
DATA: 2026-02-27

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Aggiunto simbolo visivo chiaro per il preferito in `Indirizzi salvati` (badge con icona stella + highlight card).
- Allineata la stessa evidenza preferito anche nelle varianti rubrica e carte/metodi:
  - badge `Preferito/Preferita` con icona stella nelle card.
  - simbolo stella anche nella sezione carte salvate in checkout.
- Resa molto piu' evidente l'animazione continua della card `Spedizione Senza etichetta`:
  - stato non selezionato: glow + micro-movimento piu' marcato e continuo.
  - stato selezionato: breathing piu' visibile ma piu' morbido.
  - mantenuto `prefers-reduced-motion` per accessibilita'.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/account/indirizzi.vue`
- `nuxt-spedizionefacile-master/pages/account/indirizzi/index.vue`
- `nuxt-spedizionefacile-master/pages/account/carte.vue`
- `nuxt-spedizionefacile-master/pages/checkout.vue`
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/account/indirizzi`:
   - la card preferita deve mostrare badge con icona stella e bordo evidenziato.
2. Aprire `/account/carte`:
   - la carta predefinita deve mostrare badge `Preferita` con icona stella.
3. Aprire `/checkout` (metodo carta, con carte salvate):
   - su `Carta preferita` deve comparire la stella;
   - nella lista carte la preferita deve mostrare badge con stella.
4. Aprire `/la-tua-spedizione/2`:
   - la card `Spedizione Senza etichetta` deve avere animazione piu' vistosa e continua.
5. Attivare `Riduci movimento` a livello OS/browser:
   - animazioni `no-label-attention*` devono disattivarsi.

### Note tecniche
- Tentato lint mirato con `eslint` sui file toccati: in questo ambiente fallisce bootstrap toolchain (`SyntaxError: Unexpected token 'with'`), quindi nessuna validazione ESLint automatica completata in CLI.

## TURNO: LOGICA
DATA: 2026-02-28

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima dell'intervento.
- Hotfix pagamenti crypto ordine esistente:
  - `CryptoController::createInvoice` ora accetta ordine esistente in stato `pending` o `payment_failed`.
  - Se manca `order_id`, verifica carrello `cart_user` e ritorna errore strutturato `cart_empty` (400).
  - Errori backend crypto ora includono `error_code` coerenti: `cart_empty`, `order_not_payable`, `crypto_provider_error`.
- Hotfix robustezza Stripe:
  - in `createPayment`, `createPaymentIntent`, `createSetupIntent` aggiunto fallback esplicito con `503` + `error_code: stripe_not_configured` quando la chiave segreta non e' disponibile.
- Idempotenza BRT e duplicati spedizione:
  - in `GenerateBrtLabel` aggiunta guardia idempotente su ordini gia' avanzati con tracking/label.
  - gestione non bloccante per errori duplicazione (`Shipment already done` / `PARCEL NUMBER ERROR` / code `-64`), senza errore fatale UI.
  - in `BrtService::translateBrtError` aggiunta traduzione specifica per `-64` (duplicazione/idempotenza).
- Gate invio documenti post-etichetta:
  - `ShipmentExecutionService` invia documenti solo se `createBordero()` ha successo.
  - in caso contrario imposta `documents_status=skipped`.
  - `ShipmentDocumentDispatcher` verifica precondizioni (`etichetta` + `bordero`) prima di inviare email; se mancanti marca `skipped` e non invia.
- Carrello guest:
  - introdotto `guest_item_id` stabile in sessione.
  - aggiunto update quantity guest (`updateQuantity`) e delete singolo item guest (`destroy`) in `GuestCartController`.
  - mantenuta retrocompatibilita' con carrelli vecchi tramite normalizzazione automatica `guest_item_id`.
- Frontend checkout/carrello/spedizioni:
  - `checkout.vue`: mapping errori con `error_code` backend (crypto/stripe) e messaggi chiari.
  - `checkout.vue`: pagamento carta disabilitato se Stripe non inizializzato; messaggio esplicito in UI.
  - `checkout.vue`: Google Pay mantiene policy tunnel (`trycloudflare`) con reason visibile; reason anche quando wallet non disponibile su device/browser.
  - `carrello.vue`: update quantita' usa endpoint corretto auth/guest; delete singolo item usa endpoint auth/guest; modali conferma con layout consistente.
  - `account/spedizioni/index.vue`: rimossa UI azione `Blocca` dall'elenco ordini.
  - `account/spedizioni/[id].vue`: rimossa sezione/modale `Blocca il pacco`; aggiunto stato `skipped` per documenti; copy UI corretto in `borderò`.

### File toccati in questo turno
- `laravel-spedizionefacile-main/app/Http/Controllers/CryptoController.php`
- `laravel-spedizionefacile-main/app/Http/Controllers/StripeController.php`
- `laravel-spedizionefacile-main/app/Http/Controllers/GuestCartController.php`
- `laravel-spedizionefacile-main/app/Listeners/GenerateBrtLabel.php`
- `laravel-spedizionefacile-main/app/Services/BrtService.php`
- `laravel-spedizionefacile-main/app/Services/ShipmentExecutionService.php`
- `laravel-spedizionefacile-main/app/Services/ShipmentDocumentDispatcher.php`
- `nuxt-spedizionefacile-master/pages/checkout.vue`
- `nuxt-spedizionefacile-master/pages/carrello.vue`
- `nuxt-spedizionefacile-master/pages/account/spedizioni/index.vue`
- `nuxt-spedizionefacile-master/pages/account/spedizioni/[id].vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Checkout ordine esistente con carrello vuoto: aprire `/checkout?order_id=<id_pending_o_payment_failed>` e pagare in crypto.
   - Atteso: nessun errore `cart_empty`, invoice creata in nuova scheda.
2. Checkout senza `order_id` e carrello vuoto.
   - Atteso: errore chiaro `Il carrello e' vuoto` (backend `error_code: cart_empty`).
3. Stripe non configurato.
   - Atteso: backend 503 con `stripe_not_configured`; frontend mostra messaggio guidato e blocca submit carta.
4. Pagina ordini utente.
   - Atteso: assenza completa UI `Blocca` in `/account/spedizioni` e `/account/spedizioni/{id}`.
5. Carrello guest.
   - Atteso: `+/-` quantita' funzionanti via route guest, delete singolo item funzionante anche da guest.
6. Stato documenti ordine.
   - Atteso: quando borderò non disponibile, stato documenti `Saltato` (skipped), nessun invio email.
7. Google Pay policy.
   - Atteso: su host `trycloudflare` Google Pay disabilitato con motivazione visibile.

### Note ambiente
- Lint PHP non eseguibile in questo ambiente (`php: command not found`).
- Lint frontend mirato tentato (`npx eslint ...`) ma non completabile per dipendenza nativa mancante (`unrs-resolver` / network `EAI_AGAIN`).

## TURNO: LOGICA
DATA: 2026-02-28

### Attivita' svolte
- Riletto `_SQUADRA_DIARIO.md` e verificato punto-per-punto l'allineamento del piano hotfix "Pagamenti + Ordini" sui file in scope.
- Confermato in codice:
  - `POST /api/crypto/create-invoice` fuori da `CheckCart`, con gestione `order_id` (stati `pending/payment_failed`) e `error_code` strutturati.
  - Stripe con `error_code: stripe_not_configured` su `createPayment`, `createPaymentIntent`, `createSetupIntent`.
  - guardie idempotenti BRT e gestione non bloccante duplicati `-64/Shipment already done`.
  - invio documenti condizionato a etichetta + bordero, con stato `documents_status=skipped` quando precondizioni mancanti.
  - carrello guest con `guest_item_id` stabile + endpoint quantità guest.
  - frontend checkout/carrello/account ordini allineato al piano (messaggi errore, rimozione UI "Blocca", stato `skipped`, policy Google Pay su tunnel).

### File toccati in questo turno
- `_SQUADRA_DIARIO.md`

### Verifica
1. Ricerca rapida su backend per keyword: `cart_empty`, `order_not_payable`, `crypto_provider_error`, `stripe_not_configured`, `guest_item_id`, `documents_status = 'skipped'`.
2. Ricerca rapida su frontend per keyword: `mapPaymentError`, `trycloudflare`, `guest-cart/{...}/quantity`, rimozione UI "Blocca", stato `skipped`.
3. Controllo route API: presenza `PATCH /api/guest-cart/{guest_item_id}/quantity` e `crypto/create-invoice` fuori gruppo `CheckCart`.

### Note ambiente
- In questo ambiente non e' disponibile `php`, quindi non e' stato possibile eseguire test runtime Laravel da CLI.

## TURNO: LOGICA
DATA: 2026-02-28

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima delle modifiche.
- Hotfix sul pulsante `Azzera` del preventivo in `Preventivo.vue` per rendere il reset realmente completo e visibile subito.
- Nel reset ora vengono azzerati anche gli stati residui del flusso (draft preventivo + dati temporanei collegati) che potevano lasciare UI sporca.
- Aggiunto reset esplicito delle validazioni (`sv.resetAll()`), cosi' dopo `Azzera` spariscono anche errori/touched legacy.
- Aggiunta sincronizzazione sessione dopo `DELETE /api/session` (`refresh()` in `finally`) per evitare che dati server vecchi restino in memoria client.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage o `/preventivo`.
2. Compilare citta/CAP, aggiungere almeno un collo e inserire peso/dimensioni.
3. Cliccare `Azzera`.
4. Atteso:
   - campi citta/CAP svuotati;
   - lista colli vuota;
   - prezzo/calcolo resettati;
   - errori rossi di validazione azzerati.
5. Ripetere `Ctrl+F5`: lo step 1 deve restare pulito e non ripopolarsi da sessione vecchia.

## TURNO: LOGICA
DATA: 2026-02-28

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima delle modifiche.
- Stabilizzato il mantenimento del draft preventivo dopo pagamento in checkout:
  - aggiunta preservazione esplicita di `shipmentDetails`, `packages`, `totalPrice`, `isQuoteStarted` quando il pagamento va a buon fine.
- Allineato editor immagine homepage e hero reale:
  - limite massimo crop sincronizzato a `±220` (come validazione backend);
  - clamp dinamico X/Y basato su dimensione reale frame + zoom per evitare spostamenti "infiniti";
  - migliorata sincronizzazione live preview (desktop/mobile ready separati).
- Aggiunto versionamento immagine homepage (`homepage_image_version`) lato backend e passaggio `version` nel payload pubblico/admin.
- Applicato cache-busting coerente lato frontend (`?v=<version>`) su hero e preview admin per evitare che dopo salvataggio resti visibile una versione vecchia.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/checkout.vue`
- `nuxt-spedizionefacile-master/components/ContenutoHeader.vue`
- `nuxt-spedizionefacile-master/pages/account/amministrazione/immagine-homepage.vue`
- `laravel-spedizionefacile-main/app/Http/Controllers/AdminController.php`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Checkout -> pagamento completato (ordine nuovo e ordine esistente).
   - Atteso: tornando su homepage/preventivo, i dati Step 1 non vengono azzerati automaticamente.
2. Admin -> Immagine Homepage:
   - muovere immagine in manuale (drag 2D), zoomare, salvare.
   - Atteso: homepage reale e riproduzione live mostrano stesso risultato.
3. Limiti spostamento:
   - Atteso: slider X/Y non superano i limiti utili del riquadro (niente trascinamento infinito fuori area).
4. Cache update:
   - dopo salvataggio crop/immagine, refresh homepage.
   - Atteso: viene caricata la versione aggiornata senza restare su immagine precedente.

### Note ambiente
- Tentato lint frontend (`npm run -s lint`) non conclusivo in questo ambiente:
  - errore runtime ESLint (`Unexpected token 'with'`) + tentativo install dipendenza nativa non disponibile offline.

## TURNO: LOGICA
DATA: 2026-02-28

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima delle modifiche.
- Hotfix autocomplete Step 1 per coerenza citta' -> CAP in tempo reale durante la digitazione:
  - nei campi citta' (`onOriginCityInput`, `onDestCityInput`) sostituita la ricerca generica con endpoint dedicato `searchLocationsByCity(...)`;
  - debounce ridotto a `180ms` per risposta piu' immediata.
- Obiettivo: evitare suggerimenti CAP/citta' non pertinenti (es. match per sottostringa tipo "roma" dentro "Villa Romana").

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. In `Citta Consegna`, digitare progressivamente `r`, `ro`, `rom`, `roma`.
2. Atteso: le tendine si aggiornano ad ogni digitazione con localita' coerenti con la citta' cercata.
3. Focus su `CAP Consegna` dopo aver scritto `Roma`.
4. Atteso: elenco CAP coerente con Roma (non risultati non pertinenti per sottostringa).

## TURNO: INTERFACCIA
DATA: 2026-02-28

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima delle modifiche.
- Ridisegnata l'animazione della card `Spedizione Senza etichetta` per renderla fluida e meno fastidiosa:
  - rimosso movimento "a scatti" con oscillazioni laterali;
  - introdotto micro-float verticale lento + glow leggero;
  - differenziata l'intensita' tra stato non selezionato e selezionato (selezionato ancora piu' morbido);
  - mantenuto rispetto accessibilita' con `prefers-reduced-motion`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/assets/css/main.css`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/la-tua-spedizione/2?step=servizi`.
2. Osservare la card `Spedizione Senza etichetta` non selezionata.
   - Atteso: movimento continuo, lento, senza scatti visibili.
3. Selezionare la card.
   - Atteso: animazione presente ma piu' delicata, non invasiva.
4. Verificare che non ci siano jitter durante scroll/interazione.

## TURNO: LOGICA
DATA: 2026-02-28

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima delle modifiche.
- Hotfix mappa PUDO non visibile:
  - in `MapPudo.client.vue` aggiunti import espliciti componenti Leaflet (`LMap`, `LTileLayer`, `LMarker`, `LPopup`, `LIcon`) e CSS Leaflet;
  - aggiunta invalidazione dimensione mappa dopo mount/aggiornamento risultati (`invalidateSize`) per evitare area vuota;
  - aggiunto overlay di caricamento finche' la mappa non e' pronta.
- Miglioria layout in `PudoSelector.vue`:
  - su schermi non desktop la mappa viene mostrata prima della lista risultati (ordine visivo) per essere immediatamente visibile.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/MapPudo.client.vue`
- `nuxt-spedizionefacile-master/components/PudoSelector.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/la-tua-spedizione/2?step=ritiro`.
2. Selezionare `Ritira in un Punto BRT`.
3. Eseguire ricerca PUDO.
4. Atteso:
   - mappa visibile con tile OSM;
   - marker punti + marker riferimento visibili;
   - nessuna area vuota grigia al posto della mappa.
5. Su viewport piccola:
   - atteso: mappa mostrata prima della lista punti.

## TURNO: LOGICA
DATA: 2026-02-28

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima delle modifiche.
- Allineata la logica prezzi oltre la fascia 7 tra backend e frontend:
  - backend `SessionController::findBandPrice()` overflow peso portato a step `50kg` (da `100kg`);
  - fallback hardcoded aggiornato con stessa regola (`+50 EUR` ogni `50kg`);
  - overflow volume mantenuto a step `0.200m3` con `+50 EUR`.
- Reso il backend autoritativo in `SessionController::firstStep()`:
  - `weight_price` e `volume_price` sono ora sempre ricalcolati server-side;
  - eventuali prezzi inviati dal client vengono ignorati/sovrascritti.
- Rimossi blocchi applicativi `1000kg`:
  - `PackageStoreRequest` senza `max:1000` su `packages.*.weight`;
  - `CartController::update()` senza `max:1000` su `packages.*.weight`;
  - `useSmartValidation.validatePeso()` senza errore "Peso massimo: 1000 kg".
- Estesa anteprima frontend in `usePriceBands.js`:
  - aggiunto overflow oltre ultima fascia in `getWeightPrice()` e `getVolumePrice()`;
  - step allineati a backend (`50kg` e `0.200m3`) con surcharge `+50 EUR`.
- Aggiornati test backend:
  - `PreventivoTest`: il test sui prezzi client ora verifica ricalcolo autoritativo server;
  - aggiunti test overflow peso (`1050kg`) e volume (`1.000m3`);
  - aggiornata asserzione del test su valore oltre fasce DB con formula overflow attuale.
  - `CartFlowTest`: aggiunto test store carrello con peso `>1000`.
- Aggiornata guida operativa `docs/guide/MODIFICARE-REGOLA-PREZZO.md` con regole attuali (fasce DB, overflow, backend autoritativo, verifiche).

### File toccati in questo turno
- `laravel-spedizionefacile-main/app/Http/Controllers/SessionController.php`
- `laravel-spedizionefacile-main/app/Http/Requests/PackageStoreRequest.php`
- `laravel-spedizionefacile-main/app/Http/Controllers/CartController.php`
- `nuxt-spedizionefacile-master/composables/useSmartValidation.js`
- `nuxt-spedizionefacile-master/composables/usePriceBands.js`
- `laravel-spedizionefacile-main/tests/Feature/Characterization/PreventivoTest.php`
- `laravel-spedizionefacile-main/tests/Feature/CartFlowTest.php`
- `docs/guide/MODIFICARE-REGOLA-PREZZO.md`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Preventivo: inviare `POST /api/session/first-step` con `weight=1050` e dimensioni piccole.
   - Atteso: `weight_price = 999.90`, nessun blocco per `>1000kg`.
2. Preventivo: inviare `POST /api/session/first-step` con volume `1.000m3` (`100x100x100`) e peso basso.
   - Atteso: `volume_price = 199.90`.
3. Preventivo: inviare payload con `weight_price`/`volume_price` forzati dal client.
   - Atteso: risposta con valori ricalcolati server-side (non quelli inviati).
4. Carrello auth: `POST /api/cart` con `packages.*.weight = 1050`.
   - Atteso: richiesta valida, nessun errore `max:1000`.
5. Frontend: in `Preventivo.vue`, inserendo peso/volume oltre fascia 7 il prezzo deve crescere con step overflow (non rimanere fisso alla fascia 7).

### Note ambiente
- Test automatici PHP non eseguiti in questo ambiente: `php` non disponibile (`php: command not found`).

## TURNO: INTERFACCIA
DATA: 2026-02-28

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima delle modifiche.
- Migliorato il flusso post-registrazione in `autenticazione.vue`:
  - dopo `POST /api/custom-register` riuscito non viene piu' mostrata solo la card di conferma;
  - il frontend passa automaticamente al tab `Accedi`;
  - viene aperto subito il box verifica codice (`verificationMode = true`), con campi codice pronti;
  - email e password usate in registrazione vengono copiate nelle credenziali login per permettere verifica immediata.
- Aggiornata gestione cambio tab (`onTabClick`) per non chiudere il box verifica quando il passaggio a `Accedi` e' automatico.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/autenticazione.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/autenticazione` e compilare il form `Registrati` con email nuova valida.
2. Inviare la registrazione.
3. Atteso immediato: senza click aggiuntivi, visualizzazione del box con 6 caselle per codice verifica.
4. Atteso: tab attivo `Accedi`, email gia' valorizzata e bottone `Verifica Account` disponibile.
5. Cambiare tab su `Registrati` e tornare su `Accedi`.
   - Atteso: il reset del box verifica avviene solo uscendo da `Accedi`, senza conflitti nel passaggio automatico post-registrazione.

## TURNO: LOGICA
DATA: 2026-02-28

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima delle modifiche.
- Hotfix crash su click `Continua al riepilogo` nella pagina indirizzi (`/la-tua-spedizione/2`):
  - rimosso uso di `v-show` sul contenitore principale degli indirizzi;
  - sostituito con `v-if="showAddressFields"` per evitare l'errore Vue runtime `Cannot read properties of null (reading 'style')` in fase di unmount/cambio pagina.
- Effetto collaterale positivo atteso: inizializzazione mappa PUDO piu' stabile, evitando mount della mappa dentro contenitore nascosto.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/la-tua-spedizione/2?step=indirizzi`.
2. Compilare i campi obbligatori e cliccare `Continua al riepilogo`.
   - Atteso: nessun errore console `Cannot read properties of null (reading 'style')`.
   - Atteso: navigazione corretta verso `/riepilogo`.
3. Tornare a `/la-tua-spedizione/2?step=ritiro`, selezionare `Ritira in un Punto BRT`, cercare punti PUDO.
   - Atteso: mappa visibile e interattiva (tile + marker), senza blocchi UI.

## TURNO: INTERFACCIA
DATA: 2026-02-28

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima delle modifiche.
- Refactor UX in `Preventivo Rapido` per rimuovere la duplicazione del flusso "aggiungi collo":
  - mantenuto un solo selettore tipo collo nel blocco alto;
  - dopo il primo collo il selettore si collassa in una barra compatta con riepilogo tipi/quantita';
  - introdotto bottone `Aggiungi collo` nella barra compatta che riapre il selettore alto;
  - sostituito il blocco duplicato in basso (che mostrava di nuovo le card) con un solo CTA `Aggiungi un altro collo` collegato al selettore alto;
  - aggiunti helper `openTopSelector` / `closeTopSelector` con scroll automatico e focus visivo;
  - aggiornato microcopy: titolo `Scegli il tipo di collo` e testo guida su colli misti.
- Pulizia logica JS:
  - rimossi stati/funzioni duplicati `showInlinePackageSelector`, `addAnotherPackage`, `selectInlinePackageType`.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `Preventivo Rapido` (home o `/preventivo`).
2. Atteso al primo ingresso: selettore tipo collo espanso in alto (card con icone).
3. Selezionare `Pacco`.
   - Atteso: collo aggiunto e selettore alto collassato in barra compatta.
4. Cliccare `Aggiungi collo` nella barra compatta.
   - Atteso: riapertura del selettore alto + scroll automatico alla sezione.
5. Cliccare `Aggiungi un altro collo` sotto la lista colli.
   - Atteso: stesso comportamento del punto 4, senza card duplicate in basso.
6. Eliminare tutti i colli.
   - Atteso: selettore alto torna espanso automaticamente.
7. Regressione flusso:
   - `Continua` deve continuare a calcolare e navigare come prima.

### Note ambiente
- Tentato lint mirato con `npx eslint components/Preventivo.vue`, non eseguibile in questo ambiente per errore runtime ESLint/Node (`SyntaxError: Unexpected token 'with'`).

## TURNO: INTERFACCIA
DATA: 2026-02-28

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima delle modifiche.
- Correzione UX su feedback utente del refactor `Aggiungi collo` in `Preventivo.vue`:
  - rimosso il secondo entry point in basso (`Aggiungi un altro collo`) per evitare percezione di duplicazione;
  - mantenuto un solo punto di aggiunta nella barra compatta in alto (`Aggiungi collo`);
  - rimosso effetto di evidenziazione/pulse della sezione superiore in apertura selettore;
  - aumentata dimensione icone nella barra compatta (chip riepilogo tipo collo da 16px a 22px) e icona `+` del bottone `Aggiungi collo` (da 16px a 20px).
- Formattazione file frontend con Prettier.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `Preventivo Rapido`.
2. Selezionare almeno un collo.
3. Atteso: nella UI compare un solo controllo di aggiunta (`Aggiungi collo`) nella sezione alta compatta.
4. Atteso: non e' presente nessun bottone `Aggiungi un altro collo` sotto i campi colli.
5. Cliccare `Aggiungi collo`.
   - Atteso: riapertura selettore alto senza glow/evidenziazione forzata della sezione.
6. Controllare i chip riepilogo tipo collo.
   - Atteso: icone visibilmente piu' grandi e leggibili.

### Note ambiente
- Prettier eseguito con successo su `components/Preventivo.vue`.

## TURNO: LOGICA
DATA: 2026-02-28

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima delle modifiche.
- Corretto autocomplete indirizzi in `pages/la-tua-spedizione/[step].vue` per evitare suggerimenti non coerenti tra citta'/CAP/provincia:
  - filtrate le province contestuali da API accettando solo sigle valide a 2 lettere;
  - aggiunta sanificazione centralizzata delle righe localita' (`place_name`, `postal_code`, `province`) con scarto record malformati;
  - ricerca suggerimenti ora contestuale al campo:
    - campo citta' -> endpoint `GET /api/locations/by-city`;
    - campo CAP (5 cifre) -> endpoint `GET /api/locations/by-cap`;
    - fallback su `GET /api/locations/search` solo per CAP parziale;
  - selezione suggerimento aggiornata per compilare provincia solo se valida (mai sigla a 1 lettera).
- Formattazione del file con Prettier.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/la-tua-spedizione/2` e digitare una citta' nota (es. `Roma`) in mittente o destinatario.
   - Atteso: suggerimenti coerenti citta'/CAP, senza provincia a 1 lettera.
2. Selezionare un suggerimento dal dropdown.
   - Atteso: CAP valorizzato a 5 cifre e provincia valorizzata solo con sigla valida a 2 lettere.
3. Digitare un CAP completo (5 cifre).
   - Atteso: suggerimenti/auto-compilazione citta' coerenti al CAP, senza province malformate.
4. Verificare formattazione:
   - Comando: `npx prettier --check pages/la-tua-spedizione/[step].vue`
   - Atteso: nessun warning.

## TURNO: LOGICA
DATA: 2026-02-28

### Attivita' svolte
- Estesa la correzione autocomplete al composable condiviso `useLocationAutocomplete.js` (usato in riepilogo/profilo/indirizzi):
  - ricerca endpoint contestuale (`by-city`, `by-cap`, fallback `search`);
  - sanificazione risultati con provincia obbligatoriamente a 2 lettere;
  - scarto record malformati e deduplica suggerimenti.
- Formattazione file con Prettier.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/composables/useLocationAutocomplete.js`
- `_SQUADRA_DIARIO.md`

### Verifica
1. In una pagina che usa `useLocationAutocomplete` (es. `/riepilogo` in modifica indirizzo), digitare citta' (`Roma`) o CAP (`001xx`).
   - Atteso: suggerimenti coerenti citta'/CAP.
2. Selezionare un suggerimento.
   - Atteso: provincia sempre in formato sigla valida a 2 lettere.
3. Verificare formattazione:
   - Comando: `npx prettier --check composables/useLocationAutocomplete.js pages/la-tua-spedizione/[step].vue`
   - Atteso: nessun warning.

## TURNO: INTERFACCIA
DATA: 2026-03-01

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima delle modifiche.
- Hotfix animazioni Step 1 nel blocco colli in `components/Preventivo.vue`:
  - introdotto stato UI dedicato per la sezione colli (`showPackSection`) con chiusura/apertura tramite `Transition` (`pack-section`) invece di `v-show` immediato;
  - aggiunti hook di orchestrazione (`onPackListAfterLeave`, `onPackSectionAfterLeave`) per evitare sparizione brusca quando rimuovi l'ultimo collo;
  - sincronizzata la sequenza selettore -> inserimento collo -> comparsa bottone `Aggiungi collo` senza timeout "magici" di allineamento;
  - aggiunto stato busy del selettore (`isSelectorBusy`) con feedback visivo (`selectorBusyPulse`) per evitare percezione di click non recepiti;
  - attivata comparsa iniziale (`appear`) del selettore tipo collo.
- Estese animazioni ai messaggi errore del preventivo:
  - introdotta classe comune `.form-feedback-msg`;
  - aggiunte transizioni `msg-fade` su errori citta'/CAP e su errori del blocco pacchi (quantita', peso, lati, dimensioni totali, errore generale `packages`).
- Rifinite curve/durate in modalita' piu' morbida e accompagnata (richiesta utente):
  - aumentate le durate principali (selector, pack-section, pack-list, add-button, toast, feedback messaggi);
  - ridotto l'effetto "rimbalzo" aggressivo; movimenti piu' progressivi.
- Aggiunte regole `prefers-reduced-motion` per accessibilita' (fallback con transizioni brevi e senza transform invasive).
- Formattazione file con Prettier.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage o `/preventivo`.
2. Selezionare `Pacco` nella sezione "Scegli il tipo di collo".
   - Atteso: uscita selettore + ingresso sezione dimensioni + comparsa bottone `Aggiungi collo` con transizioni morbide.
3. Cliccare rapidamente su tipi collo durante animazione.
   - Atteso: niente freeze percepito; feedback visivo busy (nessun salto a scatto).
4. Eliminare un collo quando ce ne sono piu' di uno.
   - Atteso: rimozione fluida elemento, riassesto layout fluido.
5. Eliminare l'ultimo collo.
   - Atteso: sezione colli esce con animazione, poi ritorna il selettore tipo collo senza sparizione brusca.
6. Generare errori (CAP/citta'/peso/lati).
   - Atteso: messaggi errore con fade/slide morbido, senza comparsa/scomparsa secca.
7. Verifica formattazione:
   - Comando: `cd nuxt-spedizionefacile-master && npx prettier --check components/Preventivo.vue`
   - Atteso: `All matched files use Prettier code style!`

### Note ambiente
- Tentato controllo ESLint mirato sul file, ma non affidabile in questo ambiente per errore runtime esterno (`SyntaxError: Invalid regular expression flags` su toolchain ESLint/Node).

## TURNO: INTERFACCIA
DATA: 2026-03-01

### Attivita' svolte
- Tuning aggiuntivo richiesto sulle animazioni dello Step 1 (`components/Preventivo.vue`):
  - rallentate ulteriormente le durate con curve piu' dolci (selector, lista colli, sezione colli, toast, bottone aggiungi, messaggi errore);
  - resa piu' morbida la trasformazione di entrata/uscita (scale meno aggressive).
- Migliorata animazione durante cancellazione collo:
  - aggiunto identificatore stabile per ogni collo (`__localId`) per transizioni `TransitionGroup` consistenti in rimozione;
  - aggiunta animazione dedicata di risalita del contenitore `Aggiungi collo` (`add-button-slot--lift`) quando si elimina un collo non finale.
- Aggiornato bottone `Annulla` nel selettore tipo collo:
  - rimosso effetto "quasi bianco";
  - applicato sfondo grigio piu' pieno + bordo, coerente con bottoni secondari.
- Formattazione file con Prettier.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage o `/preventivo`.
2. Aggiungere 2 colli e cancellarne uno.
   - Atteso: card collo rimossa con animazione fluida e `Aggiungi collo` che risale con movimento visibile.
3. Cancellare l'ultimo collo.
   - Atteso: sezione colli si chiude con uscita morbida e ritorna il selettore.
4. Aprire il selettore e verificare `Annulla`.
   - Atteso: bottone secondario grigio pieno (non bianco).
5. Verifica formattazione:
   - Comando: `cd nuxt-spedizionefacile-master && npx prettier --check components/Preventivo.vue`
   - Atteso: `All matched files use Prettier code style!`

## TURNO: LOGICA
DATA: 2026-03-01

### Attivita' svolte
- Letto `_SQUADRA_DIARIO.md` prima delle modifiche.
- Hotfix su `Preventivo.vue` per regressione associazione citta'/CAP:
  - ricerca contestuale per autocomplete:
    - citta' -> `GET /api/locations/by-city`
    - CAP completo (5 cifre) -> `GET /api/locations/by-cap`
    - CAP parziale -> `GET /api/locations/search`
  - aggiunta sanificazione risultati (`place_name`, `postal_code`, `province`) + deduplica righe;
  - aggiunta protezione anti-race (`originLookupSeq` / `destLookupSeq`) per evitare che risposte vecchie sovrascrivano quelle nuove mentre scrivi;
  - separata la tendina attiva per campo (`city`/`cap`) per non mostrare due dropdown incoerenti insieme.
- Hotfix validazione su click `Continua`:
  - introdotta validazione locale esplicita dei campi `citta'` e `CAP` (partenza/consegna) prima del calcolo tariffa;
  - quando mancano dati o CAP non valido ora compaiono messaggi errore nel form (`messageError`) e bordo errore CAP tramite smart validation;
  - aggiunta visualizzazione errore route (partenza/destinazione uguali) sotto il box indirizzi.
- Tuning logica animazioni selettore colli per ridurre sparizioni a scatto:
  - aumentati tempi di orchestrazione (`CARD_CONFIRM_MS`, `ADD_BUTTON_ENTER_MS`) e tempi CSS principali;
  - `selectedCardIndex` non viene piu' azzerato prima della leave del selettore (azzeramento post-leave), per evitare stacchi bruschi durante la transizione;
  - allineata la salita del bottone `Aggiungi collo` quando elimini un collo.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire homepage o `/preventivo`.
2. Digitare `roma` in `Città Consegna`.
   - Atteso: suggerimenti coerenti con Roma (non risultati casuali da match generico).
3. Mettere focus su `CAP Consegna` con citta' valorizzata.
   - Atteso: tendina CAP coerente alla citta' della stessa sezione.
4. Cliccare `Continua` con campi mancanti.
   - Atteso: messaggi errore visibili nel form (citta'/CAP obbligatori), non passaggio silenzioso.
5. Selezionare un tipo collo (`Pacco/Pallet/Valigia`).
   - Atteso: uscita selettore non a scatto (transizione morbida), ingresso blocco colli coerente.
6. Formattazione:
   - `cd nuxt-spedizionefacile-master && npx prettier --check components/Preventivo.vue`
   - Atteso: `All matched files use Prettier code style!`

### Note ambiente
- Tentata build frontend per verifica compilazione (`npm run build`) non completabile in questo ambiente per dipendenza opzionale mancante di `oxc-parser` (`Cannot find module '@oxc-parser/binding-linux-x64-gnu'`).

## TURNO: REVISIONE
DATA: 2026-03-01

### Attivita' svolte
- Verifica regressioni UX su `Preventivo.vue` dopo hotfix LOGICA precedente.
- Corretto problema di sparizione troppo secca del box `Scegli il tipo di collo` quando si preme `Annulla`:
  - estesa transizione `selector` anche a `max-height` con `overflow: clip`.
- Corretto salto verticale del bottone `Continua` dopo selezione collo:
  - il toast `Collo aggiunto` non occupa piu' spazio nel flow (ora overlay assoluto), evitando il comportamento "scende poi risale" della sezione CTA.
- Mantenuta orchestrazione animazioni esistente; intervento isolato a transizioni/layout del blocco selettore/feedback.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` o `/preventivo`.
2. Con almeno un collo gia' presente, aprire selettore e premere `Annulla`.
   - Atteso: chiusura del box `Scegli il tipo di collo` con transizione morbida (non sparizione secca).
3. Selezionare un tipo collo (es. `Pacco`).
   - Atteso: nessun salto anomalo del bottone `Continua`; niente discesa/risalita a scatto.
4. Verifica formattazione:
   - `cd nuxt-spedizionefacile-master && npx prettier --check components/Preventivo.vue`
   - Atteso: `All matched files use Prettier code style!`.

## TURNO: CAPO
DATA: 2026-03-01

### Attivita' svolte
- Intervento urgente di stabilizzazione sul bug CAP collegato alla citta' in `Preventivo.vue`.
- Root cause trovata: nel focus del campo CAP (`onOriginCapFocus` / `onDestCapFocus`) la funzione usciva subito se i suggerimenti erano gia' aperti, lasciando il dropdown legato al campo `city` invece che al campo `cap`.
- Fix applicato:
  - impostazione del campo attivo (`originSuggestionsField` / `destSuggestionsField`) a `cap` PRIMA della guardia di return.
  - stesso fix su partenza e consegna.
- Effetto atteso: digitando citta' e passando al CAP, la tendina CAP collegata resta visibile/coerente con la citta'.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. In Step 1 digitare `Iglesias` in `Città di Partenza`.
2. Cliccare subito `CAP di Partenza`.
   - Atteso: compare la tendina CAP coerente con Iglesias (non vuota, non bloccata sul dropdown citta').
3. Ripetere su `Città Consegna` / `CAP Consegna`.
4. Verifica formattazione:
   - `cd nuxt-spedizionefacile-master && npx prettier --check components/Preventivo.vue`
   - Atteso: OK.

## TURNO: ARCHITETTURA
DATA: 2026-03-01

### Attivita' svolte
- Analizzato il difetto di percezione "primo box colli appare di scatto" su `Preventivo.vue`.
- Root cause individuata: il primo render del blocco colli avveniva come mount iniziale del `TransitionGroup`, senza transizione coerente rispetto agli inserimenti successivi.
- Fix strutturale applicato:
  - abilitato `appear` su `Transition` del blocco sezione colli (`pack-section`);
  - abilitato `appear` su `TransitionGroup` lista colli (`pack-list`);
  - aggiunte classi CSS esplicite `*-appear-*` per allineare la prima comparsa agli stessi easing/tempi delle enter normali.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` o `/preventivo`.
2. Selezionare il primo tipo collo (quando non ci sono colli).
   - Atteso: il primo box `Inserisci le dimensioni e il peso dei colli` entra con animazione morbida, non a scatto.
3. Aggiungere altri colli.
   - Atteso: comportamento animazione invariato e coerente con il primo ingresso.
4. Verifica stile codice:
   - `cd nuxt-spedizionefacile-master && npx prettier --check components/Preventivo.vue`
   - Atteso: OK.

## TURNO: INTERFACCIA
DATA: 2026-03-02

### Attivita' svolte
- Corretto blocco del pannello PowerShell (`PANNELLO.ps1`) in fase avvio Nuxt:
  - sostituito avvio `npx nuxi dev ...` con `npm run dev -- ...` per evitare prompt interattivo (`Ok to proceed?`) che lasciava il terminale fermo.
- Reso piu' robusto il bootstrap Nuxt:
  - in `Ensure-NpmInstall` ora non basta la sola presenza di `node_modules`;
  - se mancano i launcher Windows `node_modules\.bin\nuxt.cmd`/`nuxi.cmd`, viene eseguito automaticamente `npm install`.
- Migliorata la diagnostica avvio processi:
  - aggiunte funzioni `Is-ProcessAlive`, `Show-LogTail`, `Wait-ServiceReady`;
  - durante l'attesa di Nuxt/Laravel/Base il pannello ora interrompe subito se il processo muore e stampa le ultime righe dei log invece di sembrare "bloccato".

### File toccati in questo turno
- `PANNELLO.ps1`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Avviare da Windows il pannello (`PANNELLO.bat`) e scegliere `1 = Avvia locale`.
   - Atteso: non compare piu' il prompt `Need to install ... Ok to proceed?`.
2. Se Nuxt/Laravel falliscono, osservare il terminale.
   - Atteso: errore immediato con ultime righe log (non attesa silenziosa prolungata).
3. Verificare log:
   - `_LOG/nuxt_out.log`
   - `_LOG/nuxt_err.log`
   - Atteso: assenza del blocco su richiesta conferma `npx`.

## TURNO: INTERFACCIA
DATA: 2026-03-01

### Attivita' svolte
- Tuning animazioni blocco `Scegli il tipo di collo` per eliminare percezione "rigida/a scatto" in tutte le fasi (iniziale, riapertura da `Aggiungi collo`, chiusura).
- Aggiunto contenitore di layout transizionato (`selector-shell`) con due stati (`expanded/collapsed`) per rendere morbido anche lo spostamento verticale delle sezioni sottostanti, incluso il blocco CTA `Continua`.
- Esplicitate transizioni `appear` del selettore e degli item interni:
  - aggiunte classi `selector-appear-*`;
  - allineata animazione stagger delle card anche in fase `appear`.
- Rallentata leggermente la transizione del selettore (durata/easing) per accompagnare meglio il passaggio tra stati.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` o `/preventivo` con form vuoto.
   - Atteso: `Scegli il tipo di collo` entra con animazione morbida gia' al primo render.
2. Selezionare un collo e poi cliccare `Aggiungi collo`.
   - Atteso: riapertura selettore morbida, senza scatti.
3. Premere `Annulla` sul selettore.
   - Atteso: chiusura dolce + movimento coerente del blocco sotto.
4. Osservare il bottone `Continua` durante questi passaggi.
   - Atteso: segue i cambi layout in modo progressivo (niente saltelli secchi).
5. Verifica formattazione:
   - `cd nuxt-spedizionefacile-master && npx prettier --check components/Preventivo.vue`
   - Atteso: OK.

## TURNO: LOGICA
DATA: 2026-03-01

### Attivita' svolte
- Hotfix sul problema grafico "taglio" del bottone `Aggiungi collo` durante la risalita.
- Root cause individuata in `Preventivo.vue`: il contenitore `selector-shell` usava `overflow: clip`, quindi durante l'animazione di lift il bottone veniva ritagliato.
- Correzione applicata:
  - `selector-shell` portato a `overflow: visible`;
  - `add-button-slot` reso layer esplicito (`position: relative; z-index: 2`) per evitare percezione di bottone dietro altri elementi durante il movimento.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` o `/preventivo`.
2. Aggiungere almeno 2 colli, poi rimuoverne 1.
   - Atteso: il bottone `Aggiungi collo` risale senza effetto di taglio/ritaglio.
3. Ripetere la sequenza piu' volte.
   - Atteso: il bottone non passa "dietro" ad altri layer.
4. Verifica formato:
   - `cd nuxt-spedizionefacile-master && npx prettier --check components/Preventivo.vue`
   - Atteso: OK.

## TURNO: REVISIONE
DATA: 2026-03-01

### Attivita' svolte
- Corretto problema "nuovo box colli appare di scatto" su `Preventivo.vue`.
- Intervento sulla transizione `TransitionGroup` (`pack-list`):
  - estesa la transizione anche a `max-height`, `margin-top`, `padding-top`, `padding-bottom`;
  - aggiunti stati `enter/appear-to` e `leave-from` espliciti;
  - su `enter/appear-from` e `leave-to` impostati `max-height:0` e azzeramento margine/padding per rendere progressiva la crescita/riduzione del blocco.
- Risultato atteso: ogni nuovo box collo entra in modo graduale e l'area sotto (incluso `Continua`) si sposta in modo morbido, non a scatto.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` o `/preventivo`.
2. Selezionare `Pacco` (primo collo) e poi aggiungere altri colli.
   - Atteso: ogni nuovo box `Inserisci le dimensioni e il peso dei colli` entra progressivamente, senza scatto.
3. Osservare il bottone `Continua` durante inserimento nuovi colli.
   - Atteso: spostamento verticale morbido e continuo.
4. Verifica formato:
   - `cd nuxt-spedizionefacile-master && npx prettier --check components/Preventivo.vue`
   - Atteso: OK.

## TURNO: CAPO
DATA: 2026-03-01

### Attivita' svolte
- Migliorata la sequenza di transizione richiesta: il box `Inserisci le dimensioni e il peso dei colli` ora inizia a comparire mentre il box `Scegli il tipo di collo` sta uscendo.
- Modifica su orchestrazione JS in `Preventivo.vue`:
  - durante `selectPackageType`, dopo la fase di conferma card, viene avviata una transizione sovrapposta:
    1) push del collo selezionato,
    2) `showPackSection = true`,
    3) solo dopo un frame viene chiuso `showTopPackageSelector`.
  - mantenuto fallback in `onSelectorAfterLeave` se il push non avviene in parallelo (robustezza).
- Obiettivo: eliminare percezione "a blocchi" e ottenere passaggio visivo continuo e gradevole.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` o `/preventivo` con form vuoto.
2. Cliccare un tipo collo (`Pacco/Pallet/Valigia`).
   - Atteso: il box misure inizia ad apparire mentre il selettore tipo collo sta ancora uscendo (overlap fluido).
3. Ripetere piu' volte `Aggiungi collo` -> selezione tipo.
   - Atteso: stessa fluidita' anche nelle iterazioni successive.
4. Osservare il blocco sotto (`Continua`).
   - Atteso: spostamento progressivo, senza salti secchi.
5. Verifica formato:
   - `cd nuxt-spedizionefacile-master && npx prettier --check components/Preventivo.vue`
   - Atteso: OK.

## TURNO: ARCHITETTURA
DATA: 2026-03-01

### Attivita' svolte
- Rifinita la timeline del passaggio `Scegli il tipo di collo` -> `Inserisci le dimensioni e il peso dei colli` per ottenere sovrapposizione reale e non sequenza a blocchi.
- In `Preventivo.vue` introdotto helper `startSelectorExitWithOverlap()`:
  - avvia prima l'ingresso del box misure (`showPackSection = true`),
  - poi dopo `nextTick + requestAnimationFrame` avvia l'uscita del selettore (`showTopPackageSelector = false`).
- Aggiornata la sequenza in `selectPackageType` per usare l'helper sopra, mantenendo il push del collo nella stessa fase e riducendo gli scatti percepiti.
- Rallentata e uniformata la cinematica UI con easing unico piu' morbido (`cubic-bezier(0.22, 1, 0.36, 1)`) e durate piu' lunghe su:
  - `pack-section`,
  - `selector-shell` (altezza layout),
  - `selector` enter/leave/appear,
  - `add-button-slot` e transizione `add-button`,
  - `pack-list` enter/leave/move,
  - feedback selezione card (`card-selected`, `card-not-selected`, stagger).
- Ritoccata la trasformazione del selettore in ingresso/uscita (`translateY`/`scale`) per una transizione meno brusca.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` o `/preventivo` con form vuoto.
2. Cliccare un tipo collo.
   - Atteso: il box misure inizia a entrare mentre il selettore sta uscendo (overlap visibile e morbido).
3. Ripetere il flusso su piu' cicli (`Aggiungi collo` -> selezione tipo).
   - Atteso: nessun passaggio a scatto, stessa fluidita' a ogni iterazione.
4. Osservare il movimento verticale dell'area sottostante e del bottone `Continua`.
   - Atteso: spostamento progressivo (niente snap).
5. Verifica formato:
   - `cd nuxt-spedizionefacile-master && npx prettier --check components/Preventivo.vue`
   - Atteso: OK.

## TURNO: INTERFACCIA
DATA: 2026-03-01

### Attivita' svolte
- Rifinita la sola uscita del box `Scegli il tipo di collo` in `Preventivo.vue`, come richiesto.
- Separata la transizione `leave` da `enter/appear` del selettore per avere controllo dedicato della sparizione.
- Uscita resa piu' morbida e meno "leggera":
  - durata leave aumentata a `1580ms`;
  - easing leave piu' dolce (`cubic-bezier(0.19, 1, 0.22, 1)`);
  - traiettoria leave piu' accompagnata (`translateY(14px) scale(0.97)`) invece della chiusura troppo rapida.
- Nessuna modifica alla logica dati; intervento esclusivamente UI/CSS del selettore.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` o `/preventivo`.
2. Selezionare un tipo collo (`Pacco/Pallet/Valigia`).
   - Atteso: il box `Scegli il tipo di collo` scompare con uscita piu' lenta e morbida (non secca).
3. Ripetere il passaggio piu' volte.
   - Atteso: comportamento stabile e coerente.
4. Verifica formattazione:
   - `cd nuxt-spedizionefacile-master && npx prettier --check components/Preventivo.vue`
   - Atteso: OK.

## TURNO: LOGICA
DATA: 2026-03-01

### Attivita' svolte
- Corretto comportamento intermittente segnalato: in alcuni click il box `Scegli il tipo di collo` iniziava la leave troppo presto rispetto all'ingresso del box misure.
- In `Preventivo.vue` aggiunto ritardo controllato di overlap (`SELECTOR_OVERLAP_DELAY_MS = 180`) nella funzione `startSelectorExitWithOverlap()`:
  - prima parte l'ingresso del box misure,
  - poi parte la leave del selettore con breve offset, per rendere il passaggio costante e non percepito come troppo veloce.
- Rafforzata la morbidezza della leave del selettore:
  - durata portata a `1720ms`;
  - traiettoria leave meno aggressiva (`translateY(10px) scale(0.975)`).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` o `/preventivo`.
2. Ripetere 8-10 volte: click tipo collo -> transizione verso box misure.
   - Atteso: uscita del box selettore uniforme e morbida, senza casi occasionali "troppo veloci".
3. Verifica formattazione:
   - `cd nuxt-spedizionefacile-master && npx prettier --check components/Preventivo.vue`
   - Atteso: OK.

## TURNO: REVISIONE
DATA: 2026-03-01

### Attivita' svolte
- Ripristinata affidabilita' autocomplete CAP/citta' in `Preventivo.vue`:
  - ricerca citta' durante digitazione riportata su endpoint generico (`/api/locations/search`) per suggerimenti live;
  - endpoint dedicato citta' (`/api/locations/by-city`) usato in modalita' CAP (focus CAP / lista CAP della citta');
  - aggiunti `originSuggestionSource` e `destSuggestionSource` per evitare riuso incoerente della lista citta' nel campo CAP;
  - normalizzazione risultati resa tollerante: non scarta piu' record validi se la provincia non e' in formato sigla 2 lettere.
- Rifinita pipeline animazioni del blocco colli per eliminare scatti e delay:
  - apertura selettore da bottone `Aggiungi collo` ora contemporanea alla scomparsa del bottone (non piu' in sequenza);
  - selezione tipo collo: ingresso box misure + uscita selettore partono in overlap reale (`SELECTOR_OVERLAP_DELAY_MS=0`);
  - comparsa bottone `Aggiungi collo` anticipata durante la fase finale dell'ingresso box misure (`ADD_BUTTON_OVERLAP_DELAY_MS=760`).
- Uniformata la cinematica: stessa durata/easing per tutte le principali transizioni del componente con variabili CSS condivise (`--pm-duration`, `--pm-ease`).
- Ridotto il distacco verticale del CTA `Continua` dal blocco precedente (margin-top ridotto).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` o `/preventivo` e digitare citta' di partenza/consegna (es. `Iglesias`, `Roma`).
   - Atteso: tendina citta' visibile in tempo reale.
2. Passare al campo CAP della stessa sezione.
   - Atteso: tendina CAP coerente con la citta' digitata (via `/by-city`), senza risultati "fuori parola".
3. Flusso animazioni colli:
   - clic `Aggiungi collo` -> selettore compare mentre il bottone scompare;
   - scelta tipo collo -> box misure appare mentre selettore scompare;
   - il bottone `Aggiungi collo` riappare senza delay percepibile quando il box misure e' in chiusura ingresso.
4. Verificare distanza CTA:
   - `Continua` piu' vicino al blocco sopra.
5. Verifica stile codice:
   - `cd nuxt-spedizionefacile-master && npx prettier --write components/Preventivo.vue && npx prettier --check components/Preventivo.vue`
   - Atteso: OK.

## TURNO: CAPO
DATA: 2026-03-01

### Attivita' svolte
- Rifinita la morbidezza generale delle animazioni nel blocco preventivo:
  - variabile unica `--pm-duration` aumentata da `1320ms` a `1480ms` mantenendo easing comune.
- Corretto lo scatto del bottone `Aggiungi collo` dopo la comparsa:
  - root cause individuata nello scroll automatico sempre forzato in `onButtonAfterEnter`;
  - introdotto controllo visibilita' (`isElementMostlyVisible`) e lo scroll viene eseguito solo se il nuovo box collo e' davvero fuori zona utile viewport.
- Allineata la finestra temporale di overlap del bottone add con il nuovo ritmo (`ADD_BUTTON_OVERLAP_DELAY_MS` a `860`).

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` o `/preventivo`.
2. Selezionare un tipo collo.
   - Atteso: transizione piu' morbida globale, senza accelerazioni improvvise.
3. Osservare fase: appare box misure -> riappare bottone `Aggiungi collo`.
   - Atteso: niente scatto verso l'alto dopo la comparsa del bottone.
4. Ripetere 8-10 cicli di aggiunta collo.
   - Atteso: comportamento stabile e coerente.
5. Verifica stile codice:
   - `cd nuxt-spedizionefacile-master && npx prettier --write components/Preventivo.vue && npx prettier --check components/Preventivo.vue`
   - Atteso: OK.

## TURNO: ARCHITETTURA
DATA: 2026-03-01

### Attivita' svolte
- Ridotto lo spazio eccessivo prima del CTA `Continua` in `Preventivo.vue` intervenendo su due livelli:
  - `selector-shell--expanded` ridotto (`clamp(200px, 24vw, 260px)`);
  - `selector-shell--collapsed` ridotto (`clamp(78px, 9vw, 108px)`);
  - margine top del CTA diminuito (`mt-[8px]` base, `mt-[10px]` con promo attiva).
- Addolcita la sparizione del box `Scegli il tipo di collo` durante la selezione:
  - ridotto lo spostamento verticale in leave (`translateY(3px)` invece di `10px`);
  - ridotta anche la variazione di scala (`0.985`) per evitare effetto di "caduta" rapida.
- Nessuna modifica logica API/dati: intervento solo di composizione e cinematica UI.

### File toccati in questo turno
- `nuxt-spedizionefacile-master/components/Preventivo.vue`
- `_SQUADRA_DIARIO.md`

### Verifica
1. Aprire `/` o `/preventivo`.
2. Con selettore colli visibile e nessun collo aggiunto:
   - Atteso: `Continua` sensibilmente piu' vicino al blocco precedente.
3. Cliccare un tipo collo (`Pacco/Pallet/Valigia`):
   - Atteso: il box `Scegli il tipo di collo` esce in modo morbido, senza discesa veloce verso il basso.
4. Verifica stile codice:
   - `cd nuxt-spedizionefacile-master && npx prettier --check components/Preventivo.vue`
   - Atteso: OK.

## TURNO: INTERFACCIA
DATA: 2026-03-02

### Attivita' svolte
- Eseguito congelamento forense dello stato post-reset su branch dedicato `recovery/forensics-2026-03-02`.
- Creato inventario recovery in `_LOG/recovery/20260302-233518/` con:
  - `git-status-sb.txt`
  - `git-branch-avv.txt`
  - `git-reflog-200.txt`
  - `files-modified-last48h.txt`
  - `files-mtime-48h-full.txt`
  - `recovery-source-map.tsv`
  - `recovery-restore-decisions.tsv`
- Confermato limite Git forensics locale:
  - reflog utile solo al reset del `2026-03-02`;
  - nessun oggetto utile da `git fsck --lost-found`.
- Eseguito recupero controllato file locali (sorgente A/B) con commit separati `RECOVERY`:
  1. `c415a8f` - `RECOVERY: stato grezzo file persi da sorgenti locali`
  2. `fecedb3` - `RECOVERY: riallineato Preventivo.vue con stato locale post-reset`
- Preservato il backup locale `nuxt-spedizionefacile-master/components/Preventivo.vue.backup-1772462877` nel branch di recovery.

### File toccati in questo turno
- `_SQUADRA_DIARIO.md`
- (commit recovery) file ripristinati locali in frontend/backend/documentazione, inclusi:
  - `nuxt-spedizionefacile-master/components/Preventivo.vue`
  - `nuxt-spedizionefacile-master/components/Preventivo.vue.backup-1772462877`
  - `laravel-spedizionefacile-main/app/Http/Controllers/CryptoController.php`
  - `laravel-spedizionefacile-main/app/Services/ShipmentExecutionService.php`
  - `laravel-spedizionefacile-main/app/Services/ShipmentDocumentDispatcher.php`
  - e gli altri file aggiunti nel commit `c415a8f`.

### Verifica
1. Verificare branch attivo:
   - `git branch --show-current`
   - Atteso: `recovery/forensics-2026-03-02`.
2. Verificare commit recovery:
   - `git log --oneline -n 4`
   - Atteso: presenza di `c415a8f` e `fecedb3`.
3. Verificare inventario forense:
   - aprire `_LOG/recovery/20260302-233518/recovery-source-map.tsv`
   - aprire `_LOG/recovery/20260302-233518/recovery-restore-decisions.tsv`.
4. Verificare file chiave ripristinati:
   - `git show --name-status c415a8f`
   - `git show --name-status fecedb3`.
5. Verifica tecnica minima eseguita nel turno:
   - `npx prettier --check` (segnala solo questioni di formattazione su file esistenti)
   - backend PHP non verificabile in questo ambiente: `php: command not found`.

## TURNO: LOGICA
DATA: 2026-03-03

### Attivita' svolte
- Richiesta utente: ripristino massimo possibile di tutto il sito (flusso preventivo + homepage) dopo reset.
- Eseguito riallineamento del branch operativo `main` con i commit di recovery forense:
  - `RECOVERY: stato grezzo file persi da sorgenti locali`
  - `RECOVERY: riallineato Preventivo.vue con stato locale post-reset`
  - `RECOVERY: tracciabilita forense e checklist verifica`
- Verificata anche presenza di copie locali alternative (`Spedizionefacile03`, `tuttoinsieme`) per eventuale recupero aggiuntivo; nessuna evidenza di versione piu' recente dei file chiave rispetto allo stato recuperato su disco.
- Verificata cronologia VS Code (`AppData/Roaming/Code/User/History`) per sorgente C del piano: trovate solo risorse editor/configurazione, non snapshot utili dei file applicativi chiave da ripristinare.

### File toccati in questo turno
- `_SQUADRA_DIARIO.md`
- (allineamento branch) applicati su `main` i commit recovery gia' creati.

### Verifica
1. Verificare branch corrente:
   - `git branch --show-current`
   - atteso: `main`.
2. Verificare presenza commit recovery su `main`:
   - `git log --oneline -n 8`
   - atteso: commit `4e5c14a`, `dca3796`, `9fb5732` (hash locali after cherry-pick).
3. Verificare stato working tree:
   - `git status -sb`
   - atteso: nessuna modifica tracciata non committata.
4. Verificare artefatti forensi disponibili:
   - `_LOG/recovery/20260302-233518/spedizionefacile-forensics-20260302-233518.tar.gz`
   - `_LOG/recovery/20260302-233518/recovery-restore-decisions.tsv`.
