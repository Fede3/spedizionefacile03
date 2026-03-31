<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    // Lista tutti i coupon
    public function index(): JsonResponse
    {
        $coupons = Coupon::orderBy('created_at', 'desc')->get();
        return response()->json(['data' => $coupons]);
    }

    // Crea un nuovo coupon
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => 'required|string|max:50|unique:coupons,code',
            'percentage' => 'required|numeric|min:1|max:100',
            'active' => 'boolean',
        ]);

        $coupon = Coupon::create([
            'code' => strtoupper($data['code']),
            'percentage' => $data['percentage'],
            'active' => $data['active'] ?? true,
        ]);

        return response()->json(['success' => true, 'data' => $coupon], 201);
    }

    // Aggiorna un coupon
    public function update(Request $request, Coupon $coupon): JsonResponse
    {
        $data = $request->validate([
            'code' => 'sometimes|string|max:50|unique:coupons,code,' . $coupon->id,
            'percentage' => 'sometimes|numeric|min:1|max:100',
            'active' => 'sometimes|boolean',
        ]);

        if (isset($data['code'])) $data['code'] = strtoupper($data['code']);
        $coupon->update($data);

        return response()->json(['success' => true, 'data' => $coupon->fresh()]);
    }

    // Elimina un coupon
    public function destroy(Coupon $coupon): JsonResponse
    {
        $coupon->delete();
        return response()->json(['success' => true, 'message' => 'Coupon eliminato.']);
    }
}
