<?php

/**
 * MIGRATION: add_pickup_date_to_orders
 * SCOPO: Campo `pickup_date` separato (solo data) per il ritiro programmato (F04).
 *
 * MOTIVAZIONE:
 *   - `pickup_requested_at` = quando è stata fatta la richiesta.
 *   - `pickup_date` = la data effettiva del ritiro richiesto al corriere, che può
 *     essere modificata dall'utente (endpoint PATCH /api/orders/{id}/pickup).
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->date('pickup_date')->nullable()->after('pickup_notes');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('pickup_date');
        });
    }
};
