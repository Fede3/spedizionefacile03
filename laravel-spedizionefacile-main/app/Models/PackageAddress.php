<?php

namespace App\Models;

use App\Models\User;
use App\Models\Package;
use Illuminate\Database\Eloquent\Model;

class PackageAddress extends Model
{
    protected $fillable = [
        'type',
        'name',
        'additional_information',
        'address',
        'number_type',
        'address_number',
        'intercom_code',
        'country',
        'city',
        'postal_code',
        'province',
        'telephone_number',
        'email',
    ];

    public function packagesAsOrigin() {
        return $this->hasMany(Package::class, 'origin_address_id');
    }

    // pacchi dove questo address è usato come destinazione
    public function packagesAsDestination() {
        return $this->hasMany(Package::class, 'destination_address_id');
    }
}
