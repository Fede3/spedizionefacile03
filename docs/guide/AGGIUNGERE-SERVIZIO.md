# Come aggiungere un nuovo servizio di spedizione

Questa guida spiega come aggiungere un nuovo servizio o accessorio alla piattaforma di spedizione.

---

## Cos'e' un "servizio" nel sistema

Un servizio e' un'opzione di spedizione (es. "Express", "Economy", "Consegna al piano").
Viene salvato nel modello `Service` e collegato ai pacchi tramite `service_id`.

Il modello si trova in `laravel-spedizionefacile-main/app/Models/Service.php`:

```php
protected $fillable = [
    'service_type',  // es. "express", "consegna al piano"
    'time',          // Orario di ritiro
    'date'           // Data di ritiro
];
```

---

## Passo 1: Definire il servizio

Decidi:

- **Nome interno** (`service_type`): stringa in minuscolo, es. `"consegna sabato"`
- **Nome visibile**: quello che l'utente vede, es. "Consegna al Sabato"
- **Prezzo aggiuntivo**: quanto costa in piu' rispetto al servizio base
- **Codice BRT**: il parametro da inviare alle API BRT

---

## Passo 2: Mappare il servizio verso BRT

Apri `laravel-spedizionefacile-main/app/Services/BrtService.php`.

Nel metodo `addServicesToPayload`, aggiungi la mappatura:

```php
$serviceMapping = [
    // Servizi esistenti
    'consegna al piano'     => ['field' => 'particularitiesDeliveryManagement', 'value' => 'CP'],
    'ritiro al piano'       => ['field' => 'particularitiesPickupManagement', 'value' => 'RP'],
    'express'               => ['field' => 'serviceType', 'value' => 'E'],
    'priority'              => ['field' => 'serviceType', 'value' => 'P'],
    '10:30'                 => ['field' => 'serviceType', 'value' => 'O'],
    'economy'               => ['field' => 'serviceType', 'value' => 'N'],

    // NUOVO SERVIZIO
    'consegna sabato'       => ['field' => 'serviceType', 'value' => 'S'],
];
```

### Parametri BRT disponibili

| Campo BRT | Descrizione | Valori comuni |
|---|---|---|
| `serviceType` | Tipo di servizio principale | `E` (Express), `P` (Priority), `O` (10:30), `N` (Economy), `S` (Sabato) |
| `particularitiesDeliveryManagement` | Gestione consegna | `CP` (Consegna al piano), `AP` (Appuntamento) |
| `particularitiesPickupManagement` | Gestione ritiro | `RP` (Ritiro al piano) |
| `insuranceAmount` | Assicurazione (importo in EUR) | Numero decimale |
| `isCODMandatory` | Contrassegno | `'0'` o `'1'` |

Consulta la documentazione BRT del tuo contratto per i codici corretti.

---

## Passo 3: Aggiungere l'opzione nel frontend

Nel file `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`, aggiungi l'opzione nella lista dei servizi disponibili.

L'array dei servizi tipicamente contiene:

```javascript
const services = [
  {
    value: 'standard',
    label: 'Standard',
    description: 'Consegna in 3-5 giorni lavorativi',
    price: 0,
  },
  {
    value: 'express',
    label: 'Express',
    description: 'Consegna in 1-2 giorni lavorativi',
    price: 300,  // centesimi
  },
  // NUOVO
  {
    value: 'consegna sabato',
    label: 'Consegna al Sabato',
    description: 'Consegna garantita il sabato successivo',
    price: 200,
  },
];
```

---

## Passo 4: Aggiornare il calcolo del prezzo

Se il servizio ha un costo aggiuntivo, aggiorna la logica dei prezzi.

In `laravel-spedizionefacile-main/app/Http/Controllers/SessionController.php`, il prezzo base e' calcolato per peso/volume.
Il supplemento dei servizi puo' essere sommato:

```php
// Dopo il calcolo del prezzo base
$servicePrices = [
    'express' => 3.00,
    'priority' => 5.00,
    'consegna sabato' => 2.00,
    'consegna al piano' => 3.50,
];

$selectedService = session()->get('service_type', 'standard');
$supplement = $servicePrices[$selectedService] ?? 0;
```

---

## Passo 5: Verificare

1. Scegli il nuovo servizio nella configurazione della spedizione
2. Verifica che il prezzo sia calcolato correttamente
3. Procedi al pagamento
4. Controlla nei log che BRT riceva i parametri corretti:

```bash
tail -f laravel-spedizionefacile-main/storage/logs/laravel.log | grep "BRT services applied"
```

Se il servizio non e' mappato, vedrai nel log:

```
BRT service not mapped: consegna sabato
```

Questo e' un segnale che la mappatura in `addServicesToPayload` non corrisponde al `service_type` salvato nel database.

---

## Checklist

- [ ] Servizio mappato in `BrtService.php` (metodo `addServicesToPayload`)
- [ ] Opzione aggiunta nel frontend (pagina configurazione spedizione)
- [ ] Prezzo aggiuntivo calcolato correttamente
- [ ] Testato con una spedizione reale o in modalita' test BRT
- [ ] Log BRT verificati per il parametro corretto
