# Perche' esiste un sistema portafoglio

Spiega le motivazioni dietro il portafoglio virtuale in SpediamoFacile.

---

## Cos'e' il portafoglio

Il portafoglio e' un **saldo virtuale** che ogni utente ha nel proprio account.
Funziona come una carta prepagata: l'utente ricarica il portafoglio e poi usa il saldo per pagare le spedizioni.

---

## Come funziona

### Ricarica

L'utente ricarica il portafoglio tramite Stripe (carta di credito).
Viene creato un movimento di tipo `credit`:

```php
WalletMovement::create([
    'user_id' => $user->id,
    'type' => 'credit',          // Entrata
    'amount' => 50.00,
    'currency' => 'EUR',
    'status' => 'confirmed',
    'source' => 'stripe',
    'description' => 'Ricarica portafoglio',
]);
```

### Pagamento

Quando l'utente paga una spedizione con il portafoglio, viene creato un movimento di tipo `debit`:

```php
WalletMovement::create([
    'user_id' => $user->id,
    'type' => 'debit',           // Uscita
    'amount' => 12.00,
    'currency' => 'EUR',
    'status' => 'confirmed',
    'source' => 'order',
    'reference' => $order->id,
    'description' => 'Pagamento ordine #' . $order->id,
]);
```

### Calcolo saldo

Il saldo e' la differenza tra tutte le entrate e tutte le uscite confermate:

```php
public function walletBalance(): float {
    $credits = $this->walletMovements()
        ->where('status', 'confirmed')
        ->where('type', 'credit')
        ->sum('amount');
    $debits = $this->walletMovements()
        ->where('status', 'confirmed')
        ->where('type', 'debit')
        ->sum('amount');
    return round($credits - $debits, 2);
}
```

---

## Perche' un portafoglio

### 1. Pagamento piu' veloce

Con il portafoglio, il pagamento e' **istantaneo**: niente inserimento carta, niente 3D Secure, niente attese.
Un click e la spedizione e' pagata.

Per chi spedisce spesso, questo risparmia tempo significativo.

### 2. Riduzione costi Stripe

Ogni transazione con carta di credito ha un costo (commissione Stripe: ~1.5% + 0.25 EUR).
Se un utente ricarica 100 EUR e poi fa 10 spedizioni da 10 EUR:

- **Senza portafoglio**: 10 transazioni Stripe = 10 commissioni
- **Con portafoglio**: 1 transazione Stripe (ricarica) = 1 commissione

Il risparmio sulle commissioni e' significativo per utenti frequenti.

### 3. Fidelizzazione

Un saldo nel portafoglio e' un incentivo a tornare sul sito.
L'utente ha gia' dei soldi "investiti" nella piattaforma.

### 4. Base per il sistema referral

Il portafoglio e' la base per le commissioni dei Partner Pro.
Le commissioni vengono accreditate come movimenti `credit` nel portafoglio:

```php
WalletMovement::create([
    'type' => 'credit',
    'source' => 'referral',
    'description' => 'Commissione referral ordine #42',
]);
```

---

## Protezioni

### Chiave di idempotenza

Ogni movimento ha un campo `idempotency_key` per evitare duplicati.
Se la stessa richiesta viene inviata due volte (es. per un problema di rete), il movimento viene creato una sola volta.

### Solo movimenti confermati

Il saldo considera solo i movimenti con `status = 'confirmed'`.
I movimenti `pending` non influenzano il saldo disponibile.

### Prelievi controllati

I Partner Pro possono richiedere il prelievo delle commissioni, ma le richieste devono essere **approvate manualmente** da un admin.

---

## Flusso completo

```
Utente                  Backend                    Stripe
  │                       │                          │
  │ Richiede ricarica     │                          │
  │ ────────────────────► │                          │
  │                       │ Crea PaymentIntent       │
  │                       │ ────────────────────────►│
  │                       │                          │
  │ Paga con carta        │                          │
  │ ────────────────────────────────────────────────►│
  │                       │                          │
  │                       │ Webhook: pagamento ok    │
  │                       │ ◄────────────────────────│
  │                       │                          │
  │                       │ Crea WalletMovement      │
  │                       │ (credit, confirmed)      │
  │                       │                          │
  │ Saldo aggiornato      │                          │
  │ ◄──────────────────── │                          │
```

---

## Endpoint del portafoglio

| Metodo | URL | Descrizione |
|---|---|---|
| GET | `/api/wallet/balance` | Saldo disponibile |
| GET | `/api/wallet/movements` | Lista movimenti |
| POST | `/api/wallet/top-up` | Ricarica portafoglio |
| POST | `/api/wallet/pay` | Paga ordine con portafoglio |

Admin:
| GET | `/api/admin/wallet/overview` | Panoramica tutti i portafogli |
| GET | `/api/admin/wallet/users/{user}/movements` | Movimenti di un utente |
