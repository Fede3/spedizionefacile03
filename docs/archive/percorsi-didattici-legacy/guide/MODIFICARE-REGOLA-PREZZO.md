# Come modificare le regole di prezzo

Questa guida spiega dove e come modificare le regole di calcolo dei prezzi di spedizione.

---

## Dove sono le regole di prezzo

Il calcolo del prezzo avviene in due punti:

1. **Backend** - `laravel-spedizionefacile-main/app/Http/Controllers/SessionController.php`
   - Calcolo principale basato su peso e volume
   - Usato quando l'utente compila il preventivo

2. **Frontend** - Logica nel componente preventivo
   - Puo' calcolare il prezzo lato client per feedback immediato
   - Il backend fa sempre la validazione finale

---

## Regole attuali

Il prezzo si trova nel metodo `firstStep()` del `SessionController`:

### Prezzo per peso

```php
$weight = (float) preg_replace('/[^0-9.]/', '', $package['weight']);

if ($weight > 0 && $weight < 2)      $weightPrice = 9;    // Sotto 2 kg: 9 EUR
elseif ($weight >= 2 && $weight < 5)  $weightPrice = 12;   // 2-5 kg: 12 EUR
elseif ($weight >= 5 && $weight < 10) $weightPrice = 18;   // 5-10 kg: 18 EUR
else                                   $weightPrice = 20;   // Oltre 10 kg: 20 EUR
```

### Prezzo per volume

```php
// Volume in metri cubi: lunghezza * larghezza * altezza (convertiti da cm a m)
$vol = ($s1 / 100) * ($s2 / 100) * ($s3 / 100);

if ($vol > 0 && $vol < 0.008)       $volumePrice = 9;    // Sotto 8 litri: 9 EUR
elseif ($vol >= 0.008 && $vol < 0.02) $volumePrice = 12;  // 8-20 litri: 12 EUR
elseif ($vol >= 0.02 && $vol < 0.04)  $volumePrice = 18;  // 20-40 litri: 18 EUR
else                                   $volumePrice = 20;  // Oltre 40 litri: 20 EUR
```

### Prezzo finale

```php
// Il prezzo e' il MAGGIORE tra peso e volume, moltiplicato per la quantita'
$basePrice = max((float) $weightPrice, (float) $volumePrice);
$quantity = (int) ($package['quantity'] ?? 1);
$package['single_price'] = round($basePrice * $quantity, 2);
```

---

## Come modificare le fasce di prezzo

### Esempio: cambiare la fascia 0-2 kg da 9 a 7.50 EUR

In `laravel-spedizionefacile-main/app/Http/Controllers/SessionController.php`, modifica:

```php
// Prima
if ($weight > 0 && $weight < 2) $weightPrice = 9;

// Dopo
if ($weight > 0 && $weight < 2) $weightPrice = 7.50;
```

### Esempio: aggiungere una nuova fascia di peso

```php
if ($weight > 0 && $weight < 2)        $weightPrice = 9;
elseif ($weight >= 2 && $weight < 5)    $weightPrice = 12;
elseif ($weight >= 5 && $weight < 10)   $weightPrice = 18;
elseif ($weight >= 10 && $weight < 20)  $weightPrice = 25;   // Nuova fascia
elseif ($weight >= 20 && $weight < 30)  $weightPrice = 35;   // Nuova fascia
else                                     $weightPrice = 45;   // Oltre 30 kg
```

---

## Come aggiungere supplementi per servizi

Per aggiungere un supplemento legato al tipo di servizio:

```php
$servicePrices = [
    'standard'           => 0,
    'express'            => 3.00,
    'priority'           => 5.00,
    'consegna al piano'  => 3.50,
    'ritiro al piano'    => 3.50,
];

$supplement = $servicePrices[$selectedService] ?? 0;
$totalPrice += $supplement;
```

---

## Come aggiungere supplementi per zona

Se vuoi differenziare il prezzo per zona geografica:

```php
// Mappa regioni -> supplemento
$zoneSupplements = [
    'isole' => 2.50,        // Sardegna, Sicilia
    'sud' => 1.00,           // Calabria, Puglia, ecc.
    'centro-nord' => 0,      // Nessun supplemento
];

// Determina la zona dal CAP di destinazione
$destCap = $shipmentDetails['destination_postal_code'];
$zone = $this->getZoneFromCap($destCap);
$totalPrice += $zoneSupplements[$zone] ?? 0;
```

---

## Il modello dei prezzi in dettaglio

I prezzi nel sistema sono gestiti in **centesimi** a livello di database e Stripe.
Il `SessionController` lavora in **euro** (numeri decimali).

Il trait `HasPrice` (in `app/Models/Traits/HasPrice.php`) e la classe `MyMoney` gestiscono la conversione automatica tra centesimi e euro quando si leggono i prezzi dal database.

Ad esempio, un prezzo di `900` nel database corrisponde a `9,00 EUR` nell'interfaccia.

---

## Dove controllare dopo la modifica

1. **Homepage** - Il preventivo rapido dovrebbe mostrare il nuovo prezzo
2. **Pagina preventivo** - I prezzi per pacco devono corrispondere
3. **Carrello** - Il totale deve essere corretto
4. **Checkout** - L'importo da pagare deve corrispondere

---

## Attenzione

- Modifica sempre il prezzo **nel backend** (`SessionController.php`), non solo nel frontend
- Il frontend puo' mostrare un'anteprima, ma il prezzo finale e' sempre calcolato dal backend
- Se il frontend invia `weight_price` o `volume_price`, il backend li accetta; altrimenti li ricalcola
- I prezzi nelle transazioni Stripe sono sempre in **centesimi** (es. 900 = 9.00 EUR)
