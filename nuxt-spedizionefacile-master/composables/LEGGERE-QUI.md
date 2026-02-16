# Composables - Leggere Qui

Questa cartella contiene i "composable" di Nuxt/Vue. Un composable e una funzione riutilizzabile che incapsula logica condivisa tra piu pagine. Si importano con `useNomeFunzione()`.

## I 3 file principali

1. **useCart.js** - Gestisce il carrello della spesa. Sceglie automaticamente l'endpoint giusto: `/api/cart` per utenti loggati, `/api/guest-cart` per ospiti. Fornisce la lista dei prodotti, la funzione di refresh, e lo stato della richiesta.
2. **useSession.js** - Gestisce la sessione del preventivo. Legge i dati temporanei dal server (`/api/session`): pacchi, indirizzi, servizi, prezzo totale, step corrente. Funziona anche per utenti non loggati.
3. **useSmartValidation.js** - Gestisce la validazione intelligente dei form con messaggi di errore in italiano.

## Ordine di lettura consigliato

1. `useSession.js` - Come vengono recuperati i dati del preventivo (il piu semplice)
2. `useCart.js` - Come funziona il carrello con switch automatico loggato/ospite
3. `useSmartValidation.js` - Come viene gestita la validazione dei form

## Quale file modificare per...

| Esigenza | File |
|----------|------|
| Cambiare gli endpoint del carrello | `useCart.js` (riga 23) |
| Aggiungere dati alla sessione | `useSession.js` |
| Modificare la validazione dei form | `useSmartValidation.js` |
| Aggiungere un nuovo composable | Creare un file `useNomeFunzione.js` in questa cartella |

## Note importanti

- I composable usano `useSanctumAuth()` per verificare se l'utente e loggato
- I composable usano `useSanctumFetch()` per fare richieste autenticate al backend
- Lo store Pinia (`../stores/userStore.js`) e diverso dai composable: lo store mantiene stato globale persistente, i composable incapsulano logica riutilizzabile
