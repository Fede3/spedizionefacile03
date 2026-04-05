<?php

/**
 * FILE: WalletController.php
 * SCOPO: Gestisce il portafoglio digitale degli utenti (saldo, ricarica via Stripe, pagamento, movimenti).
 *
 * COSA ENTRA:
 *   - Request con amount e payment_method_id per topUp (ricarica)
 *   - Request con amount, reference, description per payWithWallet (pagamento)
 *
 * COSA ESCE:
 *   - JSON con balance e commission_balance (solo Pro) per balance
 *   - JSON con lista movimenti per movements
 *   - JSON con success, data (movimento creato), new_balance per topUp/payWithWallet
 *
 * CHIAMATO DA:
 *   - routes/api.php — GET /api/wallet/balance, GET /api/wallet/movements
 *   - routes/api.php — POST /api/wallet/top-up, POST /api/wallet/pay
 *   - nuxt: pages/account/portafoglio.vue, pages/checkout.vue
 *
 * EFFETTI COLLATERALI:
 *   - Rete: chiamata Stripe PaymentIntent per ricarica (off_session, confirm=true)
 *   - Database: crea record in wallet_movements (credit per ricarica, debit per pagamento)
 *
 * ERRORI TIPICI:
 *   - 400: carta rifiutata (fondi insufficienti, carta scaduta)
 *   - 402: pagamento Stripe non riuscito (stato diverso da succeeded)
 *   - 422: saldo insufficiente per pagamento con portafoglio
 *   - 503: Stripe non configurato
 *
 * DOCUMENTI CORRELATI:
 *   - app/Models/WalletMovement.php — modello movimento portafoglio
 *   - app/Models/User.php — walletBalance() e commissionBalance()
 *   - StripeController.php — createOrGetCustomer() usato per ottenere il customer Stripe
 */

namespace App\Http\Controllers;

use App\Models\WalletMovement;
use App\Services\StripePaymentService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Stripe\Exception\CardException;
use Stripe\StripeClient;

class WalletController extends Controller
{
    public function __construct(
        private readonly StripePaymentService $stripePaymentService,
    ) {}

    // Mostra il saldo attuale del portafoglio dell'utente
    // Per i Partner Pro mostra anche il saldo delle commissioni
    public function balance(): JsonResponse
    {
        $user = auth()->user();

        return response()->json(
            [
                'balance' => $user->walletBalance(),                                    // Saldo portafoglio in euro
                'commission_balance' => $user->isPro() ? $user->commissionBalance() : null, // Commissioni (solo Pro)
                'currency' => 'EUR',
            ],
            200,
            [],
            JSON_PRESERVE_ZERO_FRACTION
        );
    }

    // Mostra la lista di tutti i movimenti del portafoglio dell'utente
    // (ricariche, pagamenti, commissioni, prelievi, ecc.)
    // Ordinati dal piu' recente al piu' vecchio
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

    // Ricarica il portafoglio usando una carta di credito salvata
    // Crea un pagamento su Stripe e, se va a buon fine, aggiunge i soldi al portafoglio
    public function topUp(Request $request): JsonResponse
    {
        // Controlliamo che l'importo sia almeno 1 euro e che sia stata fornita una carta
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'payment_method_id' => ['required', 'string'],
            'idempotency_key' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();
        // Convertiamo l'importo da euro a centesimi (es. 10.00 euro -> 1000 centesimi)
        $amountCents = (int) round($data['amount'] * 100);
        $idempotencyKey = $this->stripePaymentService->resolveWalletTopUpIdempotencyKey(
            $user,
            $amountCents,
            (string) $data['payment_method_id'],
            $data['idempotency_key'] ?? null
        );

        if (! $this->stripePaymentService->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'Stripe non configurato. Vai nelle impostazioni per inserire le chiavi API.',
            ], 503);
        }

        try {
            $paymentIntent = $this->stripePaymentService->createWalletTopUpPayment(
                $user,
                $amountCents,
                (string) $data['payment_method_id'],
                $idempotencyKey
            );

            if (($paymentIntent['status'] ?? null) === 'succeeded') {
                $result = DB::transaction(function () use ($user, $data, $paymentIntent, $idempotencyKey) {
                    // Lock pessimistico sull'utente per serializzare aggiornamenti al saldo
                    $lockedUser = \App\Models\User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

                    $existingMovement = WalletMovement::query()
                        ->where('user_id', $lockedUser->id)
                        ->where('idempotency_key', $idempotencyKey)
                        ->lockForUpdate()
                        ->first();

                    if ($existingMovement) {
                        return [
                            'movement' => $existingMovement,
                            'created' => false,
                            'new_balance' => $lockedUser->walletBalance(),
                        ];
                    }

                    $movement = WalletMovement::create([
                        'user_id' => $lockedUser->id,
                        'type' => 'credit',              // "credit" = soldi in entrata
                        'amount' => $data['amount'],
                        'currency' => 'EUR',
                        'status' => 'confirmed',
                        'idempotency_key' => $idempotencyKey,
                        'description' => 'Ricarica portafoglio via carta',
                        'source' => 'stripe',
                        'reference' => $paymentIntent['payment_intent_id'],
                    ]);

                    return [
                        'movement' => $movement,
                        'created' => true,
                        'new_balance' => $lockedUser->walletBalance(),
                    ];
                });

                return response()->json([
                    'success' => true,
                    'data' => $result['movement'],
                    'new_balance' => $result['new_balance'],
                ], $result['created'] ? 201 : 200);
            }

            // Se il pagamento non e' riuscito (stato diverso da "succeeded")
            return response()->json([
                'success' => false,
                'message' => 'Pagamento non riuscito. Stato: '.($paymentIntent['status'] ?? 'unknown'),
            ], 402);
        } catch (QueryException $e) {
            $existingMovement = WalletMovement::query()
                ->where('user_id', $user->id)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existingMovement) {
                return response()->json([
                    'success' => true,
                    'data' => $existingMovement,
                    'new_balance' => $user->walletBalance(),
                ], 200);
            }

            Log::error('Wallet top-up persistence error', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Errore durante il salvataggio della ricarica. Riprova.',
            ], 500);
        } catch (CardException $e) {
            // La carta e' stata rifiutata (fondi insufficienti, carta scaduta, ecc.)
            return response()->json([
                'success' => false,
                'message' => 'Pagamento rifiutato: '.$e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            // Errore generico durante il pagamento
            Log::error('Wallet top-up error', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Errore durante il pagamento. Riprova.',
            ], 500);
        }
    }

    // Paga una spedizione usando il saldo del portafoglio
    // Controlla che ci siano fondi sufficienti e registra il movimento di uscita
    public function payWithWallet(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reference' => ['required', 'string', 'max:64'],       // Riferimento (es. ID ordine)
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();

        // Verifica che il riferimento (ordine) appartenga all'utente autenticato
        $order = \App\Models\Order::find($data['reference']);
        if ($order && (int) $order->user_id !== (int) $user->id) {
            return response()->json(['message' => 'Non autorizzato: questo ordine non appartiene al tuo account.'], 403);
        }

        // Transazione con lock pessimistico per evitare double-spend da richieste concorrenti
        $result = DB::transaction(function () use ($user, $data) {
            // Lock sulla riga utente per serializzare gli accessi concorrenti al saldo
            $lockedUser = \App\Models\User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            $balance = $lockedUser->walletBalance();

            if ($balance < $data['amount']) {
                return ['error' => 'Saldo insufficiente. Disponibile: '.number_format($balance, 2).' EUR'];
            }

            $movement = WalletMovement::create([
                'user_id' => $user->id,
                'type' => 'debit',
                'amount' => $data['amount'],
                'currency' => 'EUR',
                'status' => 'confirmed',
                'idempotency_key' => 'pay_'.$user->id.'_'.Str::uuid(),
                'reference' => $data['reference'],
                'description' => $data['description'] ?? 'Pagamento spedizione',
                'source' => 'wallet',
            ]);

            return ['movement' => $movement, 'new_balance' => $user->walletBalance()];
        });

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], 422);
        }

        return response()->json([
            'success' => true,
            'data' => $result['movement'],
            'new_balance' => $result['new_balance'],
        ], 201);
    }
}
