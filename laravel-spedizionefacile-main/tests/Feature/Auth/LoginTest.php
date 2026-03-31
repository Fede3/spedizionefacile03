<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Support\AuthUiCookie;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpFoundation\Cookie;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    // T11.1.1 - Login valido
    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response = $this->postJson('/api/custom-login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertOk();
    }

    // T11.1.2 - Login email errata
    public function test_login_fails_with_wrong_email(): void
    {
        $response = $this->postJson('/api/custom-login', [
            'email' => 'nonexistent@example.com',
            'password' => 'password123',
        ]);

        // Controller throws ValidationException → 422
        $response->assertUnprocessable();
    }

    public function test_login_accepts_common_spediamofacile_admin_domain_typo(): void
    {
        User::factory()->create([
            'email' => 'admin@spediamofacile.it',
            'password' => 'Admin2026!',
            'role' => 'Admin',
        ]);

        $response = $this->postJson('/api/custom-login', [
            'email' => 'admin@spedizionefacile.it',
            'password' => 'Admin2026!',
        ]);

        $response->assertOk()
            ->assertJsonPath('email', 'admin@spediamofacile.it');
    }

    public function test_login_sets_auth_ui_cookie_for_immediate_ssr_account_ui(): void
    {
        User::factory()->create([
            'email' => 'test@example.com',
            'password' => 'password123',
            'name' => 'Federico',
        ]);

        $response = $this->postJson('/api/custom-login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertOk()->assertCookie(AuthUiCookie::NAME);

        $cookie = $this->findCookie($response, AuthUiCookie::NAME);

        $this->assertNotNull($cookie);
        $this->assertStringContainsString('"authenticated":true', urldecode((string) $cookie?->getValue()));
        $this->assertStringContainsString('"name":"Federico"', urldecode((string) $cookie?->getValue()));
    }

    // T11.1.3 - Login password errata
    public function test_login_fails_with_wrong_password(): void
    {
        User::factory()->create(['email' => 'test@example.com']);

        $response = $this->postJson('/api/custom-login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);

        // Controller throws ValidationException → 422
        $response->assertUnprocessable();
    }

    // T11.1.4 - Login email non verificata returns 403 with verification required
    public function test_login_with_unverified_email_returns_verification_required(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'unverified@example.com',
            'password' => 'password123',
        ]);

        Mail::fake();

        $response = $this->postJson('/api/custom-login', [
            'email' => 'unverified@example.com',
            'password' => 'password123',
        ]);

        // Should return 403 with requires_verification flag
        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'requires_verification' => true,
            ]);
    }

    // T11.1.5 - Login senza email (campo obbligatorio)
    public function test_login_fails_without_email(): void
    {
        $response = $this->postJson('/api/custom-login', [
            'password' => 'password123',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    // T11.1.6 - Login senza password (campo obbligatorio)
    public function test_login_fails_without_password(): void
    {
        $response = $this->postJson('/api/custom-login', [
            'email' => 'test@example.com',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
    }

    // T11.1.7 - Protected route without auth returns 401
    public function test_protected_route_requires_authentication(): void
    {
        $response = $this->getJson('/api/orders');
        $response->assertUnauthorized();
    }

    // T11.1.8 - Authenticated user can access protected routes
    public function test_authenticated_user_can_access_protected_routes(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/user');
        $response->assertOk();
    }

    public function test_logout_clears_auth_ui_cookie(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/logout');

        $response->assertOk();

        $cookie = $this->findCookie($response, AuthUiCookie::NAME);

        $this->assertNotNull($cookie);
        $this->assertLessThanOrEqual(time(), $cookie?->getExpiresTime() ?? PHP_INT_MAX);
    }

    private function findCookie($response, string $name): ?Cookie
    {
        foreach ($response->headers->getCookies() as $cookie) {
            if ($cookie->getName() === $name) {
                return $cookie;
            }
        }

        return null;
    }
}
