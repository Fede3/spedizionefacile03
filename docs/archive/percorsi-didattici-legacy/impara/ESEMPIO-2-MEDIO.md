# Esempio 2 - Modifica media

## Cosa imparerai

- Come aggiungere un campo a un modulo nel frontend
- Come aggiungere la validazione nel backend
- Come salvare il nuovo dato nel database
- Come collegare frontend e backend


---


## L'obiettivo

Aggiungeremo un campo **"Numero di telefono"** al modulo di contatto.

Il modulo di contatto ha gia' il campo telefono.
Ma faremo finta che non ci sia, per imparare il processo completo.

In questo esercizio vedrai i 3 passi necessari:

1. **Frontend** - Aggiungere il campo visivo nel modulo
2. **Backend** - Aggiungere la validazione dei dati
3. **Database** - Assicurarsi che il dato venga salvato


---


## I file coinvolti

| File | Ruolo |
|------|-------|
| `nuxt-spedizionefacile-master/pages/contatti.vue` | La pagina con il modulo (frontend) |
| `laravel-spedizionefacile-main/app/Http/Controllers/ContactController.php` | Il controller che riceve i dati (backend) |
| `laravel-spedizionefacile-main/app/Models/ContactMessage.php` | Il modello che descrive la tabella (database) |


---


## Parte 1 - Il Frontend

### Passo 1.1 - Apri il file della pagina Contatti

```
nuxt-spedizionefacile-master/pages/contatti.vue
```

### Passo 1.2 - Trova i dati del modulo

Nella parte `<script setup>`, c'e' un oggetto con i campi del modulo:

```javascript
// File: nuxt-spedizionefacile-master/pages/contatti.vue, riga 44-51

const contactForm = ref({
    name: "",
    surname: "",
    email: "",
    telephone_number: "",
    address: "",
    message: "",
});
```

**Cos'e' `ref()`?**
E' una funzione di Vue che crea una variabile "reattiva".
Quando il valore cambia, la pagina si aggiorna automaticamente.

**Cos'e' l'oggetto dentro `ref()`?**
E' un insieme di coppie chiave-valore.
Ogni chiave e' il nome del campo.
Ogni valore (qui `""`) e' il valore iniziale (vuoto).

### Passo 1.3 - Aggiungi il nuovo campo ai dati

Immagina di voler aggiungere un campo "codice_fiscale".

**PRIMA:**

```javascript
const contactForm = ref({
    name: "",
    surname: "",
    email: "",
    telephone_number: "",
    address: "",
    message: "",
});
```

**DOPO:**

```javascript
const contactForm = ref({
    name: "",
    surname: "",
    email: "",
    telephone_number: "",
    codice_fiscale: "",      // NUOVO CAMPO AGGIUNTO
    address: "",
    message: "",
});
```

### Passo 1.4 - Aggiungi il campo visivo nel modulo HTML

Nella parte `<template>`, dopo il campo email, aggiungi un nuovo `<input>`.

**Dove inserire il codice:**
Cerca la riga con `id="telephone_number"` (circa riga 121-122).
Aggiungi il nuovo campo dopo.

**Il nuovo campo:**

```html
<label for="codice_fiscale" class="sr-only">Codice Fiscale</label>
<input
    type="text"
    v-model="contactForm.codice_fiscale"
    id="codice_fiscale"
    placeholder="Codice Fiscale..."
    class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[60px] px-[24px] text-[0.9375rem] text-[#252B42] placeholder:text-[#A0A5AB] mt-[20px] focus:border-[#095866] focus:outline-none transition-colors"
/>
```

### Spiegazione di ogni pezzo

| Pezzo | Significato |
|-------|-------------|
| `<label for="codice_fiscale">` | Etichetta per accessibilita' (lettori schermo) |
| `class="sr-only"` | Nascosta visivamente, ma leggibile dai lettori |
| `type="text"` | Campo di testo libero |
| `v-model="contactForm.codice_fiscale"` | Collega il campo ai dati. Quando scrivi, il dato si aggiorna |
| `id="codice_fiscale"` | Identificativo unico del campo |
| `placeholder="Codice Fiscale..."` | Testo grigio che appare quando il campo e' vuoto |
| Le classi CSS | Stile: bordi arrotondati, altezza, colori, ecc. |

### Passo 1.5 - Ricordati di azzerare il campo dopo l'invio

Nella funzione `handleSubmit`, c'e' un punto dove il modulo viene svuotato.
Aggiungi il nuovo campo anche li':

```javascript
// File: nuxt-spedizionefacile-master/pages/contatti.vue, riga 69-76

contactForm.value = {
    name: "",
    surname: "",
    email: "",
    telephone_number: "",
    codice_fiscale: "",     // NUOVO CAMPO DA AZZERARE
    address: "",
    message: "",
};
```


---


## Parte 2 - Il Backend

### Passo 2.1 - Apri il controller

```
laravel-spedizionefacile-main/app/Http/Controllers/ContactController.php
```

### Passo 2.2 - Aggiungi la validazione

La funzione `store` ha una lista di regole di validazione.
Ogni campo ha delle regole che dicono se e' obbligatorio, che tipo di dato e', ecc.

**PRIMA:**

```php
$validated = $request->validate([
    'name' => 'required|string|max:255',
    'surname' => 'required|string|max:255',
    'email' => 'required|email|max:255',
    'telephone_number' => 'nullable|string|max:255',
    'address' => 'nullable|string|max:255',
    'message' => 'required|string|max:5000',
]);
```

**DOPO:**

```php
$validated = $request->validate([
    'name' => 'required|string|max:255',
    'surname' => 'required|string|max:255',
    'email' => 'required|email|max:255',
    'telephone_number' => 'nullable|string|max:255',
    'codice_fiscale' => 'nullable|string|max:16',   // NUOVO CAMPO
    'address' => 'nullable|string|max:255',
    'message' => 'required|string|max:5000',
]);
```

### Spiegazione delle regole di validazione

| Regola | Significato |
|--------|-------------|
| `nullable` | Il campo e' facoltativo (puo' essere vuoto) |
| `string` | Deve essere testo |
| `max:16` | Massimo 16 caratteri (un codice fiscale ne ha 16) |

Se avessi scritto `required` al posto di `nullable`, il campo sarebbe obbligatorio.


---


## Parte 3 - Il Database

### Passo 3.1 - Apri il modello

```
laravel-spedizionefacile-main/app/Models/ContactMessage.php
```

### Passo 3.2 - Aggiungi il campo alla lista $fillable

La lista `$fillable` dice a Laravel quali campi possono essere scritti nel database.
Se non aggiungi il campo qui, Laravel lo ignorera'.

**PRIMA:**

```php
protected $fillable = [
    'name',
    'surname',
    'email',
    'telephone_number',
    'address',
    'message',
    'read_at',
];
```

**DOPO:**

```php
protected $fillable = [
    'name',
    'surname',
    'email',
    'telephone_number',
    'codice_fiscale',    // NUOVO CAMPO
    'address',
    'message',
    'read_at',
];
```

### Passo 3.3 - Crea una migrazione per il database

Il database non sa ancora che esiste il nuovo campo.
Devi creare una **migrazione**, cioe' un file che modifica la struttura del database.

Apri il terminale nella cartella del backend:

```bash
cd laravel-spedizionefacile-main
php artisan make:migration add_codice_fiscale_to_contact_messages_table
```

Questo crea un file nella cartella `database/migrations/`.
Aprilo e scrivi:

```php
public function up(): void
{
    Schema::table('contact_messages', function (Blueprint $table) {
        $table->string('codice_fiscale', 16)->nullable()->after('telephone_number');
    });
}

public function down(): void
{
    Schema::table('contact_messages', function (Blueprint $table) {
        $table->dropColumn('codice_fiscale');
    });
}
```

### Spiegazione della migrazione

| Pezzo | Significato |
|-------|-------------|
| `Schema::table('contact_messages', ...)` | Modifica la tabella "contact_messages" |
| `$table->string('codice_fiscale', 16)` | Aggiungi una colonna di testo, massimo 16 caratteri |
| `->nullable()` | Il campo puo' essere vuoto |
| `->after('telephone_number')` | Metti la colonna dopo "telephone_number" |
| `up()` | Cosa fare quando applichi la migrazione |
| `down()` | Cosa fare quando annulli la migrazione |

### Passo 3.4 - Esegui la migrazione

```bash
php artisan migrate
```

Questo comando applica la modifica al database.


---


## Riepilogo dei file modificati

| # | File | Cosa hai fatto |
|---|------|----------------|
| 1 | `pages/contatti.vue` | Aggiunto il campo ai dati e al modulo HTML |
| 2 | `ContactController.php` | Aggiunto la regola di validazione |
| 3 | `ContactMessage.php` | Aggiunto il campo a `$fillable` |
| 4 | Nuova migrazione | Aggiunto la colonna nel database |


---


## Il flusso completo della modifica

```
Utente scrive              Frontend                Backend                  Database
il codice fiscale          (contatti.vue)           (ContactController)      (contact_messages)
      |                         |                        |                        |
      |  digita "RSSMRA..."     |                        |                        |
      |------------------------>|                        |                        |
      |  v-model aggiorna       |                        |                        |
      |  contactForm             |                        |                        |
      |                         |                        |                        |
      |  clicca "Invia"         |                        |                        |
      |------------------------>|                        |                        |
      |                         |  POST /api/contact     |                        |
      |                         |  {codice_fiscale: ...} |                        |
      |                         |----------------------->|                        |
      |                         |                        | validate()              |
      |                         |                        | max:16? OK             |
      |                         |                        |                        |
      |                         |                        | ContactMessage::create()|
      |                         |                        |----------------------->|
      |                         |                        |                        | SALVA
      |                         |                        |<-----------------------|
      |                         |  200 OK                |                        |
      |                         |<-----------------------|                        |
      |  "Messaggio inviato!"   |                        |                        |
      |<------------------------|                        |                        |
```


---


## Cosa hai imparato

- Per aggiungere un campo servono modifiche in **3 posti**: frontend, backend, database
- Il **frontend** definisce come il campo appare e come i dati vengono inviati
- Il **backend** controlla che i dati siano validi (validazione)
- Il **modello** dice a Laravel quali campi puo' salvare (`$fillable`)
- La **migrazione** modifica la struttura del database
- Il collegamento tra frontend e backend avviene tramite `v-model` e le chiamate API


---


## Prossimo passo

Vai a **[Esempio 3 - Modifica grande](./ESEMPIO-3-GRANDE.md)** per imparare a creare una funzionalita' che attraversa tutto il sistema.
