<?php

namespace Tests\Feature\Content;

use App\Models\Article;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicBlogArticleTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_blog_list_returns_only_published_blog_articles_in_order(): void
    {
        Article::create([
            'title' => 'Articolo B',
            'slug' => 'articolo-b',
            'type' => 'blog',
            'meta_description' => 'Secondo articolo',
            'intro' => 'Intro B',
            'is_published' => true,
            'sort_order' => 2,
        ]);

        Article::create([
            'title' => 'Articolo A',
            'slug' => 'articolo-a',
            'type' => 'blog',
            'meta_description' => 'Primo articolo',
            'intro' => 'Intro A',
            'is_published' => true,
            'sort_order' => 1,
        ]);

        Article::create([
            'title' => 'Bozza blog',
            'slug' => 'bozza-blog',
            'type' => 'blog',
            'meta_description' => 'Non deve comparire',
            'intro' => 'Bozza',
            'is_published' => false,
            'sort_order' => 0,
        ]);

        Article::create([
            'title' => 'Guida pubblicata',
            'slug' => 'guida-pubblicata',
            'type' => 'guide',
            'meta_description' => 'Altro tipo',
            'intro' => 'Guida',
            'is_published' => true,
            'sort_order' => 0,
        ]);

        $response = $this->getJson('/api/public/blog');

        $response->assertOk();
        $response->assertJsonCount(2, 'data');

        $slugs = collect($response->json('data'))->pluck('slug')->all();

        $this->assertSame(['articolo-a', 'articolo-b'], $slugs);
    }

    public function test_public_blog_detail_returns_published_blog_article(): void
    {
        Article::create([
            'title' => 'Guida non correlata',
            'slug' => 'guida-non-correlata',
            'type' => 'guide',
            'meta_description' => 'Non deve uscire',
            'intro' => 'Guida',
            'is_published' => true,
        ]);

        $article = Article::create([
            'title' => 'Articolo pubblico',
            'slug' => 'articolo-pubblico',
            'type' => 'blog',
            'meta_description' => 'Descrizione articolo',
            'intro' => 'Intro articolo',
            'sections' => [['heading' => 'Sezione', 'text' => '<p>Contenuto</p>']],
            'is_published' => true,
        ]);

        $response = $this->getJson("/api/public/blog/{$article->slug}");

        $response->assertOk();
        $response->assertJsonPath('data.id', $article->id);
        $response->assertJsonPath('data.type', 'blog');
        $response->assertJsonPath('data.slug', 'articolo-pubblico');
    }

    public function test_public_blog_detail_returns_not_found_for_unpublished_article(): void
    {
        Article::create([
            'title' => 'Articolo nascosto',
            'slug' => 'articolo-nascosto',
            'type' => 'blog',
            'meta_description' => 'Non deve essere pubblico',
            'intro' => 'Intro nascosta',
            'is_published' => false,
        ]);

        $this->getJson('/api/public/blog/articolo-nascosto')
            ->assertStatus(404)
            ->assertJsonPath('message', 'Articolo non trovato.');
    }
}
