# Come aggiungere un campo a un modello

Questa guida spiega come aggiungere un nuovo campo a qualsiasi modello del progetto.
Il processo e' sempre lo stesso, indipendentemente dal modello.

---

## I 5 passi

1. Creare una migrazione (database)
2. Aggiornare il modello (`$fillable`)
3. Aggiornare la API Resource (risposta JSON)
4. Aggiornare il controller (validazione)
5. Aggiornare il frontend (form e visualizzazione)

---

## Passo 1: Creare la migrazione

```bash
cd laravel-spedizionefacile-main
php artisan make:migration add_NOME_CAMPO_to_NOME_TABELLA_table
```

Esempio per aggiungere `fiscal_code` alla tabella `users`:

```bash
php artisan make:migration add_fiscal_code_to_users_table
```

Nel file creato in `database/migrations/`:

```php
public function up(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->string('fiscal_code')->nullable()->after('telephone_number');
    });
}

public function down(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->dropColumn('fiscal_code');
    });
}
```

### Tipi di colonna comuni

| Tipo | Descrizione | Esempio |
|---|---|---|
| `$table->string('nome')` | Testo breve (max 255 caratteri) | Nome, email |
| `$table->text('nome')` | Testo lungo | Descrizioni, note |
| `$table->integer('nome')` | Numero intero | Quantita', codici |
| `$table->decimal('nome', 10, 2)` | Numero decimale | Prezzi |
| `$table->boolean('nome')` | Vero/Falso | Flag, switch |
| `$table->timestamp('nome')` | Data e ora | Date di creazione |
| `$table->json('nome')` | Dati strutturati | Configurazioni |

Aggiungi sempre `->nullable()` se il campo non e' obbligatorio.

Esegui la migrazione:

```bash
php artisan migrate
```

---

## Passo 2: Aggiornare il modello

Apri il modello in `app/Models/` e aggiungi il campo all'array `$fillable`:

```php
// app/Models/User.php
protected $fillable = [
    'name',
    'surname',
    'email',
    'fiscal_code',  // <-- Aggiunto
    // ...
];
```

Se il campo richiede una conversione automatica, aggiungilo a `$casts`:

```php
protected $casts = [
    'is_active' => 'boolean',       // Converte 0/1 in true/false
    'metadata' => 'array',          // Converte JSON in array PHP
    'created_at' => 'datetime',     // Converte stringa in oggetto Carbon
    'price' => 'decimal:2',         // Forza 2 decimali
];
```

Se il campo non deve apparire nelle risposte JSON, aggiungilo a `$hidden`:

```php
protected $hidden = [
    'password',
    'campo_segreto',  // Non verra' mai inviato al frontend
];
```

---

## Passo 3: Aggiornare la API Resource

Le Resource si trovano in `app/Http/Resources/`. Formattano i dati per il frontend.

Esempio in `app/Http/Resources/OrderResource.php`:

```php
public function toArray($request)
{
    return [
        'id' => $this->id,
        'status' => $this->status,
        'fiscal_code' => $this->fiscal_code,  // <-- Aggiunto
        // ...
    ];
}
```

Non tutti i modelli hanno una Resource. Se il controller restituisce direttamente il modello, il campo apparira' automaticamente (a meno che non sia in `$hidden`).

---

## Passo 4: Aggiornare il controller

Nel controller, aggiungi la regola di validazione:

```php
$validated = $request->validate([
    // ...campi esistenti...
    'fiscal_code' => 'sometimes|nullable|string|max:16',  // <-- Aggiunto
]);
```

### Regole di validazione comuni

| Regola | Significato |
|---|---|
| `required` | Obbligatorio |
| `sometimes` | Valida solo se presente nella richiesta |
| `nullable` | Puo' essere null |
| `string` | Deve essere una stringa |
| `integer` | Deve essere un numero intero |
| `numeric` | Deve essere un numero (anche decimale) |
| `email` | Deve essere un indirizzo email valido |
| `max:255` | Lunghezza massima 255 caratteri |
| `min:0` | Valore minimo 0 |
| `in:val1,val2` | Deve essere uno dei valori elencati |

---

## Passo 5: Aggiornare il frontend

### Nel form (input)

```vue
<UFormGroup label="Codice Fiscale">
  <UInput v-model="form.fiscal_code" placeholder="RSSMRA85M01H501Z" />
</UFormGroup>
```

### Nell'oggetto form (script)

```javascript
const form = ref({
  // ...campi esistenti...
  fiscal_code: user.value?.fiscal_code || '',
});
```

### Nella chiamata API (salvataggio)

```javascript
const { data } = await $sanctumFetch('/api/users/' + user.value.id, {
  method: 'PUT',
  body: form.value,
});
```

---

## Modelli disponibili

Ecco i modelli e le tabelle corrispondenti:

| Modello | Tabella | File |
|---|---|---|
| `User` | `users` | `app/Models/User.php` |
| `Order` | `orders` | `app/Models/Order.php` |
| `Package` | `packages` | `app/Models/Package.php` |
| `PackageAddress` | `package_addresses` | `app/Models/PackageAddress.php` |
| `Service` | `services` | `app/Models/Service.php` |
| `Transaction` | `transactions` | `app/Models/Transaction.php` |
| `UserAddress` | `user_addresses` | `app/Models/UserAddress.php` |
| `WalletMovement` | `wallet_movements` | `app/Models/WalletMovement.php` |
| `Coupon` | `coupons` | `app/Models/Coupon.php` |
| `Location` | `locations` | `app/Models/Location.php` |
| `Setting` | `settings` | `app/Models/Setting.php` |
| `ContactMessage` | `contact_messages` | `app/Models/ContactMessage.php` |
| `ReferralUsage` | `referral_usages` | `app/Models/ReferralUsage.php` |
| `WithdrawalRequest` | `withdrawal_requests` | `app/Models/WithdrawalRequest.php` |
| `ProRequest` | `pro_requests` | `app/Models/ProRequest.php` |
| `BillingAddress` | `billing_addresses` | `app/Models/BillingAddress.php` |
