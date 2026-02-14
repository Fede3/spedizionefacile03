<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PriceBand extends Model
{
    protected $fillable = [
        'type', 'min_value', 'max_value', 'base_price', 'discount_price', 'show_discount', 'sort_order',
    ];

    protected $casts = [
        'min_value' => 'decimal:4',
        'max_value' => 'decimal:4',
        'show_discount' => 'boolean',
    ];

    protected $appends = ['effective_price', 'discount_percent'];

    public function scopeWeight($query) { return $query->where('type', 'weight'); }
    public function scopeVolume($query) { return $query->where('type', 'volume'); }

    public function getEffectivePriceAttribute(): int
    {
        return $this->discount_price ?? $this->base_price;
    }

    /**
     * Percentuale di sconto calcolata: se discount_price < base_price -> sconto positivo.
     * Se discount_price >= base_price o null -> null (nessuno sconto da mostrare).
     */
    public function getDiscountPercentAttribute(): ?int
    {
        if ($this->discount_price === null || $this->base_price <= 0) {
            return null;
        }

        if ($this->discount_price >= $this->base_price) {
            return null;
        }

        return (int) round((1 - $this->discount_price / $this->base_price) * 100);
    }
}
