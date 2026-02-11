<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalletMovement extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'amount',
        'currency',
        'status',
        'idempotency_key',
        'reference',
        'description',
        'source',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
