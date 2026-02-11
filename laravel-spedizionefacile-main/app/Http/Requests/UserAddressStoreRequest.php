<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UserAddressStoreRequest extends FormRequest
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
            'name' => 'required|string',
            'address' => 'required|string',
            'number_type' => 'required|string',
            'address_number' => 'required|string',
            'intercom_code' => 'nullable|string',
            'country' => 'required|string',
            'city' => 'required|string',
            'postal_code' => 'required|string',
            'province' => 'required|string',
            'telephone_number' => 'required|string',
            'email' => 'nullable|string',
            'default' => 'nullable'
        ];
    }
}
