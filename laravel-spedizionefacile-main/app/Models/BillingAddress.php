<?php
/**
 * FILE: BillingAddress.php
 * SCOPO: Modello indirizzo di fatturazione (diverso da indirizzo spedizione).
 *
 * COSA ENTRA:
 *   - name (nome/ragione sociale), address, city, province_name, postal_code
 *
 * COSA ESCE:
 *   - Record salvato in tabella billing_addresses
 *
 * CHIAMATO DA:
 *   - BillingAddressController.php — CRUD indirizzi di fatturazione
 *   - nuxt: pages/checkout.vue (selezione indirizzo fattura)
 *
 * EFFETTI COLLATERALI:
 *   - Nessuno (modello semplice senza boot/observer)
 *
 * ERRORI TIPICI:
 *   - province_name e' il nome completo della provincia (es. "Milano"), non la sigla ("MI")
 *
 * DOCUMENTI CORRELATI:
 *   - BillingAddressController.php — controller CRUD
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
