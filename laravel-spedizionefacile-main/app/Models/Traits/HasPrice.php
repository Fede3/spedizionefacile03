<?php


namespace App\Models\Traits;
use App\Cart\MyMoney;
use Illuminate\Database\Eloquent\Builder;

trait HasPrice {
    
    public function getPriceAttribute($value) {
        return new MyMoney($value);
    }

    public function getFormattedPriceAttribute() {
        return $this->price->formatted();
    }
}