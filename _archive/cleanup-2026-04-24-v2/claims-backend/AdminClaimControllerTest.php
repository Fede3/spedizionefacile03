<?php

namespace Tests\Feature\Admin;

use App\Mail\ClaimResolvedMail;
use App\Mail\ClaimStatusUpdateMail;
use App\Models\Claim;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Test per AdminClaimController: workflow completo admin reclami (F03).
 *
 * Verifica:
 *  - solo admin accede ai nuovi endpoint;
 *  - PATCH update aggiorna status e note, spedisce mail alla chiusura,
 *    scrive un audit log con azione "admin.claim.update";
 *  - POST reply spedisce ClaimStatusUpdateMail e scrive audit log
 *    con azione "admin.claim.reply".
 */
class AdminClaimControllerTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): User
    {
        $admin = User::factory()->create();
        $admin->role = 'Admin';
        $admin->save();
        return $admin;
    }

    private function makeClient(): User
    {
        return User::factory()->create(['email' => 'cliente@test.it']);
    }

    private function makeClaim(User $client): Claim
    {
        $order = Order::factory()->create(['user_id' => $client->id]);
        return Claim::create([
            'user_id' => $client->id,
            'order_id' => $order->id,
            'claim_type' => Claim::TYPE_DAMAGE,
            'status' => Claim::STATUS_OPEN,
            'description' => 'Pacco arrivato schiacciato.',
        ]);
    }

    public function test_non_admin_cannot_update_claim(): void
    {
        $client = $this->makeClient();
        $claim = $this->makeClaim($client);

        $this->actingAs($client)
            ->patchJson('/api/admin/claims/' . $claim->id, ['status' => 'resolved'])
            ->assertStatus(403);
    }

    public function test_admin_can_move_claim_to_in_review_without_sending_mail(): void
    {
        Mail::fake();

        $admin  = $this->makeAdmin();
        $client = $this->makeClient();
        $claim  = $this->makeClaim($client);

        $this->actingAs($admin)
            ->patchJson('/api/admin/claims/' . $claim->id, [
                'status' => 'in_review',
                'resolution_notes' => 'Stiamo verificando con il corriere.',
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'in_review')
            ->assertJsonPath('data.resolution_notes', 'Stiamo verificando con il corriere.');

        // Non chiude il reclamo -> nessuna ClaimResolvedMail
        Mail::assertNothingQueued();

        // Audit log scritto
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'admin.claim.update',
            'target_type' => 'Claim',
            'target_id' => $claim->id,
        ]);
    }

    public function test_admin_resolving_a_claim_sends_email_and_sets_resolved_at(): void
    {
        Mail::fake();

        $admin  = $this->makeAdmin();
        $client = $this->makeClient();
        $claim  = $this->makeClaim($client);

        $this->actingAs($admin)
            ->patchJson('/api/admin/claims/' . $claim->id, [
                'status' => 'resolved',
                'resolution_notes' => 'Rimborso accreditato sul portafoglio.',
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'resolved');

        $this->assertNotNull($claim->fresh()->resolved_at);
        Mail::assertQueued(ClaimResolvedMail::class, function (ClaimResolvedMail $mail) use ($claim) {
            return $mail->hasTo('cliente@test.it') && $mail->claim->id === $claim->id;
        });
    }

    public function test_admin_update_rejects_invalid_status(): void
    {
        $admin  = $this->makeAdmin();
        $client = $this->makeClient();
        $claim  = $this->makeClaim($client);

        $this->actingAs($admin)
            ->patchJson('/api/admin/claims/' . $claim->id, ['status' => 'wat'])
            ->assertStatus(422);
    }

    public function test_admin_update_rejects_too_long_resolution_notes(): void
    {
        $admin  = $this->makeAdmin();
        $client = $this->makeClient();
        $claim  = $this->makeClaim($client);

        $this->actingAs($admin)
            ->patchJson('/api/admin/claims/' . $claim->id, [
                'status' => 'in_review',
                'resolution_notes' => str_repeat('x', 5001),
            ])
            ->assertStatus(422);
    }

    public function test_admin_reply_sends_email_and_audit_log(): void
    {
        Mail::fake();

        $admin  = $this->makeAdmin();
        $client = $this->makeClient();
        $claim  = $this->makeClaim($client);

        $this->actingAs($admin)
            ->postJson('/api/admin/claims/' . $claim->id . '/reply', [
                'message' => 'Ci serve una foto aggiuntiva del pacco per procedere.',
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.claim_id', $claim->id)
            ->assertJsonPath('data.recipient', 'cliente@test.it');

        Mail::assertQueued(ClaimStatusUpdateMail::class, function (ClaimStatusUpdateMail $m) use ($claim) {
            return $m->hasTo('cliente@test.it') && $m->claim->id === $claim->id;
        });

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'admin.claim.reply',
            'target_type' => 'Claim',
            'target_id' => $claim->id,
        ]);
    }

    public function test_admin_reply_rejects_empty_or_too_long_message(): void
    {
        $admin  = $this->makeAdmin();
        $client = $this->makeClient();
        $claim  = $this->makeClaim($client);

        $this->actingAs($admin)
            ->postJson('/api/admin/claims/' . $claim->id . '/reply', ['message' => 'ab'])
            ->assertStatus(422);

        $this->actingAs($admin)
            ->postJson('/api/admin/claims/' . $claim->id . '/reply', [
                'message' => str_repeat('x', 5001),
            ])
            ->assertStatus(422);
    }

    public function test_non_admin_cannot_reply(): void
    {
        $client = $this->makeClient();
        $claim  = $this->makeClaim($client);

        $this->actingAs($client)
            ->postJson('/api/admin/claims/' . $claim->id . '/reply', [
                'message' => 'Provo a rispondere al mio reclamo.',
            ])
            ->assertStatus(403);
    }
}
