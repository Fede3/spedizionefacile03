# Pages - Leggere Qui

Questa cartella contiene tutte le pagine del frontend Nuxt. Ogni file `.vue` corrisponde a una pagina del sito. La struttura delle cartelle definisce automaticamente le URL (file-based routing di Nuxt).

## I 3 file principali

1. **preventivo.vue** - La pagina del preventivo dove l'utente inserisce i dati della spedizione (citta, peso, dimensioni) e vede il prezzo calcolato. Punto di ingresso principale del flusso di acquisto.
2. **checkout.vue** - La pagina di checkout dove l'utente sceglie il metodo di pagamento (carta, portafoglio, bonifico) e completa l'acquisto.
3. **index.vue** - La homepage del sito con il form "Preventivo Rapido", i servizi, le recensioni e i partner.

## Ordine di lettura consigliato

1. `index.vue` - La homepage (punto di ingresso)
2. `preventivo.vue` - Il preventivo rapido
3. `la-tua-spedizione/[step].vue` - I passaggi di configurazione
4. `riepilogo.vue` - Il riepilogo prima del pagamento
5. `carrello.vue` - La pagina del carrello
6. `checkout.vue` - Il checkout e pagamento

## Quale file modificare per...

| Esigenza | File |
|----------|------|
| Modificare la homepage | `index.vue` e i componenti in `../components/Homepage/` |
| Cambiare il form del preventivo | `preventivo.vue` o `../components/Homepage/PreventivoRapido.vue` |
| Modificare i passaggi di configurazione | `la-tua-spedizione/[step].vue` |
| Cambiare la pagina del carrello | `carrello.vue` |
| Modificare il checkout/pagamento | `checkout.vue` |
| Cambiare la pagina di login | `autenticazione.vue` |
| Cambiare la registrazione | `registrazione.vue` |
| Aggiungere una pagina nell'area account | Creare un file in `account/` |
| Modificare il tracking pubblico | `traccia-spedizione.vue` |
| Modificare il profilo utente | `account/profilo.vue` |
| Modificare la lista spedizioni | `account/spedizioni/index.vue` |
| Modificare il dettaglio spedizione | `account/spedizioni/[id].vue` |
| Modificare il portafoglio | `account/portafoglio.vue` |
| Modificare la pagina contatti | `contatti.vue` |

## Struttura URL -> File

| URL | File |
|-----|------|
| `/` | `index.vue` |
| `/preventivo` | `preventivo.vue` |
| `/la-tua-spedizione/1` | `la-tua-spedizione/[step].vue` |
| `/carrello` | `carrello.vue` |
| `/riepilogo` | `riepilogo.vue` |
| `/checkout` | `checkout.vue` |
| `/autenticazione` | `autenticazione.vue` |
| `/registrazione` | `registrazione.vue` |
| `/account` | `account/index.vue` |
| `/account/spedizioni` | `account/spedizioni/index.vue` |
| `/account/spedizioni/42` | `account/spedizioni/[id].vue` |
| `/account/portafoglio` | `account/portafoglio.vue` |
| `/traccia-spedizione` | `traccia-spedizione.vue` |
| `/contatti` | `contatti.vue` |
| `/servizi` | `servizi/index.vue` |
