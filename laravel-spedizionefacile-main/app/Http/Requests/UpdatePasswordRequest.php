<?php

/**
 * REQUEST: VALIDAZIONE AGGIORNAMENTO PASSWORD
 *
 * Valida i dati inviati quando un utente reimposta la sua password
 * dopo aver richiesto il recupero password.
 *
 * Servono tre campi:
 * - L'email dell'utente
 * - Il token di reset (codice segreto ricevuto via email)
 * - La nuova password (con conferma)
 */

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Regole di validazione per il reset della password.
     */
    public function rules(): array
    {
        return [
            'email' => 'required|email',          // Email dell'utente (obbligatoria)
            'resetToken' => 'required|string',     // Token di reset ricevuto via email
            'password' => [
                'required',
                'confirmed',
                'min:8',                // Minimo 8 caratteri
                'regex:/[a-z]/',        // Almeno una lettera minuscola
                'regex:/[A-Z]/',        // Almeno una lettera maiuscola
                'regex:/[0-9]/',        // Almeno un numero
                'regex:/[^a-zA-Z0-9\s]/',  // Almeno un simbolo speciale
            ],
        ];
    }

    /**
     * Messaggi di errore personalizzati in italiano.
     */
    public function messages(): array
    {
        return [
            'password.required' => 'La password è obbligatoria.',
            'password.confirmed' => 'La conferma della password non corrisponde.',
            'password.min' => 'La password deve contenere almeno 8 caratteri.',
            'password.regex' => 'La password deve contenere almeno una lettera maiuscola, una minuscola, un numero e un simbolo speciale (es. @!#.-_).',
        ];
    }
}
