<?php
/**
 * FILE: OrderCreated.php
 * SCOPO: Evento emesso quando un nuovo ordine viene creato nel sistema.
 *
 * COSA ENTRA:
 *   - Order $order (l'ordine appena creato)
 *
 * COSA ESCE:
 *   - Proprieta' pubblica $order accessibile dai listener
 *
 * CHIAMATO DA:
 *   - OrderController.php — dopo creazione ordine (createOrder)
 *   - StripeController.php — dopo creazione ordine via pagamento Stripe
 *
 * EFFETTI COLLATERALI:
 *   - Scatena i listener registrati in EventServiceProvider:
 *     - CartEmpty — svuota il carrello dell'utente
 *
 * ERRORI TIPICI:
 *   - Nessuno (evento semplice, contiene solo dati)
 *
 * DOCUMENTI CORRELATI:
 *   - app/Listeners/CartEmpty.php — svuota carrello dopo creazione ordine
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

class OrderCreated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    // L'ordine appena creato - viene passato a tutti i listener
    public $order;

    /**
     * Crea una nuova istanza dell'evento.
     * Riceve l'ordine appena creato come parametro.
     */
    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    /**
     * Canali su cui l'evento potrebbe essere trasmesso in tempo reale.
     * (Attualmente non usato per broadcasting, ma predisposto per il futuro)
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('channel-name'),
        ];
    }
}
