# Mappa dei Concetti

Come si collegano tra loro i concetti principali di SpedizioneFacile.

Questa mappa ti aiuta a vedere le relazioni tra le parti del sistema. Usala come riferimento quando lavori su una funzionalita' e vuoi capire cosa tocca.


---


## 1. Il flusso utente principale

Il percorso che fa un utente dalla homepage alla consegna del pacco.

```
Utente
  |
  v
Homepage -----> Preventivo -----> Configurazione -----> Riepilogo
(index.vue)    (Preventivo.vue)   (step 1-4)           (riepilogo.vue)
                    |                  |                      |
                    v                  v                      v
              Calcolo prezzo     Indirizzi              Aggiunta al
              (peso/volume)      + Servizi              carrello
                    |                  |                      |
                    v                  v                      v
              Sessione server    Sessione server         Carrello
              (SessionController) (SessionController)   (CartController)
                                                             |
                                                             v
                                                    +--------+--------+
                                                    |                 |
                                                    v                 v
                                               Pagamento         Pagamento
                                               con carta         con portafoglio
                                               (Stripe)          (Wallet)
                                                    |                 |
                                                    v                 v
                                               Ordine creato    Ordine creato
                                               stato: pending   stato: completed
                                                    |                 |
                                                    v                 v
                                               Webhook Stripe   Evento OrderPaid
                                               conferma              |
                                                    |                 v
                                                    v            Genera etichetta
                                               Evento OrderPaid  BRT
                                                    |                 |
                                                    v                 v
                                               Genera etichetta  Spedizione in
                                               BRT               transito
                                                    |
                                                    v
                                               Spedizione in
                                               transito
                                                    |
                                                    v
                                               Tracking BRT
                                                    |
                                                    v
                                               Consegna
```


---


## 2. Le entita' del sistema e le loro relazioni

Come sono collegati i dati nel database.

```
                                User (Utente)
                                     |
                 +-------------------+-------------------+
                 |                   |                   |
                 v                   v                   v
            Order              UserAddress         WalletMovement
            (Ordine)           (Rubrica)           (Movimenti portafoglio)
                 |
        +--------+--------+
        |                 |
        v                 v
   Package            Transaction
   (Pacco)            (Pagamento)
        |
   +----+----+
   |         |
   v         v
PackageAddress  Service
(Indirizzo)     (Servizio)
x2: partenza
    e arrivo
```

### Spiegazione delle relazioni

| Da | A | Relazione | Significato |
|----|---|-----------|-------------|
| User | Order | uno-a-molti | Un utente puo' avere molti ordini |
| User | UserAddress | uno-a-molti | Un utente ha una rubrica di indirizzi |
| User | WalletMovement | uno-a-molti | Un utente ha molti movimenti di portafoglio |
| Order | Package | molti-a-molti | Un ordine contiene piu' pacchi (tabella pivot `package_order`) |
| Order | Transaction | uno-a-molti | Un ordine puo' avere piu' transazioni di pagamento |
| Package | PackageAddress | uno-a-uno (x2) | Ogni pacco ha un indirizzo di partenza e uno di destinazione |
| Package | Service | uno-a-uno | Ogni pacco ha un servizio associato (tipo, data ritiro, orario) |


---


## 3. Il calcolo del prezzo

Come viene determinato il prezzo di una spedizione.

```
         Dati inseriti dall'utente
         |                        |
         v                        v
    Peso (kg)               Dimensioni (cm)
         |                        |
         v                        v
    Fascia peso             Volume = L x P x H / 1.000.000 (in m3)
    (7 fasce)                     |
         |                        v
         v                   Fascia volume
    Prezzo peso              (7 fasce)
    (in euro)                     |
         |                        v
         |                   Prezzo volume
         |                   (in euro)
         |                        |
         +--------+---------------+
                  |
                  v
          Prezzo = MAX(prezzo peso, prezzo volume)
                  |
                  v
          + Supplemento CAP 90 (+2.50 euro se il CAP inizia con "90")
                  |
                  v
          x Quantita' colli uguali
                  |
                  v
          = Prezzo totale del collo
```

### Le 7 fasce di prezzo (peso)

| Fascia | Da | A | Prezzo |
|--------|----|---|--------|
| 1 | 0 kg | 2 kg | 8,90 euro |
| 2 | 2 kg | 5 kg | 11,90 euro |
| 3 | 5 kg | 10 kg | 14,90 euro |
| 4 | 10 kg | 25 kg | 19,90 euro |
| 5 | 25 kg | 50 kg | 29,90 euro |
| 6 | 50 kg | 75 kg | 39,90 euro |
| 7 | 75 kg | 100 kg | 49,90 euro |

Le fasce volume seguono la stessa struttura con intervalli in metri cubi.

I prezzi possono essere aggiornati dall'admin tramite la tabella `price_bands` nel database. Il composable `usePriceBands.js` li carica dall'API con cache di 5 minuti e fallback hardcoded.

### Dove avviene il calcolo

| Dove | File | Scopo |
|------|------|-------|
| Frontend | `components/Preventivo.vue` | Mostra il prezzo all'utente in tempo reale |
| Frontend | `composables/usePriceBands.js` | Carica le fasce dal server con fallback |
| Backend | `SessionController.php` | Ricalcola e salva in sessione (validazione) |
| Backend | `OrderController.php` | Calcola il prezzo finale per l'ordine |


---


## 4. Il ciclo di vita dell'ordine

Gli stati che un ordine attraversa dalla creazione alla consegna.

```
    Creazione ordine
          |
          v
    +----------+      pagamento        +-----------+     etichetta BRT    +------------+
    | PENDING  | ------- ok ---------> | PROCESSING| ------- ok -------> | IN_TRANSIT |
    | (attesa) |                       | (lavoro)  |                     | (transito) |
    +----------+                       +-----------+                     +------------+
          |                                  |                                 |
          | pagamento ko                     | annullamento               consegna ok
          v                                  v                                 |
    +----------------+                 +-----------+                           v
    | PAYMENT_FAILED |                 | CANCELLED |                    +-----------+
    | (fallito)      |                 | (annullato)|                   | COMPLETED |
    +----------------+                 +-----------+                    | (completato)|
                                                                       +-----------+
```

### Chi cambia lo stato

| Transizione | Chi la esegue | File |
|-------------|---------------|------|
| Creazione -> PENDING | Automatico | `Order.php` (metodo `booted`) |
| PENDING -> PROCESSING | Listener `MarkOrderProcessing` | `Listeners/MarkOrderProcessing.php` |
| PROCESSING -> IN_TRANSIT | Listener `GenerateBrtLabel` | `Listeners/GenerateBrtLabel.php` |
| -> COMPLETED | Admin o sistema | `AdminController.php` |
| -> CANCELLED | Utente o admin | `OrderController.php` |
| PENDING -> PAYMENT_FAILED | Listener | `Listeners/MarkOrderPaymentFailed.php` |


---


## 5. Il sistema di pagamento

Le due strade per pagare una spedizione.

```
                     Utente sceglie metodo
                            |
              +-------------+-------------+
              |                           |
              v                           v
      Carta di credito              Portafoglio virtuale
      (Stripe)                      (Wallet)
              |                           |
              v                           v
      StripeController              WalletController
      createPaymentIntent()         payWithWallet()
              |                           |
              v                           |
      Stripe (esterno)                    |
      elabora il pagamento                |
              |                           |
              v                           v
      Webhook da Stripe             Ordine stato: completed
      StripeWebhookController              |
              |                           v
              v                     Evento OrderPaid
      Ordine stato: processing             |
              |                           v
              v                     GenerateBrtLabel
      Evento OrderPaid                     |
              |                           v
              v                     Etichetta BRT
      GenerateBrtLabel
              |
              v
      Etichetta BRT
```


---


## 6. Le integrazioni esterne

SpedizioneFacile comunica con due servizi esterni.

```
    +------------------+                +------------------+
    |  SpedizioneFacile |               |  SpedizioneFacile |
    |  (Backend)        |               |  (Backend)        |
    +--------+---------+                +--------+---------+
             |                                   |
             | API REST                          | API SOAP/REST
             |                                   |
             v                                   v
    +------------------+                +------------------+
    |     STRIPE       |                |      BRT         |
    |                  |                |   (Bartolini)    |
    |  Pagamenti       |                |                  |
    |  con carta       |                |  Spedizioni      |
    +------------------+                |  Etichette       |
             |                          |  Tracking        |
             | Webhook                  |  Punti PUDO      |
             | (notifica pagamento)     +------------------+
             |
             v
    StripeWebhookController
```

### Stripe - Cosa fa

| Operazione | File | Endpoint |
|------------|------|----------|
| Crea pagamento | `StripeController.php` | `POST /api/stripe/create-payment` |
| Riceve conferma | `StripeWebhookController.php` | `POST /stripe/webhook` |
| Rimborso | `StripeController.php` | `POST /api/stripe/refund` |

### BRT - Cosa fa

| Operazione | File | Metodo |
|------------|------|--------|
| Crea spedizione | `BrtService.php` | `createShipment()` |
| Genera etichetta PDF | `BrtService.php` | (integrato in createShipment) |
| Tracking | `BrtController.php` | `tracking()` |
| Cerca punti PUDO | `BrtController.php` | `pudoSearch()` |
| Normalizza indirizzi | `BrtService.php` | `normalizeAddressForBrt()` |


---


## 7. Il flusso admin

Cosa puo' fare un amministratore.

```
    Admin loggato
         |
         v
    Dashboard (/account/amministrazione)
         |
    +----+----+----+----+----+----+
    |    |    |    |    |    |    |
    v    v    v    v    v    v    v
  Ordini  Utenti  Spedizioni  Messaggi  Prezzi  Servizi  Impostazioni
    |       |         |          |         |       |         |
    v       v         v          v         v       v         v
  Cambia  Lista    Dettaglio  Leggi/    Modifica  CRUD    Modifica
  stato   utenti   BRT       rispondi  fasce     servizi  sito
  ordine                               prezzo
    |
    +-------+-------+
    |               |
    v               v
  Rimborso      Genera
  (se possibile) etichetta
                 manuale
```


---


## 8. La struttura del codice

Come i file sono organizzati e collegati.

```
FRONTEND (Nuxt)                           BACKEND (Laravel)
nuxt-spedizionefacile-master/             laravel-spedizionefacile-main/

pages/                                    routes/
  Le pagine del sito                        api.php (rotte API)
  Ogni file = un URL                        web.php (rotte web)
       |                                         |
       | usano                                   | chiamano
       v                                         v
components/                               Controllers/
  Pezzi riutilizzabili                      Gestiscono le richieste
  di pagina                                 Validano i dati
       |                                         |
       | usano                                   | usano
       v                                         v
composables/                              Models/
  Funzioni condivise                        Descrivono le tabelle
  (carrello, sessione)                      del database
       |                                         |
       | leggono/scrivono                        | salvano/leggono
       v                                         v
stores/                                   database/migrations/
  Memoria globale                           Struttura delle tabelle
  del browser
                                          Services/
                                            Logica complessa
                                            (es. BrtService)

                                          Events/ + Listeners/
                                            Azioni automatiche
                                            (pagamento -> etichetta)
```


---


## Come usare questa mappa

Quando lavori su una funzionalita', usa questa mappa per rispondere a tre domande:

1. **Quali entita' sono coinvolte?** Guarda la sezione 2 per le relazioni tra i dati.

2. **Quale flusso sto modificando?** Guarda le sezioni 1, 4 o 5 per seguire il percorso dei dati.

3. **Quali file devo toccare?** Guarda la sezione 8 per capire dove agire nel frontend e nel backend.

Per una mappa ancora piu' dettagliata dei file, consulta la [Mappa Visuale](./MAPPA-VISUALE.md).
Per il significato dei termini, consulta il [Glossario Semplice](../GLOSSARIO-SEMPLICE.md).
