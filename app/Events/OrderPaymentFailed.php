<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

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
