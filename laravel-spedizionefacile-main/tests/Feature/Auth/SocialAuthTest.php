<?php

namespace Tests\Feature\Auth;

use App\Support\AuthUiCookie;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Cookie;
use Tests\TestCase;

class SocialAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_auth_providers_endpoint_reflects_real_configuration_state(): void
    {
        config()->set('services.google.client_id', 'google-client');
        config()->set('services.google.client_secret', 'google-secret');
        config()->set('services.google.redirect', 'https://example.test/auth/google/callback');

        config()->set('services.facebook.client_id', null);
        config()->set('services.facebook.client_secret', null);
        config()->set('services.facebook.redirect', null);

        config()->set('services.apple.client_id', 'com.example.web');
        config()->set('services.apple.client_secret', null);
        config()->set('services.apple.redirect', 'https://example.test/auth/apple/callback');
        config()->set('services.apple.team_id', 'TEAM123');
        config()->set('services.apple.key_id', 'KEY123');
        config()->set('services.apple.private_key', "-----BEGIN PRIVATE KEY-----\\nTEST\\n-----END PRIVATE KEY-----");

        $response = $this->getJson('/api/auth/providers');

        $response->assertOk()->assertExactJson([
            'google' => true,
            'facebook' => false,
            'apple' => true,
        ]);
    }

    public function test_apple_redirect_returns_frontend_error_when_provider_is_not_configured(): void
    {
        config()->set('services.apple.client_id', null);
        config()->set('services.apple.client_secret', null);
        config()->set('services.apple.redirect', null);
        config()->set('services.apple.team_id', null);
        config()->set('services.apple.key_id', null);
        config()->set('services.apple.private_key', null);

        $response = $this->get('/api/auth/apple/redirect?frontend=http://localhost:3000&redirect=/autenticazione');

        $response->assertRedirect('http://localhost:3000/autenticazione?auth_modal=login&auth_error=apple_unavailable');
    }

    public function test_apple_redirect_builds_authorize_url_and_state_cookie_when_configured(): void
    {
        config()->set('services.apple.client_id', 'com.example.web');
        config()->set('services.apple.client_secret', 'apple-client-secret');
        config()->set('services.apple.redirect', 'https://example.test/auth/apple/callback');
        config()->set('services.apple.team_id', null);
        config()->set('services.apple.key_id', null);
        config()->set('services.apple.private_key', null);

        $response = $this->get('/api/auth/apple/redirect?frontend=http://localhost:3000&redirect=/checkout&intent=register&user_type=privato');

        $location = (string) $response->headers->get('Location');

        $response->assertRedirect();
        $this->assertStringStartsWith('https://appleid.apple.com/auth/authorize?', $location);
        $this->assertStringContainsString('client_id=com.example.web', $location);
        $this->assertStringContainsString('response_mode=form_post', $location);
        $this->assertStringContainsString('scope=name+email', $location);
        $this->assertNotNull($this->findCookie($response, 'frontend_social_state'));
        $this->assertNotNull($this->findCookie($response, 'frontend_redirect'));
        $this->assertNotNull($this->findCookie($response, 'frontend_redirect_path'));
    }

    public function test_apple_callback_creates_or_logs_in_user_and_returns_auth_cookie(): void
    {
        config()->set('services.apple.client_id', 'com.example.web');
        config()->set('services.apple.client_secret', 'apple-client-secret');
        config()->set('services.apple.redirect', 'https://example.test/auth/apple/callback');
        config()->set('services.apple.team_id', null);
        config()->set('services.apple.key_id', null);
        config()->set('services.apple.private_key', null);

        $claims = [
            'iss' => 'https://appleid.apple.com',
            'aud' => 'com.example.web',
            'sub' => 'apple-user-123',
            'email' => 'apple-user@example.com',
            'email_verified' => 'true',
        ];

        Http::fake([
            'https://appleid.apple.com/auth/token' => Http::response([
                'access_token' => 'test-access-token',
                'token_type' => 'Bearer',
                'id_token' => $this->fakeJwt($claims),
            ], 200),
        ]);

        $response = $this
            ->withCookie('frontend_redirect', 'http://localhost:3000')
            ->withCookie('frontend_redirect_path', '/account')
            ->withCookie('frontend_social_intent', 'register')
            ->withCookie('frontend_social_referral', '')
            ->withCookie('frontend_social_user_type', 'privato')
            ->withCookie('frontend_social_state', 'state-123')
            ->post('/auth/apple/callback', [
                'state' => 'state-123',
                'code' => 'valid-auth-code',
                'user' => json_encode([
                    'name' => [
                        'firstName' => 'Federico',
                        'lastName' => 'Mascia',
                    ],
                ], JSON_THROW_ON_ERROR),
            ]);

        $response->assertRedirect('http://localhost:3000/account');
        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', [
            'email' => 'apple-user@example.com',
            'apple_id' => 'apple-user-123',
        ]);

        $cookie = $this->findCookie($response, AuthUiCookie::NAME);
        $this->assertNotNull($cookie);
    }

    private function fakeJwt(array $claims): string
    {
        $header = $this->base64UrlEncode(json_encode(['alg' => 'none', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
        $payload = $this->base64UrlEncode(json_encode($claims, JSON_THROW_ON_ERROR));

        return $header.'.'.$payload.'.signature';
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
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
