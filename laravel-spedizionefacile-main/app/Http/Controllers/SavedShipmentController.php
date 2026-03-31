<?php

namespace App\Http\Controllers;

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
        $this->cleanupOrphanedShipments($user->id);

        $savedIds = DB::table('saved_shipments')->where('user_id', $user->id)->pluck('package_id');
        $packages = Package::with(['originAddress', 'destinationAddress', 'service'])->whereIn('id', $savedIds)->get();

        $invalidPackages = $packages->filter(fn ($pkg) => empty($pkg->package_type) || (empty($pkg->weight) && empty($pkg->first_size)));
        if ($invalidPackages->isNotEmpty()) {
            foreach ($invalidPackages as $pkg) {
                DB::table('saved_shipments')->where('user_id', $user->id)->where('package_id', $pkg->id)->delete();
                $pkg->delete();
            }
            $savedIds = DB::table('saved_shipments')->where('user_id', $user->id)->pluck('package_id');
            $packages = Package::with(['originAddress', 'destinationAddress', 'service'])->whereIn('id', $savedIds)->get();
        }

        return PackageResource::collection($packages)->additional(['meta' => ['empty' => $packages->isEmpty(), 'count' => $packages->count()]]);
    }

    public function store(PackageStoreRequest $request)
    {
        $data = $request->validated();
        $userId = auth()->id();

        $savedIds = DB::table('saved_shipments')->where('user_id', $userId)->pluck('package_id');
        $existingSaved = Package::with(['originAddress', 'destinationAddress', 'service'])->whereIn('id', $savedIds)->get();

        foreach ($data['packages'] as $packageData) {
            if ($this->isDuplicateSaved($existingSaved, $packageData, $data)) {
                return response()->json(['message' => 'Spedizione già configurata. Modifica almeno un dato per salvarla come nuova configurazione.'], 422);
            }
        }

        $outPackages = DB::transaction(function () use ($data, $userId) {
            $origin = PackageAddress::create($data['origin_address']);
            $destination = PackageAddress::create($data['destination_address']);

            $servicesData = $data['services'];
            $servicesData['service_type'] = !empty($servicesData['service_type']) ? $servicesData['service_type'] : 'Nessuno';
            $servicesData['date'] = $servicesData['date'] ?? '';
            $servicesData['time'] = $servicesData['time'] ?? '';
            $services = Service::create($servicesData);

            $packages = [];
            foreach ($data['packages'] as $packageData) {
                $packages[] = Package::create([
                    'package_type' => $packageData['package_type'], 'quantity' => $packageData['quantity'],
                    'weight' => $packageData['weight'], 'first_size' => $packageData['first_size'],
                    'second_size' => $packageData['second_size'], 'third_size' => $packageData['third_size'],
                    'weight_price' => $packageData['weight_price'] ?? null, 'volume_price' => $packageData['volume_price'] ?? null,
                    'single_price' => (int) round(($packageData['single_price'] ?? 0) * 100),
                    'origin_address_id' => $origin->id, 'destination_address_id' => $destination->id,
                    'service_id' => $services->id, 'user_id' => $userId,
                ]);
            }
            return $packages;
        });

        foreach ($outPackages as $package) {
            DB::table('saved_shipments')->insert(['user_id' => $userId, 'package_id' => $package->id, 'created_at' => now(), 'updated_at' => now()]);
        }

        return PackageResource::collection($outPackages);
    }

    public function update(Request $request, $id)
    {
        $userId = auth()->id();
        $package = Package::where('id', $id)->where('user_id', $userId)->firstOrFail();

        $data = $request->validate([
            'origin_address' => 'sometimes|array',
            'origin_address.name' => 'nullable|string', 'origin_address.address' => 'nullable|string',
            'origin_address.address_number' => 'nullable|string', 'origin_address.city' => 'nullable|string',
            'origin_address.postal_code' => 'nullable|string', 'origin_address.province' => 'nullable|string',
            'origin_address.telephone_number' => 'nullable|string', 'origin_address.email' => 'nullable|string',
            'origin_address.country' => 'nullable|string', 'origin_address.additional_information' => 'nullable|string',
            'origin_address.intercom_code' => 'nullable|string',
            'destination_address' => 'sometimes|array',
            'destination_address.name' => 'nullable|string', 'destination_address.address' => 'nullable|string',
            'destination_address.address_number' => 'nullable|string', 'destination_address.city' => 'nullable|string',
            'destination_address.postal_code' => 'nullable|string', 'destination_address.province' => 'nullable|string',
            'destination_address.telephone_number' => 'nullable|string', 'destination_address.email' => 'nullable|string',
            'destination_address.country' => 'nullable|string', 'destination_address.additional_information' => 'nullable|string',
            'destination_address.intercom_code' => 'nullable|string',
            'package_type' => 'nullable|string', 'quantity' => 'nullable|integer',
            'weight' => 'nullable|string', 'first_size' => 'nullable|string',
            'second_size' => 'nullable|string', 'third_size' => 'nullable|string',
            'single_price' => 'nullable|numeric', 'weight_price' => 'nullable|numeric', 'volume_price' => 'nullable|numeric',
            'services' => 'sometimes|array',
            'services.service_type' => 'nullable|string', 'services.date' => 'nullable|string', 'services.time' => 'nullable|string',
        ]);

        DB::transaction(function () use ($package, $data) {
            if (isset($data['origin_address']) && $package->originAddress) $package->originAddress->update($data['origin_address']);
            if (isset($data['destination_address']) && $package->destinationAddress) $package->destinationAddress->update($data['destination_address']);

            if (isset($data['services']) && $package->service) {
                $serviceData = $data['services'];
                $serviceData['service_type'] = !empty($serviceData['service_type']) ? $serviceData['service_type'] : 'Nessuno';
                $package->service->update($serviceData);
            }

            $packageFields = array_intersect_key($data, array_flip(['package_type', 'quantity', 'weight', 'first_size', 'second_size', 'third_size']));
            if (isset($data['single_price'])) $packageFields['single_price'] = (int) round($data['single_price'] * 100);
            if (isset($data['weight_price'])) $packageFields['weight_price'] = $data['weight_price'];
            if (isset($data['volume_price'])) $packageFields['volume_price'] = $data['volume_price'];
            if (!empty($packageFields)) $package->update($packageFields);
        });

        $package->load(['originAddress', 'destinationAddress', 'service']);
        return new PackageResource($package);
    }

    public function destroy($id)
    {
        $userId = auth()->id();
        DB::table('saved_shipments')->where('user_id', $userId)->where('package_id', $id)->delete();
        DB::table('cart_user')->where('user_id', $userId)->where('package_id', $id)->delete();
        Package::where('id', $id)->where('user_id', $userId)->delete();
        return response()->json(['message' => 'Spedizione rimossa']);
    }

    public function addToCart(Request $request)
    {
        $request->validate(['package_ids' => 'required|array|min:1', 'package_ids.*' => 'integer']);
        $userId = auth()->id();

        $validIds = DB::table('saved_shipments')->where('user_id', $userId)
            ->whereIn('package_id', $request->package_ids)->pluck('package_id')->toArray();

        $copiedCount = 0;
        foreach ($validIds as $packageId) {
            $original = Package::with(['originAddress', 'destinationAddress', 'service'])->find($packageId);
            if (!$original) continue;

            $newOrigin = $original->originAddress ? PackageAddress::create($original->originAddress->replicate()->toArray()) : null;
            $newDest = $original->destinationAddress ? PackageAddress::create($original->destinationAddress->replicate()->toArray()) : null;
            $newService = $original->service ? Service::create($original->service->replicate()->toArray()) : null;

            $newPackage = Package::create([
                'package_type' => $original->package_type, 'quantity' => $original->quantity,
                'weight' => $original->weight, 'first_size' => $original->first_size,
                'second_size' => $original->second_size, 'third_size' => $original->third_size,
                'weight_price' => $original->weight_price, 'volume_price' => $original->volume_price,
                'single_price' => $original->single_price,
                'origin_address_id' => $newOrigin?->id, 'destination_address_id' => $newDest?->id,
                'service_id' => $newService?->id, 'user_id' => $userId,
            ]);

            DB::table('cart_user')->insert(['user_id' => $userId, 'package_id' => $newPackage->id]);
            $copiedCount++;
        }

        return response()->json(['message' => 'Spedizioni aggiunte al carrello', 'moved' => $copiedCount]);
    }

    private function cleanupOrphanedShipments(int $userId): void
    {
        $savedIds = DB::table('saved_shipments')->where('user_id', $userId)->pluck('package_id');
        if ($savedIds->isEmpty()) return;

        $orphanedIds = $savedIds->diff(Package::whereIn('id', $savedIds)->pluck('id'));
        if ($orphanedIds->isNotEmpty()) {
            DB::table('saved_shipments')->where('user_id', $userId)->whereIn('package_id', $orphanedIds)->delete();
        }
    }

    private function isDuplicateSaved($existingSaved, array $packageData, array $data): bool
    {
        return $existingSaved->contains(function ($existing) use ($packageData, $data) {
            return $existing->package_type === $packageData['package_type']
                && (string) $existing->weight === (string) $packageData['weight']
                && (string) $existing->first_size === (string) $packageData['first_size']
                && (string) $existing->second_size === (string) $packageData['second_size']
                && (string) $existing->third_size === (string) $packageData['third_size']
                && (int) $existing->quantity === (int) $packageData['quantity']
                && $existing->originAddress
                && $existing->originAddress->city === ($data['origin_address']['city'] ?? '')
                && $existing->originAddress->postal_code === ($data['origin_address']['postal_code'] ?? '')
                && $existing->originAddress->name === ($data['origin_address']['name'] ?? '')
                && $existing->originAddress->address === ($data['origin_address']['address'] ?? '')
                && $existing->destinationAddress
                && $existing->destinationAddress->city === ($data['destination_address']['city'] ?? '')
                && $existing->destinationAddress->postal_code === ($data['destination_address']['postal_code'] ?? '')
                && $existing->destinationAddress->name === ($data['destination_address']['name'] ?? '')
                && $existing->destinationAddress->address === ($data['destination_address']['address'] ?? '');
        });
    }
}
