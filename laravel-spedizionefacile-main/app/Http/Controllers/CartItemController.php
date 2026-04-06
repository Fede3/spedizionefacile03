<?php
/**
 * FILE: CartItemController.php
 * SCOPO: Operazioni CRUD su singoli pacchi nel carrello (utenti autenticati).
 *
 * DOVE SI USA: Pagina carrello (aggiunta, modifica, rimozione singoli pacchi)
 *
 * COLLEGAMENTI:
 *   - app/Services/CartService.php -- logica condivisa (pricing, dedup, merge)
 *   - CartController.php -- operazioni a livello di carrello (index, svuota, merge bulk)
 *   - GuestCartController.php -- stessa logica per utenti non autenticati (sessione)
 *   - StripeController.php -- createOrder() legge i pacchi dal carrello per creare ordini
 */

namespace App\Http\Controllers;

use App\Models\PackageAddress;
use App\Models\Package;
use App\Models\Service;
use App\Services\CartService;
use Illuminate\Support\Facades\DB;
use App\Http\Resources\PackageResource;
use App\Http\Requests\PackageStoreRequest;
use Illuminate\Http\Request;

class CartItemController extends Controller
{
    // ── Helpers ──────────────────────────────────────────────────

    private function packageIsInCart(int $userId, int|string $packageId): bool
    {
        return DB::table('cart_user')
            ->where('user_id', $userId)
            ->where('package_id', $packageId)
            ->exists();
    }

    // ── Show ─────────────────────────────────────────────────────

    public function show($id)
    {
        $userId = auth()->id();

        if (! $this->packageIsInCart($userId, $id)) {
            return response()->json(['message' => 'Pacco non trovato nel carrello'], 404);
        }

        $package = Package::with(['originAddress', 'destinationAddress', 'service'])
            ->where('id', $id)
            ->firstOrFail();

        return new PackageResource($package);
    }

    // ── Store ────────────────────────────────────────────────────

    public function store(PackageStoreRequest $request)
    {
        $data = $request->validated();
        $authId = auth()->id();

        $outPackages = DB::transaction(function () use ($data, $authId) {
            $existingPackageIds = DB::table('cart_user')
                ->where('user_id', $authId)
                ->lockForUpdate()
                ->pluck('package_id');

            $existingPackages = Package::with(['originAddress', 'destinationAddress', 'service'])
                ->whereIn('id', $existingPackageIds)
                ->get();

            $servicesData = CartService::normalizeServiceData($data['services']);
            $servicesData = CartService::applyPudoData($servicesData, $data);

            $packages = [];
            $origin = null;
            $destination = null;
            $services = null;

            foreach ($data['packages'] as $packageData) {
                $pricedPackage = CartService::pricePackageData(
                    $packageData,
                    $data['origin_address'] ?? [],
                    $data['destination_address'] ?? [],
                );
                $newQty = (int) ($pricedPackage['quantity'] ?? 1);
                $newUnitPriceCents = (int) ($pricedPackage['unit_price_cents'] ?? 0);

                $newServiceSig = CartService::buildServiceSignatureFromArray(
                    $servicesData['service_type'] ?? 'Nessuno',
                    $servicesData['service_data'] ?? [],
                );

                $duplicate = $existingPackages->first(function ($existing) use ($pricedPackage, $data, $newServiceSig) {
                    if (! $existing->originAddress || ! $existing->destinationAddress || ! $existing->service) {
                        return false;
                    }
                    return CartService::isDuplicate(
                        $pricedPackage,
                        $data['origin_address'] ?? [],
                        $data['destination_address'] ?? [],
                        $newServiceSig,
                        $existing->toArray(),
                        $existing->originAddress->toArray(),
                        $existing->destinationAddress->toArray(),
                        CartService::buildServiceSignatureFromService($existing->service),
                    );
                });

                if ($duplicate) {
                    $merged = CartService::mergeQuantity(
                        (int) $duplicate->single_price,
                        (int) $duplicate->quantity,
                        $newQty,
                        $newUnitPriceCents,
                    );

                    $duplicate->update([
                        'quantity' => $merged['quantity'],
                        'weight_price' => $pricedPackage['weight_price'] ?? $duplicate->weight_price,
                        'volume_price' => $pricedPackage['volume_price'] ?? $duplicate->volume_price,
                        'single_price' => $merged['single_price'],
                    ]);
                    $packages[] = $duplicate;
                } else {
                    if (! $origin) {
                        $origin = PackageAddress::create($data['origin_address']);
                        $destination = PackageAddress::create($data['destination_address']);
                        $services = Service::create($servicesData);
                    }

                    $createdPackage = Package::create([
                        'package_type' => $pricedPackage['package_type'],
                        'quantity' => $newQty,
                        'weight' => $pricedPackage['weight'],
                        'first_size' => $pricedPackage['first_size'],
                        'second_size' => $pricedPackage['second_size'],
                        'third_size' => $pricedPackage['third_size'],
                        'weight_price' => $pricedPackage['weight_price'] ?? null,
                        'volume_price' => $pricedPackage['volume_price'] ?? null,
                        'single_price' => $pricedPackage['single_price'],
                        'origin_address_id' => $origin->id,
                        'destination_address_id' => $destination->id,
                        'service_id' => $services->id,
                        'user_id' => $authId,
                    ]);
                    $packages[] = $createdPackage;
                    $existingPackages->push($createdPackage);
                }
            }

            foreach ($packages as $package) {
                $exists = DB::table('cart_user')
                    ->where('user_id', $authId)
                    ->where('package_id', $package->id)
                    ->exists();

                if (! $exists) {
                    DB::table('cart_user')->insert([
                        'user_id' => $authId,
                        'package_id' => $package->id,
                    ]);
                }
            }

            return $packages;
        });

        return PackageResource::collection($outPackages);
    }

    // ── Update ───────────────────────────────────────────────────

    public function update(Request $request, $id)
    {
        $userId = auth()->id();

        if (! $this->packageIsInCart($userId, $id)) {
            return response()->json(['message' => 'Pacco non trovato nel carrello'], 404);
        }

        $package = Package::where('id', $id)->where('user_id', $userId)->firstOrFail();
        $data = $request->validate([
            'origin_address' => 'nullable|array',
            'origin_address.type' => 'nullable|string|max:50',
            'origin_address.name' => 'nullable|string|max:200',
            'origin_address.additional_information' => 'nullable|string|max:500',
            'origin_address.address' => 'nullable|string|max:300',
            'origin_address.number_type' => 'nullable|string|max:50',
            'origin_address.address_number' => 'nullable|string|max:20',
            'origin_address.intercom_code' => 'nullable|string|max:50',
            'origin_address.country' => 'nullable|string|max:100',
            'origin_address.city' => 'nullable|string|max:200',
            'origin_address.postal_code' => 'nullable|string|max:10',
            'origin_address.province' => 'nullable|string|max:10',
            'origin_address.telephone_number' => 'nullable|string|max:20',
            'origin_address.email' => 'nullable|string|max:200',
            'destination_address' => 'nullable|array',
            'destination_address.type' => 'nullable|string|max:50',
            'destination_address.name' => 'nullable|string|max:200',
            'destination_address.additional_information' => 'nullable|string|max:500',
            'destination_address.address' => 'nullable|string|max:300',
            'destination_address.number_type' => 'nullable|string|max:50',
            'destination_address.address_number' => 'nullable|string|max:20',
            'destination_address.intercom_code' => 'nullable|string|max:50',
            'destination_address.country' => 'nullable|string|max:100',
            'destination_address.city' => 'nullable|string|max:200',
            'destination_address.postal_code' => 'nullable|string|max:10',
            'destination_address.province' => 'nullable|string|max:10',
            'destination_address.telephone_number' => 'nullable|string|max:20',
            'destination_address.email' => 'nullable|string|max:200',
            'services' => 'nullable|array',
            'services.service_type' => 'nullable|string|max:500',
            'services.date' => 'nullable|string|max:20',
            'services.time' => 'nullable|string|max:20',
            'services.serviceData' => 'nullable|array',
            'services.service_data' => 'nullable|array',
            'services.sms_email_notification' => 'nullable|boolean',
            'packages' => 'nullable|array|max:50',
            'packages.*.package_type' => 'nullable|string|max:50',
            'packages.*.quantity' => 'nullable|integer|min:1|max:999',
            'packages.*.weight' => 'nullable|numeric|min:0.1|max:9999',
            'packages.*.first_size' => 'nullable|numeric|min:1|max:9999',
            'packages.*.second_size' => 'nullable|numeric|min:1|max:9999',
            'packages.*.third_size' => 'nullable|numeric|min:1|max:9999',
            'content_description' => 'nullable|string|max:255',
            'delivery_mode' => 'nullable|string|in:home,pudo',
            'pudo' => 'nullable|array',
            'pudo.pudo_id' => 'nullable|string|max:100',
            'pudo.name' => 'nullable|string|max:300',
            'pudo.address' => 'nullable|string|max:300',
            'pudo.city' => 'nullable|string|max:200',
            'pudo.zip_code' => 'nullable|string|max:10',
        ]);

        return DB::transaction(function () use ($package, $data) {
            if (isset($data['origin_address']) && $package->originAddress) {
                $package->originAddress->update($data['origin_address']);
            }

            if (isset($data['destination_address']) && $package->destinationAddress) {
                $package->destinationAddress->update($data['destination_address']);
            }

            $package->load(['originAddress', 'destinationAddress']);

            if (isset($data['services']) && $package->service) {
                $servicesData = CartService::normalizeServiceData($data['services']);
                $servicesData = CartService::applyPudoData($servicesData, $data);
                $package->service->update($servicesData);
            }

            if (isset($data['packages']) && count($data['packages']) > 0) {
                $packageData = $data['packages'][0];
                $pricedPackage = CartService::pricePackageData(
                    $packageData,
                    $package->originAddress?->toArray() ?? [],
                    $package->destinationAddress?->toArray() ?? [],
                    $package->only([
                        'package_type',
                        'quantity',
                        'weight',
                        'first_size',
                        'second_size',
                        'third_size',
                    ]),
                );

                $package->update([
                    'package_type' => $pricedPackage['package_type'] ?? $package->package_type,
                    'quantity' => (int) ($pricedPackage['quantity'] ?? 1),
                    'weight' => $pricedPackage['weight'] ?? $package->weight,
                    'first_size' => $pricedPackage['first_size'] ?? $package->first_size,
                    'second_size' => $pricedPackage['second_size'] ?? $package->second_size,
                    'third_size' => $pricedPackage['third_size'] ?? $package->third_size,
                    'weight_price' => $pricedPackage['weight_price'] ?? $package->weight_price,
                    'volume_price' => $pricedPackage['volume_price'] ?? $package->volume_price,
                    'single_price' => $pricedPackage['single_price'] ?? $package->single_price,
                    'content_description' => $data['content_description'] ?? $package->content_description,
                ]);
            }

            $package->load(['originAddress', 'destinationAddress', 'service']);
            return new PackageResource($package);
        });
    }

    // ── Update quantity ──────────────────────────────────────────

    public function updateQuantity(Request $request, $id)
    {
        $request->validate(['quantity' => 'required|integer|min:1|max:99']);

        $userId = auth()->id();

        if (! $this->packageIsInCart($userId, $id)) {
            return response()->json(['message' => 'Pacco non trovato nel carrello'], 404);
        }

        $inOrder = DB::table('package_order')
            ->where('package_id', $id)
            ->exists();

        if ($inOrder) {
            return response()->json(['message' => 'Pacco già associato a un ordine'], 409);
        }

        $package = Package::with(['originAddress', 'destinationAddress'])
            ->where('id', $id)
            ->where('user_id', $userId)
            ->firstOrFail();

        $newQty = (int) $request->quantity;
        $pricedPackage = CartService::pricePackageModel($package, $newQty);

        $package->update([
            'quantity' => $newQty,
            'weight_price' => $pricedPackage['weight_price'] ?? $package->weight_price,
            'volume_price' => $pricedPackage['volume_price'] ?? $package->volume_price,
            'single_price' => $pricedPackage['single_price'] ?? $package->single_price,
        ]);

        return response()->json([
            'message' => 'Quantita aggiornata',
            'quantity' => $newQty,
            'single_price' => $pricedPackage['single_price'] ?? $package->single_price,
        ]);
    }

    // ── Destroy ──────────────────────────────────────────────────

    public function destroy($id)
    {
        $userId = auth()->id();

        if (! $this->packageIsInCart($userId, $id)) {
            return response()->json(['message' => 'Pacco non trovato nel carrello'], 404);
        }

        $inOrder = DB::table('package_order')
            ->where('package_id', $id)
            ->exists();

        if ($inOrder) {
            return response()->json(['message' => 'Pacco già associato a un ordine'], 409);
        }

        DB::table('cart_user')
            ->where('user_id', $userId)
            ->where('package_id', $id)
            ->delete();

        Package::where('id', $id)->where('user_id', $userId)->delete();

        return response()->json(['message' => 'Spedizione rimossa dal carrello']);
    }
}
