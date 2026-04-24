# CODEX RESTART PACKET — 11 Aprile 2026

> File creato per trasferire il lavoro a una **nuova conversazione vergine** senza perdere contesto.
> Questo file sostituisce la ricostruzione manuale del contesto.
> Prima di fare qualsiasi modifica, leggere in quest'ordine:
> 1. [AGENTS.md](C:/Users/Feder/Desktop/spedizionefacile/AGENTS.md)
> 2. questo file
> 3. [CODEX_HANDOFF_COMPLETO.md](C:/Users/Feder/Desktop/spedizionefacile/CODEX_HANDOFF_COMPLETO.md)
> 4. [CODEX_ACCOUNT_ADMIN_MEMORY_2026-04-11.md](C:/Users/Feder/Desktop/spedizionefacile/CODEX_ACCOUNT_ADMIN_MEMORY_2026-04-11.md)

Aggiornamento importante dell'11 aprile:

- esiste anche un memory log operativo dettagliato da leggere obbligatoriamente:
  [CODEX_ACCOUNT_ADMIN_MEMORY_2026-04-11.md](C:/Users/Feder/Desktop/spedizionefacile/CODEX_ACCOUNT_ADMIN_MEMORY_2026-04-11.md)
- quel file contiene il lavoro gia' fatto su account/admin, le note UX/UI aggiunte dall'utente, i test gia' passati, le cartelle screenshot e i blocchi ancora aperti
- senza quel file si perde una parte importante del lavoro dell'11 aprile

---

## 1. Obiettivo immediato

L'obiettivo prioritario NON è il resto del backlog generale.

La priorità assoluta è:

1. rifare tutta l'area **`/account` cliente + admin**
2. rifare tutte le pagine interne collegate all'account
3. portarle il più possibile a parità visiva e strutturale con il **prototipo**
4. chiudere prima **UX / UI / grafica / CRO / coerenza / motion / baseline / allineamenti**
5. solo dopo riprendere:
   - [PIANO_MASTER_SPEDIZIONEFACILE.md](C:/Users/Feder/Desktop/PIANO_MASTER_SPEDIZIONEFACILE.md)
   - [ANALISI_SPEDIZIONEFACILE_COMPLETA.md](C:/Users/Feder/Desktop/ANALISI_SPEDIZIONEFACILE_COMPLETA.md)
6. solo in ultimissima coda fare anche un piano finale su:
   - dati sensibili
   - storage sicuro
   - scelta infrastruttura dati
   - GDPR 100%
   - sicurezza complessiva e governance dati

---

## 2. Source of truth

Per tutta l'area account/admin:

- **Source of truth primaria**:
  [C:\Users\Feder\Desktop\Prototipo](C:/Users/Feder/Desktop/Prototipo)

In particolare:

- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account](C:/Users/Feder/Desktop/Prototipo/src/app/components/account)
- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account\admin](C:/Users/Feder/Desktop/Prototipo/src/app/components/account/admin)

Regola ferrea:

- non usare più il prototipo come "ispirazione vaga"
- non fare più micro-fix ibridi
- fare **porting strutturale** dal prototipo al live
- adattare solo:
  - route Nuxt
  - dati reali
  - API
  - token brand del sito live

Se il prototipo è chiaramente superiore, si copia struttura, gerarchia, layout, motion, chart, composizione, densità e organizzazione.

---

## 3. Repo reale da modificare

Workspace:

- [C:\Users\Feder\Desktop\spedizionefacile](C:/Users/Feder/Desktop/spedizionefacile)

Frontend principale:

- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master)

Backend:

- [C:\Users\Feder\Desktop\spedizionefacile\laravel-spedizionefacile-main](C:/Users/Feder/Desktop/spedizionefacile/laravel-spedizionefacile-main)

---

## 4. Preview e credenziali

Base locale attiva:

- [http://127.0.0.1:8787](http://127.0.0.1:8787)

Cloudflare condiviso corrente:

- [https://furniture-bikini-confident-fossil.trycloudflare.com](https://furniture-bikini-confident-fossil.trycloudflare.com)

Stato porte da [_STATE.json](C:/Users/Feder/Desktop/spedizionefacile/_STATE.json):

- Caddy / proxy: `8787`
- Nuxt: `3001`
- Laravel: `8000`

Credenziali demo:

- Cliente: `cliente@gmail.com` / `Cliente2026!`
- Pro: `pro@ecommerce.it` / `ProUser2026!`
- Admin: `admin@spediamofacile.it` / `Admin2026!`

---

## 5. Regole ferree da rispettare

### Comunicazione e processo

- tutto in italiano
- mai committare senza permesso esplicito dell'utente
- verificare sempre la preview reale dopo modifiche importanti
- non fermarsi a descrivere il piano: implementare davvero

### Design system

- mai usare blu
- palette: teal `#095866` + arancione `#E44203` + neutri
- SVG inline sempre
- niente iconify per questi redesign

### Codice

- meno codice è meglio
- sostituire il vecchio con il nuovo, non stratificare workaround
- niente mini design system locali per ogni pagina
- ridurre override locali e far governare il layout shared

### Strategia operativa

- struttura del prototipo
- brand language del live
- coerenza assoluta di:
  - sidebar
  - page header
  - card
  - KPI
  - tabelle
  - empty state
  - grafici
  - bottoni
  - iconografia
  - hover / active / selected
  - motion

---

## 6. Problema principale attuale

Il problema NON è una singola pagina.

Il problema attuale è il **sistema shared account/admin**:

- baseline verticale diversa da pagina a pagina
- sidebar sinistra non allineata allo stesso pixel su tutte le pagine
- contenuto destro che parte a quote diverse
- varianti multiple di:
  - header
  - pannelli
  - tabelle
  - card KPI
  - empty state
  - spacing
  - icone
  - motion

Risultato:

- `/account`
- `/account/amministrazione`
- `ordini`
- `messaggi`
- `spedizioni`
- `utenti`
- `portafogli`
- `referral`
- `prezzi`
- `bonus`
- `notifiche`
- `assistenza`
- `indirizzi`
- `profilo`
- `portafoglio`
- `carte`

oggi non partono dallo stesso asse, non hanno la stessa grammatica e non sono allineate col prototipo.

---

## 7. Problemi specifici già emersi e confermati

### Shared shell

File chiave:

- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\components\account\AccountRouteShell.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/account/AccountRouteShell.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\assets\css\account-shell.css](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/assets/css/account-shell.css)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\components\account\AccountPageHeader.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/account/AccountPageHeader.vue)

Difetti:

- top baseline instabile
- sidebar troppo alta o troppo bassa a seconda della pagina
- contenuto destro non parte nello stesso punto
- alcune pagine sembrano attaccate alla navbar

### Sidebar

Difetti richiesti dall'utente:

- gruppi aperti di default
- richiudibili
- nessuna scrollbar interna
- `Console` deve essere più importante, più pieno, più leggibile
- `Esci` deve avere grafica coerente con le altre voci
- **poi congelare la grafica della sidebar**, senza cambiare stile ogni 2 ore

### Active state

Difetto segnalato:

- una voce di sistema risultava sempre selezionata anche quando non doveva
- controllare la mappa route -> active state e togliere duplicazioni o collisioni

### Console admin

File chiave:

- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\amministrazione\index.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/index.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\components\admin\AdminConsoleAnalytics.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/admin/AdminConsoleAnalytics.vue)

Difetti:

- grafico ancora troppo diverso dal prototipo
- blocchi troppo alti
- elenco `Attività recente` sterile e poco significativo
- troppi elementi ripetuti o senza gerarchia forte
- alcuni box troppo appiccicati

### Ordini

File chiave:

- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\amministrazione\ordini.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/ordini.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\components\admin\AdminOrdiniFlatView.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/admin/AdminOrdiniFlatView.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\components\admin\AdminOrdiniToolbar.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/admin/AdminOrdiniToolbar.vue)

Difetti:

- tabelle ancora non ritmate bene
- colonne sbilanciate
- toolbar/filtri troppo compressi o troppo distanti
- azioni troppo pesanti
- metadata e importi poco armonizzati
- overflow orizzontale o sensazione di compressione

### Messaggi

File chiave:

- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\amministrazione\messaggi.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/messaggi.vue)

Difetti:

- empty state troppo grande e vuoto
- split inbox/dettaglio non fedele al prototipo
- baseline diversa da altre pagine

### Spedizioni admin

File chiave:

- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\amministrazione\spedizioni.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/spedizioni.vue)

Difetti:

- header e primo blocco troppo attaccati
- toolbar non abbastanza pulita
- action weight troppo alto
- spazi e lista non abbastanza vicini al prototipo

### Pagine cliente account

Da rifare con disciplina da prototipo:

- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\profilo.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/profilo.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\bonus.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/bonus.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\notifiche.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/notifiche.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\assistenza.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/assistenza.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\indirizzi\index.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/indirizzi/index.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\portafoglio.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/portafoglio.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\carte.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/carte.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\spedizioni\index.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/spedizioni/index.vue)

---

## 8. Cosa NON fare più

- non fare più micro-fix locali di spacing senza prima sistemare il wrapper shared
- non cambiare continuamente la grafica della sidebar
- non introdurre nuovi pattern se esistono già nel prototipo
- non aggiungere box dentro box senza motivo
- non mettere 200 titoli ripetuti
- non fare layout ibridi tra prototipo e live a caso
- non alzare/abbassare singole pagine “a occhio”
- non sporcare altro il codice con override locali

---

## 9. Piano di esecuzione obbligatorio

### Fase 1 — Reset del sistema shared account/admin

Prima fissare:

- baseline verticale comune
- top spacing comune
- sidebar position comune
- page header comune
- gap sidebar/contenuto comune
- larghezza utile comune
- active state sidebar corretto

Canvas:

- max width `1280px`
- sidebar `232px`
- gap `28px`

### Fase 2 — Porting fedele dal prototipo

Ordine obbligatorio:

1. `/account`
2. `/account/amministrazione`
3. `ordini`
4. `spedizioni`
5. `utenti`
6. `messaggi`
7. `portafogli`
8. `referral`
9. `prezzi`
10. `bonus / notifiche / assistenza / indirizzi / profilo / portafoglio / carte / spedizioni`

### Fase 3 — Gate qualità

Non si passa oltre finché non è tutto coerente:

- sidebar stesso pixel
- contenuto destro stesso pixel
- stessa distanza navbar -> shell -> primo blocco
- stessa grammatica di card, tabelle, KPI, empty state, chart
- hover/active/motion coerenti
- grafico console portato al prototipo
- preview controllata davvero
- flussi testati davvero

### Fase 4 — Coda dei due piani desktop

Solo dopo chiusura account/admin:

- [PIANO_MASTER_SPEDIZIONEFACILE.md](C:/Users/Feder/Desktop/PIANO_MASTER_SPEDIZIONEFACILE.md)
- [ANALISI_SPEDIZIONEFACILE_COMPLETA.md](C:/Users/Feder/Desktop/ANALISI_SPEDIZIONEFACILE_COMPLETA.md)

Prima fare matrice:

- già fatto
- parzialmente fatto
- non fatto
- da scartare

### Fase 5 — Piano finale dati / sicurezza / GDPR

Dopo tutto il resto:

- analisi storage dati sensibili
- valutazione dove mettere dati e segreti
- scelta architettura dati sicura
- evitare locale per dati sensibili se non necessario
- valutazione infrastrutture cloud sicure
- verificare conformità GDPR 100%
- verificare sicurezza operativa e di accesso
- stilare piano finale di remediation e governance dati

---

## 10. Ricerca esterna obbligatoria

Prima dei blocchi grossi fare ricerca mirata, non generica, su:

- dashboard self-service
- gerarchia e densità di tabelle operative
- chart UX per admin console
- motion sobrio e professionale
- readability, contrast, spacing, density
- GDPR e sicurezza dei dati

Usare:

- Baymard
- NN/g
- WCAG / W3C
- WebAIM
- documentazione ufficiale dei provider usati

Ma se c'è conflitto:

- la struttura del prototipo resta il riferimento principale per account/admin

---

## 11. Verifiche obbligatorie

Per ogni blocco importante:

- controllo in preview reale `8787`
- screenshot desktop
- screenshot mobile
- confronto visivo con prototipo
- build frontend
- test Playwright account/admin/navigation

Controlli puntuali finali:

- padding
- allineamenti
- font size
- font weight
- line-height
- icone
- bordi
- ombre
- pill/badge
- spacing interni
- spacing tra blocchi
- active state
- hover
- motion
- cookie/chat/floating lane

---

## 12. Stato attuale della worktree

La repo è sporca e contiene molte modifiche non ancora finalizzate.

Prima di fare danni:

1. leggere `git diff --name-only`
2. non resettare nulla
3. non revertare modifiche utente
4. lavorare per sostituzione progressiva del sistema account/admin

La worktree è in stato intermedio e contiene:

- modifiche frontend diffuse
- modifiche backend sicurezza/pagamenti già avviate
- test e2e aggiornati
- redesign account/admin parziale e incoerente

---

## 13. File più importanti da leggere subito nella nuova conversazione

### Documenti

- [C:\Users\Feder\Desktop\spedizionefacile\AGENTS.md](C:/Users/Feder/Desktop/spedizionefacile/AGENTS.md)
- [C:\Users\Feder\Desktop\spedizionefacile\CODEX_HANDOFF_COMPLETO.md](C:/Users/Feder/Desktop/spedizionefacile/CODEX_HANDOFF_COMPLETO.md)
- [C:\Users\Feder\Desktop\spedizionefacile\CODEX_ACCOUNT_ADMIN_MEMORY_2026-04-11.md](C:/Users/Feder/Desktop/spedizionefacile/CODEX_ACCOUNT_ADMIN_MEMORY_2026-04-11.md)
- [C:\Users\Feder\Desktop\PIANO_MASTER_SPEDIZIONEFACILE.md](C:/Users/Feder/Desktop/PIANO_MASTER_SPEDIZIONEFACILE.md)
- [C:\Users\Feder\Desktop\ANALISI_SPEDIZIONEFACILE_COMPLETA.md](C:/Users/Feder/Desktop/ANALISI_SPEDIZIONEFACILE_COMPLETA.md)

### Shared account/admin

- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\components\account\AccountRouteShell.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/account/AccountRouteShell.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\components\account\AccountPageHeader.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/account/AccountPageHeader.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\assets\css\account-shell.css](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/assets/css/account-shell.css)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\utils\accountNavigation.js](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/utils/accountNavigation.js)

### Root account

- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\index.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/index.vue)

### Console admin e pagine interne

- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\amministrazione\index.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/index.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\components\admin\AdminConsoleAnalytics.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/admin/AdminConsoleAnalytics.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\amministrazione\ordini.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/ordini.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\components\admin\AdminOrdiniFlatView.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/admin/AdminOrdiniFlatView.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\amministrazione\spedizioni.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/spedizioni.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\amministrazione\utenti.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/utenti.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\amministrazione\messaggi.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/messaggi.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\amministrazione\portafogli.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/portafogli.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\amministrazione\referral.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/referral.vue)
- [C:\Users\Feder\Desktop\spedizionefacile\nuxt-spedizionefacile-master\pages\account\amministrazione\prezzi.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/prezzi.vue)

### Prototipo da confrontare

- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account\AccountLayout.tsx](C:/Users/Feder/Desktop/Prototipo/src/app/components/account/AccountLayout.tsx)
- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account\AccountPageShell.tsx](C:/Users/Feder/Desktop/Prototipo/src/app/components/account/AccountPageShell.tsx)
- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account\admin\AdminConsolePage.tsx](C:/Users/Feder/Desktop/Prototipo/src/app/components/account/admin/AdminConsolePage.tsx)
- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account\admin\AdminDashboardPage.tsx](C:/Users/Feder/Desktop/Prototipo/src/app/components/account/admin/AdminDashboardPage.tsx)
- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account\admin\AdminUtentiPage.tsx](C:/Users/Feder/Desktop/Prototipo/src/app/components/account/admin/AdminUtentiPage.tsx)
- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account\admin\AdminMessaggiPage.tsx](C:/Users/Feder/Desktop/Prototipo/src/app/components/account/admin/AdminMessaggiPage.tsx)
- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account\admin\AdminPrezziPage.tsx](C:/Users/Feder/Desktop/Prototipo/src/app/components/account/admin/AdminPrezziPage.tsx)
- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account\admin\AdminSaldiPage.tsx](C:/Users/Feder/Desktop/Prototipo/src/app/components/account/admin/AdminSaldiPage.tsx)
- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account\admin\AdminReferralPage.tsx](C:/Users/Feder/Desktop/Prototipo/src/app/components/account/admin/AdminReferralPage.tsx)
- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account\BonusPage.tsx](C:/Users/Feder/Desktop/Prototipo/src/app/components/account/BonusPage.tsx)
- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account\NotifichePage.tsx](C:/Users/Feder/Desktop/Prototipo/src/app/components/account/NotifichePage.tsx)
- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account\AssistenzaPage.tsx](C:/Users/Feder/Desktop/Prototipo/src/app/components/account/AssistenzaPage.tsx)
- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account\IndirizziPage.tsx](C:/Users/Feder/Desktop/Prototipo/src/app/components/account/IndirizziPage.tsx)
- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account\ProfiloAccount.tsx](C:/Users/Feder/Desktop/Prototipo/src/app/components/account/ProfiloAccount.tsx)
- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account\PagamentiAccount.tsx](C:/Users/Feder/Desktop/Prototipo/src/app/components/account/PagamentiAccount.tsx)
- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account\SpedizioniAccount.tsx](C:/Users/Feder/Desktop/Prototipo/src/app/components/account/SpedizioniAccount.tsx)

---

## 14. Uso dei subagent

Se la nuova conversazione ha subagent disponibili, usarli in loop.

Distribuzione consigliata:

1. shared shell + baseline
2. console + chart
3. ordini
4. messaggi + spedizioni
5. utenti + portafogli + referral + prezzi
6. pagine cliente account

Regola:

- appena un agent finisce, riutilizzarlo subito su un altro audit o sottoblocco

---

## 15. Prompt pronto per la nuova conversazione

Usare questo testo come messaggio iniziale nella chat nuova:

```text
Leggi prima questi file, in quest'ordine:

1. C:\Users\Feder\Desktop\spedizionefacile\AGENTS.md
2. C:\Users\Feder\Desktop\spedizionefacile\CODEX_RESTART_PACKET_2026-04-11.md
3. C:\Users\Feder\Desktop\spedizionefacile\CODEX_HANDOFF_COMPLETO.md
4. C:\Users\Feder\Desktop\spedizionefacile\CODEX_ACCOUNT_ADMIN_MEMORY_2026-04-11.md

Poi lavora SOLO sull'area account/admin del live seguendo come source of truth il prototipo in:
C:\Users\Feder\Desktop\Prototipo

Obiettivo:
- rifare /account e tutte le pagine interne cliente/admin
- portarle il più possibile a parità con il prototipo
- chiudere prima UX/UI/grafica/CRO/coerenza/motion
- verificare sempre in preview reale su 8787
- usare i subagent disponibili in loop
- ricordare che l'utente ha chiesto una spaziatura fissa, proporzionata e coerente: non appiccicata, non sproporzionata
- ricordare che molte note UX/UI aggiunte in corsa sono state salvate nel memory file dell'11 aprile

Regole:
- tutto in italiano
- mai committare
- mai usare blu
- SVG inline
- meno codice è meglio
- niente micro-fix ibridi
- congelare la grafica della sidebar salvo:
  - Console più forte
  - Esci coerente
- gruppi sidebar aperti di default, richiudibili, senza scrollbar interna

Prima fase obbligatoria:
- sistemare il sistema shared account/admin
- stessa baseline sidebar/contenuto su tutte le pagine
- stessa distanza navbar -> shell -> primo blocco

Poi porting pagine dal prototipo, in quest'ordine:
1. /account
2. /account/amministrazione
3. ordini
4. spedizioni
5. utenti
6. messaggi
7. portafogli
8. referral
9. prezzi
10. bonus / notifiche / assistenza / indirizzi / profilo / portafoglio / carte / spedizioni

Solo dopo chiusura perfetta account/admin:
- rileggere C:\Users\Feder\Desktop\PIANO_MASTER_SPEDIZIONEFACILE.md
- rileggere C:\Users\Feder\Desktop\ANALISI_SPEDIZIONEFACILE_COMPLETA.md
- fare matrice già fatto / parziale / non fatto / da scartare
- eseguire il backlog residuo

Solo in ultimissima coda:
- produrre piano finale dati/sicurezza/GDPR/storage sicuro
```

---

## 16. Nota onesta finale

Il lavoro già fatto sull'account/admin esiste, ma è ancora in stato ibrido e non può essere considerato chiuso.

La nuova conversazione deve partire da qui con una regola semplice:

**prima sistemare il sistema shared e il porting fedele dal prototipo, poi il resto.**
