<?php

namespace App\Http\Controllers;

use App\Models\ProRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProRequestController extends Controller
{
    /**
     * Submit a new Pro request.
     * Only allowed if the user is not already Pro and has no pending request.
     */
    public function store(Request $request): JsonResponse
    {
        $user = auth()->user();

        if ($user->isPro()) {
            return response()->json([
                'message' => 'Sei già un Partner Pro.',
            ], 422);
        }

        $pendingRequest = ProRequest::where('user_id', $user->id)
            ->where('status', 'pending')
            ->first();

        if ($pendingRequest) {
            return response()->json([
                'message' => 'Hai già una richiesta in attesa di revisione.',
            ], 422);
        }

        $proRequest = ProRequest::create([
            'user_id' => $user->id,
            'company_name' => $request->input('company_name', ''),
            'vat_number' => $request->input('vat_number', ''),
            'message' => $request->input('message'),
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Richiesta Pro inviata con successo.',
            'data' => $proRequest,
        ], 201);
    }

    /**
     * Get the current user's pro request status.
     */
    public function status(): JsonResponse
    {
        $user = auth()->user();

        $proRequest = ProRequest::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->first();

        if (!$proRequest) {
            return response()->json([
                'has_request' => false,
                'data' => null,
            ]);
        }

        return response()->json([
            'has_request' => true,
            'data' => $proRequest,
        ]);
    }

    /**
     * Admin: List all pro requests.
     */
    public function index(): JsonResponse
    {
        $proRequests = ProRequest::with('user:id,name,surname,email,role')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $proRequests]);
    }

    /**
     * Admin: Approve a pro request and set the user role to 'Partner Pro'.
     */
    public function approve(ProRequest $proRequest): JsonResponse
    {
        if ($proRequest->status !== 'pending') {
            return response()->json([
                'message' => 'Questa richiesta non è in attesa.',
            ], 422);
        }

        $proRequest->update([
            'status' => 'approved',
            'reviewed_at' => now(),
        ]);

        $user = $proRequest->user;
        $user->update([
            'role' => 'Partner Pro',
            'referral_code' => $user->referral_code ?: strtoupper(Str::random(8)),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Richiesta approvata. L\'utente è ora Partner Pro.',
            'data' => $proRequest->fresh()->load('user:id,name,surname,email,role,referral_code'),
        ]);
    }

    /**
     * Admin: Reject a pro request.
     */
    public function reject(ProRequest $proRequest): JsonResponse
    {
        if ($proRequest->status !== 'pending') {
            return response()->json([
                'message' => 'Questa richiesta non è in attesa.',
            ], 422);
        }

        $proRequest->update([
            'status' => 'rejected',
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Richiesta rifiutata.',
            'data' => $proRequest->fresh(),
        ]);
    }
}
