# Indice Documentazione - SpedizioneFacile

Mappa completa di tutta la documentazione del progetto.
Ogni documento ha un titolo, una descrizione e lo stato attuale.

**Legenda stati:**
- esistente = il file esiste ed e' compilato
- da aggiornare = il file esiste ma va rivisto
- da scrivere = il file non esiste ancora

---

## 1. Tutorial - Imparare da zero

Percorso guidato per chi non ha mai visto il progetto.
Si leggono in ordine, dal primo all'ultimo.

| Documento | Descrizione | Stato |
|-----------|-------------|-------|
| [01 - Panoramica](tutorial/01-PANORAMICA.md) | Cos'e' SpedizioneFacile e come funziona | esistente |
| [02 - Primo avvio](tutorial/02-PRIMO-AVVIO.md) | Configurare il progetto da zero sul proprio PC | esistente |
| [03 - Struttura progetto](tutorial/03-STRUTTURA-PROGETTO.md) | Dove si trovano le cartelle, i file e le convenzioni | esistente |
| [04 - Primo cambiamento](tutorial/04-PRIMO-CAMBIAMENTO.md) | Aggiungere un campo al profilo utente (esempio pratico) | esistente |
| [05 - Secondo cambiamento](tutorial/05-SECONDO-CAMBIAMENTO.md) | Aggiungere un servizio/accessorio alla spedizione | esistente |
| [06 - Terzo cambiamento](tutorial/06-TERZO-CAMBIAMENTO.md) | Modificare il flusso di checkout e pagamento | esistente |

---

## 2. Guide operative - Fare una cosa concreta

Istruzioni passo-passo per attivita' specifiche.
Si consulta solo quella che serve al momento.

| Documento | Descrizione | Stato |
|-----------|-------------|-------|
| [Aggiungere un campo](guide/AGGIUNGERE-CAMPO.md) | Come aggiungere un campo a qualsiasi modello | esistente |
| [Aggiungere un servizio](guide/AGGIUNGERE-SERVIZIO.md) | Come aggiungere un nuovo tipo di servizio spedizione | esistente |
| [Aggiungere una pagina](guide/AGGIUNGERE-PAGINA.md) | Come creare una nuova pagina nel frontend Nuxt | esistente |
| [Modificare regole prezzo](guide/MODIFICARE-REGOLA-PREZZO.md) | Come cambiare fasce di prezzo, supplementi e calcoli | esistente |
| [Configurare BRT](guide/CONFIGURARE-BRT.md) | Come configurare credenziali e servizi del corriere BRT | esistente |
| [Configurare email](guide/CONFIGURARE-EMAIL.md) | Come configurare l'invio email (Resend, Gmail, log) | esistente |
| [Configurare Stripe](guide/CONFIGURARE-STRIPE.md) | Come configurare i pagamenti Stripe | esistente |
| [Gestire stati ordine](guide/GESTIRE-STATI-ORDINE.md) | Flusso degli stati ordine e come modificarlo | esistente |
| [Debugging](guide/DEBUGGING.md) | Errori comuni e come risolverli | esistente |

---

## 3. Riferimento tecnico - Consultazione rapida

Tabelle, elenchi e specifiche.
Si consulta quando serve il dato preciso.

| Documento | Descrizione | Stato |
|-----------|-------------|-------|
| [Stati ordine](riferimento/STATI-ORDINE.md) | Lista completa degli stati con transizioni possibili | esistente |
| [Eventi e listeners](riferimento/EVENTI-LISTENERS.md) | Tutti gli eventi e i loro effetti automatici | esistente |
| [API Endpoints](riferimento/API-ENDPOINTS.md) | Lista completa delle rotte API con parametri | esistente |
| [Modelli e database](riferimento/MODELLI-DATABASE.md) | Tutti i modelli con campi, relazioni e tipi | esistente |
| [Errori BRT](riferimento/ERRORI-BRT.md) | Codici errore BRT con significato e soluzioni | esistente |
| [Variabili ambiente](riferimento/VARIABILI-AMBIENTE.md) | Tutte le variabili .env con descrizione | esistente |

---

## 4. Spiegazioni - Capire il perche'

Motivazioni dietro le scelte tecniche.
Si leggono per curiosita' o quando serve capire il contesto.

| Documento | Descrizione | Stato |
|-----------|-------------|-------|
| [Perche' questa architettura](spiegazioni/PERCHE-QUESTA-ARCHITETTURA.md) | Perche' Laravel + Nuxt separati | esistente |
| [Perche' sessioni](spiegazioni/PERCHE-SESSIONI.md) | Perche' il preventivo usa le sessioni server | esistente |
| [Perche' normalizzazione BRT](spiegazioni/PERCHE-BRT-NORMALIZZAZIONE.md) | Perche' serve normalizzare gli indirizzi per BRT | esistente |
| [Perche' il portafoglio](spiegazioni/PERCHE-PORTAFOGLIO.md) | Perche' esiste un sistema portafoglio virtuale | esistente |
| [Decisioni tecniche](spiegazioni/DECISIONI-TECNICHE.md) | Le scelte tecniche principali e le loro ragioni | esistente |

---

## Altre risorse

| Documento | Descrizione | Stato |
|-----------|-------------|-------|
| [Glossario dominio](architettura/GLOSSARIO-DOMINIO.md) | Vocabolario del progetto con significato e file di riferimento | esistente |
| [Glossario tecnico](architettura/GLOSSARIO.md) | Termini tecnici (BRT, Stripe, sessioni, eventi) | esistente |
| [Glossario semplice](GLOSSARIO-SEMPLICE.md) | Termini spiegati per chi parte da zero | esistente |
| [Mappa dati](architettura/MAPPA-DATI.md) | Come fluiscono i dati tra frontend e backend | esistente |
| [Mappa flussi](architettura/MAPPA-FLUSSI.md) | I flussi principali del sistema | esistente |
| [Moduli](architettura/MODULI.md) | I moduli dell'architettura e le loro dipendenze | esistente |

---

## Risorse per imparare

| Documento | Descrizione | Stato |
|-----------|-------------|-------|
| [Percorso principiante](impara/PERCORSO-PRINCIPIANTE.md) | Da dove partire se non conosci il progetto | esistente |
| [Come leggere il codice](impara/COME-LEGGERE-IL-CODICE.md) | Tecniche per orientarsi nel codice | esistente |
| [Mappa visuale](impara/MAPPA-VISUALE.md) | Vista dall'alto del progetto | esistente |
| [Esempio piccolo](impara/ESEMPIO-1-PICCOLO.md) | Esempio guidato di modifica piccola | esistente |
| [Esempio medio](impara/ESEMPIO-2-MEDIO.md) | Esempio guidato di modifica media | esistente |
| [Esempio grande](impara/ESEMPIO-3-GRANDE.md) | Esempio guidato di modifica grande | esistente |

---

## File LEGGERE-QUI nelle cartelle

Ogni cartella importante contiene un file `LEGGERE-QUI.md` che spiega cosa contiene, l'ordine di lettura e dove intervenire.

| File | Cartella |
|------|----------|
| [Controllers](../laravel-spedizionefacile-main/app/Http/Controllers/LEGGERE-QUI.md) | I controller del backend |
| [Services](../laravel-spedizionefacile-main/app/Services/LEGGERE-QUI.md) | I servizi di business logic |
| [Models](../laravel-spedizionefacile-main/app/Models/LEGGERE-QUI.md) | I modelli del database |
| [Composables](../nuxt-spedizionefacile-master/composables/LEGGERE-QUI.md) | Le funzioni riutilizzabili del frontend |
| [Pages](../nuxt-spedizionefacile-master/pages/LEGGERE-QUI.md) | Le pagine del frontend |
| [Stores](../nuxt-spedizionefacile-master/stores/LEGGERE-QUI.md) | La memoria condivisa del frontend |
