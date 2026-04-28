<?php
/**
 * FILE: OrderPaymentFailed.php
 * SCOPO: Evento emesso quando il pagamento di un ordine fallisce (carta rifiutata, fondi insufficienti).
 *
 * COSA ENTRA:
 *   - Order $order (l'ordine con pagamento fallito)
 *
 * COSA ESCE:
 *   - Proprieta' pubblica $order accessibile dai listener
 *
 * CHIAMATO DA:
 *   - StripeWebhookController.php — dopo ricezione webhook payment_intent.payment_failed
 *
 * EFFETTI COLLATERALI:
 *   - Scatena i listener registrati in EventServiceProvider:
 *     - MarkOrderPaymentFailed — cambia stato ordine a "payment_failed"
 *
 * ERRORI TIPICI:
 *   - Nessuno (evento semplice, contiene solo dati)
 *
 * DOCUMENTI CORRELATI:
 *   - app/Listeners/MarkOrderPaymentFailed.php — cambia stato a payment_failed
 *   - app/Providers/EventServiceProvider.php — registrazione evento-listener
 */

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Queue\SerializesModels;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class OrderPaymentFailed
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    // L'ordine il cui pagamento e' fallito
    public $order;

    /**
     * Crea una nuova istanza dell'evento.
     * Riceve l'ordine con il pagamento fallito.
     */
    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    /**
     * Canali su cui l'evento potrebbe essere trasmesso in tempo reale.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('channel-name'),
        ];
    }
}
