<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    protected $fillable = [
        'code',
        'stripe_connected_account_id',
        /* 'discount_percentage',
        'pro_commission_percentage', */
        'percentage',
        'active'
    ];
}
