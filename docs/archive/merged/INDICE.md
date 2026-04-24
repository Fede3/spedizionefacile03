# Documentazione SpediamoFacile

Benvenuto nella documentazione completa del progetto SpediamoFacile.
Questa guida copre tutto: dalla panoramica del progetto fino ai dettagli tecnici.

---

## Tutorial - Imparare passo dopo passo

Parti da qui se sei nuovo al progetto.

1. [Panoramica del progetto](tutorial/01-PANORAMICA.md) - Cos'e' SpediamoFacile e come e' strutturato
2. [Primo avvio](tutorial/02-PRIMO-AVVIO.md) - Come configurare il progetto da zero
3. [Struttura del progetto](tutorial/03-STRUTTURA-PROGETTO.md) - Dove si trovano le cose: cartelle, file, convenzioni
4. [Primo cambiamento](tutorial/04-PRIMO-CAMBIAMENTO.md) - Aggiungere un campo al profilo utente
5. [Secondo cambiamento](tutorial/05-SECONDO-CAMBIAMENTO.md) - Aggiungere un nuovo servizio/accessorio alla spedizione
6. [Terzo cambiamento](tutorial/06-TERZO-CAMBIAMENTO.md) - Modificare il flusso di checkout e pagamento

---

## Guide operative - Come fare le cose

Istruzioni pratiche per le attivita' piu' comuni.

- [Aggiungere un campo](guide/AGGIUNGERE-CAMPO.md) - Come aggiungere un campo a qualsiasi modello
- [Aggiungere un servizio](guide/AGGIUNGERE-SERVIZIO.md) - Come aggiungere un nuovo servizio di spedizione
- [Aggiungere una pagina](guide/AGGIUNGERE-PAGINA.md) - Come aggiungere una nuova pagina al frontend
- [Modificare regole prezzo](guide/MODIFICARE-REGOLA-PREZZO.md) - Come cambiare le regole di calcolo prezzo
- [Configurare BRT](guide/CONFIGURARE-BRT.md) - Come configurare le credenziali e i servizi BRT
- [Configurare email](guide/CONFIGURARE-EMAIL.md) - Come configurare l'invio email (Resend, Gmail, log)
- [Configurare Stripe](guide/CONFIGURARE-STRIPE.md) - Come configurare i pagamenti Stripe
- [Gestire stati ordine](guide/GESTIRE-STATI-ORDINE.md) - Flusso degli stati ordine e come modificarlo
- [Debugging](guide/DEBUGGING.md) - Errori comuni e come risolverli

---

## Riferimento tecnico - Dettagli completi

Documentazione di riferimento per quando serve il dettaglio preciso.

- [Stati ordine](riferimento/STATI-ORDINE.md) - Lista completa degli stati con transizioni
- [Eventi e listeners](riferimento/EVENTI-LISTENERS.md) - Tutti gli eventi e i loro effetti
- [API Endpoints](riferimento/API-ENDPOINTS.md) - Lista completa delle rotte API
- [Modelli e database](riferimento/MODELLI-DATABASE.md) - Tutti i modelli con campi e relazioni
- [Errori BRT](riferimento/ERRORI-BRT.md) - Codici errore BRT con significato e soluzioni
- [Variabili ambiente](riferimento/VARIABILI-AMBIENTE.md) - Tutte le variabili .env con descrizione

---

## Spiegazioni - Perche' le cose sono fatte cosi'

Per capire le motivazioni dietro le scelte tecniche.

- [Perche' questa architettura](spiegazioni/PERCHE-QUESTA-ARCHITETTURA.md) - Perche' Laravel + Nuxt
- [Perche' sessioni](spiegazioni/PERCHE-SESSIONI.md) - Perche' il preventivo usa le sessioni
- [Perche' normalizzazione BRT](spiegazioni/PERCHE-BRT-NORMALIZZAZIONE.md) - Perche' serve normalizzare gli indirizzi
- [Perche' il portafoglio](spiegazioni/PERCHE-PORTAFOGLIO.md) - Perche' esiste un sistema portafoglio
- [Decisioni tecniche](spiegazioni/DECISIONI-TECNICHE.md) - Le scelte tecniche principali e le loro ragioni
