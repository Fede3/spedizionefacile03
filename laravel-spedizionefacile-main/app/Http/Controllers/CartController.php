<?php
/**
 * FILE: CartController.php
 * SCOPO: Layer HTTP per il carrello spedizioni (utenti autenticati).
 *   La logica condivisa e' in CartService.
 *
 * DOVE SI USA: Pagina carrello, pagina riepilogo, composable useCart.js
 *
 * COLLEGAMENTI:
 *   - app/Services/CartService.php -- logica condivisa (merge, subtotale, deduplica)
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

class CartController extends Controller
{
    // ── Helpers ──────────────────────────────────────────────────

    private function loadCartPackages(int $userId)
    {
        $packageIds = DB::table('cart_user')
            ->where('user_id', $userId)
            ->pluck('package_id');

        return Package::with(['originAddress', 'destinationAddress', 'service'])
            ->whereIn('id', $packageIds)
            ->get();
    }

    protected function meta($packages): array
    {
        $subtotal = CartService::subtotalFromModels($packages);
        return [
            'empty' => $packages->isEmpty(),
            'subtotal' => $subtotal->formatted(),
            'total' => $subtotal->formatted(),
            'address_groups' => CartService::buildAddressGroups($packages),
        ];
    }

    // ── Index ────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $userId = auth()->id();
        $packages = $this->loadCartPackages($userId);

        // Auto-merge pacchi identici
        CartService::mergeIdenticalPackages($packages, $userId);

        // Ricarichiamo dopo il merge
        $packages = $this->loadCartPackages($userId);

        // Pulizia pacchi non validi
        $invalidPackages = $packages->filter(fn ($pkg) =>
            empty($pkg->package_type) || (empty($pkg->weight) && empty($pkg->first_size))
        );

        if ($invalidPackages->isNotEmpty()) {
            foreach ($invalidPackages as $pkg) {
                DB::table('cart_user')
                    ->where('user_id', $userId)
                    ->where('package_id', $pkg->id)
                    ->delete();
                $pkg->delete();
            }
            $packages = $this->loadCartPackages($userId);
        }

        return PackageResource::collection($packages)
            ->additional(['meta' => $this->meta($packages)]);
    }

    // ── Show ─────────────────────────────────────────────────────

    public function show($id)
    {
        $userId = auth()->id();

        $inCart = DB::table('cart_user')
            ->where('user_id', $userId)
            ->where('package_id', $id)
            ->exists();

        if (! $inCart) {
            return response()->json(['message' => 'Pacco non trovato nel carrello'], 404);
        }

        $package = Package::with(['originAddress', 'destinationAddress', 'service'])
            ->where('id', $id)
            ->firstOrFail();

        return new PackageResource($package);
    }

    // ── Update ───────────────────────────────────────────────────

    public function update(Request $request, $id)
    {
        $userId = auth()->id();

        $inCart = DB::table('cart_user')
            ->where('user_id', $userId)
            ->where('package_id', $id)
            ->exists();

        if (! $inCart) {
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
            'packages.*.weight_price' => 'nullable|numeric|min:0',
            'packages.*.volume_price' => 'nullable|numeric|min:0',
            'packages.*.single_price' => 'nullable|numeric|min:0',
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

            if (isset($data['services']) && $package->service) {
                $servicesData = CartService::normalizeServiceData($data['services']);
                $servicesData = CartService::applyPudoData($servicesData, $data);
                $package->service->update($servicesData);
            }

            if (isset($data['packages']) && count($data['packages']) > 0) {
                $packageData = $data['packages'][0];
                $singlePriceCents = CartService::euroToCents($packageData['single_price'] ?? 0);

                $package->update([
                    'package_type' => $packageData['package_type'] ?? $package->package_type,
                    'quantity' => (int) ($packageData['quantity'] ?? 1),
                    'weight' => $packageData['weight'] ?? $package->weight,
                    'first_size' => $packageData['first_size'] ?? $package->first_size,
                    'second_size' => $packageData['second_size'] ?? $package->second_size,
                    'third_size' => $packageData['third_size'] ?? $package->third_size,
                    'weight_price' => $packageData['weight_price'] ?? $package->weight_price,
                    'volume_price' => $packageData['volume_price'] ?? $package->volume_price,
                    'single_price' => $singlePriceCents,
                    'content_description' => $data['content_description'] ?? $package->content_description,
                ]);
            }

            $package->load(['originAddress', 'destinationAddress', 'service']);
            return new PackageResource($package);
        });
    }

    // ── Store ────────────────────────────────────────────────────

    public function store(PackageStoreRequest $request)
    {
        $data = $request->validated();
        $authId = auth()->id();

        $existingPackages = $this->loadCartPackages($authId);

        $outPackages = DB::transaction(function () use ($data, $authId, $existingPackages) {
            $servicesData = CartService::normalizeServiceData($data['services']);
            $servicesData = CartService::applyPudoData($servicesData, $data);

            $packages = [];
            $origin = null;
            $destination = null;
            $services = null;

            foreach ($data['packages'] as $packageData) {
                $singlePriceCents = CartService::euroToCents($packageData['single_price'] ?? 0);
                $newQty = (int) ($packageData['quantity'] ?? 1);

                $newServiceSig = CartService::buildServiceSignatureFromArray(
                    $servicesData['service_type'] ?? 'Nessuno',
                    $servicesData['service_data'] ?? [],
                );

                $duplicate = $existingPackages->first(function ($existing) use ($packageData, $data, $newServiceSig) {
                    if (! $existing->originAddress || ! $existing->destinationAddress || ! $existing->service) {
                        return false;
                    }
                    return CartService::isDuplicate(
                        $packageData,
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
                    );
                    $duplicate->update($merged);
                    $packages[] = $duplicate;
                } else {
                    if (! $origin) {
                        $origin = PackageAddress::create($data['origin_address']);
                        $destination = PackageAddress::create($data['destination_address']);
                        $services = Service::create($servicesData);
                    }

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
                        'user_id' => $authId,
                    ]);
                }
            }

            return $packages;
        });

        // Link new packages to cart
        foreach ($outPackages as $package) {
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

        return PackageResource::collection($outPackages);
    }

    // ── Update quantity ──────────────────────────────────────────

    public function updateQuantity(Request $request, $id)
    {
        $request->validate(['quantity' => 'required|integer|min:1|max:99']);

        $userId = auth()->id();
        $package = Package::where('id', $id)->where('user_id', $userId)->firstOrFail();

        $oldQty = max(1, (int) $package->quantity);
        $newQty = (int) $request->quantity;
        $unitPriceCents = CartService::unitPrice((int) $package->single_price, $oldQty);

        $package->update([
            'quantity' => $newQty,
            'single_price' => $unitPriceCents * $newQty,
        ]);

        return response()->json([
            'message' => 'Quantita aggiornata',
            'quantity' => $newQty,
            'single_price' => $unitPriceCents * $newQty,
        ]);
    }

    // ── Destroy ──────────────────────────────────────────────────

    public function destroy($id)
    {
        $userId = auth()->id();

        DB::table('cart_user')
            ->where('user_id', $userId)
            ->where('package_id', $id)
            ->delete();

        Package::where('id', $id)->where('user_id', $userId)->delete();

        return response()->json(['message' => 'Spedizione rimossa dal carrello']);
    }

    // ── Merge identical (POST /api/cart/merge) ───────────────────

    public function mergeIdentical()
    {
        $userId = auth()->id();
        $packages = $this->loadCartPackages($userId);

        if ($packages->count() < 2) {
            return response()->json(['message' => 'Nulla da unire.', 'merged' => 0]);
        }

        $merged = DB::transaction(fn () => CartService::mergeIdenticalPackages($packages, $userId));

        return response()->json([
            'message' => $merged > 0 ? "$merged pacchi identici uniti." : 'Nessun pacco da unire.',
            'merged' => $merged,
        ]);
    }

    // ── Empty cart ───────────────────────────────────────────────

    public function emptyCart()
    {
        $userId = auth()->id();

        $cartPackageIds = DB::table('cart_user')
            ->where('user_id', $userId)
            ->pluck('package_id');

        if ($cartPackageIds->isNotEmpty()) {
            Package::whereIn('id', $cartPackageIds)
                ->where('user_id', $userId)
                ->delete();
        }

        DB::table('cart_user')
            ->where('user_id', $userId)
            ->delete();

        return response()->json(['message' => 'Carrello svuotato']);
    }
}
