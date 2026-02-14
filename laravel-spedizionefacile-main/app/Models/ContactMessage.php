<?php
/**
 * FILE: ContactMessage.php
 * SCOPO: Modello messaggio del modulo "Contattaci" con stato di lettura admin.
 *
 * COSA ENTRA:
 *   - name, surname, email, telephone_number, address, message, read_at
 *
 * COSA ESCE:
 *   - Record nella tabella contact_messages
 *
 * CHIAMATO DA:
 *   - ContactController.php — store (creazione), index (lista admin), markAsRead
 *   - AdminController.php — dashboard (conteggio messaggi non letti: whereNull read_at)
 *
 * EFFETTI COLLATERALI:
 *   - Nessuno (modello semplice senza boot/observer)
 *
 * ERRORI TIPICI:
 *   - read_at=null significa messaggio non letto (usato per conteggio notifiche admin)
 *
 * DOCUMENTI CORRELATI:
 *   - ContactController.php — controller CRUD messaggi
 *   - AdminController.php — dashboard con conteggio non letti
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContactMessage extends Model
{
    /**
     * Campi compilabili dall'esterno.
     */
    protected $fillable = [
        'name',              // Nome di chi scrive
        'surname',           // Cognome di chi scrive
        'email',             // Email di chi scrive (per poter rispondere)
        'telephone_number',  // Telefono di chi scrive
        'address',           // Indirizzo di chi scrive
        'message',           // Il testo del messaggio
        'read_at',           // Data e ora in cui un admin ha letto il messaggio
    ];

    // Converte automaticamente la data di lettura in un oggetto data
    protected $casts = [
        'read_at' => 'datetime',
    ];
}
