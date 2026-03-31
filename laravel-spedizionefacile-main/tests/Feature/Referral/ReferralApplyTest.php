<?php

namespace Tests\Feature\Referral;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\Package;
use App\Models\ReferralUsage;
use App\Models\User;
use App\Models\WalletMovement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReferralApplyTest extends TestCase
{
    use RefreshDatabase;

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Create a Partner Pro user with a known referral code.
     */
    private function createProUser(string $code = 'TESTPRO1'): User
    {
        $user = User::factory()->partnerPro()->create([
            'referral_code' => $code,
        ]);
        return $user;
    }

    /**
     * Create a pending order for a user.
     */
    private function createOrder(User $user, int $subtotalCents = 1190): Order
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

    /* ================================================================== */
    /*  T11.5.1: Validate referral code (POST /api/referral/validate)      */
    /* ================================================================== */
    public function test_validate_referral_code_success(): void
    {
        $proUser = $this->createProUser('ABCD1234');
        $buyer   = User::factory()->create();

        $response = $this->actingAs($buyer)
            ->postJson('/api/referral/validate', [
                'code' => 'ABCD1234',
            ]);

        $response->assertSuccessful();
        $response->assertJsonPath('valid', true);
        $response->assertJsonPath('discount_percent', 5);
        $response->assertJsonPath('pro_name', $proUser->name);
    }

    public function test_validate_invalid_referral_code_returns_404(): void
    {
        $buyer = User::factory()->create();

        $this->actingAs($buyer)
            ->postJson('/api/referral/validate', ['code' => 'INVALID1'])
            ->assertStatus(404)
            ->assertJsonPath('valid', false);
    }

    /* ================================================================== */
    /*  T11.5.2: Apply referral creates ReferralUsage + WalletMovement     */
    /* ================================================================== */
    public function test_apply_referral_creates_usage_and_wallet_movement(): void
    {
        $proUser = $this->createProUser('PROAPPLY');
        $buyer   = User::factory()->create();
        $order   = $this->createOrder($buyer, 2000); // 20.00 EUR

        $response = $this->actingAs($buyer)
            ->postJson('/api/referral/apply', [
                'code'         => 'PROAPPLY',
                'order_id'     => $order->id,
                'order_amount' => 20.00,
            ]);

        $response->assertSuccessful();
        $response->assertJsonPath('success', true);

        // Discount = 5% of 20.00 = 1.00 (API returns integer when no decimal part)
        $response->assertJsonPath('discount_amount', 1);

        // ReferralUsage record created
        $this->assertDatabaseHas('referral_usages', [
            'buyer_id'       => $buyer->id,
            'pro_user_id'    => $proUser->id,
            'referral_code'  => 'PROAPPLY',
            'order_id'       => $order->id,
            'status'         => 'confirmed',
        ]);

        // WalletMovement (commission credit) created for the Pro user
        $this->assertDatabaseHas('wallet_movements', [
            'user_id'     => $proUser->id,
            'type'        => 'credit',
            'amount'      => '1.00',
            'status'      => 'confirmed',
            'source'      => 'commission',
        ]);
    }

    /* ================================================================== */
    /*  T11.5.3: Self-referral blocked                                     */
    /* ================================================================== */
    public function test_self_referral_is_blocked(): void
    {
        $proUser = $this->createProUser('SELFCODE');

        // Validate endpoint
        $this->actingAs($proUser)
            ->postJson('/api/referral/validate', ['code' => 'SELFCODE'])
            ->assertStatus(422);

        // Apply endpoint
        $order = $this->createOrder($proUser);
        $this->actingAs($proUser)
            ->postJson('/api/referral/apply', [
                'code'         => 'SELFCODE',
                'order_id'     => $order->id,
                'order_amount' => 11.90,
            ])
            ->assertStatus(422);
    }

    /* ================================================================== */
    /*  T11.5.4: Atomicity - both records created or neither               */
    /* ================================================================== */
    public function test_apply_referral_atomicity(): void
    {
        $proUser = $this->createProUser('ATOMICCD');
        $buyer   = User::factory()->create();
        $order   = $this->createOrder($buyer, 5000); // 50.00 EUR

        $this->actingAs($buyer)
            ->postJson('/api/referral/apply', [
                'code'         => 'ATOMICCD',
                'order_id'     => $order->id,
                'order_amount' => 50.00,
            ])
            ->assertSuccessful();

        // Both ReferralUsage AND WalletMovement exist
        $usageCount = ReferralUsage::where('order_id', $order->id)->count();
        $walletCount = WalletMovement::where('user_id', $proUser->id)
            ->where('source', 'commission')
            ->count();

        $this->assertEquals(1, $usageCount);
        $this->assertEquals(1, $walletCount);
    }

    /* ================================================================== */
    /*  T11.5.5: Calculate coupon (POST /api/calculate-coupon)              */
    /* ================================================================== */
    public function test_calculate_coupon_with_valid_coupon(): void
    {
        $buyer = User::factory()->create();

        Coupon::factory()->create([
            'code'       => 'SAVE10',
            'percentage' => 10,
            'active'     => true,
        ]);

        $response = $this->actingAs($buyer)
            ->postJson('/api/calculate-coupon', [
                'coupon' => 'SAVE10',
                'total'  => 100.00,
            ]);

        $response->assertSuccessful();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('type', 'coupon');
        $response->assertJsonPath('percentage', 10);
        $response->assertJsonPath('discount_amount', 10);
        $response->assertJsonPath('new_total_raw', 90);
    }

    public function test_calculate_coupon_with_referral_code(): void
    {
        $proUser = $this->createProUser('REFCOUPO');
        $buyer   = User::factory()->create();

        $response = $this->actingAs($buyer)
            ->postJson('/api/calculate-coupon', [
                'coupon' => 'REFCOUPO',
                'total'  => 100.00,
            ]);

        $response->assertSuccessful();
        $response->assertJsonPath('type', 'referral');
        $response->assertJsonPath('percentage', 5);
        $response->assertJsonPath('discount_amount', 5);
        $response->assertJsonPath('new_total_raw', 95);
    }

    public function test_calculate_coupon_invalid_code_returns_404(): void
    {
        $buyer = User::factory()->create();

        $this->actingAs($buyer)
            ->postJson('/api/calculate-coupon', [
                'coupon' => 'NOTEXIST',
                'total'  => 50.00,
            ])
            ->assertStatus(404);
    }

    /* ================================================================== */
    /*  T11.5.6: Expired coupon fails                                      */
    /* ================================================================== */
    public function test_expired_coupon_fails(): void
    {
        $buyer = User::factory()->create();

        // Create an inactive coupon (simulates expired/disabled)
        Coupon::factory()->inactive()->create([
            'code'       => 'EXPIRED1',
            'percentage' => 15,
        ]);

        // CouponController looks for active=true, so inactive coupon is not found.
        // The code will also not match a referral, so it returns 404.
        $this->actingAs($buyer)
            ->postJson('/api/calculate-coupon', [
                'coupon' => 'EXPIRED1',
                'total'  => 50.00,
            ])
            ->assertStatus(404);
    }

    public function test_self_referral_blocked_in_calculate_coupon(): void
    {
        $proUser = $this->createProUser('SELFCOUP');

        $this->actingAs($proUser)
            ->postJson('/api/calculate-coupon', [
                'coupon' => 'SELFCOUP',
                'total'  => 50.00,
            ])
            ->assertStatus(422);
    }
}
