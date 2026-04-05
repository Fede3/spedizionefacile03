<?php

/**
 * FILE: Order.php
 * SCOPO: Modello ordine di spedizione con stati, dati BRT, relazioni utente/pacchi/transazioni.
 *
 * DOVE SI USA:
 *   - OrderController.php — creazione ordini e gestione ciclo vita
 *   - StripeController.php — pagamento e transizione stato
 *   - BrtController.php — aggiornamento campi brt_* dopo creazione spedizione
 *   - AdminController.php — dashboard, lista ordini, cambio stato
 *   - GenerateBrtLabel.php — listener che aggiorna i dati BRT dopo pagamento
 *
 * DATI IN INGRESSO:
 *   - status, user_id, subtotal (centesimi), campi brt_* per spedizione, is_cod, cod_amount
 *   Esempio: Order::create(['user_id' => 1, 'subtotal' => 890, 'status' => 'pending'])
 *
 * DATI IN USCITA:
 *   - Relazioni: user, transactions, packages (many-to-many via package_order)
 *   - Accessor: subtotal convertito in oggetto MyMoney per formattazione
 *   - Metodo: getStatus($status) traduce stato in italiano
 *   Esempio: $order->user->name, $order->packages->count(), $order->getStatus('pending') => "In attesa"
 *
 * VINCOLI:
 *   - subtotal e' in centesimi (890 = 8,90 EUR), non in euro
 *   - brt_label_base64 e' un campo molto grande (PDF codificato), escluderlo dalle query per performance
 *   - Lo stato iniziale e' sempre "pending" (impostato nel boot)
 *   - Flusso stati: pending → processing → label_generated → in_transit → out_for_delivery → delivered
 *   - Stati collaterali: returned, refused, in_giacenza, cancelled, refunded
 *   - in_transit: NON rimborsabile (spedizione gia' partita)
 *
 * ERRORI TIPICI:
 *   - Passare subtotal in euro invece che centesimi: 8.90 invece di 890
 *   - Caricare brt_label_base64 nelle liste: usare select() per escluderlo
 *   - Confusione tra brt_parcel_id (dall'etichetta) e brt_tracking_number (dal routing)
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere un nuovo stato: aggiungere costante e traduzione in getStatus()
 *   - Per aggiungere campi BRT: aggiungere in $fillable (prefisso brt_)
 *   - Per cambiare lo stato iniziale: modificare il boot creating
 *
 * COLLEGAMENTI:
 *   - app/Models/Transaction.php — transazioni di pagamento collegate all'ordine
 *   - app/Models/Package.php — pacchi contenuti nell'ordine (pivot package_order)
 *   - app/Events/OrderPaid.php — evento scatenato dopo pagamento riuscito
 *   - app/Listeners/GenerateBrtLabel.php — genera etichetta BRT in risposta a OrderPaid
 *   - app/Http/Controllers/RefundController.php — gestione rimborsi ordini
 */

namespace App\Models;

use App\Cart\MyMoney;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

/**
 * @property-read User|null $user
 * @property-read Collection<int, Package> $packages
 * @property-read Collection<int, Transaction> $transactions
 */
class Order extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Campi compilabili dall'esterno.
     * Sono i dati che possono essere inseriti o modificati quando si crea/aggiorna un ordine.
     */
    protected $fillable = [
        'status',                        // Stato dell'ordine (vedi costanti sotto)
        'user_id',                       // ID dell'utente che ha fatto l'ordine
        'subtotal',                      // Totale dell'ordine in centesimi
        'client_submission_id',          // ID submission del client per retry/idempotenza
        'pricing_signature',             // Firma del preventivo accettato
        'pricing_snapshot_version',      // Versione dello snapshot prezzi
        'pricing_snapshot',              // Snapshot prezzi/servizi accettato
        'brt_parcel_id',                 // ID del pacco nel sistema BRT (corriere)
        'brt_numeric_sender_reference',  // Riferimento numerico del mittente per BRT
        'brt_tracking_url',              // Link per seguire la spedizione sul sito BRT
        'brt_pudo_id',                   // ID del punto di ritiro/consegna BRT (se scelto)
        'is_cod',                        // Se true, il pagamento e' in contrassegno (paga il destinatario)
        'cod_amount',                    // Importo da incassare in contrassegno
        'cod_payment_type',              // Tipo pagamento contrassegno BRT: BM, CC, AS
        'brt_error',                     // Eventuale errore nella generazione etichetta BRT
        'brt_tracking_number',           // Numero di tracking BRT (parcelNumberFrom)
        'brt_parcel_number_to',          // Ultimo numero collo (parcelNumberTo) per multi-collo
        'brt_departure_depot',           // Codice deposito BRT di partenza
        'brt_arrival_terminal',          // Codice terminale BRT di arrivo
        'brt_arrival_depot',             // Codice deposito BRT di arrivo
        'brt_delivery_zone',             // Zona di consegna BRT
        'brt_series_number',             // Numero di serie BRT
        'brt_service_type',              // Tipo di servizio BRT (codice API)
        'brt_all_labels',                // JSON etichette individuali per multi-collo
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
        'billing_data',                  // Snapshot dati di fatturazione scelti al checkout
        'brt_last_tracking_check',       // Ultima volta che il tracking è stato sincronizzato
    ];

    // Converte automaticamente i campi nei tipi corretti
    protected $casts = [
        'subtotal' => 'integer',             // Centesimi: 890 = 8,90 EUR
        'is_cod' => 'boolean',
        'cod_amount' => 'integer',           // Centesimi contrassegno
        'refund_amount' => 'integer',        // Centesimi rimborsati
        'cancellation_fee' => 'integer',     // Commissione annullamento in centesimi
        'pricing_snapshot' => 'array',
        'pricing_snapshot_version' => 'integer',
        'brt_all_labels' => 'array',         // Etichette individuali multi-collo (JSON)
        'brt_raw_response' => 'array',       // Converte JSON in array PHP automaticamente
        'billing_data' => 'array',
        'refunded_at' => 'datetime',
        'pickup_requested_at' => 'datetime',
        'documents_sent_customer_at' => 'datetime',
        'documents_sent_admin_at' => 'datetime',
        'brt_last_tracking_check' => 'datetime',
    ];

    protected $hidden = [
        'brt_label_base64',
        'brt_raw_response',
        'bordero_document_base64',
    ];

    // Questi sono gli stati possibili di un ordine:
    const PENDING = 'pending';                // In attesa - l'utente non ha ancora pagato

    const PROCESSING = 'processing';          // In lavorazione - il pagamento e' stato ricevuto

    const PAYMENT_FAILED = 'payment_failed';  // Pagamento fallito - qualcosa e' andato storto col pagamento

    const IN_TRANSIT = 'in_transit';          // In transito - pacco ritirato dal corriere, spedizione in corso

    const COMPLETED = 'completed';            // Completato - la spedizione e' stata conclusa

    const DELIVERED = 'delivered';            // Consegnato - il pacco e' stato consegnato

    const IN_GIACENZA = 'in_giacenza';        // In giacenza - il pacco e' in giacenza presso il corriere

    const LABEL_GENERATED = 'label_generated'; // Etichetta generata - etichetta BRT creata ma pacco non ancora ritirato

    const OUT_FOR_DELIVERY = 'out_for_delivery'; // In consegna - pacco in consegna ultimo miglio

    const RETURNED = 'returned';              // Reso - pacco restituito al mittente

    const REFUSED = 'refused';                // Rifiutato - pacco rifiutato dal destinatario

    const CANCELLED = 'cancelled';            // Annullato - l'ordine e' stato annullato dall'utente

    const REFUNDED = 'refunded';              // Rimborsato - il rimborso e' stato completato

    /**
     * Traduce lo stato dell'ordine dall'inglese all'italiano.
     * Viene usato per mostrare lo stato in modo comprensibile all'utente.
     */
    public function getStatus(string $status): string
    {
        $data = [
            'pending' => 'In attesa',
            'processing' => 'In lavorazione',
            'completed' => 'Completato',
            'payment_failed' => 'Fallito',
            'payed' => 'Pagato',
            'cancelled' => 'Annullato',
            'refunded' => 'Rimborsato',
            'label_generated' => 'Etichetta generata',
            'in_transit' => 'In transito',
            'out_for_delivery' => 'In consegna',
            'delivered' => 'Consegnato',
            'in_giacenza' => 'In giacenza',
            'returned' => 'Reso',
            'refused' => 'Rifiutato',
        ];

        return $data[$status] ?? $status;
    }

    public function rawStatus(): string
    {
        return (string) $this->getRawOriginal('status');
    }

    public function isAwaitingPayment(): bool
    {
        return in_array($this->rawStatus(), [
            self::PENDING,
            self::PAYMENT_FAILED,
        ], true);
    }

    public function isPostPaymentState(): bool
    {
        return in_array($this->rawStatus(), [
            self::PROCESSING,
            self::COMPLETED,
            self::LABEL_GENERATED,
            self::IN_TRANSIT,
            self::OUT_FOR_DELIVERY,
            self::DELIVERED,
            self::IN_GIACENZA,
            self::RETURNED,
            self::REFUSED,
            self::REFUNDED,
        ], true);
    }

    public function hasSuccessfulTransactionForExternalId(?string $externalId): bool
    {
        if (! filled($externalId)) {
            return false;
        }

        return $this->transactions()
            ->where('ext_id', $externalId)
            ->where('status', 'succeeded')
            ->exists();
    }

    /**
     * Azione automatica: quando viene creato un nuovo ordine,
     * il suo stato iniziale e' sempre "pending" (in attesa di pagamento).
     */
    protected static function booted()
    {
        static::creating(function ($order) {
            if (empty($order->status)) {
                $order->status = self::PENDING;
            }
        });
    }

    /* ===== SCOPES — Query predefinite per stati comuni ===== */

    public function scopePending($query)
    {
        return $query->where('status', self::PENDING);
    }

    public function scopeProcessing($query)
    {
        return $query->where('status', self::PROCESSING);
    }

    public function scopeInTransit($query)
    {
        return $query->where('status', self::IN_TRANSIT);
    }

    public function scopeDelivered($query)
    {
        return $query->where('status', self::DELIVERED);
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', self::CANCELLED);
    }

    public function scopeRefunded($query)
    {
        return $query->where('status', self::REFUNDED);
    }

    public function scopeAwaitingPayment($query)
    {
        return $query->whereIn('status', [self::PENDING, self::PAYMENT_FAILED]);
    }

    public function scopeActive($query)
    {
        return $query->whereIn('status', [
            self::PROCESSING, self::LABEL_GENERATED, self::IN_TRANSIT,
            self::OUT_FOR_DELIVERY, self::IN_GIACENZA,
        ]);
    }

    /**
     * Quando leggi il subtotale dell'ordine, viene automaticamente
     * convertito in un oggetto MyMoney che gestisce la formattazione
     * dei prezzi (es. da centesimi a euro con virgola).
     */
    public function getSubtotalAttribute($subtotal)
    {
        return new MyMoney($subtotal);
    }

    // Relazione: ogni ordine appartiene a UN utente
    // Cioe' ogni ordine e' stato fatto da una persona specifica
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Relazione: un ordine ha MOLTE transazioni di pagamento
    // Esempio: un tentativo fallito e poi uno riuscito
    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    // Relazione: un ordine contiene MOLTI pacchi
    // La relazione passa per la tabella "package_order" (tabella ponte)
    // che collega ordini e pacchi (relazione molti-a-molti)
    public function packages(): BelongsToMany
    {
        return $this->belongsToMany(Package::class, 'package_order')
            ->withPivot('quantity');
    }

    /**
     * Collega un pacco all'ordine tramite la tabella pivot package_order.
     */
    public static function attachPackage(int $orderId, int $packageId, int $quantity = 1): void
    {
        DB::table('package_order')->updateOrInsert(
            [
                'order_id' => $orderId,
                'package_id' => $packageId,
            ],
            [
                'quantity' => $quantity,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );
    }
}
