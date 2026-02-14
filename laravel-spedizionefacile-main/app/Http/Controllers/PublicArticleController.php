<?php
/**
 * FILE: PublicArticleController.php
 * SCOPO: Fornisce gli articoli (guide e servizi) pubblicati al frontend pubblico.
 *
 * COSA ENTRA:
 *   - Slug per guide/service singoli
 *
 * COSA ESCE:
 *   - JSON con lista guide/servizi pubblicati
 *   - JSON con singola guida/servizio per slug
 *
 * CHIAMATO DA:
 *   - routes/api.php — rotte /api/public/guides e /api/public/services (pubbliche)
 */

namespace App\Http\Controllers;

use App\Models\Article;
use Illuminate\Http\JsonResponse;

class PublicArticleController extends Controller
{
    // Lista guide pubblicate
    public function guides(): JsonResponse
    {
        $guides = Article::guides()->published()
            ->orderBy('sort_order')
            ->get(['id', 'title', 'slug', 'meta_description', 'intro', 'icon', 'featured_image', 'sort_order']);

        return response()->json(['data' => $guides]);
    }

    // Singola guida per slug
    public function guide(string $slug): JsonResponse
    {
        $guide = Article::guides()->published()->where('slug', $slug)->first();

        if (!$guide) {
            return response()->json(['message' => 'Guida non trovata.'], 404);
        }

        return response()->json(['data' => $guide]);
    }

    // Lista servizi pubblicati
    public function services(): JsonResponse
    {
        $services = Article::services()->published()
            ->orderBy('sort_order')
            ->get(['id', 'title', 'slug', 'meta_description', 'intro', 'icon', 'featured_image', 'sort_order']);

        return response()->json(['data' => $services]);
    }

    // Singolo servizio per slug
    public function service(string $slug): JsonResponse
    {
        $service = Article::services()->published()->where('slug', $slug)->first();

        if (!$service) {
            return response()->json(['message' => 'Servizio non trovato.'], 404);
        }

        return response()->json(['data' => $service]);
    }
}
