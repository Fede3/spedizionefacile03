<?php
/**
 * FILE: Setting.php
 * SCOPO: Modello chiave-valore per impostazioni dinamiche del sito (Stripe, BRT, generale).
 *
 * COSA ENTRA:
 *   - key (nome impostazione), value (valore stringa)
 *
 * COSA ESCE:
 *   - Setting::get('key', default) -> valore stringa o default
 *   - Setting::set('key', 'value') -> crea o aggiorna (updateOrCreate)
 *
 * CHIAMATO DA:
 *   - SettingsController.php — getStripeConfig, saveStripeConfig
 *   - AdminController.php — settings, updateSettings
 *   - StripeController.php — legge stripe_key, stripe_secret come fallback a config()
 *   - WalletController.php — legge stripe_secret
 *   - BrtService.php — legge brt_customer_id, brt_username, brt_password
 *
 * EFFETTI COLLATERALI:
 *   - Database: updateOrCreate su tabella settings (upsert)
 *
 * ERRORI TIPICI:
 *   - Tutti i valori sono stringhe (value e' text), la conversione in tipo e' responsabilita' del chiamante
 *
 * DOCUMENTI CORRELATI:
 *   - SettingsController.php — configurazione Stripe dal frontend
 *   - AdminController.php — gestione impostazioni complete dal pannello admin
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
