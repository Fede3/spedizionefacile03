<?php
/**
 * Admin Wallet Management Controller
 *
 * Provides admin oversight of user wallets: overview of all balances,
 * per-user movement history, and withdrawal request approval/rejection.
 */

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WalletMovement;
use App\Models\WithdrawalRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletManagementController extends Controller
{
    // Mostra la panoramica dei portafogli di tutti gli utenti che hanno movimenti
    // Utile per l'admin per controllare chi ha soldi nel portafoglio
    public function walletOverview(): JsonResponse
    {
        // Cerchiamo tutti gli utenti che hanno almeno un movimento nel portafoglio
        $users = User::has('walletMovements')
            ->withCount('walletMovements')
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

    // Mostra tutti i movimenti del portafoglio di un utente specifico
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

    // Mostra tutte le richieste di prelievo dei Partner Pro
    // (con i dati dell'utente che ha fatto la richiesta)
    public function withdrawals(): JsonResponse
    {
        $requests = WithdrawalRequest::with('user:id,name,surname,email,role,referral_code')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $requests]);
    }

    // Approva una richiesta di prelievo di un Partner Pro
    // Crea un movimento di uscita (debito) nel portafoglio dell'utente
    public function approveWithdrawal(Request $request, WithdrawalRequest $withdrawal): JsonResponse
    {
        // La richiesta deve essere ancora in attesa
        if ($withdrawal->status !== 'pending') {
            return response()->json(['message' => 'Questa richiesta non e in attesa.'], 422);
        }

        // Aggiorniamo lo stato della richiesta a "approvata"
        $withdrawal->update([
            'status' => 'approved',
            'reviewed_at' => now(),
            'reviewed_by' => auth()->id(),
            'admin_notes' => $request->input('notes'),
        ]);

        // Registriamo l'uscita di denaro dal portafoglio dell'utente
        WalletMovement::create([
            'user_id' => $withdrawal->user_id,
            'type' => 'debit',                         // "debit" = soldi in uscita
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

    // Rifiuta una richiesta di prelievo di un Partner Pro
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
}
