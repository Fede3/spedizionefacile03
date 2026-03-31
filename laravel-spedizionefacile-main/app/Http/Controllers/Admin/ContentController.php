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
        $allowed = [
            'stripe_public_key', 'stripe_secret_key', 'stripe_webhook_secret',
            'brt_customer_id', 'brt_username', 'brt_password',
            'site_name', 'support_email', 'cod_surcharge',
        ];

        foreach ($allowed as $key) {
            if ($request->has($key)) {
                Setting::set($key, $request->input($key));
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Impostazioni aggiornate con successo.',
        ]);
    }

}
