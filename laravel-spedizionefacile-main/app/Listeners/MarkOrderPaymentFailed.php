<?php
/**
 * FILE: MarkOrderPaymentFailed.php
 * SCOPO: Listener che segna l'ordine come "pagamento fallito" quando il pagamento non va a buon fine.
 *
 * COSA ENTRA:
 *   - OrderPaymentFailed event con order
 *
 * COSA ESCE:
 *   - Nessun ritorno (void), aggiorna status ordine nel database
 *
 * CHIAMATO DA:
 *   - EventServiceProvider — registrato come listener di OrderPaymentFailed
 *
 * EFFETTI COLLATERALI:
 *   - Database: aggiorna order.status a "payment_failed"
 *
 * ERRORI TIPICI:
 *   - Nessuno (operazione semplice di aggiornamento)
 *
 * DOCUMENTI CORRELATI:
 *   - app/Events/OrderPaymentFailed.php — evento che scatena questo listener
 *   - StripeWebhookController.php — scatena OrderPaymentFailed da webhook Stripe
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
