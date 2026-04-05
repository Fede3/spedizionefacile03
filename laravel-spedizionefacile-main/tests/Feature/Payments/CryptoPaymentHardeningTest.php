<?php

namespace Tests\Feature\Payments;

use App\Events\OrderPaid;
use App\Http\Controllers\CryptoController;
use App\Models\Order;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class CryptoPaymentHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function makeIpnRequest(array $payload): Request
    {
        ksort($payload);

        $secret = (string) config('services.nowpayments.ipn_secret');
        $sortedPayload = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $signature = hash_hmac('sha512', $sortedPayload, $secret);

        return Request::create(
            '/api/crypto/ipn',
            'POST',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_NOWPAYMENTS_SIG' => $signature,
            ],
            json_encode($payload, JSON_UNESCAPED_SLASHES)
        );
    }

    private function createCryptoOrder(array $attributes = []): Order
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $order = Order::factory()->create(array_merge([
            'user_id' => $user->id,
            'status' => Order::PENDING,
            'subtotal' => 890,
            'payment_method' => 'crypto',
        ], $attributes));

        $invoiceId = array_key_exists('nowpayments_invoice_id', $attributes)
            ? $attributes['nowpayments_invoice_id']
            : 'np_invoice_123';

        $order->forceFill([
            'nowpayments_invoice_id' => $invoiceId,
        ])->save();

        return $order->refresh();
    }

    protected function setUp(): void
    {
        parent::setUp();

        // CryptoController rimosso — pagamenti crypto disabilitati.
        if (! class_exists(\App\Http\Controllers\CryptoController::class)) {
            $this->markTestSkipped('CryptoController rimosso — pagamenti crypto disabilitati.');
        }

        Config::set('services.nowpayments.ipn_secret', 'nowpayments-test-secret');
        Config::set('services.nowpayments.sandbox', true);
        Config::set('app.url', 'http://localhost');
        Setting::set('crypto_surcharge', 0);
    }

    public function test_ipn_rejects_missing_payment_method_crypto_binding(): void
    {
        Event::fake();

        $order = $this->createCryptoOrder([
            'payment_method' => 'stripe',
            'nowpayments_invoice_id' => 'np_invoice_123',
        ]);

        $payload = [
            'payment_id' => 'np_invoice_123',
            'payment_status' => 'confirmed',
            'order_id' => $order->id,
            'price_amount' => 8.90,
        ];

        $response = app(CryptoController::class)->ipn($this->makeIpnRequest($payload));

        $this->assertSame(422, $response->getStatusCode());
        $this->assertSame('Ordine non associato al pagamento crypto.', $response->getData(true)['error']);
        $this->assertDatabaseCount('transactions', 0);
        Event::assertNotDispatched(OrderPaid::class);
    }

    public function test_ipn_rejects_missing_nowpayments_invoice_id(): void
    {
        Event::fake();

        $order = $this->createCryptoOrder([
            'nowpayments_invoice_id' => null,
        ]);

        $payload = [
            'payment_id' => 'np_invoice_123',
            'payment_status' => 'confirmed',
            'order_id' => $order->id,
            'price_amount' => 8.90,
        ];

        $response = app(CryptoController::class)->ipn($this->makeIpnRequest($payload));

        $this->assertSame(422, $response->getStatusCode());
        $this->assertSame('Invoice NOWPayments mancante.', $response->getData(true)['error']);
        $this->assertDatabaseCount('transactions', 0);
        Event::assertNotDispatched(OrderPaid::class);
    }

    public function test_ipn_rejects_mismatched_payment_id(): void
    {
        Event::fake();

        $order = $this->createCryptoOrder([
            'nowpayments_invoice_id' => 'np_invoice_expected',
        ]);

        $payload = [
            'payment_id' => 'np_invoice_other',
            'payment_status' => 'confirmed',
            'order_id' => $order->id,
            'price_amount' => 8.90,
        ];

        $response = app(CryptoController::class)->ipn($this->makeIpnRequest($payload));

        $this->assertSame(422, $response->getStatusCode());
        $this->assertSame('Payment ID non corrispondente.', $response->getData(true)['error']);
        $this->assertDatabaseCount('transactions', 0);
        Event::assertNotDispatched(OrderPaid::class);
    }

    public function test_ipn_deduplicates_successful_nowpayments_transactions(): void
    {
        Event::fake();
        $order = $this->createCryptoOrder([
            'nowpayments_invoice_id' => 'np_invoice_123',
        ]);

        Transaction::create([
            'order_id' => $order->id,
            'ext_id' => 'nowpayments_np_invoice_123',
            'type' => 'crypto',
            'status' => 'succeeded',
            'total' => 890,
        ]);

        $payload = [
            'payment_id' => 'np_invoice_123',
            'payment_status' => 'confirmed',
            'order_id' => $order->id,
            'price_amount' => 8.90,
        ];

        $response = app(CryptoController::class)->ipn($this->makeIpnRequest($payload));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(true, $response->getData(true)['already_processed']);
        $this->assertSame(1, Transaction::query()->where('order_id', $order->id)->count());
        Event::assertNotDispatched(OrderPaid::class);
    }

    public function test_ipn_accepts_valid_binding_and_creates_single_crypto_transaction(): void
    {
        Event::fake();
        $order = $this->createCryptoOrder([
            'nowpayments_invoice_id' => 'np_invoice_ok',
        ]);

        $payload = [
            'payment_id' => 'np_invoice_ok',
            'payment_status' => 'confirmed',
            'order_id' => $order->id,
            'price_amount' => 8.90,
        ];

        $response = app(CryptoController::class)->ipn($this->makeIpnRequest($payload));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(true, $response->getData(true)['ok']);
        $this->assertDatabaseHas('transactions', [
            'order_id' => $order->id,
            'ext_id' => 'nowpayments_np_invoice_ok',
            'type' => 'crypto',
            'status' => 'succeeded',
        ]);
        $this->assertSame(1, Transaction::query()->where('order_id', $order->id)->count());
        Event::assertDispatched(OrderPaid::class);
    }
}
