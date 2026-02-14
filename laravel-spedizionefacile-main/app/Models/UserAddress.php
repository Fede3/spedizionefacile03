<?php
/**
 * FILE: UserAddress.php
 * SCOPO: Modello indirizzo della rubrica utente con gestione automatica dell'indirizzo predefinito.
 *
 * COSA ENTRA:
 *   - name, address, address_number, city, postal_code, province, country
 *   - telephone_number, email, additional_information, intercom_code, default, user_id
 *
 * COSA ESCE:
 *   - Relazione: user (l'utente proprietario)
 *
 * CHIAMATO DA:
 *   - UserAddressController.php — CRUD indirizzi rubrica (max 5 per utente)
 *   - nuxt: pages/account/indirizzi/index.vue, pages/la-tua-spedizione/[step].vue
 *
 * EFFETTI COLLATERALI:
 *   - Boot creating: il primo indirizzo diventa automaticamente predefinito
 *   - Boot creating: se nuovo indirizzo e' default, rimuove default dagli altri
 *   - Boot updating: se indirizzo impostato come default, rimuove default dagli altri
 *   - Boot deleting: se eliminato l'indirizzo default, il piu' vecchio diventa il nuovo default
 *
 * ERRORI TIPICI:
 *   - Differenza con PackageAddress: UserAddress e' la rubrica utente, PackageAddress e' legato al pacco
 *   - Max 5 indirizzi per utente (controllato dal controller, non dal modello)
 *
 * DOCUMENTI CORRELATI:
 *   - UserAddressController.php — controller CRUD con limite 5 indirizzi
 *   - app/Models/PackageAddress.php — indirizzi specifici dei pacchi (diversi dalla rubrica)
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserAddress extends Model
{
    /**
     * Campi compilabili dall'esterno.
     */
    protected $fillable = [
        'type',                    // Tipo di indirizzo (es. "privato", "azienda")
        'name',                    // Nome completo associato all'indirizzo
        'additional_information',  // Info extra (es. "piano 3", "scala B")
        'address',                 // Via/piazza/corso
        'number_type',             // Tipo di numero civico
        'address_number',          // Numero civico
        'intercom_code',           // Codice citofono
        'country',                 // Nazione
        'city',                    // Citta'
        'postal_code',             // CAP
        'province',                // Sigla provincia
        'telephone_number',        // Telefono
        'email',                   // Email
        'default',                 // Se true, e' l'indirizzo predefinito dell'utente
        'user_id'                  // ID dell'utente proprietario
    ];

    /**
     * Azioni automatiche che gestiscono l'indirizzo predefinito.
     * Questo codice viene eseguito ogni volta che un indirizzo viene
     * creato, modificato o cancellato.
     */
    public static function boot() {
        parent::boot();

        // Quando si CREA un nuovo indirizzo:
        static::creating(function($address) {

            // Conta quanti indirizzi ha gia' l'utente
            $existingCount = $address->newQuery()
                ->where('user_id', $address->user_id)
                ->count();

            // Caso 1: E' il primo indirizzo dell'utente, diventa automaticamente il predefinito
            if ($existingCount === 0) {
                $address->default = true;
            }

            // Caso 2: Questo indirizzo e' marcato come predefinito,
            // quindi togliamo il predefinito da tutti gli altri indirizzi dell'utente
            if ($address->default) {
                $address->newQuery()
                    ->where('user_id', $address->user_id)
                    ->update(['default' => false]);
            }
        });

        // Quando si MODIFICA un indirizzo:
        // Se viene impostato come predefinito, toglie il predefinito dagli altri
        static::updating(function($address) {
            if ($address->default) {
                $address->newQuery()->where('user_id', $address->user->id)
                                    ->where('id', '!=', $address->id)
                                    ->update(['default' => false]);
            }
        });

        // Quando si CANCELLA un indirizzo:
        // Se era il predefinito, ne sceglie un altro come nuovo predefinito
        static::deleting(function ($address) {
            if ($address->default) {
                // Trova un altro indirizzo dello stesso utente (il piu' vecchio)
                $newDefault = $address->newQuery()
                    ->where('user_id', $address->user_id)
                    ->where('id', '!=', $address->id)
                    ->orderBy('id', 'asc')
                    ->first();

                if ($newDefault) {
                    $newDefault->update(['default' => true]);
                }
            }
        });
    }

    // Relazione: ogni indirizzo appartiene a UN utente
    public function user() {
        return $this->belongsTo(User::class);
    }
}
