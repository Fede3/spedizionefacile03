<?php
/**
 * FILE: Service.php
 * SCOPO: Modello servizio di spedizione (tipo servizio, data e orario di ritiro).
 *
 * DOVE SI USA:
 *   - CartController.php / SavedShipmentController.php — creazione servizio con il pacco
 *   - BrtService.php — lettura tipo servizio per scegliere il codice servizio BRT
 *
 * DATI IN INGRESSO:
 *   - service_type (es. "standard", "express", "Nessuno"), time, date
 *   - service_data (JSON opzionale, es. importo contrassegno)
 *   Esempio: Service::create(['service_type' => 'standard', 'date' => '2026-02-20'])
 *
 * DATI IN USCITA:
 *   - Relazione: packages (tutti i pacchi che usano questo servizio)
 *   Esempio: $service->packages->count() — quanti pacchi usano questo servizio
 *
 * VINCOLI:
 *   - service_type puo' essere stringa vuota: i controller lo forzano a "Nessuno" se vuoto
 *   - service_data e' JSON (cast array): usato per dati extra come importo contrassegno
 *   - BrtService mappa service_type ai codici servizio BRT (es. "express" → "E")
 *
 * ERRORI TIPICI:
 *   - Passare service_data come stringa JSON invece che array: il cast gestisce la conversione
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere un nuovo tipo servizio: aggiungere mapping in BrtService.addServicesToPayload()
 *   - Per aggiungere campi: aggiungere in $fillable e nella migrazione
 *
 * COLLEGAMENTI:
 *   - app/Models/Package.php — relazione service (ogni pacco ha un servizio)
 *   - app/Services/BrtService.php — mappa service_type ai codici BRT
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
