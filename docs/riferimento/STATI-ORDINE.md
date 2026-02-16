# Riferimento: Stati ordine

Lista completa degli stati ordine con significato, transizioni e chi li attiva.

Definiti in: `laravel-spedizionefacile-main/app/Models/Order.php`

---

## Tabella stati

| Costante | Valore DB | Italiano | Descrizione |
|---|---|---|---|
| `PENDING` | `pending` | In attesa | Ordine creato, in attesa di pagamento |
| `PROCESSING` | `processing` | In lavorazione | Pagamento ricevuto, in fase di elaborazione |
| `PAYMENT_FAILED` | `payment_failed` | Fallito | Pagamento non andato a buon fine |
| `IN_TRANSIT` | `in_transit` | In transito | Etichetta BRT generata, pacco in viaggio |
| `COMPLETED` | `completed` | Completato | Spedizione conclusa, pacco consegnato |
| - | `payed` | Pagato | Stato legacy (pagamento confermato) |
| - | `cancelled` | Annullato | Ordine annullato dall'utente o dall'admin |
| - | `delivered` | Consegnato | Pacco consegnato al destinatario |
| - | `in_giacenza` | In giacenza | Pacco in deposito BRT (tentativo di consegna fallito) |

---

## Diagramma delle transizioni

```
                          ┌──────────────────┐
                          │    CANCELLED     │
                          │  (annullato)     │
                          └──────────────────┘
                                  ▲
                                  │ cancel
                                  │
┌──────────┐  pagamento ok  ┌────────────┐  etichetta ok  ┌────────────┐
│ PENDING  │ ─────────────► │ PROCESSING │ ─────────────► │ IN_TRANSIT │
│          │                │            │                │            │
└──────────┘                └────────────┘                └────────────┘
      │                                                        │
      │ pagamento ko                               consegna ok │
      ▼                                                        ▼
┌────────────────┐                                  ┌────────────┐
│ PAYMENT_FAILED │                                  │ COMPLETED  │
│                │                                  │            │
└────────────────┘                                  └────────────┘
      │                                                    ▲
      │ retry                                              │
      └──────────────────► (torna a PENDING) ──────────────┘
```

---

## Dettaglio transizioni

### `→ PENDING`

- **Chi**: il sistema automaticamente
- **Quando**: alla creazione dell'ordine
- **Come**: nel metodo `booted()` del modello `Order`
- **Codice**:
  ```php
  protected static function booted() {
      static::creating(function($order) {
          if (empty($order->status)) {
              $order->status = self::PENDING;
          }
      });
  }
  ```

### `PENDING → PROCESSING`

- **Chi**: listener `MarkOrderProcessing`
- **Quando**: dopo il pagamento riuscito
- **Trigger**: evento `OrderPaid`
- **File**: `app/Listeners/MarkOrderProcessing.php`

### `PENDING → PAYMENT_FAILED`

- **Chi**: listener `MarkOrderPaymentFailed`
- **Quando**: se il pagamento fallisce
- **Trigger**: evento `OrderPaymentFailed`
- **File**: `app/Listeners/MarkOrderPaymentFailed.php`

### `PROCESSING → IN_TRANSIT`

- **Chi**: listener `GenerateBrtLabel`
- **Quando**: dopo la generazione dell'etichetta BRT
- **Trigger**: evento `OrderPaid` (stesso evento, listener diverso)
- **File**: `app/Listeners/GenerateBrtLabel.php`
- **Nota**: avviene subito dopo PROCESSING, nella stessa catena di eventi

### `→ COMPLETED`

- **Chi**: admin o sistema
- **Quando**: spedizione conclusa
- **Come**: endpoint admin `PATCH /api/admin/orders/{order}/status`

### `→ CANCELLED`

- **Chi**: utente o admin
- **Quando**: annullamento richiesto
- **Come**: endpoint `POST /api/orders/{order}/cancel`

---

## Stato iniziale per tipo di pagamento

| Metodo di pagamento | Stato dopo creazione ordine | Stato dopo conferma pagamento |
|---|---|---|
| Carta di credito (Stripe) | `pending` | `processing` → `in_transit` |
| Portafoglio | `completed` (immediato) | - |
| Bonifico | `pending` (resta in attesa) | `processing` (dopo conferma admin) |
