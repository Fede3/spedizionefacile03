<?php

namespace Tests\Feature\Payments;

use App\Models\Order;
use App\Models\Package;
use App\Models\User;
use App\Models\WalletMovement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class WalletPaymentTest extends TestCase
{
    use RefreshDatabase;

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Fund a user's wallet with confirmed credits totalling $amountEur.
     */
    private function fundWallet(User $user, float $amountEur): void
    {
        WalletMovement::create([
            'user_id'         => $user->id,
            'type'            => 'credit',
            'amount'          => $amountEur,
            'currency'        => 'EUR',
            'status'          => 'confirmed',
            'idempotency_key' => 'seed_' . $user->id . '_' . uniqid(),
            'description'     => 'Seed balance for tests',
            'source'          => 'admin',
        ]);
    }

    /**
     * Create a pending order for the user and return it.
     */
    private function createPendingOrder(User $user, int $subtotalCents = 1190): Order
    {
        $order = Order::factory()->create([
            'user_id'  => $user->id,
            'status'   => 'pending',
            'subtotal' => $subtotalCents,
        ]);

        $package = Package::factory()->create([
            'user_id'      => $user->id,
            'single_price' => $subtotalCents,
        ]);

        Order::attachPackage($order->id, $package->id, 1);

        return $order;
    }

    private function createDiscountedPendingOrder(User $user, int $grossCents = 1190, int $payableCents = 1000): Order
    {
        $order = $this->createPendingOrder($user, $grossCents);
        $discountCents = max(0, $grossCents - $payableCents);

        $order->forceFill([
            'pricing_snapshot' => [
                'total_cents' => $grossCents,
                'discount_context' => [
                    'type' => 'coupon',
                    'code' => 'SAVE',
                    'discount_amount' => $discountCents / 100,
                    'subtotal_raw' => $grossCents / 100,
                    'final_total_raw' => $payableCents / 100,
                ],
            ],
        ])->save();

        return $order->fresh();
    }

    /* ================================================================== */
    /*  T11.3.6: Wallet pay success                                        */
    /* ================================================================== */
    public function test_wallet_pay_success(): void
    {
        $user  = User::factory()->create();
        $order = $this->createPendingOrder($user, 1190); // 11.90 EUR

        // Fund the wallet with enough balance
        $this->fundWallet($user, 50.00);

        $response = $this->actingAs($user)
            ->postJson('/api/wallet/pay', [
                'amount'      => 11.90,
                'reference'   => 'order-' . $order->id,
                'description' => 'Pagamento spedizione',
            ]);

        $response->assertStatus(201);
        $response->assertJsonPath('success', true);
        $response->assertJsonStructure(['success', 'data', 'new_balance']);

        // Wallet debit movement created
        $this->assertDatabaseHas('wallet_movements', [
            'user_id' => $user->id,
            'type'    => 'debit',
            'amount'  => '11.90',
            'status'  => 'confirmed',
            'source'  => 'wallet',
        ]);

        // Balance should be 50.00 - 11.90 = 38.10
        $this->assertEquals(38.10, $user->walletBalance());
    }

    /* ================================================================== */
    /*  T11.3.7: Wallet pay with insufficient balance fails                */
    /* ================================================================== */
    public function test_wallet_pay_insufficient_balance_fails(): void
    {
        $user  = User::factory()->create();
        $order = $this->createPendingOrder($user, 5000); // 50.00 EUR

        // Fund with only 10 EUR
        $this->fundWallet($user, 10.00);

        $response = $this->actingAs($user)
            ->postJson('/api/wallet/pay', [
                'amount'      => 50.00,
                'reference'   => 'order-' . $order->id,
                'description' => 'Pagamento spedizione',
            ]);

        // Controller catches RuntimeException and returns 422
        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'Saldo insufficiente. Disponibile: 10.00 EUR']);

        // No debit movement created
        $this->assertDatabaseMissing('wallet_movements', [
            'user_id' => $user->id,
            'type'    => 'debit',
        ]);
    }

    /* ================================================================== */
    /*  T11.3.9: Check wallet balance                                      */
    /* ================================================================== */
    public function test_check_wallet_balance(): void
    {
        $user = User::factory()->create();
        $this->fundWallet($user, 25.50);

        $response = $this->actingAs($user)
            ->getJson('/api/wallet/balance');

        $response->assertSuccessful();
        $response->assertJsonPath('balance', 25.50);
        $response->assertJsonPath('currency', 'EUR');
    }

    public function test_wallet_balance_requires_authentication(): void
    {
        $this->getJson('/api/wallet/balance')->assertStatus(401);
    }

    /* ================================================================== */
    /*  Wallet movement created after payment                              */
    /* ================================================================== */
    public function test_wallet_movement_created_after_payment(): void
    {
        $user = User::factory()->create();
        $this->fundWallet($user, 100.00);

        $order = $this->createPendingOrder($user, 2990); // 29.90 EUR

        $this->actingAs($user)
            ->postJson('/api/wallet/pay', [
                'amount'      => 29.90,
                'reference'   => 'order-' . $order->id,
                'description' => 'Test payment',
            ])
            ->assertStatus(201);

        // Exactly 2 movements: 1 credit (seed) + 1 debit (payment)
        $this->assertEquals(2, WalletMovement::where('user_id', $user->id)->count());

        // Balance updated
        $this->assertEquals(70.10, $user->walletBalance());
    }

    public function test_wallet_pay_normalizes_legacy_numeric_order_reference_and_allows_follow_up_completion(): void
    {
        Event::fake();

        $user = User::factory()->create();
        $this->fundWallet($user, 100.00);

        $order = $this->createPendingOrder($user, 2990); // 29.90 EUR

        $payment = $this->actingAs($user)
            ->postJson('/api/wallet/pay', [
                'amount' => 29.90,
                'reference' => (string) $order->id,
                'description' => 'Legacy wallet payment',
            ])
            ->assertStatus(201);

        $movementId = $payment->json('data.id');
        $this->assertNotEmpty($movementId);

        $this->assertDatabaseHas('wallet_movements', [
            'id' => $movementId,
            'reference' => 'order-'.$order->id,
            'source' => 'wallet',
        ]);

        $this->actingAs($user)
            ->postJson('/api/stripe/mark-order-completed', [
                'order_id' => $order->id,
                'payment_type' => 'wallet',
                'ext_id' => 'wallet-'.$movementId,
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $order->refresh();

        $this->assertSame(Order::COMPLETED, $order->status);
        $this->assertSame('wallet', $order->payment_method);
    }

    public function test_wallet_pay_rejects_amount_mismatch_against_order_total(): void
    {
        $user = User::factory()->create();
        $this->fundWallet($user, 100.00);

        $order = $this->createPendingOrder($user, 2990); // 29.90 EUR

        $this->actingAs($user)
            ->postJson('/api/wallet/pay', [
                'amount' => 19.90,
                'reference' => 'order-' . $order->id,
                'description' => 'Tampered wallet payment',
            ])
            ->assertStatus(422)
            ->assertJsonFragment([
                'message' => "L'importo non corrisponde al totale dell'ordine.",
            ]);

        $this->assertDatabaseMissing('wallet_movements', [
            'user_id' => $user->id,
            'type' => 'debit',
            'reference' => 'order-' . $order->id,
        ]);

        $order->refresh();

        $this->assertSame(Order::PENDING, $order->status);
    }

    public function test_wallet_pay_uses_discounted_payable_total(): void
    {
        $user = User::factory()->create();
        $this->fundWallet($user, 100.00);

        $order = $this->createDiscountedPendingOrder($user, 1190, 1000);

        $this->actingAs($user)
            ->postJson('/api/wallet/pay', [
                'amount' => 10.00,
                'reference' => 'order-'.$order->id,
                'description' => 'Discounted wallet payment',
            ])
            ->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('wallet_movements', [
            'user_id' => $user->id,
            'type' => 'debit',
            'amount' => '10.00',
            'reference' => 'order-'.$order->id,
        ]);

        $this->assertEquals(90.00, $user->walletBalance());
    }

    public function test_wallet_pay_rejects_gross_amount_when_discount_is_applied(): void
    {
        $user = User::factory()->create();
        $this->fundWallet($user, 100.00);

        $order = $this->createDiscountedPendingOrder($user, 1190, 1000);

        $this->actingAs($user)
            ->postJson('/api/wallet/pay', [
                'amount' => 11.90,
                'reference' => 'order-'.$order->id,
                'description' => 'Gross wallet payment',
            ])
            ->assertStatus(422)
            ->assertJsonFragment([
                'message' => "L'importo non corrisponde al totale dell'ordine.",
            ]);

        $this->assertDatabaseMissing('wallet_movements', [
            'user_id' => $user->id,
            'type' => 'debit',
            'reference' => 'order-'.$order->id,
        ]);
    }

    public function test_wallet_pay_is_idempotent_for_retry_on_same_pending_order(): void
    {
        $user = User::factory()->create();
        $this->fundWallet($user, 100.00);

        $order = $this->createPendingOrder($user, 2990); // 29.90 EUR

        $firstResponse = $this->actingAs($user)
            ->postJson('/api/wallet/pay', [
                'amount' => 29.90,
                'reference' => 'order-' . $order->id,
                'description' => 'Wallet retry test',
            ])
            ->assertStatus(201);

        $movementId = $firstResponse->json('data.id');
        $this->assertNotEmpty($movementId);

        $this->actingAs($user)
            ->postJson('/api/wallet/pay', [
                'amount' => 29.90,
                'reference' => 'order-' . $order->id,
                'description' => 'Wallet retry test',
            ])
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $movementId);

        $this->assertSame(1, WalletMovement::query()
            ->where('user_id', $user->id)
            ->where('type', 'debit')
            ->where('source', 'wallet')
            ->where('reference', 'order-' . $order->id)
            ->count());

        $this->assertEquals(70.10, $user->walletBalance());
    }

    public function test_wallet_balance_zero_when_no_movements(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->getJson('/api/wallet/balance');

        $response->assertSuccessful();
        $response->assertJsonPath('balance', 0.0);
    }
}
