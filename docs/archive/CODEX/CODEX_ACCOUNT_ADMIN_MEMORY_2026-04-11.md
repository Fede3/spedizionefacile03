# CODEX ACCOUNT ADMIN MEMORY - 11 Aprile 2026

> Questo file serve a far ripartire una nuova sessione con il massimo contesto possibile sull'area `account/admin`.
> Va letto dopo:
> 1. [AGENTS.md](C:/Users/Feder/Desktop/spedizionefacile/AGENTS.md)
> 2. [CODEX_RESTART_PACKET_2026-04-11.md](C:/Users/Feder/Desktop/spedizionefacile/CODEX_RESTART_PACKET_2026-04-11.md)
> 3. [CODEX_HANDOFF_COMPLETO.md](C:/Users/Feder/Desktop/spedizionefacile/CODEX_HANDOFF_COMPLETO.md)
>
> Questo documento NON sostituisce quei file: li completa con il dettaglio operativo dell'11 aprile.

---

## 1. Gerarchia reale delle fonti

Per le prossime sessioni, la gerarchia corretta e' questa:

1. [AGENTS.md](C:/Users/Feder/Desktop/spedizionefacile/AGENTS.md)
2. [CODEX_RESTART_PACKET_2026-04-11.md](C:/Users/Feder/Desktop/spedizionefacile/CODEX_RESTART_PACKET_2026-04-11.md)
3. [CODEX_HANDOFF_COMPLETO.md](C:/Users/Feder/Desktop/spedizionefacile/CODEX_HANDOFF_COMPLETO.md)
4. Questo file: [CODEX_ACCOUNT_ADMIN_MEMORY_2026-04-11.md](C:/Users/Feder/Desktop/spedizionefacile/CODEX_ACCOUNT_ADMIN_MEMORY_2026-04-11.md)

Per la sola area `account/admin`, la source of truth visuale e UX/UI e':

- [C:\Users\Feder\Desktop\Prototipo](C:/Users/Feder/Desktop/Prototipo)
- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account](C:/Users/Feder/Desktop/Prototipo/src/app/components/account)
- [C:\Users\Feder\Desktop\Prototipo\src\app\components\account\admin](C:/Users/Feder/Desktop/Prototipo/src/app/components/account/admin)

Regola ferrea:

- il prototipo non e' ispirazione vaga
- il prototipo comanda su layout, gerarchia, densita', motion, chart, iconografia e ritmo visivo
- il live adatta solo token brand, route reali, dati reali, API e vincoli tecnici

---

## 2. Piano approvato da rispettare

Il piano approvato in chat va ricordato cosi:

### Fase 1
- rifare il sistema shared account/admin
- rendere [AccountRouteShell.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/account/AccountRouteShell.vue) e [account-shell.css](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/assets/css/account-shell.css) gli unici proprietari della geometria shared
- eliminare override locali che alterano baseline, distanza dalla navbar, larghezza utile, gap sidebar/contenuto, sticky e active state

### Fase 2
- porting fedele dal prototipo verso il live
- ordine rigido:
  1. `/account`
  2. `/account/amministrazione`
  3. `/account/amministrazione/ordini`
  4. `/account/amministrazione/spedizioni`
  5. `/account/amministrazione/utenti`
  6. `/account/amministrazione/messaggi`
  7. `/account/amministrazione/portafogli`
  8. `/account/amministrazione/referral`
  9. `/account/amministrazione/prezzi`
  10. `/account/bonus`, `/account/notifiche`, `/account/assistenza`, `/account/indirizzi`, `/account/profilo`, `/account/portafoglio`, `/account/carte`, `/account/spedizioni`

### Fase 3
- gate qualita' obbligatorio prima dei piani master
- stessa baseline sidebar/contenuto
- stessa distanza navbar -> shell -> primo blocco
- coerenza visiva, motion, hover, active state
- screenshot desktop/mobile, replay preview, Playwright, build verde

### Fase 4
- solo dopo la Fase 3 rileggere:
  - [PIANO_MASTER_SPEDIZIONEFACILE.md](C:/Users/Feder/Desktop/PIANO_MASTER_SPEDIZIONEFACILE.md)
  - [ANALISI_SPEDIZIONEFACILE_COMPLETA.md](C:/Users/Feder/Desktop/ANALISI_SPEDIZIONEFACILE_COMPLETA.md)
- fare matrice: gia fatto / parzialmente fatto / non fatto / da scartare

### Fase 5
- backlog residuo in ordine:
  1. blocchi reali di flusso
  2. sicurezza e conformita'
  3. bug funzionali
  4. pulizia architetturale e riduzione codice
  5. feature essenziali mancanti
  6. miglioramenti competitivi

---

## 3. Regole utente da non perdere

Queste note sono state ripetute piu' volte dall'utente e NON vanno perse:

- il contenuto account/admin non deve stare appiccicato alla navbar
- il ritmo verticale deve assomigliare alle pagine pubbliche come `contatti` e `guide`
- la spaziatura deve essere studiata, fissa, proporzionata e coerente
- non deve essere ne' tutto attaccato ne' tutto esageratamente staccato
- in molte pagine il contenuto destro risultava piu' basso solo quando c'era `Torna alla dashboard`; serve una grammatica unica
- non bisogna avere dieci varianti tra breadcrumb, back link e titoli
- molti titoli e introduzioni erano finiti dentro box di sfondo in modo caotico
- la pagina `messaggi` era piu' stretta delle altre
- molti box, pannelli e componenti avevano contenuto troppo vicino ai bordi
- spesso titolo e icona erano troppo appiccicati
- la sezione `Attivita recenti` appariva anonima, come una lista piatta di righe, invece di blocchi curati coerenti con la grafica del sito
- bisogna trovare i problemi anche da soli, non aspettare solo segnalazioni manuali
- per gli audit UX/UI l'utente ha chiesto di usare tutti e 6 i subagent disponibili
- nessun commit senza permesso esplicito

---

## 4. Lavoro gia' implementato l'11 aprile

### 4.1 Shared shell e header

Sono stati toccati e riallineati:

- [components/account/AccountRouteShell.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/account/AccountRouteShell.vue)
- [assets/css/account-shell.css](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/assets/css/account-shell.css)
- [components/account/AccountPageHeader.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/account/AccountPageHeader.vue)

Stato importante gia' a terra:

- offset reale tra navbar e shell account/admin
- gap desktop shared a `28px`
- compact hero normalizzato
- banda topline riservata anche quando non ci sono breadcrumb o backlink, cosi le pagine non saltano verticalmente
- struttura shared molto piu' forte tra sidebar e contenuto

### 4.2 Pagine cliente migliorate

Lavoro gia' fatto su:

- [pages/account/bonus.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/bonus.vue)
- [pages/account/portafoglio.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/portafoglio.vue)
- [pages/account/profilo.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/profilo.vue)
- [pages/account/assistenza.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/assistenza.vue)
- [pages/account/spedizioni/index.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/spedizioni/index.vue)
- [pages/account/spedizioni/[id].vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/spedizioni/[id].vue)
- [components/account/AccountWalletTopUp.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/account/AccountWalletTopUp.vue)
- [components/account/AccountWalletMovements.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/account/AccountWalletMovements.vue)
- [components/account/AccountProfiloEditForm.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/account/AccountProfiloEditForm.vue)
- [components/spedizioni/SpedizioniOrderCard.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/components/spedizioni/SpedizioniOrderCard.vue)

Interventi gia' reali:

- `bonus`: l'hero saldo non e' piu' fusa dentro al page header
- `portafoglio`: la hero wallet scura e' stata resa una vera prima sezione, separata dal titolo
- `profilo`: il form non e' piu' stretto dentro un wrapper troppo centrale
- `spedizioni`: toolbar, spacing e ordine card migliorati rispetto alla base vecchia

### 4.3 Pagine admin migliorate

Lavoro gia' fatto su:

- [pages/account/amministrazione/index.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/index.vue)
- [pages/account/amministrazione/ordini.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/ordini.vue)
- [pages/account/amministrazione/spedizioni.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/spedizioni.vue)
- [pages/account/amministrazione/utenti.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/utenti.vue)
- [pages/account/amministrazione/messaggi.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/messaggi.vue)
- [pages/account/amministrazione/portafogli.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/portafogli.vue)
- [pages/account/amministrazione/referral.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/referral.vue)
- [pages/account/amministrazione/prezzi.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/prezzi.vue)
- [pages/account/amministrazione/test-brt.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/test-brt.vue)

Interventi gia' reali:

- `ordini`: fix iniziale di riallineamento shell
- `messaggi`: pagina resa meno stretta, split piu' largo, pannelli meno compressi
- `portafogli`: KPI, filtri, tabella e righe con piu' aria interna
- `referral` e `prezzi`: header e box ripuliti da compressioni eccessive
- `test-brt`: toolbar integrata meglio nell'hero e vuoti sproporzionati ridotti
- dashboard admin: `Attivita recenti` resa meno anonima e meno simile a un dump di righe

### 4.4 Route/editor fuori standard gia' rientrati nel compact shared

Sono stati toccati per riallinearli all'header compatto shared:

- [pages/account/amministrazione/blog/nuovo.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/blog/nuovo.vue)
- [pages/account/amministrazione/blog/[id].vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/blog/[id].vue)
- [pages/account/amministrazione/guide/nuovo.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/guide/nuovo.vue)
- [pages/account/amministrazione/guide/[id].vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/guide/[id].vue)
- [pages/account/amministrazione/servizi/nuovo.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/servizi/nuovo.vue)
- [pages/account/amministrazione/servizi/[id].vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/servizi/[id].vue)

---

## 5. Verifiche gia' eseguite

### Build

Gia' eseguito con esito verde:

- `npm run build`

Note:

- sono rimasti i warning non bloccanti gia' noti su sourcemap Tailwind / Nitro e deprecazioni non introdotte in questo giro

### Playwright

Gia' passati in questa giornata i seguenti test mirati:

- `T6.1.1`
- `T6.2.1`
- `T6.3.1`
- `T6.5.1`
- `T6.5.2`
- `T6.6.1`
- `T6.6.2`
- `T6.8.1`
- `T6.9.1`
- `T6.9.2`
- `T6.10.1`
- `T7.1.1`
- `T7.1.3`
- `T7.3.1`
- `T7.4.1`
- `T7.5.1`
- `T7.6.2`

### Screenshot e metriche

Cartelle importanti da aprire:

- [output/codex/account-next-pass-2026-04-11-b](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/output/codex/account-next-pass-2026-04-11-b)
- [output/codex/account-next-pass-2026-04-11-c](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/output/codex/account-next-pass-2026-04-11-c)
- [output/codex/account-spacing-pass-2026-04-11-f](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/output/codex/account-spacing-pass-2026-04-11-f)
- [output/codex/account-admin-pass-2026-04-11-c](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/output/codex/account-admin-pass-2026-04-11-c)
- [output/codex/account-customer-pass-2026-04-11-c](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/output/codex/account-customer-pass-2026-04-11-c)

Metriche gia' emerse:

- sulle pagine cliente verificate il primo blocco e' stato portato a circa `269.8px` dal top viewport
- in una verifica shared desktop comparivano valori vicini a:
  - `navBottom: 73`
  - `frameTop: 129`
  - `sidebarTop: 149`
  - `contentTop: 129`
  - `headerTop: 141`
  - `titleTop: 175`

---

## 6. Uso dei subagent gia' richiesto dall'utente

L'utente ha chiesto esplicitamente di usare tutti e 6 i subagent per audit UX/UI.

Subagent disponibili in questa macchina:

1. Lovelace
2. Rawls
3. Ohm
4. Godel
5. Pauli
6. Hypatia

Finding gia' consolidati dagli audit:

- il problema non era solo "poco spazio", ma ritmo incoerente tra navbar, hero, box e primo blocco
- molte pagine cliente avevano header e primo contenuto fusi nello stesso layer
- `messaggi` risultava visivamente piu' stretta del resto
- `Attivita recenti` in console admin era troppo piatta e anonima
- diversi editor admin e route secondarie sfuggivano al compact shared

Regola da conservare:

- usare i subagent in loop appena c'e' un audit o una nuova passata UX/UI importante

---

## 7. Stato reale: cosa NON e' ancora chiuso

Il lavoro e' avanzato molto, ma la Fase 1-3 NON e' chiusa.

Restano ancora da rifinire o verificare con durezza:

- [pages/account/notifiche.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/notifiche.vue), ancora stratificata
- [pages/account/amministrazione/utenti.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/utenti.vue), ancora un po' densa
- [pages/account/amministrazione/prezzi.vue](C:/Users/Feder/Desktop/spedizionefacile/nuxt-spedizionefacile-master/pages/account/amministrazione/prezzi.vue), top area ancora affollata
- route admin secondarie come `coupon`, `prelievi`, `impostazioni`, `immagine-homepage`, `blog`, `guide`, `servizi` da verificare tutte con la stessa metrica
- pulizia finale della grammatica breadcrumb / back link / titolo / intro
- audit sistematico su padding interni dei box, soprattutto dove il contenuto sfiora ancora i bordi
- verifica sistematica che il lato destro non salga o scenda in base alla presenza o assenza del backlink

---

## 8. Regole operative per la prossima sessione

- non resettare nulla
- non revertare modifiche utente
- non committare nulla senza permesso esplicito
- continuare per sostituzione progressiva del vecchio sistema account/admin
- verificare sempre in preview reale `http://127.0.0.1:8787`
- fare screenshot desktop e mobile dopo ogni blocco importante
- se un fix shared migliora la situazione, promuoverlo a standard e togliere gli override locali

---

## 9. Prompt breve di ripartenza consigliato

```text
Leggi in quest'ordine:
1. C:\Users\Feder\Desktop\spedizionefacile\AGENTS.md
2. C:\Users\Feder\Desktop\spedizionefacile\CODEX_RESTART_PACKET_2026-04-11.md
3. C:\Users\Feder\Desktop\spedizionefacile\CODEX_HANDOFF_COMPLETO.md
4. C:\Users\Feder\Desktop\spedizionefacile\CODEX_ACCOUNT_ADMIN_MEMORY_2026-04-11.md

Poi continua SOLO sull'area account/admin del live.
Usa il prototipo come source of truth visuale.
Non fermarti a descrivere: implementa davvero.
Usa i 6 subagent per audit UX/UI.
Mantieni spaziatura fissa, proporzionata e coerente: non appiccicata, non sproporzionata.
Nessun commit.
```

---

## 10. Nota onesta finale

L'account/admin oggi non e' piu' nello stato caotico di inizio giornata, ma non e' ancora chiuso.

La cosa piu' importante da conservare per Claude Code e' questa:

- il problema NON era aggiungere spazio a caso
- il problema era costruire un ritmo verticale e interno coerente tra navbar, shell, header, box, sidebar e primo blocco
- ogni prossima modifica va giudicata su proporzione e coerenza, non solo sul fatto che "ora non e' piu' attaccato"
