# Terzo cambiamento: modificare il flusso di checkout

In questo tutorial modificheremo il flusso di checkout per aggiungere il pagamento tramite bonifico bancario.
E' un cambiamento piu' ampio che coinvolge il controller dei pagamenti, il frontend e gli eventi.

---

## Come funziona il checkout attualmente

Il flusso di pagamento segue questi passi:

1. L'utente va su `/checkout`
2. Il frontend chiama `POST /api/stripe/create-order` per creare l'ordine
3. L'utente sceglie il metodo di pagamento (carta o portafoglio)
4. Per la carta: il frontend crea un PaymentIntent con Stripe
5. Dopo il pagamento, il frontend chiama `POST /api/stripe/order-paid`
6. Il backend lancia l'evento `OrderPaid`
7. I listener cambiano lo stato e generano l'etichetta BRT

---

## File coinvolti

| File | Cosa fare |
|---|---|
| `app/Http/Controllers/StripeController.php` | Gia' supporta pagamenti non-Stripe via `markOrderCompleted` |
| `nuxt-spedizionefacile-master/pages/checkout.vue` | Aggiungere l'opzione bonifico nell'interfaccia |
| `app/Models/Order.php` | Aggiungere lo stato `awaiting_payment` (opzionale) |
| `app/Models/Transaction.php` | Gia' supporta il tipo `bank_transfer` |

---

## Passo 1: Capire il metodo markOrderCompleted

Il backend ha gia' il metodo `markOrderCompleted` in `StripeController.php` che gestisce i pagamenti non-Stripe:

```php
// In app/Http/Controllers/StripeController.php

public function markOrderCompleted(Request $request) {
    $request->validate([
        'order_id' => 'required|integer',
        'payment_type' => 'required|string|in:wallet,bonifico',  // Gia' supporta 'bonifico'
        'ext_id' => 'nullable|string',
    ]);

    $order = Order::findOrFail($request->order_id);

    // Se paga con bonifico: resta in attesa (pending)
    // Se paga con portafoglio: completato subito
    $order->status = $request->payment_type === 'bonifico'
        ? Order::PENDING
        : Order::COMPLETED;
    $order->save();

    // ...
}
```

Il backend e' gia' pronto. Dobbiamo solo aggiungere l'opzione nel frontend.

---

## Passo 2: Aggiungere l'opzione nel frontend checkout

Apri `nuxt-spedizionefacile-master/pages/checkout.vue`.

### Aggiungere il selettore del metodo di pagamento

```vue
<template>
  <div>
    <h2>Metodo di pagamento</h2>

    <URadioGroup v-model="paymentMethod" :options="paymentOptions" />

    <!-- Sezione carta di credito (esistente) -->
    <div v-if="paymentMethod === 'card'">
      <!-- Componente Stripe Elements gia' esistente -->
    </div>

    <!-- Sezione portafoglio (esistente) -->
    <div v-if="paymentMethod === 'wallet'">
      <p>Saldo disponibile: {{ walletBalance }} EUR</p>
    </div>

    <!-- NUOVA sezione bonifico -->
    <div v-if="paymentMethod === 'bonifico'">
      <UAlert
        icon="i-heroicons-information-circle"
        title="Pagamento con bonifico"
        description="Dopo aver confermato l'ordine, riceverai le coordinate bancarie via email. L'ordine sara' processato dopo la ricezione del pagamento."
      />
    </div>

    <UButton @click="processPayment" :loading="isProcessing">
      Conferma ordine
    </UButton>
  </div>
</template>
```

### Aggiungere la logica di pagamento

```javascript
const paymentOptions = [
  { label: 'Carta di credito', value: 'card' },
  { label: 'Portafoglio', value: 'wallet' },
  { label: 'Bonifico bancario', value: 'bonifico' },
];

const paymentMethod = ref('card');

async function processPayment() {
  isProcessing.value = true;

  try {
    // Prima crea l'ordine
    const orderResponse = await $sanctumFetch('/api/stripe/create-order', {
      method: 'POST',
    });
    const orderId = orderResponse.data.order_id;

    if (paymentMethod.value === 'card') {
      // Flusso Stripe esistente...
    } else if (paymentMethod.value === 'wallet') {
      // Flusso portafoglio esistente...
    } else if (paymentMethod.value === 'bonifico') {
      // NUOVO: Flusso bonifico
      await $sanctumFetch('/api/stripe/mark-order-completed', {
        method: 'POST',
        body: {
          order_id: orderId,
          payment_type: 'bonifico',
        },
      });

      // Redirect alla pagina di riepilogo
      navigateTo('/riepilogo?order_id=' + orderId);
    }
  } catch (error) {
    toast.add({ title: 'Errore nel pagamento', color: 'red' });
  } finally {
    isProcessing.value = false;
  }
}
```

---

## Passo 3: Aggiornare la pagina di riepilogo

In `nuxt-spedizionefacile-master/pages/riepilogo.vue`, gestisci il caso bonifico:

```vue
<div v-if="order.status === 'pending'">
  <UAlert color="yellow" title="In attesa di pagamento">
    <template #description>
      Effettua il bonifico a:<br>
      <strong>IBAN: IT00 0000 0000 0000 0000 0000 000</strong><br>
      Causale: <strong>Ordine #{{ order.id }}</strong><br>
      Importo: <strong>{{ order.total }} EUR</strong>
    </template>
  </UAlert>
</div>
```

---

## Passo 4: Gestire la conferma admin del bonifico

Quando l'admin riceve il bonifico, deve confermare l'ordine.
Nel pannello admin, l'ordine con stato "pending" e tipo pagamento "bonifico" puo' essere confermato.

L'endpoint gia' esiste:

```
PATCH /api/admin/orders/{order}/status
```

L'admin cambia lo stato da `pending` a `processing`, e poi l'evento `OrderPaid` genera l'etichetta BRT.

---

## Passo 5: (Opzionale) Aggiungere uno stato dedicato

Se vuoi distinguere "in attesa di pagamento carta" da "in attesa di bonifico", puoi aggiungere uno stato:

In `app/Models/Order.php`:

```php
const AWAITING_BANK_TRANSFER = 'awaiting_bank_transfer';
```

E nella traduzione:

```php
public function getStatus($status) {
    $data = [
        // ...stati esistenti...
        'awaiting_bank_transfer' => 'In attesa di bonifico',
    ];

    return $data[$status] ?? $status;
}
```

---

## Riepilogo del flusso bonifico

```
Utente                     Backend                    Admin
  │                          │                          │
  │ Seleziona "Bonifico"     │                          │
  │ ──────────────────────►  │                          │
  │                          │ Crea ordine (pending)     │
  │ Riceve coordinate IBAN   │                          │
  │ ◄──────────────────────  │                          │
  │                          │                          │
  │ Effettua bonifico        │                          │
  │ (fuori dal sito)         │                          │
  │                          │                          │
  │                          │ Admin conferma ricezione  │
  │                          │ ◄──────────────────────  │
  │                          │ OrderPaid → BRT label     │
  │                          │                          │
  │ Riceve email con         │                          │
  │ etichetta e tracking     │                          │
  │ ◄──────────────────────  │                          │
```

---

## Punti di attenzione

- **Sicurezza**: il metodo `markOrderCompleted` verifica gia' che l'utente sia il proprietario dell'ordine
- **Evento OrderPaid**: per il bonifico, l'evento va lanciato solo quando l'admin conferma il pagamento
- **Email**: puoi inviare un'email all'utente con le coordinate bancarie usando una nuova classe Mailable
- **Timeout**: definisci una scadenza per il pagamento bonifico (es. 5 giorni) con un job schedulato

---

## Cosa hai imparato

Con questo tutorial hai visto come:

1. Capire un flusso esistente prima di modificarlo
2. Riutilizzare endpoint gia' esistenti (`markOrderCompleted`)
3. Aggiungere opzioni nel frontend senza modificare il backend
4. Gestire flussi asincroni (il bonifico viene confermato manualmente)
5. Estendere il sistema degli stati ordine
