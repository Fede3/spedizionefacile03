# Come gestire gli stati degli ordini

Questa guida spiega il flusso degli stati ordine e come modificarlo.

---

## Stati definiti nel modello

Gli stati sono definiti come costanti in `laravel-spedizionefacile-main/app/Models/Order.php`:

```php
const PENDING = 'pending';               // In attesa di pagamento
const PROCESSING = 'processing';         // Pagamento ricevuto, in lavorazione
const PAYMENT_FAILED = 'payment_failed'; // Pagamento fallito
const IN_TRANSIT = 'in_transit';         // Spedizione in corso (etichetta generata)
const COMPLETED = 'completed';           // Spedizione completata
```

La traduzione in italiano e' nel metodo `getStatus()`:

```php
'pending' => 'In attesa',
'processing' => 'In lavorazione',
'completed' => 'Completato',
'payment_failed' => 'Fallito',
'payed' => 'Pagato',
'cancelled' => 'Annullato',
'in_transit' => 'In transito',
'delivered' => 'Consegnato',
'in_giacenza' => 'In giacenza',
```

---

## Flusso normale

```
┌─────────┐    Pagamento     ┌────────────┐    Etichetta BRT    ┌────────────┐
│ PENDING  │ ──────────────► │ PROCESSING │ ─────────────────► │ IN_TRANSIT │
│(creazione│    riuscito      │(pagato)    │    generata         │(spedito)   │
│ ordine)  │                  └────────────┘                     └────────────┘
└─────────┘                                                           │
                                                                      │
                                                               Consegna BRT
                                                                      │
                                                                      ▼
                                                               ┌────────────┐
                                                               │ COMPLETED  │
                                                               │(consegnato)│
                                                               └────────────┘
```

---

## Flusso con errori

```
┌─────────┐    Pagamento     ┌────────────────┐
│ PENDING  │ ──────────────► │ PAYMENT_FAILED │
│          │    fallito       │                │
└─────────┘                  └────────────────┘
     │                              │
     │  L'utente puo' riprovare     │
     │  ◄───────────────────────────┘
```

---

## Chi cambia gli stati

| Transizione | Chi la fa | Come |
|---|---|---|
| `→ pending` | Sistema | Automatico alla creazione dell'ordine (`Order::booted()`) |
| `pending → processing` | Listener `MarkOrderProcessing` | Attivato dall'evento `OrderPaid` |
| `pending → payment_failed` | Listener `MarkOrderPaymentFailed` | Attivato dall'evento `OrderPaymentFailed` |
| `processing → in_transit` | Listener `GenerateBrtLabel` | Quando l'etichetta BRT viene generata con successo |
| `→ completed` | Admin | Manualmente dal pannello admin |
| `→ cancelled` | Utente o Admin | Via endpoint `POST /api/orders/{order}/cancel` |

---

## Come aggiungere un nuovo stato

### 1. Definire la costante nel modello

In `app/Models/Order.php`:

```php
const DELIVERED = 'delivered';  // Consegnato
```

### 2. Aggiungere la traduzione

```php
public function getStatus($status) {
    $data = [
        // ...stati esistenti...
        'delivered' => 'Consegnato',
    ];
    return $data[$status] ?? $status;
}
```

### 3. Gestire la transizione

Se la transizione e' automatica, crea un evento e un listener:

```bash
php artisan make:event OrderDelivered
php artisan make:listener MarkOrderDelivered
```

Registra in `app/Providers/EventServiceProvider.php`:

```php
protected $listen = [
    \App\Events\OrderDelivered::class => [
        \App\Listeners\MarkOrderDelivered::class,
    ],
];
```

Se la transizione e' manuale (admin), e' gia' gestita dall'endpoint:

```
PATCH /api/admin/orders/{order}/status
```

---

## Come aggiungere una transizione admin

L'endpoint per cambiare lo stato di un ordine e':

```
PATCH /api/admin/orders/{order}/status
```

Nel `AdminController`, puoi aggiungere validazione sulle transizioni consentite:

```php
$allowedTransitions = [
    'pending' => ['processing', 'cancelled'],
    'processing' => ['in_transit', 'cancelled'],
    'in_transit' => ['completed', 'delivered', 'in_giacenza'],
    'payment_failed' => ['pending', 'cancelled'],
];

$currentStatus = $order->status;
$newStatus = $request->status;

if (!in_array($newStatus, $allowedTransitions[$currentStatus] ?? [])) {
    return response()->json(['error' => 'Transizione non consentita'], 422);
}
```

---

## Visualizzazione nel frontend

Nel frontend, lo stato viene mostrato con colori diversi.
Puoi usare una mappa di colori:

```javascript
const statusColors = {
  pending: 'yellow',
  processing: 'blue',
  in_transit: 'cyan',
  completed: 'green',
  payment_failed: 'red',
  cancelled: 'gray',
  delivered: 'green',
  in_giacenza: 'orange',
};
```

---

## Dove controllare

- **Modello**: `app/Models/Order.php` (costanti e traduzione)
- **Eventi**: `app/Events/OrderPaid.php`, `app/Events/OrderPaymentFailed.php`
- **Listener**: `app/Listeners/MarkOrderProcessing.php`, `app/Listeners/GenerateBrtLabel.php`
- **Admin**: `app/Http/Controllers/AdminController.php` (metodo `updateOrderStatus`)
- **Frontend**: `pages/account/spedizioni/` (lista e dettaglio ordini)
