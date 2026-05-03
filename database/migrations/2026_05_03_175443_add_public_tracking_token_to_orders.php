<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Audit OWASP IDOR (P1) — orders.public_tracking_token.
 *
 * Sostituisce il lookup pubblico tracking via id sequenziale (`SF-{id}`,
 * enumerabile) con un token opaco ULID base32 (26 char) non sequenziale.
 * Vedi `App\Services\OrderBrtTrackingReadService::findPublicTrackingOrder`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Nullable in up: il backfill (migration successiva) popola gli ordini storici.
            // L'observer in App\Models\Order::booted lo genera per i nuovi ordini.
            $table->string('public_tracking_token', 26)
                ->nullable()
                ->unique()
                ->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['public_tracking_token']);
            $table->dropColumn('public_tracking_token');
        });
    }
};
