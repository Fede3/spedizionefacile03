<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferralUsage extends Model
{
    protected $fillable = [
        'buyer_id',
        'pro_user_id',
        'referral_code',
        'order_id',
        'order_amount',
        'discount_amount',
        'commission_amount',
        'status',
    ];

    protected $casts = [
        'order_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'commission_amount' => 'decimal:2',
    ];

    public function buyer()
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function proUser()
    {
        return $this->belongsTo(User::class, 'pro_user_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
