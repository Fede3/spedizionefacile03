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
                    'single_price' => 11.90,
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
