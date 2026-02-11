<?php

namespace App\Models;

use App\Cart\MyMoney;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $fillable = [
        'order_id',
        'total',
        'ext_id',
        'type',
        'status',
        'provider_status',
        'failure_code',
        'failure_message'
    ];

    public function getPaymentMethod($type) {
        $methods = [
            'card' => 'Carta',
            'bank_transfer' => 'Bonifico',
            'paypal' => 'PayPal',
        ];

        return $methods[$type] ?? $type;
    }
    
    public function getTotalAttribute($total) {
        return new MyMoney($total);
    }
}
