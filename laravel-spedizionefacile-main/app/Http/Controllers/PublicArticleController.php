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
    private const LIST_COLUMNS = ['id', 'title', 'slug', 'meta_description', 'intro', 'icon', 'featured_image', 'sort_order', 'created_at'];

    private function publishedList(string $type): JsonResponse
    {
        $articles = Article::query()
            ->where('type', $type)
            ->published()
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->get(self::LIST_COLUMNS);

        return response()->json(['data' => $articles]);
    }

    private function publishedDetail(string $type, string $slug, string $notFoundMessage): JsonResponse
    {
        $article = Article::query()
            ->where('type', $type)
            ->published()
            ->where('slug', $slug)
            ->first();

        if (!$article) {
            return response()->json(['message' => $notFoundMessage], 404);
        }

        return response()->json(['data' => $article]);
    }

    // Lista articoli blog pubblicati
    public function blog(): JsonResponse
    {
        return $this->publishedList('blog');
    }

    // Singolo articolo blog per slug
    public function blogArticle(string $slug): JsonResponse
    {
        return $this->publishedDetail('blog', $slug, 'Articolo non trovato.');
    }

    // Lista guide pubblicate
    public function guides(): JsonResponse
    {
        return $this->publishedList('guide');
    }

    // Singola guida per slug
    public function guide(string $slug): JsonResponse
    {
        return $this->publishedDetail('guide', $slug, 'Guida non trovata.');
    }

    // Lista servizi pubblicati
    public function services(): JsonResponse
    {
        return $this->publishedList('service');
    }

    // Singolo servizio per slug
    public function service(string $slug): JsonResponse
    {
        return $this->publishedDetail('service', $slug, 'Servizio non trovato.');
    }
}
