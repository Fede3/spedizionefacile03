<?php

/**
 * REQUEST: VALIDAZIONE INDIRIZZO UTENTE (RUBRICA)
 *
 * Valida i dati inviati quando l'utente salva un nuovo indirizzo
 * nella sua rubrica personale o ne modifica uno esistente.
 *
 * I campi obbligatori sono: nome, via, citta' e CAP.
 * Tutti gli altri sono opzionali (l'utente puo' compilarli dopo).
 */

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UserAddressStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Regole di validazione per l'indirizzo in rubrica.
     */
    public function rules(): array
    {
        return [
            'type' => 'nullable|string',                    // Tipo (privato/azienda) - opzionale
            'name' => 'required|string',                    // Nome (obbligatorio)
            'additional_information' => 'nullable|string',  // Info aggiuntive - opzionale
            'address' => 'required|string',                 // Via/piazza (obbligatorio)
            'number_type' => 'nullable|string',             // Tipo numero civico - opzionale
            'address_number' => 'nullable|string',          // Numero civico - opzionale
            'intercom_code' => 'nullable|string',           // Codice citofono - opzionale
            'country' => 'nullable|string',                 // Nazione - opzionale
            'city' => 'required|string',                    // Citta' (obbligatorio)
            'postal_code' => 'required|string',             // CAP (obbligatorio)
            'province' => 'nullable|string',                // Sigla provincia - opzionale
            'province_name' => 'nullable|string',           // Nome provincia - opzionale
            'telephone_number' => 'nullable|string',        // Telefono - opzionale
            'email' => 'nullable|string',                   // Email - opzionale
            'default' => 'nullable'                         // Se impostare come predefinito - opzionale
        ];
    }
}
