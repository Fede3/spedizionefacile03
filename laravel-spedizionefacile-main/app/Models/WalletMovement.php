<?php
/**
 * FILE: WalletMovement.php
 * SCOPO: Modello movimento del portafoglio virtuale (credit=entrata, debit=uscita).
 *
 * COSA ENTRA:
 *   - user_id, type (credit/debit), amount (euro con 2 decimali), currency (EUR)
 *   - status (confirmed/pending), idempotency_key, reference, description, source
 *
 * COSA ESCE:
 *   - Relazione: user (proprietario del portafoglio)
 *
 * CHIAMATO DA:
 *   - WalletController.php — topUp (credit da Stripe), payWithWallet (debit per spedizione)
 *   - ReferralController.php — apply (credit commissione al Partner Pro, source=commission)
 *   - AdminController.php — approveWithdrawal (debit per prelievo approvato, source=withdrawal)
 *
 * EFFETTI COLLATERALI:
 *   - User::walletBalance() somma credit - debit dove status=confirmed
 *   - idempotency_key previene duplicati (es. "topup_123_uuid", "commission_456")
 *
 * ERRORI TIPICI:
 *   - amount e' in euro (non centesimi), a differenza di Transaction.total e Package.single_price
 *   - source indica l'origine: "stripe" (ricarica), "wallet" (pagamento), "commission", "withdrawal"
 *
 * DOCUMENTI CORRELATI:
 *   - app/Models/User.php — walletBalance() e commissionBalance() calcolano saldi
 *   - WalletController.php — controller portafoglio
 *   - AdminController.php — gestione admin portafogli e prelievi
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalletMovement extends Model
{
    /**
     * Campi compilabili dall'esterno.
     */
    protected $fillable = [
        'user_id',          // ID dell'utente proprietario del portafoglio
        'type',             // Tipo: "credit" (entrata/ricarica) o "debit" (uscita/pagamento)
        'amount',           // Importo del movimento (es. 10.50)
        'currency',         // Valuta (es. "EUR")
        'status',           // Stato: "confirmed" (confermato) o "pending" (in attesa)
        'idempotency_key',  // Chiave univoca per evitare movimenti duplicati
        'reference',        // Riferimento (es. ID dell'ordine pagato)
        'description',      // Descrizione leggibile del movimento (es. "Ricarica portafoglio")
        'source',           // Fonte del movimento (es. "stripe", "referral", "admin")
    ];

    // Converte automaticamente l'importo in un numero con 2 decimali
    protected $casts = [
        'amount' => 'decimal:2',
    ];

    // Relazione: ogni movimento appartiene a UN utente
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
