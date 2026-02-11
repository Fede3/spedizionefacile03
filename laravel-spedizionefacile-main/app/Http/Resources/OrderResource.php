<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use App\Http\Resources\PackageResource;
use App\Http\Resources\TransactionResource;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
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
            'status' => $this->getStatus($this->status),
            'subtotal' => $this->subtotal->formatted(),
            'user' => $this->user,
            'created_at' => $this->created_at->setTimezone('Europe/Rome')->format('m/d/Y H:i'),
            'packages' => PackageResource::collection($this->packages),
            'transactions' => TransactionResource::collection($this->transactions),
        ];
    }
}
