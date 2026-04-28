<?php
/**
 * FILE: WalletMovement.php
 * SCOPO: Modello movimento del portafoglio virtuale (credit=entrata, debit=uscita).
 *
 * DOVE SI USA:
 *   - WalletController.php — topUp (credit da Stripe), payWithWallet (debit per spedizione)
 *   - ReferralController.php — apply (credit commissione al Partner Pro, source=commission)
 *   - Admin/WalletManagementController.php — approveWithdrawal (debit per prelievo approvato, source=withdrawal)
 *   - User::walletBalance() — somma credit - debit dove status=confirmed
 *
 * DATI IN INGRESSO:
 *   - user_id, type (credit/debit), amount (euro con 2 decimali), currency (EUR)
 *   - status (confirmed/pending), idempotency_key, reference, description, source
 *   Esempio: WalletMovement::create(['user_id' => 1, 'type' => 'credit', 'amount' => 10.00, 'source' => 'stripe'])
 *
 * DATI IN USCITA:
 *   - Relazione: user (proprietario del portafoglio)
 *   Esempio: $movement->user->name — nome del proprietario
 *
 * VINCOLI:
 *   - amount e' in EURO (non centesimi), a differenza di Transaction.total e Package.single_price
 *   - idempotency_key previene duplicati (es. "topup_123_uuid", "commission_456")
 *   - source indica l'origine: "stripe", "wallet", "commission", "withdrawal", "admin"
 *   - Solo movimenti con status='confirmed' vengono contati nel saldo
 *
 * ERRORI TIPICI:
 *   - Passare amount in centesimi: qui si usa euro (10.00, non 1000)
 *   - Dimenticare idempotency_key: rischio di movimenti duplicati
 *   - Creare movement senza status='confirmed': non apparira' nel saldo
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere una nuova fonte (source): usare una stringa descrittiva
 *   - Per cambiare il calcolo saldo: modificare User::walletBalance()
 *
 * COLLEGAMENTI:
 *   - app/Models/User.php — walletBalance() e commissionBalance() calcolano saldi
 *   - app/Http/Controllers/WalletController.php — controller portafoglio
 *   - app/Http/Controllers/Admin/WalletManagementController.php — gestione admin portafogli e prelievi
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WalletMovement extends Model
{
    use HasFactory;

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

    /**
     * Campi nascosti nelle risposte JSON.
     * La chiave di idempotenza e' un dato interno del server e non deve
     * essere esposta al frontend.
     */
    protected $hidden = [
        'idempotency_key',
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
