<?php
/**
 * FILE: Article.php
 * SCOPO: Modello articolo per guide e servizi del sito (CMS semplice).
 *
 * DOVE SI USA:
 *   - ArticleController.php — CRUD admin (creazione, modifica, eliminazione articoli)
 *   - PublicArticleController.php — lettura pubblica guide e servizi pubblicati
 *
 * DATI IN INGRESSO:
 *   - title, slug, type (guide/service), meta_description, intro
 *   - sections: array JSON di sezioni [{heading: "Titolo", text: "Contenuto"}, ...]
 *   - faqs: array JSON di FAQ [{title: "Domanda", text: "Risposta"}, ...]
 *   - featured_image, icon, is_published, sort_order
 *   Esempio: Article::create(['title' => 'Come spedire', 'slug' => 'come-spedire', 'type' => 'guide'])
 *
 * DATI IN USCITA:
 *   - Record nella tabella articles
 *   - Scope: guides(), services(), published() per filtrare facilmente
 *   Esempio: Article::guides()->published()->orderBy('sort_order')->get()
 *
 * VINCOLI:
 *   - type deve essere "guide" o "service" (validato dal controller)
 *   - slug deve essere unico nella tabella articles
 *   - sections e faqs sono array JSON (cast automatico da Laravel)
 *
 * ERRORI TIPICI:
 *   - Passare sections come stringa invece che array: il cast 'array' gestisce la conversione
 *   - Dimenticare is_published: l'articolo non apparira' nel frontend senza is_published=true
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere un nuovo tipo di articolo: aggiungere un nuovo scope (es. scopeNews)
 *   - Per aggiungere campi: aggiungere in $fillable e nella migrazione
 *
 * COLLEGAMENTI:
 *   - app/Http/Controllers/ArticleController.php — CRUD admin
 *   - app/Http/Controllers/PublicArticleController.php — endpoint pubblici
 *   - nuxt: pages/guide/[slug].vue, pages/servizi/[slug].vue — frontend
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    /**
     * Campi compilabili dall'esterno.
     */
    protected $fillable = [
        'title',            // Titolo dell'articolo
        'slug',             // URL-friendly (es. "come-spedire-un-pacco")
        'type',             // Tipo: "guide" (guida) o "service" (servizio)
        'meta_description', // Descrizione per i motori di ricerca (SEO)
        'intro',            // Testo introduttivo
        'sections',         // Array JSON di sezioni [{heading, text}, ...]
        'faqs',             // Array JSON di FAQ [{title, text}, ...]
        'featured_image',   // URL dell'immagine di copertina
        'icon',             // Icona SVG o nome icona
        'is_published',     // Se l'articolo e' visibile al pubblico
        'sort_order',       // Ordine di visualizzazione (piu' basso = prima)
    ];

    /**
     * Conversioni automatiche dei tipi.
     * sections e faqs vengono convertiti da JSON stringa ad array PHP e viceversa.
     */
    protected $casts = [
        'sections' => 'array',
        'faqs' => 'array',
        'is_published' => 'boolean',
    ];

    // Scope: filtra solo le guide (type = "guide")
    public function scopeGuides($query) { return $query->where('type', 'guide'); }

    // Scope: filtra solo i servizi (type = "service")
    public function scopeServices($query) { return $query->where('type', 'service'); }

    // Scope: filtra solo gli articoli pubblicati
    public function scopePublished($query) { return $query->where('is_published', true); }
}
