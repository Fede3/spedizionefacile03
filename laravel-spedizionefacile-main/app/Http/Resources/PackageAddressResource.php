<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PackageAddressResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
         return [
            'name' => $this->name,
            'additional_information' => $this->additional_information,
            'address' => $this->address,
            'number_type' => $this->number_type,
            'address_number' => $this->address_number,
            'intercom_code' => $this->intercom_code,
            'country' => $this->country,
            'city' => $this->city,
            'postal_code' => $this->postal_code,
            'province' => $this->province,
            'telephone_number' => $this->telephone_number,
            'email' => $this->email,
        ];
    }
}
