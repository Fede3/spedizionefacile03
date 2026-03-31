<?php

/**
 * FILE: RefundController.php
 * SCOPO: Gestisce annullamento ordini e rimborsi (Stripe o portafoglio), cancellazione etichette BRT.
 *
 * DOVE SI USA: Dettaglio ordine utente, lista ordini utente, OrderController.cancel()
 *
 * DATI IN INGRESSO:
 *   - checkRefundEligibility(): Order via route model binding
 *   - requestCancellation(): Order + {reason?: "motivo annullamento"}
 *
 * DATI IN USCITA:
 *   - checkRefundEligibility(): {eligible, reason, refund_amount_cents, commission_cents,
 *     refund_amount_eur, commission_eur, payment_method, type}
 *   - requestCancellation(): {success, message, refund_amount: "6,90", commission: "2,00",
 *     refund_method: "stripe"|"wallet", brt_cancelled: true|false}
 *
 * VINCOLI:
 *   - Commissione di annullamento: 2 EUR (CANCELLATION_FEE_CENTS = 200 centesimi)
 *   - Ordini in_transit: NON rimborsabili (il pacco e' gia' partito)
 *   - Ordini pending/payment_failed: annullabili senza rimborso (non ancora pagati)
 *   - Se BRT fallisce la cancellazione, l'annullamento prosegue comunque (errore loggato)
 *   - Il rimborso via wallet e' il fallback se il metodo di pagamento originale e' sconosciuto
 *
 * ERRORI TIPICI:
 *   - 403: utente non proprietario dell'ordine
 *   - 422: ordine non rimborsabile (gia' ritirato, gia' annullato, ecc.)
 *   - 500: errore Stripe o BRT durante il rimborso
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per cambiare la commissione: modificare CANCELLATION_FEE_CENTS
 *   - Per aggiungere stati rimborsabili: modificare calculateEligibility()
 *   - Per aggiungere un metodo di rimborso: aggiungere un case in requestCancellation()
 *
 * COLLEGAMENTI:
 *   - app/Models/Order.php — stati ordine e campi refund_*
 *   - app/Services/BrtService.php — deleteShipment per cancellare etichette BRT
 *   - StripeController.php — pagamenti originali
 *   - WalletController.php — pattern per movimenti portafoglio
 */

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\WalletMovement;
use App\Services\BrtService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

class RefundController extends Controller
{
    // Commissione di annullamento in centesimi (2 EUR = 200 centesimi)
    const CANCELLATION_FEE_CENTS = 200;

    /**
     * Recupera la chiave segreta di Stripe.
     * Prima cerca nel database (impostazioni admin), poi nel file .env come riserva.
     */
    private function getStripeSecret(): ?string
    {
        return Setting::get('stripe_secret')
            ?: Setting::get('stripe_secret_key')
            ?: config('services.stripe.secret');
    }

    /**
     * Controlla se un ordine e' idoneo al rimborso.
     * Restituisce le informazioni sul rimborso (importo, commissione, motivo).
     *
     * Regole:
     * - Ordini pending/payment_failed: annullabili senza rimborso (non ancora pagati)
     * - Ordini completed/processing/in_transit senza ritiro: rimborsabili con commissione di 2 EUR
     * - Ordini gia' ritirati dal corriere: NON rimborsabili
     * - Ordini gia' annullati/rimborsati: NON rimborsabili
     */
    public function checkRefundEligibility(Order $order): JsonResponse
    {
        // Solo il proprietario dell'ordine o un admin puo' controllare l'idoneita'
        if ($order->user_id !== auth()->id() && ! auth()->user()->isAdmin()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        $eligibility = $this->calculateEligibility($order);

        return response()->json($eligibility);
    }

    /**
     * Richiede l'annullamento e il rimborso di un ordine.
     *
     * Flusso:
     * 1. Verifica che l'ordine sia rimborsabile
     * 2. Se c'e' un'etichetta BRT, prova a cancellarla via API
     * 3. Processa il rimborso:
     *    - Stripe: usa l'API Refund di Stripe (rimborso parziale, meno la commissione)
     *    - Wallet: ricredita il portafoglio dell'utente
     * 4. Aggiorna lo stato dell'ordine e registra la transazione
     */
    public function requestCancellation(Request $request, Order $order): JsonResponse
    {
        // Solo il proprietario dell'ordine puo' richiedere l'annullamento
        if ($order->user_id !== auth()->id()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $eligibility = $this->calculateEligibility($order);

        if (! $eligibility['eligible']) {
            return response()->json([
                'error' => $eligibility['reason'],
            ], 422);
        }

        try {
            $result = DB::transaction(function () use ($order, $request, $eligibility) {
                // --- 1. Cancellazione etichetta BRT (se esiste) ---
                $brtCancelled = false;
                if ($order->brt_numeric_sender_reference) {
                    try {
                        $brtService = new BrtService;
                        $brtResult = $brtService->deleteShipment((int) $order->brt_numeric_sender_reference);
                        $brtCancelled = $brtResult['success'] ?? false;

                        if (! $brtCancelled) {
                            Log::warning('BRT deleteShipment failed during cancellation', [
                                'order_id' => $order->id,
                                'brt_reference' => $order->brt_numeric_sender_reference,
                                'brt_error' => $brtResult['error'] ?? 'Errore sconosciuto',
                            ]);
                            // Non blocchiamo l'annullamento se BRT fallisce,
                            // ma logghiamo l'errore per intervenire manualmente
                        }
                    } catch (\Exception $e) {
                        Log::error('BRT deleteShipment exception during cancellation', [
                            'order_id' => $order->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }

                // --- 2. Processo di rimborso (solo se l'ordine era stato pagato) ---
                $refundAmountCents = $eligibility['refund_amount_cents'];
                $commissionCents = $eligibility['commission_cents'];
                $refundMethod = 'wallet';

                if ($refundAmountCents > 0) {
                    $paymentMethod = $order->payment_method;

                    if ($paymentMethod === 'stripe' && $order->stripe_payment_intent_id) {
                        // --- Rimborso via Stripe ---
                        $refundMethod = 'stripe';
                        $this->processStripeRefund($order, $refundAmountCents);
                    } elseif ($paymentMethod === 'wallet') {
                        // --- Rimborso via Portafoglio ---
                        $refundMethod = 'wallet';
                        $this->processWalletRefund($order, $refundAmountCents);
                    } else {
                        // Pagamento con metodo sconosciuto o non specificato.
                        // In questo caso facciamo un rimborso via wallet come fallback sicuro
                        $refundMethod = 'wallet';
                        $this->processWalletRefund($order, $refundAmountCents);
                    }

                    // Registriamo la transazione di rimborso
                    Transaction::create([
                        'order_id' => $order->id,
                        'ext_id' => 'refund_'.$order->id.'_'.now()->timestamp,
                        'type' => 'refund_'.$refundMethod,
                        'status' => 'succeeded',
                        'total' => -$refundAmountCents, // Negativo per indicare un rimborso
                    ]);
                }

                // --- 3. Aggiornamento stato ordine ---
                $order->status = $refundAmountCents > 0 ? Order::REFUNDED : Order::CANCELLED;
                $order->refund_status = $refundAmountCents > 0 ? 'completed' : 'none';
                $order->refund_amount = $refundAmountCents;
                $order->refund_method = $refundMethod;
                $order->refund_reason = $request->reason ?? 'Annullamento richiesto dall\'utente';
                $order->refunded_at = $refundAmountCents > 0 ? now() : null;
                $order->cancellation_fee = $commissionCents;
                $order->save();

                Log::info('Order cancelled and refunded', [
                    'order_id' => $order->id,
                    'refund_amount_cents' => $refundAmountCents,
                    'commission_cents' => $commissionCents,
                    'refund_method' => $refundMethod,
                    'brt_cancelled' => $brtCancelled,
                    'new_status' => $order->status,
                ]);

                return [
                    'refund_amount_cents' => $refundAmountCents,
                    'commission_cents' => $commissionCents,
                    'refund_method' => $refundMethod,
                    'brt_cancelled' => $brtCancelled,
                ];
            });

            $refundEur = number_format($result['refund_amount_cents'] / 100, 2, ',', '.');
            $commissionEur = number_format($result['commission_cents'] / 100, 2, ',', '.');

            $message = $result['refund_amount_cents'] > 0
                ? "Ordine annullato. Rimborso di {$refundEur} EUR processato (commissione: {$commissionEur} EUR)."
                : 'Ordine annullato con successo.';

            return response()->json([
                'success' => true,
                'message' => $message,
                'refund_amount' => $refundEur,
                'commission' => $commissionEur,
                'refund_method' => $result['refund_method'],
                'brt_cancelled' => $result['brt_cancelled'],
            ]);
        } catch (\Exception $e) {
            Log::error('Order cancellation failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Errore durante l\'annullamento dell\'ordine. Riprova o contatta l\'assistenza.',
            ], 500);
        }
    }

    /**
     * Calcola l'idoneita' al rimborso per un ordine.
     *
     * @return array con: eligible, reason, refund_amount_cents, commission_cents,
     *               refund_amount_eur, commission_eur, payment_method, type
     */
    private function calculateEligibility(Order $order): array
    {
        $status = $order->getAttributes()['status'] ?? $order->status;

        // Caso: ordine gia' annullato o rimborsato
        if (in_array($status, ['cancelled', 'refunded'])) {
            return [
                'eligible' => false,
                'reason' => 'L\'ordine e\' gia\' stato annullato o rimborsato.',
                'refund_amount_cents' => 0,
                'commission_cents' => 0,
                'refund_amount_eur' => '0,00',
                'commission_eur' => '0,00',
                'payment_method' => $order->payment_method,
                'type' => 'already_cancelled',
            ];
        }

        // Caso: ordini pending o payment_failed (non ancora pagati) -> annullamento senza rimborso
        if (in_array($status, [Order::PENDING, Order::PAYMENT_FAILED])) {
            return [
                'eligible' => true,
                'reason' => 'L\'ordine non e\' ancora stato pagato. Verra\' annullato senza rimborso.',
                'refund_amount_cents' => 0,
                'commission_cents' => 0,
                'refund_amount_eur' => '0,00',
                'commission_eur' => '0,00',
                'payment_method' => $order->payment_method,
                'type' => 'cancel_unpaid',
            ];
        }

        // Caso: ordini in_transit (gia' ritirati dal corriere) -> NON rimborsabili
        if ($status === Order::IN_TRANSIT) {
            return [
                'eligible' => false,
                'reason' => 'La spedizione e\' gia\' partita e in transito. Non e\' possibile richiedere il rimborso.',
                'refund_amount_cents' => 0,
                'commission_cents' => 0,
                'refund_amount_eur' => '0,00',
                'commission_eur' => '0,00',
                'payment_method' => $order->payment_method,
                'type' => 'in_transit',
            ];
        }

        // Caso: ordini completed o processing (pagati, etichetta generata ma non ancora ritirato)
        // Questi possono essere annullati con rimborso parziale (meno la commissione di 2 EUR)
        if (in_array($status, [Order::COMPLETED, Order::PROCESSING])) {
            $subtotalCents = (int) $order->subtotal->amount();
            $commissionCents = self::CANCELLATION_FEE_CENTS;

            // Se il subtotale e' inferiore alla commissione, il rimborso e' 0
            $refundAmountCents = max(0, $subtotalCents - $commissionCents);

            return [
                'eligible' => true,
                'reason' => 'L\'ordine puo\' essere annullato. Verra\' applicata una commissione di annullamento di '
                    .number_format($commissionCents / 100, 2, ',', '.').' EUR.',
                'refund_amount_cents' => $refundAmountCents,
                'commission_cents' => $commissionCents,
                'refund_amount_eur' => number_format($refundAmountCents / 100, 2, ',', '.'),
                'commission_eur' => number_format($commissionCents / 100, 2, ',', '.'),
                'payment_method' => $order->payment_method,
                'type' => 'refund_with_commission',
            ];
        }

        // Caso: ordini consegnati o in giacenza -> NON rimborsabili
        if (in_array($status, ['delivered', 'in_giacenza'])) {
            return [
                'eligible' => false,
                'reason' => 'L\'ordine e\' gia\' stato consegnato o e\' in giacenza. Non e\' possibile richiedere il rimborso.',
                'refund_amount_cents' => 0,
                'commission_cents' => 0,
                'refund_amount_eur' => '0,00',
                'commission_eur' => '0,00',
                'payment_method' => $order->payment_method,
                'type' => 'not_refundable',
            ];
        }

        // Caso default: stato non gestito
        return [
            'eligible' => false,
            'reason' => 'Non e\' possibile annullare questo ordine.',
            'refund_amount_cents' => 0,
            'commission_cents' => 0,
            'refund_amount_eur' => '0,00',
            'commission_eur' => '0,00',
            'payment_method' => $order->payment_method,
            'type' => 'unknown',
        ];
    }

    /**
     * Processa il rimborso via Stripe.
     * Usa l'API Refund di Stripe per fare un rimborso parziale (meno la commissione).
     *
     * @param  Order  $order  L'ordine da rimborsare
     * @param  int  $amountCents  L'importo da rimborsare in centesimi
     *
     * @throws \Exception se il rimborso Stripe fallisce
     */
    private function processStripeRefund(Order $order, int $amountCents): void
    {
        $secret = $this->getStripeSecret();
        if (! $secret) {
            throw new \Exception('Stripe non configurato. Impossibile processare il rimborso.');
        }

        $stripe = new StripeClient($secret);

        try {
            $refund = $stripe->refunds->create([
                'payment_intent' => $order->stripe_payment_intent_id,
                'amount' => $amountCents, // Rimborso parziale (importo meno commissione)
                'reason' => 'requested_by_customer',
                'metadata' => [
                    'order_id' => (string) $order->id,
                    'cancellation_fee_cents' => (string) self::CANCELLATION_FEE_CENTS,
                ],
            ]);

            Log::info('Stripe refund processed', [
                'order_id' => $order->id,
                'refund_id' => $refund->id,
                'amount' => $amountCents,
                'status' => $refund->status,
            ]);

            if ($refund->status === 'failed') {
                throw new \Exception('Rimborso Stripe fallito. Status: '.$refund->status);
            }
        } catch (ApiErrorException $e) {
            Log::error('Stripe refund API error', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
            throw new \Exception('Errore Stripe durante il rimborso: '.$e->getMessage());
        }
    }

    /**
     * Processa il rimborso via Portafoglio.
     * Crea un movimento di credito nel portafoglio dell'utente.
     *
     * @param  Order  $order  L'ordine da rimborsare
     * @param  int  $amountCents  L'importo da rimborsare in centesimi
     */
    private function processWalletRefund(Order $order, int $amountCents): void
    {
        $amountEur = round($amountCents / 100, 2);

        WalletMovement::create([
            'user_id' => $order->user_id,
            'type' => 'credit',                    // Credito = soldi che entrano nel portafoglio
            'amount' => $amountEur,                 // In euro (non centesimi)
            'currency' => 'EUR',
            'status' => 'confirmed',
            'idempotency_key' => 'refund_'.$order->id.'_'.Str::uuid(),
            'reference' => (string) $order->id,
            'description' => 'Rimborso ordine #SF-'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT),
            'source' => 'refund',
        ]);

        Log::info('Wallet refund processed', [
            'order_id' => $order->id,
            'user_id' => $order->user_id,
            'amount_eur' => $amountEur,
        ]);
    }
}
