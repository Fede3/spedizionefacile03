<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use Illuminate\Http\Request;
use App\Cart\MyMoney;

class CouponController extends Controller
{
    public function calculateCoupon(Request $request) {
        $couponCode = $request->input('coupon');
        $total = $request->input('total');
        
        $coupon = Coupon::where('code', $couponCode)->first();

        if (!$coupon) {
            return response()->json([
                'error' => 'Coupon non valido'
            ], 404);
        }

        $discountAmount = $total * $coupon->percentage;
        $finalAmount = $total - $discountAmount;

        // Passa i centesimi interi a Money
        $finalAmountCents = intval(round($finalAmount * 100)); 
        $newAmount = new MyMoney($finalAmountCents);          

        return response()->json([
            'success' => true,
            'percentage' => $coupon->percentage * 100,
            'new_total' => $newAmount->formatted(),
        ]);


    }
}
