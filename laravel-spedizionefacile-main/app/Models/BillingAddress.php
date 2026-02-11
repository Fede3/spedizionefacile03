<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingAddress extends Model
{
    protected $fillable = [
        'name', 
        'address', 
        'city', 
        'province_name',
        'postal_code',
    ];

    /* protected static function booted()
    {
        static::creating(function ($address) {
            $address->identifier = (string) Str::uuid();
        });
    } */
}
