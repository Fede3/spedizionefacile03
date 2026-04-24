# Riferimento: Eventi e Listeners

Lista completa degli eventi del sistema e dei listener che reagiscono ad essi.

Registrati in: `laravel-spedizionefacile-main/app/Providers/EventServiceProvider.php`

---

## Mappa Eventi-Listeners

```php
protected $listen = [
    \App\Events\UserRegistered::class => [
        \App\Listeners\SendVerificationEmail::class,
    ],
    \App\Events\OrderPaid::class => [
        \App\Listeners\MarkOrderProcessing::class,
        \App\Listeners\GenerateBrtLabel::class,
    ],
];
```

---

## Eventi

### UserRegistered

- **File**: non presente nella cartella Events (probabilmente generato inline o in un controller)
- **Trigger**: quando un utente si registra
- **Dati**: l'utente appena creato

### OrderCreated

- **File**: `app/Events/OrderCreated.php`
- **Trigger**: quando un nuovo ordine viene creato nel sistema
- **Dati**: `$order` (modello Order)
- **Listener registrato**: `CartEmpty` (nota: non registrato in EventServiceProvider, potrebbe essere collegato altrove)

### OrderPaid

- **File**: `app/Events/OrderPaid.php`
- **Trigger**: quando un ordine viene pagato con successo
- **Dati**: `$order` (modello Order), `$transaction` (dati pagamento)
- **Listener registrati**:
  1. `MarkOrderProcessing`
  2. `GenerateBrtLabel`

### OrderPaymentFailed

- **File**: `app/Events/OrderPaymentFailed.php`
- **Trigger**: quando il pagamento di un ordine fallisce
- **Dati**: `$order` (modello Order)
- **Listener registrato**: non presente in EventServiceProvider (potrebbe essere collegato via discovery automatica)

---

## Listeners

### SendVerificationEmail

- **File**: `app/Listeners/SendVerificationEmail.php`
- **Ascolta**: `UserRegistered`
- **Azione**: invia l'email di verifica all'utente registrato
- **Email**: `VerificationEmail` (template in `resources/views/emails/verificationEmail.blade.php`)

### MarkOrderProcessing

- **File**: `app/Listeners/MarkOrderProcessing.php`
- **Ascolta**: `OrderPaid`
- **Azione**: cambia lo stato dell'ordine da `pending` a `processing`
- **Codice chiave**:
  ```php
  $event->order->update(['status' => Order::PROCESSING]);
  ```

### GenerateBrtLabel

- **File**: `app/Listeners/GenerateBrtLabel.php`
- **Ascolta**: `OrderPaid`
- **Azione**: genera automaticamente l'etichetta BRT
- **Comportamento dettagliato**:
  1. Controlla se BRT e' configurato (`BRT_CLIENT_ID`)
  2. Controlla se l'ordine ha gia' un'etichetta
  3. Prepara opzioni (contrassegno, PUDO)
  4. Chiama `BrtService::createShipment()` con retry (max 3 tentativi)
  5. Se successo: salva etichetta, tracking, aggiorna stato a `in_transit`
  6. Invia email con etichetta all'utente
  7. Se fallisce: salva errore nel campo `brt_error` dell'ordine

### CartEmpty

- **File**: `app/Listeners/CartEmpty.php`
- **Ascolta**: `OrderCreated`
- **Azione**: svuota il carrello dell'utente dopo la creazione dell'ordine
- **Codice chiave**:
  ```php
  $this->cart->empty();
  ```

### MarkOrderPaymentFailed

- **File**: `app/Listeners/MarkOrderPaymentFailed.php`
- **Ascolta**: `OrderPaymentFailed`
- **Azione**: cambia lo stato dell'ordine a `payment_failed`
- **Codice chiave**:
  ```php
  $event->order->update(['status' => Order::PAYMENT_FAILED]);
  ```

---

## Ordine di esecuzione

Quando un ordine viene pagato, i listener vengono eseguiti nell'ordine in cui sono registrati:

1. `MarkOrderProcessing` - stato diventa `processing`
2. `GenerateBrtLabel` - genera etichetta, stato diventa `in_transit`

L'ordine e' importante: `GenerateBrtLabel` fa `$order->refresh()` per leggere lo stato aggiornato da `MarkOrderProcessing`.

---

## Come aggiungere un nuovo listener

### 1. Creare l'evento (se serve)

```bash
php artisan make:event NomeEvento
```

### 2. Creare il listener

```bash
php artisan make:listener NomeListener
```

### 3. Registrare in EventServiceProvider

In `app/Providers/EventServiceProvider.php`:

```php
protected $listen = [
    \App\Events\NomeEvento::class => [
        \App\Listeners\NomeListener::class,
    ],
];
```

### 4. Lanciare l'evento

```php
event(new NomeEvento($dati));
```

---

## Come lanciare un evento

Nei controller, gli eventi vengono lanciati cosi':

```php
// Dopo un pagamento riuscito
event(new OrderPaid($order, $transaction));

// Dopo la creazione di un ordine
event(new OrderCreated($order));

// Dopo un pagamento fallito
event(new OrderPaymentFailed($order));
```
