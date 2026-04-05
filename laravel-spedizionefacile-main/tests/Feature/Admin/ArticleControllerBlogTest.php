<?php

namespace Tests\Feature\Admin;

use App\Models\Article;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ArticleControllerBlogTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->create([
            'role' => 'Admin',
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_can_create_blog_article(): void
    {
        $this->actingAsAdmin();

        $response = $this->postJson('/api/admin/articles', [
            'title' => 'Come organizzare le spedizioni ricorrenti',
            'slug' => 'come-organizzare-le-spedizioni-ricorrenti',
            'type' => 'blog',
            'meta_description' => 'Consigli pratici per flussi di spedizione ripetuti.',
            'intro' => 'Una checklist semplice per ridurre attrito e ritardi.',
            'sections' => [
                ['heading' => 'Analisi', 'text' => '<p>Parti dai colli ricorrenti.</p>'],
            ],
            'is_published' => true,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.type', 'blog');
        $response->assertJsonPath('data.slug', 'come-organizzare-le-spedizioni-ricorrenti');

        $this->assertDatabaseHas('articles', [
            'type' => 'blog',
            'slug' => 'come-organizzare-le-spedizioni-ricorrenti',
            'is_published' => 1,
        ]);
    }

    public function test_admin_can_update_existing_blog_article(): void
    {
        $this->actingAsAdmin();

        $article = Article::create([
            'title' => 'Blog iniziale',
            'slug' => 'blog-iniziale',
            'type' => 'blog',
            'meta_description' => 'Bozza iniziale',
            'intro' => 'Testo iniziale',
            'sections' => [['heading' => 'Prima', 'text' => '<p>Bozza</p>']],
            'is_published' => false,
        ]);

        $response = $this->putJson("/api/admin/articles/{$article->id}", [
            'title' => 'Blog aggiornato',
            'type' => 'blog',
            'is_published' => true,
        ]);

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.title', 'Blog aggiornato');
        $response->assertJsonPath('data.type', 'blog');
        $response->assertJsonPath('data.is_published', true);

        $this->assertDatabaseHas('articles', [
            'id' => $article->id,
            'title' => 'Blog aggiornato',
            'type' => 'blog',
            'is_published' => 1,
        ]);
    }
}
