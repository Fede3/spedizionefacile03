<?php

/**
 * FILE: StripeWebhookController.php
 * SCOPO: Riceve e gestisce le notifiche automatiche (webhook) inviate da Stripe.
 *
 * COSA ENTRA:
 *   - Request HTTP POST da Stripe con header Stripe-Signature e payload JSON
 *   - Eventi gestiti: payment_intent.succeeded, payment_intent.payment_failed,
 *     account.updated, account.application.deauthorized
 *
 * COSA ESCE:
 *   - JSON {received: true} per confermare la ricezione a Stripe
 *
 * CHIAMATO DA:
 *   - routes/web.php — POST /stripe/webhook (endpoint pubblico, senza CSRF)
 *   - Stripe invia le notifiche a questo URL quando avvengono eventi di pagamento
 *
 * EFFETTI COLLATERALI:
 *   - Database: aggiorna stato ordini (completed/payment_failed), crea/aggiorna transazioni
 *   - Database: aggiorna dati Stripe Connect dell'utente (charges_enabled, capabilities)
 *   - Database: svuota il carrello dell'utente dopo pagamento riuscito
 *   - Eventi: lancia OrderPaid per attivare GenerateBrtLabel e MarkOrderProcessing
 *
 * ERRORI TIPICI:
 *   - 400: payload non valido o firma Stripe non corrispondente (tentativo di falsificazione)
 *   - Ordine non trovato nel database (il webhook viene ignorato silenziosamente)
 *
 * DOCUMENTI CORRELATI:
 *   - StripeController.php — gestione pagamenti lato utente
 *   - config/services.php — webhook_secret per la verifica della firma
 */

namespace App\Http\Controllers;

use App\Events\OrderPaid;
use App\Models\Order;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;
use Symfony\Component\HttpFoundation\Response;
use UnexpectedValueException;

class StripeWebhookController extends Controller
{
    private function decodeSnapshotMetadata(mixed $value): ?array
    {
        if (is_array($value)) {
            return $value;
        }

        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : null;
    }

    private function clearCartForOrder(Order $order): void
    {
        $packageIds = $order->packages()->pluck('packages.id')->filter()->values();

        if ($packageIds->isEmpty()) {
            return;
        }

        DB::table('cart_user')
            ->where('user_id', $order->user_id)
            ->whereIn('package_id', $packageIds->all())
            ->delete();
    }

    private function syncSubmissionContextFromIntent(Order $order, object $intent): bool
    {
        $metadata = is_object($intent->metadata ?? null)
            ? (array) $intent->metadata
            : (array) ($intent->metadata ?? []);

        $updates = [];

        foreach (['client_submission_id', 'pricing_signature'] as $field) {
            $incoming = $metadata[$field] ?? null;
            $current = $order->getAttribute($field);

            if (! filled($incoming)) {
                continue;
            }

            if (filled($current) && (string) $current !== (string) $incoming) {
                Log::warning('Ignoring Stripe webhook with mismatched submission metadata', [
                    'order_id' => $order->id,
                    'field' => $field,
                    'order_value' => $current,
                    'intent_value' => $incoming,
                ]);

                return false;
            }

            if (! filled($current)) {
                $updates[$field] = (string) $incoming;
            }
        }

        $incomingVersion = $metadata['pricing_snapshot_version'] ?? null;
        $currentVersion = $order->getAttribute('pricing_snapshot_version');
        if (filled($incomingVersion)) {
            if (filled($currentVersion) && (int) $currentVersion !== (int) $incomingVersion) {
                Log::warning('Ignoring Stripe webhook with mismatched snapshot version', [
                    'order_id' => $order->id,
                    'order_value' => $currentVersion,
                    'intent_value' => $incomingVersion,
                ]);

                return false;
            }

            if (! filled($currentVersion)) {
                $updates['pricing_snapshot_version'] = (int) $incomingVersion;
            }
        }

        $incomingSnapshot = $this->decodeSnapshotMetadata($metadata['quote_snapshot'] ?? null);
        $currentSnapshot = $order->getAttribute('pricing_snapshot');
        if (is_array($incomingSnapshot) && ! empty($incomingSnapshot)) {
            if (filled($currentSnapshot) && $currentSnapshot !== $incomingSnapshot) {
                Log::warning('Ignoring Stripe webhook with mismatched pricing snapshot', [
                    'order_id' => $order->id,
                ]);

                return false;
            }

            if (empty($currentSnapshot)) {
                $updates['pricing_snapshot'] = $incomingSnapshot;
            }
        }

        if (! empty($updates)) {
            $order->forceFill($updates)->save();
        }

        return true;
    }

    protected function getWebhookSecret(): ?string
    {
        $secret = trim((string) (
            Setting::get('stripe_webhook_secret')
            ?: config('services.stripe.webhook_secret')
        ));

        return $secret !== '' ? $secret : null;
    }

    // Funzione principale che riceve e gestisce tutte le notifiche da Stripe
    public function handle(Request $request)
    {
        // Prima di tutto, verifichiamo che la notifica venga davvero da Stripe
        // (per sicurezza, per evitare che qualcuno finga di essere Stripe)
        $event = $this->verifySignature($request);

        // In base al tipo di evento, chiamiamo la funzione giusta
        // "match" e' come un selettore: sceglie cosa fare in base al tipo di notifica
        match ($event->type) {
            'payment_intent.succeeded' => $this->paymentSucceeded($event),     // Pagamento riuscito
            'payment_intent.payment_failed' => $this->paymentFailed($event),   // Pagamento fallito

            'account.updated' => $this->accountUpdated($event),                // Account Stripe aggiornato
            'account.application.deauthorized' => $this->accountDisconnected($event), // Account scollegato

            default => null, // Per tutti gli altri eventi, non facciamo nulla
        };

        // Rispondiamo a Stripe per confermare che abbiamo ricevuto la notifica
        return response()->json(['received' => true]);
    }

    // Verifica che la notifica venga davvero da Stripe controllando la "firma" digitale
    // Se la firma non e' valida, blocchiamo tutto con un errore
    protected function verifySignature(Request $request)
    {
        $payload = $request->getContent();           // Il contenuto della notifica
        $sigHeader = $request->header('Stripe-Signature'); // La firma inviata da Stripe
        $secret = $this->getWebhookSecret(); // La nostra chiave segreta per verificare

        if (! $secret) {
            abort(Response::HTTP_SERVICE_UNAVAILABLE, 'Stripe webhook non configurato');
        }

        try {
            // Stripe verifica che il contenuto corrisponda alla firma
            return Webhook::constructEvent(
                $payload,
                $sigHeader,
                $secret
            );
        } catch (UnexpectedValueException $e) {
            // Il contenuto della notifica non e' valido
            abort(Response::HTTP_BAD_REQUEST, 'Invalid payload');
        } catch (SignatureVerificationException $e) {
            // La firma non corrisponde: qualcuno potrebbe star cercando di ingannarci
            abort(Response::HTTP_BAD_REQUEST, 'Invalid signature');
        }
    }

    // Gestisce l'evento "pagamento riuscito"
    // Quando un cliente paga con successo, aggiorniamo l'ordine e salviamo i dettagli della transazione
    protected function paymentSucceeded($event)
    {
        $intent = $event->data->object;

        // Recuperiamo l'identificativo dell'ordine dai dati aggiuntivi (metadata) del pagamento
        $orderId = (int) ($intent->metadata->order_id ?? 0);

        if ($orderId <= 0) {
            return;
        }

        // Cerchiamo l'ordine nel database
        $order = Order::where('id', $orderId)->first();

        // Se l'ordine non esiste, non facciamo nulla
        if (! $order) {
            return;
        }

        $transaction = null;
        $dispatchOrderPaid = false;
        $shouldClearCart = false;

        DB::transaction(function () use ($order, $intent, &$transaction, &$dispatchOrderPaid, &$shouldClearCart) {
            $lockedOrder = Order::query()->lockForUpdate()->find($order->id);

            if (! $lockedOrder) {
                return;
            }

            if (! $this->syncSubmissionContextFromIntent($lockedOrder, $intent)) {
                return;
            }

            if ((int) $intent->amount !== (int) $lockedOrder->subtotal->amount()) {
                $intentAmount = (int) $intent->amount;
                $orderAmount = (int) $lockedOrder->subtotal->amount();
                $mismatchPercent = $orderAmount > 0
                    ? abs($intentAmount - $orderAmount) / $orderAmount * 100
                    : 100;

                Log::critical('Stripe webhook amount mismatch detected', [
                    'order_id' => $lockedOrder->id,
                    'payment_intent_id' => $intent->id,
                    'intent_amount' => $intentAmount,
                    'order_amount' => $orderAmount,
                    'mismatch_percent' => round($mismatchPercent, 2),
                ]);

                // Se la differenza supera l'1%, segna l'ordine come anomalia di pagamento
                if ($mismatchPercent > 1) {
                    $lockedOrder->status = 'payment_anomaly';
                    $lockedOrder->save();
                }

                return;
            }

            if ($lockedOrder->hasSuccessfulTransactionForExternalId($intent->id)) {
                if ($lockedOrder->isAwaitingPayment()) {
                    $lockedOrder->status = Order::COMPLETED;
                }

                $lockedOrder->payment_method = 'stripe';
                $lockedOrder->stripe_payment_intent_id = $intent->id;
                $lockedOrder->save();

                $transaction = $lockedOrder->transactions()
                    ->where('ext_id', $intent->id)
                    ->where('status', 'succeeded')
                    ->latest('id')
                    ->first();
                $shouldClearCart = true;

                return;
            }

            if (! $lockedOrder->isAwaitingPayment()
                && $lockedOrder->stripe_payment_intent_id !== $intent->id) {
                Log::warning('Ignoring unexpected Stripe success for non-payable order', [
                    'order_id' => $lockedOrder->id,
                    'payment_intent_id' => $intent->id,
                    'current_payment_intent_id' => $lockedOrder->stripe_payment_intent_id,
                    'status' => $lockedOrder->rawStatus(),
                ]);

                return;
            }

            if ($lockedOrder->isAwaitingPayment()) {
                $lockedOrder->status = Order::COMPLETED;
            }

            $lockedOrder->payment_method = 'stripe';
            $lockedOrder->stripe_payment_intent_id = $intent->id;
            $lockedOrder->save();

            $existingTransaction = $lockedOrder->transactions()
                ->where('ext_id', $intent->id)
                ->first();
            $wasAlreadySucceeded = $existingTransaction?->status === 'succeeded';

            $transaction = Transaction::updateOrCreate([
                'ext_id' => $intent->id,
            ], [
                'order_id' => $lockedOrder->id,
                'status' => 'succeeded',
                'total' => $intent->amount,
                'type' => $intent->payment_method_types[0] ?? 'unknown',
                'provider_status' => $intent->status,
            ]);

            $dispatchOrderPaid = ! $wasAlreadySucceeded;
            $shouldClearCart = true;
        });

        if ($shouldClearCart) {
            $this->clearCartForOrder($order);
        }

        if ($dispatchOrderPaid && $transaction) {
            event(new OrderPaid($order->fresh(), $transaction));
        }
    }

    // Gestisce l'evento "pagamento fallito"
    // Quando un pagamento non va a buon fine, salviamo il motivo dell'errore
    protected function paymentFailed($event)
    {
        $intent = $event->data->object;

        $orderId = (int) ($intent->metadata->order_id ?? 0);

        if ($orderId <= 0) {
            return;
        }

        $order = Order::where('id', $orderId)->first();

        if (! $order) {
            return;
        }

        // Cerchiamo di capire perche' il pagamento e' fallito
        // Proviamo a recuperare il messaggio di errore da diverse fonti
        $failureMessage = $intent->last_payment_error->message
                  ?? $intent->charges->data[0]->failure_message
                  ?? 'Payment failed';

        $failureCode = $intent->last_payment_error->code
                  ?? $intent->charges->data[0]->failure_code
                  ?? null;

        DB::transaction(function () use ($order, $intent, $failureCode, $failureMessage) {
            $lockedOrder = Order::query()->lockForUpdate()->find($order->id);

            if (! $lockedOrder) {
                return;
            }

            if ($lockedOrder->isAwaitingPayment() || $lockedOrder->stripe_payment_intent_id === $intent->id) {
                $lockedOrder->status = Order::PAYMENT_FAILED;
                $lockedOrder->payment_method = 'stripe';
                $lockedOrder->stripe_payment_intent_id = $intent->id;
                $lockedOrder->save();
            } else {
                Log::warning('Ignoring Stripe failed intent for non-payable order', [
                    'order_id' => $lockedOrder->id,
                    'payment_intent_id' => $intent->id,
                    'current_payment_intent_id' => $lockedOrder->stripe_payment_intent_id,
                    'status' => $lockedOrder->rawStatus(),
                ]);
            }

            // Salviamo i dettagli della transazione fallita, incluso il motivo dell'errore
            Transaction::updateOrCreate([
                'ext_id' => $intent->id,
            ], [
                'order_id' => $lockedOrder->id,
                'status' => 'failed',
                'total' => $intent->amount,
                'type' => $intent->payment_method_types[0] ?? 'unknown',
                'provider_status' => $intent->status,
                'failure_code' => $failureCode,
                'failure_message' => $failureMessage,
            ]);
        });
    }

    // Gestisce l'evento "account Stripe aggiornato"
    // Quando un Partner Pro completa o modifica il suo profilo Stripe,
    // aggiorniamo le informazioni nel nostro database
    protected function accountUpdated($event)
    {
        $intent = $event->data->object;

        $stripeAccountId = $intent->id;

        // Cerchiamo l'utente che ha questo account Stripe
        $user = User::where('stripe_account_id', $stripeAccountId)->first();

        if (! $user) {
            return;
        }

        // Aggiorniamo le informazioni sulle capacita' dell'account Stripe
        // (es. se puo' ricevere pagamenti, se puo' fare prelievi, ecc.)
        $user->stripe_charges_enabled = $intent->charges_enabled;
        $user->stripe_payouts_enabled = $intent->payouts_enabled;
        $user->stripe_capabilities = json_encode($intent->capabilities);
        $user->stripe_requirements = json_encode($intent->requirements);
        $user->stripe_details_submitted = $intent->details_submitted;

        $user->save();
    }

    // Gestisce l'evento "account Stripe disconnesso"
    // Quando un utente scollega il suo account Stripe, rimuoviamo tutti i dati di collegamento
    protected function accountDisconnected($event)
    {
        $account = $event->data->object;
        $stripeAccountId = $account->id ?? null;

        if (! $stripeAccountId) {
            return;
        }

        $user = User::where('stripe_account_id', $stripeAccountId)->first();

        if (! $user) {
            return;
        }

        // Resettiamo tutti i campi legati a Stripe, come se l'utente non avesse mai collegato il suo account
        $user->stripe_account_id = null;
        $user->stripe_charges_enabled = false;
        $user->stripe_payouts_enabled = false;
        $user->stripe_details_submitted = false;
        $user->stripe_capabilities = null;
        $user->stripe_requirements = null;
        $user->save();

        // Registriamo nei log che l'account e' stato disconnesso (utile per debug)
        Log::info('Stripe account disconnected', ['user_id' => $user->id, 'account_id' => $stripeAccountId]);
    }
}
