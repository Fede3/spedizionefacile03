<?php
/**
 * FILE: PublicPriceBandController.php
 * SCOPO: Fornisce le fasce di prezzo al frontend pubblico con cache.
 *
 * DOVE SI USA: Homepage, preventivo rapido, pagina preventivo (senza autenticazione)
 *
 * DATI IN INGRESSO: Nessuno.
 * DATI IN USCITA: {data: {weight: [...], volume: [...]}, promo: {active, label_text, ...}}
 *
 * VINCOLI:
 *   - La risposta e' in cache per 60 minuti (3600 secondi)
 *   - La cache viene invalidata da PriceBandController quando l'admin modifica i prezzi
 *   - Se la cache non e' disponibile, fa query diretta al DB (doppio fallback)
 *   - Se anche il DB fallisce, restituisce array vuoti (triplo fallback)
 *   - I prezzi sono in centesimi (base_price e discount_price)
 *
 * ERRORI TIPICI: Nessuno (i fallback garantiscono sempre una risposta valida).
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per cambiare la durata della cache: modificare 3600 in Cache::remember()
 *   - Per aggiungere campi promo: aggiungerli in getPromoSettings() e in PriceBandController
 *
 * COLLEGAMENTI:
 *   - PriceBandController.php — admin: modifica prezzi e invalida cache
 *   - composables/usePriceBands.js — composable Nuxt che consuma questo endpoint
 */

namespace App\Http\Controllers;

use App\Models\PriceBand;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class PublicPriceBandController extends Controller
{
    // Ritorna tutte le fasce di prezzo + promo, con cache di 60 minuti
    public function index(): JsonResponse
    {
        try {
            $result = Cache::remember('public_price_bands', 3600, function () {
                $all = PriceBand::orderBy('sort_order')->get();

                return [
                    'data' => [
                        'weight' => $all->where('type', 'weight')->values(),
                        'volume' => $all->where('type', 'volume')->values(),
                    ],
                    'promo' => $this->getPromoSettings(),
                ];
            });
        } catch (\Exception $e) {
            // Cache non disponibile: query diretta al DB
            try {
                $all = PriceBand::orderBy('sort_order')->get();
                $result = [
                    'data' => [
                        'weight' => $all->where('type', 'weight')->values(),
                        'volume' => $all->where('type', 'volume')->values(),
                    ],
                    'promo' => $this->getPromoSettings(),
                ];
            } catch (\Exception $e2) {
                $result = [
                    'data' => ['weight' => [], 'volume' => []],
                    'promo' => ['active' => false, 'label_text' => '', 'label_color' => '#E44203', 'label_image' => null, 'show_badges' => false, 'description' => ''],
                ];
            }
        }

        return response()->json($result);
    }

    /**
     * Recupera le impostazioni promo dal DB.
     */
    private function getPromoSettings(): array
    {
        return [
            'active' => Setting::get('promo_active', 'false') === 'true',
            'label_text' => Setting::get('promo_label_text', ''),
            'label_color' => Setting::get('promo_label_color', '#E44203'),
            'label_image' => Setting::get('promo_label_image'),
            'show_badges' => Setting::get('promo_show_badges', 'true') === 'true',
            'description' => Setting::get('promo_description', ''),
        ];
    }
}
