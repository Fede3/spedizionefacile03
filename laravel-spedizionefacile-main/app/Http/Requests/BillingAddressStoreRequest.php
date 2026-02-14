<?php

/**
 * REQUEST: VALIDAZIONE INDIRIZZO DI FATTURAZIONE
 *
 * Valida i dati inviati quando l'utente crea o modifica un indirizzo
 * di fatturazione. Tutti i campi sono obbligatori: nome/ragione sociale,
 * via, citta', provincia e CAP.
 */

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BillingAddressStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Regole di validazione per l'indirizzo di fatturazione.
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string',            // Nome o ragione sociale (obbligatorio)
            'address' => 'required|string',          // Via/piazza (obbligatorio)
            'city' => 'required|string',             // Citta' (obbligatorio)
            'province_name' => 'required|string',    // Nome provincia (obbligatorio)
            'postal_code' => 'required|string',      // CAP (obbligatorio)
            /* 'default' => 'nullable' */
        ];
    }
}
