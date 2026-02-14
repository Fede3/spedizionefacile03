# Primo cambiamento: aggiungere un campo al profilo utente

In questo tutorial aggiungeremo il campo "codice fiscale" (`fiscal_code`) al profilo utente.
E' un esempio semplice che tocca tutti i livelli: database, backend e frontend.

---

## Panoramica dei file da modificare

| Livello | File | Cosa fare |
|---|---|---|
| Database | Nuova migrazione | Aggiungere la colonna alla tabella `users` |
| Model | `app/Models/User.php` | Aggiungere il campo a `$fillable` |
| Resource | `app/Http/Resources/` | Includere il campo nella risposta JSON |
| Controller | `app/Http/Controllers/UserController.php` | Accettare il campo nell'aggiornamento |
| Frontend | `pages/account/profilo.vue` | Aggiungere il campo nel form |

---

## Passo 1: Creare la migrazione

Le migrazioni descrivono le modifiche al database. Crea una nuova migrazione:

```bash
cd laravel-spedizionefacile-main
php artisan make:migration add_fiscal_code_to_users_table
```

Questo crea un file in `database/migrations/` con un nome tipo:
`2026_02_14_120000_add_fiscal_code_to_users_table.php`

Modifica il file:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
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
};
```

Esegui la migrazione:

```bash
php artisan migrate
```

---

## Passo 2: Aggiornare il modello User

Apri `app/Models/User.php` e aggiungi `fiscal_code` all'array `$fillable`:

```php
protected $fillable = [
    'name',
    'surname',
    'email',
    'telephone_number',
    'fiscal_code',          // <-- Aggiunto
    'password',
    // ... altri campi
];
```

L'array `$fillable` dice a Laravel quali campi possono essere scritti.
Senza questa aggiunta, Laravel ignorerebbe il campo silenziosamente.

---

## Passo 3: Aggiornare il controller

Apri `app/Http/Controllers/UserController.php` e nel metodo `update`, aggiungi la validazione:

```php
public function update(Request $request, $id)
{
    $validated = $request->validate([
        'name' => 'sometimes|string|max:255',
        'surname' => 'sometimes|string|max:255',
        'telephone_number' => 'sometimes|string|max:20',
        'fiscal_code' => 'sometimes|nullable|string|max:16',  // <-- Aggiunto
    ]);

    $user = User::findOrFail($id);
    $user->update($validated);

    return response()->json($user);
}
```

---

## Passo 4: Aggiornare il frontend

Apri `nuxt-spedizionefacile-master/pages/account/profilo.vue` e aggiungi il campo nel template:

```vue
<UFormGroup label="Codice Fiscale">
  <UInput
    v-model="form.fiscal_code"
    placeholder="RSSMRA85M01H501Z"
    maxlength="16"
  />
</UFormGroup>
```

Nel `<script setup>`, aggiungi il campo all'oggetto `form`:

```javascript
const form = ref({
  name: user.value?.name || '',
  surname: user.value?.surname || '',
  telephone_number: user.value?.telephone_number || '',
  fiscal_code: user.value?.fiscal_code || '',  // <-- Aggiunto
});
```

---

## Passo 5: Verificare

1. Apri il sito e vai su **Account > Profilo**
2. Dovresti vedere il nuovo campo "Codice Fiscale"
3. Inserisci un valore e salva
4. Ricarica la pagina: il valore dovrebbe essere ancora presente

---

## Riepilogo del flusso

```
Browser                Frontend               Backend                Database
  │                      │                      │                      │
  │  Compila form        │                      │                      │
  │  ──────────────►     │                      │                      │
  │                      │  PUT /api/users/1    │                      │
  │                      │  ──────────────────► │                      │
  │                      │                      │  UPDATE users SET    │
  │                      │                      │  fiscal_code = ...   │
  │                      │                      │  ──────────────────► │
  │                      │  { fiscal_code: .. } │                      │
  │  ◄──────────────     │  ◄────────────────── │                      │
  │  Mostra conferma     │                      │                      │
```

---

## Prossimo passo

Vai a [Secondo cambiamento](05-SECONDO-CAMBIAMENTO.md) per aggiungere un nuovo servizio di spedizione.
