<?php

/**
 * FILE: Package.php
 * SCOPO: Modello pacco con dimensioni, peso, prezzo, indirizzi partenza/destinazione e servizio.
 *
 * DOVE SI USA:
 *   - CartController.php — CRUD pacchi nel carrello
 *   - SavedShipmentController.php — CRUD spedizioni configurate
 *   - OrderController.php — associazione pacchi agli ordini
 *   - BrtController.php/BrtService.php — lettura dati pacco per creazione spedizione BRT
 *
 * DATI IN INGRESSO:
 *   - package_type, quantity, weight, first_size/second_size/third_size (cm)
 *   - weight_price, volume_price, single_price (centesimi)
 *   - origin_address_id, destination_address_id, service_id, user_id
 *   - content_description (descrizione contenuto per BRT)
 *   Esempio: Package::create(['package_type' => 'Pacco', 'weight' => '5', 'single_price' => 1190])
 *
 * DATI IN USCITA:
 *   - Relazioni: user, originAddress, destinationAddress, service
 *   - Trait HasPrice: formattazione automatica prezzi
 *   Esempio: $package->originAddress->city, $package->service->service_type
 *
 * VINCOLI:
 *   - single_price e' in centesimi (1190 = 11,90 EUR) per evitare errori di arrotondamento
 *   - weight_price e volume_price sono in euro (diverso da single_price!)
 *   - Le relazioni originAddress e destinationAddress usano hasOne (non belongsTo)
 *   - Tipi pacco validi: Pacco, Pallet, Valigia (Busta rimossa)
 *
 * ERRORI TIPICI:
 *   - Confusione centesimi/euro: single_price in centesimi, weight_price/volume_price in euro
 *   - Usare belongsTo per gli indirizzi: le relazioni sono hasOne (id -> origin_address_id)
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere un nuovo tipo pacco: aggiungere la validazione nel controller
 *   - Per aggiungere campi dimensione: aggiungere in $fillable (es. fourth_size)
 *
 * COLLEGAMENTI:
 *   - app/Models/PackageAddress.php — indirizzi partenza/destinazione
 *   - app/Models/Service.php — servizio di spedizione associato
 *   - app/Models/Traits/HasPrice.php — trait per formattazione prezzo
 *   - app/Models/Order.php — relazione molti-a-molti tramite package_order
 */

namespace App\Models;

use App\Models\Traits\HasPrice;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property-read User|null $user
 * @property-read PackageAddress|null $originAddress
 * @property-read PackageAddress|null $destinationAddress
 * @property-read Service|null $service
 */
class Package extends Model
{
    // Usa il trait HasPrice per gestire automaticamente la formattazione del prezzo
    use HasFactory, HasPrice;

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
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Relazione: ogni pacco appartiene a UN indirizzo di partenza (foreign key origin_address_id)
    public function originAddress(): BelongsTo
    {
        return $this->belongsTo(PackageAddress::class, 'origin_address_id');
    }

    // Relazione: ogni pacco appartiene a UN indirizzo di destinazione (foreign key destination_address_id)
    public function destinationAddress(): BelongsTo
    {
        return $this->belongsTo(PackageAddress::class, 'destination_address_id');
    }

    // Relazione: ogni pacco appartiene a UN servizio di spedizione (foreign key service_id)
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'service_id');
    }
}
