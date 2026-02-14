# Percorso Principiante

## Cosa imparerai

- Cosa e' una applicazione web
- La differenza tra frontend e backend
- Cosa e' un database
- Come funziona un'azione dell'utente, passo dopo passo
- Un esempio concreto: "L'utente crea una spedizione"


---


## 1. Cosa e' una applicazione web

Una **applicazione web** e' un programma che funziona nel browser.

Il browser e' il programma che usi per navigare su Internet.
Per esempio: Chrome, Firefox, Safari, Edge.

SpedizioneFacile e' una applicazione web.
L'utente apre il sito, inserisce i dati del pacco e paga la spedizione.
Tutto questo succede nel browser.

**Analogia semplice:**
Pensa a un ristorante.
- Il **menu** e' quello che vedi sullo schermo (il sito).
- La **cucina** e' il server che lavora dietro le quinte.
- Il **magazzino** e' il database dove si conservano gli ingredienti (i dati).

Tu guardi il menu, scegli un piatto, il cameriere porta l'ordine in cucina.
La cucina prepara il piatto e te lo porta al tavolo.

Il sito web funziona allo stesso modo.


---


## 2. Frontend e Backend

Un'applicazione web e' divisa in due parti.

### Il Frontend (la parte che vedi)

Il **frontend** e' tutto quello che vedi nel browser.

- I pulsanti
- I moduli da compilare
- I colori e le immagini
- Il testo che leggi

In SpedizioneFacile, il frontend e' scritto con **Nuxt** (basato su **Vue.js**).
I file del frontend sono nella cartella:

```
nuxt-spedizionefacile-master/
```

Ecco alcuni esempi di file frontend:

| File | Cosa fa |
|------|---------|
| `pages/index.vue` | La homepage del sito |
| `pages/contatti.vue` | La pagina "Contattaci" |
| `pages/preventivo.vue` | La pagina del preventivo |
| `components/Preventivo.vue` | Il modulo per calcolare il prezzo |
| `components/Navbar.vue` | La barra di navigazione in alto |
| `components/Footer.vue` | Il piede di pagina in basso |

### Il Backend (la parte nascosta)

Il **backend** e' la parte che lavora dietro le quinte.

Non la vedi nel browser.
Riceve le richieste, controlla i dati e risponde.

In SpedizioneFacile, il backend e' scritto con **Laravel** (basato su **PHP**).
I file del backend sono nella cartella:

```
laravel-spedizionefacile-main/
```

Ecco alcuni esempi di file backend:

| File | Cosa fa |
|------|---------|
| `app/Http/Controllers/ContactController.php` | Gestisce i messaggi di contatto |
| `app/Http/Controllers/OrderController.php` | Gestisce gli ordini |
| `app/Models/Order.php` | Descrive cos'e' un ordine |
| `app/Models/Package.php` | Descrive cos'e' un pacco |
| `routes/web.php` | Lista di tutti gli indirizzi (URL) disponibili |


---


## 3. Cosa e' un database

Il **database** e' dove il sito salva tutti i dati.

Pensa a un grande quaderno con tante tabelle.
Ogni tabella ha righe e colonne.
Ogni riga e' un dato, ogni colonna e' un tipo di informazione.

### Esempio: la tabella degli utenti

| id | name | surname | email | role |
|----|------|---------|-------|------|
| 1 | Mario | Rossi | mario@email.it | User |
| 2 | Anna | Bianchi | anna@email.it | Admin |
| 3 | Luca | Verdi | luca@email.it | Partner Pro |

### Cosa salva SpedizioneFacile nel database

Ecco le tabelle principali:

- **users** - Le persone registrate (nome, email, password)
- **orders** - Gli ordini di spedizione (stato, prezzo, dati BRT)
- **packages** - I pacchi (peso, dimensioni, prezzo)
- **package_addresses** - Gli indirizzi di partenza e destinazione
- **services** - I servizi scelti (tipo, data ritiro, orario)
- **transactions** - I pagamenti (importo, stato, metodo)
- **contact_messages** - I messaggi dal modulo "Contattaci"
- **user_addresses** - La rubrica indirizzi degli utenti
- **wallet_movements** - I movimenti del portafoglio virtuale
- **coupons** - I codici sconto

Ogni tabella corrisponde a un **Modello** nel codice.
I modelli si trovano in:

```
laravel-spedizionefacile-main/app/Models/
```


---


## 4. Come funziona un'azione dell'utente

Quando fai qualcosa sul sito, succedono tanti passi.
Vediamo il flusso completo.

### Il percorso di una richiesta

```
 L'utente               Il browser              Il server              Il database
 (la persona)           (frontend)              (backend)              (dati salvati)
     |                      |                       |                       |
     | 1. Clicca un         |                       |                       |
     |    pulsante          |                       |                       |
     |----- click --------->|                       |                       |
     |                      |                       |                       |
     |                      | 2. Manda una           |                       |
     |                      |    richiesta API       |                       |
     |                      |-------- POST -------->|                       |
     |                      |                       |                       |
     |                      |                       | 3. Controlla           |
     |                      |                       |    i dati             |
     |                      |                       |                       |
     |                      |                       | 4. Salva nel          |
     |                      |                       |    database           |
     |                      |                       |------- INSERT ------->|
     |                      |                       |                       |
     |                      |                       |<------ OK ------------|
     |                      |                       |                       |
     |                      | 5. Risponde            |                       |
     |                      |    con i dati          |                       |
     |                      |<------- JSON ---------|                       |
     |                      |                       |                       |
     | 6. Mostra il         |                       |                       |
     |    risultato         |                       |                       |
     |<---- schermo --------|                       |                       |
```

### Spiegazione dei 6 passi

1. **L'utente clicca** un pulsante nel browser
2. **Il frontend manda** una richiesta al backend (chiamata API)
3. **Il backend controlla** che i dati siano corretti (validazione)
4. **Il backend salva** i dati nel database
5. **Il backend risponde** con un messaggio (successo o errore)
6. **Il frontend mostra** il risultato all'utente


---


## 5. Esempio concreto: "L'utente invia un messaggio di contatto"

Vediamo cosa succede quando un utente compila il modulo Contattaci.

### Passo 1 - L'utente vede il modulo

L'utente apre la pagina `/contatti`.
Il browser carica il file:

```
nuxt-spedizionefacile-master/pages/contatti.vue
```

Questo file contiene il modulo con i campi:
- Nome
- Cognome
- Email
- Telefono
- Indirizzo
- Messaggio

### Passo 2 - L'utente compila e clicca "Invia"

Quando clicca il pulsante, il frontend esegue questa funzione:

```javascript
// File: nuxt-spedizionefacile-master/pages/contatti.vue

const handleSubmit = async () => {
    await sanctum("/sanctum/csrf-cookie");   // Richiede un token di sicurezza
    await sanctum("/api/contact", {          // Invia i dati al backend
        method: "POST",
        body: contactForm.value,             // I dati del modulo
    });
};
```

Il frontend manda i dati all'indirizzo `/api/contact`.

### Passo 3 - Il backend riceve la richiesta

La **rotta** (indirizzo) `/api/contact` e' definita nel file:

```
laravel-spedizionefacile-main/routes/web.php
```

La riga e':

```php
Route::post('/contact', [ContactController::class, 'store']);
```

Questa riga dice: "Quando qualcuno manda dati a /api/contact, esegui la funzione `store` del `ContactController`."

### Passo 4 - Il controller controlla e salva

Il **controller** riceve i dati e li controlla:

```php
// File: laravel-spedizionefacile-main/app/Http/Controllers/ContactController.php

public function store(Request $request)
{
    // Controlla che i dati siano validi
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'surname' => 'required|string|max:255',
        'email' => 'required|email|max:255',
        'telephone_number' => 'nullable|string|max:255',
        'address' => 'nullable|string|max:255',
        'message' => 'required|string|max:5000',
    ]);

    // Salva nel database
    $contactMessage = ContactMessage::create($validated);
}
```

La parola `required` significa "obbligatorio".
La parola `nullable` significa "facoltativo".

### Passo 5 - Il modello salva nel database

Il **modello** `ContactMessage` descrive la tabella del database:

```php
// File: laravel-spedizionefacile-main/app/Models/ContactMessage.php

protected $fillable = [
    'name',             // Nome di chi scrive
    'surname',          // Cognome
    'email',            // Email
    'telephone_number', // Telefono
    'address',          // Indirizzo
    'message',          // Il testo del messaggio
    'read_at',          // Quando l'admin lo ha letto
];
```

### Passo 6 - Il frontend mostra il risultato

Se tutto va bene, il frontend mostra "Messaggio inviato!".
Se qualcosa va storto, mostra il messaggio di errore.

```javascript
// File: nuxt-spedizionefacile-master/pages/contatti.vue

submitSuccess.value = true;  // Mostra il messaggio di successo
```


---


## 6. Esempio concreto: "L'utente crea una spedizione"

Questo e' il flusso principale del sito. Vediamolo passo dopo passo.

### Passo 1 - L'utente apre la homepage

Il browser carica il file:

```
nuxt-spedizionefacile-master/pages/index.vue
```

La homepage mostra il componente `<Preventivo />`.
Questo componente e' il modulo per calcolare il prezzo.

```
nuxt-spedizionefacile-master/components/Preventivo.vue
```

### Passo 2 - L'utente sceglie il tipo di collo

L'utente clicca su "Pacco", "Busta", "Pallet" o "Valigia".

Il codice che gestisce questa scelta:

```javascript
// File: nuxt-spedizionefacile-master/components/Preventivo.vue

const selectPackageType = (packageType) => {
    newPackage.value.package_type = packageType.text;   // Es. "Pacco"
    newPackage.value.quantity = 1;
    userStore.packages.push(newPackage.value);           // Aggiunge alla lista
};
```

### Passo 3 - L'utente inserisce peso e dimensioni

Il sito calcola il prezzo in tempo reale.
Ci sono due calcoli:

- **Prezzo per peso**: sotto 2 kg = 9 euro, 2-5 kg = 12 euro, ecc.
- **Prezzo per volume**: calcolato dai 3 lati in centimetri

Il prezzo finale e' il **piu' alto** tra i due.

### Passo 4 - L'utente clicca "Continua"

Il frontend invia i dati al backend:

```javascript
await sanctum("/api/session/first-step", {
    method: "POST",
    body: {
        shipment_details: userStore.shipmentDetails,  // Citta' e CAP
        packages: userStore.packages,                  // I colli
    },
});
```

### Passo 5 - L'utente completa gli step successivi

L'utente passa per le pagine:

1. **Step 1** - Scelta collo, citta', peso, dimensioni (Homepage)
2. **Step 2** - Indirizzo completo, servizi aggiuntivi
3. **Step 3** - Riepilogo e pagamento

### Passo 6 - L'ordine viene creato

Quando l'utente conferma, il backend crea l'ordine:

```php
// File: laravel-spedizionefacile-main/app/Http/Controllers/OrderController.php

$order = Order::create([
    'user_id' => $userId,
    'subtotal' => $subtotalCents,    // Prezzo in centesimi
    'status' => Order::PENDING,       // Stato: in attesa di pagamento
]);
```

### Passo 7 - Il pagamento

L'utente paga con carta (Stripe) o col portafoglio virtuale.
Dopo il pagamento, lo stato dell'ordine diventa "processing" (in lavorazione).

### Passo 8 - La spedizione BRT

Il sistema genera automaticamente l'etichetta BRT.
Lo stato diventa "in_transit" (in transito).
L'utente riceve il link per tracciare il pacco.


---


## Prossimo passo

Vai a **[Come leggere il codice](./COME-LEGGERE-IL-CODICE.md)** per imparare a orientarti nei file del progetto.

Oppure vai a **[Esempio 1 - Piccola modifica](./ESEMPIO-1-PICCOLO.md)** per fare il tuo primo cambiamento.
