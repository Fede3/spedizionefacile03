<?php

namespace App\Models;

use App\Models\User;
use App\Models\Service;
use App\Models\PackageAddress;
use App\Models\Traits\HasPrice;
use Illuminate\Database\Eloquent\Model;
use App\Models\Collections\PackageCollection;

class Package extends Model
{
    use HasPrice;

    protected $fillable = [
        'package_type',
        'quantity',
        'weight',
        'first_size',
        'second_size',
        'third_size',
        'weight_price',
        'volume_price',
        'single_price',
        'origin_address_id',
        'destination_address_id',
        'service_id',
        'user_id',
    ];

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function originAddress() {
        return $this->hasOne(PackageAddress::class, 'id', 'origin_address_id');
    }

    public function destinationAddress() {
        return $this->hasOne(PackageAddress::class, 'id', 'destination_address_id');
    }

    public function service() {
        return $this->hasOne(Service::class, 'id', 'service_id');
    }

    /* public function newCollection(array $models = []) {
        return new PackageCollection($models);
    } */

    /* public function originAddress() {
        return $this->belongsTo(Address::class, 'origin_address_id');
    }

    public function destinationAddress() {
        return $this->belongsTo(Address::class, 'destination_address_id');
    } */

    /* public function shipment() {
        return $this->belongsTo(Shipment::class);
    } */
}
