<?php
/**
 * FILE: Location.php
 * SCOPO: Modello localita' italiana (CAP, nome citta', sigla provincia) per autocompletamento indirizzi.
 *
 * COSA ENTRA:
 *   - postal_code (es. "20121"), place_name (es. "Milano"), province (es. "MI")
 *
 * COSA ESCE:
 *   - Record nella tabella locations (database precaricato con tutte le localita' italiane)
 *
 * CHIAMATO DA:
 *   - LocationController.php — search (LIKE per nome/CAP), byCap (match esatto CAP)
 *   - BrtService.php — potenziale uso per validazione indirizzi
 *
 * EFFETTI COLLATERALI:
 *   - Nessuno (tabella di sola lettura, precaricata con dati localita' italiane)
 *
 * ERRORI TIPICI:
 *   - Un CAP puo' corrispondere a piu' citta' (es. zone rurali con CAP condiviso)
 *
 * DOCUMENTI CORRELATI:
 *   - LocationController.php — controller ricerca localita'
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
        'province'      // Sigla della provincia (es. "MI")
    ];
}
