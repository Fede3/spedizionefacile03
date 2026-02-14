<?php
/**
 * FILE: Service.php
 * SCOPO: Modello servizio di spedizione (tipo servizio, data e orario di ritiro).
 *
 * COSA ENTRA:
 *   - service_type (es. "standard", "express", "Nessuno"), time, date
 *
 * COSA ESCE:
 *   - Relazione: packages (tutti i pacchi che usano questo servizio)
 *
 * CHIAMATO DA:
 *   - CartController.php / SavedShipmentController.php — creazione servizio con il pacco
 *   - BrtService.php — lettura tipo servizio per scegliere il codice servizio BRT
 *
 * EFFETTI COLLATERALI:
 *   - Nessuno (modello semplice senza boot/observer)
 *
 * ERRORI TIPICI:
 *   - service_type puo' essere stringa vuota: i controller lo forzano a "Nessuno" se vuoto
 *
 * DOCUMENTI CORRELATI:
 *   - app/Models/Package.php — relazione service (ogni pacco ha un servizio)
 *   - app/Http/Resources/ServiceResource.php — formattazione per risposta API
 */

namespace App\Models;

use App\Models\Package;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    /**
     * Campi compilabili dall'esterno.
     */
    protected $fillable = [
        'service_type',  // Tipo di servizio (es. "standard", "express", "economy")
        'time',          // Orario di ritiro scelto
        'date',          // Data di ritiro scelta
        'service_data',  // Dati aggiuntivi servizi (es. importo contrassegno) in formato JSON
    ];

    protected $casts = [
        'service_data' => 'array',
    ];

    // Relazione: un servizio e' usato da MOLTI pacchi
    public function packages() {
        return $this->hasMany(Package::class, 'service_id');
    }
}
