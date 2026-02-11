<?php

namespace App\Http\Controllers;

use App\Models\WithdrawalRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WithdrawalController extends Controller
{
    public function index(): JsonResponse
    {
        $requests = WithdrawalRequest::where('user_id', auth()->id())
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $requests]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isPro()) {
            return response()->json(['message' => 'Solo gli account Pro possono richiedere prelievi.'], 403);
        }

        $available = $user->commissionBalance();

        if ($available < 1) {
            return response()->json([
                'message' => 'Saldo commissioni insufficiente. Disponibile: ' . number_format($available, 2) . ' EUR',
            ], 422);
        }

        // Check no pending requests
        $pendingExists = WithdrawalRequest::where('user_id', $user->id)
            ->where('status', 'pending')
            ->exists();

        if ($pendingExists) {
            return response()->json([
                'message' => 'Hai gia una richiesta di prelievo in attesa di approvazione.',
            ], 422);
        }

        $withdrawal = WithdrawalRequest::create([
            'user_id' => $user->id,
            'amount' => $available,
            'currency' => 'EUR',
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'data' => $withdrawal,
        ], 201);
    }
}
