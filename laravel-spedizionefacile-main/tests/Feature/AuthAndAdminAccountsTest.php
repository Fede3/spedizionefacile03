<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class AuthAndAdminAccountsTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_creates_auto_verified_user(): void
    {
        Mail::fake();

        $payload = [
            'name' => 'Mario',
            'surname' => 'Rossi',
            'prefix' => '+39',
            'telephone_number' => '3331234567',
            'email' => 'mario.rossi@example.com',
            'email_confirmation' => 'mario.rossi@example.com',
            'password' => 'Password!123',
            'password_confirmation' => 'Password!123',
            'role' => 'Cliente',
        ];

        $response = $this->postJson('/api/custom-register', $payload);

        $response->assertCreated();

        $user = User::where('email', 'mario.rossi@example.com')->first();
        $this->assertNotNull($user);
        // User should be auto-verified on registration
        $this->assertNotNull($user->email_verified_at);
        $this->assertEquals('+39 3331234567', $user->telephone_number);
        $this->assertEquals('Cliente', $user->role);
    }

    public function test_registration_validates_required_fields(): void
    {
        $response = $this->postJson('/api/custom-register', []);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['name', 'surname', 'email', 'password', 'role']);
    }

    public function test_registration_rejects_duplicate_email(): void
    {
        User::factory()->create(['email' => 'existing@example.com']);

        $payload = [
            'name' => 'Test',
            'surname' => 'User',
            'prefix' => '+39',
            'telephone_number' => '3331234567',
            'email' => 'existing@example.com',
            'email_confirmation' => 'existing@example.com',
            'password' => 'Password!123',
            'password_confirmation' => 'Password!123',
            'role' => 'Cliente',
        ];

        $response = $this->postJson('/api/custom-register', $payload);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['email']);
    }

    public function test_login_works_with_correct_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'login@test.it',
            'password' => 'TestPassword123!',
        ]);

        $response = $this->postJson('/api/custom-login', [
            'email' => 'login@test.it',
            'password' => 'TestPassword123!',
        ]);

        $response->assertOk();
        $response->assertJsonFragment(['email' => 'login@test.it']);
    }

    public function test_login_rejects_wrong_password(): void
    {
        User::factory()->create([
            'email' => 'login@test.it',
            'password' => 'CorrectPassword123!',
        ]);

        $response = $this->postJson('/api/custom-login', [
            'email' => 'login@test.it',
            'password' => 'WrongPassword!',
        ]);

        $response->assertUnprocessable();
    }

    public function test_login_auto_verifies_unverified_user(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'unverified@test.it',
            'password' => 'TestPassword123!',
        ]);

        $this->assertNull($user->email_verified_at);

        $response = $this->postJson('/api/custom-login', [
            'email' => 'unverified@test.it',
            'password' => 'TestPassword123!',
        ]);

        $response->assertOk();
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_signed_verification_route_marks_user_as_verified(): void
    {
        $user = User::factory()->unverified()->create();

        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), ['id' => $user->id]);

        $response = $this->get($url);

        $response->assertRedirect();
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_admin_can_list_users(): void
    {
        $admin = User::factory()->create([
            'role' => 'Admin',
            'email_verified_at' => now(),
        ]);

        User::factory()->count(3)->create();

        $this->actingAs($admin);

        $response = $this->getJson('/api/admin/users');

        $response->assertOk();
        $response->assertJsonStructure(['data']);
        $this->assertCount(4, $response->json('data')); // admin + 3 users
    }

    public function test_admin_can_approve_unverified_user(): void
    {
        $admin = User::factory()->create([
            'role' => 'Admin',
            'email_verified_at' => now(),
        ]);

        $pendingUser = User::factory()->unverified()->create();

        $this->actingAs($admin);

        $response = $this->patchJson("/api/admin/users/{$pendingUser->id}/approve");

        $response->assertOk();
        $this->assertNotNull($pendingUser->fresh()->email_verified_at);
    }

    public function test_admin_can_delete_user(): void
    {
        $admin = User::factory()->create([
            'role' => 'Admin',
            'email_verified_at' => now(),
        ]);

        $toDelete = User::factory()->create();

        $this->actingAs($admin);

        $response = $this->deleteJson("/api/admin/users/{$toDelete->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('users', ['id' => $toDelete->id]);
    }

    public function test_admin_cannot_delete_self(): void
    {
        $admin = User::factory()->create([
            'role' => 'Admin',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($admin);

        $response = $this->deleteJson("/api/admin/users/{$admin->id}");

        $response->assertStatus(422);
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_non_admin_cannot_access_admin_routes(): void
    {
        $client = User::factory()->create(['role' => 'Cliente']);

        $this->actingAs($client);

        $this->getJson('/api/admin/users')->assertForbidden();
        $this->getJson('/api/admin/wallet/overview')->assertForbidden();
        $this->getJson('/api/admin/withdrawals')->assertForbidden();
    }

    public function test_wallet_balance_returns_zero_for_new_user(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user);

        $response = $this->getJson('/api/wallet/balance');

        $response->assertOk();
        $response->assertJsonFragment(['balance' => 0.0]);
    }

    public function test_wallet_movements_returns_empty_for_new_user(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user);

        $response = $this->getJson('/api/wallet/movements');

        $response->assertOk();
        $response->assertJsonFragment(['data' => []]);
    }

    public function test_partner_pro_gets_referral_code_on_creation(): void
    {
        $payload = [
            'name' => 'Luca',
            'surname' => 'Bianchi',
            'prefix' => '+39',
            'telephone_number' => '3335551234',
            'email' => 'partner@example.com',
            'email_confirmation' => 'partner@example.com',
            'password' => 'Partner12345!',
            'password_confirmation' => 'Partner12345!',
            'role' => 'Partner Pro',
        ];

        Mail::fake();

        $this->postJson('/api/custom-register', $payload)->assertCreated();

        $user = User::where('email', 'partner@example.com')->first();
        $this->assertNotNull($user->referral_code);
        $this->assertEquals(8, strlen($user->referral_code));
    }
}
