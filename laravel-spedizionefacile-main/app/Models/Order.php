<?php
/**
 * FILE: Order.php
 * SCOPO: Modello ordine di spedizione con stati, dati BRT, relazioni utente/pacchi/transazioni.
 *
 * COSA ENTRA:
 *   - status, user_id, subtotal (centesimi), campi brt_* per spedizione, is_cod, cod_amount
 *
 * COSA ESCE:
 *   - Relazioni: user, transactions, packages (many-to-many via package_order)
 *   - Accessor: subtotal convertito in oggetto MyMoney per formattazione
 *   - Metodo: getStatus($status) traduce stato in italiano
 *
 * CHIAMATO DA:
 *   - OrderController.php — creazione ordini e gestione ciclo vita
 *   - StripeController.php — pagamento e transizione stato
 *   - BrtController.php — aggiornamento campi brt_* dopo creazione spedizione
 *   - AdminController.php — dashboard, lista ordini, cambio stato
 *
 * EFFETTI COLLATERALI:
 *   - Boot: stato iniziale "pending" se non specificato alla creazione
 *   - brt_raw_response: cast automatico JSON <-> array
 *
 * ERRORI TIPICI:
 *   - subtotal e' in centesimi (1000 = 10.00 EUR), non in euro
 *   - brt_label_base64 e' un campo molto grande (PDF codificato), escluderlo dalle query per performance
 *
 * DOCUMENTI CORRELATI:
 *   - app/Models/Transaction.php — transazioni di pagamento collegate all'ordine
 *   - app/Models/Package.php — pacchi contenuti nell'ordine (pivot package_order)
 *   - app/Events/OrderPaid.php — evento scatenato dopo pagamento riuscito
 *   - app/Listeners/GenerateBrtLabel.php — genera etichetta BRT in risposta a OrderPaid
 */

namespace App\Models;

use App\Models\User;
use App\Cart\MyMoney;
use App\Models\Package;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    /**
     * Campi compilabili dall'esterno.
     * Sono i dati che possono essere inseriti o modificati quando si crea/aggiorna un ordine.
     */
    protected $fillable = [
        'status',                        // Stato dell'ordine (vedi costanti sotto)
        'user_id',                       // ID dell'utente che ha fatto l'ordine
        'subtotal',                      // Totale dell'ordine in centesimi
        'brt_parcel_id',                 // ID del pacco nel sistema BRT (corriere)
        'brt_numeric_sender_reference',  // Riferimento numerico del mittente per BRT
        'brt_tracking_url',              // Link per seguire la spedizione sul sito BRT
        'brt_label_base64',              // Etichetta di spedizione BRT (file PDF codificato)
        'brt_pudo_id',                   // ID del punto di ritiro/consegna BRT (se scelto)
        'is_cod',                        // Se true, il pagamento e' in contrassegno (paga il destinatario)
        'cod_amount',                    // Importo da incassare in contrassegno
        'brt_error',                     // Eventuale errore nella generazione etichetta BRT
        'brt_tracking_number',           // Numero di tracking BRT (parcelNumberFrom)
        'brt_parcel_number_to',          // Ultimo numero collo (parcelNumberTo) per multi-collo
        'brt_departure_depot',           // Codice deposito BRT di partenza
        'brt_arrival_terminal',          // Codice terminale BRT di arrivo
        'brt_arrival_depot',             // Codice deposito BRT di arrivo
        'brt_delivery_zone',             // Zona di consegna BRT
        'brt_series_number',             // Numero di serie BRT
        'brt_service_type',              // Tipo di servizio BRT (codice API)
        'brt_raw_response',              // Risposta JSON completa da BRT (per debug)
        // Campi rimborso
        'refund_status',                 // Stato del rimborso (pending, completed, failed, none)
        'refund_amount',                 // Importo rimborsato in centesimi
        'refund_method',                 // Metodo di rimborso (stripe, wallet)
        'refund_reason',                 // Motivo del rimborso
        'refunded_at',                   // Data e ora del rimborso completato
        'cancellation_fee',              // Commissione di annullamento in centesimi (200 = 2 EUR)
        'payment_method',                // Metodo di pagamento originale (stripe, wallet, bonifico)
        'stripe_payment_intent_id',      // ID PaymentIntent Stripe per rimborsi
    ];

    // Converte automaticamente i campi nei tipi corretti
    protected $casts = [
        'is_cod' => 'boolean',
        'brt_raw_response' => 'array',  // Converte JSON in array PHP automaticamente
        'refunded_at' => 'datetime',
    ];

    // Questi sono gli stati possibili di un ordine:
    const PENDING = 'pending';                // In attesa - l'utente non ha ancora pagato
    const PROCESSING = 'processing';          // In lavorazione - il pagamento e' stato ricevuto
    const PAYMENT_FAILED = 'payment_failed';  // Pagamento fallito - qualcosa e' andato storto col pagamento
    const IN_TRANSIT = 'in_transit';          // In transito - etichetta BRT generata, spedizione in corso
    const COMPLETED = 'completed';            // Completato - la spedizione e' stata conclusa
    const CANCELLED = 'cancelled';            // Annullato - l'ordine e' stato annullato dall'utente
    const REFUNDED = 'refunded';              // Rimborsato - il rimborso e' stato completato

    /**
     * Traduce lo stato dell'ordine dall'inglese all'italiano.
     * Viene usato per mostrare lo stato in modo comprensibile all'utente.
     */
    public function getStatus($status) {
        $data = [
            'pending' => 'In attesa',
            'processing' => 'In lavorazione',
            'completed' => 'Completato',
            'payment_failed' => 'Fallito',
            'payed' => 'Pagato',
            'cancelled' => 'Annullato',
            'refunded' => 'Rimborsato',
            'in_transit' => 'In transito',
            'delivered' => 'Consegnato',
            'in_giacenza' => 'In giacenza',
        ];

        return $data[$status] ?? $status;
    }


    /**
     * Azione automatica: quando viene creato un nuovo ordine,
     * il suo stato iniziale e' sempre "pending" (in attesa di pagamento).
     */
    protected static function booted() {
        static::creating(function($order) {
            if (empty($order->status)) {
                $order->status = self::PENDING;
            }
        });
    }

    /**
     * Quando leggi il subtotale dell'ordine, viene automaticamente
     * convertito in un oggetto MyMoney che gestisce la formattazione
     * dei prezzi (es. da centesimi a euro con virgola).
     */
    public function getSubtotalAttribute($subtotal) {
        return new MyMoney($subtotal);
    }


    // Relazione: ogni ordine appartiene a UN utente
    // Cioe' ogni ordine e' stato fatto da una persona specifica
    public function user() {
        return $this->belongsTo(User::class);
    }

    /* public function address() {
        return $this->belongsTo(Address::class);
    } */

    /* public function shipping() {
        return $this->belongsTo(Shipping::class);
    } */

    // Relazione: un ordine ha MOLTE transazioni di pagamento
    // Esempio: un tentativo fallito e poi uno riuscito
    public function transactions() {
        return $this->hasMany(Transaction::class);
    }

    // Relazione: un ordine contiene MOLTI pacchi
    // La relazione passa per la tabella "package_order" (tabella ponte)
    // che collega ordini e pacchi (relazione molti-a-molti)
    public function packages() {
        return $this->belongsToMany(Package::class, 'package_order');
                    /* ->withPivot(['quantity'])
                    ->withTimestamps(); */
    }
}
