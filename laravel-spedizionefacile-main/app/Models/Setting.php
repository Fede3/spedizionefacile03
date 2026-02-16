<?php
/**
 * FILE: Setting.php
 * SCOPO: Modello chiave-valore per impostazioni dinamiche del sito (Stripe, BRT, generale).
 *
 * DOVE SI USA:
 *   - SettingsController.php — getStripeConfig, saveStripeConfig
 *   - AdminController.php — settings, updateSettings
 *   - StripeController.php — legge stripe_key, stripe_secret come fallback a config()
 *   - WalletController.php — legge stripe_secret
 *
 * DATI IN INGRESSO:
 *   - key (nome impostazione), value (valore stringa)
 *   Esempio: Setting::set('stripe_test_mode', 'true')
 *
 * DATI IN USCITA:
 *   - Setting::get('key', default) -> valore stringa o default
 *   Esempio: Setting::get('stripe_test_mode', 'false') => "true"
 *
 * VINCOLI:
 *   - Tutti i valori sono stringhe (value e' text): la conversione in tipo e' responsabilita' del chiamante
 *   - La chiave (key) deve essere unica: set() usa updateOrCreate
 *
 * ERRORI TIPICI:
 *   - Aspettarsi un boolean da get(): restituisce stringa "true"/"false", non true/false
 *   - Usare create() invece di set(): set() gestisce automaticamente upsert
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere una nuova impostazione: usare Setting::set('nuova_chiave', 'valore')
 *   - Per leggere con tipo: Setting::get('key') === 'true' (comparazione stringa)
 *
 * COLLEGAMENTI:
 *   - app/Http/Controllers/SettingsController.php — configurazione Stripe dal frontend
 *   - app/Http/Controllers/AdminController.php — gestione impostazioni dal pannello admin
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    /**
     * Campi compilabili dall'esterno.
     */
    protected $fillable = ['key', 'value'];

    /**
     * Legge il valore di un'impostazione dal database.
     * Se l'impostazione non esiste, restituisce il valore predefinito.
     *
     * Esempio: Setting::get('stripe_test_mode', 'false')
     */
    public static function get(string $key, $default = null): ?string
    {
        return static::where('key', $key)->first()?->value ?? $default;
    }

    /**
     * Salva o aggiorna un'impostazione nel database.
     * Se la chiave esiste gia', aggiorna il valore. Altrimenti la crea.
     *
     * Esempio: Setting::set('stripe_test_mode', 'true')
     */
    public static function set(string $key, ?string $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
