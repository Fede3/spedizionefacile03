<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SessionController extends Controller
{
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
            'packages.*.single_price' => ['nullable', 'numeric', 'min:0'],
            'packages.*.weight_price' => ['nullable', 'numeric', 'min:0'],
            'packages.*.volume_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $shipmentDetails = $validated['shipment_details'];
        $packages = collect($validated['packages'])->map(function (array $package) {
            // Server-side price calculation as fallback
            $weightPrice = $package['weight_price'] ?? null;
            $volumePrice = $package['volume_price'] ?? null;

            if ($weightPrice === null) {
                $weight = (float) preg_replace('/[^0-9.]/', '', $package['weight']);
                if ($weight > 0 && $weight < 2) $weightPrice = 9;
                elseif ($weight >= 2 && $weight < 5) $weightPrice = 12;
                elseif ($weight >= 5 && $weight < 10) $weightPrice = 18;
                else $weightPrice = 20;
                $package['weight_price'] = $weightPrice;
            }

            if ($volumePrice === null) {
                $s1 = (float) preg_replace('/[^0-9.]/', '', $package['first_size']);
                $s2 = (float) preg_replace('/[^0-9.]/', '', $package['second_size']);
                $s3 = (float) preg_replace('/[^0-9.]/', '', $package['third_size']);
                $vol = ($s1 / 100) * ($s2 / 100) * ($s3 / 100);
                if ($vol > 0 && $vol < 0.008) $volumePrice = 9;
                elseif ($vol >= 0.008 && $vol < 0.02) $volumePrice = 12;
                elseif ($vol >= 0.02 && $vol < 0.04) $volumePrice = 18;
                else $volumePrice = 20;
                $package['volume_price'] = $volumePrice;
            }

            $basePrice = max((float) $weightPrice, (float) $volumePrice);
            $quantity = (int) ($package['quantity'] ?? 1);
            $package['single_price'] = round($basePrice * $quantity, 2);

            return $package;
        })->values()->all();

        $totalPrice = collect($packages)->sum(function (array $package) {
            return $package['single_price'];
        });

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

