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
            'type' => 'nullable|string',
            'name' => 'required|string',
            'additional_information' => 'nullable|string',
            'address' => 'required|string',
            'number_type' => 'nullable|string',
            'address_number' => 'nullable|string',
            'intercom_code' => 'nullable|string',
            'country' => 'nullable|string',
            'city' => 'required|string',
            'postal_code' => 'required|string',
            'province' => 'nullable|string',
            'province_name' => 'nullable|string',
            'telephone_number' => 'nullable|string',
            'email' => 'nullable|string',
            'default' => 'nullable'
        ];
    }
}
