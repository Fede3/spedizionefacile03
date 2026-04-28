<?php

/**
 * MIGRATION: add_bank_transfer_fields_to_orders
 * SCOPO: Aggiunge i campi per il flusso bonifico bancario (F05).
 *
 * NOTE:
 *   - Lo stato `awaiting_bank_transfer` viene gestito come valore del campo `status`
 *     esistente (che è una stringa), quindi non serve una enum migration.
 *   - `bank_transfer_confirmed_at` registra quando admin ha confermato il bonifico.
 *   - `bank_transfer_reference` opzionale: CRO / riferimento bonifico inserito da admin.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('bank_transfer_confirmed_at')->nullable()->after('refunded_at');
            $table->string('bank_transfer_reference', 128)->nullable()->after('bank_transfer_confirmed_at');
            $table->unsignedBigInteger('bank_transfer_confirmed_by')->nullable()->after('bank_transfer_reference');

            $table->index('bank_transfer_confirmed_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['bank_transfer_confirmed_at']);
            $table->dropColumn(['bank_transfer_confirmed_at', 'bank_transfer_reference', 'bank_transfer_confirmed_by']);
        });
    }
};
