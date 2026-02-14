<?php
/**
 * FILE: CartEmpty.php
 * SCOPO: Listener che svuota il carrello dell'utente dopo la creazione di un ordine.
 *
 * COSA ENTRA:
 *   - OrderCreated event (contiene l'ordine appena creato)
 *
 * COSA ESCE:
 *   - Nessun ritorno (void)
 *
 * CHIAMATO DA:
 *   - EventServiceProvider — registrato come listener di OrderCreated
 *
 * EFFETTI COLLATERALI:
 *   - Database: rimuove tutti i record dalla tabella cart_user per l'utente corrente
 *
 * ERRORI TIPICI:
 *   - Nessuno (operazione semplice di svuotamento)
 *
 * DOCUMENTI CORRELATI:
 *   - app/Events/OrderCreated.php — evento che scatena questo listener
 *   - app/Cart/Cart.php — classe carrello con metodo empty()
 *   - OrderController.php / StripeController.php — scatenano OrderCreated alla creazione ordine
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
