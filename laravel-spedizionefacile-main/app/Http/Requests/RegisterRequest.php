<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'surname' => 'required|string|max:255',
            'prefix' => 'string|required',
            'telephone_number' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users|confirmed',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|string'

            /* |regex:/[a-z]/|regex:/[A-Z]/|regex:/[0-9]/regex:/[@$!%*?&]/ */

        ];
    }

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
            'password.confirmed' => 'La conferma della password non corrisponde.',

            'role.required' => 'Il tipo di account è obbligatorio.',
        ];
    }
}
