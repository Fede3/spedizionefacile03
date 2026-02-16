<?php
/**
 * FILE: BillingAddress.php
 * SCOPO: Modello indirizzo di fatturazione (diverso da indirizzo spedizione).
 *
 * DOVE SI USA:
 *   - BillingAddressController.php — CRUD indirizzi di fatturazione
 *   - nuxt: pages/checkout.vue (selezione indirizzo fattura)
 *
 * DATI IN INGRESSO:
 *   - name (nome/ragione sociale), address, city, province_name, postal_code
 *   Esempio: BillingAddress::create(['name' => 'Mario Rossi Srl', 'city' => 'Milano'])
 *
 * DATI IN USCITA:
 *   - Record salvato in tabella billing_addresses
 *
 * VINCOLI:
 *   - province_name e' il nome completo della provincia (es. "Milano"), non la sigla ("MI")
 *   - Non ha relazione diretta con User (non c'e' user_id)
 *
 * ERRORI TIPICI:
 *   - Confusione con UserAddress o PackageAddress: BillingAddress e' solo per la fatturazione
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere user_id: aggiungere in $fillable e nella migrazione, poi creare relazione
 *
 * COLLEGAMENTI:
 *   - app/Http/Controllers/BillingAddressController.php — controller CRUD
 *   - app/Http/Resources/BillingAddressResource.php — formattazione per risposta API
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingAddress extends Model
{
    /**
     * Campi compilabili dall'esterno.
     */
    protected $fillable = [
        'name',            // Nome o ragione sociale per la fattura
        'address',         // Via/piazza/corso
        'city',            // Citta'
        'province_name',   // Nome della provincia (es. "Milano", "Roma")
        'postal_code',     // CAP - Codice di Avviamento Postale
    ];

    /* protected static function booted()
    {
        static::creating(function ($address) {
            $address->identifier = (string) Str::uuid();
        });
    } */
}
