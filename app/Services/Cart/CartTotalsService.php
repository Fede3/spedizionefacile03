<?php

namespace App\Services\Cart;

use App\Cart\MyMoney;
use App\Services\CartSurchargeCalculator;

/**
 * Calcolo subtotali carrello + supplementi.
 * Output sempre in MyMoney (cents) per evitare ambiguita' di valuta.
 */
class CartTotalsService
{
    public function calculateGroupedSurchargeFromModels($packages): int
    {
        return CartSurchargeCalculator::fromModels($packages);
    }

    public function calculateGroupedSurchargeFromArray(array $packages): int
    {
        return CartSurchargeCalculator::fromArray($packages);
    }

    public function subtotalFromModels($packages): MyMoney
    {
        $subtotal = $packages->sum(fn ($p) => (int) $p->single_price);
        $subtotal += CartSurchargeCalculator::fromModels($packages);

        return new MyMoney($subtotal);
    }

    public function subtotalFromArray(array $packages): MyMoney
    {
        $subtotal = 0;
        foreach ($packages as $package) {
            $subtotal += (int) ($package['single_price'] ?? 0);
        }
        $subtotal += CartSurchargeCalculator::fromArray($packages);

        return new MyMoney($subtotal);
    }
}
