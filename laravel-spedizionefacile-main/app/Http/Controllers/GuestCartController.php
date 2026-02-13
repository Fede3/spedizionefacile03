<?php

namespace App\Http\Controllers;

use App\Cart\MyMoney;
use App\Cart\GuestCart;
use App\Models\Package;
use Illuminate\Http\Request;
use App\Http\Resources\PackageResource;
use App\Http\Requests\CartCreateRequest;
use App\Http\Requests\GuestCartCreateRequest;

class GuestCartController extends Controller
{
    public function index() {
        $packages = session()->get('cart', []);

        return response()->json([
            'data' => $packages,
            'meta' => $this->meta($packages),
        ]);

        /* return PackageResource::collection($packages)
            ->additional([
                'meta' => $this->meta($packages)
            ]); */
    }

    public function subtotal($packages) {
        $subtotal = 0;

        foreach ($packages as $package) {
            // single_price is already stored in cents and already includes quantity
            $subtotal += (int) ($package['single_price'] ?? 0);
        }

        return new MyMoney($subtotal);
    }


    /* public function total($packages) {
        $sixEuro = new MyMoney(600); // 600 centesimi = 6€
        return $this->subtotal($packages)->add($sixEuro);
    } */

    protected function meta($packages) {
        return [
            'empty' => count($packages) === 0,
            'subtotal' => $this->subtotal($packages)->formatted(),
            'total' => $this->subtotal($packages)->formatted()
        ];
    } 

    public function store(Request $request) {

        $cart = session()->get('cart', []);

        foreach ($request->packages as $pack) {
            $singlePriceCents = (int) round(($pack['single_price'] ?? 0) * 100);
            $newQty = (int) ($pack['quantity'] ?? 1);

            // Check for identical package already in cart
            $duplicateIndex = null;
            foreach ($cart as $idx => $existing) {
                if (
                    ($existing['package_type'] ?? '') === ($pack['package_type'] ?? '')
                    && (string) ($existing['weight'] ?? '') === (string) ($pack['weight'] ?? '')
                    && (string) ($existing['first_size'] ?? '') === (string) ($pack['first_size'] ?? '')
                    && (string) ($existing['second_size'] ?? '') === (string) ($pack['second_size'] ?? '')
                    && (string) ($existing['third_size'] ?? '') === (string) ($pack['third_size'] ?? '')
                    && ($existing['origin_address']['city'] ?? '') === ($request->origin_address['city'] ?? '')
                    && ($existing['origin_address']['postal_code'] ?? '') === ($request->origin_address['postal_code'] ?? '')
                    && ($existing['destination_address']['city'] ?? '') === ($request->destination_address['city'] ?? '')
                    && ($existing['destination_address']['postal_code'] ?? '') === ($request->destination_address['postal_code'] ?? '')
                    && ($existing['origin_address']['name'] ?? '') === ($request->origin_address['name'] ?? '')
                    && ($existing['destination_address']['name'] ?? '') === ($request->destination_address['name'] ?? '')
                ) {
                    $duplicateIndex = $idx;
                    break;
                }
            }

            if ($duplicateIndex !== null) {
                // Increase quantity and recalculate price
                $oldQty = (int) ($cart[$duplicateIndex]['quantity'] ?? 1);
                $oldPrice = (int) ($cart[$duplicateIndex]['single_price'] ?? 0);
                $basePrice = $oldQty > 0 ? (int) round($oldPrice / $oldQty) : $singlePriceCents;
                $updatedQty = $oldQty + $newQty;
                $cart[$duplicateIndex]['quantity'] = $updatedQty;
                $cart[$duplicateIndex]['single_price'] = $basePrice * $updatedQty;
            } else {
                $cart[] = [
                    'package_type' => $pack['package_type'],
                    'quantity' => $newQty,
                    'weight' => $pack['weight'],
                    'first_size' => $pack['first_size'],
                    'second_size' => $pack['second_size'],
                    'third_size' => $pack['third_size'],
                    'weight_price' => $pack['weight_price'],
                    'volume_price' => $pack['volume_price'],
                    'single_price' => $singlePriceCents,
                    'origin_address' => $request->origin_address,
                    'destination_address' => $request->destination_address,
                    'services' => $request->services,
                ];
            }
        }

        session()->put('cart', $cart);

        return response()->json([
            'data' => $cart,
            'meta' => $this->meta($cart),
            'message' => 'Carrello aggiornato',
        ]);
    }

    public function emptyCart() {

        session()->put('cart', []);

        return response()->json(['message' => 'Carrello svuotato']);
    }

}
