<?php
/**
 * FILE: CartEmpty.php
 * SCOPO: Listener che svuota il carrello dell'utente dopo la creazione di un ordine.
 *
 * DOVE SI USA:
 *   - EventServiceProvider — registrato come listener di OrderCreated
 *   - Scatenato quando OrderController o StripeController creano un nuovo ordine
 *
 * DATI IN INGRESSO:
 *   - OrderCreated event (contiene l'ordine appena creato)
 *   Esempio: event(new OrderCreated($order)) → CartEmpty.handle() viene chiamato
 *
 * DATI IN USCITA:
 *   - Nessun ritorno (void)
 *
 * VINCOLI:
 *   - Dipende dalla classe Cart (iniettata nel costruttore)
 *   - Deve essere registrato in EventServiceProvider per funzionare
 *
 * ERRORI TIPICI:
 *   - Se Cart non svuota correttamente: l'utente vedra' ancora i pacchi nel carrello
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere logica post-svuotamento: dopo $this->cart->empty()
 *   - Per svuotare solo certi pacchi: sostituire empty() con logica selettiva
 *
 * COLLEGAMENTI:
 *   - app/Events/OrderCreated.php — evento che scatena questo listener
 *   - app/Cart/Cart.php — classe carrello con metodo empty()
 *   - app/Http/Controllers/OrderController.php — scatena OrderCreated
 */

namespace App\Listeners;

use App\Cart\Cart;
use App\Events\OrderCreated;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;

class CartEmpty
{
    // Il carrello dell'utente (viene iniettato automaticamente da Laravel)
    protected $cart;

    /**
     * Il costruttore riceve il carrello come parametro.
     * Laravel lo fornisce automaticamente grazie al sistema di "dependency injection".
     */
    public function __construct(Cart $cart)
    {
        $this->cart = $cart;
    }

    /**
     * Gestisce l'evento: svuota il carrello dell'utente.
     * Viene chiamato automaticamente quando l'evento OrderCreated viene lanciato.
     */
    public function handle(OrderCreated $event): void
    {
        $this->cart->empty();
    }
}
