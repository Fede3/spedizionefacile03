<?php
/**
 * FILE: MarkOrderProcessing.php
 * SCOPO: Listener che segna l'ordine come "in lavorazione" dopo il pagamento riuscito.
 *
 * DOVE SI USA:
 *   - EventServiceProvider — registrato come listener di OrderPaid
 *   - Scatenato da StripeController quando il pagamento va a buon fine
 *
 * DATI IN INGRESSO:
 *   - OrderPaid event con order (l'ordine appena pagato)
 *   Esempio: event(new OrderPaid($order)) → MarkOrderProcessing.handle()
 *
 * DATI IN USCITA:
 *   - Nessun ritorno (void), aggiorna order.status da "pending" a "processing"
 *
 * VINCOLI:
 *   - Viene eseguito PRIMA di GenerateBrtLabel (che poi cambia lo stato in "in_transit")
 *   - Lo stato "processing" e' temporaneo: dura solo fino alla generazione dell'etichetta BRT
 *
 * ERRORI TIPICI:
 *   - Nessuno (operazione semplice di aggiornamento)
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere logica post-pagamento: aggiungere dopo l'update()
 *   - Per cambiare lo stato target: modificare Order::PROCESSING nel metodo handle()
 *
 * COLLEGAMENTI:
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
        $event->order->refresh();

        if (in_array($event->order->status, [Order::IN_TRANSIT, Order::LABEL_GENERATED], true)) {
            return;
        }

        $event->order->update([
            'status' => Order::PROCESSING
        ]);
    }
}
