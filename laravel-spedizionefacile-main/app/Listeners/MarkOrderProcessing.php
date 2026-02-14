<?php
/**
 * FILE: MarkOrderProcessing.php
 * SCOPO: Listener che segna l'ordine come "in lavorazione" dopo il pagamento riuscito.
 *
 * COSA ENTRA:
 *   - OrderPaid event con order
 *
 * COSA ESCE:
 *   - Nessun ritorno (void), aggiorna status ordine nel database
 *
 * CHIAMATO DA:
 *   - EventServiceProvider — registrato come listener di OrderPaid
 *
 * EFFETTI COLLATERALI:
 *   - Database: aggiorna order.status da "pending" a "processing"
 *   - Nota: GenerateBrtLabel (altro listener OrderPaid) poi lo cambia in "in_transit"
 *
 * ERRORI TIPICI:
 *   - Nessuno (operazione semplice di aggiornamento)
 *
 * DOCUMENTI CORRELATI:
 *   - app/Events/OrderPaid.php — evento che scatena questo listener
 *   - app/Listeners/GenerateBrtLabel.php — successivo listener che genera etichetta BRT
 *   - app/Models/Order.php — costanti di stato (PROCESSING, IN_TRANSIT, ecc.)
 */

namespace App\Listeners;

use App\Models\Order;
use App\Events\OrderPaid;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;

class MarkOrderProcessing
{
    public function __construct()
    {
        //
    }

    /**
     * Gestisce l'evento: aggiorna lo stato dell'ordine a "processing" (in lavorazione).
     */
    public function handle(OrderPaid $event): void
    {
        $event->order->update([
            'status' => Order::PROCESSING
        ]);
    }
}
