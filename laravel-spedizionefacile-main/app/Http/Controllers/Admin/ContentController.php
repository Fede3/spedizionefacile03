<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContentController extends Controller
{
    // Mostra tutti i messaggi di contatto ricevuti dalla pagina "Contattaci"
    public function contactMessages(): JsonResponse
    {
        $messages = ContactMessage::orderByDesc('created_at')->get();

        return response()->json(['data' => $messages]);
    }

    // Segna un messaggio di contatto come letto
    public function markContactMessageRead($id): JsonResponse
    {
        $msg = ContactMessage::findOrFail($id);
        $msg->update(['read_at' => now()]);

        return response()->json([
            'success' => true,
            'data' => $msg->fresh(),
        ]);
    }

    // Mostra le impostazioni del sito (chiavi API, configurazioni, ecc.)
    public function settings(): JsonResponse
    {
        $keys = [
            'stripe_public_key', 'stripe_secret_key', 'stripe_webhook_secret',
            'brt_customer_id', 'brt_username', 'brt_password',
            'site_name', 'support_email', 'cod_surcharge',
        ];

        $settings = [];
        foreach ($keys as $key) {
            $settings[$key] = Setting::get($key, '');
        }

        return response()->json(['data' => $settings]);
    }

    // Aggiorna le impostazioni del sito
    // Accetta solo le chiavi autorizzate (per sicurezza)
    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'stripe_public_key' => 'nullable|string|max:255',
            'stripe_secret_key' => 'nullable|string|max:255',
            'stripe_webhook_secret' => 'nullable|string|max:255',
            'brt_customer_id' => 'nullable|string|max:100',
            'brt_username' => 'nullable|string|max:100',
            'brt_password' => 'nullable|string|max:255',
            'site_name' => 'nullable|string|max:100',
            'support_email' => 'nullable|string|email|max:255',
            'cod_surcharge' => 'nullable|numeric|min:0|max:9999',
        ]);

        foreach ($data as $key => $value) {
            if (!is_null($value)) {
                Setting::set($key, $value);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Impostazioni aggiornate con successo.',
        ]);
    }

}
