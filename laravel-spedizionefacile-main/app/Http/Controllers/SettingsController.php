<?php
/**
 * FILE: SettingsController.php
 * SCOPO: Gestisce la configurazione delle chiavi Stripe (lettura pubblica e salvataggio admin).
 *
 * COSA ENTRA:
 *   - Nessun parametro per getStripeConfig
 *   - Request con publishable_key (pk_*) e secret_key (sk_*) per saveStripeConfig
 *
 * COSA ESCE:
 *   - JSON con configured (bool) e publishable_key per getStripeConfig
 *   - JSON con success e message per saveStripeConfig
 *
 * CHIAMATO DA:
 *   - routes/api.php — GET /api/stripe-config (pubblico, usato dal frontend per inizializzare Stripe)
 *   - routes/api.php — POST /api/admin/stripe-config (admin)
 *   - nuxt: pages/checkout.vue (carica chiave pubblica), pannello admin (salva chiavi)
 *
 * EFFETTI COLLATERALI:
 *   - Database: salva/aggiorna stripe_key e stripe_secret nella tabella settings
 *
 * ERRORI TIPICI:
 *   - 403: utente non admin tenta di salvare le chiavi
 *   - 422: formato chiave non valido (deve iniziare con pk_ o sk_)
 *
 * DOCUMENTI CORRELATI:
 *   - app/Models/Setting.php — modello chiave-valore per impostazioni
 *   - StripeController.php — usa le chiavi salvate per processare i pagamenti
 *   - config/services.php — fallback per chiavi da file .env
 */

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
class SettingsController extends Controller
{
    /**
     * Restituisce lo stato della configurazione Stripe.
     * Dice al frontend se Stripe e' configurato (cioe' se le chiavi sono state inserite)
     * e fornisce solo la chiave pubblica (mai la segreta!).
     */
    public function getStripeConfig()
    {
        // Cerchiamo le chiavi prima nel database (nuovo e legacy), poi nel file .env come riserva
        $key = trim((string) (Setting::get('stripe_key')
            ?: Setting::get('stripe_public_key')
            ?: config('services.stripe.key')));

        $secret = trim((string) (Setting::get('stripe_secret')
            ?: Setting::get('stripe_secret_key')
            ?: config('services.stripe.secret')));

        $hasPlaceholder = str_contains($key, 'placeholder') || str_contains($secret, 'placeholder');

        return response()->json([
            'configured' => !empty($secret) && !empty($key) && !$hasPlaceholder, // true se entrambe le chiavi sono presenti
            'publishable_key' => $key ?: '',                  // Solo la chiave pubblica viene inviata al frontend
        ]);
    }

    /**
     * Salva le chiavi Stripe nel database.
     * Solo l'amministratore puo' fare questa operazione.
     * Verifica che le chiavi abbiano il formato corretto (pk_ e sk_).
     */
    public function saveStripeConfig(Request $request)
    {
        // Controllo di sicurezza: solo l'admin puo' cambiare le chiavi Stripe
        if (!$request->user()?->isAdmin()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        // Verifichiamo che le chiavi abbiano il formato corretto
        $request->validate([
            'publishable_key' => 'required|string|starts_with:pk_',
            'secret_key' => 'required|string|starts_with:sk_',
        ], [
            'publishable_key.starts_with' => 'La Publishable Key deve iniziare con pk_',
            'secret_key.starts_with' => 'La Secret Key deve iniziare con sk_',
        ]);

        // Ripulisce eventuali spazi/newline da copia-incolla
        $publishable = preg_replace('/\s+/', '', (string) $request->publishable_key);
        $secret = preg_replace('/\s+/', '', (string) $request->secret_key);

        if (!preg_match('/^pk_(test|live)_[A-Za-z0-9]+$/', $publishable)) {
            return response()->json([
                'message' => 'Publishable Key non valida. Incolla la chiave completa (pk_test_... o pk_live_...) senza caratteri extra.',
            ], 422);
        }

        if (!preg_match('/^sk_(test|live)_[A-Za-z0-9]+$/', $secret)) {
            return response()->json([
                'message' => 'Secret Key non valida. Incolla la chiave completa (sk_test_... o sk_live_...) senza caratteri extra.',
            ], 422);
        }

        // Salviamo in doppia chiave (nuovo + legacy) per compatibilita' con tutto il progetto
        Setting::set('stripe_key', $publishable);
        Setting::set('stripe_public_key', $publishable);
        Setting::set('stripe_secret', $secret);
        Setting::set('stripe_secret_key', $secret);

        return response()->json([
            'success' => true,
            'message' => 'Stripe configurato con successo!',
        ]);
    }
}
