<?php
/**
 * FILE: PriceBandController.php
 * SCOPO: Gestisce le fasce di prezzo (peso e volume) dal pannello admin.
 *        Include anche la gestione delle impostazioni promozionali.
 *
 * COSA ENTRA:
 *   - Request con array di bande per bulkUpdate
 *   - Request con impostazioni promo per savePromoSettings
 *
 * COSA ESCE:
 *   - JSON con bande raggruppate per tipo (index)
 *   - JSON con success per aggiornamento massivo (bulkUpdate)
 *   - JSON con impostazioni promo (getPromoSettings/savePromoSettings)
 *
 * CHIAMATO DA:
 *   - routes/api.php — rotte /api/admin/price-bands e /api/admin/promo-settings
 */

namespace App\Http\Controllers;

use App\Models\PriceBand;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class PriceBandController extends Controller
{
    // Lista tutte le bande raggruppate per tipo
    public function index(): JsonResponse
    {
        $bands = PriceBand::orderBy('sort_order')->get();

        return response()->json([
            'data' => [
                'weight' => $bands->where('type', 'weight')->values(),
                'volume' => $bands->where('type', 'volume')->values(),
            ],
        ]);
    }

    // Inizializza le fasce di prezzo con i valori di default (seeder via API)
    public function seed(): JsonResponse
    {
        $seeder = new \Database\Seeders\PriceBandSeeder();
        $seeder->run();

        try { Cache::forget('public_price_bands'); } catch (\Exception $e) {}

        return response()->json([
            'success' => true,
            'message' => 'Fasce di prezzo inizializzate con successo.',
        ]);
    }

    // Aggiornamento massivo delle bande di prezzo
    public function bulkUpdate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'bands' => 'required|array',
            'bands.*.id' => 'required|exists:price_bands,id',
            'bands.*.base_price' => 'required|integer|min:0',
            'bands.*.discount_price' => 'nullable|integer|min:0',
            'bands.*.show_discount' => 'sometimes|boolean',
        ]);

        foreach ($data['bands'] as $bandData) {
            $updateData = [
                'base_price' => $bandData['base_price'],
                'discount_price' => $bandData['discount_price'] ?? null,
            ];
            if (isset($bandData['show_discount'])) {
                $updateData['show_discount'] = $bandData['show_discount'];
            }
            PriceBand::where('id', $bandData['id'])->update($updateData);
        }

        // Invalida la cache pubblica: i nuovi prezzi sono visibili subito
        try { Cache::forget('public_price_bands'); } catch (\Exception $e) {}

        return response()->json([
            'success' => true,
            'message' => 'Fasce di prezzo aggiornate con successo.',
        ]);
    }

    // Legge le impostazioni promozionali
    public function getPromoSettings(): JsonResponse
    {
        return response()->json([
            'data' => [
                'promo_active' => Setting::get('promo_active', 'false'),
                'promo_label_text' => Setting::get('promo_label_text', ''),
                'promo_label_color' => Setting::get('promo_label_color', '#E44203'),
                'promo_label_image' => Setting::get('promo_label_image'),
                'promo_show_badges' => Setting::get('promo_show_badges', 'true'),
                // Descrizione personalizzata dello sconto (es. "Sconto del 20% su tutte le spedizioni!")
                'promo_description' => Setting::get('promo_description', ''),
            ],
        ]);
    }

    // Salva le impostazioni promozionali
    public function savePromoSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'promo_active' => 'required|in:true,false',
            'promo_label_text' => 'nullable|string|max:100',
            'promo_label_color' => 'nullable|string|max:20',
            'promo_show_badges' => 'required|in:true,false',
            // Descrizione testuale dello sconto mostrata nell'header della homepage
            'promo_description' => 'nullable|string|max:300',
        ]);

        Setting::set('promo_active', $data['promo_active']);
        Setting::set('promo_label_text', $data['promo_label_text'] ?? '');
        Setting::set('promo_label_color', $data['promo_label_color'] ?? '#E44203');
        Setting::set('promo_show_badges', $data['promo_show_badges']);
        // Salva la descrizione dello sconto (es. "Sconto del 20% su tutte le spedizioni!")
        Setting::set('promo_description', $data['promo_description'] ?? '');

        // Invalida cache pubblica per mostrare subito le modifiche promo
        try { Cache::forget('public_price_bands'); } catch (\Exception $e) {}

        return response()->json([
            'success' => true,
            'message' => 'Impostazioni promozionali salvate con successo.',
        ]);
    }

    // Upload immagine promozionale
    public function uploadPromoImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|max:2048',
        ]);

        $path = $request->file('image')->store('promo', 'public');
        Setting::set('promo_label_image', '/storage/' . $path);

        // Invalida cache pubblica
        try { Cache::forget('public_price_bands'); } catch (\Exception $e) {}

        return response()->json([
            'success' => true,
            'image_url' => '/storage/' . $path,
        ]);
    }
}
