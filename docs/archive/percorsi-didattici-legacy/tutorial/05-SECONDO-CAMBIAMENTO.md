# Secondo cambiamento: aggiungere un nuovo servizio di spedizione

In questo tutorial aggiungeremo un servizio "Consegna al sabato" alla piattaforma.
E' un cambiamento di media complessita' che tocca la logica di business e l'integrazione BRT.

---

## Panoramica

Un "servizio" in SpediamoFacile e' un'opzione aggiuntiva che l'utente puo' scegliere per la spedizione.
Ogni servizio ha un nome, un prezzo e una corrispondenza con i parametri BRT.

File coinvolti:

| Livello | File | Cosa fare |
|---|---|---|
| Model | `app/Models/Service.php` | Nessuna modifica (gia' generico) |
| BrtService | `app/Services/BrtService.php` | Aggiungere la mappatura del nuovo servizio |
| Frontend | `pages/la-tua-spedizione/[step].vue` | Aggiungere l'opzione nella UI |
| Prezzo | `app/Http/Controllers/SessionController.php` | Aggiornare il calcolo prezzo |

---

## Passo 1: Capire il modello Service

Il modello Service (`app/Models/Service.php`) e' gia' generico:

```php
protected $fillable = [
    'service_type',  // Tipo di servizio (es. "standard", "express")
    'time',          // Orario di ritiro
    'date'           // Data di ritiro
];
```

Il campo `service_type` e' una stringa libera. Non c'e' bisogno di migrazioni per aggiungere un nuovo tipo.

---

## Passo 2: Aggiungere la mappatura in BrtService

Il file `app/Services/BrtService.php` contiene una mappa che traduce i nomi dei servizi interni nei parametri BRT.

Apri il metodo `addServicesToPayload` e aggiungi la mappatura:

```php
// In app/Services/BrtService.php, metodo addServicesToPayload()

$serviceMapping = [
    'consegna al piano'     => ['field' => 'particularitiesDeliveryManagement', 'value' => 'CP'],
    'delivery al piano'     => ['field' => 'particularitiesDeliveryManagement', 'value' => 'CP'],
    'ritiro al piano'       => ['field' => 'particularitiesPickupManagement', 'value' => 'RP'],
    'pickup al piano'       => ['field' => 'particularitiesPickupManagement', 'value' => 'RP'],
    'express'               => ['field' => 'serviceType', 'value' => 'E'],
    'priority'              => ['field' => 'serviceType', 'value' => 'P'],
    '10:30'                 => ['field' => 'serviceType', 'value' => 'O'],
    'economy'               => ['field' => 'serviceType', 'value' => 'N'],
    // NUOVO: Consegna al sabato
    'consegna sabato'       => ['field' => 'serviceType', 'value' => 'S'],
    'saturday delivery'     => ['field' => 'serviceType', 'value' => 'S'],
];
```

Il valore `'S'` per `serviceType` e' il codice BRT per la consegna al sabato.
Verifica il codice corretto nella documentazione BRT del tuo contratto.

---

## Passo 3: Aggiungere l'opzione nel frontend

Nel file `nuxt-spedizionefacile-master/pages/la-tua-spedizione/[step].vue`, aggiungi l'opzione nella lista dei servizi disponibili:

```javascript
const availableServices = [
  { label: 'Standard', value: 'standard', price: 0 },
  { label: 'Express', value: 'express', price: 300 },
  { label: 'Priority', value: 'priority', price: 500 },
  // NUOVO
  { label: 'Consegna al Sabato', value: 'consegna sabato', price: 200 },
];
```

Nel template, il servizio apparira' automaticamente se usi un loop:

```vue
<div v-for="service in availableServices" :key="service.value">
  <URadio
    v-model="selectedService"
    :value="service.value"
    :label="service.label"
  />
  <span v-if="service.price > 0">+ {{ (service.price / 100).toFixed(2) }} EUR</span>
</div>
```

---

## Passo 4: Aggiornare il calcolo del prezzo (se necessario)

Se il servizio ha un prezzo aggiuntivo, aggiornalo nel `SessionController.php` o nella logica del carrello.

Nel `SessionController.php`, il prezzo e' calcolato in base a peso e volume.
I servizi aggiuntivi vengono solitamente sommati nel frontend al momento del checkout.

Se vuoi gestire il prezzo lato server, aggiungi al metodo `firstStep`:

```php
// Supplemento servizi
$serviceSupplements = [
    'consegna sabato' => 200, // 2.00 EUR in centesimi
    'express' => 300,
    'priority' => 500,
];

$selectedService = $request->input('service_type', 'standard');
$supplement = $serviceSupplements[$selectedService] ?? 0;
$totalPrice += $supplement / 100;
```

---

## Passo 5: Verificare

1. Vai alla pagina di configurazione spedizione
2. Nella sezione servizi, dovresti vedere "Consegna al Sabato"
3. Selezionalo e procedi al pagamento
4. Dopo il pagamento, verifica nei log che BRT riceva `serviceType: 'S'`:
   ```bash
   tail -f laravel-spedizionefacile-main/storage/logs/laravel.log | grep "BRT services"
   ```

---

## Come funziona il flusso completo

```
1. Utente seleziona "Consegna al Sabato" nel frontend
2. Il frontend salva service_type = "consegna sabato" nella sessione
3. Al pagamento, viene creato un record Service con service_type = "consegna sabato"
4. Il pacco viene collegato al Service
5. Quando l'ordine viene pagato, si attiva l'evento OrderPaid
6. Il listener GenerateBrtLabel chiama BrtService.createShipment()
7. BrtService mappa "consegna sabato" -> serviceType: 'S' nel payload BRT
8. BRT riceve la richiesta e genera l'etichetta con il servizio sabato
```

---

## Prossimo passo

Vai a [Terzo cambiamento](06-TERZO-CAMBIAMENTO.md) per modificare il flusso di checkout.
