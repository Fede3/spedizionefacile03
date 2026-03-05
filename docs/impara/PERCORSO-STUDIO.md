# Percorso di Studio

Tre percorsi per imparare SpediamoFacile, dal primo sguardo alla padronanza completa.

Scegli il percorso in base al tuo obiettivo.


---


## Percorso A - "Capire il progetto" (2-3 ore)

### Cosa saprai fare alla fine di questo percorso

Saprai spiegare a parole tue come funziona SpediamoFacile: dalla homepage al pacco consegnato.
Saprai trovare qualsiasi file nel progetto sapendo dove cercare.
Saprai leggere un pezzo di codice e capire cosa fa, anche senza conoscere PHP o JavaScript.


---


### Tappa 1 - Panoramica generale (30 minuti)

Leggi questi due documenti nell'ordine indicato.

**Primo: [Percorso Principiante](./PERCORSO-PRINCIPIANTE.md)**

Questo documento spiega cos'e' un'applicazione web, la differenza tra frontend e backend, e cosa succede quando un utente fa un'azione sul sito. Leggi con calma le sezioni 1-4.

Dopo la lettura, rispondi a queste domande nella tua testa:

- Che differenza c'e' tra frontend e backend?
- In quale cartella si trova il codice del frontend?
- Cosa succede quando un utente clicca un pulsante sul sito?

**Secondo: [Mappa Visuale](./MAPPA-VISUALE.md)**

Questo documento mostra il progetto "dall'alto". Concentrati sulle sezioni 1-3: la struttura delle cartelle, le pagine del sito, e il percorso dell'utente.

Non serve memorizzare tutto. L'obiettivo e' avere un quadro mentale.


---


### Tappa 2 - Il linguaggio del progetto (20 minuti)

**Leggi: [Glossario Semplice](../GLOSSARIO-SEMPLICE.md)**

Non leggerlo tutto di fila. Scorri le voci e fermati su quelle che non conosci. Le voci piu' importanti sono:

- **Controller** - il "gestore" delle richieste nel backend
- **Componente** - un pezzo di pagina riutilizzabile
- **Modello** - la descrizione di una tabella del database
- **Sessione** - lo spazio temporaneo dove si salvano i dati del preventivo
- **Preventivo** - il calcolo del prezzo stimato

Tieni questo documento aperto. Ci tornerai spesso.


---


### Tappa 3 - Seguire una richiesta (30 minuti)

**Leggi: [Come Leggere il Codice](./COME-LEGGERE-IL-CODICE.md)**

Concentrati su queste sezioni:

1. La sezione 2 ("Come seguire una richiesta") - il metodo pratico per capire cosa succede quando l'utente fa qualcosa
2. La sezione 4 ("I pattern di questo progetto") - gli schemi ricorrenti che riconoscerai ovunque
3. La sezione 5 ("Tabella di orientamento rapido") - salvala nei preferiti, la userai spesso

Dopo la lettura, prova questo esercizio pratico:

Apri il file `laravel-spedizionefacile-main/routes/api.php` e cerca la rotta `/api/session/first-step`. Trovata? Adesso segui il percorso: quale controller gestisce questa rotta? Quale funzione viene chiamata?


---


### Tappa 4 - I file LEGGERE-QUI (20 minuti)

Ogni cartella importante ha un file **LEGGERE-QUI.md** che spiega cosa contiene. Leggi questi quattro nell'ordine:

1. `laravel-spedizionefacile-main/app/Http/Controllers/LEGGERE-QUI.md`
2. `laravel-spedizionefacile-main/app/Models/LEGGERE-QUI.md`
3. `nuxt-spedizionefacile-master/pages/LEGGERE-QUI.md`
4. `nuxt-spedizionefacile-master/composables/LEGGERE-QUI.md`

Per ogni file, leggi le tabelle "Quale file modificare per..." e chiediti: "Se dovessi cambiare il calcolo del prezzo, quale file aprirei?"


---


### Tappa 5 - Il flusso principale (30 minuti)

**Leggi: [Mappa dei Flussi](../architettura/MAPPA-FLUSSI.md)**

Concentrati sui primi 4 flussi:

1. Preventivo (calcolo prezzo)
2. Configurazione spedizione (gli step)
3. Carrello e checkout
4. Pagamento

Per ogni flusso, prova a identificare: quale pagina vede l'utente? Quale controller gestisce la richiesta? Quale modello salva i dati?


---


### Tappa 6 - Approfondimento facoltativo (30 minuti)

Se hai ancora tempo e curiosita', leggi uno di questi:

- [Mappa Concetti](./MAPPA-CONCETTI.md) - per vedere come i concetti si collegano tra loro
- [Domande Frequenti](./DOMANDE-FREQUENTI.md) - per trovare risposte rapide
- La sezione "Spiegazioni" della documentazione - per capire il perche' delle scelte tecniche


---


### Domande di controllo - Percorso A

Rispondi senza guardare la documentazione. Se non sai rispondere, torna alla tappa corrispondente.

1. Il frontend e' scritto con quale framework? E il backend? (Tappa 1)
2. Quando l'utente calcola un preventivo, il prezzo viene calcolato nel frontend o nel backend? (Tappa 5)
3. Se volessi aggiungere un campo alla pagina contatti, quanti file dovresti modificare? Quali? (Tappa 3)
4. Che differenza c'e' tra un controller e un modello? (Tappa 2)
5. Dove sono definite le rotte API del progetto? (Tappa 3)


---
---


## Percorso B - "Fare la prima modifica" (1-2 ore)

### Cosa saprai fare alla fine di questo percorso

Saprai modificare un elemento visivo nel frontend e verificare che funzioni.
Saprai aggiungere un campo che attraversa frontend, backend e database.
Saprai annullare una modifica se qualcosa va storto.


---


### Prerequisiti

Prima di iniziare, assicurati di:

- Avere il progetto avviato in locale (vedi `AVVIA_LOCALE.bat` oppure `scripts/avvia-locale.sh`)
- Avere un editor di codice aperto (VS Code o simile)
- Saper usare `Ctrl + F` per cercare nel file e `Ctrl + Shift + F` per cercare nel progetto

Se non hai mai letto il codice del progetto, leggi prima le Tappe 1-3 del Percorso A.


---


### Esercizio 1 - Modifica visiva (20 minuti)

**Leggi e segui: [Esempio 1 - Piccola modifica](./ESEMPIO-1-PICCOLO.md)**

Questo esercizio ti guida a cambiare il colore di un pulsante nella homepage.

Passi chiave:

1. Apri `nuxt-spedizionefacile-master/pages/index.vue`
2. Cerca `bg-[#E44203]` (il colore arancione del pulsante)
3. Cambialo con un altro colore (es. `bg-[#095866]`)
4. Salva e verifica nel browser su `http://localhost:3001`

**Cosa potrebbe andare storto:**

- Il browser non mostra la modifica. Prova a ricaricare la pagina con `Ctrl + Shift + R` (hard refresh).
- Il terminale mostra un errore. Controlla di non aver cancellato una virgoletta o un altro carattere.
- Il sito non si carica. Controlla che il comando `npm run dev` sia attivo nel terminale.

**Come annullare:**

Premi `Ctrl + Z` nell'editor per tornare indietro. Oppure rimetti il valore originale `#E44203`.


---


### Esercizio 2 - Modifica su tre livelli (40 minuti)

**Leggi e segui: [Esempio 2 - Modifica media](./ESEMPIO-2-MEDIO.md)**

Questo esercizio ti guida ad aggiungere un campo al modulo di contatto, toccando frontend, backend e database.

I tre livelli:

1. **Frontend** (`pages/contatti.vue`) - aggiungi il campo visivo e il dato nel modulo
2. **Backend** (`ContactController.php`) - aggiungi la regola di validazione
3. **Database** (`ContactMessage.php` + migrazione) - aggiungi la colonna nella tabella

**Cosa potrebbe andare storto:**

- Il dato non si salva. Controlla di aver aggiunto il campo nella lista `$fillable` del modello.
- Il backend rifiuta i dati (errore 422). Controlla che il nome del campo nel frontend corrisponda esattamente al nome nella validazione del backend.
- La migrazione fallisce. Controlla di essere nella cartella giusta (`laravel-spedizionefacile-main`) prima di eseguire `php artisan migrate`.

**Come verificare:**

Apri la pagina `/contatti` nel browser. Compila il modulo con il nuovo campo. Invia. Se non ci sono errori, la modifica funziona.

**Come annullare:**

1. Annulla le modifiche ai file con `Ctrl + Z`
2. Se hai eseguito la migrazione, annullala con `php artisan migrate:rollback`


---


### Esercizio 3 - Lettura guidata (30 minuti)

Questo esercizio non richiede modifiche. Serve a costruire la tua mappa mentale.

Apri questi file e rispondi alle domande:

**File: `nuxt-spedizionefacile-master/components/Preventivo.vue`**
- Quanti tipi di collo puo' scegliere l'utente? Quali sono?
- Come si chiama la funzione che calcola il prezzo in base al peso?
- Cosa succede quando l'utente clicca "Continua"?

**File: `laravel-spedizionefacile-main/app/Http/Controllers/SessionController.php`**
- Questa funzione `firstStep` cosa riceve dal frontend?
- Come viene calcolato il prezzo lato server?
- Il prezzo e' uguale a quello calcolato nel frontend?

**File: `laravel-spedizionefacile-main/app/Models/Order.php`**
- Quanti stati possibili ha un ordine?
- Il prezzo (`subtotal`) e' salvato in euro o in centesimi?
- Quali dati BRT vengono salvati nell'ordine?


---


### Domande di controllo - Percorso B

1. Cosa significa `bg-[#095866]` nel codice del frontend? (Esercizio 1)
2. Per aggiungere un campo al modulo contatti, quanti file devi modificare? (Esercizio 2)
3. Cosa fa la lista `$fillable` in un modello Laravel? (Esercizio 2)
4. Il prezzo nel database viene salvato in euro o in centesimi? Perche'? (Esercizio 3)
5. Se la migrazione fallisce, come puoi annullarla? (Esercizio 2)


---
---


## Percorso C - "Padroneggiare il sistema" (progressivo)

### Cosa saprai fare alla fine di questo percorso

Saprai modificare qualsiasi parte del sistema con sicurezza.
Saprai debuggare problemi complessi che attraversano frontend e backend.
Saprai aggiungere funzionalita' nuove seguendo i pattern del progetto.


---


### Livello 1 - Il flusso di acquisto (2-3 ore)

Il flusso di acquisto e' il cuore del progetto. Seguilo dall'inizio alla fine.

**Studio:**

1. Leggi la [Mappa dei Flussi](../architettura/MAPPA-FLUSSI.md) completa
2. Leggi la guida [Modificare Regole Prezzo](../guide/MODIFICARE-REGOLA-PREZZO.md)
3. Apri `components/Preventivo.vue` e leggi il commento in cima (righe 1-25). Poi cerca le funzioni `calcPriceWithWeight` e `calcPriceWithVolume`
4. Apri `composables/usePriceBands.js` e leggi come vengono caricate le fasce di prezzo dal server

**Esercizio:**

Segui il dato "peso del pacco" in tutto il sistema. Scrivi su un foglio ogni file che lo tocca, partendo dal campo di input nel frontend fino alla colonna nel database. Il percorso corretto attraversa: Preventivo.vue, userStore.js, SessionController.php, CartController.php, OrderController.php, Package.php.


---


### Livello 2 - Pagamento e ordini (2-3 ore)

Il sistema di pagamento ha due strade: Stripe (carta) e portafoglio virtuale.

**Studio:**

1. Leggi la guida [Configurare Stripe](../guide/CONFIGURARE-STRIPE.md)
2. Leggi la sezione [Perche' il Portafoglio](../spiegazioni/PERCHE-PORTAFOGLIO.md)
3. Leggi il riferimento [Stati Ordine](../riferimento/STATI-ORDINE.md)
4. Leggi il riferimento [Eventi e Listeners](../riferimento/EVENTI-LISTENERS.md)

**Esercizio:**

Disegna il diagramma di sequenza per un pagamento con carta di credito. Parti dal click su "Paga" nel frontend e arriva fino alla generazione dell'etichetta BRT. I file coinvolti sono: checkout.vue, StripeController.php, StripeWebhookController.php, OrderPaid.php, MarkOrderProcessing.php, GenerateBrtLabel.php, BrtService.php.


---


### Livello 3 - L'integrazione BRT (3-4 ore)

BRT e' il corriere. L'integrazione e' la parte piu' complessa del sistema.

**Studio:**

1. Leggi la guida [Configurare BRT](../guide/CONFIGURARE-BRT.md)
2. Leggi la spiegazione [Perche' Normalizzazione BRT](../spiegazioni/PERCHE-BRT-NORMALIZZAZIONE.md)
3. Leggi il riferimento [Errori BRT](../riferimento/ERRORI-BRT.md)
4. Apri `app/Services/BrtService.php` e leggi il file `LEGGERE-QUI.md` nella cartella Services

**Esercizio:**

Apri `BrtService.php` e cerca il metodo `createShipment()`. Leggi il payload che viene inviato a BRT (il grande array con tutti i dati della spedizione). Per ogni campo del payload, trova da dove arriva il dato originale: dal modello Order, dal modello Package, o dal modello PackageAddress.


---


### Livello 4 - Sistema utenti e ruoli (2 ore)

Il sistema ha tre ruoli: User, Admin, Partner Pro.

**Studio:**

1. Apri `app/Models/User.php` e leggi i metodi `walletBalance()` e `commissionBalance()`
2. Leggi `app/Http/Controllers/WalletController.php` per capire la ricarica
3. Leggi `app/Http/Controllers/ReferralController.php` per capire il sistema referral
4. Apri `app/Http/Middleware/CheckAdmin.php` per capire il controllo accesso

**Esercizio:**

Scrivi la lista completa delle azioni che un Admin puo' fare ma un User normale no. Poi scrivi le azioni esclusive del Partner Pro. Verifica la tua lista confrontandola con le rotte protette dal middleware `admin` nel file `routes/api.php`.


---


### Livello 5 - Architettura completa (progressivo)

Questo livello non ha una durata definita. Lo completi nel tempo.

**Studio:**

1. Leggi tutta la cartella [Spiegazioni](../spiegazioni/) - il perche' di ogni scelta tecnica
2. Leggi tutta la cartella [Architettura](../architettura/) - moduli, glossario, mappe dati
3. Leggi la guida [Debugging](../guide/DEBUGGING.md) - errori comuni e soluzioni
4. Leggi la guida [Aggiungere un Servizio](../guide/AGGIUNGERE-SERVIZIO.md) per capire il processo completo

**Esercizio:**

Leggi e segui l'[Esempio 3 - Modifica grande](./ESEMPIO-3-GRANDE.md) per aggiungere una funzionalita' che attraversa tutto il sistema. Poi prova a inventare una funzionalita' simile e progettala su carta prima di implementarla.


---


### Domande di controllo - Percorso C

1. Qual e' la formula per calcolare il prezzo di una spedizione? Cosa succede se il volume "pesa" piu' del peso reale? (Livello 1)
2. Cosa succede esattamente quando Stripe conferma un pagamento? Quanti listener si attivano? (Livello 2)
3. Perche' gli indirizzi devono essere "normalizzati" prima di inviarli a BRT? (Livello 3)
4. Come funziona il portafoglio virtuale? Da dove arrivano i soldi? (Livello 4)
5. Se dovessi aggiungere un nuovo corriere (non BRT), quali file dovresti creare o modificare? (Livello 5)


---
---


## Stato attuale della documentazione

Questa sezione riassume lo stato della documentazione esistente al momento della stesura di questo percorso.

### Cosa c'e' e funziona bene

La documentazione e' ampia e ben organizzata in sezioni tematiche.

**Cartella `docs/tutorial/`** - Sei tutorial progressivi dalla panoramica al primo cambiamento. Coprono bene il percorso di onboarding iniziale.

**Cartella `docs/guide/`** - Nove guide operative per attivita' specifiche (aggiungere campo, configurare BRT, debugging). Sono pratiche e contengono istruzioni passo-passo.

**Cartella `docs/riferimento/`** - Sei documenti di riferimento tecnico (API, stati ordine, modelli). Utili come consultazione rapida.

**Cartella `docs/spiegazioni/`** - Cinque documenti che spiegano le motivazioni dietro le scelte tecniche. Preziosi per capire il "perche'".

**Cartella `docs/architettura/`** - Quattro documenti su glossario, mappa dati, flussi e moduli.

**Cartella `docs/impara/`** - Sei documenti didattici: percorso principiante, come leggere il codice, mappa visuale, e tre esempi di modifica (piccola, media, grande).

**File LEGGERE-QUI.md** - Otto file nelle cartelle principali del codice (Controllers, Models, Services, Events, Listeners, pages, composables, stores). Ogni file spiega i 3 file principali della cartella, l'ordine di lettura consigliato, e una tabella "quale file modificare per...".

**Glossario Semplice** - Copre tutti i termini tecnici e di dominio con esempi dal progetto.

### Cosa potrebbe essere migliorato

**Le fasce di prezzo nella Mappa dei Flussi sono disallineate.** Il documento `architettura/MAPPA-FLUSSI.md` riporta fasce di prezzo diverse da quelle reali nel codice. Il codice usa 7 fasce (8.90, 11.90, 14.90, 19.90, 29.90, 39.90, 49.90) mentre la mappa flussi ne elenca 4 con importi diversi. Questo potrebbe confondere un nuovo lettore.

**Mancano percorsi di studio strutturati.** I documenti esistenti sono ottimi singolarmente, ma non c'era una guida che dicesse "leggi prima questo, poi questo, poi questo" in base all'obiettivo. Questo documento (PERCORSO-STUDIO.md) colma questa lacuna.

**Manca una mappa concettuale delle relazioni.** I documenti esistenti spiegano i concetti uno per uno, ma non c'era una vista che mostrasse come si collegano tra loro. Il nuovo documento MAPPA-CONCETTI.md colma questa lacuna.

**Mancano domande frequenti per nuovi sviluppatori.** Le guide spiegano come fare le cose, ma non c'era un posto dove trovare risposte rapide alle domande tipiche di chi arriva sul progetto per la prima volta. Il nuovo documento DOMANDE-FREQUENTI.md colma questa lacuna.

**I tutorial e gli esempi fanno riferimento a pagine che potrebbero essere cambiate.** Alcuni riferimenti a numeri di riga o nomi di pagine (es. `la-tua-spedizione/[step].vue`) potrebbero non corrispondere piu' al codice attuale. Una verifica periodica sarebbe utile.

### Riepilogo

| Categoria | Documenti | Stato |
|-----------|-----------|-------|
| Tutorial | 6 | Completi e ben fatti |
| Guide operative | 9 | Complete e pratiche |
| Riferimento tecnico | 6 | Completi |
| Spiegazioni | 5 | Chiari e motivati |
| Architettura | 4 | Buoni, un dato da aggiornare |
| Impara | 9 (con i nuovi) | Completi con i nuovi percorsi |
| LEGGERE-QUI | 8 | Eccellenti come punti di ingresso |
| Glossario | 1 | Completo |

La documentazione complessiva e' di buon livello. Le aree principali di miglioramento sono: mantenere i dati numerici allineati con il codice, e collegare i documenti tra loro con percorsi di lettura strutturati.
