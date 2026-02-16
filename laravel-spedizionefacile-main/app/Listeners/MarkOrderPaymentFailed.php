<?php
/**
 * FILE: MarkOrderPaymentFailed.php
 * SCOPO: Listener che segna l'ordine come "pagamento fallito" quando il pagamento non va a buon fine.
 *
 * DOVE SI USA:
 *   - EventServiceProvider — registrato come listener di OrderPaymentFailed
 *   - Scatenato da StripeWebhookController quando Stripe notifica un pagamento fallito
 *
 * DATI IN INGRESSO:
 *   - OrderPaymentFailed event con order (l'ordine il cui pagamento e' fallito)
 *   Esempio: event(new OrderPaymentFailed($order)) → MarkOrderPaymentFailed.handle()
 *
 * DATI IN USCITA:
 *   - Nessun ritorno (void), aggiorna order.status a "payment_failed" nel database
 *
 * VINCOLI:
 *   - L'ordine deve esistere e avere uno status precedente (tipicamente "pending")
 *
 * ERRORI TIPICI:
 *   - Nessuno (operazione semplice di aggiornamento)
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere notifica all'utente: aggiungere dopo l'update()
 *   - Per aggiungere logging: aggiungere Log::info dopo l'update()
 *
 * COLLEGAMENTI:
 *   - app/Events/OrderPaymentFailed.php — evento che scatena questo listener
 *   - app/Http/Controllers/StripeWebhookController.php — scatena l'evento da webhook Stripe
 *   - app/Models/Order.php — costante PAYMENT_FAILED
 */

namespace App\Listeners;

use App\Models\Order;
use App\Events\OrderPaymentFailed;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;

class MarkOrderPaymentFailed
{
    public function __construct()
    {
        //
    }

    /**
     * Gestisce l'evento: aggiorna lo stato dell'ordine a "payment_failed".
     * L'ordine viene preso direttamente dall'evento ricevuto.
     */
    public function handle(OrderPaymentFailed $event): void
    {
        $event->order->update([
            'status' => Order::PAYMENT_FAILED
        ]);
    }
}
