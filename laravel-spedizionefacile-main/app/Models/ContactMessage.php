<?php
/**
 * FILE: ContactMessage.php
 * SCOPO: Modello messaggio del modulo "Contattaci" con stato di lettura admin.
 *
 * DOVE SI USA:
 *   - ContactController.php — store (creazione), index (lista admin), markAsRead
 *   - AdminController.php — dashboard (conteggio messaggi non letti: whereNull read_at)
 *
 * DATI IN INGRESSO:
 *   - name, surname, email, telephone_number, address, message, read_at
 *   Esempio: ContactMessage::create(['name' => 'Mario', 'email' => 'mario@test.it', 'message' => 'Info'])
 *
 * DATI IN USCITA:
 *   - Record nella tabella contact_messages
 *   - read_at=null indica messaggio non letto
 *
 * VINCOLI:
 *   - read_at gestisce lo stato letto/non letto: null = non letto, datetime = letto
 *   - Non ha relazione con User (i messaggi possono arrivare da utenti non registrati)
 *
 * ERRORI TIPICI:
 *   - Usare where('read_at', false) invece di whereNull('read_at') per conteggio non letti
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere campi (es. subject): aggiungere in $fillable e nella migrazione
 *
 * COLLEGAMENTI:
 *   - app/Http/Controllers/ContactController.php — controller CRUD messaggi
 *   - app/Http/Controllers/AdminController.php — dashboard con conteggio non letti
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
