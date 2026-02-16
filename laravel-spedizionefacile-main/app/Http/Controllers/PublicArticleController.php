<?php
/**
 * FILE: PublicArticleController.php
 * SCOPO: Fornisce gli articoli (guide e servizi) pubblicati al frontend pubblico.
 *
 * DOVE SI USA: Pagine pubbliche guide e servizi (senza autenticazione)
 *
 * DATI IN INGRESSO: Slug (stringa) per guide/service singoli; nessuno per le liste.
 * DATI IN USCITA: {data: articolo} o {data: [articoli]} con campi ridotti per le liste.
 *
 * VINCOLI:
 *   - Restituisce SOLO articoli con is_published = true (scope published())
 *   - Le liste restituiscono campi ridotti (no sections, no faqs) per performance
 *   - Gli articoli sono ordinati per sort_order
 *
 * ERRORI TIPICI:
 *   - 404: slug non trovato tra gli articoli pubblicati
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per cambiare i campi restituiti nelle liste: modificare il get([...]) nelle funzioni
 *
 * COLLEGAMENTI:
 *   - ArticleController.php — CRUD admin per creare/modificare gli articoli
 *   - app/Models/Article.php — modello con scopes guides(), services(), published()
 *   - pages/guide/ e pages/servizi/ — pagine frontend
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
