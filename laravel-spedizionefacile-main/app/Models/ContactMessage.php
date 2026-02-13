<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContactMessage extends Model
{
    protected $fillable = [
        'name',
        'surname',
        'email',
        'telephone_number',
        'address',
        'message',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];
}
