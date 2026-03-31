<?php
/**
 * FILE: Location.php
 * SCOPO: Modello localita' italiana (CAP, nome citta', sigla provincia) per autocompletamento indirizzi.
 *
 * DOVE SI USA:
 *   - LocationController.php — search (LIKE per nome/CAP), byCap (match esatto CAP)
 *   - BrtService.php — resolveCityFromLocations() per normalizzazione indirizzi
 *
 * DATI IN INGRESSO:
 *   - postal_code (es. "20121"), place_name (es. "Milano"), province (es. "MI")
 *   Esempio: Location::where('postal_code', '20121')->first()
 *
 * DATI IN USCITA:
 *   - Record nella tabella locations (database precaricato con tutte le localita' italiane)
 *   Esempio: {postal_code: "20121", place_name: "Milano", province: "MI"}
 *
 * VINCOLI:
 *   - Tabella di sola lettura: i dati vengono importati da un dataset esterno
 *   - Un CAP puo' corrispondere a piu' citta' (es. zone rurali con CAP condiviso)
 *   - I dati devono corrispondere al sistema postale italiano per il routing BRT
 *
 * ERRORI TIPICI:
 *   - Cercare per place_name senza UPPER: i nomi nel DB possono avere capitalizzazione mista
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiornare i dati: sostituire i record con un nuovo dataset del sistema postale
 *   - Per aggiungere regione: aggiungere campo region in $fillable e nella migrazione
 *
 * COLLEGAMENTI:
 *   - app/Http/Controllers/LocationController.php — controller ricerca localita'
 *   - app/Services/BrtService.php — usa locations per normalizzare citta' per BRT
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    /**
     * Campi compilabili dall'esterno.
     */
    protected $fillable = [
        'postal_code',  // CAP della localita' (es. "20121")
        'place_name',   // Nome della citta'/localita' (es. "Milano")
        'province',     // Sigla della provincia (es. "MI")
        'country_code'  // Codice ISO del paese (es. "IT", "AT")
    ];
}
