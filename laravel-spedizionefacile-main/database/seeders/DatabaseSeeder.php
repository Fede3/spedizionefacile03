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
        // Admin - vede tutto
        User::factory()->create([
            'name' => 'Admin',
            'surname' => 'SpedizioneFacile',
            'email' => 'admin@spedizionefacile.it',
            'password' => 'Admin2026!',
            'telephone_number' => '+39 000 0000000',
            'role' => 'Admin',
        ]);

        // Account Cliente
        User::factory()->create([
            'name' => 'Luca',
            'surname' => 'Bianchi',
            'email' => 'cliente@spedizionefacile.it',
            'password' => 'Cliente2026!',
            'telephone_number' => '+39 333 7654321',
            'role' => 'Cliente',
        ]);

        // Account Prova (test)
        User::factory()->create([
            'name' => 'Prova',
            'surname' => 'Test',
            'email' => 'prova@spedizionefacile.it',
            'password' => 'Prova2026!',
            'telephone_number' => '+39 333 1111111',
            'role' => 'Cliente',
        ]);

        // Account Partner Pro
        User::factory()->create([
            'name' => 'Mario',
            'surname' => 'Rossi',
            'email' => 'pro@spedizionefacile.it',
            'password' => 'Partner2026!',
            'telephone_number' => '+39 333 1234567',
            'role' => 'Partner Pro',
        ]);
    }
}
