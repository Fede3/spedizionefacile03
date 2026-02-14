<?php
/**
 * FILE: PublicPriceBandController.php
 * SCOPO: Fornisce le fasce di prezzo al frontend pubblico con cache.
 *        Include anche le impostazioni promozionali attive.
 *
 * COSA ESCE:
 *   - JSON con tutte le fasce di prezzo + impostazioni promo (cached 60 minuti)
 *
 * CHIAMATO DA:
 *   - routes/api.php — rotta /api/public/price-bands (pubblica)
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
                    'promo' => [
                        'active' => Setting::get('promo_active', 'false') === 'true',
                        'label_text' => Setting::get('promo_label_text', ''),
                        'label_color' => Setting::get('promo_label_color', '#E44203'),
                        'label_image' => Setting::get('promo_label_image'),
                        'show_badges' => Setting::get('promo_show_badges', 'true') === 'true',
                    ],
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
                    'promo' => [
                        'active' => Setting::get('promo_active', 'false') === 'true',
                        'label_text' => Setting::get('promo_label_text', ''),
                        'label_color' => Setting::get('promo_label_color', '#E44203'),
                        'label_image' => Setting::get('promo_label_image'),
                        'show_badges' => Setting::get('promo_show_badges', 'true') === 'true',
                    ],
                ];
            } catch (\Exception $e2) {
                $result = [
                    'data' => ['weight' => [], 'volume' => []],
                    'promo' => ['active' => false, 'label_text' => '', 'label_color' => '#E44203', 'label_image' => null, 'show_badges' => false],
                ];
            }
        }

        return response()->json($result);
    }
}
