# Glossario Semplice

## Cosa imparerai

- Il significato di ogni termine tecnico usato nel progetto
- Esempi concreti da SpediamoFacile
- Dove trovare ogni cosa nel codice


---


## Termini tecnici


### API

**Cosa significa:** Application Programming Interface. E' il modo in cui il frontend parla con il backend.

**Esempio dal progetto:** Quando invii un messaggio di contatto, il frontend chiama `/api/contact` per inviare i dati al backend.

**Dove trovarla:**
```
laravel-spedizionefacile-main/routes/web.php
laravel-spedizionefacile-main/routes/api.php
```


---


### Autenticazione

**Cosa significa:** Il processo per verificare chi sei. Cioe' il login.

**Esempio dal progetto:** L'utente inserisce email e password. Il sistema verifica che siano corretti.

**Dove trovarla:**
```
nuxt-spedizionefacile-master/pages/autenticazione.vue
laravel-spedizionefacile-main/app/Http/Controllers/CustomLoginController.php
```


---


### Backend

**Cosa significa:** La parte del sito che lavora dietro le quinte. Non la vedi nel browser. Riceve le richieste, controlla i dati, salva nel database.

**Esempio dal progetto:** Quando crei un ordine, il backend ricalcola il prezzo e salva tutto nel database.

**Dove trovarlo:**
```
laravel-spedizionefacile-main/
```


---


### Componente

**Cosa significa:** Un pezzo di pagina riutilizzabile. Come un mattoncino che puoi usare in piu' posti.

**Esempio dal progetto:** Il componente `Preventivo.vue` e' il modulo per calcolare il prezzo. Viene usato nella homepage e nella pagina preventivo.

**Dove trovarli:**
```
nuxt-spedizionefacile-master/components/
```


---


### Composable

**Cosa significa:** Una funzione riutilizzabile che puoi usare in piu' pagine. Contiene logica condivisa.

**Esempio dal progetto:** `useSession.js` gestisce la sessione del preventivo. Lo usano diverse pagine per leggere i dati della sessione.

**Dove trovarli:**
```
nuxt-spedizionefacile-master/composables/
```

Composable del progetto:
- `useSession.js` - Gestione sessione preventivo
- `useCart.js` - Gestione carrello
- `useSmartValidation.js` - Validazione intelligente dei campi
- `UseAdminImage.js` - Immagine dell'admin


---


### Controller

**Cosa significa:** Il "gestore" delle richieste nel backend. Riceve i dati dall'utente, li controlla e decide cosa fare.

**Esempio dal progetto:** `ContactController` riceve il messaggio dal modulo contatti, lo valida e lo salva.

**Dove trovarli:**
```
laravel-spedizionefacile-main/app/Http/Controllers/
```


---


### CORS

**Cosa significa:** Cross-Origin Resource Sharing. Una regola di sicurezza che dice quali siti web possono parlare con il tuo backend.

**Esempio dal progetto:** Il frontend (porta 3001) deve avere il permesso di chiamare il backend (porta 8787). CORS controlla questo permesso.

**Dove trovarlo:**
```
laravel-spedizionefacile-main/config/cors.php
```


---


### CSRF

**Cosa significa:** Cross-Site Request Forgery. Un tipo di attacco informatico. La protezione CSRF impedisce a siti malevoli di fare richieste al posto tuo.

**Esempio dal progetto:** Prima di ogni invio di dati, il frontend chiede un token CSRF con `/sanctum/csrf-cookie`. Il token dimostra che la richiesta viene dal sito vero.

**Dove trovarlo:**
```
nuxt-spedizionefacile-master/nuxt.config.ts   (configurazione sanctum.csrf)
```


---


### Database

**Cosa significa:** Il "magazzino" dove il sito salva tutti i dati in modo permanente. Organizzato in tabelle con righe e colonne.

**Esempio dal progetto:** La tabella `orders` contiene tutti gli ordini di spedizione. La tabella `users` contiene tutti gli utenti registrati.

**Dove trovare la struttura:**
```
laravel-spedizionefacile-main/database/migrations/
laravel-spedizionefacile-main/app/Models/
```


---


### Evento

**Cosa significa:** Un "segnale" che il sistema invia quando succede qualcosa di importante. Altri pezzi di codice possono ascoltare il segnale e reagire.

**Esempio dal progetto:** Quando un ordine viene pagato, il sistema invia l'evento `OrderPaid`. Il listener `GenerateBrtLabel` ascolta questo evento e genera automaticamente l'etichetta BRT.

**Dove trovarli:**
```
laravel-spedizionefacile-main/app/Events/
```


---


### Frontend

**Cosa significa:** La parte del sito che l'utente vede nel browser. I pulsanti, i moduli, i colori, le immagini.

**Esempio dal progetto:** La homepage con il modulo di preventivo, la pagina contatti con il modulo di messaggio.

**Dove trovarlo:**
```
nuxt-spedizionefacile-master/
```


---


### Listener

**Cosa significa:** Un pezzo di codice che "ascolta" un evento e reagisce quando l'evento viene emesso.

**Esempio dal progetto:** `GenerateBrtLabel` ascolta l'evento `OrderPaid` e crea l'etichetta di spedizione.

**Dove trovarli:**
```
laravel-spedizionefacile-main/app/Listeners/
```

Collegamento eventi-listener:
```
laravel-spedizionefacile-main/app/Providers/EventServiceProvider.php
```


---


### Middleware

**Cosa significa:** Un "guardiano" che controlla ogni richiesta prima che arrivi al controller. Puo' bloccare la richiesta o lasciarla passare.

**Esempio dal progetto:** `CheckAdmin` verifica che l'utente sia un amministratore. Se non lo e', blocca la richiesta con errore 403.

**Dove trovarli:**
```
laravel-spedizionefacile-main/app/Http/Middleware/
```

Middleware del progetto:
- `CheckAdmin.php` - Controlla se e' un amministratore
- `CheckCart.php` - Controlla se il carrello non e' vuoto
- `SecurityHeaders.php` - Aggiunge intestazioni di sicurezza


---


### Migrazione

**Cosa significa:** Un file che modifica la struttura del database. Aggiunge o rimuove tabelle e colonne.

**Esempio dal progetto:** La migrazione `create_orders_table` ha creato la tabella degli ordini nel database.

**Dove trovarle:**
```
laravel-spedizionefacile-main/database/migrations/
```


---


### Modello

**Cosa significa:** Un file che descrive una tabella del database. Dice quali campi ha la tabella e come si collega ad altre tabelle.

**Esempio dal progetto:** `Order.php` descrive la tabella degli ordini. Dice che un ordine ha: status, user_id, subtotal, ecc.

**Dove trovarli:**
```
laravel-spedizionefacile-main/app/Models/
```


---


### Rotta

**Cosa significa:** Un indirizzo (URL) a cui il sito risponde. Ogni rotta dice cosa succede quando qualcuno visita quell'indirizzo.

**Esempio dal progetto:** La rotta `POST /api/contact` dice che quando si inviano dati a quell'indirizzo, il `ContactController` li gestisce.

**Dove trovarle:**
```
laravel-spedizionefacile-main/routes/web.php     (rotte principali)
laravel-spedizionefacile-main/routes/api.php     (rotte aggiuntive)
```


---


### Sessione

**Cosa significa:** Uno spazio temporaneo sul server dove si salvano dati per un visitatore specifico. Si cancella quando chiude il browser.

**Esempio dal progetto:** I dati del preventivo in corso (pacchi, citta', CAP) vengono salvati nella sessione. Cosi' non si perdono quando l'utente cambia pagina.

**Dove trovarla:**
```
nuxt-spedizionefacile-master/composables/useSession.js
laravel-spedizionefacile-main/app/Http/Controllers/SessionController.php
```


---


### Store

**Cosa significa:** La "memoria condivisa" del frontend. E' un posto dove tutte le pagine possono leggere e scrivere dati.

**Esempio dal progetto:** `userStore.js` contiene i dati del preventivo: i pacchi aggiunti, il prezzo totale, le citta' di partenza e destinazione.

**Dove trovarlo:**
```
nuxt-spedizionefacile-master/stores/userStore.js
```


---


### Token

**Cosa significa:** Una "parola segreta" temporanea che dimostra la tua identita'. Come un braccialetto al concerto: dimostra che hai pagato il biglietto.

**Esempio dal progetto:** Dopo il login, il sistema crea un token per l'utente. Ogni richiesta successiva include il token per dimostrare che l'utente e' loggato.

**Dove trovarlo:**
```
nuxt-spedizionefacile-master/nuxt.config.ts   (configurazione sanctum)
```


---


### Webhook

**Cosa significa:** Un messaggio automatico che un servizio esterno invia al tuo server quando succede qualcosa.

**Esempio dal progetto:** Stripe (il servizio di pagamento) invia un webhook al backend quando un pagamento va a buon fine. Il backend aggiorna lo stato dell'ordine.

**Dove trovarlo:**
```
laravel-spedizionefacile-main/app/Http/Controllers/StripeWebhookController.php
```


---


## Termini del dominio (spedizioni)


### CAP

**Cosa significa:** Codice di Avviamento Postale. Un numero di 5 cifre che identifica una zona geografica in Italia.

**Esempio dal progetto:** L'utente inserisce il CAP di partenza e destinazione nel modulo preventivo. Il sistema usa il CAP per calcolare la rotta della spedizione.

**Dove trovarlo:**
```
nuxt-spedizionefacile-master/components/Preventivo.vue    (campo origin_postal_code)
laravel-spedizionefacile-main/app/Models/Location.php     (tabella dei CAP)
```


---


### Collo

**Cosa significa:** Un singolo "pezzo" da spedire. Un pacco, una busta, un pallet o una valigia.

**Esempio dal progetto:** L'utente puo' aggiungere piu' colli alla stessa spedizione. Ogni collo ha peso, dimensioni e un prezzo.

**Dove trovarlo:**
```
laravel-spedizionefacile-main/app/Models/Package.php
nuxt-spedizionefacile-master/components/Preventivo.vue
```


---


### Contrassegno

**Cosa significa:** Il pagamento "alla consegna". Il destinatario paga quando riceve il pacco. In inglese: Cash On Delivery (COD).

**Esempio dal progetto:** L'ordine ha un campo `is_cod` (vero/falso) e `cod_amount` (importo da incassare).

**Dove trovarlo:**
```
laravel-spedizionefacile-main/app/Models/Order.php    (campi is_cod, cod_amount)
```


---


### Corriere

**Cosa significa:** L'azienda che trasporta fisicamente i pacchi. In SpediamoFacile, il corriere principale e' **BRT** (Bartolini).

**Esempio dal progetto:** Quando l'ordine viene pagato, il sistema crea una spedizione nel sistema BRT e genera l'etichetta.

**Dove trovarlo:**
```
laravel-spedizionefacile-main/app/Http/Controllers/BrtController.php
laravel-spedizionefacile-main/app/Listeners/GenerateBrtLabel.php
```


---


### Etichetta

**Cosa significa:** Il foglio da stampare e attaccare al pacco. Contiene: mittente, destinatario, codice a barre per il tracking.

**Esempio dal progetto:** L'etichetta BRT viene generata automaticamente dopo il pagamento. Viene salvata come file PDF codificato nel campo `brt_label_base64`.

**Dove trovarlo:**
```
laravel-spedizionefacile-main/app/Models/Order.php    (campo brt_label_base64)
laravel-spedizionefacile-main/app/Http/Controllers/BrtController.php    (downloadLabel)
```


---


### Pacco

**Cosa significa:** Uno dei tipi di collo. Una scatola con dentro degli oggetti.

**Esempio dal progetto:** L'utente seleziona "Pacco" come tipo nel modulo preventivo. Il sistema calcola il prezzo in base a peso e dimensioni.

**Dove trovarlo:**
```
laravel-spedizionefacile-main/app/Models/Package.php
```


---


### Partner Pro

**Cosa significa:** Un utente speciale che ha un codice referral e guadagna commissioni quando altri utenti usano il suo codice.

**Esempio dal progetto:** Un Partner Pro condivide il suo codice (es. "AB3K9XZ2"). Quando qualcuno lo usa per una spedizione, il Partner Pro guadagna una commissione.

**Dove trovarlo:**
```
laravel-spedizionefacile-main/app/Models/User.php              (ruolo "Partner Pro")
laravel-spedizionefacile-main/app/Http/Controllers/ReferralController.php
laravel-spedizionefacile-main/app/Http/Controllers/ProRequestController.php
```


---


### Portafoglio

**Cosa significa:** Un saldo virtuale che l'utente puo' ricaricare e usare per pagare le spedizioni.

**Esempio dal progetto:** L'utente ricarica il portafoglio con carta di credito. Poi paga le spedizioni con il saldo disponibile.

**Dove trovarlo:**
```
nuxt-spedizionefacile-master/pages/account/portafoglio.vue
laravel-spedizionefacile-main/app/Http/Controllers/WalletController.php
laravel-spedizionefacile-main/app/Models/WalletMovement.php
```


---


### Preventivo

**Cosa significa:** Il calcolo del prezzo stimato per una spedizione, prima di pagare.

**Esempio dal progetto:** L'utente inserisce tipo di collo, peso, dimensioni e citta'. Il sistema calcola il prezzo e lo mostra.

**Dove trovarlo:**
```
nuxt-spedizionefacile-master/components/Preventivo.vue
nuxt-spedizionefacile-master/pages/preventivo.vue
```


---


### PUDO

**Cosa significa:** Pick Up Drop Off. Un punto di ritiro dove il destinatario puo' andare a prendere il pacco (invece di riceverlo a casa).

**Esempio dal progetto:** L'utente puo' scegliere un punto PUDO BRT come destinazione. Il campo `brt_pudo_id` nell'ordine salva l'ID del punto scelto.

**Dove trovarlo:**
```
laravel-spedizionefacile-main/app/Http/Controllers/BrtController.php   (pudoSearch, pudoNearby)
laravel-spedizionefacile-main/app/Models/Order.php                     (campo brt_pudo_id)
```


---


### Referral

**Cosa significa:** Un sistema di "passaparola" dove un utente condivide un codice sconto. Chi lo usa riceve uno sconto. Chi lo ha condiviso riceve una commissione.

**Esempio dal progetto:** I Partner Pro hanno un codice referral personale. Lo condividono con amici o clienti.

**Dove trovarlo:**
```
laravel-spedizionefacile-main/app/Http/Controllers/ReferralController.php
laravel-spedizionefacile-main/app/Models/ReferralUsage.php
```


---


### Spedizione

**Cosa significa:** L'intero processo di invio di uno o piu' colli da un indirizzo a un altro.

**Esempio dal progetto:** Una spedizione contiene: colli (pacchi), indirizzo di partenza, indirizzo di destinazione, servizio scelto e stato attuale.

**Dove trovarlo:**
```
laravel-spedizionefacile-main/app/Models/Order.php      (l'ordine rappresenta la spedizione)
laravel-spedizionefacile-main/app/Models/Package.php     (i colli della spedizione)
```


---


### Tracking

**Cosa significa:** Il tracciamento della spedizione. Permette di sapere dove si trova il pacco in ogni momento.

**Esempio dal progetto:** Dopo la creazione dell'etichetta BRT, l'utente riceve un link di tracking. Puo' anche usare la pagina pubblica "Traccia spedizione".

**Dove trovarlo:**
```
nuxt-spedizionefacile-master/pages/traccia-spedizione.vue
laravel-spedizionefacile-main/app/Http/Controllers/BrtController.php   (tracking, publicTracking)
laravel-spedizionefacile-main/app/Models/Order.php                     (campo brt_tracking_url)
```


---


## Prossimo passo

Torna al **[Percorso principiante](./impara/PERCORSO-PRINCIPIANTE.md)** per rivedere le basi.

Oppure vai alla **[Mappa visuale](./impara/MAPPA-VISUALE.md)** per vedere il progetto dall'alto.
