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

class SavedShipmentController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();

        $savedIds = DB::table('saved_shipments')
            ->where('user_id', $user->id)
            ->pluck('package_id');

        $packages = Package::with(['originAddress', 'destinationAddress', 'service'])
            ->whereIn('id', $savedIds)
            ->get();

        return PackageResource::collection($packages)
            ->additional([
                'meta' => [
                    'empty' => $packages->isEmpty(),
                    'count' => $packages->count(),
                ]
            ]);
    }

    public function store(PackageStoreRequest $request)
    {
        $data = $request->validated();

        $outPackages = DB::transaction(function () use ($data) {
            $origin = PackageAddress::create($data['origin_address']);
            $destination = PackageAddress::create($data['destination_address']);
            $services = Service::create($data['services']);

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
            DB::table('saved_shipments')->insert([
                'user_id' => auth()->id(),
                'package_id' => $package->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return PackageResource::collection($outPackages);
    }

    public function update(Request $request, $id)
    {
        $userId = auth()->id();

        $package = Package::where('id', $id)->where('user_id', $userId)->firstOrFail();

        $data = $request->validate([
            'origin_address' => 'sometimes|array',
            'origin_address.name' => 'nullable|string',
            'origin_address.address' => 'nullable|string',
            'origin_address.address_number' => 'nullable|string',
            'origin_address.city' => 'nullable|string',
            'origin_address.postal_code' => 'nullable|string',
            'origin_address.province' => 'nullable|string',
            'origin_address.telephone_number' => 'nullable|string',
            'origin_address.email' => 'nullable|string',
            'destination_address' => 'sometimes|array',
            'destination_address.name' => 'nullable|string',
            'destination_address.address' => 'nullable|string',
            'destination_address.address_number' => 'nullable|string',
            'destination_address.city' => 'nullable|string',
            'destination_address.postal_code' => 'nullable|string',
            'destination_address.province' => 'nullable|string',
            'destination_address.telephone_number' => 'nullable|string',
            'destination_address.email' => 'nullable|string',
            'package_type' => 'nullable|string',
            'quantity' => 'nullable|integer',
            'weight' => 'nullable|string',
            'first_size' => 'nullable|string',
            'second_size' => 'nullable|string',
            'third_size' => 'nullable|string',
        ]);

        DB::transaction(function () use ($package, $data) {
            if (isset($data['origin_address']) && $package->originAddress) {
                $package->originAddress->update($data['origin_address']);
            }
            if (isset($data['destination_address']) && $package->destinationAddress) {
                $package->destinationAddress->update($data['destination_address']);
            }

            $packageFields = array_intersect_key($data, array_flip([
                'package_type', 'quantity', 'weight', 'first_size', 'second_size', 'third_size',
            ]));
            if (!empty($packageFields)) {
                $package->update($packageFields);
            }
        });

        $package->load(['originAddress', 'destinationAddress', 'service']);
        return new PackageResource($package);
    }

    public function destroy($id)
    {
        $userId = auth()->id();

        DB::table('saved_shipments')
            ->where('user_id', $userId)
            ->where('package_id', $id)
            ->delete();

        Package::where('id', $id)->where('user_id', $userId)->delete();

        return response()->json(['message' => 'Spedizione rimossa']);
    }

    /**
     * Move selected saved shipments to the cart.
     */
    public function addToCart(Request $request)
    {
        $request->validate([
            'package_ids' => 'required|array|min:1',
            'package_ids.*' => 'integer',
        ]);

        $userId = auth()->id();
        $packageIds = $request->package_ids;

        // Verify these packages belong to the user's saved shipments
        $validIds = DB::table('saved_shipments')
            ->where('user_id', $userId)
            ->whereIn('package_id', $packageIds)
            ->pluck('package_id')
            ->toArray();

        foreach ($validIds as $packageId) {
            // Check not already in cart
            $exists = DB::table('cart_user')
                ->where('user_id', $userId)
                ->where('package_id', $packageId)
                ->exists();

            if (!$exists) {
                DB::table('cart_user')->insert([
                    'user_id' => $userId,
                    'package_id' => $packageId,
                ]);
            }

            // Remove from saved shipments
            DB::table('saved_shipments')
                ->where('user_id', $userId)
                ->where('package_id', $packageId)
                ->delete();
        }

        return response()->json([
            'message' => 'Spedizioni aggiunte al carrello',
            'moved' => count($validIds),
        ]);
    }
}
