<?php
/**
 * FILE: Transaction.php
 * SCOPO: Modello transazione di pagamento (tentativo di pagamento per un ordine via Stripe).
 *
 * DOVE SI USA:
 *   - StripeController.php — creazione transazione dopo pagamento
 *   - StripeWebhookController.php — aggiornamento stato da webhook
 *   - AdminController.php — statistiche fatturato (somma total dove status=succeeded)
 *
 * DATI IN INGRESSO:
 *   - order_id, total (centesimi), ext_id (Stripe PaymentIntent ID), type (card/bank_transfer)
 *   - status (succeeded/failed), provider_status, failure_code, failure_message
 *   Esempio: Transaction::create(['order_id' => 1, 'total' => 890, 'type' => 'card', 'status' => 'succeeded'])
 *
 * DATI IN USCITA:
 *   - Accessor: total convertito in oggetto MyMoney per formattazione
 *   - Metodo: getPaymentMethod($type) traduce tipo in italiano (card -> "Carta")
 *   Esempio: $transaction->total->formatted(), $transaction->getPaymentMethod('card') => "Carta"
 *
 * VINCOLI:
 *   - total e' in centesimi (890 = 8,90 EUR), non in euro
 *   - Un ordine puo' avere piu' transazioni (es. tentativo fallito + tentativo riuscito)
 *   - ext_id e' il PaymentIntent ID di Stripe (per rintracciare il pagamento)
 *
 * ERRORI TIPICI:
 *   - Passare total in euro: causa importi 100x piu' bassi del dovuto
 *   - Sommare total come numeri: e' un oggetto MyMoney dopo l'accessor, usare sum('total') in query
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere metodo di pagamento: aggiungere in getPaymentMethod()
 *   - Per aggiungere provider: aggiungere campo e aggiornare status/failure handling
 *
 * COLLEGAMENTI:
 *   - app/Models/Order.php — relazione transactions (un ordine ha molte transazioni)
 *   - app/Cart/MyMoney.php — formattazione prezzi centesimi -> euro
 *   - app/Http/Controllers/StripeController.php — creazione e gestione transazioni
 */

namespace App\Models;

use App\Cart\MyMoney;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    use HasFactory;

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
    public function getPaymentMethod(string $type): string {
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
    public function getTotalAttribute($total): MyMoney {
        return new MyMoney($total);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
