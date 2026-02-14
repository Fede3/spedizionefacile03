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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Setting;
use Stripe\StripeClient;
class WalletController extends Controller
{
    // Recupera la chiave segreta di Stripe dal database o dal file .env
    private function getStripeSecret(): ?string
    {
        return Setting::get('stripe_secret', config('services.stripe.secret'));
    }

    // Mostra il saldo attuale del portafoglio dell'utente
    // Per i Partner Pro mostra anche il saldo delle commissioni
    public function balance(): JsonResponse
    {
        $user = auth()->user();

        return response()->json([
            'balance' => $user->walletBalance(),                                    // Saldo portafoglio in euro
            'commission_balance' => $user->isPro() ? $user->commissionBalance() : null, // Commissioni (solo Pro)
            'currency' => 'EUR',
        ]);
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
        ]);

        $user = $request->user();
        // Convertiamo l'importo da euro a centesimi (es. 10.00 euro -> 1000 centesimi)
        $amountCents = (int) round($data['amount'] * 100);
        // Chiave unica per evitare di processare lo stesso pagamento due volte
        $idempotencyKey = 'topup_' . $user->id . '_' . Str::uuid();

        // Verifichiamo che Stripe sia configurato
        $secret = $this->getStripeSecret();
        if (!$secret) {
            return response()->json([
                'success' => false,
                'message' => 'Stripe non configurato. Vai nelle impostazioni per inserire le chiavi API.',
            ], 503);
        }

        $stripe = new StripeClient($secret);

        // Assicuriamoci che l'utente abbia un "cliente" su Stripe
        // (Stripe richiede un cliente per associare le carte di pagamento)
        $stripeCtrl = new \App\Http\Controllers\StripeController();
        $customerId = $stripeCtrl->createOrGetCustomer($user);

        try {
            // Creiamo e confermiamo il pagamento su Stripe in un solo passaggio
            $paymentIntent = $stripe->paymentIntents->create([
                'amount' => $amountCents,
                'currency' => 'eur',
                'customer' => $customerId,
                'payment_method' => $data['payment_method_id'],
                'confirm' => true,           // Conferma subito il pagamento
                'off_session' => true,       // Il pagamento avviene senza interazione dell'utente
                'metadata' => [
                    'type' => 'wallet_topup',
                    'user_id' => $user->id,
                ],
            ]);

            // Se il pagamento e' andato a buon fine, aggiungiamo i soldi al portafoglio
            if ($paymentIntent->status === 'succeeded') {
                $movement = WalletMovement::create([
                    'user_id' => $user->id,
                    'type' => 'credit',              // "credit" = soldi in entrata
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

            // Se il pagamento non e' riuscito (stato diverso da "succeeded")
            return response()->json([
                'success' => false,
                'message' => 'Pagamento non riuscito. Stato: ' . $paymentIntent->status,
            ], 402);
        } catch (\Stripe\Exception\CardException $e) {
            // La carta e' stata rifiutata (fondi insufficienti, carta scaduta, ecc.)
            return response()->json([
                'success' => false,
                'message' => 'Pagamento rifiutato: ' . $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            // Errore generico durante il pagamento
            \Illuminate\Support\Facades\Log::error('Wallet top-up error', ['error' => $e->getMessage()]);
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
        $balance = $user->walletBalance();

        // Controlliamo che il saldo sia sufficiente per pagare
        if ($balance < $data['amount']) {
            return response()->json([
                'message' => 'Saldo insufficiente. Disponibile: ' . number_format($balance, 2) . ' EUR',
            ], 422);
        }

        // Registriamo il movimento di uscita dal portafoglio
        $movement = WalletMovement::create([
            'user_id' => $user->id,
            'type' => 'debit',                 // "debit" = soldi in uscita
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
