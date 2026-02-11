<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\ReferralUsage;
use App\Models\WalletMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ReferralController extends Controller
{
    public function myCode(): JsonResponse
    {
        $user = auth()->user();

        if (!$user->isPro()) {
            return response()->json(['message' => 'Solo gli account Pro possono avere un codice referral.'], 403);
        }

        if (!$user->referral_code) {
            $user->referral_code = strtoupper(Str::random(8));
            $user->save();
        }

        $totalEarnings = $user->referralUsagesAsPro()->where('status', 'confirmed')->sum('commission_amount');
        $totalUsages = $user->referralUsagesAsPro()->count();

        return response()->json([
            'referral_code' => $user->referral_code,
            'total_earnings' => round($totalEarnings, 2),
            'total_usages' => $totalUsages,
        ]);
    }

    public function validate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:8'],
        ]);

        $proUser = User::where('referral_code', strtoupper($data['code']))
            ->where('role', 'Partner Pro')
            ->first();

        if (!$proUser) {
            return response()->json(['valid' => false, 'message' => 'Codice non valido.'], 404);
        }

        if ($proUser->id === auth()->id()) {
            return response()->json(['valid' => false, 'message' => 'Non puoi usare il tuo stesso codice.'], 422);
        }

        return response()->json([
            'valid' => true,
            'discount_percent' => 5,
            'pro_name' => $proUser->name,
        ]);
    }

    public function apply(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:8'],
            'order_id' => ['required', 'integer'],
            'order_amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        $proUser = User::where('referral_code', strtoupper($data['code']))
            ->where('role', 'Partner Pro')
            ->first();

        if (!$proUser) {
            return response()->json(['message' => 'Codice referral non valido.'], 404);
        }

        $buyer = auth()->user();

        if ($proUser->id === $buyer->id) {
            return response()->json(['message' => 'Non puoi usare il tuo stesso codice.'], 422);
        }

        $discountAmount = round($data['order_amount'] * 0.05, 2);
        $commissionAmount = round($data['order_amount'] * 0.05, 2);

        $usage = ReferralUsage::create([
            'buyer_id' => $buyer->id,
            'pro_user_id' => $proUser->id,
            'referral_code' => strtoupper($data['code']),
            'order_id' => $data['order_id'],
            'order_amount' => $data['order_amount'],
            'discount_amount' => $discountAmount,
            'commission_amount' => $commissionAmount,
            'status' => 'confirmed',
        ]);

        // Credit commission to Pro user's wallet
        WalletMovement::create([
            'user_id' => $proUser->id,
            'type' => 'credit',
            'amount' => $commissionAmount,
            'currency' => 'EUR',
            'status' => 'confirmed',
            'idempotency_key' => 'commission_' . $usage->id,
            'description' => 'Commissione referral da ' . $buyer->name . ' (ordine #' . $data['order_id'] . ')',
            'source' => 'commission',
            'reference' => 'referral_' . $usage->id,
        ]);

        return response()->json([
            'success' => true,
            'discount_amount' => $discountAmount,
            'usage' => $usage,
        ]);
    }

    public function earnings(): JsonResponse
    {
        $user = auth()->user();

        if (!$user->isPro()) {
            return response()->json(['message' => 'Solo account Pro.'], 403);
        }

        $usages = $user->referralUsagesAsPro()
            ->with('buyer:id,name,email')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $usages,
            'total_earnings' => round($usages->where('status', 'confirmed')->sum('commission_amount'), 2),
            'total_usages' => $usages->count(),
            'commission_balance' => $user->commissionBalance(),
        ]);
    }
}
