<?php

namespace App\Http\Controllers;

use App\Cart\MyMoney;
use App\Models\PackageAddress;
use App\Models\Package;
use App\Models\Service;
use Illuminate\Support\Facades\DB;
use App\Http\Resources\PackageResource;
use App\Http\Requests\PackageStoreRequest;
use Symfony\Component\HttpFoundation\Request;

class CartController extends Controller
{
    public function index(Request $request) {

        $user = auth()->user();

        // Prendiamo i pacchetti presenti nel carrello dell'utente
        $cart = DB::table('cart_user')
            ->where('user_id', $user->id)
            ->get();

        // Se vuoi restituire i pacchetti con le relazioni
        $packages = Package::with(['originAddress', 'destinationAddress', 'service'])
            ->whereIn('id', $cart->pluck('package_id'))
            ->get();

        return PackageResource::collection($packages)
            ->additional([
                'meta' => $this->meta($packages)
            ]);
    }

    public function subtotal($packages) {

        $subtotal = $packages->sum(function($package) {
            return (int) $package->single_price;
        });

        return new MyMoney($subtotal);
    }

    /* public function total($packages) {
        $sixEuro = new MyMoney(600); // 600 centesimi = 6€
        return $this->subtotal($packages)->add($sixEuro);
    } */

    protected function meta($packages) {
        return [
            'empty' => $packages->isEmpty(),
            'subtotal' => $this->subtotal($packages)->formatted(),
            'total' => $this->subtotal($packages)->formatted()
        ];
    }
    

    public function store(PackageStoreRequest $request) {

        $data = $request->validated();

        $outPackages = DB::transaction(function() use ($data) {
            $origin = PackageAddress::create($data['origin_address']);
            $destination = PackageAddress::create($data['destination_address']);

            // Ensure service_type is never null/empty (DB column is NOT NULL)
            $servicesData = $data['services'];
            $servicesData['service_type'] = !empty($servicesData['service_type']) ? $servicesData['service_type'] : 'Nessuno';
            $servicesData['date'] = $servicesData['date'] ?? '';
            $servicesData['time'] = $servicesData['time'] ?? '';

            $services = Service::create($servicesData);

            $authId = auth()->id();
            $packages = [];

            foreach ($data['packages'] as $packageData) {
                $packages[] = Package::create([
                    'package_type' => $packageData['package_type'],
                    'quantity' => $packageData['quantity'],
                    'weight' => $packageData['weight'],
                    'first_size' => $packageData['first_size'],
                    'second_size' => $packageData['second_size'],
                    'third_size' => $packageData['third_size'],
                    'weight_price' => $packageData['weight_price'] ?? null,
                    'volume_price' => $packageData['volume_price'] ?? null,
                    'single_price' => $packageData['single_price'] * 100 ?? null,
                    'origin_address_id' => $origin->id,
                    'destination_address_id' => $destination->id,
                    'service_id' => $services->id,
                    'user_id' => $authId ?: null,
                    'session_id' => $authId ? null : session()->getId(), 
                ]);
            }

            return $packages; 
        });

        foreach ($outPackages as $package) {
            DB::table('cart_user')->insert(
                [
                    'user_id' => auth()->id(),
                    'package_id' => $package->id
                ],
            );
        }

        return PackageResource::collection($outPackages);
    }

    public function destroy($id) {
        $userId = auth()->id();

        DB::table('cart_user')
            ->where('user_id', $userId)
            ->where('package_id', $id)
            ->delete();

        Package::where('id', $id)->where('user_id', $userId)->delete();

        return response()->json(['message' => 'Spedizione rimossa dal carrello']);
    }

    public function emptyCart() {
        Package::where('user_id', auth()->id())->delete();

        DB::table('cart_user')
            ->where('user_id', auth()->id())
            ->delete();


        return response()->json(['message' => 'Carrello svuotato']);
    }

}