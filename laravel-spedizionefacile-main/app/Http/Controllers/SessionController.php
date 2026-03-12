<?php

namespace App\Http\Controllers;

use App\Services\PriceEngineService;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public static function findBandPrice(string $type, float $value): float
    {
        return app(PriceEngineService::class)->calculateBandPrice($type, $value);
    }

    public static function calculateCapSupplement(?string $originCap, ?string $destinationCap): float
    {
        return app(PriceEngineService::class)->calculateCapSupplement($originCap, $destinationCap);
    }

    public static function calculateCapSupplementCents(?string $originCap, ?string $destinationCap): int
    {
        return app(PriceEngineService::class)->calculateCapSupplementCents($originCap, $destinationCap);
    }

    public function show()
    {
        return response()->json([
            'data' => [
                'shipment_details' => session()->get('shipment_details', []),
                'packages' => session()->get('packages', []),
                'services' => session()->get('services', null),
                'total_price' => session()->get('total_price', 0),
                'step' => session()->get('step', 1),
            ],
        ]);
    }

    public function firstStep(Request $request)
    {
        $validated = $request->validate([
            'shipment_details.origin_city' => ['required', 'string'],
            'shipment_details.origin_postal_code' => ['required', 'string'],
            'shipment_details.destination_city' => ['required', 'string'],
            'shipment_details.destination_postal_code' => ['required', 'string'],
            'shipment_details.date' => ['nullable', 'string'],
            'packages' => ['required', 'array', 'min:1'],
            'packages.*.package_type' => ['required', 'string'],
            'packages.*.quantity' => ['required', 'integer', 'min:1'],
            'packages.*.weight' => ['required'],
            'packages.*.first_size' => ['required'],
            'packages.*.second_size' => ['required'],
            'packages.*.third_size' => ['required'],
        ]);

        $shipmentDetails = $validated['shipment_details'];
        $originCap = $shipmentDetails['origin_postal_code'] ?? null;
        $destCap = $shipmentDetails['destination_postal_code'] ?? null;
        $capSupplementCents = self::calculateCapSupplementCents($originCap, $destCap);

        $packages = collect($validated['packages'])->map(function (array $package) use ($capSupplementCents) {
            $weight = (float) preg_replace('/[^0-9.]/', '', (string) ($package['weight'] ?? '0'));
            $weightPrice = self::findBandPrice('weight', $weight);
            $package['weight_price'] = $weightPrice;

            $s1 = (float) preg_replace('/[^0-9.]/', '', (string) ($package['first_size'] ?? '0'));
            $s2 = (float) preg_replace('/[^0-9.]/', '', (string) ($package['second_size'] ?? '0'));
            $s3 = (float) preg_replace('/[^0-9.]/', '', (string) ($package['third_size'] ?? '0'));
            $vol = ($s1 / 100) * ($s2 / 100) * ($s3 / 100);
            $volumePrice = self::findBandPrice('volume', $vol);
            $package['volume_price'] = $volumePrice;

            $weightPriceCents = (int) round((float) $weightPrice * 100);
            $volumePriceCents = (int) round((float) $volumePrice * 100);
            $basePriceCents = max($weightPriceCents, $volumePriceCents) + $capSupplementCents;

            $quantity = (int) ($package['quantity'] ?? 1);
            $package['single_price'] = round(($basePriceCents / 100) * $quantity, 2);

            return $package;
        })->values()->all();

        $totalPrice = collect($packages)->sum(fn (array $package) => (float) ($package['single_price'] ?? 0));

        session()->put('shipment_details', $shipmentDetails);
        session()->put('packages', $packages);
        session()->put('total_price', round($totalPrice, 2));
        session()->put('step', 2);

        return response()->json([
            'data' => [
                'shipment_details' => session()->get('shipment_details'),
                'packages' => session()->get('packages'),
                'services' => session()->get('services', null),
                'total_price' => session()->get('total_price'),
                'step' => session()->get('step'),
            ],
        ]);
    }
}
