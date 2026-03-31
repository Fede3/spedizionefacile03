<?php
/**
 * FILE: ProRequest.php
 * SCOPO: Modello richiesta per diventare Partner Pro (con dati azienda e stato approvazione).
 *
 * DOVE SI USA:
 *   - ProRequestController.php — store, status, index (admin), approve, reject
 *   - AdminController.php — dashboard (conteggio richieste pending)
 *
 * DATI IN INGRESSO:
 *   - user_id, company_name, vat_number, message, status, reviewed_at
 *   Esempio: ProRequest::create(['user_id' => 1, 'company_name' => 'Srl', 'status' => 'pending'])
 *
 * DATI IN USCITA:
 *   - Relazione: user (l'utente che ha fatto la richiesta)
 *   Esempio: $request->user->name — nome dell'utente che ha fatto la richiesta
 *
 * VINCOLI:
 *   - status: "pending" (in attesa), "approved" (approvata), "rejected" (rifiutata)
 *   - L'approvazione cambia il ruolo utente in "Partner Pro" (nel controller, non nel modello)
 *   - Un utente puo' avere piu' richieste (se la prima viene rifiutata puo' riprovare)
 *
 * ERRORI TIPICI:
 *   - Cambiare status nel modello senza aggiornare il ruolo utente: usare il controller
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere campi azienda: aggiungere in $fillable e nella migrazione
 *   - La logica di approvazione/rifiuto e' nel ProRequestController, non qui
 *
 * COLLEGAMENTI:
 *   - app/Http/Controllers/ProRequestController.php — controller con logica approvazione/rifiuto
 *   - app/Models/User.php — ruolo aggiornato a "Partner Pro" dopo approvazione
 */

namespace App\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
