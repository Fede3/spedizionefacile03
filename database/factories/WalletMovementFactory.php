<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\WalletMovement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WalletMovement>
 */
class WalletMovementFactory extends Factory
{
    protected $model = WalletMovement::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'type' => 'credit',
            'amount' => fake()->randomFloat(2, 5, 500),
            'currency' => 'EUR',
            'status' => 'completed',
            'description' => fake()->sentence(),
            'source' => 'stripe',
        ];
    }

    /**
     * Indicate that the movement is a debit.
     */
    public function debit(): static
    {
        return $this->state(fn () => ['type' => 'debit']);
    }

    /**
     * Indicate that the movement comes from a referral.
     */
    public function referral(): static
    {
        return $this->state(fn () => ['source' => 'referral']);
    }
}
