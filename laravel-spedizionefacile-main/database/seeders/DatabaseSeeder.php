<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'name' => 'Admin',
            'surname' => 'SpedizioneFacile',
            'email' => 'admin@spedizionefacile.it',
            'telephone_number' => '+39 000 0000000',
            'role' => 'Admin',
        ]);

        User::factory()->create([
            'name' => 'Mario',
            'surname' => 'Rossi',
            'email' => 'pro@example.com',
            'telephone_number' => '+39 333 1234567',
            'role' => 'Partner Pro',
        ]);

        User::factory()->create([
            'name' => 'Luca',
            'surname' => 'Bianchi',
            'email' => 'cliente@example.com',
            'telephone_number' => '+39 333 7654321',
            'role' => 'Cliente',
        ]);
    }
}
