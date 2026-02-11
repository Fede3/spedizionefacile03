<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PackageStoreRequest extends FormRequest
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
            /* Indirizzo di partenza */
            'origin_address.type' => 'required|string',
            'origin_address.name' => 'required|string',
            'origin_address.additional_information' => 'nullable|string',
            'origin_address.address' => 'required|string',
            'origin_address.number_type' => 'required|string',
            'origin_address.address_number' => 'required|string',
            'origin_address.intercom_code' => 'nullable|string',
            'origin_address.country' => 'required|string',
            'origin_address.city' => 'required|string',
            'origin_address.postal_code' => 'required|string',
            'origin_address.province' => 'required|string',
            'origin_address.telephone_number' => 'required|string',
            'origin_address.email' => 'nullable|string',

            /* Indirizzo di destinazione */
            'destination_address.type' => 'required|string',
            'destination_address.name' => 'required|string',
            'destination_address.additional_information' => 'nullable|string',
            'destination_address.address' => 'required|string',
            'destination_address.number_type' => 'required|string',
            'destination_address.address_number' => 'required|string',
            'destination_address.intercom_code' => 'nullable|string',
            'destination_address.country' => 'required|string',
            'destination_address.city' => 'required|string',
            'destination_address.postal_code' => 'required|string',
            'destination_address.province' => 'required|string',
            'destination_address.telephone_number' => 'required|string',
            /* 'destination_address.email' => 'nullable|string', */

            /* Servizi */
            'services.service_type' => 'required|string',
            'services.date' => 'nullable|string',
            'services.time' => 'nullable|string',

            /* Pacchi */
            'packages' => 'required|array|min:1',
            'packages.*.package_type' => 'required|string',
            'packages.*.quantity' => 'required|integer',
            'packages.*.weight' => 'required|string',
            'packages.*.first_size' => 'required|string',
            'packages.*.second_size' => 'required|string',
            'packages.*.third_size' => 'required|string',
            'packages.*.weight_price' => 'nullable',
            'packages.*.volume_price' => 'nullable',
            'packages.*.single_price' => 'required',
        ];
    }
}
