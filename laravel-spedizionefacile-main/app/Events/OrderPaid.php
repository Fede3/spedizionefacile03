<?php
/**
 * FILE: OrderPaid.php
 * SCOPO: Evento emesso quando un ordine viene pagato con successo (evento piu' importante del flusso).
 *
 * COSA ENTRA:
 *   - Order $order (l'ordine pagato), $transaction (dati della transazione Stripe)
 *
 * COSA ESCE:
 *   - Proprieta' pubbliche $order e $transaction accessibili dai listener
 *
 * CHIAMATO DA:
 *   - StripeController.php — orderPaid() dopo conferma pagamento Stripe
 *   - StripeWebhookController.php — dopo ricezione webhook payment_intent.succeeded
 *
 * EFFETTI COLLATERALI:
 *   - Scatena i listener registrati in EventServiceProvider:
 *     - MarkOrderProcessing — cambia stato ordine a "processing"
 *     - GenerateBrtLabel — genera etichetta BRT e invia email (cambia stato a "in_transit")
 *
 * ERRORI TIPICI:
 *   - Nessuno (evento semplice, contiene solo dati)
 *
 * DOCUMENTI CORRELATI:
 *   - app/Listeners/MarkOrderProcessing.php — primo listener (stato processing)
 *   - app/Listeners/GenerateBrtLabel.php — secondo listener (etichetta BRT + email)
 *   - app/Providers/EventServiceProvider.php — ordine di esecuzione dei listener
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

class OrderPaid
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    // L'ordine che e' stato pagato
    public $order;
    // I dati della transazione di pagamento (importo, metodo, stato...)
    public $transaction;


    /**
     * Crea una nuova istanza dell'evento.
     * Riceve l'ordine pagato e la transazione di pagamento.
     */
    public function __construct(Order $order, $transaction)
    {
        $this->order = $order;
        $this->transaction = $transaction;
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
