<?php

/**
 * REQUEST: VALIDAZIONE REGISTRAZIONE UTENTE
 *
 * Valida tutti i dati inviati dall'utente quando si registra sul sito.
 * Controlla che tutti i campi obbligatori siano presenti e validi.
 *
 * Regole particolari per la password:
 * - Minimo 8 caratteri
 * - Almeno una lettera minuscola
 * - Almeno una lettera maiuscola
 * - Almeno un numero
 * - Almeno un simbolo speciale (@$!%*?&#^)
 * - Deve essere confermata (scritta due volte uguale)
 *
 * L'email deve essere unica (non gia' registrata) e confermata.
 * I messaggi di errore sono tutti in italiano per l'utente.
 */

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Regole di validazione per la registrazione.
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',              // Nome obbligatorio
            'surname' => 'required|string|max:255',            // Cognome obbligatorio
            'prefix' => 'string|required',                     // Prefisso telefonico (es. +39)
            'telephone_number' => 'required|string|max:255',   // Numero di telefono
            'email' => 'required|string|email|max:255|unique:users|confirmed', // Email unica e confermata
            'password' => [
                'required',
                'string',
                'min:8',                // Minimo 8 caratteri
                'confirmed',            // Deve corrispondere alla conferma
                'regex:/[a-z]/',        // Almeno una lettera minuscola
                'regex:/[A-Z]/',        // Almeno una lettera maiuscola
                'regex:/[0-9]/',        // Almeno un numero
                'regex:/[^a-zA-Z0-9\s]/',  // Almeno un simbolo speciale (qualsiasi carattere non alfanumerico)
            ],
            'role' => 'required|string|in:User,Cliente,Partner Pro', // Accetta le label del frontend (il controller forza sempre "User")
            'referred_by' => 'nullable|string|max:8',          // Codice referral opzionale
            'user_type' => 'nullable|string|in:privato,commerciante', // Tipo account: privato o azienda
        ];
    }

    /**
     * Messaggi di errore personalizzati in italiano.
     * Vengono mostrati all'utente quando un campo non e' valido.
     */
    public function messages() {
        return [
            'name.required' => 'Il nome è obbligatorio.',
            'surname.required' => 'Il cognome è obbligatorio.',
            'telephone_number.required' => 'Il numero di telefono è obbligatorio.',

            'email.required' => 'L\'indirizzo email è obbligatorio.',
            'email.email' => 'Devi inserire un indirizzo email valido.',
            'email.max' => 'L\'indirizzo email non può superare i 255 caratteri.',
            'email.unique' => 'Questa email è già registrata.',
            'email.confirmed' => 'La conferma dell\'email non corrisponde.',

            'password.required' => 'La password è obbligatoria.',
            'password.string' => 'La password deve essere una stringa valida.',
            'password.min' => 'La password deve contenere almeno 8 caratteri.',
            'password.regex' => 'La password deve contenere almeno una lettera maiuscola, una minuscola, un numero e un simbolo speciale (es. @!#.-_).',
            'password.confirmed' => 'La conferma della password non corrisponde.',

            'role.required' => 'Il tipo di account è obbligatorio.',
        ];
    }
}
