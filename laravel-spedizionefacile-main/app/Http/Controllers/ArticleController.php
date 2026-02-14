<?php
/**
 * FILE: ArticleController.php
 * SCOPO: Gestisce il CRUD degli articoli (guide e servizi) dal pannello admin.
 *
 * COSA ENTRA:
 *   - Request con type (filtro guide/service) per index
 *   - Request con dati articolo per store/update
 *   - Request con file immagine per uploadImage
 *   - Article via route model binding
 *
 * COSA ESCE:
 *   - JSON con lista articoli (index)
 *   - JSON con singolo articolo (show, store, update)
 *   - JSON con URL immagine (uploadImage)
 *   - JSON con success per eliminazione (destroy)
 *
 * CHIAMATO DA:
 *   - routes/api.php — rotte /api/admin/articles/* (protette da middleware admin)
 */

namespace App\Http\Controllers;

use App\Models\Article;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ArticleController extends Controller
{
    // Lista articoli, filtrabile per tipo (guide o service)
    public function index(Request $request): JsonResponse
    {
        $query = Article::orderBy('sort_order')->orderByDesc('created_at');

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        return response()->json(['data' => $query->get()]);
    }

    // Crea un nuovo articolo
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:articles,slug',
            'type' => 'required|in:guide,service',
            'meta_description' => 'nullable|string',
            'intro' => 'nullable|string',
            'sections' => 'nullable|array',
            'sections.*.heading' => 'required_with:sections|string',
            'sections.*.text' => 'required_with:sections|string',
            'faqs' => 'nullable|array',
            'faqs.*.title' => 'required_with:faqs|string',
            'faqs.*.text' => 'required_with:faqs|string',
            'featured_image' => 'nullable|string',
            'icon' => 'nullable|string',
            'is_published' => 'boolean',
            'sort_order' => 'integer',
        ]);

        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['title']);
        }

        $article = Article::create($data);

        return response()->json([
            'success' => true,
            'data' => $article,
        ], 201);
    }

    // Mostra un singolo articolo
    public function show(Article $article): JsonResponse
    {
        return response()->json(['data' => $article]);
    }

    // Aggiorna un articolo esistente
    public function update(Request $request, Article $article): JsonResponse
    {
        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'slug' => 'sometimes|required|string|max:255|unique:articles,slug,' . $article->id,
            'type' => 'sometimes|required|in:guide,service',
            'meta_description' => 'nullable|string',
            'intro' => 'nullable|string',
            'sections' => 'nullable|array',
            'sections.*.heading' => 'required_with:sections|string',
            'sections.*.text' => 'required_with:sections|string',
            'faqs' => 'nullable|array',
            'faqs.*.title' => 'required_with:faqs|string',
            'faqs.*.text' => 'required_with:faqs|string',
            'featured_image' => 'nullable|string',
            'icon' => 'nullable|string',
            'is_published' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $article->update($data);

        return response()->json([
            'success' => true,
            'data' => $article->fresh(),
        ]);
    }

    // Elimina un articolo
    public function destroy(Article $article): JsonResponse
    {
        $article->delete();

        return response()->json([
            'success' => true,
            'message' => 'Articolo eliminato con successo.',
        ]);
    }

    // Carica un'immagine per un articolo
    public function uploadImage(Request $request, Article $article): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|max:5120',
        ]);

        $path = $request->file('image')->store('articles', 'public');

        $article->update(['featured_image' => Storage::url($path)]);

        return response()->json([
            'success' => true,
            'url' => Storage::url($path),
        ]);
    }
}
