# Domande Frequenti per Nuovi Sviluppatori

Risposte rapide alle domande piu' comuni di chi arriva sul progetto per la prima volta.

Ogni risposta e' breve (2-5 righe) con un link per approfondire.


---


## Architettura generale


### 1. Come e' strutturato il progetto?

Il progetto e' diviso in due parti separate: il frontend (Nuxt 3, nella cartella `nuxt-spedizionefacile-master/`) e il backend (Laravel 11, nella cartella `laravel-spedizionefacile-main/`). Comunicano tra loro tramite chiamate API. Il frontend mostra le pagine all'utente, il backend gestisce la logica e il database.

Approfondisci: [Mappa Visuale](./MAPPA-VISUALE.md) sezione 1, oppure [Percorso Principiante](./PERCORSO-PRINCIPIANTE.md) sezione 2.


---


### 2. Perche' il progetto usa Laravel e Nuxt separati invece di un monolite?

Laravel gestisce la logica di business, le API, i pagamenti e la comunicazione con BRT. Nuxt gestisce l'interfaccia utente con Vue.js. Separandoli, ognuno fa quello che sa fare meglio: il backend non si occupa di rendering, il frontend non si occupa di database.

Approfondisci: [Perche' questa architettura](../spiegazioni/PERCHE-QUESTA-ARCHITETTURA.md).


---


### 3. Come comunicano frontend e backend?

Il frontend chiama le API del backend con richieste HTTP (GET, POST, PUT, DELETE). L'autenticazione usa Laravel Sanctum con cookie di sessione. Prima di ogni richiesta che modifica dati, il frontend richiede un token CSRF con `/sanctum/csrf-cookie`.

Approfondisci: [API Endpoints](../riferimento/API-ENDPOINTS.md) e il file `nuxt-spedizionefacile-master/nuxt.config.ts` (sezione sanctum).


---


### 4. Dove sono definite le rotte API?

Tutte le rotte API sono nel file `laravel-spedizionefacile-main/routes/api.php`. Il file `routes/web.php` contiene solo 4 rotte speciali: la welcome page, il redirect login, il webhook Stripe, e il callback Google OAuth. Le rotte sono state spostate tutte in `api.php` per risolvere problemi di sessione tra middleware diversi.

Approfondisci: il commento in cima a `laravel-spedizionefacile-main/routes/web.php` spiega il perche'.


---


## Calcolo prezzi


### 5. Come funziona il calcolo del prezzo?

Il prezzo si basa su 7 fasce di peso e 7 fasce di volume. Si calcola il prezzo per peso e il prezzo per volume separatamente, poi si prende il piu' alto dei due. Si aggiunge un supplemento di 2,50 euro se il CAP inizia con "90". Il prezzo viene moltiplicato per la quantita' di colli uguali.

Approfondisci: [Mappa Concetti](./MAPPA-CONCETTI.md) sezione 3, oppure [Modificare Regole Prezzo](../guide/MODIFICARE-REGOLA-PREZZO.md).


---


### 6. Il prezzo viene calcolato nel frontend o nel backend?

In entrambi. Il frontend calcola il prezzo in tempo reale per mostrarlo all'utente (`components/Preventivo.vue` e `composables/usePriceBands.js`). Il backend ricalcola il prezzo in `SessionController.php` per validazione e poi in `OrderController.php` alla creazione dell'ordine. Il prezzo del backend e' quello che conta.

Approfondisci: `laravel-spedizionefacile-main/app/Http/Controllers/SessionController.php` metodo `firstStep`.


---


### 7. I prezzi nel database sono in euro o centesimi?

In centesimi. Il campo `subtotal` nel modello Order e il campo `base_price` nelle fasce prezzo sono tutti in centesimi (1000 = 10,00 euro). Il frontend lavora in euro e converte dividendo per 100. Questa convenzione evita errori di arrotondamento con i numeri decimali.

Approfondisci: `laravel-spedizionefacile-main/app/Models/Order.php` e `composables/usePriceBands.js`.


---


### 8. Come si modificano le fasce di prezzo?

L'admin puo' modificarle dal pannello di amministrazione nella pagina Prezzi (`/account/amministrazione/prezzi`). Le fasce sono salvate nella tabella `price_bands` del database. Il composable `usePriceBands.js` le carica dall'API `GET /api/public/price-bands` con una cache di 5 minuti e un fallback hardcoded in caso di errore.

Approfondisci: [Modificare Regole Prezzo](../guide/MODIFICARE-REGOLA-PREZZO.md).


---


## Carrello e ordini


### 9. Dove trovo la logica del carrello?

Il carrello ha due implementazioni: una per utenti loggati (`CartController.php`, salva nel database nella tabella `cart_user`) e una per ospiti (`GuestCartController.php`, salva nella sessione). Il composable `useCart.js` nel frontend sceglie automaticamente l'endpoint giusto in base allo stato di autenticazione.

Approfondisci: `nuxt-spedizionefacile-master/composables/useCart.js` e `laravel-spedizionefacile-main/app/Http/Controllers/CartController.php`.


---


### 10. Cosa succede quando un utente paga con carta?

Il frontend chiama `POST /api/stripe/create-payment` che crea un PaymentIntent su Stripe. L'utente inserisce i dati della carta nel form Stripe. Dopo il pagamento, Stripe invia un webhook a `POST /stripe/webhook`. Il backend riceve la conferma, cambia lo stato dell'ordine a "processing", e lancia l'evento `OrderPaid`. Due listener reagiscono: `MarkOrderProcessing` (cambia lo stato) e `GenerateBrtLabel` (genera l'etichetta di spedizione BRT).

Approfondisci: [Mappa Concetti](./MAPPA-CONCETTI.md) sezione 5, oppure [Configurare Stripe](../guide/CONFIGURARE-STRIPE.md).


---


### 11. Cosa succede quando un utente paga col portafoglio?

Il frontend chiama `WalletController.payWithWallet()`. Il backend verifica che il saldo sia sufficiente, sottrae l'importo, crea un `WalletMovement` negativo, e imposta l'ordine come "completed". Poi lancia l'evento `OrderPaid` che genera l'etichetta BRT.

Approfondisci: [Perche' il portafoglio](../spiegazioni/PERCHE-PORTAFOGLIO.md).


---


### 12. Quali sono gli stati possibili di un ordine?

Gli stati principali sono: `pending` (in attesa di pagamento), `processing` (pagamento ricevuto), `in_transit` (etichetta BRT generata, pacco in viaggio), `completed` (consegnato), `cancelled` (annullato), `payment_failed` (pagamento fallito). Il flusso normale e': pending, processing, in_transit, completed.

Approfondisci: [Stati Ordine](../riferimento/STATI-ORDINE.md).


---


## Integrazione BRT


### 13. Come funziona la comunicazione con BRT?

Tutta la logica BRT e' concentrata in `BrtService.php`. Il metodo principale e' `createShipment()`, che costruisce un payload con i dati della spedizione, lo invia alle API BRT, e riceve indietro l'etichetta PDF e il numero di tracking. Gli indirizzi vengono "normalizzati" prima dell'invio perche' BRT richiede formati specifici per citta' e province.

Approfondisci: `laravel-spedizionefacile-main/app/Services/BrtService.php` e il file `LEGGERE-QUI.md` nella stessa cartella.


---


### 14. Cosa sono i punti PUDO?

PUDO sta per "Pick Up Drop Off". Sono punti di ritiro dove il destinatario puo' andare a prendere il pacco invece di riceverlo a casa. Il metodo `pudoSearch()` in `BrtController.php` cerca i punti PUDO vicini a un indirizzo. L'ID del punto scelto viene salvato nel campo `brt_pudo_id` dell'ordine.

Approfondisci: [Errori BRT](../riferimento/ERRORI-BRT.md) e `laravel-spedizionefacile-main/app/Http/Controllers/BrtController.php`.


---


### 15. Perche' gli indirizzi devono essere normalizzati per BRT?

BRT richiede nomi di citta' e province in formato specifico. Per esempio, "Milano" deve essere "MILANO", la provincia deve essere l'abbreviazione a 2 lettere ("MI"), e alcuni caratteri speciali non sono accettati. Il metodo `normalizeAddressForBrt()` in `BrtService.php` si occupa di questa conversione.

Approfondisci: [Perche' Normalizzazione BRT](../spiegazioni/PERCHE-BRT-NORMALIZZAZIONE.md).


---


## Sessione e autenticazione


### 16. Perche' il preventivo usa le sessioni?

I dati del preventivo devono essere mantenuti anche per utenti non registrati. La sessione server e' la soluzione piu' semplice: non richiede login, funziona tra le pagine, e si pulisce automaticamente. I dati vengono salvati in sessione con `SessionController.php` e letti dal frontend con `useSession.js`.

Approfondisci: [Perche' sessioni](../spiegazioni/PERCHE-SESSIONI.md).


---


### 17. Come funziona l'autenticazione?

L'utente si registra o fa login (anche con Google OAuth). Laravel Sanctum gestisce la sessione con cookie. Il frontend usa il modulo `nuxt-auth-sanctum` per gestire login, logout, e stato di autenticazione. Il composable `useSanctumAuth()` fornisce `isAuthenticated` e i dati utente a tutte le pagine.

Approfondisci: `nuxt-spedizionefacile-master/nuxt.config.ts` (sezione sanctum) e `laravel-spedizionefacile-main/app/Http/Controllers/CustomLoginController.php`.


---


### 18. Che differenza c'e' tra lo store e la sessione?

Lo **store** (Pinia, `stores/userStore.js`) vive nel browser. Si resetta quando l'utente ricarica la pagina. Serve per condividere dati tra le pagine durante la navigazione. La **sessione** (`SessionController.php`) vive sul server. Sopravvive al refresh della pagina. I dati importanti vengono salvati in entrambi: lo store per la reattivita' del frontend, la sessione per la persistenza.

Approfondisci: `nuxt-spedizionefacile-master/stores/LEGGERE-QUI.md`.


---


## Modifiche comuni


### 19. Come si aggiunge un nuovo campo a un modello?

Servono tre passi: (1) creare una migrazione con `php artisan make:migration` per aggiungere la colonna nel database, (2) aggiungere il campo nella lista `$fillable` del modello, (3) aggiornare il frontend per mostrare o raccogliere il dato. Se il campo viene inviato tramite form, aggiungere anche la regola di validazione nel controller.

Approfondisci: [Aggiungere un campo](../guide/AGGIUNGERE-CAMPO.md) e [Esempio 2](./ESEMPIO-2-MEDIO.md).


---


### 20. Come si aggiunge una nuova pagina al frontend?

Crea un file `.vue` nella cartella `nuxt-spedizionefacile-master/pages/`. Il nome del file diventa automaticamente l'URL della pagina. Per esempio, `pages/prova.vue` diventa raggiungibile a `/prova`. Per pagine protette da login, aggiungi il middleware `definePageMeta({ middleware: ['sanctum:auth'] })`.

Approfondisci: [Aggiungere una pagina](../guide/AGGIUNGERE-PAGINA.md).


---


### 21. Come si aggiunge un nuovo servizio di spedizione?

Servono modifiche in quattro aree: (1) database (migrazione + modello), (2) backend (validazione nel controller, logica del prezzo), (3) frontend (opzione nel selettore, visualizzazione nel riepilogo), (4) admin (gestione nella pagina servizi). L'Esempio 3 della documentazione guida passo-passo.

Approfondisci: [Aggiungere un servizio](../guide/AGGIUNGERE-SERVIZIO.md) e [Esempio 3](./ESEMPIO-3-GRANDE.md).


---


## Sistema utenti


### 22. Quali ruoli utente esistono?

Tre ruoli: **User** (utente normale, puo' creare preventivi, ordini, pagare), **Admin** (accesso al pannello di amministrazione, gestione ordini, utenti, prezzi, servizi), **Partner Pro** (ha un codice referral, guadagna commissioni, puo' richiedere prelievi). Il ruolo e' salvato nel campo `role` del modello `User`.

Approfondisci: `laravel-spedizionefacile-main/app/Models/User.php`.


---


### 23. Come funziona il portafoglio virtuale?

L'utente ricarica il portafoglio con carta di credito (Stripe). Il saldo viene calcolato sommando tutti i `WalletMovement` dell'utente (ricariche positive, pagamenti negativi). Il metodo `walletBalance()` nel modello `User` calcola il saldo attuale. Il portafoglio puo' essere usato per pagare le spedizioni senza reinserire i dati della carta ogni volta.

Approfondisci: [Perche' il portafoglio](../spiegazioni/PERCHE-PORTAFOGLIO.md) e `laravel-spedizionefacile-main/app/Http/Controllers/WalletController.php`.


---


### 24. Come funziona il sistema referral?

Un Partner Pro ha un codice referral personale. Quando un nuovo utente usa quel codice durante un ordine, il Partner Pro guadagna una commissione. Le commissioni si accumulano e possono essere prelevate tramite la pagina prelievi. Il controller `ReferralController.php` gestisce la logica, il modello `ReferralUsage.php` traccia gli utilizzi.

Approfondisci: `laravel-spedizionefacile-main/app/Http/Controllers/ReferralController.php`.


---


## Debugging


### 25. Il sito non si carica, cosa faccio?

Controlla che entrambi i server siano attivi: il backend Laravel (porta 8787) e il frontend Nuxt (porta 3001). Verifica che il file `.env` del backend abbia le variabili corrette. Controlla i log di Laravel in `storage/logs/laravel.log`. Nel frontend, guarda la console del browser (F12) per errori JavaScript.

Approfondisci: [Debugging](../guide/DEBUGGING.md).


---


### 26. Dove trovo i log degli errori?

I log del backend Laravel sono in `laravel-spedizionefacile-main/storage/logs/laravel.log`. I log del frontend sono nella console del browser (F12, tab Console). Per errori di BRT specifici, controlla il campo `brt_error` nell'ordine e il campo `brt_raw_response` che contiene la risposta completa di BRT in formato JSON.

Approfondisci: [Debugging](../guide/DEBUGGING.md) e [Errori BRT](../riferimento/ERRORI-BRT.md).


---


### 27. Ricevo "Unauthenticated" dopo il login, perche'?

Questo succede quando la sessione non viene condivisa correttamente tra frontend e backend. Verifica che: (1) il file `config/cors.php` del backend includa il dominio del frontend in `allowed_origins`, (2) il file `config/sanctum.php` includa il dominio del frontend in `stateful`, (3) i cookie `XSRF-TOKEN` e `laravel_session` siano presenti nel browser (F12, tab Application, Cookies).

Approfondisci: [Debugging](../guide/DEBUGGING.md) e il file `laravel-spedizionefacile-main/config/sanctum.php`.


---


## Dove trovare le cose

### Tabella di riferimento rapido

| Cerco... | File |
|----------|------|
| La homepage | `nuxt-spedizionefacile-master/pages/index.vue` |
| Il form del preventivo | `nuxt-spedizionefacile-master/components/Preventivo.vue` |
| Il calcolo del prezzo (frontend) | `nuxt-spedizionefacile-master/composables/usePriceBands.js` |
| Il calcolo del prezzo (backend) | `laravel-spedizionefacile-main/app/Http/Controllers/SessionController.php` |
| Il carrello | `nuxt-spedizionefacile-master/composables/useCart.js` e `laravel-spedizionefacile-main/app/Http/Controllers/CartController.php` |
| Il pagamento Stripe | `laravel-spedizionefacile-main/app/Http/Controllers/StripeController.php` |
| La logica BRT | `laravel-spedizionefacile-main/app/Services/BrtService.php` |
| Gli stati dell'ordine | `laravel-spedizionefacile-main/app/Models/Order.php` |
| Le rotte API | `laravel-spedizionefacile-main/routes/api.php` |
| Il portafoglio | `laravel-spedizionefacile-main/app/Http/Controllers/WalletController.php` |
| La pagina di login | `nuxt-spedizionefacile-master/pages/autenticazione.vue` |
| Il pannello admin | `nuxt-spedizionefacile-master/pages/account/amministrazione/` |
| I modelli del database | `laravel-spedizionefacile-main/app/Models/` |
| La configurazione del frontend | `nuxt-spedizionefacile-master/nuxt.config.ts` |
| La configurazione del backend | `laravel-spedizionefacile-main/.env` |
