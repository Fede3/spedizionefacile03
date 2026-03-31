<?php

namespace Tests\Feature\Cart;

use App\Models\Package;
use App\Models\PackageAddress;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CartControllerTest extends TestCase
{
    use RefreshDatabase;

    /* ------------------------------------------------------------------ */
    /*  Helper: payload completo per POST /api/cart (PackageStoreRequest)  */
    /* ------------------------------------------------------------------ */
    private function validCartPayload(array $overrides = []): array
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

    /* ------------------------------------------------------------------ */
    /*  Helper: inserire manualmente un pacco nel carrello di un utente   */
    /* ------------------------------------------------------------------ */
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

    /* ================================================================== */
    /*  T11.2.0: Cart requires authentication                             */
    /* ================================================================== */
    public function test_cart_requires_authentication(): void
    {
        $this->getJson('/api/cart')->assertStatus(401);
        $this->postJson('/api/cart', $this->validCartPayload())->assertStatus(401);
    }

    /* ================================================================== */
    /*  T11.2.1: Add package to cart                                       */
    /* ================================================================== */
    public function test_add_package_to_cart(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/api/cart', $this->validCartPayload());

        $response->assertSuccessful();

        // Package record created in DB
        $this->assertDatabaseHas('packages', [
            'user_id'      => $user->id,
            'package_type' => 'Pacco',
            'weight'       => 5,
        ]);

        // cart_user pivot row exists
        $this->assertTrue(
            DB::table('cart_user')
                ->where('user_id', $user->id)
                ->exists()
        );
    }

    /* ================================================================== */
    /*  T11.2.2: Get cart contents                                         */
    /* ================================================================== */
    public function test_get_cart_contents(): void
    {
        $user    = User::factory()->create();
        $package = $this->seedCartForUser($user);

        $response = $this->actingAs($user)->getJson('/api/cart');

        $response->assertSuccessful();

        // Response has meta with subtotal, empty flag and address_groups
        $response->assertJsonStructure([
            'data',
            'meta' => ['empty', 'subtotal', 'total', 'address_groups'],
        ]);

        // meta.empty should be false
        $response->assertJsonPath('meta.empty', false);
    }

    public function test_empty_cart_returns_empty_flag(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/cart');

        $response->assertSuccessful();
        $response->assertJsonPath('meta.empty', true);
    }

    /* ================================================================== */
    /*  T11.2.3: Remove from cart                                          */
    /* ================================================================== */
    public function test_remove_package_from_cart(): void
    {
        $user    = User::factory()->create();
        $package = $this->seedCartForUser($user);

        $response = $this->actingAs($user)
            ->deleteJson("/api/cart/{$package->id}");

        $response->assertSuccessful();
        $response->assertJsonFragment(['message' => 'Spedizione rimossa dal carrello']);

        // Pivot row removed
        $this->assertFalse(
            DB::table('cart_user')
                ->where('user_id', $user->id)
                ->where('package_id', $package->id)
                ->exists()
        );

        // Package itself deleted
        $this->assertDatabaseMissing('packages', ['id' => $package->id]);
    }

    /* ================================================================== */
    /*  T11.2.4: Update quantity                                           */
    /* ================================================================== */
    public function test_update_quantity(): void
    {
        $user    = User::factory()->create();
        $package = $this->seedCartForUser($user, 1190); // 1 x 1190 cents

        $response = $this->actingAs($user)
            ->patchJson("/api/cart/{$package->id}/quantity", [
                'quantity' => 3,
            ]);

        $response->assertSuccessful();
        $response->assertJsonPath('quantity', 3);

        // Unit price = 1190, new total = 1190 * 3 = 3570
        $response->assertJsonPath('single_price', 3570);
    }

    public function test_update_quantity_validation_rejects_zero(): void
    {
        $user    = User::factory()->create();
        $package = $this->seedCartForUser($user);

        $this->actingAs($user)
            ->patchJson("/api/cart/{$package->id}/quantity", ['quantity' => 0])
            ->assertStatus(422);
    }

    /* ================================================================== */
    /*  Correct data structure verification                                */
    /* ================================================================== */
    public function test_store_validates_required_fields(): void
    {
        $user = User::factory()->create();

        // Missing packages entirely
        $this->actingAs($user)
            ->postJson('/api/cart', [
                'origin_address' => ['name' => 'x'],
            ])
            ->assertStatus(422);
    }
}
