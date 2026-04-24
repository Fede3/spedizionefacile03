# Come leggere il codice

## Cosa imparerai

- Cosa sono variabili, funzioni e classi
- Come seguire una richiesta dall'URL alla risposta
- Come usare la ricerca per trovare le cose
- I pattern (schemi ripetuti) usati in questo progetto
- Da dove iniziare per capire ogni parte del sistema


---


## 1. I mattoni del codice

### Variabili

Una **variabile** e' un contenitore con un nome.
Contiene un dato che puo' cambiare.

**Esempio dal progetto (JavaScript, frontend):**

```javascript
// File: nuxt-spedizionefacile-master/stores/userStore.js

const totalPrice = ref(0);
```

- `totalPrice` e' il nome della variabile
- `0` e' il valore iniziale (il prezzo parte da zero)
- `ref()` rende la variabile "reattiva" (la pagina si aggiorna quando cambia)

**Esempio dal progetto (PHP, backend):**

```php
// File: laravel-spedizionefacile-main/app/Http/Controllers/OrderController.php

$subtotalCents = 0;
```

- `$subtotalCents` e' il nome della variabile (in PHP le variabili iniziano con `$`)
- `0` e' il valore iniziale

### Funzioni

Una **funzione** e' un blocco di istruzioni con un nome.
La chiami quando vuoi eseguire quelle istruzioni.

**Esempio dal progetto (JavaScript):**

```javascript
// File: nuxt-spedizionefacile-master/components/Preventivo.vue

const calcPriceWithWeight = (pack) => {
    // ... calcola il prezzo in base al peso ...
};
```

- `calcPriceWithWeight` e' il nome della funzione
- `pack` e' il parametro: i dati del pacco
- Il codice dentro `{ }` e' il corpo della funzione

**Esempio dal progetto (PHP):**

```php
// File: laravel-spedizionefacile-main/app/Http/Controllers/ContactController.php

public function store(Request $request)
{
    // ... salva il messaggio di contatto ...
}
```

- `store` e' il nome della funzione
- `Request $request` e' il parametro: i dati della richiesta
- `public` significa che puo' essere chiamata dall'esterno

### Classi

Una **classe** e' un contenitore che raggruppa variabili e funzioni.

Pensa a una classe come a un modulo di un ufficio.
Il modulo contiene tutti i dati (variabili) e le azioni (funzioni) legate a un argomento.

**Esempio dal progetto:**

```php
// File: laravel-spedizionefacile-main/app/Models/Order.php

class Order extends Model
{
    protected $fillable = ['status', 'user_id', 'subtotal'];    // Dati

    public function user() { ... }           // Azione: trova l'utente
    public function packages() { ... }       // Azione: trova i pacchi
}
```

- `Order` e' il nome della classe
- `extends Model` significa che "eredita" le funzionalita' di Model (un modello di Laravel)
- Dentro ci sono sia dati (`$fillable`) che funzioni (`user()`, `packages()`)


---


## 2. Come seguire una richiesta

Quando vuoi capire cosa succede quando un utente fa un'azione:

### Passo 1 - Parti dall'URL

Ogni azione corrisponde a un indirizzo (URL).

Per esempio:
- `POST /api/contact` = invia un messaggio di contatto
- `GET /api/orders` = mostra la lista ordini
- `POST /api/session/first-step` = salva il primo step del preventivo

### Passo 2 - Trova la rotta

Le rotte (gli indirizzi) sono definite in due file:

```
laravel-spedizionefacile-main/routes/web.php     (rotte principali)
laravel-spedizionefacile-main/routes/api.php     (rotte aggiuntive)
```

Cerca l'URL nel file delle rotte. Troverai una riga come:

```php
Route::post('/contact', [ContactController::class, 'store']);
```

Questa riga dice:
- Metodo: `POST` (invio di dati)
- URL: `/contact`
- Controller: `ContactController`
- Funzione: `store`

### Passo 3 - Vai al controller

Il controller e' nella cartella:

```
laravel-spedizionefacile-main/app/Http/Controllers/
```

Apri il file indicato nella rotta. Per esempio `ContactController.php`.
Cerca la funzione indicata. Per esempio `store`.

### Passo 4 - Leggi la funzione

La funzione del controller fa tre cose:

1. **Riceve** i dati dalla richiesta
2. **Controlla** che i dati siano validi (validazione)
3. **Risponde** con un risultato

### Passo 5 - Trova il modello

Se la funzione salva o legge dati, usa un modello.
I modelli sono nella cartella:

```
laravel-spedizionefacile-main/app/Models/
```

Il modello ti dice quali campi ha la tabella del database.


---


## 3. Come usare la ricerca

La ricerca e' lo strumento piu' importante per leggere il codice.

### Ricerca nel file aperto

- **Premi** `Ctrl + F` (Windows) o `Cmd + F` (Mac)
- **Scrivi** il testo che cerchi
- **Premi Invio** per saltare alla corrispondenza successiva

**Quando usarla:** quando sai in quale file cercare.

### Ricerca in tutto il progetto

- **Premi** `Ctrl + Shift + F` (Windows) o `Cmd + Shift + F` (Mac)
- **Scrivi** il testo che cerchi
- Vedrai tutti i file che contengono quel testo

**Quando usarla:** quando non sai in quale file cercare.

### Cosa cercare

| Vuoi trovare... | Cerca... |
|-----------------|----------|
| Dove viene usata una rotta | L'URL, es. `/api/contact` |
| Dove viene usato un controller | Il nome della classe, es. `ContactController` |
| Dove viene usato un modello | Il nome della classe, es. `ContactMessage` |
| Dove viene mostrato un testo | Il testo stesso, es. `Messaggio inviato` |
| Dove viene usata una variabile | Il nome della variabile, es. `totalPrice` |

### Ricerca dalla riga di comando

Se preferisci il terminale, puoi usare `grep`:

```bash
# Cerca "ContactController" in tutti i file PHP
grep -r "ContactController" laravel-spedizionefacile-main/ --include="*.php"
```

```bash
# Cerca "/api/contact" in tutti i file
grep -r "/api/contact" --include="*.vue" --include="*.php" --include="*.js"
```


---


## 4. I pattern di questo progetto

Un **pattern** e' uno schema che si ripete.
Una volta che lo impari, lo riconosci ovunque.

### Pattern 1: Controller (Backend)

Ogni controller gestisce un "argomento" (contatti, ordini, pacchi).
Si trova in:

```
laravel-spedizionefacile-main/app/Http/Controllers/
```

I controller seguono questo schema:

| Funzione | Cosa fa | Metodo HTTP |
|----------|---------|-------------|
| `index()` | Mostra la lista | GET |
| `show()` | Mostra un singolo elemento | GET |
| `store()` | Crea un nuovo elemento | POST |
| `update()` | Modifica un elemento | PUT o PATCH |
| `destroy()` | Elimina un elemento | DELETE |

**Esempio:** `OrderController` ha `index()` per la lista ordini e `show()` per un singolo ordine.

### Pattern 2: Modello (Backend)

Ogni modello descrive una tabella del database.
Si trova in:

```
laravel-spedizionefacile-main/app/Models/
```

I modelli hanno sempre:

- **`$fillable`** - Lista dei campi scrivibili
- **Relazioni** - Come il modello si collega ad altri modelli
- **`$casts`** - Conversioni automatiche dei tipi di dato

**Esempio:** `Order.php` ha `$fillable` con i campi dell'ordine, e la relazione `packages()` per i pacchi.

### Pattern 3: Pagina (Frontend)

Ogni pagina corrisponde a un URL.
Si trova in:

```
nuxt-spedizionefacile-master/pages/
```

La struttura delle cartelle diventa l'URL:

| File | URL |
|------|-----|
| `pages/index.vue` | `/` (homepage) |
| `pages/contatti.vue` | `/contatti` |
| `pages/preventivo.vue` | `/preventivo` |
| `pages/carrello.vue` | `/carrello` |
| `pages/checkout.vue` | `/checkout` |
| `pages/account/index.vue` | `/account` |
| `pages/account/profilo.vue` | `/account/profilo` |

### Pattern 4: Componente (Frontend)

Un componente e' un pezzo di pagina riutilizzabile.
Si trova in:

```
nuxt-spedizionefacile-master/components/
```

**Esempio:** `Preventivo.vue` e' il modulo del preventivo. Viene usato sia nella homepage che nella pagina preventivo.

Un componente ha tre parti:

```vue
<script setup>
  // Logica (dati, funzioni, calcoli)
</script>

<template>
  <!-- HTML (cosa si vede) -->
</template>

<style>
  /* CSS (come si vede: colori, dimensioni, posizioni) */
</style>
```

### Pattern 5: Store (Frontend)

Lo store e' la memoria condivisa tra le pagine.
Si trova in:

```
nuxt-spedizionefacile-master/stores/
```

**Esempio:** `userStore.js` contiene i dati del preventivo in corso (pacchi, prezzi, indirizzi).

### Pattern 6: Composable (Frontend)

Un composable e' una funzione riutilizzabile.
Si trova in:

```
nuxt-spedizionefacile-master/composables/
```

**Esempio:** `useSession.js` gestisce la sessione del preventivo. `useCart.js` gestisce il carrello.

### Pattern 7: Resource (Backend)

Una resource trasforma i dati del database nel formato JSON per il frontend.
Si trova in:

```
laravel-spedizionefacile-main/app/Http/Resources/
```

**Esempio:** `OrderResource.php` decide quali dati dell'ordine inviare al frontend.

### Pattern 8: Middleware (Backend)

Un middleware e' un "guardiano" che controlla le richieste.
Si trova in:

```
laravel-spedizionefacile-main/app/Http/Middleware/
```

**Esempio:** `CheckAdmin.php` blocca le richieste degli utenti non-admin.

### Pattern 9: Evento e Listener (Backend)

Un evento e' un "segnale" che succede qualcosa.
Un listener e' il codice che reagisce a quel segnale.

```
laravel-spedizionefacile-main/app/Events/        (i segnali)
laravel-spedizionefacile-main/app/Listeners/      (le reazioni)
```

**Esempio:** Quando un ordine viene pagato (`OrderPaid`), il listener `GenerateBrtLabel` crea l'etichetta di spedizione.


---


## 5. Tabella di orientamento rapido

| Se vuoi capire... | Inizia da... |
|-------------------|-------------|
| Come funziona la homepage | `pages/index.vue` e `components/Preventivo.vue` |
| Come funziona il login | `pages/autenticazione.vue` e `CustomLoginController.php` |
| Come funziona il carrello | `composables/useCart.js` e `CartController.php` |
| Come funziona il pagamento | `pages/checkout.vue` e `StripeController.php` |
| Come funzionano gli ordini | `pages/account/spedizioni/` e `OrderController.php` |
| Come funziona il contatto | `pages/contatti.vue` e `ContactController.php` |
| Come funziona la sessione | `composables/useSession.js` e `SessionController.php` |
| Come funziona il portafoglio | `pages/account/portafoglio.vue` e `WalletController.php` |
| Come funziona il tracking | `pages/traccia-spedizione.vue` e `BrtController.php` |
| Quali URL esistono | `routes/web.php` e `routes/api.php` |
| Quali tabelle ci sono | `app/Models/` (ogni file = una tabella) |
| Come sono fatti gli stili | `assets/css/main.css` |


---


## 6. Consigli per leggere il codice

### Non leggere tutto

Non serve leggere ogni riga.
Leggi solo quello che ti serve per capire cosa vuoi capire.

### Leggi i commenti

In questo progetto, la maggior parte dei file ha commenti in italiano.
I commenti iniziano con `//` (una riga) o `/* */` (piu' righe).

### Leggi i nomi

I nomi delle funzioni e delle variabili ti dicono cosa fanno:
- `calcPriceWithWeight` = calcola il prezzo con il peso
- `selectPackageType` = seleziona il tipo di pacco
- `handleSubmit` = gestisci l'invio del modulo

### Ignora quello che non capisci

Se una riga non ha senso, saltala.
Spesso basta capire il 60-70% per avere il quadro completo.

### Usa i breakpoint mentali

Quando leggi una funzione lunga, dividila in blocchi:
- "Prima parte: riceve i dati"
- "Seconda parte: li controlla"
- "Terza parte: li salva"
- "Quarta parte: risponde"


---


## Cosa hai imparato

- Le **variabili** contengono dati, le **funzioni** contengono azioni, le **classi** raggruppano entrambi
- Per seguire una richiesta: URL, rotta, controller, modello, database
- `Ctrl + Shift + F` cerca in tutto il progetto
- Il progetto ha pattern ricorrenti: Controller, Modello, Pagina, Componente, Store, Composable
- Leggi i nomi e i commenti prima del codice


---


## Prossimo passo

Vai alla **[Mappa visuale del sistema](./MAPPA-VISUALE.md)** per vedere il progetto dall'alto.

Oppure consulta il **[Glossario](../GLOSSARIO-SEMPLICE.md)** quando trovi un termine che non conosci.
