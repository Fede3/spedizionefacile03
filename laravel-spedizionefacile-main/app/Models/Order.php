<?php

namespace App\Models;

use App\Models\User;
use App\Cart\MyMoney;
use App\Models\Package;
use App\Models\Shipment;
use App\Models\Shipping;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'status',
        'user_id',
        /* 'user_address_id', */
        /* 'shipping_id', */
        'subtotal'
    ];

    const PENDING = 'pending';
    const PROCESSING = 'processing';
    const PAYMENT_FAILED = 'payment_failed';
    const COMPLETED = 'completed';

    public function getStatus($status) {
        $data = [
            'pending' => 'In attesa',
            'processing' => 'Processato',
            'payment_failed' => 'Fallito',
            'payed' => 'Pagato'
        ];

        return $data[$status] ?? $status;
    }


    public static function boot() {
        parent::boot();

        static::creating(function($order) {
            $order->status = self::PENDING;
        });
    }

    public function getSubtotalAttribute($subtotal) {
        return new MyMoney($subtotal);
    }


    public function user() {
        return $this->belongsTo(User::class);
    }

    /* public function address() {
        return $this->belongsTo(Address::class);
    } */

    /* public function shipping() {
        return $this->belongsTo(Shipping::class);
    } */

    public function transactions() {
        return $this->hasMany(Transaction::class);
    }

    public function packages() {
        return $this->belongsToMany(Package::class, 'package_order');
                    /* ->withPivot(['quantity'])
                    ->withTimestamps(); */
    }
}
