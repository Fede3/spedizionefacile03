<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\WalletMovement;
use App\Models\WithdrawalRequest;
use App\Models\ReferralUsage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    public function walletOverview(): JsonResponse
    {
        $users = User::withCount('walletMovements')
            ->having('wallet_movements_count', '>', 0)
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name . ' ' . $user->surname,
                    'email' => $user->email,
                    'role' => $user->role,
                    'referral_code' => $user->referral_code,
                    'wallet_balance' => $user->walletBalance(),
                    'commission_balance' => $user->isPro() ? $user->commissionBalance() : null,
                    'movements_count' => $user->wallet_movements_count,
                ];
            });

        return response()->json(['data' => $users]);
    }

    public function userMovements(User $user): JsonResponse
    {
        $movements = WalletMovement::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name . ' ' . $user->surname,
                'email' => $user->email,
                'role' => $user->role,
                'wallet_balance' => $user->walletBalance(),
            ],
            'data' => $movements,
        ]);
    }

    public function withdrawals(): JsonResponse
    {
        $requests = WithdrawalRequest::with('user:id,name,surname,email,role,referral_code')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $requests]);
    }

    public function approveWithdrawal(Request $request, WithdrawalRequest $withdrawal): JsonResponse
    {
        if ($withdrawal->status !== 'pending') {
            return response()->json(['message' => 'Questa richiesta non e in attesa.'], 422);
        }

        $withdrawal->update([
            'status' => 'approved',
            'reviewed_at' => now(),
            'reviewed_by' => auth()->id(),
            'admin_notes' => $request->input('notes'),
        ]);

        // Create wallet debit for the withdrawal
        WalletMovement::create([
            'user_id' => $withdrawal->user_id,
            'type' => 'debit',
            'amount' => $withdrawal->amount,
            'currency' => 'EUR',
            'status' => 'confirmed',
            'idempotency_key' => 'withdrawal_' . $withdrawal->id,
            'description' => 'Prelievo commissioni approvato',
            'source' => 'withdrawal',
            'reference' => 'withdrawal_' . $withdrawal->id,
        ]);

        return response()->json([
            'success' => true,
            'data' => $withdrawal->fresh(),
        ]);
    }

    public function rejectWithdrawal(Request $request, WithdrawalRequest $withdrawal): JsonResponse
    {
        if ($withdrawal->status !== 'pending') {
            return response()->json(['message' => 'Questa richiesta non e in attesa.'], 422);
        }

        $withdrawal->update([
            'status' => 'rejected',
            'reviewed_at' => now(),
            'reviewed_by' => auth()->id(),
            'admin_notes' => $request->input('notes', 'Richiesta rifiutata'),
        ]);

        return response()->json([
            'success' => true,
            'data' => $withdrawal->fresh(),
        ]);
    }

    public function referralStats(): JsonResponse
    {
        $stats = ReferralUsage::with([
                'proUser:id,name,surname,email,referral_code',
                'buyer:id,name,surname,email',
            ])
            ->orderByDesc('created_at')
            ->get();

        $summary = [
            'total_discount_given' => round($stats->sum('discount_amount'), 2),
            'total_commissions' => round($stats->sum('commission_amount'), 2),
            'total_order_amount' => round($stats->sum('order_amount'), 2),
            'total_usages' => $stats->count(),
        ];

        return response()->json([
            'data' => $stats,
            'summary' => $summary,
        ]);
    }
}
