<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use App\Http\Resources\ServiceResource;
use App\Http\Resources\PackageAddressResource;
use Illuminate\Http\Resources\Json\JsonResource;

class PackageResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'package_type' => $this->package_type,
            'quantity' => $this->quantity,
            'weight' => $this->weight,
            'first_size' => $this->first_size,
            'second_size' => $this->second_size,
            'third_size' => $this->third_size,
            'weight_price' => $this->weight_price,
            'volume_price' => $this->volume_price,
            'origin_address' => new PackageAddressResource($this->originAddress),
            'destination_address' => new PackageAddressResource($this->destinationAddress),
            'services' => new ServiceResource($this->service)
        ];
    }
}
