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
            $subtotal += ((int) $package['single_price'] * $package['quantity']) * 100; 
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
            $cart[] = [
                'package_type' => $pack['package_type'],
                'quantity' => $pack['quantity'],
                'weight' => $pack['weight'],
                'first_size' => $pack['first_size'],
                'second_size' => $pack['second_size'],
                'third_size' => $pack['third_size'],
                'weight_price' => $pack['weight_price'],
                'volume_price' => $pack['volume_price'],
                'single_price' => $pack['single_price'],
                'origin_address' => $request->origin_address,
                'destination_address' => $request->destination_address,
                'services' => $request->services,
            ];
        }

        session()->put('cart', $cart);
    }

    public function emptyCart() {
        
        session()->put('cart', []);
    }

}
