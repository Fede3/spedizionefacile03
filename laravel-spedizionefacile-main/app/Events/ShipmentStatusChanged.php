<?php
/**
 * FILE: ShipmentStatusChanged.php
 * SCOPO: Evento emesso quando lo stato di una spedizione/ordine cambia.
 *
 * COSA ENTRA:
 *   - Order $order (l'ordine il cui stato e' cambiato)
 *   - string $oldStatus (stato precedente)
 *   - string $newStatus (nuovo stato)
 *
 * COSA ESCE:
 *   - Proprieta' pubbliche accessibili dai listener
 *
 * CHIAMATO DA:
 *   - AdminController.php — updateOrderStatus() dopo cambio stato manuale
 *   - BrtController.php — deleteShipment() quando resetta lo stato
 *
 * EFFETTI COLLATERALI:
 *   - Scatena i listener registrati in EventServiceProvider:
 *     - SendShipmentStatusEmail — invia notifica email all'utente
 *
 * DOCUMENTI CORRELATI:
 *   - app/Listeners/SendShipmentStatusEmail.php — invia email di notifica
 *   - app/Mail/ShipmentStatusUpdateMail.php — template Mailable
 *   - app/Providers/EventServiceProvider.php — registrazione evento-listener
 */

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Queue\SerializesModels;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Broadcasting\InteractsWithSockets;

class ShipmentStatusChanged
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    // L'ordine il cui stato e' cambiato
    public $order;
    // Lo stato precedente (es. "processing")
    public $oldStatus;
    // Il nuovo stato (es. "in_transit")
    public $newStatus;

    /**
     * Crea una nuova istanza dell'evento.
     * Riceve l'ordine, lo stato vecchio e quello nuovo.
     */
    public function __construct(Order $order, string $oldStatus, string $newStatus)
    {
        $this->order = $order;
        $this->oldStatus = $oldStatus;
        $this->newStatus = $newStatus;
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
