<?php

namespace App\Http\Controllers;

use App\Models\WalletMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Setting;
use Stripe\StripeClient;

class WalletController extends Controller
{
    private function getStripeSecret(): ?string
    {
        return Setting::get('stripe_secret', config('services.stripe.secret'));
    }

    public function balance(): JsonResponse
    {
        $user = auth()->user();

        return response()->json([
            'balance' => $user->walletBalance(),
            'commission_balance' => $user->isPro() ? $user->commissionBalance() : null,
            'currency' => 'EUR',
        ]);
    }

    public function movements(): JsonResponse
    {
        $movements = WalletMovement::query()
            ->where('user_id', auth()->id())
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $movements,
        ]);
    }

    public function topUp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'payment_method_id' => ['required', 'string'],
        ]);

        $user = $request->user();
        $amountCents = (int) round($data['amount'] * 100);
        $idempotencyKey = 'topup_' . $user->id . '_' . Str::uuid();

        $secret = $this->getStripeSecret();
        if (!$secret) {
            return response()->json([
                'success' => false,
                'message' => 'Stripe non configurato. Vai nelle impostazioni per inserire le chiavi API.',
            ], 503);
        }

        $stripe = new StripeClient($secret);

        // Ensure customer exists
        $stripeCtrl = new \App\Http\Controllers\StripeController();
        $customerId = $stripeCtrl->createOrGetCustomer($user);

        try {
            $paymentIntent = $stripe->paymentIntents->create([
                'amount' => $amountCents,
                'currency' => 'eur',
                'customer' => $customerId,
                'payment_method' => $data['payment_method_id'],
                'confirm' => true,
                'off_session' => true,
                'metadata' => [
                    'type' => 'wallet_topup',
                    'user_id' => $user->id,
                ],
            ]);

            if ($paymentIntent->status === 'succeeded') {
                $movement = WalletMovement::create([
                    'user_id' => $user->id,
                    'type' => 'credit',
                    'amount' => $data['amount'],
                    'currency' => 'EUR',
                    'status' => 'confirmed',
                    'idempotency_key' => $idempotencyKey,
                    'description' => 'Ricarica portafoglio via carta',
                    'source' => 'stripe',
                    'reference' => $paymentIntent->id,
                ]);

                return response()->json([
                    'success' => true,
                    'data' => $movement,
                    'new_balance' => $user->walletBalance(),
                ], 201);
            }

            return response()->json([
                'success' => false,
                'message' => 'Pagamento non riuscito. Stato: ' . $paymentIntent->status,
            ], 402);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore pagamento: ' . $e->getMessage(),
            ], 400);
        }
    }

    public function payWithWallet(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reference' => ['required', 'string', 'max:64'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $balance = $user->walletBalance();

        if ($balance < $data['amount']) {
            return response()->json([
                'message' => 'Saldo insufficiente. Disponibile: ' . number_format($balance, 2) . ' EUR',
            ], 422);
        }

        $movement = WalletMovement::create([
            'user_id' => $user->id,
            'type' => 'debit',
            'amount' => $data['amount'],
            'currency' => 'EUR',
            'status' => 'confirmed',
            'idempotency_key' => 'pay_' . $user->id . '_' . Str::uuid(),
            'reference' => $data['reference'],
            'description' => $data['description'] ?? 'Pagamento spedizione',
            'source' => 'wallet',
        ]);

        return response()->json([
            'success' => true,
            'data' => $movement,
            'new_balance' => $user->walletBalance(),
        ], 201);
    }
}
