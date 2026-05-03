<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Audit OWASP IDOR (P1) — backfill `orders.public_tracking_token` storici.
 *
 * Per ogni ordine pre-esistente con token NULL genera un ULID base32 (26 char).
 * DB::table autorizzato: data migration / bulk update senza eventi modello,
 * coerente con il razionale ADR-006 sezione "Bulk import / counter atomico".
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('orders')
            ->whereNull('public_tracking_token')
            ->orderBy('id')
            ->each(function ($order) {
                DB::table('orders')
                    ->where('id', $order->id)
                    ->update(['public_tracking_token' => (string) Str::ulid()->toBase32()]);
            });
    }

    public function down(): void
    {
        // Reversibile: rimuove il valore senza droppare la colonna (gestita dalla migration precedente).
        DB::table('orders')->update(['public_tracking_token' => null]);
    }
};
