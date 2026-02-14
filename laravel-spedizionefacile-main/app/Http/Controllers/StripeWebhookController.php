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

use Stripe\Webhook;

use App\Models\User;
use App\Models\Order;
use App\Models\Transaction;
use App\Events\OrderPaid;
use Illuminate\Http\Request;
use UnexpectedValueException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class StripeWebhookController extends Controller
{
    // Funzione principale che riceve e gestisce tutte le notifiche da Stripe
    public function handle(Request $request) {
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
    protected function verifySignature(Request $request) {
        $payload = $request->getContent();           // Il contenuto della notifica
        $sigHeader = $request->header('Stripe-Signature'); // La firma inviata da Stripe
        $secret = config('services.stripe.webhook_secret'); // La nostra chiave segreta per verificare

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
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            // La firma non corrisponde: qualcuno potrebbe star cercando di ingannarci
            abort(Response::HTTP_BAD_REQUEST, 'Invalid signature');
        }
    }


    // Gestisce l'evento "pagamento riuscito"
    // Quando un cliente paga con successo, aggiorniamo l'ordine e salviamo i dettagli della transazione
    protected function paymentSucceeded($event) {
        $intent = $event->data->object;

        // Recuperiamo l'identificativo dell'ordine dai dati aggiuntivi (metadata) del pagamento
        $orderId = $intent->metadata->order_id;

        // Cerchiamo l'ordine nel database
        $order = Order::where('id', $orderId)->first();

        // Se l'ordine non esiste, non facciamo nulla
        if (!$order) {
            return;
        }

        // Salviamo o aggiorniamo i dettagli della transazione nel database
        // "updateOrCreate" cerca una transazione con lo stesso identificativo esterno (ext_id)
        // Se la trova, la aggiorna; se non la trova, ne crea una nuova
        $transaction = Transaction::updateOrCreate([
            'ext_id' => $intent->id,
        ], [
            'order_id' => $order->id,
            'status'   => 'succeeded',
            'total'    => $intent->amount,
            'type'     => $intent->payment_method_types[0] ?? 'unknown',
            'provider_status' => $intent->status,
        ]);

        // Svuotiamo il carrello dell'utente perche' ha completato l'acquisto
        DB::table('cart_user')
            ->where('user_id', $order->user_id)
            ->delete();

        // Lanciamo l'evento OrderPaid per attivare i listener automatici
        // (es. generazione etichetta BRT, notifiche, ecc.)
        event(new OrderPaid($order, $transaction));
    }

    // Gestisce l'evento "pagamento fallito"
    // Quando un pagamento non va a buon fine, salviamo il motivo dell'errore
    protected function paymentFailed($event) {
        $intent = $event->data->object;

        $orderId = $intent->metadata->order_id;

        $order = Order::where('id', $orderId)->first();

        if (!$order) {
            return;
        }

        // Segniamo l'ordine come "pagamento fallito"
        $order->status = Order::PAYMENT_FAILED;
        $order->save();

        // Cerchiamo di capire perche' il pagamento e' fallito
        // Proviamo a recuperare il messaggio di errore da diverse fonti
        $failureMessage = $intent->last_payment_error?->message
                  ?? $intent->charges->data[0]->failure_message
                  ?? 'Payment failed';

        $failureCode = $intent->last_payment_error?->code
                  ?? $intent->charges->data[0]->failure_code
                  ?? null;

        // Salviamo i dettagli della transazione fallita, incluso il motivo dell'errore
        Transaction::updateOrCreate([
            'ext_id' => $intent->id,
        ], [
            'order_id' => $order->id,
            'status'   => 'failed',
            'total'    => $intent->amount,
            'type'     => $intent->payment_method_types[0] ?? 'unknown',
            'provider_status' => $intent->status,
            'failure_code'    => $failureCode,
            'failure_message' => $failureMessage
        ]);
    }

    // Gestisce l'evento "account Stripe aggiornato"
    // Quando un Partner Pro completa o modifica il suo profilo Stripe,
    // aggiorniamo le informazioni nel nostro database
    protected function accountUpdated($event) {
        $intent = $event->data->object;

        $stripeAccountId = $intent->id;

        // Cerchiamo l'utente che ha questo account Stripe
        $user = User::where('stripe_account_id', $stripeAccountId)->first();

        if (!$user) {
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

        if (!$stripeAccountId) {
            return;
        }

        $user = User::where('stripe_account_id', $stripeAccountId)->first();

        if (!$user) {
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
