<?php
/**
 * FILE: Transaction.php
 * SCOPO: Modello transazione di pagamento (tentativo di pagamento per un ordine via Stripe).
 *
 * COSA ENTRA:
 *   - order_id, total (centesimi), ext_id (Stripe PaymentIntent ID), type (card/bank_transfer)
 *   - status (succeeded/failed), provider_status, failure_code, failure_message
 *
 * COSA ESCE:
 *   - Accessor: total convertito in oggetto MyMoney per formattazione
 *   - Metodo: getPaymentMethod($type) traduce tipo in italiano (card -> "Carta")
 *
 * CHIAMATO DA:
 *   - StripeController.php — creazione transazione dopo pagamento
 *   - StripeWebhookController.php — aggiornamento stato da webhook
 *   - AdminController.php — statistiche fatturato (somma total dove status=succeeded)
 *
 * EFFETTI COLLATERALI:
 *   - Nessuno (modello semplice senza boot/observer)
 *
 * ERRORI TIPICI:
 *   - total e' in centesimi (1250 = 12.50 EUR), non in euro
 *   - Un ordine puo' avere piu' transazioni (es. tentativo fallito + tentativo riuscito)
 *
 * DOCUMENTI CORRELATI:
 *   - app/Models/Order.php — relazione transactions (un ordine ha molte transazioni)
 *   - app/Cart/MyMoney.php — formattazione prezzi centesimi -> euro
 */

namespace App\Models;

use App\Cart\MyMoney;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    /**
     * Campi compilabili dall'esterno.
     */
    protected $fillable = [
        'order_id',         // ID dell'ordine a cui si riferisce questo pagamento
        'total',            // Importo totale del pagamento (in centesimi)
        'ext_id',           // ID esterno del pagamento su Stripe (per rintracciarlo)
        'type',             // Metodo di pagamento usato (card, bank_transfer, paypal)
        'status',           // Stato della transazione (es. "succeeded", "failed")
        'provider_status',  // Stato dettagliato dal provider di pagamento (Stripe)
        'failure_code',     // Codice errore se il pagamento e' fallito
        'failure_message'   // Messaggio di errore leggibile se il pagamento e' fallito
    ];

    /**
     * Traduce il tipo di metodo di pagamento in italiano.
     * Usato per mostrare all'utente "Carta" invece di "card".
     */
    public function getPaymentMethod($type) {
        $methods = [
            'card' => 'Carta',
            'bank_transfer' => 'Bonifico',
            'paypal' => 'PayPal',
        ];

        return $methods[$type] ?? $type;
    }

    /**
     * Quando leggi il totale della transazione, viene automaticamente
     * convertito in un oggetto MyMoney per gestire la formattazione
     * dei prezzi (es. da centesimi a "12,50 EUR").
     */
    public function getTotalAttribute($total) {
        return new MyMoney($total);
    }
}
