<?php

namespace Database\Factories;

use App\Models\Package;
use App\Models\PackageAddress;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Package>
 */
class PackageFactory extends Factory
{
    protected $model = Package::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'package_type' => 'Pacco',
            'quantity' => 1,
            'weight' => fake()->randomFloat(1, 0.5, 50),
            'first_size' => fake()->numberBetween(10, 100),
            'second_size' => fake()->numberBetween(10, 80),
            'third_size' => fake()->numberBetween(10, 60),
            'weight_price' => fake()->randomFloat(2, 5, 100),
            'volume_price' => fake()->randomFloat(2, 5, 100),
            'single_price' => fake()->numberBetween(500, 10000),
            'origin_address_id' => PackageAddress::factory()->state(['type' => 'Partenza']),
            'destination_address_id' => PackageAddress::factory()->state(['type' => 'Destinazione']),
            'service_id' => fn () => Service::create([
                'service_type' => 'Nessuno',
                'date' => '',
                'time' => '',
            ])->id,
        ];
    }

    /**
     * Indicate that the package is a Pallet.
     */
    public function pallet(): static
    {
        return $this->state(fn () => [
            'package_type' => 'Pallet',
            'weight' => fake()->randomFloat(1, 50, 500),
            'first_size' => fake()->numberBetween(80, 200),
            'second_size' => fake()->numberBetween(80, 150),
            'third_size' => fake()->numberBetween(50, 180),
        ]);
    }

    /**
     * Indicate that the package is a Valigia.
     */
    public function valigia(): static
    {
        return $this->state(fn () => [
            'package_type' => 'Valigia',
        ]);
    }
}
