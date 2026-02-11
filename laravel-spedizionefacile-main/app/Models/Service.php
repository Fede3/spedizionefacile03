<?php

namespace App\Models;

use App\Models\Package;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    protected $fillable = [
        'service_type',
        'time',
        'date'
    ];

    public function packages() {
        return $this->hasMany(Package::class, 'service_id');
    }
}
