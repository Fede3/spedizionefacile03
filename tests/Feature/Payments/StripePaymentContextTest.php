<?php

namespace Tests\Feature\Payments;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\User;
use App\Services\StripePaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class StripePaymentContextTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_existing_order_payment_intent_ignores_raw_discount_context(): void
    {
        Coupon::factory()->create([
            'code' => 'SAVE90',
            'percentage' => 90,
            'active' => true,
        ]);

        $user = User::factory()->create();
        $order = Order::factory()->create([
            'user_id' => $user->id,
            'status' => Order::PENDING,
            'subtotal' => 1000,
            'client_submission_id' => 'submission-secure-payment',
            'pricing_signature' => 'signature-secure-payment',
            'pricing_snapshot_version' => 1,
            'pricing_snapshot' => [
                'package_count' => 1,
                'total_cents' => 1000,
            ],
        ]);

        $stripe = Mockery::mock(StripePaymentService::class);
        $stripe->shouldReceive('isConfigured')->once()->andReturnTrue();
        $stripe->shouldReceive('createPaymentIntent')
            ->once()
            ->withArgs(function (Order $paymentOrder, User $paymentUser, ?string $idempotencyKey) use ($order, $user) {
                return $paymentOrder->is($order)
                    && $paymentUser->is($user)
                    && is_string($idempotencyKey)
                    && $paymentOrder->fresh()->payableTotalCents() === 1000;
            })
            ->andReturn([
                'client_secret' => 'pi_secure_secret',
                'payment_intent_id' => 'pi_secure',
            ]);

        $this->app->instance(StripePaymentService::class, $stripe);

        $response = $this->actingAs($user)->postJson('/api/stripe/existing-order-payment-intent', [
            'order_id' => $order->id,
            'client_submission_id' => 'submission-secure-payment',
            'discount_context' => [
                'type' => 'coupon',
                'code' => 'SAVE90',
                'discount_percent' => 90,
                'discount_amount' => 9,
                'subtotal_raw' => 10,
                'final_total_raw' => 1,
            ],
        ]);

        $response->assertOk();
        $response->assertJsonPath('payment_intent_id', 'pi_secure');

        $this->assertSame(1000, $order->fresh()->payableTotalCents());
        $this->assertNull(data_get($order->fresh()->pricing_snapshot, 'discount_context'));
    }
}
