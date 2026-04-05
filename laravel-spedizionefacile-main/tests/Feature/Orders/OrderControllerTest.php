<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\Package;
use App\Models\PackageAddress;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class OrderControllerTest extends TestCase
{
    use RefreshDatabase;

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Create a package in the user's cart and return the package.
     */
    private function seedCartForUser(User $user, int $singlePriceCents = 1190): Package
    {
        $origin      = PackageAddress::factory()->create();
        $destination = PackageAddress::factory()->create();
        $service     = Service::create([
            'service_type' => 'Nessuno',
            'date'         => '',
            'time'         => '',
        ]);

        $package = Package::create([
            'package_type'           => 'Pacco',
            'quantity'               => 1,
            'weight'                 => 5,
            'first_size'             => 30,
            'second_size'            => 20,
            'third_size'             => 15,
            'single_price'           => $singlePriceCents,
            'origin_address_id'      => $origin->id,
            'destination_address_id' => $destination->id,
            'service_id'             => $service->id,
            'user_id'                => $user->id,
        ]);

        DB::table('cart_user')->insert([
            'user_id'    => $user->id,
            'package_id' => $package->id,
        ]);

        return $package;
    }

    /**
     * Create an order with a package attached, belonging to $user.
     */
    private function createOrderForUser(User $user, string $status = 'pending', int $subtotalCents = 1190): Order
    {
        $order = Order::factory()->create([
            'user_id'  => $user->id,
            'status'   => $status,
            'subtotal' => $subtotalCents,
        ]);

        $package = Package::factory()->create(['user_id' => $user->id, 'single_price' => $subtotalCents]);
        Order::attachPackage($order->id, $package->id, 1);

        return $order;
    }

    /**
     * Valid payload for POST /api/create-direct-order (PackageStoreRequest).
     */
    private function directOrderPayload(array $overrides = []): array
    {
        return array_merge([
            'origin_address' => [
                'type'               => 'privato',
                'name'               => 'Mario Rossi',
                'address'            => 'Via Roma',
                'number_type'        => 'civico',
                'address_number'     => '10',
                'country'            => 'Italia',
                'city'               => 'Milano',
                'postal_code'        => '20121',
                'province'           => 'MI',
                'telephone_number'   => '3331234567',
            ],
            'destination_address' => [
                'type'               => 'privato',
                'name'               => 'Luigi Verdi',
                'address'            => 'Via Napoli',
                'number_type'        => 'civico',
                'address_number'     => '5',
                'country'            => 'Italia',
                'city'               => 'Roma',
                'postal_code'        => '00185',
                'province'           => 'RM',
                'telephone_number'   => '3339876543',
            ],
            'services' => [
                'service_type' => 'Nessuno',
                'date'         => '',
                'time'         => '',
            ],
            'packages' => [
                [
                    'package_type' => 'Pacco',
                    'quantity'     => 1,
                    'weight'       => 5,
                    'first_size'   => 30,
                    'second_size'  => 20,
                    'third_size'   => 15,
                ],
            ],
        ], $overrides);
    }

    /* ================================================================== */
    /*  T11.2.5: Create order from cart (POST stripe/create-order)         */
    /* ================================================================== */
    public function test_create_order_from_cart(): void
    {
        $user = User::factory()->create();
        $this->seedCartForUser($user, 1190);

        $response = $this->actingAs($user)
            ->postJson('/api/stripe/create-order');

        $response->assertSuccessful();
        $response->assertJsonStructure(['order_id']);

        $this->assertDatabaseHas('orders', [
            'user_id' => $user->id,
            'status'  => 'pending',
        ]);

        $order = Order::query()->findOrFail($response->json('order_id'));
        $this->assertGreaterThan(0, (int) $order->subtotal->amount());
        $this->assertSame((int) $order->subtotal->amount(), data_get($order->pricing_snapshot, 'total_cents'));
    }

    /* ================================================================== */
    /*  T11.2.6: Empty cart order creation fails                            */
    /* ================================================================== */
    public function test_create_order_with_empty_cart_fails(): void
    {
        $user = User::factory()->create();

        // CheckCart middleware returns 400 when cart is empty
        $this->actingAs($user)
            ->postJson('/api/stripe/create-order')
            ->assertStatus(400)
            ->assertJsonFragment(['message' => 'Carrello vuoto']);
    }

    /* ================================================================== */
    /*  T11.2.7: IDOR - accessing another user's order returns 403         */
    /* ================================================================== */
    public function test_idor_another_users_order_returns_403(): void
    {
        $owner   = User::factory()->create();
        $intruder = User::factory()->create();
        $order   = $this->createOrderForUser($owner);

        // OrderPolicy::view checks $order->user_id === $user->id
        $this->actingAs($intruder)
            ->getJson("/api/orders/{$order->id}")
            ->assertStatus(403);
    }

    /* ================================================================== */
    /*  T11.2.8: Owner can access own order                                */
    /* ================================================================== */
    public function test_owner_can_access_own_order(): void
    {
        $user  = User::factory()->create();
        $order = $this->createOrderForUser($user);

        $response = $this->actingAs($user)
            ->getJson("/api/orders/{$order->id}");

        $response->assertSuccessful();
    }

    /* ================================================================== */
    /*  T11.2.9: Direct order creation (POST /api/create-direct-order)     */
    /* ================================================================== */
    public function test_create_direct_order(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/api/create-direct-order', $this->directOrderPayload());

        $response->assertSuccessful();
        $response->assertJsonStructure(['order_id', 'order_number']);

        // Order created with server-calculated subtotal
        $this->assertDatabaseHas('orders', [
            'user_id' => $user->id,
            'status'  => 'pending',
        ]);
    }

    public function test_create_direct_order_is_idempotent_for_the_same_submission_context(): void
    {
        $user = User::factory()->create();
        $payload = array_merge($this->directOrderPayload(), [
            'client_submission_id' => 'direct-submission-001',
            'pricing_signature' => 'client-direct-signature-001',
            'pricing_snapshot_version' => 3,
            'pricing_snapshot' => [
                'total_cents' => 1,
                'services' => ['selected' => ['client']],
            ],
        ]);

        $first = $this->actingAs($user)
            ->postJson('/api/create-direct-order', $payload)
            ->assertSuccessful();

        $second = $this->actingAs($user)
            ->postJson('/api/create-direct-order', $payload)
            ->assertSuccessful();

        $firstOrderId = $first->json('order_id');
        $secondOrderId = $second->json('order_id');

        $this->assertSame($firstOrderId, $secondOrderId);
        $this->assertSame(1, Order::query()->where('user_id', $user->id)->where('client_submission_id', 'direct-submission-001')->count());

        $order = Order::query()->findOrFail($firstOrderId);
        $this->assertNotSame('client-direct-signature-001', $order->pricing_signature);
        $this->assertSame(1, $order->pricing_snapshot_version);
        $this->assertSame(1190, data_get($order->pricing_snapshot, 'total_cents'));
        $this->assertNotSame([
            'services' => ['selected' => ['client']],
            'total_cents' => 1,
        ], $order->pricing_snapshot);
    }

    public function test_create_direct_order_rejects_replay_when_service_payload_changes(): void
    {
        $user = User::factory()->create();
        $payload = $this->directOrderPayload();
        $payload['client_submission_id'] = 'direct-submission-service-payload-001';
        $payload['services']['service_type'] = 'contrassegno';
        $payload['services']['service_data'] = [
            'delivery_mode' => 'home',
            'sms_email_notification' => true,
            'contrassegno' => [
                'importo' => '25,00',
                'modalita_incasso' => 'contanti',
                'modalita_rimborso' => 'bonifico',
                'dettaglio_rimborso' => 'IT60X0542811101000000123456',
            ],
        ];

        $first = $this->actingAs($user)
            ->postJson('/api/create-direct-order', $payload)
            ->assertSuccessful();

        $payload['services']['service_data']['contrassegno']['importo'] = '30,00';

        $this->actingAs($user)
            ->postJson('/api/create-direct-order', $payload)
            ->assertStatus(422)
            ->assertJsonFragment(['error' => 'Contesto preventivo non coerente con l\'ordine.']);

        $this->assertSame(1, Order::query()->where('user_id', $user->id)->where('client_submission_id', 'direct-submission-service-payload-001')->count());

        $order = Order::query()->findOrFail($first->json('order_id'));
        $this->assertIsArray(data_get($order->pricing_snapshot, 'services.service_payload'));
        $this->assertSame('home', data_get($order->pricing_snapshot, 'services.service_payload.delivery_mode'));
    }

    public function test_create_direct_order_rejects_replay_against_legacy_order_without_pricing_signature(): void
    {
        $user = User::factory()->create();
        $payload = $this->directOrderPayload([
            'client_submission_id' => 'legacy-direct-submission-001',
        ]);

        $first = $this->actingAs($user)
            ->postJson('/api/create-direct-order', $payload)
            ->assertSuccessful();

        $order = Order::query()->findOrFail($first->json('order_id'));
        $order->forceFill([
            'pricing_signature' => null,
            'pricing_snapshot' => null,
            'pricing_snapshot_version' => null,
        ])->save();

        $payload['packages'][0]['quantity'] = 2;

        $this->actingAs($user)
            ->postJson('/api/create-direct-order', $payload)
            ->assertStatus(422)
            ->assertJsonFragment(['error' => 'Contesto preventivo non coerente con l\'ordine.']);
    }

    public function test_create_direct_order_requires_pudo_when_delivery_mode_is_pudo(): void
    {
        $user = User::factory()->create();
        $payload = $this->directOrderPayload([
            'delivery_mode' => 'pudo',
            'pudo' => [
                'name' => 'BRT Point',
            ],
        ]);

        $this->actingAs($user)
            ->postJson('/api/create-direct-order', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['pudo.pudo_id']);
    }

    public function test_add_package_rotates_pricing_context_on_pending_order(): void
    {
        $user = User::factory()->create();
        $origin = PackageAddress::factory()->create();
        $destination = PackageAddress::factory()->create();
        $service = Service::create([
            'service_type' => 'Nessuno',
            'date' => '',
            'time' => '',
            'service_data' => [],
        ]);

        $package = Package::create([
            'package_type' => 'Pacco',
            'quantity' => 1,
            'weight' => 5,
            'first_size' => 30,
            'second_size' => 20,
            'third_size' => 15,
            'single_price' => 1190,
            'origin_address_id' => $origin->id,
            'destination_address_id' => $destination->id,
            'service_id' => $service->id,
            'user_id' => $user->id,
        ]);

        $order = Order::create([
            'user_id' => $user->id,
            'subtotal' => 1190,
            'status' => Order::PENDING,
            'client_submission_id' => 'submission-before-add-package',
            'pricing_signature' => 'signature-before-add-package',
            'pricing_snapshot_version' => 1,
            'pricing_snapshot' => ['total_cents' => 1190],
        ]);
        Order::attachPackage($order->id, $package->id, 1);

        $this->actingAs($user)
            ->postJson("/api/orders/{$order->id}/add-package", [
                'package_type' => 'Pacco',
                'quantity' => 1,
                'weight' => 4,
                'first_size' => 20,
                'second_size' => 20,
                'third_size' => 20,
            ])
            ->assertSuccessful();

        $order->refresh();
        $this->assertNotSame('submission-before-add-package', $order->client_submission_id);
        $this->assertNotSame('signature-before-add-package', $order->pricing_signature);
        $this->assertSame((int) $order->subtotal->amount(), data_get($order->pricing_snapshot, 'total_cents'));
        $this->assertSame(2, data_get($order->pricing_snapshot, 'package_count'));
    }

    public function test_add_package_response_returns_fresh_order_state(): void
    {
        $user = User::factory()->create();
        $origin = PackageAddress::factory()->create();
        $destination = PackageAddress::factory()->create();
        $service = Service::create([
            'service_type' => 'Nessuno',
            'date' => '',
            'time' => '',
            'service_data' => [],
        ]);

        $package = Package::create([
            'package_type' => 'Pacco',
            'quantity' => 1,
            'weight' => 5,
            'first_size' => 30,
            'second_size' => 20,
            'third_size' => 15,
            'single_price' => 1190,
            'origin_address_id' => $origin->id,
            'destination_address_id' => $destination->id,
            'service_id' => $service->id,
            'user_id' => $user->id,
        ]);

        $order = Order::create([
            'user_id' => $user->id,
            'subtotal' => 1190,
            'status' => Order::PENDING,
            'client_submission_id' => 'submission-before-fresh-response',
            'pricing_signature' => 'signature-before-fresh-response',
            'pricing_snapshot_version' => 1,
            'pricing_snapshot' => ['total_cents' => 1190],
        ]);
        Order::attachPackage($order->id, $package->id, 1);

        $response = $this->actingAs($user)
            ->postJson("/api/orders/{$order->id}/add-package", [
                'package_type' => 'Pacco',
                'quantity' => 1,
                'weight' => 4,
                'first_size' => 20,
                'second_size' => 20,
                'third_size' => 20,
            ])
            ->assertSuccessful();

        $order->refresh();

        $this->assertSame((int) $order->subtotal->amount(), data_get($response->json(), 'order.subtotal_cents'));
        $this->assertSame($order->client_submission_id, data_get($response->json(), 'order.client_submission_id'));
        $this->assertSame($order->pricing_signature, data_get($response->json(), 'order.pricing_signature'));
        $this->assertSame((int) $order->subtotal->amount(), data_get($response->json(), 'order.pricing_snapshot.total_cents'));
    }

    /* ================================================================== */
    /*  Order list for authenticated user                                  */
    /* ================================================================== */
    public function test_order_list_for_authenticated_user(): void
    {
        $user = User::factory()->create();

        // Create 2 orders for this user
        $this->createOrderForUser($user, 'pending', 1190);
        $this->createOrderForUser($user, 'completed', 2990);

        // Create 1 order for another user (should not appear)
        $other = User::factory()->create();
        $this->createOrderForUser($other, 'pending', 890);

        $response = $this->actingAs($user)->getJson('/api/orders');

        $response->assertSuccessful();

        // Should see only 2 orders
        $data = $response->json('data');
        $this->assertCount(2, $data);
    }

    public function test_order_list_requires_authentication(): void
    {
        $this->getJson('/api/orders')->assertStatus(401);
    }
}
