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
            'origin_address.type' => 'required|string|max:50',
            'origin_address.name' => 'required|string|max:200',
            'origin_address.additional_information' => 'nullable|string|max:500',
            'origin_address.address' => 'required|string|max:300',
            'origin_address.number_type' => 'required|string|max:50',
            'origin_address.address_number' => 'required|string|max:20',
            'origin_address.intercom_code' => 'nullable|string|max:50',
            'origin_address.country' => 'required|string|max:100',
            'origin_address.city' => 'required|string|max:200',
            'origin_address.postal_code' => 'required|string|max:10',
            'origin_address.province' => 'required|string|max:10',
            'origin_address.telephone_number' => 'required|string|max:20',
            'origin_address.email' => 'nullable|string|max:200',

            /* Indirizzo di destinazione */
            'destination_address.type' => 'required|string|max:50',
            'destination_address.name' => 'required|string|max:200',
            'destination_address.additional_information' => 'nullable|string|max:500',
            'destination_address.address' => 'required|string|max:300',
            'destination_address.number_type' => 'required|string|max:50',
            'destination_address.address_number' => 'required|string|max:20',
            'destination_address.intercom_code' => 'nullable|string|max:50',
            'destination_address.country' => 'required|string|max:100',
            'destination_address.city' => 'required|string|max:200',
            'destination_address.postal_code' => 'required|string|max:10',
            'destination_address.province' => 'required|string|max:10',
            'destination_address.telephone_number' => 'required|string|max:20',
            'destination_address.email' => 'nullable|string|max:200',

            /* Servizi */
            'services.service_type' => 'nullable|string|max:500',
            'services.date' => 'nullable|string|max:20',
            'services.time' => 'nullable|string|max:20',

            /* Pacchi */
            'packages' => 'required|array|min:1|max:50',
            'packages.*.package_type' => 'required|string|max:50',
            'packages.*.quantity' => 'required|integer|min:1|max:999',
            'packages.*.weight' => 'required|numeric|min:0.1|max:9999',
            'packages.*.first_size' => 'required|numeric|min:1|max:9999',
            'packages.*.second_size' => 'required|numeric|min:1|max:9999',
            'packages.*.third_size' => 'required|numeric|min:1|max:9999',
            'packages.*.weight_price' => 'nullable|numeric|min:0',
            'packages.*.volume_price' => 'nullable|numeric|min:0',
            'packages.*.single_price' => 'required|numeric|min:0',
        ];
    }
}
