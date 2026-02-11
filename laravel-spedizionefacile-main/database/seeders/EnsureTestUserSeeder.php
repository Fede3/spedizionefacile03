<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;

class EnsureTestUserSeeder extends Seeder
{
    public function run(): void
    {
        // In seeding la protezione da assegnazione massiva è disattivata di default, ma teniamo comunque robusto.
        User::unguard();

        // SQLite: leggere schema tabella users
         = DB::select('PRAGMA table_info(users)');

        // Valori certi per i campi che hai già visto obbligatori
         = [
            'name' => 'Test',
            'surname' => 'Test',
            'telephone_number' => '0000000000',
            'role' => 'user',
            'password' => bcrypt('Password123!'),
        ];

         = ['id','email','created_at','updated_at','email_verified_at','remember_token'];

        foreach ( as ) {
             = ->name;
             = ((int)->notnull === 1);
             = (->dflt_value === null);

            if ( &&  && !array_key_exists(, ) && !in_array(, , true)) {
                 = strtolower((string)->type);

                // euristiche semplici per non violare NOT NULL
                if (str_ends_with(, '_id')) {
                    [] = 1;
                } elseif (str_starts_with(, 'is_') || str_starts_with(, 'has_')) {
                    [] = 0;
                } elseif (str_contains(, 'int')) {
                    [] = 0;
                } elseif (str_contains(, 'date') || str_contains(, 'time')) {
                    [] = now();
                } else {
                    [] = 'test';
                }
            }
        }

        User::updateOrCreate(['email' => 'test@prova.it'], );
    }
}

