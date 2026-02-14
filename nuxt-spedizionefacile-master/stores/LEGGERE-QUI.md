# Stores - Leggere Qui

Questa cartella contiene gli store Pinia. Uno store e una "memoria centrale" dove si salvano i dati che devono essere condivisi tra piu pagine del sito. A differenza della sessione server, lo store vive nel browser e si resetta quando la pagina viene ricaricata.

## I 3 file principali

Al momento questa cartella contiene un solo store, che e il piu importante:

1. **userStore.js** - Lo store principale dell'applicazione. Contiene tutti i dati del flusso di preventivo e configurazione spedizione: step corrente, dettagli spedizione (citta/CAP), lista pacchi, prezzo totale, servizi scelti, dati pendenti per il riepilogo, indirizzi pre-compilati, data di ritiro, e ID del pacco in modifica.

## Ordine di lettura consigliato

1. `userStore.js` - Leggere le proprieta definite (riga 27-72) per capire quali dati vengono gestiti
2. Poi cercare `useUserStore()` nelle pagine per capire come viene usato

## Quale file modificare per...

| Esigenza | File |
|----------|------|
| Aggiungere un dato globale al preventivo | `userStore.js` (aggiungere `ref()` e includerlo nel `return`) |
| Cambiare la struttura dei dettagli spedizione | `userStore.js` oggetto `shipmentDetails` (riga 29-35) |
| Aggiungere un'azione globale | `userStore.js` (aggiungere una funzione e includerla nel `return`) |

## Proprieta principali dello store

| Proprieta | Tipo | Descrizione |
|-----------|------|-------------|
| `stepNumber` | ref(number) | Step corrente del preventivo (1, 2, 3...) |
| `shipmentDetails` | ref(object) | Citta/CAP partenza e destinazione, data |
| `isQuoteStarted` | ref(boolean) | Se l'utente ha iniziato un preventivo |
| `totalPrice` | ref(number) | Prezzo totale calcolato |
| `packages` | ref(array) | Lista colli con peso, dimensioni, prezzo |
| `servicesArray` | ref(array) | Servizi aggiuntivi scelti |
| `contentDescription` | ref(string) | Descrizione contenuto del pacco |
| `pendingShipment` | ref(object) | Payload completo per riepilogo |
| `originAddressData` | ref(object) | Dati indirizzo partenza (pre-compilazione) |
| `destinationAddressData` | ref(object) | Dati indirizzo destinazione (pre-compilazione) |
| `pickupDate` | ref(string) | Data ritiro scelta |
| `editingCartItemId` | ref(number) | ID pacco in modifica (null = nuovo) |

## Note importanti

- Lo store si **resetta** al refresh della pagina. I dati persistenti devono essere salvati anche nella sessione server (tramite `SessionController`)
- Per salvare lo store tra i refresh, si potrebbe aggiungere `pinia-plugin-persistedstate` (non attualmente usato)
- Lo store NON contiene dati dell'utente loggato: quelli sono gestiti da `useSanctumAuth()`
