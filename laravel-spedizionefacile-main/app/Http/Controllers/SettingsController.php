<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /**
     * Restituisce lo stato della configurazione Stripe
     * (non espone MAI la secret key al frontend)
     */
    public function getStripeConfig()
    {
        $key = Setting::get('stripe_key', config('services.stripe.key'));
        $secret = Setting::get('stripe_secret', config('services.stripe.secret'));

        return response()->json([
            'configured' => !empty($secret) && !empty($key),
            'publishable_key' => $key ?: '',
        ]);
    }

    /**
     * Salva le chiavi Stripe nel database (solo admin)
     */
    public function saveStripeConfig(Request $request)
    {
        if (!$request->user()?->isAdmin()) {
            return response()->json(['error' => 'Non autorizzato.'], 403);
        }

        $request->validate([
            'publishable_key' => 'required|string|starts_with:pk_',
            'secret_key' => 'required|string|starts_with:sk_',
        ], [
            'publishable_key.starts_with' => 'La Publishable Key deve iniziare con pk_',
            'secret_key.starts_with' => 'La Secret Key deve iniziare con sk_',
        ]);

        Setting::set('stripe_key', $request->publishable_key);
        Setting::set('stripe_secret', $request->secret_key);

        return response()->json([
            'success' => true,
            'message' => 'Stripe configurato con successo!',
        ]);
    }
}
