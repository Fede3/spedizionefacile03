<?php
/**
 * FILE: ProRequest.php
 * SCOPO: Modello richiesta per diventare Partner Pro (con dati azienda e stato approvazione).
 *
 * COSA ENTRA:
 *   - user_id, company_name, vat_number, message, status, reviewed_at
 *
 * COSA ESCE:
 *   - Relazione: user (l'utente che ha fatto la richiesta)
 *
 * CHIAMATO DA:
 *   - ProRequestController.php — store, status, index (admin), approve, reject
 *   - AdminController.php — dashboard (conteggio richieste pending)
 *
 * EFFETTI COLLATERALI:
 *   - Nessuno (modello semplice, l'approvazione e' gestita dal controller)
 *
 * ERRORI TIPICI:
 *   - status: "pending" (in attesa), "approved" (approvata), "rejected" (rifiutata)
 *   - L'approvazione cambia il ruolo utente in "Partner Pro" (nel controller, non nel modello)
 *
 * DOCUMENTI CORRELATI:
 *   - ProRequestController.php — controller con logica di approvazione/rifiuto
 *   - app/Models/User.php — ruolo aggiornato a "Partner Pro" dopo approvazione
 */

namespace App\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProRequest extends Model
{
    use HasFactory;

    /**
     * Campi compilabili dall'esterno.
     */
    protected $fillable = [
        'user_id',       // ID dell'utente che fa la richiesta
        'company_name',  // Nome dell'azienda
        'vat_number',    // Partita IVA dell'azienda
        'message',       // Messaggio/motivazione dell'utente
        'status',        // Stato: "pending" (in attesa), "approved" (approvata), "rejected" (rifiutata)
        'reviewed_at',   // Data e ora della revisione da parte dell'admin
    ];

    // Converte automaticamente la data di revisione in un oggetto data
    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
        ];
    }

    // Relazione: la richiesta appartiene a UN utente
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
