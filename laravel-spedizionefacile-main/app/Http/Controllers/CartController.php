<?php

namespace App\Http\Controllers;

use App\Cart\MyMoney;
use App\Models\PackageAddress;
use App\Models\Package;
use App\Models\Service;
use Illuminate\Support\Facades\DB;
use App\Http\Resources\PackageResource;
use App\Http\Requests\PackageStoreRequest;
use Illuminate\Http\Request;

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
        $authId = auth()->id();

        // Get current cart packages to check for duplicates
        $cartPackageIds = DB::table('cart_user')
            ->where('user_id', $authId)
            ->pluck('package_id');

        $existingPackages = Package::with(['originAddress', 'destinationAddress', 'service'])
            ->whereIn('id', $cartPackageIds)
            ->get();

        $outPackages = DB::transaction(function() use ($data, $authId, $existingPackages) {
            $origin = PackageAddress::create($data['origin_address']);
            $destination = PackageAddress::create($data['destination_address']);

            // Ensure service_type is never null/empty (DB column is NOT NULL)
            $servicesData = $data['services'];
            $servicesData['service_type'] = !empty($servicesData['service_type']) ? $servicesData['service_type'] : 'Nessuno';
            $servicesData['date'] = $servicesData['date'] ?? '';
            $servicesData['time'] = $servicesData['time'] ?? '';

            $services = Service::create($servicesData);

            $packages = [];

            foreach ($data['packages'] as $packageData) {
                $singlePriceCents = (int) round(($packageData['single_price'] ?? 0) * 100);
                $newQty = (int) ($packageData['quantity'] ?? 1);

                // Check for identical package already in cart
                $duplicate = $existingPackages->first(function ($existing) use ($packageData, $data) {
                    return $existing->package_type === $packageData['package_type']
                        && (string) $existing->weight === (string) $packageData['weight']
                        && (string) $existing->first_size === (string) $packageData['first_size']
                        && (string) $existing->second_size === (string) $packageData['second_size']
                        && (string) $existing->third_size === (string) $packageData['third_size']
                        && $existing->originAddress
                        && $existing->originAddress->city === ($data['origin_address']['city'] ?? '')
                        && $existing->originAddress->postal_code === ($data['origin_address']['postal_code'] ?? '')
                        && $existing->destinationAddress
                        && $existing->destinationAddress->city === ($data['destination_address']['city'] ?? '')
                        && $existing->destinationAddress->postal_code === ($data['destination_address']['postal_code'] ?? '')
                        && $existing->originAddress->name === ($data['origin_address']['name'] ?? '')
                        && $existing->originAddress->address === ($data['origin_address']['address'] ?? '')
                        && $existing->destinationAddress->name === ($data['destination_address']['name'] ?? '')
                        && $existing->destinationAddress->address === ($data['destination_address']['address'] ?? '');
                });

                if ($duplicate) {
                    // Increase quantity and recalculate single_price on existing package
                    $oldQty = (int) $duplicate->quantity;
                    $basePrice = $oldQty > 0 ? (int) round($duplicate->single_price / $oldQty) : $singlePriceCents;
                    $updatedQty = $oldQty + $newQty;
                    $duplicate->update([
                        'quantity' => $updatedQty,
                        'single_price' => $basePrice * $updatedQty,
                    ]);
                    $packages[] = $duplicate;
                } else {
                    $packages[] = Package::create([
                        'package_type' => $packageData['package_type'],
                        'quantity' => $newQty,
                        'weight' => $packageData['weight'],
                        'first_size' => $packageData['first_size'],
                        'second_size' => $packageData['second_size'],
                        'third_size' => $packageData['third_size'],
                        'weight_price' => $packageData['weight_price'] ?? null,
                        'volume_price' => $packageData['volume_price'] ?? null,
                        'single_price' => $singlePriceCents,
                        'origin_address_id' => $origin->id,
                        'destination_address_id' => $destination->id,
                        'service_id' => $services->id,
                        'user_id' => $authId ?: null,
                        'session_id' => $authId ? null : session()->getId(),
                    ]);
                }
            }

            return $packages;
        });

        foreach ($outPackages as $package) {
            // Only insert into cart_user if not already there (duplicate case)
            $exists = DB::table('cart_user')
                ->where('user_id', $authId)
                ->where('package_id', $package->id)
                ->exists();

            if (!$exists) {
                DB::table('cart_user')->insert([
                    'user_id' => $authId,
                    'package_id' => $package->id,
                ]);
            }
        }

        return PackageResource::collection($outPackages);
    }

    public function updateQuantity(Request $request, $id) {
        $request->validate([
            'quantity' => 'required|integer|min:1|max:99',
        ]);

        $userId = auth()->id();
        $package = Package::where('id', $id)->where('user_id', $userId)->firstOrFail();

        $oldQty = (int) $package->quantity;
        $newQty = (int) $request->quantity;

        if ($oldQty > 0) {
            $basePrice = (int) round($package->single_price / $oldQty);
        } else {
            $basePrice = (int) $package->single_price;
        }

        $package->update([
            'quantity' => $newQty,
            'single_price' => $basePrice * $newQty,
        ]);

        return response()->json(['message' => 'Quantità aggiornata', 'quantity' => $newQty]);
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