<?php
/**
 * FILE: ReferralUsage.php
 * SCOPO: Modello utilizzo codice referral (registra sconto acquirente e commissione Partner Pro).
 *
 * DOVE SI USA:
 *   - ReferralController.php — apply() crea il record e accredita la commissione
 *   - User::commissionBalance() — somma commission_amount per calcolo saldo prelevabile
 *   - Admin/ReferralStatsController.php — referralStats() per statistiche admin
 *
 * DATI IN INGRESSO:
 *   - buyer_id, pro_user_id, referral_code, order_id
 *   - order_amount, discount_amount (5%), commission_amount (5%), status
 *   Esempio: ReferralUsage::create(['buyer_id' => 2, 'pro_user_id' => 1, 'commission_amount' => 0.50])
 *
 * DATI IN USCITA:
 *   - Relazioni: buyer (acquirente), proUser (Partner Pro), order
 *   Esempio: $usage->proUser->name — nome del Partner Pro che guadagna la commissione
 *
 * VINCOLI:
 *   - Importi in euro con 2 decimali (cast decimal:2), NON in centesimi
 *   - status: "confirmed" (confermato) o "pending" (in attesa)
 *   - Un ordine puo' avere al massimo un utilizzo referral
 *
 * ERRORI TIPICI:
 *   - Passare importi in centesimi: questo modello usa euro (diverso da Order.subtotal)
 *   - Dimenticare di filtrare per status='confirmed' nel calcolo commissioni
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per cambiare le percentuali sconto/commissione: modificare ReferralController.apply()
 *   - Per aggiungere uno stato: aggiornare le query in commissionBalance()
 *
 * COLLEGAMENTI:
 *   - app/Http/Controllers/ReferralController.php — logica di applicazione e calcolo commissioni
 *   - app/Models/WalletMovement.php — la commissione diventa un credit nel portafoglio Pro
 *   - app/Models/User.php — commissionBalance() usa questa tabella
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReferralUsage extends Model
{
    /**
     * Campi compilabili dall'esterno.
     */
    protected $fillable = [
        'buyer_id',           // ID dell'acquirente che ha usato il codice
        'pro_user_id',        // ID del Partner Pro proprietario del codice
        'referral_code',      // Il codice referral utilizzato (es. "ABC123")
        'order_id',           // ID dell'ordine in cui e' stato usato
        'order_amount',       // Importo totale dell'ordine
        'discount_amount',    // Sconto applicato all'acquirente
        'commission_amount',  // Commissione guadagnata dal Partner Pro
        'status',             // Stato: "confirmed" (confermato) o "pending" (in attesa)
    ];

    // Converte automaticamente gli importi in numeri con 2 decimali
    protected $casts = [
        'order_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'commission_amount' => 'decimal:2',
    ];

    // Relazione: questo utilizzo e' stato fatto da UN acquirente
    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    // Relazione: questo utilizzo riguarda il codice di UN Partner Pro
    public function proUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pro_user_id');
    }

    // Relazione: questo utilizzo e' collegato a UN ordine specifico
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
