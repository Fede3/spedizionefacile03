<?php

namespace Tests\Feature\Payments;

use App\Events\OrderPaid;
use App\Models\Order;
use App\Models\Setting;
use App\Models\StripeWebhookEvent;
use App\Models\Transaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class StripeWebhookControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_success_webhook_is_marked_processed_only_after_order_is_handled(): void
    {
        $secret = 'whsec_retry_test';
        Setting::set('stripe_webhook_secret', $secret);
        Event::fake([OrderPaid::class]);

        $orderId = 987654;
        $payload = $this->paymentIntentSucceededPayload(
            eventId: 'evt_retry_after_order_created',
            orderId: $orderId,
            amount: 1490,
        );

        $this->postSignedStripeWebhook($payload, $secret)
            ->assertStatus(500)
            ->assertJsonPath('retry', 'handler_not_completed');

        $this->assertSame(0, StripeWebhookEvent::count());

        $order = Order::factory()->create([
            'id' => $orderId,
            'status' => Order::PENDING,
            'subtotal' => 1490,
        ]);

        $this->postSignedStripeWebhook($payload, $secret)
            ->assertOk()
            ->assertJsonPath('received', true);

        $this->assertDatabaseHas('stripe_webhook_events', [
            'stripe_event_id' => 'evt_retry_after_order_created',
            'event_type' => 'payment_intent.succeeded',
        ]);

        $this->assertSame(Order::COMPLETED, $order->fresh()->rawStatus());
        $this->assertDatabaseHas('transactions', [
            'order_id' => $orderId,
            'ext_id' => 'pi_retry_after_order_created',
            'status' => 'succeeded',
            'total' => 1490,
        ]);
        $this->assertSame(1, Transaction::where('ext_id', 'pi_retry_after_order_created')->count());
        Event::assertDispatched(OrderPaid::class);
    }

    private function postSignedStripeWebhook(array $payload, string $secret)
    {
        $body = json_encode($payload, JSON_THROW_ON_ERROR);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp.'.'.$body, $secret);

        return $this->call('POST', '/stripe/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "t={$timestamp},v1={$signature}",
        ], $body);
    }

    private function paymentIntentSucceededPayload(string $eventId, int $orderId, int $amount): array
    {
        return [
            'id' => $eventId,
            'object' => 'event',
            'type' => 'payment_intent.succeeded',
            'data' => [
                'object' => [
                    'id' => 'pi_retry_after_order_created',
                    'object' => 'payment_intent',
                    'amount' => $amount,
                    'currency' => 'eur',
                    'status' => 'succeeded',
                    'payment_method_types' => ['card'],
                    'metadata' => [
                        'order_id' => (string) $orderId,
                    ],
                ],
            ],
        ];
    }
}
