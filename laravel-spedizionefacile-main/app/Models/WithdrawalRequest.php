<?php
/**
 * FILE: WithdrawalRequest.php
 * SCOPO: Modello richiesta di prelievo commissioni Partner Pro (con approvazione admin).
 *
 * DOVE SI USA:
 *   - WithdrawalController.php — index (lista), store (creazione con status pending)
 *   - AdminController.php — withdrawals, approveWithdrawal, rejectWithdrawal
 *   - User::commissionBalance() — somma amount dove status in (approved, completed)
 *
 * DATI IN INGRESSO:
 *   - user_id, amount (euro), currency (EUR), status, admin_notes, reviewed_at, reviewed_by
 *   Esempio: WithdrawalRequest::create(['user_id' => 1, 'amount' => 50.00, 'status' => 'pending'])
 *
 * DATI IN USCITA:
 *   - Relazioni: user (Partner Pro richiedente), reviewer (admin che ha revisionato)
 *   Esempio: $withdrawal->user->name, $withdrawal->reviewer->name
 *
 * VINCOLI:
 *   - status: "pending", "approved", "rejected", "completed"
 *   - amount in euro con 2 decimali (cast decimal:2), NON in centesimi
 *   - Solo una richiesta pending alla volta per utente (controllato dal controller)
 *   - L'approvazione crea un debit in wallet_movements (fatto dal controller admin)
 *
 * ERRORI TIPICI:
 *   - Approvare senza creare il debit nel portafoglio: il saldo non si aggiorna
 *   - Passare amount in centesimi: qui si usa euro
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere metodo di prelievo (IBAN, PayPal): aggiungere campo in $fillable
 *   - La logica di approvazione/rifiuto e' in AdminController, non qui
 *
 * COLLEGAMENTI:
 *   - app/Http/Controllers/WithdrawalController.php — creazione richiesta lato utente
 *   - app/Http/Controllers/AdminController.php — approvazione/rifiuto lato admin
 *   - app/Models/User.php — commissionBalance() sottrae i prelievi approvati
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Relazione: la richiesta e' stata revisionata da UN admin
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
