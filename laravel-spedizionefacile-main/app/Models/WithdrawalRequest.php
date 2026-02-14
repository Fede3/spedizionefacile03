<?php
/**
 * FILE: WithdrawalRequest.php
 * SCOPO: Modello richiesta di prelievo commissioni Partner Pro (con approvazione admin).
 *
 * COSA ENTRA:
 *   - user_id, amount (euro), currency (EUR), status, admin_notes, reviewed_at, reviewed_by
 *
 * COSA ESCE:
 *   - Relazioni: user (Partner Pro richiedente), reviewer (admin che ha revisionato)
 *
 * CHIAMATO DA:
 *   - WithdrawalController.php — index (lista), store (creazione con status pending)
 *   - AdminController.php — withdrawals, approveWithdrawal, rejectWithdrawal
 *   - User::commissionBalance() — somma amount dove status in (approved, completed)
 *
 * EFFETTI COLLATERALI:
 *   - Nessuno (modello semplice, il debit nel portafoglio e' creato dal controller admin)
 *
 * ERRORI TIPICI:
 *   - status: "pending", "approved", "rejected", "completed"
 *   - amount in euro con 2 decimali (cast decimal:2)
 *   - Solo una richiesta pending alla volta per utente (controllato dal controller)
 *
 * DOCUMENTI CORRELATI:
 *   - WithdrawalController.php — creazione richiesta lato utente
 *   - AdminController.php — approvazione/rifiuto lato admin (crea debit in wallet_movements)
 *   - app/Models/User.php — commissionBalance() sottrae i prelievi approvati
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WithdrawalRequest extends Model
{
    /**
     * Campi compilabili dall'esterno.
     */
    protected $fillable = [
        'user_id',       // ID dell'utente Pro che richiede il prelievo
        'amount',        // Importo richiesto (es. 50.00)
        'currency',      // Valuta (es. "EUR")
        'status',        // Stato: "pending", "approved", "rejected", "completed"
        'admin_notes',   // Note dell'amministratore (es. motivo del rifiuto)
        'reviewed_at',   // Data e ora della revisione da parte dell'admin
        'reviewed_by',   // ID dell'admin che ha revisionato la richiesta
    ];

    // Conversioni automatiche dei tipi
    protected $casts = [
        'amount' => 'decimal:2',      // Importo con 2 decimali
        'reviewed_at' => 'datetime',   // Data di revisione come oggetto data
    ];

    // Relazione: la richiesta appartiene a UN utente (il Partner Pro)
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Relazione: la richiesta e' stata revisionata da UN admin
    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
