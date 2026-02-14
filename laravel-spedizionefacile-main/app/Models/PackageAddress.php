<?php
/**
 * FILE: PackageAddress.php
 * SCOPO: Modello indirizzo specifico di un pacco (partenza o destinazione della spedizione).
 *
 * COSA ENTRA:
 *   - name, address, address_number, city, postal_code, province, country
 *   - telephone_number, email, additional_information, intercom_code
 *
 * COSA ESCE:
 *   - Relazioni: packagesAsOrigin, packagesAsDestination
 *
 * CHIAMATO DA:
 *   - CartController.php / SavedShipmentController.php — creazione indirizzi con i pacchi
 *   - BrtService.php — lettura dati indirizzo per creazione spedizione BRT
 *     (city uppercase, postal_code 5 cifre, province 2 lettere per normalizzazione BRT)
 *
 * EFFETTI COLLATERALI:
 *   - Nessuno (modello semplice senza boot/observer)
 *
 * ERRORI TIPICI:
 *   - Differenza con UserAddress: PackageAddress e' legato al pacco, UserAddress alla rubrica utente
 *   - province deve essere sigla 2 lettere (es. "MI") per compatibilita' BRT
 *
 * DOCUMENTI CORRELATI:
 *   - app/Models/Package.php — relazione originAddress/destinationAddress
 *   - app/Models/UserAddress.php — rubrica indirizzi utente (diverso da indirizzi pacco)
 *   - app/Services/BrtService.php — normalizzazione indirizzi per API BRT
 */

namespace App\Models;

use App\Models\User;
use App\Models\Package;
use Illuminate\Database\Eloquent\Model;

class PackageAddress extends Model
{
    /**
     * Campi compilabili dall'esterno.
     * Tutti i dettagli necessari per identificare un indirizzo completo.
     */
    protected $fillable = [
        'type',                    // Tipo di indirizzo (es. "privato", "azienda")
        'name',                    // Nome completo del mittente/destinatario
        'additional_information',  // Informazioni aggiuntive (es. "secondo piano", "presso...")
        'address',                 // Via/piazza/corso
        'number_type',             // Tipo di numero civico (es. "civico", "km")
        'address_number',          // Numero civico
        'intercom_code',           // Codice citofono (utile per il corriere)
        'country',                 // Nazione (es. "Italia")
        'city',                    // Citta'
        'postal_code',             // CAP - Codice di Avviamento Postale
        'province',                // Sigla provincia (es. "MI", "RM", "NA")
        'telephone_number',        // Numero di telefono
        'email',                   // Indirizzo email
    ];

    // Relazione: questo indirizzo e' usato come PARTENZA da molti pacchi
    public function packagesAsOrigin() {
        return $this->hasMany(Package::class, 'origin_address_id');
    }

    // Relazione: questo indirizzo e' usato come DESTINAZIONE da molti pacchi
    public function packagesAsDestination() {
        return $this->hasMany(Package::class, 'destination_address_id');
    }
}
