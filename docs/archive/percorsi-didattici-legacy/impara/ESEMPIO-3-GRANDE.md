# Esempio 3 - Modifica grande

## Cosa imparerai

- Come una nuova funzionalita' attraversa tutto il sistema
- La tecnica del "seguire i dati" per capire il codice
- Quali file toccare per aggiungere un nuovo servizio di spedizione
- Come frontend, backend e database collaborano


---


## L'obiettivo

Aggiungeremo un nuovo servizio di spedizione: **"Consegna Sabato"**.

Questo servizio permette all'utente di scegliere la consegna di sabato.
Costa di piu' rispetto alla spedizione standard.

Questo esercizio tocca molti file.
Non devi fare tutto in una volta.
Leggi ogni passo con calma.


---


## Panoramica dei file coinvolti

| # | File | Ruolo |
|---|------|-------|
| 1 | `app/Models/Service.php` | Modello del servizio (backend) |
| 2 | Nuova migrazione | Aggiunge il campo "extra_price" alla tabella services |
| 3 | `components/Preventivo.vue` | Modulo preventivo (step 1 frontend) |
| 4 | `pages/la-tua-spedizione/[step].vue` | Pagine degli step successivi (frontend) |
| 5 | `stores/userStore.js` | Memoria condivisa (frontend) |
| 6 | `app/Http/Controllers/OrderController.php` | Creazione ordine (backend) |
| 7 | `routes/web.php` | Lista delle rotte (backend) |

Sembra tanto, ma ogni passo e' piccolo.


---


## La tecnica: "Seguire i dati"

Quando devi capire o modificare una funzionalita', segui i dati.

Chiediti:

1. **Dove nasce il dato?** (L'utente sceglie "Consegna Sabato")
2. **Dove viene salvato temporaneamente?** (Nello store del frontend)
3. **Come arriva al backend?** (Tramite una chiamata API)
4. **Come viene validato?** (Nel controller)
5. **Dove viene salvato per sempre?** (Nel database)
6. **Come viene usato?** (Nel calcolo del prezzo, nella visualizzazione ordine)


---


## Passo 1 - Il database

### 1.1 - Crea una migrazione

Il servizio ha gia' una tabella (`services`), ma non ha un campo per il prezzo extra.
Dobbiamo aggiungerlo.

```bash
cd laravel-spedizionefacile-main
php artisan make:migration add_extra_price_to_services_table
```

### 1.2 - Scrivi la migrazione

```php
// File: database/migrations/XXXX_add_extra_price_to_services_table.php

public function up(): void
{
    Schema::table('services', function (Blueprint $table) {
        $table->integer('extra_price')->default(0)->after('date');
    });
}

public function down(): void
{
    Schema::table('services', function (Blueprint $table) {
        $table->dropColumn('extra_price');
    });
}
```

Il campo `extra_price` contiene il costo aggiuntivo in centesimi.
Per esempio, 500 = 5,00 euro extra.

### 1.3 - Esegui la migrazione

```bash
php artisan migrate
```


---


## Passo 2 - Il modello

### 2.1 - Aggiorna il modello Service

Apri il file:

```
laravel-spedizionefacile-main/app/Models/Service.php
```

**PRIMA:**

```php
protected $fillable = [
    'service_type',
    'time',
    'date'
];
```

**DOPO:**

```php
protected $fillable = [
    'service_type',
    'time',
    'date',
    'extra_price',     // Prezzo aggiuntivo in centesimi
];
```

Adesso il modello conosce il nuovo campo.


---


## Passo 3 - Il frontend: la scelta del servizio

### 3.1 - Aggiorna lo store

Il servizio scelto viene salvato nello store.
Apri il file:

```
nuxt-spedizionefacile-master/stores/userStore.js
```

Lo store ha gia' un array `servicesArray` per i servizi.
L'utente sceglie il tipo di servizio durante lo step 2.

Il `service_type` attuale puo' essere "standard" o "express".
Noi aggiungiamo "consegna_sabato".

### 3.2 - Aggiungi l'opzione nel frontend

Nello step 2 della spedizione, dove l'utente sceglie il tipo di servizio, aggiungi una nuova opzione.

Cerca il file dello step 2:

```
nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue
```

Cerca dove vengono mostrate le opzioni di servizio.
Aggiungi il nuovo tipo:

```javascript
const serviceTypes = [
    { value: 'standard', label: 'Standard', extraPrice: 0 },
    { value: 'express', label: 'Express', extraPrice: 300 },
    { value: 'consegna_sabato', label: 'Consegna Sabato', extraPrice: 500 },
    // 500 = 5.00 euro extra
];
```

E nel template HTML, aggiungi il pulsante o il selettore per la nuova opzione.

### 3.3 - Come funziona la scelta

Quando l'utente clicca su "Consegna Sabato":

1. Il valore `consegna_sabato` viene salvato nello store
2. Il prezzo extra (5 euro) viene aggiunto al totale
3. I dati vengono inviati al backend con la richiesta


---


## Passo 4 - Il backend: validazione e salvataggio

### 4.1 - Aggiorna la validazione

Nel controller che crea l'ordine diretto:

```
laravel-spedizionefacile-main/app/Http/Controllers/OrderController.php
```

Nella funzione `createDirectOrder`, cerca dove vengono creati i servizi.
Attualmente il codice e':

```php
$servicesData = $data['services'];
$servicesData['service_type'] = !empty($servicesData['service_type'])
    ? $servicesData['service_type']
    : 'Nessuno';
$service = Service::create($servicesData);
```

Il `service_type` viene gia' passato dai dati del frontend.
La nuova opzione `consegna_sabato` verra' salvata automaticamente.

### 4.2 - Aggiungi il prezzo extra al calcolo

Nel punto dove si calcola il `subtotalCents`, aggiungi il prezzo extra del servizio:

**PRIMA:**

```php
$subtotalCents += $singlePriceCents;
```

**DOPO:**

```php
$subtotalCents += $singlePriceCents;

// Aggiungi il prezzo extra del servizio (se presente)
$extraPrice = $this->getServiceExtraPrice($servicesData['service_type'] ?? '');
```

### 4.3 - Crea la funzione per calcolare il prezzo extra

Aggiungi questa funzione nella stessa classe `OrderController`:

```php
/**
 * Restituisce il prezzo extra in centesimi per un tipo di servizio.
 */
private function getServiceExtraPrice(string $serviceType): int
{
    $prices = [
        'standard' => 0,
        'express' => 300,           // 3.00 euro
        'consegna_sabato' => 500,   // 5.00 euro
    ];

    return $prices[$serviceType] ?? 0;
}
```

### 4.4 - Usa il prezzo extra nel subtotale

```php
$subtotalCents += $singlePriceCents;
$subtotalCents += $this->getServiceExtraPrice($servicesData['service_type'] ?? '');
```


---


## Passo 5 - Il frontend: mostra il prezzo aggiornato

### 5.1 - Mostra il prezzo extra nella pagina di riepilogo

Apri il file:

```
nuxt-spedizionefacile-master/pages/riepilogo.vue
```

Aggiungi una riga che mostra il costo aggiuntivo del servizio:

```html
<div v-if="selectedService === 'consegna_sabato'" class="flex justify-between mt-[8px]">
    <span>Consegna Sabato:</span>
    <span>+ 5,00 euro</span>
</div>
```


---


## Riepilogo: il percorso dei dati

```
 FRONTEND                              BACKEND                           DATABASE
 (browser)                             (server Laravel)                  (MySQL)

 1. L'utente sceglie
    "Consegna Sabato"
    nel selettore
         |
         v
 2. Il valore viene
    salvato nello store
    (userStore.js)
         |
         v
 3. Il frontend invia                  4. OrderController
    i dati al backend     ---------->     riceve i dati
    via POST /api/...                     e li valida
                                           |
                                           v
                                       5. Calcola il prezzo
                                          extra (500 cent)
                                           |
                                           v
                                       6. Crea il Service     -------->  7. Tabella "services"
                                          con service_type =               service_type =
                                          "consegna_sabato"                "consegna_sabato"
                                           |                               extra_price = 500
                                           v
                                       8. Crea l'Order        -------->  9. Tabella "orders"
                                          con subtotal =                   subtotal = prezzo
                                          prezzo + extra                   originale + 500
```


---


## Lista di controllo

Quando aggiungi una nuova funzionalita', controlla questi punti:

- [ ] **Database**: la colonna esiste nella tabella?
- [ ] **Migrazione**: hai creato e eseguito la migrazione?
- [ ] **Modello**: il campo e' nella lista `$fillable`?
- [ ] **Controller**: la validazione accetta il nuovo valore?
- [ ] **Controller**: il calcolo del prezzo e' aggiornato?
- [ ] **Store**: il dato viene salvato nella memoria condivisa?
- [ ] **Template**: l'opzione e' visibile all'utente?
- [ ] **Riepilogo**: il prezzo extra viene mostrato?


---


## La regola d'oro: segui i dati

Quando non sai da dove iniziare:

1. **Parti dall'utente**: cosa vede? Cosa clicca?
2. **Trova il file del frontend**: quale pagina? Quale componente?
3. **Segui la chiamata API**: dove vanno i dati?
4. **Trova la rotta nel backend**: quale URL? Quale controller?
5. **Trova il controller**: quale funzione viene eseguita?
6. **Trova il modello**: quale tabella del database viene usata?

Questa tecnica funziona per qualsiasi funzionalita' del progetto.


---


## Cosa hai imparato

- Una funzionalita' grande tocca molti file, ma ogni passo e' piccolo
- La tecnica del "seguire i dati" ti aiuta a orientarti
- Il percorso e' sempre lo stesso: Frontend, Store, API, Controller, Modello, Database
- I prezzi vengono ricalcolati nel backend per sicurezza
- Ogni nuovo campo nel database richiede una migrazione


---


## Prossimo passo

Vai a **[Mappa visuale del sistema](./MAPPA-VISUALE.md)** per avere una visione d'insieme del progetto.

Oppure vai al **[Glossario](../GLOSSARIO-SEMPLICE.md)** per rivedere i termini tecnici.
