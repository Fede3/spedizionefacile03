<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use App\Models\User;
use Illuminate\Http\Request;
use App\Cart\MyMoney;

class CouponController extends Controller
{
    public function calculateCoupon(Request $request) {
        $couponCode = $request->input('coupon');
        $total = $request->input('total');

        // First check if it's a regular coupon
        $coupon = Coupon::where('code', $couponCode)->where('active', true)->first();

        if ($coupon) {
            $percentageValue = $coupon->percentage;
            $discountAmount = $total * ($percentageValue / 100);
            $finalAmount = $total - $discountAmount;

            $finalAmountCents = intval(round($finalAmount * 100));
            $newAmount = new MyMoney($finalAmountCents);

            return response()->json([
                'success' => true,
                'type' => 'coupon',
                'percentage' => $percentageValue,
                'discount_amount' => round($discountAmount, 2),
                'new_total' => $newAmount->formatted(),
                'new_total_raw' => round($finalAmount, 2),
            ]);
        }

        // Then check if it's a referral code (8-char code belonging to a Partner Pro)
        $proUser = User::where('referral_code', strtoupper($couponCode))
            ->where('role', 'Partner Pro')
            ->first();

        if ($proUser) {
            $buyer = auth()->user();

            if ($proUser->id === $buyer->id) {
                return response()->json([
                    'error' => 'Non puoi usare il tuo stesso codice referral.'
                ], 422);
            }

            $percentageValue = 5; // Referral codes always give 5% discount
            $discountAmount = $total * ($percentageValue / 100);
            $finalAmount = $total - $discountAmount;

            $finalAmountCents = intval(round($finalAmount * 100));
            $newAmount = new MyMoney($finalAmountCents);

            return response()->json([
                'success' => true,
                'type' => 'referral',
                'percentage' => $percentageValue,
                'discount_amount' => round($discountAmount, 2),
                'new_total' => $newAmount->formatted(),
                'new_total_raw' => round($finalAmount, 2),
                'referral_code' => strtoupper($couponCode),
                'pro_user_name' => $proUser->name,
            ]);
        }

        return response()->json([
            'error' => 'Codice non valido'
        ], 404);
    }
}
