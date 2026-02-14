<?php
/**
 * FILE: Package.php
 * SCOPO: Modello pacco con dimensioni, peso, prezzo, indirizzi partenza/destinazione e servizio.
 *
 * COSA ENTRA:
 *   - package_type, quantity, weight, first_size/second_size/third_size (cm)
 *   - weight_price, volume_price, single_price (centesimi)
 *   - origin_address_id, destination_address_id, service_id, user_id
 *   - content_description (descrizione contenuto per BRT)
 *
 * COSA ESCE:
 *   - Relazioni: user, originAddress, destinationAddress, service
 *   - Trait HasPrice: formattazione automatica prezzi
 *
 * CHIAMATO DA:
 *   - CartController.php — CRUD pacchi nel carrello
 *   - SavedShipmentController.php — CRUD spedizioni configurate
 *   - OrderController.php — associazione pacchi agli ordini
 *   - BrtController.php/BrtService.php — lettura dati pacco per creazione spedizione BRT
 *
 * EFFETTI COLLATERALI:
 *   - single_price salvato in centesimi (900 = 9.00 EUR) per precisione
 *
 * ERRORI TIPICI:
 *   - Confusione centesimi/euro: single_price e' in centesimi, weight_price/volume_price in euro
 *
 * DOCUMENTI CORRELATI:
 *   - app/Models/PackageAddress.php — indirizzi partenza/destinazione
 *   - app/Models/Service.php — servizio di spedizione associato
 *   - app/Models/Traits/HasPrice.php — trait per formattazione prezzo
 */

namespace App\Models;

use App\Models\User;
use App\Models\Service;
use App\Models\PackageAddress;
use App\Models\Traits\HasPrice;
use Illuminate\Database\Eloquent\Model;
use App\Models\Collections\PackageCollection;

class Package extends Model
{
    // Usa il trait HasPrice per gestire automaticamente la formattazione del prezzo
    use HasPrice;

    /**
     * Campi compilabili dall'esterno.
     * Sono le informazioni del pacco che possono essere inserite o modificate.
     */
    protected $fillable = [
        'package_type',           // Tipo di pacco (es. "busta", "scatola", "pallet")
        'quantity',               // Quanti pacchi uguali a questo
        'weight',                 // Peso del pacco in kg
        'first_size',             // Prima dimensione (lunghezza) in cm
        'second_size',            // Seconda dimensione (larghezza) in cm
        'third_size',             // Terza dimensione (altezza) in cm
        'weight_price',           // Prezzo calcolato in base al peso
        'volume_price',           // Prezzo calcolato in base al volume (dimensioni)
        'single_price',           // Prezzo finale per singolo pacco
        'origin_address_id',      // ID dell'indirizzo di partenza
        'destination_address_id', // ID dell'indirizzo di destinazione
        'service_id',             // ID del servizio di spedizione scelto
        'user_id',                // ID dell'utente che spedisce
        'content_description',    // Descrizione del contenuto (es. "Elettronica")
    ];

    // Relazione: ogni pacco appartiene a UN utente
    public function user() {
        return $this->belongsTo(User::class);
    }

    // Relazione: ogni pacco ha UN indirizzo di partenza (da dove parte)
    public function originAddress() {
        return $this->hasOne(PackageAddress::class, 'id', 'origin_address_id');
    }

    // Relazione: ogni pacco ha UN indirizzo di destinazione (dove arriva)
    public function destinationAddress() {
        return $this->hasOne(PackageAddress::class, 'id', 'destination_address_id');
    }

    // Relazione: ogni pacco ha UN servizio di spedizione (tipo, data, orario)
    public function service() {
        return $this->hasOne(Service::class, 'id', 'service_id');
    }

    /* public function newCollection(array $models = []) {
        return new PackageCollection($models);
    } */

    /* public function originAddress() {
        return $this->belongsTo(Address::class, 'origin_address_id');
    }

    public function destinationAddress() {
        return $this->belongsTo(Address::class, 'destination_address_id');
    } */

    /* public function shipment() {
        return $this->belongsTo(Shipment::class);
    } */
}
