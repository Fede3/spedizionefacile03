<?php

/**
 * FILE: CryptoController.php
 * SCOPO: Gestisce i pagamenti in criptovaluta tramite NOWPayments.
 *
 * PROVIDER: NOWPayments (https://nowpayments.io)
 *   - Supporta 300+ criptovalute (BTC, ETH, USDT, LTC, ecc.)
 *   - Flusso: invoice redirect → utente paga su NOWPayments → IPN webhook → ordine confermato
 *
 * DATI IN INGRESSO:
 *   - createInvoice(): { pay_currency: "btc"|"eth"|"usdt"|"ltc", package_ids?: [1,2] }
 *   - ipn(): { payment_id, payment_status, order_id, price_amount, actually_paid, ... }
 *
 * DATI IN USCITA:
 *   - createInvoice(): { invoice_url, order_id, payment_id }
 *   - ipn(): { ok: true }
 *
 * SETUP RICHIESTO (variabili .env):
 *   NOWPAYMENTS_API_KEY=your-api-key
 *   NOWPAYMENTS_IPN_SECRET=your-ipn-secret
 *   NOWPAYMENTS_SANDBOX=false  (true solo in sviluppo)
 *
 * FLUSSO COMPLETO:
 *   1. Frontend chiama POST /api/crypto/create-invoice
 *   2. Backend crea ordine, poi chiama NOWPayments API per creare un invoice
 *   3. Backend risponde con invoice_url
 *   4. Frontend reindirizza l'utente su invoice_url
 *   5. Utente completa il pagamento su NOWPayments
 *   6. NOWPayments chiama POST /api/crypto/ipn
 *   7. Backend verifica firma HMAC-SHA512, aggiorna stato ordine
 *
 * COLLEGAMENTI:
 *   - StripeController.php — riutilizza createOrder() e la logica di completamento ordine
 *   - app/Events/OrderPaid.php — evento lanciato dopo conferma pagamento
 *   - app/Models/Order.php — aggiornamento stato e payment_method
 */

namespace App\Http\Controllers;

use App\Events\OrderPaid;
use App\Models\Order;
use App\Models\Setting;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CryptoController extends Controller
{
    /**
     * Crea un invoice NOWPayments per il pagamento in crypto.
     *
     * FLUSSO:
     * 1. Crea l'ordine dal carrello (riutilizzando la logica di StripeController)
     * 2. Chiama l'API NOWPayments per creare l'invoice
     * 3. Restituisce l'URL di pagamento al frontend
     */
    public function createInvoice(Request $request)
    {
        $request->validate([
            'pay_currency' => 'required|string|in:btc,eth,usdt,ltc,bnb,xrp,doge,ada,sol,trx',
            'order_id' => 'nullable|integer',
            'package_ids' => 'nullable|array',
            'package_ids.*' => 'integer',
        ]);

        Log::info('CryptoController::createInvoice called', [
            'user_id' => auth()->id(),
            'pay_currency' => $request->pay_currency,
            'order_id' => $request->order_id,
        ]);

        // --- 1. Recupera o crea l'ordine ---
        if ($request->order_id) {
            // Ordine esistente (es. utente arriva da /checkout?order_id=X)
            $order = Order::where('id', $request->order_id)
                ->where('user_id', auth()->id())
                ->firstOrFail();

            if (! in_array($order->status, [Order::PENDING, Order::PAYMENT_FAILED], true)) {
                return response()->json([
                    'error' => 'Questo ordine non è pagabile in questo stato.',
                    'error_code' => 'order_not_payable',
                ], 422);
            }
        } else {
            $hasCartItems = DB::table('cart_user')
                ->where('user_id', auth()->id())
                ->exists();

            if (! $hasCartItems) {
                return response()->json([
                    'error' => 'Il carrello è vuoto.',
                    'error_code' => 'cart_empty',
                ], 400);
            }

            // Crea ordine dal carrello
            try {
                $stripeCtrl = app(StripeController::class);
                $orderResponse = $stripeCtrl->createOrder($request);
                $orderData = $orderResponse->getData(true);
            } catch (\Throwable $e) {
                Log::error('CryptoController: createOrder failed', ['error' => $e->getMessage()]);

                return response()->json([
                    'error' => 'Errore nella creazione dell\'ordine.',
                    'error_code' => 'crypto_provider_error',
                ], 502);
            }

            if (isset($orderData['error'])) {
                $status = str_contains(mb_strtolower((string) $orderData['error'], 'UTF-8'), 'vuoto') ? 400 : 422;

                return response()->json([
                    'error' => $orderData['error'],
                    'error_code' => $status === 400 ? 'cart_empty' : 'order_not_payable',
                ], $status);
            }

            $orderId = $orderData['order_id'] ?? ($orderData['order_ids'][0] ?? null);
            if (! $orderId) {
                return response()->json([
                    'error' => 'Impossibile creare l\'ordine.',
                    'error_code' => 'crypto_provider_error',
                ], 502);
            }

            $order = Order::findOrFail($orderId);
        }

        // --- 2. Chiamata API NOWPayments ---
        $apiKey = config('services.nowpayments.api_key');
        $sandbox = config('services.nowpayments.sandbox', false);
        $baseUrl = $sandbox
            ? 'https://api-sandbox.nowpayments.io/v1'
            : 'https://api.nowpayments.io/v1';

        $appUrl = config('app.url');
        $successUrl = $appUrl.'/account/spedizioni?pagamento=crypto_ok';
        $cancelUrl = $appUrl.'/checkout?crypto_cancelled=1';
        $ipnUrl = $appUrl.'/api/crypto/ipn';

        // Importo in EUR (centesimi → euro) + sovrapprezzo crypto configurabile da admin
        $amountCents = $order->subtotal->amount();
        $cryptoSurchargeCents = (int) Setting::get('crypto_surcharge', 5000); // Default: 50€ = 5000 centesimi
        $amountCents += $cryptoSurchargeCents;
        $amountEur = number_format($amountCents / 100, 2, '.', '');

        $invoicePayload = [
            'price_amount' => (float) $amountEur,
            'price_currency' => 'eur',
            'pay_currency' => strtolower($request->pay_currency),
            'order_id' => (string) $order->id,
            'order_description' => 'SpedizioneFacile - Spedizione #'.$order->id,
            'ipn_callback_url' => $ipnUrl,
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'is_fixed_rate' => false,
            'is_fee_paid_by_user' => false,
        ];

        Log::info('CryptoController: calling NOWPayments', [
            'url' => $baseUrl.'/invoice',
            'payload' => $invoicePayload,
        ]);

        $response = Http::withHeaders([
            'x-api-key' => $apiKey,
            'Content-Type' => 'application/json',
        ])->post($baseUrl.'/invoice', $invoicePayload);

        Log::info('CryptoController: NOWPayments response', [
            'status' => $response->status(),
            'body' => $response->body(),
        ]);

        if ($response->failed()) {
            Log::error('NOWPayments invoice error', [
                'status' => $response->status(),
                'body' => $response->body(),
                'order' => $order->id,
            ]);

            return response()->json([
                'error' => 'Errore nella creazione del pagamento crypto. Riprova o scegli un altro metodo.',
                'error_code' => 'crypto_provider_error',
            ], 502);
        }

        $invoiceData = $response->json();

        // Salva l'ID invoice sull'ordine per poterlo recuperare nel webhook
        $order->nowpayments_invoice_id = $invoiceData['id'] ?? null;
        $order->payment_method = 'crypto';
        $order->save();

        return response()->json([
            'invoice_url' => $invoiceData['invoice_url'],
            'order_id' => $order->id,
            'payment_id' => $invoiceData['id'] ?? null,
        ]);
    }

    /**
     * Webhook IPN di NOWPayments — riceve la notifica di pagamento completato.
     *
     * NOWPayments invia una firma HMAC-SHA512 nell'header x-nowpayments-sig.
     * Verifichiamo la firma prima di aggiornare lo stato dell'ordine.
     *
     * IMPORTANTE: questo endpoint NON richiede autenticazione Sanctum (è chiamato da NOWPayments).
     * Viene protetto dalla verifica della firma crittografica.
     */
    public function ipn(Request $request)
    {
        $ipnSecret = config('services.nowpayments.ipn_secret');
        $signature = $request->header('x-nowpayments-sig');

        // Verifica firma HMAC-SHA512 — OBBLIGATORIA
        if (! $ipnSecret) {
            Log::error('NOWPayments IPN: NOWPAYMENTS_IPN_SECRET non configurato. Richiesta rifiutata.');

            return response()->json(['error' => 'Configurazione IPN mancante.'], 500);
        }

        if (! $signature) {
            Log::warning('NOWPayments IPN: header x-nowpayments-sig mancante.');

            return response()->json(['error' => 'Firma mancante.'], 401);
        }

        $payload = $request->getContent();
        // NOWPayments ordina i parametri per chiave prima di firmare
        $data = json_decode($payload, true);
        ksort($data);
        $sortedPayload = json_encode($data, JSON_UNESCAPED_SLASHES);
        $expectedSig = hash_hmac('sha512', $sortedPayload, $ipnSecret);

        if (! hash_equals($expectedSig, strtolower($signature))) {
            Log::warning('NOWPayments IPN: firma non valida', [
                'expected' => $expectedSig,
                'received' => $signature,
            ]);

            return response()->json(['error' => 'Firma non valida.'], 401);
        }

        $paymentStatus = $request->input('payment_status');
        $orderId = (int) $request->input('order_id');
        $paymentId = $request->input('payment_id');

        Log::info('NOWPayments IPN', [
            'order_id' => $orderId,
            'status' => $paymentStatus,
            'payment_id' => $paymentId,
        ]);

        // Aggiorniamo l'ordine solo quando il pagamento è confermato o completato
        // SICUREZZA: non accettiamo 'partially_paid' — il pagamento deve essere completo
        if (! in_array($paymentStatus, ['finished', 'confirmed'])) {
            Log::info('NOWPayments IPN: stato non finale, skip', ['status' => $paymentStatus]);

            return response()->json(['ok' => true, 'skipped' => true]);
        }

        $order = Order::find($orderId);
        if (! $order) {
            Log::error('NOWPayments IPN: ordine non trovato', ['order_id' => $orderId]);

            return response()->json(['error' => 'Ordine non trovato.'], 404);
        }

        // SICUREZZA: verifica che l'importo pagato corrisponda al totale dell'ordine
        $paidAmount = (float) ($request->input('price_amount') ?? 0);
        $expectedCents = $order->subtotal->amount();
        $cryptoSurchargeCents = (int) Setting::get('crypto_surcharge', 5000);
        $expectedEur = round(($expectedCents + $cryptoSurchargeCents) / 100, 2);

        // Tolleranza di 1 centesimo per arrotondamenti
        if (abs($paidAmount - $expectedEur) > 0.01) {
            Log::error('NOWPayments IPN: importo non corrispondente', [
                'order_id' => $orderId,
                'expected_eur' => $expectedEur,
                'received_eur' => $paidAmount,
            ]);

            return response()->json(['error' => 'Importo non corrispondente.'], 422);
        }

        // Evita doppia elaborazione se l'ordine è già stato confermato
        if ($order->status === Order::COMPLETED || $order->status === Order::PROCESSING) {
            return response()->json(['ok' => true, 'already_processed' => true]);
        }

        DB::transaction(function () use ($order, $paymentId) {
            $order->status = Order::COMPLETED;
            $order->payment_method = 'crypto';
            $order->save();

            $transaction = Transaction::create([
                'order_id' => $order->id,
                'ext_id' => 'nowpayments_'.$paymentId,
                'type' => 'crypto',
                'status' => 'succeeded',
                'total' => $order->subtotal->amount(),
            ]);

            // Svuota il carrello dell'utente
            if ($order->user_id) {
                DB::table('cart_user')
                    ->where('user_id', $order->user_id)
                    ->delete();
            }

            // Lancia l'evento OrderPaid per avviare la generazione dell'etichetta BRT
            event(new OrderPaid($order, $transaction));
        });

        return response()->json(['ok' => true]);
    }
}
